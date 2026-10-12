import { footerGroups, settings as defaults } from "@/data/content";
import { useContent } from "@/cms/ContentContext";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/i18n/LanguageContext";

/**
 * 푸터 — E안은 4개 열(회사 정보 · 회사소개 · 스튜디오 · 엑스콘다)이고
 * 사업자 정보·연락처를 첫 열에 그대로 박아둔다.
 */
export function Footer() {
  const { settings } = useContent();
  const { t } = useI18n();
  const telHref = `tel:${settings.phone.replace(/[^\d+]/g, "")}`;

  return (
    <footer className="border-t border-line bg-ink-2">
      <div className="shell grid gap-8 py-14 text-[13px] text-mute sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Logo brand={settings.brand} className="text-[15px]" />
          <span>
            {t("{legal} · 대표 {ceo}", { legal: t(defaults.legalName), ceo: t(defaults.ceo) })}
          </span>
          <span>{t("사업자등록번호 {bizNo}", { bizNo: defaults.bizNo })}</span>
          <span className="flex flex-wrap gap-x-2">
            <a
              href={`mailto:${settings.email}`}
              className="text-body transition-colors hover:text-paper"
            >
              {settings.email}
            </a>
            <span aria-hidden="true">·</span>
            <a
              href={telHref}
              className="text-body transition-colors hover:text-paper"
            >
              {settings.phone}
            </a>
          </span>
        </div>

        {footerGroups.map((group) => (
          <div key={group.title} className="flex flex-col gap-2">
            <a href={group.href} className="text-paper no-underline transition-colors hover:text-brand">
              {t(group.title)}
            </a>
            {group.lines.map((line) => (
              <span key={line}>{t(line)}</span>
            ))}
          </div>
        ))}
      </div>

      <div className="shell flex flex-col items-start justify-between gap-3 border-t border-line py-6 font-mono text-[11px] text-faint sm:flex-row sm:items-center">
        <span>
          {t("© 2026 {brand} · {brandKo} — Imagine Speaks, AI Completes.", {
            brand: settings.brand,
            brandKo: t(settings.brandKo),
          })}
        </span>
        <span>SEOUL · GWANGJU · BUCHEON</span>
      </div>
    </footer>
  );
}
