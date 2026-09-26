// 서버 쪽 배선을 실제 HTTP 로 확인한다. (의존성 없음 · 저장소 밖에 임시 DB 를 만들어 돌린다)
//
//   [1] 환경변수 없이 켠 서버 — Render 서비스를 Blueprint 가 아니라 대시보드에서 수동으로 만들면
//       render.yaml 의 환경변수가 적용되지 않는다. 그 상태에서도 GitHub Pages 화면이 로그인할 수
//       있도록 Pages 주소가 **기본 허용 목록**에 들어 있는지 본다.
//   [2] 서버가 직접 서빙하는 /admin · /cms-bridge.js — 소스에 커밋된 운영 주소(BAKED_API_ORIGIN)가
//       비워져 오는지 본다. 이게 로컬/Render 에서 연 어드민이 운영 DB 를 편집하는 사고를 막는다.
//   [3] ADMIN_ALLOWED_ORIGINS 는 기본 목록을 대체하지 않고 추가한다. "*" 는 전부 허용한다.
//
// 실행: npm run test:server  (npm test 에 포함되어 있다)
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGES_ORIGIN = "https://hanahchafilmaker.github.io";
const EVIL_ORIGIN = "https://evil.example.com";
const EXTRA_ORIGIN = "https://cuberry.com";
const PASSWORD = "cuberry2026";

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

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

// 서버를 하나 띄우고, 헬스체크가 응답할 때까지 기다린 뒤 handle(origin) 을 돌려준다.
async function withServer({ label, env = {} }, handle) {
  const port = await freePort();
  const dataDir = mkdtempSync(path.join(tmpdir(), "cuberry-data-"));
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["--experimental-sqlite", path.join(ROOT, "server", "index.mjs")], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      // 이 테스트는 "환경변수 없이 켠 서버"를 봐야 하므로 주소 관련 변수는 확실히 비운다.
      PUBLIC_ORIGIN: "",
      RENDER_EXTERNAL_URL: "",
      ADMIN_ALLOWED_ORIGINS: "",
      ADMIN_PASSWORD: "",
      RESET_ADMIN_PASSWORD: "",
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = [];
  child.stdout.on("data", (chunk) => logs.push(String(chunk)));
  child.stderr.on("data", (chunk) => logs.push(String(chunk)));

  const started = Date.now();
  for (;;) {
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) break;
    } catch {}
    if (child.exitCode !== null) throw new Error(`${label}: 서버가 시작 중 종료됨 (code ${child.exitCode})\n${logs.join("")}`);
    if (Date.now() - started > 30_000) throw new Error(`${label}: 서버 시작 시간 초과\n${logs.join("")}`);
    await sleep(100);
  }

  try {
    await handle({ origin, logs });
  } finally {
    child.kill("SIGTERM");
    await sleep(150);
    if (child.exitCode === null) child.kill("SIGKILL");
    rmSync(dataDir, { recursive: true, force: true });
  }
}

// 브라우저가 보내는 사전요청(preflight) 흉내.
const preflight = (origin, from, method = "POST", headers = "content-type, authorization") =>
  fetch(`${origin}/api/auth/login`, {
    method: "OPTIONS",
    headers: {
      origin: from,
      "access-control-request-method": method,
      "access-control-request-headers": headers,
    },
  });

const allowOrigin = (response) => response.headers.get("access-control-allow-origin");

console.log("\n[1] 환경변수 없이 켠 서버 (Render 수동 생성 = render.yaml 미적용 상황)");
await withServer({ label: "기본" }, async ({ origin, logs }) => {
  const config = await (await fetch(`${origin}/api/config`)).json();
  expect("/api/config ok", config.ok, true);
  expect("기본 허용 목록에 Pages 주소", config.allowedOrigins.includes(PAGES_ORIGIN), true);
  expect("기본값 출처를 함께 알려줌", config.defaultAllowedOrigins, [PAGES_ORIGIN]);
  expect("publicOrigin 채워짐(요청 Host 기준)", config.publicOrigin, origin);

  const allowed = await preflight(origin, PAGES_ORIGIN);
  expect("Pages 사전요청 → 204", allowed.status, 204);
  expect("Pages 에 Allow-Origin 부여", allowOrigin(allowed), PAGES_ORIGIN);

  const denied = await preflight(origin, EVIL_ORIGIN);
  expect("목록에 없는 Origin 사전요청 → 403", denied.status, 403);
  expect("거부 응답에는 Allow-Origin 없음", allowOrigin(denied), null);

  // Pages 화면이 실제로 하는 호출: 교차출처 + JSON body → 사전요청 후 로그인.
  const login = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { origin: PAGES_ORIGIN, "content-type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  expect("Pages Origin 에서 로그인 → 200", login.status, 200);
  const session = await login.json();
  expect("토큰 발급", typeof session.token === "string" && session.token.length > 20, true);

  const content = await fetch(`${origin}/api/public/content`, { headers: { origin: PAGES_ORIGIN } });
  expect("Pages Origin 에서 공개 콘텐츠 → 200", content.status, 200);
  expect("공개 콘텐츠에도 Allow-Origin", allowOrigin(content), PAGES_ORIGIN);

  // 실제 어드민 저장 경로를 모두 왕복한다. 예전 DOM 종단 테스트는 화면 이동만 해서
  // 저장 버튼이 API까지 도달하지 않거나 공개 API에 반영되지 않는 회귀를 잡지 못했다.
  const authHeaders = {
    origin: PAGES_ORIGIN,
    "content-type": "application/json",
    authorization: `Bearer ${session.token}`,
    "x-admin-token": session.token,
  };
  const adminBeforeResponse = await fetch(`${origin}/api/admin/content`, { headers: authHeaders });
  expect("저장 전 관리자 콘텐츠 → 200", adminBeforeResponse.status, 200);
  const before = await adminBeforeResponse.json();
  const put = (route, body) => fetch(`${origin}${route}`, { method: "PUT", headers: authHeaders, body: JSON.stringify(body) });

  const savedTitle = "관리자 저장 왕복 테스트";
  expect("사이트 설정 PUT → 200", (await put("/api/admin/settings", { ...before.settings, heroTitle: savedTitle })).status, 200);

  const service = before.services[0];
  expect("상품 PUT → 200", (await put(`/api/admin/services/${service.id}`, { ...service, name: "저장된 테스트 상품" })).status, 200);
  const work = before.portfolio[0];
  expect("포트폴리오 PUT → 200", (await put(`/api/admin/portfolio/${work.id}`, { ...work, title: "저장된 테스트 작품" })).status, 200);
  const faq = before.faqs[0];
  expect("FAQ PUT → 200", (await put(`/api/admin/faqs/${faq.id}`, { ...faq, question: "저장된 테스트 질문" })).status, 200);
  const person = before.team[0];
  expect("팀 PUT → 200", (await put(`/api/admin/team/${person.id}`, { ...person, name: "저장된 테스트 감독" })).status, 200);

  const after = await (await fetch(`${origin}/api/admin/content`, { headers: authHeaders })).json();
  expect("관리자 재조회에 설정 저장값", after.settings.heroTitle, savedTitle);
  expect("관리자 재조회에 상품 저장값", after.services.find((item) => item.id === service.id)?.name, "저장된 테스트 상품");
  expect("관리자 재조회에 작품 저장값", after.portfolio.find((item) => item.id === work.id)?.title, "저장된 테스트 작품");
  expect("관리자 재조회에 FAQ 저장값", after.faqs.find((item) => item.id === faq.id)?.question, "저장된 테스트 질문");
  expect("관리자 재조회에 팀 저장값", after.team.find((item) => item.id === person.id)?.name, "저장된 테스트 감독");

  const publicAfter = await (await fetch(`${origin}/api/public/content`, { headers: { origin: PAGES_ORIGIN } })).json();
  expect("공개 API에도 설정 저장값", publicAfter.settings.heroTitle, savedTitle);
  expect("공개 API에도 상품 저장값", publicAfter.services.find((item) => item.id === service.id)?.name, "저장된 테스트 상품");
  expect("공개 API에도 작품 저장값", publicAfter.portfolio.find((item) => item.id === work.id)?.title, "저장된 테스트 작품");
  expect("공개 API에도 FAQ 저장값", publicAfter.faqs.find((item) => item.id === faq.id)?.question, "저장된 테스트 질문");
  expect("공개 API에도 팀 저장값", publicAfter.team.find((item) => item.id === person.id)?.name, "저장된 테스트 감독");

  expect("거부 로그 남음", logs.join("").includes("[cors] 거부된 Origin"), true);
  expect("시작 로그에 허용 Origin 표시", logs.join("").includes("CORS 허용 Origin"), true);
});

console.log("\n[2] 서버가 직접 서빙하는 화면 — 굽힌 운영 주소를 비워서 보낸다");
await withServer({ label: "서빙" }, async ({ origin }) => {
  const diskAdmin = readFileSync(path.join(ROOT, "admin", "index.html"), "utf8");
  const diskBridge = readFileSync(path.join(ROOT, "cms-bridge.js"), "utf8");
  const bakedOnDisk = /const BAKED_API_ORIGIN = "([^"]*)"/;
  expect("저장소의 어드민에는 운영 주소가 커밋되어 있음", bakedOnDisk.exec(diskAdmin)?.[1], "https://landing-cuberry-admin.onrender.com");
  expect("저장소의 cms-bridge 에도 같은 주소", bakedOnDisk.exec(diskBridge)?.[1], "https://landing-cuberry-admin.onrender.com");

  for (const [route, diskSource, type] of [
    ["/admin", diskAdmin, "text/html"],
    ["/admin/portfolio", diskAdmin, "text/html"],
    ["/cms-bridge.js", diskBridge, "text/javascript"],
  ]) {
    const response = await fetch(`${origin}${route}`);
    const body = await response.text();
    expect(`${route} → 200`, response.status, 200);
    expect(`${route} Content-Type`, response.headers.get("content-type")?.startsWith(type), true);
    expect(`${route} 굽힌 주소가 비워짐`, bakedOnDisk.exec(body)?.[1], "");
    expect(`${route} 나머지 화면은 그대로(길이 차이 = 주소 길이만큼)`, diskSource.length - body.length, "https://landing-cuberry-admin.onrender.com".length);
    expect(`${route} 캐시 금지`, response.headers.get("cache-control"), "no-store");
  }

  // 랜딩(index.html)은 10MB 라 변환하지 않고 그대로 흘려보낸다. 굽힌 상수가 없으니 손댈 것도 없다.
  const landing = await fetch(`${origin}/`, { method: "HEAD" });
  expect("랜딩 HEAD → 200", landing.status, 200);
});

console.log("\n[3] ADMIN_ALLOWED_ORIGINS 는 기본 목록에 추가된다 (대체 아님)");
await withServer({ label: "추가", env: { ADMIN_ALLOWED_ORIGINS: `${EXTRA_ORIGIN}/ , http://192.168.0.10:5173` } }, async ({ origin }) => {
  const config = await (await fetch(`${origin}/api/config`)).json();
  expect("Pages 주소는 그대로 허용", config.allowedOrigins.includes(PAGES_ORIGIN), true);
  expect("추가한 주소 허용(끝 슬래시 정리됨)", config.allowedOrigins.includes(EXTRA_ORIGIN), true);
  expect("http 로컬 개발 주소도 허용", config.allowedOrigins.includes("http://192.168.0.10:5173"), true);
  expect("중복 없음", new Set(config.allowedOrigins).size, config.allowedOrigins.length);
  expect("추가한 Origin 사전요청 → 204", (await preflight(origin, EXTRA_ORIGIN)).status, 204);
  expect("목록에 없는 Origin 은 여전히 403", (await preflight(origin, EVIL_ORIGIN)).status, 403);
});

await withServer({ label: "전체허용", env: { ADMIN_ALLOWED_ORIGINS: "*" } }, async ({ origin }) => {
  const config = await (await fetch(`${origin}/api/config`)).json();
  expect("\"*\" 이면 allowedOrigins = [\"*\"]", config.allowedOrigins, ["*"]);
  const any = await preflight(origin, EVIL_ORIGIN);
  expect("모든 Origin 사전요청 → 204", any.status, 204);
  expect("요청한 Origin 을 그대로 돌려줌", allowOrigin(any), EVIL_ORIGIN);
});

console.log(`\n결과: ${checks - failures}/${checks} 통과`);
if (failures) process.exitCode = 1;
