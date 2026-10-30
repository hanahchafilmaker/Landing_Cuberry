// 검색엔진 노출 점검 — "검색엔진이 화면과 같은 내용을, 같은 주소로 읽는가"를 본다.
//
// 랜딩은 React 단일 파일(index.html)로 배포되고, 색인에 영향을 주는 값은 네 곳에 흩어져 있다.
//   ① landing/index.html (사람이 고치는 원본)   ② 빌드 산출물 index.html (실제로 서빙되는 파일)
//   ③ 구조화 데이터(JSON-LD, 빌드 때 content.ts 로 생성)   ④ sitemap.xml · robots.txt
// 한 곳만 고치고 다른 곳을 두면 "화면에는 118만원인데 검색 결과에는 29만원" 같은 일이 생긴다.
// 그래서 ③④가 ①②와 **같은 값을 쓰는지**까지 여기서 확인한다.
//
// 실행: npm run test:seo  (npm test 에 포함)
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { faqs, services } from "../landing/src/data/content.ts";
import { priceToKrw } from "../landing/src/seo/structured-data.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(path.join(ROOT, relative), "utf8");
const exists = (relative) => existsSync(path.join(ROOT, relative));

const OFFICIAL = "https://www.cuberry.kr";
const MIRROR = "hanahchafilmaker.github.io/Landing_Cuberry";

let failures = 0;
let checks = 0;
const show = (value) =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : JSON.stringify(value);
function expect(label, actual, wanted) {
  checks += 1;
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    failures += 1;
    console.error(`  ✗ ${label}\n      기대: ${show(wanted)}\n      실제: ${show(actual)}`);
  } else {
    console.log(`  ✓ ${label}`);
  }
}
const occurrences = (source, needle) => source.split(needle).length - 1;

const source = read("landing/index.html");
const built = read("index.html");
const robots = read("robots.txt");
const sitemap = read("sitemap.xml");

// ── ① 색인 정책 메타 ──────────────────────────────────────────
console.log("\n[1] 색인 정책 · 공유 카드 메타");
for (const [label, html] of [
  ["landing/index.html(원본)", source],
  ["index.html(빌드 산출물)", built],
]) {
  expect(
    `${label}: robots = index,follow`,
    /<meta\s+name="robots"\s+content="index, follow[^"]*"/.test(html),
    true,
  );
  expect(`${label}: 큰 이미지 미리보기 허용(max-image-preview:large)`, html.includes("max-image-preview:large"), true);
  expect(`${label}: 긴 스니펫 허용(max-snippet:-1)`, html.includes("max-snippet:-1"), true);
  expect(`${label}: og:image:type`, /<meta property="og:image:type" content="image\/jpeg" \/>/.test(html), true);
  expect(`${label}: twitter:image:alt`, /<meta name="twitter:image:alt" content="[^"]+" \/>/.test(html), true);
  expect(`${label}: <html lang="ko">`, /<html lang="ko"/.test(html), true);
}
expect("og:image 파일이 실제로 있음", exists("images/og-cover.jpg"), true);
expect("apple-touch-icon(180×180) 링크", /<link rel="apple-touch-icon" sizes="180x180" href="images\/logo-180\.png" \/>/.test(built), true);
expect("apple-touch-icon 파일 존재", exists("images/logo-180.png"), true);

// ── ② 구조화 데이터(JSON-LD) ──────────────────────────────────
console.log("\n[2] 구조화 데이터(JSON-LD)");
const blocks = [...built.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(
  (match) => match[1],
);
expect("빌드 산출물의 JSON-LD 블록 수(회사 + 그래프)", blocks.length, 2);

let org = null;
let graph = [];
try {
  org = JSON.parse(blocks[0]);
  graph = JSON.parse(blocks[1])["@graph"] || [];
} catch (error) {
  failures += 1;
  console.error(`  ✗ JSON-LD 파싱 실패: ${error.message}`);
}

expect("회사(Organization) @id", org?.["@id"], `${OFFICIAL}/#organization`);
expect("회사 주소(PostalAddress) 있음", org?.address?.["@type"], "PostalAddress");
expect("회사 주소 국가 = KR", org?.address?.addressCountry, "KR");
expect("회사 사업자번호(vatID)", org?.vatID, "480-88-03079");
// 구글 로고는 정사각형 래스터(112×112 이상)를 요구한다 — 가로로 긴 워드마크 대신 마크 PNG 를 쓴다.
expect("회사 로고 = 정사각 PNG", org?.logo, `${OFFICIAL}/images/logo-512.png`);
expect("회사 로고 파일 존재", exists(org.logo.replace(`${OFFICIAL}/`, "")), true);
expect("회사 연락처(ContactPoint) 있음", org?.contactPoint?.[0]?.["@type"], "ContactPoint");

const typeOf = (name) => graph.find((node) => node["@type"] === name);
const site = typeOf("WebSite");
const catalog = typeOf("OfferCatalog");
const faqPage = typeOf("FAQPage");

expect("그래프: WebSite · ItemList · OfferCatalog · FAQPage", graph.map((node) => node["@type"]), [
  "WebSite",
  "ItemList",
  "OfferCatalog",
  "FAQPage",
]);
expect("WebSite 의 publisher 가 회사를 가리킴", site?.publisher?.["@id"], `${OFFICIAL}/#organization`);
expect("WebSite 주소 = 정본", site?.url, `${OFFICIAL}/`);
expect("WebSite 언어(ko-KR · en)", site?.inLanguage, ["ko-KR", "en"]);
expect("사업장 2곳", typeOf("ItemList")?.numberOfItems, 2);

// 상품 가격은 content.ts 의 표시 문구에서 숫자로 변환된다 — 화면 가격과 어긋나면 실패.
const offers = catalog?.itemListElement || [];
expect("상품 수 = content.ts services 수", offers.length, services.length);
offers.forEach((offer, index) => {
  const service = services[index];
  expect(`상품 ${index + 1} 이름`, offer.name, service.name);
  expect(`상품 ${index + 1} 가격(${service.price})`, offer.price, priceToKrw(service.price));
  expect(`상품 ${index + 1} 통화`, offer.priceCurrency, "KRW");
  expect(`상품 ${index + 1} provider = 회사`, offer.itemOffered?.provider?.["@id"], `${OFFICIAL}/#organization`);
});
expect("가격 변환: 118만원~ → 1,180,000", priceToKrw("118만원~"), 1180000);
expect("가격 변환: 1,180,000원 → 1,180,000", priceToKrw("1,180,000원"), 1180000);
expect("가격 변환: 숫자 없음 → null", priceToKrw("별도 협의"), null);

// FAQ 는 화면에 실제로 보이는 문구와 1:1 이어야 한다(구조화 데이터 스팸 방지).
const questions = faqPage?.mainEntity || [];
expect("FAQ 문항 수 = content.ts faqs 수", questions.length, faqs.length);
expect("첫 FAQ 질문 일치", questions[0]?.name, faqs[0].q);
expect("첫 FAQ 답변 일치", questions[0]?.acceptedAnswer?.text, faqs[0].a);
expect("FAQ 언어", faqPage?.inLanguage, "ko-KR");
expect("FAQ 가 WebSite 에 속함", faqPage?.isPartOf?.["@id"], `${OFFICIAL}/#website`);

// JSON-LD 는 HTML 안에 들어가므로 "</script>" 로 조기 종료되면 안 된다.
expect("JSON-LD 안에 닫는 script 태그 없음", /<\/script>/i.test(blocks[1] || ""), false);
expect("JSON-LD 에 미러 주소 없음", occurrences(built.slice(0, built.indexOf("</head>")), MIRROR), 0);

// 구조화 데이터가 가리키는 앵커는 실제 섹션이어야 한다.
const pricing = read("landing/src/components/Pricing.tsx");
const faqComponent = read("landing/src/components/Faq.tsx");
expect("OfferCatalog 의 #pricing 앵커가 실제 섹션", /id="pricing"/.test(pricing), true);
expect("FAQPage 의 #faq 앵커가 실제 섹션", /id="faq"/.test(faqComponent), true);

// ── ③ JS 없는 크롤러용 정적 셸 ────────────────────────────────
console.log("\n[3] 크롤러용 정적 셸(noscript) — 화면과 같은 값인지");
for (const [label, html] of [
  ["landing/index.html(원본)", source],
  ["index.html(빌드 산출물)", built],
]) {
  expect(`${label}: 정적 셸 있음`, html.includes('class="crawler-shell"'), true);
  expect(`${label}: 특허 4건(화면과 일치)`, html.includes("<strong>4건</strong>"), true);
  expect(`${label}: 현재 상품 가격(118만원)`, html.includes(services[0].price.replace("~", "~")), true);
  expect(`${label}: 옛 가격(29만원) 남아 있지 않음`, html.includes("29만원"), false);
  expect(`${label}: 옛 상품 구성(120초) 남아 있지 않음`, html.includes("120초"), false);
  expect(`${label}: FAQ 문구 포함`, html.includes(faqs[0].q), true);
  expect(`${label}: 연락 이메일`, html.includes("ceo@cubeberry.ai"), true);
}

// ── ④ sitemap.xml ────────────────────────────────────────────
console.log("\n[4] sitemap.xml — 주소 · 이미지 확장");
expect("이미지 확장 네임스페이스 선언", sitemap.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'), true);
expect("국문·영문 2개 주소", occurrences(sitemap, "<loc>"), 2);
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
expect("모든 loc 가 정본 도메인", locs.every((loc) => loc.startsWith(`${OFFICIAL}/`)), true);
expect("미러 주소 없음", occurrences(sitemap, MIRROR), 0);
const lastmods = sitemap.match(/<lastmod>[^<]+<\/lastmod>/g) || [];
expect("lastmod 2개", lastmods.length, 2);
expect(
  "lastmod 형식(yyyy-mm-dd)",
  lastmods.every((tag) => /^<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>$/.test(tag)),
  true,
);
const imageLocs = [...sitemap.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((match) => match[1]);
expect("이미지 항목 있음", imageLocs.length >= 3, true);
expect("이미지 주소는 정본 도메인", imageLocs.every((loc) => loc.startsWith(`${OFFICIAL}/`)), true);
for (const loc of new Set(imageLocs)) {
  expect(`이미지 파일 존재: ${loc.replace(OFFICIAL + "/", "")}`, exists(loc.replace(`${OFFICIAL}/`, "")), true);
}
expect("이미지 sitemap 은 noindex 별칭(/en/·/kr/)을 담지 않음", /<loc>[^<]*\/(en|kr)\/<\/loc>/.test(sitemap), false);

// ── ⑤ robots.txt ────────────────────────────────────────────
console.log("\n[5] robots.txt — 본문은 열고 소스·어드민은 닫기");
expect("전체 허용(Allow: /)", /^Allow: \/$/m.test(robots), true);
for (const blocked of ["/admin", "/admin-v2", "/api/", "/uploads/", "/portfolio_thumbs/", "/team_portraits/"]) {
  expect(`차단: ${blocked}`, new RegExp(`^Disallow: ${blocked.replace(/[/.]/g, "\\$&")}$`, "m").test(robots), true);
}
// 저장소가 GitHub Pages 로 그대로 배포되므로 소스·문서도 같은 도메인에서 열린다 → 색인에서 제외.
for (const blocked of ["/landing/", "/docs/", "/test/", "/scripts/", "/server/", "/README.md"]) {
  expect(`소스 경로 차단: ${blocked}`, new RegExp(`^Disallow: ${blocked.replace(/[/.]/g, "\\$&")}$`, "m").test(robots), true);
}
expect("이미지는 막지 않음(/images/ Disallow 없음)", /^Disallow: \/images/m.test(robots), false);
expect("사이트맵 주소 안내", robots.includes(`Sitemap: ${OFFICIAL}/sitemap.xml`), true);
expect("robots 에 미러 주소 없음", occurrences(robots, MIRROR), 0);

console.log(`\n결과: ${checks - failures}/${checks} 통과`);
if (failures) {
  console.error(`${failures}건 실패`);
  process.exit(1);
}
