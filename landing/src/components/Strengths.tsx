import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { strengths } from "@/data/content";

export function Strengths() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-ink-2 px-6 py-14 sm:px-12 sm:py-20">
          <SectionHeading
            num="03 / STRENGTHS"
            label="Strengths"
            title={
              <>
                차별점은 사람과
                <br />
                프로세스에서 나옵니다
              </>
            }
            desc="2026 플로우나인 소개서의 차별점과 제작 운영 원칙을 웹페이지에 명시했습니다."
          />

          <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2">
            {strengths.map((s, i) => (
              <Reveal key={s.num} delay={i + 1}>
                <div className="group relative border-t border-white/10 pt-7">
                  <div className="flex items-baseline gap-4">
                    <span className="font-mono text-sm font-bold text-brand-light">
                      {s.num}
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.2em] text-faint transition-colors group-hover:text-neon">
                      {s.key}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-paper">
                    {s.title}
                  </h3>
                  <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-mute">
                    {s.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
