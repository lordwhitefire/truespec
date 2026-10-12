# Implementation Plan: RECON-001 — the two state editors (Car states, Customer states)

**Source task:** `openspec/tasks/RECON-001/v1.md` (with Round 1 + Round 2 owner decisions recorded there).
**Parent plan:** `developer-workspace/plans/RECON-001-gap-closure.md` (D8 — Settings). This plan is the state-editor slice of D8; it does not replace the parent.
**Date:** 2026-10-12. **Layer:** UI only (Layer 1). **Task-list target:** this file's Task List section (Developer workspace, per this project's convention). No `tasks/todo.md` — the project's plans live in `developer-workspace/plans/`.

---

## Progress tracker

_Updated as work lands. Legend: ⬜ not started · 🟨 in progress · ✅ done+verified · ⛔ blocked._

| # | Task | Status | Notes |
|---|------|--------|-------|
| — | Pre-flight: interview + fact map | ✅ | Owner confirmed shared understanding 2026-10-12 |
| 1 | Sub-menu + in-place panels | ✅ | Live-checked 6/6 (3 widths × 2 modes): tabs, panel swap, keyboard nav, no overflow. Files: settings-client.tsx, settings.css |
| 2 | Shared editor table + seeds + counts + add + delete-guard tooltip | ✅ | Live-checked: counts 11/1/1/0/1, delete guarded + tooltip, add/rename/delete |
| 3 | Colour picker + live label sample + contrast ink | ✅ | Live-checked: samples seeded, ink by luminance flips light↔dark correctly |
| 4 | Drag reorder — HTML5 + keyboard | ✅ | Live-checked: keyboard swapped 0↔1; pointer drag moved Landed to front |
| 5 | Car-only controls — group dropdown + "Show as a tab" switch | ✅ | Live-checked: sections seed, all tabs ON, section change + tab toggle |
| 6 | Customer states editor + responsive + both modes | ✅ | Live-checked: 5 board colours/counts, no section/tab, add/delete |
| 7 | Evidence, divergence log, report | ✅ | Report + divergence note written; OFFICE-tracker updated |

**Data source — resolved by inspection (2026-10-12):** the office DB is reachable (`tsx --env-file=.env.local` against `.env.local`). Demo rows: 15 cars — Available 11, On the way 1, At port 1, Cleared 0, Landed 1 (plus one *sold* car the office renders as "Sold", so it is not a state row). Enquiries are a hardcoded client seed (6): New 2, Talking 1, Negotiating 1, Sold 1, Lost 1. **Decision:** `settings/page.tsx` becomes an async route reading `getOfficeCars()` (exactly as `inventory/page.tsx` does) and passes car counts to the client; customer counts come from the board's demo seed. Read-only — nothing stored.

**Checkpoints:** A ✅ · B ✅ · C ✅ · D ✅.

---

## Overview

The office Settings page (`app/office/(shell)/settings/`) today is a single route rendering four cards, with no sub-menu and no state editor. This builds the missing piece: a **left sub-menu** (General / Car states / Customer states / Account) that switches content in place on `/office/settings`, plus the **two state-editor screens** — Car states (Q59) and Customer states (same table minus the two car-only controls). Nothing is stored or saved; the screens render from the built-in state list, edits are live and in memory, and everything resets on reload.

## Architecture decisions

- **One route, in-place switching.** No new routes; `/office/settings` never changes URL. Panels swap client-side. (Owner Round 1 §1, §13.)
- **Settings split.** General keeps three cards (WhatsApp number, Tagline, Currency & cost); **Account holds the Password card, moved verbatim**; hours/social links not built. (Owner Round 1 §2, §3.)
- **One shared editor component** with the car-only controls (group dropdown, "Show as a tab") conditioned on a flag — "Customer states is the same table minus the two controls" (v1.md §3).
- **Edits live and in memory; no save button; reset on reload.** Add appends "New state", inline-editable. (Owner Round 1 §5.)
- **Drag = native HTML5** (the pattern the enquiries board already uses) **plus a focusable keyboard move**, no visible clutter. (Owner Round 1 §6.)
- **Label ink by relative luminance** — near-black or white, whichever reads against the picked colour — shown on the live sample beside the picker. (Owner Round 1 §7.)
- **Seeds reuse only colours that already exist** (Owner Round 1 §8, Round 2 §11, §12):
  - Car states: Available `--ok` green; On the way, At port `#3a7bd5` blue; Cleared gold; Landed `--warn` gold. All five "Show as a tab" ON. Special is not an editable row (the ribbon, fixed gold).
  - Customer states: New `#3a7bd5`, Talking `#b9820b`, Negotiating `#c8a24a`, Sold `#0e7a3e`, Lost `#8a9096` (the board's dot colours).
  - New rows: group = Available; colour neutral until picked; tab ON (car) / neutral colour (customer).
- **Section colours stay as-built; the divergence is logged, not settled.** ui-plan's State-labels table (On Order = gold) is not applied here (would ripple into other screens). (Owner Round 2 §10.)
- **Counts = the office demo rows in `lib/office.ts`** sitting in that state; zero for empty; delete disabled while count > 0, with a tooltip saying why. (Owner Round 1 §9.)
- **Verification follows the parent plan's owner direction (2026-10-09): no screenshots — the owner checks the look by hand.** The Developer verifies programmatically over the live page (DOM present, computed styles, no horizontal overflow, control states) via `playwright-core` + system Chrome. Both modes = dark default + light toggle.

## New / touched files (expected)

- `app/office/(shell)/settings/settings-client.tsx` — add sub-menu + panel routing.
- `app/office/(shell)/settings/settings.css` — sub-menu, editors, tooltip, switch styles (both modes, all widths).
- `app/office/(shell)/settings/state-editors.tsx` — **new**: the shared editor (car + customer).
- `app/office/(shell)/settings/state-seeds.ts` — **new**: the two built-in state lists + seed colours.
- `app/office/(shell)/settings/colour.ts` — **new**: relative-luminance ink helper.
- `lib/office.ts` — read only (counts source). No change.

---

## Task List

### Phase 1 — The frame

- [ ] **Task 1: Settings sub-menu + in-place panels** (M)
  Add the left sub-menu (General / Car states / Customer states / Account) to the Settings screen, switching panels in place. General shows the existing three cards (WhatsApp, Tagline, Currency & cost); Account shows the Password card moved verbatim; Car states and Customer states show a placeholder panel for now. Settings opens on General; the URL never changes. The sub-menu is a vertical rail at ≥820px and a horizontal, scrollable tab row ≤820px, with proper `tablist`/`tab`/`tabpanel` roles and keyboard arrow navigation.
  **Acceptance criteria:**
  - [ ] Four items, in Q58 order; General / Account panels as ruled; editors show a placeholder.
  - [ ] Opens on General; switching is in place; URL stays `/office/settings`.
  - [ ] Rail at laptop/tablet; scrollable tab row at phone; holds in dark and light.
  - [ ] Tab roles + arrow-key navigation work.
  **Verification:** `npm run typecheck` and `npm run build` pass; live-page check at phone/tablet/laptop × dark/light (sub-menu renders, no horizontal overflow, active panel correct).
  **Dependencies:** None. **Files:** `settings-client.tsx`, `settings.css`.

### Checkpoint A (after Task 1)
- [ ] Builds clean; sub-menu works at all three widths, both modes; existing cards still function.

### Phase 2 — The editor core

- [ ] **Task 2: Shared editor table + seeds + counts + add + delete-guard tooltip** (M)
  Build the shared editor component and render the **Car states** editor from seeds: a row per state with the drag handle (present, not yet active), editable name, count of demo cars in that state, a delete button disabled with a tooltip while count > 0, and an "add" action appending "New state". Introduce the shared tooltip look (ui-plan Q74) as a small local component.
  **Acceptance criteria:**
  - [ ] Car editor lists the five built-in states in order with correct counts from `lib/office.ts`.
  - [ ] Name edits live in memory; Add appends "New state", inline-editable.
  - [ ] Delete disabled with a "why" tooltip while count > 0; enabled at 0; nothing persists on reload.
  **Verification:** typecheck + build; live-page DOM check (5 rows, counts match inventory, disabled state + tooltip text); no load errors.
  **Dependencies:** Task 1. **Files:** `state-editors.tsx`, `state-seeds.ts`, `settings.css`.

- [ ] **Task 3: Colour picker + live label sample + contrast ink** (M)
  Add the colour picker per row with the live sample of the written label beside it (Q64), and the relative-luminance helper that picks near-black or white ink for the sample. Picker is the only way in — no random generator.
  **Acceptance criteria:**
  - [ ] Each row has a picker showing the seed colour; sample shows the state name in the seeded colour with readable computed ink.
  - [ ] Changing the picker updates colour + ink live; ink follows luminance for light and dark colours.
  - [ ] No random-generator control exists anywhere.
  **Verification:** typecheck + build; live-page check sampling a light and a dark colour and reading the computed ink; both modes.
  **Dependencies:** Task 2. **Files:** `colour.ts`, `state-editors.tsx`, `settings.css`.

### Checkpoint B (after Tasks 2–3)
- [ ] Builds clean; car editor renders, edits, counts, guards, colours, and reads at all widths/modes.

### Phase 3 — Interaction and the customer variant

- [ ] **Task 4: Drag reorder — HTML5 + keyboard** (S/M)
  Make the drag handle reorder rows: native HTML5 drag (the enquiries-board pattern) up/down, plus a focusable keyboard move (e.g. arrow keys on the focused handle) with no visible clutter. Order is in-memory only.
  **Acceptance criteria:**
  - [ ] Dragging a row with the handle changes its order; visual feedback on drag-over.
  - [ ] Keyboard-only reorder works from the handle; the affordance is focusable and unobtrusive.
  - [ ] Reorder resets on reload; no persistence.
  **Verification:** typecheck + build; live-page check of pointer drag and keyboard move changing DOM order; both modes.
  **Dependencies:** Task 2. **Files:** `state-editors.tsx`, `settings.css`.

- [ ] **Task 5: Car-only controls — group dropdown + "Show as a tab" switch** (M)
  Add the group dropdown (Available / On Order / Landed, always one set) and the "Show as a tab" switch (an inventory filter only, never a showroom tab), both live in memory, defaulting as ruled. Build the switch control (none exists in the codebase).
  **Acceptance criteria:**
  - [ ] Group dropdown shows the three sections, always set, seeded correctly, changeable live.
  - [ ] "Show as a tab" switch toggles live; seeded ON for all five; it never affects the showroom.
  - [ ] Both are absent from the customer variant (proved in Task 6).
  **Verification:** typecheck + build; live-page check of dropdown options + switch states; both modes.
  **Dependencies:** Task 2. **Files:** `state-editors.tsx`, `settings.css`.

- [ ] **Task 6: Customer states editor + responsive + both modes** (M)
  Wire the Customer states panel to the same component with the two car-only controls removed, seeded with the five board dot colours and enquiry counts. Make both editors hold at phone (table → stacked/scrolling layout per the layer's conventions), tablet, and laptop, in dark and light.
  **Acceptance criteria:**
  - [ ] Customer editor: drag, name, colour + sample, enquiry count, delete-guard + tooltip, add; no group dropdown, no tab switch.
  - [ ] Car editor keeps both car-only controls.
  - [ ] Both editors hold at phone/tablet/laptop, dark/light; no horizontal overflow.
  **Verification:** typecheck + build; live-page check of both editors at all three widths × both modes.
  **Dependencies:** Tasks 4, 5. **Files:** `settings-client.tsx`, `state-editors.tsx`, `settings.css`.

### Checkpoint C (after Tasks 4–6)
- [ ] Both editors complete and interactive; benchmarks in v1.md met; all widths/modes hold.

### Phase 4 — Evidence and close

- [ ] **Task 7: Evidence, divergence log, report** (S)
  Log the two divergences (reference `office-settings.html` lacks the sub-menu/editor; ui-plan State-labels section colours vs as-built) — already recorded in v1.md §8/§10; reference them in the report. Write the honest report to `developer-workspace/reports/` and update `OFFICE-tracker.md`.
  **Acceptance criteria:**
  - [ ] Report states what was built, what was verified (and how), what was not verified.
  - [ ] Both divergences logged with pointers to v1.md.
  - [ ] Tracker row updated.
  **Verification:** report file exists and is accurate; tracker updated.
  **Dependencies:** Tasks 1–6. **Files:** `developer-workspace/reports/`, `OFFICE-tracker.md`.

### Checkpoint D (final)
- [ ] All v1.md benchmarks met; build clean; honest report written.

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Colour-picker + contrast ink are net-new (no precedent in repo) | Med | Isolate in Task 3 with a single luminance helper; test light and dark colours explicitly. |
| Keyboard-accessible drag with no precedent | Med | Follow enquiries-board HTML5 pattern; add a focusable arrow-key move as the fallback; verify by keyboard only. |
| Snapshotting the existing settings page (moving Password) could regress the cards | Med | Task 1 keeps the card implementation verbatim; verify each card still works after the move. |
| `lib/office.ts` row shape for counts unknown until read | Low | Read the module at Task 2 start; counts must match the inventory screen it already feeds. |
| No reference for the editors — "no new design" must hold | Med | Follow ui-plan Q58/Q59 + the 2026-10-12 ruling only; reuse existing tokens/components; log divergences. |

## Open questions

- None outstanding — the design tree is closed (v1.md Rounds 1 + 2). Any new question stops the work and goes to the owner.

## Definition of done (from v1.md benchmarks)

Someone opening Settings sees the sub-menu with Car states and Customer states; the owner can add, rename, drag, set the section, pick a colour, toggle "Show as a tab", and see the cars-using count, and cannot delete an occupied state (disabled + tooltip); the same for Customer states (colour included, no section/tab controls); both hold at phone/tablet/laptop in dark and light; nothing stored; nothing built beyond these two screens and the sub-menu.
