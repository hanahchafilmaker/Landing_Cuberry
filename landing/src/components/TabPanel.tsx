import { panelId, tabButtonId, type TabDef } from "@/tabs/config";
import { useTabs } from "@/tabs/TabContext";

/**
 * 탭 하나가 담는 영역.
 * 켜지지 않은 탭은 hidden 속성으로만 감춘다 — DOM 에서 지우지 않으므로
 * 검색엔진·CMS 값·기존 테스트가 그대로 동작한다.
 */
export function TabPanel({ tab, children }: { tab: TabDef; children: React.ReactNode }) {
  const { active } = useTabs();
  const hidden = active !== tab.id;

  return (
    <div
      id={panelId(tab.id)}
      role="tabpanel"
      aria-labelledby={tabButtonId(tab.id)}
      hidden={hidden}
      className="tabpanel"
    >
      {children}
    </div>
  );
}
