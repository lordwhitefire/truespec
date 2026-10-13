# TASK-003 — Checkpoint C (after Tasks 15–17: the office moves onto the one car table)

**Date:** 2026-10-13 · **Status:** ⬜ awaiting the owner's review
**What it proves:** the office reads the one car table, its own table is gone, and **the office and the
showroom, opened on the same car, show the same figures** — price, mileage and section, on every one of
the five office states and on the sold car.

Evidence: `developer-workspace/scripts/task-003/runs/checkpoint-c/checkpoint-c.json` +
`reconcile-output.txt`; refusal proof `developer-workspace/scripts/task-003/refusal-0015.mjs`.

## 1. Task 15 — `lib/office.ts` re-pointed, the adapter deleted

The office read layer now reads `car` + `cost_line` + `car_state` (+ `sale`). What changed:

| Before | After |
|---|---|
| `FROM office_car`, one `landed_cost_kobo` per car | `FROM car JOIN car_state … LEFT JOIN sale … LEFT JOIN cost_line`, grouped per car |
| `OfficeCarRow.landed_cost_kobo: number` | `OfficeCarRow.cost_lines: CostLineInput[]` — the **stored** lines |
| `costLinesFor()` — the ADAPTER: expanded one total onto six lines, total on the first, rest `0` | **deleted.** Nothing expands a total any more; the six-line rule governs the office exactly as it governs the car form |
| `toOverviewCar()` fed `costLinesFor(row.landed_cost_kobo)` | feeds `row.cost_lines` |
| Section from `car_state` via `sectionOfState` | unchanged — it was always the one rule |

The adapter was the seam TASK-002 left, and its own note said so: the office's completeness had to be
*faked* onto the six-line shape. The office's real lines are now the shape, so completeness and the sum
mean the same thing on both sides — a car with four lines (`TS-1018`) is incomplete in the office
because it is incomplete, not because a total was absent.

The one consumer that had gone through the adapter is the inventory page: `const costLines =
costLinesFor(c.landed_cost_kobo)` → `const costLines = c.cost_lines`. No arithmetic was added to the
page. `scripts/reconcile.ts` was the other (Task 16).

**Mileage unit, recorded rather than slipped in.** `task.md:96` — *"Mileage: kilometres. One unit, stored
and labelled once"* — and line 64 forbids conversion in a display layer. Both surfaces were labelling the
`mileageKm` value **"mi"**: the office table (`inventory/page.tsx:46`) and the showroom car page
(`car/[ref]/page.tsx:54`). The reference runtime itself mixes the two (`0 km` on its not-landed cars,
`61,000 mi` on its landed ones), so "mi" was a copy artefact, not a decision. Both labels now read **km**.
This is the mileage decision landing, not a new one — no conversion, no second unit, nothing invented.

## 2. Task 16 — `scripts/reconcile.ts` re-pointed, not deleted

`task.md:108` — *"the office's verification script … is re-pointed rather than deleted"*; `task.md:177`
names it as a thing that must not be lost with the table.

The script now compares **two independent paths**:

- **RENDERED** — the live office pages on `:3210` (`/office`, `/office/inventory`), parsed out of the
  HTML: what the owner actually looks at.
- **STORE** — `car` + `cost_line` + `sale` + `car_state` read **directly in the script** through the shared
  rules (`lib/counts.ts`, `lib/money.ts`, `lib/overview.ts`). It deliberately does **not** go through
  `lib/office.ts`: if the office read layer made a mistake, the same mistake must not be able to sign it off.

What it checks, every one green:

| | figures |
|---|---|
| dashboard | cars in stock · available · of which new arrival · on order · money tied up · projected profit + its reach (`22 of 24`) + still-building (`2`) · real profit (sold) · sale price · the sold car's name |
| inventory | all **25** cars: price, cost, profit — and `Costs incomplete` shown for exactly the **2** incomplete-cost cars, with no figure fabricated |
| cost name | all **25** cars: the card's cost name equals `costLabelFor(section, sold)` — so no on-order car can read "Landed cost" (R-MON-7) |

**The TASK-002 witness is kept, and deliberately not compared.** `developer-workspace/scripts/office-data/ref-*.txt`
is the old office over `office_car` — a different table and a different dataset. Comparing across it would
compare two datasets, not a rule, so the script prints its headline figures for context and says so. TASK-002's
reconciliation and its 19 logged conflicts remain recorded in `openspec/tasks/TASK-002/`.

**Two of my own expectations were wrong, and the office was right** — worth recording because in each case
the correct behaviour was a rule I had not read closely:

1. the office names a car `year + model + trim` ("2021 Civic EX"), never the brand; my witness expected
   the showroom's form.
2. a sold car is presented as **"Sold"** whatever its state label is — `inventory-client.tsx:58` renders
   `sold ? "Sold" : state`, which is R-SLD *"Sold is a flag, not a state"* (`specs/inventory/spec.md`).
   The store has no "Sold" state label, and does not need one.

**One factual mismatch in the authority, recorded not patched.** `task.md:108` and `:177` say the office
dashboard page **cites** `scripts/reconcile.ts`. No page cites it today (nothing in `app/` or `lib/`
mentions it). I did not invent a citation to make the sentence true. If the owner wants it cited, that is a
one-line comment in `app/office/(shell)/page.tsx` — his call.

## 3. Task 17 — `0015` retires `office_car`, last

`migrations/0015_retire_office_car.sql` drops the table, and **refuses** if the table still holds a car the
one table has no `ref` for — the drop must not be the thing that loses a record the owner never agreed to lose.

The refusal is proved, not asserted (`refusal-0015.mjs`, its own scratch database):

```
chain applied: 14 migrations · office_car holds 0 row(s)
inserted office_car(ref = 'TS-9999') — no car carries that ref
  applying 0015 … REFUSED
  message: 0015 refuses: 1 row(s) in office_car have no car with the same ref — dropping the table would lose them
  office_car still present after the refusal: true
removed the row — office_car now holds 0 row(s), every ref present in `car`
  applying 0015 … applied
  office_car absent: true
verdict: the guard holds and the drop lands
```

Applied to the live store: **ledger is `0001…0015` (15)**, `office_car` absent, and all **8** office
screens still answer 200 (`/office`, `/inventory`, `/car`, `/car/new`, `/enquiries`, `/activity`,
`/settings`, `/login`). The retired `scripts/seed-office.ts` keeps its header note that the table it wrote
is gone; its npm script was already removed, so nothing runs it.

## 4. Checkpoint C — the same car on both surfaces

Six cars, one per office state plus the sold one. `OfficeCarRow`'s figures against the showroom page:

| car | office state | price (office / showroom) | mileage | section shown | verdict |
|---|---|---|---|---|---|
| TS-1001 | Available | ₦34,500,000 / ₦34,500,000 | 31,000 km | Available | ✓ |
| TS-1013 | On the way | ₦115,000,000 / ₦115,000,000 | 0 km | On Order | ✓ |
| TS-1015 | At port | ₦92,000,000 / ₦92,000,000 | 0 km | On Order | ✓ |
| TS-1017 | Cleared | ₦68,000,000 / ₦68,000,000 | 0 km | On Order | ✓ |
| TS-1019 | Landed | ₦44,500,000 / ₦44,500,000 | 64,000 km | Landed | ✓ |
| TS-1025 | sold (state Available) | ₦28,000,000 / *(no price — sold page)* | 42,000 km | *(none)* | ✓ |

- **One record, one set of figures.** The doorstep price the showroom quotes is the price the office shows;
  the mileage is the same number in the same unit; the office's five-state vocabulary resolves to the
  showroom's three sections through the registry, so `At port` and `Cleared` read **"On Order"** publicly —
  never the office's own words.
- **Sold leaves the showroom.** TS-1025 is absent from `/inventory` and its car page is a closed page
  (`<title>Sold</title>`, "That one found a new owner"), with no price and no section — it is not offered.
- **The office's state words never reach the public surface:** none of `"At port"`, `"Cleared"`,
  `"On the way"` appears on any of the 8 public routes checked.

**The office's naira figures, written down with their reason** (the checkpoint's own requirement): the
office's money figures — money tied up **₦995,368,000** over 24 cars in stock, projected profit
**₦319,312,000** from 22 of 24, real profit **₦7,840,000** on the one sale — are now computed from the
**six `cost_line` rows per car over the one `car` table**, by the same `lib/money.ts` /
`lib/overview.ts` rule the car form and the showroom use. Before this layer the office's figures came
from one lump-sum column on its own table. The move is the point of the layer: *one car, one identity* —
while the office read the second table, "one car" could not be true, and the two sides could have drifted
without anything failing.

## 5. Gates after Phase 3 (on the live store)

| Gate | Result |
|---|---|
| `npm test` | **50/50** |
| `npm run typecheck` | clean |
| `npm run leak-check` | **PASSED** — 26 public routes |
| `npm run build` | ✓ (dev server restarted afterwards, `:3210` → 200, `/office` → 200) |
| `scripts/reconcile.ts` | **exit 0** — every office figure reproduced from the store |
| Checkpoint C harness | **PASS** |

## 6. Named interims (unchanged, deliberate)

1. 24 third-party photo addresses remain on the 8 earlier cars until the rebuild-from-nothing (Task 20).
2. The live store still holds the 8 earlier cars beside the fleet — all marked `is_demo`, so the whole
   demonstration leaves in one move (Task 24).
3. `lib/serialize.ts`'s address branch stays until the rebuild removes the last address (Task 18 second half).

## 7. Not verified

- The **browser check** (Task 23) has still not run: no page has been opened in Chrome since the seed, so
  every figure above was read from the served HTML rather than looked at in a browser.
- Nothing office-side **writes** yet — no create/edit/sold/photo/PDF-import flow is connected
  (the functionality layer, next task). The office screens render the store; they do not change it.
- `leak-check` still covers cost tokens and route status only; asset references, customer detail and the
  office's state labels on public routes are checked by this checkpoint's own harness, not by `leak-check`
  (Phase 4/5 extends it).
