# TASK-003 — Checkpoint B (after Tasks 9–14: the demo fleet, photos, PDF, seed)

**Date:** 2026-10-13 · **Status:** ⬜ awaiting the owner's review
**What it proves:** the approved fleet is written by a seed that is **idempotent**, and the whole thing
**reproduces from nothing** — a fresh database takes `0001…0014` and then the seed twice, and its fleet
figures agree with the live store's on every measure.

## 1. The seed now writes the fleet (Task 14)

`scripts/seed.ts` was rewritten. It is the one demo seed; `scripts/seed-office.ts` is retired (npm script
removed, file kept with a `RETIRED` header — **not deleted**: it is not mine to delete, so the owner can
remove it deliberately).

| What it writes | How |
|---|---|
| 17 cars, the approved fleet | upsert on `ref` (`ON CONFLICT (ref) DO UPDATE`), so a re-seed **converges** a row an earlier version wrote — state, mileage, price — rather than ignoring it |
| every state used | Available 7 · On the way 3 · At port 2 · Cleared 1 · Landed 3, plus the sold car (`Available` + a `sale` row) = **all five office states occupied** |
| six naira cost lines per car | re-synced every run (delete + insert); no `currency`, no `rate_minor` (dropped by `0008`) |
| genuinely incomplete costs | `missingCosts` leaves the kinds **absent**: TS-1013 has 5 lines, TS-1018 has 4 — a real gap, not a zero |
| 49 photos | from `scripts/demo-photo-manifest.json`: the Sanity asset id **and** the recorded `unsplash:` origin, in display order |
| the sale | TS-1025: `sale` row at the doorstep price, sold 2026-09-15 → un-listed from the showroom |
| 3 enquiries | Chidi O. (TS-1001, **dated more than 12 months back** → a real year-mark case), Aisha B. (TS-1013, current), and the imported PDF's 4 rows reproduced from `scripts/demo-enquiry-import.json` |
| demo marking | the 17 fleet cars `is_demo = true`, **plus the 8 cars the earlier seed wrote** (bounded to the named refs `TS-1001…TS-1025`; nothing deleted here) |

**One demo-data reading, recorded rather than smoothed over.** The fleet plan's table gives TS-1025 the state
“Sold *(hidden from the showroom)*”. `car_state` holds exactly five labels (Available, On the way, At port,
Cleared, Landed) — **there is no Sold label**, and the office derives the sold condition from the `sale` row
(`lib/office.ts`: `sold_at`, `sale_price_kobo`). So the car keeps `Available` as its state and the **sale row**
is what hides it and drives the office. Adding a sixth registry label would change the registry the ontology
owns, which this task does not.

**A bug Checkpoint B caught.** The first version built the earlier refs as `TS-0001…TS-0025` (wrong padding),
so no earlier row was marked; the rebuilt store showed `demoCarsOutsideFleet 0 vs 8`. Fixed to
`TS-1001…TS-1025`; the live store then reported `8 earlier demo row(s) marked is_demo`, and **all 25 cars are
now demonstration rows** — the whole demonstration leaves in one move (Task 24).

## 2. Checkpoint B — rebuild from nothing, then seed twice

`developer-workspace/scripts/task-003/checkpoint-b.mjs` creates its own scratch database, migrates the whole
chain, seeds it twice, drops it, and reads the live store. Evidence: `runs/checkpoint-b/counts.json`, `run.log`.

| measure | rebuild + seed 1 | rebuild + seed 2 | live store |
|---|---|---|---|
| migrations | 14 | 14 | 14 |
| cars | 17 | 17 | 25 |
| demoCars | 17 | 17 | 25 |
| demoCarsOutsideFleet | 0 | 0 | 8 |
| costLines | 99 | 99 | 147 |
| photos | 49 | 49 | 73 |
| fleetCars | 17 | 17 | 17 |
| fleetCostLines | 99 | 99 | 99 |
| fleetCostLinesWithoutKind | 0 | 0 | 0 |
| fleetPhotosWithAssetId | 49 | 49 | 49 |
| fleetPhotosWithOrigin | 49 | 49 | 49 |
| fleetPhotosWithoutOutsideAddress | 49 | 49 | 49 |
| fleetIncompleteCostCars | 2 | 2 | 2 |
| fleetStatesUsed | 5 | 5 | 5 |
| fleetMileage0NotLanded | 6 | 6 | 6 |
| enquiries / demoEnquiries | 6 / 6 | 6 / 6 | 6 / 6 |
| sales / pdfs | 1 / 1 | 1 / 1 | 1 / 1 |

- **second seed moved nothing: true** — every measure identical across the two runs.
- **the rebuilt fleet agrees with the live store's fleet on every fleet measure: true.**
- Whole-store counts differ **only** by the 8 earlier cars and their 24 photos the live store still holds —
  the named interim, cleared by the rebuild-from-nothing (Task 20).

## 3. Task 18’s first half was pulled forward (2026-10-13), and why

Task 12 pointed the 49 fleet `car_photo` rows at Sanity **asset ids**. The public path then began emitting
`…/images/<proj>/<ds>/image-<hash>-1200x800-jpg` — the raw asset id concatenated into the CDN path. Measured:

- `…/image-f6f66c6c…-1200x800-jpg` → **HTTP 400**
- `…/f6f66c6c…-1200x800.jpg` (the derivation) → **HTTP 200 image/jpeg**

Nothing caught it: `leak-check` checks cost tokens and route status, and a broken image is neither. So the
fleet’s public photos were broken between Task 12 and Task 18, which is a broken system — the derivation was
fixed early, in `lib/serialize.ts`, via Sanity’s own builder, with `lib/photos.test.ts` pinning both things a
naive concatenation gets wrong (the `image-` prefix and the `.`/`-` extension) plus “no derivative parameters”.

The **second half of Task 18 waits**: the branch that passes a third-party address through cannot go until the
rebuild (Task 20) leaves only asset references — 24 leftover rows still hold addresses today.

## 4. Gates after Phase 2 (on the live store)

| Gate | Result |
|---|---|
| `npm test` | **50/50** (was 47; +3 photo-derivation tests) |
| `npm run typecheck` | clean |
| `npm run leak-check` | **PASSED**, 26 routes — after a first run that failed on one route |
| repeat probe (`/`, `/inventory` × 20) | **40/40 HTTP 200** |
| `npm run build` | ✓ (dev server restarted afterwards, `:3210` → 200) |
| all five office states → a showroom section | ✓ (`Available→available`, `On the way`/`At port`/`Cleared→on order`, `Landed→landed`) — so the new `At port`/`Cleared` cars are not orphaned |

**The one leak-check failure, explained rather than waved away.** The first post-seed run failed on one route.
`scripts/leak-check.ts:116` counts a **5xx as a hit**, and the summary line words every hit as “forbidden
content”. The dev log at that moment shows `NeonDbError … fetch failed / ETIMEDOUT`, and the next request was
`GET / 200`. The identical check then passed, and 40 consecutive requests were 200. So the failure is
attributed to a **transient database timeout**, not to a value leaking from the seeded data. Residual
uncertainty, stated plainly: if a token hit did occur once instead, it was not reproducible in 40 attempts.

Two things worth fixing when `leak-check` is extended (Task 18/23): its summary should say **which** kind of
failure it saw (status vs token), and a **dev-mode 5xx page can itself print the failing query** (which
contains `doorstep_price_kobo` and `cost_line`) — a dev-only leak vector that also makes the verdict ambiguous.

## 5. Task 13’s verification tail (finished here)

- the PDF asset resolves in the office path (`findFileAsset` true);
- across 5 public routes — `/`, `/inventory`, `/car/TS-1001`, `/car/TS-1005`, `/car/TS-1019` — the asset id,
  the underlying hash, the original filename `enquiries-2026-09-30.pdf`, and the invented customers’ names,
  numbers and notes appear **zero** times. (Car refs do appear; they are public by design.)

## 6. Named interims (unchanged, deliberate)

1. 24 third-party photo addresses remain on the **8 earlier cars** until the rebuild (Task 20); the fleet’s 49
   are all asset references.
2. The live store holds the 8 earlier cars beside the fleet — every row now marked `is_demo`, so the whole
   demonstration leaves in one move.
3. Task 18’s address branch stays until the rebuild removes the last address.

## 7. Not verified

- Anything office-side: `lib/office.ts` still reads the retired `office_car` (Task 15) — the office pages
  render against it unchanged, and no office figure has been checked against the new tables yet (that is
  Checkpoint C).
- The browser check (Task 23) has not run: no page has been opened in Chrome since the seed.
