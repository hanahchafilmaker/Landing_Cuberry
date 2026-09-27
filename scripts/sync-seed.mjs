// 운영 API 서버의 현재 공개 콘텐츠를 server/seed.json 으로 당겨온다.
//
//   node scripts/sync-seed.mjs                      → 운영 서버(https://landing-cuberry-admin.onrender.com)
//   node scripts/sync-seed.mjs http://localhost:8080 → 다른 서버에서
//   npm run sync:seed
//
// 주의: /api/public/content 는 "공개(isPublished)" 항목만 준다.
// 비공개 초안과 문의함까지 포함한 완전한 백업은 어드민(Settings → Backup)의 "콘텐츠 JSON 내려받기"를 쓴다
// (로그인이 필요한 /api/admin/export 결과를 그대로 server/seed.json 으로 저장하면 된다).
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SEED_PATH = path.join(ROOT, "server", "seed.json");
const ORIGIN = (process.argv[2] || "https://landing-cuberry-admin.onrender.com").replace(/\/+$/, "");

const omit = (object, keys) =>
  Object.fromEntries(Object.entries(object || {}).filter(([key]) => !keys.includes(key)));

const response = await fetch(`${ORIGIN}/api/public/content`, { cache: "no-store" });
if (!response.ok) throw new Error(`콘텐츠를 가져오지 못했습니다: ${response.status} ${await response.text()}`);
const data = await response.json();

const seed = {
  syncedAt: new Date().toISOString(),
  syncedFrom: ORIGIN,
  settings: omit(data.settings, ["updatedAt"]),
  services: (data.services || []).map((item) => omit(item, ["id", "updatedAt"])),
  portfolio: (data.portfolio || []).map((item) => omit(item, ["id", "createdAt", "updatedAt"])),
  faqs: (data.faqs || []).map((item) => omit(item, ["id", "updatedAt"])),
  team: (data.team || []).map((item) => omit(item, ["id", "updatedAt"])),
};

writeFileSync(SEED_PATH, `${JSON.stringify(seed, null, 2)}\n`, "utf8");
console.log(`[sync:seed] ${ORIGIN} → server/seed.json`);
console.log(
  `  services ${seed.services.length} · portfolio ${seed.portfolio.length} · faqs ${seed.faqs.length} · team ${seed.team.length}`,
);
console.log("  커밋·푸시하면 Render 가 다음 재시작 때 이 내용으로 시드합니다.");
