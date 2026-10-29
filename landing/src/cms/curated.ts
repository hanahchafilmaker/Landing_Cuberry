// 대표님이 직접 준 썸네일 — 카드에 이 사진을 우선 사용한다.
//
// 왜 필요한가 (2026-10-29 대표님 지적: "내가 썸네일 줬잖아")
//   〈DIVISION 0〉·〈목구멍〉은 영상 첫 장면이 검어서 Google Drive 가 만들어 주는 썸네일이
//   거의 새까맣다. 판정해서 브랜드 카드로 바꾸는 방식은 "작품을 알아볼 수 없는 카드"라서
//   대표님이 직접 캡처한 장면을 받아 그대로 쓴다.
//
// 규칙
//   · 제목(또는 검색어)에 아래 match 가 걸리면 이 사진을 쓴다. Drive·어드민 작품 모두 적용된다.
//   · 한 번 걸리면 검은 썸네일 판정을 건너뛴다(좋은 사진이 있으니 브랜드 카드로 덮지 않는다).
//   · 사진은 images/curated/ 에 두고, 촬영·캡처 원본을 그대로 넣는다(과도한 보정 금지).
//
// 새 작품 썸네일을 받으면: images/curated/ 에 파일을 넣고 아래에 한 줄 추가하면 끝이다.

export type CuratedThumbnail = {
  /** 사이트 안 경로 — 배포 루트 기준 */
  src: string;
  /** 이 작품을 알아보는 규칙 (제목·검색어에 적용) */
  match: RegExp;
  /** 어떤 작품인지 사람이 읽기 위한 이름 */
  label: string;
};

export const curatedThumbnails: CuratedThumbnail[] = [
  {
    label: "DIVISION 0",
    // DIVISION0 · DIVISION 0 · Division_Zero · 디비전 0
    match: /division[\s_-]*0|division[\s_-]*zero|디비전\s*0/i,
    src: "images/curated/work-division-zero.jpg",
  },
  {
    label: "목구멍",
    // 목구멍 · Poverty Knows No Law (영문 유통 제목)
    match: /목구멍|poverty\s*knows\s*no\s*law/i,
    src: "images/curated/work-mokgumeong.jpg",
  },
];

/** 카드 제목·검색어에 맞는 대표 썸네일. 없으면 null. */
export function curatedThumbnail(...texts: Array<string | undefined>): string | null {
  const haystack = texts.filter(Boolean).join(" ");
  if (!haystack) return null;
  return curatedThumbnails.find((entry) => entry.match.test(haystack))?.src ?? null;
}
