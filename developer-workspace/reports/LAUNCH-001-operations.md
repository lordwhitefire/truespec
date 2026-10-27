# LAUNCH-001 — Operations runbook and existing guarantees

**Status:** done.

## Runbook

`docs/runbook.md` covers:
- Showroom outage
- Office sign-in failure
- Backup failure
- Demo reset failure
- Suspected data exposure

Each entry lists the first response, the owner and the containment / rotation path.

## Existing guarantees (re-checked)

- The public showroom still reads main; the office resolves the signed-in space; no new route
  exposes private data.
- The existing backup, demo reset, tap and session rules still hold.
- Demo identities live until the owner removes them; daily demo reset never touches identities,
  main rows or main assets.

## Owner setup pending

- Sentry project + `SENTRY_DSN` (error tracking, Task 19) — NOT RUN until the owner creates the
  Sentry project.
- UptimeRobot monitor + owner alert email (uptime, Task 20) — NOT RUN until the owner creates the
  monitor.
- Vercel Preview environment scoped to the demo Neon branch and Sanity `preview` dataset
  (environments, Task 22) — NOT RUN until the owner scopes the preview env.
