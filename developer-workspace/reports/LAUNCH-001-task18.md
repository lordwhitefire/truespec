# LAUNCH-001 Task 18 — Playwright smoke test

**Status:** done; smoke test passes (5 checks) against the local production build on :3210.

## What changed

- `playwright.config.ts` (new) — documents the smoke test configuration (baseURL :3210,
  CDP :9222, pages to check).
- `e2e/smoke.spec.ts` (new) — smoke test using playwright-core connected to the existing
  Chrome on CDP :9222. It never launches a browser and never opens a tab; it reuses the
  existing build tab, navigates it through the smoke path, and restores it afterwards.
- `package.json` (modified) — added `npm run smoke-test` script (`tsx e2e/smoke.spec.ts`).
- `docs/release-checklist.md` (new) — pre-merge release checklist (machine-readable routes,
  legal pages, security headers/CSP, smoke test, lint/format) plus owner-only setup notes.

## Verified

- `npm run typecheck` — pass.
- `npm run build` — pass.
- `npm run smoke-test` — passed (5 checks):
  - home loads with main heading ("TrueSpec — cars you can trust")
  - inventory loads with main heading ("Inventory")
  - car page (/car/TS-1001) loads with main heading ("Toyota Camry XSE V6 2021")
  - anonymous office request (/office/sign-in) renders the sign-in page
  - no office data renders anonymously
- `npm run lint` — 0 errors (13 pre-existing warnings).
- `npm run format:check` — green.
- tabs unchanged (4→4); 1 Chromium; no browser launched, no tab opened.

## Not verified / caveats

- The smoke test attaches to the owner's Chrome on CDP :9222; it requires that Chrome to be
  running (the automation profile with --remote-debugging-port=9222). It never launches a
  browser or opens a tab.
- A full Playwright browser installation (`playwright` package + Chromium) is not present;
  the test uses playwright-core against the existing Chrome. This is documented.

## Evidence

- `playwright.config.ts`
- `e2e/smoke.spec.ts`
- `docs/release-checklist.md`
- `package.json` (smoke-test script)
