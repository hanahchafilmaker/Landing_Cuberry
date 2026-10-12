# Company Profile 2026 portraits

The 12 PNG portraits were extracted without generation or retouching from the
user-provided **CubeBerry_Company_Profile_2026_EN.pdf**, pages 6–9:
https://drive.google.com/file/d/1YCm72x-cRX-IW9atvB9KESl_CumUcC2P/view

- Page 6: Lee Jin-seo
- Page 7: Son Soo-yeong, Cho Kyu-won, Noh Eun-joo
- Page 8: Park Chan-hyuk, Cho Min-hee, Choi Jong-hyun, Hwangbo Min-hyuk
- Page 9: Kim Jae-hwan, Bae Ye-eun, Cha Ha-na, Heo Jae-gu

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
