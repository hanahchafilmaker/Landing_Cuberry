import { addFaqs2026 } from "./migrations/faqs-2026.mjs";
import { hideMotionGraphics } from "./migrations/hide-motion-graphics-2026.mjs";
import { migrateServicePricing } from "./migrations/service-pricing-2026.mjs";
import { migrateTeamProfile } from "./migrations/team-profile-2026.mjs";
import { drivePortfolio } from "./lib/drive-portfolio.mjs";
import { handleApi } from "./routes/api.mjs";
import {
  ALLOWED_ORIGINS, ALLOW_ANY_ORIGIN, BEHIND_PROXY, CONTENT_SECURITY_POLICY, DEFAULT_ALLOWED_ORIGINS, DEFAULT_PASSWORD,
  ENV_ALLOWED_ORIGINS, HOST, INITIAL_PASSWORD, PORT, PROXY_HOPS, ROOT, SECURITY_HEADERS, SEED_PATH, UPLOAD_DIR
} from "./lib/config.mjs";
import { db, freshInstall, seedContent, seedTeam } from "./lib/db.mjs";
import { applyCors, corsOrigin, negotiateEncoding, normalizeOrigin, safeFile, send, serveClientFile, serveFile } from "./lib/http.mjs";
import { adminAccount, hashPassword, purgeExpiredSessions, verifyPassword } from "./lib/auth.mjs";
import { cronSecret } from "./lib/backup.mjs";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";


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


const driveState = drivePortfolio.diagnose();
if (!driveState.configured) {
  console.warn(`[drive] DRIVE FILM 자동 동기화가 꺼져 있습니다 — ${driveState.reasons.join(" / ") || "설정 없음"}`);
}

seedContent();
seedTeam();
console.log("Team profile 2026:", migrateTeamProfile(db, JSON.parse(readFileSync(SEED_PATH, "utf8")).team));
console.log("Motion graphics 2026:", hideMotionGraphics(db));
console.log("Service pricing 2026:", migrateServicePricing(db));
console.log("FAQ 2026:", addFaqs2026(db));
ensureAdminUser();

// 운영에서 기본 비밀번호를 그대로 쓰는 사고를 막는 안전장치.
// REQUIRE_ADMIN_PASSWORD=1 이면 ADMIN_PASSWORD 없이는 서버가 아예 뜨지 않는다.
if (/^(1|true|yes)$/i.test(String(process.env.REQUIRE_ADMIN_PASSWORD || "").trim()) && adminAccount.initialPasswordInUse) {
  console.error("REQUIRE_ADMIN_PASSWORD=1 인데 기본 초기 비밀번호가 그대로입니다. ADMIN_PASSWORD 환경변수를 설정한 뒤 다시 시작하세요.");
  process.exit(1);
}

// 만료 세션은 쓸 때만 지워졌으므로 쌓이기만 했다 — 기동 시 + 매시간 정리한다.
purgeExpiredSessions();
const sessionPurgeTimer = setInterval(purgeExpiredSessions, 60 * 60 * 1000);
sessionPurgeTimer.unref?.();


const server = createServer(async (req, res) => {
  try {
    // 모든 응답(화면·API·이미지·404 포함)에 기본 보안 헤더를 심는다.
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(key, value);
    res.__encoding = negotiateEncoding(req);
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      const origin = normalizeOrigin(req.headers.origin);
      applyCors(req, res);
      if (req.method === "OPTIONS") {
        // 사전요청(preflight). Origin 이 허용 목록에 없으면 설정 방법을 알려주는 403 을 돌려준다.
        if (origin && !corsOrigin(req)) {
          console.warn(`[cors] 거부된 Origin: ${origin} → ADMIN_ALLOWED_ORIGINS 에 추가하세요.`);
          res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({
            error: `이 서버는 ${origin} 에서의 API 호출을 허용하지 않습니다. 서버 환경변수 ADMIN_ALLOWED_ORIGINS 에 이 주소를 추가하세요.`,
          }));
          return;
        }
        res.writeHead(204);
        res.end();
        return;
      }
      await handleApi(req, res, url);
      return;
    }
    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      // ── 레거시 어드민 은퇴 ──────────────────────────────────
      // admin/ (vanilla JS) → admin-v2/ (React) 로 리다이렉트한다.
      // 기존 URL(/admin/portfolio, /admin/services 등) 도 새 주소로 보낸다.
      const rest = url.pathname.replace(/^\/admin(?:\/|$)/, "/");
      const target = `/admin-v2${rest === "/" ? "" : rest}${url.search || ""}`;
      res.writeHead(301, { Location: target, ...SECURITY_HEADERS });
      res.end();
      return;
    }
    if (url.pathname === "/admin-v2" || url.pathname.startsWith("/admin-v2/")) {
      // 새 어드민(admin-v2 단일 파일). 굽혀둔 BAKED_API_ORIGIN 을 비워서 본다(같은 서버에 API 가 있으므로).
      serveClientFile(req, res, path.join(ROOT, "admin-v2", "index.html"));
      return;
    }
    if (url.pathname === "/cms-bridge.js") {
      serveClientFile(req, res, path.join(ROOT, "cms-bridge.js"));
      return;
    }
    if (/^\/(en|kr)(\/index\.html)?\/?$/.test(url.pathname)) {
      // 언어 진입용 별칭 페이지 — /en/ → /?lang=en, /kr/ → /?lang=ko 로 넘긴다.
      // 실제 화면은 / 하나로 관리하므로 언어별 중복 페이지를 만들지 않는다(docs/domain-setup.md).
      // GitHub Pages 는 같은 파일을 디렉터리 index 로 그대로 서빙한다.
      const langDir = url.pathname.startsWith("/kr") ? "kr" : "en";
      serveClientFile(req, res, path.join(ROOT, langDir, "index.html"));
      return;
    }
    if (url.pathname === "/robots.txt" || url.pathname === "/sitemap.xml") {
      // 저장소 루트의 정적 파일을 그대로 서빙한다(GitHub Pages 도 같은 파일을 본다).
      serveFile(req, res, path.join(ROOT, url.pathname === "/robots.txt" ? "robots.txt" : "sitemap.xml"));
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
    if (url.pathname.startsWith("/portfolio_thumbs/") || url.pathname.startsWith("/team_portraits/") || url.pathname.startsWith("/images/")) {
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
  console.log(`CORS 허용 Origin: ${ALLOW_ANY_ORIGIN ? "* (모든 Origin — 쿠키 자격증명 비활성)" : ALLOWED_ORIGINS.join(", ") || "(없음)"}`);
  console.log(`  └ 기본값 ${JSON.stringify(DEFAULT_ALLOWED_ORIGINS)} + ADMIN_ALLOWED_ORIGINS ${JSON.stringify(ENV_ALLOWED_ORIGINS)}`);
  console.log(`클라이언트 IP: ${BEHIND_PROXY ? `X-Forwarded-For 오른쪽 ${PROXY_HOPS} hop (프록시 신뢰)` : "소켓 주소 (프록시 비신뢰, TRUST_PROXY=1 로 전환 가능)"}`);
  console.log(`CSP: ${CONTENT_SECURITY_POLICY ? "적용" : "꺼짐 (CONTENT_SECURITY_POLICY 미설정)"}`);
  console.log(`크론 백업: ${cronSecret() ? "활성 — POST /api/cron/backup (x-cron-secret)" : "비활성 (CRON_SECRET 미설정 → 503)"}`);
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
