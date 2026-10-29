// 같은 작품이 두 장으로 나오지 않는지 확인한다.
// 2026-10-29 대표님 지적: "동일한 작품 1개만 노출"
//   어드민에 올린 〈전설의 고향-구미호〉와 드라이브의 TV Hometown Of Legends 카드가 겹쳐 나왔다.
import assert from "node:assert/strict";
import { isSameWork, mergeDuplicateWorks } from "../landing/src/cms/dedupe.ts";

const film = (over) => ({
  key: `drive-${over.title || over.id}`,
  title: "",
  category: "",
  year: "",
  description: "",
  thumbnailUrl: "",
  tags: [],
  playable: true,
  driveVideo: true,
  categorySlug: "tv",
  categoryLabel: "TV",
  section: "",
  searchText: "",
  aspect: "landscape",
  durationMs: 0,
  badges: [],
  variants: [],
  ...over,
});

const card = (over) => ({
  key: `p-${over.title}`,
  title: "",
  category: "",
  year: "",
  description: "",
  thumbnailUrl: "",
  tags: [],
  playable: false,
  ...over,
});

// ① 국문 제목 ↔ 영문 파일명 — 알려진 짝은 합쳐진다.
const guMioh = card({
  title: "〈전설의 고향-구미호〉 KBS1 방영 · REBOOT",
  category: "AI ANIMATION SERIES",
  description: "KBS1 에서 방영된 작품입니다.",
  tags: ["KBS1 방영", "국내 최초 AI 활용"],
  year: "2026",
});
const guMiohFilm = film({ id: "abc", title: "TV Hometown Of Legends Nine Tailed Fox" });
assert.equal(isSameWork(guMioh, guMiohFilm), true, "구미호 짝을 못 찾았습니다");

// ② 영문 제목끼리는 뜻 있는 단어 2개 이상이 겹치면 합친다.
assert.equal(isSameWork(card({ title: "Seongnam City Promotional" }), film({ title: "Seongnam City Promotional" })), true);
// ③ 흔한 단어 하나만 겹치는 것은 남의 작품을 삼키지 않는다.
assert.equal(isSameWork(card({ title: "TV Drama Promotional" }), film({ title: "TV Commercial Promotional" })), false);
// ④ 전혀 다른 작품은 그대로 둔다.
assert.equal(isSameWork(card({ title: "현대건설 기업 홍보 영상" }), film({ title: "Kosha Van Gogh" })), false);

// ⑤ 합칠 때는 드라이브 카드 한 장만 남고, 어드민에 적은 정보가 옮겨진다.
{
  const works = [guMioh, card({ title: "현대건설 기업 홍보 영상", category: "CORPORATE VIDEO" })];
  const films = [guMiohFilm, film({ id: "kosha", title: "Kosha Van Gogh" })];
  const unified = mergeDuplicateWorks(works, films);
  assert.equal(unified.works.length, 1, "중복 카드가 남았습니다");
  assert.equal(unified.works[0].title, "현대건설 기업 홍보 영상");
  assert.equal(unified.films.length, 2, "드라이브 카드는 그대로여야 합니다");
  const merged = unified.films.find((item) => item.key === guMiohFilm.key);
  assert.equal(merged.title, guMioh.title, "국문 제목을 쓰지 않았습니다");
  assert.equal(merged.description, guMioh.description, "소개를 옮기지 않았습니다");
  assert.deepEqual(merged.tags, guMioh.tags, "태그를 옮기지 않았습니다");
  assert.equal(merged.year, "2026");
  assert.equal(merged.searchText.includes("구미호"), true, "검색어에 국문 제목이 빠졌습니다");
  // 원래 배열은 건드리지 않는다(React 상태 불변).
  assert.equal(works.length, 2);
  assert.equal(films[0].title, "TV Hometown Of Legends Nine Tailed Fox");
}

// ⑥ 겹치는 작품이 없으면 그대로 돌려준다(불필요한 복사 없음).
{
  const works = [card({ title: "유네코 기업 홍보 영상" })];
  const films = [film({ id: "a", title: "Kosha Van Gogh" })];
  const unified = mergeDuplicateWorks(works, films);
  assert.equal(unified.works, works);
  assert.equal(unified.films, films);
}

// ⑦ 한 드라이브 카드에 어드민 카드 두 장이 겹쳐도 카드는 한 장만 남는다.
{
  const works = [guMioh, card({ title: "전설의 고향 구미호" })];
  const unified = mergeDuplicateWorks(works, [guMiohFilm]);
  assert.equal(unified.works.length, 0);
  assert.equal(unified.films.length, 1);
}

console.log("[portfolio dedupe] 통과 — 어드민·드라이브 중복 카드가 한 장으로 합쳐집니다");
