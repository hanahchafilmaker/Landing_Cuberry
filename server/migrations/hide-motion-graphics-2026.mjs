// 모션그래픽 작품 공개 해제 (2026-10-28 대표님 요청 "모션그래픽 다 빼고")
//
// 포트폴리오에서 모션그래픽 장르 작품을 뺀다. 행을 지우지 않고 `is_published = 0` 으로만 내려서
// 랜딩·공개 API 에서는 보이지 않지만 어드민에서는 그대로 복원할 수 있게 한다(비파괴).
//
// 적용 조건(둘 중 하나):
//   - category 가 MOTION GRAPHICS / MOTION SHOWREEL / OPENING SEQUENCE
//   - title 이 아래 목록에 있음(카테고리 표기가 바뀐 경우 대비)
// 한 번만 실행되도록 meta 키로 기록한다. 관리자가 나중에 다시 노출시킨 항목을
// 서버 재시작이 되돌리지 않도록 하기 위함이다.
const KEY = "motion_graphics_hidden_2026";

const CATEGORIES = ["MOTION GRAPHICS", "MOTION SHOWREEL", "OPENING SEQUENCE"];
const TITLES = [
  "모션그래픽 쇼릴",
  "2025 고잉 세븐틴 오프닝 타이틀 시퀀스",
  "CJ대한통운 오네 시리즈 — 새벽",
  "CJ대한통운 오네 시리즈 — 일요일",
  "CJ대한통운 자원 선순환",
  "CJ대한통운 친환경 패키징",
  "CJ대한통운 오토스토어",
  "랭키닷컴 런칭 타이포 영상",
  "필립모리스 유해성을 줄인 산업 트렌드",
  "위더스애드 애니메이션 브랜드 필름",
  "리니지 M 백월",
];

export function hideMotionGraphics(db) {
  // meta 는 이 DB 핸들의 테이블을 직접 읽는다(모듈 전역 db 를 건드리지 않아 테스트에서도 안전).
  const applied = db.prepare("SELECT value FROM meta WHERE key = ?").get(KEY)?.value ?? null;
  if (applied) return "skipped (already applied)";

  const placeholders = (items) => items.map(() => "?").join(", ");
  const result = db
    .prepare(
      `UPDATE portfolio SET is_published = 0
       WHERE is_published = 1
         AND (category IN (${placeholders(CATEGORIES)}) OR title IN (${placeholders(TITLES)}))`,
    )
    .run(...CATEGORIES, ...TITLES);

  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(KEY, new Date().toISOString());
  return `unpublished ${Number(result.changes ?? 0)} motion-graphics work(s)`;
}
