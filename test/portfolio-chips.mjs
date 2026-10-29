// 포트폴리오 3분류 + 칩 필터 규칙 검증.
// 2026-10-29 대표님 지적: "왜 kosha에 다른 영상이 섞여있지"
//   칩 필터가 드라이브 영상에만 걸려서, 어드민에 올린 브랜드 필름이 KOSHA 칩에 섞여 보였다.
import assert from "node:assert/strict";
import { chipMatchesCmsWork, isAiWork, tabForCategory, tabForCmsWork, tabForDriveFilm } from "../landing/src/cms/classify.ts";

const card = (over) => ({
  key: "k",
  title: "",
  category: "",
  year: "",
  description: "",
  thumbnailUrl: "",
  tags: [],
  playable: false,
  ...over,
});
const film = (over) => ({
  key: "f",
  title: "",
  category: "",
  year: "",
  description: "",
  thumbnailUrl: "",
  tags: [],
  playable: true,
  driveVideo: true,
  categorySlug: "commercial",
  categoryLabel: "광고",
  section: "",
  searchText: "",
  aspect: "landscape",
  durationMs: 0,
  badges: [],
  variants: [],
  ...over,
});

// ① 탭 분류
assert.equal(tabForCategory("ADVERTISING"), "ad");
assert.equal(tabForCategory("BRAND FILM"), "ad");
assert.equal(tabForCategory("AI ANIMATION SERIES"), "creative");
assert.equal(tabForCategory("CORPORATE VIDEO"), "other");
assert.equal(tabForCategory("YOUTUBE"), "other");
assert.equal(tabForCategory(""), "other", "분류를 모르면 기타로 보내 사라지지 않게 한다");
assert.equal(tabForCmsWork(card({ category: "BRAND FILM" })), "ad");
assert.equal(tabForDriveFilm(film({ categorySlug: "tv" })), "creative");
assert.equal(tabForDriveFilm(film({ categorySlug: "webdrama" })), "creative");
assert.equal(tabForDriveFilm(film({ categorySlug: "commercial" })), "ad");
assert.equal(tabForDriveFilm(film({ categorySlug: "guide" })), "other");

// ② 칩 필터 — KOSHA 를 고르면 KOSHA 것만 남는다 (대표님 지적의 핵심)
const brand = card({ title: "비치오네 AI 브랜드 필름", category: "BRAND FILM", tags: ["PLANNING", "AI GENERATION"] });
const sell = card({ title: "셀렉스 릴렉스 샷 윤가이편", category: "ADVERTISING", tags: ["PLANNING"] });
const riri = card({ title: "미국 광고 RERE", category: "ADVERTISING · ATTACHED REEL", tags: ["4K"] });
const koshaCms = card({ title: "KOSHA 안전 캠페인", category: "ADVERTISING", tags: ["MOTION"] });

for (const other of [brand, sell, riri]) {
  assert.equal(chipMatchesCmsWork("KOSHA", other), false, `${other.title} 이 KOSHA 칩에 남았습니다`);
}
assert.equal(chipMatchesCmsWork("KOSHA", koshaCms), true, "KOSHA 작품이 걸러졌습니다");

// ③ 프로젝트 이름은 제목·태그 어디에 있어도 찾는다(띄어쓰기·기호 무시)
assert.equal(chipMatchesCmsWork("성남시", card({ title: "성남시 청년 정책 홍보" })), true);
assert.equal(chipMatchesCmsWork("스캔팡", card({ title: "ScanPang 스캔팡 브랜드 필름" })), true);
assert.equal(chipMatchesCmsWork("XCONDA", card({ title: "브랜드 필름", tags: ["XCONDA"] })), true);
assert.equal(chipMatchesCmsWork("KOSHA", card({ title: "koshi 안전" })), false, "부분 문자열 오탐이 있습니다");

// ④ 칩을 고르지 않았으면(전체) 모두 보인다 — 작품이 사라지지 않는다.
assert.equal(chipMatchesCmsWork("", brand), true);
assert.equal(chipMatchesCmsWork("__all__".replace("__all__", ""), sell), true);

// ⑤ 어느 프로젝트에도 없는 칩('기타')에는 어드민 작품이 붙지 않는다.
assert.equal(chipMatchesCmsWork("기타", brand), false);

// ⑥ AI 배지
assert.equal(isAiWork(card({ title: "지메틱 AI 브랜드 필름", category: "BRAND FILM", tags: ["PLANNING"] })), true);
assert.equal(isAiWork(card({ title: "브랜드 필름", category: "BRAND FILM", tags: ["AI GENERATION"] })), true);
assert.equal(isAiWork(card({ title: "XCONDA Candy Commercial", category: "ADVERTISING", tags: [] })), true);
assert.equal(isAiWork(card({ title: "셀렉스 릴렉스 샷 윤가이편", category: "ADVERTISING", tags: ["PLANNING", "DIRECTING"] })), false);
assert.equal(isAiWork(card({ title: "빈센트 의원 인터뷰", category: "YOUTUBE", tags: ["EDITING"] })), false);

console.log("[portfolio chips] 통과 — KOSHA 칩에 다른 작품이 섞이지 않습니다");
