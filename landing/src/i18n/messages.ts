// ─────────────────────────────────────────────────────────────
// 한영 자동 번역 사전 (ko → en)
//
// 랜딩의 모든 한국어 문구는 이 사전을 거쳐 영어로 바뀝니다.
//   · 키  = 화면에 나오는 한국어 원문 (띄어쓰기·줄바꿈 차이는 자동으로 흡수)
//   · 값  = 영어 화면에서 보여줄 문장. {name} 같은 자리는 컴포넌트가 채웁니다.
//   · 키가 없으면? 아래 rules(금액·길이·특허번호 등)를 먼저 시도하고,
//     그래도 없으면 한국어 원문을 그대로 보여줍니다(글자가 사라지는 일은 없습니다).
//
// 새 문구를 추가할 때는 여기에 영어 문장만 더하면 됩니다.
// 빠진 번역은 `npm run test:i18n` 이 모두 찾아냅니다.
// ─────────────────────────────────────────────────────────────

export type Vars = Record<string, string | number>;

/** 영문 화면에서 쓰는 ko → en 사전 (정적 문구 + 운영 CMS 시드 문구) */
export const en: Record<string, string> = {
  "전 KBS PD": "Former KBS producer",
  "XCONDA 총괄": "Head of XCONDA",
  "AI 제작 총괄": "AI production lead",
  "감독": "Director",
  "이야기부터 완성까지,\n큐브베리의 제작진": "From story to screen,\nthe people of CubeBerry",
  "방송·드라마·애니메이션 작가부터 AI 제작·편집·라이브 콘텐츠 전문가까지. 큐브베리의 직원과 주요 제작 이력을 소개합니다.": "Meet the people of CubeBerry and their production credits — writers for broadcast, drama and animation, alongside specialists in AI production, editing and live content.",
  // Company Profile 2026 — team biographies (pages 6–9).
  "전 KBS PD · XCONDA 총괄": "Former KBS producer · Head of XCONDA",
  "전 KBS 예능·드라마 PD, 큐브베리 설립 및 콘텐츠 제작 총괄": "Former KBS entertainment and drama producer; founder of CubeBerry and head of content production",
  "XCONDA AI 제작 파이프라인 설계 · KBS미디어 AI 드라마 제작 강의": "Designed the XCONDA AI production pipeline; teaches AI drama production at KBS Media",
  "〈전설의 고향: 구미호〉 연출 · 한국AI콘텐츠크리에이터협회 부회장": "Director, Hometown of Legends: Gumiho; Vice President, Korea AI Content Creators Association",
  "AI 영상 관련 특허 발명자": "Inventor on AI video patents",
  "손수영": "Son Soo-yeong",
  "방송·드라마·애니메이션 작가": "Broadcast, drama & animation writer",
  "SBS 〈웃찾사〉 · MBC 〈출발! 비디오 여행〉 집필": "Writer on SBS People Looking for a Laugh and MBC Video Travel",
  "제일기획 유튜브 광고 콘텐츠 〈이태원 클라쓰룸〉 · 〈카피카피룸룸〉": "Cheil Worldwide YouTube ad content: Itaewon Classroom and Copy Copy Room Room",
  "KBS2 〈내 생애 마지막 오디션〉 · EBS 애니메이션 〈안녕! 부부토〉": "KBS2 My Last Audition; EBS animation Hello Bubuto",
  "KBS·MBC·SBS·EBS 방송 집필 · 드라마·예능·다큐멘터리 스토리텔링": "Writing credits across KBS, MBC, SBS and EBS; drama, entertainment and documentary storytelling",
  "조규원": "Cho Kyu-won",
  "드라마·애니메이션 작가": "Drama & animation writer",
  "KBS2 〈아이리스〉·〈아이리스 2〉 · MBC 〈이몽〉 집필": "Drama: KBS2 IRIS and IRIS 2; MBC Different Dreams",
  "애니메이션 〈마법천자문〉 · 〈올림포스 가디언〉 · 〈장금이의 꿈〉": "Animation: Magic Chunjamun, Olympus Guardian and Jang Geum’s Dream",
  "〈꼬마 신선 타오〉 · 〈미미와 다다의 미술탐험대〉": "Tao the Little Wizard; Mimi and Dada’s Art Adventure",
  "대표 IP 공동 집필 및 스토리 참여 · 드라마·영화·소설 창작": "Co-writer with story credit on our flagship IP; storytelling across drama, film and fiction",
  "노은주": "Noh Eun-joo",
  "드라마·애니메이션·웹툰 작가": "Drama, animation & webtoon writer",
  "애니메이션 〈전설의 고향: 구미호〉 · 〈해피러스〉 집필": "Animation: Hometown of Legends: Gumiho and Happyrus",
  "영화 〈강남 변호사〉 각색 · 드라마 〈무법 변호사〉 집필 참여": "Adaptation for Gangnam Lawyer; scriptwriting on Lawless Lawyer",
  "웹툰 〈기묘한 가게의 해결사들〉 · 한중 합작 숏폼 드라마 〈황제의 요리사〉 집필": "Webtoon Troubleshooters of the Odd Shop; writing The Emperor’s Chef, a Korea-China short-form drama",
  "구미호 세계관 시즌 구성·캐릭터 서사 및 AI 제작용 스토리 바이블 설계": "Season structure, character arcs and AI-ready story bibles for the Gumiho universe",
  "AI 제작 총괄 · 감독": "AI production lead · Director",
  "KBS 〈성물〉 · 〈한국전쟁 이동외상센터〉 · 〈전설의 고향〉 AI 애니메이션 연출·제작": "Directed and produced KBS Seongmul (Sacred Relics), Korean War Mobile Trauma Center and Hometown of Legends AI animation",
  "KBS·MBC·SBS 드라마 300회 이상 음악감독 — 〈사랑비〉·〈반올림〉·〈부자의 탄생〉·〈동안미녀〉·〈8월의 신부〉 등": "Music director on 300+ KBS/MBC/SBS drama episodes: Love Rain, Banolim, Birth of the Rich, Baby-Faced Beauty, August Bride and more",
  "부활·박완규·애쉬그레이·크리스 레오네 등 뮤직비디오 50편 이상 연출·촬영·편집": "Directed, shot and edited 50+ music videos for Boohwal, Park Wan-kyu, Ashgray, Kris Leone and others",
  "통일부 〈To be One〉 · 법무부 학교폭력 예방 캠페인 연출": "Directed Ministry of Unification To be One and Ministry of Justice school violence prevention campaigns",
  "두바이 AI 영화제(AIFF) 출품작 AI 제작 총괄": "AI production lead on a film entered in the Dubai AI Film Festival (AIFF)",
  "미샤·배스킨라빈스·하이트·코웨이 TVCF": "TV commercials: MISSHA, Baskin-Robbins, HITE and Coway",
  "에버랜드·국립과천과학관 미디어아트 기획·연출": "Media art planning and direction: Everland and Gwacheon National Science Museum",
  "최종현": "Choi Jong-hyun",
  "AI 콘텐츠 감독": "AI content director",
  "와디즈·네이버 쇼핑라이브 라이브커머스 총괄 PD": "Lead producer for live commerce: Wadiz and Naver Shopping Live",
  "영화 〈택시운전사〉 VFX · 〈공수도〉 캐스팅 디렉터": "VFX on A Taxi Driver; casting director on Gongsoodo",
  "국방부 한국전쟁 70주년 영상 수상 · 인천소방본부 공모전 대상": "Award for the Ministry of National Defense Korean War 70th anniversary video; Grand Prize, Incheon Fire Department competition",
  "과기정통부·KISA 수상 · 한국공간디자인협회 특별상": "MSIT × KISA award; Special Prize, Korea Spatial Design Association",
  "황보민혁": "Hwangbo Min-hyuk",
  "영상 콘텐츠 기획": "Video content planning",
  "인도 Ballaleshwar Clinic · 독일 Jagolskileon 채널 광고·홍보영상": "Commercial and promotional videos for Ballaleshwar Clinic (India) and Jagolskileon channel (Germany)",
  "태국 방콕 Aozora Restaurant · The Loft 광고·홍보영상": "Commercial and promotional videos for Aozora Restaurant (Bangkok, Thailand) and The Loft",
  "태국 AI 숏폼 드라마 제작 · 유튜브 채널 운영": "AI short-form drama production in Thailand; YouTube channel management",
  "김재환": "Kim Jae-hwan",
  "AI 영상·생성형 미디어 연출": "AI video & generative media direction",
  "KBS 특집 다큐멘터리 〈성물〉 · 〈한국전쟁 이동외상센터〉 AI 영상 제작": "AI video production for KBS documentary specials Seongmul (Sacred Relics) and Korean War Mobile Trauma Center",
  "AI 애니메이션 〈TV동화 행복한 세상〉 · 어린이날 특집 〈구미호〉 제작": "AI animation TV Fairy Tale: A Happy World and Children’s Day special Gumiho",
  "박완규 〈수호〉 · 부활 〈To be one〉·〈사랑하고 있다〉·〈이별에서 영원으로〉 뮤직비디오 편집": "Music video editing: Park Wan-kyu Suho; Boohwal To be one, I’m in Love and From Farewell to Eternity",
  "배예은": "Bae Ye-eun",
  "영화·드라마 편집": "Film & drama editing",
  "영화 〈추격자〉·〈황해〉·〈거북이 달린다〉·〈기술자들〉 현장 편집": "On-set film editing: The Chaser, The Yellow Sea, Running Turtle and The Con Artists",
  "영화 〈백야행〉·〈화차〉·〈완득이〉·〈오늘의 연애〉 현장 편집": "On-set film editing: White Night, Helpless, Punch and Love Forecast",
  "OCN 〈트랩〉·〈번외수사〉 · JTBC 〈보좌관〉 시즌 1·2 편집": "Drama editing: OCN Trap and Team Bulldog: Off-Duty Investigation; JTBC Chief of Staff seasons 1 and 2",
  "KBS 〈붉은 단심〉 · SBS 〈국민사형투표〉 편집": "Drama editing: KBS Bloody Heart and SBS The Killing Vote",
  "차하나": "Cha Ha-na",
  "라이브·미디어 콘텐츠 PD": "Live & media content producer",
  "춘천애니메이션박물관·국립중앙도서관·화성어린이문화센터 등 국공립 전시시설 20곳 이상 미디어 기술 콘텐츠 기획·제작": "Media technology content for 20+ public exhibition venues, including Chuncheon Animation Museum, National Library of Korea and Hwaseong Children’s Culture Center",
  "반려다움·슬룸·헤드스파7·인스탁스·SK매직·삼성 TV 등 50개 이상 브랜드 라이브커머스 총괄 PD": "Lead live commerce producer for 50+ brands, including Banryeodaum, Sloom, Head Spa 7, Instax, SK Magic and Samsung TV",
  "채널A 〈지붕 위의 막걸리〉 · JTBC 〈취향존중 리얼라이프 – 취존생활〉 · TV조선 〈코리아헌터〉 PD": "Entertainment producer: Channel A Makgeolli on the Roof, JTBC Chwijon Life and TV Chosun Korea Hunter",
  // ── 브랜드 · 내비게이션 · 공통 ───────────────────────────────
  "주식회사 큐브베리": "CUBEBERRY Inc.",
  "㈜큐브베리": "CUBEBERRY Inc.",
  "회사소개": "Company",
  "스튜디오": "Studio",
  "엑스콘다": "XCONDA",
  "문의": "Contact",
  // 콘텐츠 탭 (2026-10-14 — 긴 페이지를 네 탭으로 나눠 보기)
  "콘텐츠 탭": "Content tabs",
  "현재 탭: {tab}": "Current tab: {tab}",
  "XCONDA 시작하기": "Get started with XCONDA",
  "XCONDA 시작하기 ↗": "Get started with XCONDA ↗",
  "본문으로 바로가기": "Skip to content",
  "주 메뉴": "Main menu",
  "모바일 메뉴": "Mobile menu",
  "메뉴 열기": "Open menu",
  "메뉴 닫기": "Close menu",
  "언어": "Language",
  "언어 선택": "Select language",

  // ── 히어로 ──────────────────────────────────────────────────
  "방송 전문가들이 이끄는 AI 콘텐츠 기업입니다. 우리가 직접 쓰는 도구를 만들고, 그 도구로 지상파에 방영되는 작품을 만듭니다.":
    "We are an AI content company led by broadcast professionals. We build the tools we use ourselves — and use them to make work that airs on terrestrial television.",
  "IR · 취재 · 제휴 문의": "IR · Press · Partnership",
  "IR · 취재 문의": "IR · Press inquiry",
  "프로젝트 상담하기": "Discuss a project",
  "우리가 만든 작품 {count}편": "Our work · {count} titles",
  "주요 이력 보기 {count}건": "View selected credits · {count}",
  "포트폴리오 →": "Portfolio →",
  "작품 더 보기": "Load more projects",
  "{brand} 홈으로": "{brand} home",
  "{name} {price} 자세히 보기": "{name} {price} — see details",
  "〈한국전쟁 이동외상센터〉 스틸": "〈Korean War Mobile Trauma Center〉 still",
  "〈콜드사이트〉 스틸": "〈Cold Site〉 still",
  "〈TV동화 행복한 세상〉 리메이크 스틸": "〈TV Fairy Tales: A Happy World〉 remake still",
  "〈디비전 제로〉 스틸": "〈Division Zero〉 still",
  "〈이상한 나라의 이엘〉 스틸": "〈EL in Wonderland〉 still",
  "〈토이팜〉 스틸": "〈Toy Palm〉 still",

  // ── 숫자 요약 ───────────────────────────────────────────────
  "숫자 요약": "Key numbers",
  " 건": " patents",
  " 편": " titles",
  " 곳": " partners",
  "특허 등록 · 가출원 자료 1건 별도": "Patents registered · 1 provisional application document",
  "KIPO 특허증 기준": "Per KIPO patent certificates",
  "KBS 지상파 방영작": "KBS terrestrial broadcasts",
  "2026 공사창립 대기획 〈성물〉 · 2025 6.25 특집, 어린이날 특집":
    "2026 KBS founding special 〈Seongmul〉 · 2025 Korean War and Children's Day specials",
  "KOCCA 콘텐츠랩 AI 웹드라마": "KOCCA Content Lab AI web dramas",
  "2026 · 현역 감독 4팀": "2026 · four working director teams",
  "해외 업무협약 · 2026": "Overseas partnerships · 2026",
  "싱가포르 2 · 홍콩 1 · 중국 3": "Singapore 2 · Hong Kong 1 · China 3",

  // ── 두 섹터 ─────────────────────────────────────────────────
  "만드는 팀과, 만드는 도구": "The team that makes, and the tool it makes with",
  "큐브베리 스튜디오": "CUBEBERRY Studio",
  "기획부터 유통까지, 방영 가능한 완성도로 한 팀이 끝까지 만듭니다.":
    "From planning to distribution — one team carries a project all the way to broadcast quality.",
  "작품과 팀 보기 →": "See the work and the team →",
  "컷이 바뀌어도 공간과 인물이 무너지지 않는 롱폼 AI 영상 플랫폼.":
    "A long-form AI video platform where spaces and characters hold together across every cut.",
  "플랫폼 보기 →": "See the platform →",

  // ── WHAT WE DO ──────────────────────────────────────────────
  "방송과 AI,\n스튜디오와 IP": "Broadcast and AI,\nstudio and IP",
  "방송": "Broadcast",
  "KBS 출신 PD와 지상파 전 채널 집필 작가진, 현업 드라마 감독이 기획과 서사를 맡습니다.":
    "Producers from KBS, writers who have worked across every terrestrial channel, and working drama directors lead the planning and the story.",
  "AI 기술 · XCONDA": "AI technology · XCONDA",
  "컷이 바뀌어도 공간과 인물이 유지되는 롱폼 AI 영상 플랫폼을 직접 개발하고 운영합니다.":
    "We build and run our own long-form AI video platform that keeps spaces and characters consistent across cuts.",
  "제작 스튜디오": "Production studio",
  "기획부터 스토리, 생성, 편집, 후반, 유통까지 한 팀이 끝까지 책임집니다.":
    "One team owns it end to end — planning, story, generation, editing, post and distribution.",
  "오리지널 IP": "Original IP",
  "〈전설의 고향〉 REBOOT, 〈토이팜〉 등 자체 세계관을 시즌제와 다국어로 확장합니다.":
    "We expand our own worlds — 〈Legend of the Hometown〉 REBOOT, 〈Toy Palm〉 and more — into seasons and multiple languages.",

  // ── 대표 ────────────────────────────────────────────────────
  "“방송 현장에서 28년간 지켜온 단 하나의 원칙은 결과물에 대한 무한 책임입니다.”":
    "“One principle has guided my 28 years on broadcast sets: total accountability for the result.”",
  "이진서 · 큐브베리 대표이사": "Lee Jin-seo · CEO, CUBEBERRY",
  "前 KBS 드라마 PD(1995~2023). 큐브베리를 설립해 XCONDA AI 제작 파이프라인을 설계하고 콘텐츠 제작을 총괄합니다. 〈전설의 고향: 구미호〉를 연출했습니다.":
    "Former KBS drama PD (1995–2023). He founded CUBEBERRY, designed the XCONDA AI production pipeline and oversees all content production. He directed 〈Legend of the Hometown: Gumiho〉.",
  "협회": "Association",
  "한국AI콘텐츠크리에이터협회 부회장": "Vice President, Korea AI Content Creators Association",
  "수상": "Awards",
  "AI 미디어 융합기술 공모전 우수상(과기정통부·RAPA, 단체) · 경기도지사 표창": "Excellence Award (team), AI Media Convergence Technology Competition (MSIT / RAPA); Gyeonggi Governor’s Commendation",
  "미디어 융합기술 공모전 우수상(과기정통부·RAPA, 단체) · 경기도지사 표창":
    "Excellence Award, Media Convergence Technology Competition (MSIT · RAPA, team) · Gyeonggi Province Governor's Commendation",
  "특허": "Patents",
  "등록 특허 발명자": "Inventor on registered patents",
  "이진서": "Lee Jin-seo",
  "{name} 대표 프로필 사진": "Portrait of {name}, CEO",

  // ── 연혁 ────────────────────────────────────────────────────
  "HISTORY · 기록": "HISTORY · MILESTONES",
  "연혁": "Milestones",
  "연도 선택": "Filter by year",
  "전체": "All",
  "{count}건 표시 중": "{count} entries shown",
  "ACE Fair 2026에서 홍콩·중국 기업 4곳과 업무협약 체결":
    "Signed MOUs with four Hong Kong and Chinese companies at ACE Fair 2026",
  "특허 등록 · 온톨로지 제약 기반 시퀀스형 콘텐츠 생성 기법":
    "Patent registered · sequence content generation using ontology-constrained verification",
  "특허 등록 · 물리 시뮬레이션 데이터 역산 기반 생성형 AI 콘텐츠 다중 검증·자동 보정 시스템":
    "Patent registered · multi-verification and auto-correction system for generative AI content based on inverse physics-simulation data",
  "싱가포르 Lights & Shadows, Codomo와 업무협약(MOU) 2건 체결 · Codomo 자체 IP 〈Potato Pirates〉 롱폼 애니메이션 제작 협력":
    "Signed two MOUs with Singapore's Lights & Shadows and Codomo · co-producing the long-form animation 〈Potato Pirates〉 based on Codomo's own IP",
  "XCONDA 베타 서비스 출시": "XCONDA beta released",
  "KBS 공사창립 대기획 4부작 다큐멘터리 〈성물〉 AI 파트 제작·방영":
    "Produced and aired the AI segments of 〈Seongmul〉, KBS's four-part founding-anniversary documentary",
  "XCONDA MVP 출시": "XCONDA MVP released",
  "한국콘텐츠진흥원 뉴미디어 신기술 콘텐츠랩 운영기관 선정":
    "Selected to operate the KOCCA New Media Technology Content Lab",
  "특허 출원 · 온톨로지 제약 기반 시퀀스형 콘텐츠 생성 기법":
    "Patent filed · sequence content generation using ontology-constrained verification",
  "KBS 6.25 특집 다큐 〈한국전쟁 이동외상센터〉 AI 파트 제작·방영":
    "Produced and aired the AI segments of 〈Korean War Mobile Trauma Center〉, KBS's Korean War special documentary",
  "AI 애니메이션 〈전설의 고향-구미호〉 KBS1 어린이날 특집 방영":
    "AI animation 〈Legend of the Hometown – Gumiho〉 aired as a KBS1 Children's Day special",
  "벤처기업 인증": "Certified venture company",
  "주식회사 큐브베리 설립": "CUBEBERRY Inc. founded",

  // ── 특허 ────────────────────────────────────────────────────
  "기술 · 특허": "Technology · Patents",
  "증빙은 문서의 첫 페이지이며, 개인정보 보호를 위해 일부 내용을 가렸습니다.": "The evidence shows the first page of each document; some details have been redacted for privacy.",
  "{title} 증빙 이미지 크게 보기": "View the evidence image for {title} at full size",
  "이미지 크게 보기": "View full image",
  "등록": "Registered",
  "출원": "Filed",
  "가출원": "Provisional application",
  "가출원서": "Provisional application document",
  "서류 표기일": "Document date",
  "물리 시뮬레이션 데이터의 역산을 이용한 생성형 인공지능 콘텐츠의 다중 검증 및 자동 보정 시스템":
    "System for multi-verification and auto-correction of generative AI content using inversion of physics-simulation data",
  "온톨로지 제약 기반 위반 검증 및 상태 전이 전파를 이용한 시퀀스형 콘텐츠 생성 기법":
    "Method for generating sequential content using ontology-constrained violation checks and state-transition propagation",
  "인공지능 기반 커플 매칭 시스템": "AI-based couple matching system",
  "인공지능을 활용한 동영상의 다자 립싱크 더빙 시스템 및 방법":
    "Multi-character lip-sync dubbing system and method for videos using artificial intelligence",
  "2D 영상 내 3D 요소 추출·삽입 기반 미디어 콘텐츠 제작 방법 및 시스템":
    "Method and system for producing media content by extracting and inserting 3D elements in 2D video",

  // ── XCONDA · AI LAB ─────────────────────────────────────────
  "AI를 단순 생성 버튼으로\n쓰지 않습니다": "We don't use AI as\njust a generate button",
  "기획·공간·캐릭터·동선·편집을 하나의 제작 흐름으로 연결해, 결과를 예측하고 수정할 수 있게 설계합니다. XCONDA는 큐브베리의 올인원 AI 영상 제작 플랫폼으로, 14개 이상의 AI 모델을 하나의 흐름으로 연결합니다.":
    "We connect planning, space, characters, blocking and editing into a single production flow, so results can be predicted and revised. XCONDA is CUBEBERRY's all-in-one AI video platform, linking 14+ AI models into one pipeline.",
  "홀로그램 스토리보드 앞에서 연출하는 감독": "A director at work in front of a holographic storyboard",
  "시나리오와 참고 이미지를 9컷 보드로 구조화하고, 필요한 컷만 선택해 다시 생성합니다.":
    "Scripts and references are structured into a 9-cut board, and only the cuts you need are regenerated.",
  "전체를 버리지 않고 연출 의도를 유지합니다. 각 컷의 앵글·무드·타이밍을 설정하고, 원하는 프레임을 그대로 구현합니다.":
    "You keep your directorial intent instead of starting over. Set the angle, mood and timing of each cut and get the frames you asked for.",

  // ── 포트폴리오 (기본 작품) ───────────────────────────────────
  "결과물로 증명하는\n제작 역량": "Production capability,\nproven by the work",
  "기업 홍보영상부터 브랜드 필름, 광고, AI 콘텐츠까지. 실제 프로젝트의 기획 의도와 제작 범위를 함께 확인해보세요.":
    "Corporate films, brand films, commercials and AI content — see the intent and the scope behind each project.",
  "{title} 영상 보기": "Watch {title}",
  "{title} 새 창에서 보기": "Open {title} in a new window",
  "드라이브 영상 목록을 불러오는 중입니다.": "Loading videos from Google Drive.",
  "드라이브 영상 목록을 불러올 수 없습니다.": "The Google Drive video list could not be loaded.",
  "공개된 드라이브 영상이 없습니다.": "There are no publicly shared Drive videos.",
  "Google Drive에서 이 영상을 재생합니다.": "This video plays from Google Drive.",
  "Google Drive에서 영상 열기": "Open video in Google Drive",
  "닫기": "Close",
  "광고": "Commercial",
  "숏폼": "Short-form",
  "애니메이션": "Animation",
  "영화": "Film",
  "웹드라마": "Web drama",
  "기업": "Corporate",
  "브랜드": "Brand",
  "유튜브": "YouTube",
  "인터뷰": "Interview",
  "모션": "Motion",
  "현대건설 기업 홍보 영상": "Hyundai E&C Corporate Film",
  "미래 스마트시티를 배경으로 현대건설의 기술력과 성장 비전을 담았습니다. 실사 촬영과 CG를 활용해 인류의 미래를 하이테크하고 세련된 비주얼로 구현했습니다.":
    "Set in a future smart city, this film captures Hyundai E&C's engineering and its growth vision, using live-action footage and CG for a high-tech, refined look.",
  "유네코 기업 홍보 영상": "UNECO Corporate Film",
  "철강 부산물 슬래그를 SAT 특허기술로 재활용한 친환경 소재 PS Ball의 가치와 기술력을 담았습니다. 실사 촬영과 생성형 AI를 결합한 기업 홍보 영상입니다.":
    "A corporate film combining live-action footage with generative AI to show the value of PS Ball, an eco-friendly material that recycles steel slag through UNECO's patented SAT technology.",
  "LS전선 기업 홍보 영상": "LS Cable & System Corporate Film",
  "EV 모터용 희토류 영구자석 소재의 정제·금속화·자성화 공정을 모션그래픽으로 시각화해 고효율·고출력·내열성의 가치를 전달했습니다.":
    "Motion graphics visualise the refining, metallisation and magnetisation of rare-earth permanent magnets for EV motors, conveying high efficiency, high output and heat resistance.",
  "비치오네 AI 브랜드 필름": "Bicione AI Brand Film",
  "주얼리 브랜드 비치오네의 공식 브랜드 필름입니다. 생성형 AI로 브랜드의 감성과 메시지를 담았습니다.":
    "The official brand film for jewellery house Bicione, carrying the brand's feeling and message through generative AI.",
  "주얼리 브랜드 비치오네의 공식 브랜드 필름입니다. 바람에 흩날리는 머릿결과 조개 속 다이아몬드 반지를 생성형 AI로 구현해 브랜드의 감성과 메시지를 새로운 비주얼 언어로 담았습니다.":
    "The official brand film for jewellery house Bicione. Hair drifting in the wind and a diamond ring inside a shell were created with generative AI, telling the brand's story in a new visual language.",
  "지메틱 AI 브랜드 필름": "Siematic AI Brand Film",
  "1929년 독일 뢰네에서 시작된 하이엔드 주방가구 브랜드 지메틱의 히스토리를 담았습니다.":
    "The story of Siematic, the high-end kitchen furniture brand founded in 1929 in Röne, Germany.",
  "1929년 독일 뢰네에서 시작된 하이엔드 주방가구 브랜드 지메틱의 히스토리를 담았습니다. 생성형 AI로 구현한 브랜드 역사와 디자이너의 스케치에 제품 실사 촬영을 결합했습니다.":
    "The story of Siematic, the high-end kitchen furniture brand founded in 1929 in Röne, Germany — AI-generated brand history and designer sketches combined with live-action product photography.",
  "셀렉스 릴렉스 샷 윤가이편": "Sellect Relax Shot — Youn Gai",
  "직장인의 스트레스 상황을 코믹하게 그리고 릴렉스 샷으로 해소되는 과정을 위트 있게 담았습니다.":
    "A witty take on workplace stress and how a Relax Shot melts it away.",
  "직장인의 스트레스 상황을 코믹하게 그리고 릴렉스 샷으로 해소되는 과정을 위트 있는 스토리텔링으로 담은 바이럴 광고입니다.":
    "A viral commercial that tells the story of workplace stress — and the relief a Relax Shot brings — with a light touch.",
  "빈센트 의원 인터뷰": "Vincent Clinic Interview",
  "25년간 타투이스트와 의사를 겸업해온 조명신 대표원장의 철학과 진료 현장을 담았습니다.":
    "We captured the philosophy and practice of director Jo Myung-shin, who has worked as both tattoo artist and physician for 25 years.",
  "25년간 타투이스트와 의사를 겸업해온 조명신 대표원장의 철학과 진료 현장을 담아 빈센트 의원의 전문성과 이야기를 진솔하게 전달했습니다.":
    "We captured the philosophy and clinical practice of director Jo Myung-shin — 25 years as both tattoo artist and physician — conveying Vincent Clinic's expertise and story honestly.",
  "한화 에어로스페이스 항공엔진 비전": "Hanwha Aerospace Aero Engine Vision",
  "한화 에어로스페이스 항공엔진 비전 영상": "Hanwha Aerospace Aero Engine Vision Film",
  "전투기 엔진 독자개발부터 소재 국산화, 글로벌 방산수출까지 이어지는 항공엔진 비전을 담았습니다.":
    "The vision for aero engines, from independent fighter-engine development to localised materials and global defence exports.",
  "전투기 엔진 독자개발부터 소재 국산화, 글로벌 방산수출까지 이어지는 항공엔진 비전을 담았습니다. 원본 영상에 스캔라인과 글리치 그래픽을 더해 긴장감 있는 톤으로 편집했습니다.":
    "The vision for aero engines, from independent fighter-engine development to localised materials and global defence exports — edited with scan lines and glitch graphics for a tense tone.",
  "현대 ACT EXPO 인터뷰": "Hyundai ACT EXPO Interview",
  "북미 최대 친환경 상용차 전시회 ACT EXPO에서 현대차 수소전기트럭의 기술적 강점을 담았습니다.":
    "At ACT EXPO, North America's largest eco-friendly commercial vehicle show, we filmed the technical strengths of Hyundai's hydrogen fuel-cell truck.",
  "북미 최대 친환경 상용차 전시회 ACT EXPO에서 현대자동차 수소전기트럭 XCIENT를 직접 시승한 현장의 반응과 기술적 강점을 담았습니다.":
    "At ACT EXPO we filmed reactions and technical strengths around a test drive of Hyundai's hydrogen fuel-cell truck, the XCIENT.",
  "모션그래픽 쇼릴": "Motion Graphics Showreel",
  "기업 홍보영상과 광고에 작업한 모션그래픽 장면을 한 편의 쇼릴로 구성했습니다.":
    "Motion graphics created for corporate films and commercials, cut together into a single showreel.",
  "기업 홍보영상과 광고에 작업한 모션그래픽 장면을 한 편의 쇼릴로 구성했습니다. 타이포그래피, 그래픽 애니메이션, 2D·3D 모션을 담았습니다.":
    "Motion graphics from corporate films and commercials, cut into a single showreel covering typography, graphic animation and 2D·3D motion.",
  "2025 고잉 세븐틴 오프닝": "2025 Going Seventeen Opening",
  "2025 고잉 세븐틴 오프닝 타이틀 시퀀스": "2025 Going Seventeen Opening Title Sequence",
  "13명의 다양한 분야 작가들과 협업해 고잉 세븐틴 로고를 로고 플레이 콘셉트로 제작했습니다.":
    "We worked with thirteen artists from different fields to build the Going Seventeen logo as a logo-play concept.",
  "13명의 다양한 분야 작가들과 협업해 고잉 세븐틴 로고를 로고 플레이 콘셉트로 제작했습니다. 유화·자수·일러스트 등 서로 다른 화풍으로 하나의 로고를 재해석했습니다.":
    "Thirteen artists from different fields reinterpreted one logo through oil painting, embroidery and illustration as a logo-play concept.",
  "CJ대한통운 사업 소개 영상": "CJ Logistics Business Introduction",
  "CJ대한통운이 새롭게 추진하는 4가지 대표 신사업을 소개합니다.":
    "An introduction to the four new flagship businesses CJ Logistics is pursuing.",
  "CJ대한통운이 새롭게 추진하는 4가지 대표 신사업을 소개합니다. 실사 촬영에 라인아트 모션그래픽, 3D 타이포와 제품 비주얼을 더해 스마트 물류를 표현했습니다.":
    "An introduction to the four new flagship businesses CJ Logistics is pursuing — live-action footage layered with line-art motion graphics, 3D typography and product visuals to express smart logistics.",

  // ── 포트폴리오 (운영 CMS 시드) ───────────────────────────────
  // IR_큐브베리_2026 덱에서 추가한 플래그십 IP (2026-10-12)
  "〈전설의 고향-구미호〉 KBS1 방영 · REBOOT": "Hometown of Legends: Gumiho — KBS1 Broadcast & REBOOT",
  "KBS1 어린이날 특집으로 방영된 AI 애니메이션. K-호러 원조 설화를 AI로 재해석해 REBOOT 티저·파일럿까지 완성했습니다.":
    "AI animation aired in KBS1's Children's Day special — a classic K-horror folktale reimagined with AI, completed through the REBOOT teaser and pilot.",
  "경기문화재단": "Gyeonggi Culture Foundation",
  "경기문화재단, 장편 AI 애니메이션, 수행 중": "Gyeonggi Culture Foundation, feature-length AI animation, in production",
  "장편 AI 애니메이션": "Feature-length AI animation",
  "수행 중": "In production",
  "KBS1 방영": "Aired on KBS1",
  "KBS1 방영, 국내 최초 AI 활용, 시즌제 기획": "Aired on KBS1, first AI use in Korean broadcast animation, season-format series",
  "국내 최초 AI 활용": "First AI use in Korean broadcast animation",
  "시즌제 기획": "Season-format series",
  "AI엑스콘다광고": "AI XCONDA Ad",
  "AI XCONDA 광고 · AI 광고 / 브랜드 필름": "AI XCONDA commercial · AI ad / brand film",
  "미국광고_세로숏폼": "US_ad_vertical",
  "미국광고_세로숏폼_9x16.mp4": "US_ad_vertical_9x16.mp4",
  "미국 광고 세로 숏폼 · 9:16 광고 / Short-form": "US vertical short-form · 9:16 commercial / short-form",
  "애니메이션_토이팜": "Toy_Palm_Animation",
  "애니메이션 토이팜 · 애니메이션 / 캐릭터 콘텐츠": "Toy Palm animation · animation / character content",
  "이엘_웹드라마_트레일러": "EL_web_drama_trailer",
  "이엘 웹드라마 트레일러 · 웹드라마 / Trailer": "EL web drama trailer · web drama / trailer",
  "천년의사랑_웹드라마": "Thousand_Year_Love_web_drama",
  "천년의 사랑 웹드라마 · AI 웹드라마 / Series": "Thousand-Year Love web drama · AI web drama / series",
  "콜드사이트_트레일러": "Cold_Site_trailer",
  "콜드사이트 트레일러 · AI 영화 / Trailer": "Cold Site trailer · AI film / trailer",
  "턴_광고": "TURN_Ad",
  "TURN 광고 · XCONDA / AI 광고": "TURN commercial · XCONDA / AI ad",
  "CJ대한통운 오네 시리즈 — 새벽": "CJ Logistics ONE Series — Dawn",
  "“새벽에도 오네?” CJ대한통운의 새벽 배송 서비스 오네(ONE)를 소개합니다. 달이 뜬 고요한 방과 배송지 검색 화면으로 서비스의 흐름을 표현했습니다.":
    "“ONE, even at dawn?” An introduction to ONE, CJ Logistics' early-morning delivery service, expressed through a quiet moonlit room and a delivery-address search screen.",
  "CJ대한통운 오네 시리즈 — 일요일": "CJ Logistics ONE Series — Sunday",
  "“주말에도 오네?” CJ대한통운의 일요일 배송 서비스 오네(ONE)를 소개합니다. 캘린더를 짚는 손끝과 떠오르는 택배 박스로 핵심 메시지를 담았습니다.":
    "“ONE, even on weekends?” An introduction to ONE, CJ Logistics' Sunday delivery service, built around fingertips on a calendar and parcels rising into view.",
  "CJ대한통운 자원 선순환": "CJ Logistics Circular Resources",
  "기후위기와 온실가스 문제에서 출발한 CJ대한통운의 자원 선순환 ESG 프로젝트입니다. 폐기물을 선별하고 순환시키는 과정을 2D 모션그래픽으로 표현했습니다.":
    "A resource-circulation ESG project from CJ Logistics that began with the climate crisis and greenhouse gases — the sorting and recycling process visualised in 2D motion graphics.",
  "CJ대한통운 친환경 패키징": "CJ Logistics Eco Packaging",
  "과도한 포장재 사용 문제에서 출발해 친환경 스마트 패키징을 소개합니다. 비닐 완충재를 종이 완충재로, 테이프형 포장재를 친환경 소재로 바꾸는 과정을 표현했습니다.":
    "Starting from the problem of excess packaging, this film introduces eco-friendly smart packaging — plastic cushioning becoming paper, tape-based wrapping becoming eco materials.",
  "CJ대한통운 오토스토어": "CJ Logistics AutoStore",
  "CJ대한통운이 도입한 물류 로봇 시스템 오토스토어를 소개합니다. 그리드 보관 방식부터 로봇 피킹, 주문에서 출고까지의 흐름을 2D·3D 모션그래픽으로 구현했습니다.":
    "An introduction to AutoStore, the logistics robotics system CJ Logistics adopted — from grid storage to robotic picking and the flow from order to dispatch, in 2D·3D motion graphics.",
  "랭키닷컴 런칭 타이포 영상": "Ranky.com Launch Typography Film",
  "랭키닷컴 런칭을 앞두고 브랜드를 표현하는 키워드를 활용해 정체성을 타이포그래피로 풀어낸 2D·3D 모션그래픽입니다.":
    "Ahead of Ranky.com's launch, brand keywords were turned into typography — a 2D·3D motion graphics piece that spells out the identity.",
  "필립모리스 유해성을 줄인 산업 트렌드": "Philip Morris — Reduced-Harm Industry Trends",
  "유해성을 줄이는 기업들의 노력을 소개합니다. 제로 칼로리 탄산음료 등 산업 전반의 유해성 저감 트렌드를 타이포그래피로 풀어낸 모션그래픽입니다.":
    "A look at companies working to reduce harm — the industry-wide move toward reduced-risk products, from zero-calorie soft drinks on, expressed through typography.",
  "위더스애드 애니메이션 브랜드 필름": "Withers Ad Animation Brand Film",
  "광고주의 간절함이 불러낸 신비로운 존재라는 은유로 위더스애드의 가치와 방향성을 표현했습니다. 정보 과잉 시대의 해답을 일러스트 애니메이션과 실사 내러티브로 담았습니다.":
    "A metaphor — a wondrous being summoned by a client's earnestness — expresses Withers Ad's values and direction, answering the age of information overload with illustrated animation and live-action narrative.",
  "리니지 M 백월": "Lineage M Backwall",
  "리니지 M 세트장 백월에 라이브 송출된 영상입니다. 정적인 일러스트에 구름과 빛, 인물의 미세한 움직임과 각종 효과를 더해 살아있는 배경 모션그래픽으로 완성했습니다.":
    "Footage streamed live onto the back wall of the Lineage M set. Subtle character movement, clouds, light and effects bring a static illustration to life as background motion graphics.",
  "미국 광고 RERE": "US Ad RERE",
  "첨부된 4K 광고 영상입니다. 포트폴리오에서 직접 재생해 영상의 톤과 편집 흐름을 확인할 수 있습니다.":
    "The 4K commercial attached here. Play it right in the portfolio to check the tone and editing flow.",

  // ── 팀 ──────────────────────────────────────────────────────
  "PD의 기획력과 모션그래퍼의\n크리에이티브가 만나는 팀": "Where a PD's planning meets\na motion designer's craft",
  "프로젝트 성격과 규모에 따라 PD·감독·모션·AI·후반 제작 인력을 최적 구성합니다. 방송·감독 이력은 프로젝트 제안 및 계약 범위에 맞춰 상세히 안내드립니다.":
    "We assemble the right mix of PDs, directors, motion, AI and post-production talent for each project. Broadcast and directing credits are shared in detail as part of proposals and contracts.",
  "프로젝트별로 PD·감독·모션·AI·후반 인력을 다시 짜서 구성합니다. 편성 일정과 예산 구간을 알려주시면 바로 견적으로 답합니다.":
    "For every project we re-assemble the mix of PDs, directors, motion, AI and post talent. Share your schedule and budget range and we'll come back with a quote.",
  "팀 구성 상담받기 →": "Talk through your team →",
  "{name} 프로필": "{name} portrait",
  "조민희 PD": "Cho Min-hee",
  "SBS 교양국 PD 출신": "Former SBS factual producer",
  "SBS 〈동물농장〉 PD": "Producer, SBS TV Animal Farm",
  "미샤·베스킨라빈스·하이트·코웨이 TVCF":
    "TV commercials for Misha, Baskin-Robbins, Hite and Coway",
  "에버랜드·국립과천과학관 실감콘텐츠 및 미디어아트 기획·연출":
    "Planned and directed immersive content and media art for Everland and Gwacheon National Science Museum",
  "공연·팬미팅·커머스 라이브 연출·송출": "Live directing and streaming for concerts, fan meetings and live commerce",
  "드라마·영화 DIT / ICA 수료": "DIT for drama and film; completed ICA program",
  "박인회": "Inhoe Park",
  "광고대행사 출신": "Formerly at an advertising agency",
  "르노코리아·MLB·컨버스·BC카드": "Renault Korea, MLB, Converse, BC Card",
  "CJ대한통운·NC소프트·현대": "CJ Logistics, NCSOFT, Hyundai",
  "캐롯·다이슨 브랜드 협업": "Brand collaborations with Carrot and Dyson",
  "대기업 계열 비딩 프로젝트 다수": "Numerous bidding projects for major corporate groups",
  "박찬혁 감독": "Park Chan-hyuk",
  "영상 연출 및 콘텐츠 디렉팅": "Video direction and content directing",
  "브랜드·광고·콘텐츠 프로젝트 협업": "Brand, advertising and content collaborations",
  "프로필 사진 제공": "Portrait photo provided",
  "CEO · ㈜큐브베리": "CEO · CUBEBERRY Inc.",
  "Lee Jin-seo · ㈜큐브베리 대표이사": "Lee Jin-seo · CEO, CUBEBERRY Inc.",
  "큐브베리 대표 / 전 KBS 드라마 PD": "CEO, CUBEBERRY / former KBS drama PD",
  "대표번호 070-8095-2302": "Office +82 70-8095-2302",
  "AI드라마크리에이터협회 이사": "Director, AI Drama Creators Association",
  "〈전설의 고향: 구미호〉 연출": "Directed 〈Legend of the Hometown: Gumiho〉",
  "AI 웹드라마·장편 AI 애니메이션 제작 파이프라인":
    "Production pipeline for AI web dramas and feature AI animation",
  "前 KBS 드라마 PD(1995~2023)": "Former KBS drama PD (1995–2023)",
  "큐브베리 설립 · XCONDA AI 제작 파이프라인 설계":
    "Founded CUBEBERRY · designed the XCONDA AI production pipeline",
  "프로젝트 감독·제작진": "Project directors & crew",
  "조민지 PD — KBS 〈한국전쟁 이동외상센터〉 연출":
    "Minji Cho, PD — directed KBS 〈Korean War Mobile Trauma Center〉",
  "방송·브랜드·기업 프로젝트별 전담 구성": "Dedicated crews for each broadcast, brand and corporate project",
  "기획 → 촬영 → 편집 → 모션그래픽 → 납품":
    "Planning → shooting → editing → motion graphics → delivery",

  // ── 상품 · 요금제 ───────────────────────────────────────────
  "AI 생성만으로 끝내지 않습니다": "AI generation is never the finish line",
  "기획부터 컷 편집, 후보정, 사운드까지 광고 영상의 전체 공정을 설계합니다. 목적과 컷 수에 맞는 구성으로 바로 상담하세요.":
    "We design the whole pipeline for a commercial — planning, cut editing, retouching and sound. Tell us your goal and cut count and we'll shape the package.",
  "숏폼 AI 광고": "Short-form AI ad",
  "브랜드 AI 광고": "Brand AI ad",
  "AI 풀 프로덕션": "AI full production",
  "기획·스크립트·생성·편집·자막": "Planning · script · generation · editing · subtitles",
  "기획 · 스크립트": "Planning · script",
  "AI 생성 · 편집": "AI generation · editing",
  "자막 · 사운드": "Subtitles · sound",
  "9:16 세로 포맷": "9:16 vertical format",
  "스토리보드·캐릭터 관리·AI 나레이션·사운드":
    "Storyboard · character consistency · AI narration · sound",
  "스토리보드 설계": "Storyboard design",
  "캐릭터 일관성 관리": "Character consistency",
  "AI 나레이션 · 사운드": "AI narration · sound",
  "9:16 + 16:9 납품": "9:16 + 16:9 delivery",
  "컨셉 2안·사운드 디자인·9:16 + 16:9": "Two concept options · sound design · 9:16 + 16:9",
  "컨셉 2안 제안": "Two concept options",
  "사운드 디자인": "Sound design",
  "후보정 · 색보정": "Retouching · colour grading",
  "전담 PM 운영": "Dedicated PM",
  "이 구성으로 상담하기": "Ask about this package",
  "* 표기 금액은 참고용 기본 구성입니다. 영상 길이·컷 수·캐릭터 수·연출 난이도에 따라 최종 견적이 달라질 수 있습니다.":
    "* Listed prices are reference starting points for the base package. Final quotes vary with length, cut count, number of characters and directorial complexity.",

  // ── 프로세스 · B2B ──────────────────────────────────────────
  "목표와 일정, 예산을 먼저\n정리하는 제작 구조":
    "A production structure that starts\nwith goals, schedule and budget",
  "피드백이 빠르게 반영될 수 있는 구조로 진행합니다.":
    "We work in a structure built for fast feedback loops.",
  "분석 · 기획": "Analysis · planning",
  "목표·니즈·예산·일정을 분석하고 기획안·스토리보드·스크립트를 작성합니다.":
    "We analyse goals, needs, budget and schedule, then write the proposal, storyboard and script.",
  "제작 · 촬영": "Production · shooting",
  "촬영 장비·인력 세팅과 현장 촬영·연출, 필요한 장면은 AI로 제작합니다.":
    "We set up equipment and crew, shoot and direct on location, and create the scenes that need AI.",
  "편집 · 후반": "Editing · post",
  "1차 편집·피드백 반영, 모션그래픽·CG·색보정·사운드 작업을 진행합니다.":
    "A first cut and feedback rounds, then motion graphics, CG, colour grading and sound.",
  "납품 · 최적화": "Delivery · optimisation",
  "최종 파일을 납품하고 플랫폼별 최적 포맷을 함께 제공합니다.":
    "We deliver the final files together with the best format for each platform.",
  "캠페인부터 IP 개발까지,\n규모에 맞는 전담 팀을 구성합니다":
    "From campaigns to IP development —\na dedicated team sized to the project",
  "캠페인, 월간 콘텐츠 운영, 기업 제휴, IP·웹드라마 개발까지 프로젝트 규모에 맞춰 별도 제작팀을 구성합니다.":
    "For campaigns, monthly content, corporate partnerships and IP or web drama development, we build a dedicated team around the scale of the project.",
  "월간 콘텐츠 운영": "Monthly content operations",
  "4~8편": "4–8 pieces",
  "브랜드 IP·웹드라마 개발": "Brand IP & web drama development",
  "시리즈 기획·제작": "Series planning · production",
  "기업 홍보·전시·세일즈 콘텐츠": "Corporate promo, exhibition and sales content",
  "맞춤 제작": "Bespoke production",
  "NDA·세금계산서·전담 PM": "NDA · tax invoice · dedicated PM",
  "안전한 계약": "Contract-ready",

  // ── FAQ ─────────────────────────────────────────────────────
  "자주 묻는 내용을 먼저 확인해보세요": "Start with the questions we hear most",
  "영상의 목적, 업로드 채널, 참고 레퍼런스, 희망 납기일을 알려주세요. 자료가 모두 준비되지 않아도 괜찮습니다.":
    "Tell us the goal, the channel, a reference or two and your deadline. It's fine if nothing is ready yet.",
  "문의 남기기 →": "Send an inquiry →",
  "큐브베리는 어떤 기업인가요?": "What kind of company is CUBEBERRY?",
  "방송 전문가들이 이끄는 AI 콘텐츠 기업입니다. KBS 출신 PD와 현업 감독이 기획·서사를 맡고, 자체 개발한 XCONDA AI 플랫폼으로 지상파에 방영되는 작품을 만듭니다.":
    "We are an AI content company led by broadcast professionals. KBS-trained producers and working directors lead planning and story, and we use our own XCONDA AI platform to make work that airs on terrestrial television.",
  "XCONDA는 어떤 플랫폼인가요?": "What is XCONDA?",
  "컷이 바뀌어도 공간과 인물이 유지되는 롱폼 AI 영상 플랫폼입니다. TURN·FLEXBOARD·BLOCKING BOARD로 공간·캐릭터·동선을 제작 단계에서 관리합니다.":
    "It's a long-form AI video platform where spaces and characters stay consistent from cut to cut. TURN, FLEXBOARD and BLOCKING BOARD manage space, characters and blocking during production.",
  "어떤 자료를 준비하면 상담이 빨라지나요?": "What should I prepare to speed up a consultation?",
  "영상 목적과 업로드 채널, 참고 영상 1~2개, 로고·제품 사진·컬러 가이드, 원하는 비율과 희망 납기일을 준비해주시면 좋습니다.":
    "The goal and the channel, one or two reference videos, your logo, product photos and colour guide, plus the aspect ratio and deadline you have in mind.",
  "상업적 이용과 NDA가 가능한가요?": "Can we use the result commercially, and do you sign NDAs?",
  "기업회원·세금계산서 발행·NDA 체결이 가능하며, 최종 제작물은 협의된 범위에서 상업적으로 이용할 수 있습니다.":
    "Yes — corporate accounts, tax invoices and NDAs are all available, and the final work can be used commercially within the agreed scope.",
  "실사 촬영 없이도 완성도 있는 영상이 가능한가요?":
    "Can you deliver a polished video without live-action shooting?",
  "가능합니다. 기획·콘티·이미지 및 영상 생성·컷 편집·후보정·사운드까지 전체 공정으로 진행하며, 실제 제품은 필요에 따라 별도 합성합니다.":
    "Yes. We run the full pipeline — planning, storyboards, image and video generation, cut editing, retouching and sound — and composite real products in when needed.",
  "AI 영상에서 인물과 공간이 계속 바뀌지 않나요?":
    "Won't characters and spaces keep changing in AI video?",
  "큐브베리는 XCONDA의 Turn, FlexBoard, Blocking Board를 활용해 공간·캐릭터·동선을 제작 단계에서 관리합니다.":
    "CUBEBERRY uses XCONDA's TURN, FLEXBOARD and BLOCKING BOARD to manage space, characters and blocking during production.",

  // ── 문의 ────────────────────────────────────────────────────
  "문의 내용에 맞는 창구로 바로 연결됩니다. 회사소개서가 필요하시면 이 폼이나 메일로 요청만 남겨주세요.":
    "We'll put you through to the right desk. If you need our company deck, just ask through this form or by email.",
  "본사 · 광주": "HQ · Gwangju",
  "전남광주특별시 충장로 69-12, 2층": "2F, 69-12 Chungjang-ro, Gwangju, Korea",
  "지사 · 부천": "Office · Bucheon",
  "경기도 부천시 부천로198번길 18, 춘의테크노파크II":
    "Chunui Techno Park II, 18 Bucheon-ro 198beon-gil, Bucheon, Gyeonggi-do, Korea",
  "상담 신청": "Request a consultation",
  "프로젝트 정보를 간단히 남겨주시면 맞춤 제안을 드립니다.":
    "Leave a few details about the project and we'll come back with a tailored proposal.",
  "회사 / 이름 *": "Company / name *",
  "큐브베리 / 홍길동": "CUBEBERRY / Jane Doe",
  "이메일 *": "Email *",
  "연락처": "Phone",
  "문의 내용 *": "Message *",
  "영상 목적, 업로드 채널, 참고 레퍼런스, 희망 납기일을 자유롭게 적어주세요.":
    "The goal, the channel, references and your deadline — in your own words.",
  "NDA 체결 · 세금계산서 발행 가능": "NDA and tax invoices available",
  "문의 보내기": "Send inquiry",
  "보내는 중…": "Sending…",
  "문의가 접수되었습니다": "Your inquiry has been received",
  "접수 번호 {code}": "Reference {code}",
  "담당자가 확인 후 영업일 기준 1일 내 회신드립니다. 급한 상담은 {phone}로 연락주세요.":
    "We'll reply within one business day. For anything urgent, call {phone}.",
  "추가 문의 작성": "Send another inquiry",
  "문의 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.":
    "Sending failed. Please try again in a moment.",
  "문의 전송에 실패했습니다. {email} 로 메일 주셔도 됩니다.":
    "Sending failed. You can also email us at {email}.",

  // ── 푸터 ────────────────────────────────────────────────────
  "{legal} · 대표 {ceo}": "{legal} · CEO {ceo}",
  "사업자등록번호 {bizNo}": "Business registration no. {bizNo}",
  "개요 · 리더십 · 연혁": "Overview · leadership · milestones",
  "기술·특허 · 뉴스": "Technology & patents · news",
  "포트폴리오 · 제작 프로세스": "Portfolio · production process",
  "오리지널 IP · 팀 · 제작 대행": "Original IP · team · production services",
  "TURN · 블로킹보드 · FLEXBOARD": "TURN · Blocking Board · FLEXBOARD",
  "요금제 · 파트너 · 가이드": "Pricing · partners · guides",
};

/**
 * 번역하지 않고 한국어 그대로 두는 문구.
 * (국문 브랜드 표기처럼 영어 화면에서도 그대로 써야 하는 것만 여기에 둡니다)
 */
export const koOnly: { text: string; reason: string }[] = [
  { text: "큐브베리", reason: "국문 브랜드 표기 — 영어 화면에서도 푸터·라벨에 그대로 유지" },
  {
    text: "랜딩 무료 상담",
    reason: "어드민 상담 목록의 분류 키(데이터 값) — 화면 문구가 아니라 번역하지 않음",
  },
];

/**
 * 사전에 없는 새 문구도 자동으로 옮겨 주는 규칙.
 * 운영 CMS에서 금액·길이를 새로 입력해도 숫자와 단위가 영어로 바뀝니다.
 */
export const rules: { pattern: RegExp; replace: (match: RegExpMatchArray) => string }[] = [
  // 29만원~ / 149만원
  {
    pattern: /^(\d+(?:\.\d+)?)만원(\s*~)?$/,
    replace: (match) => {
      const won = Math.round(Number(match[1]) * 10000).toLocaleString("en-US");
      return match[2] ? `from ₩${won}` : `₩${won}`;
    },
  },
  // 15초 · 최대 5컷 / 20초 · 6컷 / 120초
  {
    pattern: /^(\d+)초(?: · (최대 )?(\d+)컷)?$/,
    replace: (match) => {
      const [, seconds, upTo, cuts] = match;
      if (!cuts) return `${seconds}s`;
      return `${seconds}s · ${upTo ? "up to " : ""}${cuts} cuts`;
    },
  },
  // 30분
  { pattern: /^(\d+)분$/, replace: (match) => `${match[1]} min` },
  // 3건 / 5편 / 2곳 / 4명
  {
    pattern: /^(\d+)\s*(건|편|곳|명|개)$/,
    replace: (match) => {
      const units: Record<string, string> = {
        건: " entries",
        편: " titles",
        곳: " locations",
        명: " people",
        개: " items",
      };
      return `${match[1]}${units[match[2]] ?? ""}`;
    },
  },
  // 제10-3002930호 / 제10-1754524호
  { pattern: /^제\s*([\d-]+)\s*호$/, replace: (match) => `No. ${match[1]}` },
  // 10-2026-0028285 (출원번호)
  {
    pattern: /^(\d{2}-\d{4}-\d{7})$/,
    replace: (match) => `Application no. ${match[1]}`,
  },
];

/** 언어별 문서 제목·설명 (브라우저 탭 · 검색 결과 · SNS 공유) */
export const meta = {
  ko: {
    title: "CUBEBERRY · 큐브베리 | Imagine Speaks, AI Completes.",
    description:
      "큐브베리(CUBEBERRY)는 방송 전문가들이 이끄는 AI 콘텐츠 기업입니다. 우리가 직접 쓰는 도구 XCONDA를 만들고, 그 도구로 지상파에 방영되는 작품을 만듭니다. 특허 등록, KBS 방영작, 해외 업무협약까지 — 만드는 팀과 만드는 도구를 함께 가진 회사.",
  },
  en: {
    title: "CUBEBERRY | Imagine Speaks, AI Completes.",
    description:
      "CUBEBERRY is an AI content company led by broadcast professionals. We build XCONDA, the tool we use ourselves, and use it to create work that airs on terrestrial television — registered patents, KBS broadcasts and overseas partnerships, with the team and the tool in one place.",
  },
};
