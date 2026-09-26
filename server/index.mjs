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
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || "cuberry2026";
const SESSION_MS = 1000 * 60 * 60 * 24 * 14;

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

function seedIfEmpty() {
  const existing = db.prepare("SELECT id FROM settings WHERE id = 1").get();
  if (existing) return;
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
  db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')").run(
    "큐브베리 관리자",
    settings.contactEmail,
    hashPassword(DEFAULT_PASSWORD),
  );
}

seedIfEmpty();

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
  return { settings, services, portfolio, faqs };
}

function adminContent() {
  return {
    settings: rowSettings(db.prepare("SELECT * FROM settings WHERE id = 1").get()),
    services: db.prepare("SELECT * FROM services ORDER BY sort_order, id").all().map(rowService),
    portfolio: db.prepare("SELECT * FROM portfolio ORDER BY sort_order, id").all().map(rowPortfolio),
    faqs: db.prepare("SELECT * FROM faqs ORDER BY sort_order, id").all().map(rowFaq),
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

const loginAttempts = new Map();
function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const bucket = (loginAttempts.get(key) || []).filter((ts) => now - ts < windowMs);
  if (bucket.length >= limit) return false;
  bucket.push(now);
  loginAttempts.set(key, bucket);
  return true;
}

function readToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
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

function sessionCookie(token, req) {
  const secure = req.headers["x-forwarded-proto"] === "https" || process.env.COOKIE_SECURE === "1";
  return `cuberry_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_MS / 1000)}${secure ? "; Secure" : ""}`;
}

function clearCookie() {
  return "cuberry_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
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
  if (req.method === "GET" && pathname === "/api/auth/me") {
    const user = currentUser(req);
    if (!user) return send(res, 401, { error: "로그인이 필요합니다." });
    return send(res, 200, { id: user.id, name: user.name, email: user.email, role: user.role });
  }
  if (req.method === "POST" && pathname === "/api/auth/login") {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local";
    if (!rateLimit(`login:${ip}`, 8, 10 * 60 * 1000)) return send(res, 429, { error: "시도 횟수가 많습니다. 잠시 후 다시 로그인해 주세요." });
    const body = await readBody(req);
    const password = String(body.password || "");
    const user = db.prepare("SELECT * FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get();
    if (!user || !verifyPassword(password, user.password_hash)) return send(res, 401, { error: "비밀번호가 올바르지 않습니다." });
    const token = createSession(user.id);
    return send(res, 200, { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } }, { "Set-Cookie": sessionCookie(token, req) });
  }
  if (req.method === "POST" && pathname === "/api/auth/logout") {
    const token = readToken(req);
    if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return send(res, 200, { ok: true }, { "Set-Cookie": clearCookie() });
  }
  if (req.method === "POST" && pathname === "/api/partnership") {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local";
    if (!rateLimit(`lead:${ip}`, 20, 60 * 60 * 1000)) return send(res, 429, { error: "잠시 후 다시 문의해 주세요." });
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
  const hint = process.env.ADMIN_PASSWORD ? "ADMIN_PASSWORD 환경변수" : `초기 비밀번호 ${DEFAULT_PASSWORD}`;
  console.log(`Cuberry site  http://${HOST}:${PORT}/`);
  console.log(`Cuberry admin http://${HOST}:${PORT}/admin`);
  console.log(`Login: ${hint}`);
});
