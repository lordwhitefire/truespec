# TASK-002 — Model Check (Task 20)

**Authority:** `developer-workspace/models/TASK-002-model.md` — 29 rules + the §7 deletion ledger.
The model is **not** changed to match the build; where the build differs, the build is the
divergence. This task is a **check only** — no source file was edited. (One operational action:
the `:3210` dev server was restarted; see §1 note.)

**Method.** Walk the model rule by rule. Run each rule's named executable check (`npm test`) and
each named mechanical check (the per-rule search). A rule **holds only when both pass**. A second
implementation found is a **defect**; a rule the build cannot satisfy is a **raised** item.

**Date:** 2026-10-13. **Servers:** build `:3210` (`next dev`), reference `:3211` (static). Port
`3000` closed, never used (owner standing rule).

---

## 1. Gates (model §8, mechanical form)

| Gate | Command | Result |
|------|---------|--------|
| Unit | `npm test` → `node --import tsx --test "lib/**/*.test.ts"` | **47/47 pass**, 0 fail |
| Types | `npm run typecheck` (`tsc --noEmit`) | **clean** |
| Build | `npm run build` | **green** |
| Leak | `npm run leak-check` (against `http://localhost:3210`, 26 public routes) | **PASSED** — no cost/currency/profit on any public route |

**Operational note — build/dev `.next` collision (this task only).** Running `npm run build`
while `next dev` (`:3210`) was live clobbered the dev server's `.next`, so every dynamic route
returned `500` with `Cannot find module './vendor-chunks/@neondatabase.js'` — leak-check first
reported 24 failing routes. **Not a code fault.** Restarting `next dev` on `:3210` regenerated
`.next`; leak-check then passed **26/26**. Standing order for later tasks: run `leak-check` before
`build`, or give the production build its own `distDir`.

---

## 2. Rule by rule (29)

Legend: **U** = executable unit test; **S** = mechanical search. A rule holds when all its checks pass.

| # | Rule | Forced module / site | Check | Result | Evidence |
|---|------|----------------------|-------|--------|----------|
| 1 | R-SEC-1 | `lib/sections.ts` `Section`+`SECTIONS`+`SECTION_LABEL` | U + S | **PASS** | `sections.test.ts:33-34`; `lib/sections.ts:12-22`. Search: the only other three-section literal is `sections.test.ts:37` (the test's own expectation list, not an implementation) |
| 2 | R-SEC-2 | `lib/sections.ts` `sectionOfState`/`isSection`/`sectionOfToken` | U + S | **PASS** | `sections.test.ts:35-38,43-59`; `lib/sections.ts:58-85`. Search: every consumer calls the one rule — `office.ts:130,146`, `serialize.ts:142`; no state→section map outside `sections.ts` |
| 3 | R-SEC-3 | `lib/sections.ts` `AVAILABLE_PRESENTATION`/`inAvailablePresentation` | U (+live) | **PASS** | `sections.test.ts:40`; `lib/sections.ts:89-93`. Landed-in-Available live view → Task 21 |
| 4 | R-SEC-4 | `lib/sections.ts` `presentedSections` | U + S | **PASS** | `sections.test.ts:39`; `lib/sections.ts:101-112`. Search: 0 owner-state labels rendered on public pages (§2a) |
| 5 | R-SEC-5 | `lib/serialize.ts` public allow-list | S (+live) | **PASS** | `serialize.ts:51-53` (allow-list carries the section, not the state), `:142` (section from `sectionOfState`); the raw row's `state` is read for resolution only (`:71-72`). Rendered public pages hold no state label (§2a) |
| 6 | R-CNT-1 | `lib/counts.ts` `countStock` | U | **PASS** | `counts.test.ts:33-49`; `lib/counts.ts:27-57` |
| 7 | R-CNT-2 | `lib/counts.ts` `countStock` | U | **PASS** | `counts.test.ts:51-54` |
| 8 | R-CNT-3 | `lib/counts.ts` sold count | U (+live) | **PASS** | `counts.test.ts:56-62`; `lib/counts.ts:35-38`. Sold-leaves-stock live → Task 21 |
| 9 | R-CNT-4 | `lib/public-cars.ts` filter sold/deleted | S (+live) | **PASS** | `public-cars.ts:24` (`deleted_at IS NULL`), `:35` (`filter(isListed)`), `:54-58` (counts over the filtered set); `serialize.ts:119-120` (`isListed` excludes sold). Graceful sold-link live → Task 21 |
| 10 | R-CNT-5 | all count read points → `counts.ts`/`overview.ts` | S (+live) | **PASS** | Every count read point calls `countStock`: `overview.ts:42`, `public-cars.ts:56`, `office.ts:153`, `Site/HomeInventory.tsx:33`, `Site/InventoryBrowser.tsx:88`, `Site/HomeBehaviors.tsx:85`. No second section count found (see §4 notes). Live equality → Task 21 |
| 11 | R-MON-1 | `lib/money.ts` `SIX_COST_KINDS` | U + S | **PASS** | `money.test.ts:27-37`; `money.ts:13-20`. Search: the six kinds appear elsewhere only as the form's kind map (`car-client.tsx:77-82`), the leak-check guard (`leak-check.ts:19-24`), seed inserts (`seed.ts:84,94`), and the stored CHECK (`migrations/0003_car.sql:38`). No seventh kind |
| 12 | R-MON-2 | `lib/money.ts` `isCostComplete` | U | **PASS** | `money.test.ts:11`; `money.ts:46-52` |
| 13 | R-MON-3 | `lib/money.ts`+form+settings — no rate | U + S | **PASS** | `money.test.ts:41-45`; `money.ts` carries no currency/rate. Repo `rate` search: only comments (`money.ts:4`, `serialize.ts:3`, `car/page.tsx:17-18`), the leak-check guard, the **void** columns (`0003_car.sql:39,44-45`), and the removed-setting history (`seed.ts:145`). Settings has no dollar/rate; `car-client.tsx` has no `RATE`/`usd` |
| 14 | R-MON-4 | `lib/money.ts` `totalCostKobo` | U + S | **PASS** | `money.test.ts:13-14`; `money.ts:35-42`. Search: every total runs through it — `overview.ts:50,86`, `inventory/page.tsx:35`, `car-client.tsx:106`, `leak-check.ts:79`. No second sum |
| 15 | R-MON-5 | `lib/money.ts` integer kobo + `formatNaira` | U + S | **PASS** | `money.test.ts:15-16`; `money.ts:107-113`. Search: formatting only at the display edge (`car-client`, `inventory-client`, office page, car page, site components, leak-check); no float division over money (see §4 note) |
| 16 | R-MON-6 | `lib/money.ts` `profitKobo`+basis | U | **PASS** | `money.test.ts:17-19, 111-116`; `money.ts:60-72` |
| 17 | R-MON-7 | `lib/money.ts` `costLabelFor` | U (+live) | **PASS** (divergence logged) | `money.test.ts:120-126`; `money.ts:80-84`. Live label → Task 21. Input is the **section**, not the state label — §4 divergence (6) |
| 18 | R-MON-8 | `lib/overview.ts` + `lib/money.ts` | U | **PASS** | `money.test.ts:21-24`, `overview.test.ts`; `overview.ts:41-91` |
| 19 | R-MON-9 | `lib/overview.ts` reach | U | **PASS** | `money.test.ts:25`, `overview.test.ts`; `overview.ts:93-103` |
| 20 | R-MON-10 | `lib/money.ts` `parseCostAmount` | U (+live) | **PASS** | `money.test.ts:130-140`; `money.ts:93-103`. Bad-amount-blocks live → Task 21 |
| 21 | R-MON-11 | `lib/money.ts` single `priceKobo` | U + S | **PASS** | `money.test.ts:144-149`; `money.ts:60-72`. Search: no price/cost field on any state or section record (`0002_registries.sql`, `state-seeds.ts` — none) |
| 22 | R-MON-12 | `lib/money.ts` office-side + `serialize.ts` allow-list | S | **PASS** | Public boundary search = leak-check **PASSED** 26/26; `serialize.ts:51-53` allow-list carries no cost/total/profit; office cost shown by state |
| 23 | R-REF-1 | `lib/refs.ts` `formatRef`/`isValidRef` | U | **PASS** | `refs.test.ts:26-30`; `refs.ts:11,22`. Stored default is the only other format site (`0003_car.sql:3-9`) |
| 24 | R-REF-2 | `lib/refs.ts` (assignment wired by TASK-004) | U + S | **PASS** | `refs.test.ts:31`; `refs.ts` exports only `REF_PREFIX`, `formatRef`, `isValidRef` — no setter |
| 25 | R-REF-3 | sequence monotonic + soft delete | U (+live) | **PASS** | `refs.test.ts:32`; sequence `0003_car.sql:3-9`; nothing returns a used code. Reuse live → TASK-004 |
| 26 | R-REF-4 | `lib/refs.ts` — code is the join key | S | **PASS** | Public joins use the ref, not a row id — `public-cars.ts:40,48` (`c.ref = $1`), `car-view.ts:30` (`carHref`), `whatsapp.ts:10` |
| 27 | R-SLD-1 | `lib/sale.ts` `isSold`+`saleTransition` | U + S | **PASS** | `sale.test.ts:41-42`; `sale.ts:17-25`. Sold-ness everywhere traces to the sale record; no state/section carries it (see §4 note 8) |
| 28 | R-SLD-2 | public filter + `counts.ts` + `sale.ts` | U (+live) | **PASS** | `sale.test.ts:43` + `counts.test.ts`; `public-cars.ts:14-15,35`; `sale.ts:23-25`. Vanishes-from-showroom live → Task 21 |
| 29 | R-SLD-3 | `lib/sale.ts` `saleTransition` un-mark | U | **PASS** | `sale.test.ts:44-46`; `sale.ts:30-37` |

### 2a. Public-payload state-label search (R-SEC-4/5)
Rendered `:3210` pages contain **none** of the owner-state labels or cost fields:
`On the way`/`At port`/`Cleared`/`Held for payment`/`Landed cost`/`landed_cost`/`doorstep_price`
→ **0 hits** on `/car/TS-1001`, `/`, and `/inventory`.

---

## 3. §7 Deletion ledger — every read point calls the forced module

| # | Read point (as the model lists it) | Must become | Verdict |
|---|------------------------------------|-------------|---------|
| 1 | `lib/office.ts:9-10` `AVAILABLE_STATES`/`ON_ORDER_STATES` | `sections.ts sectionOfState` | **satisfied** — no such sets; uses `sectionOfState` (`office.ts:130,146`) |
| 2 | `lib/office.ts:72-104` own money sums + counts | adapter → `counts`/`overview`/`money` | **satisfied** — `countStock` (`:153`), `stockOverview` (`:158`) |
| 3 | `lib/public-cars.ts:13` section via JOIN | `lib/sections.ts` | **satisfied** — resolved by `sectionOfState` (`serialize.ts:142`) |
| 4 | `settings/state-seeds.ts:12,24-30,51` second `CarSection`+`SECTIONS` | `lib/sections.ts` | **satisfied** — no `CarSection` type, no `SECTIONS` const; `EditorRow.section` is `Section` |
| 5 | `Site/HomeInventory.tsx:30-32,73,77` local count arithmetic | `counts.ts` | **satisfied** — `countStock` (`:33`) + `presentedSections` |
| 6 | `components/InventoryTabs.tsx:13-22,45-46` local section arrays + counts | `counts.ts` + `sections.ts` | **satisfied** — file **removed** (folded into `InventoryBrowser`) |
| 7 | `Site/InventoryBrowser.tsx:40-50,97-101,110` local maps + status counts | `sections.ts` + `counts.ts` | **satisfied** — `SECTIONS`/`presentedSections`/`sectionLabel`/`tokenOf`; `countStock` (`:88`) |
| 8 | `Site/HomeBehaviors.tsx:83-84,151` local counts | `counts.ts` | **satisfied** — `countStock` (`:85`) |
| 9 | `app/(site)/car/[ref]/page.tsx:25-35` local `SECTION_LABEL`/`STATUS_KEY` | `sections.ts` | **satisfied** — `sectionLabel`/`tokenOf` (`:7`); `tokenOf(car.section)` (`:96`) |
| 10 | `car-view.ts:12-17` + `ReferenceCard.tsx:8,17-21` local derivation | `sections.ts` | **satisfied** — `sectionLabel` (`car-view.ts:1`); `ReferenceCard` reads the serialized `car.section` |
| 11 | `car/car-client.tsx:43-45,66-122` `RATE`/`usd`/local sum/profit | `money.ts` | **satisfied** — no `RATE`/`usd`; `totalCostKobo` (`:106`), `profitKobo` (`:127,140`), `formatNaira` |
| 12 | `settings/settings-client.tsx:147-157,390-449` "Dollar rate" card | removed | **satisfied** — no dollar/rate in `settings-client.tsx` |
| 13 | `inventory/inventory-client.tsx:20-22,57-81` local `naira()` + cost cells | `money.ts` | **satisfied** — `formatNaira`; cost/profit/costLabel mapped server-side via `money.ts` |
| 14 | `inventory/page.tsx:32-43` `profit = price − landed` | `money.ts` | **satisfied** — `profitKobo`/`totalCostKobo`/`costLabelFor`/`isCostComplete` |
| 15 | `scripts/seed.ts:75-93,142-148` `usdLines()` rate conversion | naira only | **satisfied** — `nairaLines` (`:75-94`), `currency='NGN'`, `rate_minor` never written, cost lines re-synced per run |
| 16 | `inventory/page.tsx:12-17` + `inventory-client.tsx:27-39` state vocab maps | office adapter + `sections.ts` | **satisfied** — states from `getOfficeStates`; row section from the view |

**16/16 ledger rows satisfied.** No remaining second implementation of a section set, a count, a
money total, a ref format, or a rate.

---

## 4. Defects and divergences

**No hard defect.** No second implementation of a section set (`sections.ts`), a count
(`counts.ts`/`overview.ts`), a money total (`money.ts`), or a ref format (`refs.ts`) exists. No
`rate` survives outside the void columns and history comments.

**Named divergences for the Task 22 conflict log** (build vs model wording; behaviour-equivalent,
each named rather than hidden):

1. **Money tied up** — new figure ₦451,040,000 vs the old witness ₦587,040,000 (incomplete cars
   TS-1013/1014 contribute 0 via the shared rule; the old code used price as a proxy). Owner ruling
   2026-10-12: a data difference, not a second rule.
2. **Inventory chip dot colour** folded to section ("On the way"/"At port" share blue); per-state
   colour is named for TASK-003.
3. **After a demo delete** the headline still uses the server's `counts.sold`.
4. **Task 18 retitle** "Currency & cost defaults" → "Cost default" (the rate is gone).
5. **Task 17 `HELD` demo state** has no registry entry, so its live cost label falls back to the
   car's own section.
6. **R-MON-7 input contract.** `costLabelFor(state: Section, sold)` (`money.ts:80`) takes the
   **section** — the state's resolved stage — not the owner's state label, which the model's §7 and
   its settled paragraph word as "the state". For every registered state the result is identical
   (available/landed → "Landed cost"; on order → "Estimated total cost"; sold → "Total cost"). The
   test mirrors the implementation (`money.test.ts:120-126`). No behavioural difference today; a
   future state whose section disagreed with its stage would matter. **Log it.**
7. **`inventory-client.tsx:156` `stock = rows.length - counts.sold`.** The office inventory count
   line derives "in stock" as the presented row list minus the rule's **own** sold figure. The three
   section counts are never recomputed locally; the Sold chip uses `counts.sold`. Display arithmetic
   over the list, not a second counting rule. **Noted, not a defect.**
8. **`inventory/page.tsx:33` `const sold = c.sold_at !== null`** repeats the sold-ness derivation
   the adapter already does (`office.ts:94`, the model's named R-SLD-1 read point). Same source (the
   sale record), same result — no state/section carries sold-ness. Candidate to fold into the
   adapter when TASK-003 shapes the office row. **Noted, not a defect.**

**Note on R-MON-5.** The only kobo→naira `/100` is `car/page.tsx:49` (kobo→naira into the form's
input — the model's own R-MON-10 read point); the car form's `≈ x% of the price` line
(`car-client.tsx:133`) is a ratio, not a money combination. Neither violates "no float division
over money".

---

## 5. Not covered here — Task 21 live probes (surfaces only, not authority)

These rules name a live probe; the mechanical/unit form passes and Task 21 will confirm the surface:
R-SEC-3 (landed visible under Available), R-SEC-4/5 (buyer payload holds no state label),
R-CNT-3 (a sold car leaves the stock total), R-CNT-4 (a sold-car shared link is graceful),
R-CNT-5 (Available equal on home/inventory/office at one moment), R-MON-7 (an on-order car reads
"Estimated total cost"), R-MON-10 (a bad amount blocks at its field), R-SLD-2 (a sold car vanishes
from the showroom).

---

## 6. Verdict

- **Every one of the 29 rules is accounted for; exactly one implementation per rule; no rate; no
  second section/count/money/ref implementation.**
- **All 4 gates pass** (`npm test` 47/47, `typecheck` clean, `build` green, `leak-check` 26/26).
- **§7 deletion ledger: 16/16 satisfied.**
- No rule the build fails to satisfy. Divergences 1–5 are pre-named; 6 is a wording/input divergence;
  7–8 are display-edge notes.

**Model-check: PASS.** Proceed to Task 21 (browser check, surfaces only).
