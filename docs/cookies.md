# Cookie and browser storage inventory

This document records what the TrueSpec public showroom and private office store in the browser,
and the position on consent banners and third-party trackers. It is the factual record behind
runtime checklist row E5.

## Storage observed (local production build, fresh session)

### Public showroom — `http://127.0.0.1:3210/`

Cookies (all Clerk session cookies; no analytics, advertising or tracker cookies):

- `__next_hmr_refresh_hash__` — Next.js dev HMR hash, not a user cookie
- `clerk_active_context` — Clerk active session context
- `__session` — Clerk session JWT
- `__clerk_db_jwt`, `__clerk_db_jwt_rm6_kxc6` — Clerk database JWTs
- `__client_uat`, `__client_uat_rm6_kxc6` — Clerk client UA telemetry flag

LocalStorage keys:

- `ts-theme` — `"light"` or `"dark"`; the user's theme preference, saved by `ThemeToggle` and read
  by the layout's inline theme initializer. Never sent to the server.
- `ts-visits` — visit counter for the current device/draft context.
- `ts-seen` — per-car view counts used to rank "new on the lot" / "biggest drop" on the home page.
- `ts-lastcar` — the last car code the visitor opened.
- `ts-known` — the list of car codes the visitor has seen.
- `__clerk_environment` — Clerk environment configuration (public, no secret).
- `__clerk_protect_pid`, `__clerk_protect_st` — Clerk bot-protection token/pid (public, rotated).
- `clerk_telemetry_throttler` — Clerk SDK telemetry throttle state.

### Private office — `http://127.0.0.1:3211/office-dashboard.html`

Cookies: identical Clerk session cookies as the public session (same Clerk instance). No
additional office-specific cookie.

LocalStorage keys: `ts-theme`, `ts-visits`, `ts-seen`, `ts-lastcar`, `ts-known` (office-specific
device drafts and theme preference). No customer name, email or payment value is stored in
browser storage.

## What is NOT stored

- No Google Analytics, Meta Pixel, or other third-party tracker cookie.
- No marketing or advertising cookie.
- No consent banner storage (there is no banner — see below).
- No customer name, phone number, email address or payment value in `localStorage` or cookies.

## Consent banner position

**No consent banner is shown.** The site sets no non-essential tracker: the only cookies are
Clerk session cookies (authentication, required for the office) and Next.js HMR hashes in
development. The privacy notice states this explicitly ("No cookies for tracking, advertising or
analytics", "No third-party trackers").

Because there is no non-essential tracker, a banner is not required. Any future non-essential
tracker (analytics, advertising, third-party pixel) requires a consent banner and a privacy
review before it is added — this is a release gate, not something this code ships.

## How to re-verify

Attach to the automation Chrome on CDP `:9222` (never launch a second browser), open the public
showroom and the office dashboard, and inspect `document.cookie` and `localStorage` in DevTools
(Application → Storage). Compare against this document; any new cookie or localStorage key is a
change to report.
