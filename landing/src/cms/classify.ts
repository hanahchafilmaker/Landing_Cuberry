// 포트폴리오 3분류 — 작품중심 · 광고 · 기타
//
// 2026-10-29 대표님 지시: "전체 대신에 작품중심과 광고 기타 세 개로 나누어서
// 포트폴리오 올려주세요. 작품중심 진입점이 있는지도 몰랐어요."
//   · "전체" 탭을 없애고 세 갈래로 나눈다.
//   · 드라이브(폴더 분류)와 어드민 등록 작품(카테고리 문자열)이 같은 규칙을 쓴다.
//   · 어느 갈래에도 확실히 넣을 수 없는 작업은 **기타**로 보낸다(사라지는 작품이 없도록).
import type { PortfolioCard } from "./map";
import type { DriveFilm } from "./drive";

export type PortfolioTab = "creative" | "ad" | "other";

/** 화면에 보이는 순서 — 작품중심이 기본 진입점이다. */
export const PORTFOLIO_TABS: PortfolioTab[] = ["creative", "ad", "other"];

/** 광고 계열 — 커머셜·브랜드 필름·광고 */
const AD_CATEGORY = /(advertis|brand|commercial|광고|브랜드|커머)/i;
/** 작품 계열 — 드라마·방송·애니메이션 시리즈 */
const CREATIVE_CATEGORY = /(animation|drama|series|kbs|broadcast|웹툰|드라마|방송|애니|시리즈)/i;

/** 어드민 작품의 카테고리 문자열 → 탭 */
export function tabForCategory(category: string): PortfolioTab {
  const value = String(category || "");
  if (AD_CATEGORY.test(value)) return "ad";
  if (CREATIVE_CATEGORY.test(value)) return "creative";
  return "other";
}

/** 어드민 등록 작품 → 탭 */
export function tabForCmsWork(card: PortfolioCard): PortfolioTab {
  return tabForCategory(card.category || "");
}

/** 드라이브 영상(폴더 분류) → 탭. TV·웹드라마는 작품, 커머셜은 광고, 나머지는 기타. */
export function tabForDriveFilm(film: DriveFilm): PortfolioTab {
  if (film.categorySlug === "commercial") return "ad";
  if (film.categorySlug === "tv" || film.categorySlug === "webdrama") return "creative";
  return "other";
}

/** AI 로 만든 작업인지 — 카드에 AI 배지를 붙인다(제작 방식이 곧 우리의 강점이므로). */
export function isAiWork(card: PortfolioCard): boolean {
  const tags = card.tags.map((tag) => tag.toUpperCase());
  if (tags.some((tag) => tag === "AI" || tag.startsWith("AI ") || tag.includes("AI GENERATION") || tag.includes("AI ANIMATION"))) return true;
  return /(^|\s)AI(\s|$)/.test(`${card.category} ${card.title}`.toUpperCase()) || /XCONDA/i.test(card.title);
}

/** 칩 이름을 비교용으로 정규화한다 — 띄어쓰기·가운뎃점·기호를 무시한다. */
function normalizeChip(value: string): string {
  return String(value || "").toLowerCase().replace(/[\s·._-]+/g, "");
}

/**
 * 고른 칩(프로젝트·장르)에 어드민 작품이 속하는지.
 *
 * 2026-10-29 대표님 지적 "왜 kosha에 다른 영상이 섞여있지"
 *   칩 필터가 드라이브 영상에만 걸려서, 어드민에 올린 작품(브랜드 필름 등)은
 *   KOSHA 칩을 골라도 그대로 남아 섞여 보였다. 이제 칩을 고르면 어드민 작품도
 *   그 프로젝트에 속한 것만 남고 나머지는 숨긴다(제목·카테고리·태그에서 찾는다).
 *   → 어디에도 속하지 않는 작품은 '전체' 칩에서만 보인다(사라지지는 않는다).
 */
export function chipMatchesCmsWork(chip: string, card: PortfolioCard): boolean {
  const target = normalizeChip(chip);
  if (!target) return true;
  const haystack = normalizeChip(`${card.title} ${card.category} ${card.tags.join(" ")}`);
  return haystack.includes(target);
}
