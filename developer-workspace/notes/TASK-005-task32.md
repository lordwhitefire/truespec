# TASK-005 · Task 32 — A store that cannot be read is never emptiness, never a number

**Date:** 2026-10-19 · **Outcome:** done. **Deps:** 31.

## Wording — verified, not replaced

The two states are on the do-not-touch list (`task.md:259-263`; `05-runtime-observations.md`
§R2.5; D32 / `06-architect-calls.md`). No source change: `git diff` is empty for
`components/retryable.tsx`, `components/store-waking.tsx` and `components/store-state-styles.ts`;
their last change is `7982435` (TASK-004), so the strings have not been replaced or “improved”.

- **Retry** — Task 31's forced-failure legs (`runs/task31/site-page.json`,
  `office-page.json`) recorded, on every reading: **“We couldn’t load this”** /
  **“We tried a few times but the server didn’t answer. Nothing was lost — please try again.”** /
  **“Try again”**.
- **Waking** — fresh live slow-page runs (a temporary 4 s delay in the page, removed) recorded
  **“Just a moment”** / **“Setting things up — this can take a few seconds after a quiet spell.”**
  on both shells, at 375 and 1440.
- The components use typographic apostrophes (`couldn’t`, `didn’t`); the words are the ones quoted
  in `task.md:259-263` and the Designer's ruling (R2.5 itself prints the curly form). No word
  changed.

## Never an empty list, never a count

- **Retry:** every Task 31 inner-leg reading has `falseCount: []` (no `0 OF`, `0 cars`,
  `No cars match` in the state or the body) and `visibleEmptyBlocks: 0`. The retry replaces the
  page's content; no list is rendered beneath it.
- **Waking:** every fresh reading has `falseCount: []` and `visibleEmptyBlocks: 0`. The waiting
  state carries no figure; the real page arrives after it (“TrueSpec Inventory” / “Inventory”).
- The office retry's compact height is the Task 31 scoped rule (`[role="alert"]`); the waking
  state keeps the shared full-page height (`min-height` 812/900 in the readings) — the narrowed
  selector means the wait is untouched.

## Live witness

Temporary 4 s delays were injected at the top of the site and office inventory pages, driven at
**375 × 812** and **1440 × 900**, then removed; both files are byte-identical to their snapshots.
Attached Chrome, no launch (3 → 3). The delay is a slow read, not an error (HTTP 200, no console
errors).

| state | where | reading |
|---|---|---|
| waking | site `/inventory` | `role="status"`, `aria-live="polite"`, exact title/note, spinner; header + footer around it; cleared to **“TrueSpec Inventory”** |
| waking | office `/office/inventory` | same wording; `.shell` grid + `main.main` around it; cleared to **“Inventory”**; full viewport height |
| retry | site `/inventory` (Task 31 throw) | `role="alert"`, exact wording, no count/empty; “Try again” resets |
| retry | office `/office/inventory` (Task 31 throw) | same, inside `main.main` |

The waiting frames were attempted but are **not used as evidence**: the state's fade-in/spinner
and the 4 s window meant the screenshot landed after the wait or before paint. The live DOM
readings above are the evidence (and the Task 31 inner frames already show the retry). Readings
`runs/task32/site.json` / `office.json`; `runs/task31/site-page.json` / `office-page.json`.

## Files-line notes

- The plan marks `components/retryable.tsx` and `components/store-waking.tsx` **verify only**;
  neither changed, nor did `store-state-styles.ts`.
- `app/office/(shell)/error.tsx` is the Task 31 boundary; it is unchanged and is the surface the
  office retry was read from. No Task 32 source change was needed.
- The waking wording renders through the same `StoreWaking` on the site and office loading files;
  the fresh runs exercised both shells, not only the shared component in isolation.

## Verified

Typecheck clean · `npm test` **304/304** · both waking legs **PASS, 0 problems** · retry readings
exact and free of count/empty · delays removed and pages byte-identical · store untouched ·
Chrome 3 → 3. Drive `task32-waking.mjs`; readings as above (`runs/` is gitignored).
