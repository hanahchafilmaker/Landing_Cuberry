// Phase 3 · seed.json 백업 자동화 종단 테스트 (설계: docs/ops-hardening-plan.md §5.6)
//
// 외부로 요청이 한 건도 나가지 않도록 **목 GitHub API** 를 로컬에서 띄우고
// (GITHUB_API_BASE 오버라이드) 실제 서버를 그대로 띄워 크론 백업을 확인한다.
//
//   1. CRON_SECRET 미설정 → 503, GitHub 호출 0건
//   2. 틀린 시크릿 → 401, GitHub 호출 0건 (아주 긴 값도 500 이 아닌 401)
//   3. 올바른 시크릿 + 내용 변화 → 커밋 1회 (본문 · 메시지 · base64 디코드까지 확인)
//   4. 즉시 재호출 → skipped: "no-change", GitHub 요청 0건 (무한 재배포 방지의 핵심)
//   5. 콘텐츠가 바뀌면 다시 커밋 1회
//   6. 어드민 수동 백업도 해시를 기록 → 이어지는 크론은 건너뛴다
//   7. GITHUB_TOKEN 미설정 → 503 (워크플로가 실패해야 GitHub 이 소유자에게 메일로 알린다)
//   8. GET /api/cron/backup 은 백업을 트리거하지 않는다(세션 필요 → 401)
//   (+) summary.lastBackupAt/lastBackupHash, 해시·시크릿 비교 단위 검증
//
// 실행: npm run test:cron  (npm test 에 포함되어 있다)
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createServer as createTcpServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedHash, safeSecretEqual, stableStringify } from "../server/lib/backup.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASSWORD = "cuberry2026";
const SECRET = "test-cron-secret-0123456789abcdef";

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
    const probe = createTcpServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

// 목 GitHub Contents API — 파일 조회(GET)와 커밋(PUT)만 흉내낸다.
// 실제 저장소에 커밋하지 않고도 "몇 번 불렀는지 · 무엇을 보냈는지"를 그대로 볼 수 있다.
function startMockGitHub() {
  const state = { sha: "sha-initial", failPut: false };
  const requests = [];
  const server = createHttpServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      requests.push({ method: req.method, url: req.url, body });
      const json = (status, payload) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(payload));
      };
      if (req.method === "GET") return json(200, { sha: state.sha, content: "", encoding: "base64" });
      if (req.method === "PUT") {
        if (state.failPut) return json(500, { message: "목 서버 강제 실패" });
        const payload = JSON.parse(body);
        // 본문의 content(seed.json base64)가 곧 커밋될 파일이다.
        const content = Buffer.from(payload.content, "base64").toString("utf8");
        const decoded = JSON.parse(content);
        state.sha = `sha-${requests.filter((request) => request.method === "PUT").length}`;
        requests[requests.length - 1].decoded = decoded;
        requests[requests.length - 1].raw = content;
        return json(200, { commit: { sha: state.sha, html_url: `https://github.com/mock/commit/${state.sha}` } });
      }
      json(405, { message: "지원하지 않는 메서드" });
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        requests,
        state,
        puts: () => requests.filter((request) => request.method === "PUT"),
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

async function withServer({ label, env = {} }, handle) {
  const port = await freePort();
  const dataDir = mkdtempSync(path.join(tmpdir(), "cuberry-cron-"));
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
      // 백업 관련 값은 케이스마다 "없는 상태" 를 기본으로 깐다.
      CRON_SECRET: "",
      GITHUB_API_BASE: "",
      GITHUB_TOKEN: "",
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = [];
  child.stdout.on("data", (chunk) => logs.push(String(chunk)));
  child.stderr.on("data", (chunk) => logs.push(String(chunk)));

  const ready = Date.now() + 15000;
  for (;;) {
    try {
      const health = await fetch(`${origin}/api/health`);
      if (health.ok) break;
    } catch {
      /* 아직 기동 중 */
    }
    if (Date.now() > ready) throw new Error(`서버 기동 실패 (${label})\n${logs.join("")}`);
    await sleep(100);
  }

  try {
    await handle({ origin, logs });
  } finally {
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill("SIGTERM");
    await Promise.race([exited, sleep(3000)]);
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    rmSync(dataDir, { recursive: true, force: true });
  }
}

async function adminLogin(origin) {
  const res = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  const body = await res.json();
  return { token: body.token, headers: { authorization: `Bearer ${body.token}` } };
}

const trigger = async (origin, secret = SECRET) =>
  fetch(`${origin}/api/cron/backup`, {
    method: "POST",
    headers: secret === null ? {} : { "x-cron-secret": secret },
  });

// ── 0. 순수 함수 단위 검증 (서버 없이) ─────────────────────────────────
console.log("[0] 해시 · 시크릿 비교 단위 검증");
{
  const base = { exportedAt: "2026-10-14T00:00:00.000Z", settings: { brandName: "Cuberry" }, services: [{ id: 1, name: "A" }] };
  const later = { ...base, exportedAt: "2026-10-14T06:00:00.000Z" };
  expect("exportedAt 이 달라도 해시 동일", seedHash(base) === seedHash(later), true);
  // 키 순서가 뒤집혀도(JSON.stringify 는 순서를 그대로 쓴다) 같은 값이어야 무한 재배포를 막을 수 있다.
  const reordered = { services: [{ name: "A", id: 1 }], settings: { brandName: "Cuberry" }, exportedAt: base.exportedAt };
  expect("키 순서가 달라도 해시 동일", seedHash(base) === seedHash(reordered), true);
  expect("내용이 바뀌면 해시도 바뀜", seedHash({ ...later, settings: { brandName: "Other" } }) === seedHash(later), false);
  expect("해시는 64자 hex", /^[0-9a-f]{64}$/.test(seedHash(base)), true);
  expect("stableStringify — 배열 순서는 유지", stableStringify([1, "a", null]), '[1,"a",null]');
  expect("stableStringify — 객체 키 정렬", stableStringify({ b: 1, a: 2 }), '{"a":2,"b":1}');

  expect("시크릿 동일 → true", safeSecretEqual(SECRET, SECRET), true);
  expect("시크릿 다름(같은 길이) → false", safeSecretEqual("x".repeat(SECRET.length), SECRET), false);
  expect("아주 긴 값 → false(예외 없음)", safeSecretEqual("x".repeat(100000), SECRET), false);
  expect("빈 값 → false", safeSecretEqual("", SECRET), false);
  expect("없는 헤더(undefined) → false", safeSecretEqual(undefined, SECRET), false);
}

// ── 1. CRON_SECRET 미설정 → 503, GitHub 호출 0건 ────────────────────────
console.log("\n[1] CRON_SECRET 미설정 → 503 (실수로 열린 크론 엔드포인트 방지)");
const mockA = await startMockGitHub();
try {
  await withServer(
    { label: "시크릿없음", env: { GITHUB_API_BASE: mockA.url, GITHUB_TOKEN: "gh_test" } },
    async ({ origin }) => {
      const res = await trigger(origin);
      expect("상태 503", res.status, 503);
      expect("안내 메시지", String((await res.json()).error).includes("CRON_SECRET"), true);
      expect("GitHub 호출 0건", mockA.requests.length, 0);
    },
  );
} finally {
  await mockA.close();
}

// ── 2. 틀린 시크릿 → 401, GitHub 호출 0건 ──────────────────────────────
console.log("\n[2] 틀린 시크릿 → 401 (헤더 없음 · 짧은 값 · 아주 긴 값 모두)");
const mockB = await startMockGitHub();
try {
  await withServer(
    { label: "틀린시크릿", env: { CRON_SECRET: SECRET, GITHUB_API_BASE: mockB.url, GITHUB_TOKEN: "gh_test" } },
    async ({ origin }) => {
      expect("헤더 없음 → 401", (await trigger(origin, null)).status, 401);
      expect("짧은 값 → 401", (await trigger(origin, "nope")).status, 401);
      expect("시크릿보다 긴 값 → 401", (await trigger(origin, "x".repeat(5000))).status, 401);
      // 헤더 자체가 Node 한계를 넘으면 파서가 먼저 431 로 끊는다. 어느 쪽이든 500 은 아니어야 한다.
      const huge = await trigger(origin, "x".repeat(200000));
      expect("헤더 한계 초과 → 431/401 (500 아님)", [401, 431].includes(huge.status), true);
      expect("GitHub 호출 0건", mockB.requests.length, 0);
    },
  );
} finally {
  await mockB.close();
}

// ── 3·4·5. 커밋 1회 → 무변경 skip → 내용 변경 시 다시 커밋 ──────────────
console.log("\n[3] 올바른 시크릿 + 첫 백업 → 커밋 1회");
const mockC = await startMockGitHub();
try {
  await withServer(
    {
      label: "백업",
      env: { CRON_SECRET: SECRET, GITHUB_API_BASE: mockC.url, GITHUB_TOKEN: "gh_test", GITHUB_REPOSITORY: "mock/repo", GITHUB_BRANCH: "main" },
    },
    async ({ origin, logs }) => {
      const admin = await adminLogin(origin);

      const first = await trigger(origin);
      const firstBody = await first.json();
      expect("상태 200", first.status, 200);
      expect("ok", firstBody.ok, true);
      expect("skipped 아님", firstBody.skipped, null);
      expect("커밋 sha 반환", typeof firstBody.commitSha === "string" && firstBody.commitSha.length > 0, true);
      expect("커밋 URL 반환", String(firstBody.commitUrl).includes("github.com/mock/commit/"), true);
      expect("PUT 1건", mockC.puts().length, 1);
      expect("GET 1건(현재 sha 조회)", mockC.requests.filter((r) => r.method === "GET").length, 1);

      const put = mockC.puts()[0];
      expect("경로가 seed.json", put.url.includes("/repos/mock/repo/contents/server/seed.json"), true);
      expect("branch 지정", JSON.parse(put.body).branch, "main");
      expect("내용이 바뀐 문의/콘텐츠 백업본", Array.isArray(put.decoded.inquiries), true);
      expect("settings 포함", typeof put.decoded.settings?.brandName, "string");
      expect("exportedAt 포함(사람이 읽는 시각)", typeof put.decoded.exportedAt, "string");
      expect("커밋 메시지에 backup", String(JSON.parse(put.body).message).includes("admin backup"), true);
      expect("hash 반환 = seedHash", firstBody.hash, seedHash(put.decoded));
      expect("로그에 백업 완료", logs.join("").includes("[cron] 백업 완료"), true);

      // ── 4. 즉시 재호출 → 무변경이면 GitHub 을 아예 부르지 않는다 ──
      console.log("\n[4] 즉시 재호출 → skipped: no-change · GitHub 0건 (무한 재배포 방지)");
      const before = mockC.requests.length;
      const second = await trigger(origin);
      const secondBody = await second.json();
      expect("상태 200", second.status, 200);
      expect("skipped = no-change", secondBody.skipped, "no-change");
      expect("해시 동일", secondBody.hash, firstBody.hash);
      expect("추가 GitHub 요청 0건", mockC.requests.length - before, 0);
      expect("PUT 총 1건 그대로", mockC.puts().length, 1);
      expect("로그에 건너뜀", logs.join("").includes("[cron] 백업 건너뜀(변경 없음)"), true);

      // ── 5. 콘텐츠를 바꾸면 다시 커밋 ──
      console.log("\n[5] 콘텐츠 변경 후 재호출 → 다시 커밋 1회");
      const content = await (await fetch(`${origin}/api/admin/content`, { headers: admin.headers })).json();
      const put2 = await fetch(`${origin}/api/admin/settings`, {
        method: "PUT",
        headers: { "content-type": "application/json", ...admin.headers },
        body: JSON.stringify({ ...content.settings, heroTitle: "크론 백업 테스트 제목" }),
      });
      expect("설정 저장 200", put2.status, 200);

      const third = await trigger(origin);
      const thirdBody = await third.json();
      expect("상태 200", third.status, 200);
      expect("다시 커밋됨", thirdBody.skipped, null);
      expect("해시가 달라짐", thirdBody.hash === firstBody.hash, false);
      expect("PUT 총 2건", mockC.puts().length, 2);
      expect("커밋 본문에 새 제목", mockC.puts()[1].decoded.settings.heroTitle, "크론 백업 테스트 제목");

      // ── 6. 어드민 수동 백업 → 해시 기록 → 이어지는 크론은 건너뛴다 ──
      console.log("\n[6] 어드민 수동 백업은 항상 커밋하고, 크론은 그 뒤를 건너뛴다");
      const manual = await fetch(`${origin}/api/admin/github-backup`, { method: "POST", headers: admin.headers });
      expect("수동 백업 200", manual.status, 200);
      expect("무변경이어도 커밋(명시적 요청)", mockC.puts().length, 3);
      const afterManual = await trigger(origin);
      expect("이어지는 크론은 skip", (await afterManual.json()).skipped, "no-change");
      expect("PUT 은 3건 그대로", mockC.puts().length, 3);

      // ── (+) 개요 화면이 읽는 summary ──
      const summary = await (await fetch(`${origin}/api/admin/summary`, { headers: admin.headers })).json();
      expect("summary.lastBackupHash", summary.lastBackupHash, thirdBody.hash);
      expect("summary.lastBackupAt 형식", /^\d{4}-\d{2}-\d{2}T/.test(String(summary.lastBackupAt)), true);

      // ── 8. GET 으로는 백업이 돌지 않는다 ──
      const getRes = await fetch(`${origin}/api/cron/backup`, { headers: { "x-cron-secret": SECRET } });
      expect("GET → 401 (세션 없음)", getRes.status, 401);
      expect("GET 은 커밋하지 않음", mockC.puts().length, 3);
    },
  );
} finally {
  await mockC.close();
}

// ── 7. GitHub 토큰 미설정 → 503 (워크플로 실패 → GitHub 이 메일로 알림) ──
console.log("\n[7] GITHUB_TOKEN 미설정 → 503 · 해시를 기록하지 않아 토큰 등록 후 다시 커밋");
const mockD = await startMockGitHub();
try {
  await withServer(
    { label: "토큰없음", env: { CRON_SECRET: SECRET, GITHUB_API_BASE: mockD.url } },
    async ({ origin }) => {
      const res = await trigger(origin);
      expect("상태 503", res.status, 503);
      expect("GitHub 호출 0건", mockD.requests.length, 0);
      // 실패한 백업은 성공으로 기록되면 안 된다 — 실제로 기록되었는지 summary 로 확인한다.
      const admin = await adminLogin(origin);
      const summary = await (await fetch(`${origin}/api/admin/summary`, { headers: admin.headers })).json();
      expect("lastBackupAt 없음", summary.lastBackupAt, null);
      expect("lastBackupHash 없음", summary.lastBackupHash, null);
    },
  );
} finally {
  await mockD.close();
}

// ── (+) GitHub 이 500 을 주면 커밋 실패가 그대로 드러나고 해시는 남지 않는다 ──
console.log("\n[+] GitHub PUT 실패 → 502 · 성공으로 기록되지 않음");
const mockE = await startMockGitHub();
mockE.state.failPut = true;
try {
  await withServer(
    { label: "커밋실패", env: { CRON_SECRET: SECRET, GITHUB_API_BASE: mockE.url, GITHUB_TOKEN: "gh_test", GITHUB_REPOSITORY: "mock/repo" } },
    async ({ origin }) => {
      const res = await trigger(origin);
      expect("상태 502", res.status, 502);
      expect("PUT 1건 시도", mockE.puts().length, 1);
      const admin = await adminLogin(origin);
      const summary = await (await fetch(`${origin}/api/admin/summary`, { headers: admin.headers })).json();
      expect("실패한 백업은 hash 를 남기지 않음", summary.lastBackupHash, null);
    },
  );
} finally {
  await mockE.close();
}

console.log(`\n결과: ${checks - failures}/${checks} 통과`);
if (failures) process.exitCode = 1;
