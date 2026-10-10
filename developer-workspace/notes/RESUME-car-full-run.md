# RESUME — car page full runtime run (state as of 2026-10-10 11:06)

## Purpose

Where we were when the session dropped. This is the checkpoint, so a fresh
session can pick up without guessing.

## What exists on disk (safe)

The car page was run through the full runtime-ui-diff **state checklist**:

- **Reference**: `http://localhost:3211/car.html?car=2021-toyota-camry-xse-v6`
  (the reference source is `/home/lordwhitefire/current-project/test-truespec-v2/car.html`)
- **Build**: `http://localhost:3210/car/TS-1001`
- **Config / checklist**: `scripts/runtime-ui-diff/runs/car/car.config.json`
  — **23 states** (saved 10:56).
- **Captures**: `scripts/runtime-ui-diff/runs/car/captures/<state>/` for all
  **23 states**, each with `ref.json` + `build.json` + `meta.json` (~2.3 MB
  apiece), last write **11:01**. **Capture run completed — nothing was killed
  mid-capture.**

### The 23 states (as captured)
default, theme-light, gallery-photo2, gallery-next, gallery-prev, lightbox,
lightbox-next, lightbox-escape, tab-features, tab-delivery, tab-overview,
related-next, related-prev, share, return-visitor, ticker-rotated,
farewell-modal, farewell-stay, proof-toast, scrolled, mobile-390, mobile-mbar,
tablet-1000.

## What does NOT exist yet

- **The results / diff report for this 23-state run.** The only report,
  `reports/RUNTIME-UI-DIFF-car-full.md` (10:48), covers only **9 of the 23
  states** and was produced from an *older* capture set. So the raw captures are
  in, but the divergence output over the full checklist has not been generated.
- **The rebuild** of our build's car page against the found divergences.

## The method (unchanged — do not drift)

1. Capture both pages at runtime, state by state.
2. Diff → find the divergence (skill detects only; it does not explain or fix).
3. Rebuild **our** build page, fixing each divergence to match the reference at
   runtime.
4. Re-run the diff to prove runtime parity.

## Next step

Run `diff.mjs` over `runs/car/captures/` for all 23 states → write the full
divergence report to `reports/RUNTIME-UI-DIFF-car-full.md`. That report is the
input to the rebuild.
