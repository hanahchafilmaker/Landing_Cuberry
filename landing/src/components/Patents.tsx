import { cn } from "@/utils/cn";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { patents } from "@/data/content";
import { useI18n } from "@/i18n/LanguageContext";

/** PATENTS — 등록은 gold 상단 선, 출원은 회색 선으로 구분한다. */
export function Patents() {
  const { t } = useI18n();

  return (
    <section id="patents" className="section">
      <div className="shell flex flex-col gap-7">
        <SectionHeading label="PATENTS" title={t("기술 · 특허")} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
          {patents.map((patent, i) => (
            <Reveal key={patent.no} delay={i + 1} className="h-full">
              <article
                className={cn(
                  "flex h-full flex-col gap-3 rounded-[4px] border border-line bg-ink-3 p-[22px] transition-colors duration-200 hover:border-line-4",
                  patent.state === "등록" ? "border-t-2 border-t-brand" : "border-t-2 border-t-line-4",
                )}
              >
                <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                  <span className={patent.state === "등록" ? "text-brand" : "text-body"}>
                    {t(patent.state)}
                  </span>
                  <span className="text-faint">{patent.date}</span>
                </div>
                <span className="text-[15px] font-semibold leading-[1.5] text-paper">
                  {t(patent.title)}
                </span>
                <span className="mt-auto font-mono text-xs text-mute">{t(patent.no)}</span>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
