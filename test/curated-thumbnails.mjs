// 대표님이 직접 준 카드 사진(〈DIVISION 0〉·〈목구멍〉)이 실제로 쓰이는지 확인한다.
// 2026-10-29 지적: "내가 썸네일 줬잖아" — Drive 첫 장면이 검어서 자동 썸네일이 새까맸다.
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { curatedThumbnail, curatedThumbnails } from "../landing/src/cms/curated.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ① 파일이 저장소에 실제로 있어야 한다(경로 오타·누락 방지)
assert.ok(curatedThumbnails.length >= 2, "등록된 사진이 2장 미만입니다");
for (const entry of curatedThumbnails) {
  const file = path.join(ROOT, entry.src);
  assert.equal(existsSync(file), true, `${entry.label}: 파일이 없습니다 — ${entry.src}`);
  assert.ok(statSync(file).size > 8_000, `${entry.label}: 파일이 너무 작습니다(빈 파일 의심)`);
  assert.match(entry.src, /^images\/curated\/[\w.-]+\.jpg$/, `${entry.label}: images/curated/ 아래 jpg 여야 합니다`);
}

// ② 파일 이름이 서로 겹치지 않는다
assert.equal(new Set(curatedThumbnails.map((entry) => entry.src)).size, curatedThumbnails.length);

// ③ 실제 드라이브 제목·어드민 제목에서 모두 찾아진다
const cases = [
  ["DIVISION 0", "images/curated/work-division-zero.jpg"],
  ["Web Drama DIVISION 0", "images/curated/work-division-zero.jpg"],
  ["Division_Zero_v3_KO.mp4", "images/curated/work-division-zero.jpg"],
  ["디비전 0 예고편", "images/curated/work-division-zero.jpg"],
  ["목구멍", "images/curated/work-mokgumeong.jpg"],
  ["Web Drama Poverty Knows No Law", "images/curated/work-mokgumeong.jpg"],
];
for (const [title, expected] of cases) {
  assert.equal(curatedThumbnail(title), expected, `${title} → ${expected} 를 찾지 못했습니다`);
}

// ④ 다른 작품은 건드리지 않는다(엉뚱한 사진이 붙으면 안 됨)
for (const title of ["Cold Site", "Toy Farm", "TV Hometown Of Legends Nine Tailed Fox", "Kosha Van Gogh", "Web Drama Girl Detective"]) {
  assert.equal(curatedThumbnail(title), null, `${title} 에 엉뚱한 사진이 붙었습니다`);
}
assert.equal(curatedThumbnail(), null);
assert.equal(curatedThumbnail("", undefined), null);

// ⑤ 검색어(파일명)까지 함께 보므로 제목이 영문이어도 국문 표기를 찾을 수 있다
assert.equal(curatedThumbnail("Untitled", "webdrama 목구멍 2026"), "images/curated/work-mokgumeong.jpg");

console.log("[curated thumbnails] 통과 — 디비전0 · 목구멍 사진 적용, 다른 작품은 그대로");
