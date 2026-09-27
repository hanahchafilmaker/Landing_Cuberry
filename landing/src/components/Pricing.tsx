import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { useContent } from "@/cms/ContentContext";

const accentRing: Record<string, string> = {
  lime: "from-lime/60 to-lime/10",
  amber: "from-amber/60 to-amber/10",
  violet: "from-brand/60 to-brand/10",
};

const accentText: Record<string, string> = {
  lime: "text-lime",
  amber: "text-amber",
  violet: "text-neon",
};

const accentBadge: Record<string, string> = {
  lime: "border-lime/30 bg-lime/10 text-lime",
  amber: "border-amber/30 bg-amber/10 text-amber",
  violet: "border-brand-light/30 bg-brand/10 text-neon",
};

export function Pricing() {
  const { services } = useContent();
  // 어드민에서 상품을 모두 비공개로 돌리면 섹션을 숨긴다.
  if (services.length === 0) return null;
  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand/8 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          num="07 / AI ADVERTISING"
          label="AI advertising"
          title={
            <>
              AI 생성만으로 끝내지 않습니다
            </>
          }
          desc="기획부터 컷 편집, 후보정, 사운드까지 광고 영상의 전체 공정을 설계합니다. 목적과 컷 수에 맞는 구성으로 바로 상담하세요."
        />

        <div
          className={`mt-16 grid items-stretch gap-6 ${
            services.length === 1 ? "mx-auto max-w-md" : services.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"
          }`}
        >
          {services.map((s, i) => {
            const featured = s.badge === "MOST CHOSEN";
            return (
              <Reveal key={s.key} delay={(i % 3) + 1} className="h-full">
                <article
                  className={`card relative flex h-full flex-col rounded-3xl p-8 ${
                    featured
                      ? "border-amber/40 bg-gradient-to-b from-amber/8 to-transparent lg:-my-4 lg:py-12"
                      : "card-glow"
                  }`}
                >
                  {featured && (
                    <span className="absolute -top-3 left-8 rounded-full bg-gradient-to-r from-amber to-amber/70 px-4 py-1 font-mono text-[10px] font-bold tracking-[0.16em] text-ink">
                      {s.badge}
                    </span>
                  )}
                  <div
                    className={`mb-6 h-1 w-14 rounded-full bg-gradient-to-r ${
                      accentRing[s.accent]
                    }`}
                  />
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-[11px] tracking-[0.22em] ${
                        accentText[s.accent]
                      }`}
                    >
                      {s.tier} / {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 font-mono text-[10px] ${
                        accentBadge[s.accent]
                      }`}
                    >
                      {s.duration}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-paper">
                    {s.name}
                  </h3>
                  <div className="mt-5 flex items-baseline gap-2">
                    <span className="font-display text-[44px] font-extrabold leading-none tracking-tight text-paper">
                      {s.price}
                    </span>
                  </div>
                  {s.desc && (
                    <p className="mt-4 text-[13.5px] leading-relaxed text-mute">
                      {s.desc}
                    </p>
                  )}
                  <ul className="mt-7 flex-1 space-y-3">
                    {s.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-3 text-[14px] text-paper/90"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.2}
                          className={`h-4 w-4 shrink-0 ${
                            accentText[s.accent]
                          }`}
                        >
                          <path d="M4 12.5 9.5 18 20 6.5" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#contact"
                    className={`mt-8 inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-bold transition-all duration-300 ${
                      featured
                        ? "btn-glow bg-gradient-to-r from-amber to-amber/80 text-ink hover:-translate-y-0.5"
                        : "border border-white/20 text-paper hover:border-brand-light/60 hover:bg-brand/10"
                    }`}
                  >
                    이 구성으로 상담하기
                  </a>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={4}>
          <p className="mt-8 text-center font-mono text-[11px] text-faint">
            * 표기 금액은 참고용 기본 구성입니다. 영상 길이·컷 수·캐릭터 수·연출
            난이도에 따라 최종 견적이 달라질 수 있습니다.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
