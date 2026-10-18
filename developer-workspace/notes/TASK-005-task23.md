# TASK-005 · Task 23 — the live result is announced exactly once

**Date:** 2026-10-18 · **Outcome:** done. **Deps:** 22.

## What changed

- **`app/reference.css` · `app/(site)/car/car.css` · `app/(site)/not-found/not-found.css`** — the
  `.speak:empty` rule in all three sheets changed from `display: none` to a collapse that keeps
  the region in the accessibility tree while taking no space:
  `display: flex; height: 0; margin: 0; padding: 0; border: 0; overflow: hidden;` — each copy
  carries DR13's reasoning in a comment.
- **`components/site/InventoryBrowser.tsx`** — `#ttl` lost `role="status"`: the result's heading
  is no longer a second live region (comment says which line is the page's one).
- **`app/(site)/car/[ref]/page.tsx`** — **no change**. The plan's Files line listed it; its
  region is already static markup with `role="status" aria-live="polite"`, and the fix for its
  empty state is `car.css`. Recorded as a Files-line discrepancy.
- The announcement wording (bare result) was Task 22's edit; re-read here — still
  **"No cars match those filters."** at zero.

## The ruling followed

**DR13** (`design-workspace/decisions/TASK-005-ux-rulings.md`): keep the region in the
accessibility tree — replace the hide-while-empty with a collapse; one result produces one
announcement; the result's heading must not be armed as well.

## Live readings — signed in, read-only (no writes; the store untouched)

`speak-region.mjs`; readings `runs/task23/before.json` / `after.json`. Chrome 3 → 3, no launch.

| reading | before | after |
|---|---|---|
| inventory `#speak` while **empty** — display | `none` | **`flex`** |
| inventory `#speak` while empty — its own AX node | **not in the full tree** (`partialRole: none`) | **present, role `status`, height 0** |
| car page `#speak` while empty — display / AX node | `none` / not in the tree | **`flex` / present, `status`** |
| inventory unignored `status` nodes (rest · at zero) | **2 · 2** | **1 · 1** |
| `#ttl` — DOM role / AX role | `status` / `status` | **none / `heading`** |
| zero announcement | — | **"No cars match those filters."** |
| `/not-found` route `.speak` | absent | absent (no region on that page) |
| global 404 `.speak` | filled ("Light mode on.") | unchanged |

**Method note.** The region's *emptiness* is the state under test, and no page in this dev
environment rests empty — the inventory announces on mount under StrictMode, the car page greets
via `CarBehaviors`, the global 404 lands a theme line. So the drive uses one labelled DOM probe
per surface: read it as it rests, clear the region's own `innerHTML`, read display/geometry and
the element's own AX-node **membership in the full accessibility tree**, then put the text back.
Nothing leaves the page; a reload restores everything. The AX reading is the same source
Chrome's DevTools accessibility pane reads (`Accessibility.getFullAXTree`).

## Verification

`npm run typecheck` clean · `npm test` **295/295** · drive `speak-region.mjs` · readings
`runs/task23/before.json` / `after.json` · no Chrome launched by the drive.

## Honest notes

- The `/not-found` route (`app/(site)/not-found/page.tsx`) renders **no `.speak` element at
  all**, so `not-found.css`'s rule is currently unreferenced; it is fixed anyway because DR13
  named it and the mechanism must not hide a region wherever one appears. Recorded.
- While collapsed, the region still occupies its container's **width** (882 px on the inventory;
  the element is block-level) — it takes **no vertical space** (`height: 0`, no margins,
  padding or borders). This is the collapse DR13 asks for, not `sr-only` clipping.
- In production the inventory region would rest empty (the announcement is skipped on the first
  render); in dev StrictMode fills it on mount. The probe covers the empty case in both worlds.
- Office surfaces untouched by this task.
