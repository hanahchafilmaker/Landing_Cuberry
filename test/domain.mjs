// 도메인 전환(www.cuberry.kr) 점검 — "공식 주소가 한 곳(www.cuberry.kr)으로만 적혀 있는지"를 본다.
//
// 커스텀 도메인은 **www.cuberry.kr**(프로토콜 없이 등록)이다. apex(cuberry.kr)는 GitHub Pages 가 아니라
// 기존 AWS 자원이 받아 www 로 301 시키므로, 화면·사이트맵·robots 의 정본 주소는 www 다.
// apex 주소는 "허용 Origin" 에만 남는다(어느 쪽으로 들어와도 로그인이 막히지 않게).
//
// 랜딩은 화면·메타태그·사이트맵·robots·서버 CORS 허용목록·배포 Blueprint 여섯 곳에 주소가 흩어져 있다.
// 도메인을 옮기면서 한 곳만 빠뜨리면 검색엔진이 미러 주소(hanahchafilmaker.github.io)를 정본으로
// 기억하거나, 공식 도메인에서 로그인이 403 으로 막힌다. 그래서 여기서 한 번에 검사한다.
//   · 미러 주소는 "허용 목록"에만 남을 수 있다(디버깅용) — 화면·사이트맵·robots 에는 남으면 실패.
//   · /en/ · /kr/ 진입 별칭 페이지는 상대경로만 써야 한다(커스텀 도메인 루트와 서브경로 배포 양쪽에서 동작).
//   · 컷오버용 DNS 레코드 파일(docs/domain/)에는 MX 가 들어가면 안 된다(메일 보존).
//
// 실행: npm run test:domain  (npm test 에 포함)
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(path.join(ROOT, relative), "utf8");

const OFFICIAL = "https://www.cuberry.kr"; // 커스텀 도메인 = 정본
const APEX = "https://cuberry.kr"; // apex — AWS 가 www 로 301. CORS 허용목록에만 남는다
const MIRROR_PATH = "hanahchafilmaker.github.io/Landing_Cuberry";

let failures = 0;
let checks = 0;
const show = (value) => (typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : JSON.stringify(value));
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

const sourceLanding = read("landing/index.html"); // 사람이 고치는 원본
const builtLanding = read("index.html"); // 빌드 산출물(= GitHub Pages/Render 가 서빙하는 파일)
const robots = read("robots.txt");
const sitemap = read("sitemap.xml");

console.log(`\n[1] 랜딩 정본 주소 — ${OFFICIAL}/`);
for (const [label, html] of [["landing/index.html(원본)", sourceLanding], ["index.html(빌드 산출물)", builtLanding]]) {
  expect(`${label} canonical`, /<link rel="canonical" href="https:\/\/www\.cuberry\.kr\/" \/>/.test(html), true);
  expect(`${label} og:url`, /<meta property="og:url" content="https:\/\/www\.cuberry\.kr\/" \/>/.test(html), true);
  expect(`${label} og:image`, /<meta property="og:image" content="https:\/\/www\.cuberry\.kr\/images\/og-cover\.jpg" \/>/.test(html), true);
  expect(`${label} twitter:image`, /<meta name="twitter:image" content="https:\/\/www\.cuberry\.kr\/images\/og-cover\.jpg" \/>/.test(html), true);
  expect(`${label} JSON-LD url`, /"url": "https:\/\/www\.cuberry\.kr\/"/.test(html), true);
  expect(`${label} 에 미러 주소 없음`, occurrences(html, MIRROR_PATH), 0);
  // 정본이 www 이므로 apex 주소가 canonical·OG 에 남아 있으면 안 된다(301 되는 주소를 정본으로 두지 않기).
  expect(`${label} 에 apex 정본 주소 없음`, occurrences(html, `${APEX}/`), 0);
}

console.log("\n[2] 빌드가 넣는 hreflang — 언어별 주소도 절대주소");
for (const tag of [
  '<link rel="alternate" hreflang="ko" href="https://www.cuberry.kr/?lang=ko" />',
  '<link rel="alternate" hreflang="en" href="https://www.cuberry.kr/?lang=en" />',
  '<link rel="alternate" hreflang="x-default" href="https://www.cuberry.kr/" />',
]) {
  expect(`빌드 산출물에 ${tag.slice(31, 64)}…`, builtLanding.includes(tag), true);
}
expect("vite.config.ts 가 절대주소로 주입", /hreflang="ko" href="https:\/\/www\.cuberry\.kr\/\?lang=ko"/.test(read("landing/vite.config.ts")), true);

console.log("\n[3] robots.txt · sitemap.xml");
expect("robots: Sitemap 공식 주소", robots.includes(`Sitemap: ${OFFICIAL}/sitemap.xml`), true);
expect("robots: 미러 주소 없음", occurrences(robots, MIRROR_PATH), 0);
expect("sitemap: loc 공식 주소", /<loc>https:\/\/www\.cuberry\.kr\/<\/loc>/.test(sitemap), true);
expect("sitemap: 미러 주소 없음", occurrences(sitemap, MIRROR_PATH), 0);
for (const [lang, href] of [["ko", `${OFFICIAL}/?lang=ko`], ["en", `${OFFICIAL}/?lang=en`], ["x-default", `${OFFICIAL}/`]]) {
  expect(`sitemap: hreflang ${lang}`, sitemap.includes(`hreflang="${lang}" href="${href}"`), true);
}

console.log("\n[4] 언어 진입 별칭 페이지 (/en/ · /kr/)");
const alias = [
  ["en/index.html", { lang: "en", target: "../?lang=en", canonical: `${OFFICIAL}/?lang=en` }],
  ["kr/index.html", { lang: "ko", target: "../?lang=ko", canonical: `${OFFICIAL}/` }],
];
for (const [file, wanted] of alias) {
  expect(`${file} 존재`, existsSync(path.join(ROOT, file)), true);
  const html = read(file);
  expect(`${file}: <html lang>`, new RegExp(`<html lang="${wanted.lang}">`).test(html), true);
  expect(`${file}: noindex(중복 색인 방지)`, /<meta name="robots" content="noindex,follow" \/>/.test(html), true);
  expect(`${file}: canonical`, html.includes(`<link rel="canonical" href="${wanted.canonical}" />`), true);
  expect(`${file}: meta refresh 목적지`, html.includes(`content="0; url=${wanted.target}"`), true);
  expect(`${file}: 스크립트도 같은 목적지`, html.includes(`location.replace("${wanted.target}"`), true);
  expect(`${file}: 루트 절대경로 참조 없음(서브경로 배포 대응)`, /(?:src|href)="\/(?!\/)/.test(html), false);
  expect(`${file}: https 절대주소 점검용 정본 포함`, html.includes(OFFICIAL), true);
}

console.log("\n[5] 서버 · 배포 설정의 허용 Origin (www + apex)");
const serverSource = read("server/index.mjs");
expect("server/index.mjs 에 /en/ · /kr/ 라우트", /\/\^\\\/\(en\|kr\)/.test(serverSource), true);
for (const [file, label] of [["server/lib/config.mjs", "서버 기본 허용목록"], ["render.yaml", "render.yaml"], ["render.free.yaml", "render.free.yaml"]]) {
  const text = read(file);
  expect(`${label}: ${OFFICIAL} 포함(정본)`, text.includes(OFFICIAL), true);
  expect(`${label}: ${APEX} 포함(apex 로 들어와도 동작)`, text.includes(APEX), true);
  expect(`${label}: 미러 주소도 유지(디버깅용)`, text.includes("https://hanahchafilmaker.github.io"), true);
}
const configText = read("server/lib/config.mjs");
expect("서버 기본 허용목록에 공식 도메인이 들어 있음", /DEFAULT_ALLOWED_ORIGINS[\s\S]*?cuberry\.kr[\s\S]*?\];/.test(configText), true);

console.log("\n[6] 컷오버 자산 (docs/domain/)");
expect("docs/domain/CNAME = 커스텀 도메인(프로토콜 없이)", read("docs/domain/CNAME").trim(), "www.cuberry.kr");
expect("CNAME 은 루트에 아직 없음(전환 전 안전)", existsSync(path.join(ROOT, "CNAME")), false);
expect("docs/domain-setup.md 존재", existsSync(path.join(ROOT, "docs", "domain-setup.md")), true);

const batch = JSON.parse(read("docs/domain/route53-cuberry-kr-change.json"));
const sets = (batch.Changes || []).map((change) => change.ResourceRecordSet).filter(Boolean);
const recordOf = (type, name) => sets.find((set) => set.Type === type && (set.Name === name || set.Name === name + "."));
const valuesOf = (set) => (set?.ResourceRecords || []).map((record) => record.Value).sort();

expect("www CNAME → GitHub Pages", valuesOf(recordOf("CNAME", "www.cuberry.kr")), ["hanahchafilmaker.github.io"]);
expect("apex A 레코드는 건드리지 않음(기존 AWS 가 apex → www 301)", sets.filter((set) => set.Type === "A"), []);
expect("apex AAAA 레코드도 건드리지 않음", sets.filter((set) => set.Type === "AAAA"), []);
expect("DNS 변경 파일에 MX 레코드 없음(메일 보존)", sets.some((set) => set.Type === "MX"), false);
expect("DNS 변경 파일에 TXT 레코드 없음(소유확인 보존)", sets.some((set) => set.Type === "TXT"), false);
// Route 53 의 Name 은 항상 마지막 점을 포함한다.
expect("DNS 변경 파일은 www 만 건드림", sets.map((set) => set.Name.replace(/\.$/, "")).sort(), ["www.cuberry.kr"]);
expect("CNAME 레코드만 www 에 있음(A 레코드 중복 방지)", sets.filter((set) => set.Name.startsWith("www")).map((set) => set.Type), ["CNAME"]);

console.log(`\n결과: ${checks - failures}/${checks} 통과`);
if (failures) {
  console.error(`${failures}건 실패`);
  process.exit(1);
}
