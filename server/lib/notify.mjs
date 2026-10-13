// ─────────────────────────────────────────────────────────────
// 문의 알림 (Phase 1) — 런타임 의존성 0개.
//
// 설계: docs/ops-hardening-plan.md §3
//   * 채널은 fetch 로 부르는 REST/Webhook 만 쓴다 (Slack Incoming Webhook, Resend REST API).
//     nodemailer/SMTP 같은 패키지는 넣지 않는다 (package.json 의 dependencies 는 계속 비어 있다).
//   * 문의 INSERT 가 끝난 뒤 백그라운드에서 보낸다 → 알림이 느리거나 죽어도 문의 접수는 그대로.
//   * 같은 문의·같은 채널은 notifications 행 1개(UNIQUE) → 재시도·수동 재발송이 행을 늘리지 않는다.
//   * 환경변수가 하나도 없으면 행 자체를 만들지 않는다 → 배포만 해서는 동작이 바뀌지 않는다.
// ─────────────────────────────────────────────────────────────

export const NOTIFICATIONS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY,
    inquiry_id INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,                          -- 'webhook' | 'email'
    target TEXT NOT NULL,                           -- 로그·표시용 (호스트 또는 수신 메일)
    status TEXT NOT NULL DEFAULT 'pending',         -- pending | sent | failed | skipped
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL,
    sent_at TEXT,
    UNIQUE (inquiry_id, channel)                    -- 같은 문의·같은 채널은 1행만 → 중복 발송 방지
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications (status, id DESC);
`;

/** 기본 백오프: 첫 실패 뒤 1s → 5s → 25s (총 4회 시도 = 최초 1 + 재시도 3). */
export const DEFAULT_RETRY_DELAYS_MS = [1000, 5000, 25000];

const MESSAGE_SUMMARY_MAX = 120;
const ERROR_MAX = 300;

/** 이 DB에 notifications 테이블을 준비한다(기존 DB에도 그대로 적용되는 IF NOT EXISTS). */
export function ensureNotifySchema(db) {
  db.exec(NOTIFICATIONS_SCHEMA);
}

// ── 연락처 마스킹 (NOTIFY_MASK_CONTACT=1) ──────────────────────
// 웹훅 본문은 서드파티(Slack 등)에 남으므로, 켜면 이메일·전화를 가려서 보낸다.
// 이메일 채널은 우리 수신함이므로 원문을 그대로 쓴다(회신에 필요).

export function maskEmail(value) {
  const text = String(value || "").trim();
  const at = text.lastIndexOf("@");
  if (at <= 0) return text ? "***" : "";
  const local = text.slice(0, at);
  const domain = text.slice(at + 1);
  const keep = local.length <= 2 ? 1 : 2;
  return `${local.slice(0, keep)}***@${domain}`;
}

export function maskPhone(value) {
  const text = String(value || "").trim();
  const digits = text.replace(/\D/g, "");
  if (digits.length < 7) return text ? "***" : "";
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

// ── 설정 ───────────────────────────────────────────────────────

function parseDelays(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "")
    .map(Number)
    .filter((item) => Number.isFinite(item) && item >= 0);
}

export function readNotifyConfig(env = process.env) {
  const webhookUrl = String(env.NOTIFY_WEBHOOK_URL || "").trim();
  const emailToList = String(env.NOTIFY_EMAIL_TO || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const resendApiKey = String(env.RESEND_API_KEY || "").trim();
  const retryDelaysMs = parseDelays(env.NOTIFY_RETRY_DELAYS_MS);
  const delays = retryDelaysMs.length ? retryDelaysMs : DEFAULT_RETRY_DELAYS_MS;
  const requestedAttempts = Number(env.NOTIFY_MAX_ATTEMPTS);
  return {
    disabled: String(env.NOTIFY_DISABLED || "").trim() === "1",
    maskContact: String(env.NOTIFY_MASK_CONTACT || "").trim() === "1",
    webhookUrl,
    emailTo: emailToList,
    resendApiKey,
    emailFrom: String(env.NOTIFY_EMAIL_FROM || "Cuberry <onboarding@resend.dev>").trim(),
    // Resend 호환 엔드포인트. 테스트·사내 프록시에서만 바꾼다.
    emailBaseUrl: String(env.RESEND_API_BASE || "https://api.resend.com").trim().replace(/\/+$/, ""),
    retryDelaysMs: delays,
    maxAttempts: Number.isFinite(requestedAttempts) && requestedAttempts >= 1 ? Math.floor(requestedAttempts) : delays.length + 1,
    // 어드민 링크. PUBLIC_ORIGIN(없으면 RENDER_EXTERNAL_URL) 이 없으면 그 줄을 생략한다.
    adminUrl: String(env.ADMIN_URL || "").trim(),
  };
}

/** 설정된(켜진) 채널 이름 목록. 이게 비어 있으면 알림 행을 아예 만들지 않는다. */
export function enabledChannels(config) {
  const channels = [];
  if (config.webhookUrl) channels.push("webhook");
  if (config.emailTo.length && config.resendApiKey) channels.push("email");
  return channels;
}

// 표시용 target — 웹훅 URL 전체(비밀 토큰 포함)는 절대 저장하지 않고 호스트만 남긴다.
function webhookTarget(url) {
  try {
    return new URL(url).host;
  } catch {
    return "webhook";
  }
}

// ── 메시지 ─────────────────────────────────────────────────────

function summarize(message) {
  const text = String(message || "").replace(/\s+/g, " ").trim();
  if (text.length <= MESSAGE_SUMMARY_MAX) return text;
  return `${text.slice(0, MESSAGE_SUMMARY_MAX)}…`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 웹훅/Slack 본문. 봇 알림이므로 한눈에 읽히는 평문 몇 줄로 끝낸다. */
export function formatInquiryText(inquiry, { adminUrl = "", mask = false } = {}) {
  const lines = [`[Cuberry] 새 상담 문의 ${inquiry.code || ""}`.trim()];
  const who = [inquiry.name, inquiry.company, inquiry.projectType, inquiry.budget].filter(Boolean).join(" · ");
  lines.push(who || "(담당자 정보 없음)");
  const email = mask ? maskEmail(inquiry.email) : inquiry.email;
  const phone = mask ? maskPhone(inquiry.phone) : inquiry.phone;
  const contact = [email, phone].filter(Boolean).join(" · ");
  if (contact) lines.push(contact);
  const summary = summarize(inquiry.message);
  if (summary) lines.push(summary);
  if (adminUrl) lines.push(`→ 어드민에서 확인: ${adminUrl}`);
  return lines.join("\n");
}

export function buildWebhookPayload(inquiry, { adminUrl = "", mask = false } = {}) {
  const text = formatInquiryText(inquiry, { adminUrl, mask });
  return { text, blocks: [{ type: "section", text: { type: "mrkdwn", text } }] };
}

export function buildEmailMessage(inquiry, { adminUrl = "", mask = false } = {}) {
  const contact = [mask ? maskEmail(inquiry.email) : inquiry.email, mask ? maskPhone(inquiry.phone) : inquiry.phone].filter(Boolean).join(" · ");
  const subject = `[Cuberry] 새 상담 문의 ${inquiry.code || ""}${inquiry.name ? ` — ${inquiry.name}` : ""}`;
  const meta = [
    ["담당자", inquiry.name],
    ["회사", inquiry.company],
    ["연락처", contact],
    ["유형", inquiry.projectType],
    ["예산", inquiry.budget],
    ["접수", inquiry.createdAt],
  ].filter(([, value]) => value);
  const message = String(inquiry.message || "(내용 없음)");
  const text = [
    ...meta.map(([label, value]) => `${label}: ${value}`),
    "",
    message,
    ...(adminUrl ? ["", `어드민: ${adminUrl}`] : []),
  ].join("\n");
  const html = [
    `<h2 style="font:600 16px/1.4 system-ui,sans-serif;margin:0 0 12px">새 상담 문의 ${escapeHtml(inquiry.code || "")}</h2>`,
    `<table style="font:14px/1.6 system-ui,sans-serif;border-collapse:collapse">${meta
      .map(([label, value]) => `<tr><td style="padding:2px 10px 2px 0;color:#777">${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
      .join("")}</table>`,
    `<p style="font:14px/1.7 system-ui,sans-serif;white-space:pre-wrap;margin:16px 0 0">${escapeHtml(message)}</p>`,
    ...(adminUrl ? [`<p style="font:12px/1.6 system-ui,sans-serif;margin:16px 0 0"><a href="${escapeHtml(adminUrl)}">어드민에서 확인</a></p>`] : []),
  ].join("");
  return { subject, text, html };
}

// ── 채널 어댑터 (fetch 만 사용) ────────────────────────────────

function describeError(error) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.length > ERROR_MAX ? `${raw.slice(0, ERROR_MAX)}…` : raw;
}

async function readDetail(response) {
  try {
    const body = await response.text();
    return body ? ` ${body.replace(/\s+/g, " ").slice(0, 160)}` : "";
  } catch {
    return "";
  }
}

async function sendWebhook({ config, inquiry, fetchImpl }) {
  const payload = buildWebhookPayload(inquiry, { adminUrl: config.adminUrl, mask: config.maskContact });
  const response = await fetchImpl(config.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`웹훅 응답 ${response.status}${await readDetail(response)}`);
}

async function sendEmail({ config, inquiry, fetchImpl }) {
  const message = buildEmailMessage(inquiry, { adminUrl: config.adminUrl });
  const response = await fetchImpl(`${config.emailBaseUrl}/emails`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.resendApiKey}` },
    body: JSON.stringify({
      from: config.emailFrom,
      to: config.emailTo,
      subject: message.subject,
      html: message.html,
      text: message.text,
      // 어드민에서 "답장"만 누르면 문의자에게 바로 회신되도록.
      reply_to: inquiry.email || undefined,
    }),
  });
  if (!response.ok) throw new Error(`이메일 API 응답 ${response.status}${await readDetail(response)}`);
}

const ADAPTERS = { webhook: sendWebhook, email: sendEmail };

// ── 조회 ───────────────────────────────────────────────────────

const STATUS_RANK = { failed: 3, pending: 2, sent: 1, skipped: 0 };

function inquiryFromRow(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    email: row.email,
    company: row.company || "",
    phone: row.phone || "",
    projectType: row.project_type || "",
    budget: row.budget || "",
    message: row.message || "",
    status: row.status || "new",
    createdAt: row.created_at || "",
  };
}

export function rowNotification(row) {
  return {
    id: row.id,
    inquiryId: row.inquiry_id,
    inquiryCode: row.inquiry_code || "",
    inquiryName: row.inquiry_name || "",
    channel: row.channel,
    target: row.target,
    status: row.status,
    attempts: row.attempts,
    lastError: row.last_error || "",
    createdAt: row.created_at,
    sentAt: row.sent_at || "",
  };
}

/**
 * 문의별 알림 요약 — 어드민 문의 목록에 배지를 붙일 때 쓴다.
 * 여러 채널 중 **가장 나쁜 상태** 하나를 대표로 고른다(failed > pending > sent).
 * 쿼리 1회로 끝내므로 문의 N건이어도 N+1 이 생기지 않는다.
 */
export function listNotificationSummary(db) {
  const rows = db
    .prepare(
      `SELECT n.id, n.inquiry_id, n.channel, n.status, n.attempts, n.last_error
         FROM notifications n
         JOIN inquiries i ON i.id = n.inquiry_id
        ORDER BY n.id`,
    )
    .all();
  const grouped = new Map();
  for (const row of rows) {
    const current = grouped.get(row.inquiry_id);
    if (!current) {
      grouped.set(row.inquiry_id, {
        inquiryId: row.inquiry_id,
        notificationId: row.id,
        notificationStatus: row.status,
        notificationAttempts: row.attempts,
        notificationError: row.last_error || "",
        channels: [row.channel],
      });
      continue;
    }
    current.channels.push(row.channel);
    current.notificationAttempts += row.attempts;
    if ((STATUS_RANK[row.status] ?? 0) > (STATUS_RANK[current.notificationStatus] ?? 0)) {
      current.notificationId = row.id;
      current.notificationStatus = row.status;
      current.notificationError = row.last_error || "";
    }
  }
  return [...grouped.values()];
}

export function emptyNotificationSummary() {
  return { notificationId: 0, notificationStatus: "", notificationAttempts: 0, notificationError: "" };
}

// ── 발송기 ─────────────────────────────────────────────────────
/**
 * @param {object} options
 * @param {import("node:sqlite").DatabaseSync} options.db
 * @param {Record<string, string|undefined>} [options.env]
 * @param {typeof fetch} [options.fetchImpl] 테스트에서 스텁으로 교체
 * @param {(ms: number) => Promise<void>} [options.sleep] 테스트에서 시간을 건너뛰기 위해 교체
 * @param {Console} [options.log]
 */
export function createNotifier({ db, env = process.env, adminUrl = "", fetchImpl = fetch, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), log = console, now = () => new Date().toISOString() } = {}) {
  const config = { ...readNotifyConfig(env), adminUrl: String(adminUrl || env.ADMIN_URL || "").trim() };
  const channels = enabledChannels(config);
  // 재발송 버튼 연타 등으로 같은 행에 체인이 두 개 붙는 것을 막는다(단일 인스턴스 기준).
  const inFlight = new Set();

  const selectRow = (id) => db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
  const selectRowByChannel = (inquiryId, channel) =>
    db.prepare("SELECT * FROM notifications WHERE inquiry_id = ? AND channel = ?").get(inquiryId, channel);

  function ensureRow(inquiryId, channel, target, createdAt) {
    db.prepare(
      `INSERT INTO notifications (inquiry_id, channel, target, status, attempts, last_error, created_at, sent_at)
       VALUES (?, ?, ?, 'pending', 0, NULL, ?, NULL)
       ON CONFLICT (inquiry_id, channel) DO NOTHING`,
    ).run(inquiryId, channel, target, createdAt);
    return selectRowByChannel(inquiryId, channel);
  }

  function markSent(id) {
    db.prepare("UPDATE notifications SET status = 'sent', sent_at = ?, last_error = NULL WHERE id = ?").run(now(), id);
  }

  function markFailure(id, error, hasMoreAttempts) {
    db.prepare("UPDATE notifications SET status = ?, last_error = ? WHERE id = ?").run(hasMoreAttempts ? "pending" : "failed", describeError(error), id);
  }

  function bumpAttempts(id) {
    db.prepare("UPDATE notifications SET attempts = attempts + 1 WHERE id = ?").run(id);
    return Number(selectRow(id)?.attempts || 0);
  }

  function channelConfig(channel) {
    if (channel === "webhook") {
      if (!config.webhookUrl) return null;
      return { target: webhookTarget(config.webhookUrl) };
    }
    if (channel === "email") {
      if (!config.emailTo.length || !config.resendApiKey) return null;
      return { target: config.emailTo.join(", ") };
    }
    return null;
  }

  /** 한 행을 백오프 재시도와 함께 발송한다. 절대 예외를 밖으로 던지지 않는다. */
  async function deliver(row, inquiry) {
    if (inFlight.has(row.id)) return { ok: false, skipped: "in-flight" };
    inFlight.add(row.id);
    try {
      const adapter = ADAPTERS[row.channel];
      const ready = channelConfig(row.channel);
      if (!adapter || !ready) {
        db.prepare("UPDATE notifications SET status = 'failed', last_error = ? WHERE id = ?").run(`${row.channel} 채널이 더 이상 설정되어 있지 않습니다.`, row.id);
        return { ok: false };
      }
      const max = Math.max(1, config.maxAttempts);
      for (let attempt = 1; attempt <= max; attempt += 1) {
        if (attempt > 1) {
          const delay = config.retryDelaysMs[Math.min(attempt - 2, config.retryDelaysMs.length - 1)];
          if (delay > 0) await sleep(delay);
        }
        bumpAttempts(row.id);
        try {
          await adapter({ config, inquiry, fetchImpl });
          markSent(row.id);
          log.log(`[notify] ${row.channel} 발송 완료 — ${inquiry.code} (시도 ${attempt}회)`);
          return { ok: true };
        } catch (error) {
          const hasMore = attempt < max;
          markFailure(row.id, error, hasMore);
          if (hasMore) log.warn(`[notify] ${row.channel} 발송 실패 — ${inquiry.code} (${attempt}/${max}): ${describeError(error)}`);
          else log.error(`[notify] ${row.channel} 발송 최종 실패 — ${inquiry.code}: ${describeError(error)}`);
        }
      }
      return { ok: false };
    } catch (error) {
      log.error(`[notify] 알림 처리 중 예외 — ${inquiry?.code || "?"}: ${describeError(error)}`);
      try {
        db.prepare("UPDATE notifications SET status = 'failed', last_error = ? WHERE id = ?").run(describeError(error), row.id);
      } catch {
        /* DB까지 죽은 상황이면 여기서 할 일이 없다 */
      }
      return { ok: false };
    } finally {
      inFlight.delete(row.id);
    }
  }

  /**
   * 문의 접수 직후 호출. **동기 함수**라서 문의 응답을 1ms도 기다리게 하지 않는다.
   * 행 생성까지만 하고 발송 체인은 백그라운드로 띄운다.
   */
  function notifyInquiry(inquiry) {
    try {
      if (config.disabled) return null;
      if (!inquiry || !Number.isInteger(Number(inquiry.id))) return null;
      // Phase 2 의 'review'(스팸 의심) 문의는 알리지 않는다.
      if ((inquiry.status || "new") !== "new") return null;
      if (!channels.length) return null; // 환경변수 미설정 → 지금과 동작이 완전히 같다
      const createdAt = inquiry.createdAt || now();
      const rows = channels.map((channel) => ensureRow(Number(inquiry.id), channel, channelConfig(channel).target, createdAt));
      for (const row of rows) void deliver(row, inquiry);
      return rows.map(rowNotification);
    } catch (error) {
      // 알림은 부가 기능이다. 어떤 경우에도 문의 접수를 깨뜨리지 않는다.
      log.error(`[notify] 알림 준비 실패: ${describeError(error)}`);
      return null;
    }
  }

  /** 어드민 "다시 보내기" — 행은 그대로 두고 attempts 만 초기화해 다시 발송한다. */
  function retry(id) {
    const row = selectRow(Number(id));
    if (!row) return null;
    const inquiryRow = db.prepare("SELECT * FROM inquiries WHERE id = ?").get(row.inquiry_id);
    if (!inquiryRow) return null;
    const withInquiry = (source) => rowNotification({ ...source, inquiry_code: inquiryRow.code, inquiry_name: inquiryRow.name });
    if (inFlight.has(row.id)) return { ...withInquiry(row), busy: true };
    db.prepare("UPDATE notifications SET status = 'pending', attempts = 0, last_error = NULL, sent_at = NULL WHERE id = ?").run(row.id);
    const reset = selectRow(row.id);
    if (!channelConfig(row.channel)) {
      db.prepare("UPDATE notifications SET status = 'failed', last_error = ? WHERE id = ?").run(`${row.channel} 채널이 더 이상 설정되어 있지 않습니다.`, row.id);
      return withInquiry(selectRow(row.id));
    }
    // 응답은 초기화된 상태로 즉시 돌려준다 — 발송은 백그라운드에서 이어진다.
    void deliver(reset, inquiryFromRow(inquiryRow));
    return withInquiry(reset);
  }

  function list({ status = "", limit = 200 } = {}) {
    const base = `SELECT n.*, i.code AS inquiry_code, i.name AS inquiry_name
                    FROM notifications n
                    LEFT JOIN inquiries i ON i.id = n.inquiry_id`;
    const rows = status
      ? db.prepare(`${base} WHERE n.status = ? ORDER BY n.id DESC LIMIT ?`).all(status, Number(limit) || 200)
      : db.prepare(`${base} ORDER BY n.id DESC LIMIT ?`).all(Number(limit) || 200);
    return rows.map(rowNotification);
  }

  function lastSentAt() {
    const row = db.prepare("SELECT sent_at FROM notifications WHERE status = 'sent' AND sent_at IS NOT NULL ORDER BY sent_at DESC, id DESC LIMIT 1").get();
    return row?.sent_at || "";
  }

  function failedCount() {
    return Number(db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE status = 'failed'").get()?.n || 0);
  }

  return {
    config,
    channels,
    disabled: config.disabled,
    maskContact: config.maskContact,
    notifyInquiry,
    retry,
    list,
    lastSentAt,
    failedCount,
  };
}
