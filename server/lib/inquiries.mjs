// 문의 — 코드 발급 · 저장 · 상태 변경. 라우트(handleApi)가 쓰는 작은 함수들.
import { db, nowIso } from "./db.mjs";

// COUNT(*)+1 은 행이 삭제되면 같은 번호를 다시 만들어 UNIQUE 충돌로 500 이 난다.
// 최대 id 기준으로 발급한다.
export function nextInquiryCode() {
  const row = db.prepare("SELECT COALESCE(MAX(id), 0) AS n FROM inquiries").get();
  return `CB-${String(Number(row.n) + 1).padStart(4, "0")}`;
}

// 저장 SQL 은 원래 handleApi 안에 있던 것을 그대로 옮겼다 — 값·컬럼 순서·상태 판정은 같다.
export function insertInquiry(input, { code = nextInquiryCode(), stamp = nowIso(), status = "new" } = {}) {
  const result = db.prepare(`INSERT INTO inquiries (code, name, email, company, phone, project_type, budget, message, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    code, input.name, input.email, input.company, input.phone, input.projectType, input.budget, input.message, status, stamp, stamp,
  );
  return { code, inquiryId: Number(result.lastInsertRowid) };
}

// 어드민 문의 상태 변경. 404 판정을 위해 db 결과(changes)를 그대로 돌려준다.
export function setInquiryStatus(id, status) {
  return db.prepare("UPDATE inquiries SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), id);
}
