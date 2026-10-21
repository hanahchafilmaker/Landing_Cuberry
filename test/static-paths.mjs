// GitHub Pages 를 흉내 낸 정적 서버를 띄우고, 랜딩/어드민이 참조하는 모든 경로가
// "저장소 이름이 앞에 붙는 서브경로 배포"에서도 실제로 해결되는지 확인한다.
//
// Pages 는 server/index.mjs 를 실행하지 않으므로 /api/* 는 404 여야 정상이고,
// 화면 쪽 경로는 전부 상대경로라 /Landing_Cuberry/ 아래에서 200 이어야 한다.
// (예전에는 /cms-bridge.js 처럼 루트 절대경로가 있어서 Pages 에서 조용히 깨졌다.)
//
// 실행: npm run test:paths
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "/Landing_Cuberry"; // GitHub Pages 미러에서의 저장소 경로
const PORT = Number(process.env.PAGES_PORT || 9099);
// 커스텀 도메인(www.cuberry.kr)은 저장소가 **루트**에 놓인다. 같은 파일을 루트에서도 흉내내
// /en/ · /kr/ 별칭 페이지와 상대경로 자산이 그대로 해결되는지 확인한다.
const APEX_PORT = PORT + 1;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
};

// GitHub Pages 동작 모사: 디렉터리 → index.html, 슬래시 없으면 301, 없으면 404.
// base 는 저장소가 놓이는 접두 경로 — 미러는 "/Landing_Cuberry", 공식 도메인은 "" (루트).
const makePages = (base) => createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);
  if (!pathname.startsWith(`${base}/`) && pathname !== base && base !== "") {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found"); // 저장소 경로 밖은 Pages 에 없다
    return;
  }
  let relative = pathname.slice(base.length).replace(/^\//, "") || "index.html";
  let filePath = path.join(ROOT, relative);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    if (!pathname.endsWith("/")) {
      res.writeHead(301, { Location: `${pathname}/` }); res.end(); return;
    }
    filePath = path.join(filePath, "index.html");
  } else if (!pathname.endsWith("/") && existsSync(`${filePath}/index.html`)) {
    res.writeHead(301, { Location: `${pathname}/` }); res.end(); return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found");
    return;
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
  if (req.method === "HEAD") { res.end(); return; }
  createReadStream(filePath).pipe(res);
});

const pages = makePages(BASE);
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

// <script> 안의 JS 템플릿 리터럴(`href="${siteRoot}"` 등)은 HTML 참조가 아니므로 걷어낸다.
// 걷어내지 않으면 플레이스홀더를 경로로 오해해 404 라고 잘못 보고한다.
const stripDynamic = (html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");

const get = async (pathname, port = PORT) => {
  const response = await fetch(`http://localhost:${port}${pathname}`, { redirect: "manual" });
  return { status: response.status, location: response.headers.get("location"), body: response.ok ? await response.text() : "" };
};
// 29MB 짜리 mp4 까지 본문으로 받을 필요는 없으므로 존재 확인은 HEAD 로 한다.
const head = async (pathname, port = PORT) => {
  const response = await fetch(`http://localhost:${port}${pathname}`, { method: "HEAD", redirect: "manual" });
  return { status: response.status };
};

// HTML 에서 src/href/poster 로 참조하는 경로만 뽑는다. (앵커·외부·data: 는 제외)
function referencedPaths(html, documentPath) {
  const found = new Set();
  const pattern = /\s(?:src|href|poster)\s*=\s*"([^"]+)"/gi;
  let match;
  while ((match = pattern.exec(html))) {
    const value = match[1];
    if (!value || value.startsWith("#") || /^(https?:|data:|blob:|mailto:|tel:|\/\/)/i.test(value)) continue;
    found.add(new URL(value, `http://localhost:${PORT}${documentPath}`).pathname);
  }
  return [...found];
}

await new Promise((resolve) => pages.listen(PORT, "127.0.0.1", resolve));
console.log(`GitHub Pages 시뮬레이션: http://localhost:${PORT}${BASE}/\n`);

try {
  console.log("[1] Pages 에는 API 가 없다 (이게 원격 API 모드가 필요한 이유)");
  expect(`GET ${BASE}/api/auth/status`, (await get(`${BASE}/api/auth/status`)).status, 404);
  expect("GET /api/auth/status (저장소 경로 밖)", (await get("/api/auth/status")).status, 404);
  expect(`GET ${BASE}/api/public/content`, (await get(`${BASE}/api/public/content`)).status, 404);

  console.log("\n[2] Pages 라우팅 동작");
  expect(`${BASE}/admin → 301`, (await get(`${BASE}/admin`)).status, 301);
  expect(`${BASE}/admin → Location`, (await get(`${BASE}/admin`)).location, `${BASE}/admin/`);
  expect(`${BASE}/admin/ → 200`, (await get(`${BASE}/admin/`)).status, 200);
  expect(`${BASE}/ → 200`, (await get(`${BASE}/`)).status, 200);

  console.log("\n[3] 화면이 참조하는 경로가 전부 서브경로에서 해결되는지");
  for (const documentPath of [`${BASE}/`, `${BASE}/admin/`]) {
    const { status, body } = await get(documentPath);
    if (status !== 200) { expect(`${documentPath} 로드`, status, 200); continue; }
    const paths = referencedPaths(stripDynamic(body), documentPath);
    const broken = [];
    for (const target of paths) {
      const result = await head(target);
      if (result.status !== 200) broken.push(`${target} (${result.status})`);
    }
    console.log(`    ${documentPath} → 참조 ${paths.length}건`);
    expect(`${documentPath} 깨진 참조`, broken, []);
  }

  console.log("\n[4] 루트 절대경로(/…)가 화면에 남아있지 않은지");
  const landing = (await get(`${BASE}/`)).body;
  const admin = (await get(`${BASE}/admin/`)).body;
  const absoluteRefs = (html) => [...html.matchAll(/\s(?:src|href|poster)\s*=\s*"(\/[^/"][^"]*)"/gi)].map((m) => m[1]);
  expect("index.html 루트 절대경로 참조", absoluteRefs(stripDynamic(landing)), []);
  // 어드민의 /api/* 는 JS 문자열로 만드는 원격 호출용이라 HTML 속성에는 없어야 한다.
  expect("admin/index.html 루트 절대경로 참조", absoluteRefs(stripDynamic(admin)), []);

  console.log("\n[5] 원격 API 모드가 화면에 심어져 있는지");
  expect("cms-bridge.js 가 window.CuberryApi 를 공개", /window\.CuberryApi\s*=/.test(readFileSync(path.join(ROOT, "cms-bridge.js"), "utf8")), true);
  expect("문의 폼이 CuberryApi.url 사용", /CuberryApi\.url\(\s*["'`]\/api\/partnership["'`]\s*\)/.test(landing), true);
  expect("어드민에 API 서버 주소 카드", admin.includes('id="api-box"') && admin.includes('id="save-api-origin"'), true);
  expect("어드민에 내보내기 버튼", admin.includes('id="export-seed"'), true);

  console.log("\n[6] React 번들이 문자열로 참조하는 로컬 자산(images/…, portfolio_thumbs/…)도 서브경로에서 해결되는지");
  const bundleAssets = [...new Set([...landing.matchAll(/["'`]((?:images|portfolio_thumbs|team_portraits)\/[A-Za-z0-9_.-]+\.(?:jpe?g|png|webp|svg))["'`]/g)].map((m) => m[1]))];
  const missingAssets = [];
  for (const asset of bundleAssets) {
    if ((await head(`${BASE}/${asset}`)).status !== 200) missingAssets.push(asset);
  }
  console.log(`    번들 자산 참조 ${bundleAssets.length}건`);
  expect("번들 자산 참조가 있다", bundleAssets.length > 0, true);
  expect("번들 자산 깨진 참조", missingAssets, []);
  expect("번들에 루트 절대경로 /images/ 참조 없음", /["'`]\/images\//.test(landing), false);

  console.log("\n[7] 공식 도메인(www.cuberry.kr = 저장소가 루트) 시뮬레이션");
  // 커스텀 도메인을 붙이면 Pages 는 저장소를 도메인 루트에서 서빙한다.
  // 별칭 페이지(/en/ · /kr/)는 상대경로(../)만 쓰므로 여기서도 그대로 풀려야 한다.
  const apex = makePages("");
  await new Promise((resolve) => apex.listen(APEX_PORT, "127.0.0.1", resolve));
  try {
    for (const [pathname, wanted] of [["/", 200], ["/en/", 200], ["/en/index.html", 200], ["/kr/", 200], ["/kr/index.html", 200], ["/admin/", 200], ["/sitemap.xml", 200], ["/robots.txt", 200]]) {
      expect(`apex ${pathname} → ${wanted}`, (await get(pathname, APEX_PORT)).status, wanted);
    }
    expect("별칭 페이지가 참조하는 정본(/) 도 200", (await head("/", APEX_PORT)).status, 200);

    const aliasRefs = (html) => [...html.matchAll(/\s(?:src|href)\s*=\s*"([^"]+)"/gi)].map((match) => match[1]);
    for (const pathname of ["/en/", "/kr/"]) {
      const { body } = await get(pathname, APEX_PORT);
      const refs = aliasRefs(body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ""));
      expect(`${pathname} 참조가 전부 상대경로`, refs.every((value) => !value.startsWith("/")), true);
      const brokenAlias = [];
      for (const value of refs) {
        const target = new URL(value, `http://localhost:${APEX_PORT}${pathname}`);
        if ((await head(target.pathname, APEX_PORT)).status !== 200) brokenAlias.push(value);
      }
      expect(`${pathname} 깨진 참조`, brokenAlias, []);
      expect(`${pathname} 가 정본(/?lang=…)으로 연결`, refs.some((value) => value.includes("?lang=")), true);
    }
    expect("apex 랜딩이 참조하는 자산이 루트에서 해결", (await head("/images/og-cover.jpg", APEX_PORT)).status, 200);
  } finally {
    apex.close();
  }

  console.log(`\n결과: ${checks - failures}/${checks} 통과`);
  if (failures) process.exitCode = 1;
} finally {
  pages.close();
}
