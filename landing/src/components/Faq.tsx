import { useState } from "react";
import { cn } from "@/utils/cn";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { useContent } from "@/cms/ContentContext";
import { useI18n } from "@/i18n/LanguageContext";

/** FAQ — 어드민 "FAQ" 탭의 질문·답변. 열림/닫힘은 1px 아코디언으로만 표현한다. */
export function Faq() {
  const { faqs } = useContent();
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(0);
  if (faqs.length === 0) return null;

  return (
    <section id="faq" className="section">
      <div className="shell grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-14">
        <div className="flex flex-col gap-4">
          <SectionHeading label="FAQ" title={t("자주 묻는 내용을 먼저 확인해보세요")} />
          <Reveal delay={1}>
            <div className="rounded-[4px] border border-line bg-ink-3 p-6">
              <div className="font-mono text-[11px] tracking-[0.16em] text-brand">
                STILL CURIOUS?
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-body">
                {t(
                  "영상의 목적, 업로드 채널, 참고 레퍼런스, 희망 납기일을 알려주세요. 자료가 모두 준비되지 않아도 괜찮습니다.",
                )}
              </p>
              <a
                href="#contact"
                className="mt-5 inline-flex items-center gap-2 rounded-[3px] bg-brand px-4 py-2.5 text-sm font-semibold text-[#140f00] transition-colors duration-200 hover:bg-brand-light"
              >
                {t("문의 남기기 →")}
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={1}>
          <div className="overflow-hidden rounded-[4px] border border-line">
            {faqs.map((faq, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={faq.key}
                  className={cn("border-b border-line last:border-b-0", isOpen && "bg-ink-3")}
                  data-faq-open={isOpen ? "true" : "false"}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-ink-3/60 sm:px-6"
                  >
                    <span className="font-mono text-[11px] text-brand">Q{i + 1}</span>
                    <span className="flex-1 text-[15px] font-medium text-paper">{t(faq.q)}</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-[2px] border transition-all duration-200",
                        isOpen ? "rotate-45 border-brand text-brand" : "border-line-2 text-faint",
                      )}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.6}
                        className="h-3 w-3"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </button>
                  <div className={cn("grid transition-all duration-300", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                    <div className="overflow-hidden" aria-hidden={!isOpen}>
                      <p className="m-0 px-5 pb-5 text-[14px] leading-relaxed text-mute sm:px-6 sm:pl-[calc(1.25rem+2rem)]">
                        {t(faq.a)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
