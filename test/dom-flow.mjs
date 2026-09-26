// 실제 브라우저처럼 동작시키는 종단 테스트. 두 가지 배포 형태를 모두 검증한다.
//
//   [시나리오 A] GitHub Pages — 문서 주소는 github.io 의 서브경로(/Landing_Cuberry/admin/)이고
//                API 는 ?api= 로 지정한 원격 Node 서버. 즉 "정적 호스트 + 원격 API" 조합.
//   [시나리오 B] Node 서버 한 곳 — 문서 주소와 API 가 같은 Origin(/admin). 실제 Render 배포 형태.
//
// fetch 는 브라우저의 CORS 규칙을 흉내 낸 래퍼로 교체한다. 교차출처면 Origin 헤더를 붙이고,
// 사전요청(OPTIONS)이 필요하면 실제로 보내고, Access-Control-Allow-Origin 이 문서 Origin 과
// 일치하지 않으면 브라우저처럼 응답을 주지 않고 TypeError 를 던진다.
//
// 필요: jsdom (선택적 의존성). 없으면 건너뜁니다.
//   npm i -D jsdom
//   ADMIN_ALLOWED_ORIGINS=https://hanahchafilmaker.github.io npm start   ← 서버가 켜져 있어야 함
//   npm run test:dom
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ADMIN_HTML = readFileSync(path.join(ROOT, "admin", "index.html"), "utf8");
const API = process.env.TEST_API_ORIGIN || "http://127.0.0.1:8080";
const PASSWORD = process.env.TEST_ADMIN_PASSWORD || "cuberry2026";
const PAGES_ORIGIN = "https://hanahchafilmaker.github.io";

let JSDOM;
try {
  ({ JSDOM } = await import("jsdom"));
} catch {
  console.log("jsdom 이 없어 DOM 종단 테스트를 건너뜁니다. (npm i -D jsdom)");
  process.exit(0);
}

const SIMPLE_METHODS = new Set(["GET", "HEAD", "POST"]);
const SIMPLE_HEADERS = new Set(["accept", "accept-language", "content-language", "content-type"]);
const SIMPLE_CONTENT_TYPES = new Set(["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"]);

function makeBrowserFetch(documentOrigin) {
  const log = [];
  const wrapped = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url, documentOrigin);
    const method = String(init.method || "GET").toUpperCase();
    const headers = {};
    for (const [key, value] of Object.entries(init.headers || {})) headers[key.toLowerCase()] = value;
    const sameOrigin = url.origin === documentOrigin;
    if (!sameOrigin) headers.origin = documentOrigin;

    const contentType = headers["content-type"];
    const needsPreflight = !sameOrigin && (
      !SIMPLE_METHODS.has(method)
      || Object.keys(headers).some((key) => !SIMPLE_HEADERS.has(key) && key !== "origin")
      || (contentType && !SIMPLE_CONTENT_TYPES.has(contentType))
    );

    if (needsPreflight) {
      const preflight = await fetch(url, {
        method: "OPTIONS",
        headers: {
          origin: documentOrigin,
          "access-control-request-method": method,
          "access-control-request-headers": Object.keys(headers).filter((key) => key !== "origin").join(", "),
        },
      });
      log.push(`preflight ${method} ${url.pathname} → ${preflight.status}`);
      const allow = preflight.headers.get("access-control-allow-origin");
      if (!preflight.ok || (allow !== documentOrigin && allow !== "*")) {
        throw new TypeError(`Failed to fetch — CORS 사전요청 거부 (${preflight.status}, allow-origin=${allow})`);
      }
    }

    const response = await fetch(url, { ...init, method, headers, redirect: "follow" });
    log.push(`${method} ${url.pathname} → ${response.status}${sameOrigin ? "" : " (cross-origin)"}`);
    if (!sameOrigin) {
      const allow = response.headers.get("access-control-allow-origin");
      if (allow !== documentOrigin && allow !== "*") {
        throw new TypeError(`Failed to fetch — 응답에 Access-Control-Allow-Origin 없음 (got ${allow})`);
      }
    }
    return response;
  };
  wrapped.log = log;
  return wrapped;
}

let failures = 0;
let checks = 0;
const show = (value) => (typeof value === "object" ? JSON.stringify(value) : String(value));
function expect(label, actual, wanted) {
  checks += 1;
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    failures += 1;
    console.error(`  ✗ ${label}\n      기대: ${show(wanted)}\n      실제: ${show(actual)}`);
  } else {
    console.log(`  ✓ ${label}`);
  }
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(dom, predicate, { timeout = 8000, label = "조건" } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = predicate(dom.window.document);
    if (value) return value;
    await sleep(50);
  }
  throw new Error(`시간 초과: ${label}`);
}

// 로그인 → 개요 → 포트폴리오 → 팀 → 설정 까지 실제로 클릭해 넘어가며 검증한다.
async function runScenario({ title, documentUrl, remoteApi }) {
  console.log(`\n${"=".repeat(72)}\n${title}\n${"=".repeat(72)}`);
  console.log(`문서 주소 : ${documentUrl}`);
  console.log(`API 서버  : ${remoteApi ? `${remoteApi} (교차출처)` : "문서와 같은 Origin"}\n`);

  const dom = new JSDOM(ADMIN_HTML, { url: documentUrl, runScripts: "dangerously", pretendToBeVisual: true });
  const documentOrigin = new URL(documentUrl).origin;
  dom.window.fetch = makeBrowserFetch(documentOrigin);
  // 인라인 스크립트는 JSDOM 생성 시점에 이미 돌았으므로, fetch 를 심은 뒤 bootstrap 을 다시 돌린다.
  dom.window.eval("bootstrap()");
  const doc = () => dom.window.document;
  const kicker = () => doc().querySelector("main header .kicker")?.textContent;

  try {
    console.log("[1] 로그인 화면");
    await waitFor(dom, (d) => d.querySelector("#login-form"), { label: "로그인 폼" });
    expect("API 서버 주소 입력값", doc().querySelector("#api-origin-input").value, remoteApi || "");
    expect("localStorage 에 저장됨", dom.window.localStorage.getItem("cuberry.apiOrigin"), remoteApi || null);
    if (remoteApi) {
      expect("원격 /api/auth/status 성공", dom.window.fetch.log.some((line) => line.startsWith(`GET /api/auth/status → 200 (cross-origin)`)), true);
      expect("'어드민 API 서버 없음' 경고는 안 뜸", doc().querySelector("#login-form").textContent.includes("어드민 API 서버 없음"), false);
    } else {
      expect("같은 서버 /api/auth/status 성공", dom.window.fetch.log.some((line) => line.startsWith("GET /api/auth/status → 200")), true);
    }
    expect("비밀번호 안내 표시", doc().querySelector("#login-form").textContent.includes(PASSWORD), true);

    console.log("\n[2] 로그인");
    const form = doc().querySelector("#login-form");
    form.querySelector("input[name=password]").value = PASSWORD;
    form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(dom, (d) => d.querySelector("main h2")?.textContent === "Good to see you.", { label: "개요 화면" });
    expect("개요 화면 렌더", doc().querySelector("main h2").textContent, "Good to see you.");
    if (remoteApi) {
      expect("사전요청을 실제로 거침", dom.window.fetch.log.some((line) => line.startsWith("preflight POST /api/auth/login")), true);
    } else {
      expect("같은 Origin 이라 사전요청 불필요", dom.window.fetch.log.some((line) => line.startsWith("preflight")), false);
    }
    expect("POST /api/auth/login → 200", dom.window.fetch.log.some((line) => line.startsWith("POST /api/auth/login → 200")), true);
    expect("GET /api/admin/content → 200", dom.window.fetch.log.some((line) => line.startsWith("GET /api/admin/content → 200")), true);
    expect("세션 토큰 저장됨", Boolean(dom.window.sessionStorage.getItem("cuberry-admin-token")), true);

    console.log("\n[3] 내비게이션 (서브경로/원격 API 에서 가장 쉽게 깨지는 부분)");
    const clickNav = async (page, wantKicker) => {
      const button = doc().querySelector(`[data-go="${page}"]`);
      if (!button) throw new Error(`내비게이션 버튼 없음: ${page}`);
      button.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
      await waitFor(dom, (d) => d.querySelector("main header .kicker")?.textContent === wantKicker, { label: `${page} 화면` });
    };

    await clickNav("portfolio", "Content / Portfolio");
    expect("포트폴리오 화면", kicker(), "Content / Portfolio");
    expect("작품 행이 그려짐", doc().querySelectorAll("main article.row").length > 5, true);
    const thumbs = [...doc().querySelectorAll("main img.thumb")].map((img) => img.getAttribute("src")).filter(Boolean);
    if (remoteApi) {
      // Pages 에서 이미지가 깨지는 경우는 "/uploads/…" 처럼 루트 상대경로로 남을 때다.
      expect("루트 상대경로(/…) 썸네일 없음", thumbs.filter((src) => src.startsWith("/")), []);
      const remote = thumbs.filter((src) => src.startsWith(`${remoteApi}/`)).length;
      expect("원격 주소가 붙거나 원래 외부 절대주소", thumbs.every((src) => src.startsWith(`${remoteApi}/`) || /^https?:\/\//.test(src)), true);
      console.log(`    썸네일 ${thumbs.length}건 · 원격 서버 주소 붙음 ${remote}건 · 원래 외부 절대주소 ${thumbs.length - remote}건`);
      expect("원격 모드에서는 주소를 바꾸지 않음(새로고침 404 방지)", dom.window.location.pathname, new URL(documentUrl).pathname);
    } else {
      expect("같은 서버에서는 주소를 /admin/portfolio 로 바꿈", dom.window.location.pathname, "/admin/portfolio");
      // 같은 서버에서는 서버 상대경로(/…)를 그대로 두고, 외부 절대주소도 건드리지 않는다.
      expect("썸네일이 서버 상대경로 또는 외부 절대주소", thumbs.every((src) => src.startsWith("/") || /^https?:\/\//.test(src)), true);
    }

    await clickNav("team", "Content / Team");
    expect("팀 화면", kicker(), "Content / Team");
    expect("팀 카드가 그려짐", doc().querySelectorAll("main .face").length > 0, true);

    await clickNav("settings", "System / Settings");
    expect("설정 화면", kicker(), "System / Settings");
    expect("비밀번호 폼", doc().querySelector("#settings-form") !== null && doc().querySelector("#password-form") !== null, true);
    expect("내보내기 버튼", doc().querySelector("#export-seed") !== null, true);
    expect("API 서버 정보 카드", doc().querySelector("main").textContent.includes(remoteApi || documentOrigin), true);
    if (remoteApi) {
      expect("Live site 링크가 Pages 사이트 루트", doc().querySelector('.side-link[href]').getAttribute("href"), "/Landing_Cuberry/");
    } else {
      expect("Live site 링크가 서버 루트", doc().querySelector('.side-link[href]').getAttribute("href"), "/");
    }

    console.log("\n[4] 로그아웃 후 다시 로그인 화면");
    doc().querySelector("#logout").dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await waitFor(dom, (d) => d.querySelector("#login-form"), { label: "로그아웃 후 로그인 폼" });
    expect("로그아웃됨", doc().querySelector("#login-form") !== null, true);

    console.log("\n[5] 요청 기록");
    dom.window.fetch.log.forEach((line) => console.log(`    ${line}`));
  } catch (error) {
    failures += 1;
    console.error(`\n  ✗ 시나리오 실패: ${error.message}`);
    console.error("    요청 기록:", dom.window.fetch.log);
  } finally {
    dom.window.close();
  }
}

await runScenario({
  title: "[시나리오 A] GitHub Pages 서브경로 + 원격 API",
  documentUrl: `${PAGES_ORIGIN}/Landing_Cuberry/admin/?api=${encodeURIComponent(API)}`,
  remoteApi: API,
});

await runScenario({
  title: "[시나리오 B] Node 서버 한 곳 (Render 배포 형태)",
  documentUrl: `${API}/admin`,
  remoteApi: null,
});

console.log("\n[시나리오 C] 허용 목록에 없는 Origin 은 브라우저처럼 차단되는가");
const evil = makeBrowserFetch("https://evil.example.com");
let blocked = "";
try {
  await evil(`${API}/api/auth/status`);
} catch (error) {
  blocked = error.message;
}
expect("차단됨", blocked.startsWith("Failed to fetch"), true);
console.log(`    차단 메시지: ${blocked}`);

console.log(`\n${"=".repeat(72)}\n결과: ${checks - failures}/${checks} 통과`);
if (failures) process.exitCode = 1;
