# Functionality findings — is the wiring complete

---

## FN-001 — Unlisted cars are publicly viewable at ₦0
**Severity:** blocker · **Status:** open
**Evidence:** `lib/public-cars.ts:48-53` — `getPublicCarForView()` returns any row by ref, with **no `isListed` check**. The car page uses it (`app/(site)/car/[ref]/page.tsx:22,81`). `lib/serialize.ts:156` — `priceKobo: Number(row.doorstep_price_kobo)` turns SQL `NULL` into `0`.
**Spec:** a car appears publicly only with a price **and** at least one photo; otherwise it is office-only.
**What the code does:** a car that fails the listing gate renders at `/car/<ref>` with **₦0** and a placeholder image. It is absent from inventory and counts, but the page exists for anyone holding the ref — including a ref shared before the price was cleared or the last photo removed.
**Also:** `getPublicCar()` (`:41-46`) is the version that does apply `isListed`, and **nothing calls it**. The correct gate exists and is unused.
**On a phone:** in the office, open a car that has a price and a photo, copy its ref, then clear its price (or delete all photos) and save. Open `/car/<ref>` on the phone.

## FN-002 — A malformed photo row crashes the page
**Severity:** major · **Status:** open
**Evidence:** `lib/serialize.ts:121-125` — `resolvePhotoUrl` throws if `assetId` does not start with `image-`.
**Spec:** if an asset is missing or the image store is down, render a placeholder — the page still loads.
**What the code does:** a row holding anything that is not a Sanity reference throws during serialization, before `Photo` can degrade. One bad row takes the inventory page, the home page or the car page down entirely (they all call `getPublicCars`/`toPublicCar`).
**Note:** the comment calls this deliberate ("an invariant broken, and it fails here, named"). That is defensible for developers but conflicts with the showroom's stated survival rule.
**On a phone:** only reachable if bad data exists. Check the office's data-health surface for dangling rows if one is built.

## FN-003 — Dead code: `getPublicCar`
**Severity:** minor · **Status:** open
**Evidence:** `lib/public-cars.ts:41-46`; no callers anywhere (grep).
**Effect:** none today. It is the only read that applies the listing gate, which makes FN-001's fix a one-line change.

## FN-004 — Home "new since last visit" is empty on a first visit
**Severity:** minor · **Status:** open
**Evidence:** `HomeBehaviors.tsx:58-60` stores `known` only when the home page runs. `HomeInventory.tsx:57-65` listens for `ts-show-new` and filters `cars` against `known`; if `known` is null it sets an empty list.
**Effect:** on the first visit there is no baseline, so "See what's new" shows zero. Defensible, but the button is rendered only when `knownCars.length` — check it is not offered with nothing to show.

## FN-005 — `?body=` is not a filter
**Severity:** major · **Status:** open (see UX-003)
**Evidence:** `HomeBehaviors.tsx:215` writes `body=SUV|Sedan`; `app/(site)/inventory/page.tsx` never reads it.
**Effect:** the home page's own answer flow is dead.

## FN-006 — Inventory filter counts are computed from all cars, not from the filtered set
**Severity:** minor · **Status:** open
**Evidence:** `InventoryBrowser.tsx:93-100` (`statusCounts` from all cars), `:415`, `:432`, `:449` (make/year/colour counts from all cars).
**Effect:** that is usually what facet counts should do (how many exist in total). But it means a count can advertise cars that the current other filters exclude. Check it does not read as "12 results" beside a list of 2.

## FN-007 — Car page related list is not filtered by section
**Severity:** minor · **Status:** open
**Evidence:** `app/(site)/car/[ref]/page.tsx:109` — `all.filter((c) => c.ref !== car.ref).slice(0, 11)`, then the heading is chosen by the current car's section (`RELATED_H2`).
**Effect:** a car page headed "More landed cars" can contain on-order cars. The heading promises a filter the list does not apply.
**On a phone:** open a Landed car and read the related strip's chips.

## FN-008 — The ticker can claim a "drop" for a car that is not available
**Severity:** minor · **Status:** open
**Evidence:** `app/(site)/layout.tsx:56-67` — `drops` filters `isSpecial` over **all** public cars; no section filter.
**Effect:** "Biggest drop: …" can name an on-order car. Check whether that is intended.

## FN-009 — A second tap on "Save car" creates a second car
**Severity:** major · **Status:** open
**Evidence:** `app/office/(shell)/car/car-client.tsx:899-916` — on success the add/edit branch calls `clearCarDraft()` and shows a toast, but **does not navigate or reset**. `isEdit` is a prop fixed at mount (`:29-32`), so on `/office/car/new` the next submit calls `createCar` again. (The **draft** path at `:886-888` does navigate; the ordinary add path does not.)
**Effect:** after "Saved TS-1042. The showroom updates immediately." the form still shows the same values and an enabled **Save car**. A second tap — easy on a phone when the first tap seems not to have registered — creates TS-1043 with identical details. Two cars, two refs, one real vehicle.
**Check on the phone:** add a car, wait for the toast, then tap **Save car** once more; look for a second `TS-####` in Inventory.

## Functionality notes (verified wiring, not findings)
- Photo bytes upload immediately (`uploadCarPhoto`), the car save carries only asset ids (`car-client.tsx:869-870`) — a car never points at bytes that were never uploaded.
- Draft save mints the `TS-####` and change-check at save time (`lib/draft-save-run.ts`), not at upload.
- `saveDraftForm` refuses a car draft with no chosen state before it writes.
- The public tap (`/api/tap`) is fired from `WhatsAppGate` before the WhatsApp link is followed.
- Deleting a car is `soft delete → restore within the window → tombstone`; removing for good clears photos, costs and the sale (`app/office/actions/car.ts`, `lib/car-delete.ts`).
- Enquiries have **no delete path at all** — see DATA-002 / COV-001.
- The import's PDF is stored but never linked to the record it produced — see DATA-001.
