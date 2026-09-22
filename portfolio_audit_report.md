# 웹페이지 반영 및 미리보기 검수 보고서

## 검수 대상

첨부된 `2026플로우나인소개서_link.pdf` 35페이지와 업데이트된 `index_cuberry_updated.html`을 대조했습니다.

## 반영 결과

| PDF 내용 | 반영 상태 | 웹페이지 위치 |
|---|---:|---|
| Why Flow Nine / 20년+ 실무 경험 / One-stop 제작 | 반영 | Why Cuberry, Strengths, Process |
| Brand Film | 반영 | Services, Portfolio |
| Corporate Video | 반영 | Services, Portfolio |
| YouTube Contents | 반영 | Services, Portfolio |
| AI Contents | 반영 및 확장 | Services, XCONDA workflow, AI advertising |
| 조민희 PD 이력 | 반영 | Team profile |
| 박인회 모션그래픽 디자이너 이력 | 반영 | Team profile |
| 전담 제작 시스템 / Creative Duo | 반영 | Strengths |
| 다양한 산업 경험 / 20년+ Combined | 반영 | Strengths |
| 실무자 직접 소통 | 반영 | Strengths |
| 원스톱 제작 시스템 | 반영 | Strengths, Process |
| 포트폴리오 01–21 | 전체 반영 | Flow Nine portfolio |
| 상담·기획 → 촬영·제작 → 편집·모션 → 납품·마감 | 반영 | Process |

## 포트폴리오 보강

PDF의 01–21번 작품을 모두 카드화했습니다. 각 카드에는 작품명, 연도, 유형, 소개서 기반 상세 설명, 작업 범위, 해당 PDF 페이지에서 렌더링한 썸네일이 포함되어 있습니다. 포트폴리오 필터는 기업, 브랜드, 광고, 유튜브, 모션, 인터뷰로 구성했습니다.

추가로 첨부된 `미국광고rere.mp4`를 별도 광고 카드에 연결했습니다. 영상은 H.264 4K, 약 29.96초이며, 브라우저에서 포스터 이미지와 함께 직접 재생할 수 있습니다.

## 미리보기 검증

로컬 HTTP 서버에서 HTML·썸네일·영상 파일을 모두 HTTP 200으로 확인했습니다. 브라우저 미리보기에서 첫 화면과 `#works` 포트폴리오 화면을 확인했으며, 공식 XCONDA 문구, PDF 썸네일, 필터 UI, 상세 카드 레이아웃이 정상적으로 렌더링되었습니다.

미리보기 URL:

https://4173-ifmf1rzrpcw4pn9e1kmc4-60833056.sg2.manus.computer/index_cuberry_updated.html

포트폴리오 바로가기:

https://4173-ifmf1rzrpcw4pn9e1kmc4-60833056.sg2.manus.computer/index_cuberry_updated.html#works

## 모바일 및 AI 콘텐츠 보강

모바일 화면에서 히어로와 CTA를 세로로 정렬하고, 포트폴리오 카드·필터·갤러리·B2B 폼·AI Lab 컨트롤이 좁은 화면에서 넘치지 않도록 최적화했습니다. 포트폴리오 광고 영상과 XCONDA 데모 영상에는 `playsinline`, 반응형 16:9 비율, 터치 재생 대응을 적용했으며 화면에서 벗어나면 자동 일시정지하도록 처리했습니다.

새로운 AI Content Lab에는 Storyboard, Character, Virtual Set, Director's Cut 4개 탭을 추가했습니다. 탭을 누르면 제작 단계별 설명과 상태 라벨이 실시간으로 바뀌며, 14+ AI 모델·9개 카메라 앵글·0회 앱 전환·KBS 검증 지표를 함께 보여줍니다.

요청 문구는 **전담 제작 시스템**에서 **전담 크리에이티브 팀**으로 변경했습니다.


## 실제 인물 사진 및 Google Drive 포트폴리오

첨부 소개서의 팀 프로필 페이지에서 조민희 PD와 박인회 모션그래픽 디자이너의 실제 사진을 추출해 각각의 팀 카드에 직접 적용했습니다. 공유된 Google Drive 폴더에서는 영상 9개의 공개 파일 ID를 확인했으며, 각 영상은 Drive의 공개 MP4 스트리밍 주소와 썸네일을 사용하는 네이티브 HTML5 비디오 카드로 연결했습니다. 영상은 `preload=none`과 모바일 `playsinline`으로 초기 로딩 부담을 줄였습니다.

## 새 Google Drive 영상 교체 및 성능 최적화

기존 영상 라이브러리를 새 Google Drive 폴더의 8개 영상으로 전부 교체했습니다. 초기 화면에는 영상 원본이나 iframe을 로드하지 않고 Drive 썸네일만 지연 로드하며, 사용자가 재생 버튼을 누른 뒤에만 플레이어를 생성합니다. 직접 MP4 스트리밍이 가능한 미국 광고 세로 숏폼과 애니메이션 토이팜은 HTML5 플레이어로, 대용량 제한이 걸리는 나머지 영상은 Google Drive 미리보기로 연결했습니다.

모바일 메뉴는 opacity·transform·max-height 기반 전환, Escape 닫기, 화면 크기 변경 시 자동 닫기, 터치 타깃 확대, 오버스크롤 억제를 적용했습니다. 브랜드 테마는 기존 형광 라임 중심에서 **그래파이트·아이보리·샴페인 골드** 조합으로 정리해 보다 세련된 CUBERRY/XCONDA 아이덴티티로 조정했습니다.


## 박찬혁 감독 프로필 추가

공유된 Google Drive 이미지 `KakaoTalk_20260922_200449117.jpg`를 실제 프로필 사진으로 저장해 팀 소개 영역에 추가했습니다. 제공된 별도 경력 정보가 없어 확인되지 않은 수치나 작품명은 임의로 기재하지 않고, 감독·영상 연출 및 콘텐츠 디렉팅 역할만 표시했습니다.
