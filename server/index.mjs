import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_PATH = path.join(DATA_DIR, "cuberry.sqlite");
const SEED_PATH = path.join(__dirname, "seed.json");
const PORT = Number(process.env.PORT || 8080);
const HOST = "0.0.0.0";
const INITIAL_PASSWORD = "cuberry2026"; // 화면에 안내되는 기본 초기 비밀번호
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || INITIAL_PASSWORD;
const SESSION_MS = 1000 * 60 * 60 * 24 * 14;
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin'
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    brand_name TEXT NOT NULL,
    hero_eyebrow TEXT NOT NULL,
    hero_title TEXT NOT NULL,
    hero_subtitle TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    price TEXT NOT NULL,
    duration TEXT NOT NULL,
    description TEXT NOT NULL,
    accent TEXT NOT NULL DEFAULT 'lime',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    landing_slot TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS portfolio (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    year TEXT NOT NULL,
    description TEXT NOT NULL,
    video_url TEXT NOT NULL DEFAULT '',
    thumbnail_url TEXT,
    tags TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_featured INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    kind TEXT NOT NULL DEFAULT '광고',
    source TEXT NOT NULL DEFAULT 'extra',
    landing_slot TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    landing_slot TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS team (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    photo_url TEXT NOT NULL DEFAULT '',
    photo_position INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    landing_slot TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    project_type TEXT,
    budget TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

const nowIso = () => new Date().toISOString();
const bool = (value) => (value ? 1 : 0);
const flag = (value) => Boolean(value);

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const prev = Buffer.from(hash, "hex");
  return next.length === prev.length && timingSafeEqual(next, prev);
}

const adminAccount = {
  hasAdmin: false,
  passwordSource: "default", // default | environment | custom
  initialPasswordInUse: true,
};

let freshInstall = false;

function seedContent() {
  const existing = db.prepare("SELECT id FROM settings WHERE id = 1").get();
  if (existing) return;
  freshInstall = true;
  const seed = JSON.parse(readFileSync(SEED_PATH, "utf8"));
  const stamp = nowIso();
  const settings = seed.settings;
  db.prepare(`INSERT INTO settings (id, brand_name, hero_eyebrow, hero_title, hero_subtitle, contact_email, contact_phone, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)`).run(
    settings.brandName, settings.heroEyebrow, settings.heroTitle, settings.heroSubtitle,
    settings.contactEmail, settings.contactPhone, stamp,
  );
  const insertService = db.prepare(`INSERT INTO services
    (slug, name, price, duration, description, accent, sort_order, is_published, landing_slot, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const item of seed.services) {
    insertService.run(item.slug, item.name, item.price, item.duration, item.description, item.accent || "lime", item.sortOrder || 0, bool(item.isPublished), item.landingSlot || null, stamp);
  }
  const insertWork = db.prepare(`INSERT INTO portfolio
    (title, category, year, description, video_url, thumbnail_url, tags, sort_order, is_featured, is_published, kind, source, landing_slot, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const item of seed.portfolio) {
    insertWork.run(item.title, item.category, item.year, item.description, item.videoUrl || "", item.thumbnailUrl || null, item.tags || "", item.sortOrder || 0, bool(item.isFeatured), bool(item.isPublished), item.kind || "광고", item.source || "extra", item.landingSlot || null, stamp, stamp);
  }
  const insertFaq = db.prepare(`INSERT INTO faqs (question, answer, sort_order, is_published, landing_slot, updated_at) VALUES (?, ?, ?, ?, ?, ?)`);
  for (const item of seed.faqs) {
    insertFaq.run(item.question, item.answer, item.sortOrder || 0, bool(item.isPublished), item.landingSlot || null, stamp);
  }
  console.log("콘텐츠 시드 데이터를 새로 넣었습니다.");
}

// 관리자 계정은 콘텐츠 시드와 분리해서 항상 보장한다.
// (예전 버전으로 만들어진 DB에 users 행이 없으면 아무 비밀번호로도 로그인할 수 없던 문제 수정)
function ensureAdminUser() {
  const envPassword = String(process.env.ADMIN_PASSWORD || "");
  const forceReset = process.env.RESET_ADMIN_PASSWORD === "1" || process.env.ADMIN_PASSWORD_RESET === "1";
  const settingsRow = db.prepare("SELECT contact_email FROM settings WHERE id = 1").get();
  const email = settingsRow?.contact_email || null;
  const existing = db.prepare("SELECT * FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get();

  if (!existing) {
    const password = envPassword || DEFAULT_PASSWORD;
    db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')").run(
      "큐브베리 관리자",
      email,
      hashPassword(password),
    );
    adminAccount.hasAdmin = true;
    adminAccount.passwordSource = envPassword ? "environment" : "default";
    adminAccount.initialPasswordInUse = password === INITIAL_PASSWORD;
    console.log(envPassword
      ? "관리자 계정을 ADMIN_PASSWORD 환경변수 값으로 생성했습니다."
      : freshInstall
        ? `관리자 계정을 초기 비밀번호 ${INITIAL_PASSWORD} 로 생성했습니다.`
        : `관리자 계정이 없어서 초기 비밀번호 ${INITIAL_PASSWORD} 로 새로 만들었습니다.`);
    return;
  }

  adminAccount.hasAdmin = true;

  if (envPassword && forceReset && !verifyPassword(envPassword, existing.password_hash)) {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(envPassword), existing.id);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(existing.id);
    adminAccount.passwordSource = "environment";
    adminAccount.initialPasswordInUse = envPassword === INITIAL_PASSWORD;
    console.log("RESET_ADMIN_PASSWORD=1 → ADMIN_PASSWORD 환경변수 값으로 관리자 비밀번호를 재설정했습니다. (기존 세션 모두 로그아웃)");
    return;
  }

  adminAccount.initialPasswordInUse = verifyPassword(INITIAL_PASSWORD, existing.password_hash);
  if (adminAccount.initialPasswordInUse) {
    adminAccount.passwordSource = "default";
  } else if (envPassword && verifyPassword(envPassword, existing.password_hash)) {
    adminAccount.passwordSource = "environment";
  } else {
    adminAccount.passwordSource = "custom";
  }
  if (envPassword && forceReset) {
    console.log("ADMIN_PASSWORD 값이 이미 현재 비밀번호와 같아 재설정할 필요가 없습니다.");
  }
}

// 팀(PD·감독) 프로필은 나중에 추가된 기능이라 기존 DB에도 한 번만 시드한다.
// (관리자가 전부 삭제한 뒤 재시작해도 다시 생기지 않도록 meta 에 기록)
function seedTeam() {
  if (db.prepare("SELECT value FROM meta WHERE key = 'team_seeded'").get()) return;
  const hasRows = Number(db.prepare("SELECT COUNT(*) AS n FROM team").get().n || 0) > 0;
  if (!hasRows) {
    const seed = JSON.parse(readFileSync(SEED_PATH, "utf8"));
    const stamp = nowIso();
    const insert = db.prepare(`INSERT INTO team (name, role, bio, photo_url, photo_position, sort_order, is_published, landing_slot, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const item of seed.team || []) {
      insert.run(item.name, item.role || "", item.bio || "", item.photoUrl || "", clampPosition(item.photoPosition), item.sortOrder || 0, bool(item.isPublished !== false), item.landingSlot || null, stamp);
    }
    console.log("팀 프로필 시드 데이터를 넣었습니다.");
  }
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('team_seeded', ?)").run(nowIso());
}

function clampPosition(value) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}

seedContent();
seedTeam();
ensureAdminUser();

function rowSettings(row) {
  if (!row) return null;
  return {
    brandName: row.brand_name,
    heroEyebrow: row.hero_eyebrow,
    heroTitle: row.hero_title,
    heroSubtitle: row.hero_subtitle,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    updatedAt: row.updated_at,
  };
}

function rowService(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    price: row.price,
    duration: row.duration,
    description: row.description,
    accent: row.accent,
    sortOrder: row.sort_order,
    isPublished: flag(row.is_published),
    landingSlot: row.landing_slot,
    updatedAt: row.updated_at,
  };
}

function rowPortfolio(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    year: row.year,
    description: row.description,
    videoUrl: row.video_url,
    thumbnailUrl: row.thumbnail_url || "",
    tags: row.tags,
    sortOrder: row.sort_order,
    isFeatured: flag(row.is_featured),
    isPublished: flag(row.is_published),
    kind: row.kind,
    source: row.source,
    landingSlot: row.landing_slot,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowFaq(row) {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sort_order,
    isPublished: flag(row.is_published),
    landingSlot: row.landing_slot,
    updatedAt: row.updated_at,
  };
}

function rowTeam(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    bio: row.bio,
    photoUrl: row.photo_url || "",
    photoPosition: row.photo_position,
    sortOrder: row.sort_order,
    isPublished: flag(row.is_published),
    landingSlot: row.landing_slot,
    updatedAt: row.updated_at,
  };
}

function rowInquiry(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    email: row.email,
    company: row.company || "",
    phone: row.phone || "",
    projectType: row.project_type || "",
    budget: row.budget || "",
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function publicContent() {
  const settings = rowSettings(db.prepare("SELECT * FROM settings WHERE id = 1").get());
  const services = db.prepare("SELECT * FROM services WHERE is_published = 1 ORDER BY sort_order, id").all().map(rowService);
  const portfolio = db.prepare("SELECT * FROM portfolio WHERE is_published = 1 ORDER BY sort_order, id").all().map(rowPortfolio);
  const faqs = db.prepare("SELECT * FROM faqs WHERE is_published = 1 ORDER BY sort_order, id").all().map(rowFaq);
  const team = db.prepare("SELECT * FROM team WHERE is_published = 1 ORDER BY sort_order, id").all().map(rowTeam);
  return { settings, services, portfolio, faqs, team };
}

function adminContent() {
  return {
    settings: rowSettings(db.prepare("SELECT * FROM settings WHERE id = 1").get()),
    services: db.prepare("SELECT * FROM services ORDER BY sort_order, id").all().map(rowService),
    portfolio: db.prepare("SELECT * FROM portfolio ORDER BY sort_order, id").all().map(rowPortfolio),
    faqs: db.prepare("SELECT * FROM faqs ORDER BY sort_order, id").all().map(rowFaq),
    team: db.prepare("SELECT * FROM team ORDER BY sort_order, id").all().map(rowTeam),
    inquiries: db.prepare("SELECT * FROM inquiries ORDER BY datetime(created_at) DESC, id DESC").all().map(rowInquiry),
  };
}

function summary() {
  const count = (sql) => Number(db.prepare(sql).get().n || 0);
  return {
    portfolio: count("SELECT COUNT(*) AS n FROM portfolio"),
    published: count("SELECT COUNT(*) AS n FROM portfolio WHERE is_published = 1"),
    services: count("SELECT COUNT(*) AS n FROM services"),
    faqs: count("SELECT COUNT(*) AS n FROM faqs"),
    team: count("SELECT COUNT(*) AS n FROM team"),
    inquiries: count("SELECT COUNT(*) AS n FROM inquiries"),
    newInquiries: count("SELECT COUNT(*) AS n FROM inquiries WHERE status = 'new'"),
  };
}

function requireText(value, label, max = 4000) {
  const text = String(value ?? "").trim();
  if (!text) throw Object.assign(new Error(`${label}을(를) 입력해 주세요.`), { status: 400 });
  if (text.length > max) throw Object.assign(new Error(`${label}이(가) 너무 깁니다.`), { status: 400 });
  return text;
}

function optionalText(value, max = 4000) {
  const text = String(value ?? "").trim();
  return text.slice(0, max);
}

function requireEmail(value) {
  const email = requireText(value, "이메일", 320);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error("이메일 주소를 확인해 주세요."), { status: 400 });
  }
  return email;
}

const attempts = new Map();

// 실패한 시도만 기록한다. (예전에는 성공 로그인까지 세서 8회 이후 10분간 잠기는 문제가 있었다)
function attemptGate(key, limit, windowMs) {
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

function noteAttempt(key) {
  const bucket = attempts.get(key) || [];
  bucket.push(Date.now());
  attempts.set(key, bucket);
  return bucket.length;
}

function clearAttempts(key) {
  attempts.delete(key);
}

function formatWait(seconds) {
  if (seconds < 60) return `${seconds}초`;
  return `${Math.ceil(seconds / 60)}분`;
}

function readToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  // 프록시가 Authorization 헤더를 지우는 환경을 위한 대체 경로
  const custom = req.headers["x-admin-token"];
  if (custom) return String(custom).trim();
  const cookie = String(req.headers.cookie || "");
  const match = cookie.match(/(?:^|;\s*)cuberry_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function currentUser(req) {
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

function requireAdmin(req, res) {
  const user = currentUser(req);
  if (!user || user.role !== "admin") {
    send(res, 401, { error: "관리자 로그인이 필요합니다." });
    return null;
  }
  return user;
}

function send(res, status, body, headers = {}) {
  const payload = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": payload.length,
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(payload);
}

function readBody(req, limit = 8_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error("요청이 너무 큽니다."), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("JSON 형식을 확인해 주세요."), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function isHttps(req) {
  return req.headers["x-forwarded-proto"] === "https" || process.env.COOKIE_SECURE === "1" || Boolean(req.socket?.encrypted);
}

function sessionCookie(token, req) {
  const secure = isHttps(req);
  // HTTPS(미리보기/iframe)에서는 SameSite=None + Secure 여야 쿠키가 전달된다.
  const sameSite = secure ? "None" : "Lax";
  return `cuberry_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${Math.floor(SESSION_MS / 1000)}${secure ? "; Secure" : ""}`;
}

function clearCookie(req) {
  const secure = req ? isHttps(req) : false;
  return `cuberry_session=; Path=/; HttpOnly; SameSite=${secure ? "None" : "Lax"}; Max-Age=0${secure ? "; Secure" : ""}`;
}

function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, Date.now() + SESSION_MS);
  return token;
}

function nextInquiryCode() {
  const row = db.prepare("SELECT COUNT(*) AS n FROM inquiries").get();
  return `CB-${String(Number(row.n) + 1).padStart(4, "0")}`;
}

function saveUpload(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) throw Object.assign(new Error("이미지 파일만 업로드할 수 있습니다."), { status: 400 });
  const ext = match[1].includes("png") ? "png" : match[1].includes("webp") ? "webp" : match[1].includes("gif") ? "gif" : "jpg";
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 4_000_000) throw Object.assign(new Error("이미지는 4MB 이하로 올려 주세요."), { status: 400 });
  const name = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  writeFileSync(path.join(UPLOAD_DIR, name), buffer);
  return `/uploads/${name}`;
}

function upsertPortfolio(id, input) {
  const title = requireText(input.title, "작품명", 180);
  const category = requireText(input.category, "유형", 80);
  const year = requireText(input.year, "연도", 12);
  const description = requireText(input.description, "설명");
  const videoUrl = optionalText(input.videoUrl, 2000);
  let thumbnailUrl = optionalText(input.thumbnailUrl, 2000);
  if (input.thumbnailDataUrl) thumbnailUrl = saveUpload(input.thumbnailDataUrl);
  const tags = optionalText(input.tags, 500) || "CUBERRY";
  const sortOrder = Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0;
  const kind = optionalText(input.kind, 40) || "광고";
  const stamp = nowIso();
  if (id) {
    const current = db.prepare("SELECT id FROM portfolio WHERE id = ?").get(id);
    if (!current) throw Object.assign(new Error("작품을 찾을 수 없습니다."), { status: 404 });
    db.prepare(`UPDATE portfolio SET title=?, category=?, year=?, description=?, video_url=?, thumbnail_url=?, tags=?, sort_order=?, is_featured=?, is_published=?, kind=?, updated_at=? WHERE id=?`).run(
      title, category, year, description, videoUrl, thumbnailUrl || null, tags, sortOrder, bool(input.isFeatured), bool(input.isPublished), kind, stamp, id,
    );
    return id;
  }
  const result = db.prepare(`INSERT INTO portfolio
    (title, category, year, description, video_url, thumbnail_url, tags, sort_order, is_featured, is_published, kind, source, landing_slot, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'extra', NULL, ?, ?)`).run(
    title, category, year, description, videoUrl, thumbnailUrl || null, tags, sortOrder, bool(input.isFeatured), bool(input.isPublished !== false), kind, stamp, stamp,
  );
  return Number(result.lastInsertRowid);
}

function upsertService(id, input) {
  const slug = requireText(input.slug, "슬러그", 80).toLowerCase().replace(/\s+/g, "-");
  const name = requireText(input.name, "상품명", 160);
  const price = requireText(input.price, "가격", 60);
  const duration = requireText(input.duration, "구성", 80);
  const description = requireText(input.description, "설명");
  const accent = optionalText(input.accent, 40) || "lime";
  const sortOrder = Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0;
  const stamp = nowIso();
  if (id) {
    const current = db.prepare("SELECT id, landing_slot FROM services WHERE id = ?").get(id);
    if (!current) throw Object.assign(new Error("상품을 찾을 수 없습니다."), { status: 404 });
    db.prepare(`UPDATE services SET slug=?, name=?, price=?, duration=?, description=?, accent=?, sort_order=?, is_published=?, updated_at=? WHERE id=?`).run(
      slug, name, price, duration, description, accent, sortOrder, bool(input.isPublished), stamp, id,
    );
    return id;
  }
  const result = db.prepare(`INSERT INTO services (slug, name, price, duration, description, accent, sort_order, is_published, landing_slot, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`).run(slug, name, price, duration, description, accent, sortOrder, bool(input.isPublished !== false), stamp);
  return Number(result.lastInsertRowid);
}

function upsertTeam(id, input) {
  const name = requireText(input.name, "이름", 120);
  const role = optionalText(input.role, 200);
  // 이력은 한 줄에 하나씩. 빈 줄은 버린다.
  const bio = String(input.bio ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join("\n").slice(0, 4000);
  let photoUrl = input.removePhoto ? "" : optionalText(input.photoUrl, 2000);
  if (input.photoDataUrl) photoUrl = saveUpload(input.photoDataUrl);
  if (photoUrl && !/^(https?:\/\/|\/)/.test(photoUrl)) {
    throw Object.assign(new Error("사진 URL은 https:// 또는 / 로 시작해야 합니다."), { status: 400 });
  }
  const photoPosition = clampPosition(input.photoPosition);
  const sortOrder = Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0;
  const stamp = nowIso();
  if (id) {
    const current = db.prepare("SELECT id FROM team WHERE id = ?").get(id);
    if (!current) throw Object.assign(new Error("프로필을 찾을 수 없습니다."), { status: 404 });
    db.prepare(`UPDATE team SET name=?, role=?, bio=?, photo_url=?, photo_position=?, sort_order=?, is_published=?, updated_at=? WHERE id=?`).run(
      name, role, bio, photoUrl, photoPosition, sortOrder, bool(input.isPublished), stamp, id,
    );
    return id;
  }
  const result = db.prepare(`INSERT INTO team (name, role, bio, photo_url, photo_position, sort_order, is_published, landing_slot, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`).run(name, role, bio, photoUrl, photoPosition, sortOrder, bool(input.isPublished !== false), stamp);
  return Number(result.lastInsertRowid);
}

function upsertFaq(id, input) {
  const question = requireText(input.question, "질문", 240);
  const answer = requireText(input.answer, "답변");
  const sortOrder = Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0;
  const stamp = nowIso();
  if (id) {
    const current = db.prepare("SELECT id FROM faqs WHERE id = ?").get(id);
    if (!current) throw Object.assign(new Error("FAQ를 찾을 수 없습니다."), { status: 404 });
    db.prepare("UPDATE faqs SET question=?, answer=?, sort_order=?, is_published=?, updated_at=? WHERE id=?").run(
      question, answer, sortOrder, bool(input.isPublished), stamp, id,
    );
    return id;
  }
  const result = db.prepare("INSERT INTO faqs (question, answer, sort_order, is_published, landing_slot, updated_at) VALUES (?, ?, ?, ?, NULL, ?)").run(
    question, answer, sortOrder, bool(input.isPublished !== false), stamp,
  );
  return Number(result.lastInsertRowid);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".txt": "text/plain; charset=utf-8",
};

function safeFile(urlPath, base) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const resolved = path.resolve(base, `.${decoded}`);
  if (!resolved.startsWith(base)) return null;
  return resolved;
}

function serveFile(req, res, filePath) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  const stat = statSync(filePath);
  const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  const range = req.headers.range;
  if (range && stat.size > 0) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      let start = match[1] ? Number(match[1]) : 0;
      let end = match[2] ? Number(match[2]) : stat.size - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= stat.size) {
        res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
        res.end();
        return;
      }
      end = Math.min(end, stat.size - 1);
      res.writeHead(206, {
        "Content-Type": type,
        "Content-Length": end - start + 1,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      });
      createReadStream(filePath, { start, end }).pipe(res);
      return;
    }
  }
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": stat.size,
    "Accept-Ranges": "bytes",
    "Cache-Control": filePath.endsWith("index.html") ? "no-store" : "public, max-age=3600",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
}

async function handleApi(req, res, url) {
  const { pathname } = url;
  if (req.method === "GET" && pathname === "/api/health") return send(res, 200, { ok: true });
  if (req.method === "GET" && pathname === "/api/public/content") return send(res, 200, publicContent());
  if (req.method === "GET" && pathname === "/api/auth/status") {
    return send(res, 200, {
      ok: true,
      hasAdmin: adminAccount.hasAdmin,
      initialPasswordInUse: adminAccount.initialPasswordInUse,
      passwordSource: adminAccount.passwordSource,
    });
  }
  if (req.method === "GET" && pathname === "/api/auth/me") {
    const user = currentUser(req);
    if (!user) return send(res, 401, { error: "로그인이 필요합니다." });
    return send(res, 200, { id: user.id, name: user.name, email: user.email, role: user.role });
  }
  if (req.method === "POST" && pathname === "/api/auth/login") {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local";
    const key = `login:${ip}`;
    const gate = attemptGate(key, LOGIN_LIMIT, LOGIN_WINDOW_MS);
    if (gate.blocked) {
      return send(res, 429, {
        error: `비밀번호를 여러 번 틀렸습니다. ${formatWait(gate.retryAfter)} 후 다시 시도해 주세요.`,
        retryAfter: gate.retryAfter,
      }, { "Retry-After": String(gate.retryAfter) });
    }
    const body = await readBody(req);
    const password = String(body.password || "");
    const user = db.prepare("SELECT * FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get();
    if (!user) {
      // 서버가 관리자 계정 없이 떠 있는 비정상 상태 (재시작하면 자동 생성됨)
      console.error("관리자 계정이 없습니다. 서버를 재시작하면 자동으로 생성됩니다.");
      return send(res, 503, { error: "관리자 계정이 아직 없습니다. 서버를 재시작해 주세요." });
    }
    if (!verifyPassword(password, user.password_hash)) {
      const used = noteAttempt(key);
      const left = Math.max(0, LOGIN_LIMIT - used);
      console.warn(`로그인 실패 (${ip}) ${used}/${LOGIN_LIMIT} - 비밀번호 ${password.length}자, 본문 키: [${Object.keys(body).join(",")}]`);
      return send(res, 401, {
        error: left > 0 ? "비밀번호가 올바르지 않습니다." : `비밀번호를 여러 번 틀렸습니다. ${formatWait(LOGIN_WINDOW_MS / 1000)} 후 다시 시도해 주세요.`,
        attemptsLeft: left,
      });
    }
    clearAttempts(key);
    const token = createSession(user.id);
    return send(res, 200, {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      initialPasswordInUse: verifyPassword(INITIAL_PASSWORD, user.password_hash),
    }, { "Set-Cookie": sessionCookie(token, req) });
  }
  if (req.method === "POST" && pathname === "/api/auth/logout") {
    const token = readToken(req);
    if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return send(res, 200, { ok: true }, { "Set-Cookie": clearCookie(req) });
  }
  if (req.method === "POST" && pathname === "/api/partnership") {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local";
    const leadKey = `lead:${ip}`;
    if (attemptGate(leadKey, 20, 60 * 60 * 1000).blocked) return send(res, 429, { error: "잠시 후 다시 문의해 주세요." });
    noteAttempt(leadKey);
    const body = await readBody(req);
    const name = requireText(body.contactName || body.name, "담당자명", 120);
    const email = requireEmail(body.email);
    const message = optionalText(body.brief || body.message, 8000) || "(내용 없음)";
    const stamp = nowIso();
    const code = nextInquiryCode();
    const result = db.prepare(`INSERT INTO inquiries (code, name, email, company, phone, project_type, budget, message, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`).run(
      code, name, email, optionalText(body.company, 160), optionalText(body.phone, 40),
      optionalText(body.projectType, 120), optionalText(body.budget, 80), message, stamp, stamp,
    );
    return send(res, 200, { id: code, inquiryId: Number(result.lastInsertRowid) });
  }

  const user = requireAdmin(req, res);
  if (!user) return;
  if (req.method === "POST" && pathname === "/api/auth/password") {
    const body = await readBody(req);
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
    if (!verifyPassword(String(body.currentPassword || ""), row.password_hash)) return send(res, 400, { error: "현재 비밀번호가 올바르지 않습니다." });
    const next = String(body.nextPassword || "");
    if (next.length < 8) return send(res, 400, { error: "새 비밀번호는 8자 이상으로 설정해 주세요." });
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(next), user.id);
    adminAccount.initialPasswordInUse = next === INITIAL_PASSWORD;
    adminAccount.passwordSource = adminAccount.initialPasswordInUse ? "default" : "custom";
    console.log("관리자 비밀번호를 변경했습니다.");
    return send(res, 200, { ok: true });
  }
  if (req.method === "GET" && pathname === "/api/admin/summary") return send(res, 200, summary());
  if (req.method === "GET" && pathname === "/api/admin/content") return send(res, 200, adminContent());
  if (req.method === "PUT" && pathname === "/api/admin/settings") {
    const body = await readBody(req);
    const stamp = nowIso();
    db.prepare(`UPDATE settings SET brand_name=?, hero_eyebrow=?, hero_title=?, hero_subtitle=?, contact_email=?, contact_phone=?, updated_at=? WHERE id=1`).run(
      requireText(body.brandName, "브랜드명", 120),
      requireText(body.heroEyebrow, "히어로 문구", 180),
      requireText(body.heroTitle, "히어로 제목", 240),
      requireText(body.heroSubtitle, "히어로 설명"),
      requireEmail(body.contactEmail),
      requireText(body.contactPhone, "전화번호", 40),
      stamp,
    );
    return send(res, 200, { ok: true, settings: rowSettings(db.prepare("SELECT * FROM settings WHERE id = 1").get()) });
  }

  const portfolioMatch = pathname.match(/^\/api\/admin\/portfolio(?:\/(\d+))?$/);
  if (portfolioMatch) {
    const id = portfolioMatch[1] ? Number(portfolioMatch[1]) : null;
    if (req.method === "POST" && !id) return send(res, 200, { id: upsertPortfolio(null, await readBody(req)) });
    if (req.method === "PUT" && id) return send(res, 200, { id: upsertPortfolio(id, await readBody(req)) });
    if (req.method === "DELETE" && id) {
      db.prepare("DELETE FROM portfolio WHERE id = ?").run(id);
      return send(res, 200, { ok: true });
    }
  }
  const serviceMatch = pathname.match(/^\/api\/admin\/services(?:\/(\d+))?$/);
  if (serviceMatch) {
    const id = serviceMatch[1] ? Number(serviceMatch[1]) : null;
    if (req.method === "POST" && !id) return send(res, 200, { id: upsertService(null, await readBody(req)) });
    if (req.method === "PUT" && id) return send(res, 200, { id: upsertService(id, await readBody(req)) });
    if (req.method === "DELETE" && id) {
      db.prepare("DELETE FROM services WHERE id = ?").run(id);
      return send(res, 200, { ok: true });
    }
  }
  const faqMatch = pathname.match(/^\/api\/admin\/faqs(?:\/(\d+))?$/);
  if (faqMatch) {
    const id = faqMatch[1] ? Number(faqMatch[1]) : null;
    if (req.method === "POST" && !id) return send(res, 200, { id: upsertFaq(null, await readBody(req)) });
    if (req.method === "PUT" && id) return send(res, 200, { id: upsertFaq(id, await readBody(req)) });
    if (req.method === "DELETE" && id) {
      db.prepare("DELETE FROM faqs WHERE id = ?").run(id);
      return send(res, 200, { ok: true });
    }
  }
  const teamMatch = pathname.match(/^\/api\/admin\/team(?:\/(\d+))?$/);
  if (teamMatch) {
    const id = teamMatch[1] ? Number(teamMatch[1]) : null;
    if (req.method === "POST" && !id) return send(res, 200, { id: upsertTeam(null, await readBody(req)) });
    if (req.method === "PUT" && id) return send(res, 200, { id: upsertTeam(id, await readBody(req)) });
    if (req.method === "DELETE" && id) {
      db.prepare("DELETE FROM team WHERE id = ?").run(id);
      return send(res, 200, { ok: true });
    }
  }
  const inquiryMatch = pathname.match(/^\/api\/admin\/inquiries\/(\d+)$/);
  if (inquiryMatch && req.method === "PATCH") {
    const body = await readBody(req);
    const status = String(body.status || "");
    if (!["new", "contacted", "closed"].includes(status)) return send(res, 400, { error: "상태를 확인해 주세요." });
    const result = db.prepare("UPDATE inquiries SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), Number(inquiryMatch[1]));
    if (!result.changes) return send(res, 404, { error: "문의를 찾을 수 없습니다." });
    return send(res, 200, { ok: true });
  }
  return send(res, 404, { error: "API를 찾을 수 없습니다." });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      serveFile(req, res, path.join(ROOT, "admin", "index.html"));
      return;
    }
    if (url.pathname === "/cms-bridge.js") {
      serveFile(req, res, path.join(ROOT, "cms-bridge.js"));
      return;
    }
    if (url.pathname.startsWith("/uploads/")) {
      const file = safeFile(url.pathname.slice("/uploads".length), UPLOAD_DIR);
      if (!file) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      serveFile(req, res, file);
      return;
    }
    if (url.pathname.startsWith("/portfolio_thumbs/") || url.pathname.startsWith("/team_portraits/")) {
      const file = safeFile(url.pathname, ROOT);
      if (!file) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      serveFile(req, res, file);
      return;
    }
    if (url.pathname === "/us-ad-rere.mp4") {
      serveFile(req, res, path.join(ROOT, "us-ad-rere.mp4"));
      return;
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      serveFile(req, res, path.join(ROOT, "index.html"));
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error(error);
    if (!res.headersSent) send(res, status, { error: error.message || "서버 오류가 발생했습니다." });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Cuberry site  http://${HOST}:${PORT}/`);
  console.log(`Cuberry admin http://${HOST}:${PORT}/admin`);
  if (!adminAccount.hasAdmin) {
    console.log("경고: 관리자 계정이 없습니다. 서버를 재시작하면 초기 계정이 생성됩니다.");
  } else if (adminAccount.initialPasswordInUse) {
    if (adminAccount.passwordSource === "environment") {
      console.log("Login: ADMIN_PASSWORD 환경변수로 설정된 비밀번호");
    } else {
      console.log(`Login: 초기 비밀번호 ${INITIAL_PASSWORD} (아직 변경되지 않음)`);
    }
  } else {
    console.log("Login: 설정된 관리자 비밀번호를 사용하세요.");
    console.log("       비밀번호를 잊었다면 ADMIN_PASSWORD=새비밀번호 RESET_ADMIN_PASSWORD=1 로 재시작하세요.");
  }
});
