# TASK-002 — Business logic (Layer 2)

**Registry entry:** **TASK-002 — Business logic (Layer 2)** in `openspec/tasks-registry.md`. It is tasks **5.1–5.6** of the architecture's own list (`openspec/changes/truespec-architecture/tasks.md`).

**Form (owner ruling 2026-10-08):** this is a plan for the Builder, not an instruction. It states what must be true and the process to follow. Completion is judged against the requirements and the benchmarks, not against whether a verb was obeyed.

---

## Why

Layer 2 is the set of rules the whole product rests on: which section a car belongs to, how many cars there are, what a car cost and what it earns, what a car is called, and what "sold" means. The product's promise is that each of these is decided **once**, and every screen — showroom, home page, office — reads the same answer. That is what makes it impossible for two screens to disagree.

Today they are not the product's rules. The UI layer needed numbers to draw, so each screen produced its own: the office dashboard counts cars from its own hardcoded list, the car form does its own money arithmetic at one fixed rate, and Settings still offers a single global dollar rate. Two correct modules were written (`lib/money.ts`, `lib/counts.ts`) and **no screen uses their arithmetic**. So the same question currently has more than one answer, and which answer you get depends on which screen you ask.

This task makes each rule exist once, as the only implementation, and gives every screen that one answer.

## Where the layer stands today (grounded 2026-10-12)

**Already built, correct, and unused by the screens:**
- `lib/money.ts` — integer kobo, a rate on each dollar line (void: the owner removed the rate on 2026-10-12 — see the conflict log), one rounding point, completeness. The screens import only its naira formatter; nothing uses its cost/profit arithmetic.
- `lib/counts.ts` — the counting rule. Only the public read path reads it.
- `lib/serialize.ts` + `lib/public-cars.ts` — the public allow-list and the only public read path. (The registry lists this boundary under this layer; it is built.)
- The schema carries the shapes: `car_state.section` (checked to the three fixed sections), `car_state.is_new_arrival`, `cost_line.rate_minor` with the "$ needs a rate / ₦ forbids a rate" checks (the column is void under the owner's 2026-10-12 rate removal), `car.state_id` (`ON DELETE RESTRICT`), `sale`, and `car.ref` defaulted from `ts_ref_seq`.
- `car.ref` is already assigned by the database (default from `ts_ref_seq`) and deletion is soft (`deleted_at`), so "given once, never reused" is partly true in storage already — this layer must not override a code or free one. The two datasets use different refs: the office demo rows are `TS-1001…1015` in `office_car`, and the public car seed is separate.
- The binding specs live in `openspec/changes/truespec-architecture/specs/` (`openspec/specs/` is still empty — the change has not been synced or archived).

**Built, but bypassing the rules:**
- `lib/office.ts` — the office read layer. It counts with its own hardcoded sets (`AVAILABLE_STATES`, `ON_ORDER_STATES`) and does its own money arithmetic, over a **separate demo table `office_car`** that holds one `landed_cost_kobo` per car instead of six cost lines.
- `app/office/(shell)/car/car-client.tsx` — its own live costing at a constant `RATE = 1000`, and it labels the figure "Landed cost" whatever the car's state.
- `app/office/(shell)/settings/settings-client.tsx` — still offers a global "Dollar rate" ("Landed cost = dollar costs × this rate + naira costs").
- The office dashboard (`app/office/(shell)/page.tsx`) — figures computed outside the shared rule.

**Not built at all:** any write path whatsoever — no server actions, no route handlers; the car form's Save is a demo toast and the car page always edits one fixed demo car over `office_car`, so nothing persists. Also not built: any application-level assignment of `TS-####` codes, any logic for un-marking a sold car, and any test runner (no test script; the Playwright probes in `developer-workspace/scripts/` are ad-hoc, not a suite).

## What must be true

1. **One answer to which section a car is in.** Every owner state maps to exactly one of the three fixed sections; the mapping is the only thing the showroom reads, so a buyer sees section names and never an owner state label. A state that maps to no section, or could be read as two, cannot exist.
2. **One answer to how many cars.** One shared rule — Available = the available group + landed-this-year cars, counted once, with the "of which N new arrivals" note; On Order = the on-order group; sold outside the stock total — is the only source of counts for the showroom, the home page and the office. No second count exists anywhere.
3. **One answer to what a car cost and earns.** One formula: the six cost lines added up. Every amount is naira — a cost paid in dollars is entered as its naira amount — so the sum is exact and nothing is converted. The figure is named by the car's state — "Estimated total cost" until it lands, "Landed cost" once landed, "Total cost" once sold — and profit is "projected" until sold, "real" after. A car that has not landed never shows a "landed cost". A loss shows as a negative figure, uncorrected. A missing value and a genuine zero are different things. A car with incomplete costs still counts in money tied up, and is left out of profit with a plain "still building" line that names how many cars and why; every money total says which cars it counted.
4. **One answer to whether a cost line may be saved.** A malformed amount cannot be saved, and the error shows at the field as it is typed, never after. Changing any cost or the price recomputes total cost and profit everywhere they are shown — nothing is frozen at entry.
5. **One answer to what a car is called.** Every car gets its `TS-####` once, on creation; it is never chosen by hand, never edited, and never given to a later car after a deletion. Taps, enquiries and activity join to a car by this code, so it outlives the car row.
6. **One answer to whether a car is sold.** Sold is a flag with a sale price and date — never a state. Marking it removes the car from the showroom, puts it in Sold/Archive, and moves its profit from projected to real. Un-marking reverses or voids the sale record, so no stale real-profit residue is left.

## Constraints — what must not happen

- **One implementation, or none.** After this layer, a second implementation of counting, of total cost, of the section mapping, or of the sold rule is a defect, not an alternative. The screens that compute their own numbers now are the ones that must stop.
- **The requirement beats the screen.** Where a built screen and a binding requirement disagree — the invented dollar rate (no rate exists now, owner ruling 2026-10-12); "Landed cost" on a car that has not landed — the requirement decides and the conflict is logged, never quietly reconciled.
- **Buyers never see inside.** No state label, cost, total or profit in any public response; the allow-list in `lib/serialize.ts` stays the only public read path.
- **The three sections are fixed.** No owner action can add, rename, or remove a section, whatever states they configure.
- **Nothing is invented here.** This layer implements what the specs and the owner's rulings already decide; a genuinely unstated rule is raised, not chosen.
- **This layer is not the data model.** Where a stored shape cannot express a rule, naming it is this layer's job; changing the storage belongs to the data model layer.

## The entities this layer names (so the data model layer has them)

`car` (a `TS-####`, a state, a sold flag via `sale`) · `cost_line` (the six fixed kinds, all in naira; no rate anywhere) · `car_state` (label, one section, new-arrival flag; editable, deletable only while free) · `enquiry` · `enquiry_state` (editable; every state equal — nothing "closes") · `tap` (page, car ref, time only) · `activity_event` · `setting` (no rate key; the full-tank default is a prefill only) · `office_user`.

Also named, and currently missing from storage: a **colour** per car state and per enquiry state (the state editors carry one), and the two registries' `sort` ordering the editors already imply.

## Process — how to work it

- Work from the specs, not from the screens. Where a screen already produces a number, the question is not "is this number right?" but "which rule produced it, and does that rule exist exactly once?"
- Put the rules in place as the single implementations first; then every read point uses them.
- Where a screen and a requirement disagree, log the conflict (screen, requirement, which side won) — do not reconcile it silently.
- The figures the office screens already display are the acceptance witness: the office read points must **run on** the shared rule — through a thin adapter over their current table, with the stored data untouched — and the figures they show must come out the same. If they cannot, find out whether the rule or the data is wrong; do not bend the rule to match the screen, and do not re-write the arithmetic inside the adapter (that would make the adapter a second implementation).

## Benchmarks — after this, when…

1. …the owner adds a state in Settings and maps it to a section, cars in it appear in that showroom section, and the state's name appears nowhere a buyer can see. — *Read half witnessed here (the mapping and the no-leak). The adding of a state is a write: TASK-003 storage, TASK-004 write.*
2. …a car is on order with all six costs entered, the figure beside it reads "Estimated total cost", never "Landed cost"; the same car once landed reads "Landed cost". — *Witnessed here.*
3. …the owner compares Available on the home page, the inventory page and the office dashboard at one moment, the three numbers come from the one rule and are equal wherever they read the same data, and the "of which N new arrivals" note explains any car that sits in two sections. (Where the office reads its own table, a difference is a data difference — named in the conflict log and TASK-003's to settle — never a second rule.) — *Witnessed here.*
4. …the owner types something that is not a number into a cost field and saves, the save is blocked at that field with the error visible before submitting. — *The predicate is witnessed here by tests; the block is built but was not exercised (nothing typed or clicked). Exercising it travels with the driven form.*
5. …the owner changes a cost on an already-landed car, its total cost and profit change on every screen that shows them. — *Witness belongs to TASK-004 (no write path in this layer).*
6. …three cars are missing costs, the dashboard's money tied up still includes them, and the profit total names how many cars it counted and carries "still building" for the rest. — *Witnessed here.*
7. …a car is created, it receives the next `TS-####` once; editing the car never changes the code; a code from a deleted car is never handed out again. — *The rule is witnessed here by tests; the assignment on creation is a write, so the end-to-end witness belongs to TASK-004.*
8. …a car is marked sold with a price, it leaves the showroom, appears in Sold/Archive and counts under real profit; un-marking returns it to its section and to projected profit, with no leftover real profit. — *The read side is witnessed here; the mark and un-mark are writes, so the end-to-end witness belongs to TASK-004.*
9. …any public response is inspected, it holds no cost, total, profit, or state label. — *Witnessed here.*

**Benchmark closure (2026-10-13).** These nine were written before the layer was grounded — and the grounding found that **no write path exists at all** (no server actions, no route handlers; the car form's Save is a demo toast), while the round-2 decision then placed the write flows in **TASK-004** (§Technical decisions, item 7). So four of the nine cannot be witnessed in this layer, and two more only in part — not because a rule is missing, but because nothing can be saved yet. The closing gate has therefore **tagged each benchmark with the layer that can witness it**. The benchmarks themselves are unchanged; only the layer that witnesses them is named. The write-dependent witnesses — benchmarks 4 (exercise the save block), 5, 7 and 8, and the write half of 1 — are carried onto TASK-004's registry entry so they are not lost. Nothing in this is a lowered bar: the behaviours that cannot be witnessed here are named as unverified, not claimed.

## Conflicts found while grounding (logged; the requirement decides)

1. **A global dollar rate is built and forbidden.** Settings offers a "Dollar rate" (hint: "Landed cost = dollar costs × this rate + naira costs"); the car form applies a constant `₦1,000 / $1` to the sum of all dollar lines. `specs/money` and R3 voided exactly this, and the owner has since gone further. The requirement decides — the global rate goes, and with it every rate. (The full-tank default stays; it is a documented setting, a prefill only.)
   **Checked 2026-10-12 (owner asked):** the car form (add/edit) has **no rate box at all** — one fixed number, `₦1,000 / $1`, is shown read-only and applied to every dollar line; the reference `office-car.html` does the same (`const RATE=1000; /* from Settings */`). So today the rate is per system, not per car and not per cost. **Where it came from:** the rate is **not in the source spec** — `demo_product.pdf` mentions no rate anywhere (its cost list is purchase · USA trucking · shipping · clearing · Nigeria trucking · full tank · landed cost · profit; its Settings page is WhatsApp number, tagline, full-tank default only). It was invented by the prototype screens (`test-truespec-v2`: `const RATE=1000; /* from Settings */`, a Settings "Dollar rate", "FX rate set to ₦1,000 per $1"). **Owner ruling 2026-10-12: the rate goes entirely** — the price to customers is in naira, and no rate is typed, stored, or applied anywhere. **Also 2026-10-12:** though some purchases are made in dollars, the owner ruled that **everything is entered and kept in naira** — a cost paid in dollars is entered as its naira amount — so no currency is stored on a cost line and nothing is converted. The rate is void; every amount is naira.
2. **The office reads its own table.** The office screens read `office_car` (one `landed_cost_kobo` per car); the showroom reads `car` + `cost_line` + `car_state.section`. While both exist there are two datasets, so "the office and the showroom agree" cannot hold. Naming this is this layer's job; reconciling the storage is the data model layer's (TASK-003) — flagged to the owner, not silently merged. **Owner, 2026-10-12:** the office demo table is **not** throwaway — the office data is real and stays as it is; the data model layer (TASK-003) will decide its shape when it is built. This layer leaves the stored data alone.
3. **"Landed cost" on cars that have not landed.** The car form and the inventory label the figure "Landed cost" regardless of state, which `specs/money` forbids. **Owner confirmed 2026-10-12.**

## Evidence left behind

- The rules as the single implementations, and the list of read points now using them.
- The conflict log: each screen-vs-requirement disagreement and which side won.
- The reconciliation: the figures the office screens already show, now produced by the one shared rule through the adapter — the same numbers, from the one implementation.

## Scope decisions (owner, 2026-10-12 — round 1)

Boundaries, not preferences. They settle what this layer covers.

1. **The office runs on the shared rule, through an adapter.** The office read points must actually call the one shared rule, fed by a thin adapter over their current data (`office_car`), with the stored data untouched. "One answer" means one implementation, invoked by every read point, even where a read point is fed by a different table. Constraints: the adapter feeds the rule and holds no arithmetic of its own; where the stored shape cannot express what the rule needs, that gap is named for TASK-003, never faked in the adapter.
2. **No storage work at all.** No schema change, no migration, no touching `office_car`, `car`, `cost_line`, `car_state`, `sale`, or `setting`. Anything the current shapes cannot express is named for TASK-003, not changed here.
3. **Missing storage stays missing, and is named.** A colour per car state and per enquiry state, and the two registries' `sort` ordering, are recorded as missing and implemented nowhere here. The `office_car` ↔ `car` reconciliation stays TASK-003's.
4. **All six rules are in scope, and nothing is split off.** Section mapping, counting, the cost/profit formula with naming by state, cost-line validation, `TS-####`, and the sold flag with un-selling — one layer, one answer.
5. **The rate goes, finally.** Every rate is removed, including the Settings "Dollar rate" and the car form's `RATE = 1000`; every amount is naira, entered as naira, nothing converted. The full-tank default stays as a prefill only.
6. **Where the work lives.** The developer does everything in its own workspace — the plan at `developer-workspace/plans/TASK-002-plan.md`, with its own `briefs/`, `notes/`, `reports/` — and **puts a copy of the finished report in this folder** (`openspec/tasks/TASK-002/`), where the architect reads it at the closing gate. That report copy is the only thing this layer writes under `openspec/`.

## Technical decisions (round 2, 2026-10-12)

7. **The write path is not this layer's.** The rules are delivered as the single decision logic — pure modules for reference-code assignment, the sale-flag transition, and the cost-line validation predicate — plus the rewiring of every read point that exists today. The database write flows (server actions, SQL) are TASK-004. Building a write path now would mean inventing storage that TASK-003 owns. Note: "on save" in this layer means the form's submit gate (the predicate), not a database write — the car form's Save is a demo toast today, and the gate is what requirement 4 is about.
8. **"Agree" means one rule, invoked by all three** — not literal equality across two tables. The acceptance witness is the office's currently-displayed figures, reproduced by the shared rule over `office_car`. Literal cross-table equality is TASK-003's to give, when the data is unified.
9. **One section module.** A single module (e.g. `lib/sections.ts`) is the only place that names, validates and resolves the three sections and the state→section mapping; the per-component section maps are removed, and no local section map remains.
10. **Every count read point calls the one counting rule** — home, inventory, the layout ticker, and the office dashboard — including the "of which N new arrivals" note. No local counting remains anywhere.
11. **The office adapter is real and temporary.** It maps an office row into the shared rules' input shape (its single landed cost standing in for the six-line total) and calls the shared modules, so the office figures are rule-derived now. It carries no arithmetic of its own, it is documented as the seam TASK-003 replaces, and any gap the office shape cannot express is named for TASK-003 rather than faked.
12. **A minimal test runner is allowed.** `node:test` driven by the already-present `tsx`, with a `test` script in the app — unit tests for the pure rule modules (money, counts, sections, sold, reference codes), and the existing Playwright probes kept for screen-level checks. No new framework. The test files live with the modules they cover; working notes stay in the developer workspace.
