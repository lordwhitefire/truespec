# LAUNCH-001 — Task 8 report

**Date:** 2026-10-27
**Scope:** 2.2 (car), 2.3 (sold/unknown), 2.8 (car fallback) — car metadata, canonical, social
image, honest sold/unknown behaviour, and the unlisted-car gate.
**Status:** runtime pass on a live car, a sold car, an unlisted car and a made-up reference. Two
code-only paths (null `soldAt`, section-sold without a sale row) have no matching rows to exercise.

## What changed

**`app/(site)/car/[ref]/page.tsx`**

- `generateMetadata` now uses `pageMetadata` for a live car:
  - title `carTitle(car)` (year, make, model, trim);
  - description `name — ₦price, mileage. Section from TrueSpec Automotive.`;
  - absolute canonical `carHref(car)`;
  - cover photo at 1200×630, or the default social card;
  - matching Open Graph and Twitter metadata.
- A sold car (`car.sold || car.section === "sold"`) gets:
  - title `Sold — name`;
  - a description carrying the public price and mileage;
  - the same absolute canonical and cover;
  - `robots: noindex, nofollow`.
- An unknown reference gets `Car not found | TrueSpec Automotive` and `noindex, nofollow`.
- The page uses the same sold predicate. A car whose configured section is Sold but whose sale row
  is absent now renders the sold view instead of falling through to the available-car view.
- `soldPageView` no longer renders “went in .” when `soldAt` is null; it says “is sold”.

**`lib/public-cars.ts`**

- `getPublicCarForView` is wrapped in React `cache`, so metadata and the page share one read.
- It now returns null unless the row is listed or sold:
  `!isListed(row) && !row.sold`. This closes FN-001 — a draft with no price or no photo answers a
  real 404 instead of a normal ₦0 page. `isListed` already rejects a sold row, so sold is allowed
  through separately.

**`developer-workspace/scripts/task-005/car-404.mjs`**

- Extended the existing attach-only car check to read head metadata for:
  - live `TS-1001`;
  - sold `TS-1025`;
  - unlisted `TS-1029` (price present, 0 photos);
  - unknown `TS-9999`.
- 26 checks, including title, description, canonical, cover/default OG, Twitter image, robots,
  sold view, the 404 views and unexpected console/page errors.

## Verification

**Code gate (helper):** `npm test` 513 pass, 0 fail; `npm run typecheck` pass; `npm run build`
pass. The current build is served on `:3210` (PID 278715).

**Browser procedure** — `node developer-workspace/scripts/task-005/car-404.mjs`, attach-only,
existing build tab, no screenshots, no Chrome launched:

- 26/26 checks pass; harness guard count 6→6. The live and sold pages log no console or page
  errors; the two 404 navigations log the browser's expected `404 (Not Found)` resource message,
  and no other error.
- Live `TS-1001`: `200`; title `2021 Toyota Camry XSE V6 | TrueSpec Automotive`; description
  `2021 Toyota Camry XSE V6 — ₦34,500,000, 31,000 km. Available from TrueSpec Automotive.`;
  canonical `https://truespec-k4y6.vercel.app/car/TS-1001`; OG and Twitter image are the cover at
  1200×630; no `noindex`.
- Sold `TS-1025`: `200`; title `Sold — 2021 Honda Civic EX | TrueSpec Automotive`; description
  `Sold — 2021 Honda Civic EX. ₦28,000,000, 42,000 km. See what else TrueSpec Automotive has
  available.`; canonical `https://truespec-k4y6.vercel.app/car/TS-1025`; cover at 1200×630;
  `robots: noindex, nofollow`; H1 `That one found a new owner`; the sold view and related shell are
  unchanged.
- Unknown `TS-9999`: `404`; `robots: noindex, nofollow`; the car 404 view (`We could not find that
  car`, Home / Not found, both ways forward); default social card at 1200×630; browser title
  `Car not found | TrueSpec Automotive`.
- Unlisted `TS-1029`: `404`; `robots: noindex, nofollow`; the car 404 view. This is the FN-001
  regression check.
- No Chrome was launched; the existing tabs were reused and left stable.

## Not run / no data

- No sale row has `sold_at` null, and no car is section-sold without a sale row. The null-date
  fallback and the section-only sold branch are typechecked and built but not runtime-exercised;
  `TS-1025` carries both sold signals.
- No car currently has a null or zero price. The no-photo unlisted car exercises the same
  `isListed` gate; the price half is covered by that shared check and the inventory tests, but not
  by a live car row.
- The 404 response's initial HTML still carries the site's root `<title>` and `og:title`; after
  hydration the browser title and OG title are `Car not found`. The first response is a real 404
  with `noindex`, so it is not indexable as a normal car.
- The owner visual look check for the car page belongs to Task 10 and remains pending; Task 8 is
  metadata-only and changes no car layout.
- Vehicle/Offer JSON-LD is Task 9, not this task.

## Notes

- No schema change, new table, provider change or new secret.
- `getPublicCar()` remains unused; the view gate uses the same `isListed` check. It is dead code,
  not a launch blocker, and was left untouched.
- The changes are uncommitted; the owner handles the push.
- Evidence: `developer-workspace/scripts/task-005/car-404.mjs`,
  `developer-workspace/scripts/task-005/runs/car-404/live.json`.
