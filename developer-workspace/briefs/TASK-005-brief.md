# Brief — TASK-005 (UX. Layer 5 of 6)

**Written 2026-10-17.** The Developer's one-page brief, before any code.

## What was asked

Build `openspec/tasks/TASK-005/task.md` — the UX layer. The product works; in a few places it **tells little
lies**. This layer makes the experience true. Nine requirement areas (A–I): true feedback, the undo window,
dialogs and focus, empty states and the live region, a car with no photos, the narrow-width office and the
showroom's chrome, the contact number, the store being unreadable, and the not-found family.

The owner's rule, given 2026-10-17:

> *"the only thing that is fake is data… button that cannot do anything should not be excused by demo."*

## What done looks like

`task.md`'s twelve outcome benchmarks, driven live on `:3210`, plus every requirement's own acceptance criteria.
The proof is a live witness record with numbers, not an assertion.

## What the owner widened (grilling, 2026-10-17)

1. **The offline draft becomes real** (ruling Q11). The approved offline line says *"your draft is kept on this
   device"*; rather than soften the line, the owner asked for the feature — a device-side draft for the forms
   that hold typing (the car form and the settings cards; there is no enquiry form). This **is** a new feature
   and widens `task.md`'s own "adds no feature" line; it is logged, not hidden (`notes/TASK-005-rulings.md`).
2. **Everything else, all of TASK-005** in this session, one commit per task.
3. **Two wording slots** drafted by the Developer and approved with the plan: the waiting sign and the office
   not-found (copy sheet in `plans/TASK-005-plan.md`).
4. **The offline path is client-side only** (no service worker); the residual (a hard reload while offline
   still exits the app) is recorded.
5. **The gradient** for the empty photo box is derived deterministically from the car's reference code, with a
   sample shown for sign-off.
6. **A draft is erased only by an act** — save, discard, sign-out — never by a clock.

## Constraints carried

No manual Refresh (SD1) · no alert/popup/sound for taps (SD2) · no in-app password reset (SD3) · no exchange-rate
field (SD4) · no price on a state (SD5) · never invent a value (SD6) · never silently drop or zero (SD7) · never
hide a gap (SD8) · never an error page (SD9) · nothing deleted by the system and nothing on a clock (SD10) ·
customer data never outside the office (SD11) · the provider's sign-in failure message stands (SD12) · a draft
never counts as a record (SD13) · failure wording is gold + icon + words, never colour alone (`tasks.md:73`).
The store is live and holds the owner's real data: every write throwaway or net-zero, demo-marked; destructive
tests on copies.

## Not this layer's work

TASK-006's daily job; architecture's "section" → "primary state" vocabulary debt; TASK-003's named carry-overs;
TASK-004's unverified items except the 503 paths. Named, not absorbed.

## How the build is run

Plan: `developer-workspace/plans/TASK-005-plan.md` — 44 tasks in 12 phases, one commit per task, gates and owner
checkpoints where the plan says. Verification: `npm run typecheck` → `npm test` → live drive on `:3210` (the
project's attach-only browser procedure) → `npm run build` → `npm run leak-check`.

## Handed to the testing pass

`task.md`'s **Q-003** — the first-time-visitor walk — needs a **person**, not an agent, and stays in
`testing.md` as its own group.
