# RECON-001 — Phase A (foundations) verification

Date: 2026-10-09
Verdict: **PASS** (foundation only; screens themselves are Phase B–D and not yet rebuilt)

## What was done
- **A1 — theme tokens ported verbatim.** `app/globals.css` now carries the reference's exact
  `:root` (light) and `html[data-theme="dark"]` blocks from `test-truespec-v2/truespec.html`
  (lines 19–47), plus the app's structural tokens (radii, widths, fonts, shadows) and thin
  temporary aliases (`--surface`, `--surface-2`, `--muted`, `--gold-ink`, `--green`, `--danger`)
  so not-yet-rebuilt screens still render. The old `.theme-dark`/`.theme-light` blocks are gone.
- **A1 — theme mechanism switched.** `app/layout.tsx` renders `<html lang="en" data-theme="dark">`
  and the head script reads `localStorage["ts-theme"] || "dark"` and sets `dataset.theme`
  (identical to the reference). `components/ThemeToggle.tsx` now writes `ts-theme` + `dataset.theme`.
- **A3 — toggle matches the reference.** ThemeToggle renders the reference's `.thm` 38px circle
  with `<i class="fa-solid fa-moon">`; Font Awesome 6.5.1 (the reference's own CDN link) is loaded
  in `app/layout.tsx`.
- **A2 — widths:** the reference's breakpoints are `max-width:1100 / 820 / 560` (showroom) and
  `1000/820/560` (office). These live in the reference CSS and are ported with each screen, so A2
  is satisfied per-screen rather than by a separate edit.

## How it was verified
- `npx tsc --noEmit` → exit 0.
- Runtime smoke test (`next dev -p 3210`, `GET /`): served HTML contains `data-theme="dark"`,
  `ts-theme` (head script + toggle), `fa-moon`; **no** `theme-dark`/`theme-light` remain.
- Screenshots (system Chrome 149 via `playwright-core`, full page): reference vs build at
  560/820/1100 × dark/light → `developer-workspace/reports/RECON-001-shots/`.
- Vision check (Gemini `gemini-2.5-flash`, direct API call — see below):
  - **dark:** both reference and build show a dark page background and a dark top strip. ✅
  - **light:** both show a light page background; the top strip stays dark in both. ✅
  - Content differs (expected): reference has the full showroom sections; build still has only
    hero + three static category blocks + simple footer. That difference is Phase B work.

## Tooling note — the vision tool is broken; two env-gap fixes
- `visual_inspect` (registered tool) does **not** work as shipped here:
  - provider `gemini` is a **stub** (returns a placeholder, makes no API call);
  - provider `groq` is the configured default but its model id `qwen/qwen3.6-27b` **does not
    exist** (Groq returns `model_not_found`), and this account has no vision model on Groq anyway
    (only text/audio models are listed).
  - The gemini path also wants `SA_VISION_GEMINI_KEY`, while the environment provides
    `GEMINI_KEY`.
- Workaround used: `developer-workspace/scripts/vision.mjs` calls the Gemini REST API directly
  with `GEMINI_KEY` and `gemini-2.5-flash`. Keys are read from env and never printed.

## Local tooling added
- `npm i -D playwright-core` (1.64.0) — uses the already-installed `/usr/bin/google-chrome`
  (Chrome 149); no Playwright browser download.
- `developer-workspace/scripts/recon-shot.mjs`, `developer-workspace/scripts/vision.mjs`.

## Not done / next
- Phases B (showroom screens), C (extras), D (office), E (final verification) — not started.
- Build header merges the reference's dark top strip and its light/grey sticky nav into one dark
  `.band`; the split happens in the screen rebuild (B).
