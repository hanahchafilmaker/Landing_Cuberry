import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { works } from '../landing/src/data/content.ts';
import { hideMotionGraphics } from '../server/migrations/hide-motion-graphics-2026.mjs';

// 2026-10-28 "모션그래픽 다 빼고" — 포트폴리오에서 모션그래픽 장르 작품을 내린다.
//   ① 새 설치(seed.json) ② 이미 돌고 있는 DB(마이그레이션) ③ 랜딩 기본값(content.ts) 세 곳이 같은 결과여야 한다.
//   행을 지우지 않고 is_published=0 으로만 내리므로 어드민에서 되살릴 수 있어야 한다.
const seed = JSON.parse(readFileSync(new URL('../server/seed.json', import.meta.url))).portfolio;
const HIDDEN_CATEGORIES = new Set(['MOTION GRAPHICS', 'MOTION SHOWREEL', 'OPENING SEQUENCE']);
const isMotion = (item) => HIDDEN_CATEGORIES.has(item.category) || item.tags.includes('MOTION');

// ① seed.json — 모션그래픽 장르 행은 공개 상태가 아니어야 한다.
const published = seed.filter((item) => item.isPublished !== false);
const stillPublished = published.filter((item) => HIDDEN_CATEGORIES.has(item.category));
assert.deepEqual(stillPublished.map((item) => item.title), [], '새 설치에서 모션그래픽 장르가 공개 상태로 남아 있습니다');

// 다른 장르는 그대로 공개 — 작품 목록을 통째로 비우지 않았는지 확인한다.
const keptGenres = new Set(published.map((item) => item.category));
for (const genre of ['AI ANIMATION SERIES', 'CORPORATE VIDEO', 'BRAND FILM', 'ADVERTISING']) {
  assert.ok(keptGenres.has(genre), `${genre} 작품이 모두 사라졌습니다`);
}
assert.ok(published.length >= 10, `공개 작품이 너무 적습니다 (${published.length}건)`);

// 모션그래픽을 '기법'으로만 쓴 기업·브랜드 영상은 남긴다(쇼릴·오프닝·모션그래픽 장르만 제외).
for (const title of ['LS전선 기업 홍보 영상', '한화 에어로스페이스 항공엔진 비전 영상', '비치오네 AI 브랜드 필름']) {
  assert.ok(published.some((item) => item.title === title), `기업/브랜드 작품이 함께 빠졌습니다: ${title}`);
}

// ② 마이그레이션 — 기존 DB 행을 비노출로 내리고, 두 번 돌려도 안전하며, 관리자가 되살린 항목을 되돌리지 않는다.
function dbWith(items) {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE portfolio (id INTEGER PRIMARY KEY, title TEXT, category TEXT, tags TEXT,
      is_published INTEGER, landing_slot TEXT)`);
  const insert = db.prepare('INSERT INTO portfolio (title, category, tags, is_published, landing_slot) VALUES (?,?,?,?,?)');
  for (const item of items) insert.run(item.title, item.category, (item.tags || []).join(', '), Number(item.isPublished), item.landingSlot || null);
  return db;
}
const rows = seed.map((item) => ({ ...item, isPublished: true, tags: String(item.tags).split(',').map((tag) => tag.trim()) }));
const db = dbWith(rows);
const result = hideMotionGraphics(db);
assert.match(result, /^unpublished \d+ motion-graphics work\(s\)$/, `예상 밖 결과: ${result}`);

const after = db.prepare('SELECT title, category, tags, is_published AS published FROM portfolio').all();
const hidden = after.filter((row) => !row.published);
const expected = rows.filter((item) => HIDDEN_CATEGORIES.has(item.category));
assert.equal(hidden.length, expected.length, '비노출 처리된 행 수가 모션그래픽 장르 수와 다릅니다');
for (const row of hidden) {
  assert.ok(HIDDEN_CATEGORIES.has(row.category), `카테고리로 묶이지 않은 행이 내려갔습니다: ${row.title} (${row.category})`);
}
assert.equal(after.filter((row) => row.published).length, rows.length - expected.length);

// 두 번째 호출은 아무것도 바꾸지 않는다(관리자가 다시 노출시킨 항목 보호).
db.prepare('UPDATE portfolio SET is_published = 1 WHERE title = ?').run(expected[0].title);
assert.match(hideMotionGraphics(db), /^skipped/);
assert.equal(db.prepare('SELECT is_published AS p FROM portfolio WHERE title = ?').get(expected[0].title).p, 1, '재실행이 관리자의 복원을 되돌렸습니다');

// ③ 랜딩 기본값(content.ts) — 모션그래픽 장르 기본 작품이 없어야 한다.
const defaults = works.filter((item) => HIDDEN_CATEGORIES.has(item.category));
assert.deepEqual(defaults.map((item) => item.title), [], '랜딩 기본값에 모션그래픽 장르 작품이 남아 있습니다');
assert.ok(works.length >= 8, `랜딩 기본 작품이 너무 적습니다 (${works.length}건)`);

console.log(`[portfolio motion] 통과 — 공개 ${published.length}건 유지 · 비노출 ${expected.length}건 · 기본값 ${works.length}건`);
