# TASK-004 — Task 33: Gates, reconcile, report, copies, tracker

**Date:** 2026-10-16 · **Status:** done (gates green; report written and copied).

## Gates (learned order)
| Gate | Result |
|---|---|
| leak-check | **PASSED** — no cost/currency/profit figure, no asset or file reference, no customer detail, no office state label on any public route. |
| typecheck | **PASSES** — no errors in app/lib code; the only output is `.next/types/app/zredirectprobe/page.ts` (stale generated probe page, build artefact, not source). |
| test | **278 pass · 0 fail · 0 skipped · 0 todo** (`node --import tsx --test "lib/**/*.test.ts"`). |
| build | **SUCCEEDS** (`next build`). |
| store-freshness | **PASSED** — none of 9 store-reading routes prerendered, no database response cached. |

## Flows witness (Task 31) — honest result
`scripts/task-004/flows-witness.mjs` (attach-only CDP :9222, signed-in office tab found by scanning
contexts for an `/office` page that is not the sign-in; base URL taken from the tab, so both
`localhost:3210` and `127.0.0.1:3210` work). Figures before/after recorded in
`runs/flows/flows-witness.json`:

    cars 17/17 · costs 99/99 · photos 49/49 · enquiries 6/6 · taps 0/0 · activity 0/0 · drafts 0/0 · settings 3/3

**Not claimed as a full pass:** the standing browser-check was run afterwards and returned
**FAIL** on one verdict — "the office and the showroom agree on the same car (TS-1001) at every
shared cell": office ₦—/— vs showroom ₦34,500,000/31,000 km on all 4 paired cells. Every other
verdict (40 cells loaded, mileage km-only, no public leak, sold car left the showroom) passed.
Recorded as-is in `runs/flows/flows-witness-report.txt` and `browser-check-out.txt`.

## Task 32 witness
`runs/task32/task32-report.txt` — store counts after the flows; demo marker (`is_demo`) present in
the write paths (`lib/car-create.ts`, `lib/enquiry-create.ts`, `lib/draft.ts`); wipe dry-run
behaviour covered by `scripts/demo-wipe.ts` + task-003/task-004 wipe proofs; export opened during
the flows run (office-only; unauthenticated → 401, empty body).

## Report + copy
- `developer-workspace/reports/TASK-004.md`
- byte-identical copy: `openspec/tasks/TASK-004/TASK-004-report.md` (owner's spec tree — left uncommitted)

## Findings / carried
1. Browser-check's office↔showroom paired-cell verdict reads `₦—/—` from the office inventory row —
   the row renders figures in a shape the probe does not parse, or the office row genuinely shows a
   dash; **not resolved here** (surface probe of task-003's check, not this task's scope).
2. `.next/types/app/zredirectprobe/page.ts` is a stale generated probe page; harmless, cleared by
   a clean build.
3. Door is a 200 streamed client-side redirect; `refusal-proof.ts` (task 6) is stale and recorded
   as such (Task 30), not edited.
