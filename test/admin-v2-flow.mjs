// 새 어드민(admin-v2 빌드 파일) 종단 테스트.
// 로컬 Node 서버(localhost:8080)가 서빙하는 실제 화면을 jsdom 으로 열어
// 로그인 → Team 화면 → 프로필 수정 저장 → 서버 반영까지 확인한다.
//
// 실행: npm start 서버가 떠 있어야 함 (PORT=8080)
//   node test/admin-v2-flow.mjs
import { JSDOM, VirtualConsole } from "jsdom";

const BASE = process.env.TEST_API_ORIGIN || "http://127.0.0.1:8080";
const PASSWORD = process.env.TEST_ADMIN_PASSWORD || "cuberry2026";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let checks = 0;
let failures = 0;
function expect(label, actual, wanted) {
  checks += 1;
  const ok = Array.isArray(wanted)
    ? JSON.stringify(actual) === JSON.stringify(wanted)
    : wanted instanceof RegExp
      ? wanted.test(String(actual))
      : actual === wanted;
  if (!ok) {
    failures += 1;
    console.error(`  ✗ ${label}\n      기대: ${wanted}\n      실제: ${actual}`);
  } else {
    console.log(`  ✓ ${label}`);
  }
}
async function until(label, check, timeout = 8000) {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeout) throw new Error(`${label} 시간 초과`);
    await sleep(25);
  }
}

const response = await fetch(`${BASE}/admin-v2`);
const html = await response.text();
expect("/admin-v2 서빙", response.status, 200);
expect("자기 서버 주소로 비워짐", /name="cuberry-api-origin" content=""/.test(html), true);

const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => {
  console.error("[jsdom]", error.message, error.detail || "");
});

// jsdom 은 type=module 스크립트를 실행하지 않으므로 번들을 꺼내 직접 실행한다(landing-cms.mjs 와 같은 방식).
const bundleMatch = html.match(/<script type="module"[^>]*>([\s\S]*?)<\/script>/);
if (!bundleMatch) throw new Error("번들을 찾지 못했습니다");
const bundle = bundleMatch[1];

const dom = new JSDOM(html, {
  url: `${BASE}/admin-v2`,
  runScripts: "dangerously",
  pretendToBeVisual: true,
  virtualConsole,
  resources: undefined,
  beforeParse(window) {
    window.fetch = (url, init) => fetch(new URL(String(url), `${BASE}/`).href, init);
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    });
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    if (!window.Element.prototype.scrollIntoView) window.Element.prototype.scrollIntoView = () => {};
    window.HTMLElement.prototype.hasPointerCapture = () => false;
    window.HTMLElement.prototype.setPointerCapture = () => {};
    window.HTMLElement.prototype.releasePointerCapture = () => {};
  },
});

dom.window.addEventListener("error", (e) => console.error("[window error]", e.message, e.error?.stack || ""));
const { document } = dom.window;
dom.window.eval(bundle);
await sleep(300);
const byText = (nodes, needle) => [...nodes].find((node) => node.textContent.trim().includes(needle));

console.log("\n[admin-v2] 로그인 화면 → 대시보드");
await until("로그인 폼", () => document.querySelector("#admin-password"));
expect("비밀번호 입력창", Boolean(document.querySelector("#admin-password")), true);
const input = document.querySelector("#admin-password");
const nativeSetter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set;
nativeSetter.call(input, PASSWORD);
input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
const form = input.closest("form");
form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
await until("대시보드", () => byText([...document.querySelectorAll("h1, h2")], "Good to see you"));
expect("로그인 성공(대시보드)", Boolean(byText([...document.querySelectorAll("h1, h2")], "Good to see you")), true);
expect("토큰 저장(기존 어드민과 같은 키)", Boolean(dom.window.localStorage.getItem("cuberry-admin-token")), true);

console.log("\n[admin-v2] Team 화면");
const teamBtn = byText([...document.querySelectorAll("button")], "Team");
expect("사이드바 Team 메뉴", Boolean(teamBtn), true);
teamBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
await until("Team 페이지", () => byText([...document.querySelectorAll("h1")], "Team profiles"));
expect("Team profiles 헤더", Boolean(byText([...document.querySelectorAll("h1")], "Team profiles")), true);
await until("팀 카드", () => [...document.querySelectorAll("main .font-mono")].some((el) => el.textContent.trim().startsWith("Order ")));
const memberCards = [...document.querySelectorAll("main .font-mono")].filter((el) => el.textContent.trim().startsWith("Order "));
expect("팀 카드가 그려짐", memberCards.length > 0, true);

console.log("\n[admin-v2] 첫 프로필 수정 저장 → 서버 반영");
const before = await (await fetch(`${BASE}/api/public/content`)).json();
const targetName = before.team[0].name;
const stamped = `${targetName.split(" (")[0]} (E2E)`;
const editBtn = byText([...document.querySelectorAll("button")], "Edit");
editBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
await until("에디터", () => byText([...document.querySelectorAll("h3, .text-lg")], "Edit profile") || [...document.querySelectorAll("input")].some((i) => i.value === targetName));
const nameInput = [...document.querySelectorAll("input")].find((node) => node.value && node.value === targetName);
expect("이름 입력칸에 현재 값", Boolean(nameInput), true);
nativeSetter.call(nameInput, stamped);
nameInput.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
const editorForm = nameInput.closest("form");
editorForm.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
await until("저장 반영(공개 API)", async () => true, 100); // noop guard
await sleep(400);
const after = await (await fetch(`${BASE}/api/public/content`)).json();
expect("서버에 새 이름 반영", after.team[0].name, stamped);
expect("이력은 유지", after.team[0].bio, before.team[0].bio);
expect("사진은 유지", after.team[0].photoUrl, before.team[0].photoUrl);

console.log("\n[정리] 원복");
const token = dom.window.localStorage.getItem("cuberry-admin-token");
const restore = await fetch(`${BASE}/api/admin/team/${before.team[0].id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ ...before.team[0], name: targetName }),
});
expect("원복 PUT", restore.status, 200);
const reverted = await (await fetch(`${BASE}/api/public/content`)).json();
expect("원복 확인", reverted.team[0].name, targetName);

console.log(`\n결과: ${checks - failures}/${checks} 통과`);
process.exit(failures ? 1 : 0);
