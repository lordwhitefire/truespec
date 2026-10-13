# TASK-002 — report (business logic, Layer 2)

**Date:** 2026-10-13 · **Status:** build complete; all four gates green
**Authority:** `models/TASK-002-model.md` (built from `rules/TASK-002/`), itself built from the specs.
The model was **not** changed to match the build.

---

## 1. What was built

One implementation of each rule, and every read point rewired to use it — no second implementation
survives anywhere.

| Rule | The one implementation | Read points now using it |
|------|------------------------|--------------------------|
| Section mapping | `lib/sections.ts` | showroom sections, office chips, public payload |
| Counting | `lib/counts.ts` | home, inventory, office dashboard/inventory |
| Cost & profit, named by state | `lib/money.ts` (`totalCostKobo`, `costLabelFor`, `parseCostAmount`, `profitKobo`) | public car page, office inventory, office car form, settings |
| `TS-####` | `lib/refs.ts` | public routes, office rows, joins |
| Sold flag | `lib/sale.ts` | public sold page, office real profit |
| Stock overview / totals | `lib/overview.ts` | office dashboard |

Public read path: `lib/public-cars.ts` + `lib/serialize.ts` (the allow-list — the only public read).
Office read path: `lib/office.ts` — a **thin adapter** over the office's own `office_car` table that
feeds the shared rules and holds no arithmetic of its own; stored data untouched.

**The rate is gone entirely** — settings "Dollar rate", the car form `RATE`, the seed's dollar lines.
Every amount is naira. (The six cost kinds live in `lib/money.ts`; the full-tank default stays, as a
prefill only.)

---

## 2. Verified

| Gate / check | Result | Evidence |
|--------------|--------|----------|
| `npm test` | **47/47 pass**, 0 fail (7 rule suites) | run 2026-10-13 |
| `npm run typecheck` | **clean** (`tsc --noEmit`) | run 2026-10-13 |
| `npm run leak-check` | **PASSED** — "no cost, currency or profit value leaked on any public route" | all public routes, run 2026-10-13 |
| `npm run build` | **clean** — 13 routes compiled, no error | run 2026-10-13 |
| Model check (Task 20) | **29/29 rules PASS**, ledger 16/16, no defect | `reports/TASK-002-model-check.md` |
| Browser check (Task 21) | **56 cells**, all HTTP 200; intended divergences tied to requirements; no owner-state leak | `reports/TASK-002-browser-check.md`, `scripts/task-002/runs/` |
| Reconciliation (Task 22) | the one rule **reproduces every office figure** except money tied up (named data divergence; rule wins) | `scripts/reconcile.ts`, `reports/TASK-002-reconcile-output.txt` |

**One implementation per rule, proven mechanically** (Task 20): no second three-section literal, no
state→section map outside `lib/sections.ts`, no second money total, no `rate` in the tree except the
void columns and the leak-check guard, no seventh cost kind, no price/cost on any state record.
**Zero owner-state labels** rendered on `/`, `/inventory`, `/car/TS-1001`; leak-check green on every
public route.

**The acceptance witness holds:** the office's displayed figures (counts `12 available · 2 on order`;
projected `₦57,760,000` from 12 of 14; real `₦3,850,000`; sold `2018 Camry XLE ₦31,500,000`; all 41
per-row price/cost/profit figures) are reproduced by the one shared rule through the adapter. The
single disagreement — money tied up `₦451,040,000` vs the old `₦587,040,000` — is a **data**
divergence (the old office used the price as a proxy for incomplete cars), named in the conflict log,
never the rule.

---

## 3. Not verified — said plainly

- **Interactive behaviour was not driven.** The browser check reads rendered surfaces only; it does
  not type, click, save or delete. So these are **not** re-verified end-to-end here:
  - the malformed-amount **save block** at the field (the validation *predicate* `parseCostAmount` is
    verified by tests; the form wiring is built, not exercised);
  - the live recompute of total cost / profit as a cost or price is typed;
  - filters actually filtering, delete/undo, keyboard flow.
- **Write paths are TASK-004, not this layer.** Nothing here creates, edits, sells or assigns a code:
  server actions, CRUD, the actual `TS-####` assignment on creation, and sale-record persistence are
  TASK-004. The *rules* for these (`lib/refs.ts`, `lib/sale.ts`) exist and are tested; the *writes*
  are not built in this layer.
- **The office's own table is not reconciled.** `office_car` vs `car` (refs collide) is TASK-003 —
  named, not merged.
- **Per-state colour and registry `sort`** are missing by design (TASK-003) and implemented nowhere.
- **Look / CSS / pixels** — no screenshots; the owner checks the look by hand.
- **Three unintended divergences lie outside this layer** (office page titles; seed `RX 350 350`;
  public filter dimensions) — named in the conflict log for their owning task.

---

## 4. Benchmarks (`task.md` §Benchmarks) — met where this layer reaches

| # | Benchmark | Status |
|---|-----------|--------|
| 1 | add a state → cars appear in its section; the name is nowhere public | **read half verified** — `sectionOfState` maps a state to one section; no state label reaches any public route (leak-check + probe). The *add* is a write (TASK-004) over storage (TASK-003). |
| 2 | on-order car reads "Estimated total cost", never "Landed cost"; once landed, "Landed cost" | **met** — `costLabelFor`, verified by tests and seen on the office screens |
| 3 | Available equal across home/inventory/office dashboard from one rule; "of which N new arrivals"; office difference is data | **met** — one `lib/counts.ts`; the office-vs-showroom difference is the named data divergence |
| 4 | a non-number in a cost field blocks the save at the field | **predicate verified by tests; the save block not exercised here** (write path, TASK-004) |
| 5 | change a cost → total and profit change everywhere | **not verifiable here** — no write path; nothing is frozen at read (all read points call the rule) |
| 6 | three cars missing costs → money tied up still includes them; profit names how many and "still building" | **met** — reconciliation: tied-up counts 14 (incl. the 2 incomplete); "still building — 2 of 14 cars have incomplete costs" |
| 7 | a car is created → next `TS-####` once; editing never changes it; a deleted code is never reused | **rule verified by tests; the assignment on creation is TASK-004** |
| 8 | mark sold → leaves showroom, in Sold/Archive, real profit; un-marking reverses | **read side met** (public sold page; real profit from `lib/sale.ts`/`lib/overview.ts`); the mark/unmark writes are TASK-004 |
| 9 | any public response holds no cost/total/profit/state label | **met** — `npm run leak-check` PASSED on every public route |

---

## 5. Evidence left behind

- **Rules:** `developer-workspace/rules/TASK-002/` (README, sections, counting, money, codes, sold)
- **Model:** `developer-workspace/models/TASK-002-model.md`
- **Reports:** `TASK-002-model-check.md`, `TASK-002-browser-check.md`, `TASK-002-conflict-log.md`,
  `TASK-002-reconcile-output.txt`, and this report
- **Scripts:** `scripts/reconcile.ts` (project), `scripts/task-002/*.mjs` + `runs/` (probes)
- **Copied** into `openspec/tasks/TASK-002/` (`rules/`, `model/`, the reports) for the closing gate.

---

## 6. Honest closing note

Everything this layer was asked to build is built, and every claim above is backed by a run recorded
in the workspace. Three divergences were found that this layer does not own (office titles, seed
content, public-filter dimensions) and are named rather than fixed. The interactive and write-path
behaviours are the ones left to TASK-003 (storage) and TASK-004 (functionality) — named, not faked.
