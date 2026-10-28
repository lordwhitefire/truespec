# LAUNCH-001 — Task 7 report

**Date:** 2026-10-27
**Scope:** C4, C6 and C7 (inventory part) — keyboard operation, visible focus, live result
counts, non-colour state cues, and dialog focus/Escape behaviour.
**Status:** public showroom runtime pass; office inventory code pass; office signed-in runtime
NOT RUN — the owner/testing session does the office sign-in and screen-reader pass.

## What changed

**Public inventory**

- `components/site/InventoryBrowser.tsx`
  - The live region now carries the result only: “N cars match.” / “No cars match those filters.”
    The price pitch was removed, so the region answers the change rather than advertising.
  - A 400 ms settle on filter changes stops a typed price from being read digit by digit.
  - Clear all no longer speaks a second message that the filter effect immediately overwrote; the
    effect announces the cleared count.
  - The list image link is `tabIndex={-1}` and `aria-hidden`; the title link is the single
    keyboard/AT link to the car.
  - Each Share button is named for its car (`Share Toyota Camry …`), not just “Share”.
- `app/reference.css`
  - The paging focus target no longer suppresses its outline. The result heading now shows the
    same visible focus ring as every other control.
  - The view button’s pressed state has an inset dark ring in addition to the gold fill; the
    current page number is underlined in addition to `aria-current`.
  - The global focus ring is now gold plus a 2 px dark inner ring, so the indicator clears the
    focus-appearance contrast threshold on light and dark surfaces.

**Office inventory and shell**

- `app/office/(shell)/inventory/inventory-client.tsx`
  - The hidden `pgstatus` live region now says “N cars. Page X of Y”, so the office count is
    announced with the page change.
  - Filter chips expose `aria-pressed`.
  - Clear filters moves focus to the search field; Undo moves focus to the inventory heading; if
    the offer’s timeout hides Undo while it has focus, focus returns to the heading.
- `app/office/(shell)/inventory/inventory.css`
  - Chips and the current pager page carry an underline as a non-colour cue.
  - Search/select controls get the visible outline on `:focus-visible` (the mouse-focus border
    remains).
  - The mobile bottom-nav current item gains weight.
- `app/office/(shell)/office.css`, `components/office/MoreSheet.css` — bottom-nav current item
  gains weight, not colour alone.
- `components/office/OfficeNav.tsx`, `components/office/OfficeBottomNav.tsx` — current page and
  the current More section expose `aria-current`; the More button’s accessible name says when it
  is the current section.
- `components/office/Dialog.tsx` — audited, no change: it moves focus in, closes on Escape and
  returns focus to the trigger.

## Verification

**Code gate (helper):** `npm test` 513 pass, 0 fail; `npm run typecheck` pass; `npm run build`
pass. The current build is served on `:3210`.

**Public keyboard walk** — `developer-workspace/scripts/LAUNCH-001/keyboard-check.mjs`, attach-only,
1440×900 and 390×823, existing build tab, no screenshots:

- 38 checks pass. Filter group and checkbox, sort, view and paging are keyboard-operable; focus
  stays on the control and the ring is visible. Paging moves focus to `#ttl`, whose ring is now
  visible, and the live region announces the page.
- The live region is `role="status"`, `aria-live="polite"`; filter changes announce the count; the
  price pitch is absent; clear all keeps focus on the stable button.
- The list view has `aria-pressed`, an inset pressed ring, rows, one keyboard link per car and a
  car-specific Share name.
- A car opens from the keyboard and the browser Back returns to the inventory.
- The WhatsApp notice opens as a native dialog, moves focus inside, closes on Escape and returns
  focus to the link.
- 0 console errors, 0 page errors on the public desktop and mobile passes; tabs 6→6; Chromium 1→1.

**Office walk:** NOT RUN. `/office/inventory` redirected to `/office/sign-in`; the build tab has no
office session. The office inventory changes above are typechecked and built, and the office
`Dialog.tsx` is structurally correct, but the signed-in keyboard/screen-reader pass belongs to the
owner/testing session. No destructive office action was taken.

**Grayscale state/error/success** — `developer-workspace/scripts/LAUNCH-001/grayscale-check.mjs`,
CSS `filter: grayscale(1)`, no screenshots:

- 13 checks pass. The active view keeps its inset ring; the current page keeps its underline; the
  filter control is a native checkbox; the inventory state chips are text.
- A price floor that matches nothing renders a text empty state and a text live region.
- The Share success toast is text (`Link copied`) with `role="status"`.
- The car detail page keeps its state as text and has one `h1`.
- 0 console errors, 0 page errors; tabs 6→6; Chromium 1→1.

**No visual regression:** `verify.mjs` on `/` and `/inventory` at 390, 560, 820 and 1440 — eight
runs, each one `h1`, correct canonical, overflow 0, 0 console/page errors, tabs 6→6, Chromium 1→1.

## Notes

- The office form error/success grayscale check is not part of this inventory pass; it belongs to
  the independent testing session’s C6. The inventory state, empty and share-success messages are
  covered above.
- The focus-ring change and the view/pager/chip underlines are visible only on keyboard focus or
  active state. The owner’s visual look check for home/door remains pending; these active-state
  cues are intentional accessibility additions, not layout changes.
- The public live region is debounced; the office `pgstatus` is not. The office screen-reader
  pacing is part of the signed-in testing pass.
- Evidence: `developer-workspace/scripts/LAUNCH-001/keyboard-check.mjs`,
  `developer-workspace/scripts/LAUNCH-001/grayscale-check.mjs`, and the `verify.mjs` runs above.
