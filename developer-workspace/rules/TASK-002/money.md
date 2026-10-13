# Rules — money (`R-MON`)

What a car cost and what it earns. A **JS rule** set. All amounts are naira; nothing is
converted. This is the highest-risk set — it removes the rate and collapses every figure onto
one formula.

Source: `specs/money/spec.md` (all six requirements); `specs/dashboard/spec.md` §"Every money
figure states its reach", §"Incomplete costs are explained, never hidden";
`specs/inventory/spec.md` §"One form for adding and editing a car";
`openspec/tasks/TASK-002/task.md` requirement 4.

---

### R-MON-1 — Six fixed cost kinds, all naira   [JS rule]

- **Rule:** There are exactly six cost kinds — purchase price, shipping, clearing, trucking
  within USA, trucking in Nigeria, full tank — and each is an amount in naira. No other cost
  kind exists.
- **Kind:** JS rule.
- **Source:** `specs/money` §"Six fixed cost kinds".
- **Obeys when:** a car has at most those six cost lines; the form offers exactly those six.
- **Forces:** the cost-kind set in `lib/money.ts`; the car form's cost fields; the office
  adapter's reading of the one stored cost.
- **Check:** `money.test.ts` — the kind set is exactly six. Search: no seventh cost kind.

---

### R-MON-2 — "Cost complete" means all six entered; zero is entered, missing is not   [JS rule]

- **Rule:** A car is cost-complete only when all six kinds have values. An entered `0` is a
  value — the car stays complete — while a missing value leaves it incomplete. Zero and
  not-entered are different things.
- **Kind:** JS rule.
- **Source:** `specs/money` §"Six fixed cost kinds" + scenario §"A genuine zero".
- **Obeys when:** entering `0` in a cost field keeps the car complete; clearing the field makes
  it incomplete again.
- **Forces:** `isCostComplete` in `lib/money.ts`; every place that decides whether a car's
  costs are complete.
- **Check:** `money.test.ts` — six values incl. zeros ⇒ complete; one missing (incl. `null`
  vs `0`) ⇒ incomplete.

---

### R-MON-3 — No exchange rate exists; every amount is naira   [JS rule]

- **Rule:** No exchange rate is stored or applied anywhere — not on a cost line, not on a car,
  not in Settings. Every amount is naira, entered as the naira paid; a cost paid in dollars is
  entered as its naira amount. No rate field, setting key, column or constant appears anywhere.
- **Kind:** JS rule.
- **Source:** `specs/money` §"No exchange rate exists — every amount is naira" (owner ruling
  2026-10-12); `specs/office-settings` §"The settings that exist".
- **Obeys when:** the car form has no rate input and shows no rate; Settings has no rate field;
  no `rate` key/column/constant remains; every displayed amount is naira.
- **Forces:** `lib/money.ts` carries no currency/rate; the car form and Settings carry none;
  the stored `rate_minor`/`currency` columns are void (left in place — TASK-003 removes them).
- **Check:** `money.test.ts` — no rate in the money API. Repo search for `rate` (testing.md
  §1.4): none, except the void columns named for TASK-003 and the removed-setting history.

---

### R-MON-4 — Total cost is the exact sum of the six lines, by one function, recomputed everywhere   [JS rule]

- **Rule:** `totalCost = Σ of the six cost lines` — all naira, so the sum is exact — computed by
  a single function used at every read point. Changing any cost or the price recomputes total
  cost and profit everywhere; nothing is frozen at entry.
- **Kind:** JS rule.
- **Source:** `specs/money` §"One total-cost formula, recomputed everywhere"; scenario §"Owner
  corrects an old cost".
- **Obeys when:** the form, the inventory list and the dashboard show the same total to the
  kobo for the same car, and editing a cost on a landed car updates all three.
- **Forces:** `totalCostKobo` in `lib/money.ts` — the only place the six lines are summed; every
  read point calls it.
- **Check:** `money.test.ts` — the total equals the exact sum, incl. zeros. Search: a second
  total-cost computation must not exist (testing.md §1.2).

---

### R-MON-5 — Integer kobo, one totals function, formatting at the display edge   [JS rule]

- **Rule:** All money is stored and combined as integer kobo — never floats, never scaled
  numerics. A single totals function is the only place money is combined; naira formatting
  happens only at the display edge.
- **Kind:** JS rule.
- **Source:** `specs/money` §"Integer money, one totals function".
- **Obeys when:** no float arithmetic touches money; the same car's figure is identical to the
  kobo on every screen; formatting is a pure view concern.
- **Forces:** `lib/money.ts` integer arithmetic + `formatNaira`; no screen re-derives a figure.
- **Check:** `money.test.ts` — inputs/ outputs are integer kobo, no rounding drift. Search: no
  float division over money; formatting not used outside the display edge.

---

### R-MON-6 — Profit is projected before sale and real after; a loss is shown as it is   [JS rule]

- **Rule:** Projected profit = `doorstep price − total cost` for unsold cars; real profit =
  `sale price − total cost` for sold cars. Negative profit is displayed without correction —
  no warning, clamp or suppression.
- **Note (owner, 2026-10-12):** the `doorstep price` is the car's **single selling price** — what
  the buyer pays, on the car, regardless of state (`R-MON-11`). Only the cost side is
  state-related (`R-MON-7`).
- **Kind:** JS rule.
- **Source:** `specs/money` §"Profit, labelled by what is known"; scenario §"A loss-making car";
  `specs/inventory` §"One form…" (the form's live figure is "estimated" until the car lands —
  the same projected figure, named as not-yet-real).
- **Obeys when:** an unsold car shows projected profit; a sold car shows real profit; a car whose
  price is below its total cost shows a negative figure with no warning.
- **Forces:** `profitKobo({ totalCostKobo, priceKobo, salePriceKobo })` in `lib/money.ts`, and
  its basis (projected / real / none).
- **Check:** `money.test.ts` — projected for unsold, real for sold, exact negative for a loss.

---

### R-MON-7 — The **cost** figure is tied to the state (office side)   [JS rule]

- **Rule:** The **cost** figure — the money the owner spent — is named by the car's state:
  "Estimated total cost" while on order / at port / cleared, "Landed cost" once landed, "Total
  cost" once sold. A car that has not landed never shows "Landed cost". Cost is an
  **office-only** figure; it never reaches the showroom (`R-MON-12`).
- **Kind:** JS rule (decides the label; the rendering is not this layer).
- **Source:** `specs/money` §"Profit, labelled by what is known"; scenario §"On-order car has no
  landed cost"; owner ruling 2026-10-12 — **in the office, the cost is tied to the state; the
  price is not**.
- **Obeys when:** an on-order car with all six costs reads "Estimated total cost", never "Landed
  cost"; a landed car reads "Landed cost"; a sold car reads "Total cost".
- **Forces:** `costLabelFor(state, sold)` in `lib/money.ts`; the car form and the office
  inventory show its result, never a fixed label. The **price is not part of this** — see
  `R-MON-11`.
- **Check:** `money.test.ts` — the label follows the state; no "Landed cost" before landed.
  Live: an on-order car reads "Estimated total cost" (Task 21 probe).
- **Settled (owner, 2026-10-12):** cost is attached to the **state** — a state is just a label,
  so "how much I spent when the car was at the port", "how much I spent to land it" — because the
  cost is the owner's spend at that stage. The earlier open question (what a car in the Available
  section is named) is therefore answered **by the state, not the section**: a state that means
  landed reads "Landed cost"; any earlier state reads "Estimated total cost".

---

### R-MON-8 — Incomplete costs are explained, never hidden   [JS rule]

- **Rule:** Cars with incomplete costs contribute their entered costs to money-tied-up (the
  money was genuinely spent) but are left out of profit totals, which carry a plain "still
  building" line naming how many cars are out and why. They are never silently dropped and
  never counted as zero profit.
- **Kind:** JS rule.
- **Source:** `specs/money` §"Incomplete costs never silently distort totals"; scenario §
  "Dashboard with three incomplete cars"; `specs/dashboard` §"Incomplete costs are explained,
  never hidden".
- **Obeys when:** with 3 of 12 cars missing costs, money tied up still includes them and the
  profit total reads as coming from the complete cars with a "still building" note naming the 3.
- **Forces:** the incomplete-cost handling in `lib/overview.ts` + `lib/money.ts`; the dashboard
  keeps its shape and adds the line.
- **Check:** `overview.test.ts` — money tied up includes the incomplete cars; profit names its
  reach and names the excluded count with "still building".

---

### R-MON-9 — Every money total states its reach   [JS rule]

- **Rule:** Each money total says which cars it counted — e.g. "projected profit from 9 of 14
  cars" — and names what is left out. No total silently drops cars or quietly includes
  unfinished ones.
- **Kind:** JS rule.
- **Source:** `specs/dashboard` §"Every money figure states its reach".
- **Obeys when:** the projected-profit figure carries an explicit "from N of M cars" reach line
  and any exclusion is named in words.
- **Forces:** the reach computed in `lib/overview.ts` alongside each total; the dashboard renders
  it.
- **Check:** `overview.test.ts` — a total exposes its `(counted, of)` reach and its exclusions.

---

### R-MON-10 — A malformed amount cannot be saved; the error shows at the field   [JS rule]

- **Rule:** A cost amount that is not a valid naira figure cannot be saved; the error appears at
  that field, visible before submitting — never only after. The same predicate decides validity
  at every point it is asked.
- **Kind:** JS rule.
- **Source:** `openspec/tasks/TASK-002/task.md` requirement 4; `testing.md` §5.1.
- **Obeys when:** typing non-numeric text into a cost field blocks the save at that field, with
  the error visible before submitting; a valid amount (incl. `0`) passes.
- **Forces:** `parseCostAmount(raw)` in `lib/money.ts` — the one validation predicate; the car
  form's submit gate calls it and shows the error at the field.
- **Check:** `money.test.ts` — malformed input is rejected, valid input (incl. `0`) accepted.
  Live: a bad amount blocks at its field (Task 21 probe).
- **Note:** "on save" here is the form's submit gate (the predicate), not a database write — the
  write path is TASK-004 (task.md §Technical decisions #7).

---

### R-MON-11 — The selling price belongs to the car, never to a state   [JS rule]

- **Rule:** A car has one **selling price** — the **doorstep price**, what the buyer pays to have
  the car delivered to their door. It is a field on the car and is the same whether the car is on
  order, available, or landed. No state and no section has a price; there is no "landed price" and
  no "available price".
- **Kind:** JS rule.
- **Source:** owner ruling 2026-10-12; `specs/money` §"Profit…" ("doorstep price");
  `specs/showroom` §"Car page carries everything needed to decide".
- **Obeys when:** changing a car's state or section leaves its price unchanged, and the showroom
  shows that one price whatever the state — including a car still on order.
- **Forces:** `priceKobo` on the car is the only price; `lib/money.ts` profit (`R-MON-6`) uses it;
  no state/section record carries a price.
- **Check:** `money.test.ts` — the price is state-independent and profit uses the car's single
  price. Search: no per-state or per-section price field/key.

---

### R-MON-12 — Cost is office-side and tied to the state; the showroom shows only the price   [JS rule]

- **Rule:** Cost — how much the owner spent — is shown only in the **office**, tied to the state
  (how much was spent at that stage). The **showroom carries no cost at all**: a buyer sees only
  the car's selling price.
- **Kind:** JS rule.
- **Source:** owner ruling 2026-10-12; `specs/showroom` §"Cost data never reaches the browser".
- **Obeys when:** no cost, total or profit value appears in any public response, and the office
  inventory shows cost named by state.
- **Forces:** `lib/money.ts`'s cost functions are office-side; `lib/serialize.ts`'s allow-list keeps
  cost out of the public path (`R-SEC-5`).
- **Check:** `money.test.ts` + the public-boundary search — cost is absent from the public payload;
  the office shows cost by state.
- **Named for TASK-003:** the current stored shape has six fixed cost **kinds** and no state on a
  cost line, so "cost attached to a state" cannot be stored as such today. This layer states the
  rule and names the gap; the storage shape is TASK-003's.
