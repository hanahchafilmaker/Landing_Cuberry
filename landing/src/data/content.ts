// ─────────────────────────────────────────────────────────────
// 큐브베리(CUBEBERRY) 랜딩 콘텐츠 기본값
// 2026-10-12 공유 디자인 "FLEXBOARD Design v2 · E · 회사소개 · 기록(동작)" 기준으로
// 히어로·숫자요약·섹터·연혁·특허·대표·문의 문구를 그 파일에서 그대로 옮겼습니다.
// (어드민 /api/public/content 값이 오면 히어로·상품·작품·팀·FAQ는 그 값이 우선합니다)
// ─────────────────────────────────────────────────────────────

// node 로 직접 읽는 테스트(test/team-profile.mjs)가 이 파일을 import 하므로 상대경로+확장자를 쓴다.
import { TABS } from "../tabs/config.ts";

export const settings = {
  brand: "CUBEBERRY",
  brandKo: "큐브베리",
  legalName: "주식회사 큐브베리",
  ceo: "이진서",
  bizNo: "480-88-03079",
  since: "2023.08",
  eyebrow: "REC · CUBEBERRY · SINCE 2023.08",
  heroTitle: "Imagine Speaks, AI Completes.",
  heroSubtitle:
    "방송 전문가들이 이끄는 AI 콘텐츠 기업입니다. 우리가 직접 쓰는 도구를 만들고, 그 도구로 지상파에 방영되는 작품을 만듭니다.",
  heroNote: "IR · 취재 · 제휴 문의",
  email: "ceo@cubeberry.ai",
  phone: "070-8095-2302",
};

// 상단 메뉴는 콘텐츠 탭 정의(tabs/config.ts)에서 그대로 가져온다.
// 메뉴와 탭 이름이 어긋나지 않게, 항목을 늘리거나 바꿀 때는 그 파일만 고치면 된다.
export const navLinks = TABS.map((tab) => ({ label: tab.label, href: tab.href }));

/** 히어로 오른쪽 3×2 스틸 격자 (디자인 E안의 6편) */
export const heroStills = [
  { src: "images/still-koreanwar.jpg", alt: "〈한국전쟁 이동외상센터〉 스틸" },
  { src: "images/still-coldsite.jpg", alt: "〈콜드사이트〉 스틸" },
  { src: "images/still-tvfairytale.jpg", alt: "〈TV동화 행복한 세상〉 리메이크 스틸" },
  { src: "images/still-divisionzero.jpg", alt: "〈디비전 제로〉 스틸" },
  { src: "images/still-el-land.jpg", alt: "〈이상한 나라의 이엘〉 스틸" },
  { src: "images/still-toypalm.jpg", alt: "〈토이팜〉 스틸" },
];

/** 숫자 요약 — 값·라벨·근거(각주)를 함께 둔다 */
export const stats = [
  {
    value: 4,
    suffix: " 건",
    label: "특허 등록 · 가출원 자료 1건 별도",
    note: "KIPO 특허증 기준",
  },
  {
    value: 3,
    suffix: " 편",
    label: "KBS 지상파 방영작",
    note: "2026 공사창립 대기획 〈성물〉 · 2025 6.25 특집, 어린이날 특집",
  },
  {
    value: 4,
    suffix: " 편",
    label: "KOCCA 콘텐츠랩 AI 웹드라마",
    note: "2026 · 현역 감독 4팀",
  },
  {
    value: 6,
    suffix: " 곳",
    label: "해외 업무협약 · 2026",
    note: "싱가포르 2 · 홍콩 1 · 중국 3",
  },
];

/** TWO SECTORS — 만드는 팀과, 만드는 도구 */
export const sectors = [
  {
    num: "01",
    kicker: "STUDIO",
    title: "큐브베리 스튜디오",
    desc: "기획부터 유통까지, 방영 가능한 완성도로 한 팀이 끝까지 만듭니다.",
    cta: "작품과 팀 보기 →",
    href: "#works",
    image: "images/sector-studio.jpg",
  },
  {
    num: "02",
    kicker: "PLATFORM",
    title: "XCONDA",
    desc: "컷이 바뀌어도 공간과 인물이 무너지지 않는 롱폼 AI 영상 플랫폼.",
    cta: "플랫폼 보기 →",
    href: "#lab",
    image: "images/sector-xconda.jpg",
  },
];

/** WHAT WE DO */
export const whatWeDo = [
  {
    num: "01",
    title: "방송",
    desc: "KBS 출신 PD와 지상파 전 채널 집필 작가진, 현업 드라마 감독이 기획과 서사를 맡습니다.",
  },
  {
    num: "02",
    title: "AI 기술 · XCONDA",
    desc: "컷이 바뀌어도 공간과 인물이 유지되는 롱폼 AI 영상 플랫폼을 직접 개발하고 운영합니다.",
  },
  {
    num: "03",
    title: "제작 스튜디오",
    desc: "기획부터 스토리, 생성, 편집, 후반, 유통까지 한 팀이 끝까지 책임집니다.",
  },
  {
    num: "04",
    title: "오리지널 IP",
    desc: "〈전설의 고향〉 REBOOT, 〈토이팜〉 등 자체 세계관을 시즌제와 다국어로 확장합니다.",
  },
];

/** FOUNDER & CEO */
export const founder = {
  image: "images/ceo-leejinseo.webp",
  name: "이진서",
  nameEn: "Lee Jin-seo",
  quote: "“방송 현장에서 28년간 지켜온 단 하나의 원칙은 결과물에 대한 무한 책임입니다.”",
  cite: "이진서 · 큐브베리 대표이사",
  bio: "前 KBS 드라마 PD(1995~2023). 큐브베리를 설립해 XCONDA AI 제작 파이프라인을 설계하고 콘텐츠 제작을 총괄합니다. 〈전설의 고향: 구미호〉를 연출했습니다.",
  facts: [
    { k: "협회", v: "한국AI콘텐츠크리에이터협회 부회장" },
    {
      k: "수상",
      v: "AI 미디어 융합기술 공모전 우수상(과기정통부·RAPA, 단체) · 경기도지사 표창",
    },
    { k: "특허", v: "등록 특허 발명자" },
  ],
};

/** HISTORY · 연혁 — 어드민 없이도 갱신되도록 파일에 두고, 최신 항목이 첫 줄(금색 점)이 됩니다. */
export type HistoryItem = { date: string; text: string };

export const history: HistoryItem[] = [
  { date: "2026.10", text: "특허 등록 · 온톨로지 제약 기반 시퀀스형 콘텐츠 생성 기법" },
  { date: "2026.09", text: "ACE Fair 2026에서 홍콩·중국 기업 4곳과 업무협약 체결" },
  {
    date: "2026.08",
    text: "특허 등록 · 물리 시뮬레이션 데이터 역산 기반 생성형 AI 콘텐츠 다중 검증·자동 보정 시스템",
  },
  {
    date: "2026.08",
    text: "싱가포르 Lights & Shadows, Codomo와 업무협약(MOU) 2건 체결 · Codomo 자체 IP 〈Potato Pirates〉 롱폼 애니메이션 제작 협력",
  },
  { date: "2026.05", text: "XCONDA 베타 서비스 출시" },
  { date: "2026.03", text: "KBS 공사창립 대기획 4부작 다큐멘터리 〈성물〉 AI 파트 제작·방영" },
  { date: "2026.03", text: "XCONDA MVP 출시" },
  { date: "2026.03", text: "한국콘텐츠진흥원 뉴미디어 신기술 콘텐츠랩 운영기관 선정" },
  { date: "2026.02", text: "특허 출원 · 온톨로지 제약 기반 시퀀스형 콘텐츠 생성 기법" },
  { date: "2025.06", text: "KBS 6.25 특집 다큐 〈한국전쟁 이동외상센터〉 AI 파트 제작·방영" },
  { date: "2025.05", text: "AI 애니메이션 〈전설의 고향-구미호〉 KBS1 어린이날 특집 방영" },
  { date: "2024.11", text: "벤처기업 인증" },
  { date: "2023.08", text: "주식회사 큐브베리 설립" },
];

/** PATENTS · 기술 · 특허. 이미지에는 원본 PDF의 첫 페이지만 사용하고 민감 정보를 가렸다. */
export type Patent = {
  state: "등록" | "가출원";
  date: string;
  dateLabel?: string;
  title: string;
  no: string;
  image: string;
};

export const patents: Patent[] = [
  {
    state: "등록",
    date: "2026.10.19",
    title: "온톨로지 제약 기반 위반 검증 및 상태 전이 전파를 이용한 시퀀스형 콘텐츠 생성 기법",
    no: "제10-3036790호",
    image: "images/patent-3036790.webp",
  },
  {
    state: "등록",
    date: "2026.08.06",
    title: "물리 시뮬레이션 데이터의 역산을 이용한 생성형 인공지능 콘텐츠의 다중 검증 및 자동 보정 시스템",
    no: "제10-3002930호",
    image: "images/patent-3002930.webp",
  },
  {
    state: "등록",
    date: "2025.01.06",
    title: "인공지능 기반 커플 매칭 시스템",
    no: "제10-2752198호",
    image: "images/patent-2752198.webp",
  },
  {
    state: "등록",
    date: "2017.06.29",
    title: "2D 영상 내 3D 요소 추출·삽입 기반 미디어 콘텐츠 제작 방법 및 시스템",
    no: "제10-1754524호",
    image: "images/patent-1754524.webp",
  },
  {
    state: "가출원",
    date: "2025.02.26",
    dateLabel: "서류 표기일",
    title: "인공지능을 활용한 동영상의 다자 립싱크 더빙 시스템 및 방법",
    no: "가출원서",
    image: "images/patent-provisional.webp",
  },
];

/** OFFICES */
export const offices = [
  { kicker: "본사 · 광주", address: "전남광주특별시 충장로 69-12, 2층" },
  { kicker: "지사 · 부천", address: "경기도 부천시 부천로198번길 18, 춘의테크노파크II" },
];

/** 푸터 메뉴 (E안: 회사소개 / 스튜디오 / 엑스콘다) */
export const footerGroups = [
  {
    title: "회사소개",
    href: "#top",
    lines: ["개요 · 리더십 · 연혁", "기술·특허 · 뉴스"],
  },
  {
    title: "스튜디오",
    href: "#works",
    lines: ["포트폴리오 · 제작 프로세스", "오리지널 IP · 팀 · 제작 대행"],
  },
  {
    title: "엑스콘다",
    href: "#lab",
    lines: ["TURN · 블로킹보드 · FLEXBOARD", "요금제 · 파트너 · 가이드"],
  },
];

export const b2bItems = [
  { num: "01", title: "월간 콘텐츠 운영", desc: "4~8편" },
  { num: "02", title: "브랜드 IP·웹드라마 개발", desc: "시리즈 기획·제작" },
  { num: "03", title: "기업 홍보·전시·세일즈 콘텐츠", desc: "맞춤 제작" },
  { num: "04", title: "NDA·세금계산서·전담 PM", desc: "안전한 계약" },
];

export const labChips = [
  {
    bad: "app switching / broken handoffs",
    good: "camera angles / one reference",
  },
  {
    bad: "prompt lottery",
    good: "predictable, revisable output",
  },
  {
    bad: "one-shot generation",
    good: "broadcast validated 2024–25",
  },
];

export type Accent = "lime" | "amber" | "violet";

export type Service = {
  slug: string;
  name: string;
  tier: string;
  price: string;
  duration: string;
  desc: string;
  features: string[];
  accent: Accent;
  badge: string | null;
};

export const services: Service[] = [
  {
    slug: "standard",
    name: "숏폼 AI 광고",
    tier: "STANDARD",
    price: "29만원~",
    duration: "15초 · 최대 5컷",
    desc: "기획·스크립트·생성·편집·자막",
    features: ["기획 · 스크립트", "AI 생성 · 편집", "자막 · 사운드", "9:16 세로 포맷"],
    accent: "lime" as const,
    badge: null as string | null,
  },
  {
    slug: "deluxe",
    name: "브랜드 AI 광고",
    tier: "DELUXE",
    price: "69만원~",
    duration: "60초 · 최대 12컷",
    desc: "스토리보드·캐릭터 관리·AI 나레이션·사운드",
    features: [
      "스토리보드 설계",
      "캐릭터 일관성 관리",
      "AI 나레이션 · 사운드",
      "9:16 + 16:9 납품",
    ],
    accent: "amber" as const,
    badge: "MOST CHOSEN",
  },
  {
    slug: "premium",
    name: "AI 풀 프로덕션",
    tier: "PREMIUM",
    price: "149만원~",
    duration: "120초 · 최대 25컷",
    desc: "컨셉 2안·사운드 디자인·9:16 + 16:9",
    features: [
      "컨셉 2안 제안",
      "사운드 디자인",
      "후보정 · 색보정",
      "전담 PM 운영",
    ],
    accent: "violet" as const,
    badge: null as string | null,
  },
];

export type Work = {
  title: string;
  category: string;
  year: string;
  description: string;
  thumbnailUrl: string;
  tags: string[];
  fallbackUrl?: string;
  videoUrl?: string;
};

export const works: Work[] = [
  {
    title: "〈전설의 고향-구미호〉 KBS1 방영 · REBOOT",
    category: "AI ANIMATION SERIES",
    year: "2025",
    description:
      "KBS1 어린이날 특집으로 방영된 AI 애니메이션. K-호러 원조 설화를 AI로 재해석해 REBOOT 티저·파일럿까지 완성했습니다.",
    thumbnailUrl: "images/still-gumiho.jpg",
    tags: ["KBS1 방영", "국내 최초 AI 활용", "시즌제 기획"],
  },
  {
    title: "현대건설 기업 홍보 영상",
    category: "CORPORATE VIDEO",
    year: "2025",
    description:
      "미래 스마트시티를 배경으로 현대건설의 기술력과 성장 비전을 담았습니다. 실사 촬영과 CG를 활용해 인류의 미래를 하이테크하고 세련된 비주얼로 구현했습니다.",
    thumbnailUrl: "portfolio_thumbs/flow-13.jpg",
    tags: ["CG", "COLOR CORRECTION", "CAMERA DIRECTION"],
    fallbackUrl: "images/work-smartcity.jpg",
  },
  {
    title: "유네코 기업 홍보 영상",
    category: "CORPORATE VIDEO",
    year: "2026",
    description:
      "철강 부산물 슬래그를 SAT 특허기술로 재활용한 친환경 소재 PS Ball의 가치와 기술력을 담았습니다. 실사 촬영과 생성형 AI를 결합한 기업 홍보 영상입니다.",
    thumbnailUrl: "portfolio_thumbs/flow-14.jpg",
    tags: ["PLANNING", "AI GENERATION", "ART DIRECTION", "EDITING"],
  },
  {
    title: "LS전선 기업 홍보 영상",
    category: "CORPORATE VIDEO",
    year: "2026",
    description:
      "EV 모터용 희토류 영구자석 소재의 정제·금속화·자성화 공정을 모션그래픽으로 시각화해 고효율·고출력·내열성의 가치를 전달했습니다.",
    thumbnailUrl: "portfolio_thumbs/flow-15.jpg",
    tags: ["PLANNING", "ART DIRECTION", "EDITING", "MOTION"],
  },
  {
    title: "비치오네 AI 브랜드 필름",
    category: "BRAND FILM",
    year: "2026",
    description:
      "주얼리 브랜드 비치오네의 공식 브랜드 필름입니다. 생성형 AI로 브랜드의 감성과 메시지를 담았습니다.",
    thumbnailUrl: "portfolio_thumbs/flow-16.jpg",
    tags: ["PLANNING", "AI GENERATION", "ART DIRECTION", "EDITING"],
  },
  {
    title: "지메틱 AI 브랜드 필름",
    category: "BRAND FILM",
    year: "2026",
    description:
      "1929년 독일 뢰네에서 시작된 하이엔드 주방가구 브랜드 지메틱의 히스토리를 담았습니다.",
    thumbnailUrl: "portfolio_thumbs/flow-17.jpg",
    tags: ["PLANNING", "AI GENERATION", "SHOOTING", "EDITING"],
  },
  {
    title: "셀렉스 릴렉스 샷 윤가이편",
    category: "ADVERTISING",
    year: "2024",
    description:
      "직장인의 스트레스 상황을 코믹하게 그리고 릴렉스 샷으로 해소되는 과정을 위트 있게 담았습니다.",
    thumbnailUrl: "portfolio_thumbs/flow-18.jpg",
    tags: ["PLANNING", "DIRECTING", "PRODUCTION"],
  },
  {
    title: "빈센트 의원 인터뷰",
    category: "YOUTUBE",
    year: "2026",
    description:
      "25년간 타투이스트와 의사를 겸업해온 조명신 대표원장의 철학과 진료 현장을 담았습니다.",
    thumbnailUrl: "portfolio_thumbs/flow-19.jpg",
    tags: ["PLANNING", "ART DIRECTION", "SHOOTING", "EDITING"],
  },
  {
    title: "한화 에어로스페이스 항공엔진 비전",
    category: "YOUTUBE",
    year: "2024",
    description:
      "전투기 엔진 독자개발부터 소재 국산화, 글로벌 방산수출까지 이어지는 항공엔진 비전을 담았습니다.",
    thumbnailUrl: "portfolio_thumbs/flow-20.jpg",
    tags: ["EDITING", "MOTION"],
  },
  {
    title: "현대 ACT EXPO 인터뷰",
    category: "INTERVIEW",
    year: "2024",
    description:
      "북미 최대 친환경 상용차 전시회 ACT EXPO에서 현대차 수소전기트럭의 기술적 강점을 담았습니다.",
    thumbnailUrl: "portfolio_thumbs/flow-21.jpg",
    tags: ["EDITING", "MOTION"],
  },
  {
    title: "모션그래픽 쇼릴",
    category: "MOTION SHOWREEL",
    year: "2025",
    description:
      "기업 홍보영상과 광고에 작업한 모션그래픽 장면을 한 편의 쇼릴로 구성했습니다.",
    thumbnailUrl: "portfolio_thumbs/flow-22.jpg",
    tags: ["PLANNING", "ART DIRECTION", "EDITING", "MOTION"],
  },
  {
    title: "2025 고잉 세븐틴 오프닝",
    category: "OPENING SEQUENCE",
    year: "2025",
    description:
      "13명의 다양한 분야 작가들과 협업해 고잉 세븐틴 로고를 로고 플레이 콘셉트로 제작했습니다.",
    thumbnailUrl: "portfolio_thumbs/flow-23.jpg",
    tags: ["PLANNING", "ART DIRECTION", "EDITING", "MOTION"],
  },
  {
    title: "CJ대한통운 사업 소개 영상",
    category: "CORPORATE VIDEO",
    year: "2024",
    description: "CJ대한통운이 새롭게 추진하는 4가지 대표 신사업을 소개합니다.",
    thumbnailUrl: "portfolio_thumbs/flow-24.jpg",
    tags: ["ART DIRECTION", "EDITING", "MOTION"],
  },
];

export type TeamMember = {
  name: string;
  role: string;
  org: string;
  career: string[];
  image: string;
  /** 사진 세로 기준점(0~100%, 어드민의 사진 위치 값) */
  photoPosition?: number;
};

// Source: CubeBerry Company Profile 2026 (EN), pages 6–9 & FLEXBOARD Design v2 (#studio CREDITS, 14 members).
export const team: TeamMember[] = [
  {
    "name": "이진서",
    "role": "FOUNDER & CEO",
    "org": "전 KBS PD · XCONDA 총괄",
    "career": [
      "전 KBS 예능·드라마 PD, 큐브베리 설립 및 콘텐츠 제작 총괄",
      "XCONDA AI 제작 파이프라인 설계 · KBS미디어 AI 드라마 제작 강의",
      "〈전설의 고향: 구미호〉 연출 · 한국AI콘텐츠크리에이터협회 부회장",
      "AI 미디어 융합기술 공모전 우수상(과기정통부·RAPA, 단체) · 경기도지사 표창",
      "AI 영상 관련 특허 발명자"
    ],
    "image": "team_portraits/lee-jinseo.webp",
    "photoPosition": 0
  },
  {
    "name": "손수영",
    "role": "WRITER",
    "org": "방송·드라마·애니메이션 작가",
    "career": [
      "SBS 〈웃찾사〉 · MBC 〈출발! 비디오 여행〉 집필",
      "제일기획 유튜브 광고 콘텐츠 〈이태원 클라쓰룸〉 · 〈카피카피룸룸〉",
      "KBS2 〈내 생애 마지막 오디션〉 · EBS 애니메이션 〈안녕! 부부토〉",
      "KBS·MBC·SBS·EBS 방송 집필 · 드라마·예능·다큐멘터리 스토리텔링"
    ],
    "image": "team_portraits/son-sooyeong.webp",
    "photoPosition": 0
  },
  {
    "name": "조규원",
    "role": "DRAMA & ANIMATION WRITER",
    "org": "드라마·애니메이션 작가",
    "career": [
      "KBS2 〈아이리스〉·〈아이리스 2〉 · MBC 〈이몽〉 집필",
      "애니메이션 〈마법천자문〉 · 〈올림포스 가디언〉 · 〈장금이의 꿈〉",
      "〈꼬마 신선 타오〉 · 〈미미와 다다의 미술탐험대〉",
      "대표 IP 공동 집필 및 스토리 참여 · 드라마·영화·소설 창작"
    ],
    "image": "team_portraits/cho-kyuwon.webp",
    "photoPosition": 0
  },
  {
    "name": "노은주",
    "role": "WRITER",
    "org": "드라마·애니메이션·웹툰 작가",
    "career": [
      "애니메이션 〈전설의 고향: 구미호〉 · 〈해피러스〉 집필",
      "영화 〈강남 변호사〉 각색 · 드라마 〈무법 변호사〉 집필 참여",
      "웹툰 〈기묘한 가게의 해결사들〉 · 한중 합작 숏폼 드라마 〈황제의 요리사〉 집필",
      "구미호 세계관 시즌 구성·캐릭터 서사 및 AI 제작용 스토리 바이블 설계"
    ],
    "image": "team_portraits/noh-eunjoo.webp",
    "photoPosition": 0
  },
  {
    "name": "박찬혁 감독",
    "role": "AI PRODUCTION LEAD",
    "org": "AI 제작 총괄 · 감독",
    "career": [
      "KBS 〈성물〉 · 〈한국전쟁 이동외상센터〉 · 〈전설의 고향〉 AI 애니메이션 연출·제작",
      "KBS·MBC·SBS 드라마 300회 이상 음악감독 — 〈사랑비〉·〈반올림〉·〈부자의 탄생〉·〈동안미녀〉·〈8월의 신부〉 등",
      "부활·박완규·애쉬그레이·크리스 레오네 등 뮤직비디오 50편 이상 연출·촬영·편집",
      "통일부 〈To be One〉 · 법무부 학교폭력 예방 캠페인 연출",
      "두바이 AI 영화제(AIFF) 출품작 AI 제작 총괄"
    ],
    "image": "team_portraits/park-chanhyuk.webp",
    "photoPosition": 0
  },
  {
    "name": "조민희 PD",
    "role": "AI PRODUCTION OPERATOR",
    "org": "SBS 교양국 PD 출신",
    "career": [
      "SBS 〈동물농장〉 PD",
      "미샤·배스킨라빈스·하이트·코웨이 TVCF",
      "에버랜드·국립과천과학관 미디어아트 기획·연출",
      "공연·팬미팅·커머스 라이브 연출·송출",
      "드라마·영화 DIT / ICA 수료"
    ],
    "image": "team_portraits/cho-minhee.webp",
    "photoPosition": 0
  },
  {
    "name": "최종현",
    "role": "AI CONTENT DIRECTOR",
    "org": "AI 콘텐츠 감독",
    "career": [
      "와디즈·네이버 쇼핑라이브 라이브커머스 총괄 PD",
      "영화 〈택시운전사〉 VFX · 〈공수도〉 캐스팅 디렉터",
      "국방부 한국전쟁 70주년 영상 수상 · 인천소방본부 공모전 대상",
      "과기정통부·KISA 수상 · 한국공간디자인협회 특별상"
    ],
    "image": "team_portraits/choi-jonghyun.webp",
    "photoPosition": 0
  },
  {
    "name": "황보민혁",
    "role": "VIDEO CONTENT PLANNER",
    "org": "영상 콘텐츠 기획",
    "career": [
      "인도 Ballaleshwar Clinic · 독일 Jagolskileon 채널 광고·홍보영상",
      "태국 방콕 Aozora Restaurant · The Loft 광고·홍보영상",
      "태국 AI 숏폼 드라마 제작 · 유튜브 채널 운영"
    ],
    "image": "team_portraits/hwangbo-minhyuk.webp",
    "photoPosition": 0
  },
  {
    "name": "김재환",
    "role": "AI VIDEO ARTIST / PRODUCER",
    "org": "AI 영상·생성형 미디어 연출",
    "career": [
      "KBS 특집 다큐멘터리 〈성물〉 · 〈한국전쟁 이동외상센터〉 AI 영상 제작",
      "AI 애니메이션 〈TV동화 행복한 세상〉 · 어린이날 특집 〈구미호〉 제작",
      "박완규 〈수호〉 · 부활 〈To be one〉·〈사랑하고 있다〉·〈이별에서 영원으로〉 뮤직비디오 편집"
    ],
    "image": "team_portraits/kim-jaehwan.webp",
    "photoPosition": 0
  },
  {
    "name": "배예은",
    "role": "FILM EDITOR",
    "org": "영화·드라마 편집",
    "career": [
      "영화 〈추격자〉·〈황해〉·〈거북이 달린다〉·〈기술자들〉 현장 편집",
      "영화 〈백야행〉·〈화차〉·〈완득이〉·〈오늘의 연애〉 현장 편집",
      "OCN 〈트랩〉·〈번외수사〉 · JTBC 〈보좌관〉 시즌 1·2 편집",
      "KBS 〈붉은 단심〉 · SBS 〈국민사형투표〉 편집"
    ],
    "image": "team_portraits/bae-yeeun.webp",
    "photoPosition": 0
  },
  {
    "name": "차하나",
    "role": "LIVE CONTENT PD",
    "org": "라이브·미디어 콘텐츠 PD",
    "career": [
      "춘천애니메이션박물관·국립중앙도서관·화성어린이문화센터 등 국공립 전시시설 20곳 이상 미디어 기술 콘텐츠 기획·제작",
      "반려다움·슬룸·헤드스파7·인스탁스·SK매직·삼성 TV 등 50개 이상 브랜드 라이브커머스 총괄 PD",
      "채널A 〈지붕 위의 막걸리〉 · JTBC 〈취향존중 리얼라이프 – 취존생활〉 · TV조선 〈코리아헌터〉 PD"
    ],
    "image": "team_portraits/cha-hana.webp",
    "photoPosition": 0
  }
];

export const processSteps = [
  {
    num: "01",
    title: "분석 · 기획",
    desc: "목표·니즈·예산·일정을 분석하고 기획안·스토리보드·스크립트를 작성합니다.",
  },
  {
    num: "02",
    title: "제작 · 촬영",
    desc: "촬영 장비·인력 세팅과 현장 촬영·연출, 필요한 장면은 AI로 제작합니다.",
  },
  {
    num: "03",
    title: "편집 · 후반",
    desc: "1차 편집·피드백 반영, 모션그래픽·CG·색보정·사운드 작업을 진행합니다.",
  },
  {
    num: "04",
    title: "납품 · 최적화",
    desc: "최종 파일을 납품하고 플랫폼별 최적 포맷을 함께 제공합니다.",
  },
];

export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  {
    q: "큐브베리는 어떤 기업인가요?",
    a: "방송 전문가들이 이끄는 AI 콘텐츠 기업입니다. KBS 출신 PD와 현업 감독이 기획·서사를 맡고, 자체 개발한 XCONDA AI 플랫폼으로 지상파에 방영되는 작품을 만듭니다.",
  },
  {
    q: "XCONDA는 어떤 플랫폼인가요?",
    a: "컷이 바뀌어도 공간과 인물이 유지되는 롱폼 AI 영상 플랫폼입니다. TURN·FLEXBOARD·BLOCKING BOARD로 공간·캐릭터·동선을 제작 단계에서 관리합니다.",
  },
  {
    q: "어떤 자료를 준비하면 상담이 빨라지나요?",
    a: "영상 목적과 업로드 채널, 참고 영상 1~2개, 로고·제품 사진·컬러 가이드, 원하는 비율과 희망 납기일을 준비해주시면 좋습니다.",
  },
  {
    q: "상업적 이용과 NDA가 가능한가요?",
    a: "기업회원·세금계산서 발행·NDA 체결이 가능하며, 최종 제작물은 협의된 범위에서 상업적으로 이용할 수 있습니다.",
  },
];
