// FAQ 10개 추가 검증 — seed.json · 랜딩 기본값 · 기존 DB 마이그레이션이 같은 결과여야 한다.
// 2026-10-28 대표님 요청. 금액·재출력 비용 관련 표현은 넣지 않는다(대표님 지시).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { faqs as landingFaqs } from "../landing/src/data/content.ts";
import { addFaqs2026 } from "../server/migrations/faqs-2026.mjs";

const seed = JSON.parse(readFileSync(new URL("../server/seed.json", import.meta.url))).faqs;

// ① seed.json — 기존 4개 + 새 10개 = 14개
assert.equal(seed.length, 14, `seed FAQ 개수가 ${seed.length}건입니다`);
assert.deepEqual(seed.map((item) => item.sortOrder), Array.from({ length: 14 }, (_, i) => i + 1), "정렬 순서가 1..14 여야 합니다");
assert.deepEqual(seed.map((item) => item.landingSlot), Array.from({ length: 14 }, (_, i) => `faq-${i + 1}`));
assert.equal(seed.every((item) => item.isPublished === true), true);
assert.equal(new Set(seed.map((item) => item.question)).size, 14, "질문이 중복됩니다");
assert.equal(seed.every((item) => item.answer.trim().length > 10), true, "답변이 비었거나 너무 짧습니다");

// ② 랜딩 기본값(content.ts)도 같은 14개·같은 순서
assert.deepEqual(landingFaqs.map((item) => item.q), seed.map((item) => item.question), "랜딩 기본값이 seed 와 다릅니다");
assert.deepEqual(landingFaqs.map((item) => item.a), seed.map((item) => item.answer));

// ③ 금액·재출력 비용 표현은 넣지 않는다.
const MONEY = /(만원|원\s*$|비용|청구|금액|할인|견적\s*비|₩|\d+\s*원)/;
for (const item of seed) {
  for (const text of [item.question, item.answer]) {
    assert.equal(MONEY.test(text), false, `금전 표현이 남아 있습니다: ${text}`);
  }
}
// 납품 파일 답변은 "확정된 규격으로만 출력 + 재출력 절차" 를 담아야 한다.
const delivery = seed.find((item) => item.question.includes("납품 파일"));
assert.ok(delivery.answer.includes("확정된 규격") && delivery.answer.includes("재출력"), "납품 파일 답변 내용 확인");

// ④ 마이그레이션 — 기존 4개가 있는 DB 에 10개만 덧붙인다.
function dbWith(rows) {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE faqs (id INTEGER PRIMARY KEY AUTOINCREMENT, question TEXT, answer TEXT,
      sort_order INTEGER, is_published INTEGER, landing_slot TEXT, updated_at TEXT)`);
  const insert = db.prepare("INSERT INTO faqs (question, answer, sort_order, is_published, landing_slot, updated_at) VALUES (?,?,?,1,?,?)");
  for (const row of rows) insert.run(row.question, row.answer, row.sortOrder, row.landingSlot, "2026-10-01T00:00:00.000Z");
  return db;
}

const legacyDb = dbWith(seed.slice(0, 4));
assert.match(addFaqs2026(legacyDb), /added 10 FAQ/);
const rows = legacyDb.prepare("SELECT question, sort_order AS sortOrder FROM faqs ORDER BY sort_order").all();
assert.deepEqual(rows.map((r) => r.question), seed.map((item) => item.question), "마이그레이션 결과가 seed 와 다릅니다");
assert.deepEqual(rows.map((r) => r.sortOrder), Array.from({ length: 14 }, (_, i) => i + 1));

// 두 번 돌려도 늘어나지 않는다.
assert.match(addFaqs2026(legacyDb), /skipped/);
assert.equal(legacyDb.prepare("SELECT COUNT(*) AS n FROM faqs").get().n, 14);

// 새 설치(이미 14개)에서는 아무것도 추가하지 않는다.
const freshDb = dbWith(seed);
assert.match(addFaqs2026(freshDb), /added 0/);
assert.equal(freshDb.prepare("SELECT COUNT(*) AS n FROM faqs").get().n, 14);

// 첫 실행에서는 빠진 질문만 채운다(이미 있는 질문은 건드리지 않음).
const trimmed = dbWith(seed.filter((_, i) => i !== 11));
assert.match(addFaqs2026(trimmed), /added 1 FAQ/);
assert.equal(trimmed.prepare("SELECT COUNT(*) AS n FROM faqs").get().n, 14);

// 한 번 적용된 뒤에 관리자가 지운 FAQ 는 재시작해도 되살아나지 않는다.
legacyDb.prepare("DELETE FROM faqs WHERE question = ?").run(seed[13].question);
assert.match(addFaqs2026(legacyDb), /skipped/);
assert.equal(legacyDb.prepare("SELECT COUNT(*) AS n FROM faqs").get().n, 13, "관리자가 지운 FAQ 를 되살렸습니다");

console.log("[faqs] 통과 — 4 + 10 = 14개 (seed·랜딩·마이그레이션 일치, 금전 표현 없음)");
