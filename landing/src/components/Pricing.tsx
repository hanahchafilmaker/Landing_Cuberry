import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { useContent } from "@/cms/ContentContext";
import { useI18n } from "@/i18n/LanguageContext";

/**
 * 상품(AI 광고 요금제) — 어드민 "상품" 탭의 이름·가격·기간·설명이 카드가 된다.
 * E안 색언어에 맞춰 강조는 gold 상단 선 하나로만 표현한다.
 */
export function Pricing() {
  const { services } = useContent();
  const { t } = useI18n();
  // 어드민에서 상품을 모두 비공개로 돌리면 섹션을 숨긴다.
  if (services.length === 0) return null;

  return (
    <section id="pricing" className="section">
      <div className="shell">
        <SectionHeading
          label="AI ADVERTISING"
          title={t("AI 생성만으로 끝내지 않습니다")}
          desc={t("기획부터 컷 편집, 후보정, 사운드까지 광고 영상의 전체 공정을 설계합니다. 목적과 컷 수에 맞는 구성으로 바로 상담하세요.")}
        />

        <div
          className={`mt-14 grid items-stretch gap-4 ${
            services.length === 1
              ? "mx-auto max-w-md"
              : services.length === 2
                ? "lg:grid-cols-2"
                : "lg:grid-cols-3"
          }`}
        >
          {services.map((s, i) => {
            const featured = s.badge === "MOST CHOSEN";
            return (
              <Reveal key={s.key} delay={(i % 3) + 1} className="h-full">
                <article
                  className={`flex h-full flex-col rounded-[4px] border border-line bg-ink-3 p-7 transition-colors duration-200 hover:border-line-4 ${
                    featured ? "border-t-2 border-t-brand" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-[11px] tracking-[0.2em] text-brand">
                      {s.tier} / {String(i + 1).padStart(2, "0")}
                    </span>
                    {s.badge && (
                      <span className="rounded-full bg-brand px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.12em] text-[#140f00]">
                        {s.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-4 text-[22px] font-bold tracking-[-0.02em] text-paper">
                    {t(s.name)}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-[38px] font-bold leading-none tracking-[-0.03em] text-paper">
                      {t(s.price)}
                    </span>
                    <span className="font-mono text-[11px] text-faint">{t(s.duration)}</span>
                  </div>
                  {s.desc && (
                    <p className="mt-3 text-[13.5px] leading-relaxed text-mute">{t(s.desc)}</p>
                  )}

                  <ul className="m-0 mt-6 flex flex-1 list-none flex-col gap-2.5 border-t border-line pt-5">
                    {s.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-body">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.2}
                          className="h-3.5 w-3.5 shrink-0 text-brand"
                          aria-hidden="true"
                        >
                          <path d="M4 12.5 9.5 18 20 6.5" />
                        </svg>
                        {t(f)}
                      </li>
                    ))}
                  </ul>

                  <a
                    href="#contact"
                    className={`mt-7 inline-flex items-center justify-center rounded-[3px] px-5 py-3.5 text-sm font-semibold transition-colors duration-200 ${
                      featured
                        ? "bg-brand text-[#140f00] hover:bg-brand-light"
                        : "border border-line-2 text-paper hover:border-brand hover:text-brand"
                    }`}
                  >
                    {t("이 구성으로 상담하기")}
                  </a>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={4}>
          <p className="mt-7 font-mono text-[11px] text-faint">
            {t(
              "* 표기 금액은 참고용 기본 구성입니다. 영상 길이·컷 수·캐릭터 수·연출 난이도에 따라 최종 견적이 달라질 수 있습니다.",
            )}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
