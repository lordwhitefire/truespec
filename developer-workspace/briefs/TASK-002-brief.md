# Brief — TASK-002: Business logic (Layer 2)

**Date:** 2026-10-12. **Source:** `openspec/tasks/TASK-002/task.md`. **Plan:** `developer-workspace/plans/TASK-002-plan.md`. **Verification:** `openspec/tasks/TASK-002/testing.md`.

## What was asked

Make each of the six business rules — section mapping, counting, money (cost/earnings/profit), cost-line validity, `TS-####` reference codes, and the sold flag — exist **once**, as the only implementation, and give every read point that one answer. The screens that compute their own numbers now (office dashboard, car form, Settings, and the site's local counts) are the ones that must stop.

## What done looks like

- The six rules are pure, unit-tested modules; no screen keeps arithmetic or a section map of its own.
- The showroom, home, inventory and office all read the same count, the same section names, the same money formula.
- The office runs on the shared rules through a **temporary documented adapter** over `office_car`; **storage untouched** (TASK-003 decides its shape).
- The dollar rate is **gone everywhere**; every amount is naira. Full-tank default stays (prefill only).
- Colour/`sort` and the office-table reconciliation are **named for TASK-003**; server actions/writes are **TASK-004**.
- `npm test`, `typecheck`, `build`, `leak-check` pass; a conflict log and a reconciliation are left behind; the report is copied to `openspec/tasks/TASK-002/` for the closing gate.

## How it was agreed

Grilling rounds 1–2 (scope + technical), answered from the task file and the registry; shared understanding confirmed by the owner 2026-10-12.

## Method (owner, 2026-10-12)

This is the business layer — there is nothing to *look at*; the rules are the reference. **Create the rules → build the model → do the real build → check.** The rules (`developer-workspace/rules/TASK-002/`) are written first, one checkable JS rule per statement; the model (`developer-workspace/models/TASK-002-model.md`) is built from them and is the authority; the build obeys them; the check walks rule by rule against the model. The browser is used only to check the **surfaces** (old implementation: runtime-divergence, no screenshots), never as the authority for the rules.
