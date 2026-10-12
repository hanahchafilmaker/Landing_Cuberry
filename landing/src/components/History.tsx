import { useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import { history } from "@/data/content";

/**
 * HISTORY · 기록 — 연도 칩으로 필터링하는 타임라인.
 * 최신 항목(첫 줄)만 gold 점·gold 날짜로 강조한다 (디자인 E안의 동작 그대로).
 */
export function History() {
  const [year, setYear] = useState("all");

  const years = useMemo(
    () => ["all", ...Array.from(new Set(history.map((item) => item.date.slice(0, 4))))],
    [],
  );
  const shown = useMemo(
    () => history.filter((item) => year === "all" || item.date.startsWith(year)),
    [year],
  );

  return (
    <section id="history" className="section">
      <div className="shell flex flex-wrap items-start gap-x-12 gap-y-8">
        <div className="flex min-w-[240px] flex-1 flex-col gap-4">
          <div className="flex flex-col gap-2.5">
            <span className="eyebrow">HISTORY · 기록</span>
            <h2 className="m-0 text-[clamp(26px,3.2vw,34px)] font-bold tracking-[-0.02em] text-paper">
              연혁
            </h2>
          </div>

          <div role="group" aria-label="연도 선택" className="flex flex-wrap gap-1.5">
            {years.map((value) => {
              const on = year === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setYear(value)}
                  className={cn(
                    "min-h-9 cursor-pointer rounded-full px-3.5 py-1.5 text-[13px] transition-colors duration-200",
                    on
                      ? "border border-paper bg-paper font-medium text-ink"
                      : "border border-line-2 text-body hover:border-line-4 hover:text-paper",
                  )}
                >
                  {value === "all" ? "전체" : value}
                </button>
              );
            })}
          </div>

          <span className="font-mono text-[11px] text-faint">{shown.length}건 표시 중</span>
        </div>

        <ol className="m-0 flex min-w-0 list-none flex-col gap-7 border-l border-line-2 py-0 pl-7 sm:flex-[999_1_560px]">
          {shown.map((item, i) => (
            <li key={`${item.date}-${i}`} className="relative flex flex-col gap-1">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute rounded-full",
                  i === 0
                    ? "-left-[33px] top-[7px] h-[9px] w-[9px] bg-brand"
                    : "-left-[32px] top-[8px] h-[7px] w-[7px] bg-line-4",
                )}
              />
              <span
                className={cn(
                  "font-mono text-[13px]",
                  i === 0 ? "text-brand" : "text-mute",
                )}
              >
                {item.date}
              </span>
              <span className="text-base leading-relaxed text-paper">{item.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
