# Cuberry Landing

큐브베리 랜딩 페이지(`index.html`)와 자체 어드민 콘솔(`/admin`)을 한 개의 Node 서버로 서비스합니다.

## 실행

```bash
npm start              # http://localhost:8080/  ,  http://localhost:8080/admin
PORT=3000 npm start    # 포트 변경
```

- 랜딩: `/`
- 어드민: `/admin` (포트폴리오, 상품, FAQ, 팀 프로필, 상담 문의, 사이트 문구, 비밀번호 관리)
- 데이터: `data/cuberry.sqlite` (SQLite, 최초 실행 시 `server/seed.json` 으로 자동 시드)
- 업로드 이미지: `data/uploads/`

## 배포 (GitHub Pages에서는 어드민 API를 사용할 수 없음)

현재 어드민은 화면만 있는 정적 페이지가 아니라 Node.js API와 SQLite 데이터베이스가 함께 필요한 앱입니다. GitHub Pages는 HTML/CSS/JS 파일만 제공하고 `server/index.mjs` 를 실행하지 않으므로 `/api/auth/status` 가 404, 로그인 POST가 405로 실패합니다. 이는 비밀번호 문제가 아닙니다.

이 저장소에는 한 서비스에서 랜딩과 API를 함께 실행하는 Render Blueprint(`render.yaml`)가 있습니다.

1. 변경 사항을 배포할 브랜치에 반영한 뒤 Render에서 **New → Blueprint**를 선택하고 이 저장소를 연결합니다.
2. Blueprint 설정에서 `ADMIN_PASSWORD`에 사용할 강력한 비밀번호를 입력합니다. 이 값은 Git에 저장되지 않습니다.
3. 서비스 생성 전 플랜과 디스크 비용을 확인하세요. SQLite와 업로드 파일을 재배포 후에도 보존하기 위해 1GB 영구 디스크를 사용하며, Render 영구 디스크에는 유료 인스턴스가 필요합니다.
4. 배포가 완료되면 Render가 제공한 주소의 `/`와 `/admin`을 사용합니다. GitHub Pages 주소는 별도의 정적 사본으로 남으며, Render 어드민에서 저장한 변경사항은 반영되지 않습니다.

Render는 Node.js 22와 Singapore 리전을 사용하도록 설정되어 있습니다. [Blueprint 배포 안내](https://render.com/docs/infrastructure-as-code)와 [영구 디스크 안내](https://render.com/docs/disks)를 참고하세요.

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

1. 서버 로그 확인 — 기동 시 `Login: 초기 비밀번호 cuberry2026 (아직 변경되지 않음)` 처럼 현재 상태를 알려 줍니다.
2. 로그인 실패 로그 — `로그인 실패 (IP) 3/10 - 비밀번호 12자, 본문 키: [password]` 형식으로 남습니다.
   - `비밀번호 0자` 로 찍히면 요청 본문이 서버까지 전달되지 않은 것입니다(프록시 문제).
3. 비밀번호를 5분 안에 10회 틀리면 잠시 잠깁니다. 응답의 `retryAfter`(초)만큼 기다리면 다시 시도할 수 있습니다.
4. 브라우저에서 직접 확인: `GET /api/health`, `GET /api/auth/status` (로그인 화면 안내 문구에 사용).
