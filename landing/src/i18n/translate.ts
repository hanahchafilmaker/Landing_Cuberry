// ─────────────────────────────────────────────────────────────
// 한영 자동 번역 엔진 (React 없이 쓰는 순수 로직)
//
// translate(text, lang, vars)
//   1) 한국어 화면이면 원문 그대로 (자리표시자만 채움)
//   2) 영어 화면이면 사전(messages.ts)에서 원문을 찾아 영어 문장으로
//   3) 사전에 없으면 규칙(금액·길이·특허번호 …)으로 자동 변환
//   4) 그것도 없으면 한국어 원문 유지 — 화면에서 글자가 사라지지 않는다
//
// resolveLanguage() 는 "자동 감지"의 우선순위를 담고 있습니다.
//   ?lang=  →  저장된 선택(localStorage)  →  브라우저 언어  →  한국어
// ─────────────────────────────────────────────────────────────
import { en, koOnly, rules, type Vars } from "./messages.ts";

export type Lang = "ko" | "en";

export const LANGS: Lang[] = ["ko", "en"];
export const DEFAULT_LANG: Lang = "ko";
/** 사용자가 고른 언어를 기억하는 키 (어드민 토큰과 같은 브라우저 저장소) */
export const LANG_STORAGE_KEY = "cuberry:lang";
/** 주소로 언어를 지정할 때 쓰는 쿼리 이름: ?lang=en */
export const LANG_QUERY_KEY = "lang";
/** 언어가 바뀔 때 쏘는 이벤트 이름 */
export const LANG_EVENT = "cuberry:lang";

const HANGUL = /[\uAC00-\uD7A3]/;
const CJK_PUNCT = /[“”‘’]/g;

/** 띄어쓰기·줄바꿈 차이를 흡수해 같은 문구로 취급한다. */
export function normalizeKey(text: string): string {
  return String(text).replace(CJK_PUNCT, (mark) => (mark === "“" || mark === "”" ? '"' : "'")).replace(/\s+/g, " ").trim();
}

// 사전을 정규화 키로 한 번만 펼쳐 둔다.
const dictionary = new Map<string, string>(
  Object.entries(en).map(([ko, value]) => [normalizeKey(ko), value]),
);

const keepAsIs = new Map<string, string>(koOnly.map(({ text }) => [normalizeKey(text), text]));

export function hasHangul(text: string): boolean {
  return HANGUL.test(String(text));
}

/** {count} 같은 자리표시자를 실제 값으로 채운다. */
export function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return String(text).replace(/\{(\w+)\}/g, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : whole,
  );
}

/** 사전에 있는지 (테스트·디버깅용) */
export function lookup(text: string): string | undefined {
  return dictionary.get(normalizeKey(text));
}

/** 사전에 없는 문구를 규칙으로 자동 변환한다. */
export function applyRules(text: string): string | undefined {
  const value = normalizeKey(text);
  for (const rule of rules) {
    const match = value.match(rule.pattern);
    if (match) return rule.replace(match);
  }
  return undefined;
}

/**
 * 문구 하나를 화면 언어로 바꾼다.
 * - lang="ko" 면 원문(자리표시자만 치환)
 * - lang="en" 이면 사전 → 규칙 → 원문 순서로 시도
 */
export function translate(text: string, lang: Lang, vars?: Vars): string {
  if (typeof text !== "string" || text.length === 0) return text;
  const original = keepAsIs.get(normalizeKey(text)) ?? text;
  if (lang === "ko") return interpolate(original, vars);
  // 사전 → 규칙 → 원문. 규칙은 "10-2026-0028285" 같은 숫자 문구도 영어 표기로 바꾼다.
  const translated = lookup(original) ?? applyRules(original);
  return interpolate(translated ?? original, vars);
}

export type LanguageSource = "query" | "stored" | "browser" | "default";

export interface LanguageSources {
  /** location.search — ?lang=en */
  search?: string;
  /** localStorage 값 */
  stored?: string | null;
  /** navigator.languages (없으면 navigator.language 하나만) */
  languages?: readonly string[] | null;
}

export function parseLang(value: string | null | undefined): Lang | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  const base = normalized.split(/[-_]/)[0];
  if (base === "ko" || base === "kr") return "ko";
  if (base === "en") return "en";
  return null;
}

/** ?lang=en 처럼 주소로 들어온 언어 */
export function langFromQuery(search: string): Lang | null {
  const query = String(search ?? "").replace(/^\?/, "");
  if (!query) return null;
  for (const pair of query.split("&")) {
    const [rawKey, rawValue = ""] = pair.split("=");
    if (decodeURIComponent(rawKey) !== LANG_QUERY_KEY) continue;
    return parseLang(decodeURIComponent(rawValue.replace(/\+/g, " ")));
  }
  return null;
}

/**
 * 브라우저가 "영어권"인지 판단한다.
 * ko 가 en 보다 먼저 있으면 한국어, 처음 만난 ko/en 이 en 이면 영어.
 */
export function langFromBrowser(languages: readonly string[] | null | undefined): Lang | null {
  for (const value of languages ?? []) {
    const picked = parseLang(value);
    if (picked) return picked;
  }
  return null;
}

/** 자동 감지 우선순위: 주소 → 저장된 선택 → 브라우저 언어 → 한국어 */
export function resolveLanguage({
  search = "",
  stored = null,
  languages = null,
}: LanguageSources = {}): { lang: Lang; source: LanguageSource } {
  const fromQuery = langFromQuery(search);
  if (fromQuery) return { lang: fromQuery, source: "query" };
  const fromStorage = parseLang(stored);
  if (fromStorage) return { lang: fromStorage, source: "stored" };
  const fromBrowser = langFromBrowser(languages);
  if (fromBrowser) return { lang: fromBrowser, source: "browser" };
  return { lang: DEFAULT_LANG, source: "default" };
}

/** 브라우저가 알려주는 언어 목록 (없으면 빈 배열) */
export function browserLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  const list = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];
  return list.filter((value): value is string => typeof value === "string" && value.length > 0);
}

/** 저장된 언어 선택 읽기·쓰기 (사생활 보호 모드 등에서 실패해도 화면은 계속 돈다) */
export function readStoredLang(): Lang | null {
  try {
    return parseLang(window.localStorage.getItem(LANG_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredLang(lang: Lang): void {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* 저장 실패는 무시 — 이번 방문 동안에는 언어가 바뀐다 */
  }
}
