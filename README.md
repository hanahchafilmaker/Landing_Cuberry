# Cuberry Landing

큐브베리 랜딩 페이지(`index.html`)와 자체 어드민 콘솔(`/admin`)을 한 개의 Node 서버로 서비스합니다.

## 실행

```bash
npm start              # http://localhost:8080/  ,  http://localhost:8080/admin
PORT=3000 npm start    # 포트 변경
npm test               # 의존성 없이 도는 검증 (주소 결정·Pages 경로·서버 CORS/서빙 99건)
npm i -D jsdom         # 아래 종단 테스트를 돌리려면 한 번만 (선택)
npm run test:dom       # 실제 DOM + 브라우저 CORS 규칙 시뮬레이션 종단 테스트 (76건)
```

- 랜딩: `/`
- 어드민: `/admin` (포트폴리오, 상품, FAQ, 팀 프로필, 상담 문의, 사이트 문구, 비밀번호 관리)
- 데이터: `data/cuberry.sqlite` (SQLite, 최초 실행 시 `server/seed.json` 으로 자동 시드) — `DATA_DIR` 환경변수로 다른 폴더를 지정할 수 있습니다(테스트가 사용)
- 업로드 이미지: `data/uploads/`

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
| Node 서버 (API) | `https://landing-cuberry-admin.onrender.com` — `admin/index.html`·`cms-bridge.js` 의 `BAKED_API_ORIGIN` |
| GitHub Pages (화면) | `https://hanahchafilmaker.github.io/Landing_Cuberry/` — `server/index.mjs` 의 `DEFAULT_ALLOWED_ORIGINS` |

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

**1) 서버 쪽** — GitHub Pages 주소(`https://hanahchafilmaker.github.io`)는 `server/index.mjs` 의
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

### 무료 플랜에서 콘텐츠 지키기 (seed.json 워크플로)

무료 인스턴스는 재배포·재시작마다 `data/` 가 사라져 `server/seed.json` 으로 다시 시작합니다.
그래서 **현재 콘텐츠를 seed.json으로 되돌려 커밋**해 두면 복구 작업 없이 항상 최신 상태로 켜집니다.

1. 어드민 → **Settings → Backup → "콘텐츠 JSON 내보내기"** (`GET /api/admin/export`, 관리자 로그인 필요)
2. 내려받은 파일을 `server/seed.json` 으로 덮어쓰고 커밋·푸시
3. 재배포되면 서버가 그 파일로 다시 시드합니다

내보내는 JSON은 `seed.json` 과 필드 이름이 완전히 같고, `inquiries`(상담 문의)와 `exportedAt` 만 추가로 담깁니다.
시드 로더는 이 두 키를 읽지 않으므로 그대로 `seed.json` 에 넣어도 안전합니다.

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

> **⚠ 랜딩을 다시 빌드해 올릴 때** — 현재 `index.html` 은 React + Tailwind 빌드 산출물입니다.
> 빌드 결과물에는 아래 두 가지가 기본적으로 들어 있지 않으므로, 새 빌드를 복사해 올 때마다 **반드시 다시 넣어 주세요.**
> `npm test`(`test/static-paths.mjs`·`test/client-origin.mjs`)가 빠져 있는지 검사합니다.
>
> 1. `<head>` 의 `<script src="cms-bridge.js" defer></script>` — **루트 절대경로(`/cms-bridge.js`)로 쓰면 Pages 에서 404**
> 2. B2B 문의 폼의 호출을 `fetch(window.CuberryApi&&window.CuberryApi.url?window.CuberryApi.url('/api/partnership'):'/api/partnership', …)` 로
>
> 빌드 소스(`new-design/`, Git 에 들어 있지 않음)에서 고치는 편이 دائم적입니다.
>
> 참고로 새 랜딩에는 어드민 콘텐츠 연동 훅(`data-cms="…"`, `#cms-extra-works` 등)이 들어 있지 않아,
> **어드민에서 고친 문구·포트폴리오·팀은 현재 랜딩에 반영되지 않습니다.** (B2B 문의 접수만 동작)
> 연동을 되살리려면 빌드 소스에 위 훅을 넣어야 합니다.

## 팀 프로필 (PD·감독 얼굴 사진 / 이력)

어드민 → **Team (팀 프로필)** 에서 랜딩의 `03 / Team profile` 섹션을 관리합니다.

- **얼굴 사진**: 파일 업로드(JPG·PNG·WEBP, 큰 사진은 브라우저에서 자동 축소) 또는 URL 입력, 사진 삭제
- **얼굴 위치**: 세로 위치 슬라이더(0% = 위, 100% = 아래)로 카드 안에서 얼굴이 잘리지 않게 조정, 미리보기 제공
- **이름·한 줄 소개·이력**: 이력은 한 줄에 하나씩 작성, `[표시 텍스트](https://주소)` 줄은 링크로 표시
- **정렬·공개 여부**: Sort 값 순서로 카드가 배치되고, 비공개/삭제한 사람은 랜딩에서 숨겨집니다
- 새로 추가한 사람은 팀 섹션 끝(정렬 순서 위치)에 카드로 추가됩니다
- 기존 DB도 서버를 처음 재시작할 때 현재 랜딩의 5명 정보로 한 번만 자동 등록됩니다

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
npm test           # 의존성 없음 · 99건 (client-origin 43 + static-paths 15 + server-wiring 41)
npm run test:dom   # jsdom 필요 · 76건 (서버가 켜져 있어야 함)
```

| 파일 | 무엇을 검증하나 |
| --- | --- |
| `test/client-origin.mjs` | `admin/index.html`·`cms-bridge.js` 의 **실제 소스에서** Origin 결정 코드와 서브경로 라우팅 코드를 그대로 뽑아 실행. `?api=` / localStorage / `BAKED_API_ORIGIN` 우선순위, `javascript:` 같은 잘못된 값 거부, `?api=same` 초기화, `/Landing_Cuberry/admin/…` 에서의 `adminBase`·`siteRoot`·`pageFromPath`, **로컬 개발 가드**(localhost·127.0.0.1·`[::1]`). 마지막 절에서는 어드민·랜딩(`index.html` 의 `cms-bridge.js` 로드와 문의 폼 호출 포함)·서버 기본값·`render.yaml`·`render.free.yaml` **여러 곳에 적힌 배선이 어긋나면 실패**한다 |
| `test/server-wiring.mjs` | 서버를 실제로 띄워(저장소 밖 임시 `DATA_DIR`) HTTP 로 확인. ① **환경변수 없이** 켠 서버에서 Pages Origin 의 사전요청이 204 로 통과하고 목록에 없는 Origin 은 403, Pages Origin 으로 로그인까지 성공 ② 서버가 서빙하는 `/admin`·`/admin/portfolio`·`/cms-bridge.js` 에는 굽힌 주소가 비워져 오고 디스크 파일에는 남아 있는지 ③ `ADMIN_ALLOWED_ORIGINS` 가 기본 목록을 대체하지 않고 추가하는지, `*` 는 전부 허용하는지 |
| `test/static-paths.mjs` | GitHub Pages 를 흉내 낸 정적 서버(`/Landing_Cuberry/` 서브경로, 디렉터리 → `index.html`, 슬래시 없으면 301, `/api/*` 는 404)를 띄우고, 랜딩이 참조하는 경로 27건이 전부 해결되는지·루트 절대경로(`/…`)가 남아있지 않은지 확인 |
| `test/dom-flow.mjs` | jsdom 으로 어드민을 실제로 띄워 로그인 → 개요 → 포트폴리오 → 팀 → 설정 → 로그아웃까지 클릭해 넘어간다. `fetch` 를 **브라우저 CORS 규칙을 흉내 낸 래퍼**로 바꿔, 사전요청(OPTIONS)을 실제로 보내고 `Access-Control-Allow-Origin` 이 문서 Origin 과 다르면 브라우저처럼 실패시킨다. 시나리오 **A**(Pages + `?api=`)·**B**(로컬 개발 가드 — 운영 주소가 박힌 HTML 을 `127.0.0.1` 에서 열어 운영 서버로 요청이 한 건도 새지 않는지)·**C**(Pages + 굽힌 주소만 — `?api=`·저장값 없이 로그인 완주)·**D**(허용 목록에 없는 Origin 차단). 마지막으로 어떤 시나리오에서도 운영 주소로 요청이 가지 않았는지 점검한다 |

`test/dom-flow.mjs` 는 서버가 켜져 있어야 합니다:

```bash
npm start                              # 다른 터미널. 환경변수 없이 켜도 된다
npm i -D jsdom && npm run test:dom     # Pages 주소는 서버 기본 허용 목록에 있으므로 그것까지 함께 검증된다
```

`TEST_API_ORIGIN`, `TEST_ADMIN_PASSWORD` 환경변수로 대상 서버와 비밀번호를 바꿀 수 있습니다.
