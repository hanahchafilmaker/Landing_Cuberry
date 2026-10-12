import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { sectors } from "@/data/content";
import { useI18n } from "@/i18n/LanguageContext";

/**
 * TWO SECTORS — 만드는 팀(스튜디오)과 만드는 도구(XCONDA).
 * E안은 배경 스틸 위에 그라디언트를 깔아 글자를 얹는 큰 카드 두 장이다.
 */
export function Sectors() {
  const { t } = useI18n();

  return (
    <section id="sectors" className="section">
      <div className="shell flex flex-col gap-8">
        <SectionHeading label="TWO SECTORS" title={t("만드는 팀과, 만드는 도구")} />

        <div className="grid gap-5 md:grid-cols-2">
          {sectors.map((sector, i) => (
            <Reveal key={sector.num} delay={i + 1} className="h-full">
              <a
                href={sector.href}
                className="group relative flex h-full min-h-[320px] flex-col justify-end overflow-hidden rounded-[4px] border border-line bg-void text-paper no-underline"
              >
                <img
                  src={sector.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover opacity-[0.55] transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(5,5,5,0.95) 30%, rgba(5,5,5,0))",
                  }}
                />
                <span className="relative flex flex-col gap-2 p-7">
                  <span className="font-mono text-[11px] tracking-[0.14em] text-brand">
                    {sector.num} · {sector.kicker}
                  </span>
                  <span className="text-[28px] font-bold leading-tight tracking-[-0.02em]">
                    {t(sector.title)}
                  </span>
                  <span className="text-[15px] leading-relaxed text-body">{t(sector.desc)}</span>
                  <span className="mt-1 text-sm font-medium text-brand">{t(sector.cta)}</span>
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
