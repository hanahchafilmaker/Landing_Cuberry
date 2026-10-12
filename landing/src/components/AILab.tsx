import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { labChips } from "@/data/content";
import { T, useI18n } from "@/i18n/LanguageContext";

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

/** 9컷 스토리보드 보드 모형 — FLEXBOARD 의 구조를 그대로 보여준다. */
function StoryboardGrid() {
  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-[4px] border border-line bg-void p-1.5">
      {cutLabels.map((label, i) => (
        <div
          key={label}
          className="group relative aspect-video overflow-hidden rounded-[2px] border border-line bg-ink-3 transition-colors duration-300 hover:border-line-4"
        >
          <span className="absolute left-1.5 top-1.5 font-mono text-[9px] text-brand/80">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="absolute inset-x-1.5 bottom-1.5 truncate font-mono text-[8px] tracking-[0.14em] text-faint">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * XCONDA · AI CONTENT LAB — E안의 "만드는 도구" 섹터에서 이어지는 절.
 * 글자 크기·구분선만 디자인 값에 맞추고, 구성(비교 → 보드)은 유지한다.
 */
export function AILab() {
  const { t } = useI18n();

  return (
    <section id="lab" className="section">
      <div className="shell">
        <SectionHeading
          label="02 · PLATFORM · XCONDA"
          title={<T text={"AI를 단순 생성 버튼으로\n쓰지 않습니다"} />}
          desc={t("기획·공간·캐릭터·동선·편집을 하나의 제작 흐름으로 연결해, 결과를 예측하고 수정할 수 있게 설계합니다. XCONDA는 큐브베리의 올인원 AI 영상 제작 플랫폼으로, 14개 이상의 AI 모델을 하나의 흐름으로 연결합니다.")}
        />

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <Reveal className="flex flex-col gap-3">
            {labChips.map((chip, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-[4px] border border-line bg-ink-3 px-5 py-4"
              >
                <span className="flex-1 font-mono text-[11px] text-faint line-through decoration-line-4">
                  {chip.bad}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  className="h-4 w-4 shrink-0 text-brand"
                  aria-hidden="true"
                >
                  <path d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
                <span className="flex-1 text-right text-[13px] font-medium text-paper">
                  {chip.good}
                </span>
              </div>
            ))}

            <div className="relative mt-5 overflow-hidden rounded-[4px] border border-line">
              <img
                src="images/lab-storyboard.jpg"
                alt={t("홀로그램 스토리보드 앞에서 연출하는 감독")}
                loading="lazy"
                decoding="async"
                className="h-60 w-full object-cover sm:h-72"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background: "linear-gradient(to top, rgba(5,5,5,0.94) 22%, rgba(5,5,5,0))",
                }}
              />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <div className="font-mono text-[10px] tracking-[0.2em] text-brand">
                  XCONDA / STORYBOARD 01 → 09 CUTS
                </div>
                <div className="mt-1 text-sm font-medium text-paper">
                  {t("시나리오와 참고 이미지를 9컷 보드로 구조화하고, 필요한 컷만 선택해 다시 생성합니다.")}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={2}>
            <div className="rounded-[4px] border border-line bg-ink-3 p-6 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] tracking-[0.22em] text-brand">
                    FLEXBOARD PREVIEW
                  </div>
                  <div className="mt-1 text-lg font-semibold tracking-[-0.01em] text-paper">
                    9-CUT STORYBOARD
                  </div>
                </div>
                <span className="rounded-full border border-line-2 px-3 py-1 font-mono text-[10px] text-body">
                  REGENERATE PER CUT
                </span>
              </div>
              <div className="mt-6">
                <StoryboardGrid />
              </div>
              <p className="mt-5 text-[13px] leading-relaxed text-mute">
                {t(
                  "전체를 버리지 않고 연출 의도를 유지합니다. 각 컷의 앵글·무드·타이밍을 설정하고, 원하는 프레임을 그대로 구현합니다.",
                )}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
