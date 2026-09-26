// 실제 브라우저처럼 동작시키는 종단 테스트. 세 가지 배포 형태를 모두 검증한다.
//
//   [시나리오 A] GitHub Pages + ?api= — 문서 주소는 github.io 의 서브경로(/Landing_Cuberry/admin/)이고
//                API 는 주소창의 ?api= 로 지정한 원격 Node 서버. 방문자가 주소를 직접 입력하는 경우.
//   [시나리오 B] 로컬 개발 가드 — **운영 서버 주소가 소스에 박힌 HTML** 을 http://127.0.0.1:8080/admin
//                에서 연다. 가드가 없으면 로컬 편집이 운영 DB 에 그대로 반영되므로, 이 경우
//                굽힌/저장된 주소를 무시하고 자기 서버만 쓰는지, 운영 주소로 요청이 한 건도 새지
//                않는지를 본다. (Node 서버가 직접 서빙할 때는 서버 쪽에서도 그 값을 비워 보낸다.)
//   [시나리오 C] GitHub Pages + 굽힌 주소만 — ?api= 도 localStorage 도 없이, 소스에 커밋된
//                BAKED_API_ORIGIN 만으로 로그인 → 내비게이션 → 로그아웃을 완주한다.
//                방문자가 주소를 입력하지 않아도 되는지가 이 변경의 핵심이므로 이게 본시험이다.
//
// fetch 는 브라우저의 CORS 규칙을 흉내 낸 래퍼로 교체한다. 교차출처면 Origin 헤더를 붙이고,
// 사전요청(OPTIONS)이 필요하면 실제로 보내고, Access-Control-Allow-Origin 이 문서 Origin 과
// 일치하지 않으면 브라우저처럼 응답을 주지 않고 TypeError 를 던진다.
//
// 필요: jsdom (선택적 의존성). 없으면 건너뜁니다.
//   npm i -D jsdom
//   npm start          ← 서버가 켜져 있어야 함. ADMIN_ALLOWED_ORIGINS 없이 켜도 된다
//                        (GitHub Pages 주소는 서버 기본 허용 목록에 들어 있으므로 그것까지 함께 검증된다)
//   npm run test:dom
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ADMIN_HTML = readFileSync(path.join(ROOT, "admin", "index.html"), "utf8");
const API = process.env.TEST_API_ORIGIN || "http://127.0.0.1:8080";
const PASSWORD = process.env.TEST_ADMIN_PASSWORD || "cuberry2026";
const PAGES_ORIGIN = "https://hanahchafilmaker.github.io";
const PROD_API = "https://landing-cuberry-admin.onrender.com";
const BAKED_RE = /const BAKED_API_ORIGIN = "[^"]*";/;

// 굽힌 주소를 갈아끼운 HTML 사본. 시나리오 C 에서 "커밋된 주소만으로 연결된다"를 보려고
// 운영 주소 대신 테스트 서버 주소를 넣는다(테스트에서 운영 서버를 건드리면 안 되므로).
function withBakedOrigin(html, origin) {
  if (!BAKED_RE.test(html)) throw new Error("admin/index.html 에서 BAKED_API_ORIGIN 을 찾지 못했습니다.");
  return html.replace(BAKED_RE, `const BAKED_API_ORIGIN = ${JSON.stringify(origin)};`);
}

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
  const origins = [];
  const wrapped = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url, documentOrigin);
    const method = String(init.method || "GET").toUpperCase();
    const headers = {};
    for (const [key, value] of Object.entries(init.headers || {})) headers[key.toLowerCase()] = value;
    const sameOrigin = url.origin === documentOrigin;
    if (!sameOrigin) headers.origin = documentOrigin;
    origins.push(url.origin);

    const contentType = headers["content-type"];
    const needsPreflight = !sameOrigin && (
      !SIMPLE_METHODS.has(method)
      || Object.keys(headers).some((key) => !SIMPLE_HEADERS.has(key) && key !== "origin")
      || (contentType && !SIMPLE_CONTENT_TYPES.has(contentType))
    );

    if (needsPreflight) {
      origins.push(url.origin);
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
  wrapped.origins = origins;
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
async function runScenario({ title, documentUrl, html = ADMIN_HTML, remoteApi, stored = undefined, localNotice = undefined }) {
  console.log(`\n${"=".repeat(72)}\n${title}\n${"=".repeat(72)}`);
  console.log(`문서 주소 : ${documentUrl}`);
  console.log(`API 서버  : ${remoteApi ? `${remoteApi} (교차출처)` : "문서와 같은 Origin"}`);
  console.log(`굽힌 주소 : ${(BAKED_RE.exec(html) || ["(없음)"])[0]}\n`);

  const dom = new JSDOM(html, { url: documentUrl, runScripts: "dangerously", pretendToBeVisual: true });
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
    // ?api= 로 지정한 경우에만 저장된다. 굽힌 주소는 저장하지 않는다(브라우저 저장소를 오염시키지 않음).
    expect(
      "localStorage 상태",
      dom.window.localStorage.getItem("cuberry.apiOrigin"),
      stored === undefined ? remoteApi || null : stored,
    );
    if (remoteApi) {
      expect("원격 /api/auth/status 성공", dom.window.fetch.log.some((line) => line.startsWith(`GET /api/auth/status → 200 (cross-origin)`)), true);
      expect("'어드민 API 서버 없음' 경고는 안 뜸", doc().querySelector("#login-form").textContent.includes("어드민 API 서버 없음"), false);
    } else {
      expect("같은 서버 /api/auth/status 성공", dom.window.fetch.log.some((line) => line.startsWith("GET /api/auth/status → 200")), true);
    }
    expect("비밀번호 안내 표시", doc().querySelector("#login-form").textContent.includes(PASSWORD), true);
    if (localNotice !== undefined) {
      expect(
        `로컬 개발 가드 안내 ${localNotice ? "표시" : "숨김"}`,
        doc().querySelector("#api-box").textContent.includes("로컬 개발 모드"),
        localNotice,
      );
    }

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
    // 다른 서버(특히 소스에 박힌 운영 주소)로 요청이 새지 않았는지가 이 테스트의 핵심.
    expect(
      "요청이 목표로 한 서버로만 감",
      [...new Set(dom.window.fetch.origins)].sort(),
      [remoteApi ? new URL(remoteApi).origin : documentOrigin],
    );
    return dom.window.fetch.origins;
  } catch (error) {
    failures += 1;
    console.error(`\n  ✗ 시나리오 실패: ${error.message}`);
    console.error("    요청 기록:", dom.window.fetch.log);
    return dom.window.fetch.origins;
  } finally {
    dom.window.close();
  }
}

const sentToProd = [];

sentToProd.push(await runScenario({
  title: "[시나리오 A] GitHub Pages 서브경로 + ?api= 로 지정한 원격 API",
  documentUrl: `${PAGES_ORIGIN}/Landing_Cuberry/admin/?api=${encodeURIComponent(API)}`,
  remoteApi: API,
  localNotice: false,
}));

// 저장소에 커밋된 admin/index.html 은 BAKED_API_ORIGIN = 운영 주소 이다.
// 그 파일을 그대로 로컬에서 열었을 때 운영 서버를 건드리지 않아야 한다.
expect("커밋된 어드민에는 운영 주소가 박혀 있음", BAKED_RE.exec(ADMIN_HTML)?.[0], `const BAKED_API_ORIGIN = "${PROD_API}";`);
sentToProd.push(await runScenario({
  title: "[시나리오 B] 로컬 개발 가드 — 운영 주소가 박힌 HTML 을 127.0.0.1 에서 열기",
  documentUrl: `${API}/admin`,
  html: ADMIN_HTML,
  remoteApi: null,
  stored: null,
  localNotice: true,
}));

sentToProd.push(await runScenario({
  title: "[시나리오 C] GitHub Pages 서브경로 + 굽힌 주소만 (?api= 없음, 저장값 없음)",
  documentUrl: `${PAGES_ORIGIN}/Landing_Cuberry/admin/`,
  html: withBakedOrigin(ADMIN_HTML, API),
  remoteApi: API,
  stored: null,
  localNotice: false,
}));

console.log("\n[시나리오 D] 허용 목록에 없는 Origin 은 브라우저처럼 차단되는가");
const evil = makeBrowserFetch("https://evil.example.com");
let blocked = "";
try {
  await evil(`${API}/api/auth/status`);
} catch (error) {
  blocked = error.message;
}
expect("차단됨", blocked.startsWith("Failed to fetch"), true);
console.log(`    차단 메시지: ${blocked}`);

console.log("\n[점검] 어떤 시나리오에서도 운영 서버로 요청이 가지 않았는가");
expect(
  `운영 주소(${PROD_API})로 간 요청`,
  sentToProd.flat().filter((origin) => origin === PROD_API),
  [],
);

console.log(`\n${"=".repeat(72)}\n결과: ${checks - failures}/${checks} 통과`);
if (failures) process.exitCode = 1;
