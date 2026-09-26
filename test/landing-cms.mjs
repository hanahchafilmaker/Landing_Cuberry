// React 단일 HTML 산출물에 data-cms-* 훅이 없어도 cms-bridge.js가
// 관리자 API의 최신 콘텐츠를 실제 화면에 반영하는지 확인한다.
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
if (bundleStart < moduleTag.length || bundleEnd < 0) throw new Error("index.html의 인라인 React 번들을 찾지 못했습니다.");
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
      videoUrl: "", thumbnailUrl: "https://example.com/extra.jpg", tags: "AI", kind: "브랜드", source: "extra", landingSlot: null,
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

const requested = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => {
  // 외부 이미지/폰트 로드는 이 DOM 동작 테스트의 대상이 아니다.
  if (!/Could not load|Not implemented: navigation/.test(error.message)) console.error(error);
});
const dom = new JSDOM("<!doctype html><html><head></head><body><div id=\"root\"></div></body></html>", {
  url: "https://hanahchafilmaker.github.io/Landing_Cuberry/",
  runScripts: "dangerously",
  pretendToBeVisual: true,
  virtualConsole,
  beforeParse(window) {
    window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    window.scrollTo = () => {};
    window.open = () => null;
    window.fetch = async (url) => {
      requested.push(String(url));
      return { ok: true, json: async () => structuredClone(content) };
    };
  },
});

console.log("\n[landing CMS] React가 늦게 마운트돼도 관리자 저장값 반영");
// 실제 index.html과 같은 순서: defer 브리지가 API를 먼저 읽을 수 있고, module 번들은 뒤에 마운트된다.
dom.window.eval(bridge);
await sleep(0);
dom.window.eval(bundle);

const started = Date.now();
while (!dom.window.document.querySelector('[data-cms-modern="faqs"]')) {
  if (Date.now() - started > 5000) throw new Error("CMS 랜딩 어댑터 렌더 시간 초과");
  await sleep(25);
}
await sleep(50);

const document = dom.window.document;
expect("운영 API에서 공개 콘텐츠 요청", requested[0], "https://landing-cuberry-admin.onrender.com/api/public/content");
expect("히어로 제목", document.querySelector("#top h1")?.textContent, "ADMIN SAVED TITLE");
expect("히어로 설명", document.querySelector("#top > div:first-child > p:nth-of-type(2)")?.textContent.replace(/\s+/g, " ").trim(), content.settings.heroSubtitle);
expect("React 원본 히어로 숨김", document.querySelector('[data-cms-original="hero"]')?.hidden, true);

const packages = document.querySelector('[data-cms-modern="packages"]');
expect("상품 카드 개수", packages?.querySelectorAll('[data-cms-id^="service-"]').length, 2);
expect("상품명 저장값", [...packages.querySelectorAll("b")].map((node) => node.textContent), ["관리형 숏폼", "브랜드 필름"]);
expect("상품 가격·시간 저장값", [...packages.querySelectorAll('[data-cms-id^="service-"] > span')].map((node) => node.textContent), ["39만원~ · 20초", "89만원~ · 60초"]);

expect("드라이브 작품 개수", document.querySelectorAll('#drive-portfolio [data-cms-id^="portfolio-"]').length, 1);
expect("드라이브 작품명", document.querySelector("#drive-portfolio h3")?.textContent, "CMS 드라이브 작품");
expect("일반·신규 작품 모두 표시", [...document.querySelectorAll('#works [data-cms-id^="portfolio-"] h3')].map((node) => node.textContent), ["CMS 기업 작품", "CMS 신규 작품"]);
expect("관리자 종류로 필터 생성", [...document.querySelectorAll('#works [data-cms-modern] button, #works button')].some((node) => node.textContent === "브랜드"), true);

expect("팀 인원 개수", document.querySelectorAll('#team [data-cms-id^="team-"]').length, 1);
expect("팀 이름", document.querySelector("#team h3")?.textContent, "저장된 감독");
expect("팀 사진 위치", document.querySelector("#team img")?.style.objectPosition, "center 27%");
expect("팀 이력 링크", document.querySelector('#team a[href="https://example.com/profile"]')?.textContent, "포트폴리오");

expect("FAQ 개수", document.querySelectorAll('#faq [data-cms-id^="faq-"]').length, 2);
expect("FAQ 질문", document.querySelector('#faq [data-cms-id="faq-401"] button span')?.textContent, "저장된 질문 1");
const firstAnswer = document.querySelector('#faq [data-cms-id="faq-401"] p');
expect("FAQ 답변 처음에는 닫힘", firstAnswer?.hidden, true);
document.querySelector('#faq [data-cms-id="faq-401"] button')?.click();
expect("FAQ 클릭 시 저장된 답변 열림", { hidden: firstAnswer?.hidden, text: firstAnswer?.textContent }, { hidden: false, text: "저장된 답변 1" });

expect("이메일 반영", document.querySelector('#contact a[href="mailto:saved@example.com"]')?.textContent, "saved@example.com ↗");
expect("전화 반영", document.querySelector('#contact a[href="tel:0212345678"]')?.textContent, "02-1234-5678 ↗");

console.log("\n[landing CMS] 어드민 탭에서 저장 후 랜딩 탭 복귀 시 자동 갱신");
content = structuredClone(content);
content.settings.heroTitle = "FOCUS REFRESHED TITLE";
content.faqs[0].question = "포커스로 갱신된 질문";
dom.window.dispatchEvent(new dom.window.Event("focus"));
const refreshStarted = Date.now();
while (document.querySelector("#top h1")?.textContent !== content.settings.heroTitle) {
  if (Date.now() - refreshStarted > 3000) throw new Error("focus 콘텐츠 갱신 시간 초과");
  await sleep(25);
}
expect("focus 때 API 재요청", requested.length >= 2, true);
expect("히어로 최신값", document.querySelector("#top h1")?.textContent, "FOCUS REFRESHED TITLE");
expect("FAQ 최신값", document.querySelector('#faq [data-cms-id="faq-401"] button span')?.textContent, "포커스로 갱신된 질문");

console.log("\n[landing CMS] 전부 비공개 후 다시 공개해도 카드 템플릿 복구");
const populated = structuredClone(content);
content.services = [];
content.portfolio = [];
content.team = [];
content.faqs = [];
let requestsBefore = requested.length;
const emptyStarted = Date.now();
dom.window.dispatchEvent(new dom.window.Event("focus"));
while (requested.length === requestsBefore || !document.querySelector('[data-cms-modern="works"]')?.hidden) {
  if (Date.now() - emptyStarted > 3000) throw new Error("빈 콘텐츠 갱신 시간 초과");
  await sleep(25);
}
expect("상품 0개면 섹션 숨김", document.querySelector('[data-cms-modern="packages"]')?.hidden, true);
expect("드라이브 0개면 섹션 숨김", document.querySelector('[data-cms-modern="drive"]')?.hidden, true);
expect("작품 0개면 섹션 숨김", document.querySelector('[data-cms-modern="works"]')?.hidden, true);
expect("팀 0명이면 섹션 숨김", document.querySelector('[data-cms-modern="team"]')?.hidden, true);
expect("FAQ 0개면 섹션 숨김", document.querySelector('[data-cms-modern="faqs"]')?.hidden, true);

content = populated;
requestsBefore = requested.length;
const republishStarted = Date.now();
dom.window.dispatchEvent(new dom.window.Event("focus"));
while (requested.length === requestsBefore || document.querySelectorAll('#works [data-cms-id^="portfolio-"]').length !== 2) {
  if (Date.now() - republishStarted > 3000) throw new Error("콘텐츠 재공개 시간 초과");
  await sleep(25);
}
expect("상품 다시 공개", document.querySelectorAll('[data-cms-modern="packages"] [data-cms-id^="service-"]').length, 2);
expect("드라이브 다시 공개", document.querySelectorAll('#drive-portfolio [data-cms-id^="portfolio-"]').length, 1);
expect("작품 다시 공개", document.querySelectorAll('#works [data-cms-id^="portfolio-"]').length, 2);
expect("팀 다시 공개", document.querySelectorAll('#team [data-cms-id^="team-"]').length, 1);
expect("FAQ 다시 공개", document.querySelectorAll('#faq [data-cms-id^="faq-"]').length, 2);

console.log(`\n결과: ${checks - failures}/${checks} 통과`);
dom.window.close();
if (failures) process.exitCode = 1;
