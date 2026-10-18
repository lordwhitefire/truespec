# TASK-005 · Task 11 — the bar's mechanics are constrained

**Date:** 2026-10-18 · **Outcome:** done. **Depends on:** 10.

## What was constrained, and what was found

1. **The motion forces no layout** — already `transform` (Task 10); now **measured**: the bar's
   layout width (`offsetWidth`), the toast's layout box (`offsetTop/Left/Width/Height`), and the
   document's scroll height held identical across every sample of the drain. (The first probe read
   `getBoundingClientRect().width`, which includes the scaleX transform — a measurement fault, not a
   layout shift; corrected here.)
2. **`aria-hidden`** — the bar's strip carries it; read live.
3. **Reduced motion** — a new `reduced` state from `matchMedia("(prefers-reduced-motion: reduce)")`
   (kept current with a `change` listener). Under it the bar is **not rendered**; a static **“8 s”**
   label (`.usec`, gold, beside the offer's words) takes its place, and the delete offer's timer is
   the clock at **8 000 ms** — the only path, since no animation runs to close it. Without reduced
   motion the timer stays the **10 000 ms failsafe**. The label is `aria-hidden`, consistent with the
   bar: the offer's words carry the meaning.
4. **The clock's start** — measured against the click and the page's own frame clock
   (`requestAnimationFrame` log). The offer's animation starts **on a rendering frame** (its
   `startTime` is literally one of the logged frame timestamps), one frame after the offer enters
   the DOM — i.e. when the offer is actually rendered/visible — and **never at the click**: with the
   click at t=1 661 ms and the offer at t=3 988 ms, the clock started at t=5 691 ms and the offer
   closed **8 336 ms** after the clock, **12 366 ms** after the click. No start-pinning code was
   needed; the native pending-start is already the correct semantics. The 1.7 s gap is this
   automation tab's **frame cadence (1 017 ms between frames)** — the clock can never start before
   a frame, and no frame means nothing new was painted.

## Verified live (signed in, dev `:3210`, live store)

`undo-mechanics.mjs` (attach-only; `runs/undo-mechanics/live.json`). Two throwaway demo cars
(**TS-1041**, **TS-1042**), each created through the office's own form and removed for good at the
end; net-zero.

| reading | value |
|---|---|
| normal — bar `aria-hidden` | **true** |
| normal — keyframes | no `width`; only `transform`; bar layout width **held** through the drain |
| normal — layout | toast's layout box **held**, document scroll height **held**, bar width **held** |
| normal — registered | `8000 ms` · 1 iteration · `linear` |
| normal — the curve | `scaleX = 1 − elapsed/8000` at **every** sample (±0.02) — zero at 8 000 ms |
| normal — frames | frame gap **1 017 ms**; animation start **on a frame**; click→offer **2 327 ms**, offer→clock **1 703 ms** |
| normal — window | clock → close **8 336 ms** (8 000 + close lag); click → close **12 366 ms** ≠ 8 000 |
| normal — store | tombstoned and listed; removed for good |
| reduced — preference seen | **true** |
| reduced — the bar | **absent**; `.usec` label **“8 s”**; animations on the offer **0** |
| reduced — window | **8 067 ms** from offer up to closed; **Undo offered the whole time** |
| reduced — store | tombstoned and listed; removed for good |
| net-zero | live car count **25 → 25** |

`npm run typecheck` clean · `npm test` **295/295** · no Chrome launched (6 → 6).

## Honest notes

- **The 1 017 ms frame gap is the harness tab's cadence**, not a user's browser's. It is why the
  animation's start lags the DOM by ~1.7 s here; the start is still a real frame, so the reading
  proves the *rule* (start on a rendered frame, after the offer, not at the click) while the
  absolute lag is environmental. At 60 fps the same mechanism starts the bar within a frame or two.
- Under reduced motion the 8 000 ms timer **is** the clock (there is no animation); the 10 000 ms
  failsafe exists only on the animated path. This is Task 11's sanctioned replacement, recorded here
  so Task 10's “a timeout is never the clock” is not read as violated.
- The first probe's `noLayoutShift: false` was a measurement fault (`getBoundingClientRect` includes
  the transform; the toast's entrance transition moves its rect; the row leaving the table changes
  body height before the bar mounts). The corrected reading uses layout-only properties across the
  bar's lifetime.
