# Report — RECON-001: Settings state editors (Car states, Customer states) + sub-menu

**Date:** 2026-10-12 · **Layer:** UI only (Layer 1) · **Plan:** `developer-workspace/plans/RECON-001-state-editors.md`
**Source task:** `openspec/tasks/RECON-001/v1.md` · **Parent plan:** `developer-workspace/plans/RECON-001-gap-closure.md` (D8 Settings)

## What was built

The office Settings screen (`/office/settings`) gained a left sub-menu and the two state-editor screens.

- **Sub-menu** — General / Car states / Customer states / Account, switching content **in place**; the URL never changes; opens on General. Vertical rail at ≥820px, horizontal scrollable tab row ≤820px; real `tablist`/`tab`/`tabpanel` roles with arrow-key navigation.
- **General** — the existing three cards (WhatsApp number, Tagline, Currency & cost). **Account** — the Password card, moved verbatim. Hours/social links not built.
- **Car states editor** — a row per built-in state (Available, On the way, At port, Cleared, Landed): drag handle, editable name, colour picker + live label sample, section dropdown (Available / On Order / Landed), "Show as a tab" switch, count of office cars in that state, delete (disabled + tooltip while occupied), and "Add a state".
- **Customer states editor** — the same table **minus the two car-only controls** (no section dropdown, no tab switch), seeded with the board's five dot colours and enquiry counts.
- **Label ink** — computed by relative luminance (near-black or white, whichever reads), shown on the live sample; **no random generator**.
- Everything is **in memory only** — no save button, no storage, reset on reload.

New files: `state-editors.tsx`, `state-seeds.ts`, `colour.ts`. Touched: `settings-client.tsx`, `settings.css`, `settings/page.tsx` (now async, reads `getOfficeCars()` for counts — read-only).

## What was verified (programmatically, over the live page)

Method: `next dev` on `:3210`, the one persistent visible Chrome over CDP `:9222` (runtime-divergence / playwright-core skill — no new browser, no headless, no screenshots). Checks are DOM/computed-style reads, not screenshots (owner direction 2026-10-09).

- **Task 1** — 3 widths × 2 modes: 4 tabs in Q58 order, General default, panel swap, Account shows Password, rail (column) at tablet/laptop + scrollable row at phone, ArrowRight nav, no page overflow. 6/6.
- **Task 2** — car counts **11 / 1 / 1 / 0 / 1** (match the office rows); delete disabled with a correct "why" tooltip while occupied; enabled at 0; add / rename / delete work.
- **Task 3** — samples seeded; ink flips correctly: light `#f5f5f5`→near-black, dark `#101010`→white; green/blues→white, golds→near-black.
- **Task 4** — keyboard ArrowDown swaps rows; pointer drag moves a row to the front.
- **Task 5** — sections seed (Available / On Order / On Order / On Order / Landed); all five tabs ON; section change and tab toggle both work live.
- **Task 6** — customer editor: 5 rows, correct board colours + counts (2/1/1/1/1), **no** section/switch controls (5 columns), add/delete work.
- **Final** — all six width × mode combinations: car editor 5 rows / 5 switches / 5 sections / 7 columns, switch visible; customer editor 5 rows / 0 switches / 5 columns; **no horizontal page overflow anywhere** (390/834/1366). `npm run typecheck` clean.

## What was NOT verified

- **The look** — by owner direction, no screenshots; the owner checks the look by hand. I verified structure/computed values only.
- **Persistence** — deliberately none; nothing was tested to survive reload (it must not).
- **Real data effects** — the editors change nothing on disk or in the DB (by design).

## Bug found and fixed during verification

The editor's `min-width` table was forcing the **page** wide on tablet/laptop (Car states page `scrollWidth 1402` vs viewport 834). Cause: `.setmain > .cards` is a grid and its item `.card` had `min-width:auto`, so the table's min-content sized the track instead of the `overflow-x:auto` container clipping it. Fix: `.setmain .card{min-width:0}` + `.edscroll{max-width:100%}`. After: page = viewport width; the table scrolls **inside** `.edscroll`. Re-verified all six combinations.

## Divergences (logged, not settled)

1. **Reference `office-settings.html`** predates the sub-menu and editors — it has neither. It is read-only; the difference is expected and logged, not reconciled. (v1.md §8.)
2. **ui-plan State-labels section colours** — ui-plan gives On Order = gold; the built inventory keeps On Order blue as-built. Section colours stay as-built here (settling them would ripple into other screens). Logged. (v1.md §10.)
3. **Seed colour token reading** — owner ruling names Available `--ok`, Landed `--warn`, Cleared "its section's colour (gold)". I seeded Cleared `#c8a24a` (`--gold`) and Landed `#b9820b` (`--warn`) to keep them distinct. This is a seed default, freely changed with the picker; flag if the intent was reversed.

## Files (evidence)

- Plan + tracker: `developer-workspace/plans/RECON-001-state-editors.md`
- Checks: `developer-workspace/scripts/{settings-check,state-editor-check,colour-check,drag-check,section-tab-check,customer-check,final-editor-check,overflow-probe}.mjs`
