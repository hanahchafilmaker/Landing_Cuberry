# design-incoming — Drive 공유 디자인을 풀어둔 곳

`FLEXBOARD Design v2 · E · 회사소개 · 기록 (동작).html`
(Google Drive file id `1WgNHKhi7nIX0b7wWVyJSdMsXXxUo0qxo`, 2026-10-12 공유)
을 `scripts/unpack_bundle.py` 로 언팩한 결과물입니다.

| 파일 | 내용 |
| --- | --- |
| `index.html` | 디자인 원문(단일 파일). `{{gold}}` 같은 값은 원본 디자인의 편집 가능 프롭(`DCLogic`)이고, 인라인 스타일이라 그대로 읽으면 됩니다. |
| `report.json` | 번들에 들어 있던 자산(폰트·이미지) 목록. |

- 이 폴더의 텍스트/마크업은 **디자인 기준값**으로만 쓰고, 실제 페이지는 `landing/src/` React 소스에 반영합니다.
- 이미지는 의미 있는 이름으로 `images/` 에 옮겨 두었습니다
  (`still-*.jpg` 6장, `sector-studio.jpg`, `sector-xconda.jpg`, `ceo-leejinseo.webp`).
- 새 디자인 파일이 Drive 에 올라오면 GitHub Actions `fetch-flexboard-design` 워크플로를
  `workflow_dispatch` 로 실행해 이 폴더를 갱신하세요(샌드박스에서는 drive.google.com 으로 나갈 수 없어 Actions 가 대신 받습니다).

반영 범위(2026-10-12): 색·타이포·히어로·숫자 요약·TWO SECTORS·WHAT WE DO·FOUNDER·HISTORY(연도 필터)·
PATENTS·CONTACT(사무실 2곳)·푸터를 E안 그대로 옮겼습니다.
