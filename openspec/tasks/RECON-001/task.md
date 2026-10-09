# RECON-001 — UI completeness (make sure all the UI is done)

**Registry entry:** **TASK-001 — UI (Layer 1)**, in `openspec/tasks-registry.md`. RECON-001 is the recon / do-over attached to TASK-001 — it takes task 1's place as the thing the Builder works from.

**Form (owner ruling 2026-10-08):** this is a plan, not an instruction. It states what must be true and the process to follow. Completion is judged against the benchmarks, not against whether a verb was obeyed.

---

## Why

UI is layer 1 of the product model, and the plan lost it. The screens were split into "Showroom UI" / "Office UI" and then renamed in the registry to "foundation & public boundary" and "office screens" — so no artifact currently answers the plain question: **is the UI done?**

Part of it is built (the public showroom, partly) and the design is fully decided (`ui-plan.md` + the reference screens), but nobody can say, screen by screen, what exists, what is missing, and what does not match. This task fixes that: a reconnaissance of the whole UI against the approved design, then every gap closed, so the UI layer is provably done.

## Scope

**In scope — the UI layer, all of it:**

- Public showroom: home, inventory, car page, and the public extras — privacy, 404, sold/deleted page.
- Office: login / first-run, dashboard, inventory, car form, state editor, enquiries, activity, settings.
- Every approved element on them, at all three widths (phone / tablet / laptop) and in both modes (dark default + light toggle).

**Out of scope:** the other five layers (business logic, functionality, UX, data model, system model) except where a screen needs something from them to render; any change to the approved design.

## The yardstick — where "done" is defined

- `product-management/ui-plan.md` — the approved look and the 95 answers.
- `product-management/product-overview.md` — the product's content.
- The reference screens `test-truespec-v2` — visual truth, read-only.
- The change specs where a screen carries a requirement (`specs/showroom`, `specs/office-access`, `specs/office-settings`, `specs/media`, …); where a screen and a spec disagree, the spec wins and the conflict is logged.

## What must be true

1. **A screen-by-screen list exists** — every screen in the approved design, each marked done / missing / does not match. No screen unaccounted for.
2. Every screen that exists **matches the approved design** — layout, sections, controls, wording.
3. Every approved **UI element** is present where `ui-plan.md` puts it. Named here because these are the ones at risk:
   - the buyer Inventory's **search, filters and sorting** (Q41) — *currently missing*;
   - the **Special ribbon and crossed-out discount price** (Q37) — owner's clarification: the crossed-out figure is a **discount the owner chooses to show**, not a stored "previous" price, and it appears only when set;
   - the **theme toggle**, dark by default (Q7);
   - the **WhatsApp button** placement per screen size (Q40);
   - **empty states** (Q42), the **sold/deleted page** (Q43), the **privacy** link (Q44);
   - office **login / first-run** (Q45–46).
4. All **three widths** behave as `ui-plan.md` says (Q77/Q79) — content identical; presentation per width.
5. **Both modes** on every screen; dark is the default.
6. No screen contradicts a binding spec; any conflict is logged, not silently reconciled.

## Constraints — what must not happen

- **Reconnaissance first:** survey and list before changing a thing.
- The approved design is the yardstick — this task adds no new design.
- The reference screens are read-only.
- Nothing beyond what a screen needs to render is built here (no business-logic, functionality, data-model, or UX work).

## Process — how to work it

**Phase 1 — Recon (the core).** For every screen: what exists, what is missing, what does not match. Compare against `ui-plan.md` and the reference. Put the coverage list in writing.

**Phase 2 — Close every gap** the recon finds, so all UI is done.

## Benchmarks — after this, when…

- …someone asks "is the UI done?", the coverage list answers it, screen by screen.
- …the buyer Inventory opens on any width, it has search, filters and sorting, and the grid/list toggle (Q41).
- …a screen from the approved design is opened, it matches the reference and the `ui-plan.md` answers.
- …a screen is opened on phone, tablet and laptop, in dark and light, it behaves as the width and mode require.

## Evidence left behind

- The screen-by-screen coverage list (done / missing / does not match).
- The list of gaps closed.
