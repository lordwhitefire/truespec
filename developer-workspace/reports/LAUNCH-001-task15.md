# LAUNCH-001 Task 15 — Cookie/storage inventory and accessibility release check

**Status:** done; E5 storage inspected against the real browser; C8 recorded (screen-reader pass
NOT RUN pending separate session).

## What changed

- `docs/cookies.md` (new) — browser storage inventory for the public showroom and the private
  office, observed from the live build on `:3210` and `:3211`: Clerk session cookies
  (`__session`, `__clerk_db_jwt*`, `__client_uat*`, `clerk_active_context`), localStorage keys
  (`ts-theme`, `ts-visits`, `ts-seen`, `ts-lastcar`, `ts-known`, `__clerk_environment`,
  `__clerk_protect_*`, `clerk_telemetry_throttler`), no analytics/advertising/tracker cookie, no
  consent banner, and the no-banner position with its release gate.
- `docs/accessibility.md` (new) — WCAG 2.2 AA target, pages tested (home, inventory, car,
  privacy, terms, office sign-in), keyboard pass, automated scan, colour-not-the-only-cue,
  focus and live-region records; screen-reader pass recorded NOT RUN (separate session).
- `README.md` (new) — entry point: product, public/office split, stack, directory map,
  prerequisites, install, environment variables, tests, build, deployment, main/demo boundaries,
  operational commands safe against production, and links to OpenSpec.

## Verified

- `npm run typecheck` — pass.
- E5 storage inspection (attach-only browser, CDP `:9222`, no new tab, no Chrome launch):
  public session and office session both show only Clerk session cookies and app localStorage;
  zero analytics/advertising/tracker cookies; no-banner position confirmed.
- Tabs unchanged (4→4); 1 Chromium; no Chrome launched.
- C8: accessibility release check recorded; screen-reader pass NOT RUN pending separate session
  (accepted, with reason).

## Not verified / caveats

- Screen-reader pass is NOT RUN — requires a real screen reader in the separate testing session.
  This checklist does not claim it.
- E3 (follow the privacy contact instruction with a real test message) needs the owner's live
  channel and is NOT RUN per the owner gate; not part of this task's code.

## Evidence

- `docs/cookies.md`
- `docs/accessibility.md`
- `README.md`
- Storage inspection output: `/tmp/opencode/e5-storage.mjs` (one-off, not committed)
