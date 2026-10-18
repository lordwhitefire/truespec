# TASK-005 · Task 19 — the car form's delete really deletes, with the same undo

**Date:** 2026-10-18 · **Outcome:** done. **Deps:** 5, 10, 12.

## What changed

`app/office/(shell)/car/car-client.tsx` — the delete dialog's button no longer says
*"Car deleted (demo)."*; it calls the real store write and holds the offer the inventory holds:

- `doDelete()` calls `deleteCar(id, { revalidate: false })`; on success it records the car's
  `{ id, label }`, sets `undoOn`, and shows **“<make model year> deleted.”** with the **Undo**
  button (the existing `#tundo`, previously `hidden` and dead, is now wired).
- The offer's clock is the same bar: the `utick`/`ubar` markup is rendered while `undoOn` is true,
  `animation: undodrain 8000ms linear forwards`, its own `onAnimationEnd` (name-guarded) closes the
  offer. The failsafe timeout is 12 000 ms (Task 12), reduced motion swaps the bar for the static
  **“8 s”** label and the timer is the clock (Task 11) — the inventory's mechanism, on this screen.
- `expireOffer()` closes the offer and `router.push("/office/inventory")`: when the window ends with
  no undo the car is a tombstone and this editor has no car left to hold; the inventory is where a
  tombstone is dealt with.
- `undoDelete()` calls `undoDeleteCar` — the same restore the inventory uses; the form stays and the
  car is live again.
- `#delBtn` is hidden while the offer is open (the car is a tombstone; a second delete is not a
  thing that can happen).

`app/office/(shell)/car/car.css` — the bar's rules, beside the route's own toast rules (this
project's route sheets are self-contained; `inventory.css` is not loaded on the car route):
`overflow:hidden` on `.toast`, the `.utick/.ubar/@keyframes undodrain` block, `.usec`, and a
`.toast button` rule. **Beyond the plan's Files line** (AC governs; nothing was in car.css to
reuse).

`app/office/actions/car.ts` — `deleteCar` gained an options object: `deleteCar(carId, { revalidate = true })`.
(The plan's Files line named this file, and it did need the change — see below.)

## The defect the drive found

The first two drive runs failed **after** a real delete, on the reload. Reading the live page
rather than guessing: URL `/office/car/TS-1054`, `<h1>` *“THAT PAGE ISN'T IN THE OFFICE”*, no toast —
the editor had been swapped for the office 404 **while the offer was still running**. Cause:
`deleteCar` calls `revalidateCarPaths()` (which covers `/office/car`); the Server Action's response
re-renders the current route, and for a now-tombstoned car that route answers 404. The undo offer
lives in the car form, which the swap unmounts. Case 1 only ever passed because its Undo fired
before the swap; case 2, which sampled the bar first, always lost the race. (The inventory never
had this problem: its route stays valid after a car is deleted, so the re-render keeps the client
component alive.)

Fix: the car form's delete passes `revalidate: false`; `deleteCar` keeps `revalidateCarPaths()` for
every other caller (inventory and site flows unchanged). Both ways out of the offer land on a fresh
render anyway — **undo** revalidates (the action does), and **expiry** navigates to the inventory,
which fetches fresh. Honest note: this is the one place the delete's path revalidation is deferred;
during the offer no other surface is being viewed, and this app does not configure `staleTimes`, so
Next 15.5's `dynamic: 0` default refetches dynamic routes on navigation (`next.config.mjs` has no
overrides).

## Live readings — signed in

`car-delete-offer.mjs`; readings `runs/task19/readings.json`. Two throwaways created through the
office's own form, both removed for good by the end; **net-zero 25 → 25**; no Chrome launched
(6 → 6).

| leg | what happened | reading |
|---|---|---|
| **1 · delete → offer → undo → reload** | TS-T19-…64152 "A": delete from its own form | tombstone `deleted_at` set; offer *“… A 2020 deleted.”*, Undo visible, bar mounted, animation `undodrain` /**8000 ms**; `#delBtn` hidden during the offer |
| | Undo taken | toast *“… restored.”*; **store read** `deleted_at = null`; **full reload** → `/office/car/TS-…`, brand field = the make, delete button back |
| **2 · delete → window expires** | TS-T19-…64152 "B": no undo | bar's scaleX sampled draining `1.000 → 0.858 → 0.756 → 0.656 → 0.554 → 0.454`; window ran out in **8 451 ms** (the bar's own end — well under the 12 000 ms failsafe); pushed to `/office/inventory`; tombstone set; **listed** in the waiting-to-be-cleared list; removed for good |
| **3 · cleanup** | "A" still live (undo restored it) — deleted again, window ran out | tombstone set, pushed, listed, removed for good |
| **net** | | live count **25 → 25** |

Delete confirm flow was the app's own: form → `#delBtn` → dialog *"Delete this car?"* → **Delete**.
No SQL was used in the passing path; the fallback (only on failure) removes our own throwaways by id.

## Verification

`npm run typecheck` clean · `npm test` **295/295** · drive `car-delete-offer.mjs` **PASS** · readings
`runs/task19/readings.json` · no Chrome launched.

## Honest notes

- The offer is on the **car form** (that is where the delete was invoked); the inventory's offer is
  the same bar, window and restore, not the same DOM node. The two route sheets each carry the
  rules, with comments naming the one decision at both homes.
- Reduced motion was not driven live on this screen (Task 11 verified it on the inventory); the car
  path mirrors that mechanism exactly — static “8 s”, 8 000 ms timer as the clock.
- `#delBtn` hidden during the offer is a judgement added for this screen (it would otherwise offer a
  second delete of a tombstone); the AC does not name it.
- The word *“demo”* in the car client is gone; the two remaining `(demo)` mentions in `setting.ts` /
  `settings-client.tsx` are code comments about the saved-message defect that was fixed earlier, not
  user-visible wording, and were left.
