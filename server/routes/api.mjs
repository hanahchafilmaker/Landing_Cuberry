// 공개/관리자 API 라우트 테이블 — /api/* 요청은 모두 handleApi 로 들어온다.
// index.mjs 에서 그대로 옮겨온 파일이다(문의 저장/상태 변경만 lib/inquiries.mjs 호출로 치환).
import { ALLOW_ANY_ORIGIN, ALLOWED_ORIGINS, DEFAULT_ALLOWED_ORIGINS, INITIAL_PASSWORD, LOGIN_LIMIT, LOGIN_WINDOW_MS, PUBLIC_ORIGIN, ROOT, UPLOAD_DIR } from "./../lib/config.mjs";
import { backupStatus, bool, db, flag, metaGet, nowIso } from "./../lib/db.mjs";
import { corsOrigin, isHttps, readBody, safeFile, send, serveClientFile, serveFile } from "./../lib/http.mjs";
import { adminAccount, attemptGate, clearAttempts, clearCookie, clientIp, createSession, currentUser, formatWait, hashPassword, noteAttempt, readToken, requireAdmin, sessionCookie, verifyPassword } from "./../lib/auth.mjs";
import { adminContent, exportSeed, optionalText, publicContent, requireEmail, requireText, rowSettings, saveUpload, summary, upsertFaq, upsertPortfolio, upsertService, upsertTeam } from "./../lib/content.mjs";
import { insertInquiry, setInquiryStatus } from "./../lib/inquiries.mjs";
import { backupSeedToGitHub, recordBackup, runSeedBackup } from "./../lib/seed-backup.mjs";
import { listNotifications, notifyInquiry, retryNotification } from "./../lib/notify.mjs";
import { formTokenMode, mintFormToken, validateFormToken, verifyTurnstile } from "./../lib/form-token.mjs";
import { cronSecret, safeSecretEqual } from "./../lib/backup.mjs";
import { migrateTeamProfile } from "./../migrations/team-profile-2026.mjs";
import { drivePortfolio } from "./../lib/drive-portfolio.mjs";
import { driveThumbnail } from "./../lib/drive-thumbnail.mjs";
import { readFileSync } from "node:fs";
import path from "node:path";

export async function handleApi(req, res, url) {
  const { pathname } = url;
  if (req.method === "GET" && pathname === "/api/health") return send(res, 200, { ok: true });
  if (req.method === "GET" && pathname === "/api/config") {
    // 정적 호스트에서 열린 화면이 "이 서버의 공개 주소"를 알아내 업로드 이미지 등을 절대경로로 만들 때 사용한다.
    const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").replace(/\/+$/, "");
    const derived = host ? `${isHttps(req) ? "https" : "http"}://${host}` : "";
    return send(res, 200, {
      ok: true,
      publicOrigin: PUBLIC_ORIGIN || derived,
      // 실제로 적용되는 목록(기본값 + 환경변수). "*" 면 ["*"].
      allowedOrigins: ALLOW_ANY_ORIGIN ? ["*"] : ALLOWED_ORIGINS,
      defaultAllowedOrigins: DEFAULT_ALLOWED_ORIGINS,
      hasAdmin: adminAccount.hasAdmin,
    });
  }
  if (req.method === "GET" && pathname === "/api/public/content") return send(res, 200, publicContent());
  if (req.method === "GET" && pathname === "/api/public/drive-portfolio") return send(res, 200, await drivePortfolio.get());
  // 드라이브 썸네일 중계 — CORS 를 붙여 내려 주므로 브라우저가 픽셀을 읽어 "검은 썸네일"을 판정할 수 있다.
  if (req.method === "GET" && pathname === "/api/public/drive-thumbnail") {
    const thumb = await driveThumbnail({
      id: url.searchParams.get("id") || "",
      size: url.searchParams.get("sz") || "",
      resourceKey: url.searchParams.get("resourcekey") || "",
    });
    if (!thumb) return send(res, 404, { error: "썸네일을 찾을 수 없습니다." });
    res.writeHead(200, {
      "Content-Type": thumb.type,
      "Content-Length": thumb.body.length,
      // 브라우저·중계 서버 모두 30분 캐시(Render 무료 플랜 대역폭을 아낀다).
      "Cache-Control": "public, max-age=1800",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    res.end(thumb.body);
    return;
  }
  // 드라이브 연동이 왜 비어 있는지(값 누락·형식 오류)를 비밀값 없이 알려준다.
  if (req.method === "GET" && pathname === "/api/public/drive-diagnose") return send(res, 200, drivePortfolio.diagnose());
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
    // 키는 조작 불가능한 클라이언트 IP 로만 만든다. XFF 문자열 전체를 쓰면
    // 헤더를 매번 바꿔가며 시도 제한을 우회할 수 있다.
    const ip = clientIp(req);
    const key = `login:${ip}`;
    const gate = attemptGate(key, LOGIN_LIMIT, LOGIN_WINDOW_MS);
    if (gate.blocked) {
      return send(res, 429, {
        error: `비밀번호를 여러 번 틀렸습니다. ${formatWait(gate.retryAfter)} 후 다시 시도해 주세요.`,
        retryAfter: gate.retryAfter,
      }, { "Retry-After": String(gate.retryAfter) });
    }
    const body = await readBody(req, 16_000);
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
    const ip = clientIp(req);
    const leadKey = `lead:${ip}`;
    if (attemptGate(leadKey, 20, 60 * 60 * 1000).blocked) return send(res, 429, { error: "잠시 후 다시 문의해 주세요." });
    noteAttempt(leadKey);
    const body = await readBody(req, 64_000);
    // 허니팟 — 사람은 보지도 못하는 숨은 칸을 봇만 채운다. 채워져 있으면
    // 저장하지 않고 성공처럼 응답한다(봇은 자기 문의가 접수된 줄 안다).
    if (String(body.website || body.url || "").trim()) {
      console.warn(`[spam] 허니팟 문의 무시 (${ip})`);
      return send(res, 200, { ok: true, id: "" });
    }
    const name = requireText(body.contactName || body.name, "담당자명", 120);
    const email = requireEmail(body.email);
    const message = optionalText(body.brief || body.message, 8000) || "(내용 없음)";
    const company = optionalText(body.company, 160);
    const phone = optionalText(body.phone, 40);
    const projectType = optionalText(body.projectType, 120);
    const budget = optionalText(body.budget, 80);
    // ── Phase 2: 폼 토큰 · Turnstile 검증 (실패해도 문의 접수 자체는 막지 않는다) ──
    const mode = formTokenMode();
    let review = false;
    {
      const tokenVerdict = validateFormToken(db, body.formToken);
      const turnstileSecret = String(process.env.TURNSTILE_SECRET || "").trim();
      const turnstileVerdict = turnstileSecret
        ? await verifyTurnstile(turnstileSecret, body.turnstile || body["cf-turnstile-response"] || "")
        : { ok: true, skipped: true };
      if (!tokenVerdict.ok || !turnstileVerdict.ok) {
        const reason = [
          !tokenVerdict.ok ? `token:${tokenVerdict.reason}` : "",
          !turnstileVerdict.ok ? `turnstile:${turnstileVerdict.detail || "실패"}` : "",
        ].filter(Boolean).join(" ");
        console.warn(`[spam] 폼 토큰 검증 실패 (${ip}) ${reason} → mode=${mode}`);
        if (mode === "strict") return send(res, 200, { ok: true, id: "" });
        // flag(기본): 저장하되 status='review' + 알림 발송 안 함 → 어드민에서 직접 확인
        review = mode === "flag";
      }
    }
    // 저장 SQL 은 lib/inquiries.mjs 로 옮겼다 — 값·컬럼 순서·상태는 그대로다.
    const { code, inquiryId } = insertInquiry(
      { name, email, company, phone, projectType, budget, message },
      { status: review ? "review" : "new" },
    );
    // 알림은 응답을 기다리지 않는다 — Slack/Resend 가 죽어도 리드는 남는다.
    // 실패·재시도 상태는 notifications 테이블에 남고 어드민에서 재발송한다.
    // 단, flag 로 잡힌 review 문의는 알림을 보내지 않는다(스팸 후보는 어드민에서 직접 확인).
    if (!review) {
      void notifyInquiry(db, {
        id: inquiryId, code, name, email, company, phone, projectType, budget, message,
      });
    }
    return send(res, 200, { id: code, inquiryId });
  }

  // Phase 2: 문의 폼이 화면에 들어올 때 받는 서명 토큰. 비밀키는 meta 테이블에 최초 1회 생성한다.
  if (req.method === "GET" && pathname === "/api/form-token") {
    const issuedAt = Date.now();
    return send(res, 200, {
      token: mintFormToken(db, issuedAt),
      issuedAt: new Date(issuedAt).toISOString(),
      // Turnstile 위젯 siteKey — 없으면 랜딩은 위젯 스크립트를 아예 로드하지 않는다.
      turnstileSiteKey: String(process.env.TURNSTILE_SITE_KEY || "").trim() || null,
    });
  }

  // Phase 3: GitHub Actions cron 이 부르는 seed.json 백업. 세션이 아니라 공유 시크릿 헤더로 인증한다.
  // CRON_SECRET 미설정이면 503 — 실수로 열린 크론 엔드포인트를 만들지 않기 위해.
  if (req.method === "POST" && pathname === "/api/cron/backup") {
    const secret = cronSecret();
    if (!secret) return send(res, 503, { error: "CRON_SECRET 이 설정되지 않아 크론 백업이 비활성 상태입니다." });
    if (!safeSecretEqual(req.headers["x-cron-secret"], secret)) {
      console.warn("[cron] 잘못된 x-cron-secret 로 백업을 시도했습니다.");
      return send(res, 401, { error: "x-cron-secret 이 올바르지 않습니다." });
    }
    const result = await runSeedBackup();
    console.log(result.skipped ? `[cron] 백업 건너뜀(변경 없음) ${result.hash.slice(0, 12)}` : `[cron] 백업 완료 ${String(result.commitSha || "").slice(0, 7)}`);
    return send(res, 200, result);
  }

  const user = requireAdmin(req, res);
  if (!user) return;
  if (req.method === "POST" && pathname === "/api/auth/password") {
    const body = await readBody(req, 16_000);
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
  if (req.method === "GET" && pathname === "/api/admin/notifications") {
    const status = url.searchParams.get("status");
    return send(res, 200, { notifications: listNotifications(db, status) });
  }
  const notifyRetryMatch = pathname.match(/^\/api\/admin\/notifications\/(\d+)\/retry$/);
  if (notifyRetryMatch && req.method === "POST") {
    return send(res, 200, await retryNotification(db, Number(notifyRetryMatch[1])));
  }
  if (req.method === "GET" && pathname === "/api/admin/export") return send(res, 200, exportSeed());
  if (req.method === "POST" && pathname === "/api/admin/github-backup") {
    // 수동 버튼은 "지금 백업해줘" 라는 명시적 요청이므로 변경이 없어도 커밋한다.
    // 다만 크론이 곧바로 같은 내용을 다시 커밋하지 않도록 성공한 백업의 해시는 함께 기록한다.
    const result = await backupSeedToGitHub();
    recordBackup(result);
    console.log(`GitHub 백업 완료: ${result.repository}@${result.branch} ${result.commitSha.slice(0, 7)}`);
    return send(res, 200, result);
  }
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
    if (!["new", "review", "contacted", "closed"].includes(status)) return send(res, 400, { error: "상태를 확인해 주세요." });
    const result = setInquiryStatus(Number(inquiryMatch[1]), status);
    if (!result.changes) return send(res, 404, { error: "문의를 찾을 수 없습니다." });
    return send(res, 200, { ok: true });
  }
  return send(res, 404, { error: "API를 찾을 수 없습니다." });
}
