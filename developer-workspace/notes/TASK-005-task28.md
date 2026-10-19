# TASK-005 · Task 28 — The gradient is deterministic, and tested

**Date:** 2026-10-19 · **Outcome:** done. **Deps:** 27.

## What changed

- **`lib/photo-gradient.ts`** (new) — the palette function moved out of `PhotoBox.tsx`, with the
  hash **documented** in the module (the AC's own wording): the 31-multiplier string walk
  (Java's `String.hashCode` shape, unsigned 32-bit), the murmur3-style avalanche finalizer
  (`0x85ebca6b` / `0xc2b2ae35`) applied with two seeds (`0x9e3779b9`, `0x85ebca6b`), and the
  HSL decomposition with its bounds (hue free; sat 22–31% / 30–41%; light 18–23% / 28–34%).
  The docstring also records *why* the mix exists: the un-mixed walk put TS-1029 and TS-1030 one
  degree apart; the mixed first-stop hues are 155° and 119°. Pure function: no randomness, no
  clock, no state.
- **`lib/photo-gradient.test.ts`** (new) — 8 tests: same ref → same output on every call; a
  **golden table** pinning the exact gradient for 12 real references (an accidental edit of the
  hash changes every car's colour and fails here); every stop inside the documented bounds; two
  cars never share a gradient; adjacent references land ≥ 20° apart (measured 36°); refs spread
  ≥ 180° across the palette (measured 270°); the module source contains no `Math.random`, no
  `Date`, no `performance`; an empty code still yields a valid pair (defensive).
- **`components/PhotoBox.tsx`** — imports `photoGradient` from `@/lib/photo-gradient`; the local
  hash is gone. The docstring now points at the module. **No rendered change** — spot-checked.

## Verification

`npm run typecheck` clean · `npm test` **303/303** (295 before + 8 new) · live spot check after
the move: TS-1029 `.pbox` still `linear-gradient(135deg, rgb(41, 66, 56), rgb(61, 48, 105))`,
TS-1030 still `rgb(41, 66, 41) → rgb(90, 109, 55)`, `aria-hidden="true"` on both, no console
errors — the same colours the Task 27 drive read.

## Honest notes

- "Forever" is by construction — a pure function of the reference code — and protected by the
  golden table: a changed hash or palette edit fails the test before it can reach a car. The
  test file reads the module's own source for the no-randomness/no-clock check; that is a text
  scan (the plan's stated verify), not a static analysis of dependencies.
- The empty-code case cannot occur from the page (a car always has a ref); it is covered so the
  function is total rather than assert-guarded.

## Files touched

`lib/photo-gradient.ts` (**new**) · `lib/photo-gradient.test.ts` (**new**) ·
`components/PhotoBox.tsx`
