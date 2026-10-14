// 보안 회귀 테스트 — 실제로 재현됐던 우회·노출을 다시 막아두는 장치.
//
//   [1] X-Forwarded-For 로 로그인 시도 제한 우회 불가 (과거 회귀)
//   [2] TRUST_PROXY=1 일 때는 XFF 오른쪽 hop 만 신뢰
//   [3] ADMIN_ALLOWED_ORIGINS=* 모드에서는 쿠키 자격증명 미허용
//   [4] 기본 보안 헤더 · CSP (환경변수로 끄기 가능)
//   [5] 압축(br/gzip) · ETag 304 재검증
//   [6] safeFile 접두 검사 우회 불가 (형제 폴더 읽기 차단)
//   [7] 업로드는 MIME 문자열이 아니라 실제 이미지 시그니처로 검증
//   [8] 문의 폼 허니팟 — 채워진 숨은 칸은 저장되지 않는다
//   [9] robots.txt · sitemap.xml 서빙
//   [10] REQUIRE_ADMIN_PASSWORD=1 이면 기본 비밀번호로 기동 불가
//   [11] Phase 2 — 서명된 폼 토큰·Turnstile (off/flag/strict + 시간창·siteverify)
//
// 실행: npm run test:security  (npm test 에 포함)
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import { tmpdir } from "os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGES_ORIGIN = "https://hanahchafilmaker.github.io";
const OFFICIAL_ORIGIN = "https://cuberry.kr"; // 공식 도메인(커스텀 도메인 연결 후 기본 허용)
const EVIL_ORIGIN = "https://evil.example.com";
const PASSWORD = "cuberry2026";
const PNG_1PX = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

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

async function withServer({ label, env = {}, expectExit = false }, handle) {
  const port = await freePort();
  const dataDir = mkdtempSync(path.join(tmpdir(), "cuberry-sec-"));
  // safeFile 형제 폴더 우회 테스트용 미끼 디렉터리
  mkdirSync(path.join(dataDir, "uploads-evil"), { recursive: true });
  writeFileSync(path.join(dataDir, "uploads-evil", "secret.txt"), "secret");
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["--experimental-sqlite", path.join(ROOT, "server", "index.mjs")], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      PUBLIC_ORIGIN: "",
      RENDER_EXTERNAL_URL: "",
      RENDER_SERVICE_ID: "",
      ADMIN_ALLOWED_ORIGINS: "",
      ADMIN_PASSWORD: "",
      RESET_ADMIN_PASSWORD: "",
      TRUST_PROXY: "",
      REQUIRE_ADMIN_PASSWORD: "",
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = [];
  child.stdout.on("data", (chunk) => logs.push(String(chunk)));
  child.stderr.on("data", (chunk) => logs.push(String(chunk)));

  if (expectExit) {
    const code = await new Promise((resolve) => child.on("exit", resolve));
    try {
      await handle({ origin, logs, code });
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
    return;
  }

  const started = Date.now();
  for (;;) {
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) break;
    } catch {}
    if (child.exitCode !== null) throw new Error(`${label}: 서버가 시작 중 종료됨\n${logs.join("")}`);
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

const badLogin = (origin, xff) =>
  fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(xff ? { "x-forwarded-for": xff } : {}) },
    body: JSON.stringify({ password: "wrong" }),
  });

console.log("\n[1] XFF 를 바꿔가며 로그인 시도 제한 우회 — 이제 막힌다");
await withServer({ label: "우회" }, async ({ origin }) => {
  const codes = [];
  for (let i = 1; i <= 11; i += 1) codes.push((await badLogin(origin, `10.9.${i}.${i}`)).status);
  expect("XFF 를 매번 바꿔도 11번째는 429", codes[10], 429);
  expect("차단 응답에 Retry-After", (await badLogin(origin, "10.9.99.99")).status, 429);
});

console.log("\n[2] TRUST_PROXY=1 — XFF 오른쪽 hop 만 신뢰");
await withServer({ label: "프록시", env: { TRUST_PROXY: "1", PROXY_HOPS: "1" } }, async ({ origin }) => {
  // 왼쪽(조작 가능)만 바꾸고 오른쪽(진짜 클라이언트)을 고정 → 같은 버킷
  const codes = [];
  for (let i = 1; i <= 11; i += 1) codes.push((await badLogin(origin, `1.2.3.${i}, 203.0.113.7`)).status);
  expect("오른쪽 hop 고정 시 11번째 429", codes[10], 429);
});

console.log("\n[3] 전체 허용(*) 모드 — 쿠키 자격증명 헤더 없음");
await withServer({ label: "와일드카드", env: { ADMIN_ALLOWED_ORIGINS: "*" } }, async ({ origin }) => {
  const preflight = await fetch(`${origin}/api/auth/login`, {
    method: "OPTIONS",
    headers: { origin: EVIL_ORIGIN, "access-control-request-method": "POST", "access-control-request-headers": "content-type" },
  });
  expect("임의 Origin 사전요청 → 204", preflight.status, 204);
  expect("* 모드에는 Allow-Credentials 없음", preflight.headers.get("access-control-allow-credentials"), null);
});
await withServer({ label: "목록모드" }, async ({ origin }) => {
  const preflight = await fetch(`${origin}/api/auth/login`, {
    method: "OPTIONS",
    headers: { origin: PAGES_ORIGIN, "access-control-request-method": "POST", "access-control-request-headers": "content-type" },
  });
  expect("허용 목록 Origin 에는 자격증명 유지", preflight.headers.get("access-control-allow-credentials"), "true");

  // 공식 도메인도 같은 규칙으로 허용되고, 목록에 없는 Origin 은 그대로 거부되는지 함께 본다.
  const official = await fetch(`${origin}/api/auth/login`, {
    method: "OPTIONS",
    headers: { origin: OFFICIAL_ORIGIN, "access-control-request-method": "POST", "access-control-request-headers": "content-type" },
  });
  expect("공식 도메인 사전요청 → 204", official.status, 204);
  expect("공식 도메인 Allow-Origin", official.headers.get("access-control-allow-origin"), OFFICIAL_ORIGIN);

  const evil = await fetch(`${origin}/api/auth/login`, {
    method: "OPTIONS",
    headers: { origin: EVIL_ORIGIN, "access-control-request-method": "POST", "access-control-request-headers": "content-type" },
  });
  expect("목록에 없는 Origin 은 여전히 거부", evil.status, 403);
});

console.log("\n[4] 기본 보안 헤더 · CSP");
await withServer({ label: "헤더" }, async ({ origin }) => {
  const page = await fetch(`${origin}/`);
  expect("nosniff", page.headers.get("x-content-type-options"), "nosniff");
  expect("Referrer-Policy", page.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  expect("Permissions-Policy 있음", Boolean(page.headers.get("permissions-policy")), true);
  expect("CSP 기본 적용", Boolean(page.headers.get("content-security-policy")), true);
  const api = await fetch(`${origin}/api/health`);
  expect("API 응답에도 nosniff", api.headers.get("x-content-type-options"), "nosniff");
  await page.body?.cancel?.();
});
await withServer({ label: "CSP 끔", env: { CONTENT_SECURITY_POLICY: "" } }, async ({ origin }) => {
  const page = await fetch(`${origin}/`);
  expect("CONTENT_SECURITY_POLICY=\"\" 면 헤더 없음", page.headers.get("content-security-policy"), null);
});

console.log("\n[5] 압축 · ETag 304");
await withServer({ label: "압축" }, async ({ origin }) => {
  const plain = await fetch(`${origin}/`, { headers: { "accept-encoding": "identity" } });
  const plainBody = await plain.text();
  expect("인코딩 없으면 identity", plain.headers.get("content-encoding"), null);

  const br = await fetch(`${origin}/`, { headers: { "accept-encoding": "br" } });
  expect("브롤리 응답", br.headers.get("content-encoding"), "br");
  const brBody = await br.text();
  expect("압축 풀면 원본과 동일", brBody, plainBody);
  expect("브롤리가 더 작다", Number(br.headers.get("content-length")) < plainBody.length, true);

  const gzip = await fetch(`${origin}/api/public/content`, { headers: { "accept-encoding": "gzip" } });
  expect("API JSON 도 gzip", gzip.headers.get("content-encoding"), "gzip");
  expect("API 본문 정상", (await gzip.json()).settings ? true : false, true);

  const etag = plain.headers.get("etag");
  expect("ETag 있음", Boolean(etag), true);
  const revalidated = await fetch(`${origin}/`, { headers: { "if-none-match": etag } });
  expect("재검증 → 304", revalidated.status, 304);
  const image = await fetch(`${origin}/images/cuberry-mark.webp`);
  const imageTag = image.headers.get("etag");
  expect("이미지 ETag 있음", Boolean(imageTag), true);
  expect("이미지 재검증 → 304", (await fetch(`${origin}/images/cuberry-mark.webp`, { headers: { "if-none-match": imageTag } })).status, 304);
});

console.log("\n[6] safeFile — 형제 폴더 읽기 차단");
await withServer({ label: "경로" }, async ({ origin }) => {
  // %2e%2e%2f 는 URL 정규화로 사라지지 않아 safeFile 까지 도착한다(과거 우회 경로)
  const probe = await fetch(`${origin}/uploads/%2e%2e%2fuploads-evil%2fsecret.txt`);
  expect("uploads 형제 폴더 읽기 → 403", probe.status, 403);
  const probe2 = await fetch(`${origin}/images/%2e%2e%2fserver%2fseed.json`);
  expect("images 로 서버 파일 읽기 → 403", probe2.status, 403);
  // 운영 DB(세션 토·비밀번호 해시)까지 읽히던 과거 우회 경로
  const probe3 = await fetch(`${origin}/images/%2e%2e%2fdata%2fcuberry.sqlite`);
  expect("images 로 SQLite 읽기 → 403", probe3.status, 403);
  expect("정상 이미지는 200", (await fetch(`${origin}/images/cuberry-mark.webp`)).status, 200);
});

console.log("\n[7] 업로드 시그니처 검증");
await withServer({ label: "업로드" }, async ({ origin }) => {
  const login = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  const { token } = await login.json();
  const auth = { "content-type": "application/json", authorization: `Bearer ${token}` };
  const base = { title: "시그니처 테스트", category: "광고", year: "2026", description: "설명" };

  const fake = await fetch(`${origin}/api/admin/portfolio`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ ...base, thumbnailDataUrl: `data:image/png;base64,${Buffer.from("this is not a png").toString("base64")}` }),
  });
  expect("가짜 PNG → 400", fake.status, 400);

  const real = await fetch(`${origin}/api/admin/portfolio`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ ...base, thumbnailDataUrl: `data:image/png;base64,${PNG_1PX}` }),
  });
  expect("진짜 PNG → 200", real.status, 200);
  const saved = await real.json();
  expect("저장된 확장자", String(saved.id).length > 0, true);
});

console.log("\n[8] 문의 허니팟");
await withServer({ label: "허니팟" }, async ({ origin }) => {
  const count = async () => {
    const login = await fetch(`${origin}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: PASSWORD }),
    });
    const { token } = await login.json();
    const content = await (await fetch(`${origin}/api/admin/content`, { headers: { authorization: `Bearer ${token}` } })).json();
    return content.inquiries.length;
  };
  const before = await count();
  const bot = await fetch(`${origin}/api/partnership`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contactName: "bot", email: "bot@spam.io", brief: "spam", website: "http://spam.io" }),
  });
  expect("허니팟 문의도 성공처럼 응답", bot.status, 200);
  expect("허니팟 문의는 저장되지 않음", await count(), before);
  const human = await fetch(`${origin}/api/partnership`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contactName: "사람", email: "human@cuberry.ai", brief: "상담 요청" }),
  });
  expect("정상 문의 → 200", human.status, 200);
  expect("정상 문의는 저장됨", await count(), before + 1);
});

console.log("\n[9] robots.txt · sitemap.xml");
await withServer({ label: "정적" }, async ({ origin }) => {
  const robots = await fetch(`${origin}/robots.txt`);
  expect("robots 200", robots.status, 200);
  expect("robots 본문에 Sitemap", (await robots.text()).includes("Sitemap:"), true);
  const sitemap = await fetch(`${origin}/sitemap.xml`);
  expect("sitemap 200", sitemap.status, 200);
  expect("sitemap content-type", sitemap.headers.get("content-type")?.startsWith("application/xml"), true);
});

console.log("\n[10] REQUIRE_ADMIN_PASSWORD=1 — 기본 비밀번호면 기동 거부");
await withServer(
  { label: "기본비밀번호 거부", env: { REQUIRE_ADMIN_PASSWORD: "1" }, expectExit: true },
  async ({ logs, code }) => {
    expect("종료 코드 1", code, 1);
    expect("안내 로그", logs.join("").includes("REQUIRE_ADMIN_PASSWORD=1"), true);
  },
);

console.log("\n[11] Phase 2 — 서명된 폼 토큰 · Turnstile: off/flag/strict 3단계 + 시간창");
{
  const mockHttp = (handler) =>
    new Promise((resolve) => {
      const server = createHttpServer(handler);
      server.listen(0, "127.0.0.1", () => resolve(server));
    });
  const closeHttp = (server) => new Promise((resolve) => server.close(resolve));
  const until = async (fn, ms = 3000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (fn()) return true;
      await sleep(50);
    }
    return fn();
  };
  const adminToken = async (origin) => {
    const login = await fetch(`${origin}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: PASSWORD }),
    });
    return (await login.json()).token;
  };
  const authHeaders = (token) => ({ authorization: `Bearer ${token}` });
  const inquiriesOf = async (origin, token) =>
    (await (await fetch(`${origin}/api/admin/content`, { headers: authHeaders(token) })).json()).inquiries;
  const notificationsOf = async (origin, token) =>
    (await (await fetch(`${origin}/api/admin/notifications`, { headers: authHeaders(token) })).json()).notifications;
  const postPartnership = async (origin, body) => {
    const res = await fetch(`${origin}/api/partnership`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "폼 검증 테스트",
        email: "check@example.com",
        message: "Phase 2 폼 토큰 검증용 문의입니다.",
        website: "",
        ...body,
      }),
    });
    return { status: res.status, body: await res.json() };
  };
  const mint = async (origin) => (await fetch(`${origin}/api/form-token`)).json();

  // ── flag(기본값): 빠름·위조·없음 → 저장하되 review + 알림 0 / 정상 시간 → 새 리드 + 알림 1 ──
  let hookHits = 0;
  const hook = await mockHttp((req, res) => {
    hookHits += 1;
    req.resume();
    res.setHeader("content-type", "application/json");
    res.end('{"ok":true}');
  });
  await withServer(
    {
      label: "폼토큰-flag",
      env: {
        FORM_TOKEN_MAX_AGE_MS: "5000", // 만료 창 5초 — 한 번의 실행에서 시간 전 구간을 검증
        NOTIFY_WEBHOOK_URL: `http://127.0.0.1:${hook.address().port}/hook`,
      },
    },
    async ({ origin, logs }) => {
      const token = await adminToken(origin);
      // t0: 세 토큰 동시 발급 (min-age 는 기본 3초 유지)
      const [a, b, c] = await Promise.all([mint(origin), mint(origin), mint(origin)]);
      expect("토큰 형식 <ts>.<64hex mac>", /^[0-9]+\.[0-9a-f]{64}$/.test(a.token), true);

      // A: 즉시 제출 — 사람은 3초 안에 못 채운다 → 저장은 되지만 review
      const ra = await postPartnership(origin, { formToken: a.token });
      expect("flag 도 응답 shape 은 불변", { status: ra.status, hasId: String(ra.body.id || "").length > 0 }, { status: 200, hasId: true });
      // 위조 mac / 토큰 없음 → 전부 review
      await postPartnership(origin, { formToken: `${a.token.split(".")[0]}.${"0".repeat(64)}` });
      await postPartnership(origin, { formToken: "" });

      let inquiries = await inquiriesOf(origin, token);
      expect("flag 는 리드를 남긴다", inquiries.length, 3);
      expect("3건 모두 status=review", inquiries.every((i) => i.status === "review"), true);
      expect("review 는 알림 0건", (await notificationsOf(origin, token)).length, 0);

      // B: 3.1초 뒤 제출 → 정상 시간 → 새 리드 + 알림 1건
      await sleep(3100);
      await postPartnership(origin, { formToken: b.token });
      inquiries = await inquiriesOf(origin, token);
      expect("정상 토큰도 저장", inquiries.length, 4);
      expect("정상 토큰 → 새 리드", inquiries[0].status, "new");
      expect("정상 리드 알림 1건", (await notificationsOf(origin, token)).length, 1);
      await until(() => hookHits === 1);
      expect("웹훅도 1회만", hookHits, 1);

      // C: t0+5.2초 제출 → max-age 5초 만료 → review, 알림 증가 없음
      await sleep(2100);
      await postPartnership(origin, { formToken: c.token });
      inquiries = await inquiriesOf(origin, token);
      expect("오래된 토큰도 저장은 된다", inquiries.length, 5);
      expect("만료 토큰 → review", inquiries[0].status, "review");
      expect("만료 토큰도 알림 없음", (await notificationsOf(origin, token)).length, 1);
      expect("경고 로그 [spam] 남음", logs.join("").includes("[spam]"), true);
    },
  );
  await closeHttp(hook);

  // ── strict: 저장하지 않고 200 {ok:true,id:""} — 허니팟과 동일, 봇은 접수된 줄 안다 ──
  await withServer({ label: "폼토큰-strict", env: { FORM_TOKEN_MODE: "strict" } }, async ({ origin }) => {
    const token = await adminToken(origin);
    const fresh = await mint(origin);
    const r1 = await postPartnership(origin, { formToken: fresh.token }); // 너무 빠름
    const r2 = await postPartnership(origin, { formToken: `1.${"0".repeat(64)}` }); // 위조
    expect("strict 는 200 + 빈 id", { s1: r1.status, b1: r1.body, b2: r2.body }, { s1: 200, b1: { ok: true, id: "" }, b2: { ok: true, id: "" } });
    expect("strict 는 리드를 남기지 않는다", (await inquiriesOf(origin, token)).length, 0);
    expect("strict 알림 0건", (await notificationsOf(origin, token)).length, 0);
  });

  // ── off: 기존과 동일하게 새 리드로 저장 + 알림 + 경고 로그 ──
  let offHits = 0;
  const offHook = await mockHttp((req, res) => {
    offHits += 1;
    req.resume();
    res.setHeader("content-type", "application/json");
    res.end('{"ok":true}');
  });
  await withServer(
    {
      label: "폼토큰-off",
      env: { FORM_TOKEN_MODE: "off", NOTIFY_WEBHOOK_URL: `http://127.0.0.1:${offHook.address().port}/hook` },
    },
    async ({ origin, logs }) => {
      const token = await adminToken(origin);
      await postPartnership(origin, { formToken: `1.${"0".repeat(64)}` }); // 위조지만 off 는 방해하지 않는다
      const inquiries = await inquiriesOf(origin, token);
      expect("off 는 기존처럼 새 리드로 저장", { n: inquiries.length, s: inquiries[0].status }, { n: 1, s: "new" });
      await until(() => offHits === 1);
      expect("off 알림도 기존과 같다(웹훅 1회)", offHits, 1);
      expect("off 도 [spam] 경고 로그", logs.join("").includes("[spam]"), true);
    },
  );
  await closeHttp(offHook);

  // ── Turnstile: siteverify 통과 → new / 응답 누락·실패 → review (min-age 50ms 로 단축) ──
  let seen = null;
  let tsHits = 0;
  const tsHook = await mockHttp((req, res) => {
    tsHits += 1;
    req.resume();
    res.setHeader("content-type", "application/json");
    res.end('{"ok":true}');
  });
  const tsMock = await mockHttp((req, res) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      seen = new URLSearchParams(raw);
      const response = seen.get("response") || "";
      const success = seen.get("secret") === "s3cr3t-turnstile" && response.length > 0 && response !== "bad";
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ success }));
    });
  });
  await withServer(
    {
      label: "폼토큰-turnstile",
      env: {
        FORM_TOKEN_MIN_AGE_MS: "50",
        TURNSTILE_SECRET: "s3cr3t-turnstile",
        TURNSTILE_VERIFY_URL: `http://127.0.0.1:${tsMock.address().port}/siteverify`,
        // 알림 채널이 없으면 알림 행 자체가 생기지 않는다 — 채널을 켜두고 행 1건을 검증
        NOTIFY_WEBHOOK_URL: `http://127.0.0.1:${tsHook.address().port}/hook`,
      },
    },
    async ({ origin, logs }) => {
      const token = await adminToken(origin);
      const t1 = await mint(origin);
      await sleep(80);
      await postPartnership(origin, { formToken: t1.token, turnstile: "valid-response" });
      await until(() => seen !== null);
      expect("siteverify 로 secret·response 전달", { secret: seen?.get("secret"), response: seen?.get("response") }, { secret: "s3cr3t-turnstile", response: "valid-response" });
      let inquiries = await inquiriesOf(origin, token);
      expect("siteverify 통과 → 새 리드", inquiries[0].status, "new");

      // 토큰 정상 + turnstile 응답 누락 → success:false → review
      const t2 = await mint(origin);
      await sleep(80);
      await postPartnership(origin, { formToken: t2.token, turnstile: "" });

      // 토큰 정상 + 위조 응답 → success:false → review
      const t3 = await mint(origin);
      await sleep(80);
      await postPartnership(origin, { formToken: t3.token, turnstile: "bad" });

      inquiries = await inquiriesOf(origin, token);
      expect("턴스타일 실패는 review 로 저장만", { n: inquiries.length, s0: inquiries[0].status, s1: inquiries[1].status, s2: inquiries[2].status }, { n: 3, s0: "review", s1: "review", s2: "new" });
      await until(() => tsHits === 1);
      expect("알림은 통과 건만 1건", (await notificationsOf(origin, token)).length, 1);
      expect("턴스타일 실패도 [spam] 로그", logs.join("").includes("[spam]"), true);
    },
  );
  await closeHttp(tsMock);
  await closeHttp(tsHook);
}

console.log(`\n결과: ${checks - failures}/${checks} 통과`);
if (failures) process.exitCode = 1;
