# Cuberry Landing

큐브베리 랜딩 페이지(`index.html`)와 두 어드민 콘솔을 한 개의 Node 서버로 서비스합니다.

https://landing-cuberry-admin.onrender.com/

https://landing-cuberry-admin.onrender.com/admin-v2  ← 새 어드민 (권장)

https://landing-cuberry-admin.onrender.com/admin     ← 레거시 어드민


## 실행

```bash
npm start              # http://localhost:8080/  ,  http://localhost:8080/admin
PORT=3000 npm start    # 포트 변경
npm test               # 의존성 없이 도는 검증 (주소 결정·Pages 경로·서버 저장/CORS/서빙·보안 회귀 + 한영 사전 + 문의 알림 + 백업 자동화 318건)
npm i -D jsdom         # 아래 DOM 테스트를 돌리려면 한 번만 (선택)
npm run test:dom       # 어드민 로그인·내비게이션 종단 테스트 (79건, 서버 필요)
npm run test:cms       # React 랜딩에 관리자 저장값 반영·문의 폼·포커스 갱신 테스트 (46건)
npm run test:i18n      # 한영 자동 번역 (55건 — 자동 감지·KO/EN 토글·CMS 값 번역)
npm run build          # landing/ 소스 → 루트 index.html (아래 "랜딩 디자인 소스" 참고)
npm run build:admin    # admin-v2/app 소스 → admin-v2/index.html (새 어드민 한 파일)
npm run test:admin     # 새 어드민 로그인 → Team 수정 저장 종단 테스트 (jsdom, 서버 필요)
npm run sync:seed      # 운영 서버의 공개 콘텐츠를 server/seed.json 으로 당겨옴
```

- 랜딩: `/`
- 새 어드민: `/admin-v2` (개요·포트폴리오·서비스/가격·FAQ·**팀 프로필(사진 업로드 포함)**·문의·사이트 설정·비밀번호·백업)
- 레거시 어드민: `/admin` (같은 기능) — 둘은 같은 API·같은 세션(`cuberry-admin-token`)을 공유하므로 어느 쪽에서 저장해야 다른 쪽과 랜딩에도 같이 반영됩니다
- 데이터: `data/cuberry.sqlite` (SQLite, 최초 실행 시 `server/seed.json` 으로 자동 시드) — `DATA_DIR` 환경변수로 다른 폴더를 지정할 수 있습니다(테스트가 사용)
- 업로드 이미지: `data/uploads/`
- 서버 구조: `server/index.mjs` 는 조립·기동·요청 디스패치만 하고, 나머지는 아래 "서버 모듈" 참고

### 새 어드민 UI (`/admin-v2`, 2026-10 개편)

랜딩과 **같은 디자인 언어**(graphite `#0E0E0E` · paper `#EDEAE2` · gold `#F4B400`, 1px 헤어라인, 4px 모서리)로 맞췄고, 화면 문구를 한국어로 정리했습니다.

- **로그인** — 브랜드 패널 + 비밀번호 카드(표시/숨기기). 초기 비밀번호 안내는 값 노출 없이 안내 문구만 보여줍니다.
- **개요** — 포트폴리오·새 문의·서비스 건수를 큰 숫자로 보여주고, 최근 작품/최근 문의를 각각 최신 4건씩. 아래 줄에 마지막 알림·마지막 백업 시각이 나옵니다.
- **왼쪽 메뉴** — 한국어 라벨(개요·포트폴리오·서비스·가격·자주 묻는 질문·팀 프로필·문의 관리·사이트 설정), 접기/펼치기와 폭 조절(232~380px)은 그대로, 새 문의 건수는 **문의 관리** 옆 배지로 표시됩니다.
- **상단 바(데스크톱)** — 현재 위치(Content studio › 메뉴)와 **새로고침**(서버에서 콘텐츠 다시 읽기), **랜딩 미리보기** 버튼. 모바일은 헤더에서 메뉴 버튼과 미리보기만 노출됩니다.
- **목록 화면** — 포트폴리오는 제목/카테고리/태그 **검색**과 노출 상태 필터, 문의는 이름·회사·이메일·내용 **검색**과 상태 필터가 있습니다. 두 화면 모두 건수를 `표시 / 전체` 로 보여줍니다.
- **FAQ** — 질문을 눌러 답변을 펼치는 아코디언. 임시 저장 항목은 배지로 구분합니다.
- **문의 카드** — 이름·상태 배지·연락처 링크(mailto/tel)·문의 내용을 한눈에 보고, 오른쪽에서 상태를 바로 바꿉니다. 알림 실패 건만 "알림 다시 보내기"가 나타납니다.
- **삭제 안전장치** — 삭제 버튼은 확인 창을 거친 뒤 실행합니다.
- **편의 기능** — 사이드바 폭·상태는 브라우저에 저장되고, 저장/삭제 결과는 토스트로 알려줍니다. 빈 목록에는 다음 행동(첫 작품 등록 등)을 안내합니다.

### 자동 업데이트 — 무엇이 언제 반영되나

| 바꾼 것 | 반영 경로 | 걸리는 시간 |
| --- | --- | --- |
| 어드민에서 저장한 콘텐츠(작품·팀·서비스·FAQ·문구) | 서버 DB + `/api/public/content` → 랜딩이 포커스/탭 복귀 때 다시 읽음 | **즉시** (배포·재빌드 불필요) |
| 랜딩/어드민 **코드**(`main` 에 push) | Render 자동 배포(BluePrint 의 Auto-Deploy)가 켜져 있으면 재배포, GitHub Pages 는 `main` 에서 자동 빌드 | Render 1~3분 · Pages 1분 내외 |
| 백업(seed) | 어드민 Settings → **GitHub에 백업 및 배포**(수동) 또는 GitHub Actions `backup-seed.yml`(6시간마다, 변경 없으면 커밋 생략) | 누르면 즉시 |
| 업로드한 **이미지** | 무료 플랜은 재시작하면 사라집니다 — 외부 URL(Drive 썸네일·CDN) 사용 권장 | (영구 디스크 플랜이면 유지) |

- Render **Auto-Deploy 는 저장소·서비스 설정**(Settings → Build & Deploy → Auto-Deploy)이라 저장소 코드로는 켤 수 없습니다. 대시보드에서 `main` 브랜치가 `Yes` 로 되어 있는지 한 번만 확인해 두세요.
- Pages 랜딩(`hanahchafilmaker.github.io/Landing_Cuberry/`)도 어드민 저장값을 그대로 읽습니다 — 정적 사본이라 화면을 다시 만들 필요가 없습니다.
- 위 동작은 `npm run test:cms`(포커스 갱신) · `npm run test:admin`(저장 후 공개 API 반영) · `npm test`(백업/크론) 로 검증됩니다.

### 서버 모듈 (Phase 4: 1,508줄 단일 파일 → 11개)

| 파일 | 역할 |
| --- | --- |
| `server/index.mjs` | **조립 + 기동 + 요청 디스패치** (193줄). 시드 실행 순서가 여기 그대로 보입니다 |
| `server/lib/config.mjs` | 경로·포트·CORS Origin·보안 헤더/CSP·GitHub·세션 등 환경변수 설정 |
| `server/lib/db.mjs` | SQLite 오픈·스키마 DDL·시드(`seedContent`·`seedTeam`)·`meta` 헬퍼·백업 상태 |
| `server/lib/http.mjs` | `send`·`readBody`·CORS 적용·압축/ETag/캐시 헤더·`serveFile`·`serveClientFile` |
| `server/lib/auth.mjs` | 비밀번호 해시(scrypt)·세션·`requireAdmin`·로그인/문의 시도 게이트 |
| `server/lib/content.mjs` | 행 ↔ 응답 매핑·공개/관리자 콘텐츠·`exportSeed`·`summary`·upsert·업로드 검증 |
| `server/lib/inquiries.mjs` | 문의 코드 발급·저장·상태 변경 |
| `server/lib/notify.mjs` | Phase 1 문의 알림(웹훅·이메일) |
| `server/lib/form-token.mjs` | Phase 2 서명 폼 토큰·Turnstile |
| `server/lib/backup.mjs` | Phase 3 시크릿 상수시간 비교·`exportedAt` 제외 SHA-256 해시(순수 함수) |
| `server/lib/seed-backup.mjs` | Phase 3 GitHub 커밋·변경 감지·크론 실행 |
| `server/routes/api.mjs` | `/api/*` 라우트 테이블 |

분리는 **동작 변경 없는 순수 이동**입니다 — 함수 본문·로그 문구·에러 응답은 그대로이고,
경로만 `server/lib/` 기준으로 한 단계 조정했습니다(`ROOT`, `SEED_PATH`).

## 배포

어드민은 화면만 있는 정적 페이지가 아니라 Node.js API와 SQLite 데이터베이스가 함께 필요한 앱입니다.
GitHub Pages는 HTML/CSS/JS 파일만 제공하고 `server/index.mjs` 를 실행하지 않으므로, Pages 주소에서는 `/api/auth/status` 가 404, 로그인 POST가 405로 실패합니다. **이는 비밀번호 문제가 아닙니다.**

그래서 배포는 두 조각으로 나뉩니다.

| 조각 | 역할 | 호스팅 |
| --- | --- | --- |
| Node 서버 | `/api/*` (로그인·콘텐츠 저장) + 랜딩 + 어드민 화면 | Render 등 (아래 참고) |
| GitHub Pages | 랜딩/어드민 **정적 사본** | `hanahchafilmaker.github.io/Landing_Cuberry/` |

현재 배포 주소 (둘 다 소스에 커밋되어 있어 방문자가 주소를 입력할 필요가 없습니다)

| 조각 | 주소 |
| --- | --- |
| Node 서버 (API) | `https://landing-cuberry-admin.onrender.com` — `admin/index.html`·`cms-bridge.js` 의 `BAKED_API_ORIGIN` 과 `admin-v2/index.html` 의 `<meta name="cuberry-api-origin">` (서버는 자기 주소로 볼 때 이 값을 비워서 본다) |
| GitHub Pages (화면) | `https://hanahchafilmaker.github.io/Landing_Cuberry/` — `server/lib/config.mjs` 의 `DEFAULT_ALLOWED_ORIGINS` |

### A. Node 서버 배포 (Render Blueprint)

이 저장소에는 한 서비스에서 랜딩과 API를 함께 실행하는 Blueprint가 두 개 있습니다.

| 파일 | 플랜 | 영구 디스크 | 데이터 보존 |
| --- | --- | --- | --- |
| `render.yaml` | `0.5c-512mb` (Starter, 유료) | 1GB | 재배포·재시작 후에도 SQLite/업로드 그대로 |
| `render.free.yaml` | `free` (0원) | 없음(무료는 디스크 불가) | **재배포·재시작마다 초기화** → 아래 "무료 플랜에서 콘텐츠 지키기" 참고 |

절차:

1. 배포할 브랜치에 변경 사항을 반영합니다.
2. Render → **New → Blueprint** → 이 저장소 연결. 무료로 쓰려면 Blueprint 파일 경로를 `render.free.yaml` 로 지정합니다.
3. `ADMIN_PASSWORD` 에 강력한 비밀번호를 입력합니다. 이 값은 Git에 저장되지 않습니다(`sync: false`).
4. 배포 후 Render가 준 주소의 `/` 와 `/admin` 을 사용합니다.

Render는 Node.js 22와 Singapore 리전을 쓰도록 설정되어 있습니다.
[Blueprint 안내](https://render.com/docs/infrastructure-as-code) · [영구 디스크 안내](https://render.com/docs/disks)

> **무료 호스팅에 관해**: Render·Koyeb 등 무료 티어는 영구 디스크를 붙일 수 없어 SQLite가 휘발성입니다.
> Railway·Fly.io 는 무료 티어가 없어졌고, Glitch 는 앱 호스팅을 종료했습니다.
> "진짜 무료 + 데이터 보존"을 원하면 Oracle Cloud Always Free VM 에 직접 올리는 방법이 남습니다.

### B. GitHub Pages 화면에서 그 서버 API 쓰기 (원격 API 모드)

Pages에 올라간 랜딩/어드민은 같은 주소에 API가 없으므로, **Node 서버 주소를 알려주면** 그 서버를 직접 호출합니다.
서버가 다른 Origin의 요청을 받으려면 CORS 허용이 필요합니다.

**1) 서버 쪽** — GitHub Pages 주소(`https://hanahchafilmaker.github.io`)는 `server/lib/config.mjs` 의
`DEFAULT_ALLOWED_ORIGINS` 에 **기본값으로 들어 있습니다.** 그래서 Render 서비스를 Blueprint 가 아니라
대시보드에서 수동으로 만들었더라도(`render.yaml` 의 환경변수가 하나도 적용되지 않더라도) **재배포만으로** CORS 가 통과합니다.
기동 로그에 `CORS 허용 Origin: …` 으로 실제 적용된 목록이 찍힙니다.

다른 사이트를 추가로 열 때만 환경변수를 씁니다. 이 값은 기본 목록을 **대체하지 않고 추가**합니다.

```
ADMIN_ALLOWED_ORIGINS=https://cuberry.com
# 여러 개:  https://cuberry.com,https://staging.cuberry.com
# 전체 허용: *
```

적용 상태는 `GET /api/config` 로 확인할 수 있습니다 — `allowedOrigins`(기본값 + 환경변수), `defaultAllowedOrigins`(기본값만), `publicOrigin`.
허용되지 않은 Origin이 사전요청을 보내면 서버 로그에 `[cors] 거부된 Origin: …` 가 찍히고 403을 돌려줍니다.
어떤 주소를 추가해야 할지 모를 때 이 로그를 보면 됩니다.

> **`*`(전체 허용)를 쓰면 쿠키 자격증명이 자동으로 꺼집니다.** 임의 사이트가 방문자의 관리자 세션을
> 이용해 API를 읽지 못하게 하는 안전장치입니다. 토큰(Bearer) 인증은 그대로 동작합니다.

### 보안 · 성능 설정

| 환경변수 | 기본값 | 역할 |
| --- | --- | --- |
| `CONTENT_SECURITY_POLICY` | 화면에 맞춘 기본값 적용 | 응답에 붙는 CSP. 빈 문자열(`""`)로 설정하면 꺼집니다. 인라인 번들·Google/jsDelivr 폰트·Drive 미리보기 iframe 을 허용하는 값이 기본입니다 |
| `TRUST_PROXY` | Render·Fly·Railway 자동 켜짐 | 로그인/문의 시도 제한의 클라이언트 IP를 `X-Forwarded-For` **오른쪽 끝** hop에서 읽습니다. 꺼져 있으면 소켓 주소만 사용합니다. XFF 전체를 키로 쓰던 과거에는 헤더를 바꿔가며 제한을 우회할 수 있었습니다 |
| `PROXY_HOPS` | `1` | 신뢰할 프록시 단 수(프록시가 여러 겹일 때 오른쪽에서 몇 개를 볼지) |
| `REQUIRE_ADMIN_PASSWORD` | 꺼짐 | `1` 이면 `ADMIN_PASSWORD` 없이(기본 초기 비밀번호 상태로) 서버가 시작되지 않습니다 |

그 밖의 서버 기본 동작(설정 없이 항상 적용):

- **압축** — HTML·JS·CSS·JSON·SVG·XML 응답은 Brotli(없으면 gzip)로 압축합니다. 랜딩 단일 파일 374KB → 약 100KB.
- **재검증** — 모든 정적 자산에 `ETag` 를 붙여 두 번째 요청은 304로 끝납니다. 랜딩 HTML은 `no-cache`(매번 재검증), 어드민 화면은 `no-store`, 이미지·영상은 `max-age=3600` 입니다.
- **보안 헤더** — 모든 응답에 `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` 를 붙입니다. (`frame-ancestors`는 미리보기 iframe 때문에 일부러 제한하지 않습니다.)
- **업로드 검증** — 이미지 업로드는 MIME 문자열이 아니라 실제 파일 시그니처(PNG/JPEG/GIF/WebP 매직바이트)로 확인합니다.
- **스팸 방어** — 문의 폼에 사람만 못 보는 허니팟 필드(`website`)가 있고, 채워져 들어온 문의는 저장하지 않습니다.
- **경로 보호** — `/images/…`, `/uploads/…` 는 인코딩된 `..` 세그먼트(`%2e%2e%2f`)와 형제 폴더 접근을 모두 거부합니다.
- **세션 정리** — 만료 세션을 기동 시와 매시간 정리합니다.
- **검색/공유** — 루트에 `robots.txt`·`sitemap.xml` 이 있고, 랜딩에는 OG·Twitter 카드·canonical·JSON-LD(Organization)·`images/og-cover.jpg`(1200×630) 가 들어 있습니다. 링크를 메신저에 붙이면 제목·설명·이미지가 함께 표시됩니다.

**2) 브라우저 쪽** — 운영 서버 주소는 이미 소스에 커밋되어 있습니다(`BAKED_API_ORIGIN`).
`https://hanahchafilmaker.github.io/Landing_Cuberry/admin/` 를 열면 **주소를 입력하지 않아도** 로그인 화면이 그 서버에 연결됩니다.
다른 서버(스테이징 등)로 돌려야 할 때만 로그인 화면 아래 **API 서버 주소** 카드를 열고 주소를 넣은 뒤
"저장 후 다시 연결"을 누르세요. 값은 **그 브라우저의 localStorage에만** 저장되며 GitHub에는 전송되지 않습니다.

주소 결정 우선순위는 어드민과 랜딩(`cms-bridge.js`)이 동일합니다.

1. 주소창의 `?api=https://…` — 어드민은 저장, 랜딩은 이번 방문에만 적용
2. localStorage `cuberry.apiOrigin` — 로그인 화면에서 저장한 값
3. 소스의 `BAKED_API_ORIGIN` 상수 — 저장소에 커밋된 운영 서버 주소
   (`admin/index.html` 과 `cms-bridge.js` 맨 위 한 줄씩, 현재 `https://landing-cuberry-admin.onrender.com`)
4. 빈 값 → 현재 페이지와 같은 서버

`?api=same` 을 붙이면 저장된 값을 지우고 같은 서버 모드로 돌아갑니다.

**로컬 개발 가드** — 2)·3) 은 `localhost`·`127.0.0.1`·`[::1]` 에서 **무시**되고 항상 같은 서버(로컬 DB)를 씁니다.
운영 주소가 소스에 박힌 채로 `localhost:8080/admin` 을 열면 로컬에서의 편집이 **운영 데이터베이스에 그대로 반영**되기 때문입니다.
로컬에서 다른 서버를 봐야 하면 주소창에 `?api=https://…` 를 붙이세요(1번은 가드 대상이 아닙니다).
가드가 켜져 있으면 로그인 화면의 **API 서버 주소** 카드에 `로컬 개발 모드` 안내가 뜹니다.

또한 이 Node 서버가 `/admin` 과 `/cms-bridge.js` 를 **직접 서빙할 때는 서버가 그 값을 비워서** 보냅니다.
로컬·미리보기 도메인·Render 주소에서 연 화면은 어떤 호스트이든 항상 자기 서버를 쓰고,
파일 자체는 고치지 않으므로 GitHub Pages 에 올라간 사본에는 운영 주소가 그대로 남습니다.

인증은 쿠키가 아니라 **Bearer 토큰**(`sessionStorage`)으로 하므로, 사파리 등의 서드파티 쿠키 차단과 무관하게 동작합니다.
원격 모드에서는 어드민이 주소를 바꾸지 않습니다(Pages에는 `/admin/portfolio` 같은 파일이 없어 새로고침 시 404이기 때문).

### 문의 알림 설정 (웹훅 · 이메일)

문의가 접수되면 백그라운드로 알림을 보냅니다 (`docs/ops-hardening-plan.md` §3 설계). **알림 환경변수를 하나도 안 켜면 지금과 완전히 동일합니다** — 알림 행도 만들어지지 않습니다.

| 환경변수 | 기본값 | 역할 |
| --- | --- | --- |
| `NOTIFY_WEBHOOK_URL` | *(빈 값)* | Slack Incoming Webhook 등 범용 웹훅 주소로 `{ text, blocks }` 를 POST 합니다. 비어 있으면 이 채널은 꺼짐 |
| `NOTIFY_EMAIL_TO` | *(빈 값)* | 알림 수신 메일(쉼표로 여러 명). `RESEND_API_KEY` 와 함께 등록해야 이메일 채널이 켜집니다 |
| `RESEND_API_KEY` | *(빈 값)* | Resend REST API 키 — SMTP 의존성 없이 `fetch` 만 씁니다 |
| `NOTIFY_EMAIL_FROM` | `Cuberry <onboarding@resend.dev>` | 발신자. 운영은 Resend 검증 도메인을 사용하세요 |
| `NOTIFY_MASK_CONTACT` | `0` | `1` 이면 웹훅·이메일 본문의 이메일/전화를 마스킹합니다 (`ho***@example.com`, `010-****-5678`) — 서드파티 채널로 개인정보가 덜 나갑니다 |
| `NOTIFY_DISABLED` | `0` | `1` 이면 알림 전체 OFF — 장애 시 즉시 끄는 킬 스위치 |

- 실패하면 `1s → 5s → 25s` 백오프로 최대 3회 재시도하고, 최종 실패는 `notifications` 테이블에 `failed` 로 남습니다. 어드민 **Inquiries** 화면에서 배지 옆 **"다시 보내기"** 로 재발송할 수 있습니다 (`POST /api/admin/notifications/:id/retry`).
- 알림 실패는 **문의 접수를 절대 막지 않습니다** — 응답은 INSERT 직후 200으로 돌아가고, 상태는 `GET /api/admin/notifications?status=failed` 로 확인합니다.
- `render.yaml` · `render.free.yaml` 에 항목이 준비되어 있고, 빈 값이면 채널이 꺼진 채로 배포됩니다.

### 스팸 2차 방어 (폼 토큰 · Turnstile)

문의 폼이 화면에 들어올 때 `GET /api/form-token` 이 발급하는 **서명된 토큰**(HMAC-SHA256, 비밀키는 DB `meta` 테이블에 자동 생성 — 설정할 것 없음)을
제출과 함께 보냅니다. 서버는 형식·서명·시간을 확인합니다 — **발급 후 3초 안 제출은 "사람이 못 채운다"** 로, 6시간이 지나면 만료로 봅니다.

| 환경변수 | 기본값 | 역할 |
| --- | --- | --- |
| `FORM_TOKEN_MODE` | `flag` | `off` 경고만·기존처럼 저장 / `flag` 저장하되 `status='review'` + 알림 보류(어드민 "확인 필요") / `strict` 저장 안 함(허니팟과 동일 200) |
| `TURNSTILE_SECRET` | *(빈 값)* | 있으면 Cloudflare Turnstile `siteverify` 를 1회 호출해 실패도 위 3단 정책으로 처리합니다 |
| `TURNSTILE_SITE_KEY` | *(빈 값)* | 랜딩 문의 폼에 Turnstile 위젯을 표시합니다 — 두 키를 함께 등록해야 위젯이 뜹니다 |

- 검증 실패가 **문의 접수를 500 으로 만들지 않는 것**은 `test/security.mjs` [11] 로 고정되어 있습니다.
- `review` 로 잡힌 문의는 어드민 Inquiries 에서 노란 배지로 보이고, 상태 셀렉트로 `new` 등 정상 상태로 되돌릴 수 있습니다.

### 무료 플랜에서 콘텐츠 지키기 (seed.json 워크플로)

무료 인스턴스는 재배포·재시작마다 `data/` 가 사라져 `server/seed.json` 으로 다시 시작합니다.
그래서 **현재 콘텐츠를 seed.json으로 되돌려 커밋**해 두면 복구 작업 없이 항상 최신 상태로 켜집니다.

1. Render 환경변수에 `GITHUB_TOKEN`(해당 저장소의 Contents: Read and write 권한), `GITHUB_REPOSITORY=hanahchafilmaker/Landing_Cuberry`, `GITHUB_BRANCH=main`을 등록합니다.
2. 새 어드민 `/admin-v2` → **Settings → Backup → "GitHub에 백업 및 배포"**를 누릅니다.
3. 서버가 현재 콘텐츠를 `server/seed.json`으로 커밋하며, Render 자동 배포가 켜져 있으면 새 커밋을 감지해 재배포합니다.

토큰을 설정하지 않은 경우에는 기존처럼 **"JSON 내려받기"** 후 `server/seed.json`을 직접 교체·커밋할 수 있습니다.

내보내는 JSON은 `seed.json` 과 필드 이름이 완전히 같고, `inquiries`(상담 문의)와 `exportedAt` 만 추가로 담깁니다.
시드 로더는 이 두 키를 읽지 않으므로 그대로 `seed.json` 에 넣어도 안전합니다.

공개 콘텐츠만 가져와도 되면(비공개 초안·문의 제외) `npm run sync:seed` 한 줄로 운영 서버의 내용을
`server/seed.json` 에 바로 기록합니다. 로그인이 필요 없어 자잘한 배포 후 정리에 편합니다.

### 자동 백업 (GitHub Actions cron · Phase 3)

버튼을 누르는 것을 잊어도 콘텐츠가 Git 에 남도록, **6시간마다** 백업을 자동으로 시도합니다.
서버 안의 타이머가 아니라 저장소의 GitHub Actions 에서 돌기 때문에 무료 플랜이 잠들어 있어도(`15분 무요청 → Sleep`)
재개 시점에 그대로 실행됩니다.

등록은 두 곳입니다 — **같은 시크릿 값을 양쪽에** 넣습니다.

| 위치 | 키 | 값 |
| --- | --- | --- |
| Render 환경변수 | `CRON_SECRET` | 길고 무작위한 문자열 (`openssl rand -hex 32`). 비워두면 크론 엔드포인트는 503 으로 잠깁니다 |
| GitHub → Settings → Secrets and variables → Actions | `CRON_SECRET` | 위와 **같은 값** |
| GitHub → Settings → Secrets and variables → Actions | `APP_URL` | `https://landing-cuberry-admin.onrender.com` (운영 서버 주소) |

- 워크플로: `.github/workflows/backup-seed.yml` — `POST ${APP_URL}/api/cron/backup` 에 `x-cron-secret` 헤더로 1회 호출합니다.
  `200` 이 아니면 워크플로가 실패하고, **GitHub 이 저장소 소유자에게 메일로 알려줍니다** — 별도 모니터링 없이 백업 중단을 감지합니다.
- 무변경이면 커밋하지 않습니다. 현재 콘텐츠의 **SHA-256 해시**(`exportedAt` 제외)를 DB `meta` 에 남겨두고 비교하므로, 내용이 그대로면 GitHub 을
  아예 호출하지 않고 `{ ok: true, skipped: "no-change" }` 로 끝납니다 — 6시간마다 재배포가 도는 것을 막는 장치입니다.
- 어드민 개요에는 **"마지막 백업 · 3시간 전 · a1b2c3d"** 한 줄이, Settings → Backup 카드에는 자동 백업 안내가 표시됩니다.
- 수동 "GitHub에 백업 및 배포" 버튼은 명시적 요청이므로 **무변경이어도 커밋**합니다(대신 성공한 해시를 기록해 다음 크론은 건너뜁니다).
- 시크릿이 틀리면 `401`, `CRON_SECRET` 이 없으면 `503`, GitHub 커밋이 실패하면 `502` 입니다. 어떤 경우에도 성공으로 기록되지 않아 다음 실행이 다시 시도합니다.

`CRON_SECRET` 을 등록하지 않아도 서버는 지금과 똑같이 동작합니다(크론만 503 으로 꺼져 있음).

> 무료 인스턴스는 **업로드 이미지**(`data/uploads/`)도 잃습니다. 무료 구성에서는 이미지 URL을
> Google Drive 썸네일이나 CDN 같은 외부 절대주소로 넣는 편이 안전합니다.

### GitHub Pages에서 고친 것

Pages는 저장소 이름이 경로 앞에 붙는 서브경로 배포라, 루트 절대경로(`/…`)가 전부 깨졌습니다.

- `index.html`: `<script src="/cms-bridge.js">` → `cms-bridge.js` ( 상대경로화 )
  — 이전에는 Pages에서 `cms-bridge.js` 자체가 404라 어드민 변경 사항이 랜딩에 전혀 반영되지 않았습니다.
- `index.html` B2B 문의 폼: `fetch('/api/partnership')` → `window.CuberryApi.url(...)` (원격 API 사용)
  — 루트 절대경로(`/…`)는 Pages 서브경로에 그 파일이 없어 404가 납니다.
- `admin/index.html`: `/admin` 고정 경로 대신 현재 경로에서 `admin` 위치를 찾아 동작 (`adminBase`, `siteRoot`, `pageFromPath`)
- 업로드 이미지처럼 `/` 로 시작하는 콘텐츠 주소는 원격 서버 주소를 붙여 표시 (`assetUrl`)

## 랜딩 디자인 소스 (`landing/`) 와 빌드

2026-09-27 새 디자인부터 랜딩의 **소스가 저장소에 들어 있습니다.** 루트 `index.html` 은 이 소스를 빌드한 단일 파일 산출물입니다.

### 디자인 기준: FLEXBOARD Design v2 · E안 (2026-10-12)

랜딩은 Drive 로 공유된 `FLEXBOARD Design v2 – E · 회사소개 · 기록 (동작).html`
(file id `1WgNHKhi7nIX0b7wWVyJSdMsXXxUo0qxo`) 을 기준시로 따라갑니다.

| 항목 | 값 |
| --- | --- |
| 색 | 배경 `#0E0E0E` · 본문 `#EDEAE2`/`#C9C5BB`/`#A9A59B`/`#8A867D` · 구분선 `#2A2A26` · 패널 `#161614` · 이미지 액자 `#050505` · accent gold `#F4B400` · REC `#E5484D` |
| 타이포 | 본문 Pretendard(CDN 가변 폰트), 라벨·숫자 각주 IBM Plex Mono |
| 형태 | 그림자·글로우 없이 1px 선과 3~4px 모서리, 본문 폭 1200px |
| 절 순서 | 히어로(6편 스틸 격자) → 숫자 요약 → TWO SECTORS → WHAT WE DO → FOUNDER & CEO → HISTORY(연도 필터) → PATENTS → XCONDA/AI Lab → PORTFOLIO → TEAM → 상품 → PROCESS → FAQ → CONTACT(이메일·전화·사무실 2곳) → 푸터 |

고정 문구(연혁·특허·숫자 근거·대표 소개·사무실·푸터 그룹)는 `landing/src/data/content.ts` 에 있습니다.
**아래 표의 어드민 입력란은 아직 히어로·상품·포트폴리오·팀·FAQ·연락처 6개 항목뿐이라,
연혁·특허·숫자는 디자인 파일과 같이 이 TS 값을 고쳐 배포합니다.**

새 디자인 파일이 Drive 에 올라오면 GitHub Actions `fetch-flexboard-design` 을 `workflow_dispatch` 로
돌려 `design-incoming/` 에 풀어두거나, `design-incoming/` 의 원문을 읽고 `landing/src/` 에 반영하세요.
(실행 환경에서 drive.google.com 으로 직접 나갈 수 없어 Actions 러너가 대신 내려받습니다.)

```
landing/
  index.html          # Vite 입력. <html data-cms-native>, <script src="cms-bridge.js" defer> 포함
  src/                # React 19 + Tailwind CSS 4 컴포넌트 (Hero, Portfolio, Team, Pricing, Faq, Contact …)
    data/content.ts   # 기본 문구·콘텐츠 (API 에 연결되지 않았을 때의 기본값)
    cms/              # 어드민 콘텐츠 → 화면 뷰 모델 변환 + 구독(ContentProvider)
    i18n/             # 한영 자동 번역 (사전·규칙·언어 감지·LanguageProvider, 아래 "한영 자동 번역" 참고)
  vite.config.ts      # 빌드 결과를 landing/dist/ 에 만든 뒤 루트 index.html 로 복사
images/               # 랜딩 이미지 (상대경로 images/… 로 참조 → Pages 서브경로에서도 동작)
```

```bash
npm install            # 빌드 도구(devDependencies). 서버 실행에는 필요 없음
npm run build          # landing/ → 루트 index.html 갱신 (결과물을 커밋하세요)
npm start & npm run dev:landing   # 디자인 수정용 개발 서버 (5173). /api·이미지는 8080 서버로 프록시
npm run typecheck      # TypeScript 검사
```

**어드민 연동 방식** — 랜딩 React 앱이 관리자 콘텐츠를 **직접 렌더**합니다.
`cms-bridge.js` 는 API 서버 주소를 정하고 `/api/public/content` 를 읽어 `window.CuberryContent` 에 저장한 뒤
`cuberry:content` 이벤트만 보냅니다(`<html data-cms-native>` 일 때). DOM 을 복제·수정하던 예전 어댑터는 제거했습니다.

| 어드민 | 랜딩 반영 위치 |
| --- | --- |
| 사이트 문구 | 내비 브랜드명, 히어로 eyebrow·제목(마지막 단어 강조)·설명, 연락처(문의 섹션·푸터) |
| 상품 | AI 광고 가격 카드 (히어로와 가격 노출을 중복하지 않음; slug 가 standard/deluxe/premium 이면 상세 구성 목록 사용) |
| 포트폴리오 | Portfolio 섹션 — `source=drive` 는 DRIVE FILM 탭, 나머지는 WORKS 탭; 처음 6건만 그리고 필요하면 더 보기 |
| 팀 프로필 | Team 섹션 — 역할은 `역할 · 소속` 으로 나눠 표시, 이력은 카드별로 펼쳐 확인, `[텍스트](https://…)` 는 링크, 사진 위치 반영 |
| FAQ | FAQ 아코디언 |
| 상담 문의 | 랜딩 문의 폼 → `POST /api/partnership` (회사/이름·이메일 필수) |

상품·포트폴리오·팀·FAQ 를 모두 비공개로 돌리면 해당 섹션이 숨겨집니다.
어드민 탭에서 저장한 뒤 이미 열어 둔 랜딩 탭으로 돌아오면 `focus` 시 공개 API 를 다시 읽어 자동 갱신합니다.
`npm test` 는 빌드 산출물에 `cms-bridge.js`(상대경로)·`data-cms-native`·`CuberryApi.url('/api/partnership')` 배선이 있는지 검사하고,
`npm run test:cms` 는 실제 번들을 jsdom 에서 돌려 관리자 값 반영을 확인합니다.

## 한영 자동 번역 (KO · EN)

랜딩은 **한국어와 영어를 자동으로 전환**합니다. 번역 API 키도, 네트워크 호출도 필요 없습니다 —
번역문은 `landing/src/i18n/messages.ts` 사전에 들어 있고, 화면의 한국어 문구가 이 사전을 거쳐 영어로 바뀝니다.

**언어가 정해지는 순서**

| 순서 | 기준 | 예 |
| --- | --- | --- |
| 1 | 주소의 `?lang=` | `https://…/?lang=en` — 영어 화면 링크를 그대로 공유 |
| 2 | 방문자가 고른 값 | 헤더의 **KO / EN** 버튼 → `localStorage("cuberry:lang")` 에 저장 |
| 3 | 브라우저 언어 | 영어권 브라우저로 처음 오면 영어 화면 (`navigator.languages`) |
| 4 | 기본값 | 한국어 |

- 방문자가 직접 고른 언어는 자동 감지보다 우선하고 다음 방문에도 유지됩니다.
- 전환하면 `<html lang>`·`<title>`·`<meta name="description">` 까지 함께 바뀌고, 주소에 `?lang=` 이 붙습니다(새로고침 없음).
- 푸터의 국문 브랜드 표기(`큐브베리`)처럼 **일부러 한국어로 남기는 문구**는 사전의 `koOnly` 에 있습니다.

**어드민에서 저장한 값도 번역됩니다**

- 상품·포트폴리오·팀·FAQ·히어로 문구는 방문자에게 그대로 보이는 관리자 입력값이라, 사전에 같은 한국어가 있으면 영어 화면에서도 영어로 나옵니다.
- 금액·길이·특허번호처럼 숫자가 섞인 값은 **규칙으로 자동 변환**합니다 — `29만원~` → `from ₩290,000`, `15초 · 최대 5컷` → `15s · up to 5 cuts`, `제10-3002930호` → `No. 10-3002930`.
- 사전에도 규칙에도 없는 새 문구는 **한국어 원문 그대로** 나옵니다(글자가 사라지는 일이 없습니다). 영어 문장을 붙이려면 사전에 한 줄만 더하면 됩니다.

**새 문구를 추가할 때**

```ts
// landing/src/i18n/messages.ts
"새로 만든 섹션 제목": "The new section title",
```

```bash
npm test                # 빠진 번역이 있으면 여기서 바로 실패합니다 (사전 커버리지 검사)
npm run test:i18n       # 실제 브라우저 동작(자동 감지·토글·CMS 번역)을 jsdom 으로 확인
npm run build:landing   # 루트 index.html 갱신 (결과물을 커밋)
```

| 파일 | 역할 |
| --- | --- |
| `landing/src/i18n/messages.ts` | ko → en 사전 · 숫자 변환 규칙 · 언어별 제목/설명 · `koOnly`(번역하지 않는 문구) |
| `landing/src/i18n/translate.ts` | 순수 변환 로직 — `translate()` · 자동 감지(`resolveLanguage`) · 저장값/주소 처리 |
| `landing/src/i18n/LanguageContext.tsx` | `LanguageProvider` · `useI18n()` · `<T>`(줄바꿈 문구) · 문서 언어·제목 반영 |
| `landing/src/components/LangToggle.tsx` | 헤더와 모바일 메뉴의 KO / EN 버튼 |

검색엔진에는 빌드할 때 `hreflang`(`ko` · `en` · `x-default`) 링크가 함께 들어갑니다
(`landing/vite.config.ts` 의 `injectLanguageAlternates` — HTML 에 직접 쓰면 Vite 가 번들 대상으로 오해해 빌드가 깨집니다).

## 팀 프로필 (PD·감독 얼굴 사진 / 이력)

어드민 → **Team (팀 프로필)** 에서 랜딩의 `03 / Team profile` 섹션을 관리합니다.

- **얼굴 사진**: 파일 업로드(JPG·PNG·WEBP, 큰 사진은 브라우저에서 자동 축소) 또는 URL 입력, 사진 삭제
- **얼굴 위치**: 세로 위치 슬라이더(0% = 위, 100% = 아래)로 카드 안에서 얼굴이 잘리지 않게 조정, 미리보기 제공
- **이름·한 줄 소개·이력**: 이력은 한 줄에 하나씩 작성, `[표시 텍스트](https://주소)` 줄은 링크로 표시
- **정렬·공개 여부**: Sort 값 순서로 카드가 배치되고, 비공개/삭제한 사람은 랜딩에서 숨겨집니다
- 새로 추가한 사람은 팀 섹션 끝(정렬 순서 위치)에 카드로 추가됩니다
- 기존 DB도 서버를 처음 재시작할 때 현재 랜딩의 5명 정보로 한 번만 자동 등록됩니다

> **프로필을 지울 때 주의** — 서버는 시작할 때 `server/migrations/team-profile-2026.mjs` 로 "예전 그대로인 로스터"를
> 현재 시드로 한 번 올립니다. 그래서 **기본 로스터에서 한 명만 지우면**(정확히 12명이 남으면) 재시작 때 그 사람이
> 다시 살아납니다. 영구 삭제는 ① 어드민에서 삭제 → ② **Settings → GitHub에 백업 및 배포** 로 `server/seed.json` 을
> 지금 상태에 맞춰 두는 순서로 하세요(시드와 DB 가 같아지면 마이그레이션이 손대지 않습니다).
> `test/team-profile.mjs` 도 이 편집 자유도를 전제로 검사합니다 — 프로필 **추가·삭제**는 통과하고,
> 이름 중복 · 이력/사진이 기본값과 다름 · 순서 뒤섞임 · 기본 로스터 사진 파일 누락만 실패로 잡습니다.

## 어드민 로그인

| 항목 | 내용 |
| --- | --- |
| 초기 비밀번호 | 로컬 새 DB: `cuberry2026` · Render: Blueprint 설정 시 입력한 `ADMIN_PASSWORD` |
| 변경 | 어드민 → Settings → Password |
| 세션 | 14일, 비밀번호 변경 시에도 유지 |

로그인 화면에는 현재 서버 상태에 맞는 안내가 표시됩니다.
초기 비밀번호를 그대로 쓰는 중이면 초기 비밀번호를, 이미 바꿨다면 재설정 방법을 보여 줍니다.

### 비밀번호를 잊었을 때

```bash
ADMIN_PASSWORD='새비밀번호' RESET_ADMIN_PASSWORD=1 npm start
```

- 위 명령으로 서버를 한 번 띄우면 관리자 비밀번호가 `새비밀번호` 로 재설정되고, 기존 로그인 세션은 모두 끊깁니다.
- 재설정 후에는 `RESET_ADMIN_PASSWORD` 없이 평소처럼 실행하세요.
- `ADMIN_PASSWORD` 만 설정하고 `RESET_ADMIN_PASSWORD` 를 주지 않으면 기존 비밀번호는 바뀌지 않습니다.
  (관리자 계정이 아직 없는 새 DB라면 이 값으로 계정이 만들어집니다.)
- 재설정할 때는 잠시 멈추고 `data/cuberry.sqlite` 를 백업해 두면 안전합니다.

### 로그인이 안 될 때 점검 순서

0. **`어드민 API 서버 없음` (404/405) 안내가 떴다면** — 지금 열어둔 주소가 정적 호스트인데 API 서버 주소가 비어 있습니다.
   저장소의 `BAKED_API_ORIGIN` 이 비어 있는지, 또는 이 브라우저의 localStorage 에 잘못된 주소가 저장됐는지(`?api=same` 으로 초기화) 확인하세요.
   로그인 화면의 **API 서버 주소** 카드에 Node 서버 주소를 넣고 저장해도 됩니다. (위 "원격 API 모드" 참고)
1. 서버 로그 확인 — 기동 시 `Login: 초기 비밀번호 cuberry2026 (아직 변경되지 않음)` 처럼 현재 상태를 알려 줍니다.
2. 로그인 실패 로그 — `로그인 실패 (IP) 3/10 - 비밀번호 12자, 본문 키: [password]` 형식으로 남습니다.
   - `비밀번호 0자` 로 찍히면 요청 본문이 서버까지 전달되지 않은 것입니다(프록시 문제).
   - `[cors] 거부된 Origin: …` 이 찍히면 `ADMIN_ALLOWED_ORIGINS` 에 그 주소를 추가하세요.
     (GitHub Pages 주소는 기본 허용 목록에 있으므로 이 로그에 찍힐 수 없습니다. 찍힌다면 다른 주소로 열어둔 것입니다.)
3. 비밀번호를 5분 안에 10회 틀리면 잠시 잠깁니다. 응답의 `retryAfter`(초)만큼 기다리면 다시 시도할 수 있습니다.
4. 브라우저에서 직접 확인: `GET /api/health`, `GET /api/auth/status` (로그인 화면 안내 문구에 사용), `GET /api/config` (허용된 Origin 목록과 공개 주소).
   `allowedOrigins` 가 `[]` 이면 그 서버는 아직 이 변경 이전 코드입니다 — 재배포하세요.
5. 원격 API 모드에서 `…서버에 연결하지 못했습니다` 가 뜨면 — 서버가 잠들어 있거나(무료 플랜 콜드 스타트), 주소가 잘못됐거나, CORS가 거부된 것입니다. DevTools Console의 CORS 오류 문구로 구분할 수 있습니다.

## 테스트

```bash
npm test           # 의존성 없음 · 318건 (client-origin 44 + static-paths 18 + server-wiring 64 + i18n-coverage 5 + team-profile + security 63 + notify 63 + cron-backup 61)
npm run test:security # 보안 회귀 63건 (XFF 우회·CSP·압축/ETag·경로 보호·업로드 시그니처·허니팟·폼 토큰/Turnstile)
npm run test:notify  # 문의 알림 63건 (웹훅 성공·백오프 재시도·실패 보존·UNIQUE 재발송·마스킹·킬 스위치, 외부 요청 0)
npm run test:cron    # 자동 백업 61건 (시크릿 503/401·무변경 skip·내용 변경 재커밋·목 GitHub API, 외부 요청 0)
npm run test:dom   # jsdom 필요 · 79건 (서버가 켜져 있어야 함)
npm run test:cms   # jsdom 필요 · 46건 (서버 없이 React 랜딩 + mock API)
npm run test:i18n  # jsdom 필요 · 55건 (한영 자동 감지·토글·CMS 값 번역)
```

`main` 브랜치와 모든 PR 에서는 `.github/workflows/ci.yml` 이 typecheck → `npm test` → build →
**커밋된 번들 최신 여부**(`git diff --exit-code index.html admin-v2/index.html`) → 서버 종단 테스트까지 자동 실행합니다.

| 파일 | 무엇을 검증하나 |
| --- | --- |
| `test/client-origin.mjs` | `admin/index.html`·`cms-bridge.js` 의 **실제 소스에서** Origin 결정 코드와 서브경로 라우팅 코드를 그대로 뽑아 실행. `?api=` / localStorage / `BAKED_API_ORIGIN` 우선순위, `javascript:` 같은 잘못된 값 거부, `?api=same` 초기화, `/Landing_Cuberry/admin/…` 에서의 `adminBase`·`siteRoot`·`pageFromPath`, **로컬 개발 가드**(localhost·127.0.0.1·`[::1]`). 마지막 절에서는 어드민·랜딩(`index.html` 의 `cms-bridge.js` 로드와 문의 폼 호출 포함)·서버 기본값·`render.yaml`·`render.free.yaml` **여러 곳에 적힌 배선이 어긋나면 실패**한다 |
| `test/server-wiring.mjs` | 서버를 실제로 띄워(저장소 밖 임시 `DATA_DIR`) HTTP 로 확인. ① **환경변수 없이** Pages Origin 사전요청·로그인 성공 ② 설정·상품·포트폴리오·FAQ·팀의 PUT 저장 후 관리자 API와 공개 API에서 다시 조회되는지 ③ 서버가 서빙하는 `/admin`·`/admin/portfolio`·`/cms-bridge.js` 에는 굽힌 주소가 비워지는지 ④ `ADMIN_ALLOWED_ORIGINS` 추가·`*` 허용 동작 |
| `test/security.mjs` | 실제로 재현됐던 보안 문제를 회귀 테스트로 고정. ① `X-Forwarded-For` 를 바꿔가며 로그인 제한 우회 불가 ② `TRUST_PROXY=1` 일 때 XFF 오른쪽 hop 만 신뢰 ③ `*` CORS 모드에서 쿠키 자격증명 미허용 ④ 보안 헤더·CSP(환경변수로 끄기) ⑤ Brotli/gzip 압축과 ETag 304 ⑥ 인코딩된 `..`(`%2e%2e%2f`)·형제 폴더 읽기 차단 ⑦ 업로드 MIME 위조 거부 ⑧ 문의 허니팟 미저장 ⑨ robots/sitemap 서빙 ⑩ `REQUIRE_ADMIN_PASSWORD=1` 기동 거부 ⑪ 폼 토큰·Turnstile — `off`/`flag`/`strict` 3단 정책, 3초 미만·만료·위조 토큰이 저장은 되되 `review` 로 잡히는지, 검증 실패가 500 을 만들지 않는지 |
| `test/notify.mjs` | Phase 1 문의 알림. 로컬 목 웹훅·목 Resend 서버로 **외부 요청 없이** 실제 서버를 띄워 ① 성공 → `sent`·`attempts 1` ② 500 1회 → 백오프 재시도 후 `sent`·`attempts 2`·호출 간격 준수 ③ 계속 실패 → `failed` + `last_error` (문의 접수는 200 유지) ④ UNIQUE — 재발송을 여러 번 해도 행은 1개·시도만 증가 ⑤ env 미설정 → 알림 행 0 ⑥ `NOTIFY_DISABLED=1` → 발송 0 ⑦ `NOTIFY_MASK_CONTACT=1` → 원본 연락처 평문 없음 · 이메일(Resend) 채널·인증 401·`status` 필터·`summary.lastNotification` |
| `test/cron-backup.mjs` | Phase 3 자동 백업. **목 GitHub Contents API** 를 로컬에 띄우고(`GITHUB_API_BASE` 오버라이드) 실제 서버로 확인 — ① `CRON_SECRET` 미설정 `503`·GitHub 호출 0 ② 틀린 시크릿(헤더 없음·짧은 값·아주 긴 값) `401`·호출 0 ③ 올바른 시크릿 → 커밋 1회(경로·branch·base64 디코드 내용·메시지까지) ④ 즉시 재호출 → `skipped: "no-change"` + **GitHub 요청 0건** ⑤ 콘텐츠 변경 → 재커밋 ⑥ 수동 백업 뒤 크론 skip ⑦ `GITHUB_TOKEN` 미설정 `503`·실패는 해시를 남기지 않음 ⑧ `GET` 으로는 백업이 돌지 않음 · `summary.lastBackupAt/Hash` · 해시 정규화(키 순서·`exportedAt`)·상수시간 비교 단위 검증 |
| `test/static-paths.mjs` | GitHub Pages 를 흉내 낸 정적 서버(`/Landing_Cuberry/` 서브경로, 디렉터리 → `index.html`, 슬래시 없으면 301, `/api/*` 는 404)를 띄우고, 랜딩이 참조하는 경로 27건이 전부 해결되는지·루트 절대경로(`/…`)가 남아있지 않은지 확인 |
| `test/dom-flow.mjs` | jsdom 으로 어드민을 실제로 띄워 로그인 → 개요 → 포트폴리오 → 팀 → 설정 → 로그아웃까지 클릭해 넘어간다. `fetch` 를 **브라우저 CORS 규칙을 흉내 낸 래퍼**로 바꿔, 사전요청(OPTIONS)을 실제로 보내고 `Access-Control-Allow-Origin` 이 문서 Origin 과 다르면 브라우저처럼 실패시킨다. 시나리오 **A**(Pages + `?api=`)·**B**(로컬 개발 가드 — 운영 주소가 박힌 HTML 을 `127.0.0.1` 에서 열어 운영 서버로 요청이 한 건도 새지 않는지)·**C**(Pages + 굽힌 주소만 — `?api=`·저장값 없이 로그인 완주)·**D**(허용 목록에 없는 Origin 차단). 마지막으로 어떤 시나리오에서도 운영 주소로 요청이 가지 않았는지 점검한다 |
| `test/i18n-coverage.mjs` | 사전 커버리지 — 랜딩 소스의 한국어 문구와 운영 기본값(`server/seed.json`)에 **빠진 영어 번역이 없는지**, 영어 문장에 한국어가 섞이지 않았는지 검사한다. 새 문구를 번역 없이 추가하면 실패한다 |
| `test/landing-i18n.mjs` | 실제 번들을 jsdom 에서 돌려 ①한국어 브라우저→한국어, ②영어 브라우저→자동 영어(화면·`alt`·`aria-label`·`placeholder` 에 한국어가 한 글자도 남지 않는지 전수 확인), ③KO/EN 토글이 화면·`<html lang>`·제목·`?lang=`·저장값을 함께 바꾸는지, ④`?lang=` > 저장값 > 브라우저 언어 우선순위, ⑤어드민 저장값(사전 등록분은 번역·미등록분은 원문 유지)까지 확인한다 |
| `test/landing-cms.mjs` | 새 React 단일 HTML을 실제로 마운트하고 mock 공개 API를 연결한다. API 응답이 React보다 먼저 와도 기다렸다가 히어로·상품·드라이브/일반 포트폴리오·팀·FAQ·연락처를 모두 관리자 값으로 바꾸는지, 원본 React 섹션은 숨기는지, FAQ 상호작용과 탭 `focus` 자동 갱신까지 확인한다. |

`test/dom-flow.mjs` 는 서버가 켜져 있어야 합니다:

```bash
npm start                              # 다른 터미널. 환경변수 없이 켜도 된다
npm i -D jsdom && npm run test:dom     # Pages 주소는 서버 기본 허용 목록에 있으므로 그것까지 함께 검증된다
npm run test:cms                       # 별도 서버 불필요
```

`TEST_API_ORIGIN`, `TEST_ADMIN_PASSWORD` 환경변수로 대상 서버와 비밀번호를 바꿀 수 있습니다.
