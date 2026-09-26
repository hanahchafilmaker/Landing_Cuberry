// GitHub Pages 같은 서브경로/정적 호스팅에서 어드민과 랜딩이 올바른 API 주소를 쓰는지 검증한다.
// 실제 소스(admin/index.html, cms-bridge.js)에서 해당 코드 블록을 그대로 뽑아 실행하므로
// 로직을 고쳤을 때 이 테스트가 함께 깨진다.
//
// 실행: npm test
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adminSource = readFileSync(path.join(ROOT, "admin", "index.html"), "utf8");
const bridgeSource = readFileSync(path.join(ROOT, "cms-bridge.js"), "utf8");

function between(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${label}: 시작 마커를 찾지 못함 → ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`${label}: 끝 마커를 찾지 못함 → ${endMarker}`);
  return source.slice(start, end + endMarker.length);
}

// admin/index.html: Origin 결정 블록 + 서브경로 라우팅 블록
const adminOriginBlock = between(
  adminSource,
  'const BAKED_API_ORIGIN = "";',
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
  'const BAKED_API_ORIGIN = "";',
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

function run({ pathname, search = "", stored = null, baked = "", blocks, extra = "" }) {
  const storage = new Map(stored === null ? [] : [[API_ORIGIN_KEY, stored]]);
  const sandbox = {
    PAGES,
    location: { pathname, search, origin: "https://hanahchafilmaker.github.io" },
    URL,
    URLSearchParams,
    console,
  };
  sandbox.window = { localStorage: { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) } };
  sandbox.localStorage = sandbox.window.localStorage;
  const script = blocks
    .map((code) => code.replace('const BAKED_API_ORIGIN = "";', `const BAKED_API_ORIGIN = ${JSON.stringify(baked)};`))
    .join("\n");
  vm.createContext(sandbox);
  vm.runInContext(`${script}\n${extra}\n__result;`, sandbox);
  return { result: sandbox.__result, storage };
}

const API_ORIGIN_KEY = "cuberry.apiOrigin";
const REMOTE = "https://cuberry-landing.onrender.com";
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

console.log("\n[1] admin/index.html — API Origin 결정");
expect(
  "같은 서버(/admin) → 상대경로 유지",
  run({ pathname: "/admin", blocks: [adminOriginBlock], extra: probe() }).result,
  { apiOrigin: "", same: true, url: "/api/auth/status", asset: "/uploads/a.jpg", relativeAsset: "portfolio_thumbs/a.jpg", externalAsset: "https://cdn.example.com/a.jpg", dataAsset: "data:image/png;base64,AAA" },
);
expect(
  "Pages 서브경로 + ?api= → 원격 사용 & 저장",
  (() => {
    const { result, storage } = run({ pathname: "/Landing_Cuberry/admin/", search: `?api=${REMOTE}/`, blocks: [adminOriginBlock], extra: probe() });
    return { ...result, saved: storage.get(API_ORIGIN_KEY) };
  })(),
  { apiOrigin: REMOTE, same: false, url: `${REMOTE}/api/auth/status`, asset: `${REMOTE}/uploads/a.jpg`, relativeAsset: "portfolio_thumbs/a.jpg", externalAsset: "https://cdn.example.com/a.jpg", dataAsset: "data:image/png;base64,AAA", saved: REMOTE },
);
expect(
  "저장된 값만 있을 때 → 원격 사용",
  run({ pathname: "/Landing_Cuberry/admin/", stored: REMOTE, blocks: [adminOriginBlock], extra: probe() }).result.apiOrigin,
  REMOTE,
);
expect(
  "BAKED_API_ORIGIN 만 있을 때 → 원격 사용",
  run({ pathname: "/admin", baked: REMOTE, blocks: [adminOriginBlock], extra: probe() }).result.apiOrigin,
  REMOTE,
);
expect(
  "저장된 값이 BAKED 보다 우선",
  run({ pathname: "/admin", baked: "https://baked.example.com", stored: REMOTE, blocks: [adminOriginBlock], extra: probe() }).result.apiOrigin,
  REMOTE,
);
expect(
  "?api=javascript:… 같은 잘못된 값은 무시",
  run({ pathname: "/admin", search: "?api=javascript:alert(1)", blocks: [adminOriginBlock], extra: probe() }).result.apiOrigin,
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
  run({ pathname: "/admin", search: "?api=cuberry-landing.onrender.com", blocks: [adminOriginBlock], extra: probe() }).result.apiOrigin,
  REMOTE,
);
expect(
  "현재 페이지와 같은 Origin 을 넣으면 같은 서버로 취급",
  run({ pathname: "/admin", stored: "https://hanahchafilmaker.github.io", blocks: [adminOriginBlock], extra: probe() }).result.same,
  true,
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
  run({ pathname: "/", blocks: [bridgeOriginBlock], extra: probe() }).result,
  { apiOrigin: "", same: true, url: "/api/auth/status", asset: "/uploads/a.jpg", relativeAsset: "portfolio_thumbs/a.jpg", externalAsset: "https://cdn.example.com/a.jpg", dataAsset: "data:image/png;base64,AAA" },
);
expect(
  "어드민이 저장한 주소를 그대로 사용",
  run({ pathname: "/Landing_Cuberry/", stored: REMOTE, blocks: [bridgeOriginBlock], extra: probe() }).result,
  { apiOrigin: REMOTE, same: false, url: `${REMOTE}/api/auth/status`, asset: `${REMOTE}/uploads/a.jpg`, relativeAsset: "portfolio_thumbs/a.jpg", externalAsset: "https://cdn.example.com/a.jpg", dataAsset: "data:image/png;base64,AAA" },
);
expect(
  "?api= 는 이번 방문에만 적용(저장하지 않음)",
  (() => {
    const { result, storage } = run({ pathname: "/Landing_Cuberry/", search: `?api=${REMOTE}`, blocks: [bridgeOriginBlock], extra: probe() });
    return { apiOrigin: result.apiOrigin, saved: storage.get(API_ORIGIN_KEY) ?? null };
  })(),
  { apiOrigin: REMOTE, saved: null },
);

console.log(`\n결과: ${checks - failures}/${checks} 통과`);
if (failures) {
  console.error(`${failures}건 실패`);
  process.exit(1);
}
