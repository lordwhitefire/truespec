# Model — TASK-002: Business logic (Layer 2)

**This is the authority the check reads.** It is built from the rules in
`developer-workspace/rules/TASK-002/` (frozen, Checkpoint A). It is **not** changed to match the
build; where the build differs, the build is the divergence, not the model.

- **Date:** 2026-10-12. **Layer:** 2 (Business logic). **Task:** `openspec/tasks/TASK-002/task.md`.
- **Method (owner, 2026-10-12):** rules → model → build → check. The browser checks **surfaces
  only** (runtime-divergence, no screenshots); it is **not** the authority for these rules.
- **Source of every entry:** the rule of the same id in `rules/TASK-002/<capability>.md`. Nothing
  here is invented; where a rule names a gap for another layer, this model repeats the name and
  does not decide it.
- **How the check uses this model:** Task 20 walks it rule by rule — runs the named unit test and
  the named search. A rule is *held* only when both pass. Any second implementation found is a
  **defect**; any rule the build cannot satisfy is a **raised** item, not a silent change.

Rule tags: `R-SEC` sections · `R-CNT` counting · `R-MON` money · `R-REF` reference codes ·
`R-SLD` sold. **29 rules** total.

---

## 1. Rules index

| # | Rule | One implementation (forced target) | Executable check |
|---|------|------------------------------------|------------------|
| 1 | R-SEC-1 | `lib/sections.ts` — `Section` type + label set | `sections.test.ts` |
| 2 | R-SEC-2 | `lib/sections.ts` — `sectionOfState` / `isSection` | `sections.test.ts` |
| 3 | R-SEC-3 | `lib/sections.ts` — `landedInAvailable` inclusion | `sections.test.ts` |
| 4 | R-SEC-4 | `lib/sections.ts` — new-arrival placement | `sections.test.ts` |
| 5 | R-SEC-5 | `lib/serialize.ts` — public allow-list | search + probe |
| 6 | R-CNT-1 | `lib/counts.ts` — `countStock` | `counts.test.ts` |
| 7 | R-CNT-2 | `lib/counts.ts` — `countStock` | `counts.test.ts` |
| 8 | R-CNT-3 | `lib/counts.ts` — sold count | `counts.test.ts` |
| 9 | R-CNT-4 | `lib/public-cars.ts` — filter sold/deleted | `counts.test.ts` |
| 10 | R-CNT-5 | all count read points → `counts.ts` / `overview.ts` | search + probe |
| 11 | R-MON-1 | `lib/money.ts` — `SIX_COST_KINDS` | `money.test.ts` |
| 12 | R-MON-2 | `lib/money.ts` — `isCostComplete` | `money.test.ts` |
| 13 | R-MON-3 | `lib/money.ts` + form + settings — no rate | `money.test.ts` + search |
| 14 | R-MON-4 | `lib/money.ts` — `totalCostKobo` | `money.test.ts` + search |
| 15 | R-MON-5 | `lib/money.ts` — integer kobo + `formatNaira` | `money.test.ts` + search |
| 16 | R-MON-6 | `lib/money.ts` — `profitKobo` + basis | `money.test.ts` |
| 17 | R-MON-7 | `lib/money.ts` — `costLabelFor` | `money.test.ts` + probe |
| 18 | R-MON-8 | `lib/overview.ts` + `lib/money.ts` | `overview.test.ts` |
| 19 | R-MON-9 | `lib/overview.ts` — reach | `overview.test.ts` |
| 20 | R-MON-10 | `lib/money.ts` — `parseCostAmount` | `money.test.ts` + probe |
| 21 | R-MON-11 | `lib/money.ts` — single `priceKobo` | `money.test.ts` + search |
| 22 | R-MON-12 | `lib/money.ts` office-side + `serialize.ts` allow-list | `money.test.ts` + search |
| 23 | R-REF-1 | `lib/refs.ts` — `formatRef` / `isValidRef` | `refs.test.ts` |
| 24 | R-REF-2 | `lib/refs.ts` (assignment wired by TASK-004) | `refs.test.ts` |
| 25 | R-REF-3 | sequence monotonic + soft delete | `refs.test.ts` |
| 26 | R-REF-4 | `lib/refs.ts` — code is the join key | search |
| 27 | R-SLD-1 | `lib/sale.ts` — `isSold` + `saleTransition` | `sale.test.ts` |
| 28 | R-SLD-2 | public filter + `counts.ts` + `sale.ts` | `sale.test.ts` + `counts.test.ts` |
| 29 | R-SLD-3 | `lib/sale.ts` — `saleTransition` un-mark | `sale.test.ts` |

**Target modules** (from the plan's module map): `lib/sections.ts` *(new)*, `lib/counts.ts`
*(keep)*, `lib/money.ts` *(rewrite)*, `lib/refs.ts` *(new)*, `lib/sale.ts` *(new)*,
`lib/overview.ts` *(new)*, `lib/office.ts` *(rewrite)*, `lib/serialize.ts` / `lib/public-cars.ts`
*(touch)*.

**Capabilities with no module yet today:** `lib/sections.ts`, `lib/refs.ts`, `lib/sale.ts`,
`lib/overview.ts` do not exist. `lib/money.ts` and `lib/counts.ts` exist but are not yet used by
the read points that compute their own answers.

---

## 2. Sections — `R-SEC`

Source: `specs/showroom/spec.md` §"Three fixed sections"; `specs/inventory/spec.md`
§"Owner-defined car states mapped to fixed sections", §"Private labels never reach buyers".

### R-SEC-1 — The section set is exactly three, and it is fixed
**Rule.** The sections are exactly `Available`, `On Order`, `Landed`; no owner action adding,
renaming or deleting a car state can add, rename or remove a section.
**Forces.** `lib/sections.ts` — the single canonical `Section` type and label set; every section
label anywhere (public and office) reads from it. Not derived from any state list.
**Read points constrained today (second definitions of the set to remove):**
- `lib/serialize.ts:6` — `PublicSection` type (the public three).
- `lib/counts.ts:8-13` — `StockSection` (a third lowercase three).
- `app/(site)/car/[ref]/page.tsx:25-29` — local `SECTION_LABEL` map.
- `components/CarCard.tsx:4,16-17` — `CardVariant` + labels.
- `components/InventoryTabs.tsx:8,13-22` — `TabId` + per-section arrays/labels.
- `components/site/InventoryBrowser.tsx:40-50` — `SECTION_OF` / `TOKEN_OF` / `STATUS_LABEL`.
- `components/site/HomeInventory.tsx:4,13-17` — local `PublicSection` tab map.
- `app/office/(shell)/settings/state-seeds.ts:12,24-30,51` — `CarSection` type + `SECTIONS`.
- `migrations/0002_registries.sql:8,21-26` — `car_state.section CHECK IN ('available','on order','landed')` (stored shape; named, not changed here).
**Check.** `sections.test.ts` — the list is exactly three and is not derived from any state list.
Search: no second literal `["Available","On Order","Landed"]` (any casing) outside `lib/sections.ts`.

### R-SEC-2 — Every state maps to exactly one section
**Rule.** A car state resolves to exactly one of the three sections; a state mapping to none or two
cannot exist — resolution raises rather than guessing.
**Forces.** `lib/sections.ts` — one `sectionOfState(state, configuredSection)` + `isSection`; the
office adapter and every read point call it; none carries its own state→section list.
**Read points constrained today:**
- `app/office/(shell)/settings/state-seeds.ts:24-30` — `CAR_STATES` state→section map (the only real map today).
- `lib/office.ts:9-10` — `AVAILABLE_STATES` / `ON_ORDER_STATES` sets (a second, implicit map).
- `app/(site)/inventory/page.tsx:12-20` — URL status token → section normalisation.
- `components/site/InventoryBrowser.tsx:40-50` — section/token maps.
- `migrations/0002_registries.sql:21-26` — base state→section seed rows (stored shape).
**Check.** `sections.test.ts` — `sectionOfState` returns one section for each seeded state; a
null / two-valued mapping raises. Search: no state→section list outside `lib/sections.ts`.

### R-SEC-3 — Landed is presented inside Available
**Rule.** A car in the Landed section is also presented under Available (a landed car is still
buyable); Landed is not a fourth, separate place.
**Forces.** `lib/sections.ts` — the section-inclusion relation (`landedInAvailable`); the
section-composition used by `lib/overview.ts` and the office adapter.
**Read points constrained today:**
- `components/site/HomeInventory.tsx:30-32,73,77` — local `available`/`landed`/`buyable` arithmetic.
- `components/InventoryTabs.tsx:13-22` — "All" tab folds available + landed.
- `lib/office.ts:9` — `AVAILABLE_STATES = Set(["Available","Landed"])` (already folds the two, but as its own rule).
**Check.** `sections.test.ts` — the Landed section is included in Available. Live: a landed car is
visible under Available (Task 21 probe).

### R-SEC-4 — A new-arrival car appears in both, and by section only
**Rule.** A car flagged as a new arrival appears under both Landed and Available; its appearance is
decided by its section and flag, never by its owner state label.
**Forces.** `lib/sections.ts` — the new-arrival flag read in the one section module; the public path
uses the section, not the state label.
**Read points constrained today:**
- `lib/counts.ts` — `Countable.isNewArrival` (counting of the doubly-presented car is `R-CNT`).
- `lib/public-cars.ts:13` — selects `is_new_arrival` (current section derivation via JOIN).
- `components/InventoryTabs.tsx:45-46` — "of which N new arrivals" note.
- `components/site/HomeInventory.tsx` — tab composition.
- `app/(site)/layout.tsx:27-28,51` — landed/on-order ticker + available gallery.
**Check.** `sections.test.ts` — a new-arrival car resolves into both Landed and Available for
presentation. Search: no owner state label in any public payload.

### R-SEC-5 — Section names are the only names a buyer sees
**Rule.** A buyer-facing response carries only a section name for placement; an owner's state label
never appears in any public response.
**Forces.** the public allow-list in `lib/serialize.ts` — it permits the section, never the state
label; `lib/serialize.ts` sources its section from `lib/sections.ts`.
**Read points constrained today:**
- `lib/serialize.ts:22-23,43-44,61-62,128-129` — public section field + row mapping (the allow-list).
- `app/(site)/car/[ref]/page.tsx:31-35` — `STATUS_KEY` (section→token; must carry no state label).
- `components/site/car-view.ts:12-17` — status chip/dot derivation.
- `components/site/ReferenceCard.tsx:8,17-21,45-57` — section read + ribbon label.
**Check.** Search the public path/payload for any state label; `serialize.ts` sources its section
from the one module. Live: the buyer payload holds no state label (Task 21 probe).

---

## 3. Counting — `R-CNT`

Source: `specs/dashboard/spec.md` §"One counting rule, applied at every read point";
`specs/showroom/spec.md` §"Showroom counts follow one counting rule", §"Sold and deleted cars leave
the showroom"; `specs/inventory/spec.md` §"Sold is a flag, not a state".

### R-CNT-1 — Available = the available group + landed-this-year, counted once
**Rule.** `Available` = cars in the Available section **plus** cars in the Landed section landed
this year; each car counted exactly once even if presented twice; the count carries an "of which N
new arrivals" note.
**Forces.** `lib/counts.ts` — `countStock` (the one implementation); `lib/overview.ts` and every
count read point call it.
**Read points constrained today:**
- `lib/public-cars.ts:54-59` — `getPublicCounts()` (already calls `countStock`).
- `lib/office.ts:95-104` — office dashboard counts (a **second** Available implementation).
- `components/site/HomeInventory.tsx:30-32,73,77` — local arithmetic + new-arrival note.
- `components/InventoryTabs.tsx:13-22,45-46` — tab counts + note.
- `components/site/InventoryBrowser.tsx:97-101,110` — `statusCounts` bar.
- `components/site/HomeBehaviors.tsx:83-84,151` — spoken-count lines.
- `app/(site)/page.tsx:14`, `app/(site)/layout.tsx:27-28,51`, `app/(site)/car/[ref]/page.tsx:517` — section filters/slices.
**Check.** `counts.test.ts` — a doubly-presented new-arrival car is counted once; Available = the
available group + landed-this-year. Search: no second Available count.

### R-CNT-2 — On Order = the on-order group
**Rule.** `On Order` = the cars whose section is On Order.
**Forces.** `lib/counts.ts` — the same implementation as `R-CNT-1`.
**Read points constrained today:** the same list as R-CNT-1 (any place that shows an On Order
figure): `lib/office.ts:95-104`, `app/office/(shell)/page.tsx:78-101`,
`components/InventoryTabs.tsx:13-22`, `app/(site)/layout.tsx:27-28`.
**Check.** `counts.test.ts` — On Order counts exactly the On Order section. Search: no second On
Order count.

### R-CNT-3 — Sold sits outside the stock total
**Rule.** Sold cars are counted separately, outside the stock total; a sold car leaves the stock
counts and appears under Sold/Archive while remaining in lifetime totals.
**Forces.** `lib/counts.ts:31-32` — sold is its own count, never folded into a section count.
**Read points constrained today:**
- `lib/office.ts:99-101` — office `soldCount` + real-profit split (a second sold count).
- `app/office/(shell)/settings/page.tsx:12-16` — per-state counts skipping sold.
- `app/office/(shell)/inventory/inventory-client.tsx:123-126,215-226` — `chipCounts`, `stock` filter (`state !== "sd"`).
**Check.** `counts.test.ts` — a sold car is excluded from stock and included in the sold count.
Live: a sold car leaves the stock total (Task 21 probe).

### R-CNT-4 — Sold and deleted cars are excluded from public counts and links
**Rule.** A car marked sold, or deleted, is excluded from all showroom pages and counts; an old
shared link to it returns a graceful not-available outcome, never an error or stale data.
**Forces.** the public read path (`lib/public-cars.ts`) filters sold/deleted before counting; the
same counting rule (`lib/counts.ts`) receives only live cars.
**Read points constrained today:**
- `lib/public-cars.ts:14-15,57` — `(sale.id IS NOT NULL) AS sold`, `sold_at`; `countStock` passes `sold:false`.
- `lib/serialize.ts:105-108,131-132` — `isListed` excludes `row.sold`.
**Check.** `counts.test.ts` — sold/deleted cars are excluded from public counts. Live: the
sold-car shared link is graceful (Task 21 probe).
**Named for other layers.** The *mechanism* that hides a deleted car (8-second undo window, soft-delete
tombstone) is a write path — **TASK-004**; the tombstone's shape is a stored shape — **TASK-003**.
This rule states only the read-side exclusion.

### R-CNT-5 — One rule at every read point
**Rule.** The showroom, the home page, the inventory page, the layout ticker and the office
dashboard all derive their counts from this one rule; no read point computes its own count.
**Forces.** every count read point calls `lib/counts.ts` (directly, or through `lib/overview.ts`);
no local count arithmetic remains.
**Read points constrained today:** every entry in R-CNT-1/2/3 above — the office figures are the
only ones on a separate table and go through the documented adapter (`lib/office.ts`).
**Check.** Search for a second implementation of Available / On Order / sold — there must be none
(`testing.md §1.1`). Live: Available on home, inventory and office are equal at one moment (Task 21
probe).
**Owner ruling 2026-10-12.** "One rule, invoked by all read points" — **not** literal cross-table
equality. Where the office reads its own table, a difference is a *data* difference, named in the
conflict log and **TASK-003's** to settle, never a second rule.

---

## 4. Money — `R-MON`

Source: `specs/money/spec.md` (all six requirements); `specs/dashboard/spec.md` §"Every money figure
states its reach", §"Incomplete costs are explained, never hidden"; `specs/inventory/spec.md` §"One
form for adding and editing a car"; `openspec/tasks/TASK-002/task.md` requirement 4.

### R-MON-1 — Six fixed cost kinds, all naira
**Rule.** Exactly six cost kinds — purchase price, shipping, clearing, trucking within USA,
trucking in Nigeria, full tank — each an amount in naira. No other cost kind exists.
**Forces.** the cost-kind set in `lib/money.ts` (`SIX_COST_KINDS`); the car form's cost fields; the
office adapter's reading of the one stored cost.
**Read points constrained today:**
- `lib/money.ts:5-12` — `SIX_COST_KINDS` (exists; keep as the one set).
- `app/office/(shell)/car/car-client.tsx:66-122` — the six form fields (local `usd`/`ng` split).
- `lib/office.ts` — the adapter's single cost read.
**Check.** `money.test.ts` — the kind set is exactly six. Search: no seventh cost kind.

### R-MON-2 — "Cost complete" means all six entered; zero is entered, missing is not
**Rule.** A car is cost-complete only when all six kinds have values; an entered `0` is a value
(complete), a missing value leaves it incomplete.
**Forces.** `isCostComplete` in `lib/money.ts:47-54`; every place that decides completeness.
**Read points constrained today:** `lib/money.ts:47-54` — `isCostComplete` (the one decision);
`lib/office.ts` — office completeness is the adapter's own statement (has a total), named below.
**Check.** `money.test.ts` — six values incl. zeros ⇒ complete; one missing (incl. `null` vs `0`) ⇒
incomplete.

### R-MON-3 — No exchange rate exists; every amount is naira
**Rule.** No exchange rate is stored or applied anywhere — not on a cost line, not on a car, not in
Settings; every amount is naira, entered as the naira paid. No rate field, setting key, column or
constant appears anywhere.
**Forces.** `lib/money.ts` carries no currency/rate; the car form and Settings carry none; the
stored `rate_minor`/`currency` columns are **void** (left in place — TASK-003 removes them).
**Read points constrained today (every rate/dollar site to remove):**
- `lib/money.ts:17-23,32-45` — `Currency`, `USD_COST_KINDS`, `NGN_COST_KINDS`, USD-product rounding.
- `app/office/(shell)/car/car-client.tsx:43-45` — `RATE = 1000`, `naira`, `usd`; `:627-674` — "₦1,000 / $1" panel.
- `app/office/(shell)/settings/settings-client.tsx:147-157,390-449` — "Dollar rate" card + save toast.
- `scripts/seed.ts:75-93,142-148` — `usdLines()` computes `rate`, inserts `cost_line`.
- `migrations/0003_car.sql:32-53` — `rate_minor` column + USD-needs-rate CHECK (void; TASK-003).
- `scripts/leak-check.ts:3,44-80` — forbidden-token list (assert no `rate` remains).
**Check.** `money.test.ts` — no rate in the money API. Repo search for `rate` (`testing.md §1.4`):
none, except the void columns named for TASK-003 and the removed-setting history.

### R-MON-4 — Total cost is the exact sum of the six lines, by one function, recomputed everywhere
**Rule.** `totalCost = Σ of the six cost lines` (all naira, exact), computed by a single function
at every read point; changing any cost or the price recomputes total cost and profit everywhere.
**Forces.** `totalCostKobo` in `lib/money.ts:56-65` — the only place the six lines are summed.
**Read points constrained today:**
- `lib/money.ts:56-65` — `totalCostKobo` (exists; rewrite naira-only).
- `scripts/leak-check.ts:44-80` — rebuilds totals (call the one function).
- `lib/office.ts:72-88` — office money sums (a **second** total computation).
- `app/office/(shell)/car/car-client.tsx:66-122` — local `usdSum * RATE + ngSum`.
- `app/office/(shell)/inventory/inventory-client.tsx:20-22,57-81` — local `naira()`, cost cells.
**Check.** `money.test.ts` — the total equals the exact sum, incl. zeros. Search: no second
total-cost computation (`testing.md §1.2`).

### R-MON-5 — Integer kobo, one totals function, formatting at the display edge
**Rule.** All money is stored and combined as integer kobo — never floats, never scaled numerics; a
single totals function is the only place money is combined; naira formatting happens only at the
display edge.
**Forces.** `lib/money.ts` integer arithmetic + `formatNaira`; no screen re-derives a figure.
**Read points constrained today:**
- `lib/money.ts` — `nairaDigits` / `formatNaira` (the formatting edge).
- `app/office/(shell)/page.tsx:4,37,50,69,73` — office KPIs via `nairaDigits`/`formatNaira`.
- `app/office/(shell)/inventory/inventory-client.tsx:20-22,41,57-81` — local `naira()` formatter (remove).
- `components/CarCard.tsx:32-34`, `components/site/ReferenceCard.tsx:41-42`, `components/site/InventoryBrowser.tsx:15,55,103-119`, `app/(site)/car/[ref]/page.tsx:111,263-269` — display-edge formatting only (allowed; no re-derivation).
**Check.** `money.test.ts` — inputs/outputs are integer kobo, no rounding drift. Search: no float
division over money; formatting not used outside the display edge.

### R-MON-6 — Profit is projected before sale and real after; a loss is shown as it is
**Rule.** Projected profit = `doorstep price − total cost` for unsold cars; real profit =
`sale price − total cost` for sold cars; negative profit is displayed without correction.
**Forces.** `profitKobo({ totalCostKobo, priceKobo, salePriceKobo })` in `lib/money.ts`, and its
basis (projected / real / none). The one price is the car's single selling price (`R-MON-11`).
**Read points constrained today:**
- `lib/money.ts:67-73` — `profitKobo` (exists; rewrite to expose basis).
- `lib/office.ts:84-88` — office projected/real profit sums.
- `app/office/(shell)/inventory/page.tsx:32-43` — screen-local `profit = price − landed`.
- `app/office/(shell)/car/car-client.tsx:66-122` — form live profit.
**Check.** `money.test.ts` — projected for unsold, real for sold, exact negative for a loss.

### R-MON-7 — The **cost** figure is tied to the state (office side)
**Rule.** The cost figure is named by the car's state: "Estimated total cost" while on order / at
port / cleared, "Landed cost" once landed, "Total cost" once sold. A car that has not landed never
shows "Landed cost". Cost is office-only (`R-MON-12`).
**Forces.** `costLabelFor(state, sold)` in `lib/money.ts`; the car form and the office inventory
show its result, never a fixed label. The price is **not** part of this (`R-MON-11`).
**Read points constrained today:**
- `app/office/(shell)/car/car-client.tsx:627-674,710-724` — form live cost panel (fixed label).
- `app/office/(shell)/inventory/inventory-client.tsx:57-81,236-328` — cost/landed-cost cells.
- `lib/office.ts` — the adapter's cost naming.
**Check.** `money.test.ts` — the label follows the state; no "Landed cost" before landed. Live: an
on-order car reads "Estimated total cost" (Task 21 probe).
**Settled (owner, 2026-10-12).** Cost attaches to the **state** (a label), not the section: a state
meaning landed reads "Landed cost"; any earlier state reads "Estimated total cost".

### R-MON-8 — Incomplete costs are explained, never hidden
**Rule.** Cars with incomplete costs contribute their entered costs to money-tied-up (the money was
genuinely spent) but are left out of profit totals, which carry a plain "still building" line naming
how many cars are out and why. Never silently dropped, never counted as zero profit.
**Forces.** the incomplete-cost handling in `lib/overview.ts` + `lib/money.ts`; the dashboard keeps
its shape and adds the line.
**Read points constrained today:**
- `lib/office.ts:72-88` — office moneyTiedUp / projectedProfit / realProfit (no "still building" today).
- `app/office/(shell)/page.tsx:78-101` — dashboard KPIs.
**Check.** `overview.test.ts` — money tied up includes the incomplete cars; profit names its reach
and names the excluded count with "still building".

### R-MON-9 — Every money total states its reach
**Rule.** Each money total says which cars it counted — e.g. "projected profit from 9 of 14 cars" —
and names what is left out; no total silently drops or quietly includes unfinished cars.
**Forces.** the reach computed in `lib/overview.ts` alongside each total; the dashboard renders it.
**Read points constrained today:** `app/office/(shell)/page.tsx:78-101` — dashboard totals; any
public money display (should not exist — `R-MON-12`).
**Check.** `overview.test.ts` — a total exposes its `(counted, of)` reach and its exclusions.

### R-MON-10 — A malformed amount cannot be saved; the error shows at the field
**Rule.** A cost amount that is not a valid naira figure cannot be saved; the error appears at that
field, visible before submitting — never only after. The same predicate decides validity at every
point it is asked.
**Forces.** `parseCostAmount(raw)` in `lib/money.ts` — the one validation predicate; the car form's
submit gate calls it and shows the error at the field.
**Read points constrained today:** `app/office/(shell)/car/car-client.tsx` — form submit gate (no
predicate today); `app/office/(shell)/car/page.tsx:32-39` — kobo→naira conversion into the form.
**Check.** `money.test.ts` — malformed input rejected, valid input (incl. `0`) accepted. Live: a
bad amount blocks at its field (Task 21 probe).
**Note.** "on save" = the form's submit gate (the predicate), not a DB write — the write path is
**TASK-004** (`task.md §Technical decisions #7`).

### R-MON-11 — The selling price belongs to the car, never to a state
**Rule.** A car has one selling price — the doorstep price, what the buyer pays to have the car
delivered. It is a field on the car and is the same whether the car is on order, available, or
landed. No state and no section has a price.
**Forces.** `priceKobo` on the car is the only price; `lib/money.ts` profit (`R-MON-6`) uses it; no
state/section record carries a price.
**Read points constrained today:**
- `lib/serialize.ts:19,126-127` — price/wasPrice mapping.
- `app/office/(shell)/car/car-client.tsx` — the price field.
- `app/office/(shell)/inventory/page.tsx:32-43` — price read.
**Check.** `money.test.ts` — the price is state-independent and profit uses the car's single price.
Search: no per-state or per-section price field/key.

### R-MON-12 — Cost is office-side and tied to the state; the showroom shows only the price
**Rule.** Cost is shown only in the office, tied to the state; the showroom carries no cost at all —
a buyer sees only the car's selling price.
**Forces.** `lib/money.ts`'s cost functions are office-side; `lib/serialize.ts`'s allow-list keeps
cost out of the public path (`R-SEC-5`).
**Read points constrained today:**
- `lib/serialize.ts:22-23,43-44,61-62` — the public allow-list (must carry no cost/total/profit).
- `lib/public-cars.ts` — the only public read path.
- `app/office/(shell)/inventory/inventory-client.tsx` — office cost display (allowed).
**Check.** `money.test.ts` + the public-boundary search — cost is absent from the public payload;
the office shows cost by state.
**Named for TASK-003.** The stored shape has six fixed cost **kinds** and no state on a cost line,
so "cost attached to a state" cannot be stored as such today. This layer states the rule and names
the gap; the storage shape is TASK-003's.

---

## 5. Reference codes — `R-REF`

Source: `specs/inventory/spec.md` §"Durable reference codes".

### R-REF-1 — A car's code is a `TS-` sequence number
**Rule.** Every car has exactly one reference code of the form `TS-` followed by a zero-padded
sequence number.
**Forces.** `formatRef(seq)` + `isValidRef(ref)` in `lib/refs.ts`; the stored default (`car.ref`
from `ts_ref_seq`) already produces this shape.
**Read points constrained today:**
- `migrations/0003_car.sql:3-9` — `ts_ref_seq` + `car.ref DEFAULT ('TS-'||lpad(nextval,4,'0'))` (the only format site).
- `scripts/seed.ts:73` — `LEGACY_REFS` built with `padStart(4,'0')` (a second formatter).
- `app/office/(shell)/car/page.tsx:18` — `DEMO_REF = "TS-1009"`; `scripts/seed-office.ts:29-43` — literal refs.
**Check.** `refs.test.ts` — `formatRef` pads to `TS-####`; `isValidRef` accepts valid, rejects
malformed.

### R-REF-2 — Assigned once on creation, never edited, never chosen by hand
**Rule.** The code is assigned once when the car is created, from the sequence; never edited
afterwards and never typed by hand.
**Forces.** `lib/refs.ts` states the invariant; the assignment itself is wired by the write path
(**TASK-004**) against `ts_ref_seq`. This layer must **not** override or reassign a code.
**Read points constrained today:** `migrations/0003_car.sql:3-9` — the sequence default (the
assignment site); `scripts/seed.ts:195-199` — `setval` of the sequence.
**Check.** `refs.test.ts` — the module exposes no "set" of a code. Live (TASK-004 later): a created
car receives the next code and keeps it through an edit.

### R-REF-3 — A code is never reused after deletion
**Rule.** Deleting a car never frees its code: a later car never receives a deleted car's code.
**Forces.** the sequence is monotonic and deletion is soft (`deleted_at`) — the stored shape already
supports it; this layer must not free or reuse a code, and names any gap for TASK-003.
**Read points constrained today:** `migrations/0003_car.sql:3-9` — monotonic sequence;
`scripts/seed.ts:195-199` — sequence advanced to the max existing ref.
**Check.** `refs.test.ts` — the sequence advances; nothing in the module returns a used code. Live
(TASK-004 later): a deleted car's code is not handed out again.

### R-REF-4 — The code is the join key
**Rule.** Enquiries, taps and activity rows join to a car by its reference code, so the code
outlives the car row.
**Forces.** `lib/refs.ts` is the only definition of the code's shape; the public path and any join
use it, never a row id.
**Read points constrained today:**
- `migrations/0004_enquiries.sql:18` — `enquiry.car_ref text`.
- `migrations/0005_feed_settings.sql:7` — `tap.car_ref text`.
- `lib/public-cars.ts:40,48` — public join key `c.ref = $1`.
- `app/office/(shell)/activity/activity-client.tsx:36-51` — activity join labels by ref.
- `components/site/car-view.ts:27-29` — `carHref` by `c.ref`; `components/whatsapp.ts:8-10` — WA link embeds ref.
**Check.** Search — joins use the ref, not an internal id, on the public path. Live (TASK-004
later): tap/enquiry/activity each join by code.

---

## 6. Sold — `R-SLD`

Source: `specs/inventory/spec.md` §"Sold is a flag, not a state"; `specs/showroom/spec.md` §"Sold and
deleted cars leave the showroom".

### R-SLD-1 — Sold is a flag with a price and a date, never a state
**Rule.** "Mark as sold" is a separate action that sets a sold flag together with a sale price and
a date. It is never a state choice, and no state means "sold".
**Forces.** `isSold` + `saleTransition` in `lib/sale.ts`; the sold flag is read from the sale
record, never from a section or state.
**Read points constrained today:**
- `migrations/0003_car.sql:48-53` — `sale(id, car_id UNIQUE, sale_price_kobo, sold_at)` (the record).
- `lib/public-cars.ts:14-15` — `(sale.id IS NOT NULL) AS sold`.
- `lib/office.ts:22,25,66,68` — `sold_at`/`sale_price_kobo` reads.
**Check.** `sale.test.ts` — the sold flag comes from the sale record (price + date); no state
carries sold-ness.

### R-SLD-2 — Marking sold removes it from the showroom and from stock, keeps it in lifetime totals
**Rule.** A car marked sold leaves the showroom entirely and appears in Sold/Archive; it is excluded
from stock counts but remains in lifetime (office) totals, and its profit becomes real profit.
**Forces.** the public read path filters sold cars; `lib/counts.ts` counts sold outside stock
(`R-CNT-3`); `lib/sale.ts` flips the profit basis to real (`R-MON-6`).
**Read points constrained today:**
- `lib/public-cars.ts:14-15,57` — public sold filter.
- `lib/serialize.ts:26-27,63-64,105-108,131-132` — public `sold`/`soldAt` fields + `isListed`.
- `lib/office.ts:84-88,99-101` — real-profit split.
- `app/office/(shell)/inventory/inventory-client.tsx:114,126,219,243-255,290-328` — sold rows/cells.
- `app/(site)/car/[ref]/page.tsx:20,99-100,508-527` — sold page view + Sold crumb.
**Check.** `sale.test.ts` + `counts.test.ts` — a sold car is out of stock, in the sold list, and
counted under real profit. Live: it vanishes from the showroom (Task 21 probe).

### R-SLD-3 — Un-marking reverses the sale record cleanly
**Rule.** Un-marking sold reverses or voids the sale record, so the car returns to its section and
its profit returns to projected — with no stale real-profit residue.
**Forces.** `saleTransition(current, action)` in `lib/sale.ts` — un-marking what is not sold is a
no-op, never a duplicate or a leftover; the reversal is the same single implementation.
**Read points constrained today:** `scripts/seed.ts:160-172` — insert/upsert/delete `sale` row;
`app/office/(shell)/car/car-client.tsx:138,219,735-758` — "Mark as sold" modal (demo, no write).
**Check.** `sale.test.ts` — mark → un-mark returns to the pre-sale state; no real-profit residue;
un-marking an unsold car is a no-op.
**Note (write path).** Persisting the reversal is **TASK-004**; this layer delivers the decision
(`saleTransition`) and the read-side consequence.

---

## 7. Deletion ledger — read points that must stop computing their own answer

The check (`Task 20`) treats any remaining site below as a **second implementation** (a defect)
until it calls the forced module.

| Read point | Today | Must become |
|------------|-------|-------------|
| `lib/office.ts:9-10` | hardcoded `AVAILABLE_STATES`/`ON_ORDER_STATES` | `lib/sections.ts` `sectionOfState` |
| `lib/office.ts:72-104` | own money sums + counts over `office_car` | the documented adapter → `counts.ts`/`overview.ts`/`money.ts` |
| `lib/public-cars.ts:13` | section via JOIN `car_state` | `lib/sections.ts` |
| `app/office/(shell)/settings/state-seeds.ts:12,24-30,51` | second `CarSection` + `CAR_STATES` + `SECTIONS` | `lib/sections.ts` |
| `components/site/HomeInventory.tsx:30-32,73,77` | local count arithmetic | `counts.ts` |
| `components/InventoryTabs.tsx:13-22,45-46` | local section arrays + counts | `counts.ts` + `sections.ts` |
| `components/site/InventoryBrowser.tsx:40-50,97-101,110` | local section maps + status counts | `sections.ts` + `counts.ts` |
| `components/site/HomeBehaviors.tsx:83-84,151` | local counts for spoken lines | `counts.ts` |
| `app/(site)/car/[ref]/page.tsx:25-35` | local `SECTION_LABEL`/`STATUS_KEY` | `sections.ts` |
| `components/site/car-view.ts:12-17`, `components/site/ReferenceCard.tsx:8,17-21` | local section/status derivation | `sections.ts` |
| `app/office/(shell)/car/car-client.tsx:43-45,66-122` | `RATE`/`usd`/local sum/profit | `money.ts` |
| `app/office/(shell)/settings/settings-client.tsx:147-157,390-449` | "Dollar rate" card | removed |
| `app/office/(shell)/inventory/inventory-client.tsx:20-22,57-81` | local `naira()` + cost cells | `money.ts` (office-side) |
| `app/office/(shell)/inventory/page.tsx:32-43` | `profit = price − landed` | `money.ts` |
| `scripts/seed.ts:75-93,142-148` | `usdLines()` rate conversion | naira only |
| `app/office/(shell)/inventory/page.tsx:12-17`, `inventory-client.tsx:27-39` | state vocab maps | office adapter + `sections.ts` |

---

## 8. How the check runs (Tasks 20–21)

- **Unit form:** `npm test` → `node --import tsx --test "lib/**/*.test.ts"`; the six suites:
  `sections.test.ts`, `counts.test.ts`, `money.test.ts`, `refs.test.ts`, `sale.test.ts`,
  `overview.test.ts`.
- **Mechanical form:** `npm run typecheck`, `npm run build`, `npm run leak-check`, plus the
  searches named per rule (no second section list, no second count, no second total, no second ref
  formatter, no `rate`).
- **Surface form (not authority):** the per-screen probes (`Task 7` harness, cell matrix) via
  runtime-divergence on the persistent Chrome; surfaces only, **no screenshots**; intended vs
  unintended divergences separated (Task 21).
- **Reconciliation:** `scripts/reconcile.ts` (Task 22) runs the one rule over the office demo rows
  and prints the figures beside the office's own — a difference in data goes to the conflict log.

## 9. Named for other layers (not decided here)

- **TASK-003 (data model):** the `office_car`↔`car` reconciliation and the office data's shape; the
  now-void `currency`/`rate_minor` columns; a colour per car state and per enquiry state; the
  registries' `sort`; the stored shape for "cost attached to a state" (`R-MON-12`); the deleted-car
  tombstone's shape (`R-CNT-4`).
- **TASK-004 (functionality):** server actions / CRUD writes; the actual `TS-####` assignment from
  the sequence on creation (`R-REF-2`); sale-record persistence (`R-SLD-3`); the 8-second undo /
  soft-delete write path (`R-CNT-4`).

---

**Checkpoint B.** Every rule above is in the model with its forced implementation, its constrained
read points and its check; the model is what the check step (Tasks 20–21) will read. It is not to be
changed to match the build.
