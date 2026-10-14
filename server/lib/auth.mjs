// 인증·세션 — scrypt 비밀번호 해시 · 세션 토큰/쿠키 · 로그인 시도 제한 · requireAdmin.
// index.mjs 에서 그대로 옮겨온 파일이다(동작 변경 없음).
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { BEHIND_PROXY, PROXY_HOPS, SESSION_MS } from "./config.mjs";
import { db, nowIso } from "./db.mjs";
import { isHttps, send } from "./http.mjs";

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const prev = Buffer.from(hash, "hex");
  return next.length === prev.length && timingSafeEqual(next, prev);
}

export const adminAccount = {
  hasAdmin: false,
  passwordSource: "default", // default | environment | custom
  initialPasswordInUse: true,
};

export function purgeExpiredSessions() {
  const result = db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
  if (result.changes) console.log(`만료 세션 ${result.changes}건을 정리했습니다.`);
}

export const attempts = new Map();

// 요청자를 식별하는 키. 프록시 뒤가 아니면 소켓 주소, 뒤면 XFF 의 오른쪽 끝 hop 만 믿는다.
export function clientIp(req) {
  const socketIp = String(req.socket?.remoteAddress || "local").replace(/^::ffff:/, "");
  if (!BEHIND_PROXY) return socketIp;
  const hops = String(req.headers["x-forwarded-for"] || "")
    .split(",")
    .map((value) => value.trim().replace(/^::ffff:/, ""))
    .filter(Boolean);
  return hops[hops.length - PROXY_HOPS] || socketIp;
}

// 실패한 시도만 기록한다. (예전에는 성공 로그인까지 세서 8회 이후 10분간 잠기는 문제가 있었다)
export function attemptGate(key, limit, windowMs) {
  const now = Date.now();
  if (attempts.size > 1000) {
    for (const [bucketKey, bucket] of attempts) {
      if (!bucket.some((ts) => now - ts < windowMs)) attempts.delete(bucketKey);
    }
  }
  const bucket = (attempts.get(key) || []).filter((ts) => now - ts < windowMs);
  attempts.set(key, bucket);
  const oldest = bucket[0];
  const blocked = bucket.length >= limit;
  return {
    blocked,
    remaining: Math.max(0, limit - bucket.length),
    retryAfter: blocked && oldest ? Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)) : 0,
  };
}

export function noteAttempt(key) {
  const bucket = attempts.get(key) || [];
  bucket.push(Date.now());
  attempts.set(key, bucket);
  return bucket.length;
}

export function clearAttempts(key) {
  attempts.delete(key);
}

export function formatWait(seconds) {
  if (seconds < 60) return `${seconds}초`;
  return `${Math.ceil(seconds / 60)}분`;
}

export function readToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  // 프록시가 Authorization 헤더를 지우는 환경을 위한 대체 경로
  const custom = req.headers["x-admin-token"];
  if (custom) return String(custom).trim();
  const cookie = String(req.headers.cookie || "");
  const match = cookie.match(/(?:^|;\s*)cuberry_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function currentUser(req) {
  const token = readToken(req);
  if (!token) return null;
  const session = db.prepare("SELECT * FROM sessions WHERE token = ?").get(token);
  if (!session || session.expires_at < Date.now()) {
    if (session) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  const user = db.prepare("SELECT id, name, email, role FROM users WHERE id = ?").get(session.user_id);
  return user ? { ...user, token } : null;
}

export function requireAdmin(req, res) {
  const user = currentUser(req);
  if (!user || user.role !== "admin") {
    send(res, 401, { error: "관리자 로그인이 필요합니다." });
    return null;
  }
  return user;
}

export function sessionCookie(token, req) {
  const secure = isHttps(req);
  // HTTPS(미리보기/iframe)에서는 SameSite=None + Secure 여야 쿠키가 전달된다.
  const sameSite = secure ? "None" : "Lax";
  return `cuberry_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${Math.floor(SESSION_MS / 1000)}${secure ? "; Secure" : ""}`;
}

export function clearCookie(req) {
  const secure = req ? isHttps(req) : false;
  return `cuberry_session=; Path=/; HttpOnly; SameSite=${secure ? "None" : "Lax"}; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, Date.now() + SESSION_MS);
  return token;
}
