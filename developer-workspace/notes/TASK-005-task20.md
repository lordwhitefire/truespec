# TASK-005 · Task 20 — the narrow-width More cell reaches three destinations

**Date:** 2026-10-18 · **Outcome:** done. **Deps:** 18.

## What changed

`components/office/OfficeBottomNav.tsx` — the fifth cell was a `Link` to Settings wearing a gear
icon; it is now a **real control**: a `<button>` labelled “More”, `aria-expanded` (the state),
`aria-haspopup="dialog"`, `aria-controls="more-sheet"`, icon `fa-ellipsis` — “more things”, not
Settings. It lights on **all three** paths it reaches (drafts, activity, settings) and while the
sheet is open. The other four cells are unchanged.

`components/office/MoreSheet.tsx` (new) — the sheet: the platform's modal (`Dialog`, Task 13),
`dismissOnBackdrop` (navigation is not destructive — Task 16's opt-in; escape and outside tap both
close it). Inside: heading “More” (the cell's existing word — no new copy), then the three
destinations in the **sidebar's order and the sidebar's words** (`OfficeNav.tsx`): Drafts, Activity
log, Settings. Each is a `Link`; the one matching the current path carries `aria-current="page"`
and the `.on` class; a choice closes the sheet (`onClick={onClose}`) as it navigates.

`components/office/MoreSheet.css` (new) — **beyond the plan's Files line** (AC governs; see below).
The office's page stylesheets are self-contained copies, and the dashboard/activity/settings sheets
carry no dialog rules (their pages have no dialog). The sheet is a shell component rendered on
every office page, so its base rules travel with it: the Task 13 `dialog.ovl` block (identical
values where a page sheet also has it), the `.bnav button` look (the bottom-nav anchor look, for a
button), and the `.msheet` card/rows. The plan's `app/office/(shell)/office.css` is **not loaded
shell-wide** (each page imports its own sheet; `layout.tsx` carries the comment saying so) and
needed **no change** — a Files-line discrepancy, recorded here rather than “fixed” by loading
`office.css` everywhere (which would inject dashboard rules into every page).

## Why not `office.css`

Verified before building: `grep` shows each office page sheet carries its own `.bnav` copy; the
shell layout imports no CSS by design; `office.css` is imported only by the dashboard and the
office 404. A CSS import inside the new component is served by the app's bundler and rides the
shell on every office page — checked live: the `msheet` rules are present in the served
stylesheets on `/office` and the component renders everywhere the bottom bar does.

## Live readings — signed in, read-only

`more-sheet.mjs`; readings `runs/task20/readings.json`. No store writes; Chrome 6 → 6 (attach-only).

| width | reading |
|---|---|
| **375** | cell `BUTTON` “More”, icon `fa-solid fa-ellipsis`, `aria-expanded="false"`, `aria-haspopup="dialog"`, `aria-controls="more-sheet"` → keyboard Enter opens: dialog `:modal` true, accessible name **“More”**, focus entered **“Drafts”**; rows exactly `[Drafts, Activity log, Settings]` with their hrefs; Tab cycle `Activity log → Settings → BODY → Drafts` (nothing behind the sheet ever takes focus); **Escape** → closed, focus back on the cell, `aria-expanded="false"`; **outside tap** at (6,6) → closed, focus back; **a choice** (Tab + Enter on “Activity log”) → `/office/activity`, sheet closed, cell lit; reopening shows the **Activity log** row current |
| 375, other paths | `/office/drafts` → cell lit, current row **Drafts**; `/office/settings` → cell lit, current row **Settings** |
| **768** | `.bnav` is `grid`; the sheet opens `:modal` with the same rows → PASS |
| **1280** | `.bnav` `none`; the sidebar reads `[Drafts, Activity log, Settings]` — the order/wording the sheet's list is checked against, read from the sidebar itself |

## Verification

`npm run typecheck` clean · `npm test` **295/295** · drive `more-sheet.mjs` **PASS** · readings
`runs/task20/readings.json` · no Chrome launched.

## Honest notes

- The outside-tap close is a pointer gesture (that is the AC's word “tap”); open, tab cycle,
  Escape, and the choice were all driven by keyboard only.
- The sheet's heading reuses “More” — the word already on the cell — and the rows reuse the
  sidebar's words, so no new user-facing copy was introduced.
- `aria-haspopup="dialog"` (not `"menu"`): what opens is a modal sheet of links, which is what a
  dialog is; the rows are navigation, not a menu widget.
- The icons on the rows mirror the sidebar's own (`fa-inbox`, `fa-list-check`, `fa-gear`); only
  the **cell's** icon changed (gear → ellipsis).
