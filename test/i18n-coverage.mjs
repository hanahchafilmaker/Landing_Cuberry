// 한영 자동 번역 사전의 "빠짐없이" 검증 (jsdom 없이 도는 순수 검사)
//
//   · 랜딩 소스(landing/src/**/*.tsx)의 모든 한국어 문구에 영어 번역이 있는지
//   · 운영 CMS 기본값(server/seed.json)의 문구도 번역됐는지
//   · 사전 값에 한국어가 남아 있지 않은지 (일부러 남긴 koOnly 제외)
//
// 실행: npm test  (또는 node test/i18n-coverage.mjs)
// 새 한국어 문구를 화면에 추가하고 번역을 잊으면 여기서 바로 실패합니다.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { en, koOnly } from "../landing/src/i18n/messages.ts";
import { applyRules, normalizeKey } from "../landing/src/i18n/translate.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "landing", "src");
const DICTIONARY_FILE = path.join(SRC, "i18n", "messages.ts");
const HANGUL = /[\uAC00-\uD7A3]/;

let failures = 0;
let checks = 0;
function expect(label, actual, wanted) {
  checks += 1;
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    failures += 1;
    console.error(`  ✗ ${label}\n      기대: ${JSON.stringify(wanted)}\n      실제: ${JSON.stringify(actual)}`);
  } else {
    console.log(`  ✓ ${label}`);
  }
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** 주석을 지운다 — 설명 속 예시 문구를 번역 대상으로 오해하지 않도록. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

/** 한글이 들어간 문자열 리터럴 + JSX 텍스트 노드를 모은다. */
function koreanStringsIn(file) {
  const source = stripComments(readFileSync(file, "utf8"));
  const found = new Set();
  const push = (value) => {
    // 소스의 "\n" 은 런타임에서 줄바꿈이 되므로 사전 키와 같게 공백으로 맞춘다.
    const text = String(value ?? "").replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
    if (HANGUL.test(text)) found.add(text);
  };
  for (const match of source.matchAll(/"([^"\n]*)"|'([^'\n]*)'/g)) push(match[1] ?? match[2]);
  // JSX 텍스트 노드 ( {표현식} 이 섞인 조각은 자리표시자 단위로 따로 담기지 않으므로 제외)
  for (const match of source.matchAll(/>([^<>{}]*[\uAC00-\uD7A3][^<>{}]*)</g)) push(match[1]);
  return [...found];
}

const dictionary = new Set(Object.keys(en).map(normalizeKey));
const keep = new Set(koOnly.map(({ text }) => normalizeKey(text)));
/** 사전이 없어도 규칙(금액·길이·특허번호)으로 자동 변환되는 문구인지 */
const covered = (text) => dictionary.has(text) || keep.has(text) || applyRules(text) !== undefined;

console.log("\n[i18n] 사전 자체 점검");
const emptyValues = Object.entries(en).filter(([, value]) => !String(value).trim()).map(([key]) => key);
expect("빈 번역이 없음", emptyValues, []);
const koreanValues = Object.entries(en)
  .filter(([, value]) => HANGUL.test(value))
  .map(([key, value]) => `${key} → ${value}`);
expect("영어 문장에 한국어가 섞이지 않음", koreanValues, []);
const unusedKeep = [...keep].filter((text) => dictionary.has(text));
expect("koOnly 와 사전이 겹치지 않음", unusedKeep, []);

console.log("\n[i18n] 랜딩 소스 문구 커버리지");
// landing/src/seo/ 는 화면 문구가 아니라 검색엔진용 메타데이터(schema.org 노드 이름)라 제외한다.
// 사용자에게 보이지 않으므로 번역 사전에 넣을 대상이 아니다(번역하면 오히려 구조화 데이터가 흔들린다).
const SEO_DIR = path.join(SRC, "seo") + path.sep;
const files = walk(SRC).filter(
  (file) =>
    /\.tsx?$/.test(file) &&
    path.resolve(file) !== DICTIONARY_FILE &&
    !path.resolve(file).startsWith(SEO_DIR),
);
const missing = [];
let total = 0;
for (const file of files) {
  for (const text of koreanStringsIn(file)) {
    total += 1;
    const key = normalizeKey(text);
    if (covered(key)) continue;
    missing.push(`${path.relative(ROOT, file)} → ${text}`);
  }
}
console.log(`    랜딩 소스 ${files.length}개 파일에서 한국어 문구 ${total}건`);
expect("랜딩 소스 문구가 모두 번역됨", missing, []);

console.log("\n[i18n] 운영 CMS 기본값(server/seed.json) 커버리지");
const seed = JSON.parse(readFileSync(path.join(ROOT, "server", "seed.json"), "utf8"));
const seedMissing = [];
const seen = new Set();
const collect = (value, trail) => {
  if (typeof value === "string") {
    // 화면(mapping)과 같은 단위로 검사한다 — 팀 소개는 역할(" · ")·이력(줄바꿈)로 나뉘어 그려진다.
    const pieces = trail.startsWith("team[")
      ? trail.endsWith(".role")
        ? value.split(" · ")
        : trail.endsWith(".bio")
          ? value.split(/\r?\n/)
          : [value]
      : [value];
    for (const piece of pieces) {
      const key = normalizeKey(piece);
      if (!HANGUL.test(key) || seen.has(key) || covered(key)) continue;
      if (trail.includes("password") || trail.includes("token")) continue;
      seen.add(key);
      seedMissing.push(`${trail} → ${key}`);
    }
    return;
  }
  if (Array.isArray(value)) value.forEach((item, index) => collect(item, `${trail}[${index}]`));
  else if (value && typeof value === "object") {
    // 비공개(isPublished: false) 초안은 화면에 그려지지 않는다 — 어드민에서 저장만 해 둔
    // 미번역 초안 때문에 CI 가 빨간불이 되지 않도록 검사에서 뺀다.
    if (value.isPublished === false) return;
    Object.entries(value).forEach(([key, item]) => collect(item, trail ? `${trail}.${key}` : key));
  }
};
collect(seed, "");
expect("CMS 기본값이 모두 번역됨", seedMissing, []);

console.log(`\n결과: ${checks - failures}/${checks} 통과`);
if (failures) process.exitCode = 1;
