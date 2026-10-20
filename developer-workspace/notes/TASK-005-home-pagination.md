# TASK-005 follow-up — the pagination rule beyond inventory

Owner, 2026-10-19: *"pagination is to prevent endless scrolling not swiping"*. The rule applies to a
vertical stack of cars that grows downward; it does not apply to a horizontal carousel / swipe
track. This note records the check, the home-grid build, and the live proof. Plan: Phase 14
(`plans/TASK-005-plan.md`, Tasks 50–53).

## What the rule is, in one line

A list that stacks cars **down the page** is split into numbered pages with Prev/Next; a strip that
moves cars **sideways** (scroll-snap track, arrows, dots) is a slider and gets no pager.

## Where it applies

- `/inventory` — done (Task 48): **9** = three rows of three.
- Home page inventory grid (`HomeInventory`) — built (Task 51): **12** = three rows of four; live
  Available **13 cars → 12 / 1**. On order (6) is one page, no pager.
- Office inventory table — a vertical list too, but a back-office table with its own search/sort.
  Its rows-per-page rule is **Task 53, not built**: it needs the owner's number and a signed-in
  office session (Clerk has expired), so it cannot be checked at runtime today.

## Where it does not apply (checked live)

- Home featured strip: `.sp .sl` shows **3** cards at 1440 and **1** at 375, with arrows and dots,
  and **no `.pg`**.
- Car page “More available cars” / “On the lot right now”: `.rt` computes to
  `display:flex; overflow-x:auto; scroll-snap-type:x mandatory` with Prev/Next, and **no `.pg`**.
- Hero: slides.

## What changed

`components/site/HomeInventory.tsx`: `PAGE_SIZE = 12`; `page` state, `pageCount`, clamped
`current`, `shown` slice; numbered pager + Prev/Next under the grid; `goPage` speaks
“Page N of M”, focuses `#hinv-h` and scrolls it under the nav; tab clicks and the “new since last
visit” event reset to page 1; the count line stays the honest total; no URL state.
`app/reference.css`: `.sv #hinv-h` `scroll-margin-top: 80px` and focus outline.
The pager reuses the existing `.sv .pg/.pgb` styles (42 px controls).

## Live proof (19 Oct 2026, attach-only to Chrome `:9222`)

Fresh run `node developer-workspace/scripts/task-005/home-paging-check.mjs` →
`runs/home-paging/readings.json`: **0 failures**; Chromium **6 → 6**; two windows, both closed;
store untouched.

- Available **13 cars → 2 pages, 12 / 1**; page 1 current, Prev disabled; page 2 = **1 card**,
  Next disabled, URL stays `/`, announcement **“Page 2 of 2”**, focus `hinv-h`, heading top
  **78.9**; Prev returns to 12.
- Tab change from page 2 → **page 1**; On order = **6 cars**, no pager; Available returns to 12.
- Widths: computed grid **4 / 3 / 2 / 1** columns at 1440 / 1024 / 768 / 375; **0 px** horizontal
  overflow; pager inside the viewport; controls **42 px**.
- Phone 375 touch: tap page 2 → **1 card**, current 2, “Page 2 of 2”, 0 overflow.
- Sliders: featured 3 (1 at 375) and no pager; car `.rt` `overflow-x:auto` / `x mandatory`, 0 pager.
- `npm run typecheck` clean; `npm test` **311/311**.

### The check’s own failures, kept honest

The first full run was aborted by the **first-visit welcome dialog** (`dialog#ovl[open]`), which
intercepts every click; the check now closes it as a visitor would (`#mx`) before interacting. The
home page’s `load` event also timed out (remote images), so the check waits for `domcontentloaded`
and React’s fiber instead. Neither was a product failure; no product change was made for either.

## Not done

- **Task 53 — office table**: blocked on a rows-per-page number and a signed-in office session.
- The nineteen testing groups remain deferred (expired session).

## Commits

`e1780c8` plan (Task 50) · `8f97356` home grid (Task 51) · Task 52: this note, the check and the
report addendum. Nothing pushed.
