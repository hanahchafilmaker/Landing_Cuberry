// 새 랜딩(landing/ 소스 → 루트 index.html, <html data-cms-native>)이
// cms-bridge.js 가 읽어온 관리자 API 콘텐츠를 React 로 직접 렌더하는지 확인한다.
// 브리지는 DOM 을 고치지 않고 "cuberry:content" 이벤트만 보낸다.
//
// 실행: npm run test:cms  (jsdom 필요: npm i -D jsdom)
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(path.join(ROOT, "index.html"), "utf8");
const bridge = readFileSync(path.join(ROOT, "cms-bridge.js"), "utf8");
const moduleTag = '<script type="module" crossorigin>';
const bundleStart = source.indexOf(moduleTag) + moduleTag.length;
const bundleEnd = source.indexOf("</script>", bundleStart);
if (bundleStart < moduleTag.length || bundleEnd < 0) throw new Error("index.html의 인라인 React 번들을 찾지 못했습니다. (npm run build)");
const bundle = source.slice(bundleStart, bundleEnd);

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

let content = {
  settings: {
    brandName: "CUBERRY CMS",
    heroEyebrow: "CMS EYEBROW",
    heroTitle: "ADMIN SAVED TITLE",
    heroSubtitle: "관리자에서 저장한 첫 문장입니다. 새 랜딩에도 바로 표시됩니다.",
    contactEmail: "saved@example.com",
    contactPhone: "02-1234-5678",
  },
  services: [
    { id: 101, name: "관리형 숏폼", price: "39만원~", duration: "20초 · 6컷" },
    { id: 102, name: "브랜드 필름", price: "89만원~", duration: "60초 · 12컷" },
  ],
  portfolio: [
    {
      id: 201, title: "CMS 드라이브 작품", category: "DRIVE", year: "2026", description: "드라이브 설명",
      videoUrl: "https://example.com/drive", thumbnailUrl: "https://example.com/drive.jpg", tags: "DRIVE",
      kind: "광고", source: "drive", landingSlot: "drive-1",
    },
    {
      id: 202, title: "CMS 기업 작품", category: "CORPORATE", year: "2026", description: "기업 작품 설명",
      videoUrl: "https://example.com/work", thumbnailUrl: "https://example.com/work.jpg", tags: "PLAN, EDIT",
      kind: "기업", source: "works", landingSlot: "work-1",
    },
    {
      id: 203, title: "CMS 신규 작품", category: "BRAND", year: "2025", description: "신규 작품 설명",
      videoUrl: "https://drive.google.com/drive/u/0/folders/private_folder_123", thumbnailUrl: "https://example.com/extra.jpg", tags: "AI", kind: "브랜드", source: "extra", landingSlot: null,
    },
    {
      id: 204, title: "CMS 드라마 작품", category: "AI ANIMATION SERIES", year: "2026", description: "드라마 작품 설명",
      videoUrl: "https://example.com/drama", thumbnailUrl: "https://example.com/drama.jpg", tags: "AI GENERATION, PLANNING", kind: "작품", source: "extra", landingSlot: null,
    },
  ],
  team: [
    {
      id: 301, name: "저장된 감독", role: "DIRECTOR · CMS TEAM", bio: "첫 번째 이력\n[포트폴리오](https://example.com/profile)",
      photoUrl: "https://example.com/person.jpg", photoPosition: 27,
    },
  ],
  faqs: [
    { id: 401, question: "저장된 질문 1", answer: "저장된 답변 1" },
    { id: 402, question: "저장된 질문 2", answer: "저장된 답변 2" },
  ],
};
let drive = {
  status: "ready",
  updatedAt: "2026-10-28T00:00:00.000Z",
  videos: [
    {
      id: "drivevideo12345", name: "Turn_Commercial_v1_KORsub.mp4", resourceKey: "resourcekey123", folders: ["Never show folder"],
      category: "commercial", categoryLabel: "광고", section: "XCONDA", group: "commercial:turn_commercial", title: "Turn Commercial",
      variant: "KO 자막 / v1", version: 1, aspect: "portrait", durationMs: 30_000, search: "turn commercial ko 자막",
    },
  ],
};

const requested = [];
const posted = [];
let lastDriveStatus = null;
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => {
  // 외부 이미지/폰트 로드는 이 DOM 동작 테스트의 대상이 아니다.
  if (!/Could not load|Not implemented: navigation/.test(error.message)) console.error(error);
});
const dom = new JSDOM("<!doctype html><html lang=\"ko\" data-cms-native=\"1\"><head></head><body><div id=\"root\"></div></body></html>", {
  url: "https://hanahchafilmaker.github.io/Landing_Cuberry/",
  runScripts: "dangerously",
  pretendToBeVisual: true,
  virtualConsole,
  beforeParse(window) {
    // 이 테스트는 "관리자 저장값이 랜딩에 반영되는지"만 본다 — 한국어 화면으로 고정한다.
    // (jsdom 기본값은 en-US 라서, 그대로 두면 한영 자동 번역이 먼저 동작한다.
    //  언어 전환 자체는 test/landing-i18n.mjs 가 검증한다)
    Object.defineProperty(window.navigator, "language", { value: "ko-KR", configurable: true });
    Object.defineProperty(window.navigator, "languages", { value: ["ko-KR", "ko"], configurable: true });
    window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    window.scrollTo = () => {};
    window.open = () => null;
    window.fetch = async (url, init = {}) => {
      if (init.method === "POST") {
        posted.push({ url: String(url), body: JSON.parse(init.body) });
        return { ok: true, json: async () => ({ id: "CB-TEST-0001" }) };
      }
      requested.push(String(url));
      return { ok: true, json: async () => {
        const isDrive = String(url).endsWith("/api/public/drive-portfolio");
        const result = structuredClone(isDrive ? drive : content);
        if (isDrive) lastDriveStatus = result.status;
        return result;
      } };
    };
  },
});

const document = dom.window.document;
const text = (node) => node?.textContent.replace(/\s+/g, " ").trim();
// 히어로 제목은 마지막 단어 앞에 <br> 이 들어가므로 공백을 모두 걷어내고 비교한다.
const flat = (value) => String(value ?? "").replace(/\s+/g, "");
const heroTitle = () => flat(document.querySelector("#top h1")?.textContent);
async function until(label, check, timeout = 5000) {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeout) throw new Error(`${label} 시간 초과`);
    await sleep(25);
  }
}

console.log("\n[landing CMS] 브리지가 React 보다 먼저 응답을 받아도 관리자 저장값으로 렌더");
// 실제 index.html과 같은 순서: defer 브리지가 API를 먼저 읽을 수 있고, module 번들은 뒤에 마운트된다.
dom.window.eval(bridge);
await until("브리지 응답", () => Boolean(dom.window.CuberryContent));
dom.window.eval(bundle);
await until("React 렌더", () => heroTitle() === flat("ADMIN SAVED TITLE"));

expect("운영 API에서 공개 콘텐츠 요청", requested[0], "https://landing-cuberry-admin.onrender.com/api/public/content");
expect("브리지가 DOM 복제본을 만들지 않음", document.querySelectorAll("[data-cms-modern], [data-cms-original]").length, 0);
expect("히어로 제목", heroTitle(), flat("ADMIN SAVED TITLE"));
expect("히어로 제목 마지막 단어 강조", text(document.querySelector("#top h1 .text-gradient")), "TITLE");
expect("히어로 eyebrow", [...document.querySelectorAll("#top span")].some((node) => text(node) === "CMS EYEBROW"), true);
expect("히어로 설명", [...document.querySelectorAll("#top p")].some((node) => text(node) === content.settings.heroSubtitle), true);
expect("브랜드명(내비)", text(document.querySelector('header a[href="#top"] span')), "CUBERRY CMS");

const pricing = document.querySelector("#pricing");
expect("상품 카드 개수", pricing?.querySelectorAll("article").length, 2);
expect("상품명 저장값", [...pricing.querySelectorAll("article h3")].map(text), ["관리형 숏폼", "브랜드 필름"]);
expect("상품 가격 저장값", [...pricing.querySelectorAll("article")].map((card) => text(card).includes("39만원~") || text(card).includes("89만원~")), [true, true]);
expect("프로젝트 문의 CTA", text(document.querySelector('#top a[href="#contact"]')), "프로젝트 상담하기");
expect("히어로와 상품 카드 사이 가격 중복 없음", document.querySelectorAll('#top a[href="#pricing"]').length, 0);

const works = document.querySelector("#works");
/** 제목으로 카드를 찾는다 — 탭마다 카드 순서가 달라지므로 위치 대신 제목을 쓴다. */
const cardOf = (title) => [...works.querySelectorAll("article")].find((node) => text(node.querySelector("h3")) === title);
const titles = () => [...works.querySelectorAll("article h3")].map(text);
const tabOf = (id) => works.querySelector(`[data-portfolio-tab="${id}"]`);

// 전체 탭 대신 3분류 — 작품중심(기본) · 광고 · 기타
expect("포트폴리오 3분류 탭", [...works.querySelectorAll("[data-portfolio-tab]")].map((node) => text(node.querySelector("span span"))), ["작품중심", "광고", "기타"]);
expect("기본 진입 탭은 작품중심", tabOf("creative").getAttribute("aria-pressed"), "true");
expect("작품중심 = CMS 드라마 작품", titles(), ["CMS 드라마 작품"]);
expect("이전 CMS 드라이브 항목 미노출", text(works).includes("CMS 드라이브 작품"), false);

// 광고 탭 = CMS 브랜드 필름 + 커머셜(Drive)
tabOf("ad").click();
await until("광고 탭 Drive 응답", () => titles().includes("Turn Commercial"));
expect("Drive API도 운영 서버에서 조회", requested.some((url) => url.endsWith("/api/public/drive-portfolio")), true);
expect("광고 탭 = 브랜드 + 커머셜", titles(), ["CMS 신규 작품", "Turn Commercial"]);
expect("작품이 6개 이하면 더 보기 버튼 생략", works.querySelector('button[aria-controls="portfolio-grid"]'), null);
expect("중복 변형은 카드 한 장으로 병합", works.querySelectorAll("article").length, 2);
expect("일반 작품은 보존하되 저장된 Drive 폴더 링크는 숨김", Boolean(cardOf("CMS 신규 작품")?.querySelector("a")), false);
expect("AI 로 만든 작품에 AI 배지", cardOf("CMS 신규 작품")?.querySelector("[data-badge]")?.getAttribute("data-badge"), "AI");
// 썸네일은 우리 서버 중계를 거친다 — 구글 썸네일은 CORS 헤더가 없어 브라우저가 픽셀을 못 읽고,
// 그 때문에 "첫 장면이 검은 영상" 판정이 늘 실패했다(2026-10-29 대표님 지적).
expect("드라이브 썸네일 중계 주소", cardOf("Turn Commercial")?.querySelector("img")?.getAttribute("src"), "https://landing-cuberry-admin.onrender.com/api/public/drive-thumbnail?id=drivevideo12345&sz=w800&resourcekey=resourcekey123");
expect("폴더명이 카드에 표시되지 않음", text(works).includes("Never show folder"), false);
const portraitImg = cardOf("Turn Commercial").querySelector("img");
expect("세로 영상 썸네일도 액자를 꽉 채움(contain 아님)", portraitImg?.className.includes("object-cover") && !portraitImg.className.includes("object-contain"), true);
expect("버전이 하나면 배지를 붙이지 않음", Boolean(cardOf("Turn Commercial").querySelector("[data-badge]")), false);
expect("폴더 링크나 폴더 임베드 없음", Boolean(works.querySelector('a[href*="/drive/folders/"], iframe')), false);
const videoButton = cardOf("Turn Commercial").querySelector('button[aria-label]');
videoButton.focus();
videoButton.click();
await until("개별 Drive 플레이어", () => Boolean(document.querySelector('[role="dialog"] iframe')));
const player = document.querySelector('[role="dialog"]');
expect("개별 파일만 사이트에서 재생", player.querySelector("iframe").getAttribute("src"), "https://drive.google.com/file/d/drivevideo12345/preview?resourcekey=resourcekey123");
expect("개별 영상만 새 창에서 열 수 있음", player.querySelector("a")?.getAttribute("href"), "https://drive.google.com/file/d/drivevideo12345/view?resourcekey=resourcekey123");
player.querySelector('button[aria-label="닫기"]').click();
await until("플레이어 닫힘", () => !document.querySelector('[role="dialog"]'));
expect("닫은 뒤 카드에 포커스 복귀", document.activeElement === videoButton, true);

// 기타 탭 = 기업·인터뷰 등 나머지
tabOf("other").click();
await until("기타 탭", () => titles().length === 1);
expect("기타 탭 = 기업 작품", titles(), ["CMS 기업 작품"]);
expect("썸네일 저장값", works.querySelector("article img")?.getAttribute("src"), "https://example.com/work.jpg");
expect("작품 태그 분리", text(works.querySelector("article")).includes("PLAN"), true);

tabOf("creative").click();
await until("작품중심 복귀", () => titles().length === 1);

// 주소 딥링크(#works?view=ad)로도 탭이 열린다 — 공유·북마크용.
dom.window.history.replaceState(null, "", "#works?view=ad");
dom.window.dispatchEvent(new dom.window.Event("hashchange"));
await until("딥링크 광고 탭", () => tabOf("ad").getAttribute("aria-pressed") === "true");
expect("딥링크로 광고 탭 열림", titles(), ["CMS 신규 작품", "Turn Commercial"]);
dom.window.history.replaceState(null, "", "#works?view=creative");
dom.window.dispatchEvent(new dom.window.Event("hashchange"));
await until("딥링크 작품중심", () => tabOf("creative").getAttribute("aria-pressed") === "true");
expect("딥링크로 작품중심 복귀", titles(), ["CMS 드라마 작품"]);

const team = document.querySelector("#team");
expect("팀 인원 개수", team.querySelectorAll("article").length, 1);
expect("팀 이름", text(team.querySelector("article h3")), "저장된 감독");
expect("팀 역할/소속 분리", [...team.querySelectorAll("article div")].some((node) => text(node) === "CMS TEAM"), true);
expect("팀 사진 위치", team.querySelector("article img")?.style.objectPosition, "center 27%");
const teamHistory = team.querySelector("article details");
expect("팀 이력은 기본 접힘", teamHistory?.open, false);
teamHistory?.querySelector("summary")?.click();
await until("팀 이력 열기", () => teamHistory?.open === true);
expect("팀 이력 링크", text(team.querySelector('a[href="https://example.com/profile"]')), "포트폴리오");

const faq = document.querySelector("#faq");
const faqButtons = [...faq.querySelectorAll("button[aria-expanded]")];
expect("FAQ 개수", faqButtons.length, 2);
expect("FAQ 질문", faqButtons.map((node) => text(node)), ["Q1저장된 질문 1", "Q2저장된 질문 2"]);
expect("FAQ 첫 항목 열림", faqButtons[0].getAttribute("aria-expanded"), "true");
faqButtons[1].click();
await until("FAQ 토글", () => faqButtons[1].getAttribute("aria-expanded") === "true");
expect("FAQ 클릭 시 두 번째 답변 열림", text(faqButtons[1].parentElement.querySelector("p")), "저장된 답변 2");

expect("이메일 반영", document.querySelector('#contact a[href="mailto:saved@example.com"]')?.textContent.includes("saved@example.com"), true);
expect("전화 반영", document.querySelector('#contact a[href="tel:0212345678"]')?.textContent.includes("02-1234-5678"), true);
expect("푸터 이메일 반영", Boolean(document.querySelector('footer a[href="mailto:saved@example.com"]')), true);

console.log("\n[landing CMS] 문의 폼 → 운영 API /api/partnership");
const form = document.querySelector("#contact form");
form.querySelector('[name="contactName"]').value = "테스트 회사";
form.querySelector('[name="email"]').value = "lead@example.com";
form.querySelector('[name="phone"]').value = "010-1111-2222";
form.querySelector('[name="brief"]').value = "브랜드 필름 문의";
form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
await until("문의 접수", () => text(document.querySelector("#contact form"))?.includes("CB-TEST-0001"));
expect("문의 POST 주소", posted[0]?.url, "https://landing-cuberry-admin.onrender.com/api/partnership");
expect("문의 본문", { name: posted[0]?.body.contactName, email: posted[0]?.body.email, phone: posted[0]?.body.phone, brief: posted[0]?.body.brief },
  { name: "테스트 회사", email: "lead@example.com", phone: "010-1111-2222", brief: "브랜드 필름 문의" });

console.log("\n[landing CMS] 어드민 탭에서 저장 후 랜딩 탭 복귀 시 자동 갱신");
content = structuredClone(content);
content.settings.heroTitle = "FOCUS REFRESHED TITLE";
content.faqs[0].question = "포커스로 갱신된 질문";
dom.window.dispatchEvent(new dom.window.Event("focus"));
await until("focus 콘텐츠 갱신", () => heroTitle() === flat(content.settings.heroTitle), 3000);
expect("focus 때 API 재요청", requested.length >= 2, true);
expect("히어로 최신값", heroTitle(), flat("FOCUS REFRESHED TITLE"));
expect("FAQ 최신값", text(document.querySelector("#faq button[aria-expanded]")), "Q1포커스로 갱신된 질문");

console.log("\n[landing Drive] 개별 영상 갱신 및 장애 시 안전 처리");
drive = { ...drive, videos: [
  { id: "newvideo123456", name: "New_commercial.mp4", category: "commercial", categoryLabel: "광고", section: "KOSHA", group: "commercial:new_commercial", title: "New Commercial" },
  { id: "tvvideo1234567", name: "TV_Hometown_KO.mp4", category: "tv", categoryLabel: "TV", section: "한국어", group: "tv:tv_hometown", title: "TV Hometown" },
  { id: "dramavideo12345", name: "WebDrama_ColdSite.mp4", category: "webdrama", categoryLabel: "웹드라마", section: "", group: "webdrama:webdrama_coldsite", title: "Web Drama Cold Site" },
  { id: "newvideo789012", name: "New_commercial_v2_KO.mp4", category: "commercial", categoryLabel: "광고", section: "KOSHA", group: "commercial:new_commercial", title: "New Commercial", variant: "한국어 / v2", version: 2, aspect: "portrait" },
] };
tabOf("creative").click();
dom.window.dispatchEvent(new dom.window.Event("focus"));
await until("Drive 파일 갱신", () => works.querySelectorAll("article").length === 3);
expect("작품중심 = CMS 드라마 + TV·웹드라마", titles().sort(), ["CMS 드라마 작품", "TV Hometown", "Web Drama Cold Site"].sort());
expect("작품중심 탭에는 광고가 섞이지 않음", text(works).includes("New Commercial"), false);
const chipButtons = [...works.querySelectorAll('[aria-label="폴더 필터"] button')];
// 칩을 고르면 어드민 작품도 그 장르에 속한 것만 남는다(2026-10-29 "KOSHA에 다른 영상이 섞여있다" 지적).
// 숫자는 그 칩을 골랐을 때 보이는 카드 수 — 어드민 작품(CMS 드라마)까지 포함한다.
expect("장르 칩 표시(전체 + 장르 2)", chipButtons.map(text).sort(), ["TV1", "웹드라마1", "전체3"].sort());
chipButtons.find((button) => button.dataset.chip === "웹드라마").click();
await until("칩 필터", () => works.querySelectorAll("article").length === 1);
expect("칩 선택 시 해당 장르만", titles(), ["Web Drama Cold Site"]);
works.querySelector('[aria-label="폴더 필터"] button').click();
await until("칩 해제", () => works.querySelectorAll("article").length === 3);
const search = works.querySelector('input[type="search"]');
// React 는 input 의 value setter 를 추적하므로 네이티브 setter 로 넣어야 onChange 가 불린다.
const typeSearch = (value) => {
  Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set.call(search, value);
  search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
};
typeSearch("tv hometown");
await until("검색 필터", () => works.querySelectorAll("article").length === 1);
expect("검색 결과", titles(), ["TV Hometown"]);
typeSearch("");
await until("검색 해제", () => works.querySelectorAll("article").length === 3);

// 같은 group 의 변형은 카드 한 장으로 묶이고, 배지로만 개수를 알린다.
tabOf("ad").click();
await until("광고 탭 병합 카드", () => titles().length === 2);
expect("변형 2편은 카드 1장", titles(), ["CMS 신규 작품", "New Commercial"]);
expect("병합 배지 표시", cardOf("New Commercial").querySelector("[data-badge]")?.getAttribute("data-badge"), "2개 버전");
expect("카드에는 언어·버전 배지를 붙이지 않음", text(cardOf("New Commercial")).includes("KO 자막"), false);
tabOf("creative").click();
await until("작품중심 복귀", () => titles().length === 3);

// 이름이 겹치는 변형(본편 + 애니메이션판)은 group 이 달라도 카드 한 장으로 합친다.
const beforeMerge = structuredClone(drive);
drive = { ...drive, videos: [...drive.videos,
  { id: "toyfarmvideo01", name: "WebDrama_ToyFarm_Trailer.mp4", category: "webdrama", categoryLabel: "웹드라마", section: "", group: "webdrama:webdrama_toyfarm", title: "Web Drama Toy Farm", variant: "트레일러" },
  { id: "toyfarmvideo02", name: "WebDrama_ToyFarm_Animation.mp4", category: "webdrama", categoryLabel: "웹드라마", section: "", group: "webdrama:webdrama_toyfarm_animation", title: "Web Drama Toy Farm Animation" },
] };
dom.window.dispatchEvent(new dom.window.Event("focus"));
await until("이름 겹침 병합", () => works.querySelectorAll("article").length === 4);
expect("이름이 겹치는 변형은 한 장", titles().filter((title) => title.startsWith("Web Drama Toy Farm")), ["Web Drama Toy Farm"]);
expect("병합된 변형 수 배지", [...works.querySelectorAll("article")].find((article) => text(article.querySelector("h3")).startsWith("Web Drama Toy Farm"))?.querySelector("[data-badge]")?.getAttribute("data-badge"), "2개 버전");
drive = beforeMerge;
dom.window.dispatchEvent(new dom.window.Event("focus"));
await until("원래 목록 복귀", () => works.querySelectorAll("article").length === 3);
const updatedDrive = structuredClone(drive);
cardOf("TV Hometown").querySelector('button[aria-label]').click();
await until("갱신 전 개별 플레이어", () => Boolean(document.querySelector('[role="dialog"] iframe')));
drive = { ...drive, status: "unavailable" };
dom.window.dispatchEvent(new dom.window.Event("focus"));
await until("장애 시 개별 플레이어 닫힘", () => !document.querySelector('[role="dialog"]'));
expect("장애 시 Drive 카드만 비움", titles(), ["CMS 드라마 작품"]);
expect("장애 안내", text(works).includes("드라이브 영상 목록을 불러올 수 없습니다."), true);
expect("장애 시에도 폴더 공개 안 함", Boolean(works.querySelector('iframe, a[href*="/drive/folders/"]')), false);
drive = { ...drive, status: "unconfigured", videos: updatedDrive.videos };
dom.window.dispatchEvent(new dom.window.Event("focus"));
await until("미설정 응답", () => lastDriveStatus === "unconfigured");
expect("API 미설정 시 영상 및 폴더 미노출", Boolean(works.querySelector('iframe, a[href*="/drive/folders/"]')), false);
drive = updatedDrive;
dom.window.dispatchEvent(new dom.window.Event("focus"));
await until("Drive 복구", () => works.querySelectorAll("article").length === 3);
expect("복구해도 이전 플레이어는 다시 열리지 않음", document.querySelector('[role="dialog"]'), null);
expect("복구 후 작품중심", titles().sort(), ["CMS 드라마 작품", "TV Hometown", "Web Drama Cold Site"].sort());
tabOf("ad").click();
await until("광고 탭 복구", () => titles().length === 2);
tabOf("other").click();
await until("기타 탭 복구", () => titles().length === 1);
tabOf("creative").click();
await until("작품중심 복귀", () => titles().length === 3);

console.log("\n[landing CMS] 전부 비공개 후 다시 공개");
const populated = structuredClone(content);
const populatedDrive = structuredClone(drive);
content.services = [];
content.portfolio = [];
content.team = [];
content.faqs = [];
drive = { ...drive, videos: [] };
dom.window.dispatchEvent(new dom.window.Event("focus"));
await until("빈 콘텐츠 갱신", () => document.querySelectorAll("#works article").length === 0, 3000);
expect("상품 0개면 섹션 숨김", document.querySelector("#pricing"), null);
expect("작품이 없어도 Drive 연결 영역 유지", Boolean(document.querySelector("#works")), true);
expect("빈 Drive 폴더에서 이전 영상 복원 안 함", document.querySelectorAll("#works article").length, 0);
expect("팀 0명이면 섹션 숨김", document.querySelector("#team"), null);
expect("FAQ 0개면 섹션 숨김", document.querySelector("#faq"), null);
expect("나머지 섹션은 유지", Boolean(document.querySelector("#top") && document.querySelector("#contact")), true);

content = populated;
drive = populatedDrive;
dom.window.dispatchEvent(new dom.window.Event("focus"));
await until("콘텐츠 재공개", () => document.querySelectorAll("#works article").length === 3, 3000);
expect("상품 다시 공개", document.querySelectorAll("#pricing article").length, 2);
expect("작품 다시 공개(작품중심 탭)", document.querySelectorAll("#works article").length, 3);
expect("팀 다시 공개", document.querySelectorAll("#team article").length, 1);
expect("FAQ 다시 공개", document.querySelectorAll("#faq button[aria-expanded]").length, 2);

// ── 검은 썸네일 대체 카드 ───────────────────────────────────────────────
// Drive 썸네일 API 는 영상의 특정 시점을 고를 수 없어, 첫 장면이 검은 영상은 카드가
// 새까맣게 나온다. 판정이 되면 브랜드 톤 카드로 대신 그리고, 판정이 안 되면 원본을 쓴다.
console.log("\n[landing Drive] 첫 장면이 검은 영상은 검은 사각형 대신 브랜드 카드");
{
  const blankDrive = {
    status: "ready",
    updatedAt: "2026-10-28T00:00:00.000Z",
    videos: [
      { id: "blankvideo1234", name: "Black_Opening_Commercial.mp4", category: "commercial", categoryLabel: "광고", section: "KOSHA", group: "commercial:black_opening", title: "Black Opening" },
    ],
  };
  const blankDom = new JSDOM('<!doctype html><html lang="ko" data-cms-native="1"><head></head><body><div id="root"></div></body></html>', {
    url: "https://hanahchafilmaker.github.io/Landing_Cuberry/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      Object.defineProperty(window.navigator, "language", { value: "ko-KR", configurable: true });
      Object.defineProperty(window.navigator, "languages", { value: ["ko-KR", "ko"], configurable: true });
      window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      window.scrollTo = () => {};
      window.fetch = async (url) => ({ ok: true, json: async () => structuredClone(String(url).endsWith("/api/public/drive-portfolio") ? blankDrive : { ok: true }) });
      // 이미지는 즉시 로드된 것으로, 캔버스 픽셀은 전부 검정으로 흉내 낸다.
      window.Image = class {
        set src(value) { this._src = value; setTimeout(() => this.onload?.(), 0); }
        get src() { return this._src; }
      };
      window.HTMLCanvasElement.prototype.getContext = function () {
        return {
          drawImage() {},
          // 실제 썸네일처럼 불투명한 검정 픽셀
          getImageData: () => ({ data: new Uint8ClampedArray(48 * 48 * 4).fill(0).map((_, i) => (i % 4 === 3 ? 255 : 0)) }),
        };
      };
    },
  });
  blankDom.window.eval(bundle);
  const blankDoc = blankDom.window.document;
  // 기본 CMS 작품이 앞을 차지하므로 광고 탭으로 좁혀 드라이브 카드만 본다.
  const startedAt = Date.now();
  while (!blankDoc.querySelector("#works article")) {
    if (Date.now() - startedAt > 5000) break;
    await sleep(25);
  }
  blankDoc.querySelector('#works [data-portfolio-tab="ad"]')?.click();
  {
    // 판정은 이미지 로드 뒤 비동기로 끝나므로 결과가 반영될 때까지 기다린다.
    const waitStart = Date.now();
    while (!blankDoc.querySelector("#works article [data-blank-thumb]")) {
      if (Date.now() - waitStart > 3000) break;
      await sleep(25);
    }
  }
  while (!blankDoc.querySelector("#works article [data-blank-thumb]")) {
    if (Date.now() - startedAt > 5000) break;
    await sleep(25);
  }
  // 광고 탭 = 기본 CMS 광고 작품 + 검은 첫 장면의 드라이브 영상
  expect("검은 썸네일 카드가 그려짐", blankDoc.querySelectorAll("#works article").length, 4);
  const blankCard = [...blankDoc.querySelectorAll("#works article")].find((node) => text(node.querySelector("h3")) === "Black Opening");
  expect("검은 썸네일 대체 카드", Boolean(blankCard?.querySelector("[data-blank-thumb]")), true);
  expect("검은 썸네일에는 사진을 그리지 않음", Boolean(blankCard?.querySelector("img")), false);
  blankDom.window.close();
}

console.log("\n[landing Drive] 어드민 작품과 드라이브 영상이 겹치면 카드 한 장");
{
  const dupeContent = {
    settings: {},
    services: [],
    team: [],
    faqs: [],
    portfolio: [
      {
        id: 501, title: "〈전설의 고향-구미호〉 KBS1 방영 · REBOOT", category: "AI ANIMATION SERIES", year: "2026",
        description: "KBS1 에서 방영된 작품입니다.", thumbnailUrl: "https://example.com/gumiho.jpg", tags: "KBS1 방영, 국내 최초 AI 활용", source: "works",
      },
      {
        id: 502, title: "유네코 기업 홍보 영상", category: "CORPORATE VIDEO", year: "2026",
        description: "기업 홍보 영상입니다.", thumbnailUrl: "https://example.com/uneco.jpg", tags: "AI", source: "works",
      },
    ],
  };
  const dupeDrive = {
    status: "ready",
    updatedAt: "2026-10-29T00:00:00.000Z",
    videos: [
      { id: "gumiho1234567", name: "TV_HometownOfLegends_NineTailedFox.mp4", category: "tv", categoryLabel: "TV", title: "TV Hometown Of Legends Nine Tailed Fox" },
    ],
  };
  const dupeDom = new JSDOM('<!doctype html><html lang="ko" data-cms-native="1"><head></head><body><div id="root"></div></body></html>', {
    url: "https://hanahchafilmaker.github.io/Landing_Cuberry/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      Object.defineProperty(window.navigator, "language", { value: "ko-KR", configurable: true });
      Object.defineProperty(window.navigator, "languages", { value: ["ko-KR", "ko"], configurable: true });
      window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      window.scrollTo = () => {};
      // 콘텐츠는 브리지가 미리 읽어 두는 값(window.CuberryContent)을 그대로 쓴다.
      window.CuberryContent = structuredClone(dupeContent);
      window.fetch = async (url) => ({
        ok: true,
        json: async () => structuredClone(String(url).endsWith("/api/public/drive-portfolio") ? dupeDrive : dupeContent),
      });
    },
  });
  dupeDom.window.eval(bundle);
  const dupeWorks = () => dupeDom.window.document.querySelector("#works");
  const startedAt = Date.now();
  while (!dupeWorks()?.querySelector("article")) {
    if (Date.now() - startedAt > 5000) break;
    await sleep(25);
  }
  const dupeTitles = () => [...dupeWorks().querySelectorAll("article h3")].map(text);
  // 어드민 카드가 먼저 그려지고 드라이브 목록이 도착하면 그때 한 장으로 합쳐진다.
  const mergeStart = Date.now();
  while (!dupeWorks().querySelector('article img[src*="/api/public/drive-thumbnail"]')) {
    if (Date.now() - mergeStart > 5000) throw new Error("중복 병합 시간 초과");
    await sleep(25);
  }
  expect("중복 작품은 카드 한 장", dupeTitles(), ["〈전설의 고향-구미호〉 KBS1 방영 · REBOOT"]);
  const merged = dupeWorks().querySelector("article");
  expect("어드민 소개가 드라이브 카드로 이동", text(merged).includes("KBS1 에서 방영된 작품입니다."), true);
  expect("어드민 태그도 그대로", text(merged).includes("KBS1 방영"), true);
  expect("드라이브 카드라서 재생 가능", Boolean(merged.querySelector("button[aria-label]")), true);
  dupeWorks().querySelector('[data-portfolio-tab="other"]').click();
  await sleep(120);
  expect("겹치지 않는 작품은 다른 탭에 그대로", dupeTitles(), ["유네코 기업 홍보 영상"]);
  dupeDom.window.close();
}

console.log("\n[landing Drive] 대표님이 준 썸네일이 Drive 썸네일보다 우선");
{
  const curatedContent = { settings: {}, services: [], team: [], faqs: [], portfolio: [] };
  const curatedDrive = {
    status: "ready",
    updatedAt: "2026-10-29T00:00:00.000Z",
    videos: [
      // 첫 장면이 검은 영상 — 판정되면 브랜드 카드로 덮이지만, 준 사진이 있으면 그 사진을 쓴다.
      { id: "division01234", name: "WebDrama_DIVISION_0.mp4", category: "webdrama", categoryLabel: "웹드라마", title: "Web Drama DIVISION 0" },
      { id: "mokgumeong123", name: "WebDrama_PovertyKnowsNoLaw.mp4", category: "webdrama", categoryLabel: "웹드라마", title: "Web Drama Poverty Knows No Law" },
      { id: "coldsite12345", name: "WebDrama_ColdSite.mp4", category: "webdrama", categoryLabel: "웹드라마", title: "Web Drama Cold Site" },
    ],
  };
  const curatedDom = new JSDOM('<!doctype html><html lang="ko" data-cms-native="1"><head></head><body><div id="root"></div></body></html>', {
    url: "https://hanahchafilmaker.github.io/Landing_Cuberry/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      Object.defineProperty(window.navigator, "language", { value: "ko-KR", configurable: true });
      Object.defineProperty(window.navigator, "languages", { value: ["ko-KR", "ko"], configurable: true });
      window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      window.scrollTo = () => {};
      window.CuberryContent = structuredClone(curatedContent);
      window.fetch = async (url) => ({
        ok: true,
        json: async () => structuredClone(String(url).endsWith("/api/public/drive-portfolio") ? curatedDrive : curatedContent),
      });
      // 썸네일 판정 흉내 — 모든 Drive 썸네일이 "검다"고 답한다.
      window.Image = class {
        set src(value) { this._src = value; setTimeout(() => this.onload?.(), 0); }
        get src() { return this._src; }
      };
      window.HTMLCanvasElement.prototype.getContext = function () {
        return {
          drawImage() {},
          getImageData: () => ({ data: new Uint8ClampedArray(48 * 48 * 4).fill(0).map((_, i) => (i % 4 === 3 ? 255 : 0)) }),
        };
      };
    },
  });
  curatedDom.window.eval(bundle);
  const cardFinder = () => [...curatedDom.window.document.querySelectorAll("#works article")];
  const startedAt = Date.now();
  while (cardFinder().length < 3) {
    if (Date.now() - startedAt > 5000) throw new Error("카드 렌더 시간 초과");
    await sleep(25);
  }
  await sleep(300); // 검은 썸네일 판정이 끝난 뒤에도 사진이 유지되는지 본다
  const find = (title) => cardFinder().find((node) => text(node.querySelector("h3")) === title);
  expect("디비전0 — 준 사진 사용", find("Web Drama DIVISION 0")?.querySelector("img")?.getAttribute("src"), "images/curated/work-division-zero.jpg");
  expect("목구멍 — 준 사진 사용", find("Web Drama Poverty Knows No Law")?.querySelector("img")?.getAttribute("src"), "images/curated/work-mokgumeong.jpg");
  expect("준 사진 카드는 검은 카드로 덮지 않음", Boolean(find("Web Drama DIVISION 0")?.querySelector("[data-blank-thumb]")), false);
  // 사진이 없는 작품은 기존 규칙대로(중계 썸네일 → 검은 카드면 브랜드 카드)
  const coldSite = find("Web Drama Cold Site");
  expect("다른 작품은 준 사진을 쓰지 않음", (coldSite?.querySelector("img")?.getAttribute("src") || "").includes("/images/curated/"), false);
  expect("다른 작품은 검은 썸네일이면 브랜드 카드", Boolean(coldSite?.querySelector("[data-blank-thumb]")), true);
  curatedDom.window.close();
}

console.log("\n[landing Drive] 광고 탭에서 KOSHA 칩을 고르면 KOSHA 작품만 (2026-10-29 지적)");
{
  const adContent = {
    settings: {}, services: [], team: [], faqs: [],
    portfolio: [
      { id: 601, title: "비치오네 AI 브랜드 필름", category: "BRAND FILM", year: "2026", description: "브랜드 필름", thumbnailUrl: "https://example.com/a.jpg", tags: "PLANNING, AI GENERATION", source: "works" },
      { id: 602, title: "셀렉스 릴렉스 샷 윤가이편", category: "ADVERTISING", year: "2024", description: "광고", thumbnailUrl: "https://example.com/b.jpg", tags: "PLANNING", source: "works" },
      { id: 603, title: "미국 광고 RERE", category: "ADVERTISING · ATTACHED REEL", year: "2026", description: "광고", thumbnailUrl: "https://example.com/c.jpg", tags: "4K", source: "works" },
    ],
  };
  const adDrive = {
    status: "ready",
    updatedAt: "2026-10-29T00:00:00.000Z",
    videos: [
      { id: "kosha0000001", name: "Kosha_daVinci_MonaLisa_v5.mp4", category: "commercial", categoryLabel: "광고", section: "KOSHA", title: "Kosha da Vinci Mona Lisa" },
      { id: "kosha0000002", name: "Kosha_VanGogh_v3.mp4", category: "commercial", categoryLabel: "광고", section: "KOSHA", title: "Kosha Van Gogh" },
      { id: "scanpang0001", name: "ScanPang_Commercial_v7_KO.mp4", category: "commercial", categoryLabel: "광고", section: "스캔팡", title: "Scan Pang Commercial" },
    ],
  };
  const adDom = new JSDOM('<!doctype html><html lang="ko" data-cms-native="1"><head></head><body><div id="root"></div></body></html>', {
    url: "https://hanahchafilmaker.github.io/Landing_Cuberry/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      Object.defineProperty(window.navigator, "language", { value: "ko-KR", configurable: true });
      Object.defineProperty(window.navigator, "languages", { value: ["ko-KR", "ko"], configurable: true });
      window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      window.scrollTo = () => {};
      window.CuberryContent = structuredClone(adContent);
      window.fetch = async (url) => ({
        ok: true,
        json: async () => structuredClone(String(url).endsWith("/api/public/drive-portfolio") ? adDrive : adContent),
      });
    },
  });
  adDom.window.eval(bundle);
  const adWorks = () => adDom.window.document.querySelector("#works");
  const adTitles = () => [...(adWorks()?.querySelectorAll("article h3") ?? [])].map(text);
  const startedAt = Date.now();
  while (!adWorks()) {
    if (Date.now() - startedAt > 5000) throw new Error("포트폴리오 렌더 시간 초과");
    await sleep(25);
  }
  adWorks().querySelector('[data-portfolio-tab="ad"]').click();
  const tabStart = Date.now();
  while (adTitles().length < 6) {
    if (Date.now() - tabStart > 5000) throw new Error("광고 탭 렌더 시간 초과");
    await sleep(25);
  }
  expect("광고 전체 = 어드민 작품 + 드라이브", adTitles().sort(), ["Kosha da Vinci Mona Lisa", "Kosha Van Gogh", "Scan Pang Commercial", "미국 광고 RERE", "비치오네 AI 브랜드 필름", "셀렉스 릴렉스 샷 윤가이편"].sort());
  adWorks().querySelector('[data-chip="KOSHA"]').click();
  await until("KOSHA 칩", () => adTitles().length === 2);
  expect("KOSHA 칩에는 KOSHA 작품만", adTitles().sort(), ["Kosha da Vinci Mona Lisa", "Kosha Van Gogh"].sort());
  expect("브랜드 필름이 섞이지 않음", adTitles().includes("비치오네 AI 브랜드 필름"), false);
  expect("미국 광고 RERE 도 섞이지 않음", adTitles().includes("미국 광고 RERE"), false);
  adWorks().querySelector('[data-chip]:not([data-chip="KOSHA"])')?.click();
  await sleep(120);
  expect("전체 칩으로 돌아오면 다시 모두", adTitles().length >= 6, true);
  adDom.window.close();
}

console.log(`\n결과: ${checks - failures}/${checks} 통과`);
dom.window.close();
if (failures) process.exitCode = 1;
