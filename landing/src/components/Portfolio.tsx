import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/utils/cn";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { SmartImage } from "./SmartImage";
import { useContent } from "@/cms/ContentContext";
import { useDrivePortfolio } from "@/cms/drive";
import type { PortfolioCard } from "@/cms/map";
import { T, useI18n } from "@/i18n/LanguageContext";

type Tab = "ALL" | "DRIVE FILM" | "WORKS";
const PAGE_SIZE = 6;

/** 일반 작품은 어드민에서, DRIVE FILM은 링크 공개된 개별 영상에서 가져온다. */
export function Portfolio() {
  const { works } = useContent();
  const drive = useDrivePortfolio();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("ALL");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // 공개가 해제되거나 목록 조회에 실패하면 열려 있던 플레이어도 닫는다.
  const selected = drive.films.find((film) => film.key === selectedKey) ?? null;
  useEffect(() => { if (selectedKey && !selected) setSelectedKey(null); }, [selectedKey, selected]);
  const tabs = useMemo<Tab[]>(() => (works.length ? ["ALL", "DRIVE FILM", "WORKS"] : ["ALL", "DRIVE FILM"]), [works.length]);
  const activeTab: Tab = tabs.includes(tab) ? tab : "ALL";
  const cards: PortfolioCard[] = useMemo(() => {
    if (activeTab === "DRIVE FILM") return drive.films;
    if (activeTab === "WORKS") return works;
    return [...works, ...drive.films];
  }, [activeTab, drive.films, works]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeTab, cards.length]);

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
            {tabs.map((item) => (
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
                {t(item)}
              </button>
            ))}
            <span className="ml-auto font-mono text-[11px] text-faint">
              {cards.length} PROJECTS
            </span>
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
                    className="aspect-video w-full"
                    imgClassName="transition-transform duration-700 group-hover:scale-[1.03]"
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
                          onClick={(event) => { triggerRef.current = event.currentTarget; setSelectedKey(card.key); }}
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
                  {card.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
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

        {activeTab !== "WORKS" && drive.status === "loading" && <p role="status" className="mt-8 text-sm text-mute">{t("드라이브 영상 목록을 불러오는 중입니다.")}</p>}
        {activeTab === "DRIVE FILM" && drive.status === "ready" && drive.films.length === 0 && <p className="mt-8 text-sm text-mute">{t("공개된 드라이브 영상이 없습니다.")}</p>}
        {activeTab !== "WORKS" && (drive.status === "unconfigured" || drive.status === "unavailable") && <p role="status" className="mt-8 text-sm text-mute">{t("드라이브 영상 목록을 불러올 수 없습니다.")}</p>}

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
                <iframe
                  src={selected.videoUrl}
                  title={t("{title} 영상 보기", { title: t(selected.title) })}
                  className="block aspect-video w-full border-0 bg-black"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                />
                <div className="flex justify-end px-4 py-3 sm:px-5">
                  <a href={selected.videoUrl?.replace(/\/preview(?=\?|$)/, "/view")} target="_blank" rel="noreferrer" className="text-xs text-mute underline underline-offset-4 hover:text-brand">{t("Google Drive에서 영상 열기")} ↗</a>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </Dialog.Root>
      </div>
    </section>
  );
}
