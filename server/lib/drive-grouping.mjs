// 드라이브 폴더·파일 이름을 "화면에 보여줄 분류"로 바꾸는 순수 함수 모음.
//
// 왜 필요한가
//   Drive API 는 영상 이름만 평면 목록으로 준다. 그대로 그리면 96편이 한 줄로 늘어서
//   "중복이 많고 영상을 못 찾는" 화면이 된다(2026-10-28 대표님 지적).
//   → 폴더 구조를 공개용 카테고리/섹션으로 바꾸고, 이름에서 언어·자막·버전·산출물 종류를 뽑아
//     같은 작품의 변형을 한 장으로 묶는다.
//
// 여기서 만드는 값은 모두 공개 가능한 정보다.
//   · 폴더 ID·폴더 경로·원본 폴더 이름은 내보내지 않는다(카테고리 slug/label 만).
//   · 파일 이름은 이미 공개 목록에 포함되어 있으므로 제목·검색어를 여기서 파생시켜도 안전하다.

/** 최상위 폴더 이름 → 공개 카테고리. 이름 자체는 응답에 나가지 않는다. */
const ROOT_FOLDERS = [
  { test: /^01[_-]?commercial/i, category: "commercial", label: "광고", order: 10 },
  { test: /^02[_-]?guide/i, category: "guide", label: "가이드", order: 40 },
  { test: /^03[_-]?demo/i, category: "demo", label: "데모 · 쇼릴", order: 30 },
  { test: /^04[_-]?tv/i, category: "tv", label: "TV", order: 20 },
  { test: /^05[_-]?web[_-]?drama/i, category: "webdrama", label: "웹드라마", order: 21 },
];

/** 보관·중복 폴더는 공개 목록에서 통째로 뺀다(규칙 문서: "납품/공유 대상 아님"). */
const ARCHIVE_FOLDER = /^_?(archive|보관|중복|test)/i;

const COMMERCIAL_SECTIONS = [
  { test: /^kosha$/i, label: "KOSHA" },
  { test: /^xconda$/i, label: "XCONDA" },
  { test: /^seongnam/i, label: "성남시" },
  { test: /^scanpang$/i, label: "스캔팡" },
  { test: /^jeju/i, label: "제주공모" },
];

const GUIDE_SECTIONS = [
  { test: /^ko$/i, label: "한국어" },
  { test: /^en$/i, label: "영어" },
  { test: /^ja$/i, label: "일본어" },
];

const AUDIO = { KO: "한국어", EN: "영어", JA: "일본어" };
/** 규칙 위반 표기(ENGsub/KORsub …)도 자막으로 인식해 변형 배지에 쓴다. */
const LEGACY_SUBTITLE = { ENGSUB: "EN", KORSUB: "KO", JPNSUB: "JA", JPsub: "JA", KRsub: "KO" };
const SUBTITLE = { KOSUB: "KO", ENSUB: "EN", JASUB: "JA" };
const OUTPUT = {
  trailer: "트레일러",
  teaser: "티저",
  pilot: "파일럿",
  pilottest: "파일럿",
  showreel: "쇼릴",
  making: "메이킹",
};
const DELIVERY = "납품본";
const QUALITY = /^(4k|8k|1080p|2160p|hd|vertical|shorts|verticalshorts|diplate|digude)$/i;
/** 품질 토큰도 사람이 읽는 표기로 바꾼다(대문자 원문 노출 금지). */
const QUALITY_LABEL = {
  "4K": "4K",
  "8K": "8K",
  "1080P": "1080p",
  "2160P": "2160p",
  HD: "HD",
  VERTICAL: "세로",
  SHORTS: "숏폼",
  VERTICALSHORTS: "세로 숏폼",
  DIPLATE: "DI 플레이트",
  DIGUDE: "DI 가이드",
};

/** 검색용 한글 별칭 — 파일 이름이 영어라 "구미호" 같은 검색이 안 되던 문제를 없앤다. */
const ALIASES = {
  hometownoflegends: "전설의 고향",
  ninetailedfox: "구미호",
  chunhyangdan: "천향단",
  toyfarm: "토이팜",
  coldsite: "콜드사이트",
  elinwonderland: "이엘 원더랜드",
  division0: "디비전 제로",
  girldetective: "소녀탐정",
  seedwar: "씨앗전쟁",
  povertyknowsnolaw: "가난은 죄가 없다",
  ramen: "라면",
  gugbob: "국밥",
  showreel: "쇼릴",
  monalisa: "모나리자",
  thescream: "절규",
  creationofadam: "아담의 창조",
  thegleaners: "이삭줍기",
  napoleoncrossingthealps: "알프스 넘는 나폴레옹",
  theconstructors: "건설자들",
  kimhongdo: "김홍도",
  rooftiling: "기와이기",
  thesmithy: "대장간",
  vangogh: "반 고흐",
  koreanwarspecial: "한국전쟁 특집",
  jejucontest: "제주 공모",
  scanpang: "스캔팡",
  seongnamcity: "성남시",
  xconda: "엑스콘다",
  kosha: "코샤",
  flexboard: "플렉스보드",
  seedancepromo: "시댄스 프로모",
  discount30: "30% 할인",
  candy: "캔디",
  toothpaste: "치약",
  countryside: "시골",
  champagne: "샴페인",
  terminator: "터미네이터",
  topgun: "탑건",
  ruralarea: "농촌",
  directorscut: "디렉터스 컷",
  naturedocumentary: "자연 다큐",
  storyboardpreview: "스토리보드 프리뷰",
  workcompilation: "작업 모음",
  officescenesummary: "사무실 장면 요약",
  blendertoanimation: "블렌더 애니메이션",
  lipsync: "립싱크",
  imagegenerator: "이미지 생성기",
  videogenerator: "영상 생성기",
  upscale: "업스케일",
  faceswap: "얼굴 교체",
  autoanglegenerator: "자동 앵글 생성",
  cinematicimageblender: "시네마틱 이미지 블렌더",
  expressiontransformer: "표정 변환",
  artdirectorpro: "아트 디렉터 프로",
  scenesnap: "장면 캡처",
  clothswap: "의상 교체",
  youtuberef: "유튜브 참조",
  spinangle: "회전 앵글",
  cinegradeai: "시네 그레이드",
  arrowview: "애로우 뷰",
  directorssequence: "디렉터스 시퀀스",
  promotion: "프로모션",
  promotional: "홍보",
  contest: "공모전",
  final: "최종",
  concept: "컨셉",
  verticalshorts: "세로 숏폼",
};

const clean = (value) => String(value ?? "").trim();
const lower = (value) => clean(value).toLowerCase();

/** 최상위 폴더 이름 → { category, label, order } (모르는 폴더는 기타) */
export function rootFolder(rawName) {
  const name = clean(rawName);
  if (ARCHIVE_FOLDER.test(name)) return { category: "", label: "", order: 9999, hidden: true };
  for (const entry of ROOT_FOLDERS) {
    if (entry.test.test(name)) return { category: entry.category, label: entry.label, order: entry.order };
  }
  return { category: "other", label: "기타", order: 90 };
}

/** 카테고리 안의 하위 폴더 이름 → 섹션 라벨 (없으면 빈 문자열) */
export function sectionLabel(category, rawName) {
  const name = clean(rawName);
  if (!name) return "";
  const table = category === "commercial" ? COMMERCIAL_SECTIONS : category === "guide" ? GUIDE_SECTIONS : [];
  for (const entry of table) {
    if (entry.test.test(name)) return entry.label;
  }
  // 광고의 프로젝트 폴더는 이름 자체가 프로젝트명이라 그대로 쓴다(Kosha/XCONDA …).
  if (category === "commercial") return humanize(name);
  return "";
}

/** CamelCase·숫자 경계를 띄어 쓴 사람용 제목 */
export function humanize(rawName) {
  const text = clean(rawName).replace(/\.(mp4|m4v|mov|webm|avi|mkv)$/i, "");
  const words = [];
  // "FlexBoard2.0" 같은 버전 표기의 소수점은 살린다(2 0 으로 쪼개지지 않게).
  for (const token of text.replace(/(\d)\.(\d)/g, "$1\u0000$2").split(/[_\-.]+/)) {
    if (!token) continue;
    const parts = token
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .replace(/([A-Za-z])(\d)/g, "$1 $2")
      .replace(/(\d)([A-Za-z])/g, "$1 $2")
      .split(/\s+/)
      .filter(Boolean);
    words.push(...parts);
  }
  const joined = words.join(" ").replace(/\u0000/g, ".").trim();
  return joined || text;
}

/** 파일 이름 → 분류 정보 */
export function describeName(rawName, { category = "", section = "" } = {}) {
  const fileName = clean(rawName) || "video.mp4";
  const stem = fileName.replace(/\.(mp4|m4v|mov|webm|avi|mkv)$/i, "");
  const tokens = stem.split("_").filter(Boolean);

  const language = [];
  const subtitles = [];
  const outputs = [];
  const qualities = [];
  const dates = [];
  const groupTokens = [];
  const episodeTokens = [];
  let version = 0;
  let episode = 0;
  let seriesCut = -1;
  let delivery = false;

  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (AUDIO[upper]) {
      if (!language.includes(AUDIO[upper])) language.push(AUDIO[upper]);
      continue;
    }
    if (SUBTITLE[upper] || LEGACY_SUBTITLE[token] || LEGACY_SUBTITLE[upper]) {
      const code = SUBTITLE[upper] || LEGACY_SUBTITLE[token] || LEGACY_SUBTITLE[upper];
      const label = `${code} 자막`;
      if (!subtitles.includes(label)) subtitles.push(label);
      continue;
    }
    if (/^v\d+$/i.test(token)) {
      version = Math.max(version, Number(token.slice(1)) || 0);
      continue;
    }
    if (/^part\d+$/i.test(token)) {
      episode = Number(token.slice(4)) || 0;
      seriesCut = groupTokens.length;
      continue;
    }
    if (/^delivery$/i.test(token)) {
      delivery = true;
      continue;
    }
    if (OUTPUT[lower(token)]) {
      outputs.push(OUTPUT[lower(token)]);
      continue;
    }
    if (/^\d{6}(\d{2})?$/.test(token) || /^(19|20)\d{2}(0[1-9]|1[0-2])$/.test(token)) {
      dates.push(token);
      continue;
    }
    if (QUALITY.test(token)) {
      const quality = QUALITY_LABEL[token.toUpperCase()] || token.toUpperCase();
      if (!qualities.includes(quality)) qualities.push(quality);
      continue;
    }
    if (seriesCut >= 0) episodeTokens.push(token);
    else groupTokens.push(token);
  }

  // 시리즈(PartN)는 같은 시리즈로 묶고, 에피소드별 이름은 변형(에피소드) 쪽에 남긴다.
  const seriesBase = episode > 0 ? groupTokens.join("_") : "";
  const groupTokensKey = seriesBase || groupTokens.join("_") || stem;
  const group = `${category || "other"}:${groupTokensKey.toLowerCase()}`;

  const variantParts = [
    language.join(" · "),
    subtitles.join(" · "),
    outputs.join(" · "),
    delivery ? DELIVERY : "",
    version ? `v${version}` : "",
    episode ? `${episode}편${episodeTokens.length ? ` ${episodeTokens.join(" ")}` : ""}` : "",
    qualities.join(" · "),
  ].filter(Boolean);

  return {
    title: humanize(groupTokensKey),
    group,
    variant: variantParts.join(" / ") || "기본",
    language,
    subtitles,
    outputs,
    delivery,
    version,
    episode,
    dates,
    qualities,
    category,
    section,
    search: buildSearch(stem, [...groupTokens, ...episodeTokens], { category, section, language, subtitles, outputs, delivery, version, qualities }),
  };
}

function buildSearch(stem, groupTokens, meta) {
  const words = new Set([stem, ...groupTokens, ...(meta.section ? [meta.section] : [])]);
  for (const token of groupTokens) {
    const alias = ALIASES[lower(token)];
    if (alias) words.add(alias);
  }
  const whole = lower(stem);
  for (const [key, alias] of Object.entries(ALIASES)) {
    if (whole.includes(key)) words.add(alias);
  }
  for (const value of [...meta.language, ...meta.subtitles, ...meta.outputs, ...meta.qualities]) words.add(value);
  if (meta.delivery) words.add(DELIVERY);
  if (meta.version) words.add(`v${meta.version}`);
  return [...words].join(" ").toLowerCase();
}

/** 목록에 넣을 최종 레코드 — 서버가 이 형태 그대로 응답한다. */
export function describeVideo(file, { category, categoryLabel, section }) {
  const info = describeName(file.name, { category, section });
  const width = Number(file.width) > 0 ? Math.round(Number(file.width)) : 0;
  const height = Number(file.height) > 0 ? Math.round(Number(file.height)) : 0;
  const durationMs = Number(file.durationMs) > 0 ? Math.round(Number(file.durationMs)) : 0;
  return {
    id: file.id,
    name: file.name,
    ...(file.resourceKey ? { resourceKey: file.resourceKey } : {}),
    category,
    categoryLabel,
    section: section || "",
    group: info.group,
    title: info.title,
    variant: info.variant,
    version: info.version,
    episode: info.episode,
    width,
    height,
    durationMs,
    aspect: height > width ? "portrait" : "landscape",
    search: info.search,
  };
}

export const CATEGORY_ORDER = ROOT_FOLDERS.map((entry) => entry.category);
export const CATEGORY_LABELS = Object.fromEntries(ROOT_FOLDERS.map((entry) => [entry.category, entry.label]));
