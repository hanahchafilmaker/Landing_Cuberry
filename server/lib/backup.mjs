// ── Phase 3: seed.json 백업 자동화 (설계: docs/ops-hardening-plan.md §5) ──
//
// GitHub Actions cron 이 6시간마다 `POST /api/cron/backup` 을 호출한다.
// 서버 안의 setInterval 로 돌리지 않는 이유: 무료 인스턴스는 자고, 깨어나면 data/ 가 비어 있다.
// 저장소 밖(Actions)에서 두드려야 잠들어 있어도 백업이 의미를 가진다.
//
// 이 파일은 그중 "순수한 판단"만 담는다 — 시크릿 비교와 "내용이 바뀌었나" 해시.
// 실제 커밋은 server/index.mjs 의 backupSeedToGitHub() 를 그대로 재사용한다(경로를 하나로 유지).
//
// 왜 해시가 필요한가: 내용이 같아도 6시간마다 커밋하면 Render 가 매번 재배포하고,
// 무료 플랜에서는 그때마다 콜드 스타트가 돈다. 무변경이면 GitHub 을 아예 부르지 않는다.

import { createHash, timingSafeEqual } from "node:crypto";

// meta 테이블 키 — 어드민 개요의 "마지막 백업" 줄도 같은 값을 읽는다.
export const LAST_BACKUP_HASH_KEY = "last_backup_hash";
export const LAST_BACKUP_AT_KEY = "last_backup_at";

export function cronSecret(env = process.env) {
  return String(env.CRON_SECRET || "").trim();
}

// 상수시간 비교. timingSafeEqual 은 길이가 다르면 예외를 던지므로 먼저 걸러낸다
// (아주 긴 값이 500 을 만들지 않도록 — test/cron-backup.mjs 에서 고정한다).
export function safeSecretEqual(provided, expected) {
  const a = Buffer.from(String(provided ?? ""), "utf8");
  const b = Buffer.from(String(expected ?? ""), "utf8");
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// exportedAt(내보낸 시각)은 호출마다 바뀌므로 해시에서 뺀다.
// 키 순서가 달라져도 같은 값이 나오도록 키를 재귀적으로 정렬해 직렬화한다 —
// 정렬하지 않으면 백업이 조용히 매번 "변경됨"으로 판정되어 무한 재배포로 돌아간다.
export function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    const json = JSON.stringify(value);
    return json === undefined ? "null" : json;
  }
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

// exportSeed() 결과의 지문. exportedAt 만 무시하고 나머지 전체를 담는다.
export function seedHash(seed) {
  const { exportedAt: _ignored, ...rest } = seed || {};
  return createHash("sha256").update(stableStringify(rest), "utf8").digest("hex");
}
