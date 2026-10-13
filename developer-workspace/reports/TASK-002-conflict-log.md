# TASK-002 — conflict log

**Date:** 2026-10-13 · **Task:** TASK-002 (business logic, Layer 2) · **Step:** Task 22

A **conflict** is any place where what is built disagrees with the requirement. The requirement is
the authority (`models/TASK-002-model.md`, built from `rules/TASK-002/`). Two authorities are
compared here, and neither is allowed to win by being newer or prettier:

- **the rule** — the one implementation in `lib/` (counts, money, sections, overview), through the
  office adapter `lib/office.ts`;
- **the old implementation** — the reference office pages (`test-truespec-v2`), whose figures the
  recorded witness `developer-workspace/scripts/office-data/ref-*.txt` captures.

The reconciliation (`scripts/reconcile.ts`, output in `reports/TASK-002-reconcile-output.txt`) runs
the rule over the office demo rows and prints every figure beside the office's. Where they differ,
the winner is named below — **never reconciled silently**. A disagreement the rule *cannot*
reproduce would be a defect and would fail the reconciliation run; none did.

---

## 1. Requirement vs the old office — where the rule wins

| # | Disagreement | Old office (one side) | The rule (the model) | Winner | Evidence |
|---|--------------|-----------------------|----------------------|--------|----------|
| 1 | **Money tied up** | `₦587,040,000` — used the doorstep **price** as a proxy for each incomplete car's cost | `₦451,040,000` — counts only entered costs; an incomplete car contributes `₦0` (**R-MON-8**) | **the rule** | diff `₦136,000,000` = exactly TS‑1013 `₦58,000,000` + TS‑1014 `₦78,000,000`. Data divergence, never the rule |
| 2 | **Cost label before landing** | every row labelled `LANDED COST` — including the two on-order cars | `Estimated total cost` before landing; `Landed cost` once landed; `Total cost` when sold (**R-MON**) | **the rule** | `reconcile.ts` per-row labels; build cards show `ESTIMATED TOTAL COST` on the on-order car |
| 3 | **Office table header** | `CAR STATE PRICE LANDED COST PROFIT ACTIONS` | `CAR STATE PRICE COST PROFIT ACTIONS` (generic word; the state carries the name) | **the rule** | office-inventory `w1440` keyLines, build vs ref |
| 4 | **The rate / dollar** | settings card `Currency & cost defaults` → `Dollar rate ₦…`; car form `Rate ₦1,000 / $1` + `Purchase + US costs / Nigeria costs` | none — every amount is naira; no rate exists (**R-MON-3**) | **the rule** | office-settings + office-car probe cells: `rateWords` ref `["rate","$"]` → build `[]` |
| 5 | **Public car price** | a rate-derived figure that **changed on every load** (`₦10.6M`–`₦13.9M` across cells for one car) | the car's fixed doorstep price (`₦34,500,000` for TS‑1001) | **the rule** | car-screen probe cells; doorstep price is a field on the car |
| 6 | **Public home summary** | `AVAILABLE 12 READY · 6 LANDED` | `AVAILABLE 18 CARS · OF WHICH 6 NEW ARRIVALS` — the same 18 / 6, presented as the rule counts them (**R-CNT**) | **the rule** | home keyLines; the "of which N new arrivals" note is `lib/counts.ts` |
| 7 | **Section label** | `On order` | `On Order` (**R-SEC-1**) | **the rule** | inventory filter chip, build vs ref |
| 8 | **Settings card title** | `Currency & cost defaults` | `Cost default` (the rate card is gone) | **the rule** | Task 18 retitle; settings probe cell |
| 9 | **Car-form amounts** | `f-price:number`, `c-*:number` | `f-price:text`, six `c-*:text` with `inputMode=decimal` (Task 17) | **the rule** | office-car probe `inputs` |

**Reproduced exactly (no conflict):** office counts `12 available · 2 on order · 1 new arrival · 1 sold`;
projected profit `₦57,760,000` (from 12 of 14); real profit `₦3,850,000` (1 of 1); sold car
`2018 Camry XLE ₦31,500,000`; and all 41 per-row price/cost/profit figures. The rule reproduces
every office figure except #1, which is a named data divergence.

---

## 2. The office's own table — deferred, not decided

| # | Disagreement | One side | Other side | Winner |
|---|--------------|----------|------------|--------|
| 10 | **Two car tables** | office demo rows in `office_car` | public cars in `car` (their refs collide — `migrations/0007_office.sql`) | **neither — TASK-003** |

The office adapter `lib/office.ts` is the one seam between them and owns no count, sum or section of
its own. The two tables' reconciliation is TASK-003's; named here so neither side is silently
preferred. (The now-void `currency` / `rate_minor` columns are also TASK-003's.)

---

## 3. Internal divergences found during the build (model check, Task 20) — accepted, named

| # | Found | Why it is not a second implementation | Winner |
|---|-------|----------------------------------------|--------|
| 11 | `costLabelFor(state: Section, sold)` takes the **section** (the state's resolved stage), not the owner state label | behaviour-identical for every registered state; the section is the rule's input (**R-SEC-2**) | the rule's shape (section) |
| 12 | `app/office/(shell)/inventory/inventory-client.tsx:156` — `stock = rows.length − counts.sold` | display arithmetic over the list minus the rule's **own** `counts.sold`; not a second count | stays (uses the rule's figure) |
| 13 | `app/office/(shell)/inventory/page.tsx:33` — `sold = c.sold_at !== null` | repeats the adapter's sold-ness derivation (`lib/office.ts:94`) — same source, not a second rule | stays |

## 4. Named divergences from earlier tasks — accepted, deferred or documented

| # | Item | Winner / disposition |
|---|------|----------------------|
| 14 | Inventory chip **dot colour** folded to section (`On the way` / `At port` share one colour); `inventory-client.tsx:17,45` | per-state colour is **TASK-003** |
| 15 | After a **demo delete**, the headline still uses the server `counts.sold` | the rule's count stands (server) until the write path **TASK-004** |
| 16 | Task 17 `HELD` demo state has no registry entry → its live cost label falls back to the car's own section | fallback documented; the registry entry is **TASK-003** |

---

## 5. Unintended divergences found at the browser check (Task 21) — outside TASK-002's surface

Named, **not fixed** — each belongs to the task that owns that surface.

| # | Divergence | Owner |
|---|-----------|-------|
| 17 | every `/office/*` page renders the root public `<title>` (no office layout sets `metadata`) | the office shell |
| 18 | seed doubles the trim — `2019 Lexus RX 350 350` (`scripts/seed.ts:56` carries `model:"RX 350"` **and** `trim:"350"`; the title builder is correct) | seed content |
| 19 | public inventory has 30 filter checkboxes vs the reference's 16 (`components/site/InventoryBrowser.tsx`) | the public browser (predates TASK-002). **Positive boundary result:** the status filter uses only `lib/sections.ts` — no owner-state name leaks |

---

## Verdict

Every disagreement is named with its winner. The rule wins over the old office on nine points
(1–9); the office's own table is deferred to TASK-003 (10); three internal divergences are accepted
with reasons (11–13); three earlier named items stand (14–16); three unintended divergences lie
outside TASK-002's change surface (17–19). **The one rule reproduces every office figure it is meant
to, and the single money divergence is a named data difference — never the rule.**
