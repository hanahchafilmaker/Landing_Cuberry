import { cn } from "@/utils/cn";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { patents } from "@/data/content";
import { useI18n } from "@/i18n/LanguageContext";

/** PATENTS — 등록과 가출원 자료를 구분하고, 개인정보를 가린 증빙 이미지를 보여준다. */
export function Patents() {
  const { t } = useI18n();

  return (
    <section id="patents" className="section">
      <div className="shell flex flex-col gap-7">
        <SectionHeading
          label="PATENTS"
          title={t("기술 · 특허")}
          desc={t("증빙은 문서의 첫 페이지이며, 개인정보 보호를 위해 일부 내용을 가렸습니다.")}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {patents.map((patent, i) => (
            <Reveal key={patent.image} delay={i + 1} className="h-full">
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
                  <span className="text-right text-faint">
                    {patent.dateLabel && <>{t(patent.dateLabel)} · </>}{patent.date}
                  </span>
                </div>

                <a
                  href={patent.image}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("{title} 증빙 이미지 크게 보기", { title: t(patent.title) })}
                  className="group relative block overflow-hidden rounded-[3px] border border-line-2 bg-[#e7e5df] p-3"
                >
                  <img
                    src={patent.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="mx-auto h-64 w-auto max-w-full border border-black/5 object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <span aria-hidden="true" className="absolute bottom-3 right-3 rounded-[3px] bg-ink/90 px-2.5 py-1.5 text-[11px] font-medium text-paper">
                    {t("이미지 크게 보기")} ↗
                  </span>
                </a>

                <h3 className="m-0 text-[15px] font-semibold leading-[1.5] text-paper">
                  {t(patent.title)}
                </h3>
                <span className="mt-auto font-mono text-xs text-mute">{t(patent.no)}</span>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
