import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { b2bItems, processSteps } from "@/data/content";

/** 제작 프로세스 + B2B 구성 — E안에서는 번호를 gold mono 로만 표시한다. */
export function Process() {
  return (
    <section id="process" className="section">
      <div className="shell">
        <SectionHeading
          label="PROCESS"
          title={
            <>
              목표와 일정, 예산을 먼저
              <br />
              정리하는 제작 구조
            </>
          }
          desc="피드백이 빠르게 반영될 수 있는 구조로 진행합니다."
        />

        <ol className="m-0 mt-12 grid list-none gap-px overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {processSteps.map((step, i) => (
            <Reveal key={step.num} as="li" delay={i + 1} className="bg-ink-3">
              <div className="flex h-full flex-col gap-2 p-6">
                <span className="font-mono text-xs text-brand">{step.num}</span>
                <h3 className="m-0 text-[17px] font-semibold tracking-[-0.01em] text-paper">
                  {step.title}
                </h3>
                <p className="m-0 text-[13.5px] leading-relaxed text-mute">{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </ol>

        <div className="mt-20">
          <SectionHeading
            label="CUSTOM &amp; B2B"
            title={
              <>
                캠페인부터 IP 개발까지,
                <br />
                규모에 맞는 전담 팀을 구성합니다
              </>
            }
            desc="캠페인, 월간 콘텐츠 운영, 기업 제휴, IP·웹드라마 개발까지 프로젝트 규모에 맞춰 별도 제작팀을 구성합니다."
          />
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {b2bItems.map((item, i) => (
              <Reveal key={item.num} delay={i + 1} className="h-full">
                <div className="flex h-full flex-col gap-1.5 rounded-[4px] border-t border-brand bg-ink-3 p-6">
                  <span className="font-mono text-[11px] text-faint">{item.num}</span>
                  <h3 className="m-0 text-[15px] font-semibold text-paper">{item.title}</h3>
                  <p className="m-0 text-[13px] text-mute">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
