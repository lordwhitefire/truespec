# TASK-005 follow-up — inventory browsing: closed filter groups, nine cars a page

Owner, 2026-10-19: the filter groups' sub-items *"should not show … unless you click this icon"*;
the cars *"should be paginated. Everything should not just show. It should be limited to, the ones
that can show"*. Plan written first (`plans/TASK-005-plan.md` Phase 13, Tasks 46–49; brief
`briefs/TASK-005-inventory-browsing.md`), then built, then checked live.

## What the owner sees now

- **Filter groups start closed.** Status, Make, Year, Colour and Price show only their summary line
  and the existing +/− indicator (CSS `summary::after`, `app/reference.css:353-354`). A click on the
  summary opens that group; a second click closes it. Groups open independently. Enter/Space works;
  the native `<details>` keeps focus, `open` state and the expanded/collapsed semantics.
- **Nine cars a page.** Only the current page's cars render, in grid and list. With the live store
  (19 cars) that is page 1 = 9, page 2 = 9, page 3 = 1. Numbered buttons plus Prev/Next sit under
  the results; page 1 is current on load and the ends are disabled.
- A page click updates `?page=N`, scrolls and focuses the results heading, and announces
  "Page N of M" in the existing live region. `?page=2` loads that slice directly; `?page=99` clamps
  to the last page and rewrites the URL to `?page=3`. Filters, the sort and Clear all return to
  page 1. Switching grid/list keeps the page. The pager is absent when the result is 9 or fewer
  (e.g. Make = BMW → 3 cars).

## Current truth (after the change)

- `components/site/InventoryBrowser.tsx`
  - `PAGE_SIZE = 9` (line 33).
  - `page` state from `initial.page` (69); `pageCount`, clamped `current`, `shown` slice (123–125).
  - The existing `replaceState` effect adds `page` only when `current > 1` (138–141).
  - `setPage(1)` on Clear all (160), `toggle` (320), min/max (468/482), sort (522).
  - `goPage` (329): clamps, speaks `Page N of M`, focuses `#ttl` with `preventScroll`, then scrolls
    it to the top; `#ttl` is `tabIndex={-1}` (503).
  - The five groups are plain `<details className="fs">` with **no `open`** (386/403/420/437/454).
  - Grid and list both render `shown` (570/575); the pager renders only when `pageCount > 1` (581),
    with `aria-current="page"` (596) and disabled Prev/Next at the ends.
- `app/(site)/inventory/page.tsx:55` — `page` is parsed server-side and floored at 1, so the first
  paint already shows the right slice.
- `app/reference.css:387–394` — `.sv .pg/.pgb` (42 px controls, gold current, wrap at 375) and
  `#ttl` `scroll-margin-top: 80px` + focus outline removal.

No query, API, data or copy change. Paging is client-side: `getPublicCars()` still returns all cars;
every other screen is untouched.

## Live verification (19 Oct 2026, attach-only to Chrome `:9222`)

Fresh run: `node developer-workspace/scripts/task-005/inventory-paging-check.mjs` →
`runs/inventory-paging/readings.json` (+ `progress.log`, screenshots).

- **0 failures.** `npm run typecheck` clean; `npm test` **311/311**.
- 1 desktop window (1440/1024/768) + 1 phone window (375, touch), **both closed**; Chromium
  **6 → 6**; no store writes.
- Collapse: at 1440 and 375, **0/5** groups open on load and **0** options visible
  (`checkVisibility()`); Status opens to its 3 options and a second click closes it; Enter opens
  and closes Make; a Make selection still filters (BMW → **3 of 19 cars**, pager absent).
- Paging: 19 cars → **3 pages, 9 / 9 / 1**. Page 2: 9 cards, URL `?page=2`, announcement
  "Page 2 of 3", focus `#ttl` at **~80 px** under the nav. Last page: 1 card, Next disabled; Prev
  returns to page 2. `?page=2` deep link: 9 cards, page 2 current. `?page=99`: page 3, 1 card, URL
  normalized to `?page=3`. Filter on page 2 → `/inventory?make=BMW` (page 1). Sort on page 2 →
  `?sort=low` (page 1). List view → `?view=list&page=2` and **9 rows**.
- Widths: **3 / 2 / 2 / 1** columns at 1440 / 1024 / 768 / 375; **0 px** horizontal overflow at
  every width; pager inside the viewport; page controls **42 px** tall. Phone: tap page 2 → 9 cards,
  `?page=2`, "Page 2 of 3".

### The first run, and what it taught the check

The first run exited 1 with six failures. All six were **the check, not the product**:

- `A: 0 filter options should be visible, saw 34` (and the second-click assertion sharing the
  metric): `getClientRects()` still reports boxes inside a closed `<details>`; content-visibility
  is the real state. The check now uses `checkVisibility()` (0 closed, 12 when Make is open).
- `?page=99` kept its URL; a filter and the list toggle did nothing; list view reported 0 rows.
  The page is server-rendered, so the card selector matched before React was listening. The check
  now waits for `load` and for React's fiber on `.sv .ip` before interacting; the same probe then
  showed `?page=99 → ?page=3`, `?make=BMW`, and `?view=list` with 9 rows.

The second run was green. No product change was needed between the two runs.

## Not done / out of scope

- The nineteen testing groups in `openspec/tasks/TASK-005/testing.md` remain **deferred** — the
  office Clerk session is expired and Chrome is on the sign-in page. Group 17 and Benchmark 12
  remain person-only.
- The home modal's `/inventory?body=SUV|Sedan` links are dead (observed, not touched).
- The reference site (`:3211`, sibling repo) has neither pagination nor collapsed groups; it was
  not changed. The build keeps the reference design language.

## Commits

`0f17b1b` plan and brief (Task 46) · `dbef89f` groups closed (Task 47) · `447544f` paging (Task 48) ·
Task 49: this note, the check and the report addendum. Nothing pushed.
