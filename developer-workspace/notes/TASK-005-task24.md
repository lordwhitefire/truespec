# TASK-005 · Task 24 — The honest count, and clearing lives in the panel

**Date:** 2026-10-18 · **Outcome:** done. **Deps:** 22, 23.

## What the task asked, and where it landed

The AC names two guarantees: the count is the honest count; clearing the filters lives in the
filter panel — not duplicated beside the empty block.

- **The showroom was already conformant — witnessed, not touched.** Over-filtered to zero, the
  heading reads **"0 MATCHING CARS"** with the band at **"0 OF 19 CARS"**; the *only* clear
  control is `#clr` "Clear all filters" inside the filter panel (`.sb`) — the empty block
  contains none (`emptyHasClear: false`). At 375 the panel's clear sits behind `#sbt`
  (`aria-expanded` "true") and clicking it restores the result ("ALL INVENTORY", 19 cars).
- **The office carried the real duplication, and this task removed it.**
  `app/office/(shell)/inventory/inventory-client.tsx`: the cards view's empty block (`#emptyC`)
  sat **outside** the `.cards` container (a sibling), so at desktop widths — where `.cards` is
  `display: none` — it stayed on screen *next to* the table's own empty block (`#emptyT`,
  correctly inside `.panel.tbl`). The office printed *"No cars match. Clear the search or pick
  another state."* + *"Clear filters"* **twice on one screen** at 1440 (screenshot pair in
  `runs/task24/`). Moved inside `.cards` — now each view carries its own empty block and exactly
  one is visible per width, the `#emptyT` pattern. Wording and count untouched.

## Live readings — signed in, read-only (no store writes)

`honest-count.mjs`; readings `runs/task24/before.json` / `after.json`; Chrome 3 → 3.

| reading | before | after |
|---|---|---|
| office 1440 — empty blocks visible (`.empty2`) | **2** (y=409 and y=656, identical text) | **1** (the table's, inside `.panel.tbl`) |
| office 1440 — "Clear filters" visible | **2** | **1** |
| office 375 — empty blocks visible | 1 (the cards') | 1 (unchanged) |
| office count, both widths | "0 of 25 cars match" | identical |
| office block text | — | **byte-identical** |
| showroom 1440 (zero) | "0 MATCHING CARS" · "0 OF 19 CARS" · clear only `#clr`, in the panel | identical |
| showroom after `#clr` click | "ALL INVENTORY" · "19 CARS" · empty gone | identical |
| showroom 375 (panel closed → opened) | same heading/count; `#clr` hidden until `#sbt`, then visible | identical |

Screenshots (`runs/task24/`): `before-office-1440.png` (two stacked blocks) ·
`after-office-1440.png` · `after-office-375.png` · `site-zero-1440.png`.

## Verification

`npm run typecheck` clean · `npm test` **295/295** · drive + screenshot probe on the live
signed-in build · no store writes (client-side filters only).

## Honest notes

- The office's empty block still exists **twice in the DOM** — one per view container, the
  page's standing pattern (every control exists in both the table and the cards view, one hidden
  per width). Exactly one is ever *visible*; the duplicate `id="clearf"` in the DOM is
  pre-existing and left as-is. The on-screen duplication is gone.
- Files-line discrepancies: `app/(site)/inventory/inventory.css` does not exist — the showroom's
  styles live in `reference.css`, and no stylesheet change was needed.
  `components/site/InventoryBrowser.tsx` needed no change (Task 22's wording stands; the
  heading/count/clear were already conformant). The office client (the Files line's third file)
  is where the change landed.
- The office zero states' wording kept per **B1 / Part D** (ruled fine — not reworded); only the
  block's placement was fixed.
- The Phase-2 observation did not catch the office doubling because the office zero state was
  observed at 375, where only one block shows. Found here by enumerating every visible copy and
  screenshotting at 1440.
