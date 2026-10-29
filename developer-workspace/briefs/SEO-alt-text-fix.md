# SEO Alt-Text Fix — Bing Flag (7 images)

**Source:** QA handoff pasted by the owner, 2026-10-28.
**Flag:** Bing Webmaster site scan — “Alt attribute for images is missing”, 7 instances
on `https://truespec-k4y6.vercel.app`.

## Scope

1. **Hero slider — 3 images** (`HeroSlider`, class `hsl-img`):
   BMW X5, Lexus RX 350, Toyota RAV4 Prime.
2. **Footer photo gallery — 4 images** (`Photo` component inside the footer `#gl` block):
   Camry, Lexus, BMW X5, Accord.

Inventory cards already have proper alt text — **leave them alone**.

## Rules

- Find every `<img>` or `Photo` usage with an empty alt in `app/` and `components/`.
- Replace with a short, accurate description built from the car data,
  e.g. `2021 BMW X5 xDrive40i`. No keyword stuffing.
- Change **only** the alt text. Do not touch layout, styling, or behavior.
- Run lint and build; show the diff before pushing.
- Keep `public/f4b277e43aba48d7bda708e33eb6b169.txt` — Bing needs it.

## Separate finding — test cars on the public showroom

Three cars are visible publicly:

- `TS-1033`
- `TS-1035`
- `TS-1036`

Names like `TS-FLOW-1792145622497` and `Fixture`, prices around ₦5M and ₦22,000.
They look like test leftovers. **Investigate; do not delete without owner approval.**

## Verification

- `npm run lint`
- `npm run build` (not concurrently with typecheck)
- Diff shown to the owner before any push.
- No push by the agent.

## Status

- [x] Locate every empty alt in `app/` and `components/`
- [x] Map each image to its car data
- [x] Change alt text only
- [x] Lint + build
- [x] Show diff
- [ ] Owner review
- [x] Investigate test cars

### Result

- 7 homepage images fixed: 3 hero (`carTitle(c)`), 4 footer gallery (`carTitle(c)`).
- 5 car-page images fixed: thumbnails (`h1Title(car) photo N`), related and similar cards
  (`cardTitle(c)`), gallery lightbox (`h1Title(car) photo`), shared sold/not-found lightbox
  (`CarLayers alt`).
- No literal `alt=""` remains in `app/` or `components/` except the explanatory comment in
  `components/Photo.tsx`.
- Lint: 0 errors, 13 pre-existing warnings.
- Typecheck: pass.
- Tests: 526 pass, 0 fail.
- Build: pass.
- Local HTML check: homepage and car pages have 0 empty alts.

### Test cars confirmed

In the main database, created 2026-10-16:

| Ref | Brand | Model | Price | Photos | Public |
|---|---|---|---|---|---|
| TS-1033 | TS-FLOW-1792145622497 | Flow2 | ₦5,000,000 | 1 | yes |
| TS-1035 | TS-FLOW-1792145803583 | Flow2 | ₦5,000,000 | 1 | yes |
| TS-1036 | TS-FIX-1792145797830-2 | Fixture | ₦22,000 | 1 | yes |
| TS-1029 | TS-FLOW-1792136477358 | Flow2 | ₦5,000,000 | 0 | no |
| TS-1030 | TS-FLOW-1792144332626 | Flow | ₦5,000,000 | 0 | no |
| TS-1031 | TS-FLOW-1792145316547 | Flow2 | ₦5,000,000 | 0 | no |
| TS-1032 | TS-FIX-1792145305480-1 | Fixture | ₦22,000 | 0 | no |
| TS-1034 | TS-FIX-1792145615924-1 | Fixture | ₦22,000 | 0 | no |

The three with a photo are listed publicly; the other five are not (`isListed` requires a price
and a photo). Nothing deleted; owner approval needed before any cleanup.

