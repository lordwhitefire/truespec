# TASK-005 — Inventory browsing (owner request, 2026-10-19)

Follow-up to the approved TASK-005 report (post-checkpoint D, beside Task 45). Plan: Phase 13 of
`developer-workspace/plans/TASK-005-plan.md`.

## What was asked (verbatim)

> "when you click filter option, there is this drop down, right? We have a kind of each drop down,
> like, have items, and these items have sub-items. So, like, the sub-items should not show. You
> understand? Unless you click this icon, you click it for it to show."

> "Then the cars. I feel like the cars should be paginated. Everything should not just show. It
> should be limited to, the ones that can show before it happens."

> "write the plan before you start after you are done check at runtime and record it in the report"

Answered and accepted before the plan: **9 cars per page**, **numbered pages with Prev/Next** (not a
"Load more" button).

## Decoded

1. **Filters** — on `/inventory`, the five groups in the "Refine search" sidebar (Status, Make,
   Year, Colour, Price) start collapsed. Their options show only after the group's summary — the
   +/− icon — is clicked, and hide again on a second click. The platform's `<details>` is the
   control; no new JS.
2. **Cars** — the inventory results are paged: 9 cars per page, numbered pages with Prev/Next, only
   the current page rendered (grid and list views alike).

## Done means

- All five groups collapsed on load; clicking a summary opens/closes its options; filtering still
  works when open; keyboard operation and the existing +/− indicator unchanged.
- 9 cars per page; numbered pages and Prev/Next; `?page=` deep links and survives the URL sync;
  out-of-range clamps; filters/sort/Clear all return to page 1; list view pages too; pager absent
  when the result fits one page; no horizontal overflow at 375/768/1024/1440.
- The plan exists **before** any product code; a fresh runtime check proves every line and is
  recorded in the report (both copies); no push; owner-dirty files never staged.
