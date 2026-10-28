# DEMO-001 local browser check — 2026-10-26

**Server:** `3210` rebuilt from the T20 build (`.next` built 2026-10-26 17:16) and restarted.
The temporary `3212` server was closed. The `3211` static tab was left untouched.

**Browser:** the existing `3210` tab in the Chrome automation profile at CDP `127.0.0.1:9222`,
not a new tab. The tab is left on `/privacy` for inspection.

## Results

- `/privacy`: `200`. `h1` is `Privacy notice`; no "Owner note" in the body; `.own` count `0`;
  `Last updated: 26 October 2026`; contact line uses WhatsApp; no horizontal overflow at `1440 × 900`.
- `/office/sign-in`: `200`; no demo link while `DEMO_SIGNUP_ENABLED=0`.
- `/office/sign-up`: redirects to `/office/sign-in`.
- Console: only the expected Clerk development-key warning; no page errors.
- Screenshot: `/tmp/opencode/privacy-3210-existing-tab.png`.

No live database write was made by this check.
