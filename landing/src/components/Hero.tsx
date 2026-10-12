import { Reveal } from "./Reveal";
import { heroStills } from "@/data/content";
import { useContent } from "@/cms/ContentContext";
import { useI18n } from "@/i18n/LanguageContext";

/** 히어로 제목 — 마지막 단어를 accent gold 로 분리한다 (테스트가 .text-gradient 단어를 확인). */
function HeroTitle({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  const last = words.pop() ?? "";
  return (
    <>
      {words.length > 0 && (
        <>
          {words.join(" ")}
          <br />
        </>
      )}
      <span className="text-gradient">{last}</span>
    </>
  );
}

/**
 * E안 히어로 — 왼쪽 제목·설명·CTA, 오른쪽 3×2 스틸 격자.
 * 아래 상품 칩은 어드민 "상품" 값이 그대로 반영된다.
 */
export function Hero() {
  const { settings, services } = useContent();
  const { t } = useI18n();

  return (
    <section id="top" className="scroll-mt-0 pt-[60px]">
      <div className="shell">
        <div className="flex flex-wrap items-center gap-x-14 gap-y-12 py-[clamp(40px,7vw,90px)]">
          <div className="flex min-w-0 flex-[999_1_460px] flex-col gap-6">
            <Reveal className="flex items-center gap-3 font-mono text-xs tracking-[0.16em] text-mute">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 animate-blink rounded-full bg-rec"
              />
              <span>{t(settings.eyebrow)}</span>
            </Reveal>

            <Reveal delay={1}>
              <h1 className="balance-text m-0 text-[clamp(42px,6vw,80px)] font-bold leading-[1.05] tracking-[-0.035em] text-paper">
                <HeroTitle text={t(settings.heroTitle)} />
              </h1>
            </Reveal>

            <Reveal delay={2}>
              <p className="m-0 max-w-[30em] text-[19px] leading-[1.6] text-body">
                {t(settings.heroSubtitle)}
              </p>
            </Reveal>

            <Reveal delay={3}>
              <div className="flex flex-wrap items-center gap-5">
                <a
                  href="#contact"
                  className="rounded-[3px] bg-brand px-[22px] py-[15px] text-[15px] font-semibold text-[#140f00] transition-colors duration-200 hover:bg-brand-light"
                >
                  {t("회사소개서 PDF 받기")}
                </a>
                <a
                  href={`mailto:${settings.email}?subject=${encodeURIComponent(t("IR · 취재 문의"))}`}
                  className="border-b border-line-3 py-0.5 text-sm text-paper transition-colors duration-200 hover:border-brand hover:text-brand"
                >
                  {t(settings.heroNote)} →
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={2} className="flex min-w-0 flex-[1_1_400px] flex-col gap-2.5">
            <div className="grid grid-cols-3 gap-1.5 rounded-[4px] border border-line bg-void p-1.5">
              {heroStills.map((still, i) => (
                <img
                  key={still.src}
                  src={still.src}
                  alt={t(still.alt)}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="block aspect-[4/5] w-full object-cover"
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] tracking-[0.12em] text-faint">
              <span>{t("우리가 만든 작품 {count}편", { count: heroStills.length })}</span>
              <a href="#works" className="text-body transition-colors hover:text-paper">
                {t("포트폴리오 →")}
              </a>
            </div>
          </Reveal>
        </div>

        {services.length > 0 && (
          <Reveal delay={3} className="pb-[clamp(40px,6vw,72px)]">
            <div className="grid overflow-hidden rounded-[4px] border border-line sm:grid-cols-3">
              {services.map((service, i) => (
                <a
                  key={service.key}
                  href="#pricing"
                  aria-label={t("{name} {price} 자세히 보기", { name: t(service.name), price: t(service.price) })}
                  className={`grid min-h-[86px] grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 bg-ink-3 px-5 py-4 transition-colors duration-200 hover:bg-[#1c1c19] ${
                    i > 0 ? "border-t border-line sm:border-t-0 sm:border-l" : ""
                  }`}
                >
                  <span className="font-mono text-[10px] tracking-[0.18em] text-brand">
                    {service.tier}
                  </span>
                  <span className="row-span-2 text-[19px] font-bold text-paper">
                    {t(service.price)}
                  </span>
                  <span className="font-mono text-[10px] text-faint">{t(service.duration)}</span>
                </a>
              ))}
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
