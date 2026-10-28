// FAQ 10개 추가 (2026-10-28 대표님 요청 "Q&A 10개 정도 더 추가해줘").
//
// 이미 운영 중인 DB에는 FAQ 4개가 들어 있어서 seed.json 만 늘리면 화면은 그대로다.
// 그래서 서버가 켜질 때 **없는 질문만 덧붙인다**.
//
// 안전 규칙
//   · 기존 행을 지우거나 고치지 않는다(추가만).
//   · 이미 같은 질문이 있으면 건너뛴다(재실행·관리자 편집 모두 안전).
//   · meta 에 기록해 두 번 다시 실행하지 않는다.
const KEY = "faqs_extra_2026_v1";

/** 새로 추가하는 질문·답변 (순서대로 sort_order 를 이어 붙인다) */
const EXTRA = [
  {
    question: "납품 규격(비율·해상도)은 어떻게 정하나요?",
    answer: "9:16·16:9, 4K·1080p 등 채널별 규격을 기획 단계에서 확정합니다. 매체 규격이 정해져 있으면 그 기준에 맞춰 제작합니다.",
  },
  {
    question: "수정은 몇 회까지 포함인가요?",
    answer: "단발 기준 2회(1차 가편집본, 2차 최종본)가 기본입니다. 기획·스토리보드 컨펌 후 구성(장면·스토리) 변경은 재견적 대상입니다.",
  },
  {
    question: "납품 파일은 어떤 형식으로 받나요?",
    answer: "납품 시 확정된 규격(비율·해상도·버전)으로만 출력합니다. 이후 규격 변경이나 추가 버전이 필요하면 재출력 절차를 거쳐야 하므로, 납품 전에 필요한 규격을 모두 확정해 주세요.",
  },
  {
    question: "인물·캐릭터 시트는 매번 새로 만드나요?",
    answer: "한 번 만든 인물·배경 시트는 재사용합니다. 신규 인물·공간이 필요할 때만 시트를 새로 제작합니다.",
  },
  {
    question: "AI 생성 결과가 마음에 안 들면 어떻게 하나요?",
    answer: "씬마다 후보 3~5개를 생성해 선택합니다. 연출·검수 담당이 컷 적합성을 함께 확인합니다.",
  },
  {
    question: "외국어 버전·더빙도 가능한가요?",
    answer: "가능합니다. 언어별 현지화(자막·더빙)로 제작하며 한국어·영어·일본어 납품 이력이 있습니다.",
  },
  {
    question: "3D·모션그래픽도 제작하나요?",
    answer: "합니다. 3D 에셋·애니메이션, 모션그래픽·AR 트래킹 합성, 인포그래픽 모션까지 제작합니다.",
  },
  {
    question: "저작권과 원본 파일은 어떻게 되나요?",
    answer: "저작재산권은 협의된 계약 조건에 따라 의뢰사에 귀속됩니다(라이선스 음원·폰트는 라이선스 범위 내). 마스터·작업 소스는 납품일로부터 3개월 보관합니다.",
  },
  {
    question: "검수는 어떻게 진행되나요?",
    answer: "연출과 분리된 감독 검수를 거칩니다. 글자 깨짐·타사 로고 노출·자막 오탈자·납품 규격을 전수 확인합니다.",
  },
  {
    question: "어떤 장르를 제작해왔나요?",
    answer: "광고(커머셜)·TV·웹드라마 중심으로, 기업 홍보·브랜드 필름·가이드까지 제작했습니다.",
  },
];

export function addFaqs2026(db) {
  const applied = db.prepare("SELECT value FROM meta WHERE key = ?").get(KEY)?.value ?? null;
  if (applied) return "skipped (already applied)";

  const exists = db.prepare("SELECT 1 FROM faqs WHERE question = ?");
  const max = db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS n FROM faqs").get();
  let order = Number(max?.n ?? 0);
  const insert = db.prepare(
    "INSERT INTO faqs (question, answer, sort_order, is_published, landing_slot, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
  );
  const stamp = new Date().toISOString();
  let added = 0;
  for (const item of EXTRA) {
    if (exists.get(item.question)) continue;
    order += 1;
    insert.run(item.question, item.answer, order, `faq-${order}`, stamp);
    added += 1;
  }

  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(KEY, stamp);
  return `added ${added} FAQ(s)`;
}
