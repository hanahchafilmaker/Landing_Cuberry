import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Fragment } from "react";
import { meta, type Vars } from "./messages.ts";
import {
  LANG_QUERY_KEY,
  LANG_STORAGE_KEY,
  LANG_EVENT,
  browserLanguages,
  readStoredLang,
  resolveLanguage,
  translate,
  writeStoredLang,
  type Lang,
} from "./translate.ts";

type LanguageContextValue = {
  lang: Lang;
  /** 언어를 직접 고른다(토글·주소 파라미터) */
  setLang: (lang: Lang, options?: { remember?: boolean; replaceUrl?: boolean }) => void;
  /** ko ↔ en */
  toggleLang: () => void;
  /** 문구를 화면 언어로 바꾼다: t("연혁") → "Milestones" */
  t: (text: string, vars?: Vars) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  lang: "ko",
  setLang: () => {},
  toggleLang: () => {},
  t: (text, vars) => translate(text, "ko", vars),
});

/** <html lang> · <title> · meta description 을 화면 언어에 맞춘다. */
function syncDocument(lang: Lang) {
  const root = document.documentElement;
  root.setAttribute("lang", lang);
  root.setAttribute("data-lang", lang);
  document.title = meta[lang].title;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute("content", meta[lang].description);
}

/** 주소창의 ?lang= 을 화면 언어와 맞춘다(공유·북마크용, 페이지는 새로 뜨지 않음). */
function syncUrl(lang: Lang) {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get(LANG_QUERY_KEY) === lang) return;
    url.searchParams.set(LANG_QUERY_KEY, lang);
    window.history.replaceState(window.history.state, "", url.toString());
  } catch {
    /* 주소를 못 바꾸는 환경(iframe 등)에서도 언어 전환은 유지한다 */
  }
}

/**
 * 한영 자동 번역 제공자.
 * 첫 방문에는 브라우저 언어를 보고(영어권이면 영어) 한국어로 시작,
 * 방문자가 KO/EN 을 고르면 그 선택을 기억한다.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () =>
      resolveLanguage({
        search: typeof window === "undefined" ? "" : window.location.search,
        stored: typeof window === "undefined" ? null : readStoredLang(),
        languages: browserLanguages(),
      }).lang,
  );
  // 주소로 들어온 언어(?lang=en)는 방문자의 선택을 덮어쓰고 기억된다.
  const fromQuery = useRef(
    typeof window === "undefined"
      ? false
      : resolveLanguage({ search: window.location.search }).source === "query",
  );

  useEffect(() => {
    syncDocument(lang);
    if (fromQuery.current) {
      writeStoredLang(lang);
      fromQuery.current = false;
    }
  }, [lang]);

  // 다른 탭에서 언어를 바꾸면 이 탭도 따라간다.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LANG_STORAGE_KEY) return;
      const picked = resolveLanguage({ stored: event.newValue }).lang;
      if (event.newValue) setLangState(picked);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setLang = useCallback<LanguageContextValue["setLang"]>((next, options) => {
    setLangState(next);
    if (options?.remember !== false) writeStoredLang(next);
    if (options?.replaceUrl !== false) syncUrl(next);
    window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: next }));
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((current) => {
      const next: Lang = current === "ko" ? "en" : "ko";
      writeStoredLang(next);
      syncUrl(next);
      window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: next }));
      return next;
    });
  }, []);

  const t = useCallback((text: string, vars?: Vars) => translate(text, lang, vars), [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, toggleLang, t }),
    [lang, setLang, toggleLang, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  return useContext(LanguageContext);
}

/**
 * 줄바꿈이 들어간 문구용 컴포넌트.
 * 번역문의 줄 수가 달라도 <br /> 로 나눠 그린다.
 *   <T text={"목표와 일정, 예산을 먼저\n정리하는 제작 구조"} />
 */
export function T({ text, vars }: { text: string; vars?: Vars }) {
  const { t } = useI18n();
  const lines = t(text, vars).split("\n");
  return (
    <>
      {lines.map((line, index) => (
        <Fragment key={`${index}-${line}`}>
          {index > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </>
  );
}
