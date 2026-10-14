// 서버 설정 — 환경변수 · 경로 · CORS Origin · 보안 헤더/CSP.
// index.mjs 에서 그대로 옮겨온 파일이다(동작 변경 없음).
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

export const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..", "..");
// 테스트가 저장소 밖 임시 폴더에서 돌 수 있도록 DATA_DIR 로 덮어쓸 수 있게 한다. (기본값은 그대로 data/)
export const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const DB_PATH = path.join(DATA_DIR, "cuberry.sqlite");
export const SEED_PATH = path.join(__dirname, "..", "seed.json");
export const PORT = Number(process.env.PORT || 8080);
export const HOST = "0.0.0.0";
// GitHub Pages 처럼 정적 호스팅에 올린 화면이 이 서버의 API를 직접 호출할 수 있도록 허용할 Origin.
// 예) ADMIN_ALLOWED_ORIGINS="https://hanahchafilmaker.github.io,https://cuberry.com"
// "*" 로 지정하면 모든 Origin 을 허용합니다(토큰 인증만 사용하므로 쿠키 자격증명은 무시됩니다).
//
// DEFAULT_ALLOWED_ORIGINS 는 환경변수와 무관하게 항상 허용되는 주소입니다.
// Render 서비스를 Blueprint(render.yaml)가 아니라 대시보드에서 수동으로 만들면 환경변수가
// 하나도 적용되지 않아 allowedOrigins 가 비고, 그 결과 랜딩 화면의 사전요청이 403 으로
// 거부되어 주소가 맞아도 로그인이 되지 않습니다. 아래 주소는 모두 공개된 값이므로
// 기본값으로 넣어 "재배포만 하면 되는" 상태로 만듭니다.
//   · cuberry.kr (공식 도메인) — 랜딩을 커스텀 도메인으로 서빙할 때 사용. docs/domain-setup.md
//   · www.cuberry.kr — apex/www 어느 주소로 들어와도 동작하게 (Pages 가 www → apex 로 301)
//   · hanahchafilmaker.github.io — GitHub Pages 미러(서브경로) 배포. 도메인 연결 뒤에도 남겨
//     두면 미러에서 디버깅할 때 그대로 쓸 수 있습니다.
// ADMIN_ALLOWED_ORIGINS 는 이 목록을 대체하지 않고 **추가**로 합쳐집니다.
//
// 2026-10-14: 공식 도메인 cuberry.kr 를 기본 목록에 넣었습니다. 랜딩/어드민을 cuberry.kr 로
// 서빙해도(권장 구성 — 정적 화면은 GitHub Pages, API 는 이 서버) 사전요청이 403 으로 막히지
// 않습니다. www 도 함께 넣어 apex/www 어느 쪽으로 들어와도 동작하게 합니다.
export const DEFAULT_ALLOWED_ORIGINS = [
  "https://hanahchafilmaker.github.io", // GitHub Pages 미러(서브경로 배포)
  "https://cuberry.kr", // 공식 도메인(정본)
  "https://www.cuberry.kr",
];
export const ENV_ALLOWED_ORIGINS = String(process.env.ADMIN_ALLOWED_ORIGINS || "")
  .split(/[\s,]+/)
  .map((value) => value.trim().replace(/\/+$/, ""))
  .filter(Boolean);
export const ALLOW_ANY_ORIGIN = ENV_ALLOWED_ORIGINS.includes("*");
export const ALLOWED_ORIGINS = [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...ENV_ALLOWED_ORIGINS])];
// 리버스 프록시 뒤에서 외부에 노출되는 주소. 업로드 이미지 URL 을 절대경로로 만들 때 사용합니다.
// Render 에서는 RENDER_EXTERNAL_URL 이 자동으로 주입되므로 별도 설정 없이도 채워집니다.
export const PUBLIC_ORIGIN = String(process.env.PUBLIC_ORIGIN || process.env.RENDER_EXTERNAL_URL || "").replace(/\/+$/, "");
export const INITIAL_PASSWORD = "cuberry2026"; // 화면에 안내되는 기본 초기 비밀번호
export const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || INITIAL_PASSWORD;
export const SESSION_MS = 1000 * 60 * 60 * 24 * 14;
// Settings → Backup의 "GitHub에 백업 및 배포" 버튼에서 사용합니다.
// 토큰은 저장소 Contents 쓰기 권한만 가진 fine-grained token을 Render 환경변수에 넣습니다.
export const GITHUB_TOKEN = String(process.env.GITHUB_TOKEN || "").trim();
export const GITHUB_REPOSITORY = String(process.env.GITHUB_REPOSITORY || "hanahchafilmaker/Landing_Cuberry").trim();
export const GITHUB_BRANCH = String(process.env.GITHUB_BRANCH || "main").trim();
export const GITHUB_SEED_PATH = "server/seed.json";
// GitHub API 주소. 테스트가 로컬 목 서버를 가리키게 하는 오버라이드다(운영은 기본값 사용).
export const GITHUB_API_BASE = String(process.env.GITHUB_API_BASE || "https://api.github.com").replace(/\/+$/, "");
export const LOGIN_LIMIT = 10;
export const LOGIN_WINDOW_MS = 5 * 60 * 1000;
// ── 클라이언트 IP 판별 ────────────────────────────────────────────────
// X-Forwarded-For 는 "클라이언트가 보낸 값, …, 프록시가 덧붙인 값" 순서로 쌓인다.
// 즉 왼쪽 값은 방문자가 마음대로 꾸밀 수 있으므로, 로그인 시도 제한의 키로
// 문자열 전체를 쓰면 헤더를 매번 바꿔가며 제한을 우회할 수 있다(과거 회귀).
// 진짜 프록시 뒤에서만 XFF 를 신뢰하고, 그중 **오른쪽 끝 PROXY_HOPS 개**만 쓴다.
export const BEHIND_PROXY = process.env.TRUST_PROXY
  ? !/^(0|false|no)$/i.test(String(process.env.TRUST_PROXY).trim())
  : Boolean(process.env.RENDER_SERVICE_ID || process.env.RENDER_EXTERNAL_URL || process.env.FLY_APP_NAME || process.env.RAILWAY_SERVICE_ID);
export const PROXY_HOPS = Math.max(1, Number(process.env.PROXY_HOPS || 1) || 1);
// ── 보안 응답 헤더 ────────────────────────────────────────────────────
// 모든 응답(화면·API·업로드 이미지)에 붙인다. frame-ancestors 는 일부러 넣지 않는다 —
// 미리보기/임베드 iframe 이 깨지는 쪽이 이 사이트엔 더 큰 손해다.
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
};
// CSP 는 화면이 쓰는 출처(인라인 번들·Google/jsDelivr 폰트·Drive 미리보기 iframe)를
// 그대로 허용하는 기본값을 두고, 환경변수로 덮어쓰거나 "" 로 끌 수 있게 한다.
export const DEFAULT_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "frame-src https://drive.google.com https://www.youtube-nocookie.com https://challenges.cloudflare.com",
  "connect-src 'self' https: http://localhost:* http://127.0.0.1:*",
  "form-action 'self'",
].join("; ");
export const CONTENT_SECURITY_POLICY = process.env.CONTENT_SECURITY_POLICY !== undefined
  ? String(process.env.CONTENT_SECURITY_POLICY).trim()
  : DEFAULT_CSP;

mkdirSync(UPLOAD_DIR, { recursive: true });
