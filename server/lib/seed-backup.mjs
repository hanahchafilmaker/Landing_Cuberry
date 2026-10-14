// Phase 3 백업 — GitHub 커밋 · 변경 감지 · 크론 실행.
// index.mjs 에서 그대로 옮겨온 파일이다(동작 변경 없음).
import { GITHUB_API_BASE, GITHUB_BRANCH, GITHUB_REPOSITORY, GITHUB_SEED_PATH, GITHUB_TOKEN } from "./config.mjs";
import { db, metaGet, metaSet, nowIso } from "./db.mjs";
import { LAST_BACKUP_AT_KEY, LAST_BACKUP_HASH_KEY, seedHash } from "./backup.mjs";
import { exportSeed } from "./content.mjs";

export async function backupSeedToGitHub() {
  if (!GITHUB_TOKEN) throw Object.assign(new Error("GitHub 백업이 설정되지 않았습니다. Render에 GITHUB_TOKEN을 등록해 주세요."), { status: 503 });
  if (!/^[^/]+\/[^/]+$/.test(GITHUB_REPOSITORY)) throw Object.assign(new Error("GITHUB_REPOSITORY 설정이 올바르지 않습니다."), { status: 503 });

  const apiPath = `${GITHUB_API_BASE}/repos/${GITHUB_REPOSITORY}/contents/${GITHUB_SEED_PATH}`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "cuberry-admin-backup",
  };
  const currentResponse = await fetch(`${apiPath}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, { headers });
  if (!currentResponse.ok) {
    const detail = await currentResponse.json().catch(() => ({}));
    throw Object.assign(new Error(`GitHub 파일 조회 실패: ${detail.message || currentResponse.status}`), { status: 502 });
  }
  const current = await currentResponse.json();
  const seed = exportSeed();
  const putResponse = await fetch(apiPath, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `content: admin backup ${seed.exportedAt.slice(0, 19).replace("T", " ")} UTC`,
      content: Buffer.from(`${JSON.stringify(seed, null, 2)}\n`, "utf8").toString("base64"),
      sha: current.sha,
      branch: GITHUB_BRANCH,
    }),
  });
  if (!putResponse.ok) {
    const detail = await putResponse.json().catch(() => ({}));
    throw Object.assign(new Error(`GitHub 백업 실패: ${detail.message || putResponse.status}`), { status: 502 });
  }
  const result = await putResponse.json();
  return {
    ok: true,
    repository: GITHUB_REPOSITORY,
    branch: GITHUB_BRANCH,
    commitUrl: result.commit?.html_url || "",
    commitSha: result.commit?.sha || "",
    message: "GitHub 백업을 완료했습니다. Render 자동 배포가 곧 시작됩니다.",
    // 아래 둘은 Phase 3(변경 감지)이 meta 에 기록해 두는 값이다. 어드민 화면은 무시한다.
    hash: seedHash(seed),
    changedAt: seed.exportedAt,
  };
}


export function recordBackup(result) {
  if (result?.hash) metaSet(LAST_BACKUP_HASH_KEY, result.hash);
  metaSet(LAST_BACKUP_AT_KEY, result?.changedAt || nowIso());
}

// 크론(GitHub Actions)이 부르는 백업. 내용이 그대로면 GitHub 을 아예 호출하지 않는다.
// 무변경인데도 커밋하면 Render 가 6시간마다 재배포되어 무료 플랜에서 콜드 스타트만 늘어난다.
export async function runSeedBackup() {
  const seed = exportSeed();
  const hash = seedHash(seed);
  const lastHash = metaGet(LAST_BACKUP_HASH_KEY);
  if (lastHash && lastHash === hash) {
    return { ok: true, skipped: "no-change", hash, changedAt: metaGet(LAST_BACKUP_AT_KEY) };
  }
  const result = await backupSeedToGitHub();
  recordBackup({ ...result, hash, changedAt: seed.exportedAt });
  return {
    ok: true,
    skipped: null,
    hash,
    changedAt: seed.exportedAt,
    repository: result.repository,
    branch: result.branch,
    commitUrl: result.commitUrl,
    commitSha: result.commitSha,
  };
}
