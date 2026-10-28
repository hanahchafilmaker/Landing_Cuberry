// 드라이브 이름 → 분류·그룹·변형 배지 (순수 함수) 검증.
//   · 폴더 이름은 공개 카테고리/섹션으로만 바뀌고, 보관 폴더는 숨는다
//   · 납품본·자막본·언어쌍·버전이 한 그룹으로 묶인다(중복 카드 제거)
//   · 시리즈(PartN)는 한 그룹 + 에피소드 목록
//   · 한글 별칭으로 검색된다("구미호", "토이팜" …)
//   · 세로 영상은 portrait 로 표시된다
import assert from "node:assert/strict";
import {
  CATEGORY_LABELS,
  describeName,
  describeVideo,
  humanize,
  rootFolder,
  sectionLabel,
} from "../server/lib/drive-grouping.mjs";

// ── 1. 폴더 → 카테고리 ────────────────────────────────────────────────
const roots = {
  "01_Commercial": ["commercial", "광고"],
  "02_Guide": ["guide", "가이드"],
  "03_Demo": ["demo", "데모 · 쇼릴"],
  "04_TV": ["tv", "TV"],
  "05_Web_Drama": ["webdrama", "웹드라마"],
};
for (const [name, [category, label]] of Object.entries(roots)) {
  const result = rootFolder(name);
  assert.equal(result.category, category, name);
  assert.equal(result.label, label, name);
  assert.equal(CATEGORY_LABELS[category], label);
}
for (const name of ["_archive", "Archive", "보관함", "test-folder"]) {
  assert.equal(rootFolder(name).hidden, true, `${name} 은 공개 대상이 아니다`);
}
assert.deepEqual(rootFolder("기타자료"), { category: "other", label: "기타", order: 90 });

// ── 2. 섹션(칩) ─────────────────────────────────────────────────────
assert.equal(sectionLabel("commercial", "Kosha"), "KOSHA");
assert.equal(sectionLabel("commercial", "XCONDA"), "XCONDA");
assert.equal(sectionLabel("commercial", "SeongnamCity"), "성남시");
assert.equal(sectionLabel("commercial", "ScanPang"), "스캔팡");
assert.equal(sectionLabel("commercial", "NewBrand"), "New Brand", "모르는 프로젝트 폴더는 읽기 좋게");
assert.equal(sectionLabel("guide", "KO"), "한국어");
assert.equal(sectionLabel("guide", "EN"), "영어");
assert.equal(sectionLabel("guide", "JA"), "일본어");
assert.equal(sectionLabel("tv", "Sub"), "", "TV 는 하위 폴더를 칩으로 쓰지 않는다");

// ── 3. 그룹핑: 중복 카드 제거 ───────────────────────────────────────
const pair = (a, b, category = "tv", section = "") => {
  const left = describeName(a, { category, section });
  const right = describeName(b, { category, section });
  assert.equal(left.group, right.group, `${a} ↔ ${b} 는 같은 작품이어야 합니다`);
  return [left, right];
};
const [base, delivery] = pair("TV_FairyTalesForAHappyWorld_Gugbob.mp4", "TV_FairyTalesForAHappyWorld_Gugbob_Delivery_v1.mp4");
assert.match(delivery.variant, /납품본/);
assert.equal(base.delivery, false);
pair("XCONDA_Turn_Commercial_v1_ENGsub.mp4", "XCONDA_Turn_Commercial_v1_KORsub.mp4", "commercial", "XCONDA");
pair("ScanPang_Commercial_v7_EN.mp4", "ScanPang_Commercial_v7_KO.mp4", "commercial", "스캔팡");
pair("Guide_XCONDA_05_AutoAngleGenerator_KO.mp4", "Guide_XCONDA_05_AutoAngleGenerator_EN.mp4", "guide");
pair("WebDrama_TheSeedWar_Trailer.mp4", "WebDrama_TheSeedWar_PilotTest.mp4", "webdrama");

// 변형 배지에 언어·자막·버전이 들어간다
const subtitled = describeName("XCONDA_Turn_Commercial_v1_KORsub.mp4", { category: "commercial" });
assert.match(subtitled.variant, /KO 자막/, subtitled.variant);
assert.match(subtitled.variant, /v1/, subtitled.variant);
const english = describeName("Guide_XCONDA_05_AutoAngleGenerator_EN.mp4", { category: "guide" });
assert.match(english.variant, /영어/);

// 규칙 위반 표기(ENGsub)도 자막 변형으로 인식한다
assert.match(describeName("XCONDA_Turn_Commercial_v1_ENGsub.mp4", { category: "commercial" }).variant, /EN 자막/);

// ── 4. 시리즈는 한 그룹 + 에피소드 ────────────────────────────────────
const parts = [1, 2, 3, 4, 5].map((n) =>
  describeName(`XCONDA_SeedancePromo_Part${n}_${["TopGun", "Countryside", "Future", "Champagne", "Toothpaste"][n - 1]}_EN_v1.mp4`, {
    category: "commercial",
    section: "XCONDA",
  }),
);
assert.equal(new Set(parts.map((part) => part.group)).size, 1, "시리즈 5편은 한 장으로 묶인다");
assert.deepEqual(parts.map((part) => part.episode), [1, 2, 3, 4, 5]);

// 서로 다른 작품은 합쳐지지 않는다
const distinct = ["TV_FairyTalesForAHappyWorld_Gugbob.mp4", "TV_FairyTalesForAHappyWorld_Ramen.mp4", "TV_Chunhyangdan_Trailer.mp4"];
assert.equal(new Set(distinct.map((name) => describeName(name, { category: "tv" }).group)).size, 3);

// 카테고리가 다르면 같은 이름이어도 다른 그룹(탭이 섞이지 않는다)
assert.notEqual(
  describeName("Guide_XCONDA_05_AutoAngleGenerator_KO.mp4", { category: "guide" }).group,
  describeName("Guide_XCONDA_05_AutoAngleGenerator_KO.mp4", { category: "demo" }).group,
);

// ── 5. 제목·검색 ────────────────────────────────────────────────────
assert.equal(humanize("XCONDA_SeedancePromo_Part1_TopGun_EN_v1.mp4"), "XCONDA Seedance Promo Part 1 Top Gun EN v 1");
assert.equal(describeName("Kosha_daVinci_MonaLisa_v5.mp4", { category: "commercial", section: "KOSHA" }).title, "Kosha da Vinci Mona Lisa");

const gumiho = describeName("TV_HometownOfLegends_NineTailedFox_Trailer.mp4", { category: "tv" });
assert.match(gumiho.search, /구미호/);
assert.match(gumiho.search, /전설의 고향/);
const toyfarm = describeName("WebDrama_ToyFarm_Trailer.mp4", { category: "webdrama" });
assert.match(toyfarm.search, /토이팜/);
const guide = describeName("Guide_XCONDA_05_AutoAngleGenerator_KO.mp4", { category: "guide", section: "한국어" });
assert.match(guide.search, /자동 앵글 생성/);
assert.match(guide.search, /한국어/, "섹션(언어)도 검색된다");

// ── 6. 화면 레코드 ───────────────────────────────────────────────────
const portrait = describeVideo(
  { id: "vid_123", name: "XCONDA_Discount30_TopGun_VerticalShorts_202610_EN.mp4", width: 1080, height: 1920, durationMs: 30_500 },
  { category: "commercial", categoryLabel: "광고", section: "XCONDA" },
);
assert.equal(portrait.aspect, "portrait");
assert.equal(portrait.durationMs, 30_500);
assert.equal(portrait.categoryLabel, "광고");
assert.equal(portrait.section, "XCONDA");
assert.equal(portrait.id, "vid_123");
assert.equal(Object.keys(portrait).includes("folderId"), false, "폴더 ID 는 응답에 넣지 않는다");
assert.equal(JSON.stringify(portrait).includes("01_Commercial"), false, "원본 폴더 이름은 노출하지 않는다");

const landscape = describeVideo({ id: "vid_456", name: "Demo_Cubeberry_Showreel.mp4", width: 3840, height: 2160 }, { category: "demo", categoryLabel: "데모 · 쇼릴", section: "" });
assert.equal(landscape.aspect, "landscape");
assert.equal(landscape.section, "");
const unknownSize = describeVideo({ id: "vid_789", name: "Demo_StoryboardPreview_Kakao_v1.mp4" }, { category: "demo", categoryLabel: "데모 · 쇼릴", section: "" });
assert.equal(unknownSize.aspect, "landscape", "크기를 모르면 가로로 그린다");
assert.equal(unknownSize.width, 0);

// resourceKey 는 있을 때만 남는다
assert.equal(describeVideo({ id: "vid_a", name: "A.mp4", resourceKey: "rk_123" }, { category: "tv", categoryLabel: "TV" }).resourceKey, "rk_123");
assert.equal("resourceKey" in describeVideo({ id: "vid_b", name: "B.mp4" }, { category: "tv", categoryLabel: "TV" }), false);

console.log("[drive grouping] 통과 — 카테고리 6 · 섹션 8 · 그룹핑 8쌍 · 시리즈 5편 · 별칭 3 · 화면 레코드 4");
