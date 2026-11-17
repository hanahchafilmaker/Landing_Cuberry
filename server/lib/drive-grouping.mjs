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

/**
 * 최상위 폴더 이름 → 공개 카테고리. 이름 자체는 응답에 나가지 않는다.
 * "01_Commercial", "1.Commercial", "Commercial_2026", "커머셜" 처럼 앞 번호·구분자가
 * 조금씩 달라도 같은 폴더로 알아본다(이름이 조금 다르다고 폴더가 통째로 사라지면 안 된다).
 */
const ROOT_FOLDERS = [
  { test: /^(commercial|commerce|advert\w*|ads?|광고|커머셜|커머|상업)/, category: "commercial", label: "광고", order: 10 },
  { test: /^(guide|guides|tutorial\w*|가이드|튜토리얼|설명서)/, category: "guide", label: "가이드", order: 40 },
  { test: /^(demo|demos|showreel|show\s*reel|쇼릴|데모)/, category: "demo", label: "데모 · 쇼릴", order: 30 },
  { test: /^(tv|broadcast|방송|티비)/, category: "tv", label: "TV", order: 20 },
  { test: /^(web[\s_-]*drama|drama|웹드라마|드라마|웹)/, category: "webdrama", label: "웹드라마", order: 21 },
];

/** "01_Commercial" → "commercial" 처럼 앞 번호·기호를 걷어낸 비교용 이름 */
function folderKey(rawName) {
  return clean(rawName)
    .replace(/\.(mp4|m4v|mov|webm|avi|mkv)$/i, "")
    .replace(/^[\s\d]+[._\-)\]]*\s*/, "")
    .replace(/[\s._-]+/g, "")
    .toLowerCase();
}

/** 보관·중복 폴더는 공개 목록에서 통째로 뺀다(규칙 문서: "납품/공유 대상 아님"). */
const ARCHIVE_FOLDER = /^_?(archive|보관|중복|test)/i;

/**
 * 사이트에 올릴 카테고리 — 광고(커머셜)·TV·웹드라마만 노출한다(2026-10-28 대표님 지시).
 * 가이드·데모/쇼릴은 폴더째로 조회하지 않는다(하위 폴더도 내려가지 않음).
 */
export const PUBLIC_CATEGORIES = new Set(["commercial", "tv", "webdrama"]);

/** 공개하지 않기로 한 작품 — 파일 이름 기준으로 걸러 낸다. */
const HIDDEN_WORKS = [/seed\s*-?\s*war/i, /씨앗\s*전쟁/];

/** 이 파일을 목록에 올리지 않아야 하는가 */
export function isHiddenWork(rawName) {
  const name = clean(rawName);
  return HIDDEN_WORKS.some((pattern) => pattern.test(name));
}

/**
 * 광고 카테고리 안의 중간 묶음 폴더(예: External_Commercial) — 프로젝트명이 아니므로
 * 칩으로 쓰지 않고 한 단계 안쪽 폴더(Kosha·ScanPang·SeongnamCity)에서 섹션을 잡는다.
 */
const COMMERCIAL_GROUP_FOLDER = /^(?:external|internal|client|outbound|외부|내부)(?:[\s._-]*(?:commercial|commerce|advert\w*|ads?|광고|커머셜|상업))?$/i;

const COMMERCIAL_SECTIONS = [
  { test: /^kosha(?:[\s._-]*(?:commercial|ads?|광고|커머셜))?$/i, label: "KOSHA" },
  { test: /^xconda(?:[\s._-]*(?:commercial|ads?|광고|커머셜))?$/i, label: "XCONDA" },
  { test: /^seongnam/i, label: "성남시" },
  { test: /^scanpang(?:[\s._-]*(?:commercial|ads?|광고|커머셜))?$/i, label: "스캔팡" },
  { test: /^jeju/i, label: "제주공모" },
  { test: /^(?:a[\s._-]*)?thousand[\s._-]*years[\s._-]*of[\s._-]*love|천년의\s*사랑/i, label: "천년의 사랑" },
];

const GUIDE_SECTIONS = [
  { test: /^ko$/i, label: "한국어" },
  { test: /^en$/i, label: "영어" },
  { test: /^ja$/i, label: "일본어" },
];

/**
 * 파일명 규칙을 어기고 국문 제목으로 올라온 중복본(예: 콜드사이트_EP01-001.mp4)을
 * 정본 영문 작품 그룹으로 맞춘다. 정본 파일이 함께 있으면 dedupeVideos 가 중복본을 걷어낸다.
 */
const KOREAN_WORK_GROUPS = [
  { category: "webdrama", test: /^콜드\s*사이트$/, canonical: "WebDrama_ColdSite" },
  { category: "webdrama", test: /^목구령\s*경찰국$/, canonical: "WebDrama_MokguryeongPoliceBureau" },
  { category: "webdrama", test: /^(?:이엘\s*원더랜드|이상한\s*나라의\s*이엘)$/, canonical: "WebDrama_ELinWonderland" },
  { category: "webdrama", test: /^디비전\s*(?:0|제로)$/, canonical: "WebDrama_DIVISION0" },
  { category: "webdrama", test: /^(?:목구멍|가난은\s*죄가\s*없다)$/, canonical: "WebDrama_PovertyKnowsNoLaw" },
  { category: "webdrama", test: /^토이\s*팜$/, canonical: "WebDrama_ToyFarm" },
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
  highlight: "하이라이트",
  highlights: "하이라이트",
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
  gumiho: "구미호",
  chunhyangdan: "천향단",
  toyfarm: "토이팜",
  coldsite: "콜드사이트 콜드 사이트",
  elinwonderland: "이엘 원더랜드 이상한 나라의 이엘",
  mokguryeongpolicebureau: "목구령 경찰국 목구령경찰국",
  mokguryeong: "목구령",
  division0: "디비전 제로 디비전0 디비전 0",
  girldetective: "소녀탐정",
  seorok: "서록",
  seedwar: "씨앗전쟁",
  povertyknowsnolaw: "목구멍 가난은 죄가 없다",
  fairytalesforahappyworld: "tv동화 행복한 세상",
  ramen: "라면",
  gugbob: "국밥",
  showreel: "쇼릴",
  monalisa: "모나리자",
  thescream: "절규",
  creationofadam: "아담의 창조",
  thegleaners: "이삭줍기",
  napoleoncrossingthealps: "알프스 넘는 나폴레옹",
  theconstructors: "건설자들",
  girlwithapearlearring: "진주 귀걸이를 한 소녀 진주귀걸이",
  kimhongdo: "김홍도",
  rooftiling: "기와이기",
  thesmithy: "대장간",
  vangogh: "반 고흐",
  koreanwarspecial: "한국전쟁 특집",
  koreanwarmobiletraumacenter: "한국전쟁 이동외상센터 이동외과병원",
  mobiletraumacenter: "이동외상센터 이동외과병원",
  thousandyearsoflove: "천년의 사랑 천년의사랑",
  musicvideodrama: "뮤직비디오 드라마",
  fashionad: "패션 광고",
  brandfilm: "브랜드 필름 브랜드필름",
  shortscommercial: "숏폼 광고",
  jejucontest: "제주 공모",
  scanpang: "스캔팡",
  seongnamcity: "성남시",
  researchinstitute: "연구원 성남시정연구원",
  elevator: "엘리베이터",
  xconda: "엑스콘다",
  kosha: "코샤",
  flexboard: "플렉스보드",
  blockingboard: "블로킹보드 블로킹 보드",
  turn: "턴",
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
  highlight: "하이라이트",
  promotion: "프로모션",
  promotional: "홍보",
  contest: "공모전",
  final: "최종",
  concept: "컨셉",
  verticalshorts: "세로 숏폼",
};

/** macOS 에서 올라온 자모 분리(NFD) 한글 파일명도 같은 글자로 읽히게 NFC 로 정규화한다. */
const clean = (value) => String(value ?? "").normalize("NFC").trim();
const lower = (value) => clean(value).toLowerCase();

/** 최상위 폴더 이름 → { category, label, order } (모르는 폴더는 기타) */
export function rootFolder(rawName) {
  const name = clean(rawName);
  if (ARCHIVE_FOLDER.test(name)) return { category: "", label: "", order: 9999, hidden: true };
  const key = folderKey(name);
  for (const entry of ROOT_FOLDERS) {
    if (!entry.test.test(key)) continue;
    if (!PUBLIC_CATEGORIES.has(entry.category)) return { category: entry.category, label: entry.label, order: entry.order, hidden: true };
    return { category: entry.category, label: entry.label, order: entry.order };
  }
  // 분류를 모르는 폴더. 최상위에 바로 있으면 사이트에 올리지 않고,
  // 한 겹 감싸는 폴더(예: 최상위 → 작업 폴더 → 01_Commercial)면 안쪽을 다시 살펴본다.
  return { category: "other", label: "기타", order: 90, hidden: true, unknown: true };
}

/** 카테고리 안의 하위 폴더 이름 → 섹션 라벨 (없으면 빈 문자열) */
export function sectionLabel(category, rawName) {
  const name = clean(rawName);
  if (!name) return "";
  // 카테고리 폴더 자신(01_Commercial 등)이나 중간 묶음 폴더(External_Commercial 등)는 섹션이 아니다.
  if (category && rootFolder(name).category === category) return "";
  if (category === "commercial" && COMMERCIAL_GROUP_FOLDER.test(name)) return "";
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
  const text = clean(rawName)
    .replace(/\.(mp4|m4v|mov|webm|avi|mkv)$/i, "")
    .replace(/(^|_)ELin(?=[A-Z])/g, "$1EL_in_");
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
  let episodeUnit = "편";
  let seriesCut = -1;
  let delivery = false;
  let duplicate = false;

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
    if (/^(?:dup|copy)\d*$/i.test(token)) {
      duplicate = true;
      continue;
    }
    if (/^v\d+$/i.test(token)) {
      version = Math.max(version, Number(token.slice(1)) || 0);
      continue;
    }
    const epRange = /^(?:ep|episode)0*(\d+)(?:to|~)0*(\d+)$/i.exec(token);
    if (epRange) {
      const from = Number(epRange[1]) || 0;
      const to = Number(epRange[2]) || 0;
      if (from > 0 && to >= from) {
        const label = from === to ? `${from}화` : `합본 ${from}~${to}화`;
        if (!outputs.includes(label)) outputs.push(label);
        continue;
      }
    }
    const epMatch = /^(?:ep|episode)0*(\d+)(?:-(\d+))?$/i.exec(token);
    if (epMatch && Number(epMatch[1]) > 0) {
      episode = Number(epMatch[1]);
      episodeUnit = "화";
      seriesCut = groupTokens.length;
      if (epMatch[2]) duplicate = true;
      continue;
    }
    if (/^part0*\d+$/i.test(token) && Number(token.slice(4)) > 0) {
      episode = Number(token.slice(4));
      episodeUnit = "편";
      seriesCut = groupTokens.length;
      continue;
    }
    if (/^delivery$/i.test(token)) {
      delivery = true;
      continue;
    }
    if (OUTPUT[lower(token)]) {
      const label = OUTPUT[lower(token)];
      if (!outputs.includes(label)) outputs.push(label);
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

  // 시리즈(PartN · EP01)는 같은 시리즈로 묶고, 에피소드별 이름은 변형(에피소드) 쪽에 남긴다.
  const rawGroupKey = groupTokens.join("_") || stem;
  const koreanMatch = KOREAN_WORK_GROUPS.find(
    (entry) => (!entry.category || entry.category === category) && entry.test.test(rawGroupKey.replace(/_/g, " ")),
  );
  if (koreanMatch) duplicate = true;
  const groupTokensKey = koreanMatch ? koreanMatch.canonical : rawGroupKey;
  const group = `${category || "other"}:${groupTokensKey.toLowerCase()}`;

  const episodeLabel = episode
    ? `${episode}${episodeUnit}${episodeTokens.length ? ` ${episodeTokens.join(" ")}` : ""}`
    : "";
  const variantParts = [
    language.join(" · "),
    subtitles.join(" · "),
    outputs.join(" · "),
    delivery ? DELIVERY : "",
    episodeLabel,
    version ? `v${version}` : "",
    qualities.join(" · "),
  ].filter(Boolean);

  const searchTokens = koreanMatch
    ? [...groupTokens, ...koreanMatch.canonical.split("_"), ...episodeTokens]
    : [...groupTokens, ...episodeTokens];

  return {
    title: humanize(groupTokensKey),
    group,
    variant: variantParts.join(" / ") || "기본",
    language,
    subtitles,
    outputs,
    delivery,
    duplicate,
    version,
    episode,
    dates,
    qualities,
    category,
    section,
    search: buildSearch(stem, searchTokens, { category, section, language, subtitles, outputs, delivery, version, qualities, episodeLabel }),
  };
}

function buildSearch(stem, groupTokens, meta) {
  const words = new Set([stem, ...groupTokens, ...(meta.section ? [meta.section] : [])]);
  for (const token of groupTokens) {
    const alias = ALIASES[lower(token)];
    if (alias) words.add(alias);
  }
  const whole = [stem, ...groupTokens].map(lower).join(" ");
  for (const [key, alias] of Object.entries(ALIASES)) {
    if (whole.includes(key)) words.add(alias);
  }
  for (const value of [...meta.language, ...meta.subtitles, ...meta.outputs, ...meta.qualities]) words.add(value);
  if (meta.episodeLabel) words.add(meta.episodeLabel);
  if (meta.delivery) words.add(DELIVERY);
  if (meta.version) words.add(`v${meta.version}`);
  return [...words].join(" ").toLowerCase();
}

/**
 * 정본 파일과 함께 올라온 중복 업로드본(콜드사이트_EP01-001.mp4 · *_dup.mp4 등)을 걷어낸다.
 * 같은 작품·같은 회차·같은 산출물/언어/자막/화질에 정본이 있을 때만 빼므로,
 * 중복본만 단독으로 있는 작품이 사라지지는 않는다.
 */
export function dedupeVideos(videos) {
  const signatureOf = (video) => {
    const info = describeName(video.name, { category: video.category, section: video.section });
    const key = [
      info.group,
      info.episode,
      info.episode ? "" : info.outputs.join(","),
      info.language.join(","),
      info.subtitles.join(","),
      info.delivery ? "delivery" : "",
      info.qualities.join(","),
    ].join("|");
    return { key, duplicate: info.duplicate };
  };

  const annotated = videos.map((video) => ({ video, ...signatureOf(video) }));
  const hasCanonical = new Set(annotated.filter((item) => !item.duplicate).map((item) => item.key));
  const keptDuplicateKeys = new Set();
  const result = [];
  for (const item of annotated) {
    if (!item.duplicate) {
      result.push(item.video);
      continue;
    }
    if (hasCanonical.has(item.key) || keptDuplicateKeys.has(item.key)) continue;
    keptDuplicateKeys.add(item.key);
    result.push(item.video);
  }
  return result;
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
