// 실제 HTTP 공개 라우트와 Google Drive 조회 모듈을 함께 검증한다.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const value = probe.address().port;
    probe.close(() => resolve(value));
  });
});
const dataDir = mkdtempSync(path.join(tmpdir(), "cuberry-drive-test-"));
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["--import", path.join(root, "test/fixtures/google-drive-preload.mjs"), "--experimental-sqlite", path.join(root, "server/index.mjs")], {
  cwd: root,
  env: {
    ...process.env, PORT: String(port), DATA_DIR: dataDir, ADMIN_PASSWORD: "",
    GOOGLE_DRIVE_FOLDER_ID: "root_folder_12345",
    GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON: JSON.stringify({ type: "service_account", client_email: "test-service@example.invalid", private_key: "local-fake-private-key" }),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
child.stdout.on("data", (chunk) => { logs += String(chunk); });
child.stderr.on("data", (chunk) => { logs += String(chunk); });
try {
  const deadline = Date.now() + 15_000;
  for (;;) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {}
    if (child.exitCode !== null || Date.now() > deadline) throw new Error(`테스트 서버 시작 실패: ${logs}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const response = await fetch(`${base}/api/public/drive-portfolio`, { headers: { origin: "https://www.cuberry.kr" } });
  const text = await response.text();
  const data = JSON.parse(text);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://www.cuberry.kr");
  assert.equal(data.status, "ready");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(Object.keys(data).sort(), ["status", "updatedAt", "videos"]);
  assert.equal(data.videos.length, 1);
  const [video] = data.videos;
  assert.equal(video.id, "mockvideo1234");
  assert.equal(video.name, "Mock video.mp4");
  assert.equal(video.resourceKey, "mockkey12345");
  // 화면 분류용 필드 — 폴더 ID·이름 대신 공개 카테고리만 내려간다.
  assert.equal(video.category, "commercial");
  assert.equal(video.categoryLabel, "광고");
  assert.equal(typeof video.group, "string");
  assert.equal(typeof video.title, "string");
  assert.equal(video.aspect, "landscape");
  assert.equal(Object.keys(video).includes("folderId"), false);
  for (const secret of ["root_folder_12345", "childfolder123", "Do not expose description", "local-test-token", "local-fake-private-key", "test-service@example.invalid"]) {
    assert.equal(text.includes(secret), false, `${secret} 공개 금지`);
  }
  // 진단 라우트: 값이 정상일 때 configured 이고, 이메일은 마스킹되며 키는 나가지 않는다.
  const diagnoseResponse = await fetch(`${base}/api/public/drive-diagnose`);
  const diagnoseText = await diagnoseResponse.text();
  const diagnose = JSON.parse(diagnoseText);
  assert.equal(diagnoseResponse.status, 200);
  assert.equal(diagnose.configured, true);
  assert.equal(diagnose.folderIdValid, true);
  assert.equal(diagnose.serviceAccountParsed, true);
  assert.equal(diagnose.serviceAccountEmail, "tes***@example.invalid");
  assert.deepEqual(diagnose.reasons, []);
  assert.equal(diagnoseText.includes("local-fake-private-key"), false, "개인키는 진단에도 나가지 않는다");

  const content = await (await fetch(`${base}/api/public/content`)).json();
  assert.ok(content.portfolio.length > 0, "기존 일반 작품은 유지된다");
  assert.equal(content.portfolio.some((item) => item.source === "drive" || String(item.landingSlot || "").startsWith("drive-")), false, "일반 공개 API로 이전 Drive 메타데이터가 새지 않는다");
  console.log("[drive route] 모의 서비스 계정과 Drive API → 개별 영상만 HTTP에 공개");
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    if (child.exitCode !== null) resolve();
    else child.once("exit", resolve);
  });
  rmSync(dataDir, { recursive: true, force: true });
}
