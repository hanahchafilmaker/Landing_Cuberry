import { useMemo, useState } from "react";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { SmartImage } from "./SmartImage";
import { driveFilms, works } from "@/data/content";

type Tab = "ALL" | "DRIVE FILM" | "WORKS";

type Card = {
  key: string;
  title: string;
  category: string;
  year: string;
  description: string;
  thumbnailUrl: string;
  tags: string[];
  videoUrl?: string;
  fallbackUrl?: string;
};

const tabs: Tab[] = ["ALL", "DRIVE FILM", "WORKS"];

export function Portfolio() {
  const [tab, setTab] = useState<Tab>("ALL");

  const workCards: Card[] = works.map((w) => ({
    key: `work-${w.title}`,
    title: w.title,
    category: w.category,
    year: w.year,
    description: w.description,
    thumbnailUrl: w.thumbnailUrl,
    tags: w.tags,
  }));

  const filmCards: Card[] = driveFilms.map((f) => ({
    key: `drive-${f.title}`,
    title: f.title,
    category: "DRIVE FILM",
    year: f.year,
    description: f.description,
    thumbnailUrl: f.thumbnailUrl,
    tags: ["GOOGLE DRIVE", f.kind.toUpperCase()],
    videoUrl: f.videoUrl,
  }));

  const cards = useMemo(() => {
    if (tab === "DRIVE FILM") return filmCards;
    if (tab === "WORKS") return workCards;
    return [...workCards, ...filmCards];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <section id="works" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          num="05 / PORTFOLIO"
          label="Portfolio"
          title={
            <>
              21개 이상의 제작 works,
              <br />
              영상으로 확인하세요
            </>
          }
          desc="Google Drive 폴더의 영상으로 포트폴리오 라이브러리를 구성했습니다. 2026 플로우나인 소개서의 포트폴리오를 반영해 각 카드는 상세 설명과 썸네일을 제공합니다."
        />

        {/* 필터 탭 */}
        <Reveal delay={1}>
          <div className="mt-10 flex flex-wrap items-center gap-2">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full border px-5 py-2 font-mono text-[11px] tracking-[0.16em] transition-all duration-300 ${
                  tab === t
                    ? "border-brand-light/60 bg-brand/15 text-neon"
                    : "border-white/10 text-faint hover:border-white/30 hover:text-paper"
                }`}
              >
                {t}
              </button>
            ))}
            <span className="ml-auto font-mono text-[11px] text-faint">
              {cards.length} PROJECTS
            </span>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => (
            <Reveal key={card.key} delay={(i % 3) + 1}>
              <article className="card card-glow group flex h-full flex-col overflow-hidden rounded-3xl">
                <div className="relative overflow-hidden">
                  <SmartImage
                    src={card.thumbnailUrl}
                    alt={card.title}
                    className="h-48 w-full sm:h-52"
                    imgClassName="transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-3 via-transparent to-transparent" />
                  <div className="absolute left-4 top-4 rounded-full bg-ink/70 px-3 py-1 font-mono text-[9px] tracking-[0.16em] text-neon backdrop-blur-sm">
                    {card.category}
                  </div>
                  <div className="absolute right-4 top-4 font-mono text-[10px] text-white/60">
                    {card.year}
                  </div>
                  {card.videoUrl && (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink/60 backdrop-blur-sm">
                          <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="ml-1 h-6 w-6 text-white"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </div>
                      <a
                        href={card.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${card.title} 영상 보기`}
                        className="absolute inset-0"
                      />
                    </>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-lg font-extrabold tracking-tight text-paper">
                    {card.title}
                  </h3>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-mute">
                    {card.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {card.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-white/[0.05] px-2 py-1 font-mono text-[9px] tracking-[0.08em] text-faint"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
