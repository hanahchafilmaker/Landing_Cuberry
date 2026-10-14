// 콘텐츠 — DB 행 ↔ 응답 매핑 · 공개/관리자 콘텐츠 · seed 내보내기 · 요약 · 입력 검증 · 업서트 · 업로드.
// index.mjs 에서 그대로 옮겨온 파일이다(동작 변경 없음).
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { UPLOAD_DIR } from "./config.mjs";
import { backupStatus, bool, clampPosition, db, flag, nowIso } from "./db.mjs";
import { lastNotification, notificationStatusMap } from "./notify.mjs";

export function rowSettings(row) {
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

export function rowService(row) {
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

export function rowPortfolio(row) {
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

export function rowFaq(row) {
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

export function rowTeam(row) {
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

export function rowInquiry(row) {
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

export function publicContent() {
  const settings = rowSettings(db.prepare("SELECT * FROM settings WHERE id = 1").get());
  const services = db.prepare("SELECT * FROM services WHERE is_published = 1 ORDER BY sort_order, id").all().map(rowService);
  const portfolio = db.prepare("SELECT * FROM portfolio WHERE is_published = 1 ORDER BY sort_order, id").all().map(rowPortfolio);
  const faqs = db.prepare("SELECT * FROM faqs WHERE is_published = 1 ORDER BY sort_order, id").all().map(rowFaq);
  const team = db.prepare("SELECT * FROM team WHERE is_published = 1 ORDER BY sort_order, id").all().map(rowTeam);
  return { settings, services, portfolio, faqs, team };
}

export function adminContent() {
  // 알림 배지용 상태를 한 번의 쿼리로 묶어 N+1 을 피한다.
  const notifStatus = notificationStatusMap(db);
  return {
    settings: rowSettings(db.prepare("SELECT * FROM settings WHERE id = 1").get()),
    services: db.prepare("SELECT * FROM services ORDER BY sort_order, id").all().map(rowService),
    portfolio: db.prepare("SELECT * FROM portfolio ORDER BY sort_order, id").all().map(rowPortfolio),
    faqs: db.prepare("SELECT * FROM faqs ORDER BY sort_order, id").all().map(rowFaq),
    team: db.prepare("SELECT * FROM team ORDER BY sort_order, id").all().map(rowTeam),
    inquiries: db.prepare("SELECT * FROM inquiries ORDER BY datetime(created_at) DESC, id DESC").all().map((row) => ({
      ...rowInquiry(row),
      // 채널이 하나도 없으면(알림 env 미설정) null → 화면에 배지 없음.
      notificationStatus: notifStatus.get(row.id) ?? null,
    })),
  };
}

// 현재 콘텐츠를 server/seed.json 과 같은 형태로 내보낸다.
// Render 무료 인스턴스처럼 디스크가 휘발성인 환경에서는, 이 파일을 seed.json 으로 커밋해 두면
// 재배포·재시작 때마다 최신 콘텐츠로 자동으로 다시 시작한다.
export function exportSeed() {
  const omit = (object, keys) => Object.fromEntries(Object.entries(object || {}).filter(([key]) => !keys.includes(key)));
  const content = adminContent();
  return {
    exportedAt: nowIso(),
    settings: omit(content.settings, ["updatedAt"]),
    services: content.services.map((item) => omit(item, ["id", "updatedAt"])),
    portfolio: content.portfolio.map((item) => omit(item, ["id", "createdAt", "updatedAt"])),
    faqs: content.faqs.map((item) => omit(item, ["id", "updatedAt"])),
    team: content.team.map((item) => omit(item, ["id", "updatedAt"])),
    // 문의로 들어온 상담 기록. seed 로더는 이 키를 읽지 않지만 백업에 함께 담아둔다.
    // notificationStatus 는 매번 바뀌는 파생 값이라 백업에서 제외한다.
    inquiries: content.inquiries.map((item) => omit(item, ["id", "updatedAt", "notificationStatus"])),
  };
}

export function summary() {
  const count = (sql) => Number(db.prepare(sql).get().n || 0);
  return {
    portfolio: count("SELECT COUNT(*) AS n FROM portfolio"),
    published: count("SELECT COUNT(*) AS n FROM portfolio WHERE is_published = 1"),
    services: count("SELECT COUNT(*) AS n FROM services"),
    faqs: count("SELECT COUNT(*) AS n FROM faqs"),
    team: count("SELECT COUNT(*) AS n FROM team"),
    inquiries: count("SELECT COUNT(*) AS n FROM inquiries"),
    newInquiries: count("SELECT COUNT(*) AS n FROM inquiries WHERE status = 'new'"),
    // 개요 화면의 "마지막 문의 알림" 한 줄. 알림 행이 없으면 null.
    lastNotification: lastNotification(db),
    // 개요 화면의 "마지막 백업" 한 줄(Phase 3). 백업을 한 번도 안 했으면 둘 다 null.
    ...backupStatus(),
  };
}

export function requireText(value, label, max = 4000) {
  const text = String(value ?? "").trim();
  if (!text) throw Object.assign(new Error(`${label}을(를) 입력해 주세요.`), { status: 400 });
  if (text.length > max) throw Object.assign(new Error(`${label}이(가) 너무 깁니다.`), { status: 400 });
  return text;
}

export function optionalText(value, max = 4000) {
  const text = String(value ?? "").trim();
  return text.slice(0, max);
}

export function requireEmail(value) {
  const email = requireText(value, "이메일", 320);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error("이메일 주소를 확인해 주세요."), { status: 400 });
  }
  return email;
}

// data-URL 의 MIME 문자열만 믿으면 "image/png 라고 주장하는 임의의 바이트"가 그대로 저장된다.
// 실제 이미지 시그니처를 확인하고, 확장자는 선언이 아니라 내용으로 정한다.
export const IMAGE_SIGNATURES = [
  { ext: "png", mime: "image/png", test: (buf) => buf.length > 24 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "jpg", mime: "image/jpeg", test: (buf) => buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff },
  { ext: "gif", mime: "image/gif", test: (buf) => ["GIF87a", "GIF89a"].includes(buf.subarray(0, 6).toString("latin1")) },
  { ext: "webp", mime: "image/webp", test: (buf) => buf.length > 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP" },
];

export function saveUpload(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) throw Object.assign(new Error("이미지 파일만 업로드할 수 있습니다."), { status: 400 });
  const declared = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 4_000_000) throw Object.assign(new Error("이미지는 4MB 이하로 올려 주세요."), { status: 400 });
  const signature = IMAGE_SIGNATURES.find((item) => item.test(buffer));
  if (!signature || signature.mime !== declared) {
    throw Object.assign(new Error("이미지 파일 내용을 확인할 수 없습니다. 실제 이미지인지 확인해 주세요."), { status: 400 });
  }
  const name = `${Date.now()}-${randomBytes(4).toString("hex")}.${signature.ext}`;
  writeFileSync(path.join(UPLOAD_DIR, name), buffer);
  return `/uploads/${name}`;
}

export function upsertPortfolio(id, input) {
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

export function upsertService(id, input) {
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

export function upsertTeam(id, input) {
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

export function upsertFaq(id, input) {
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
