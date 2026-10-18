# TASK-005 · Task 17 — focus survives a removal and a refusal

**Date:** 2026-10-18 · **Outcome:** done. **Depends on:** 4, 13.

## What changed

**Inventory — after a row leaves.** The delete confirmations were already native dialogs; the
platform returns focus to the control that opened them. That control is the delete button of the
row the person just removed, so the browser has nowhere to put focus and it falls to the document.
The client now records, before the optimistic removal, where the caret should go:

- `data-car-id` on both delete controls — the desktop table's and the phone card's (the same car is
  rendered twice; only one shape is on screen).
- `pendingFocusRef` is set in `confirmDelete` from the **visible** `list`: the next row's car id, or
  `"heading"` when the deleted row had no next row.
- A `useEffect` on `rows` runs one task after the native dialog's `close()` (the close has already
  tried to restore focus to the removed opener), then focuses the next row's delete control or the
  list's heading.
- **`app/office/(shell)/inventory/page.tsx`** — the screen's `<h1>Inventory</h1>` is the list's
  heading and now carries `id="inv-h"` and `tabIndex={-1}` so it can take programmatic focus. This
  file was not in the plan's Files line; the AC needs a heading, and this is the list's only one
  (the page was not owner-dirty).

**Car form — after a refusal.**

- A **client-side** refusal (an amount the panel rejects) focuses the first visible
  `aria-invalid="true"` field in DOM order — the same order the fields appear on the form — before
  returning.
- A **server** refusal focuses the first visible field named by the refusal (`[name]`), skipping
  hidden inputs; when the refusal names no visible field (the store's form-level answer, e.g. the
  car id), it focuses the form's error block.
- The error block now has `ref`, `id="formErr"` and `tabIndex={-1}`; it already had `role="alert"`.
- The effect runs on a new `result`, after the commit that renders the block/field messages.

## Live readings — keyboard, live signed in

`focus-removal-refusal.mjs`, attach-only. Two throwaway demo cars (**TS-1047**, **TS-1048**) were
created through the office's own form, used, undone after each removal, then removed for good
through the tombstones section — **net-zero 25 → 25**, both refs absent at the end.

The list was filtered to the two throwaways (`#q` = the unique brand) so the two cases were
deterministic; the client focuses from the **visible** `list`, which is the filtered list here.

| case | action | focus | pass |
|---|---|---|---|
| middle row | delete TS-1047 (first of the two visible) | `BUTTON.ab.del`, `data-car-id` = TS-1048's id — the next row's equivalent control | ✓ |
| last row | delete TS-1048 (last of the two visible) | `H1#inv-h` — the list's heading | ✓ |
| client refusal | price `"abc"` and was-price `"def"`; submit | `INPUT#f-price` (the first invalid in DOM order; `aria-invalid` was on `f-price` then `f-was`) | ✓ |
| server field refusal | add form with the brand empty; submit | `INPUT#f-brand`; the block read "Could not save. Enter the make" | ✓ |
| form-level refusal | edit TS-1001 with the hidden `carId` tampered to `not-a-car-id`; submit | `DIV#formErr` ("Could not save. This car could not be identified"); the car's `updated_at` unchanged | ✓ |

- The two delete flows were keyboard-only: focus the row's delete control, Enter, the platform puts
  focus on **Keep it**, Tab to **Delete**, Enter. The focus reading is taken after the row leaves.
- After each removal the undo offer was used (`#undo`), restoring the row. The final cleanup removed
  both for good; the tombstones list held both, and both rows left.
- The refusals wrote nothing: the client case returns before the Server Action; the empty-brand case
  is refused by the reader before any insert; the tampered-id edit is refused before any update
  (the existing car's `updated_at` is unchanged). The live count stayed 25 throughout the refusal
  cases.

## Honest notes

- **The heading is the screen's h1.** There is no separate heading inside the client's list panel;
  "Inventory" is the list's heading on this screen. The page file had to change to make it a focus
  target; that is outside the plan's Files line but required by the AC (the same precedence Task 13
  used).
- **The last-row case used the filtered visible list.** The full inventory still had rows below the
  filter; the client's `list` is the visible list, and "no next row" means no next **visible** row.
  The middle/last cases are the two branches of the same `pendingFocusRef` computation.
- **The focus effect is a 0 ms task after the native close.** The platform restores focus to the
  opener (now removed) during `close()`; the task is what lets the list's new shape take it. The
  live run read the intended controls; the timing is deliberate, not incidental.
- **The `[name]` server-error fallback skips hidden fields**, so a `stateId`, `photos` or `carId`
  refusal goes to `#formErr`. That is the form-level path; the `carId` case is the live proof.
- **No screen reader was used.** Focus is read from `document.activeElement`; the error block and
  field messages are `role="alert"` (the block was already). No claim is made about a particular
  screen reader's speech.
- **The two throwaways were our own** (created in this script); the 7 → 7 is the process count of
  the attach-only Chrome, not a new browser. No cleanup fallback ran.
- The undo after a delete sorts the whole `rows` array by ref; that is existing behaviour. It did
  not affect the readings (the filtered list's two rows remained the two throwaways).

## Verification

`npm run typecheck` clean · `npm test` **295/295** · drive `focus-removal-refusal.mjs` (readings in
`runs/task17/readings.json`) · net-zero 25 → 25 · no Chrome launched (7 → 7).
