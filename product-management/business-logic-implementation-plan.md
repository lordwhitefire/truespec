# Business Logic Implementation Plan — TrueSpec

**Status: DRAFT — written 2026-10-08. Awaiting the owner's "go" before any implementation.**
This is implementation plan **#2 of six** (planning-close.md §"What happens when the screens are ready").
It covers **schema boundaries, money, counting, state machines, visibility, reference codes** —
checked against the real screens in `/home/lordwhitefire/current-project/test-truespec-v2`.

---

## 0. What this plan obeys

- `product-overview.md` — the product promise (two halves never meet; the rule).
- `truespec-product-design.md` — the data model + settled money rules (kobo/cents, the three totals).
- `system-model.md` — settled items 8, 30, 45–49, 82, 85; the build order (UI → **business logic** → functionality → UX).
- `planning-close.md` — C-series rulings already made (C1 session, C2 abuse, **C3 visibility gate**, **C4 "still building"**).
- The screens themselves — verified today (fields below are what the screens actually carry, not what a plan imagines).

**Deferred to other plans (not this layer):** auth/sessions, PDF upload, WhatsApp tap flood control → functionality (#3); column types/indexes → data model (#5); dialogs/undo/offline → UX (#4).

---

## 1. What the screens actually carry (grounding, verified 2026-10-08)

| Screen | Confirmed facts |
|---|---|
| `car.html`, `inventory.html`, `truespec.html` | Public faces: brand, model, trim, year, exterior/interior, mileage, price, features, photos, status-section. **No cost fields present** — the whitelist already holds on the surface |
| `office-car.html` | The six cost lines, exactly: **Purchase price ($) · Shipping ($) · Clearing ($) · Trucking within USA ($) · Trucking in Nigeria (₦) · Full tank (₦)** — matches the product model and the Sienna reconciliation |
| `office-inventory.html` | Car statuses in use: **av, ld, ow, pt, sold** (available / landed / on-way / port / sold) · 15 car rows · per-row price + landed + profit |
| `office-enquiries.html` | Enquiry states: **New, Talking, Negotiating, Sold, Lost** — five columns |
| `office-settings.html` | A **rate** field ("dollar costs × this rate + naira…"), WhatsApp/tagline/password — scans as a single global rate. **Superseded by the 2026-10-08 ruling (R3)** — there is no one rate; that field dies. The screen change is the UI plan's to make; this plan records the cause |
| `office-dashboard.html` | Static cards today: money tied up, projected profit, real profit, new arrivals, available, on order, taps, activity |

---

## 2. Schema — the entities business logic thinks in (storage detail → data model plan)

| Entity | Business fields the logic needs | Notes |
|---|---|---|
| **car** | id (`TS-####`), brand, model, trim, year, colours, mileage, features, photos, doorstep price, **state_id**, sold flag + sale price + sale date, created_at | sold is a **flag, not a state**, so un-marking reverses cleanly (system 30) |
| **cost_line** | car_id, kind (the six fixed kinds), amount, currency (`₦`/`$`), **rate (per $ line — the rate that amount was made at)** | one-to-many; the six kinds are fixed by the form; **no global rate exists anywhere** |
| **enquiry** | id, car_ref, customer name, number, notes, **enquiry_state_id**, created_at | car may be referenced by ref even after delete (record stays) |
| **tap** | id, page (car page / general), car_ref, at | raw feed for counts; never mutated |
| **activity_event** | id, kind, subject, at, by | what the dashboard "Recent activity" shows |
| **car_state** | id, label, **section** (available / on order / landed), is_new_arrival | editable registry; fixed three sections |
| **enquiry_state** | id, label, is_closed | editable registry seeded with the five on the screen |
| **setting** | key, value | keys: `whatsapp_number`, `tagline`, `full_tank_default` (prefill only), `last_backup_at`; **password is not a setting** — it lives hashed on `office_user`; **no rate key exists** (R3: the settings rate field is void, only listed above to mark its cause — the screen change is the UI plan's) |
| **office_user** | email, password hash, session | one user; no signup (system 85); first-run creation (system 84) |

**Every monetary field is stored as an integer (kobo / cents), never a float — naira only at the edges (settled 45–46).**

---

## 3. Money — the rules that must never be re-derived per screen

1. **The car's total cost** = (Σ of the four $ lines × **that line's own rate**) + (Σ of the two ₦ lines) — one formula, used whatever the state (owner ruling 2026-10-08).
   - **There is no single/global rate** (owner ruling R3): every dollar amount carries the rate it was made at — a car bought at $2,400 carries the rate that $2,400 price was set with. One car may have a different rate per line; that is allowed.
   - **Price and rates can be changed later.** Changing either one recomputes the total cost and profit everywhere — nothing is frozen at entry.
   - **The figure's name follows the car's state — a car on order has *no* "landed cost", because it hasn't landed:**
     - On order / at port / cleared → **Estimated total cost** (cost committed so far; more lines still to come in)
     - Landed → **Landed cost** (all six lines should now be in)
     - Sold → **Total cost** (final)
   - **Profit is labelled the same way:** *projected* until the car is sold, *real* once sold.
2. **Six cost kinds are fixed** by the form. A car is "cost complete" only when all six have a value.
3. **Profit (projected)** = doorstep price − total cost. Shown live **while typing** (product 99).
4. **Profit (real)** = sale price − total cost, for sold cars.
5. **A cost line with an amount but no rate** is invalid on save — caught inline, not after (system 51, product inline validation). **Zero vs not-entered are different**: not-entered = incomplete; a genuine zero stays zero (system 50).
6. **Negative profit is allowed** — the number may go below ₦0 (system 52); it signals a bad buy, not an error.
7. **Rounding happens in exactly one place** (system 53): the totals function; nowhere else.
8. **Zero default counts**: a car with no costs contributes ₦0 to money tied up, and is excluded from profit with the "still building" line (settled 48–49, C4).

---

## 4. Counting — one rule, one function, three read points

One function, `counts()`/`totals()`, is the **only** place totals are computed. Home, showroom inventory, and office dashboard each **call it** — never recompute (system 15–18; that is what guarantees the numbers can never disagree, and it is exactly where the test-truespec-v2 screens currently diverge).

| Total | Rule |
|---|---|
| **Available** | cars in the available group **+** cars in the landed group (contains, never adds twice) |
| **On Order** | cars in the on-order group |
| **New arrivals (Landed)** | cars flagged as new arrivals — **group membership, no date logic** (settled 82) |
| **Money tied up** | Σ of whatever cost lines are entered (spent money counts even if paperwork incomplete) |
| **Projected profit** | Σ(price − total cost) over **cost-complete, non-sold** cars |
| **Real profit** | Σ(sale price − total cost) over sold cars |
| **Still building** | count of cost-incomplete cars + the line "…still building: costs not complete" (never "excluded", settled C4) |
| **Sold** | sold cars sit outside the stock total, never inside |

**Acceptance for this section:** the totals recompute from the car rows and exactly match the figures the office screens already display (the 15-row list, dashboard cards). If they don't, the screens change, not the rule. **Every number on every screen carries the state-appropriate label** — "estimated total cost" on on-order/at-port cars, "landed cost" only on landed cars, "projected/real" on profit the same way. "Landed cost" never appears next to a car that has not landed.

---

## 5. State machines

**Car states (editable registry, fixed sections).** The three showroom sections are fixed and never renamed (product). Each owner-created state maps to exactly one section. Screens today: av, ld, ow, pt, sold — of which **sold is the flag**, not a list entry.

- Marking **Sold** is one action: set flag + sale price. It vanishes from the showroom, stays in Archive, still counts under real profit and money tied up.
- **Un-marking sold** must reverse or void the sale record, or the two profits stay wrong (system 30).
- A state that still has cars cannot be deleted (system 40); renaming applies everywhere at once.
- Every car is always in exactly one state; there is no "no state".

**Enquiry states (editable registry seeded with the five on the screen).** New, Talking, Negotiating, Sold, Lost.

- **All five are just states** (owner ruling R1) — there is **no open/closed grouping and no state triggers an action** like "sold closes things". A state is a sticker, nothing more.
- Badges, filters and dashboard counts read **per state** (New: n, Talking: n, …) — never an "open vs closed" pair.
- The owner can **add more enquiry states** too (R2); seeding is a starting point, not a cage.
- Deleting a state is blocked while any enquiry sits in it (system 40b).
- **Car Sold and enquiry Sold are independent** — marking a customer Sold never moves the car (product 154; system 40b).

**Acceptance:** moving one enquiry through the columns updates every badge and count that reads it. Renaming a state updates every screen that shows it.

---

## 6. Visibility and the public whitelist

1. **The public whitelist is one function**, not a per-page list (system 13–14, 23): brand, model, trim, year, colours, mileage, price, photos, features, section. **Cost fields, notes, rates, sale price are never in the same object** — not hidden, absent (product).
2. **The gate (settled C3):** a car appears publicly **iff it has a price and ≥1 photo**. Otherwise it is office-only — the draft the owner is working on.
   - **This closes B1**: the public can *never* see a blank price, because a priced car is the only kind that's public. "Price on request" exists only inside the office for drafts.
3. **Sold cars**: not in the showroom at all; present in Archive and totals.
4. **Deleted cars** follow the Undo window (logic holds the tombstone until undo expires — the timing itself belongs to UX, the retention rule is logic).
5. **Reference codes (`TS-####`)**: assigned once on creation, never edited, never reused (system 41). They are the join key between a tap, an enquiry, and the car — so they outlive the car row.

**Acceptance:** no public page, payload included, ever contains a cost, rate, or note — checked on the live URL before handover (system 104).

---

## 7. Owner rulings (2026-10-08) — locked in, no open business-rules left

| # | Ruling | Effect on this plan |
|---|---|---|
| R1 | Enquiry states are **just states** — no open/closed, nothing "closes" on Sold | Section 5: counts per state only; no open-enquiries concept |
| R2 | The owner can **add more stickers** — on cars **and** on enquiries | Both registries are editable; seeded, never locked |
| R3 | **No one rate for everything.** Every dollar amount carries the rate it was made at; prices and rates are changeable later | Section 3: per-line rate. Section 2: rate lives on the cost line, nowhere else. The settings rate field is void (note passed to UI plan) |

---

## 8. Build order inside this layer

1. `money.js` — kobo math, total cost, state-aware labels, profit, rounding, completeness
2. `totals.js` — the single counts/totals function
3. `states.js` — car + enquiry registries, sold flag semantics
4. `visibility.js` — whitelist, gate, sold/archive filtering
5. `codes.js` — reference code assignment
6. Bind each into the screens (office dashboard + inventory + car form first, then showroom read paths)

**Done means:** every screen currently hardcoding a number now calls the shared function; the numbers agree; a change in the office shows up in the showroom immediately (product 19).

---

*Companion docs: `planning-close.md` (register), `system-model.md` (the checks), `product-overview.md` (the promise). Test-truespec-v2 screens are the input; nothing in this file touches UI/UX files.*