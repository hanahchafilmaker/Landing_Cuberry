import { useRef } from "react";
import { cn } from "@/utils/cn";
import { TABS, tabButtonId, panelId } from "@/tabs/config";
import { useTabs } from "@/tabs/TabContext";
import { useI18n } from "@/i18n/LanguageContext";

/**
 * 콘텐츠 탭 바 — 헤더 아래에 붙어(스크롤해도 따라옴) 네 항목을 전환한다.
 * 이름·순서는 상단 메뉴와 같고, 숫자(01~04)는 사이트의 모노 라벨 리듬을 따른다.
 * 키보드 ←/→·Home/End 로도 옮길 수 있다(ARIA 탭 패턴).
 */
export function TabBar() {
  const { active, setActive } = useTabs();
  const { t } = useI18n();
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((tab) => tab.id === active);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    const tab = TABS[next];
    setActive(tab.id, { hash: tab.href });
    listRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${tab.id}"]`)?.focus();
  };

  return (
    <div className="tabbar" data-tabbar>
      <div
        ref={listRef}
        role="tablist"
        aria-label={t("콘텐츠 탭")}
        onKeyDown={onKeyDown}
        className="tabbar-list shell"
      >
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            data-tab={tab.id}
            id={tabButtonId(tab.id)}
            aria-selected={active === tab.id}
            aria-controls={panelId(tab.id)}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id, { hash: tab.href })}
            className="tab"
          >
            <span aria-hidden="true" className={cn("font-mono text-[10px] tracking-[0.14em] text-faint")}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{t(tab.label)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
