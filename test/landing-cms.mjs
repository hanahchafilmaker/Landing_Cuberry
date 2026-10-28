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
  videos: [{ id: "drivevideo12345", name: "Drive sample_2026.mp4", resourceKey: "resourcekey123", folders: ["Never show folder"] }],
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
await until("Drive 목록 응답", () => [...works.querySelectorAll("article h3")].some((node) => text(node) === "Drive sample 2026"));
expect("포트폴리오 전체 = 일반 + 새 폴더의 영상", [...works.querySelectorAll("article h3")].map(text), ["CMS 기업 작품", "CMS 신규 작품", "Drive sample 2026"]);
expect("이전 CMS 드라이브 항목 미노출", text(works).includes("CMS 드라이브 작품"), false);
expect("Drive API도 운영 서버에서 조회", requested.some((url) => url.endsWith("/api/public/drive-portfolio")), true);
expect("작품이 6개 이하면 더 보기 버튼 생략", works.querySelector('button[aria-controls="portfolio-grid"]'), null);
expect("썸네일 저장값", works.querySelector("article img")?.getAttribute("src"), "https://example.com/work.jpg");
expect("작품 태그 분리", [...works.querySelectorAll("article")][0] && text([...works.querySelectorAll("article")][0]).includes("PLAN"), true);
expect("일반 작품은 보존하되 저장된 Drive 폴더 링크는 숨김", Boolean([...works.querySelectorAll("article")][1].querySelector("a")), false);
const tabs = [...works.querySelectorAll("button[aria-pressed]")];
expect("필터 탭", tabs.map(text), ["ALL", "DRIVE FILM", "WORKS"]);
tabs[1].click();
await until("드라이브 탭", () => works.querySelectorAll("article").length === 1);
expect("드라이브 탭 작품", text(works.querySelector("article h3")), "Drive sample 2026");
expect("드라이브 썸네일·리소스 키", works.querySelector("article img")?.getAttribute("src"), "https://drive.google.com/thumbnail?id=drivevideo12345&sz=w1000&resourcekey=resourcekey123");
expect("폴더명이 카드에 표시되지 않음", text(works).includes("Never show folder"), false);
expect("폴더 링크나 폴더 임베드 없음", Boolean(works.querySelector('a[href*="/drive/folders/"], iframe')), false);
const videoButton = works.querySelector('article button[aria-label]');
videoButton.focus();
videoButton.click();
await until("개별 Drive 플레이어", () => Boolean(document.querySelector('[role="dialog"] iframe')));
const player = document.querySelector('[role="dialog"]');
expect("개별 파일만 사이트에서 재생", player.querySelector("iframe").getAttribute("src"), "https://drive.google.com/file/d/drivevideo12345/preview?resourcekey=resourcekey123");
expect("개별 영상만 새 창에서 열 수 있음", player.querySelector("a")?.getAttribute("href"), "https://drive.google.com/file/d/drivevideo12345/view?resourcekey=resourcekey123");
player.querySelector('button[aria-label="닫기"]').click();
await until("플레이어 닫힘", () => !document.querySelector('[role="dialog"]'));
expect("닫은 뒤 카드에 포커스 복귀", document.activeElement === videoButton, true);
tabs[0].click();
await until("전체 탭", () => works.querySelectorAll("article").length === 3);

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
  { id: "newvideo123456", name: "New_commercial.mp4" },
  { id: "guidevideo12345", name: "Guide.webm" },
] };
tabs[1].click();
dom.window.dispatchEvent(new dom.window.Event("focus"));
await until("Drive 파일 갱신", () => works.querySelectorAll("article").length === 2);
expect("삭제한 파일 대신 새 영상", [...works.querySelectorAll("article h3")].map(text), ["New commercial", "Guide"]);
expect("폴더 필터 없음", works.querySelector('[aria-label="드라이브 폴더 필터"]'), null);
const updatedDrive = structuredClone(drive);
works.querySelector('article button[aria-label]').click();
await until("갱신 전 개별 플레이어", () => Boolean(document.querySelector('[role="dialog"] iframe')));
drive = { ...drive, status: "unavailable" };
dom.window.dispatchEvent(new dom.window.Event("focus"));
await until("장애 시 개별 플레이어 닫힘", () => !document.querySelector('[role="dialog"]'));
expect("장애 시 기존 영상 비움", works.querySelectorAll("article").length, 0);
expect("장애 안내", text(works).includes("드라이브 영상 목록을 불러올 수 없습니다."), true);
expect("장애 시에도 폴더 공개 안 함", Boolean(works.querySelector('iframe, a[href*="/drive/folders/"]')), false);
drive = { ...drive, status: "unconfigured", videos: updatedDrive.videos };
dom.window.dispatchEvent(new dom.window.Event("focus"));
await until("미설정 응답", () => lastDriveStatus === "unconfigured");
expect("API 미설정 시 영상 및 폴더 미노출", Boolean(works.querySelector('article, iframe, a[href*="/drive/folders/"]')), false);
drive = updatedDrive;
dom.window.dispatchEvent(new dom.window.Event("focus"));
await until("Drive 복구", () => works.querySelectorAll("article").length === 2);
expect("복구해도 이전 플레이어는 다시 열리지 않음", document.querySelector('[role="dialog"]'), null);
tabs[0].click();
await until("전체 작품 복구", () => works.querySelectorAll("article").length === 4);

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
await until("콘텐츠 재공개", () => document.querySelectorAll("#works article").length === 4, 3000);
expect("상품 다시 공개", document.querySelectorAll("#pricing article").length, 2);
expect("작품 다시 공개", document.querySelectorAll("#works article").length, 4);
expect("팀 다시 공개", document.querySelectorAll("#team article").length, 1);
expect("FAQ 다시 공개", document.querySelectorAll("#faq button[aria-expanded]").length, 2);

console.log(`\n결과: ${checks - failures}/${checks} 통과`);
dom.window.close();
if (failures) process.exitCode = 1;
