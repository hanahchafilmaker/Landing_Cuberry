import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/utils/cn";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { SmartImage } from "./SmartImage";
import { useContent } from "@/cms/ContentContext";
import { useDrivePortfolio, type DriveFilm } from "@/cms/drive";
import type { PortfolioCard } from "@/cms/map";
import { T, useI18n } from "@/i18n/LanguageContext";

type Tab = "ALL" | "AD" | "CREATIVE";
const PAGE_SIZE = 6;
const ALL_CHIP = "__all__";

/** 광고 = Drive 01_Commercial, 작품중심 = TV·웹드라마·데모·가이드 (+ CMS 작품) */
const CREATIVE_SLUGS = new Set(["tv", "webdrama", "demo", "guide", "other"]);
const TABS: Tab[] = ["ALL", "AD", "CREATIVE"];
const TAB_LABEL: Record<Tab, string> = { ALL: "전체", AD: "광고", CREATIVE: "작품중심" };

function durationLabel(ms: number) {
  if (!ms) return "";
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** 일반 작품은 어드민에서, 드라이브 작품은 폴더 분류·중복 병합을 거쳐 가져온다. */
export function Portfolio() {
  const { works } = useContent();
  const drive = useDrivePortfolio();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("ALL");
  const [chip, setChip] = useState<string>(ALL_CHIP);
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const films = drive.films;
  const selected: DriveFilm | null = films.find((film) => film.key === selectedKey) ?? null;
  useEffect(() => { if (selectedKey && !selected) setSelectedKey(null); }, [selectedKey, selected]);

  // 탭은 사이트 전체 분류이고 CMS 작품 수와 무관하게 늘 같다(전체 · 광고 · 작품중심).
  const activeTab: Tab = TABS.includes(tab) ? tab : "ALL";

  /** 탭별 드라이브 작품 */
  const filmsForTab = useMemo(() => {
    if (activeTab === "AD") return films.filter((film) => film.categorySlug === "commercial");
    if (activeTab === "CREATIVE") return films.filter((film) => CREATIVE_SLUGS.has(film.categorySlug));
    return films;
  }, [activeTab, films]);

  /** 칩: 광고 탭은 프로젝트(KOSHA·XCONDA…), 작품중심 탭은 장르(TV·웹드라마…) */
  const chips = useMemo(() => {
    if (activeTab === "ALL") return [];
    const key = (film: DriveFilm) => (activeTab === "AD" ? film.section || film.categoryLabel : film.categoryLabel);
    const counts = new Map<string, number>();
    for (const film of filmsForTab) {
      const label = key(film);
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko")).map(([label, count]) => ({ label, count }));
  }, [activeTab, filmsForTab]);

  useEffect(() => { setChip(ALL_CHIP); }, [activeTab]);

  const trimmed = query.trim().toLowerCase();
  const matches = (value: string) => value.includes(trimmed);

  const driveCards = useMemo(() => {
    const keyOf = (film: DriveFilm) => (activeTab === "AD" ? film.section || film.categoryLabel : film.categoryLabel);
    let list = filmsForTab;
    if (chip !== ALL_CHIP) list = list.filter((film) => keyOf(film) === chip);
    if (trimmed) list = list.filter((film) => matches(film.searchText) || matches(film.title.toLowerCase()));
    return list;
  }, [activeTab, chip, filmsForTab, trimmed]);

  const worksCards = useMemo(() => {
    if (activeTab !== "ALL") return [];
    if (!trimmed) return works;
    return works.filter((card) => [card.title, card.category, card.description, ...card.tags].join(" ").toLowerCase().includes(trimmed));
  }, [activeTab, trimmed, works]);

  const cards: PortfolioCard[] = useMemo(() => [...worksCards, ...driveCards], [driveCards, worksCards]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeTab, chip, trimmed, cards.length]);

  return (
    <section id="works" className="section">
      <div className="shell">
        <SectionHeading
          label="PORTFOLIO · STUDIO"
          title={<T text={"결과물로 증명하는\n제작 역량"} />}
          desc={t("기업 홍보영상부터 브랜드 필름, 광고, AI 콘텐츠까지. 실제 프로젝트의 기획 의도와 제작 범위를 함께 확인해보세요.")}
        />

        <Reveal delay={1}>
          <div className="mt-9 flex flex-wrap items-center gap-1.5">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setTab(item);
                  setVisibleCount(PAGE_SIZE);
                }}
                aria-pressed={activeTab === item}
                className={cn(
                  "min-h-9 cursor-pointer rounded-full px-4 py-1.5 font-mono text-[11px] tracking-[0.12em] transition-colors duration-200",
                  activeTab === item
                    ? "border border-paper bg-paper font-medium text-ink"
                    : "border border-line-2 text-body hover:border-line-4 hover:text-paper",
                )}
              >
                {t(TAB_LABEL[item])}
              </button>
            ))}
            <span className="ml-auto font-mono text-[11px] text-faint">
              {cards.length} PROJECTS
            </span>
          </div>
        </Reveal>

        {activeTab !== "ALL" && chips.length > 1 && (
          <Reveal delay={1}>
            <div aria-label={t("폴더 필터")} role="group" className="mt-4 flex flex-wrap gap-1.5">
              {[{ label: t("전체"), count: filmsForTab.length, value: ALL_CHIP }, ...chips.map((entry) => ({ ...entry, value: entry.label }))].map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  data-chip={entry.value}
                  aria-current={chip === entry.value ? "true" : undefined}
                  onClick={() => setChip(entry.value)}
                  className={cn(
                    "cursor-pointer rounded-[3px] border px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] transition-colors",
                    chip === entry.value
                      ? "border-brand/60 text-brand"
                      : "border-line text-faint hover:border-line-4 hover:text-body",
                  )}
                >
                  {entry.label}
                  <span className="ml-1 text-[9px] opacity-70">{entry.count}</span>
                </button>
              ))}
            </div>
          </Reveal>
        )}

        <Reveal delay={1}>
          <div className="mt-4 flex items-center gap-3">
            <label className="flex min-h-10 flex-1 items-center gap-2 rounded-[3px] border border-line px-3 focus-within:border-line-4 sm:max-w-sm">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4 shrink-0 text-faint">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label={t("포트폴리오 검색")}
                placeholder={t("작품·브랜드·툴 검색 (예: 구미호, 토이팜, 모나리자)")}
                className="w-full bg-transparent py-2 text-sm text-paper placeholder:text-faint focus:outline-none"
              />
            </label>
            {trimmed && (
              <button type="button" onClick={() => setQuery("")} className="cursor-pointer font-mono text-[11px] text-mute underline underline-offset-4 hover:text-paper">
                {t("검색 지우기")}
              </button>
            )}
          </div>
        </Reveal>

        <div id="portfolio-grid" className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.slice(0, visibleCount).map((card, i) => (
            <Reveal key={card.key} delay={(i % 3) + 1} className="h-full">
              <article className="group flex h-full flex-col overflow-hidden rounded-[4px] border border-line bg-ink-3 transition-colors duration-200 hover:border-line-4">
                <div className="relative bg-void">
                  <SmartImage
                    src={card.thumbnailUrl}
                    alt={t(card.title)}
                    fallbackSrc={card.fallbackUrl}
                    className={cn("w-full", card.aspect === "portrait" ? "aspect-[9/16] max-h-[420px]" : "aspect-video")}
                    imgClassName={cn("transition-transform duration-700 group-hover:scale-[1.03]", card.aspect === "portrait" && "object-contain")}
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{ background: "linear-gradient(to top, rgba(5,5,5,0.85) 0%, rgba(5,5,5,0) 42%)" }}
                  />
                  <span className="absolute left-3 top-3 rounded-[3px] bg-void/80 px-2 py-1 font-mono text-[9px] tracking-[0.16em] text-brand">
                    {t(card.category)}
                  </span>
                  <span className="absolute right-3 top-3 font-mono text-[10px] text-body">{card.year}</span>
                  {card.videoUrl && (
                    <>
                      <span aria-hidden="true" className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full border border-paper/40 bg-void/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        {card.playable ? (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-4 w-4 text-paper"><path d="M8 5v14l11-7z" /></svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 text-paper"><path d="M7 17 17 7M9 7h8v8" /></svg>
                        )}
                      </span>
                      {card.driveVideo ? (
                        <button
                          type="button"
                          onClick={(event) => { triggerRef.current = event.currentTarget; setSelectedKey(card.key); setSelectedVariant(0); }}
                          aria-label={t("{title} 영상 보기", { title: t(card.title) })}
                          className="absolute inset-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                        />
                      ) : (
                        <a
                          href={card.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={t(card.playable ? "{title} 영상 보기" : "{title} 새 창에서 보기", { title: t(card.title) })}
                          className="absolute inset-0"
                        />
                      )}
                    </>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h3 className="m-0 text-base font-semibold leading-snug tracking-[-0.01em] text-paper">{t(card.title)}</h3>
                  {card.description && <p className="m-0 flex-1 text-[13px] leading-relaxed text-mute">{t(card.description)}</p>}
                  {(card.badges?.length || card.tags.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(card.badges || []).map((badge) => (
                        <span key={badge} className="rounded-[2px] border border-brand/40 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.08em] text-brand">{t(badge)}</span>
                      ))}
                      {card.tags.map((tag) => (
                        <span key={tag} className="rounded-[2px] border border-line px-1.5 py-0.5 font-mono text-[9px] tracking-[0.08em] text-faint">{t(tag).toUpperCase()}</span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {visibleCount < cards.length && (
          <div className="mt-8 flex justify-center">
            <button type="button" aria-controls="portfolio-grid" onClick={() => setVisibleCount((current) => Math.min(current + PAGE_SIZE, cards.length))} className="inline-flex min-h-11 items-center gap-2 rounded-[3px] border border-line-2 px-5 py-3 text-sm text-body transition-colors hover:border-brand hover:text-brand">
              {t("작품 더 보기")}
              <span aria-hidden="true" className="font-mono text-xs text-faint">+{Math.min(PAGE_SIZE, cards.length - visibleCount)}</span>
            </button>
          </div>
        )}

        {cards.length === 0 && trimmed && <p role="status" className="mt-8 text-sm text-mute">{t("검색과 일치하는 작품이 없습니다.")}</p>}
        {cards.length === 0 && !trimmed && activeTab !== "ALL" && drive.status === "ready" && <p className="mt-8 text-sm text-mute">{t("이 분류에 공개된 영상이 없습니다.")}</p>}
        {drive.status === "loading" && <p role="status" className="mt-8 text-sm text-mute">{t("드라이브 영상 목록을 불러오는 중입니다.")}</p>}
        {(drive.status === "unconfigured" || drive.status === "unavailable") && worksCards.length === 0 && <p role="status" className="mt-8 text-sm text-mute">{t("드라이브 영상 목록을 불러올 수 없습니다.")}</p>}

        <Dialog.Root open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelectedKey(null); }}>
          {selected && (
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/85" />
              <Dialog.Content onCloseAutoFocus={(event) => { event.preventDefault(); triggerRef.current?.focus(); }} className="fixed left-1/2 top-1/2 z-[101] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[4px] border border-line-2 bg-ink-3 shadow-2xl focus:outline-none">
                <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
                  <Dialog.Title className="m-0 truncate text-sm font-semibold text-paper">{t(selected.title)}</Dialog.Title>
                  <Dialog.Close aria-label={t("닫기")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-xl text-body hover:text-brand focus-visible:outline focus-visible:outline-brand">×</Dialog.Close>
                </div>
                <Dialog.Description className="sr-only">{t("Google Drive에서 이 영상을 재생합니다.")}</Dialog.Description>
                <div className={cn("mx-auto bg-black", selected.variants[selectedVariant]?.aspect === "portrait" ? "max-w-[min(100%,420px)]" : "w-full")}>
                  <iframe
                    key={selected.variants[selectedVariant]?.id}
                    src={selected.variants[selectedVariant]?.previewUrl}
                    title={t("{title} 영상 보기", { title: t(selected.title) })}
                    className={cn("block w-full border-0 bg-black", selected.variants[selectedVariant]?.aspect === "portrait" ? "aspect-[9/16]" : "aspect-video")}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                  />
                </div>
                {selected.variants.length > 1 && (
                  <div aria-label={t("영상 버전 선택")} role="group" className="flex flex-wrap gap-1.5 border-t border-line px-4 py-3 sm:px-5">
                    {selected.variants.map((variant, index) => (
                      <button
                        key={variant.id}
                        type="button"
                        data-variant={variant.id}
                        aria-pressed={index === selectedVariant}
                        onClick={() => setSelectedVariant(index)}
                        className={cn(
                          "cursor-pointer rounded-[3px] border px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] transition-colors",
                          index === selectedVariant ? "border-brand/60 text-brand" : "border-line text-faint hover:border-line-4 hover:text-body",
                        )}
                      >
                        {t(variant.label)}
                        {variant.durationMs ? <span className="ml-1 text-[9px] opacity-70">{durationLabel(variant.durationMs)}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex justify-end px-4 py-3 sm:px-5">
                  <a href={selected.variants[selectedVariant]?.viewUrl} target="_blank" rel="noreferrer" className="text-xs text-mute underline underline-offset-4 hover:text-brand">{t("Google Drive에서 영상 열기")} ↗</a>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </Dialog.Root>
      </div>
    </section>
  );
}
