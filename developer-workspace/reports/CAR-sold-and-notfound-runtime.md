# CAR — sold & not-found runtime convergence

- **Date:** 2026-10-10
- **Screen:** buyer car page — `/car/<ref>`, the **sold** and **not-found** states only
- **Method:** `runtime-divergence` skill (runtime-only; reference source read only to enumerate the states)
- **Build (edit target):** `http://localhost:3210/car/TS-1025` (sold), `http://localhost:3210/car/NOPE-9999` (not found)
- **Reference (read-only truth):** `test-truespec-v2/car.html` served on `:3211` — `?car=2021-honda-civic-ex`, `?car=1999-not-a-real-car`
- **Viewport:** 1440×900, dark, settled on a 300 ms wait
- **Status:** converged — all reference structure rules covered; one framework count delta remains; not committed

## Objective

Two car-page states were missing from the build: a car that has **sold**, and a car that is **not found**. The reference distinguishes them (`car.html` `soldPage()` / `notFound()`); the build routed both to the generic `app/not-found.tsx`. The goal was to build both states and prove **≥80% rule-by-rule parity** against a model built from the reference runtime.

## How the states were made reachable

The reference keeps sold cars in a separate `SOLD` array (removed from `CARS`). The build kept every car in one table, so a sold car had to be (a) flagged, (b) hidden from every listing, and (c) still resolvable by direct link.

- **Data:** a `sale` row un-lists a car (`isListed` returns false when `sold`), so `getPublicCars()`/`getPublicCar()` exclude it everywhere.
- **Direct view:** a new read path `getPublicCarForView(ref)` (`lib/public-cars.ts`) returns the car regardless of listed/sold, so `/car/TS-1025` resolves to the **sold** state instead of a 404.
- **Exposure:** `SELECT_CARS` now returns `(sale.id IS NOT NULL) AS sold` and `sale.sold_at`; `toPublicCar` maps them to `PublicCar.sold` / `PublicCar.soldAt`.
- **Seed:** `scripts/seed.ts` gained a `sold` field; `TS-1025` (2021 Honda Civic EX — mirroring reference `SOLD[0]`) is seeded as sold on `2026-09-15` via an idempotent `sale` upsert. `TS-1001` stays unsold.
- **Unknown ref:** `/car/<no-such-ref>` → `getPublicCarForView` returns `null` → **not-found** view. `app/not-found.tsx` (the site's generic 404) was deliberately left untouched.

## How it ran (exact commands)

Servers (both under the one persistent Chrome cap):

```
PORT=3210 npx --no-install next dev                                   # build, dark
python3 -m http.server 3211 --bind 127.0.0.1 \
  --directory /home/lordwhitefire/current-project/test-truespec-v2    # reference
```

Capture → model → compare (from the project root, so `node_modules/playwright-core` resolves):

```
RUNS=developer-workspace/scripts/runtime-ui-diff/runs/car-sold-notfound
node /home/lordwhitefire/.agents/skills/runtime-divergence/scripts/run.mjs   "$RUNS/sold.config.json"     "$RUNS/captures"
node /home/lordwhitefire/.agents/skills/runtime-divergence/scripts/run.mjs   "$RUNS/notfound.config.json" "$RUNS/captures"
node /home/lordwhitefire/.agents/skills/runtime-divergence/scripts/model.mjs "$RUNS/captures" "$RUNS/model"
node /home/lordwhitefire/.agents/skills/runtime-divergence/scripts/compare.mjs "$RUNS/model" "$RUNS/captures" > "$RUNS/report.md"
```

Each capture was preceded by warming both routes (the Neon serverless driver throws a transient `fetch failed`/`ETIMEDOUT` → HTTP 500 on the first request after idle; a re-request returns 200). This is infrastructure, not a code defect.

## Divergence found, and the fixes

The former session had already added the two views; the first compare exposed that the build rendered **only the inner content block**, omitting the chrome the reference keeps on every state. Ref-only rule signatures drove the fixes:

| # | Divergence (reference-only) | Fix (all in `app/car/[ref]/page.tsx`) |
|---|------------------------------|----------------------------------------|
| 1 | `#main` wrapper absent — build h1/p sat at `body>div>h1`, ref at `body>div>div>h1` | wrapped both views' content in `<div className="main" id="main">` |
| 2 | Shared hidden layers absent (~20 rules + controls `Close`, `Dismiss`, `dialog`, `status`) | new `CarLayers` component renders `#mbar`, `#lb`, `#stoast`, `#ovl`, `#ptoast` in both views, matching the normal car page |
| 3 | Static leftover rail `section.rel` (`h2#rt "More cars"`, `rt2`, Previous/Next) present on the reference | new `RelatedShell` component renders the empty rail after `#main` |
| 4 | Sold hero image style differed | matched the reference inline style (max-width 420, aspect-ratio 16/10, radius 12, `var(--line)` border) |
| 5 | Not-found WhatsApp message text differed | aligned to the reference string ("…the car I'm after isn't on your site. Make/Model/Year: ") |

## Rule-by-rule parity

Measured against the model built from the reference runtime:

| State | Reference model | Build captured | Shared rule signatures | Controls ref/build | Hidden layers ref/build |
|-------|-----------------|----------------|------------------------|--------------------|--------------------------|
| car-not-found | 137 nodes, **55** rules, 23 controls | 175 nodes, 23 controls, 8 hidden | **55 / 55 = 100%** | 23 / 23 | 8 / 8 |
| car-sold | 164 nodes, **60** rules, 28 controls | 215 nodes, 28 controls, 8 hidden | **60 / 60 = 100%** | 28 / 28 | 8 / 8 |

Before the fixes the coverage was ≈ 42/55 (76%) and 43/60 (72%) — the chrome omissions above. Every reference rule signature is now present on the build side.

The only structural count delta is a single `body>div`: **11 on the build vs 10 on the reference**. It is Next App Router's streaming placeholder, not our markup:

```html
<div hidden=""><!--$?--><template id="B:0"></template><!--/$--></div>
```

It appears on every streamed route and is not something to patch in application code.

## Remaining divergences (honest)

- **Sold "similar cars" content.** The reference filters `CARS` to `status === "a" && body === s.body` (same body type) → 4 sedans. The build has no body-type field, so it shows the first 4 *available* cars (Lexus RX 350, Mercedes-Benz GLE 350, …). Card **structure and controls are identical**; only the card names/links differ. Fixing it needs a body-type column plus seed data.
- **Global CSS (pre-existing, site-wide, not introduced by these states).** Heading rule differs (build `font-weight:600; letter-spacing:0.01em; text-transform:none` vs reference `700; uppercase`) → h1/h2 weight/letter-spacing/case diffs; body `transitionDuration`; icon sizing in `.rc`/buttons; `#mw` cursor `pointer` vs `auto`; 38 design tokens differ. Out of scope for this change.
- **Accessibility-tree text/href diffs.** Ticker copy is data-driven (differs by catalogue), header WhatsApp number formatting, and link hrefs are app routes (`/`, `/inventory`, `/privacy`) vs reference static filenames (`truespec.html`, `inventory.html`, `privacy.html`). Structural roles match.
- **One reference-only control** (`generic::`, unnamed) that the build does not expose.

## Not checked

- **Behaviour beyond load.** No actions were exercised, so lightbox open/close, the covering modal, stop/proof toasts, related-rail scroll, theme toggle persistence, keyboard nav and reduced-motion are unverified in these two states.
- **One viewport only** (1440×900, dark). Other breakpoints and light theme not compared.
- **Only these two states.** The normal car page was not re-compared; no screenshot/visual check (`visual_inspect` unavailable).

## Files changed (uncommitted)

| File | Change |
|------|--------|
| `app/car/[ref]/page.tsx` | `CarLayers` + `RelatedShell`; sold/not-found wrapped in `#main` and finished with shared chrome + static rail; sold image style; not-found WA copy; `getPublicCarForView` used for both states |
| `lib/public-cars.ts` | new `getPublicCarForView(ref)`; `SELECT_CARS` returns `sold` and `sold_at` |
| `lib/serialize.ts` | `PublicCar.sold` / `soldAt`; `RawCarRow.sold_at`; mapped in `toPublicCar`; `isListed` excludes sold |
| `scripts/seed.ts` | `sold` field; `TS-1025` seeded sold on `2026-09-15` via idempotent `sale` upsert |

## Artifacts

- Captures / model / compare: `developer-workspace/scripts/runtime-ui-diff/runs/car-sold-notfound/{captures,model,report.md}`.
- Capture configs: `.../car-sold-notfound/{sold,notfound}.config.json`.
- Skill tooling (unchanged): `/home/lordwhitefire/.agents/skills/runtime-divergence/scripts/*.mjs`.
