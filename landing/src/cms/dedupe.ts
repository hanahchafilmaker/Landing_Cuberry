// 같은 작품이 두 장으로 보이지 않게 합친다.
//
// 2026-10-29 대표님 지적: "동일한 작품 1개만 노출"
//   어드민에 손으로 올린 작품(예: 〈전설의 고향-구미호〉)과 드라이브에서 자동으로 올라온
//   같은 작품(TV Hometown Of Legends Nine Tailed Fox)이 카드 두 장으로 나왔다.
//   드라이브 폴더가 정본이므로 **드라이브 카드 한 장만 남기고**, 어드민에 적어 둔
//   제목·소개·태그는 그 카드로 옮겨 정보를 잃지 않는다.
//
// 판단 규칙
//   ① 영문 제목끼리는 뜻이 있는 단어가 2개 이상 겹치면 같은 작품으로 본다.
//   ② 국문 제목과 영문 파일명은 글자가 겹치지 않으므로, 알려진 짝을 ALIASES 에 적어 둔다.
//      (드라이브 작품이 늘어나면 여기에 한 줄씩 추가하면 된다)
import type { PortfolioCard } from "./map";
import type { DriveFilm } from "./drive";

/** 국문 제목(어드민) ↔ 영문 파일명(드라이브)이 같은 작품인 경우 */
const ALIASES: Array<{ cms: RegExp; drive: RegExp }> = [
  // 〈전설의 고향-구미호〉 KBS1 방영 · REBOOT  ==  TV Hometown Of Legends Gumiho / Nine Tailed Fox
  { cms: /구미호|전설의\s*고향/, drive: /hometown\s*of\s*legends|nine\s*tailed|gumiho/i },
  // 〈한국전쟁 이동외상센터〉 KBS 6.25 특집  ==  TV Korean War Mobile Trauma Center KBS
  { cms: /이동\s*외상\s*센터|이동\s*외과\s*병원/, drive: /mobile\s*trauma\s*center/i },
  // 〈목구령 경찰국〉  ==  Web Drama Mokguryeong Police Bureau
  { cms: /목구령\s*경찰국/, drive: /mokguryeong\s*police\s*bureau/i },
  // 〈천년의 사랑〉  ==  XCONDA Thousand Years Of Love Music Video Drama
  { cms: /천년의\s*사랑/, drive: /thousand\s*years\s*of\s*love/i },
  // 〈콜드사이트〉  ==  Web Drama Cold Site
  { cms: /콜드\s*사이트/, drive: /cold\s*site/i },
  // 〈이상한 나라의 이엘 / 이엘 원더랜드〉  ==  Web Drama EL in Wonderland
  { cms: /이상한\s*나라의\s*이엘|이엘\s*원더랜드/, drive: /el\s*in\s*wonderland|elinwonderland/i },
  // 〈디비전 0 / 디비전 제로〉  ==  Web Drama DIVISION 0
  { cms: /디비전\s*(?:0|제로)/, drive: /division[\s_-]*(?:0|zero)/i },
  // 〈목구멍〉  ==  Web Drama Poverty Knows No Law
  { cms: /목구멍|가난은\s*죄가\s*없다/, drive: /poverty\s*knows\s*no\s*law/i },
  // 〈토이팜〉  ==  Web Drama Toy Farm
  { cms: /토이\s*팜/, drive: /toy\s*farm/i },
];

/** 뜻이 없어 겹쳐도 같은 작품으로 보면 안 되는 단어 */
const STOP = new Set([
  "tv", "web", "drama", "series", "the", "of", "and", "for", "with", "ko", "kor", "en", "eng",
  "mp4", "mov", "final", "promo", "promotional", "commercial", "ver", "version", "cut", "main",
]);

function tokens(title: string): string[] {
  return String(title || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .split(" ")
    .map((token) => token.replace(/^v\d+$/, ""))
    .filter((token) => token.length >= 2 && !STOP.has(token));
}

/** 어드민 작품과 드라이브 영상이 같은 작품인가 */
export function isSameWork(card: PortfolioCard, film: DriveFilm): boolean {
  const title = `${card.title} ${card.tags.join(" ")}`.normalize("NFC");
  const target = `${film.title} ${film.searchText}`.normalize("NFC");
  if (ALIASES.some((pair) => pair.cms.test(title) && pair.drive.test(target))) return true;

  const mine = new Set(tokens(card.title));
  if (mine.size < 2) return false;
  const shared = tokens(film.title).filter((token) => mine.has(token));
  return shared.length >= 2;
}

export type UnifiedPortfolio = { works: PortfolioCard[]; films: DriveFilm[] };

/**
 * 어드민 작품 중 드라이브에 같은 작품이 있는 카드를 걷어내고,
 * 그 카드의 제목·소개·태그를 드라이브 카드로 옮긴다.
 */
export function mergeDuplicateWorks(works: PortfolioCard[], films: DriveFilm[]): UnifiedPortfolio {
  if (!works.length || !films.length) return { works, films };

  const duplicate = new Map<string, PortfolioCard>();
  const kept: PortfolioCard[] = [];
  for (const card of works) {
    const hit = films.find((film) => isSameWork(card, film));
    if (!hit) {
      kept.push(card);
      continue;
    }
    // 같은 영상에 어드민 카드가 여러 장 걸려도 드라이브 카드는 한 장만 남긴다(첫 카드 정보 사용).
    if (!duplicate.has(hit.key)) duplicate.set(hit.key, card);
  }
  if (!duplicate.size) return { works, films };

  const merged = films.map((film) => {
    const card = duplicate.get(film.key);
    if (!card) return film;
    return {
      ...film,
      // 어드민에 적어 둔 국문 제목이 더 읽기 좋으므로 그대로 쓰고, 검색어에는 둘 다 넣는다.
      title: card.title || film.title,
      description: card.description || film.description,
      tags: card.tags.length ? card.tags : film.tags,
      year: film.year || card.year,
      searchText: `${film.searchText} ${card.title} ${card.category} ${card.tags.join(" ")}`.toLowerCase(),
    };
  });
  return { works: kept, films: merged };
}
