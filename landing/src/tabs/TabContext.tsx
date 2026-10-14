import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { DEFAULT_TAB, panelId, tabById, tabForSection } from "./config";

// ─────────────────────────────────────────────────────────────
// 탭 상태 — 어디서 눌러도 같은 탭이 켜지게 하는 한 곳.
//
//   · 탭 바 버튼      → setActive(탭)
//   · 상단 메뉴·본문 속 앵커(#works 등) → 가로채서 그 섹션이 있는 탭을 켜고 그 자리로 이동
//   · 주소의 #해시로 바로 들어온 경우(공유·뒤로가기) → 로드·hashchange 때 같은 규칙으로 맞춘다
//
// 화면은 '패널'을 hidden 으로 감출 뿐, DOM 에서 지우지 않는다.
// (검색엔진이 모든 문구를 읽고, 어드민 CMS 값과 기존 테스트도 그대로 동작한다)
// ─────────────────────────────────────────────────────────────

interface TabsValue {
  /** 지금 켜져 있는 탭 id */
  active: string;
  /**
   * 탭을 연다.
   *   hash    — 주소창에 남길 해시(공유용). 없으면 주소는 그대로 둔다.
   *   section — 이 섹션 위치로 스크롤(예: #works 를 눌러 들어온 경우). 없으면 패널 맨 위로.
   */
  setActive: (tabId: string, options?: { hash?: string; section?: string }) => void;
}

const TabsContext = createContext<TabsValue | null>(null);

/** 탭 전환은 '즉시' 이동한다 — html 에 smooth 가 걸려 있어 긴 페이지를 훑고 지나가는 것을 막는다. */
function jumpTo(element: Element | null) {
  if (!element || typeof element.scrollIntoView !== "function") return;
  const root = document.documentElement;
  const previous = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  try {
    element.scrollIntoView({ block: "start" });
  } finally {
    root.style.scrollBehavior = previous;
  }
}

const hashOf = () => (typeof window === "undefined" ? "" : window.location.hash);

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const [active, setActiveState] = useState<string>(() => tabForSection(hashOf())?.id ?? DEFAULT_TAB);
  const activeRef = useRef(active);
  activeRef.current = active;

  // 스크롤은 state 반영(패널이 보이게 된 뒤) 다음에 해야 하므로 예약해 두고 effect 에서 처리한다.
  const pending = useRef<{ tabId: string; section?: string } | null>(null);
  const [nonce, setNonce] = useState(0);

  const scrollToTab = useCallback((tabId: string, section?: string) => {
    const element = section ? document.getElementById(section) : document.getElementById(panelId(tabId));
    jumpTo(element);
  }, []);

  useEffect(() => {
    if (!pending.current) return;
    const { tabId, section } = pending.current;
    pending.current = null;
    const element = section ? document.getElementById(section) : document.getElementById(panelId(tabId));
    jumpTo(element);
    // nonce 가 바뀔 때마다(같은 탭을 다시 눌러도) 한 번씩 실행된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  const setActive = useCallback(
    (tabId: string, options: { hash?: string; section?: string } = {}) => {
      if (!tabById(tabId)) return;
      pending.current = { tabId, section: options.section };
      setActiveState(tabId);
      setNonce((value) => value + 1);
      if (options.hash && typeof window !== "undefined") {
        try {
          if (window.location.hash !== options.hash) {
            window.history.pushState(window.history.state, "", options.hash);
          }
        } catch {
          /* iframe 등 주소를 못 바꾸는 환경에서도 탭 전환은 유지한다 */
        }
      }
    },
    [],
  );

  // 주소의 해시가 바뀌면(뒤로가기·직접 입력·공유 링크) 그 섹션이 있는 탭을 켠다.
  useEffect(() => {
    const onHashChange = () => {
      const section = hashOf().replace(/^#/, "");
      const tab = tabForSection(section);
      if (!tab) return;
      if (tab.id === activeRef.current) {
        scrollToTab(tab.id, section);
        return;
      }
      pending.current = { tabId: tab.id, section };
      setActiveState(tab.id);
      setNonce((value) => value + 1);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [scrollToTab]);

  // 본문 어디에 있는 앵커(#works 등)든, 숨은 탭에 있는 섹션이면 탭을 켜고 이동한다.
  // (상단 메뉴·섹터 CTA·푸터 링크가 모두 같은 규칙을 따르게 된다)
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; // 새 탭 열기는 그대로 둔다
      const target = event.target as Element | null;
      const anchor = target?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const hash = anchor.getAttribute("href") ?? "";
      const section = hash.slice(1);
      if (!section || section === "main-content") return; // 건너뛰기 링크는 브라우저 기본 동작(포커스 이동)
      const tab = tabForSection(section);
      if (!tab) return; // 탭과 상관없는 앵커도 기본 동작을 유지한다
      event.preventDefault();
      try {
        if (window.location.hash !== hash) window.history.pushState(window.history.state, "", hash);
      } catch {
        /* 주소를 못 바꾸는 환경 */
      }
      if (tab.id === activeRef.current) {
        scrollToTab(tab.id, section);
        return;
      }
      pending.current = { tabId: tab.id, section };
      setActiveState(tab.id);
      setNonce((value) => value + 1);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [scrollToTab]);

  // #works 같은 주소로 처음 열었을 때 그 자리로 스크롤 (브라우저는 숨은 요소로 못 내려간다)
  useEffect(() => {
    const section = hashOf().replace(/^#/, "");
    const tab = tabForSection(section);
    if (tab) scrollToTab(tab.id, section);
  }, [scrollToTab]);

  return <TabsContext.Provider value={{ active, setActive }}>{children}</TabsContext.Provider>;
}

export function useTabs(): TabsValue {
  const value = useContext(TabsContext);
  // 개발자용 불변식이라 화면에 나가지 않는다 — 번역 사전을 거치지 않도록 영어로 둔다.
  if (!value) throw new Error("useTabs must be used inside <TabsProvider>.");
  return value;
}
