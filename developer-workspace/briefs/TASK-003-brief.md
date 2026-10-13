# TASK-003 — brief (data model, Layer 3 of 6)

**Date:** 2026-10-13 · **Owner's go:** given 2026-10-13.
**Authority:** `openspec/tasks/TASK-003/task.md` (plan-not-instructions, 17 conflicts, Rounds 1–3 answered)
+ the architecture specs/design/tasks + `developer-workspace/models/TASK-002-model.md`.
**Plan / tracker:** `developer-workspace/plans/TASK-003-plan.md`.

## What was asked

Make the store true to what the screens and the rules already do — the store's shape, not a screen bug —
before functionality writes to it and before UX is defined against it.

1. **One car, one identity** — one row in one table; one `TS-####` names one car; the office reads the same
   table the showroom does (`car` + `cost_line` + `car_state`); `office_car` retires.
2. **Money in storage is the money the rule reads** — the six naira lines; no rate, no currency anywhere.
3. **The registries can hold what Settings offers** — a colour on both; unique labels; `section` required;
   deletion refused while occupied.
4. **Identity belongs to the provider** — no password material; the session row names the provider session.
5. **The image store is real here** — Sanity wired (no Studio), the demo photos uploaded, `origin` recorded,
   one fictional demo enquiry PDF, no third-party address in the tree.
6. **The demo is marked and removable in one move**; the system reports, the owner deletes — nothing is ever
   removed on his behalf (the only exceptions: its own litter).

## What done looks like

- Forward-only corrective migrations `0008…0015` applied; the ledger exact; drop→migrate→seed reproduces the schema.
- The office and the showroom opened on the same car **agree** on every figure the one rule produces.
- The four refusals proved **by the store**; no float/scale>0 money, no rate/currency, no stored totals or profit.
- `npm test`, `typecheck`, `leak-check` (green on every public route), `build` — all four green.
- Witnesses on disk: rebuild run, refusals, store inspection, agreement + leak check, demo wipe, fleet list,
  photo manifest; report copied into `openspec/tasks/TASK-003/`.

## Boundaries (must not happen)

- No runtime write flow — forms, CRUD, live upload, import are **TASK-004**.
- No rate in any form. No secret in the repository. `product-management/` never edited.
- `lib/serialize.ts` stays the only public path; the migration ledger never lies.
- Nothing deleted on the owner's behalf, ever.
