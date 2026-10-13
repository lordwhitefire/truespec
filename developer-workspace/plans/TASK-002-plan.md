# Implementation Plan: TASK-002 — Business logic (Layer 2)

**Source task:** `openspec/tasks/TASK-002/task.md` (registry entry **TASK-002**, architecture tasks 5.1–5.6).
**Verification task:** `openspec/tasks/TASK-002/testing.md` (run by a separate session that did not build this).
**Authoritative specs:** `openspec/changes/truespec-architecture/specs/{money,dashboard,inventory,showroom,office-settings}/spec.md`.
**Rules (this layer's reference):** `developer-workspace/rules/TASK-002/`. **Model:** `developer-workspace/models/TASK-002-model.md`.
**Date:** 2026-10-12. **Layer:** 2 (Business logic). **Task-list target:** this file's Progress tracker + Task List (Developer workspace convention; no `tasks/todo.md` in this project).
**Shared understanding:** confirmed by the owner 2026-10-12. **Method (owner, 2026-10-12):** this is the business layer — there is nothing to *look at*; the rules are the reference. **Create the rules → build the model → do the real build → check.**

> **PORTS — STANDING RULE (owner, 2026-10-13):** build on **`:3210`**, reference on **`:3211`**. **Port `3000` is never used — not for dev, not for leak-check, not for any probe, not mentioned as a target.** Every check in this plan runs against `:3210` (build) and `:3211` (reference). `LEAK_BASE_URL` defaults to `:3210`.
>
> **GATE ORDER (learned 2026-10-13):** `next dev` (`:3210`) and `next build` share `.next`. Running `build` while dev is live clobbers it (`Cannot find module './vendor-chunks/@neondatabase.js'`, 500 on every dynamic route). Run **`leak-check` before `build`**, or restart `next dev` afterward — or give the build its own `distDir`.

---

## Progress tracker

_Updated as work lands. Legend: ⬜ not started · 🟨 in progress · ✅ done+verified · ⛔ blocked._

| # | Task | Status | Notes |
|---|------|--------|-------|
| — | Pre-flight: grilling + shared understanding | ✅ | Owner confirmed 2026-10-12; method confirmed |
| 1 | Test runner: `node:test` over `tsx` | ✅ | `npm test` green; smoke test under `lib/` |
| 2 | Rules & model workspace + rule-form template | ✅ | `rules/TASK-002/README.md`; `models/` created |
| 3 | **Rules — sections + counting** | ✅ | `sections.md` (R-SEC-1…5), `counting.md` (R-CNT-1…5) |
| 4 | **Rules — money** | ✅ | `money.md` (R-MON-1…12; price/cost ruling 2026-10-12 folded in) |
| 5 | **Rules — reference codes + sold** | ✅ | `codes.md` (R-REF-1…4), `sold.md` (R-SLD-1…3) |
| A | **Checkpoint A — the rules exist and are frozen** | ✅ | Written from the specs; owner to read before the model is built |
| 6 | **Build the model from the rules** | ✅ | `models/TASK-002-model.md`; 29/29 rules, each with Rule/Forces/Check + read points |
| B | **Checkpoint B — the model is the authority** | ✅ | Every rule carries its check; read points spot-checked against the live code |
| 7 | Browser-check harness (reuse the old implementation) | ✅ | `scripts/task-002/_lib.mjs` + checklists; attached to Chrome on `:9222`, printed the two tabs, launched nothing (6 → 6) |
| 8 | Real build — `lib/sections.ts` + `lib/counts.ts` + tests | ✅ | 13/13 tests pass; typecheck clean; counts now imports `Section` from `sections.ts` |
| 9 | Real build — `lib/money.ts` naira-only + tests | ✅ | Rewritten naira-only (no `Currency`/rate); 18 money tests pass; leak-check runs |
| 10 | Real build — `lib/refs.ts` + `lib/sale.ts` + tests | ✅ | `formatRef`/`isValidRef` (padded `TS-####`, no setter); `isSold`/`salePriceOf`/`saleTransition`; 13 tests pass |
| 11 | Real build — `lib/overview.ts` + tests | ✅ | `stockOverview` (counts from `counts.ts`, money from `money.ts`); reach + "still building"; 8 tests pass |
| 12 | Real build — public server path | ✅ | `serialize.ts` sources `Section` from `sections.ts` and resolves via `sectionOfState`; query selects `s.label AS state` + `s.section AS configured_section`; `getPublicCounts` reads the one rule. tests/typecheck/build green. ⚠ live leak-check fails on checker false positives (see notes) |
| 13 | Real build — public site: home + inventory | ✅ | home "Available 18 · of which 6 new arrivals"; inventory chips + tab via `countStock`; deleted `components/InventoryTabs.tsx` |
| 14 | Real build — public site: layout, car page, cards | ✅ | `car-view.ts`/`car/[ref]`/`CarCard.tsx` use `sectionLabel`/`tokenOf`; labels read Available/On Order/Landed; no state-label leak |
| 15 | Real build — office adapter (`lib/office.ts`) | ✅ | Temporary, documented; dashboard via `overview.ts`, counts via `counts.ts`; witness matches (see notes) |
| 16 | Real build — office dashboard + inventory | ✅ | Rewired to adapter + shared rules; build green; 3 named divergences (see resume note) |
| 17 | Real build — office car form | ✅ | Six naira inputs, rate/dollar gone, label by state, field validation; build green |
| 18 | Real build — office settings: remove the rate | ✅ | Rate card/state/save gone; section identity from `lib/sections.ts`; tank default stays; build green |
| 19 | Real build — purge the rate everywhere else | ✅ | Seed naira-only (DB 150/150 NGN, 0 rate values); activity FX line gone; leak-check word-boundary + shape tokens, PASSED on :3210 |
| C | **Checkpoint C — the build is complete and runs** | ✅ | Build clean; app runs on `:3210` (reference `:3211`); no rate in the tree |
| 20 | **Check — rule by rule against the model** | ✅ | 29/29 rules PASS; 4 gates green; 16/16 ledger rows; no defect; 3 new divergences logged. `reports/TASK-002-model-check.md` |
| 21 | **Check — browser, surfaces only, cell matrix** | ✅ | 8 screens × 560–1440 wk × dark/light = 56 cells, all 200; build `:3210` vs ref `:3211`; no Chrome launched, no screenshots. 9 intended divergences tied to requirements; 3 data divergences; 3 unintended named (office titles, seed `RX 350 350`, public-filter dims — all outside TASK-002); no owner-state leak. `reports/TASK-002-browser-check.md` |
| 22 | Reconciliation + conflict log | ✅ | `scripts/reconcile.ts` runs the one rule over the 15 office demo rows and prints each figure beside the recorded office witness: **rule reproduces every figure except money tied up** (₦451,040,000 vs old ₦587,040,000 — named DATA divergence, rule wins). 19 conflicts logged, each with its winner. `reports/TASK-002-conflict-log.md`, `reports/TASK-002-reconcile-output.txt` |
| 23 | Public boundary re-check, report, closing copy | ✅ | All 4 gates green (`test` 47/47, `typecheck` clean, `leak-check` PASSED, `build` clean); `reports/TASK-002-report.md` (built / verified / not-verified); rules + model + reports copied byte-identical into `openspec/tasks/TASK-002/` |
| D | **Checkpoint D (final)** — benchmarks met, report written | ⚠️ | Report written; gates green; artifacts left behind. **Cannot tick as written:** 4 of the 9 `task.md` §Benchmarks (#4 save-block, #5 edit-cost recompute, #7 `TS-####` on creation, #8 mark/unmark sold) require the **write paths this plan defers to TASK-004** — raised to the owner, not ticked silently |

---

## Overview

Layer 2 is the set of rules the whole product rests on — which section a car is in, how many there are, what a car cost and earns, what it is called, and whether it is sold. Today each screen produces its own answer: the office counts with hardcoded state sets over a separate table (`office_car`) and does its own money arithmetic; the car form applies a fixed `₦1,000 / $1` rate; Settings still sells a global dollar rate. Two correct modules (`lib/money.ts`, `lib/counts.ts`) exist but **no screen uses their arithmetic**, and no section-mapping module exists at all.

This plan makes each rule exist **once**, as a pure decision module, gives every read point that one answer, and removes the rate entirely (every amount is naira, owner ruling 2026-10-12). The write path (server actions, persistence) belongs to **TASK-004**; this layer delivers the rules and the read-point rewiring, and names the storage it cannot yet express for **TASK-003**.

## Scope settled (owner, 2026-10-12)

- The office read points run on the shared rules through a **thin, documented adapter** over `office_car`; **storage is untouched** — zero schema/migration work.
- All **six** rules in one layer: section mapping, counting, money, cost-line validity, reference codes, the sold flag. Nothing split off.
- The **rate goes entirely**; every amount is naira, entered as naira, never converted. The full-tank default stays (a prefill only).
- **No write path here** — the rules land as pure decision modules (reference codes, sale flag, validation predicate) plus the read-point rewiring; server actions/CRUD are TASK-004.
- **Colour + `sort`** (per car state and enquiry state) and the `office_car`↔`car` reconciliation are **named for TASK-003**, not built.
- Rules are the **reference for this layer**; the browser is used only to check the surfaces (see below).

## How this layer is worked — rules → model → build → check

There is nothing to *look at* in this layer: the rules are invisible. So the authority is **our own written rules**, not a reference rendering. Four steps, in order — nothing is built until the rules exist.

1. **Create the rules.** Write the business logic down explicitly, as rules — not prose, not code. Each rule is a rule of the kind this project works in — **an HTML rule / a CSS rule / a JS rule**; for this layer the logic is JS, so the rules are **JS rules** (the HTML/CSS kinds do not apply — nothing is rendered here). One rule per statement, checkable, so nothing is left to interpretation. Derived **only** from the specs and the owner's rulings; a rule the specs do not decide is **raised**, not chosen.
2. **Build the model.** Turn the rules into the **model** — the authority the build is judged against (the same role the reference-derived model plays in the runtime-divergence skill, except the source here is our rules, not a prototype).
3. **Do the real build.** Implement the single implementations and rewire the read points so the code obeys the rules.
4. **Check.** Walk the build **rule by rule against the model** — not by name, not by screenshot. A difference is a **named divergence**: either the build broke a rule (a defect) or the rule needs the owner.

The `node:test` unit tests are the model-check made **executable**; the searches for a second implementation are the model-check made **mechanical**.

## Rule form (the template, used by Tasks 3–5)

```
### R-<CAP>-<n> — <title>   [JS rule]
- **Rule:** one checkable sentence.
- **Kind:** JS rule (this layer's logic; HTML/CSS rules do not apply — nothing is rendered).
- **Source:** specs/<cap>/spec.md §"<requirement>", or an owner ruling + date.
- **Obeys when:** the observable that proves the rule holds.
- **Forces:** the single implementation, and the read points it constrains.
- **Check:** the unit test name, and/or the search that finds a second implementation.
```

## Architecture decisions

- **The rules are the reference; the model is the authority; the build obeys; the check is rule by rule.** (Owner, 2026-10-12.) The written rules sit in `developer-workspace/rules/TASK-002/`; the model in `developer-workspace/models/TASK-002-model.md`; copies go to `openspec/tasks/TASK-002/` for the checking session.
- **Rules are pure modules; screens only read.** Every rule is a plain function over plain data, unit-tested, with no DB import. Read points call the rule; no screen keeps arithmetic or mapping of its own (testing.md §1).
- **One section definition.** `lib/sections.ts` is the only place the three fixed sections are named, typed and validated; `serialize.ts`, `counts.ts` and every UI label map import from it. UI *tokens* (the `a`/`o`/`l` letters) stay presentation-only but no longer carry a second section identity.
- **Money is per-car and naira-only.** `lib/money.ts` owns the six-line sum, completeness, the one profit formula (`price − total`), the state-named cost label, and the amount-validation predicate. The DB's `currency`/`rate_minor` columns become **void** (left in place; TASK-003 decides their removal).
- **The aggregate is one rule too.** `lib/overview.ts` combines counting + money into the dashboard/stock overview (reach lines, "still building").
- **The office adapter is explicit and temporary.** `lib/office.ts` maps an `office_car` row into the shared rules' inputs — its single `landed_cost_kobo` is the car's total cost, its completeness is `landed_cost_kobo IS NOT NULL`; commented as the seam TASK-003 replaces.
- **The browser checks surfaces only** — via the old implementation (runtime-divergence; one persistent visible Chrome over CDP; per-screen probes; **no screenshots**; owner checks the look by hand); it is **not** the authority for the rules.
- **The requirement beats the screen.** Where a built screen and a requirement disagree, the requirement decides and the disagreement is written to a conflict log — never reconciled silently.
- **Nothing invented.** Rules come from the specs; a genuinely unstated rule is raised (see *Raised*), not chosen.

## Target module map

| Module | Status | Role |
|--------|--------|------|
| `lib/sections.ts` | **new** | The three fixed sections; canonical type, labels, `isSection`, state→section resolution + exactly-one validation |
| `lib/counts.ts` | keep | The one counting rule (Available = available group + landed-this-year, counted once; On Order; sold outside) |
| `lib/money.ts` | **rewrite** | Naira-only: six-line total, completeness, one profit formula, cost label by state, amount-validation predicate, formatting |
| `lib/refs.ts` | **new** | `TS-####` format + validation; assignment-from-sequence rule (wired by TASK-004) |
| `lib/sale.ts` | **new** | Sold flag + sale-record transitions (mark / un-mark-voids), so no stale real-profit residue |
| `lib/overview.ts` | **new** | The one stock overview: counts + money totals + reach lines + "still building" |
| `lib/office.ts` | **rewrite** | Office read layer + temporary adapter over `office_car`; no own arithmetic, no hardcoded state sets |
| `lib/serialize.ts`, `lib/public-cars.ts` | touch | Public allow-list boundary + the only public read path |

## Verification method — browser (the established way, reused; surfaces only)

Everything below is the project's existing method (`~/.agents/skills/runtime-divergence/`, `developer-workspace/notes/RUNTIME-UI-DIFF-method.md`, the per-screen probes in `developer-workspace/scripts/`). It checks **surfaces**, not rules.

- **Attach, don't launch.** `import { connect, detach, resize, clearResize } from "/home/lordwhitefire/.agents/skills/runtime-divergence/scripts/browser.mjs"` → `connectOverCDP("http://127.0.0.1:9222")` to the one persistent visible Chrome (profile `~/.config/google-chrome-automation`); reuses two tabs (A = ref, B = build); **detaches** on exit; never headless; ≤10 chromium.
- **Before navigating, confirm the Chrome is ours** (User-Agent has no `Headless`).
- **Servers.** Reference `test-truespec-v2` on `:3211` (`python3 -m http.server 3211 --bind 127.0.0.1 --directory …/test-truespec-v2`); build on `:3210`. **Port 3000 must never be used — see the standing rule at the top of this plan.**
- **One probe per screen** under `developer-workspace/scripts/task-002/`; role-first locators, no `waitForTimeout`, `waitUntil: "domcontentloaded"`.
- **Cell matrix.** Public: `560/820/1100` × dark/light. Office: `1440 + 820 + 560 + 390` × dark/light.
- **Rule by rule, not by name;** `run.mjs → model.mjs → compare.mjs` where a full capture helps; artefacts under `scripts/task-002/runs/<screen>/`.
- **No screenshots.** Owner checks the look by hand. **Intended vs unintended** divergences are separated; the intended log is the conflict log. **The report says what was NOT checked.**

## Task List

### Phase 0 — Foundation

- [ ] **Task 1: Test runner — `node:test` over `tsx`** (S)
  Add a `test` npm script using Node's built-in test runner through the already-installed `tsx` (no new dependency; Node 22 present), and one trivial smoke test — so the model-check has an executable form.
  **Acceptance:** `npm test` runs a `lib/**/*.test.ts`; no new dependency.
  **Verification:** `npm test` green; `npm run typecheck` clean.
  **Dependencies:** None. **Files:** `package.json`, `lib/rules.smoke.test.ts`. **Size:** S.

- [ ] **Task 2: Rules & model workspace + rule-form template** (S)
  Create `developer-workspace/rules/TASK-002/` and `developer-workspace/models/`, and a `rules/README.md` carrying the rule form (kind **JS rule**, one statement per rule, `Source`, `Obeys when`, `Forces`, `Check`). No rule content yet — just the container and the template.
  **Acceptance:** the folders exist; the template is stated once and will be used verbatim by Tasks 3–5.
  **Verification:** read the template; confirm it names the three kinds (HTML/CSS/JS) and why this layer is JS.
  **Dependencies:** None. **Files:** `rules/TASK-002/README.md`. **Size:** S.

### Phase 1 — Create the rules

- [ ] **Task 3: Rules — sections + counting** (M)
  Write the section rule and the counting rule as JS rules derived from `specs/showroom`, `specs/inventory` and `specs/dashboard`: three fixed sections; every state maps to exactly one; the showroom reads only the mapping and never a state label; Available = available group + landed-this-year counted once with the "of which N new arrivals" note; On Order; sold outside the stock total.
  **Acceptance:** each rule is one checkable statement with its source, its observable and its check; no rule is invented (where the spec is silent, it is raised, not written).
  **Verification:** read against the specs, line by line; nothing added that the specs do not say.
  **Dependencies:** Task 2. **Files:** `rules/TASK-002/sections.md`, `rules/TASK-002/counting.md`. **Size:** M.

- [ ] **Task 4: Rules — money** (M)
  Write the money rules as JS rules from `specs/money` and `specs/dashboard`: the six cost kinds, all naira; no rate anywhere; one total-cost formula (exact sum, missing ≠ zero); integer kobo; profit = price − total, projected before sale and real after; the cost label by state ("Estimated total cost" / "Landed cost" / "Total cost"); a loss shown uncorrected; incomplete costs contribute to money tied up but are excluded from profit with a "still building" line; every money total states its reach; the cost-amount validation predicate (a malformed amount cannot be saved, error at the field).
  **Acceptance:** every rule checkable and sourced; the raised label question (see *Raised*) is marked as raised, not silently decided.
  **Verification:** read against `specs/money` + `specs/dashboard`.
  **Dependencies:** Task 2. **Files:** `rules/TASK-002/money.md`. **Size:** M.

- [ ] **Task 5: Rules — reference codes + sold** (M)
  Write the reference-code rules (`specs/inventory`: a `TS-####` on creation, never edited, never hand-chosen, never reused after deletion; taps/enquiries/activity join by it) and the sold rules (`specs/inventory`: sold is a flag with price + date, never a state; marking removes it from the showroom, puts it in Sold/Archive, moves profit to real; un-marking reverses/voids the record so no stale real-profit residue).
  **Acceptance:** each rule checkable and sourced; the write-path boundary (assignment/persistence is TASK-004) is stated.
  **Verification:** read against `specs/inventory`.
  **Dependencies:** Task 2. **Files:** `rules/TASK-002/codes.md`, `rules/TASK-002/sold.md`. **Size:** M.

#### Checkpoint A — the rules exist and are frozen
- [ ] Every rule is one checkable JS-rule statement with its source, observable, forced implementation and check.
- [ ] Nothing is invented; every unstated case is in *Raised*.
- [ ] **No build starts before this checkpoint.**

### Phase 2 — Build the model

- [ ] **Task 6: Build the model from the rules** (M)
  Turn the rules into `models/TASK-002-model.md` — the authority the check reads: each rule with the single implementation it forces, the read points it constrains, and its check (the unit test, and the search that finds a second implementation). This is the reference-derived-model role, with the source being our rules.
  **Acceptance:** the model covers every rule; every rule has an executable check; the model names the read points each rule reaches.
  **Verification:** walk the rules file and confirm one model entry each; confirm each check can actually be run.
  **Dependencies:** Tasks 3–5. **Files:** `models/TASK-002-model.md`. **Size:** M.

#### Checkpoint B — the model is the authority
- [ ] Every rule is in the model with its check.
- [ ] The model is the thing the check step (Tasks 20–21) will read; it is not changed to match the build.

### Phase 3 — Do the real build

- [ ] **Task 7: Browser-check harness — reuse the old implementation** (S)
  `developer-workspace/scripts/task-002/_lib.mjs` (imports the runtime-divergence skill's `browser.mjs`; `BASE` = `:3210`, ref = `:3211`; ≤10-chromium guard; User-Agent "is it ours" check; reporter; `detach` in `finally`) plus `checklist.public.json` / `checklist.office.json` with the cell matrices.
  **Acceptance:** it attaches to the open Chrome on `:9222` (launches nothing) and prints the two tabs; the checklists hold the matrices.
  **Verification:** run it; `ps` shows no new Chrome.
  **Dependencies:** None (Chrome running). **Files:** `scripts/task-002/_lib.mjs`, `checklist.public.json`, `checklist.office.json`. **Size:** S.

- [ ] **Task 8: Real build — `lib/sections.ts` + `lib/counts.ts`** (M)
  Implement the section rule and the counting rule as single implementations, with unit tests. `lib/sections.ts`: canonical `Section`, the three sections + labels, `isSection`, `sectionOfState(state, configuredSection)` raising on none/two. `lib/counts.ts`: the one counting rule over `Section`.
  **Acceptance:** rules R-SEC-* and R-CNT-* from the model hold; a state with no/two sections cannot resolve; a new arrival counted once; sold outside stock.
  **Verification:** `npm test` (`sections.test.ts`, `counts.test.ts`), `npm run typecheck`.
  **Dependencies:** Tasks 3, 6. **Files:** `lib/sections.ts`, `lib/counts.ts`, `lib/sections.test.ts`, `lib/counts.test.ts`. **Size:** M.

- [ ] **Task 9: Real build — `lib/money.ts` rewritten naira-only** (M) — **high risk, early**
  Implement the money rules: remove `Currency`/`USD_COST_KINDS`/`NGN_COST_KINDS`/`rateMinor`; `totalCostKobo(lines)` = exact sum of entered naira amounts; `isCostComplete`; `profitKobo({ totalCostKobo, priceKobo, salePriceKobo })` with its basis (projected/real/none); `costLabelFor(section, sold)`; `parseCostAmount(raw)`; keep `nairaDigits`/`formatNaira`. Update the one importer, `scripts/leak-check.ts`.
  **Acceptance:** rules R-MON-* hold; no currency/rate; exact sum; missing ≠ zero; loss uncorrected; no "Landed cost" before landing; a malformed amount rejected.
  **Verification:** `npm test` (`money.test.ts`), `npm run typecheck`, `npm run leak-check` runs.
  **Dependencies:** Tasks 4, 6. **Files:** `lib/money.ts`, `lib/money.test.ts`, `scripts/leak-check.ts`. **Size:** M.

- [x] **Task 10: Real build — `lib/refs.ts` + `lib/sale.ts`** (M)
  Implement the code rules (`formatRef(seq)`, `isValidRef`, the "assigned once, never edited, never reused" statement; assignment wired by TASK-004) and the sold rules (`isSold`, `saleTransition(current, action)`; un-mark voids the record) with tests.
  **Acceptance:** rules R-REF-* and R-SLD-* hold; padded `TS-####`; invalid rejected; un-mark leaves no real-profit residue; sold is a flag, never a state.
  **Verification:** `npm test` (`refs.test.ts`, `sale.test.ts`), `npm run typecheck`.
  **Dependencies:** Tasks 5, 6. **Files:** `lib/refs.ts`, `lib/sale.ts`, `lib/refs.test.ts`, `lib/sale.test.ts`. **Size:** M.

- [x] **Task 11: Real build — `lib/overview.ts`** (M)
  Implement the one stock overview (counts via `lib/counts.ts`; money totals via `lib/money.ts`; reach lines; "still building") with tests, incl. the "3 of 12 incomplete" scenario.
  **Acceptance:** money tied up includes incomplete-cost cars; profit totals carry "from N of M cars" + "still building"; counts come only from `counts.ts`.
  **Verification:** `npm test` (`overview.test.ts`), `npm run typecheck`.
  **Dependencies:** Tasks 8, 9. **Files:** `lib/overview.ts`, `lib/overview.test.ts`. **Size:** M.

- [x] **Task 12: Real build — public server path** (M)
  `serialize.ts` sources `PublicSection` from `lib/sections.ts`, allow-list unchanged; `public-cars.ts` resolves section via the one rule and counts via `counts.ts`/`overview.ts`.
  **Acceptance:** one mapping for section in the public path; payload still carries no cost/total/profit/state label; `getPublicCounts` reads the one rule.
  **Verification:** `npm test`, `npm run typecheck`, `npm run leak-check`.
  **Dependencies:** Tasks 8, 11. **Files:** `lib/serialize.ts`, `lib/public-cars.ts`. **Size:** M.

- [x] **Task 13: Real build — public site: home + inventory** (M)
  Rewire `(site)/page.tsx`, `HomeInventory.tsx`, `(site)/inventory/page.tsx`, `InventoryBrowser.tsx` to the one counting rule and one section source; delete local count arithmetic and section maps.
  **Acceptance:** home/inventory counts from the shared rule with the "of which N new arrivals" note; no local count left.
  **Verification:** `typecheck`, `build`; live probe at 560/820/1100 × dark/light.
  **Dependencies:** Task 12. **Files:** 4. **Size:** M.

- [x] **Task 14: Real build — public site: layout, car page, cards** (M)
  Rewire `(site)/layout.tsx`, `(site)/car/[ref]/page.tsx`, `car-view.ts`, `ReferenceCard.tsx`, `CarCard.tsx` to the section labels from the one module; remove local `SECTION_LABEL`/`STATUS_KEY`/section derivation.
  **Acceptance:** buyer-facing section names from one module; no owner state label shown.
  **Verification:** `typecheck`, `build`; live probe at 560/820/1100 × dark/light.
  **Dependencies:** Task 12. **Files:** 5. **Size:** M.

- [x] **Task 15: Real build — office adapter (`lib/office.ts`)** (M)
  Remove `AVAILABLE_STATES`/`ON_ORDER_STATES` and all local arithmetic; build the documented adapter mapping `office_car` → the shared rules' inputs; dashboard via `overview.ts`, counts via `counts.ts`; comment the TASK-003 seam.
  **Acceptance:** no hardcoded state sets / per-car arithmetic; office figures produced by the shared rules; adapter marked temporary.
  **Verification:** `npm test`, `typecheck`; demo figures recompute identically (15 rows).
  **Dependencies:** Tasks 8–11. **Files:** `lib/office.ts`. **Size:** M.

- [x] **Task 16: Real build — office dashboard + inventory** (M)
  Rewire `(shell)/page.tsx`, `(shell)/inventory/page.tsx`, `inventory-client.tsx` to the adapter + shared rules and `formatNaira`; remove the local `naira` formatter and local arithmetic.
  **Acceptance:** dashboard totals carry reach + "still building"; inventory cost/profit from the shared rule; no "Landed cost" on a not-landed car; no local kobo arithmetic.
  **Verification:** `typecheck`, `build`; live probe at 1440/820/560/390 × dark/light; Available equals the public number at the same moment.
  **Dependencies:** Task 15. **Files:** 3. **Size:** M.

- [x] **Task 17: Real build — office car form** (M)
  Rewire `car/page.tsx`, `car-client.tsx`: six naira inputs (drop `$` labels); remove `RATE`/`usd`; use `lib/money.ts` for live total/profit/label; validate at the field with `parseCostAmount`.
  **Acceptance:** no rate/dollar input; "Estimated total cost" on order, "Landed cost" once landed; a non-numeric amount blocks at its field before submit; cost/price edits update total + profit live.
  **Verification:** `typecheck`, `build`; live probe at 1440/820/560 × dark/light.
  **Dependencies:** Task 9. **Files:** `car/page.tsx`, `car-client.tsx`. **Size:** M.

- [x] **Task 18: Real build — office settings: remove the rate** (S)
  Remove the "Dollar rate" card/state/save; keep the full-tank default as a prefill; source section identity from `lib/sections.ts` in `settings/page.tsx`/`state-seeds.ts` (per-state *usage* counts stay, not a stock count).
  **Acceptance:** no rate field/hint/state/save left; full-tank default stays; no second section definition.
  **Verification:** `typecheck`, `build`; live probe at 1440/820/560/390 × dark/light.
  **Dependencies:** Tasks 8, 9. **Files:** `settings-client.tsx`, `settings/page.tsx`, `state-seeds.ts`. **Size:** S.

- [x] **Task 19: Real build — purge the rate everywhere else** (M)
  Seed naira-only cost lines (drop `currency`/`rate_minor`); make `leak-check.ts` assert no rate remains; remove the "FX rate set to ₦1,000 per $1" activity line.
  **Acceptance:** no rate field/key/constant/column value/copy remains (testing.md §1.4); seed inserts naira only and `db:seed` succeeds.
  **Verification:** `db:seed`, `npm run leak-check`, repo-wide search for `rate` explained.
  **Dependencies:** Tasks 9, 15–18. **Files:** `scripts/seed.ts`, `scripts/leak-check.ts`, `activity-client.tsx`. **Size:** M.

#### Checkpoint C — the build is complete and runs
- [x] `npm run build` clean; app runs; every read point computes from the one rule; no rate in the tree.

### Phase 4 — Check

- [x] **Task 20: Check — rule by rule against the model** (M) — ✅ 2026-10-13: `reports/TASK-002-model-check.md` (29/29 PASS, gates green, ledger 16/16, no defect)
  Walk `models/TASK-002-model.md`: run every rule's executable check (`npm test`) and every mechanical check (search for a second implementation of counting, money, section mapping, and for any rate). Record pass/fail per rule, with the file:line of anything found.
  **Acceptance:** every rule is accounted for; exactly one implementation per rule; no rate; a failure names what broke the rule and where.
  **Verification:** the model-check output; `npm test`, `npm run typecheck`.
  **Dependencies:** Tasks 6, 8–19. **Files:** `reports/TASK-002-model-check.md`. **Size:** M.

- [ ] **Task 21: Check — browser, surfaces only, cell matrix** (M)
  Run the per-screen probes together across the full matrix against the reference; separate **intended** divergences (rate removed; "Landed cost" only after landing; office counts now rule-derived — each tied to the requirement that wins) from **unintended** ones (defects, fixed or named).
  **Acceptance:** every rewired screen's probe runs and reports; intended divergences tied to their requirement; unintended fixed or named; no screenshots; the report says what was not checked.
  **Verification:** the run output + `runs/<screen>/compare-report.txt`; `ps` shows no extra Chrome.
  **Dependencies:** Tasks 7, 13, 14, 16–19. **Files:** `scripts/task-002/*.mjs`, `scripts/task-002/runs/`, `reports/TASK-002-browser-check.md`. **Size:** M.

- [ ] **Task 22: Reconciliation + conflict log** (M)
  `scripts/reconcile.ts` runs the one rule over the office demo rows and prints the figures beside the ones the office showed; write the conflict log (the rate; "Landed cost" on not-landed cars; the office's own table — and which side won).
  **Acceptance:** the shared rule reproduces the office's displayed counts/money, or the divergence in *data* (never the rule) is named; the conflict log lists every disagreement and the winner.
  **Verification:** run the reconciliation script; numbers match the screens.
  **Dependencies:** Tasks 15–19. **Files:** `scripts/reconcile.ts`, `reports/TASK-002-conflict-log.md`. **Size:** M.

- [ ] **Task 23: Public boundary re-check, report, closing copy** (M)
  Run the full gate (`test`, `typecheck`, `build`, `leak-check`); write the honest report (built / verified / not verified); copy the rules, the model and the report into `openspec/tasks/TASK-002/` for the closing gate.
  **Acceptance:** all four gates pass; the report names verified vs not-verified; the rules + model + report copies sit in `openspec/tasks/TASK-002/`.
  **Verification:** run the gate; read the report.
  **Dependencies:** Tasks 20–22. **Files:** `reports/TASK-002-report.md`, `openspec/tasks/TASK-002/{rules,model,report}`. **Size:** M.

#### Checkpoint D (final)
- [ ] Every benchmark in `task.md` §Benchmarks met.
- [ ] Each rule exists exactly once; every read point uses it; every rule passed its model check.
- [ ] Rules, model, browser check, conflict log and reconciliation left behind.
- [ ] `testing.md` can be run by a separate session.

---

## Out of scope — named for other layers (not built here)

- **TASK-003 (data model):** the `office_car`↔`car` reconciliation and the office data's shape; the now-void `currency`/`rate_minor` columns; a **colour** per car state and per enquiry state; the registries' **`sort`** ordering. Named, none changed.
- **TASK-004 (functionality):** server actions, CRUD writes, the actual `TS-####` assignment from the sequence on creation, and sale-record persistence.

## Raised — genuinely unstated rules (owner to confirm; not chosen silently)

1. ~~**Cost label for a car in the "Available" state.**~~ **Settled (owner, 2026-10-12):** the cost
   is tied to the **state**, not the section — "how much I spent at that stage"; a state that
   means landed reads "Landed cost", any earlier state reads "Estimated total cost". The label is
   decided by the owner's state map, exactly one label per state, in the model (`R-MON-7`).
2. **Office completeness vs the six-line rule.** The office table stores one `landed_cost_kobo`,
   so the adapter's completeness is "has a total", not "all six lines entered" — documented in
   the adapter; the six-line rule still governs the car form path.

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Building before the rules exist | High | Checkpoint A gates all code on the rules; Checkpoint B gates it on the model. |
| `lib/money.ts` is a public API change | Med | Rewrite in Task 9; update `leak-check.ts` in the same task. |
| Rewiring screens changes layout/numbers | High | Rules/model first; the office demo figures are the acceptance witness (Task 22); browser-check each screen (Task 21). |
| The "one mapping" split across DB column + UI maps | Med | `lib/sections.ts` becomes the only section identity. |
| The reference itself carries the removed rate | Med | Treat the rate/label changes as **intended** divergences tied to the requirement (Task 21). |
| Port `:9222` squatted by a headless browser | Med | The harness verifies the Chrome is ours (no `Headless` UA) before navigating (Task 7). |
| Cross-table equality can't hold until TASK-003 | Low | Acceptance is "one rule, invoked by all read points"; literal equality is TASK-003's. |

## Definition of done (this layer)

- The rules exist, written and frozen, as the layer's reference; the model is built from them; the build obeys them; the check is rule by rule against the model.
- Each of the six rules is the **only** implementation; no screen invents its own answer.
- Every read point reads it — the office through the documented temporary adapter.
- The rate exists nowhere; every amount is naira.
- `test`, `typecheck`, `build`, `leak-check` pass; every rule passed its model check.
- The browser check (surfaces only, no screenshots) is clean with intended divergences tied to their requirement; rules, model, conflict log and reconciliation are left behind and copied to `openspec/tasks/TASK-002/`.
