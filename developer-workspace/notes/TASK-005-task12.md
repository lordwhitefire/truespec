# TASK-005 · Task 12 — the end of the window is true, and checked

**Date:** 2026-10-18 · **Outcome:** done. **Depends on:** 10, 11.

## What was checked

Watched once, live and signed in, on a throwaway demo car safe to lose (**TS-1046**, created through
the office's own form, removed for good at the end): the offer comes up, the eight seconds pass, and
then —

- **Undo is no longer offered**: `#undo` is present but `hidden`; the toast is down; the bar and the
  reduced-motion label are gone.
- **The deletion stands**: the car is a **tombstone** (`deleted_at` set), absent from the live table
  (`tr` count 0), the live count back to the baseline.
- **Nothing hard-erases on a timer (SD10)**: the row is still in `car` after the window and after a
  further 4 s, with the **same `deleted_at`** to the millisecond; the tombstone count is unchanged;
  the inventory still lists it as *“Waiting to be cleared”* after a fresh reload. Only the owner's
  own **“Remove for good”** clears it — and that is the net-zero at the end (store row absent, live
  count **25 → 25**).
- **Nothing restores it**: no undo path is reachable, and the store's `deleted_at` is byte-identical
  across two reads four seconds apart and across the reload.

## The one change this check forced: the failsafe's margin

The first expiry run measured an **offer window of 10 267 ms** — the old **10 000 ms** failsafe was
right at the boundary. The cause is already documented in Task 11: the animation's clock waits for a
rendering frame, and this harness tab runs at **~1 fps**, so the pending start eats 0.8–2.1 s. The
old failsafe was only **2 000 ms** longer than the window — not "deliberately longer" enough on a
stalled renderer. It is now **12 000 ms** (the reduced-motion clock stays **8 000 ms**; the failsafe
exists only on the animated path).

Re-verified after the change, same drive:

| reading | value |
|---|---|
| offer up t=3 891 → clock start t=4 666 (**775 ms** pending) → gone t=13 202 | clock window **8 536 ms** (8 000 + commit lag) |
| closers | animation's own end t=**12 666** · failsafe due t=**15 891** → **animation**, by 3.2 s |
| the bar at its end | animation `currentTime` **8 000 ms** at the last reading, still up — then the close |
| after expiry | `undoPresent` true · `undoHidden` **true** · `toastShown` **false** · bar/label **absent** |
| the store | tombstone `deleted_at` `2026-10-18T03:36:10.670Z` — identical after 4 s |
| listed | *“Waiting to be cleared”* after a reload |
| removal for good | store **null** · live count **25 → 25** |

`npm run typecheck` clean · `npm test` **295/295** · no Chrome launched (6 → 6).
Readings: `runs/undo-expiry/live.json`; drive `undo-expiry.mjs`.

## Honest notes

- **The offer window measured from the offer's arrival can exceed 8 s in this harness** (9.3 s here)
  because the clock cannot start before a rendered frame and this tab renders at ~1 fps. The 8-second
  claim is the animation's own clock — measured at 8 536 ms from start to close, with the animation
  reading exactly 8 000 ms at its end. On a normally rendering browser the pending phase is one or
  two frames (~16–33 ms).
- **The earlier runs' records are kept honest**: before the failsafe change, one run measured the
  10 267 ms offer window above; another (with clock instrumentation) had the animation winning by
  937 ms at the old deadline. The widening is the response to both.
- The four-second post-expiry wait is a spot-check, not a soak test; the guarantee is structural —
  nothing schedules a restore or an erase.
