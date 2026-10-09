# Message to the Architect — TASK-001 `openspec/` corrections

**From:** Developer (TASK-001 testing pass) · **Date:** 2026-10-09
**Re:** TASK-001 verification came back FAIL, but the failures are in the task/testing files, not the
build. Requesting corrections in `openspec/` — the Architect owns these.

## Context

I ran the TASK-001 verification list (`openspec/tasks/TASK-001/testing.md`) against the built work.
Full report: `developer-workspace/reports/TASK-001-testing-report.md`.

Result: the **registry goal is achieved** (`tasks-registry.md` line 11 — app scaffold, migrations,
seed, allow-list serializer, three-section showroom, leak check all exist and work, and the core rule
holds: no cost/rate/profit value on any public route). The FAIL verdict comes from checks that
contradict `task.md` and the binding specs. Those checks should be corrected so TASK-001 does not
fail again for the wrong reasons.

## Corrections requested

### 1. `testing.md` 3.2 — remove `kobo` from the forbidden-token list
- **Where:** testing.md line 102 ("Search the full response bodies for: `purchase`, `shipping`,
  `clearing`, `trucking`, `tank`, `cost`, `profit`, `rate`, `kobo`").
- **Problem:** `kobo` is not a forbidden value anywhere in the binding material. task.md's constraint
  (line 62) forbids purchase / shipping / clearing / trucking / fuel / rate / total-cost / profit.
  `specs/showroom` (line 19) forbids the same set and *allow-lists* `price`. `specs/money` (line 37)
  **requires** integer minor units (kobo). The build emits the public price as `priceKobo` /
  `wasPriceKobo`, which the check flags — a false positive against the spec's own design.
- **Proposed fix:** drop `kobo` from the token list, and add a note: *"Public prices may legitimately
  be serialized in integer kobo; the forbidden data is cost, rate, and profit, not the price."*
- **Evidence:** `/inventory` body contains `"priceKobo":2250000000` and `"wasPriceKobo":null`
  (14 cars each); no cost/rate/profit data anywhere.

### 2. `task.md` item 10 and `testing.md` 2.6 — office behaviour described as showroom behaviour
- **Where:** task.md line 50 ("cards on phone, table on laptop, filtering as full-screen sheet / sheet
  / bar dropdown"); testing.md line 76 (same).
- **Problem:** the binding `specs/showroom` never mentions tables or filters; it requires the three
  fixed sections and the car page only. task.md's own out-of-scope table hands "all office screens"
  to TASK-002, and design D9's sheet/dropdown line describes the adaptive office patterns. The
  reference `inventory.html` filter sidebar depends on car fields not in the approved schema
  (body/engine/drive/seats/fuel/hp). The Builder logged this (conflict-log #8, #2).
- **Proposed fix:** either scope the table/filter to TASK-002, or state explicitly that the public
  showroom inventory is cards at every width. As written, item 10 conflicts with `specs/showroom`,
  and task.md's own rule says the spec wins.

### 3. `testing.md` 1.6 — the Fail clause is narrower than the Pass clause
- **Where:** testing.md line 49 (Pass: "`neon.ts` is present **and committed**") vs line 50 (Fail:
  "…or `neon.ts` is **missing entirely**").
- **Problem:** a `neon.ts` that exists but is uncommitted satisfies neither clause. That is the state
  found (repo has zero commits). The check cannot express its own intent.
- **Proposed fix:** add "`neon.ts` is present but not committed" to the Fail clause — or drop the
  "committed" requirement if an uncommitted tree is acceptable for this task.

### 4. `testing.md` 3.3 — add the secret check (conflict-log #9)
- 3.3 checks DB credentials only. It should also confirm `CLERK_SECRET_KEY` / `SESSION_SECRET` are
  server-only. (Verified separately: they never enter a client bundle.)

### 5. `task.md` §Process reading order / `testing.md` — include D4, D8, ruling A8 (conflict-log #10)
- The reading order points at D1/D2/D5/D10 only; D4 (sessions), D8 (daily job / Neon scheduled
  function) and owner ruling A8 (Neon + Clerk + Sanity + Vercel) are binding for later tasks.

### 6. Registry — tick TASK-001
- `tasks-registry.md` line 11 is still `[ ]`. The goal is met; tick it when the above are reconciled.

## Not for `openspec/` (for awareness only)

- **Code:** `scripts/leak-check.ts` matches forbidden tokens case-sensitively, so a camelCase cost
  field (`purchaseKobo`, `rateMinor`, `totalCostKobo`) would also slip past. I have not changed it —
  the fix depends on the `kobo` decision below. Recommend the Architect/Decision confirm, then the
  matching be made case-insensitive with the list aimed at cost/rate/profit.
- **Owner decision needed:** the public payload carries `priceKobo` **and** `wasPriceKobo`. The
  allow-list in `specs/showroom` (line 19) says "price — and nothing else", so a second "was" price
  field may be outside the allow-list. Owner to rule whether it stays (as display for the Special
  ribbon) or is removed.

Nothing in the build needs changing for points 1–6; they are corrections to the task/testing files.
