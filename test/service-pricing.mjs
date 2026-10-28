// 요금 카드 3장을 단가표(XCONDA_AI영상_단가표_견적 v1.2) 권장 단가로 교체했는지 검증한다.
//   ① seed.json(새 설치) ② 랜딩 기본값(content.ts) ③ 마이그레이션(이미 돌고 있는 DB) 세 곳이 같아야 한다.
//   2026-10-28 대표님 확정: 숏폼 118만 / 브랜드 204만 / 풀 프로덕션 880만 (VAT 별도)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { services as landingServices } from "../landing/src/data/content.ts";
import { migrateServicePricing } from "../server/migrations/service-pricing-2026.mjs";

const seed = JSON.parse(readFileSync(new URL("../server/seed.json", import.meta.url))).services;

/** 단가표 권장 단가·기간 — 표를 다시 뽑으면 여기만 고치면 된다. */
const EXPECTED = [
  { slug: "standard", name: "숏폼 AI 광고", price: "118만원~", duration: "15초 · 최대 5컷" },
  { slug: "deluxe", name: "브랜드 AI 광고", price: "204만원~", duration: "30~45초 · 최대 12컷" },
  { slug: "premium", name: "AI 풀 프로덕션", price: "880만원~", duration: "60초 · 7씬 기준" },
];

/** 이전에 팔던 금액(마이그레이션 판단 기준) */
const LEGACY = { standard: "29만원~", deluxe: "69만원~", premium: "149만원~" };

// ① seed.json — 새로 설치하면 바로 새 금액이어야 한다.
assert.equal(seed.length, EXPECTED.length, "상품 카드 수가 바뀌었습니다");
for (const [index, want] of EXPECTED.entries()) {
  const row = seed[index];
  assert.equal(row.slug, want.slug);
  assert.equal(row.name, want.name);
  assert.equal(row.price, want.price, `${want.slug} 가격`);
  assert.equal(row.duration, want.duration, `${want.slug} 기간`);
  assert.ok(row.description.trim().length > 0, `${want.slug} 설명이 비었습니다`);
  assert.equal(row.isPublished, true);
}

// ② 랜딩 기본값(content.ts) — API 가 없을 때 그려지는 값도 같아야 한다.
assert.deepEqual(
  landingServices.map(({ slug, name, price, duration }) => ({ slug, name, price, duration })),
  EXPECTED,
  "랜딩 기본값이 seed.json 과 다릅니다",
);
for (const card of landingServices) assert.ok(card.features.length >= 3, `${card.slug} 구성 항목이 너무 적습니다`);

// ③ 마이그레이션 — 이미 돌고 있는 DB(예전 금액)를 한 번만 갱신한다.
function dbWith(rows) {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE services (slug TEXT PRIMARY KEY, name TEXT, price TEXT, duration TEXT,
      description TEXT, updated_at TEXT)`);
  const insert = db.prepare("INSERT INTO services (slug, name, price, duration, description) VALUES (?,?,?,?,?)");
  for (const row of rows) insert.run(row.slug, row.name, row.price, row.duration, row.description || "");
  return db;
}

const legacyDb = dbWith(EXPECTED.map((item) => ({
  slug: item.slug,
  name: item.name,
  price: LEGACY[item.slug],
  duration: item.slug === "deluxe" ? "60초 · 최대 12컷" : item.duration,
  description: "예전 설명",
})));
assert.match(migrateServicePricing(legacyDb), /updated 3 service price/);
const migrated = legacyDb.prepare("SELECT slug, name, price, duration FROM services ORDER BY slug").all();
assert.deepEqual(
  migrated.map(({ slug, name, price, duration }) => ({ slug, name, price, duration })),
  [...EXPECTED].sort((a, b) => a.slug.localeCompare(b.slug)),
  "마이그레이션 결과가 단가표와 다릅니다",
);
assert.equal(legacyDb.prepare("SELECT description FROM services WHERE slug = 'premium'").get().description.includes("전담 PM"), true);

// 두 번 돌려도 다시 바꾸지 않는다(나중에 어드민에서 조정한 값을 되돌리지 않게).
legacyDb.prepare("UPDATE services SET price = '900만원~' WHERE slug = 'premium'").run();
assert.match(migrateServicePricing(legacyDb), /skipped/);
assert.equal(legacyDb.prepare("SELECT price FROM services WHERE slug = 'premium'").get().price, "900만원~");

// 관리자가 직접 고쳐 둔 금액은 건드리지 않는다.
const customDb = dbWith(EXPECTED.map((item) => ({
  slug: item.slug,
  name: item.name,
  price: item.slug === "deluxe" ? "180만원~" : LEGACY[item.slug],
  duration: item.duration,
  description: "",
})));
assert.match(migrateServicePricing(customDb), /직접 수정한 항목 유지: deluxe/);
assert.equal(customDb.prepare("SELECT price FROM services WHERE slug = 'deluxe'").get().price, "180만원~");
assert.equal(customDb.prepare("SELECT price FROM services WHERE slug = 'standard'").get().price, "118만원~");

// 새 설치(이미 새 금액)에서는 아무것도 바꾸지 않는다.
const freshDb = dbWith(EXPECTED.map((item) => ({ ...item, description: "" })));
assert.match(migrateServicePricing(freshDb), /updated 0/);

console.log("[service pricing] 통과 — 118만 / 204만 / 880만 (seed·랜딩·마이그레이션 일치)");
