# SEO Alt-Text Fix — Report

**Date:** 2026-10-28
**Brief:** `developer-workspace/briefs/SEO-alt-text-fix.md`
**Trigger:** Bing Webmaster site scan — “Alt attribute for images is missing”, 7 homepage instances.

## Built

Changed only alt text in 4 files:

- `components/site/HeroSlider.tsx` — 3 hero images use `carTitle(c)`.
- `app/(site)/layout.tsx` — footer gallery keeps the car and uses `carTitle(c)` for 4 images.
- `app/(site)/car/[ref]/page.tsx` — thumbnails (`h1Title(car) photo N`), related/similar cards
  (`cardTitle(c)`), gallery lightbox (`h1Title(car) photo`), sold view passes a car-specific
  `CarLayers` alt.
- `app/(site)/car/[ref]/car-parts.tsx` — `CarLayers` takes an optional `alt`, default
  `Car photo`; no empty alt in the shared sold/not-found lightbox.

No literal `alt=""` remains in `app/` or `components/` except the explanatory comment in
`components/Photo.tsx`. No layout, styling, or behavior changes.

## Verified

- `npm run lint` — 0 errors, 13 pre-existing warnings.
- `npm run typecheck` — pass.
- `npm test` — 526 pass, 0 fail.
- `npm run build` — pass.
- `npx prettier --check` on the 4 changed files — pass.
- Local `:3210` (new build):
  - homepage — 0 `alt=""`; hero alts are `2021 BMW X5 xDrive40i`,
    `2020 Lexus RX 350 F Sport`, `2022 Toyota RAV4 Prime SE`.
  - `/car/TS-1005` — 0 `alt=""`.
  - `/car/TS-1033` — 0 `alt=""`.
  - `/car/TS-1025` (sold) — 0 `alt=""`.

## Not verified

- Deployed site — not pushed/deployed by the agent.
- Bing rescan — not requested.

## Test cars

Confirmed in the main database, created 2026-10-16:

- Publicly listed (1 photo each): `TS-1033`, `TS-1035`, `TS-1036`.
- Present but not listed (0 photos): `TS-1029`, `TS-1030`, `TS-1031`, `TS-1032`, `TS-1034`.

No rows deleted. Owner approval needed before cleanup.

## Next

1. Owner reviews the diff and commits/pushes.
2. Decide whether to remove or hide the test rows.
3. After deploy, Bing can recrawl; no rescan requested yet.
