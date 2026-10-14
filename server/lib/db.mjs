// SQLite 열기 · 스키마 · 시드 · meta 헬퍼.
// index.mjs 에서 그대로 옮겨온 파일이다(동작 변경 없음).
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { DB_PATH, SEED_PATH } from "./config.mjs";
import { LAST_BACKUP_AT_KEY, LAST_BACKUP_HASH_KEY } from "./backup.mjs";

export const db = new DatabaseSync(DB_PATH);
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
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY,
    inquiry_id INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    target TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL,
    sent_at TEXT,
    UNIQUE (inquiry_id, channel)
  );
`);

export const nowIso = () => new Date().toISOString();
export const bool = (value) => (value ? 1 : 0);
export const flag = (value) => Boolean(value);

export let freshInstall = false;

export function seedContent() {
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

// 팀(PD·감독) 프로필은 나중에 추가된 기능이라 기존 DB에도 한 번만 시드한다.
// (관리자가 전부 삭제한 뒤 재시작해도 다시 생기지 않도록 meta 에 기록)
export function seedTeam() {
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

export function clampPosition(value) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}

// ── Phase 3: 백업 상태 (meta 테이블) ────────────────────────────────────
// meta 는 key/value 한 줄짜리 표다. last_backup_hash/last_backup_at 을 남겨
// ① 크론이 "내용이 그대로면 커밋하지 않는" 판단을 하고 ② 어드민 개요가 마지막 백업을 보여준다.
export function metaGet(key) {
  return db.prepare("SELECT value FROM meta WHERE key = ?").get(key)?.value ?? null;
}

export function metaSet(key, value) {
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(key, String(value));
}

export function backupStatus() {
  return { lastBackupAt: metaGet(LAST_BACKUP_AT_KEY), lastBackupHash: metaGet(LAST_BACKUP_HASH_KEY) };
}
