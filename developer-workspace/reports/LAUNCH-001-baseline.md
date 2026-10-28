# LAUNCH-001 — baseline report

**Date:** 2026-10-26
**Task:** 1 — capture the runtime truth before any change; write the release checklist.
**Build:** production `next start -p 3210`, build ID `myQLd307OzfoBSqM1KWr2` (built 22:58).
**Reference:** `http://127.0.0.1:3211` (static reference).
**Browser:** visible Chrome 149.0.0.0 on CDP `:9222`; User-Agent has no `Headless`.
**Harness:** `developer-workspace/scripts/LAUNCH-001/_lib.mjs`; probe
`developer-workspace/scripts/LAUNCH-001/baseline.mjs`.
**Checklist:** `developer-workspace/procedures/LAUNCH-001-runtime-checklist.md`.

**Guard:** 6 tabs before → 6 after; 1 Chromium on `:9222` before → 1 after. No tab opened, no Chrome
launched, no screenshot.

## Current runtime

| Route | Status | Title | H1 | H2 | Canonical | OG/Twitter | Security headers | Console / page errors | Overflow |
|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 | TrueSpec — cars you can trust | 0 | 10 | none | none | none | 0 / 0 | 0 |
| `/inventory` | 200 | Inventory — TrueSpec | 0 | 3 | none | none | none | 0 / 0 | 0 |
| `/car/TS-1001` | 200 | 2021 Toyota Camry XSE V6 \| TrueSpec Automotive | 1 | 3 | none | none | none | 0 / 0 | 0 |
| `/privacy` | 200 | TrueSpec — cars you can trust | 1 | 10 | none | none | none | 0 / 0 | 0 |
| `/office/sign-in` | 200 | Owner sign in \| TrueSpec Automotive | 1 | 0 | none | none | none | 0 / 0 | 0 |

All five returned `content-type: text/html; charset=utf-8`. No CSP (enforced or report-only), no
`x-content-type-options`, `x-frame-options`, `referrer-policy`, `permissions-policy` or
`strict-transport-security` on the local production server. Production headers may differ; the
checklist re-checks them at the canonical host.

## Gaps the launch layer must close

1. **Home and inventory have no `<h1>`.** Home starts at `<h2>` (10 of them); inventory has 3 `<h2>`.
2. **No canonical URL on any of the five routes.** The car page is reachable, but its canonical is
   absent; filtered inventory cannot canonicalise yet.
3. **No Open Graph or Twitter metadata on any route.** No social image, no absolute preview URL.
4. **No security headers** on the local production build. The current `next.config.mjs` has no
   headers block; the CSP is not present.
5. **Generic metadata leaks onto the wrong pages.** `/privacy` uses the site-wide title and
   description; `/office/sign-in` uses the site-wide description. The car page description is the
   site-wide description, not the car's public price/mileage.
6. **No structured data.** No Vehicle/Offer JSON-LD on the car page.
7. **No `robots.txt`, `sitemap.xml` or `llms.txt`.** They 404 until Task 7/8.
8. **No terms page or footer terms link.** `/terms` is absent.
9. **No cookie/storage inventory, monitoring or runbook.** These are Task 13–27 work, not runtime
   defects.

## Lighthouse lab baseline — home

**Lab only; not field data.** Lighthouse 13.5.0, mobile form factor, 412×823, CPU slowdown 4×,
throttled network (1,638 kbps / 150 ms RTT). It ran in its own headless Chrome with `--port=0`; the
visible automation Chrome on `:9222` was not used or touched.

| Metric | Value |
|---|---|
| Performance score | 33 |
| Accessibility score | 100 |
| Best-practices score | 77 |
| SEO score | 100 |
| First Contentful Paint | 4.5 s |
| Largest Contentful Paint | 11.4 s |
| Total Blocking Time | 1,130 ms |
| Cumulative Layout Shift | 0.057 |
| Speed Index | 11.8 s |
| Time to Interactive | 15.7 s |

The current home page is far outside the LCP ≤ 2.5 s target. The cause is not diagnosed here; Task 18
measures and fixes it. The baseline is the comparison point for G8.

## What was not checked

- Mobile widths, dark/light theme, keyboard order, dialogs, focus return and screen-reader names.
- The authenticated office, the demo banner, the sold/unknown car states and the office boundary.
- CSP behavior, Clerk/font/icon loading under the policy, and production response headers.
- Field Core Web Vitals. Only the lab run above exists.
- The visual look. No screenshots; the owner checks it by hand.

## Evidence

- `developer-workspace/scripts/LAUNCH-001/runs/baseline.json` — full facts, headers, console arrays.
- `developer-workspace/scripts/LAUNCH-001/runs/baseline.txt` — one block per route.
- `developer-workspace/scripts/LAUNCH-001/runs/lighthouse-home.json` — Lighthouse JSON.
- `developer-workspace/procedures/LAUNCH-001-runtime-checklist.md` — the release pipeline.

## Verdict

**Baseline captured; no code changed.** The launch surfaces are absent, as expected. The site loads
the five routes with no console or page errors and no horizontal overflow at the owner's window. The
next task is the site constant and metadata helper (Task 2).
