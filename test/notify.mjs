// Phase 1 · 문의 알림 종단 테스트 (설계: docs/ops-hardening-plan.md §3.7)
//
// 외부로 요청이 한 건도 나가지 않도록, 목 웹훅/목 Resend 서버를 로컬에서
// 띄우고 실제 서버(server/index.mjs, 저장소 밖 임시 DATA_DIR)를 그대로 띄워
// 문의 접수 → 알림 발송 → 실패 재시도 → 어드민 재발송까지 확인한다.
//
//   1. 웹훅 성공 → notifications.status = 'sent', attempts = 1
//   2. 웹훅 500 1회 → 백오프 재시도 후 'sent', attempts = 2 (간격 준수)
//   3. 계속 실패 → 'failed' + last_error, 문의 접수는 200 · DB 에 남음
//   4. UNIQUE 중복 방지 — 재발송 API 를 여러 번 호출해도 행은 1개, 시도만 증가
//   5. env 미설정 → 알림 행이 아예 생성되지 않고 기존 동작과 동일
//   6. NOTIFY_DISABLED=1 → 발송 0건
//   7. NOTIFY_MASK_CONTACT=1 → 웹훅 본문에 원본 이메일·전화가 없음
//   (+) 이메일(Resend) 채널, 인증(401), status 필터, summary.lastNotification
//
// 실행: npm run test:notify  (npm test 에 포함되어 있다)
import { spawn } from "node:child_process";
import { createServer as createHttpServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer as createTcpServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { maskEmail, maskPhone, parseRetryDelays, webhookText } from "../server/lib/notify.mjs";

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
async function until(label, probe, timeout = 8000) {
  const started = Date.now();
  for (;;) {
    const value = await probe();
    if (value) return value;
    if (Date.now() - started > timeout) throw new Error(`${label} 시간 초과`);
    await sleep(50);
  }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createTcpServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

// 목 엔드포인트 — 받은 요청을 기록하고 상태에 따라 500 을 반환한다.
function startMock() {
  const state = { failNext: 0, alwaysFail: false };
  const requests = [];
  const server = createHttpServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      requests.push({ at: Date.now(), url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString("utf8") });
      const fail = state.alwaysFail || state.failNext > 0;
      if (state.failNext > 0) state.failNext -= 1;
      if (fail) {
        res.writeHead(500);
        res.end("mock failure");
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"ok":true}');
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}/hook`,
        requests,
        state,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

// 서버를 띄우고 헬스체크가 응답할 때까지 기다린 뒤 handle() 을 돌려준다.
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
      PUBLIC_ORIGIN: "",
      RENDER_EXTERNAL_URL: "",
      ADMIN_ALLOWED_ORIGINS: "",
      ADMIN_PASSWORD: "",
      RESET_ADMIN_PASSWORD: "",
      // 알림 환경변수는 매 케이스마다 "없는 상태" 를 기본값으로 깐다.
      NOTIFY_WEBHOOK_URL: "",
      NOTIFY_EMAIL_TO: "",
      RESEND_API_KEY: "",
      RESEND_API_URL: "",
      NOTIFY_EMAIL_FROM: "",
      NOTIFY_MASK_CONTACT: "",
      NOTIFY_DISABLED: "",
      NOTIFY_RETRY_DELAYS_MS: "",
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

async function adminLogin(origin) {
  const response = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  const session = await response.json();
  if (!session.token) throw new Error(`로그인 실패: ${JSON.stringify(session)}`);
  return { token: session.token, headers: { "content-type": "application/json", authorization: `Bearer ${session.token}` } };
}

async function sendInquiry(origin, overrides = {}) {
  const response = await fetch(`${origin}/api/partnership`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contactName: "홍길동",
      email: "hong.gildong@example.com",
      company: "가나다컴퍼니",
      phone: "010-1234-5678",
      projectType: "AI 광고",
      budget: "500만원 이상",
      brief: "상담 요청 테스트 본문입니다.",
      ...overrides,
    }),
  });
  return { status: response.status, body: await response.json() };
}

const listNotifications = async (origin, headers, search = "") =>
  (await fetch(`${origin}/api/admin/notifications${search}`, { headers })).json();

async function inquiryNotification(origin, headers, inquiryId) {
  const rows = (await listNotifications(origin, headers)).notifications ?? [];
  return rows.filter((row) => row.inquiryId === inquiryId);
}

// ── [0] 순수 함수 단위 확인 (서버 없음) ────────────────────────────────
console.log("\n[0] 알림 순수 함수 (마스킹 · 백오프 설정)");
expect("기본 백오프 1s → 5s → 25s", parseRetryDelays(undefined), [1000, 5000, 25000]);
expect("커스텀 백오프 파싱", parseRetryDelays("100, 200 ,300"), [100, 200, 300]);
expect("잘못된 값은 기본값으로", parseRetryDelays("abc,-5,"), [1000, 5000, 25000]);
expect("이메일 마스킹", maskEmail("hong.gildong@example.com"), "ho***@example.com");
expect("전화 마스킹", maskPhone("010-1234-5678"), "010-****-5678");
const maskedText = webhookText(
  { code: "CB-0001", name: "홍길동", company: "가나다컴퍼니", projectType: "AI 광고", budget: "500만원 이상", email: "hong.gildong@example.com", phone: "010-1234-5678", message: "안녕하세요" },
  { maskContact: true, publicOrigin: "https://example.test", port: 8080 },
);
expect("웹훅 본문에 문의 코드", maskedText.includes("CB-0001"), true);
expect("웹훅 본문에 마스킹 이메일", maskedText.includes("ho***@example.com"), true);
expect("웹훅 본문에 마스킹 전화", maskedText.includes("010-****-5678"), true);
expect("웹훅 본문에 원본 이메일 없음", maskedText.includes("hong.gildong@example.com"), false);
expect("웹훅 본문에 어드민 링크", maskedText.includes("https://example.test/admin-v2"), true);

// ── [5] env 미설정 → 알림 행 아예 없음 (기존 동작과 동일) ─────────────
console.log("\n[5] env 미설정 → 알림 행이 아예 생성되지 않는다");
await withServer({ label: "미설정" }, async ({ origin }) => {
  const admin = await adminLogin(origin);
  const sent = await sendInquiry(origin);
  expect("문의 접수 200", sent.status, 200);
  const rows = await listNotifications(origin, admin.headers);
  expect("알림 행 0건", rows.notifications.length, 0);
  const content = await (await fetch(`${origin}/api/admin/content`, { headers: admin.headers })).json();
  expect("문의는 정상 저장", content.inquiries.length > 0, true);
  expect("notificationStatus = null (배지 없음)", content.inquiries[0].notificationStatus, null);
});

// ── [1] 웹훅 성공 · [2] 500 1회 → 재시도 ──────────────────────────────
console.log("\n[1][2] 웹훅 성공 → sent / 500 1회 → 백오프 재시도 후 sent");
const mockB = await startMock();
try {
  await withServer(
    {
      label: "성공",
      env: {
        NOTIFY_WEBHOOK_URL: mockB.url,
        NOTIFY_RETRY_DELAYS_MS: "400,800,1200",
        PUBLIC_ORIGIN: "https://cuberry.example",
      },
    },
    async ({ origin }) => {
      const admin = await adminLogin(origin);

      const first = await sendInquiry(origin);
      expect("문의 1 접수 200", first.status, 200);
      const firstRow = await until("첫 알림 발송 대기", async () => {
        const rows = await inquiryNotification(origin, admin.headers, first.body.inquiryId);
        return rows[0]?.status === "sent" ? rows[0] : null;
      });
      expect("성공 → status sent", firstRow.status, "sent");
      expect("성공 → attempts 1", firstRow.attempts, 1);
      expect("sent_at 기록", typeof firstRow.sentAt, "string");

      expect("웹훅 요청 1건 도착", mockB.requests.length, 1);
      const firstBody = mockB.requests[0].body;
      expect("본문에 코드", firstBody.includes(first.body.id), true);
      expect("본문에 담당자", firstBody.includes("홍길동"), true);
      expect("마스킹 없으면 원본 이메일 노출", firstBody.includes("hong.gildong@example.com"), true);
      expect("PUBLIC_ORIGIN 기반 어드민 링크", firstBody.includes("https://cuberry.example/admin-v2"), true);
      expect("blocks 포함(Slack)", firstBody.includes('"blocks"'), true);

      // 두 번째 문의: 500 1회 → 재시도 성공
      mockB.state.failNext = 1;
      const second = await sendInquiry(origin);
      const secondRow = await until("재시도 발송 대기", async () => {
        const rows = await inquiryNotification(origin, admin.headers, second.body.inquiryId);
        return rows[0]?.status === "sent" ? rows[0] : null;
      });
      expect("재시도 후 status sent", secondRow.status, "sent");
      expect("재시도 후 attempts 2", secondRow.attempts, 2);
      const secondRequests = mockB.requests.filter((request) => request.body.includes(second.body.id));
      expect("웹훅 호출 2회", secondRequests.length, 2);
      const gap = secondRequests[1].at - secondRequests[0].at;
      expect(`백오프 간격 준수(≥350ms, 실제 ${gap}ms)`, gap >= 350, true);

      // 어드민 표시용 파생 값
      const content = await (await fetch(`${origin}/api/admin/content`, { headers: admin.headers })).json();
      const saved = content.inquiries.find((item) => item.id === first.body.inquiryId);
      expect("notificationStatus = sent", saved.notificationStatus, "sent");
      const summary = await (await fetch(`${origin}/api/admin/summary`, { headers: admin.headers })).json();
      expect("summary.lastNotification.status", summary.lastNotification?.status, "sent");
      expect("summary.lastNotification.code", summary.lastNotification?.inquiryCode, second.body.id);
    },
  );
} finally {
  await mockB.close();
}

// ── [7] NOTIFY_MASK_CONTACT=1 ─────────────────────────────────────────
console.log("\n[7] NOTIFY_MASK_CONTACT=1 → 웹훅 본문에 원본 연락처 없음");
const mockC = await startMock();
try {
  await withServer(
    { label: "마스킹", env: { NOTIFY_WEBHOOK_URL: mockC.url, NOTIFY_MASK_CONTACT: "1", NOTIFY_RETRY_DELAYS_MS: "100,100,100" } },
    async ({ origin }) => {
      const admin = await adminLogin(origin);
      const sent = await sendInquiry(origin);
      await until("마스킹 알림 발송 대기", async () => {
        const rows = await inquiryNotification(origin, admin.headers, sent.body.inquiryId);
        return rows[0]?.status === "sent";
      });
      const body = mockC.requests[0]?.body ?? "";
      expect("원본 이메일 평문 없음", body.includes("hong.gildong@example.com"), false);
      expect("원본 전화 평문 없음", body.includes("010-1234-5678"), false);
      expect("마스킹 이메일 존재", body.includes("ho***@example.com"), true);
      expect("마스킹 전화 존재", body.includes("010-****-5678"), true);
    },
  );
} finally {
  await mockC.close();
}

// ── [3] 계속 실패 → failed · [4] UNIQUE · 재발송 API ───────────────────
console.log("\n[3][4] 계속 실패 → failed + last_error / 재발송 API (UNIQUE · 인증 · 필터)");
const mockD = await startMock();
try {
  await withServer(
    { label: "실패", env: { NOTIFY_WEBHOOK_URL: mockD.url, NOTIFY_RETRY_DELAYS_MS: "100,100,100" } },
    async ({ origin }) => {
      const admin = await adminLogin(origin);
      mockD.state.alwaysFail = true;

      const sent = await sendInquiry(origin);
      expect("알림이 실패해도 문의 접수는 200", sent.status, 200);
      const failedRow = await until("최종 실패 대기", async () => {
        const rows = await inquiryNotification(origin, admin.headers, sent.body.inquiryId);
        return rows[0]?.status === "failed" ? rows[0] : null;
      });
      expect("최종 status failed", failedRow.status, "failed");
      expect("초기 시도 1 + 재시도 3 = attempts 4", failedRow.attempts, 4);
      expect("last_error 저장", String(failedRow.lastError).includes("HTTP 500"), true);

      // 문의 자체는 그대로 남아 있다
      const content = await (await fetch(`${origin}/api/admin/content`, { headers: admin.headers })).json();
      const saved = content.inquiries.find((item) => item.id === sent.body.inquiryId);
      expect("문의는 DB 에 남아 있음", Boolean(saved), true);
      expect("notificationStatus = failed", saved.notificationStatus, "failed");

      // status 필터
      const failedList = await listNotifications(origin, admin.headers, "?status=failed");
      expect("status=failed 필터", failedList.notifications.length, 1);
      const sentList = await listNotifications(origin, admin.headers, "?status=sent");
      expect("status=sent 필터 (아직 없음)", sentList.notifications.length, 0);
      const badList = await fetch(`${origin}/api/admin/notifications?status=nope`, { headers: admin.headers });
      expect("잘못된 status → 400", badList.status, 400);

      // 인증 없이는 목록도 재발송도 볼 수 없다
      expect("목록 미인증 → 401", (await fetch(`${origin}/api/admin/notifications`)).status, 401);
      expect("재발송 미인증 → 401", (await fetch(`${origin}/api/admin/notifications/${failedRow.id}/retry`, { method: "POST" })).status, 401);

      // 재발송 두 번 → 행은 그대로 1개, 시도 횟수만 증가 (UNIQUE)
      await sleep(50); // 자동 재시도 루프가 닫히는 것을 기다린다
      const retry1 = await (await fetch(`${origin}/api/admin/notifications/${failedRow.id}/retry`, { method: "POST", headers: admin.headers })).json();
      expect("재발송 1 → 실패 유지", retry1.notification.status, "failed");
      const retry2 = await (await fetch(`${origin}/api/admin/notifications/${failedRow.id}/retry`, { method: "POST", headers: admin.headers })).json();
      expect("재발송 2 → attempts 증가", retry2.notification.attempts, retry1.notification.attempts + 1);
      const rowsAfter = await inquiryNotification(origin, admin.headers, sent.body.inquiryId);
      expect("UNIQUE — 행은 언제나 1개", rowsAfter.length, 1);

      // 목 서버가 살아나면 재발송이 성공한다
      mockD.state.alwaysFail = false;
      const retry3 = await (await fetch(`${origin}/api/admin/notifications/${failedRow.id}/retry`, { method: "POST", headers: admin.headers })).json();
      expect("복구 후 재발송 ok", retry3.ok, true);
      expect("재발송 성공 → sent", retry3.notification.status, "sent");
      const emptyFailed = await listNotifications(origin, admin.headers, "?status=failed");
      expect("실패 목록 비어 있음", emptyFailed.notifications.length, 0);
      const summary = await (await fetch(`${origin}/api/admin/summary`, { headers: admin.headers })).json();
      expect("마지막 알림 = sent", summary.lastNotification?.status, "sent");
    },
  );
} finally {
  await mockD.close();
}

// ── [6] NOTIFY_DISABLED=1 → 발송 0건 ──────────────────────────────────
console.log("\n[6] NOTIFY_DISABLED=1 → 발송 0건");
const mockE = await startMock();
try {
  await withServer(
    { label: "킬스위치", env: { NOTIFY_WEBHOOK_URL: mockE.url, NOTIFY_DISABLED: "1" } },
    async ({ origin }) => {
      const admin = await adminLogin(origin);
      const sent = await sendInquiry(origin);
      expect("문의 접수는 정상", sent.status, 200);
      await sleep(400);
      expect("웹훅 요청 0건", mockE.requests.length, 0);
      const rows = await listNotifications(origin, admin.headers);
      expect("알림 행도 0건", rows.notifications.length, 0);
    },
  );
} finally {
  await mockE.close();
}

// ── (+) 이메일(Resend) 채널 + 웹훅 동시 ───────────────────────────────
console.log("\n[+] 이메일 채널 (Resend 목 서버) — 웹훅과 함께 두 행");
const mockF = await startMock();
try {
  await withServer(
    {
      label: "이메일",
      env: {
        NOTIFY_WEBHOOK_URL: mockF.url,
        NOTIFY_EMAIL_TO: "ops1@cuberry.test, ops2@cuberry.test",
        RESEND_API_KEY: "re_test_key",
        RESEND_API_URL: mockF.url,
        NOTIFY_RETRY_DELAYS_MS: "100,100,100",
      },
    },
    async ({ origin }) => {
      const admin = await adminLogin(origin);
      const sent = await sendInquiry(origin);
      const rows = await until("두 채널 발송 대기", async () => {
        const list = await inquiryNotification(origin, admin.headers, sent.body.inquiryId);
        return list.length === 2 && list.every((row) => row.status === "sent") ? list : null;
      });
      expect("채널 2행 (webhook + email)", rows.map((row) => row.channel).sort(), ["email", "webhook"]);
      expect("email target = 수신자", rows.find((row) => row.channel === "email").target, "ops1@cuberry.test, ops2@cuberry.test");

      const emailRequest = mockF.requests.find((request) => request.headers.authorization?.includes("re_test_key"));
      expect("Resend 인증 헤더", Boolean(emailRequest), true);
      const emailBody = JSON.parse(emailRequest.body);
      expect("수신자 목록", emailBody.to, ["ops1@cuberry.test", "ops2@cuberry.test"]);
      expect("Reply-To = 문의자 이메일", emailBody.reply_to, "hong.gildong@example.com");
      expect("제목에 문의 코드", String(emailBody.subject).includes(sent.body.id), true);
      const webhookRequest = mockF.requests.find((request) => !request.headers.authorization);
      expect("웹훅도 함께 도착", Boolean(webhookRequest), true);
    },
  );
} finally {
  await mockF.close();
}

console.log(`\n결과: ${checks - failures}/${checks} 통과`);
if (failures) process.exitCode = 1;
