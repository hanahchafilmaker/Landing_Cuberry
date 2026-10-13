// ── Phase 2: 서명된 폼 토큰 · Turnstile (설계: docs/ops-hardening-plan.md §4) ──
//
// 런타임 의존성 0 — node:crypto HMAC 과 fetch 만 쓴다.
//
// 폼 토큰: GET /api/form-token 이 `<ts>.<hmac>` 를 발급한다(비밀키는 meta 테이블에
// 최초 1회 생성). 문의 제출 시 네 가지를 본다.
//   1. 형식·HMAC 불일치 →위조(봇)
//   2. now - ts < 3초    → 사람은 3초 안에 폼을 못 채운다(너무 빠름)
//   3. now - ts > 6시간  → 오래된 캐시 페이지(만료)
//   (Turnstile 시크릿이 있으면 siteverify 1회를 추가로 검사한다)
//
// 실패해도 문의 접수 자체는 막지 않는다 — FORM_TOKEN_MODE 로만 처리한다.
//   off   :warn 만 남기고 그대로 저장 (기존과 동일)
//   flag  :저장하되 status='review' + 알림 발송 안 함 → 어드민 "확인 필요" (승인된 기본값)
//   strict:저장하지 않고 200 (허니팟과 동일 — 봇은 자기 문의가 접수된 줄 안다)

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const DEFAULT_MIN_AGE_MS = 3_000; // 사람은 3초 안에 폼을 못 채운다
const DEFAULT_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6시간 — 캐시된 페이지가 오래됐으면 만료

// FORM_TOKEN_MIN_AGE_MS / FORM_TOKEN_MAX_AGE_MS 는 테스트가 시간창을 줄여 쓰는 오버라이드다.
export function parseWindow(env = process.env) {
  const min = Number(env.FORM_TOKEN_MIN_AGE_MS);
  const max = Number(env.FORM_TOKEN_MAX_AGE_MS);
  return {
    minAgeMs: Number.isFinite(min) && min >= 0 ? min : DEFAULT_MIN_AGE_MS,
    maxAgeMs: Number.isFinite(max) && max > 0 ? max : DEFAULT_MAX_AGE_MS,
  };
}

// 승인된 기본값은 flag(저장하되 표시). 알 수 없는 값도 안전한 쪽(flag)으로 떨어뜨린다.
export function formTokenMode(env = process.env) {
  const mode = String(env.FORM_TOKEN_MODE || "").trim().toLowerCase();
  return mode === "off" || mode === "strict" ? mode : "flag";
}

export function getOrCreateSecret(db) {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'form_token_secret'").get();
  if (row && row.value) return row.value;
  const secret = randomBytes(32).toString("hex");
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('form_token_secret', ?)").run(secret);
  return secret;
}

export function mintFormToken(db, now = Date.now()) {
  const ts = String(now);
  const mac = createHmac("sha256", getOrCreateSecret(db)).update(ts).digest("hex");
  return `${ts}.${mac}`;
}

const safeEqualHex = (a, b) => {
  const bufA = Buffer.from(String(a), "hex");
  const bufB = Buffer.from(String(b), "hex");
  return bufA.length > 0 && bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

// 토큰 검증 — throw 하지 않는다(내부 오류도 { ok:false } 로 보고).
export function validateFormToken(db, token, env = process.env) {
  try {
    const { minAgeMs, maxAgeMs } = parseWindow(env);
    const text = String(token || "");
    const dot = text.indexOf(".");
    if (dot <= 0) return { ok: false, reason: "토큰 없음" };
    const ts = text.slice(0, dot);
    const mac = text.slice(dot + 1);
    if (!/^\d+$/.test(ts) || !/^[0-9a-f]{64}$/i.test(mac)) return { ok: false, reason: "형식 오류" };
    const expected = createHmac("sha256", getOrCreateSecret(db)).update(ts).digest("hex");
    if (!safeEqualHex(mac, expected)) return { ok: false, reason: "위조" };
    const age = Date.now() - Number(ts);
    if (age < minAgeMs) return { ok: false, reason: "너무 빠름" };
    if (age > maxAgeMs) return { ok: false, reason: "만료" };
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: `검증 오류: ${error?.message || error}` };
  }
}

// Cloudflare Turnstile — 시크릿이 없으면 검사 자체를 건너뛴다(ok:true, skipped:true).
// TURNSTILE_VERIFY_URL 은 테스트가 로컬 목 서버를 가리키게 하는 오버라이드다.
export async function verifyTurnstile(secret, response, env = process.env) {
  if (!secret) return { ok: true, skipped: true };
  const url = String(env.TURNSTILE_VERIFY_URL || "https://challenges.cloudflare.com/turnstile/v0/siteverify");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: String(response || "") }).toString(),
      signal: AbortSignal.timeout(8_000),
    });
    const data = await res.json().catch(() => ({}));
    const codes = Array.isArray(data["error-codes"]) ? data["error-codes"].join(",") : "";
    return { ok: Boolean(data.success), detail: codes || (res.ok ? "" : `HTTP ${res.status}`) };
  } catch (error) {
    return { ok: false, detail: String(error?.message || error) };
  }
}
