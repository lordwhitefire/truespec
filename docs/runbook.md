# Runbook

Runbook for TrueSpec operational incidents. Each entry lists the first response, the owner and the
containment or rotation path.

## Showroom outage

**Symptom:** Public showroom (`https://truespec-k4y6.vercel.app/`) returns errors or does not load.

**First response:**
1. Check `https://truespec-k4y6.vercel.app/` manually.
2. Check the UptimeRobot monitor (if configured) for the outage window.
3. Check the latest Vercel deployment for failures.

**Owner:** Site owner.

**Containment / rotation:**
- If a recent deployment caused it, roll back to the previous deployment (Task 22).
- If the Neon database is unavailable, check the Neon project status and the `DATABASE_URL`.
- Do not write data during the outage; the public showroom is read-only.

## Office sign-in failure

**Symptom:** Users cannot sign in to `/office/sign-in`.

**First response:**
1. Try signing in manually to confirm.
2. Check the Clerk dashboard for service incidents.
3. Confirm the Clerk `NEXT_PUBLIC_CLERK_*` and `CLERK_SECRET_KEY` env vars are set.

**Owner:** Site owner.

**Containment / rotation:**
- If Clerk is down, wait for Clerk recovery; the office is unavailable until then.
- If credentials are wrong, rotate them in Clerk and update the env vars.

## Backup failure

**Symptom:** The daily backup (`npm run db:migrate` / backup scripts) fails.

**First response:**
1. Check the backup script output and logs.
2. Confirm the Neon database is reachable and the backup encryption key is set.

**Owner:** Site owner.

**Containment / rotation:**
- Rotate the backup encryption key if compromised (`BACKUP_ENCRYPTION_KEY`).
- Re-run the backup after the database is healthy.

## Demo reset failure

**Symptom:** The daily demo reset does not run or leaves demo data behind.

**First response:**
1. Check the demo reset script/logs.
2. Confirm the demo office is separate from the main office.

**Owner:** Site owner.

**Containment / rotation:**
- The demo reset never touches main rows or main assets; a failed reset only affects demo data.
- Manually trigger the demo reset once the issue is cleared.

## Suspected data exposure

**Symptom:** Possible exposure of customer or private data.

**First response:**
1. Stop and do not investigate on the live site if it risks further exposure.
2. Identify what data may have been exposed (logs, error reports, access logs).

**Owner:** Site owner.

**Containment / rotation:**
- Rotate any exposed secrets (session secret, Clerk keys, Sentry DSN, backup encryption key).
- Remove the exposed data if it is still public.
- Record the incident and the rotation in this runbook.

## Boundaries (re-checked)

- The public showroom still reads main; the office resolves the signed-in space; no new route
  exposes private data.
- The existing backup, demo reset, tap and session rules still hold.
- Demo identities live until the owner removes them; daily demo reset never touches identities,
  main rows or main assets.
