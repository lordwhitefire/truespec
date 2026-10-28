# LAUNCH-001 Task 9 — Vehicle/Offer JSON-LD

**Status:** done; runtime pass for the live and sold car pages. Unit-tested paths that have no
matching live row are named below.

## What changed

- `lib/structured-data.ts` — `buildCarJsonLd(car)` builds a `Vehicle` + `Offer` graph from the same
  `PublicCar` the page renders:
  - public identity: `name` (`carTitle`), `sku` (`ref`), canonical `url`, `brand`, `model`,
    `vehicleModelDate`, `mileageFromOdometer` (KMT), `color`, `vehicleInteriorColor`,
    `vehicleConfiguration`;
  - image: the cover at 1200×630 via `sizedPhotoUrl`, or the generated default OG card when the car
    has no photo;
  - offer: `price` (`priceKobo / 100`), `priceCurrency: "NGN"`, `itemCondition: UsedCondition`,
    seller `AutoDealer` “TrueSpec Automotive”, canonical offer `url`;
  - availability: `SoldOut` when `sold` or section `sold`; `PreOrder` for section `on order`;
    `InStock` for `available` / `landed`.
- `app/(site)/car/[ref]/page.tsx` — the JSON-LD script is rendered in both the live and sold returns
  from the same `car` object. `<` is escaped to `\u003c` inside the inline script.
- `lib/structured-data.test.ts` — 9 tests covering the live graph, no-private/no-office fields, sold
  (both markers and each marker alone), `on order`, `landed`/`available`, no-photo fallback, and
  omitted null fields.
- `developer-workspace/scripts/task-005/car-404.mjs` — 8 new browser verdicts (34 total) that parse
  the rendered JSON-LD and check the live/sold graph.

## Verified

- `npm test` — 522 pass, 0 fail, 10 suites.
- `npm run typecheck` — pass.
- `npm run build` — pass; server restarted on `:3210` (PID 284030).
- Initial server HTML contains one `application/ld+json` block on both pages; the browser script
  parsed it.
- Live `TS-1001`: `Vehicle`; `2021 Toyota Camry XSE V6`; Toyota/Camry/2021; 31,000 KMT; Obsidian
  black / Black; XSE V6; cover 1200×630; `Offer` at 34,500,000 NGN, `InStock`, `UsedCondition`,
  seller TrueSpec Automotive; canonical `https://truespec-k4y6.vercel.app/car/TS-1001`.
- Sold `TS-1025`: `Vehicle`; `Offer` at 28,000,000 NGN with `SoldOut`; no `InStock`.
- No `cost`, private note, customer value, `arrivalNote`, `features`, `wasPriceKobo`, `soldAt`,
  `isNewArrival`, `photos`, `priceKobo`, or `mileageKm` in the graph (unit test + browser check).
- `car-404.mjs` — 34/34; tabs 6→6; no Chrome launched; live/sold pages had no unexpected console or
  page errors. The two 404 navigations still log the expected `404 (Not Found)` resource message.
- No visual change: the JSON-LD is invisible; the owner look check for the car page remains Task 10.

## Not verified / caveats

- `on order`, `landed`, section-only sold, sale-marker-only sold, no-photo/default-image, and
  null-field paths are unit-tested only. No live row exercises each one in this session; the live
  `TS-1001` is `available`, and `TS-1025` is sold with both markers.
- The JSON-LD is not emitted on the 404/unlisted views; they have no car to describe.
- Task 8’s initial-404-HTML title caveat is unchanged.
- Changes are uncommitted; no commit or push was made.

## Evidence

- `lib/structured-data.ts`, `lib/structured-data.test.ts`, `app/(site)/car/[ref]/page.tsx`
- `developer-workspace/scripts/task-005/car-404.mjs`
- Server log: `/tmp/opencode/truespec-3210.log`
