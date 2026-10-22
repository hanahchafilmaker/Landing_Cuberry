# cuberry.kr · cubeberry.ai 도메인 연결 정리

작성 2026-10-14 · **2026-10-21 개정(커스텀 도메인 = `www.cuberry.kr`)** · 대상: 큐브베리 랜딩(`Landing_Cuberry`) · 문의: 대표님 지시사항 “도메인 연결 및 구조 정리”

> **2026-10-21 변경 사항** — AWS(DNS 담당)에서 **apex(`cuberry.kr`) 커스텀 도메인 등록이 안 된다**는 회신을 받았습니다.
> 그래서 GitHub Pages 커스텀 도메인을 **`www.cuberry.kr`(프로토콜 없이)** 로 확정하고, 이 저장소의 정본 주소도
> `https://www.cuberry.kr/` 로 맞췄습니다(canonical·OG·사이트맵·robots·hreflang). apex 는 **기존 AWS 레코드를 그대로 두면**
> 자동으로 `www.cuberry.kr` 로 301 됩니다(apex A 레코드를 GitHub Pages IP 로 바꿀 필요가 없습니다).

---

## 0. 결론 먼저 (TL;DR)

| 항목 | 결정/권장 | 비고 |
| --- | --- | --- |
| `www.cuberry.kr` (공식) | **이 저장소의 새 랜딩을 www 에 연결** — 화면은 GitHub Pages, API/어드민 데이터는 Render | 커스텀 도메인 입력값은 **`www.cuberry.kr`** (프로토콜 `https://` 없이). 무료·무중단·콜드스타트 없음 |
| `cuberry.kr` (apex) | 기존 AWS 자원(`3.39.143.82`, `54.116.236.216`)이 받아 `www.cuberry.kr` 로 301 | **apex 레코드는 건드리지 않음.** AWS 가 이미 apex→www 리다이렉트를 하고 있음 |
| 구 회사 사이트 | **`old.cuberry.kr` 로 보존** (2026-10-14 대표님 방침) | 기존 링크 유지. 자원에 별칭만 추가하면 됨 → `docs/domain/handoff-dns.md` 3-4 |
| 어드민 | `www.cuberry.kr/admin-v2` (같은 도메인, 비밀번호 보호 + noindex) | `admin.cuberry.kr` 로 분리도 가능 |
| `cubeberry.ai` | **안 A+B 결합 추천**: 영문 사이트가 필요하면 `301 → https://www.cuberry.kr/en/`, 별도 사이트를 유지할 거면 지금 그대로 둠 | 4장 참고 |
| 하지 말 것 | `/kr`, `/us` 를 **두 도메인에 나눠** 같은 내용을 두 벌 운영 | 검색엔진 중복 콘텐츠·운영비 2배. 언어는 “한 도메인 안 경로”로만 나눔 |

**중요** — 두 도메인 모두 DNS 가 **AWS Route 53** 이고, **MX(구글 워크스페이스) 메일이 살아 있습니다.**
레코드를 바꿀 때 **MX · TXT(google-site-verification)는 절대 건드리지 마세요.** 아래 3장은 **`www` CNAME 한 건만** 다룹니다.

---

## 1. 현재 상태 (2026-10-14 조사, 2026-10-21 갱신)

| 도메인 | DNS | A 레코드 | MX | 지금 서비스 중인 사이트 |
| --- | --- | --- | --- | --- |
| `cuberry.kr` | Route 53 (`ns-209/1033/931/1618.awsdns-*.…`) | `3.39.143.82`, `54.116.236.216` (AWS, apex→www 리다이렉트) | Google Workspace (`aspmx.l.google.com` 등) | **기존 회사 소개 사이트(AWS 호스팅)** |
| `cubeberry.ai` | Route 53 (`ns-1596/1013/328/1318.awsdns-*.…`) | `99.86.101.70/124/66/128` (**AWS CloudFront**) | Google Workspace (`smtp.google.com`) | **영문 제품 사이트(XCONDA 등)** |
| `hanahchafilmaker.github.io/Landing_Cuberry/` | — | — | — | **새 랜딩(작업본)** ← 이걸 `www.cuberry.kr` 로 옮깁니다 |
| `landing-cuberry-admin.onrender.com` | — | — | — | 새 랜딩 사본 + 어드민 + API(SQLite) |

- **GitHub Pages 커스텀 도메인은 아직 등록되어 있지 않습니다** — 2026-10-21 저장소 기준
  `gh api repos/hanahchafilmaker/Landing_Cuberry/pages` 의 `"cname": null`. 즉 “변경”이 아니라 **신규 등록**입니다.
- `cuberry.kr`·`cubeberry.ai` 어디에도 GitHub Pages 도메인 검증용 TXT(`_github-pages-challenge-…`) 는 **없습니다** → 3-3 에서 새로 추가하게 됩니다.
- 즉, **`cuberry.kr` 은 새로 사는 도메인이 아니라 “이미 구 사이트가 돌고 있는 도메인”** 입니다. 연결 = **교체(cutover)** 입니다.

### 교체 전에 반드시 확인할 것

1. 지금 `cuberry.kr` 을 서비스하는 **AWS 자원이 무엇인지**(EC2? S3+CloudFront? Amplify?)와 **관리자**가 누구인지. 교체 후에도 남겨두려면 `old.cuberry.kr` 같은 보존 주소를 그 자원에 붙여 주세요.
   ⚠️ 구 사이트는 지금 **`www` 에서 서비스 중**입니다. `www` 를 GitHub Pages 로 넘기는 순간 구 사이트는 공개 주소에서 사라지므로, **`old.cuberry.kr` 별칭을 먼저 붙이고** `www` CNAME 을 바꾸세요.
2. ~~구 사이트의 페이지 주소가 `/` 외에 더 있는지~~ — **2026-10-14 확인 완료: 구 사이트는 단일 페이지**입니다(회사소개·HISTORY·BUSINESS·CONTENTS·특허/파트너가 한 페이지 안 앵커 이동, 외부 링크는 `aiconda.ai`·`xconda.ai` 뿐). 따라서 하위 페이지 리다이렉트는 **불필요**합니다. 구 사이트 이미지(`www.cuberry.kr/images/…`)를 외부에서 직접 링크한 곳이 있다면 알려주세요.
3. 검색엔진 도구(Google Search Console)에서 `cuberry.kr` 속성이 등록되어 있는지 → 교체 후 새 `sitemap.xml` 을 제출하면 정리됩니다.

---

## 2. 목표 구조 (2026-10-21 확정)

```
www.cuberry.kr/                 → 새 랜딩 (한국어 정본)            [GitHub Pages · 커스텀 도메인]
www.cuberry.kr/en/              → /?lang=en (영문, 별칭→자동 이동)  [같은 파일]
www.cuberry.kr/admin-v2         → 콘텐츠 관리 화면(로그인 필요)      [정적 화면]
cuberry.kr                      → www.cuberry.kr 로 301            [기존 AWS 자원 — 레코드 그대로]
old.cuberry.kr                  → 구 회사 소개 사이트(보존)          [기존 AWS 자원 + 별칭 추가]
landing-cuberry-admin.onrender.com → /api/* (로그인·저장·문의)      [Render, SQLite]
cubeberry.ai                    → 유지 또는 301 → www.cuberry.kr/en/ [결정 필요]
```

**왜 지금 구조가 좋은가**

- **화면 = 정적(GitHub Pages)**: 전 세계 CDN, 무료, 콜드스타트 없음. 랜딩 방문자는 항상 즉시 뜹니다.
- **데이터 = Render API 한 곳**: 어드민에서 저장한 내용이 랜딩에 즉시 반영되고, 미러(Pages)·공식 도메인·Render 주소가 모두 같은 데이터를 봅니다.
- **DNS 변경이 `www` CNAME 한 건뿐**: apex 는 기존 AWS 리다이렉트를 그대로 쓰므로 apex A/AAAA 를 GitHub Pages IP 로 옮길 필요가 없습니다(= AWS 에서 apex 등록이 안 되는 제약을 그대로 수용).
- **도메인을 바꿔도 코드 수정이 필요 없음**: 새 랜딩은 API 주소를 소스에 굽고(운영 서버 주소), 도메인과 무관하게 상대경로만 씁니다. 그래서 `www.cuberry.kr` 로 옮겨도 화면·문의 폼·어드민이 그대로 동작합니다(아래 5장에서 CORS 만 추가했습니다).

**API 서버 주소(재배포가 필요한 유일한 항목)**

| 항목 | 값 | 바꾸려면 |
| --- | --- | --- |
| 화면이 호출하는 API 주소 | `https://landing-cuberry-admin.onrender.com` (`cms-bridge.js`·`admin/index.html` 의 `BAKED_API_ORIGIN`, `admin-v2/index.html` 의 `<meta name="cuberry-api-origin">`) | 값을 바꾸고 **정적 화면 재배포(GitHub Pages)** |
| 서버가 허용하는 Origin | `https://www.cuberry.kr`, `https://cuberry.kr`, `https://hanahchafilmaker.github.io` (`server/lib/config.mjs` 기본값 + `render.yaml`·`render.free.yaml`) | `ADMIN_ALLOWED_ORIGINS` 변경 후 **Render 재배포** |

- **지금 상태 그대로면 추가 작업이 없습니다.** `https://www.cuberry.kr` 은 이미 서버 기본 허용목록과 Blueprint 양쪽에 들어 있으므로,
  `www.cuberry.kr` 에서 열리는 화면이 Render API 를 그대로 호출합니다(재배포 없이 동작).
- 만약 AWS 쪽에서 `www.cuberry.kr/api/*` 를 Render 로 프록시해 **한 Origin 으로 묶고 싶다면**(CORS 제거), 그때
  위 `BAKED_API_ORIGIN`·`<meta name="cuberry-api-origin">` 값을 `https://www.cuberry.kr` 로 바꾸고 재배포하면 됩니다(작업 10분 + 재배포).

**언제 Render 를 공식 도메인으로?** 무료 플랜(`render.free.yaml`)은 15분 무요청 시 잠들어 첫 방문이 50초 걸립니다(마케팅 사이트에 부적합). 유료 구성(`render.yaml` — `plan: 0.5c-512mb` + 1GB 영구 디스크)으로 올려두었다면 `www.cuberry.kr` 을 Render 로 옮기는 선택도 좋습니다 — 이때는 **DNS 레코드 몇 줄만** 바꾸면 되고, 화면·어드민·API 가 한 Origin 이 되어 CORS 도 사라집니다. 다만 지금 권장안(GitHub Pages = 화면 / Render = API)이 방문자 체감 속도와 비용 면에서 가장 유리합니다.

---

## 3. `www.cuberry.kr` 연결 절차 (그대로 실행)

> 예상 소요 30~60분(대부분 DNS 전파 대기) · 다운타임 없음 · 실패 시 8장 롤백 참고

### 1) GitHub Pages 에 커스텀 도메인 등록 (DNS 보다 먼저!)

GitHub 문서 기준 **커스텀 도메인을 먼저 등록한 뒤 DNS 를 바꿉니다**(반대로 하면 서브도메인 탈취 위험).

- 저장소 → **Settings → Pages → Custom domain** 에 **`www.cuberry.kr`** 입력 → **Save**
  - ⚠️ **프로토콜 없이** 입력합니다: `www.cuberry.kr` (O) / `https://www.cuberry.kr` (X)
  - 이 순간 저장소 루트에 `CNAME` 파일이 커밋됩니다(= 교체 스위치 ON).
  - 같은 일을 하는 준비된 파일이 `docs/domain/CNAME` 에 있습니다(내용 한 줄 `www.cuberry.kr`).
    콘솔 대신 직접 켜려면: `cp docs/domain/CNAME CNAME && git add CNAME && git commit -m "www.cuberry.kr 커스텀 도메인" && git push origin main`
- 명령으로 하려면: `gh api -X PUT repos/hanahchafilmaker/Landing_Cuberry/pages -f cname=www.cuberry.kr`

> ⚠️ **부작용 꼭 확인** — 이 순간부터 `hanahchafilmaker.github.io/Landing_Cuberry/…` 는 `www.cuberry.kr/…` 로
> **리다이렉트**됩니다. DNS 가 아직 구 사이트를 가리키면 그 주소들은 구 사이트(또는 404)로 가게 됩니다.
> 즉 **미러 주소로 보던 화면·어드민 사본이 잠시 안 보입니다.** 그래서 1)과 2)를 **같은 시간에 연속으로** 하고,
> 그 사이에는 Render 주소(`https://landing-cuberry-admin.onrender.com/admin-v2`)로 어드민을 보세요.
> 되돌리려면 8장(롤백) — 즉시 원상복구됩니다.

### 2) Route 53 레코드 — **`www` CNAME 한 건만**

> 구 사이트 보존(`old.cuberry.kr`)은 별도 자원(CloudFront/S3/EC2) 작업이라 실행 문서 `docs/domain/handoff-dns.md` 3-4 에 정리했습니다.
> DNS 값을 넘겨줄 때 그 문서를 함께 전달하면 한 번에 끝납니다.

Route 53 → Hosted zones → `cuberry.kr` → **Create record** 로 아래를 넣습니다.

| 이름 | 유형 | 값 | TTL |
| --- | --- | --- | --- |
| `www` | **CNAME** | `hanahchafilmaker.github.io` | 300 |
| `cuberry.kr`(apex) | — | **변경 없음** (기존 A `3.39.143.82` / `54.116.236.216` 유지 → apex→www 301) | — |

- `www` 는 지금 A 레코드 2개로 되어 있습니다. **DNS 규칙상 CNAME 은 같은 이름의 다른 레코드와 공존할 수 없으므로**, 먼저 `www` 의 A 레코드를 삭제한 뒤 CNAME 을 만드세요.
- **apex A 레코드는 그대로 둡니다.** 기존 AWS 자원이 apex 요청을 `www` 로 301 하므로, apex 로 들어온 방문자는 그대로 새 랜딩에 도착합니다.
  (apex 를 GitHub Pages 로 직접 넘기려면 커스텀 도메인에도 apex 를 추가해야 하는데, AWS 에서 등록이 안 된다는 회신을 받아 이 방식은 쓰지 않습니다.)
- **MX · TXT 는 그대로 둡니다.** (메일·검색엔진 소유확인 유지)

**붙여넣기용 change batch** — `docs/domain/route53-cuberry-kr-change.json` (**www CNAME UPSERT 1건**):

```bash
# 1) 호스팅 영역 ID 확인
aws route53 list-hosted-zones --query "HostedZones[?Name=='cuberry.kr.'].[Id,Name]" --output table

# 2) 변경 적용 (www A 레코드가 남아 있으면 콘솔에서 먼저 삭제)
aws route53 change-resource-record-sets \
  --hosted-zone-id <Z1234ABCDEF> \
  --change-batch file://docs/domain/route53-cuberry-kr-change.json
```

### 3) 도메인 검증 TXT (GitHub 이 요구할 때)

도메인 검증은 **계정(프로필) Settings → Pages → Verified domains / Add a domain** 에서 합니다.
그 화면이 알려주는 **호스트 이름과 값을 그대로** Route 53 에 **TXT** 로 추가합니다.

| 등록할 도메인 | Route 53 Record name(존 이름이 자동 첨부됨) | 값 |
| --- | --- | --- |
| `www.cuberry.kr` | `_github-pages-challenge-hanahchafilmaker.www` | (GitHub 화면에 표시되는 토큰) |
| `cuberry.kr` (apex 로 검증하면 `www` 등 하위도메인까지 함께 보호됨) | `_github-pages-challenge-hanahchafilmaker` | (GitHub 화면에 표시되는 토큰) |

- ⚠️ 콘솔/CLI 가 존 이름을 자동으로 붙이는 경우가 많습니다. **전체 이름(`…www.cuberry.kr`)을 그대로 넣으면
  `_github-pages-challenge-….www.cuberry.kr.cuberry.kr` 처럼 중복되어 검증이 실패합니다.** GitHub 화면에 나온 값만 복사하세요.
- 확인: `dig +short TXT _github-pages-challenge-hanahchafilmaker.www.cuberry.kr`
- 이 레코드는 도메인 탈취 방지용이며 메일과 무관합니다(구글 사이트확인 TXT 와는 별개).

### 4) HTTPS 강제

DNS 가 퍼진 뒤(수 분~최대 24시간) Settings → Pages → **Enforce HTTPS** 체크.
인증서 발급 전에는 잠시 비활성 상태일 수 있습니다.

### 5) 확인

```bash
dig +short www.cuberry.kr CNAME    # hanahchafilmaker.github.io. 이 나오면 정상
dig +short cuberry.kr A            # 3.39.143.82 / 54.116.236.216 그대로(변경 없음)
dig +short cuberry.kr MX           # ★ Google Workspace 그대로인지 확인
curl -sI https://www.cuberry.kr | head -3
curl -sI https://cuberry.kr | head -3                      # 301 → https://www.cuberry.kr/
curl -s https://www.cuberry.kr/sitemap.xml | head -5       # https://www.cuberry.kr/ 로 시작
curl -s https://www.cuberry.kr | grep -o 'rel="canonical" href="[^"]*"'   # https://www.cuberry.kr/
```

브라우저 체크리스트

- [ ] `https://www.cuberry.kr` 새 랜딩(히어로·포트폴리오) 정상 표시
- [ ] `https://cuberry.kr` → `https://www.cuberry.kr` 로 주소가 바뀜(기존 AWS 301)
- [ ] `https://www.cuberry.kr/en/` → 영문 화면(`/?lang=en`)
- [ ] `https://www.cuberry.kr/admin-v2` 로그인 → 문의/포트폴리오 저장 → 랜딩 반영
- [ ] 랜딩 문의 폼 전송 200(어드민 문의 목록에 표시)
- [ ] 카카오톡/슬랙에 `https://www.cuberry.kr` 붙여 미리보기 카드 확인

---

## 4. `cubeberry.ai` — 안 A vs 안 B, 그리고 추천

**먼저 확인할 사실:** `cubeberry.ai` 는 지금 **비어 있는 도메인이 아니라 영문 제품 사이트가 서비스 중**입니다(CloudFront, XCONDA/Art Director Pro/Director's Cut 소개, `sitemap.xml`·`robots.txt` 운영 중). 즉 “어디로 보낼까”가 아니라 **“지금 그 사이트를 어떻게 할까”** 문제입니다.

| | 안 A: 통째로 301 포워딩 | 안 B: `/kr`, `/us` 로 경로 분기 |
| --- | --- | --- |
| 사용자가 보는 것 | `cubeberry.ai` → `www.cuberry.kr/en/` (영문) | 두 도메인이 각각 다른 언어 경로를 서비스 |
| 검색엔진 | **유리** — 링크 신뢰도가 정본 한 곳으로 모임 | 두 도메인이 같은 내용을 나눠 가지면 **중복 콘텐츠** 위험 |
| 운영 | 사이트 1개 → 콘텐츠·어드민·백업 1벌 | 사이트 2개 → 콘텐츠·배포·SEO 2벌, 언어 동기화 필요 |
| 리스크 | `cubeberry.ai` 의 기존 검색 순위·광고 랜딩이 정본으로 이동(되돌리기 쉬움) | 정본이 둘로 갈라져 나중에 합치기 어려움 |
| 적합한 경우 | 영문은 같은 회사 소개를 영어로 보여주면 충분할 때 | 미국/글로벌용 **내용·가격·오퍼가 실제로 다를 때** |

### 추천 (기술적으로 깔끔한 순서)

1. **언어는 “한 도메인 안 경로”로만 나눈다.** 정본은 `www.cuberry.kr`(한국어) + `www.cuberry.kr/en/`(영문). 이미 구현되어 있습니다 — 랜딩은 브라우저 언어를 보고 자동으로 영문을 보여주고, `?lang=en` 으로 고정할 수 있으며, `/en/` 진입 별칭도 만들었습니다.
2. **`cubeberry.ai` 는 지금 그대로 두거나, 정리가 필요하면 301 로 `https://www.cuberry.kr/en/`** 로 보냅니다. 두 도메인이 같은 내용을 각각 서비스하는 상태(=안 B 를 “두 도메인”으로 구현)는 권장하지 않습니다.
3. 제품(XCONDA 등) 영문 사이트를 계속 별도 운영해야 한다면, 그건 **회사 소개(랜딩)와 목적이 다른 사이트**이므로 지금처럼 유지하고 서로 링크만 걸어둡니다. 이때도 “같은 내용을 두 도메인에 복제”하지 마세요.

### 안 A 를 실제로 구현하는 방법 (Route 53 은 리다이렉트를 지원하지 않습니다)

| 방법 | 비용 | 장점 | 단점 |
| --- | --- | --- | --- |
| **CloudFront + Function(viewer-request 301)** — 지금 구성 유지 | CloudFront 최소 비용(월 $1 내외) | AWS 안에서 끝남, 도메인·인증서 그대로 | 작업 필요, 함수 코드 관리 |
| **S3 정적 웹사이트 “Redirect requests”** + CloudFront 원본 교체 | 거의 무료 | 설정이 단순 | S3 웹사이트 엔드포인트 규칙, 인증서 재확인 |
| **웹호스팅/등록기관 URL 포워딩(301)** | 무료 | 클릭 몇 번 | 경로 보존 안 됨, 업체에 따라 301 미지원 |
| **Cloudflare 로 DNS 이전 + Redirect Rule** | 무료 | 가장 다루기 쉬움 | DNS 이전 시 **MX/TXT 를 반드시 함께 옮겨야** 메일이 끊기지 않음(리스크) |
| **Render 에 커스텀 도메인 추가 + 서버에서 301** | 무료 플랜 가능 | 코드로 관리(원하면 구현 가능) | 무료 플랜 콜드스타트(첫 방문 50초) |

> 지금 단계에서는 **`cubeberry.ai` 를 그대로 두고**, 대표님 의도가 “영문도 새 사이트로 통일” 쪽으로 확정되면 위 표에서 **CloudFront+Function** 또는 **Cloudflare Redirect Rule** 중 하나로 301 을 거는 것을 권합니다. (MX 를 건드리지 않는 방법부터 검토)

### 안 B(`/kr`, `/us` 경로 분기)를 실제로 하려면 — 구현 3가지

경로로 언어를 나누는 것 자체는 좋은 방식입니다. 다만 **현재 랜딩은 경로 라우터가 없고**(언어를 `?lang=` 로 고름),
정적 호스팅(GitHub Pages)은 **서버 리라이트를 지원하지 않습니다.** 그래서 방법이 갈립니다.

| 구현 | 내용 | 작업량 | 전제 |
| --- | --- | --- | --- |
| **B-1. 경로별 정적 빌드** | 빌드에서 `index.html`(ko) + `en/index.html`(en) 을 만들고, 랜딩이 **자기 기준 경로**(`/en/`)를 계산해 이미지·API·앵커 경로를 붙이게 한다 | 반나절(코드 수정 + 테스트) | 없음. 지금 구조 그대로 가능 |
| **B-2. 리라이트** | `/en/…` 요청을 내부적으로 루트 파일로 매핑해 서빙(Cloudflare Worker · Nginx · Render 서버) | 서버 코드 5~20줄 | 공식 도메인을 Pages 가 아니라 리라이트 가능한 호스팅으로 옮겨야 함 |
| **B-3. 별칭 + 쿼리(현재 구현)** | `/en/` · `/kr/` 는 진입용 별칭(noindex) 으로 두고 실제 화면은 `/?lang=en` 하나로 관리. SEO 는 hreflang + canonical 로 정리 | 완료 | 없음. **이미 적용되어 있음** |

**권장 순서** — ① B-3 로 지금 연결(오늘 가능) → ② 영문 트래픽이 늘거나 대표님이 “영문은 별도 페이지”를 원하시면 B-1 로 승격
(별칭 파일을 실제 페이지로 교체, 쿼리 주소는 canonical 로 흡수) → 리라이트가 꼭 필요할 때만 공식 도메인을 옮겨 B-2.

**“두 도메인에 언어를 나눠 담는 방식”(예: cuberry.kr=국문, cubeberry.ai=영문)은 권하지 않습니다.** 검색엔진에서
같은 회사 소개가 두 정본으로 갈라지고, 콘텐츠·배포·백업·사이트맵을 두 벌 관리해야 합니다. 언어는 한 도메인 안 경로로
나누는 것이 표준입니다.

---

## 5. 이 저장소에 이미 반영된 것 (2026-10-21, 작업 브랜치)

| 항목 | 파일 | 내용 |
| --- | --- | --- |
| 정본 주소 | `landing/index.html` (+ 빌드 산출물 `index.html`) | canonical·`og:url`·`og:image`·`twitter:image`·JSON-LD 를 `https://www.cuberry.kr/` 로 고정 |
| 검색엔진 | `sitemap.xml`, `robots.txt` | 사이트맵·Sitemap 지시자를 `https://www.cuberry.kr/` 로 변경 |
| 다국어 | `landing/vite.config.ts` | `hreflang` ko/en/x-default 를 절대주소(`https://www.cuberry.kr/…`)로 주입(미러 주소가 정본으로 오해되지 않게) |
| 언어 별칭 | `en/index.html`, `kr/index.html` | `/en/` → `/?lang=en`, `/kr/` → `/?lang=ko` (noindex, canonical 지정, 상대경로라 서브경로 배포에서도 동작) |
| 서버 | `server/index.mjs` | Render 로 서빙할 때도 `/en/`·`/kr/` 라우트 동작 |
| API 허용 | `server/lib/config.mjs` | 기본 허용 Origin 에 `https://www.cuberry.kr`(정본) + `https://cuberry.kr`(apex 301 진입) — 어느 쪽으로 들어와도 로그인·문의 동작 |
| 배포 설정 | `render.yaml`, `render.free.yaml` | `ADMIN_ALLOWED_ORIGINS` 에 두 주소 모두 명시 |
| 검증 | `test/domain.mjs` (+ `npm test` 포함) | 새 주소가 여섯 곳(원본·빌드 산출물·robots·sitemap·서버 허용목록·Blueprint)에 모두 반영됐는지, 미러·apex 주소가 화면에 남지 않았는지, `/en/`·`/kr/` 별칭이 상대경로 전용인지, 컷오버용 DNS 파일이 **www CNAME 1건만** 담고 MX/TXT 는 없는지 |
| 검증 | `test/static-paths.mjs` | 저장소가 **루트**(= 공식 도메인)에 놓인 상태를 흉내 내 `/`·`/en/`·`/kr/`·`/admin/`·`/sitemap.xml` 이 200 인지까지 확인 |
| 검증 | `test/server-wiring.mjs` · `test/security.mjs` · `test/client-origin.mjs` | `www.cuberry.kr`·`cuberry.kr` 사전요청 204, 환경변수 없이도 공식 도메인에서 로그인 200, render*.yaml·서버 기본값 일치 |
| 문서 | `README.md`, 이 문서 | 배포 표에 공식 주소(`https://www.cuberry.kr/`)와 도메인 문서 링크 반영 |
| 문서 | `docs/domain/handoff-dns.md` | DNS 담당자 전달용 실행 문서(사전 확인·단계·확인·롤백·증상별 조치) |
| 문서 | `docs/domain/ceo-decision.md` | 대표님 판단용 1장 요약(결정 3가지 + 추천안 + 일정) |
| 컷오버 자산 | `docs/domain/CNAME`(= `www.cuberry.kr`), `docs/domain/route53-cuberry-kr-change.json` | 복사해서 쓰는 값(루트 `CNAME` 은 2026-10-21 에 활성화됨 — 아래 완료 항목 참고) |

**아직 코드로 하지 않은 것(의도적)**

- 진짜 경로 기반 영문 페이지(`/en/` 이 리다이렉트가 아니라 실제 페이지) — 랜딩의 이미지 경로가 상대경로라 `/en/` 아래에서 그대로 두면 깨집니다. 하려면 “앱이 자신의 기준 경로를 계산해 자산 주소를 붙이는” 작업이 필요합니다(반나절 규모). **대표님이 안 B 를 확정하면 진행**하는 것을 권합니다.
- `cubeberry.ai` 실제 301 — 대표님 의도 확정 + AWS 콘솔/Cloudflare 작업 필요.
- ~~루트 `CNAME` 파일 활성화(= 커스텀 도메인 스위치 ON)~~ — **완료(2026-10-21)**: 커밋 `e781411` "Create CNAME" 으로
  루트 `CNAME`(= `www.cuberry.kr`, 프로토콜 없이)이 들어갔고, Pages 상태도 `cname: www.cuberry.kr` 로 확인됨.
  `test/domain.mjs` 가 이제 "루트 CNAME 이 있고 `docs/domain/CNAME` 과 일치"하는지 검사한다(전환 전 안전장치의 반대 방향).
  되돌리기: `gh api -X PUT repos/hanahchafilmaker/Landing_Cuberry/pages -f cname=""` (루트 `CNAME` 파일도 함께 제거).
  ※ 파일 활성화 = Pages 쪽 스위치 ON 일 뿐이며, `www` DNS(Route 53) 변경 완료와는 별개다.
- API 를 `https://www.cuberry.kr/api`(한 Origin)로 프록시하는 구성 — AWS 쪽에서 프록시를 걸기로 하면 그때 진행(재배포 필요).

---

## 6. 대표님 확인이 필요한 3가지

1. ~~**`cuberry.kr` 교체 시점·보존 주소**~~ — **확정(2026-10-21): 커스텀 도메인 = `www.cuberry.kr`(apex 는 AWS 301 로 유지) + 구 사이트는 `old.cuberry.kr` 로 보존.** 남은 확인: 구 사이트가 도는 AWS 자원이 무엇인지, 교체 시점.
2. **`cubeberry.ai` 처리** — (a) 그대로 유지 (b) `www.cuberry.kr/en/` 로 301 (c) 별도 영문 사이트로 계속 운영 중 선택.
   추가로 **경로 분기(안 B)를 원하시면** 목표 형태를 골라주세요 — `www.cuberry.kr`(ko) + `www.cuberry.kr/en/`(en) 이 기본 권장입니다.
3. **어드민 노출** — `www.cuberry.kr/admin-v2` 로 둘지, `admin.cuberry.kr`(Render 커스텀 도메인)로 분리할지.

> 대표님께 그대로 보여드릴 요약본은 [`docs/domain/ceo-decision.md`](docs/domain/ceo-decision.md),
> DNS 담당자에게 전달할 실행 문서는 [`docs/domain/handoff-dns.md`](docs/domain/handoff-dns.md) 입니다.

---

## 7. 실행 체크리스트 (인쇄용)

```
[ ] (전달) DNS 담당자에게 docs/domain/handoff-dns.md 전달 — 실행·롤백이 이 한 문서에 정리됨
[ ] 구 cuberry.kr 을 서비스하는 AWS 자원 확인 후 old.cuberry.kr 별칭 추가(보존) ← www 를 넘기기 전에
[ ] (선택) Route 53 에서 www 레코드 TTL 을 300 으로 낮춰 대기(전파 시간 단축)
[ ] GitHub → Settings → Pages → Custom domain = www.cuberry.kr  (프로토콜 없이 · CNAME 파일 커밋됨)
[ ] Route 53 → www CNAME = hanahchafilmaker.github.io (기존 www A 2개 삭제 후) · apex A 는 그대로
[ ] MX/TXT 무변경 확인
[ ] GitHub → 계정 Settings → Pages → 도메인 검증 TXT 추가
[ ] Enforce HTTPS 체크
[ ] 위 5) 확인 명령 + 브라우저 체크리스트
[ ] Search Console 에 https://www.cuberry.kr/sitemap.xml 제출
[ ] cubeberry.ai 처리 방향 확정 후 별도 작업
```

## 8. 롤백 (문제가 생기면)

1. GitHub → Settings → Pages → Custom domain 을 비우고 **Save** (또는 `git revert` 로 `CNAME` 제거)
   — `gh api -X PUT repos/hanahchafilmaker/Landing_Cuberry/pages -f cname=""`
2. Route 53 에서 `www` CNAME 을 지우고 원래 **A 레코드 2개**(`3.39.143.82`, `54.116.236.216`)로 되돌립니다.
   (apex 는 애초에 바꾸지 않았으므로 손댈 것이 없습니다.)
3. TTL 이 300초이므로 수 분 내 원상복구됩니다. (따라서 **교체 직전 TTL 을 낮춰두는 것**이 안전합니다.)
