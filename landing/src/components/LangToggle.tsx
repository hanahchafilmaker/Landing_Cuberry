import { cn } from "@/utils/cn";
import { useI18n } from "@/i18n/LanguageContext";
import { LANGS } from "@/i18n/translate";

interface LangToggleProps {
  className?: string;
}

/**
 * 헤더의 KO / EN 전환 버튼.
 * 언어는 자동 감지되지만, 방문자가 직접 고른 값이 있으면 그 선택이 우선하고 기억된다.
 */
export function LangToggle({ className }: LangToggleProps) {
  const { lang, t, setLang } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("언어 선택")}
      data-lang-toggle={lang}
      className={cn(
        "flex items-center gap-0.5 rounded-[3px] border border-line-2 p-0.5",
        className,
      )}
    >
      {LANGS.map((value) => {
        const on = lang === value;
        return (
          <button
            key={value}
            type="button"
            lang={value}
            aria-pressed={on}
            onClick={() => setLang(value)}
            className={cn(
              "min-h-7 cursor-pointer rounded-[2px] px-2 py-1 font-mono text-[11px] tracking-[0.12em] transition-colors duration-200",
              on ? "bg-paper font-medium text-ink" : "text-mute hover:text-paper",
            )}
          >
            {value.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
