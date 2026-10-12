import { useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { SmartImage } from "./SmartImage";
import { useContent } from "@/cms/ContentContext";
import type { PortfolioCard } from "@/cms/map";

type Tab = "ALL" | "DRIVE FILM" | "WORKS";

/**
 * PORTFOLIO — 어드민 "포트폴리오"가 그대로 이 카드 목록이 된다.
 * source=drive 였던 작품은 DRIVE FILM 탭으로 모인다.
 */
export function Portfolio() {
  const { films, works } = useContent();
  const [tab, setTab] = useState<Tab>("ALL");

  const tabs = useMemo<Tab[]>(
    () => (films.length && works.length ? ["ALL", "DRIVE FILM", "WORKS"] : ["ALL"]),
    [films.length, works.length],
  );
  const activeTab: Tab = tabs.includes(tab) ? tab : "ALL";

  const cards: PortfolioCard[] = useMemo(() => {
    if (activeTab === "DRIVE FILM") return films;
    if (activeTab === "WORKS") return works;
    return [...works, ...films];
  }, [activeTab, films, works]);

  if (films.length + works.length === 0) return null;

  return (
    <section id="works" className="section">
      <div className="shell">
        <SectionHeading
          label="PORTFOLIO · STUDIO"
          title={
            <>
              결과물로 증명하는
              <br />
              제작 역량
            </>
          }
          desc="기업 홍보영상부터 브랜드 필름, 광고, 모션그래픽과 AI 콘텐츠까지. 실제 프로젝트의 기획 의도와 제작 범위를 함께 확인해보세요."
        />

        <Reveal delay={1}>
          <div className="mt-9 flex flex-wrap items-center gap-1.5">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "min-h-9 cursor-pointer rounded-full px-4 py-1.5 font-mono text-[11px] tracking-[0.12em] transition-colors duration-200",
                  activeTab === t
                    ? "border border-paper bg-paper font-medium text-ink"
                    : "border border-line-2 text-body hover:border-line-4 hover:text-paper",
                )}
              >
                {t}
              </button>
            ))}
            <span className="ml-auto font-mono text-[11px] text-faint">
              {cards.length} PROJECTS
            </span>
          </div>
        </Reveal>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => (
            <Reveal key={card.key} delay={(i % 3) + 1} className="h-full">
              <article className="group flex h-full flex-col overflow-hidden rounded-[4px] border border-line bg-ink-3 transition-colors duration-200 hover:border-line-4">
                <div className="relative bg-void">
                  <SmartImage
                    src={card.thumbnailUrl}
                    alt={card.title}
                    fallbackSrc={card.fallbackUrl}
                    className="aspect-video w-full"
                    imgClassName="transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: "linear-gradient(to top, rgba(5,5,5,0.85) 0%, rgba(5,5,5,0) 42%)",
                    }}
                  />
                  <span className="absolute left-3 top-3 rounded-[3px] bg-void/80 px-2 py-1 font-mono text-[9px] tracking-[0.16em] text-brand">
                    {card.category}
                  </span>
                  <span className="absolute right-3 top-3 font-mono text-[10px] text-body">
                    {card.year}
                  </span>
                  {card.videoUrl && (
                    <>
                      <span
                        aria-hidden="true"
                        className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full border border-paper/40 bg-void/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      >
                        {card.playable ? (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-4 w-4 text-paper">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            className="h-4 w-4 text-paper"
                          >
                            <path d="M7 17 17 7M9 7h8v8" />
                          </svg>
                        )}
                      </span>
                      <a
                        href={card.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${card.title} ${card.playable ? "영상 보기" : "새 창에서 보기"}`}
                        className="absolute inset-0"
                      />
                    </>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h3 className="m-0 text-base font-semibold leading-snug tracking-[-0.01em] text-paper">
                    {card.title}
                  </h3>
                  <p className="m-0 flex-1 text-[13px] leading-relaxed text-mute">
                    {card.description}
                  </p>
                  {card.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {card.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-[2px] border border-line px-1.5 py-0.5 font-mono text-[9px] tracking-[0.08em] text-faint"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
