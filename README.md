# Cuberry Landing

큐브베리 랜딩 페이지(`index.html`)와 자체 어드민 콘솔(`/admin`)을 한 개의 Node 서버로 서비스합니다.

## 실행

```bash
npm start              # http://localhost:8080/  ,  http://localhost:8080/admin
PORT=3000 npm start    # 포트 변경
```

- 랜딩: `/`
- 어드민: `/admin` (포트폴리오, 상품, FAQ, 상담 문의, 사이트 문구, 비밀번호 관리)
- 데이터: `data/cuberry.sqlite` (SQLite, 최초 실행 시 `server/seed.json` 으로 자동 시드)
- 업로드 이미지: `data/uploads/`

## 어드민 로그인

| 항목 | 내용 |
| --- | --- |
| 초기 비밀번호 | `cuberry2026` (최초 실행 시 자동 생성) |
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
