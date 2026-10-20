# TASK-053 — inventory rows per page

**Status:** owner go, 2026-10-20 — build now.
**Owner decision:** 25 rows by default; 10 / 25 / 50 / 100 offered; the choice is remembered in the
browser; no store write.

## What changes

**Files:** `app/office/(shell)/inventory/inventory-client.tsx`,
`app/office/(shell)/inventory/inventory.css`, `lib/inventory-paging.ts` (new, pure rule),
`lib/inventory-paging.test.ts` (new).

- The toolbar gains **10 / 25 / 50 / 100 per page**, defaulting to **25**. The choice is kept in
  `localStorage` (`truespec.office.inventory.page-size`), so it survives a reload without changing a
  database row or requiring a signed-in preference record. If storage is unavailable, the default
  still works.
- The filtered/sorted list is sliced once; both the desktop table and the phone cards render the
  same slice. The count line stays `list.length` / `rows.length` — it never becomes the page length.
- Numbered pages plus **Prev** / **Next**, hidden when there is only one page. The current page is
  clamped when the list shrinks (a delete or a smaller page size).
- Search, state chips, sort and Clear filters all return to page 1. A page-size change returns to
  page 1 as well.
- Page changes focus `#inv-h` and update a polite status line, so the change is announced without
  making the pager a keyboard trap.
- No store write: paging is a view of the rows the page already read.

## The rule, in one place

`pageSlice(rows, page, pageSize)` returns the clamped page, the page count, and the slice. It is pure
and tested: default/choices, first page, remainder, beyond-the-end clamp, empty list, size changes,
and page clamping. The UI uses the same helper, so the table and cards cannot drift.

## Verification

- `npm test` — the new paging tests plus the existing suite.
- `npm run typecheck`.
- `npm run build`.
- The signed-in browser matrix is still blocked by the expired office Clerk session; the report will
  say the pager was not clicked through in a browser.
- Commit: `TASK-005 task 53: page the inventory`.
