# Google Drive 연동 값 2개 발급 가이드

랜딩의 **DRIVE FILM**(썸네일 카드 · 클릭 시 재생)은 아래 두 환경변수로 동작합니다.
둘 다 **본인 Google 계정에서 직접 만들어 Render 에 붙여넣는 값**이고, 저장소에는 절대 커밋하지 않습니다.

| 환경변수 | 한 줄 설명 | 어디서 얻나 |
| --- | --- | --- |
| `GOOGLE_DRIVE_FOLDER_ID` | 영상을 모아둔 **폴더의 주소 조각** | Drive 폴더를 열었을 때 브라우저 주소창 |
| `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` | 서버가 그 폴더를 **읽기 전용**으로 볼 수 있게 하는 열쇠 파일(JSON) | Google Cloud Console → 서비스 계정 → 키 만들기 |

> 왜 이렇게 하나요? 운영 서버는 사람이 로그인할 수 없습니다. 그래서 "사람 대신 로그인하는 로봇 계정"인
> **서비스 계정**을 만들고, 그 계정 이메일에만 폴더 **뷰어** 권한을 주는 방식입니다.
> 이렇게 하면 폴더를 공개(링크 공유)하지 않아도 목록을 읽을 수 있습니다.

---

## 1. `GOOGLE_DRIVE_FOLDER_ID` — 30초

1. 브라우저에서 영상 폴더를 엽니다.
2. 주소창을 봅니다.

```
https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz012345?usp=drive_link
                                    └──────────── 이 부분이 폴더 ID ────────────┘
```

3. `folders/` 와 `?` 사이의 문자열만 복사합니다.
   - ✅ `1AbCdEfGhIjKlMnOpQrStUvWxYz012345`
   - ❌ `https://drive.google.com/...` (주소 전체)
   - ❌ `?usp=drive_link` (물음표 뒤)
4. 공유 링크에 `?usp=sharing` 이 붙어 있어도 ID 는 같습니다. **폴더** 링크인지 확인하세요
   (파일 링크의 `/file/d/…` 는 폴더 ID 가 아닙니다).

> 폴더 ID 는 "비밀번호"는 아니지만, 폴더 구조를 드러내는 값이라 README 정책상 **공개 코드에 적지 않습니다.**
> Render 환경변수에만 넣으세요.

---

## 2. `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` — 5~10분 (처음 한 번)

### 2-1. Google Cloud 프로젝트 만들기 / 선택

1. https://console.cloud.google.com/ 접속 (회사 Google 계정으로 로그인)
2. 상단 프로젝트 선택 → **새 프로젝트** → 이름 예: `cuberry-drive-reader` → 만들기

### 2-2. Drive API 켜기 (이걸 빼먹으면 403 `SERVICE_DISABLED`)

1. 좌측 메뉴 **API 및 서비스 → 라이브러리**
2. `Google Drive API` 검색 → **사용 설정(Enable)**

### 2-3. 서비스 계정 만들기

1. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → 서비스 계정**
2. 이름 예: `cuberry-drive-reader` → 만들고 계속 → (역할은 비워도 됨) → 완료
3. 목록에서 방금 만든 계정 클릭 → **세부정보** 탭의 **이메일**을 복사
   ```
   cuberry-drive-reader@cuberry-drive-reader.iam.gserviceaccount.com
   ```
   → 이 주소를 3단계에서 폴더에 초대합니다.

### 2-4. JSON 키 발급 (한 번만 다운로드됩니다)

1. 같은 서비스 계정 → **키** 탭 → **키 추가 → 새 키 만들기 → JSON → 만들기**
2. `.json` 파일이 자동 다운로드됩니다. 파일을 열면 이런 모양입니다.

```json
{
  "type": "service_account",
  "project_id": "cuberry-drive-reader",
  "private_key_id": "…",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEv…\n-----END PRIVATE KEY-----\n",
  "client_email": "cuberry-drive-reader@cuberry-drive-reader.iam.gserviceaccount.com",
  "client_id": "1234567890",
  "token_uri": "https://oauth2.googleapis.com/token",
  …
}
```

3. 이 파일 내용 **전체**를 복사합니다(중괄호 `{` 부터 `}` 까지).

> ⚠️ 이 파일은 비밀번호와 같습니다. Git·채팅·메신저·스크린샷에 올리지 말고,
> Render 환경변수에만 붙여넣으세요. 실수로 노출됐다면 키 탭에서 **삭제**하고 새로 발급하면 됩니다.
> 저장소의 `.gitignore` 에 `*.json` 키 파일 패턴은 없으므로, `scripts/check-drive-service-account.mjs` 로
> 검사할 때도 파일을 저장소 밖(`~/keys/…`)에 두세요.

### 2-5. 폴더를 서비스 계정에 '뷰어'로 공유

1. Drive 에서 영상 폴더 우클릭 → **공유**
2. 위에서 복사한 **서비스 계정 이메일**을 입력 → 권한 **뷰어(Viewer)** → 보내기
   - "초대 메일을 보낼 수 없습니다" 안내가 떠도 괜찮습니다. 권한은 정상 부여됩니다.
3. 폴더의 일반 액세스는 **제한됨**으로 두는 것이 정책입니다.
   (사이트에 노출할 개별 영상만 `링크가 있는 모든 사용자 · 뷰어`로 공개 — 썸네일·재생의 전제)

---

## 3. Render 에 넣기

Render 대시보드 → 서비스 선택 → **Environment** → **Add Environment Variable**

| Key | Value |
| --- | --- |
| `GOOGLE_DRIVE_FOLDER_ID` | 1단계에서 복사한 폴더 ID |
| `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` | 2-4의 JSON **전체** (여러 줄 그대로 붙여넣기) |

- 저장 후 **Manual Deploy → Deploy latest commit** (환경변수는 재배포해야 반영됩니다).
- Render 는 여러 줄 값을 그대로 보관합니다. 붙여넣을 때 앞뒤 공백·따옴표가 들어가지 않게 하세요
  (`"{"type":…}"` 처럼 감싸면 JSON 파싱에 실패합니다).
- `render.yaml` 의 `sync: false` 항목이 주석 처리되어 있으므로, Blueprint 로 관리한다면 주석을 풀고
  Render 대시보드에서 값을 입력해도 됩니다.

---

## 4. 잘 붙었는지 확인 (3단계)

```bash
# ① 서버 상태 = ready 여야 정상
curl -s https://landing-cuberry-admin.onrender.com/api/public/drive-portfolio
# → {"status":"ready","updatedAt":"…","videos":[{"id":"…","name":"….mp4"}, …]}

# ② status 별 의미
#   ready         정상. videos 에 사이트에 노출될 영상만 들어 있습니다.
#   unconfigured  두 환경변수가 없거나 JSON 형식이 잘못됨 → 서버 로그에 안내가 남습니다.
#   unavailable   인증·권한·네트워크 문제 → 서버 로그의 [drive] 경고 확인

# ③ 무엇이 잘못됐는지 바로 확인 (비밀값은 나가지 않습니다)
curl -s https://landing-cuberry-admin.onrender.com/api/public/drive-diagnose
# → {"status":"unconfigured","configured":false,
#    "folderIdSet":true,"folderIdValid":false,
#    "serviceAccountSet":true,"serviceAccountParsed":false,
#    "serviceAccountEmail":"cup***@cuberry-drive.iam.gserviceaccount.com",
#    "reasons":["GOOGLE_DRIVE_FOLDER_ID 형식 오류(폴더 ID만 넣어야 합니다)",
#               "서비스 계정 JSON 오류: JSON 파싱 실패 ..."]}
#   · folderIdValid=false  → 폴더 "주소"를 통째로 넣은 경우가 대부분. folders/ 와 ? 사이의 ID 만 넣습니다.
#   · serviceAccountParsed=false → 값이 한 줄로 깨졌거나 type 이 service_account 가 아님
#   · configured=true 인데 status 가 unavailable 이면 값은 정상, Drive 권한/API 문제입니다.
```

서버가 켜질 때도 같은 내용을 로그에 남깁니다:

```
[drive] DRIVE FILM 자동 동기화가 꺼져 있습니다 — GOOGLE_DRIVE_FOLDER_ID 형식 오류(폴더 ID만 넣어야 합니다) / 서비스 계정 JSON 오류: ...
```

값을 넣기 전에 **내 컴퓨터에서 먼저 검사**할 수도 있습니다(권장):

```bash
# 오프라인 검사: JSON 형식·키 유효성·이메일 형식만 확인
node scripts/check-drive-service-account.mjs --key ~/keys/cuberry-drive-reader.json \
  --folder-id 1AbCdEfGhIjKlMnOpQrStUvWxYz012345

# 온라인 검사: 실제로 토큰을 받아 폴더를 읽어보고, 사이트에 노출될 영상 수까지 계산
node scripts/check-drive-service-account.mjs --key ~/keys/cuberry-drive-reader.json \
  --folder-id 1AbCdEfGhIjKlMnOpQrStUvWxYz012345 --online
```

출력 예:

```
✓ JSON 형식 · 서비스 계정 이메일 · 개인키 확인
✓ 폴더 읽기 성공: 영상 폴더 (하위 폴더 6개)
✓ 링크 공개된 영상 21편 → 랜딩 DRIVE FILM 에 표시됩니다
! 링크 비공개 영상 75편 → 목록에는 보이지만 사이트에는 안 나옵니다(썸네일·재생 불가)
```

---

## 5. 자주 나는 오류와 원인

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| `unconfigured` | 값 누락 / JSON 오타 | Render 값 확인, `node scripts/check-drive-service-account.mjs` 로 재검사 |
| `unavailable` + 로그 `http-404` | 폴더에 서비스 계정 초대를 안 함 | 2-5 단계 수행 |
| `unavailable` + 로그 `SERVICE_DISABLED` | Drive API 미사용 설정 | 2-2 단계 수행 |
| `unavailable` + 로그 `invalid_grant` | 키 삭제·교체됨 / 서버 시계 오차 | 새 키 발급 후 환경변수 교체 |
| 목록은 `ready` 인데 카드가 안 보임 | 영상이 `링크가 있는 모든 사용자 · 뷰어`가 아님 | 개별 영상 공유 설정 변경(최대 1분 내 반영) |
| 카드는 보이는데 썸네일이 깨짐 | 영상 공개 범위가 제한됨 | 위와 동일. 공개하면 `drive.google.com/thumbnail` 이 동작합니다 |
| 재생 화면이 비어 있음 | Drive 임베드 제한·트래픽 제한 | "Google Drive에서 영상 열기 ↗" 로 대체, 또는 다른 호스팅 검토 |

`/api/public/drive-portfolio` 는 **폴더 ID·폴더 이름을 응답에 담지 않습니다**(영상 id·이름·resourceKey 만).
그래서 화면 소스만 봐서는 폴더 구조를 알 수 없습니다.
