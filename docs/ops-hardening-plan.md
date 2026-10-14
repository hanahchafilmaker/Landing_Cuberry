# 운영 안정화 설계안 (Ops Hardening Plan)

작성: 2026-10-13 · 대상 브랜치: `arena/408305a4-landing-cuberry` · 기준 커밋: `72b6921`

이 문서는 **구현 전 승인용 설계안**입니다. 코드 변경은 승인 후 시작합니다.

> **진행 상황 (2026-10-13)**
> - 승인된 결정: 진행 순서 **1→2→3→4**, Phase 2 스팸 기본 모드 **`flag`**(저장하되 확인 필요 표시).
> - **Phase 1 (문의 알림) 구현 완료** — `server/lib/notify.mjs`(새 파일) · `test/notify.mjs`(63건) ·
>   어드민 문의 배지·다시 보내기 · 개요의 "마지막 문의 알림" 줄 · `notifications` 테이블. **환경변수 미설정 시
>   동작 변화 0**이므로 먼저 배포한 뒤 웹훅/Resend 키를 등록하면 켜집니다.
> - **Phase 2 (스팸 2차 방어) 구현 완료** — `server/lib/form-token.mjs`(새 파일) · `GET /api/form-token` ·
>   `FORM_TOKEN_MODE` 3단 정책(기본 `flag`) · Turnstile siteverify(선택) · 어드민 `review` 상태/배지 ·
>   `test/security.mjs` [11]. 기본 `flag` 에서는 정상 문의도 발급 후 3초 안이면 `review` 로 남지만 **저장은 되고**
> 알림만 보류되므로 리드를 잃지 않습니다. 검증 실패가 응답 500 을 만들지 않음도 테스트로 고정했습니다.
> - **Phase 3 (seed.json 백업 자동화) 구현 완료** — `server/lib/backup.mjs`(새 파일: 시크릿 상수시간 비교 ·
>   `exportedAt` 제외 SHA-256 해시) · `POST /api/cron/backup`(CRON_SECRET 미설정 503 / 불일치 401) ·
>   무변경이면 `{ ok, skipped: "no-change" }` 로 끝나 **GitHub 호출 0건**(무한 재배포 방지) · `meta` 에
>   `last_backup_hash`/`last_backup_at` 기록 · 어드민 개요의 "마지막 백업" 줄 · `test/cron-backup.mjs`(61건,
>   목 GitHub API) · `.github/workflows/backup-seed.yml`(6시간 cron). 수동 백업 버튼은 명시적 요청이라
>   무변경이어도 커밋하되 해시를 기록해 다음 크론이 건너뜁니다. `CRON_SECRET` 미등록 시 동작 변화 0.
> - Phase 4: 대기.

---

## 0. 목표와 비목표

| | 내용 |
|---|---|
| **목표** | ① 문의가 들어오면 사람이 즉시 안다 ② 스팸을 한 겹 더 막는다 ③ 무료 플랜에서도 콘텐츠가 자동으로 보존된다 ④ 서버 파일을 손댈 수 있는 크기로 쪼갠다 |
| **비목표** | 디자인 변경, CMS 항목 확장(연혁·특허 등), 성능 최적화, 분석 도구 도입 — 이번 범위 밖이며 별도 축으로 진행 |

---

## 1. 현황 (실측 근거)

| 항목 | 실측 | 위치 |
|---|---|---|
| 문의 저장 후 **알림 수단 0건** | `nodemailer/sendgrid/slack/webhook` 검색 결과 0 | `server/index.mjs` |
| 문의 상태 | `new` / `contacted` / `closed`, PATCH 있음. 어드민을 열어야만 확인 가능 | `server/index.mjs:1249` |
| 스팸 방어 | 허니팟(`website`) 1종 + IP당 20건/시간 | `server/index.mjs:1146~1160` |
| 요청 제한 저장소 | 인메모리 `Map` → 재시작 시 초기화, 다중 인스턴스 공유 불가 | `attemptGate()` |
| 백업 | 어드민 버튼(수동)만 존재. 자동 스케줄 없음 | `backupSeedToGitHub()` |
| 스케줄러 | 만료 세션 정리 타이머 1개(매시간, `unref`) | `server/index.mjs:337` |
| **런타임 의존성 0개** | `package.json`에 `dependencies` 없음, 서버는 node 내장 모듈만 import. Render 빌드도 `npm install --omit=dev` | `package.json`, `render.yaml` |
| 서버 크기 | 1,366줄 단일 파일 | `server/index.mjs` |
| 무료 플랜 | 재시작마다 `data/` 소실 → `server/seed.json`으로 재시드 | README |

### 여기서 나오는 설계 제약 3가지

1. **의존성을 추가하지 않는다.** 알림은 `fetch`로 부를 수 있는 REST/Webhook(Slack Incoming Webhook, Resend REST API)으로 구현한다. `nodemailer`는 넣지 않는다.
2. **인스턴스 내부 타이머에 중요한 것을 맡기지 않는다.** Render 무료 인스턴스는 잠들고, 깨어나면 메모리도 `data/`도 초기화된다. 자동 백업은 **GitHub Actions cron**이 담당한다.
3. **알림 실패가 문의 접수를 막으면 안 된다.** 알림은 항상 비동기·실패 무시, 상태는 DB에 남겨 어드민에서 재발송한다.

---

## 2. 단계 구성

| Phase | 내용 | 예상 공수 | 리스크 |
|---|---|---|---|
| **1** | 문의 알림 (웹훅·이메일) + 재시도 + 어드민 상태 표시 | 3~4h | 낮음 (env 미설정 시 완전 비활성) |
| **2** | 스팸 2차 방어 (서명된 폼 토큰, Turnstile 선택) | 2h | 낮음 (기본값은 경고 모드) |
| **3** | seed.json 백업 자동화 (Actions cron + 변경 감지) | 2h | 중간 (무한 재배포 루프 방지 필수) |
| **4** | 서버 모듈 분리 | 4h | 중간 (동작 변경 없는 순수 이동) |

**순서 근거**: 1 → 2 → 3 → 4. 기능을 **새 파일로 추가**한 뒤(1·2·3), 마지막에 파일 구조를 정리한다(4). 분리를 먼저 하면 이후 모든 변경이 충돌투성이가 된다.

---

## 3. Phase 1 — 문의 알림

### 3.1 흐름

```
POST /api/partnership
  ├─ 허니팟 검사 (현행 유지)
  ├─ 필드 검증 (현행 유지)
  ├─ INSERT inquiries           ← 여기서 커밋 끝. 응답은 알림을 기다리지 않는다
  ├─ 응답 200 { id: code, inquiryId }   ← 응답 형태 변경 없음 (기존 테스트 호환)
  └─ void notifyInquiry(row)    ← 백그라운드
        ├─ notifications 행 생성 (status=pending)
        ├─ 채널별 발송 (webhook / email)
        ├─ 실패 시 1s → 5s → 25s 백오프 재시도 (최대 3회)
        └─ 최종 실패는 status=failed + last_error 저장 → 어드민에서 재발송
```

핵심: **문의 접수와 알림을 트랜잭션으로 묶지 않는다.** Slack이 죽어도 리드는 남는다.

### 3.2 스키마 추가

`server/index.mjs` 의 `db.exec()` 블록에 추가 (기존 테이블은 `CREATE TABLE IF NOT EXISTS` 패턴 그대로 따름):

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY,
  inquiry_id INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,                          -- 'webhook' | 'email'
  target TEXT NOT NULL,                           -- 로그·표시용 (호스트 또는 수신 메일, 마스킹)
  status TEXT NOT NULL DEFAULT 'pending',         -- pending | sent | failed | skipped
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT,
  UNIQUE (inquiry_id, channel)                    -- 같은 문의·같은 채널은 1행만 → 중복 발송 방지
);
```

- `UNIQUE (inquiry_id, channel)` 덕분에 재시도·수동 재발송이 **새 알림을 만들지 않고** 기존 행의 `attempts`만 올린다.
- `PRAGMA foreign_keys = ON` 이 이미 켜져 있으므로 FK가 동작한다(문의 삭제 시 정리).
- 마이그레이션 파일 불필요 — `IF NOT EXISTS` 라 기존 DB에도 그대로 적용된다.

### 3.3 환경변수

| 변수 | 기본값 | 역할 |
|---|---|---|
| `NOTIFY_WEBHOOK_URL` | *(빈 값)* | Slack / Google Chat / 범용 Webhook. **비어 있으면 이 채널은 발송하지 않는다** |
| `NOTIFY_EMAIL_TO` | *(빈 값)* | 쉼표로 여러 명. 비어 있으면 이메일 채널 비활성 |
| `RESEND_API_KEY` | *(빈 값)* | 없으면 이메일 채널 자동 비활성 (SMTP 의존성 없음) |
| `NOTIFY_EMAIL_FROM` | `Cuberry <onboarding@resend.dev>` | Resend 검증 도메인 필요. 기본값은 Resend 테스트 발신자 |
| `NOTIFY_MASK_CONTACT` | `0` | `1`이면 Slack 본문의 이메일·전화를 마스킹 (`ab***@gmail.com`) — 서드파티 채널 개인정보 최소화 |
| `NOTIFY_DISABLED` | `0` | `1`이면 알림 전체 OFF. **장애 시 즉시 끄는 킬 스위치** |

> **모든 변수가 미설정이면 지금과 동작이 완전히 같다.** 배포 직후 아무 일도 일어나지 않으므로 안전하게 먼저 올릴 수 있다.

### 3.4 채널 어댑터

`server/lib/notify.mjs` (신규) — `fetch`만 사용한다.

- **웹훅**: `POST` body `{ text, blocks }`. Slack Incoming Webhook은 `{"text": "…"}` 만으로 동작하므로 범용 JSON으로 Slack·Google Chat·n8n·Make 모두 호환.
  ```
  [Cuberry] 새 상담 문의 CUB-261013-001
  홍길동 · 가나다컴퍼니 · AI 광고 · 500만원 이상
  ab***@gmail.com · 010-****-1234
  본문 요약 120자…
  → 어드민에서 확인: https://landing-cuberry-admin.onrender.com/admin-v2
  ```
  어드민 링크는 이미 있는 `PUBLIC_ORIGIN`(없으면 `RENDER_EXTERNAL_URL`)을 재사용한다.
- **이메일**: `POST https://api.resend.com/emails` (`Authorization: Bearer …`). HTML 본문 + `Reply-To` 를 **문의자 이메일**로 지정 → 어드민에서 메일 회신 버튼만 누르면 답장이 된다.
- 새 채널(Telegram, SMS)은 어댑터 1개 추가로 확장 가능한 구조로 둔다.

### 3.5 API 추가

| 메서드 | 경로 | 인증 | 역할 |
|---|---|---|---|
| GET | `/api/admin/notifications?status=failed` | 관리자 | 알림 목록(문의 코드·채널·상태·시도 횟수·에러) |
| POST | `/api/admin/notifications/:id/retry` | 관리자 | 수동 재발송 (`attempts` 초기화 후 즉시 1회) |

기존 `GET /api/admin/content` 의 `inquiries` 각 항목에 `notificationStatus` 필드를 덧붙인다(추가 쿼리 1회, N+1 회피).

### 3.6 어드민 UI (admin-v2)

`admin-v2/app/src/pages/AdminPage.tsx` 의 `InquiriesPage` (121행)에:

- 상태 컬럼 옆 **알림 배지** — `sent`(회색) / `pending`(노란) / `failed`(빨간 + 툴팁에 에러)
- `failed` 행에 **"다시 보내기"** 버튼 → 3.5 의 재발송 API
- 개요 카드에 "마지막 문의 알림" 1줄 추가

`admin-v2/app/src/lib/trpc.ts` 에 `notifications.list` / `notifications.retry` 프로시저 2개 추가(기존 `inquiries.updateStatus` 와 동일한 패턴).

### 3.7 테스트

`test/notify.mjs` (신규, `npm run test:notify`, CI에 추가) — **외부로 요청이 나가지 않게** `globalThis.fetch` 를 스텁으로 교체하고 서버를 실제로 띄운다:

1. 웹훅 성공 → `notifications.status = 'sent'`, `attempts = 1`
2. 웹훅 500 1회 → 재시도 후 `sent`, `attempts = 2`, 호출 간격이 백오프를 지켰는지
3. 웹훅 계속 실패 → `status = 'failed'`, `last_error` 저장, **문의 응답은 200이고 문의는 DB에 남아 있음**
4. `UNIQUE` 중복 방지 — 재발송 API를 두 번 호출해도 행이 1개, 발송 시도만 증가
5. env 미설정 → 알림 행이 아예 생성되지 않고 기존 동작과 동일 (회귀 방지)
6. `NOTIFY_DISABLED=1` → 발송 0건
7. `NOTIFY_MASK_CONTACT=1` → 웹훅 본문에 원본 이메일·전화가 평문으로 없음

---

## 4. Phase 2 — 스팸 2차 방어

현재는 허니팟 1종이라, 허니팟을 채우지 않는 봇(LLM 스팸 포함)은 그대로 저장된다. **다만 잘못된 차단은 진짜 문의를 잃는 것이므로, 기본값은 "저장하되 표시"로 시작한다.**

### 4.1 서명된 폼 토큰 (권장, 의존성 0)

1. `GET /api/form-token` → `{ token: "<ts>.<hmac>", issuedAt }`
   - `hmac = HMAC-SHA256(ts, secret)`, `secret` 은 `meta` 테이블의 `form_token_secret`(최초 1회 `randomBytes(32)` 로 생성·저장). 환경변수 설정 불필요.
2. 문의 폼이 화면에 들어오는 시점(`IntersectionObserver` 또는 첫 focus)에 토큰을 받아 hidden 필드에 넣는다.
3. `POST /api/partnership` 검증:
   - HMAC 불일치 / 위조 → 봇
   - `now - ts < 3초` → 봇 (사람은 3초 안에 폼을 못 채운다)
   - `now - ts > 6시간` → 만료된 캐시 페이지

**정책은 환경변수로 단계 전환**

| `FORM_TOKEN_MODE` | 동작 |
|---|---|
| `off` | 검증 결과를 `console.warn` 만 남기고 그대로 저장 (기존과 동일) |
| `flag` (기본) | 저장하되 `status='review'` + **알림 발송 안 함** → 어드민에 "확인 필요" 배지 |
| `strict` | 저장하지 않고 200 (허니팟과 동일 처리) |

운영에서 며칠 `flag` 로 관찰한 뒤 `strict` 로 올리는 전제. `inquiries.status` 허용 목록에 `review` 추가.

### 4.2 Cloudflare Turnstile (선택)

`TURNSTILE_SECRET` 이 있을 때만 `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` 1회 호출. 실패 시 위와 동일한 3단 정책 적용. 랜딩 정적 파일에도 스크립트 1줄 + 위젯 div가 필요하므로 **CSP 허용 목록 추가**가 함께 따라온다(`DEFAULT_CSP`).

### 4.3 테스트

`test/security.mjs` 에 [11] 추가 — 위조 토큰·3초 미만 토큰이 `strict` 모드에서 저장되지 않음, `off` 모드에서는 저장됨, 토큰 검증 실패가 **문의 접수 자체를 500으로 만들지 않음**.

---

## 5. Phase 3 — seed.json 백업 자동화

### 5.1 왜 Actions cron인가

서버 내부 `setInterval` 은 ① 인스턴스가 자면 실행되지 않고 ② 깨어나도 `data/` 가 비어 있어 백업할 것이 없다. Actions cron은 저장소 밖에서 동작하므로 무료 플랜 Sleep과 무관하다.

### 5.2 새 엔드포인트

```
POST /api/cron/backup
x-cron-secret: <CRON_SECRET>
```

- 세션 토큰 없이 동작. `CRON_SECRET` 미설정이면 **503** (실수로 열려 있는 크론 엔드포인트 방지).
- 비교는 `timingSafeEqual` (길이 다를 때 예외 처리 포함).
- 내부에서 기존 `backupSeedToGitHub()` 를 **그대로 재사용**한다.

### 5.3 변경 감지 (필수)

그냥 6시간마다 커밋하면 내용이 같아도 Render가 재배포를 반복한다(무료 플랜은 그때마다 콜드 스타트).

- `exportSeed()` 결과에서 `exportedAt` 을 제외한 JSON의 **SHA-256 해시**를 계산
- `meta.last_backup_hash` 와 비교 → 같으면 `200 { ok: true, skipped: "no-change" }` (커밋·푸시 없음)
- 다르면 커밋 후 `meta` 갱신, `last_backup_at` 도 저장
- 응답에 `{ ok, skipped, commitSha, changedAt }`

### 5.4 워크플로

`.github/workflows/backup-seed.yml` (신규)

```yaml
on:
  schedule: [{ cron: "17 */6 * * *" }]   # 6시간마다 (Render 재시작 주기보다 촘촘하게)
  workflow_dispatch:
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger seed backup
        env: { APP_URL: ${{ secrets.APP_URL }}, CRON_SECRET: ${{ secrets.CRON_SECRET }} }
        run: |
          code=$(curl -sS -o body.json -w '%{http_code}' -X POST "$APP_URL/api/cron/backup" -H "x-cron-secret: $CRON_SECRET")
          cat body.json
          test "$code" = 200
```

- `APP_URL`·`CRON_SECRET` 은 Actions Secrets 2개 추가.
- 실패하면 GitHub이 저장소 소유자에게 **이메일로 알린다** — 별도 모니터링 없이 백업 실패를 감지하는 효과가 있다. (Phase 1 완료 후에는 이 워크플로가 실패할 때 웹훅으로 보내는 것도 가능)

### 5.5 어드민 표시

`GET /api/admin/summary` 에 `lastBackupAt`, `lastBackupHash` 추가 → 개요 화면에 **"마지막 백업: 6시간 전 / 변경 없음으로 건너뜀"** 한 줄. 백업이 실제로 돌고 있는지 눈으로 확인할 수 있게 하는 것이 목적.

### 5.6 테스트

`test/cron-backup.mjs` (신규) — `GITHUB_TOKEN` 없이도 검증:

1. `CRON_SECRET` 미설정 → 503
2. 틀린 시크릿 → 401, GitHub 호출 0건 (`fetch` 스텁으로 검증)
3. 올바른 시크릿 + 내용 변화 → 커밋 1회
4. 즉시 재호출 → `skipped: "no-change"`, GitHub PUT **0건** (이 무한 재배포 방지가 핵심)
5. 잘못된 시크릿 길이(매우 긴 문자열)에서도 500이 아닌 401

---

## 6. Phase 4 — 서버 모듈 분리

**동작 변경 없는 순수 파일 이동.** 기능 추가가 모두 끝난 뒤 진행한다.

```
server/
  index.mjs            # 조립 + 기동 + 라우트 디스패치 (~200줄)
  lib/config.mjs       # 환경변수·CORS Origin·CSP·PUBLIC_ORIGIN·GitHub 설정
  lib/db.mjs           # DatabaseSync open · 스키마 · 시드 · meta 헬퍼
  lib/http.mjs         # send · readBody · ETag · 압축 · CORS · 보안 헤더 · serveFile
  lib/auth.mjs         # 비밀번호 해시 · 세션 · requireAdmin · clientIp · attemptGate
  lib/content.mjs      # row* 매퍼 · publicContent · adminContent · upsert*
  lib/inquiries.mjs    # 문의 생성 · 상태 변경
  lib/notify.mjs       # Phase 1
  lib/backup.mjs       # Phase 3
  routes/api.mjs       # 공개/관리자 라우트 테이블
  migrations/…
```

이동 규칙:

1. 함수를 **한 번에 하나의 파일**로 옮기고, 옮길 때마다 테스트 전체 실행
2. 함수 시그니처·로그 문구는 **한 글자도 바꾸지 않는다** (테스트가 로그 문구를 검증하는 경우가 있다)
3. 완료 기준: `npm run typecheck` + `npm test`(174) + `test:dom`(79) + `test:cms`(43) + `test:i18n`(51) 전부 통과, `git diff` 에 로직 변경이 없을 것

---

## 7. 부록 — 업로드 이미지 유실 (이번 범위 밖, 결정 필요)

무료 플랜에서는 `data/uploads/` 도 사라진다. README가 외부 URL 사용을 권장하는 이유다. 선택지:

| 방법 | 장점 | 비용 |
|---|---|---|
| Cloudflare R2 presigned PUT (AWS SigV4를 `node:crypto` 로 직접 서명) | 의존성 0 유지, 완전 자동 | 구현 ~100줄 + R2 버킷 설정 |
| 업로드 시 GitHub에 base64 커밋 (≤1MB) | 설정 0, 기존 백업 경로 재사용 | 저장소 팽창, 큰 파일 불가 |
| 현행 유지 (관리자가 외부 URL 입력) | 작업 0 | 관리자 수동, 휘발성 잔존 |

지금 당장의 리스크는 낮으므로 Phase 1~4 이후에 판단하는 것을 권장한다.

---

## 8. 변경 파일 목록 (예상)

| Phase | 신규 | 수정 |
|---|---|---|
| 1 | `server/lib/notify.mjs`, `test/notify.mjs` | `server/index.mjs` (DDL·라우트 3개·summary), `admin-v2/app/src/pages/AdminPage.tsx`, `admin-v2/app/src/lib/trpc.ts`, `package.json`, `.github/workflows/ci.yml`, `render.yaml`, `render.free.yaml`, README |
| 2 | `server/lib/form-token.mjs` | `server/index.mjs`, `landing/src/components/Contact.tsx`, `test/security.mjs`, README |
| 3 | `.github/workflows/backup-seed.yml`, `test/cron-backup.mjs` | `server/index.mjs`, `admin-v2/app/src/pages/AdminPage.tsx`, README |
| 4 | `server/lib/*.mjs`, `server/routes/api.mjs` | `server/index.mjs` (축소), 각 파일 import 경로 |

빌드 산출물(`index.html`, `admin-v2/index.html`)은 Phase 1·3에서 건드리지 않고, **Phase 2에서 랜딩을 수정할 때만** `npm run build` 로 다시 굽는다(CI가 최신성을 강제한다).

---

## 9. 리스크와 롤백

| 리스크 | 대응 |
|---|---|
| 알림 발송이 문의 접수를 지연·차단 | 비동기 + 실패 무시. 응답은 INSERT 직후 반환 (테스트 3번이 보장) |
| Slack/Resend 장애로 알림 유실 | DB에 `failed` 로 남고 어드민에서 재발송 + Actions 실패 시 GitHub 이메일 통지 |
| 개인정보가 서드파티 채널로 | `NOTIFY_MASK_CONTACT=1` 옵션, 웹훅 본문 기본 마스킹 검토 |
| 크론이 6시간마다 불필요한 재배포 유발 | 해시 비교로 무변경 시 커밋 생략 (테스트 4번) |
| 크론 엔드포인트가 열린 채 배포 | `CRON_SECRET` 미설정 시 503, 상수시간 비교 |
| 폼 토큰이 정상 문의를 차단 | 기본 `flag`(저장은 되고 알림만 보류) → 관찰 후 `strict`. 검증 오류도 절대 500 이 아님 |
| 모듈 분리 중 회귀 | 파일 단위 이동 + 매회 전체 테스트, 로직 변경 금지 |

**롤백**: Phase 1·2·3은 모두 환경변수로 즉시 무효화 가능(`NOTIFY_DISABLED=1`, `FORM_TOKEN_MODE=off`, 워크플로 비활성화). Phase 4는 커밋 revert.

---

## 10. 승인 후 진행 순서

1. Phase 1 구현 → `npm test` + 신규 `test:notify` + `npm run build` → 커밋
2. Render에 env 2~3개 등록 후 실문의 1건으로 실제 수신 확인
3. Phase 2(`flag` 모드) → Phase 3 → 관찰 후 `strict`
4. Phase 4는 마지막

각 Phase는 **개별 커밋**으로 남겨 리뷰·롤백 단위를 쪼갠다.
