import { useState } from "react";
import { cn } from "@/utils/cn";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { useContent } from "@/cms/ContentContext";

export function Faq() {
  const { faqs } = useContent();
  const [open, setOpen] = useState<number | null>(0);
  if (faqs.length === 0) return null;

  return (
    <section id="faq" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          num="10 / FAQ"
          label="FAQ"
          title={<>자주 묻는 내용을 먼저 확인해보세요</>}
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <div className="card rounded-3xl p-8">
              <div className="font-mono text-[10px] tracking-[0.2em] text-brand-light">
                STILL CURIOUS?
              </div>
              <h3 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-paper">
                찾는 답변이 없나요?
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-mute">
                영상의 목적, 업로드 채널, 참고 레퍼런스, 희망 납기일을 알려주세요.
                자료가 모두 준비되지 않아도 괜찮습니다.
              </p>
              <a
                href="#contact"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-dark px-6 py-3 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5"
              >
                무료 상담 시작
              </a>
            </div>
          </Reveal>

          <Reveal delay={1}>
            <div className="divide-y divide-white/8 overflow-hidden rounded-3xl border border-white/10">
              {faqs.map((faq, i) => {
                const isOpen = open === i;
                return (
                  <div key={faq.key} className="bg-white/[0.02]" data-faq-open={isOpen ? "true" : "false"}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-center gap-4 px-6 py-5 text-left transition-colors hover:bg-white/[0.03] sm:px-8"
                    >
                      <span className="font-mono text-[11px] text-brand-light">
                        Q{i + 1}
                      </span>
                      <span className="flex-1 text-[15px] font-semibold text-paper">
                        {faq.q}
                      </span>
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                          isOpen
                            ? "rotate-45 border-brand-light/60 bg-brand/15 text-neon"
                            : "border-white/15 text-faint",
                        )}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          className="h-3.5 w-3.5"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </span>
                    </button>
                    <div
                      className={cn(
                        "grid transition-all duration-400",
                        isOpen
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <div className="overflow-hidden" aria-hidden={!isOpen}>
                        <p className="px-6 pb-6 pl-[calc(1.5rem+2.2rem)] text-[14px] leading-relaxed text-mute sm:px-8">
                          {faq.a}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
