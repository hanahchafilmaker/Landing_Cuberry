// ─────────────────────────────────────────────────────────────
// 큐브베리(CUBERRY) 스튜디오 랜딩 콘텐츠
// 실제 운영 콘텐츠(hero·서비스·포트폴리오·팀·FAQ)를 기반으로 구성
// ─────────────────────────────────────────────────────────────

export const settings = {
  brand: "CUBERRY",
  brandKo: "큐브베리",
  eyebrow: "Creative video studio / Seoul · Korea",
  heroTitle: "MAKE IT MOVE.",
  heroSubtitle:
    "브랜드의 메시지를 가장 효과적인 방법으로. 큐브베리는 기획·촬영·편집·모션그래픽과 XCONDA AI 플랫폼까지, 영상의 처음과 끝을 함께 만드는 제작 스튜디오입니다.",
  heroNote: "목적과 컷 수에 맞는 구성으로 바로 상담하세요.",
  email: "f9.flownine@gmail.com",
  phone: "070-8095-2302",
};

export const stats = [
  { value: 28, suffix: "년+", label: "필름메이킹 전문성" },
  { value: 21, suffix: "+", label: "제작 포트폴리오" },
  { value: 14, suffix: "+", label: "AI 모델 연동" },
  { value: 20, suffix: "년+", label: "현장 합산 경험" },
];

export const navLinks = [
  { label: "Why", href: "#why" },
  { label: "Services", href: "#services" },
  { label: "AI Lab", href: "#lab" },
  { label: "Works", href: "#works" },
  { label: "Team", href: "#team" },
  { label: "FAQ", href: "#faq" },
];

export const marqueeItems = [
  "AI FILM",
  "BRAND FILM",
  "TV CF",
  "CORPORATE VIDEO",
  "MOTION GRAPHICS",
  "XCONDA STORYBOARD",
  "SHORT-FORM AD",
  "AI ADVERTISING",
  "WEBDRAMA",
  "DOCUMENTARY",
];

export const whyItems = [
  {
    num: "01",
    key: "EXPERIENCE",
    title: "현장에서 검증된 제작 경험",
    desc: "브랜드, 기업, 방송, 광고와 콘텐츠까지 다양한 현장에서 쌓아온 제작 경험과 KBS 방송 제작 검증. 28년 이상의 필름메이킹 전문성과 PD의 기획력, 모션그래퍼의 크리에이티브가 만납니다.",
    tags: ["KBS 방송 제작", "TVCF", "브랜드 필름", "AI 콘텐츠"],
  },
  {
    num: "02",
    key: "ONE-STOP",
    title: "한 팀이 끝까지 직접 진행",
    desc: "기획·촬영·편집·모션그래픽·납품의 핵심 과정을 한 팀이 직접 진행합니다. 기획자와 제작자가 직접 소통해 빠른 의사결정과 정확한 피드백 반영이 가능합니다.",
    tags: ["기획", "촬영", "편집", "모션그래픽", "납품"],
  },
  {
    num: "03",
    key: "ASSET",
    title: "오래 쓰이는 브랜드 자산",
    desc: "단기간 소비되고 사라지는 영상이 아니라 여러 채널과 목적에 확장되는 브랜드 자산을 설계합니다. 실제 방송 제작에서 검증된 XCONDA와 원스톱 제작 시스템으로 브랜드가 오래 기억되는 영상을 만듭니다.",
    tags: ["16:9", "9:16", "1:1", "멀티 채널"],
  },
];

export const strengths = [
  {
    num: "01",
    key: "CREATIVE DUO",
    title: "PD + 모션그래퍼 듀오",
    desc: "기획·연출을 담당하는 PD와 영상 디자인을 담당하는 모션그래퍼가 핵심 과정을 내부에서 직접 진행합니다.",
  },
  {
    num: "02",
    key: "TEAM EXPERTISE",
    title: "합산 20년+ 현장 경험",
    desc: "기업·브랜드·공공기관·전시·문화 등 다양한 분야에서 합산 20년 이상의 현장 경험을 바탕으로 프로젝트를 진행합니다.",
  },
  {
    num: "03",
    key: "DIRECT COMMUNICATION",
    title: "기획자와의 직접 소통",
    desc: "기획자와 제작자가 직접 소통해 빠른 의사결정과 정확한 피드백 반영이 가능합니다.",
  },
  {
    num: "04",
    key: "INTEGRATED PRODUCTION",
    title: "통합 제작 프로세스",
    desc: "기획 → 촬영 → 편집 → 모션그래픽 → 납품의 핵심 프로세스를 내부 팀이 주도합니다.",
  },
];

export const whatWeDo = [
  {
    num: "01",
    key: "CORPORATE",
    title: "기업 홍보 영상",
    desc: "기업의 가치와 기술, 제품과 서비스를 명확하게 전달하는 전문 영상.",
    tags: ["TVCF", "BRAND FILM", "PR"],
    icon: "building" as const,
  },
  {
    num: "02",
    key: "ADVERTISING",
    title: "광고 · 숏폼",
    desc: "SNS와 유튜브의 문법에 맞춰 짧지만 강한 메시지로 반응을 이끌어냅니다.",
    tags: ["YOUTUBE", "REELS", "SHORTS"],
    icon: "play" as const,
  },
  {
    num: "03",
    key: "MOTION",
    title: "모션그래픽",
    desc: "데이터 시각화, 제품 연출, 로고 애니메이션과 타이틀에 생동감을 더합니다.",
    tags: ["2D", "3D", "TITLE", "CG"],
    icon: "motion" as const,
  },
  {
    num: "04",
    key: "AI CONTENTS",
    title: "AI 콘텐츠",
    desc: "14개 이상의 AI 모델과 일관성 중심의 제작 공정으로 실사 촬영만으로 어려운 장면과 장편 시퀀스를 구현합니다.",
    tags: ["AI FILM", "AI AD", "EXPERIMENT"],
    icon: "spark" as const,
  },
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

export const services = [
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

export type DriveFilm = {
  title: string;
  category: string;
  year: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  kind: string;
};

export const driveFilms: DriveFilm[] = [
  {
    title: "AI엑스콘다광고",
    category: "DRIVE FILM",
    year: "2026",
    description: "AI XCONDA 광고 · AI 광고 / 브랜드 필름",
    videoUrl: "https://drive.google.com/file/d/1uVP4Ih6kKHxb0uUHsntCR7UsepMJ2djG/preview",
    thumbnailUrl: "https://drive.google.com/thumbnail?id=1uVP4Ih6kKHxb0uUHsntCR7UsepMJ2djG&sz=w1000",
    kind: "광고",
  },
  {
    title: "seedwar.mp4",
    category: "DRIVE FILM",
    year: "2026",
    description: "Seedwar · AI 웹드라마 / 콘셉트 필름",
    videoUrl: "https://drive.google.com/file/d/1jP4J4RbNFDlK3bZI5dWz_atj4pYMPFeo/preview",
    thumbnailUrl: "https://drive.google.com/thumbnail?id=1jP4J4RbNFDlK3bZI5dWz_atj4pYMPFeo&sz=w1000",
    kind: "웹드라마",
  },
  {
    title: "미국광고_세로숏폼",
    category: "DRIVE FILM",
    year: "2026",
    description: "미국 광고 세로 숏폼 · 9:16 광고 / Short-form",
    videoUrl: "https://drive.google.com/file/d/1Gg2_R8jnLgaVBYWEwrn8KB-mt_yJ6J43/preview",
    thumbnailUrl: "https://drive.google.com/thumbnail?id=1Gg2_R8jnLgaVBYWEwrn8KB-mt_yJ6J43&sz=w1000",
    kind: "숏폼",
  },
  {
    title: "애니메이션_토이팜",
    category: "DRIVE FILM",
    year: "2026",
    description: "애니메이션 토이팜 · 애니메이션 / 캐릭터 콘텐츠",
    videoUrl: "https://drive.google.com/file/d/1o5pVmIcxeoCE4CEq090ememV_lj-IQF4/preview",
    thumbnailUrl: "https://drive.google.com/thumbnail?id=1o5pVmIcxeoCE4CEq090ememV_lj-IQF4&sz=w1000",
    kind: "애니메이션",
  },
  {
    title: "이엘_웹드라마_트레일러",
    category: "DRIVE FILM",
    year: "2026",
    description: "이엘 웹드라마 트레일러 · 웹드라마 / Trailer",
    videoUrl: "https://drive.google.com/file/d/13jH_tndgmbI7MOOOW02I2ADEMFXY6Ii8/preview",
    thumbnailUrl: "https://drive.google.com/thumbnail?id=13jH_tndgmbI7MOOOW02I2ADEMFXY6Ii8&sz=w1000",
    kind: "웹드라마",
  },
  {
    title: "천년의사랑_웹드라마",
    category: "DRIVE FILM",
    year: "2026",
    description: "천년의 사랑 웹드라마 · AI 웹드라마 / Series",
    videoUrl: "https://drive.google.com/file/d/1OWlKxIH2LRfohRSSR2Fk46Ou2RdYmOya/preview",
    thumbnailUrl: "https://drive.google.com/thumbnail?id=1OWlKxIH2LRfohRSSR2Fk46Ou2RdYmOya&sz=w1000",
    kind: "웹드라마",
  },
  {
    title: "콜드사이트_트레일러",
    category: "DRIVE FILM",
    year: "2026",
    description: "콜드사이트 트레일러 · AI 영화 / Trailer",
    videoUrl: "https://drive.google.com/file/d/1IxNbAvzwgJFMo7CZbhv6mWQWVNafEqMZ/preview",
    thumbnailUrl: "https://drive.google.com/thumbnail?id=1IxNbAvzwgJFMo7CZbhv6mWQWVNafEqMZ&sz=w1000",
    kind: "영화",
  },
  {
    title: "턴_광고",
    category: "DRIVE FILM",
    year: "2026",
    description: "TURN 광고 · XCONDA / AI 광고",
    videoUrl: "https://drive.google.com/file/d/1a9mwJiB5NJPEu70l3UWaNNE-Y-kKr_Nm/preview",
    thumbnailUrl: "https://drive.google.com/thumbnail?id=1a9mwJiB5NJPEu70l3UWaNNE-Y-kKr_Nm&sz=w1000",
    kind: "광고",
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
};

export const works: Work[] = [
  {
    title: "현대건설 기업 홍보 영상",
    category: "CORPORATE VIDEO",
    year: "2025",
    description:
      "미래 스마트시티를 배경으로 현대건설의 기술력과 성장 비전을 담았습니다. 실사 촬영과 CG를 활용해 인류의 미래를 하이테크하고 세련된 비주얼로 구현했습니다.",
    thumbnailUrl: "https://hanahchafilmaker.github.io/portfolio_thumbs/flow-13.jpg",
    tags: ["CG", "COLOR CORRECTION", "CAMERA DIRECTION"],
    fallbackUrl: "/images/work-smartcity.jpg",
  },
  {
    title: "유네코 기업 홍보 영상",
    category: "CORPORATE VIDEO",
    year: "2026",
    description:
      "철강 부산물 슬래그를 SAT 특허기술로 재활용한 친환경 소재 PS Ball의 가치와 기술력을 담았습니다. 실사 촬영과 생성형 AI를 결합한 기업 홍보 영상입니다.",
    thumbnailUrl: "https://hanahchafilmaker.github.io/portfolio_thumbs/flow-14.jpg",
    tags: ["PLANNING", "AI GENERATION", "ART DIRECTION", "EDITING"],
  },
  {
    title: "LS전선 기업 홍보 영상",
    category: "CORPORATE VIDEO",
    year: "2026",
    description:
      "EV 모터용 희토류 영구자석 소재의 정제·금속화·자성화 공정을 모션그래픽으로 시각화해 고효율·고출력·내열성의 가치를 전달했습니다.",
    thumbnailUrl: "https://hanahchafilmaker.github.io/portfolio_thumbs/flow-15.jpg",
    tags: ["PLANNING", "ART DIRECTION", "EDITING", "MOTION"],
  },
  {
    title: "비치오네 AI 브랜드 필름",
    category: "BRAND FILM",
    year: "2026",
    description:
      "주얼리 브랜드 비치오네의 공식 브랜드 필름입니다. 생성형 AI로 브랜드의 감성과 메시지를 담았습니다.",
    thumbnailUrl: "https://hanahchafilmaker.github.io/portfolio_thumbs/flow-16.jpg",
    tags: ["PLANNING", "AI GENERATION", "ART DIRECTION", "EDITING"],
  },
  {
    title: "지메틱 AI 브랜드 필름",
    category: "BRAND FILM",
    year: "2026",
    description:
      "1929년 독일 뢰네에서 시작된 하이엔드 주방가구 브랜드 지메틱의 히스토리를 담았습니다.",
    thumbnailUrl: "https://hanahchafilmaker.github.io/portfolio_thumbs/flow-17.jpg",
    tags: ["PLANNING", "AI GENERATION", "SHOOTING", "EDITING"],
  },
  {
    title: "셀렉스 릴렉스 샷 윤가이편",
    category: "ADVERTISING",
    year: "2024",
    description:
      "직장인의 스트레스 상황을 코믹하게 그리고 릴렉스 샷으로 해소되는 과정을 위트 있게 담았습니다.",
    thumbnailUrl: "https://hanahchafilmaker.github.io/portfolio_thumbs/flow-18.jpg",
    tags: ["PLANNING", "DIRECTING", "PRODUCTION"],
  },
  {
    title: "빈센트 의원 인터뷰",
    category: "YOUTUBE",
    year: "2026",
    description:
      "25년간 타투이스트와 의사를 겸업해온 조명신 대표원장의 철학과 진료 현장을 담았습니다.",
    thumbnailUrl: "https://hanahchafilmaker.github.io/portfolio_thumbs/flow-19.jpg",
    tags: ["PLANNING", "ART DIRECTION", "SHOOTING", "EDITING"],
  },
  {
    title: "한화 에어로스페이스 항공엔진 비전",
    category: "YOUTUBE",
    year: "2024",
    description:
      "전투기 엔진 독자개발부터 소재 국산화, 글로벌 방산수출까지 이어지는 항공엔진 비전을 담았습니다.",
    thumbnailUrl: "https://hanahchafilmaker.github.io/portfolio_thumbs/flow-20.jpg",
    tags: ["EDITING", "MOTION"],
  },
  {
    title: "현대 ACT EXPO 인터뷰",
    category: "INTERVIEW",
    year: "2024",
    description:
      "북미 최대 친환경 상용차 전시회 ACT EXPO에서 현대차 수소전기트럭의 기술적 강점을 담았습니다.",
    thumbnailUrl: "https://hanahchafilmaker.github.io/portfolio_thumbs/flow-21.jpg",
    tags: ["EDITING", "MOTION"],
  },
  {
    title: "모션그래픽 쇼릴",
    category: "MOTION SHOWREEL",
    year: "2025",
    description:
      "기업 홍보영상과 광고에 작업한 모션그래픽 장면을 한 편의 쇼릴로 구성했습니다.",
    thumbnailUrl: "https://hanahchafilmaker.github.io/portfolio_thumbs/flow-22.jpg",
    tags: ["PLANNING", "ART DIRECTION", "EDITING", "MOTION"],
  },
  {
    title: "2025 고잉 세븐틴 오프닝",
    category: "OPENING SEQUENCE",
    year: "2025",
    description:
      "13명의 다양한 분야 작가들과 협업해 고잉 세븐틴 로고를 로고 플레이 콘셉트로 제작했습니다.",
    thumbnailUrl: "https://hanahchafilmaker.github.io/portfolio_thumbs/flow-23.jpg",
    tags: ["PLANNING", "ART DIRECTION", "EDITING", "MOTION"],
  },
  {
    title: "CJ대한통운 사업 소개 영상",
    category: "CORPORATE VIDEO",
    year: "2024",
    description: "CJ대한통운이 새롭게 추진하는 4가지 대표 신사업을 소개합니다.",
    thumbnailUrl: "https://hanahchafilmaker.github.io/portfolio_thumbs/flow-24.jpg",
    tags: ["ART DIRECTION", "EDITING", "MOTION"],
  },
];

export const team = [
  {
    name: "조민희 PD",
    role: "PRODUCER / DIRECTOR",
    org: "SBS 교양국 PD 출신",
    career: [
      "SBS 〈동물농장〉 PD",
      "미샤·베스킨라빈스·하이트·코웨이 TVCF",
      "에버랜드·국립과천과학관 실감콘텐츠 및 미디어아트 기획·연출",
      "공연·팬미팅·커머스 라이브 연출·송출",
      "드라마·영화 DIT / ICA 수료",
    ],
    image: "https://hanahchafilmaker.github.io/team_portraits/jominhee-pd.jpg",
  },
  {
    name: "박인회",
    role: "MOTION GRAPHICS",
    org: "광고대행사 출신",
    career: [
      "르노코리아·MLB·컨버스·BC카드",
      "CJ대한통운·NC소프트·현대",
      "캐롯·다이슨 브랜드 협업",
      "대기업 계열 비딩 프로젝트 다수",
    ],
    image: "https://hanahchafilmaker.github.io/team_portraits/park-inhoe-motion.jpg",
  },
  {
    name: "박찬혁 감독",
    role: "DIRECTOR",
    org: "FILM / CONTENT",
    career: [
      "영상 연출 및 콘텐츠 디렉팅",
      "브랜드·광고·콘텐츠 프로젝트 협업",
    ],
    image: "https://hanahchafilmaker.github.io/team_portraits/park-chanhyuk-director.jpg",
  },
  {
    name: "이진서",
    role: "CEO",
    org: "㈜큐브베리",
    career: [
      "큐브베리 대표 / 전 KBS 드라마 PD",
      "AI드라마크리에이터협회 이사",
      "〈전설의 고향: 구미호〉 연출",
      "AI 웹드라마·장편 AI 애니메이션 제작 파이프라인",
    ],
    image: "",
  },
  {
    name: "프로젝트 감독·제작진",
    role: "DIRECTOR / AI / EDIT",
    org: "PROJECT POOL",
    career: [
      "조민지 PD — KBS 〈한국전쟁 이동외상센터〉 연출",
      "방송·브랜드·기업 프로젝트별 전담 구성",
      "기획 → 촬영 → 편집 → 모션그래픽 → 납품",
    ],
    image: "",
  },
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

export const b2bItems = [
  { num: "01", title: "월간 콘텐츠 운영", desc: "4~8편" },
  { num: "02", title: "브랜드 IP·웹드라마 개발", desc: "시리즈 기획·제작" },
  { num: "03", title: "기업 홍보·전시·세일즈 콘텐츠", desc: "맞춤 제작" },
  { num: "04", title: "NDA·세금계산서·전담 PM", desc: "안전한 계약" },
];

export const faqs = [
  {
    q: "실사 촬영 없이도 완성도 있는 영상이 가능한가요?",
    a: "가능합니다. 기획·콘티·이미지 및 영상 생성·컷 편집·후보정·사운드까지 전체 공정으로 진행하며, 실제 제품은 필요에 따라 별도 합성합니다.",
  },
  {
    q: "AI 영상에서 인물과 공간이 계속 바뀌지 않나요?",
    a: "큐브베리는 XCONDA의 Turn, FlexBoard, Blocking Board를 활용해 공간·캐릭터·동선을 제작 단계에서 관리합니다.",
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
