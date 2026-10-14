# TASK-004 — brief (functionality, Layer 4 of 6)

**Date:** 2026-10-14 · **Owner's go:** given 2026-10-14 (after two grilling rounds).
**Authority:** `openspec/tasks/TASK-004/task.md` (17 truths, 11 handover answers) + the architecture's
`design.md` (D15–D20), `specs/*` and `tasks.md` (§1.6, §4.1, §4.5, §6.1–6.11).
**Plan / tracker:** `developer-workspace/plans/TASK-004-plan.md`.
**Change-point notes:** `developer-workspace/notes/TASK-004-state.md`.

## What was asked

Make the office **write**. Today every office screen renders and saves nothing; this layer gives the
office a real door and puts every screen behind it on the store.

1. **The door is the identity provider's** — Clerk carries the sign-in, invite-only, mounted at
   `/office/sign-in`; `/office` redirects there with no session; our own `session` row records it.
2. **The state model is ruled (D15)** — four fixed **primary** states (Available, On Order, Landed,
   Sold), exactly one per car and mandatory; the owner's **secondary** states in a link table;
   `car.state_id` becomes NOT NULL; the showroom groups by primary and never shows Sold.
3. **A car's life is real** — create (14 columns), edit, delete → tombstone → 8-second undo →
   the owner's permanent removal, mark sold / un-mark, photos.
4. **The registries are live** — the Settings state editors (car + enquiry) write the store; the
   boards and feeds read real rows; no seed data left.
5. **Uploads become drafts** — a template file → one draft per record, reviewed at `/office/drafts`,
   nothing in `car`/`enquiry` until a save; the code and change-check are given **at the save**.
6. **Taps, settings, export** — the privacy-noticed tap records page + car ref + time only; settings
   save for real (WhatsApp normalised to `+234…`); one action produces a ZIP export.
7. **Resilience** — one shared store guard + a retryable state + error boundaries, office and showroom;
   a cold store never becomes a 500 and never invents a figure.

## What done looks like

- The store rebuilt (`drop → migrate → seed`) with migrations `0020` (state model) and `0021` (drafts);
  `drop → migrate → seed` reproduces the schema and the fleet; running the seed twice moves nothing.
- Every write proved through the UI **and** by asking the store directly; office and showroom **agree**
  on every figure the one rule produces.
- The **ten refusals** proved: no-session office URL, signed-out tab, occupied-state deletion, malformed
  WhatsApp, malformed amount, wrong-format upload, a mutating GET, a browser-supplied `content_hash`,
  an identity change, an unauthenticated export.
- The five gates green in the learned order — `leak-check` → `typecheck` → `test` → `build` →
  `store-freshness` — plus the office reconcile script (extended for the new state model) and the
  browser check.
- Witnesses on disk: baseline gates, DB baseline, refusals, flows, store state + demo marker, wipe dry
  run, opened export; report copied into `openspec/tasks/TASK-004/`.

## Boundaries (must not happen)

- **No redesign of the public boundary** — `lib/serialize.ts`'s allow-list stays the only public path.
- **No change to the change-check** — server-side only; a browser-supplied hash is ignored.
- **No new delete path** — no job, rule or clock removes anything; the only exceptions stay the
  demonstration's own litter (D16/D19's settled two).
- **Not this layer:** per-width interaction polish, the retry state's *wording*, toast/confirm
  presentation (TASK-005); the daily job itself (TASK-006); a Sanity Studio; a mail channel.
- **No secret in the repository**; `product-management/` never edited; nothing deleted on the owner's
  behalf, ever.
- **The office is not safe to leave open while building it** — the door lands first and is proved
  before anything else.
