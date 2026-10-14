// ─────────────────────────────────────────────────────────────
// 랜딩 콘텐츠 탭 — 긴 한 페이지를 네 개 탭으로 나눠 본다.
//
// 2026-10-14 대표님 요청: "탭을 나눠서 보고 싶다"
//   · 탭 이름은 상단 메뉴와 **같은 문구**를 쓴다(사전에 번역이 이미 있다)
//   · sections = 그 탭에 들어가는 섹션 id — 주소의 #해시로 바로 열 때
//     어느 탭을 켜야 하는지 찾는 데 쓴다 (예: /#works → 스튜디오 탭)
//   · 섹션은 탭을 바꿔도 DOM 에 그대로 남는다(검색엔진·CMS·기존 테스트가 그대로 동작)
//
// 탭 구성을 바꾸고 싶으면 이 파일의 TABS 만 고치면 된다.
// (탭 바 · 패널 · 주소 해시 · 상단 메뉴가 모두 이 정의를 따라간다)
// ─────────────────────────────────────────────────────────────

export interface TabDef {
  /** 내부 식별자 (panel-*, tab-* 의 id 로 쓰인다) */
  id: string;
  /** 화면에 보이는 한국어 이름 — i18n 사전을 거쳐 영어로 바뀐다 */
  label: string;
  /** 이 탭을 열 때 주소창에 남기는 해시 (공유·북마크용) */
  href: string;
  /** 이 탭에 들어가는 섹션 id 들 */
  sections: string[];
}

export const TABS: TabDef[] = [
  {
    id: "about",
    label: "회사소개",
    href: "#top",
    sections: ["top", "sectors", "founder", "history", "patents"],
  },
  {
    id: "studio",
    label: "스튜디오",
    href: "#works",
    sections: ["works", "team", "process"],
  },
  {
    id: "xconda",
    label: "엑스콘다",
    href: "#lab",
    sections: ["lab", "pricing"],
  },
  {
    id: "contact",
    label: "문의",
    href: "#contact",
    sections: ["faq", "contact"],
  },
];

/** 첫 화면에서 켜 두는 탭 — 히어로가 들어 있어 지금까지의 첫인상과 같다. */
export const DEFAULT_TAB = TABS[0].id;

/** 섹션 id("works" 또는 "#works")가 어느 탭에 있는지 */
export function tabForSection(section: string): TabDef | undefined {
  const id = String(section || "").replace(/^#/, "").split("?")[0];
  if (!id) return undefined;
  return TABS.find((tab) => tab.sections.includes(id));
}

/** 패널 요소의 id — 스크롤 위치를 잡을 때 쓴다 */
export function panelId(tabId: string): string {
  return `panel-${tabId}`;
}

/** 탭 바 버튼의 id */
export function tabButtonId(tabId: string): string {
  return `tab-${tabId}`;
}

export function tabById(tabId: string): TabDef | undefined {
  return TABS.find((tab) => tab.id === tabId);
}
