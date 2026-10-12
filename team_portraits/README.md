# Company Profile 2026 & FLEXBOARD Design v2 portraits

The 12 photograph PNG portraits were extracted from the user-provided
**CubeBerry_Company_Profile_2026_EN.pdf** (pages 6–9, Drive ID `1YCm72x-cRX-IW9atvB9KESl_CumUcC2P`):

- Page 6: Lee Jin-seo (`lee-jinseo.png`)
- Page 7: Son Soo-yeong (`son-sooyeong.png`), Cho Kyu-won (`cho-kyuwon.png`), Noh Eun-joo (`noh-eunjoo.png`)
- Page 8: Park Chan-hyuk (`park-chanhyuk.png`), Cho Min-hee (`cho-minhee.png`), Choi Jong-hyun (`choi-jonghyun.png`), Hwangbo Min-hyuk (`hwangbo-minhyuk.png`)
- Page 9: Kim Jae-hwan (`kim-jaehwan.png`), Bae Ye-eun (`bae-yeeun.png`), Cha Ha-na (`cha-hana.png`), Heo Jae-gu (`heo-jaegu.png`)

Two additional members from **cubeberry_flexboard_design_v2.html** (`#studio` CREDITS, Drive ID `1DzhpOF4RZuUXhjL4tAGRuwxoQlF2u20q`) complete the 14-person roster with dark studio silhouette placeholders until portrait photos are uploaded via `/admin-v2/team`:

- Writers: Yoo Se-ah (`yoo-seah.png`)
- Directors & PDs: Sung Na-yeon (`sung-nayeon.png`)

Biographies are summarized/translated from those pages in `landing/src/data/content.ts`,
`landing/src/i18n/messages.ts` and `server/seed.json`. The initial PDF extractions were
mostly 190–250 pixels wide; the Drive refresh below replaces eight active profile images.
The source PDF itself is not published in the repository.

### 2026-10-12 Drive headshot refresh

Eight profiles were refreshed from the shared Drive folder
(`1D7Ok0ct0cCClbadNp5Vep094FTq1NtQx`) and encoded as optimized WebP files (quality 90,
maximum 1600 px on the long edge):

- `kim-jaehwan.webp` ← `김재환.png`
- `noh-eunjoo.webp` ← `노은주작가.jpg`
- `park-chanhyuk.webp` ← `박찬혁.png`
- `lee-jinseo.webp` ← `이진서대표님.jpeg`
- `cho-minhee.webp` ← `조민희PD.png`
- `choi-jonghyun.webp` ← `최종현.png`
- `heo-jaegu.webp` ← `허재구.png`
- `hwangbo-minhyuk.webp` ← `황보민혁.jpeg`

The active image paths are synchronized in `landing/src/data/content.ts`,
`server/seed.json` and the generated root `index.html`. Legacy CMS aliases
`jominhee-pd.jpg` and `park-chanhyuk-director.jpg` were also refreshed so old records
for those same profiles show the new photos. The original PDF-derived PNGs remain intact.

### 2026-10-12 고해상도 교체 (IR_큐브베리_2026.pptx)

Drive 공유 PPTX(`1xT6PI_k-D8IAuoxqIkiimFuLSWsavGp4`)를
`fetch-cuberry-ir-media` 워크플로로 풀어 `drive-incoming/ir-media/` 에 모은 뒤,
슬라이드 7·9의 카드 좌표 매핑으로 인물을 확인하고 3장을 교체했다:

- `son-sooyeong.png` ← slide07 image4.jpg (1024×1024 → 4:5 819×1024 센터 크롭, 그레이)
- `noh-eunjoo.png` ← slide07 image6.png (413×531 → 4:5 413×516 상단 크롭)
- `bae-yeeun.png` ← slide09 image12.png (900×675 → 4:5 540×675 East 크롭)

파일명을 그대로 유지하므로 seed/CMS 의 `photoUrl` 수정은 불필요하다.
슬라이드 11·12·13·20 의 스틸도 함께 확보했으며, 씨앗전쟁(1592×802)과
전고향 구미호 KBS1 방영 스틸(1161×581)은 `images/still-seedwar.jpg`,
`images/still-gumiho.jpg` 로 포트폴리오 신규 카드 2건에 사용했다.
`slide07__hdphoto1.wdp` (HD Photo/JXR)는 자유 도구로 디코딩에 실패해 미변환 상태로 보관한다.
팀 사진의 대량 원본을 다시 받으려면 어드민 `/admin-v2/team` 업로드 또는
Drive 공유 후 워크플로 재실행으로 같은 경로를 따른다.

The new roster replaces the generic project-pool entry and the legacy fallback roster.
Previously existing portrait assets remain available for old CMS references.

## Existing CMS databases

`server/migrations/team-profile-2026.mjs` upgrades the exact unchanged previous seed
roster once on startup. New databases receive the updated seed. Customized rosters
(including unpublished entries or deletions) are preserved, not overwritten; their
team profiles must be updated via the administrator interface. Migration status is
logged at startup. No live production database was modified during this update.
