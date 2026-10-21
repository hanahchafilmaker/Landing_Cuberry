// 콘텐츠 탭 동작 검증 (jsdom · 실제 빌드 번들을 그대로 돌린다)
//
// 2026-10-14 대표님 요청: "탭을 나눠서 보고 싶다"
// 긴 한 페이지를 네 탭(회사소개 · 스튜디오 · 엑스콘다 · 문의)으로 나눈 뒤,
//   [1] 첫 화면은 지금까지와 같다 (회사소개 탭 = 히어로부터)
//   [2] 탭을 누르면 화면이 바뀌고 주소에 해시가 남는다 (#works …)
//   [3] 그 해시로 바로 들어오면 그 탭이 켜진다 (공유·북마크·뒤로가기)
//   [4] 상단 메뉴·본문 앵커도 같은 규칙으로 탭을 켠다
//   [5] 영어 화면에서는 탭 이름도 영어
//   [6] 키보드 ←/→ 로도 옮길 수 있다
//   [7] 내용은 DOM 에 그대로 남는다 — 검색엔진·CMS·기존 테스트가 그대로 동작해야 한다
//   [8] 접근성 배선(role/aria)이 맞는다
//
// 실행: npm run test:tabs  (jsdom 필요 · npm test 에 포함)
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(path.join(ROOT, "index.html"), "utf8");
const moduleTag = '<script type="module" crossorigin>';
const bundleStart = source.indexOf(moduleTag) + moduleTag.length;
const bundleEnd = source.indexOf("</script>", bundleStart);
if (bundleStart < moduleTag.length || bundleEnd < 0) {
  throw new Error("index.html의 인라인 React 번들을 찾지 못했습니다. (npm run build)");
}
const bundle = source.slice(bundleStart, bundleEnd);

/** 탭 정의 (landing/src/tabs/config.ts 와 같아야 한다) */
const TABS = [
  { id: "about", ko: "회사소개", en: "Company", href: "#top", sections: ["top", "sectors", "founder", "history", "patents"] },
  { id: "studio", ko: "스튜디오", en: "Studio", href: "#works", sections: ["works", "team", "process"] },
  { id: "xconda", ko: "엑스콘다", en: "XCONDA", href: "#lab", sections: ["lab", "pricing"] },
  { id: "contact", ko: "문의", en: "Contact", href: "#contact", sections: ["faq", "contact"] },
];
const OFFICIAL = "https://www.cuberry.kr/";

let failures = 0;
let checks = 0;
const show = (value) => (typeof value === "object" && value !== null ? JSON.stringify(value) : String(value));
function expect(label, actual, wanted) {
  checks += 1;
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    failures += 1;
    console.error(`  ✗ ${label}\n      기대: ${show(wanted)}\n      실제: ${show(actual)}`);
  } else {
    console.log(`  ✓ ${label}`);
  }
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(label, check, timeout = 5000) {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeout) throw new Error(`${label} 시간 초과`);
    await sleep(25);
  }
}
const text = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? "";
/** 탭 버튼은 숫자(01)와 이름이 붙어 있어(textContent 는 "01회사소개") 공백을 지우고 비교한다 */
const flat = (value) => String(value ?? "").replace(/\s+/g, "");

/** 랜딩을 실제로 띄운다. language·주소(hash 포함)·CMS 값만 바꿔 첫 화면을 재현한다. */
async function renderLanding({ language = "ko-KR", hash = "", search = "", cms = null } = {}) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => {
    if (!/Could not load|Not implemented: navigation|Not implemented: window\.scroll/.test(error.message)) console.error(error);
  });
  const dom = new JSDOM(
    '<!doctype html><html lang="ko" data-cms-native="1"><head><meta name="description" content="" /><title>·</title></head><body><div id="root"></div></body></html>',
    {
      url: `${OFFICIAL}${search}${hash}`,
      runScripts: "dangerously",
      pretendToBeVisual: true,
      virtualConsole,
      beforeParse(window) {
        Object.defineProperty(window.navigator, "language", { value: language, configurable: true });
        Object.defineProperty(window.navigator, "languages", { value: [language], configurable: true });
        window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
        window.scrollTo = () => {};
        window.open = () => null;
        window.fetch = async () => ({ ok: true, json: async () => cms ?? {} });
      },
    },
  );
  dom.window.eval(bundle);
  await until("React 렌더", () => dom.window.document.querySelector('[role="tablist"]'));
  await until("탭 상태 확정", () => dom.window.document.querySelector('[role="tabpanel"]'));
  return dom;
}

const tabs = (document) => [...document.querySelectorAll('[role="tab"]')];
const panels = (document) => [...document.querySelectorAll('[role="tabpanel"]')];
const selectedTab = (document) => tabs(document).find((node) => node.getAttribute("aria-selected") === "true");
const visiblePanels = (document) => panels(document).filter((node) => !node.hasAttribute("hidden"));
const hiddenPanels = (document) => panels(document).filter((node) => node.hasAttribute("hidden"));
const panelOf = (document, id) => document.getElementById(`panel-${id}`);
const tabOf = (document, id) => document.getElementById(`tab-${id}`);

console.log("\n[1] 기본 상태 — 회사소개 탭이 켜져 있고, 첫 화면은 히어로 그대로");
{
  const dom = await renderLanding();
  const { document } = dom.window;
  expect("탭 4개", tabs(document).map(text).map(flat), TABS.map((tab, index) => flat(`0${index + 1} ${tab.ko}`)));
  expect("켜진 탭", selectedTab(document)?.getAttribute("data-tab"), "about");
  expect("보이는 패널", visiblePanels(document).map((node) => node.id), ["panel-about"]);
  expect("감춘 패널", hiddenPanels(document).length, 3);
  expect("첫 화면에 히어로", Boolean(document.querySelector("#top h1")), true);
  // 데스크톱 상단 메뉴(첫 번째 nav)와 탭 이름이 같은 문구를 쓰는지 — 모바일 메뉴는 숫자가 붙는다.
  const headerNav = [...document.querySelector("header nav[aria-label]").querySelectorAll("a")].map(text);
  expect("상단 메뉴 이름 = 탭 이름", headerNav, TABS.map((tab) => tab.ko));
  dom.window.close();
}

console.log("\n[2] 탭 클릭 — 화면 전환 + 주소 해시 + aria-selected");
{
  const dom = await renderLanding();
  const { document } = dom.window;
  tabOf(document, "studio").click();
  await until("스튜디오 탭", () => selectedTab(document)?.getAttribute("data-tab") === "studio");
  expect("보이는 패널", visiblePanels(document).map((node) => node.id), ["panel-studio"]);
  expect("주소 해시", dom.window.location.hash, "#works");
  expect("회사소개 탭은 미선택", tabOf(document, "about").getAttribute("aria-selected"), "false");
  expect("스튜디오 내용이 화면에", Boolean(document.querySelector("#works h2, #works h3, #works article")), true);

  tabOf(document, "contact").click();
  await until("문의 탭", () => selectedTab(document)?.getAttribute("data-tab") === "contact");
  expect("문의 탭 해시", dom.window.location.hash, "#contact");
  expect("문의 폼이 보이는 패널 안", Boolean(panelOf(document, "contact")?.querySelector("form")), true);
  expect("히어로는 감춘 패널로", Boolean(panelOf(document, "about")?.querySelector("#top h1")), true);
  dom.window.close();
}

console.log("\n[3] 해시로 바로 열기 — 공유·북마크·새로고침");
for (const [hash, id] of [["#works", "studio"], ["#lab", "xconda"], ["#contact", "contact"], ["#history", "about"]]) {
  const dom = await renderLanding({ hash });
  const { document } = dom.window;
  expect(`${hash} → ${id} 탭`, selectedTab(document)?.getAttribute("data-tab"), id);
  expect(`${hash} 패널만 보임`, visiblePanels(document).map((node) => node.id), [`panel-${id}`]);
  dom.window.close();
}

console.log("\n[4] 상단 메뉴·본문 앵커 — 숨은 탭의 섹션이면 탭을 켜고 이동");
{
  const dom = await renderLanding();
  const { document } = dom.window;
  const menuLink = [...document.querySelectorAll('header nav[aria-label] a')].find((link) => text(link) === "엑스콘다");
  expect("상단 메뉴에 엑스콘다", Boolean(menuLink), true);
  menuLink.click();
  await until("엑스콘다 탭", () => selectedTab(document)?.getAttribute("data-tab") === "xconda");
  expect("주소 해시", dom.window.location.hash, "#lab");
  dom.window.close();
}
{
  // 히어로의 "문의" CTA(#contact) 처럼 본문 안 앵커도 같은 규칙을 따른다.
  const dom = await renderLanding();
  const { document } = dom.window;
  const cta = document.querySelector('#top a[href="#contact"]');
  expect("히어로에 문의 앵커", Boolean(cta), true);
  cta.click();
  await until("문의 탭으로 전환", () => selectedTab(document)?.getAttribute("data-tab") === "contact");
  expect("문의 탭 해시", dom.window.location.hash, "#contact");
  dom.window.close();
}

console.log("\n[5] 영어 화면 — 탭 이름도 영어");
{
  const dom = await renderLanding({ language: "en-US", search: "?lang=en" });
  const { document } = dom.window;
  await until("영어 적용", () => document.documentElement.getAttribute("lang") === "en");
  expect("탭 이름", tabs(document).map(text).map(flat), TABS.map((tab, index) => flat(`0${index + 1} ${tab.en}`)));
  expect("영어 화면에 한국어 탭 이름 없음", /회사소개|스튜디오|엑스콘다/.test(text(document.querySelector('[role="tablist"]'))), false);
  dom.window.close();
}

console.log("\n[6] 키보드 — ←/→ 이동");
{
  const dom = await renderLanding();
  const { document } = dom.window;
  const press = (key) => tabOf(document, selectedTab(document).getAttribute("data-tab"))
    .dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true }));
  press("ArrowRight");
  await until("다음 탭", () => selectedTab(document)?.getAttribute("data-tab") === "studio");
  expect("오른쪽 → 스튜디오", dom.window.location.hash, "#works");
  expect("포커스도 함께 이동", document.activeElement?.id, "tab-studio");
  press("ArrowLeft");
  await until("이전 탭", () => selectedTab(document)?.getAttribute("data-tab") === "about");
  press("End");
  await until("마지막 탭", () => selectedTab(document)?.getAttribute("data-tab") === "contact");
  expect("End → 문의", dom.window.location.hash, "#contact");
  dom.window.close();
}

console.log("\n[7] 내용은 DOM 에 남는다 — 검색엔진·CMS·기존 테스트 대응");
{
  const dom = await renderLanding();
  const { document } = dom.window;
  const sections = TABS.flatMap((tab) => tab.sections);
  const missing = sections.filter((id) => !document.getElementById(id));
  expect("모든 섹션이 DOM 에 있음", missing, []);
  // 감춘 탭의 문구도 문서에는 남아 있어야 한다(크롤러·CMS 값 반영·기존 테스트).
  expect("감춘 탭(엑스콘다)의 상품 섹션 존재", Boolean(document.querySelector("#pricing")), true);
  expect("감춘 탭(문의)의 FAQ 문구가 DOM 에 있음", text(document.querySelector("#faq")).includes("자주 묻는"), true);
  expect("패널은 내용을 지우지 않고 hidden 만 쓴다", hiddenPanels(document).every((node) => node.childElementCount > 0), true);
  dom.window.close();
}

console.log("\n[8] 접근성 배선");
{
  const dom = await renderLanding();
  const { document } = dom.window;
  const list = document.querySelector('[role="tablist"]');
  expect("탭 목록 이름", list.getAttribute("aria-label"), "콘텐츠 탭");
  expect(
    "aria-controls ↔ 패널 id",
    tabs(document).map((tab) => tab.getAttribute("aria-controls")),
    ["panel-about", "panel-studio", "panel-xconda", "panel-contact"],
  );
  expect(
    "패널이 탭을 가리킴",
    panels(document).map((panel) => panel.getAttribute("aria-labelledby")),
    ["tab-about", "tab-studio", "tab-xconda", "tab-contact"],
  );
  expect("선택된 탭만 tab 순서에 포함", tabs(document).map((tab) => tab.tabIndex), [0, -1, -1, -1]);
  expect("숨은 패널은 hidden 속성으로", panels(document).map((panel) => panel.hasAttribute("hidden")), [false, true, true, true]);
  expect("화면 낭독기용 현재 탭 안내", text(document.querySelector('[aria-live="polite"]')), "현재 탭: 회사소개");
  dom.window.close();
}

console.log("\n[9] 고정 배치 — 헤더 아래에 붙고, 이동한 섹션이 가리지 않게");
{
  // jsdom 은 레이아웃을 계산하지 않으므로, 실제 배포되는 CSS·마크업 배선을 확인한다.
  // (높이는 useStickyOffset 이 화면에서 재어 --header-height · --tab-top · --anchor-offset 에 넣는다)
  const css = readFileSync(path.join(ROOT, "landing", "src", "index.css"), "utf8");
  const hook = readFileSync(path.join(ROOT, "landing", "src", "hooks", "useStickyOffset.ts"), "utf8");
  expect("빌드된 번들에 탭 바 스타일", /\.tabbar\s*\{/.test(source), true);
  expect("탭 바는 헤더 아래에 고정", /\.tabbar\s*\{[^}]*position:\s*sticky/.test(css) && /\.tabbar\s*\{[^}]*top:\s*var\(--tab-top/.test(css), true);
  expect("본문 위쪽 여백 = 헤더 높이", /main\s*\{[^}]*padding-top:\s*var\(--header-height/.test(css), true);
  expect("섹션 이동 여백 = 헤더 + 탭 바", /section\[id\]\s*\{[^}]*scroll-margin-top:\s*var\(--anchor-offset/.test(css), true);
  expect("높이를 화면에서 잰다", /offsetHeight/.test(hook) && /--header-height/.test(hook) && /--anchor-offset/.test(hook), true);

  const dom = await renderLanding();
  const { document } = dom.window;
  expect("탭 바에 측정용 표식(data-tabbar)", Boolean(document.querySelector("[data-tabbar]")), true);
  expect("탭 바가 본문 첫 요소", document.getElementById("main-content").firstElementChild.hasAttribute("data-tabbar"), true);
  dom.window.close();
}

console.log(`\n결과: ${checks - failures}/${checks} 통과`);
if (failures) {
  console.error(`${failures}건 실패`);
  process.exit(1);
}
