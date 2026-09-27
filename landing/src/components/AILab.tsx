import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { labChips } from "@/data/content";

const cutLabels = [
  "OPENING",
  "PROBLEM",
  "TURN",
  "PRODUCT",
  "DETAIL",
  "EMOTION",
  "PROOF",
  "LIFESTYLE",
  "LOGO",
];

function StoryboardGrid() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {cutLabels.map((label, i) => (
        <div
          key={label}
          className="group relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-brand-dark/40 via-ink-3 to-fuchsia-900/25"
        >
          <div
            className="absolute inset-0 opacity-40 transition-opacity duration-500 group-hover:opacity-70"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, rgba(167,139,250,0.12) 0 2px, transparent 2px 8px)",
            }}
          />
          <span className="absolute left-1.5 top-1.5 font-mono text-[9px] text-neon/80">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="absolute inset-x-1.5 bottom-1.5 truncate font-mono text-[8px] tracking-[0.14em] text-white/50">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AILab() {
  return (
    <section id="lab" className="relative overflow-hidden py-24 sm:py-32">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/12 blur-[130px] animate-pulse-glow" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          num="04 / AI CONTENT LAB"
          label="AI content lab"
          title={
            <>
              AI를 단순 생성 버튼으로
              <br />
              쓰지 않습니다
            </>
          }
          desc="기획·공간·캐릭터·동선·편집을 하나의 제작 흐름으로 연결해, 결과를 예측하고 수정할 수 있게 설계합니다. XCONDA는 큐브베리의 올인원 AI 영상 제작 플랫폼으로, 14개 이상의 AI 모델을 하나의 흐름으로 연결합니다."
        />

        <div className="mt-16 grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          {/* 비교 칩 + 이미지 */}
          <Reveal>
            <div className="space-y-3">
              {labChips.map((c, i) => (
                <div
                  key={i}
                  className="card flex items-center gap-4 rounded-2xl px-5 py-4"
                >
                  <span className="flex-1 font-mono text-[11px] tracking-[0.08em] text-faint line-through decoration-fuchsia-500/50">
                    {c.bad}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-4 w-4 shrink-0 text-brand-light"
                  >
                    <path d="M5 12h14m-6-6 6 6-6 6" />
                  </svg>
                  <span className="flex-1 text-right text-[13px] font-semibold text-paper">
                    {c.good}
                  </span>
                </div>
              ))}
            </div>

            <div className="relative mt-8 overflow-hidden rounded-3xl border border-white/10">
              <img
                src="images/lab-storyboard.jpg"
                alt="홀로그램 스토리보드 앞에서 연출하는 감독"
                className="h-64 w-full object-cover sm:h-72"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <div className="font-mono text-[10px] tracking-[0.22em] text-neon">
                  XCONDA / STORYBOARD 01 → 09 CUTS
                </div>
                <div className="mt-1 text-sm font-bold text-paper">
                  시나리오와 참고 이미지를 9컷 보드로 구조화하고, 필요한 컷만
                  선택해 다시 생성합니다.
                </div>
              </div>
            </div>
          </Reveal>

          {/* 9컷 보드 모형 */}
          <Reveal delay={2}>
            <div className="card rounded-3xl p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] tracking-[0.22em] text-brand-light">
                    FLEXBOARD PREVIEW
                  </div>
                  <div className="mt-1 font-display text-lg font-extrabold tracking-tight text-paper">
                    9-CUT STORYBOARD
                  </div>
                </div>
                <span className="rounded-full border border-lime/30 bg-lime/10 px-3 py-1 font-mono text-[10px] text-lime">
                  REGENERATE PER CUT
                </span>
              </div>
              <div className="mt-6">
                <StoryboardGrid />
              </div>
              <p className="mt-5 text-[13px] leading-relaxed text-mute">
                전체를 버리지 않고 연출 의도를 유지합니다. 각 컷의 앵글·무드·타이밍을
                설정하고, 원하는 프레임을 그대로 구현합니다.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
