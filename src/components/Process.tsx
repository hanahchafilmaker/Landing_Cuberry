import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { b2bItems, processSteps } from "@/data/content";

export function Process() {
  return (
    <section id="process" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          num="08 / PROCESS"
          label="Process"
          title={
            <>
              목표와 일정, 예산을 먼저
              <br />
              정리하는 제작 구조
            </>
          }
          desc="피드백이 빠르게 반영될 수 있는 구조로 진행합니다."
        />

        {/* 프로세스 타임라인 */}
        <div className="relative mt-16">
          <div className="absolute inset-x-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-brand-light/40 to-transparent lg:block" />
          <div className="grid gap-8 lg:grid-cols-4">
            {processSteps.map((step, i) => (
              <Reveal key={step.num} delay={i + 1}>
                <div className="relative">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-brand-light/40 bg-ink font-display text-xl font-extrabold text-neon lg:mx-0">
                    {step.num}
                  </div>
                  <h3 className="mt-6 font-display text-xl font-extrabold tracking-tight text-paper">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-mute">
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* B2B */}
        <div className="mt-28">
          <SectionHeading
            num="09 / CUSTOM & B2B"
            label="Custom & B2B"
            title={
              <>
                캠페인부터 IP 개발까지,
                <br />
                규모에 맞는 전담 팀을 구성합니다
              </>
            }
            desc="캠페인, 월간 콘텐츠 운영, 기업 제휴, IP·웹드라마 개발까지 프로젝트 규모에 맞춰 별도 제작팀을 구성합니다."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {b2bItems.map((item, i) => (
              <Reveal key={item.num} delay={i + 1}>
                <div className="card card-glow h-full rounded-3xl p-7">
                  <span className="font-mono text-3xl font-bold text-white/10">
                    {item.num}
                  </span>
                  <h3 className="mt-3 font-display text-lg font-extrabold tracking-tight text-paper">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[13px] text-faint">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
