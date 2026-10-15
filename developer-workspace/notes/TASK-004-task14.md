# TASK-004 · Task 14 — Sold / un-mark

**Date:** 2026-10-15 · **Status:** built, witnessed, gates green — not yet committed at the time
of writing.

**What was asked** (task.md truth 5, lines 107–112; design D15): Sold is one of the four fixed
primary states, and **setting it is what performs the sale** — a sale price and a date, recorded
on the sale row. The car leaves the showroom, leaves the stock count, stays in lifetime totals,
and its profit moves from projected to real. **Un-marking** reverses the sale and returns the car
to its **previous primary state**, with its secondary states untouched.

---

## The two owner rulings this task was built on (2026-10-15)

1. **"Sold as a 4th choice in the picker."** Sold is not a separate flow: it is the fourth chip in
   the car form's normal state picker. Choosing it is what performs the sale, and the form then
   also asks for the sale price and the date.
2. **"On the sale row (Recommended)."** The state the car was in *before* it sold is stored **on
   the sale row** (`sale.prior_state_id`), not on the car and not in the activity log.

---

## What was built

### The store — `migrations/0021_sale_prior_state.sql`

`sale` gains `prior_state_id uuid REFERENCES car_state (id) ON DELETE RESTRICT`, backfilled to the
**Landed** primary for any sale row that predates it, then set `NOT NULL`.

Why it cannot be derived: `activity_event` records *that* a car changed, never what it changed
from, and `car` holds only the state it is in **now**. Un-marking needs the previous state, so it
has to be stored. It lives on the sale row because truth 5 says the money facts live there and
nowhere else — and because it is exactly as long-lived as the sale it belongs to (un-marking
removes both together, so nothing stale can survive).

The number `0021` was the plan's for the **draft table**; the draft migration moves to `0022` and
the plan tracker was updated.

### The write — `lib/car-update.ts`

The sale rides the one atomic `carUpdateStatement` that already changes a car:

| What happens | What the statement does |
| --- | --- |
| the chosen state is Sold | `ins_sale` upserts the `sale` row, taking `prior_state_id` from **`old.state_id`** — the car's own row, read by this same statement before the update |
| the car is already Sold and the price/date is corrected | `ON CONFLICT (car_id) DO UPDATE` sets **only** `sale_price_kobo` and `sold_at`, so `prior_state_id` is never lost |
| the chosen state is not Sold | `del_sale` deletes the row — no real-profit residue (R-MON-6) |

The sale's price + date key is part of the `changed` guard, so a **price-only correction is still a
real write**, and a retry of any of it is still a true no-op (D18). The activity row names the
transition: `car.sold` on the way in, `car.unsold` on the way out, `car.updated` otherwise.

`prior_state_id` is **not** a parameter. It comes from the stored row; a browser cannot send one.

### The reader — `lib/car-input.ts`

`salePrice` (naira) and `saleDate` (`YYYY-MM-DD`) are read together or not at all — half a sale is
refused at the field that is missing. The day is stored at **noon UTC**, so no display timezone can
shift it to the day before or after, and it round-trips through the form unchanged.

### The rule — `lib/sale.ts` (rewritten)

R-SLD-1 used to say sold-ness came from the sale record and was **never a state**. D15 revises
exactly that, so the old wording is gone rather than left as a trap. What remains is the one rule
the write paths share — `saleForState(section, sale)`: **only the Sold section keeps a sale.**
`readCarForm` uses it as the invariant's two halves: a car being set Sold **must** carry the pair,
and a price sent with any other state is **dropped, never stored**. So a sale row can never sit
beside a car that is not Sold, in either direction.

Profit moving from projected to real is covered by `money.test.ts` (R-MON-6) and sold cars leaving
the count by `counts.test.ts`; the old `lib/sale.ts` helpers were dead app code and went with the
rewrite.

### The screens

- **`app/office/(shell)/car/car-client.tsx`** — the picker offers the four primaries; picking Sold
  reveals **"The sale — required"** with the price and the date (defaulting to today). The
  "Mark as sold" button is now a shortcut that picks the Sold chip — there is no demo modal left
  (the old toast-only modal was ported demo markup and is removed; nothing it did survived).
  A car that **is** sold shows a notice naming the state it will return to, with **"Move it back"**,
  which moves the pick to the prior state; saving is what commits the reversal.
- **`app/office/(shell)/car/[ref]/page.tsx`** — passes `salePrice`, `saleDate` (UTC day),
  `priorStateId` and `priorStateLabel`.
- **`lib/office.ts`** — `getOfficeCarForEdit` reads the sale and joins the prior state's label.
  `toOverviewCar` now takes **sold-ness from the section**, not from `sold_at` (D15: the state
  comes first and the sale follows), so the two can never disagree about which car is sold.

---

## Decisions taken here (with their reasons)

1. **A car cannot be *created* Sold.** *(Flagged — the owner can overturn this.)* Un-marking
   returns a car to the primary state it held before it sold; a car that never held one has nothing
   to return to, and `prior_state_id` is `NOT NULL`. So add mode offers the three states a car can
   arrive in, and `createCar` refuses Sold as a backstop with a plain message. The owner adds the
   car, then marks it sold — which is also where the price and date are entered.
2. **The un-mark is "move the pick, then save"** rather than a second Server Action that writes on
   its own. This reuses the proven, idempotent update path — including the recomputed change-check,
   which `state_id` is an ingredient of — and avoids a read-compute-write race on the hash. The
   sale row's `prior_state_id` is what the button targets, so the stored fact is used, not decorative.
3. **No confirming modal for Sold.** Only deletion carries a confirmation requirement (truth 6).
   Marking sold is not destructive and is fully reversible.

## Left alone on purpose

- **`inventory/page.tsx`, `settings/page.tsx`, `serialize.ts`, `public-cars.ts`, `cleanup.ts`** read
  `sale.sold_at` / `EXISTS (… sale …)` for sold-ness. Under the invariant (Sold ⟺ one sale row) this
  is the same answer as the section, and none of them is a write path. Changing them is a read-side
  vocabulary sweep, not part of this task.
- **`sale.prior_state_id` is not indexed.** It is only ever read *through* a sale row that was
  already found by `car_id` (which is `UNIQUE`), so a separate index would never be used.

---

## Verification

| Gate | Result |
| --- | --- |
| `npm run leak-check` | 18/18 |
| `npx tsc --noEmit` | clean |
| `npm test` | **114/114** (was 106; +3 `sale.test.ts`, +6 `car-update.test.ts`, +5 `car-input.test.ts`, −4 retired R-SLD tests) |
| `npm run build` | clean |
| `npm run store-freshness` | passed |

**Store witness — `developer-workspace/scripts/task-004/sold-car-check.ts`: 25/25, rolled back.**
It runs the *same* `carUpdateStatement` the action runs, inside one transaction:

- a car that goes Available → Landed → Sold writes **one** sale row, and `prior_state_id` is the
  Landed id the car actually held — not a default, not a client value;
- the event is `car.sold`, and the car advances exactly one version;
- a **retry** of the marking writes no second sale row, no second version, no second `car.sold`;
- **correcting the price** while still Sold keeps `prior_state_id`, and is `car.updated` — not a
  second sale;
- leaving Sold **deletes** the sale row, returns the car to Landed, leaves its secondary states
  untouched, and writes `car.unsold`;
- a retry of the un-marking moves nothing.

Also run: `db:migrate` applied `0021` against the live store, and `db:seed` re-ran clean (the seed
now names the sold car's prior state explicitly instead of relying on the backfill).

## Not verified

- **The office pages in a browser.** The edit / mark-sold / un-mark flows need a signed-in Clerk
  session; the browser check is the demonstration step, not this task's gate. The unit tests and the
  store witness cover the rules and the statement; the wiring from the form through the action to
  the store has not been driven through a real browser.
- **A rebuild from nothing** (`drop → migrate → seed`) — the migration was applied *forward* to the
  live store and the seed re-run against it, which is the same code path but not a cold rebuild.
