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
`landing/src/i18n/messages.ts` and `server/seed.json`. Original portrait resolution is
approximately 190–250 pixels wide. Higher-resolution originals can replace them later.
The source PDF itself is not published in the repository.

The new roster replaces the generic project-pool entry and the legacy fallback roster.
Previously existing portrait assets remain available for old CMS references.

## Existing CMS databases

`server/migrations/team-profile-2026.mjs` upgrades the exact unchanged previous seed
roster once on startup. New databases receive the updated seed. Customized rosters
(including unpublished entries or deletions) are preserved, not overwritten; their
team profiles must be updated via the administrator interface. Migration status is
logged at startup. No live production database was modified during this update.
