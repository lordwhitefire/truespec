# RECON-001 — Reseed the build with the reference's car data

Owner asked: use the same data as the reference, so the counts and content line up.

## The gap today
- Reference: **24 cars** `TS-1001`–`TS-1024` — **12 available (a) · 6 on order (o) · 6 landed (l)**.
- Build seed: **15 cars** `TS-0001`–`TS-0015` (1 sold → 14 public) — 6 available · 4 on order · 4 landed.

## Reference data shape (from `test-truespec-v2/truespec.html:376-473`)
Per car: `ref, slug, status(a/o/l), brand, model, trim, year, mileage("31,000 mi" | "0 km"), ext, int,
price(Naira → int), was(Naira, 0=none), note, engine, hp, trans, drive, body, seats, fuel,
features[7], overview[2], imgs[3 Unsplash ids]`.

Discount ("Special") cars in the reference (was > 0): **TS-1002, TS-1008, TS-1011, TS-1023** → 4 cars.

## Mapping reference → build DB (`car` table)
| build column | source |
|---|---|
| ref | `c.ref` (TS-1001…TS-1024) |
| brand / model / trim / year | same |
| exterior_color | `c.ext` |
| interior_color | `c.int` |
| mileage | **OPEN — unit decision below** |
| doorstep_price_kobo | `N(c.price)` |
| was_price_kobo | `c.was > 0 ? N(c.was) : null` (→ the 4 Specials) |
| state_id | `a`→"Available", `o`→"On the way", `l`→"Landed" |
| arrival_note | `o`→`c.note` (e.g. "Expected arrival: November"), else null |
| features | `c.features` verbatim (7 per car, nicer text) |
| photos (car_photo) | `c.imgs` (3 Unsplash ids, same `img()` → URL) |

Result: showroom shows exactly **12 / 6 / 6**, home count becomes **"12 ready · 6 landed"** — matches the reference.

Reference fields we **cannot** store yet (no columns, car page not rebuilt): `engine, hp, trans, drive,
body, seats, fuel, overview, slug`. Note for later — Phase B3 (car page).

## Open decisions (need owner)
1. **Mileage unit.** Reference shows **miles** ("31,000 mi"); build's labels all say **"km"** (5 display sites).
   - Option A — match reference: store reference numbers, change the label to **"mi"** (new cars read "0 mi").
   - Option B — convert miles→km (×1.609): unit stays "km" but the number is not the reference's.
2. **Removing the old 15 cars (destructive).** To line the counts up, the seed must **replace** `TS-0001`–`TS-0015`
   (the insert is `ON CONFLICT DO NOTHING`, so new refs alone would leave 15 + 24 in the DB). This deletes the
   old demo rows (DB only; the seed file is rewritten). Confirm.
   - Also: the seed's office teaser currently has a **sold car TS-0015** and **2 enquiries** pointing at
     `TS-0001`/`TS-0007`. Reference has no sold car. Options: re-point enquiries to `TS-1001`/`TS-1013` and drop
     the sold teaser, or keep a hidden sold car (invisible in the showroom) to preserve the office seed.

## Files touched when approved
- `scripts/seed.ts` — new 24-car `DEMO`, `IMGS` from reference `imgs`, `was` mapping, state mapping, enquiries.
- (Option A only) `components/site/car-view.ts`, `components/site/InventoryBrowser.tsx`,
  `components/CarCard.tsx`, `app/car/[ref]/page.tsx` — "km" → "mi".
- DB reseed: `npm run db:seed` (after clearing the old demo cars).
