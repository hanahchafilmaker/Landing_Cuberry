// ── Phase 1: 문의 알림 (웹훅 · 이메일) ───────────────────────────────────
// 설계: docs/ops-hardening-plan.md §3
//
// 원칙 3가지 (설계 문서와 동일):
//   1. 의존성 0 — fetch 만 쓴다 (nodemailer / slack SDK 없음).
//   2. 알림 실패가 문의 접수를 막지 않는다 — 발송은 항상 백그라운드로 돌고,
//      최종 실패해도 inquiries 행은 그대로 남는다.
//   3. 상태는 notifications 테이블에 남긴다 — 어드민에서 재발송할 수 있다.
//
// 채널 확장: 새 채널(Telegram · SMS 등)은 activeChannels() 에 항목 하나와
// send*() 함수 하나를 추가하면 된다.

const DEFAULT_RETRY_DELAYS_MS = [1000, 5000, 25000]; // 1s → 5s → 25s (최대 3회 재시도)
const SEND_TIMEOUT_MS = 8000;

// 발송 중인 notification id — 자동 재시도와 어드민 재발송이 겹치지 않게 한다.
const inflight = new Set();

const on = (value) => /^(1|true|yes|on)$/i.test(String(value ?? "").trim());

// 알림 관련 환경변수를 한 곳에서 읽는다. 전부 미설정이면 채널이 하나도
// 잡히지 않아 아무 일도 일어나지 않는다(= 기존과 완전히 같은 동작).
export function notifyConfig(env = process.env) {
  return {
    disabled: on(env.NOTIFY_DISABLED),
    webhookUrl: String(env.NOTIFY_WEBHOOK_URL || "").trim(),
    emailTo: String(env.NOTIFY_EMAIL_TO || "").split(",").map((value) => value.trim()).filter(Boolean),
    resendApiKey: String(env.RESEND_API_KEY || "").trim(),
    emailFrom: String(env.NOTIFY_EMAIL_FROM || "Cuberry <onboarding@resend.dev>").trim(),
    // 테스트가 로컬 목 서버를 가리키도록 오버라이드하는 용도(운영은 기본값 사용).
    resendUrl: String(env.RESEND_API_URL || "https://api.resend.com/emails").trim(),
    maskContact: on(env.NOTIFY_MASK_CONTACT),
    retryDelaysMs: parseRetryDelays(env.NOTIFY_RETRY_DELAYS_MS),
    publicOrigin: String(env.PUBLIC_ORIGIN || env.RENDER_EXTERNAL_URL || "").replace(/\/+$/, ""),
    port: Number(env.PORT || 8080),
  };
}

export function parseRetryDelays(value) {
  const parsed = String(value ?? "")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return parsed.length ? parsed : [...DEFAULT_RETRY_DELAYS_MS];
}

// ab***@gmail.com — 서드파티 채널으로 나가는 연락처를 최소화한다.
export function maskEmail(value) {
  const text = String(value || "");
  const at = text.indexOf("@");
  if (at <= 0) return "***";
  const local = text.slice(0, at);
  return `${local.slice(0, 2)}***${text.slice(at)}`;
}

// 010-****-5678 — 가운데 자리를 가린다.
export function maskPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 7) return "***";
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

function adminOrigin(cfg) {
  return cfg.publicOrigin || `http://127.0.0.1:${cfg.port}`;
}

// 웹훅 본문 텍스트. Slack · Google Chat · n8n 등에서 그대로 읽히는 모양이다.
export function webhookText(inquiry, cfg) {
  const contact = [
    cfg.maskContact ? maskEmail(inquiry.email) : inquiry.email,
    inquiry.phone ? (cfg.maskContact ? maskPhone(inquiry.phone) : inquiry.phone) : null,
  ].filter(Boolean).join(" · ");
  const meta = [inquiry.name, inquiry.company, inquiry.projectType, inquiry.budget].filter(Boolean).join(" · ");
  const summary = String(inquiry.message || "").replace(/\s+/g, " ").trim().slice(0, 120);
  return [
    `[Cuberry] 새 상담 문의 ${inquiry.code}`,
    meta,
    contact,
    summary,
    `→ 어드민에서 확인: ${adminOrigin(cfg)}/admin-v2`,
  ].filter(Boolean).join("\n");
}

// 설정된 채널만 돌려준다. webhookUrl 비어 있으면 webhook 채널 없음,
// EMAIL_TO + RESEND_API_KEY 중 하나라도 없으면 email 채널 없음.
export function activeChannels(cfg) {
  const channels = [];
  if (cfg.webhookUrl) {
    let host = cfg.webhookUrl;
    try { host = new URL(cfg.webhookUrl).host; } catch { /* URL 아님 — 원문 유지 */ }
    channels.push({ channel: "webhook", target: host });
  }
  if (cfg.emailTo.length && cfg.resendApiKey) {
    channels.push({ channel: "email", target: cfg.emailTo.join(", ") });
  }
  return channels;
}

async function sendWebhook(cfg, inquiry) {
  const text = webhookText(inquiry, cfg);
  const response = await fetch(cfg.webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text,
      blocks: [{ type: "section", text: { type: "mrkdwn", text } }],
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`웹훅 HTTP ${response.status}`);
}

async function sendEmail(cfg, inquiry) {
  const subject = `[Cuberry] 새 상담 문의 ${inquiry.code} — ${inquiry.name}`;
  const rows = [
    ["담당자", inquiry.name],
    ["회사", inquiry.company],
    ["프로젝트", inquiry.projectType],
    ["예산", inquiry.budget],
    ["이메일", cfg.maskContact ? maskEmail(inquiry.email) : inquiry.email],
    ["연락처", inquiry.phone ? (cfg.maskContact ? maskPhone(inquiry.phone) : inquiry.phone) : ""],
  ].filter(([, value]) => value);
  const html = [
    `<h2>${subject}</h2>`,
    `<table cellpadding="6" style="border-collapse:collapse">${rows.map(([label, value]) =>
      `<tr><td style="border:1px solid #ddd;background:#f7f7f7"><b>${label}</b></td><td style="border:1px solid #ddd">${escapeHtml(value)}</td></tr>`).join("")}</table>`,
    `<p style="white-space:pre-wrap">${escapeHtml(inquiry.message || "")}</p>`,
    `<p><a href="${adminOrigin(cfg)}/admin-v2">어드민에서 확인</a></p>`,
  ].join("\n");
  const response = await fetch(cfg.resendUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${cfg.resendApiKey}`,
      "content-type": "application/json",
    },
    // Reply-To 를 문의자 메일로 두면 어드민에서 바로 답장할 수 있다.
    body: JSON.stringify({
      from: cfg.emailFrom,
      to: cfg.emailTo,
      reply_to: inquiry.email,
      subject,
      html,
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`이메일 HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function senderFor(channel) {
  return channel === "email" ? sendEmail : sendWebhook;
}

const nowIso = () => new Date().toISOString();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 백오프 재시도 루프. 마지막 재시도까지 실패하면 status=failed + last_error 저장.
async function deliverWithRetry(db, notification, inquiry, cfg) {
  if (inflight.has(notification.id)) return;
  inflight.add(notification.id);
  try {
    const send = senderFor(notification.channel);
    for (let attempt = 1; ; attempt++) {
      try {
        await send(cfg, inquiry);
        db.prepare("UPDATE notifications SET attempts = attempts + 1, status = 'sent', sent_at = ?, last_error = NULL WHERE id = ?")
          .run(nowIso(), notification.id);
        return;
      } catch (error) {
        const message = String(error?.message || error).slice(0, 500);
        const nextDelay = cfg.retryDelaysMs[attempt - 1];
        db.prepare("UPDATE notifications SET attempts = attempts + 1, last_error = ? WHERE id = ?").run(message, notification.id);
        if (nextDelay === undefined) {
          db.prepare("UPDATE notifications SET status = 'failed' WHERE id = ?").run(notification.id);
          console.warn(`[notify] 최종 실패 (${notification.channel} → ${notification.target}) ${message}`);
          return;
        }
        await sleep(nextDelay);
      }
    }
  } finally {
    inflight.delete(notification.id);
  }
}

// 문의 INSERT 직후 백그라운드에서 부른다. 절대 throw 하지 않는다.
export function notifyInquiry(db, inquiry) {
  try {
    const cfg = notifyConfig();
    if (cfg.disabled) return;
    const channels = activeChannels(cfg);
    if (!channels.length) return; // env 미설정 → 알림 행을 아예 만들지 않는다.
    for (const entry of channels) {
      const existing = db.prepare("SELECT * FROM notifications WHERE inquiry_id = ? AND channel = ?").get(inquiry.id, entry.channel);
      let notification = existing;
      if (!notification) {
        const result = db.prepare(`INSERT INTO notifications (inquiry_id, channel, target, status, attempts, created_at)
          VALUES (?, ?, ?, 'pending', 0, ?)`)
          .run(inquiry.id, entry.channel, entry.target, nowIso());
        notification = { id: Number(result.lastInsertRowid), channel: entry.channel, target: entry.target };
      } else if (existing.status === "sent") {
        continue; // 이미 보낸 알림은 중복 발송하지 않는다 (UNIQUE 가 보장하는 정책)
      }
      deliverWithRetry(db, notification, inquiry, cfg)
        .catch((error) => console.warn(`[notify] 발송 중 오류: ${error?.message || error}`));
    }
  } catch (error) {
    // 알림 준비 실패는 문의 접수에 영향을 주지 않는다.
    console.warn(`[notify] 알림 준비 실패(문의 접수는 정상): ${error?.message || error}`);
  }
}

function mapNotification(row) {
  return {
    id: row.id,
    inquiryId: row.inquiry_id,
    inquiryCode: row.inquiry_code ?? "",
    channel: row.channel,
    target: row.target,
    status: row.status,
    attempts: row.attempts,
    lastError: row.last_error || null,
    createdAt: row.created_at,
    sentAt: row.sent_at || null,
  };
}

const STATUS_FILTERS = new Set(["pending", "sent", "failed", "skipped"]);

export function listNotifications(db, status) {
  if (status && !STATUS_FILTERS.has(status)) {
    throw Object.assign(new Error("상태를 확인해 주세요. (pending | sent | failed | skipped)"), { status: 400 });
  }
  const sql = `SELECT n.*, i.code AS inquiry_code FROM notifications n
    JOIN inquiries i ON i.id = n.inquiry_id
    ${status ? "WHERE n.status = ?" : ""}
    ORDER BY datetime(n.created_at) DESC, n.id DESC LIMIT 200`;
  const rows = status ? db.prepare(sql).all(status) : db.prepare(sql).all();
  return rows.map(mapNotification);
}

// 어드민 재발송 — 기존 행을 재사용(UNIQUE)하고 시도 횟수만 올린다.
// 자동 재시도와 달리 한 번만 시도해서 관리자가 눌렀을 때 바로 결과를 본다.
export async function retryNotification(db, id) {
  const row = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
  if (!row) throw Object.assign(new Error("알림을 찾을 수 없습니다."), { status: 404 });
  const cfg = notifyConfig();
  if (cfg.disabled) throw Object.assign(new Error("알림이 꺼져 있습니다. (NOTIFY_DISABLED=1)"), { status: 400 });
  if (inflight.has(row.id)) throw Object.assign(new Error("이미 발송 중인 알림입니다."), { status: 409 });
  const inquiryRow = db.prepare("SELECT * FROM inquiries WHERE id = ?").get(row.inquiry_id);
  if (!inquiryRow) throw Object.assign(new Error("문의를 찾을 수 없습니다."), { status: 404 });

  const inquiry = {
    id: inquiryRow.id,
    code: inquiryRow.code,
    name: inquiryRow.name,
    email: inquiryRow.email,
    company: inquiryRow.company || "",
    phone: inquiryRow.phone || "",
    projectType: inquiryRow.project_type || "",
    budget: inquiryRow.budget || "",
    message: inquiryRow.message,
  };

  inflight.add(row.id);
  db.prepare("UPDATE notifications SET status = 'pending' WHERE id = ?").run(row.id);
  let failed = null;
  try {
    await senderFor(row.channel)(cfg, inquiry);
    db.prepare("UPDATE notifications SET attempts = attempts + 1, status = 'sent', sent_at = ?, last_error = NULL WHERE id = ?")
      .run(nowIso(), row.id);
  } catch (error) {
    failed = String(error?.message || error).slice(0, 500);
    db.prepare("UPDATE notifications SET attempts = attempts + 1, status = 'failed', last_error = ? WHERE id = ?")
      .run(failed, row.id);
    console.warn(`[notify] 재발송 실패 (${row.channel} → ${row.target}) ${failed}`);
  } finally {
    inflight.delete(row.id);
  }
  const updated = db.prepare(`SELECT n.*, i.code AS inquiry_code FROM notifications n
    JOIN inquiries i ON i.id = n.inquiry_id WHERE n.id = ?`).get(row.id);
  return { ok: !failed, notification: mapNotification(updated) };
}

// GET /api/admin/content 의 inquiries 각 항목에 붙일 알림 상태.
// 채널이 여러 개면 "가장 안 좋은 상태" 로 통합한다: failed > pending > skipped > sent.
export function notificationStatusMap(db) {
  const rank = { failed: 4, pending: 3, skipped: 2, sent: 1 };
  const result = new Map();
  for (const row of db.prepare("SELECT inquiry_id, status FROM notifications").all()) {
    const current = result.get(row.inquiry_id);
    if (!current || rank[row.status] > rank[current]) result.set(row.inquiry_id, row.status);
  }
  return result;
}

// 개요 화면의 "마지막 문의 알림" 한 줄.
export function lastNotification(db) {
  const row = db.prepare(`SELECT n.*, i.code AS inquiry_code FROM notifications n
    JOIN inquiries i ON i.id = n.inquiry_id
    ORDER BY n.id DESC LIMIT 1`).get();
  if (!row) return null;
  const mapped = mapNotification(row);
  return {
    inquiryCode: mapped.inquiryCode,
    channel: mapped.channel,
    status: mapped.status,
    createdAt: mapped.createdAt,
    sentAt: mapped.sentAt,
  };
}
