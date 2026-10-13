// 문의 알림(Phase 1) 회귀 테스트 — 외부로 요청이 나가지 않는다.
//
//   [1]  웹훅 성공 → status=sent, attempts=1
//   [2]  웹훅 500 1회 → 백오프 재시도 후 sent, 시도 간격이 설정을 지킨다
//   [3]  계속 실패 → failed + last_error, 웹훅 항목 1개는 그대로(행이 늘지 않는다)
//   [4]  환경변수 미설정 → 알림 행 0건 · fetch 0건 (지금 동작과 완전히 같다)
//   [5]  NOTIFY_DISABLED=1 → 발송 0건
//   [6]  NOTIFY_MASK_CONTACT=1 → 웹훅 본문에 원본 이메일·전화 없음 (이메일 채널은 원문 유지)
//   [7]  이메일 채널 — 수신자·Reply-To·Bearer, RESEND_API_KEY 가 없으면 채널 자체가 꺼진다
//   [8]  중복 호출/수동 재발송 → 행은 1개, attempts 만 증가
//   [9]  fetch 가 예외를 던져도 notifyInquiry 는 던지지 않는다 (문의 접수 보호)
//   [10] 실제 서버 종단 — 문의 접수 → 알림 발송 → 어드민 API 배지 → 실패 → 다시 보내기
//
// 실행: npm run test:notify  (npm test 에 포함)
import { mkdtempSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_RETRY_DELAYS_MS, createNotifier, ensureNotifySchema, readNotifyConfig } from "../server/lib/notify.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

async function waitFor(label, check, timeout = 5000) {
  const started = Date.now();
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() - started > timeout) throw new Error(`${label} 시간 초과`);
    await sleep(20);
  }
}

// ── 단위 테스트용 준비물 ───────────────────────────────────────

function freshDb() {
  const dir = mkdtempSync(path.join(tmpdir(), "cuberry-notify-"));
  const db = new DatabaseSync(path.join(dir, "notify.sqlite"));
  db.exec(`CREATE TABLE inquiries (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    project_type TEXT,
    budget TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`);
  ensureNotifySchema(db);
  return { db, dir };
}

function insertInquiry(db, overrides = {}) {
  const row = {
    code: "CB-0001",
    name: "홍길동",
    email: "hong@gmail.com",
    phone: "010-1234-5678",
    company: "가나다컴퍼니",
    project_type: "AI 광고",
    budget: "500만원 이상",
    message: "숏폼 광고 문의드립니다. 자세한 상담 부탁드려요.",
    status: "new",
    ...overrides,
  };
  const stamp = new Date().toISOString();
  const result = db
    .prepare(`INSERT INTO inquiries (code, name, email, company, phone, project_type, budget, message, status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(row.code, row.name, row.email, row.company, row.phone, row.project_type, row.budget, row.message, row.status, stamp, stamp);
  return {
    id: Number(result.lastInsertRowid),
    code: row.code,
    name: row.name,
    email: row.email,
    company: row.company,
    phone: row.phone,
    projectType: row.project_type,
    budget: row.budget,
    message: row.message,
    status: row.status,
    createdAt: stamp,
  };
}

/** 가짜 fetch — 호출 기록을 남기고 시나리오대로 응답/예외를 돌려준다. */
function fakeFetch(handler) {
  const calls = [];
  const impl = async (url, init = {}) => {
    const call = { url: String(url), method: init.method, headers: init.headers || {}, raw: init.body, body: null };
    try {
      call.body = init.body ? JSON.parse(String(init.body)) : null;
    } catch {
      call.body = null;
    }
    calls.push(call);
    const result = (await handler(call, calls.length)) || {};
    if (result.throw) throw result.throw;
    const status = result.status ?? 200;
    return { ok: status >= 200 && status < 300, status, text: async () => result.text ?? "" };
  };
  impl.calls = calls;
  return impl;
}

function makeNotifier(db, env, handler) {
  const delays = [];
  const fetchImpl = fakeFetch(handler);
  const notifier = createNotifier({
    db,
    env,
    adminUrl: "https://cuberry.example.com/admin-v2",
    fetchImpl,
    sleep: async (ms) => {
      delays.push(ms);
    },
    log: { log() {}, warn() {}, error() {} },
  });
  return { notifier, fetchImpl, delays };
}

const WEBHOOK_ENV = { NOTIFY_WEBHOOK_URL: "https://hooks.slack.com/services/T000/B000/secret-token" };
const rowsOf = (db, inquiryId) => db.prepare("SELECT * FROM notifications WHERE inquiry_id = ? ORDER BY id").all(inquiryId);

console.log("\n[1] 웹훅 성공 → sent");
{
  const { db, dir } = freshDb();
  const inquiry = insertInquiry(db);
  const { notifier, fetchImpl, delays } = makeNotifier(db, WEBHOOK_ENV, () => ({ status: 200, text: "ok" }));
  notifier.notifyInquiry(inquiry);
  await waitFor("발송 완료", () => rowsOf(db, inquiry.id)[0]?.status === "sent");
  const [row] = rowsOf(db, inquiry.id);
  expect("행 1개(webhook)", [row.channel, row.status, row.attempts, Boolean(row.sent_at)], ["webhook", "sent", 1, true]);
  expect("fetch 1회", fetchImpl.calls.length, 1);
  expect("POST + JSON", [fetchImpl.calls[0].method, fetchImpl.calls[0].headers["Content-Type"]], ["POST", "application/json"]);
  expect("본문에 문의 코드", String(fetchImpl.calls[0].body.text).includes("CB-0001"), true);
  expect("본문에 어드민 링크", String(fetchImpl.calls[0].body.text).includes("https://cuberry.example.com/admin-v2"), true);
  expect("웹훅 URL 전체(비밀 토큰)는 저장하지 않음 — 호스트만", row.target, "hooks.slack.com");
  expect("백오프 없이 1회 시도", delays, []);
  db.close();
  rmSync(dir, { recursive: true, force: true });
}

console.log("\n[2] 웹훅 500 → 백오프 재시도 후 sent");
{
  const { db, dir } = freshDb();
  const inquiry = insertInquiry(db);
  const { notifier, fetchImpl, delays } = makeNotifier(db, { ...WEBHOOK_ENV, NOTIFY_RETRY_DELAYS_MS: "1234,2345" }, (_call, index) =>
    index === 1 ? { status: 500, text: "internal error" } : { status: 200 },
  );
  notifier.notifyInquiry(inquiry);
  await waitFor("재시도 성공", () => rowsOf(db, inquiry.id)[0]?.status === "sent");
  const [row] = rowsOf(db, inquiry.id);
  expect("시도 2회", row.attempts, 2);
  expect("첫 실패 사유는 지워짐", row.last_error, null);
  expect("설정한 백오프만 사용", delays, [1234]);
  expect("발송 2회", fetchImpl.calls.length, 2);
  db.close();
  rmSync(dir, { recursive: true, force: true });
}

console.log("\n[3] 계속 실패 → failed + last_error, 행은 1개");
{
  const { db, dir } = freshDb();
  const inquiry = insertInquiry(db);
  const { notifier, fetchImpl, delays } = makeNotifier(db, { ...WEBHOOK_ENV, NOTIFY_RETRY_DELAYS_MS: "1234,2345" }, () => ({ status: 503, text: "unavailable" }));
  notifier.notifyInquiry(inquiry);
  await waitFor("최종 실패", () => rowsOf(db, inquiry.id)[0]?.status === "failed");
  const [row] = rowsOf(db, inquiry.id);
  expect("최대 시도 = 백오프 개수 + 1", [row.attempts, fetchImpl.calls.length], [3, 3]);
  expect("실패 사유 저장", String(row.last_error).includes("503"), true);
  expect("백오프 전부 사용", delays, [1234, 2345]);
  expect("행은 여전히 1개", rowsOf(db, inquiry.id).length, 1);
  expect("문의는 그대로 남아 있음", Number(db.prepare("SELECT COUNT(*) AS n FROM inquiries").get().n), 1);
  db.close();
  rmSync(dir, { recursive: true, force: true });
}

console.log("\n[4] 환경변수 미설정 → 알림 자체가 없다");
{
  const { db, dir } = freshDb();
  const inquiry = insertInquiry(db);
  const { notifier, fetchImpl } = makeNotifier(db, {}, () => ({ status: 200 }));
  expect("행을 만들지 않음", notifier.notifyInquiry(inquiry), null);
  expect("발송 0건", fetchImpl.calls.length, 0);
  expect("notifications 0행", Number(db.prepare("SELECT COUNT(*) AS n FROM notifications").get().n), 0);
  expect("기본 백오프 값(문서 기준)", DEFAULT_RETRY_DELAYS_MS, [1000, 5000, 25000]);
  expect("기본 최대 시도 = 4", readNotifyConfig({}).maxAttempts, 4);
  db.close();
  rmSync(dir, { recursive: true, force: true });
}

console.log("\n[5] NOTIFY_DISABLED=1 → 즉시 끄기");
{
  const { db, dir } = freshDb();
  const inquiry = insertInquiry(db);
  const { notifier, fetchImpl } = makeNotifier(db, { ...WEBHOOK_ENV, NOTIFY_DISABLED: "1" }, () => ({ status: 200 }));
  notifier.notifyInquiry(inquiry);
  await sleep(30);
  expect("행 0건", rowsOf(db, inquiry.id).length, 0);
  expect("발송 0건", fetchImpl.calls.length, 0);
  db.close();
  rmSync(dir, { recursive: true, force: true });
}

console.log("\n[6] NOTIFY_MASK_CONTACT=1 → 웹훅 본문에서 연락처 가림");
{
  const { db, dir } = freshDb();
  const inquiry = insertInquiry(db);
  const masked = makeNotifier(db, { ...WEBHOOK_ENV, NOTIFY_MASK_CONTACT: "1" }, () => ({ status: 200 }));
  masked.notifier.notifyInquiry(inquiry);
  await waitFor("마스킹 발송", () => rowsOf(db, inquiry.id)[0]?.status === "sent");
  const text = String(masked.fetchImpl.calls[0].body.text);
  expect("원본 이메일 없음", text.includes("hong@gmail.com"), false);
  expect("가린 이메일", text.includes("ho***@gmail.com"), true);
  expect("원본 전화 없음", text.includes("010-1234-5678"), false);
  expect("가린 전화", text.includes("010-****-5678"), true);

  const plain = freshDb();
  const plainInquiry = insertInquiry(plain.db);
  const open = makeNotifier(plain.db, WEBHOOK_ENV, () => ({ status: 200 }));
  open.notifier.notifyInquiry(plainInquiry);
  await waitFor("원문 발송", () => rowsOf(plain.db, plainInquiry.id)[0]?.status === "sent");
  expect("마스킹을 끄면 원문 그대로", String(open.fetchImpl.calls[0].body.text).includes("hong@gmail.com"), true);
  db.close();
  rmSync(dir, { recursive: true, force: true });
  plain.db.close();
  rmSync(plain.dir, { recursive: true, force: true });
}

console.log("\n[7] 이메일 채널 — Resend REST · Reply-To");
{
  const { db, dir } = freshDb();
  const inquiry = insertInquiry(db);
  const env = { RESEND_API_KEY: "re_test", NOTIFY_EMAIL_TO: "ops@cuberry.ai, ceo@cuberry.ai", RESEND_API_BASE: "https://api.resend.test" };
  const { notifier, fetchImpl } = makeNotifier(db, env, () => ({ status: 200, text: JSON.stringify({ id: "x" }) }));
  notifier.notifyInquiry(inquiry);
  await waitFor("이메일 발송", () => rowsOf(db, inquiry.id)[0]?.status === "sent");
  const [call] = fetchImpl.calls;
  expect("엔드포인트", call.url, "https://api.resend.test/emails");
  expect("Bearer 인증", call.headers.Authorization, "Bearer re_test");
  expect("수신자 목록", call.body.to, ["ops@cuberry.ai", "ceo@cuberry.ai"]);
  expect("답장은 문의자에게", call.body.reply_to, "hong@gmail.com");
  expect("제목에 코드", String(call.body.subject).includes("CB-0001"), true);
  expect("target 은 수신자", rowsOf(db, inquiry.id)[0].target, "ops@cuberry.ai, ceo@cuberry.ai");

  const off = freshDb();
  const offInquiry = insertInquiry(off.db);
  const noKey = makeNotifier(off.db, { NOTIFY_EMAIL_TO: "ops@cuberry.ai" }, () => ({ status: 200 }));
  expect("RESEND_API_KEY 없으면 이메일 채널 없음", noKey.notifier.notifyInquiry(offInquiry), null);
  expect("발송 0건", noKey.fetchImpl.calls.length, 0);
  db.close();
  rmSync(dir, { recursive: true, force: true });
  off.db.close();
  rmSync(off.dir, { recursive: true, force: true });
}

console.log("\n[8] 중복 호출 · 다시 보내기 — 행이 늘지 않는다");
{
  const { db, dir } = freshDb();
  const inquiry = insertInquiry(db);
  let failFirst = true;
  const { notifier, fetchImpl } = makeNotifier(db, { ...WEBHOOK_ENV, NOTIFY_RETRY_DELAYS_MS: "10", NOTIFY_MAX_ATTEMPTS: "1" }, () => {
    if (failFirst) {
      failFirst = false;
      return { status: 500 };
    }
    return { status: 200 };
  });
  notifier.notifyInquiry(inquiry);
  await waitFor("첫 발송 실패", () => rowsOf(db, inquiry.id)[0]?.status === "failed");
  notifier.notifyInquiry(inquiry); // 같은 문의를 다시 통과시켜도
  await sleep(30);
  expect("행은 계속 1개", rowsOf(db, inquiry.id).length, 1);
  const [failed] = rowsOf(db, inquiry.id);
  const retried = notifier.retry(failed.id);
  expect("다시 보내기 응답", [retried.channel, retried.status, retried.attempts], ["webhook", "pending", 0]);
  await waitFor("재발송 성공", () => rowsOf(db, inquiry.id)[0]?.status === "sent");
  const [after] = rowsOf(db, inquiry.id);
  expect("행 1개 유지 + 시도 1회", [rowsOf(db, inquiry.id).length, after.attempts], [1, 1]);
  expect("sent_at 기록", Boolean(after.sent_at), true);
  expect("발송 3회(실패1 + 중복호출1 + 재발송1)", fetchImpl.calls.length, 3);
  expect("없는 알림 재발송은 null", notifier.retry(9999), null);
  db.close();
  rmSync(dir, { recursive: true, force: true });
}

console.log("\n[9] fetch 가 던져도 문의 접수는 안전");
{
  const { db, dir } = freshDb();
  const inquiry = insertInquiry(db);
  const { notifier } = makeNotifier(db, { ...WEBHOOK_ENV, NOTIFY_RETRY_DELAYS_MS: "5", NOTIFY_MAX_ATTEMPTS: "2" }, () => ({ throw: new Error("socket hang up") }));
  expect("notifyInquiry 는 예외를 던지지 않는다", Array.isArray(notifier.notifyInquiry(inquiry)), true);
  await waitFor("실패 기록", () => rowsOf(db, inquiry.id)[0]?.status === "failed");
  expect("사유 저장", String(rowsOf(db, inquiry.id)[0].last_error).includes("socket hang up"), true);
  db.close();
  rmSync(dir, { recursive: true, force: true });
}

// ── 실제 서버 종단 경로 ────────────────────────────────────────

async function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

/** 문의를 저장하고 200 을 돌려주는 로컬 수신기(웹훅 + Resend 흉내). */
async function startReceiver() {
  const state = { mode: "ok", hooks: [], emails: [], auth: [] };
  const server = createHttpServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const ok = state.mode === "ok";
      if (req.url.startsWith("/hook")) state.hooks.push({ body, at: Date.now() });
      if (req.url.startsWith("/resend")) {
        state.emails.push({ body, at: Date.now() });
        state.auth.push(req.headers.authorization || "");
      }
      res.writeHead(ok ? 200 : 500, { "Content-Type": "application/json" });
      res.end(ok ? JSON.stringify({ ok: true }) : JSON.stringify({ message: "boom" }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  state.port = server.address().port;
  state.close = () => new Promise((resolve) => server.close(resolve));
  return state;
}

/**
 * 어드민 화면(admin-v2 커밋 번들)을 jsdom 에서 실제로 열어 문의 목록의 알림 배지·다시 보내기 버튼을 본다.
 * jsdom 이 설치되어 있지 않으면(의존성 없이 `npm test` 만 돌린 경우) null 을 돌려주고 건너뛴다.
 */
async function openInquiriesUi(origin, token) {
  let JSDOM, VirtualConsole;
  try {
    ({ JSDOM, VirtualConsole } = await import("jsdom"));
  } catch {
    console.log("  – jsdom 이 없어 어드민 UI 확인은 건너뜁니다 (npm ci 후 실행하면 검사됩니다)");
    return null;
  }
  const html = await (await fetch(`${origin}/admin-v2`)).text();
  const bundleMatch = html.match(/<script type="module"[^>]*>([\s\S]*?)<\/script>/);
  if (!bundleMatch) throw new Error("admin-v2 번들을 찾지 못했습니다");
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => console.error("[jsdom]", error.message));
  const dom = new JSDOM(html, {
    url: `${origin}/admin-v2/admin/inquiries`,
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.fetch = (url, init) => fetch(new URL(String(url), `${origin}/`).href, init);
      try {
        window.localStorage.setItem("cuberry-admin-token", token);
      } catch {
        /* ignore */
      }
      window.matchMedia = (query) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false });
      window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      if (!window.Element.prototype.scrollIntoView) window.Element.prototype.scrollIntoView = () => {};
      window.HTMLElement.prototype.hasPointerCapture = () => false;
      window.HTMLElement.prototype.setPointerCapture = () => {};
      window.HTMLElement.prototype.releasePointerCapture = () => {};
    },
  });
  dom.window.eval(bundleMatch[1]);
  const doc = dom.window.document;
  await waitFor("문의 목록 화면", () => doc.body.textContent.includes("Project conversations"), 10_000);
  await waitFor("알림 배지", () => [...doc.querySelectorAll("span")].some((el) => el.textContent.trim().startsWith("알림")), 10_000);
  return {
    text: () => doc.body.textContent,
    failedBadges: () => [...doc.querySelectorAll("span")].filter((el) => el.textContent.trim().startsWith("알림 실패")).length,
    clickRetry() {
      const button = [...doc.querySelectorAll("button")].find((el) => el.textContent.includes("다시 보내기"));
      if (!button) return false;
      button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
      return true;
    },
    close: () => dom.window.close(),
  };
}

async function withServer({ label, env = {} }, handle) {
  const port = await freePort();
  const dataDir = mkdtempSync(path.join(tmpdir(), "cuberry-notify-e2e-"));
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["--experimental-sqlite", path.join(ROOT, "server", "index.mjs")], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      PUBLIC_ORIGIN: "https://cuberry.example.com",
      RENDER_EXTERNAL_URL: "",
      ADMIN_ALLOWED_ORIGINS: "",
      ADMIN_PASSWORD: "",
      NOTIFY_WEBHOOK_URL: "",
      NOTIFY_EMAIL_TO: "",
      RESEND_API_KEY: "",
      RESEND_API_BASE: "",
      NOTIFY_DISABLED: "",
      NOTIFY_MASK_CONTACT: "",
      NOTIFY_RETRY_DELAYS_MS: "",
      NOTIFY_MAX_ATTEMPTS: "",
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
      if ((await fetch(`${origin}/api/health`)).ok) break;
    } catch {}
    if (child.exitCode !== null) throw new Error(`${label}: 서버가 시작 중 종료됨\n${logs.join("")}`);
    if (Date.now() - started > 30_000) throw new Error(`${label}: 서버 시작 시간 초과\n${logs.join("")}`);
    await sleep(100);
  }

  const login = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  const { token } = await login.json();
  const auth = { "content-type": "application/json", authorization: `Bearer ${token}` };
  const getJson = async (route) => (await fetch(`${origin}${route}`, { headers: auth })).json();

  try {
    await handle({ origin, auth, getJson, logs, token });
  } finally {
    child.kill("SIGTERM");
    await sleep(150);
    if (child.exitCode === null) child.kill("SIGKILL");
    rmSync(dataDir, { recursive: true, force: true });
  }
}

const postInquiry = (origin, body) =>
  fetch(`${origin}/api/partnership`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const inquiryPayload = {
  contactName: "홍길동",
  email: "hong@gmail.com",
  phone: "010-1234-5678",
  company: "가나다컴퍼니",
  projectType: "AI 광고",
  budget: "500만원 이상",
  brief: "숏폼 광고 문의드립니다. 자세한 상담 부탁드려요.",
};

console.log("\n[10] 실제 서버 — 접수 → 웹훅·이메일 발송 → 어드민 배지 → 다시 보내기");
{
  const receiver = await startReceiver();
  await withServer(
    {
      label: "종단",
      env: {
        NOTIFY_WEBHOOK_URL: `http://127.0.0.1:${receiver.port}/hook`,
        RESEND_API_KEY: "re_test",
        NOTIFY_EMAIL_TO: "ops@cuberry.ai",
        RESEND_API_BASE: `http://127.0.0.1:${receiver.port}/resend`,
        NOTIFY_RETRY_DELAYS_MS: "20,40",
        NOTIFY_MAX_ATTEMPTS: "2",
      },
    },
    async ({ origin, auth, getJson, token }) => {
      const response = await postInquiry(origin, inquiryPayload);
      expect("문의 접수 200", response.status, 200);
      const { id, inquiryId } = await response.json();
      expect("문의 코드/ID", [id, inquiryId], ["CB-0001", 1]);

      await waitFor("알림 발송 완료", async () => (await getJson("/api/admin/content")).inquiries[0]?.notificationStatus === "sent");
      const content = await getJson("/api/admin/content");
      const inquiry = content.inquiries[0];
      expect("문의는 그대로 저장", [inquiry.code, inquiry.status, inquiry.email], ["CB-0001", "new", "hong@gmail.com"]);
      expect("배지 상태", inquiry.notificationStatus, "sent");
      expect("배지에 재발송 대상 id 포함", Number.isInteger(inquiry.notificationId), true);

      const list = await getJson("/api/admin/notifications");
      expect("채널 2개(webhook/email)", list.notifications.map((item) => item.channel).sort(), ["email", "webhook"]);
      expect("둘 다 sent", list.notifications.map((item) => item.status), ["sent", "sent"]);
      expect("설정된 채널 목록", list.channels, ["webhook", "email"]);
      expect("실패 목록은 비어 있음", (await getJson("/api/admin/notifications?status=failed")).notifications.length, 0);

      expect("웹훅 수신", receiver.hooks.length, 1);
      expect("웹훅 본문에 코드", String(JSON.parse(receiver.hooks[0].body).text).includes("CB-0001"), true);
      expect("웹훅 본문에 어드민 링크", String(JSON.parse(receiver.hooks[0].body).text).includes("https://cuberry.example.com/admin-v2"), true);
      expect("이메일 수신 + Bearer", [receiver.emails.length, receiver.auth[0]], [1, "Bearer re_test"]);
      expect("이메일 Reply-To = 문의자", JSON.parse(receiver.emails[0].body).reply_to, "hong@gmail.com");

      const summary = await getJson("/api/admin/summary");
      expect("개요에 채널·마지막 발송", [summary.notifyChannels, Boolean(summary.lastNotificationAt), summary.failedNotifications], [["webhook", "email"], true, 0]);

      // 실패 경로 — 웹훅 수신기를 죽여놓고 두 번째 문의
      receiver.mode = "fail";
      const failedResponse = await postInquiry(origin, { ...inquiryPayload, contactName: "김실패", email: "fail@cuberry.ai", brief: "실패 경로" });
      expect("실패해도 문의 접수는 200", failedResponse.status, 200);
      const failedCode = (await failedResponse.json()).id;
      const failedInquiry = await waitFor("실패 배지", async () =>
        (await getJson("/api/admin/content")).inquiries.find((item) => item.code === failedCode && item.notificationStatus === "failed"),
      );
      expect("문의는 저장되어 있음", failedInquiry.email, "fail@cuberry.ai");
      expect("실패 사유 노출", String(failedInquiry.notificationError).includes("500"), true);

      // 두 채널(웹훅·이메일)이 각각 백오프를 소진하고 실패로 확정될 때까지 기다린다.
      await waitFor("두 채널 모두 실패 확정", async () => (await getJson("/api/admin/notifications?status=failed")).notifications.length === 2);
      const failedList = await getJson("/api/admin/notifications?status=failed");
      expect("실패 2건(웹훅+이메일)", failedList.notifications.length, 2);
      expect("시도 횟수 기록", failedList.notifications.every((item) => item.attempts === 2), true);

      const webhookFailed = failedList.notifications.find((item) => item.channel === "webhook");
      const emailFailed = failedList.notifications.find((item) => item.channel === "email");

      // 어드민 화면에서 배지가 그려지고, "다시 보내기" 버튼이 실제로 재발송하는지 (수신기를 살려둔 채 클릭)
      receiver.mode = "ok";
      const ui = await openInquiriesUi(origin, token);
      if (ui) {
        expect("실패 문의에 배지 1개", ui.failedBadges(), 1);
        expect("실패 사유가 화면에 보임", ui.text().includes("알림 실패:"), true);
        expect("다시 보내기 버튼 클릭", ui.clickRetry(), true);
        await waitFor("UI 재발송 성공", async () => (await getJson("/api/admin/notifications")).notifications.find((item) => item.id === webhookFailed.id)?.status === "sent");
        ui.close();
      }

      const retryOf = async (notificationId, channel) => {
        const response = await fetch(`${origin}/api/admin/notifications/${notificationId}/retry`, { method: "POST", headers: auth, body: "{}" });
        expect(`${channel} 재발송 API 200`, response.status, 200);
        const body = await response.json();
        expect(`${channel} attempts 초기화 응답`, [body.notification.channel, body.notification.attempts, body.notification.status], [channel, 0, "pending"]);
        await waitFor(`${channel} 재발송 성공`, async () => {
          const row = (await getJson("/api/admin/notifications")).notifications.find((item) => item.id === notificationId);
          return row?.status === "sent";
        });
      };
      await retryOf(emailFailed.id, "email");
      const afterRows = (await getJson("/api/admin/notifications")).notifications.filter((item) => item.inquiryCode === failedCode);
      expect("행은 2개 그대로(채널당 1개)", afterRows.length, 2);
      expect("재시도 후 모두 sent", afterRows.map((item) => item.status), ["sent", "sent"]);
      expect("재시도 후 배지도 sent", (await getJson("/api/admin/content")).inquiries.find((item) => item.code === failedCode).notificationStatus, "sent");
      expect("없는 알림 재발송 → 404", (await fetch(`${origin}/api/admin/notifications/9999/retry`, { method: "POST", headers: auth, body: "{}" })).status, 404);
    },
  );
  await receiver.close();
}

console.log("\n[11] 환경변수 미설정 서버 — 알림 행 0건 (기존 동작 그대로)");
{
  await withServer({ label: "알림 꺼짐" }, async ({ origin, getJson }) => {
    const response = await postInquiry(origin, inquiryPayload);
    expect("문의 접수 200", response.status, 200);
    await sleep(200);
    const content = await getJson("/api/admin/content");
    expect("알림 배지 없음", [content.inquiries.length, content.inquiries[0].notificationStatus, content.inquiries[0].notificationId], [1, "", 0]);
    expect("알림 목록 비어 있음", (await getJson("/api/admin/notifications")).notifications, []);
    expect("설정된 채널 없음", (await getJson("/api/admin/notifications")).channels, []);
    const summary = await getJson("/api/admin/summary");
    expect("개요는 off 상태", [summary.notifyChannels, summary.lastNotificationAt, summary.failedNotifications], [[], "", 0]);
  });
}

console.log(`\n결과: ${checks - failures}/${checks} 통과`);
if (failures) process.exitCode = 1;
