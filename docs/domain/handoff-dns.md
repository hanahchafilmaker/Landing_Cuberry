# [인수인계] cuberry.kr 도메인 연결 — DNS 담당자용 실행 문서

작성 2026-10-14 · **2026-10-21 개정** · 요청: 큐브베리 랜딩페이지를 공식 도메인 **`www.cuberry.kr`** 로 연결
관련 PR: https://github.com/hanahchafilmaker/Landing_Cuberry/pull/39 (저장소 쪽 준비 완료)
전체 배경·의사결정: 같은 폴더의 [`domain-setup.md`](../domain-setup.md)

> **2026-10-21 변경(요청하신 2가지 반영)**
> 1. **커스텀 도메인 = `www.cuberry.kr`** — **프로토콜 없이** 입력합니다. `https://` 는 붙이지 마세요.
>    (GitHub 저장소 기준 커스텀 도메인은 아직 미등록 상태입니다 — `pages` API 의 `"cname": null`. 신규 등록입니다.)
> 2. **API 서버 주소는 `https://landing-cuberry-admin.onrender.com` 그대로**이며, 화면이 `https://www.cuberry.kr` 에서
>    이 서버를 직접 호출합니다. 서버 쪽 허용 Origin 에 `https://www.cuberry.kr` 이 **이미 들어 있어** 별도 설정 변경·재배포 없이 동작합니다.
>    (만약 `www.cuberry.kr/api` 로 한 Origin 으로 묶는 구성을 원하시면 알려주세요 — 저장소 쪽 값 수정 + 재배포가 필요합니다.)

---

## 0. 요약 (이 문서만 보면 됩니다)

**할 일은 3가지입니다.**

1. **GitHub** 저장소 `Landing_Cuberry` → Settings → Pages → Custom domain 에 **`www.cuberry.kr`** 입력 (5분) — 프로토콜 없이
2. **AWS Route 53** `cuberry.kr` 호스팅 영역에서 **`www` CNAME 1건**을 아래 표대로 변경 (5분) — **apex 는 그대로 둡니다**
3. DNS 전파 후 **Enforce HTTPS** 체크, 필요 시 **TXT**(도메인 검증) 추가 (전파 대기 5분~24시간)

**절대 하지 말 것**

- ✋ **MX 레코드 삭제·변경 금지** — 구글 워크스페이스 메일이 즉시 끊깁니다.
- ✋ **TXT(google-site-verification) 삭제 금지** — 검색엔진 소유확인 유지.
- ✋ `www` 에 A 레코드와 CNAME 을 동시에 두지 마세요(DNS 규칙 위반) → **A 를 먼저 지우고 CNAME 신규**.
- ✋ **apex(`cuberry.kr`) A 레코드(`3.39.143.82` / `54.116.236.216`)를 바꾸지 마세요.** 기존 AWS 가 apex→www 301 을 하므로
  apex 로 들어온 방문자는 그대로 새 랜딩에 도착합니다. (apex 를 GitHub Pages IP 로 바꾸면 apex 가 404 가 됩니다.)
- ✋ apex 에 와일드카드(`*`) CNAME 을 만들지 마세요(GitHub 가 거부·충돌).

**되돌리기**: 6장. TTL 300초라 **몇 분이면 원상복구**됩니다. 단계마다 원래 값을 기록해 두세요.

---

## 1. 왜 지금 구조인가 (1분 설명)

| 조각 | 어디 | 역할 |
| --- | --- | --- |
| 화면(랜딩·어드민 UI) | **GitHub Pages + 커스텀 도메인 `www.cuberry.kr`** | 정적 파일, 전 세계 CDN, 무료, 콜드스타트 없음 |
| 데이터·로그인·문의 API | **Render** (`https://landing-cuberry-admin.onrender.com`) | SQLite, 어드민 저장, 문의 접수 |

방문자는 `https://www.cuberry.kr` **한 주소**만 쓰고(`cuberry.kr` 로 들어와도 같은 주소로 301), 화면에 필요한 데이터는 Render API 에서 자동으로 가져옵니다.
저장소는 **이미 이 구성에 맞게 준비**되어 있습니다(canonical·CORS·사이트맵·언어 별칭 `/en/`·`/kr/` 등 커밋 완료 — 정본 주소 `https://www.cuberry.kr/`).
DNS 와 Pages 설정만 바꾸면 바로 서비스됩니다.

**현재 `cuberry.kr`·`www.cuberry.kr` 에는 기존 회사 소개 사이트(AWS 호스팅)가 서비스 중**이며, 대표님 방침은 **“새 랜딩으로 교체하되 구 사이트는 `old.cuberry.kr` 로 보존”** 입니다.

**구 사이트 조사 결과 (2026-10-14)**: 단일 페이지(회사소개·HISTORY·BUSINESS·CONTENTS·특허/파트너가 **한 페이지 안 앵커로 이동**)이고,
외부 페이지 링크는 `aiconda.ai`·`xconda.ai` 뿐입니다. → **하위 페이지 리다이렉트 작업은 필요 없습니다.**
(참고: 구 사이트의 이미지 URL `www.cuberry.kr/images/…` 는 교체 후 새 랜딩의 이미지로 바뀝니다. 외부에서 특정 파일을 직접 링크한 경우가 있다면 알려주세요.)

---

## 2. 사전 확인 (백업 성격)

**2-1. 기존 `cuberry.kr` 을 서비스하는 AWS 자원 찾기** (콘솔 → CloudFront / S3 / EC2 / Amplify 를 순서대로 확인)

```bash
# CloudFront 배포 목록(별칭에 cuberry.kr 이 있는 것)
aws cloudfront list-distributions \
  --query "DistributionList.Items[].{Id:Id,Domain:DomainName,Aliases:Items.Aliases.Items}" --output table

# S3 버킷 (정적 웹사이트 설정)
aws s3api list-buckets --query "Buckets[].Name" --output table

# 로드밸런서·EC2 (직접 호스팅인 경우)
aws elbv2 describe-load-balancers --query "LoadBalancers[].{Name:LoadBalancerName,DNS:DNSName}" --output table
```

⚠️ **구 사이트는 지금 `www.cuberry.kr` 에서 서비스 중**입니다. 3-2 에서 `www` 를 GitHub Pages 로 넘기는 순간
구 사이트는 공개 주소에서 사라집니다. 그래서 **`old.cuberry.kr` 별칭을 그 자원에 먼저 붙여 두세요(3-4).**
못 찾아도 교체 자체는 진행할 수 있습니다 — 다만 구 사이트를 되살리기 어려우니 **스크린샷/HTML 백업**을 권합니다.

**2-2. 현재 레코드 기록 (롤백용 — 이 값들을 메모해 두세요)**

```bash
aws route53 list-hosted-zones --query "HostedZones[?Name=='cuberry.kr.'].[Id,Name]" --output table
aws route53 list-resource-record-sets --hosted-zone-id <아이디> --output table
# 특히 www 의 기존 A 레코드 값 2개(롤백 때 그대로 되돌립니다)
```

**2-3. TTL 낮추기(권장)** — 기존 `www` 레코드의 TTL 을 **300** 으로 수정한 뒤 10분 정도 기다리면,
문제가 생겼을 때 롤백이 훨씬 빨리 반영됩니다.

---

## 3. 실행 순서

### 3-1. GitHub Pages 에 커스텀 도메인 **먼저** 등록 (순서 중요)

GitHub 공식 문서 기준, DNS 를 바꾸기 전에 저장소에 도메인을 등록해야 합니다(도메인 탈취 방지).

- 웹 UI: 저장소 `Landing_Cuberry` → **Settings → Pages → Custom domain** 에 **`www.cuberry.kr`** → **Save**
  - **프로토콜 없이** 입력: `www.cuberry.kr` (O) / `https://www.cuberry.kr` (X)
- 또는 명령 한 줄(권한 있는 계정으로):
  ```bash
  gh api -X PUT repos/hanahchafilmaker/Landing_Cuberry/pages -f cname=www.cuberry.kr
  ```
- 결과: 저장소 루트에 `CNAME` 파일(내용 `www.cuberry.kr`)이 생기고, `hanahchafilmaker.github.io/Landing_Cuberry/…` 는 `www.cuberry.kr/…` 로 **리다이렉트**됩니다.

> ⚠️ 이 순간부터 **DNS 가 아직 구 사이트를 가리키면** 그 미러 주소는 구 사이트로 가게 됩니다.
> 그래서 **3-1 과 3-2 를 연속으로(같은 시간에)** 진행하세요. 그 사이 어드민은 Render 주소
> `https://landing-cuberry-admin.onrender.com/admin-v2` 를 쓰면 됩니다.
> 되돌릴 때는 `gh api -X PUT repos/hanahchafilmaker/Landing_Cuberry/pages -f cname=""`

### 3-2. Route 53 레코드 변경 (핵심 — `www` 1건)

Route 53 → Hosted zones → `cuberry.kr` → 레코드를 아래 표대로 수정합니다.

| 이름 | 유형 | 값 (TTL 300 권장) | 비고 |
| --- | --- | --- | --- |
| `www` | **CNAME** | `hanahchafilmaker.github.io` | 기존 `www` **A 레코드 2개 삭제 후** 신규 |
| `cuberry.kr` (apex) | — | **변경 없음** | 기존 A(`3.39.143.82` / `54.116.236.216`) 유지 → apex→www 301 |
| *그 외* | — | **변경 없음** | MX · TXT(google-site-verification) 등은 손대지 않음 |

**방법 A — 콘솔 JSON 편집기 (가장 쉬움)**
레코드 생성/편집 화면의 **“JSON 편집기로 전환(Edit as JSON)”** 에 [`route53-cuberry-kr-change.json`](./route53-cuberry-kr-change.json) 의
`Changes` 배열 내용을 붙여넣고 저장합니다. (`www` CNAME UPSERT 1건)

**방법 B — CLI**

```bash
aws route53 list-hosted-zones --query "HostedZones[?Name=='cuberry.kr.'].[Id,Name]" --output table

# www 의 기존 A 레코드가 있으면 삭제(콘솔에서) 후 아래 실행
aws route53 change-resource-record-sets \
  --hosted-zone-id <호스팅영역ID> \
  --change-batch file://route53-cuberry-kr-change.json
```

### 3-3. 도메인 검증 TXT (GitHub 이 요구할 때)

도메인 검증은 **GitHub 계정(프로필) Settings → Pages → Verified domains / Add a domain** 에서 진행합니다.
그 화면이 알려주는 **호스트 이름과 값을 그대로** 추가합니다.

| 등록할 도메인 | Route 53 Record name | 값 |
| --- | --- | --- |
| `www.cuberry.kr` | `_github-pages-challenge-hanahchafilmaker.www` | (GitHub 화면에 표시된 토큰 그대로) |
| `cuberry.kr` (apex 로 검증 → `www` 등 하위도메인까지 보호) | `_github-pages-challenge-hanahchafilmaker` | (GitHub 화면에 표시된 토큰 그대로) |

⚠️ 콘솔이 존 이름(`cuberry.kr`)을 자동으로 붙이는 경우가 많습니다. **전체 이름을 그대로 넣으면
`….www.cuberry.kr.cuberry.kr` 처럼 중복되어 검증이 실패합니다.** 확인: `dig +short TXT _github-pages-challenge-hanahchafilmaker.www.cuberry.kr`

### 3-4. 구 사이트 보존 (대표님 방침)

2-1 에서 찾은 자원에 **`old.cuberry.kr`** 을 추가로 붙입니다. **`www` 를 넘기기 전에 해 두세요.**

- CloudFront: 배포 → General → **Alternate domain names (CNAMEs)** 에 `old.cuberry.kr` 추가 + (외부 인증서면) 해당 인증서에 도메인 추가
- S3 정적 웹사이트: CloudFront 원본에 그대로 두고 위와 같이 별칭만 추가
- EC2/Nginx: 서버명(server_name) 또는 ALB 규칙에 `old.cuberry.kr` 추가
- Route 53 에 레코드 추가: `old.cuberry.kr` → (해당 자원의 CloudFront/ALB 주소) **A(별칭) 또는 CNAME**
- 확인: `https://old.cuberry.kr` 에서 구 사이트가 열려야 합니다(인증서가 커버하지 않으면 인증서에 도메인 추가 필요).

### 3-5. HTTPS 강제

DNS 전파 후(수 분~최대 24시간) Settings → Pages → **Enforce HTTPS** 체크. 인증서 발급 전에는 잠시 비활성일 수 있습니다.

---

## 4. 확인 (DONE 기준)

```bash
dig +short www.cuberry.kr CNAME  # hanahchafilmaker.github.io.
dig +short cuberry.kr A          # 3.39.143.82 / 54.116.236.216 그대로(변경 없음)
dig +short cuberry.kr MX         # ★ Google Workspace 그대로 (aspmx.l.google.com 등)
dig +short cuberry.kr TXT        # google-site-verification 그대로

curl -sI https://www.cuberry.kr | head -3
curl -s https://www.cuberry.kr | grep -o 'rel="canonical" href="[^"]*"'   # https://www.cuberry.kr/
curl -s https://www.cuberry.kr/sitemap.xml | head -3                    # https://www.cuberry.kr/
curl -sI https://cuberry.kr | head -3                                   # 301 → https://www.cuberry.kr/
```

체크리스트

- [ ] `https://www.cuberry.kr` 새 랜딩 표시(히어로·포트폴리오·문의)
- [ ] `https://cuberry.kr` → `https://www.cuberry.kr` 로 주소 변경(기존 AWS 301)
- [ ] `https://www.cuberry.kr/en/` → 영문 화면, `https://www.cuberry.kr/kr/` → 국문 화면
- [ ] `https://www.cuberry.kr/admin-v2` 로그인 → 콘텐츠 수정 → 랜딩 즉시 반영
- [ ] 랜딩 문의 폼 전송 성공(어드민 → 문의 목록에 표시)
- [ ] `https://old.cuberry.kr` 구 사이트 열림 (보존한 경우)
- [ ] 메일 수신 테스트 1건(교체 후 MX 유지 확인)
- [ ] 카카오톡·슬랙에 `https://www.cuberry.kr` 붙여 미리보기 카드 확인

---

## 5. 문제가 생겼을 때 (증상 → 원인)

| 증상 | 원인/조치 |
| --- | --- |
| `www.cuberry.kr` 이 아직 구 사이트 | DNS 캐시. `dig +short www.cuberry.kr CNAME` 으로 확인, 최대 24시간 대기(브라우저·OS DNS 캐시도 확인) |
| 커스텀 도메인 저장 시 “domain is already in use / invalid” | 값을 `https://www.cuberry.kr` 처럼 **프로토콜과 함께** 넣은 경우 → `www.cuberry.kr` 만 입력. 다른 GitHub 저장소가 같은 도메인을 쓰고 있어도 이 메시지가 나옵니다 |
| “There isn’t a GitHub Pages site here” | 3-1(Custom domain 등록) 누락 또는 `CNAME` 파일 미생성 → Settings → Pages 재확인 |
| apex(`cuberry.kr`)가 404/에러 | apex A 레코드를 GitHub Pages IP 로 바꾼 경우 → 원래 값(`3.39.143.82` / `54.116.236.216`)으로 복원. apex 는 AWS 301 로 두는 구성입니다 |
| HTTPS 경고/연결 안 됨 | 인증서 발급 대기 중. Enforce HTTPS 체크 후 시간 경과 필요(보통 수십 분, 최대 24시간) |
| `www` 가 안 열림 | 남아 있는 `www` A 레코드와 CNAME 충돌 → A 삭제 후 CNAME 만 유지 |
| 랜딩에서 로그인·문의가 안 됨 | 서버 CORS 허용목록 문제일 가능성 → 서버는 이미 `www.cuberry.kr`·`cuberry.kr` 을 **기본 허용**하도록 커밋되어 있음(재배포 없이 동작). `https://landing-cuberry-admin.onrender.com/api/config` 에서 `allowedOrigins` 확인 |
| 메일이 안 옴 | MX 변경 실수 → 원래 값으로 즉시 복원(2-2 기록 참고) |

---

## 6. 롤백 (5분)

1. GitHub: **Custom domain 을 비우고 Save** — `gh api -X PUT repos/hanahchafilmaker/Landing_Cuberry/pages -f cname=""`
2. Route 53: `www` CNAME 을 삭제하고 **원래 A 레코드 2개**(`3.39.143.82`, `54.116.236.216`)로 복원 — apex 는 바꾸지 않았으므로 그대로
3. TTL 을 300 으로 낮춰 두었다면 수 분 내 원상복구

---

## 7. 저장소 쪽에서 이미 끝난 것 (참고)

| 항목 | 상태 |
| --- | --- |
| canonical·OG·JSON-LD = `https://www.cuberry.kr/` | 완료(2026-10-21 개정) |
| `robots.txt` · `sitemap.xml` = `www.cuberry.kr` | 완료 |
| 언어 진입 별칭 `/en/` · `/kr/` (noindex, 상대경로) | 완료 |
| 서버 CORS 기본 허용목록에 `www.cuberry.kr`(정본) · `cuberry.kr`(apex) | 완료 — **재배포 없이 동작** |
| 화면이 호출하는 API 주소 = `https://landing-cuberry-admin.onrender.com` | 그대로 유지(변경 없음) |
| 컷오버용 `CNAME`(= `www.cuberry.kr`) · Route 53 변경 JSON(www CNAME 1건) | 이 폴더 |
| 회귀 테스트(`npm test`) — 주소 불일치 시 CI 실패 | 완료 |

**저장소 변경은 위 작업이 들어 있는 브랜치/PR 입니다.** DNS 전환과 **같은 시점에** `main` 에 머지하는 것을 권합니다
(머지 전에는 canonical 이 아직 구 주소라서, 머지해도 DNS 가 그대로면 동작에는 영향이 없습니다 — 순서가 여유롭다면
“DNS 먼저 → 사이트 확인 → PR 머지” 도 좋습니다. 다만 그 경우 미러 주소가 새 랜딩을 가리키는 동안 canonical 이 미러 주소로 남습니다).
