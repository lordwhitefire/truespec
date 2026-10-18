# TASK-005 · Task 10 — the undo offer shows eight seconds draining

**Date:** 2026-10-18 · **Outcome:** done. **Depends on:** — (Task 5's delete flow, Task 6's `changed`).

## What was wrong (baseline)

The delete offer was words and a bare timer. `showToast("… deleted.", false, 10_000)` set one
`setTimeout` and the offer vanished when it fired: **nothing on screen said how long the window was**,
and the clock and the failsafe were the same thing — there was no clock, only a timeout. A slow
main thread could not be told apart from a closed window.

## What changed

`app/office/(shell)/inventory/inventory-client.tsx` + `inventory.css`:

1. **The bar.** The offer carries a 3 px tick at the toast's bottom edge: `.utick` (absolute, inside
   the toast) holding `.ubar` — `transform-origin: left; animation: undodrain 8000ms linear forwards`,
   `@keyframes undodrain { from { transform: scaleX(1) } to { transform: scaleX(0) } }`.
   `transform`, never `width` — nothing reflows while it drains. `.toast` gained `overflow: hidden`.
2. **The animation is the clock.** `.ubar`'s `onAnimationEnd` — guarded on
   `e.animationName === "undodrain"` so no other animation's end can close it — calls **`closeOffer()`**.
3. **One close for both paths.** `closeOffer()` (new) clears the failsafe, drops the message, turns
   `undoOn` off and clears `undoRef`; `showToast` and the failsafe both land in it.
4. **The timeout is only the failsafe.** The delete offer's timeout is **10 000 ms** — deliberately
   longer than the 8 000 ms window, so it can never be the thing that closes the offer.
5. The bar is `aria-hidden` (the offer's words carry the meaning; the bar is the measure), and mounts
   with `undoOn`, so every offer gets a fresh bar. (Its reduced-motion replacement and the start
   constraint are Task 11's AC.)

## Verified live (signed in as rema6rema6rema6@gmail.com, dev `:3210`, live store)

`undo-bar.mjs` (attach-only; `runs/undo-bar/t10.json`). One throwaway demo car, created through the
office's own form (`TS-T10-…` → **TS-1038**), deleted through the inventory, then removed for good.

| reading | value |
|---|---|
| the bar's registered timing | `duration 8000` · `iterations 1` · `easing linear` · `fill forwards` |
| the drain, sampled in-page every 100 ms | `scaleX` **1 → 0**; the animation's own clock **0 → 8016 ms** |
| the drain's rate | linear at exactly **8000 ms per unit** (0.848 at 1 217 ms · 0.473 at 4 216 ms · 0.098 at 7 216 ms) |
| the offer closed | at the animation's end — bar **gone**, toast **down**, Undo **gone** (`shown false`, `undo false`) |
| window, animation start → close | **8 524 ms** (8 000 ms animation + 524 ms commit/paint lag on the busy dev thread) |
| the failsafe | 10 000 ms — never the closer |
| the store after expiry | car a **tombstone** (`deleted_at` set) and **listed** in “Waiting to be cleared” |
| removal for good | row gone, section gone, **store row absent** (`null`), live count **25 → 25** |

`npm run typecheck` clean · `npm test` **295/295** · no Chrome launched (6 → 6).

## The honest readings, and what they hand forward

- **The animation's clock started 1 681 ms after the bar's element entered the DOM** (`insert t=4094`,
  animation `startTime t=5775`; `currentTime` stayed 0 and `scaleX` stayed 1 while pending). During
  that phase the bar is on screen but the clock is not yet running. That is exactly Task 11's AC —
  *“the clock starts when the offer is actually pressable, not when the row leaves the list”* — and it
  is handed there rather than patched here. Once running, the drain was exact.
- **Two drive faults found and corrected — the app was not changed for them.** (1) The save confirmation
  is the car form's inline result, but the toast also carries *“Saved TS-… The showroom updates
  immediately.”*; the drive reads the toast (the ref is in it). (2) **The “removed for good” note never
  renders when the removed car was the last tombstone**: `Tombstones` returns `null` as soon as its
  rows are empty, so the section — note and all — unmounts. The drive checks the evidence that
  survives: the row's departure and the store read-back. With other tombstones present the note shows.
- **`.ubar` / `.utick` / `undodrain` exist nowhere else** (grep over `app/` + `components/`).
- One earlier throwaway (**TS-1037**) was created and removed during the drive's correction; store
  read back, live count unchanged (25 → 25) both times.
