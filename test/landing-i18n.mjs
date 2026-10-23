// 한영 자동 번역 동작 검증 (jsdom)
//
//   [시나리오 A] 한국어 브라우저 → 한국어 화면, KO 선택 상태
//   [시나리오 B] 영어 브라우저 → 자동으로 영어 화면 (한국어가 남지 않는지 전수 확인)
//   [시나리오 C] KO/EN 토글 → 화면·<html lang>·제목·주소(?lang=)·저장값이 함께 바뀐다
//   [시나리오 D] 저장된 선택 > 브라우저 언어, ?lang= > 저장된 선택
//   [시나리오 E] 어드민에서 저장한 한국어 CMS 값도 사전으로 번역, 사전에 없으면 원문 유지
//
// 실행: npm run test:i18n  (jsdom 필요: npm i -D jsdom, 저장소 devDependencies 에 포함)
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(path.join(ROOT, "index.html"), "utf8");
const moduleTag = '<script type="module" crossorigin>';
const bundleStart = source.indexOf(moduleTag) + moduleTag.length;
const bundleEnd = source.indexOf("</script>", bundleStart);
if (bundleStart < moduleTag.length || bundleEnd < 0) {
  throw new Error("index.html의 인라인 React 번들을 찾지 못했습니다. (npm run build)");
}
const bundle = source.slice(bundleStart, bundleEnd);

const HANGUL = /[\uAC00-\uD7A3]/g;
/** 영어 화면에서도 일부러 한국어로 남기는 문구 (i18n/messages.ts 의 koOnly) */
const KEEP_KOREAN = ["큐브베리"];

let failures = 0;
let checks = 0;
const show = (value) => (typeof value === "object" && value !== null ? JSON.stringify(value) : String(value));
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

const text = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? "";
async function until(label, check, timeout = 5000) {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeout) throw new Error(`${label} 시간 초과`);
    await sleep(25);
  }
}

/** 화면에 남아 있는 한국어를 모은다 (본문 + alt·aria-label·placeholder·title). */
function leftoverKorean(document) {
  const found = new Set();
  const push = (value) => {
    // 일부러 남긴 문구(국문 브랜드 표기 등)를 지운 뒤에도 한국어가 남는지 본다.
    const remainder = KEEP_KOREAN.reduce((acc, keep) => acc.split(keep).join(""), String(value));
    // 남은 한국어를 앞뒤 문맥과 함께 담아 어느 문구인지 바로 알 수 있게 한다.
    for (const match of remainder.matchAll(/\S{0,24}[\uAC00-\uD7A3]+\S{0,24}/g)) found.add(match[0]);
  };
  push(document.body.textContent);
  for (const node of document.querySelectorAll("[alt], [aria-label], [placeholder], [title]")) {
    for (const attribute of ["alt", "aria-label", "placeholder", "title"]) {
      const value = node.getAttribute(attribute);
      if (value) push(value);
    }
  }
  return [...found];
}

/**
 * 랜딩을 실제로 띄운다.
 * navigator 언어·저장값·주소(?lang=)·어드민 저장값(CMS)을 지정해 첫 화면을 재현한다.
 */
async function renderLanding({ language = "ko-KR", stored = null, search = "", cms = null } = {}) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => {
    if (!/Could not load|Not implemented: navigation/.test(error.message)) console.error(error);
  });
  const dom = new JSDOM(
    '<!doctype html><html lang="ko" data-cms-native="1"><head><meta name="description" content="" /><title>·</title></head><body><div id="root"></div></body></html>',
    {
      url: `https://hanahchafilmaker.github.io/Landing_Cuberry/${search}`,
      runScripts: "dangerously",
      pretendToBeVisual: true,
      virtualConsole,
      beforeParse(window) {
        Object.defineProperty(window.navigator, "language", { value: language, configurable: true });
        Object.defineProperty(window.navigator, "languages", { value: [language], configurable: true });
        window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
        window.scrollTo = () => {};
        window.open = () => null;
        window.fetch = async () => ({ ok: true, json: async () => cms ?? {} });
        if (stored) window.localStorage.setItem("cuberry:lang", stored);
      },
    },
  );
  if (cms) dom.window.CuberryContent = cms;
  dom.window.eval(bundle);
  await until("React 렌더", () => dom.window.document.querySelector("#top h1"));
  // 언어·제목·주소는 마운트 직후 effect 에서 맞춰지므로 그것까지 기다린다.
  await until("언어 적용", () => dom.window.document.documentElement.hasAttribute("data-lang"));
  return dom;
}

const navLabels = (document) => [...document.querySelectorAll('header nav[aria-label] a')].map(text);
/** 상품 카드의 가격 옆 길이 표기 (예: 15s · up to 5 cuts) */
const priceDuration = (document) =>
  text(document.querySelector("#pricing article .flex.items-baseline span.font-mono"));
/** 푸터에서 특정 단어가 들어간 줄 찾기 */
const footerLine = (document, needle) =>
  [...document.querySelectorAll("footer span")].map(text).find((line) => line.includes(needle)) ?? "";
const toggle = (document) => document.querySelector("header [data-lang-toggle]");

console.log("\n[i18n] A. 한국어 브라우저 → 한국어 화면");
{
  const dom = await renderLanding({ language: "ko-KR" });
  const { document } = dom.window;
  expect("내비 메뉴", navLabels(document).slice(0, 4), ["회사소개", "스튜디오", "엑스콘다", "문의"]);
  expect("연혁 제목", text(document.querySelector("#history h2")), "연혁");
  expect("문의 폼 라벨", text(document.querySelector('#contact label span')), "회사 / 이름 *");
  expect("<html lang>", document.documentElement.getAttribute("lang"), "ko");
  expect("제목에 국문 브랜드", document.title.includes("큐브베리"), true);
  expect("KO 버튼이 선택됨", toggle(document)?.querySelector('[lang="ko"]')?.getAttribute("aria-pressed"), "true");
  expect("EN 버튼은 미선택", toggle(document)?.querySelector('[lang="en"]')?.getAttribute("aria-pressed"), "false");
  dom.window.close();
}

console.log("\n[i18n] B. 영어 브라우저 → 자동으로 영어 화면");
{
  const dom = await renderLanding({ language: "en-US" });
  const { document } = dom.window;
  expect("내비 메뉴", navLabels(document).slice(0, 4), ["Company", "Studio", "XCONDA", "Contact"]);
  expect("히어로 상담 CTA", text(document.querySelector('#top a[href="#contact"]')), "Discuss a project");
  expect("히어로 포트폴리오 CTA", text(document.querySelector('#top a[href="#works"]')), "Portfolio →");
  expect("포트폴리오 초기 카드 6개", document.querySelectorAll("#works article").length, 6);
  const moreProjects = [...document.querySelectorAll("#works button")].find((button) => text(button).includes("Load more projects"));
  expect("포트폴리오 추가 로드 버튼", text(moreProjects), "Load more projects+6");
  moreProjects?.click();
  await until("추가 작품 렌더", () => document.querySelectorAll("#works article").length === 12);
  expect("섹션 제목(연혁)", text(document.querySelector("#history h2")), "Milestones");
  expect("숫자 요약 라벨", document.querySelector('section[aria-label="Key numbers"]') !== null, true);
  expect("특허 상태", text(document.querySelector("#patents article span")), "Registered");
  expect("특허 번호 규칙 변환", text(document.querySelector("#patents article span.font-mono.text-mute")), "No. 10-3002930");
  expect("상품 이름", text(document.querySelector("#pricing article h3")), "Short-form AI ad");
  expect("금액 규칙 변환", text(document.querySelector("#pricing article span.text-\\[38px\\]")), "from ₩290,000");
  expect("길이 규칙 변환", priceDuration(document), "15s · up to 5 cuts");
  expect("FAQ 질문", text(document.querySelector("#faq button[aria-expanded] span.flex-1")), "What kind of company is CUBEBERRY?");
  expect("문의 폼 라벨", text(document.querySelector('#contact label span')), "Company / name *");
  expect("푸터 법인 정보", footerLine(document, "CEO"), "CUBEBERRY Inc. · CEO Lee Jin-seo");
  expect("<html lang>", document.documentElement.getAttribute("lang"), "en");
  expect("제목", document.title, "CUBEBERRY | Imagine Speaks, AI Completes.");
  expect("EN 버튼이 선택됨", toggle(document)?.querySelector('[lang="en"]')?.getAttribute("aria-pressed"), "true");
  expect("번역되지 않은 한국어가 없음", leftoverKorean(document), []);
  expect("주소에는 아직 언어 파라미터가 없음", dom.window.location.search, "");
  dom.window.close();
}

console.log("\n[i18n] C. KO/EN 토글 → 화면·언어 속성·주소·저장값이 함께 바뀐다");
{
  const dom = await renderLanding({ language: "ko-KR" });
  const { document } = dom.window;
  const en = toggle(document).querySelector('[lang="en"]');
  en.click();
  await until("영어 전환", () => text(document.querySelector("#history h2")) === "Milestones");
  expect("내비 메뉴", navLabels(document).slice(0, 2), ["Company", "Studio"]);
  expect("<html lang>", document.documentElement.getAttribute("lang"), "en");
  expect("제목", document.title, "CUBEBERRY | Imagine Speaks, AI Completes.");
  expect("주소에 ?lang=en", dom.window.location.search, "?lang=en");
  expect("선택 저장", dom.window.localStorage.getItem("cuberry:lang"), "en");
  expect("영어 화면에 한국어 없음", leftoverKorean(document), []);

  const ko = toggle(document).querySelector('[lang="ko"]');
  ko.click();
  await until("한국어 복귀", () => text(document.querySelector("#history h2")) === "연혁");
  expect("<html lang> 되돌림", document.documentElement.getAttribute("lang"), "ko");
  expect("주소 ?lang=ko", dom.window.location.search, "?lang=ko");
  expect("선택 저장", dom.window.localStorage.getItem("cuberry:lang"), "ko");
  dom.window.close();
}

console.log("\n[i18n] D. 우선순위 — 주소 > 저장값 > 브라우저 언어");
{
  const stored = await renderLanding({ language: "en-US", stored: "ko" });
  expect("저장된 한국어가 브라우저(영어)보다 우선", navLabels(stored.window.document)[0], "회사소개");
  stored.window.close();

  const query = await renderLanding({ language: "ko-KR", stored: "ko", search: "?lang=en" });
  expect("주소의 ?lang=en 이 저장값보다 우선", navLabels(query.window.document)[0], "Company");
  expect("주소로 지정한 언어도 기억됨", query.window.localStorage.getItem("cuberry:lang"), "en");
  query.window.close();

  const short = await renderLanding({ language: "en", search: "?lang=ko" });
  expect("?lang=ko 는 영어 브라우저에서도 한국어", navLabels(short.window.document)[0], "회사소개");
  short.window.close();
}

console.log("\n[i18n] E. 어드민 저장값(CMS)도 같은 사전으로 번역");
{
  const cms = {
    settings: { heroSubtitle: "관리자가 저장한 소개 문장입니다.", heroNote: "IR · 취재 · 제휴 문의" },
    faqs: [
      { id: 1, question: "큐브베리는 어떤 기업인가요?", answer: "방송 전문가들이 이끄는 AI 콘텐츠 기업입니다." },
      { id: 2, question: "새로 추가한 질문입니다.", answer: "아직 사전에 없는 답변." },
    ],
    services: [{ id: 7, name: "관리형 숏폼", price: "39만원~", duration: "20초 · 6컷" }],
  };
  const dom = await renderLanding({ language: "en-US", cms });
  const { document } = dom.window;
  expect("CMS 히어로 설명(사전에 없음)은 원문 유지", text(document.querySelector("#top p")), "관리자가 저장한 소개 문장입니다.");
  expect("CMS 문의 CTA는 잘못된 PDF 다운로드 문구를 쓰지 않음", text(document.querySelector('#top a[href="#contact"]')), "Discuss a project");
  expect("CMS 히어로 메모 번역", text(document.querySelector("#top a[href^='mailto']")).includes("Press"), true);
  expect("CMS 상품 금액 규칙 변환", text(document.querySelector("#pricing article span.text-\\[38px\\]")), "from ₩390,000");
  expect("CMS 상품 길이 규칙 변환", priceDuration(document), "20s · 6 cuts");
  expect("CMS FAQ(사전 등록분) 번역", text(document.querySelector("#faq button[aria-expanded] span.flex-1")), "What kind of company is CUBEBERRY?");
  expect("CMS FAQ(사전에 없음)는 원문 유지", text(document.querySelectorAll("#faq button[aria-expanded] span.flex-1")[1]), "새로 추가한 질문입니다.");
  expect("CMS 상품명(사전에 없음)은 원문 유지", text(document.querySelector("#pricing article h3")), "관리형 숏폼");
  expect("한국어 원문이 화면에서 사라지지 않음", text(document.querySelectorAll("#faq button[aria-expanded]")[1]).includes("아직 사전에 없는 답변.") || text(document.querySelector("#faq")).includes("새로 추가한 질문"), true);
  dom.window.close();
}

console.log("\n[i18n] F. 운영 CMS 기본값(server/seed.json)을 그대로 받아도 영어 화면");
{
  const seed = JSON.parse(readFileSync(path.join(ROOT, "server", "seed.json"), "utf8"));
  const dom = await renderLanding({ language: "en-US", cms: seed });
  const { document } = dom.window;
  expect("시드 FAQ 질문 번역", text(document.querySelector("#faq button[aria-expanded] span.flex-1")), "Can you deliver a polished video without live-action shooting?");
  expect("시드 상품 이름 번역", text(document.querySelector("#pricing article h3")), "Short-form AI ad");
  expect("시드 팀 소개 번역", text(document.querySelector("#team article h3")), "Lee Jin-seo");
  expect(
    "시드 작품 제목 번역",
    [...document.querySelectorAll("#works article h3")].map(text).find((title) => title.startsWith("Hometown of Legends")),
    "Hometown of Legends: Gumiho — KBS1 Broadcast & REBOOT",
  );
  expect("시드 팀 이력도 번역", text(document.querySelector("#team li")).includes("KBS"), true);
  expect("시드 전체에서 남은 한국어 없음", leftoverKorean(document), []);
  dom.window.close();
}

console.log(`\n결과: ${checks - failures}/${checks} 통과`);
if (failures) process.exitCode = 1;
