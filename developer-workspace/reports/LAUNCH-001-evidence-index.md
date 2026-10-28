# LAUNCH-001 — evidence index

**Compiled:** 2026-10-28. **Surface:** local production build `next start` on `:3210` (commit
`eec52e7` + the release fixes in this session). **Browser:** the one visible Chrome on CDP `:9222`,
attach-only; no tab opened, no Chrome launched, no screenshot.

Each row names the artifact that holds the evidence. A missing item is `NOT RUN`, not a pass.
Run artifacts live under `developer-workspace/scripts/LAUNCH-001/runs/`, which is gitignored by the
repository; re-run the named script to regenerate them.

## 1. Green-path checks

| Item | Artifact / command | Date | Result |
|---|---|---|---|
| Lint | `npm run lint` | 2026-10-28 | 0 errors, 13 warnings |
| Format | `npm run format:check` | 2026-10-28 | pass (after Prettier fix of `docs/environments.md`) |
| Typecheck | `npm run typecheck` | 2026-10-28 | pass (clean) |
| Unit tests | `npm test` | 2026-10-28 | 526 pass, 0 fail, 10 suites |
| Production build | `npm run build` | 2026-10-28 | pass; routes include `/`, `/inventory`, `/car/[ref]`, `/privacy`, `/terms`, `/robots.txt`, `/sitemap.xml`, `/llms.txt` |
| Smoke test | `npm run smoke-test` | 2026-10-28 | 5/5 pass |
| Clean clone | `/tmp/opencode/truespec-a1` | 2026-10-28 | install, migrate (demo branch), seed (17 cars, nothing deleted), typecheck, 526 tests, build, `PORT=3212 npm start` → 200 on `/`, `/inventory`, `/car/TS-1001` |
| Deliberate failure injection | `/tmp/opencode/truespec-d3` (git worktree, removed) | 2026-10-28 | typecheck exit 2 with `TS2322`; restored tree exit 0 |

## 2. Browser checks

| Check | Artifact | Date | Result |
|---|---|---|---|
| Keyboard / focus / live region / dialog | `scripts/LAUNCH-001/runs/keyboard-check.json` | 2026-10-28 | 38/38 pass; tabs 5→5; Chromium 1→1; office pass `NOT RUN — signed out` |
| Grayscale / colour-blind state text | `scripts/LAUNCH-001/runs/grayscale-check.json` | 2026-10-28 | 13/13 pass |
| WCAG 2.2 AA scan (axe-core 4.14.0) | `scripts/LAUNCH-001/runs/axe-check.json` | 2026-10-28 | 9 runs; **C7 FAIL — 7 colour-contrast violations** (see §3) |
| Card images / srcset / lazy / placeholder | `scripts/LAUNCH-001/runs/cards-check.json` | 2026-10-28 | display-sized Sanity derivatives, lazy below fold, slot reserved; blocked image keeps 342×159 slot |
| Font stylesheet block | `scripts/LAUNCH-001/runs/font-block.json` | 2026-10-28 | page readable with fallback; text visible; no invisible text |
| Inventory metadata / headings | `scripts/LAUNCH-001/runs/inventory-check.json` | 2026-10-28 | canonical absolute `/inventory` filtered and unfiltered; one `h1`; no heading skips |
| Font / icon / hero requests | `scripts/LAUNCH-001/runs/perf-home.json`, `perf-inventory.json`, `perf-car_TS-1001.json` | 2026-10-28 | 6 self-hosted woff2; **0 Google Fonts**; fonts/icons loaded; hero `fetchpriority=high` |
| Storage / tracker scan | `scripts/LAUNCH-001/runs/storage-check.json` | 2026-10-28 | Clerk cookies + app keys only; **0 tracker hits**; anonymous `/office` → `/office/sign-in`, no office data |
| Header check | `curl -D -` on public routes | 2026-10-28 | `nosniff`, `X-Frame-Options: DENY`, referrer, permissions, HSTS present; CSP enforcing |

## 3. Accessibility — C7 residue (release decision needed)

Axe-core 4.14.0, WCAG 2.2 AA tags, desktop 1440 and mobile 390. **Label mismatch and target-size
defects are fixed.** The remaining violations are colour contrast only:

| Page | Element | Ratio | Required |
|---|---|---|---|
| `/` | active tab `.tab.on` (`#c8a24a` on white) | 2.4:1 | 4.5:1 |
| `/` | struck was-price on gold (`#4e3f1a` on `#c8a24a`) | 4.25:1 | 4.5:1 |
| `/inventory` | heading accent `#ttl em` (`#c8a24a` on white) | 2.4:1 | 4.5:1 |
| `/inventory` | `On Order` chip (`#2f6fd0` on `#e9f0fb`) | 4.25:1 | 4.5:1 |
| `/car/TS-1001` | related-car price `.pr` (`#c8a24a` on white) | 2.4:1 | 4.5:1 |
| `/office/sign-in` | Clerk button text (`#6b3b20` on `#f36b16`) | 3.04:1 | 4.5:1 |
| `/office/sign-in` | sign-up link (`#c8a24a` on white) | 2.4:1 | 4.5:1 |

The gold is the approved brand colour. **No colour was changed.** The owner decides: darken the
text gold (design change), record a dated acceptance, or leave C7 as a release blocker.

## 4. Performance (G1–G8)

| Page | LCP | CLS | TBT | Artifact |
|---|---:|---:|---:|---|
| `/` | 7345 ms | 0.0004 | 0 ms | `/tmp/opencode/lh-home.json` |
| `/inventory` | 7091 ms | 0.0004 | 0 ms | `/tmp/opencode/lh-inventory.json` |
| `/car/TS-1001` | 5908 ms | 0.0045 | 589 ms | `/tmp/opencode/lh-car.json` |

Lighthouse 13.5.0, mobile 412×823, CPU 4×, simulated throttling, 2026-10-27. **LCP target 2.5 s is
not met; INP is not lab-measured** (no field data; not invented). Baseline: LCP 11.4 s, CLS 0.057,
TBT 1,130 ms. After-change vs baseline: LCP/CLS/TBT all improved (G8 pass). Full record:
`reports/LAUNCH-001-performance.md`; bundle breaches named in `docs/performance.md`.

## 5. Legal / cookie review

| Item | Artifact | Date | Result |
|---|---|---|---|
| Terms approved | `/terms`, `docs/` record | 2026-10-27 | owner-approved copy, last-updated date present |
| Privacy / deletion instruction | `/privacy`, `docs/` record | 2026-10-27 | deletion path explained; no false email/self-service promise |
| Cookie/storage inventory | `docs/cookies.md`, `runs/storage-check.json` | 2026-10-28 | public keys match; no tracker; no-banner position recorded |
| Privacy contact test (E3) | — | — | `NOT RUN — owner` (live channel) |

## 6. Explicitly NOT RUN

| Item | Why | Exact fact needed |
|---|---|---|
| C8 screen-reader pass | separate testing session | real screen-reader walk of the six pages |
| D7 office sign-in end-to-end | signed out; Clerk origin allowlist | sign in with a real office account on the preview |
| E5 office session storage | signed out | storage list from a real office session |
| E3 privacy contact | live channel | one test message reaches the owner |
| F2 Sentry payload / email | owner dashboard | event shows route, release, error type; no PII; email alert rule |
| F4 tap limit | edge-only WAF | 31st tap in 60 s → 429 at the Vercel edge; store count unchanged |
| F5 demo sign-up limit | provider-side | Clerk refuses above-threshold sign-ups; no real accounts created |
| D8 dependency audit | owner decision | dated acceptance naming package/severity/owner/review date, or upgrade |
| G1 LCP target | local cold lab | owner decision: accept 7.3 s baseline or schedule performance work |
