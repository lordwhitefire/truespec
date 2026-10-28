# Business-logic findings — rules that do not hold

---

## BL-001 — New arrivals are counted by one rule and presented by another
**Severity:** minor · **Status:** open
**Evidence:**
- `lib/sections.ts:112-123` — `presentedSections()`: a car in `available` **or** `landed` with `isNewArrival` is presented under `landed`.
- `lib/counts.ts:47-54` — `countStock()`: `newArrivals` is incremented **only** inside `case "landed"`.

**Effect:** an `available` car flagged new-arrival is presented under Landed (per `presentedSections`) and appears in the Landed presentation, but is **not** counted in `newArrivals`, so it is missing from "of which N new arrivals".
**On a phone:** flag a car as a new arrival while its primary state is Available, then compare the Available count's "of which N" note with the cars visible under Landed.

## BL-002 — The section filter accepts a value the UI cannot express
**Severity:** minor · **Status:** open
**Evidence:** `app/(site)/inventory/page.tsx:40-47` resolves `status` tokens through `sectionOfToken`, whose accepted set includes **`sold`** (`lib/sections.ts:58-62`). `PUBLIC_SECTIONS` excludes sold. A URL with `?status=s` therefore produces a status filter that matches no listed car.
**Effect:** `?status=s` gives an empty inventory rather than the sold page or an ignored filter. Probably fine, but it is a public filter state with no control.

## BL-003 — Price filter truncates and has no bounds
**Severity:** minor · **Status:** open
**Evidence:** `InventoryBrowser.tsx:662-665` — `parseInt(v, 10)`. `:455-486` — `type="number"`, `min="0"`, `step="100000"`, but no max and no validation.
**Effect:** typing `12.5` becomes `12`. A pasted `1e9` becomes `1`. Negative values are possible via typing even with `min` (browsers allow it in the field). Check what the list does with min > max.
**On a phone:** type min 50,000,000 and max 5,000,000. Then type a decimal.

## BL-004 — "Special" is inferred, not stored
**Severity:** minor · **Status:** open
**Evidence:** `lib/serialize.ts:167-169` — `isSpecial` is `wasPriceKobo !== null && wasPriceKobo > priceKobo`.
**Effect:** a car whose "was" price is lower than its current price is not special, and the struck-through price disappears — but the DB still holds the higher "was" value. If the owner raises the price above the old "was", the badge silently vanishes rather than showing an increase.

## BL-005 — Two different "sold" signals
**Severity:** minor · **Status:** open
**Evidence:** `lib/counts.ts:36` treats a car as sold if `car.sold || car.section === "sold"`. `lib/serialize.ts:137` `isListed` checks `!row.sold` only. `lib/public-cars.ts:38` additionally filters by `PUBLIC_SECTIONS`.
**Effect:** the paths agree today because setting Sold writes a sale row. If a sale row is ever missing while the section is `sold`, `isListed` would keep the car in the public list and `countStock` would drop it — the two disagree. Worth a targeted test after un-marking a sale.
**On a phone:** mark a car sold, then un-mark it; check it returns to the showroom and the counts agree.

## BL-006 — Cost completeness is enforced in one module, but the form is the real gate
**Severity:** minor · **Status:** open
**Evidence:** `lib/money.ts:46-52` defines complete = all six values present; `0` counts. Whether the form lets a blank through must be checked against `lib/car-input.ts` and `lib/car-form.ts` (office pass).
**Status:** carries forward to the office review.

## BL-007 — Two floats/Numbers at the boundary
**Severity:** polish · **Status:** open
**Evidence:** `lib/money.ts:101` — `Number(major) * 100 + Number(minor.padEnd(2, "0"))`; `lib/serialize.ts:156-157` — `Number(...)` on SQL numeric.
**Effect:** kobo values derived from strings are exact for realistic naira amounts, but `Number` beyond 2^53 would drift. Not reachable with car prices; noted for completeness.

## BL-008 — "Newest first" is not a rule anywhere
**Severity:** major · **Status:** open
**Evidence:** `components/site/InventoryBrowser.tsx:116-118`; `app/office/(shell)/inventory/inventory-client.tsx:164-172`; store order `lib/public-cars.ts:34` and `lib/office.ts:139` is `ORDER BY c.ref`.
**Effect:** the default sort claims recency but returns ref order (oldest first). No timestamp is read for sorting at all — `car.created_at` exists but is never selected for a list. The rule the label states has no implementation.
**Check on the phone:** both inventories, default sort, highest vs lowest ref at the top.

## BL-009 — An unoccupied state is deleted on one tap; an occupied one is refused
**Severity:** minor · **Status:** open
**Evidence:** `registry-editor.tsx:288-289`; the store's refusal for an occupied state is the only guard.
**Effect:** the same button is safe or permanent depending on data the owner cannot see from the row. Nothing tells him which kind he is about to press.
**Check on the phone:** try an empty secondary and one that a car uses.

## BL-010 — The add-car form has no "already saved" state
**Severity:** major · **Status:** open
**Evidence:** see FN-009. `isEdit` is fixed at mount; no `savedRef` state gates the button.
**Effect:** the form's rule is "this button creates a car", not "this button saves the car in front of you". A successful write does not change what the next press does.
**Check on the phone:** double-save after success.

## BL-011 — Reordering states writes only the rows the editor can move
**Severity:** polish · **Status:** open
**Evidence:** `registry-editor.tsx:130-160` — `moveBy` operates on `editable` rows only, and `reorder` receives their ids; locked primaries keep their fixed `sort` values.
**Effect:** correct for the current model (primaries are fixed), but it means a registry whose locked rows were seeded out of order could never be corrected from the office. Check the four primaries are in the intended showroom order.
