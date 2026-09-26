// GitHub Pages 같은 서브경로/정적 호스팅에서 어드민과 랜딩이 올바른 API 주소를 쓰는지 검증한다.
// 실제 소스(admin/index.html, cms-bridge.js)에서 해당 코드 블록을 그대로 뽑아 실행하므로
// 로직을 고쳤을 때 이 테스트가 함께 깨진다.
//
// 마지막 절에서는 어드민 · 랜딩 · 서버 · Blueprint 네 곳에 적힌 주소가 서로 어긋나지 않는지도 본다.
// 한 곳만 바꿔서 "Pages 는 운영 서버를 부르는데 서버는 그 Origin 을 모른다" 같은 상태가 되면 여기서 실패한다.
//
// 실행: npm test
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adminSource = readFileSync(path.join(ROOT, "admin", "index.html"), "utf8");
const bridgeSource = readFileSync(path.join(ROOT, "cms-bridge.js"), "utf8");
const serverSource = readFileSync(path.join(ROOT, "server", "index.mjs"), "utf8");

// 이 저장소의 실제 배포 주소. 바뀌면 네 곳(어드민·랜딩·서버 기본값·Blueprint)을 함께 바꿔야 한다.
const PAGES_ORIGIN = "https://hanahchafilmaker.github.io";
const PROD_API = "https://landing-cuberry-admin.onrender.com";

function between(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${label}: 시작 마커를 찾지 못함 → ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`${label}: 끝 마커를 찾지 못함 → ${endMarker}`);
  return source.slice(start, end + endMarker.length);
}

const ORIGIN_BLOCK_START = "// ── API 서버 주소(Origin) 결정";
const BAKED_RE = /const BAKED_API_ORIGIN = "[^"]*";/;

// admin/index.html: Origin 결정 블록 + 서브경로 라우팅 블록
const adminOriginBlock = between(
  adminSource,
  ORIGIN_BLOCK_START,
  "return isSameOrigin() ? text : `${apiOrigin}${text}`;\n    }",
  "admin Origin 블록",
);
const adminBaseBlock = between(
  adminSource,
  "const pageFromPath = () => {",
  'return root ? `${root}/` : "/";\n    })();',
  "admin 서브경로 블록",
);

// cms-bridge.js: Origin 결정 블록
const bridgeOriginBlock = between(
  bridgeSource,
  ORIGIN_BLOCK_START,
  "return isSameOrigin() ? text : `${apiOrigin}${text}`;\n  };",
  "cms-bridge Origin 블록",
);

const PAGES = [
  ["overview", "Overview", "개요"],
  ["portfolio", "Portfolio", "포트폴리오"],
  ["services", "Services", "상품"],
  ["faqs", "FAQ", "질문"],
  ["team", "Team", "팀 프로필"],
  ["inquiries", "Inquiries", "문의"],
  ["settings", "Settings", "설정"],
];

// baked: null 이면 소스에 커밋된 값을 그대로 쓰고, 문자열이면 그 값으로 갈아끼운다.
function run({ pathname, search = "", stored = null, baked = "", origin = PAGES_ORIGIN, blocks, extra = "" }) {
  const url = new URL(`${pathname}${search}`, origin);
  const storage = new Map(stored === null ? [] : [[API_ORIGIN_KEY, stored]]);
  const sandbox = {
    PAGES,
    location: { pathname: url.pathname, search: url.search, origin: url.origin, hostname: url.hostname },
    URL,
    URLSearchParams,
    console,
  };
  sandbox.window = { localStorage: { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) } };
  sandbox.localStorage = sandbox.window.localStorage;
  const script = blocks
    .map((code) => (baked === null ? code : code.replace(BAKED_RE, `const BAKED_API_ORIGIN = ${JSON.stringify(baked)};`)))
    .join("\n");
  vm.createContext(sandbox);
  vm.runInContext(`${script}\n${extra}\n__result;`, sandbox);
  return { result: sandbox.__result, storage };
}

const API_ORIGIN_KEY = "cuberry.apiOrigin";
const REMOTE = "https://cuberry-landing.onrender.com";
const LOCAL = "http://localhost:8080";
let failures = 0;
let checks = 0;

function expect(label, actual, wanted) {
  checks += 1;
  const a = JSON.stringify(actual);
  const w = JSON.stringify(wanted);
  if (a !== w) {
    failures += 1;
    console.error(`  ✗ ${label}\n      기대: ${w}\n      실제: ${a}`);
  } else {
    console.log(`  ✓ ${label}`);
  }
}

const probe = (block) => `
  __result = {
    apiOrigin,
    same: isSameOrigin(),
    url: apiUrl("/api/auth/status"),
    asset: assetUrl("/uploads/a.jpg"),
    relativeAsset: assetUrl("portfolio_thumbs/a.jpg"),
    externalAsset: assetUrl("https://cdn.example.com/a.jpg"),
    dataAsset: assetUrl("data:image/png;base64,AAA"),
  };`;

const baseProbe = `
  __result = { adminBase, siteRoot, page: pageFromPath() };`;

const SAME_ORIGIN_PROBE = {
  apiOrigin: "", same: true, url: "/api/auth/status", asset: "/uploads/a.jpg",
  relativeAsset: "portfolio_thumbs/a.jpg", externalAsset: "https://cdn.example.com/a.jpg",
  dataAsset: "data:image/png;base64,AAA",
};
const remoteProbe = (origin) => ({
  apiOrigin: origin, same: false, url: `${origin}/api/auth/status`, asset: `${origin}/uploads/a.jpg`,
  relativeAsset: "portfolio_thumbs/a.jpg", externalAsset: "https://cdn.example.com/a.jpg",
  dataAsset: "data:image/png;base64,AAA",
});

console.log("\n[1] admin/index.html — API Origin 결정");
expect(
  "같은 서버(/admin) → 상대경로 유지",
  run({ pathname: "/admin", origin: PROD_API, blocks: [adminOriginBlock], extra: probe() }).result,
  SAME_ORIGIN_PROBE,
);
expect(
  "Pages 서브경로 + ?api= → 원격 사용 & 저장",
  (() => {
    const { result, storage } = run({ pathname: "/Landing_Cuberry/admin/", search: `?api=${REMOTE}/`, blocks: [adminOriginBlock], extra: probe() });
    return { ...result, saved: storage.get(API_ORIGIN_KEY) };
  })(),
  { ...remoteProbe(REMOTE), saved: REMOTE },
);
expect(
  "저장된 값만 있을 때 → 원격 사용",
  run({ pathname: "/Landing_Cuberry/admin/", stored: REMOTE, blocks: [adminOriginBlock], extra: probe() }).result.apiOrigin,
  REMOTE,
);
expect(
  "BAKED_API_ORIGIN 만 있을 때 → 원격 사용",
  run({ pathname: "/admin", origin: PROD_API, baked: REMOTE, blocks: [adminOriginBlock], extra: probe() }).result.apiOrigin,
  REMOTE,
);
expect(
  "저장된 값이 BAKED 보다 우선",
  run({ pathname: "/admin", origin: PROD_API, baked: "https://baked.example.com", stored: REMOTE, blocks: [adminOriginBlock], extra: probe() }).result.apiOrigin,
  REMOTE,
);
expect(
  "?api=javascript:… 같은 잘못된 값은 무시",
  run({ pathname: "/admin", origin: PROD_API, search: "?api=javascript:alert(1)", blocks: [adminOriginBlock], extra: probe() }).result.apiOrigin,
  "",
);
expect(
  "?api=same 은 저장값을 지우고 같은 서버로 복귀",
  (() => {
    const { result, storage } = run({ pathname: "/Landing_Cuberry/admin/", search: "?api=same", stored: REMOTE, blocks: [adminOriginBlock], extra: probe() });
    return { apiOrigin: result.apiOrigin, same: result.same, saved: storage.get(API_ORIGIN_KEY) ?? null };
  })(),
  { apiOrigin: "", same: true, saved: null },
);
expect(
  "호스트만 적어도 https 로 정규화",
  run({ pathname: "/admin", origin: PROD_API, search: "?api=cuberry-landing.onrender.com", blocks: [adminOriginBlock], extra: probe() }).result.apiOrigin,
  REMOTE,
);
expect(
  "현재 페이지와 같은 Origin 을 넣으면 같은 서버로 취급",
  run({ pathname: "/admin", origin: PROD_API, stored: PROD_API, blocks: [adminOriginBlock], extra: probe() }).result.same,
  true,
);

console.log("\n[1-1] admin/index.html — 소스에 커밋된 운영 주소 (BAKED_API_ORIGIN)");
expect(
  "Pages 서브경로 + 입력값 없음 → 커밋된 운영 서버로 연결",
  run({ pathname: "/Landing_Cuberry/admin/", baked: null, blocks: [adminOriginBlock], extra: probe() }).result,
  remoteProbe(PROD_API),
);
// 운영 서버 자신이 서빙하는 경우: 굽힌 값이 그대로여도 현재 Origin 과 같으므로 URL 은 상대경로다.
// (서버는 아예 값을 비워서 보내며, 그 동작은 test/server-wiring.mjs 가 실제 응답으로 확인한다.)
expect(
  "운영 서버 Origin 에서 열면 굽힌 값 == 현재 Origin → 상대경로",
  run({ pathname: "/admin", origin: PROD_API, baked: null, blocks: [adminOriginBlock], extra: probe() }).result,
  { ...SAME_ORIGIN_PROBE, apiOrigin: PROD_API },
);

console.log("\n[1-2] admin/index.html — 로컬 개발 가드 (localhost 에서 운영 DB 를 건드리지 않게)");
expect(
  "localhost 에서는 굽힌 운영 주소를 무시하고 같은 서버 사용",
  run({ pathname: "/admin", origin: LOCAL, baked: null, blocks: [adminOriginBlock], extra: probe() }).result,
  SAME_ORIGIN_PROBE,
);
expect(
  "127.0.0.1 에서는 저장된 운영 주소도 무시",
  run({ pathname: "/admin", origin: "http://127.0.0.1:8080", baked: null, stored: PROD_API, blocks: [adminOriginBlock], extra: probe() }).result,
  SAME_ORIGIN_PROBE,
);
expect(
  "IPv6 [::1] 도 로컬로 취급",
  run({ pathname: "/admin", origin: "http://[::1]:8080", baked: null, stored: PROD_API, blocks: [adminOriginBlock], extra: probe() }).result,
  SAME_ORIGIN_PROBE,
);
expect(
  "로컬에서도 명시적 ?api= 는 따른다",
  (() => {
    const { result, storage } = run({ pathname: "/admin", origin: LOCAL, baked: null, search: `?api=${REMOTE}`, blocks: [adminOriginBlock], extra: probe() });
    return { apiOrigin: result.apiOrigin, saved: storage.get(API_ORIGIN_KEY) };
  })(),
  { apiOrigin: REMOTE, saved: REMOTE },
);
expect(
  "로컬이 아닌 호스트(미리보기 도메인 등)는 가드 대상 아님",
  run({ pathname: "/admin", origin: "https://8080-sandbox.e2b.app", baked: REMOTE, blocks: [adminOriginBlock], extra: probe() }).result.apiOrigin,
  REMOTE,
);

console.log("\n[2] admin/index.html — 서브경로 라우팅");
for (const [pathname, wanted] of [
  ["/admin", { adminBase: "/admin", siteRoot: "/", page: "overview" }],
  ["/admin/", { adminBase: "/admin", siteRoot: "/", page: "overview" }],
  ["/admin/portfolio", { adminBase: "/admin", siteRoot: "/", page: "portfolio" }],
  ["/admin/settings", { adminBase: "/admin", siteRoot: "/", page: "settings" }],
  ["/admin/unknown-page", { adminBase: "/admin", siteRoot: "/", page: "overview" }],
  ["/Landing_Cuberry/admin/", { adminBase: "/Landing_Cuberry/admin", siteRoot: "/Landing_Cuberry/", page: "overview" }],
  ["/Landing_Cuberry/admin/portfolio", { adminBase: "/Landing_Cuberry/admin", siteRoot: "/Landing_Cuberry/", page: "portfolio" }],
  ["/Landing_Cuberry/admin/inquiries", { adminBase: "/Landing_Cuberry/admin", siteRoot: "/Landing_Cuberry/", page: "inquiries" }],
]) {
  expect(pathname, run({ pathname, blocks: [adminBaseBlock], extra: baseProbe }).result, wanted);
}

console.log("\n[3] cms-bridge.js — API Origin 결정 (어드민과 같은 규칙)");
expect(
  "같은 서버 → 상대경로",
  run({ pathname: "/", origin: PROD_API, blocks: [bridgeOriginBlock], extra: probe() }).result,
  SAME_ORIGIN_PROBE,
);
expect(
  "어드민이 저장한 주소를 그대로 사용",
  run({ pathname: "/Landing_Cuberry/", stored: REMOTE, blocks: [bridgeOriginBlock], extra: probe() }).result,
  remoteProbe(REMOTE),
);
expect(
  "?api= 는 이번 방문에만 적용(저장하지 않음)",
  (() => {
    const { result, storage } = run({ pathname: "/Landing_Cuberry/", search: `?api=${REMOTE}`, blocks: [bridgeOriginBlock], extra: probe() });
    return { apiOrigin: result.apiOrigin, saved: storage.get(API_ORIGIN_KEY) ?? null };
  })(),
  { apiOrigin: REMOTE, saved: null },
);
expect(
  "Pages 랜딩은 커밋된 운영 서버 콘텐츠 사용",
  run({ pathname: "/Landing_Cuberry/", baked: null, blocks: [bridgeOriginBlock], extra: probe() }).result,
  remoteProbe(PROD_API),
);
expect(
  "로컬 랜딩(localhost)은 같은 서버 콘텐츠 사용",
  run({ pathname: "/", origin: LOCAL, baked: null, stored: PROD_API, blocks: [bridgeOriginBlock], extra: probe() }).result,
  SAME_ORIGIN_PROBE,
);

console.log("\n[4] 주소 배선 일관성 — 어드민 · 랜딩 · 서버 · Blueprint");
const bakedOf = (source, label) => {
  const match = /const BAKED_API_ORIGIN = "([^"]*)"/.exec(source);
  if (!match) throw new Error(`${label}: BAKED_API_ORIGIN 을 찾지 못함`);
  return match[1];
};
const serverDefaults = () => {
  const block = /const DEFAULT_ALLOWED_ORIGINS = \[([\s\S]*?)\];/.exec(serverSource);
  if (!block) throw new Error("server/index.mjs: DEFAULT_ALLOWED_ORIGINS 를 찾지 못함");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
};
const blueprintOrigins = (file) => {
  const text = readFileSync(path.join(ROOT, file), "utf8");
  const match = /- key: ADMIN_ALLOWED_ORIGINS\s*\n\s*value:\s*(\S+)/.exec(text);
  if (!match) throw new Error(`${file}: ADMIN_ALLOWED_ORIGINS 를 찾지 못함`);
  return match[1].split(",").map((value) => value.trim().replace(/\/+$/, "")).filter(Boolean);
};

const adminBaked = bakedOf(adminSource, "admin/index.html");
const bridgeBaked = bakedOf(bridgeSource, "cms-bridge.js");
const defaults = serverDefaults();

expect("어드민에 굽힌 운영 주소", adminBaked, PROD_API);
expect("랜딩(cms-bridge)에 굽힌 운영 주소", bridgeBaked, PROD_API);
expect("어드민과 랜딩이 같은 서버를 가리킴", adminBaked === bridgeBaked, true);
expect("굽힌 주소는 https 절대주소", /^https:\/\/[^/\s]+$/i.test(adminBaked), true);
expect("굽힌 주소는 로컬이 아님", /localhost|127\.0\.0\.1|\[::1\]/i.test(adminBaked), false);
expect("서버 기본 허용 목록에 Pages 주소", defaults.includes(PAGES_ORIGIN), true);
expect("서버가 기본 허용 목록을 환경변수와 합침", /new Set\(\[\.\.\.DEFAULT_ALLOWED_ORIGINS, \.\.\.ENV_ALLOWED_ORIGINS\]\)/.test(serverSource), true);
expect("서버가 화면을 직접 서빙할 때 굽힌 주소를 비움", /serveClientFile\(req, res, path\.join\(ROOT, "admin", "index\.html"\)\)/.test(serverSource)
  && /serveClientFile\(req, res, path\.join\(ROOT, "cms-bridge\.js"\)\)/.test(serverSource), true);
expect("render.yaml 에 Pages 주소", blueprintOrigins("render.yaml").includes(PAGES_ORIGIN), true);
expect("render.free.yaml 에 Pages 주소", blueprintOrigins("render.free.yaml").includes(PAGES_ORIGIN), true);
expect("테스트 기준 Pages 주소가 서버 기본값과 같음", PAGES_ORIGIN, defaults[0]);

console.log(`\n결과: ${checks - failures}/${checks} 통과`);
if (failures) {
  console.error(`${failures}건 실패`);
  process.exit(1);
}
