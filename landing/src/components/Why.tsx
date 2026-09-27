import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { whyItems } from "@/data/content";

/* ── 행별 비주얼 ─────────────────────────────── */

function ExperienceVisual() {
  return (
    <div className="relative">
      <div className="absolute -inset-3 rounded-3xl bg-brand/10 blur-2xl" />
      <div className="card relative rounded-3xl p-8">
        <div className="font-display text-6xl font-extrabold tracking-tight text-paper">
          28<span className="text-gradient">년+</span>
        </div>
        <div className="mt-2 font-mono text-[11px] tracking-[0.16em] text-brand-light">
          FILMMAKING EXPERTISE
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {["KBS 방송 제작", "TVCF", "브랜드 필름", "AI 콘텐츠", "다큐멘터리"].map(
            (t) => (
              <span
                key={t}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-mute"
              >
                {t}
              </span>
            ),
          )}
        </div>
        <div className="mt-6 space-y-3">
          {[
            { k: "PD 기획력", v: "방송·광고 현장 출신" },
            { v: "모션그래퍼 크리에이티브", k: "영상 디자인" },
          ].map((row, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-2xl border border-white/8 bg-ink-2/60 px-4 py-3"
            >
              <span className="text-sm font-semibold text-paper">{row.k}</span>
              <span className="font-mono text-[11px] text-faint">{row.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OneStopVisual() {
  const steps = ["기획", "촬영", "편집", "모션그래픽", "납품"];
  return (
    <div className="relative">
      <div className="absolute -inset-3 rounded-3xl bg-fuchsia-700/10 blur-2xl" />
      <div className="card relative rounded-3xl p-8">
        <div className="font-mono text-[11px] tracking-[0.18em] text-brand-light">
          PRODUCTION PIPELINE
        </div>
        <div className="mt-6 space-y-0">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-light/40 bg-brand/10 font-mono text-[11px] text-neon">
                  {String(i + 1).padStart(2, "0")}
                </div>
                {i < steps.length - 1 && (
                  <div className="h-6 w-px bg-gradient-to-b from-brand-light/50 to-transparent" />
                )}
              </div>
              <div className="flex flex-1 items-center justify-between rounded-xl border border-white/8 bg-ink-2/60 px-4 py-2">
                <span className="text-sm font-semibold text-paper">{s}</span>
                <span className="font-mono text-[10px] text-faint">IN-HOUSE</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-lime/20 bg-lime/5 px-4 py-3 text-xs text-lime/90">
          핵심 과정을 한 팀이 직접 진행합니다.
        </div>
      </div>
    </div>
  );
}

function AssetVisual() {
  const formats = [
    { label: "16:9", name: "메인·유튜브", h: "h-20" },
    { label: "9:16", name: "숏폼·릴스", h: "h-28" },
    { label: "1:1", name: "피드·배너", h: "h-24" },
  ];
  return (
    <div className="relative">
      <div className="absolute -inset-3 rounded-3xl bg-brand/10 blur-2xl" />
      <div className="card relative flex items-end justify-center gap-5 rounded-3xl p-8">
        {formats.map((f) => (
          <div key={f.label} className="flex flex-col items-center gap-3">
            <div
              className={`${f.h} w-20 rounded-xl border border-brand-light/30 bg-gradient-to-br from-brand/25 to-fuchsia-800/20`}
            />
            <div className="font-mono text-[11px] text-neon">{f.label}</div>
            <div className="text-[11px] text-faint">{f.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const visuals = [ExperienceVisual, OneStopVisual, AssetVisual];

export function Why() {
  return (
    <section id="why" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          num="01 / WHY CUBERRY"
          label="Why Cuberry"
          title={
            <>
              브랜드가 오래 기억되는
              <br />
              영상을 만듭니다
            </>
          }
          desc="28년 이상의 필름메이킹 전문성과 PD의 기획력, 모션그래퍼의 크리에이티브가 만납니다. 실제 방송 제작에서 검증된 XCONDA와 원스톱 제작 시스템을 기반으로, 영상의 처음과 끝을 함께 만드는 제작 스튜디오입니다."
        />

        <div className="mt-16 space-y-20 lg:space-y-28">
          {whyItems.map((item, i) => {
            const Visual = visuals[i];
            const reversed = i % 2 === 1;
            return (
              <div
                key={item.num}
                className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
              >
                <Reveal className={reversed ? "lg:order-2" : ""}>
                  <div className="font-mono text-6xl font-bold tracking-tight text-white/8">
                    {item.num}
                  </div>
                  <div className="-mt-6">
                    <span className="font-mono text-[11px] tracking-[0.22em] text-brand-light">
                      {item.key}
                    </span>
                    <h3 className="mt-3 font-display text-[clamp(22px,2.6vw,32px)] font-extrabold tracking-tight text-paper">
                      {item.title}
                    </h3>
                    <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-mute">
                      {item.desc}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {item.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] tracking-[0.1em] text-faint transition-colors hover:border-brand-light/40 hover:text-neon"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </Reveal>
                <Reveal delay={2} className={reversed ? "lg:order-1" : ""}>
                  <Visual />
                </Reveal>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
