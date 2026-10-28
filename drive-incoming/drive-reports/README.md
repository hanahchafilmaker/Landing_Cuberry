# drive-incoming/drive-reports

공유 Drive **폴더** 를 확인한 결과 중 **공개해도 되는 요약만** 남기는 곳입니다.
워크플로: `.github/workflows/fetch-drive-folder.yml`, 스크립트: `scripts/drive_folder.py`.

- 커밋되는 것: `summary.md` — 폴더별 파일/하위 폴더 **개수**와 내려받은 용량, 실행 시각.
- 커밋하지 않는 것: 폴더 ID, 파일 ID, 파일 이름 목록, 내려받은 원본.
  원본은 `.gitignore` 에 있는 `drive-incoming/_local/` 에만 남습니다
  (공개 저장소이고, 루트 README 의 Drive 연동 정책상 폴더 ID·구조는 공개 코드에 두지 않습니다).
