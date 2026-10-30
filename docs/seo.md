# SEO 정리 — 지금 되어 있는 것 / 남은 것

작성 2026-10-29 · 대상: 큐브베리 랜딩(`Landing_Cuberry`) · 정본 주소 **https://www.cuberry.kr/**
관련 문서: `docs/domain-setup.md`(도메인·DNS), `README.md`(랜딩·CMS·i18n)

---

## 0. TL;DR

| 구분 | 상태 |
| --- | --- |
| 색인 정본(도메인·canonical·hreflang·OG) | ✅ 완료 (2026-10-24) |
| `robots.txt` · `sitemap.xml` | ✅ 완료 · **2026-10-29 이미지 sitemap·소스 경로 차단 추가** |
| 구조화 데이터(JSON-LD) | ✅ 회사(Organization) → **2026-10-29 사이트·상품·FAQ·사업장 추가** |
| 색인 정책 메타(robots·max-image-preview) | ✅ 2026-10-29 추가 |
| JS 없는 크롤러용 정적 셸 | ✅ 있음 · **2026-10-29 화면과 값 일치(가격·특허·FAQ)** |
| 검색엔진 등록·사이트맵 제출 | ⬜ **남음 — 사람이 직접 해야 함**(3장) |
| 네이버·다음 수집 요청 | ⬜ 남음(3장) |
| 영문 정적 페이지 / `VideoObject` | ⬜ 선택 과제(4장) |

검증은 `npm run test:seo` 한 번으로 끝납니다(아래 5장).

---

## 1. 지금 색인이 되는 구조

```
https://www.cuberry.kr/            ← 국문 정본 (canonical = 자기 자신)
https://www.cuberry.kr/?lang=en    ← 영문 정본 (canonical = ?lang=en)
        /en/ · /kr/                ← 진입용 별칭(noindex + meta refresh) → 위 두 주소로 보냄
```

- 랜딩은 **단일 HTML(React 단일 파일)** 이고, 콘텐츠 탭은 패널을 `hidden` 으로 감출 뿐 DOM 에서 지우지 않습니다.
  → 탭을 켜지 않아도 회사소개·스튜디오·XCONDA·문의의 모든 문구가 크롤러에게 그대로 읽힙니다.
- `<noscript>` 안의 **정적 셸**은 JS 를 실행하지 않는 크롤러(네이버 예티 일부, 각종 미리보기 봇)를 위한 사본입니다.
  2026-10-29 이전에는 이 사본의 가격·특허 수가 화면보다 오래된 값(29만원·특허 3건)이었습니다 → 지금은 화면과 같은 값입니다.
- GitHub Pages 가 저장소를 루트로 배포하므로 `/landing/`·`/docs/`·`/test/` 같은 **소스 경로도 같은 도메인에서 열립니다.**
  canonical 이 `/` 라 중복 색인은 막히지만, 검색 결과에 섞이지 않도록 `robots.txt` 에서 한 번 더 막았습니다.

---

## 2. 이번에 추가한 것 (2026-10-29)

| 항목 | 위치 | 내용 |
| --- | --- | --- |
| 구조화 데이터 `@graph` | `landing/src/seo/structured-data.ts` + `landing/vite.config.ts` | `WebSite` · `ItemList`(사업장) · `OfferCatalog`(제작 상품 3종) · `FAQPage`(14문항). 빌드할 때 `content.ts` 값으로 생성되므로 **화면 가격/문구와 자동으로 일치** |
| Organization 보강 | `landing/index.html` | `@id`(다른 노드가 참조) · `address`(PostalAddress) · `contactPoint` · `vatID` · `knowsAbout` |
| 색인 정책 메타 | `landing/index.html` | `robots: index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1` + `googlebot` |
| 공유 카드 보강 | `landing/index.html` | `og:image:type`, `twitter:image:alt` |
| 로고·아이콘 | `images/logo-512.png` · `images/logo-180.png` (원본 `cuberry-mark.webp` 에서 변환) | 구글 지식 패널용 **정사각 PNG 로고**(가로 워드마크 대신) · 홈 화면 아이콘(`apple-touch-icon`) |
| 이미지 사이트맵 | `sitemap.xml` | `image:image` 확장 — 대표 이미지·히어로 스틸 4장(존재하는 파일만) |
| 소스 경로 차단 | `robots.txt` | `/landing/` · `/docs/` · `/test/` · `/scripts/` · `/server/` · `README.md` · `package.json` · `render*.yaml` |
| 회귀 테스트 | `test/seo.mjs` (`npm run test:seo`) | 96개 검사 — JSON-LD 파싱·노드 관계·가격 변환·FAQ 일치·정적 셸 동기화·sitemap 이미지 파일 존재·robots 규칙·아이콘 파일 존재 |

`test/seo.mjs` 는 **"화면에 보이는 값"과 "검색엔진이 읽는 값"이 같은지**를 봅니다.
예를 들어 `content.ts` 의 가격을 118만원 → 130만원으로 바꾸고 빌드를 하지 않으면, 또는 빌드는 했는데 정적 셸을 손대지 않으면 실패합니다.

---

## 3. 남은 작업 — 사람이 직접 해야 하는 것

코드로는 끝낼 수 없고, 계정 접근이 필요한 항목입니다. 위에서부터 순서대로 하면 됩니다.

| # | 할 일 | 어디서 | 확인 방법 |
| --- | --- | --- | --- |
| 1 | **Google Search Console** 에 `www.cuberry.kr` 속성 등록 | search.google.com/search-console | 도메인 속성은 DNS TXT 로 인증(`cuberry.kr` TXT 는 이미 있음 — **삭제 금지**). URL 접두어 속성은 GitHub Pages 파일 업로드로 인증 |
| 2 | **사이트맵 제출** `https://www.cuberry.kr/sitemap.xml` | Search Console → Sitemaps | 상태가 "성공"이고 검색된 URL 이 2개인지 |
| 3 | **네이버 서치어드바이저** 등록 + 사이트맵 제출 | searchadvisor.naver.com | 소유확인 메타를 넣어야 하면 `landing/index.html` `<head>` 에 `naver-site-verification` 한 줄 추가 후 `npm run build:landing` 커밋 |
| 4 | **다음 검색등록** (daum) | register.search.daum.net | 국문 정본 `/` 만 등록 |
| 5 | **리치 결과 테스트**로 구조화 데이터 확인 | search.google.com/test/rich-results | `FAQ` · `제품/서비스` · `조직` 항목이 "감지됨" 으로 뜨는지 |
| 6 | **PageSpeed Insights** 로 Core Web Vitals 측정 | pagespeed.web.dev | 모바일 LCP 2.5초 이내(히어로 스틸 `preload` + 단일 HTML 로 이미 최적화) |
| 6b | DNS 를 못 건드릴 때 — **URL 접두어 속성 + HTML 파일** 방식 | Search Console → URL 접두어 → HTML 파일 다운로드 | 아래 3-1 참고. 파일 이름을 알려주면 저장소 루트에 추가·배포까지 처리 |
| 7 | **구글 비즈니스 프로필·소셜 링크** 확보 후 `sameAs` 채우기 | — | `landing/index.html` 의 Organization `"sameAs": []` 에 유튜브·인스타·링크드인 주소를 넣으면 지식 패널 연결이 쉬워짐 |
| 8 | **구 사이트(`old.cuberry.kr`) 처리** | AWS | 주요 페이지에서 새 사이트의 대응 주소로 301. 전환 후 3개월은 유지 |

> 3번에서 소유확인 코드를 받으면 알려주세요 — 메타 태그 삽입은 이 저장소에서 바로 처리합니다.

### 3-1. DNS 없이 인증하는 방법 — URL 접두어 속성 + HTML 파일

DNS 담당자가 따로 있거나 Route 53 접근이 어려울 때 쓰는 방식입니다. **DNS 변경 없이 저장소 파일 한 개**로 인증합니다.

**절차**

1. Search Console → **속성 추가** → **URL 접두어** → `https://www.cuberry.kr/` 입력
2. 확인 방법에서 **HTML 파일** 선택 → 파일 **다운로드**(예: `google1a2b3c4d5e6f7a8b.html`)
3. 저장소 루트에 그 파일을 추가합니다(파일 이름·내용을 발급받은 그대로):
   ```bash
   npm run seo:verify -- google1a2b3c4d5e6f7a8b.html
   # 네이버: npm run seo:verify -- naver1a2b3c4d5e6f.html
   # 내용을 직접 받은 경우: npm run seo:verify -- <파일명> --content "발급받은 내용"
   ```
4. `npm run typecheck && npm test` → 커밋·푸시 (GitHub Pages 배포 1~2분)
5. `https://www.cuberry.kr/google1a2b3c4d5e6f7a8b.html` 이 200 으로 열리고 **내용이 한 줄**인지 확인
   — 2026-10-30 현재 저장소에 등록된 실제 파일: **`google0e3cdf27e024491d.html`** (`google-site-verification: google0e3cdf27e024491d.html`)
6. Search Console → **확인** → 이어서 **Sitemaps** 에 `sitemap.xml` 제출

**왜 파일만 올리면 되는가**

| 서빙 주체 | 어떻게 열리나 |
| --- | --- |
| GitHub Pages (www.cuberry.kr) | 저장소 루트를 그대로 배포하므로 파일을 커밋하면 끝 |
| Render API 서버 | `server/index.mjs` 가 화이트리스트(`google*.html`·`naver*.html`·`yandex_*.html`·`BingSiteAuth.xml`)에 해당하는 **루트 한 단계 파일**을 서빙한다 → 나중에 도메인을 Render 로 옮겨도 인증 유지 |

**안전장치** — `scripts/site-verification.mjs` 가 파일 이름을 정규식으로 제한합니다(슬래시·점 불가).
그래서 `npm run seo:verify` 로는 저장소 밖 파일을 만들 수 없고, 서버 라우트도 같은 규칙을 씁니다.
`test/seo.mjs`(이름 허용/거부·내용·경로 탈출)와 `test/server-wiring.mjs`(실제 HTTP 200·화이트리스트 밖 404)가 이를 고정합니다.

**알아둘 점**

- 인증 파일은 **삭제하지 마세요.** 지우면 Search Console 소유권이 풀립니다(재인증 필요).
- 속성은 `https://www.cuberry.kr/` 접두어 기준이라 **`/`·`/?lang=en` 은 포함**되지만, apex(`https://cuberry.kr/`)는 별도 속성입니다. DNS 인증이 가능해지면 도메인 속성으로 옮기는 편이 깔끔합니다(기존 인증 파일은 그대로 둬도 무해).

---

## 4. 남은 작업 — 코드로 더 할 수 있는 것 (선택)

| 항목 | 지금 상태 | 하면 좋은 점 | 비용 |
| --- | --- | --- | --- |
| 영문 정적 페이지 | `/?lang=en` 은 브라우저에서 문구가 바뀌지만 **HTML `<head>` 는 국문** | 영문 검색 유입(구글 .com) 확대 | 중 — `/en/` 을 별도 정적 페이지로 만들고 사이트맵·hreflang 을 그 주소로 전환 |
| `VideoObject` 구조화 데이터 | 없음 | 작품 영상이 검색 결과에 썸네일과 함께 노출 | 소 — 포트폴리오 중 공개 URL 이 있는 작품만 |
| 작품별 개별 URL | 앵커(`#works`) 하나 | 작품명 검색 유입 | 중 — CMS 포트폴리오를 `/works/{slug}` 로 |
| IndexNow / 네이버 수집 요청 자동화 | 없음 | 배포 직후 색인 반영 단축 | 소 — 빌드 후 스크립트 1개 |
| CMS 값과 구조화 데이터 연동 | 빌드 시점의 기본값 고정 | 어드민에서 가격을 바꾸면 JSON-LD 도 즉시 반영 | 소 — 런타임에 JSON-LD 재생성 |

---

## 5. 검증 방법

```bash
npm run test:seo        # 색인 정책·JSON-LD·정적 셸·사이트맵·robots·아이콘 (96건)
npm run test:domain     # canonical·hreflang·별칭 페이지·CNAME·DNS 파일 (66건)
npm test                # 전체 (위 두 개 포함)
npm run build:landing   # landing/ → 루트 index.html 갱신 후 **커밋**
```

배포 후 손으로 확인할 것:

1. `https://www.cuberry.kr/robots.txt` · `/sitemap.xml` 이 200 인지
2. 페이지 소스에서 `application/ld+json` 이 **2블록**(회사 + 그래프)인지
3. 카카오톡·슬랙에 링크를 붙였을 때 제목·설명·이미지가 나오는지
4. `?lang=en` 으로 열었을 때 제목·설명·`og:url` 이 영문 주소로 바뀌는지(브라우저 기준)
5. Search Console → 색인 생성 → "색인된 페이지 수"가 2개로 수렴하는지(별칭 `/en/`·`/kr/` 는 제외)
