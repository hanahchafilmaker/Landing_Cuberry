// 요금 카드를 단가표(XCONDA_AI영상_단가표_견적 v1.2) 권장 단가로 교체 (2026-10-28 대표님 요청).
//
// 이미 운영 중인 DB에는 예전 금액(29·69·149만원)이 들어 있어서 seed.json 만 바꿔서는
// 화면이 바뀌지 않는다. 그래서 서버가 켜질 때 한 번만 값을 갱신한다.
//
// 안전 규칙
//   · 행을 지우지 않는다. slug 로 찾아 이름·가격·기간·설명만 바꾼다.
//   · **예전 기본값 그대로인 행만** 바꾼다. 관리자가 어드민에서 직접 고쳐 둔 금액은 건드리지 않는다.
//   · meta 에 기록해 두 번 다시 실행하지 않는다(나중에 다시 조정한 값을 되돌리지 않게).
const KEY = "service_pricing_2026_v12";

/** slug → { 이전 기본값, 새 값 } */
const PLAN = [
  {
    slug: "standard",
    before: { price: "29만원~", name: "숏폼 AI 광고", duration: "15초 · 최대 5컷" },
    after: {
      name: "숏폼 AI 광고",
      price: "118만원~",
      duration: "15초 · 최대 5컷",
      description: "기획·콘티부터 AI 실사 씬 5컷, 편집·색보정, 감독 검수까지",
    },
  },
  {
    slug: "deluxe",
    before: { price: "69만원~", name: "브랜드 AI 광고", duration: "60초 · 최대 12컷" },
    after: {
      name: "브랜드 AI 광고",
      price: "204만원~",
      duration: "30~45초 · 최대 12컷",
      description: "스토리보드부터 캐릭터 시트, 모션그래픽·사운드까지",
    },
  },
  {
    slug: "premium",
    before: { price: "149만원~", name: "AI 풀 프로덕션", duration: "120초 · 최대 25컷" },
    after: {
      name: "AI 풀 프로덕션",
      price: "880만원~",
      duration: "60초 · 7씬 기준",
      description: "기획부터 DI·사운드·감독 검수까지 전 공정, 전담 PM 운영",
    },
  },
];

export function migrateServicePricing(db) {
  const applied = db.prepare("SELECT value FROM meta WHERE key = ?").get(KEY)?.value ?? null;
  if (applied) return "skipped (already applied)";

  const select = db.prepare("SELECT slug, name, price, duration FROM services WHERE slug = ?");
  const update = db.prepare("UPDATE services SET name = ?, price = ?, duration = ?, description = ?, updated_at = ? WHERE slug = ?");
  const stamp = new Date().toISOString();
  let changed = 0;
  const kept = [];

  for (const plan of PLAN) {
    const row = select.get(plan.slug);
    if (!row) continue;
    // 관리자가 직접 고친 행은 그대로 둔다(가격이 예전 기본값과 다르면 손대지 않음).
    if (row.price !== plan.before.price) {
      kept.push(plan.slug);
      continue;
    }
    update.run(plan.after.name, plan.after.price, plan.after.duration, plan.after.description, stamp, plan.slug);
    changed += 1;
  }

  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(KEY, stamp);
  const suffix = kept.length ? ` (직접 수정한 항목 유지: ${kept.join(", ")})` : "";
  return `updated ${changed} service price(s)${suffix}`;
}
