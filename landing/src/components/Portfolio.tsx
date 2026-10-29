import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/utils/cn";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { SmartImage } from "./SmartImage";
import { useContent } from "@/cms/ContentContext";
import { useDrivePortfolio, type DriveFilm } from "@/cms/drive";
import { PORTFOLIO_TABS, chipMatchesCmsWork, isAiWork, tabForCmsWork, tabForDriveFilm, type PortfolioTab } from "@/cms/classify";
import { mergeDuplicateWorks } from "@/cms/dedupe";
import { curatedThumbnail } from "@/cms/curated";
import type { PortfolioCard } from "@/cms/map";
import { T, useI18n } from "@/i18n/LanguageContext";

type Tab = PortfolioTab;
const PAGE_SIZE = 6;
const ALL_CHIP = "__all__";

/**
 * 3분류 — 전체 탭 없이 작품중심(기본) · 광고 · 기타.
 * 분류 규칙은 cms/classify.ts 한 곳에 있고, 드라이브 영상과 어드민 작품이 같은 규칙을 쓴다.
 */
const TABS: Tab[] = PORTFOLIO_TABS;
const UNCATEGORIZED = "기타";
const TAB_LABEL: Record<Tab, string> = { creative: "작품중심", ad: "광고", other: "기타" };
/** 탭 아래 한 줄 설명 — 무엇이 들어 있는지 버튼에서 바로 보이게 한다. */
const TAB_HINT: Record<Tab, string> = {
  creative: "TV · 웹드라마",
  ad: "커머셜 · 브랜드 필름",
  other: "기업 · 모션 · 인터뷰",
};
/** 딥링크(#works?view=ad)로 탭을 바로 열 수 있게 한다 — 상단 메뉴·공유 링크용. */
const VIEW_PARAM: Record<Tab, string> = { creative: "creative", ad: "ad", other: "other" };

function tabFromHash(): Tab {
  if (typeof window === "undefined") return "creative";
  const match = /view=(creative|ad|other)/.exec(window.location.hash);
  return (match?.[1] as Tab) ?? "creative";
}

/** 칩을 나누는 기준 — 광고 탭은 프로젝트(섹션), 나머지는 장르. 섹션이 없으면 '기타'. */
function chipKey(tab: Tab, film: DriveFilm) {
  if (tab === "ad") return film.section || UNCATEGORIZED;
  return film.categoryLabel;
}

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
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [chip, setChip] = useState<string>(ALL_CHIP);
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // 어드민 작품과 드라이브 영상이 같은 작품이면 카드 한 장으로 합친다(2026-10-29 대표님 지적).
  const unified = useMemo(() => mergeDuplicateWorks(works, drive.films), [drive.films, works]);
  const films = unified.films;
  const selected: DriveFilm | null = films.find((film) => film.key === selectedKey) ?? null;
  useEffect(() => { if (selectedKey && !selected) setSelectedKey(null); }, [selectedKey, selected]);

  // 탭은 사이트 전체 분류이고 CMS 작품 수와 무관하게 늘 같다(작품중심 · 광고 · 기타).
  const activeTab: Tab = TABS.includes(tab) ? tab : "creative";

  /** 드라이브 영상 · 어드민 작품을 한 번에 세 갈래로 나눈다(탭 배지 숫자에 쓴다). */
  const grouped = useMemo(() => {
    const drive: Record<Tab, DriveFilm[]> = { creative: [], ad: [], other: [] };
    for (const film of films) drive[tabForDriveFilm(film)].push(film);
    const worksByTab: Record<Tab, PortfolioCard[]> = { creative: [], ad: [], other: [] };
    for (const card of unified.works) worksByTab[tabForCmsWork(card)].push(card);
    return { drive, works: worksByTab };
  }, [films, unified.works]);

  const counts = useMemo(
    () => ({
      creative: grouped.drive.creative.length + grouped.works.creative.length,
      ad: grouped.drive.ad.length + grouped.works.ad.length,
      other: grouped.drive.other.length + grouped.works.other.length,
    }),
    [grouped],
  );

  const filmsForTab = grouped.drive[activeTab];
  const worksForTab = grouped.works[activeTab];

  /**
   * 칩: 광고 탭은 프로젝트(KOSHA·XCONDA…), 작품중심 탭은 장르(TV·웹드라마…).
   * 숫자는 **그 칩을 골랐을 때 실제로 보이는 카드 수**다 — 어드민 작품도 함께 센다.
   */
  const chips = useMemo(() => {
    const key = (film: DriveFilm) => chipKey(activeTab, film);
    const counts = new Map<string, number>();
    for (const film of filmsForTab) {
      const label = key(film);
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    for (const card of worksForTab) {
      for (const label of counts.keys()) {
        if (chipMatchesCmsWork(label, card)) counts.set(label, (counts.get(label) || 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko")).map(([label, count]) => ({ label, count }));
  }, [activeTab, filmsForTab, worksForTab]);

  useEffect(() => { setChip(ALL_CHIP); }, [activeTab]);

  const trimmed = query.trim().toLowerCase();
  const matches = (value: string) => value.includes(trimmed);

  const driveCards = useMemo(() => {
    const keyOf = (film: DriveFilm) => chipKey(activeTab, film);
    let list = filmsForTab;
    if (chip !== ALL_CHIP) list = list.filter((film) => keyOf(film) === chip);
    if (trimmed) list = list.filter((film) => matches(film.searchText) || matches(film.title.toLowerCase()));
    return list;
  }, [activeTab, chip, filmsForTab, trimmed]);

  // 칩을 고르면 어드민 작품도 그 프로젝트·장르에 속한 것만 남긴다.
  // (예전에는 드라이브 영상만 걸러서 KOSHA 칩에 브랜드 필름이 섞여 보였다 — 2026-10-29 지적)
  const worksCards = useMemo(() => {
    let list = worksForTab;
    if (chip !== ALL_CHIP) list = list.filter((card) => chipMatchesCmsWork(chip, card));
    if (trimmed) list = list.filter((card) => [card.title, card.category, card.description, ...card.tags].join(" ").toLowerCase().includes(trimmed));
    return list;
  }, [chip, trimmed, worksForTab]);

  /**
   * 대표님이 직접 준 썸네일이 있으면 그것을 쓴다.
   * (〈DIVISION 0〉·〈목구멍〉처럼 첫 장면이 검은 영상은 Drive 썸네일이 새까매서
   *  브랜드 카드로 덮는 것보다 실제 장면을 보여주는 편이 낫다.)
   */
  const withCurated = (card: PortfolioCard): PortfolioCard => {
    const src = curatedThumbnail(card.title, card.category, card.searchText);
    if (!src) return card;
    return { ...card, thumbnailUrl: src, fallbackUrl: card.thumbnailUrl, thumbnailBlank: false };
  };

  const cards: PortfolioCard[] = useMemo(
    () => [...worksCards, ...driveCards].map(withCurated),
    [driveCards, worksCards],
  );

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeTab, chip, trimmed, cards.length]);

  /** 탭을 고르면 주소에 남긴다 — #works?view=ad 처럼 공유·북마크할 수 있게. */
  const selectTab = (next: Tab) => {
    setTab(next);
    setChip(ALL_CHIP);
    setVisibleCount(PAGE_SIZE);
    try {
      if (typeof window !== "undefined") {
        window.history.replaceState(window.history.state, "", `#works?view=${VIEW_PARAM[next]}`);
      }
    } catch {
      /* 주소를 못 바꾸는 환경(iframe)에서도 탭 전환은 유지한다 */
    }
  };

  // 밖에서 링크를 눌러 들어온 경우(#works?view=other)도 같은 탭을 연다.
  useEffect(() => {
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <section id="works" className="section">
      <div className="shell">
        <SectionHeading
          label="PORTFOLIO · AI CONTENT STUDIO"
          title={<T text={"AI 콘텐츠 스튜디오가\n실제로 납품한 작업"} />}
          desc={t("TV·웹드라마 같은 방송 작품부터 커머셜, 기업 영상까지. 작품중심·광고·기타 세 갈래로 나눠 실제 납품 작업과 제작 범위를 함께 확인하실 수 있습니다.")}
        />

        <Reveal delay={1}>
          {/* 작품중심이 기본 진입점 — 전체 탭을 없애고 세 갈래만 남긴다. */}
          <div role="group" aria-label={t("포트폴리오 분류")} className="mt-9 flex flex-wrap items-stretch gap-2">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                data-portfolio-tab={item}
                onClick={() => selectTab(item)}
                aria-pressed={activeTab === item}
                className={cn(
                  "flex min-h-14 cursor-pointer flex-col items-start justify-center rounded-[4px] border px-4 py-2.5 text-left transition-colors duration-200",
                  activeTab === item
                    ? "border-brand bg-brand/10"
                    : "border-line-2 hover:border-line-4",
                )}
              >
                <span className="flex items-baseline gap-2">
                  <span className={cn("text-[13px] font-medium tracking-[-0.01em]", activeTab === item ? "text-brand" : "text-paper")}>
                    {t(TAB_LABEL[item])}
                  </span>
                  <span className={cn("font-mono text-[10px]", activeTab === item ? "text-brand/80" : "text-faint")}>
                    {counts[item]}
                  </span>
                </span>
                <span className="mt-0.5 font-mono text-[10px] tracking-[0.06em] text-faint">
                  {t(TAB_HINT[item])}
                </span>
              </button>
            ))}
            <span className="ml-auto self-end font-mono text-[11px] text-faint">
              {cards.length} PROJECTS
            </span>
          </div>
        </Reveal>

        {chips.length > 1 && (
          <Reveal delay={1}>
            <div aria-label={t("폴더 필터")} role="group" className="mt-4 flex flex-wrap gap-1.5">
              {[{ label: t("전체"), count: filmsForTab.length + worksForTab.length, value: ALL_CHIP }, ...chips.map((entry) => ({ ...entry, value: entry.label }))].map((entry) => (
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
                {/* 썸네일은 모든 카드가 같은 16:9 액자 — 세로 영상은 안쪽에 담아 여백만 남긴다.
                    (예전처럼 카드마다 높이가 달라지면 줄이 어긋나 지저분해 보인다.) */}
                <div className="relative aspect-video w-full overflow-hidden bg-void">
                  {card.thumbnailBlank ? (
                    /* 첫 장면이 검은 영상은 드라이브 썸네일도 새까맣다.
                       검은 사각형 대신 브랜드 톤 카드로 그려 "빈 카드"처럼 보이지 않게 한다. */
                    <div
                      data-blank-thumb="true"
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_38%,rgba(212,175,55,0.22),rgba(8,8,8,0.98)_72%)]"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-brand/50 bg-void/60">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-5 w-5 text-brand">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                    </div>
                  ) : (
                    <SmartImage
                      src={card.thumbnailUrl}
                      alt={t(card.title)}
                      fallbackSrc={card.fallbackUrl}
                      // 세로 영상도 액자를 꽉 채운다(여백 없이). 위아래가 잘리더라도 화면을 채우고,
                      // 잘리는 위치는 조금 위쪽으로 두어 얼굴이 프레임 밖으로 나가지 않게 한다.
                      objectPosition={card.aspect === "portrait" ? "50% 35%" : undefined}
                      className="absolute inset-0 h-full w-full"
                      imgClassName="transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  )}

                  {/* 왼쪽 위: 이 카드의 분류(장르·프로젝트) / 오른쪽 위: 버전 수·AI 배지 */}
                  {(activeTab === "ad" && card.section ? card.section : card.category) && (
                    <span className="absolute left-2.5 top-2.5 rounded-[2px] bg-void/75 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.12em] text-body backdrop-blur">
                      {/* 광고 탭에서는 프로젝트명(KOSHA·성남시…)이, 다른 탭에서는 장르가 더 쓸모 있다. */}
                      {t(activeTab === "ad" && card.section ? card.section : card.category)}
                    </span>
                  )}
                  {card.badges?.length ? (
                    <span data-badge={card.badges[0]} className="absolute right-2.5 top-2.5 rounded-[2px] bg-void/75 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.08em] text-brand backdrop-blur">
                      {t(card.badges[0])}
                    </span>
                  ) : isAiWork(card) ? (
                    <span data-badge="AI" className="absolute right-2.5 top-2.5 rounded-[2px] bg-void/75 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.08em] text-brand backdrop-blur">
                      AI
                    </span>
                  ) : null}

                  {/* 재생 버튼은 가운데 — 호버할 때만 나타난다 */}
                  {card.videoUrl && (
                    <>
                      <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-paper/50 bg-void/70">
                          {card.playable ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-4 w-4 text-paper"><path d="M8 5v14l11-7z" /></svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 text-paper"><path d="M7 17 17 7M9 7h8v8" /></svg>
                          )}
                        </span>
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

                {/* 제목은 두 줄 고정 — 카드마다 높이가 달라지지 않게 한다. */}
                <div className="flex flex-1 flex-col gap-1.5 px-4 py-3.5">
                  <h3 className="m-0 line-clamp-2 min-h-[2.6em] text-[15px] font-semibold leading-snug tracking-[-0.01em] text-paper">
                    {t(card.title)}
                  </h3>
                  {card.description && (
                    <p className="m-0 line-clamp-2 text-[12.5px] leading-relaxed text-mute">{t(card.description)}</p>
                  )}
                  {/* 어드민에서 직접 등록한 작품의 태그만 노출한다(Drive 카드는 배지로 대신). */}
                  {card.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {card.tags.map((tag) => (
                        <span key={tag} className="rounded-[2px] border border-line px-1.5 py-0.5 font-mono text-[9px] tracking-[0.08em] text-faint">
                          {t(tag).toUpperCase()}
                        </span>
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
        {cards.length === 0 && !trimmed && drive.status === "ready" && <p className="mt-8 text-sm text-mute">{t("이 분류에 공개된 영상이 없습니다.")}</p>}
        {drive.status === "loading" && <p role="status" className="mt-8 text-sm text-mute">{t("드라이브 영상 목록을 불러오는 중입니다.")}</p>}
        {/* Drive 가 죽어도 어드민 작품은 남으므로, 안내는 카드 유무와 상관없이 보여준다. */}
        {(drive.status === "unconfigured" || drive.status === "unavailable") && <p role="status" className="mt-8 text-sm text-mute">{t("드라이브 영상 목록을 불러올 수 없습니다.")}</p>}

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
