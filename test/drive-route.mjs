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
  assert.deepEqual(data.videos, [{ id: "mockvideo1234", name: "Mock video.mp4", resourceKey: "mockkey12345" }]);
  for (const secret of ["root_folder_12345", "childfolder123", "Do not expose folder", "Do not expose description", "local-test-token", "local-fake-private-key", "test-service@example.invalid"]) {
    assert.equal(text.includes(secret), false, `${secret} 공개 금지`);
  }
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
