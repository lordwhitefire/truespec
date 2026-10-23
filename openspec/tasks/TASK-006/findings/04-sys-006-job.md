# 04 — SYS-006, the daily job: what exists and what Vercel Cron gives us

**Checked:** 2026-10-20, current working tree; Vercel Cron documentation read the same day.
**Tracker items:** 5 and 6.

## What exists today

**The office is ready to read the job's results — nothing writes them.**

- `lib/settings.ts:43-50` defines the three keys: `last_backup_at`, `storage_used_bytes`,
  `storage_warning_bytes`; `:108-116` reads them.
- `lib/notices.ts:22-29` turns them into the System card's notices, including the defaults:
  **4 GiB** warning figure and **48 hours** before a silent backup is called stale. It is honest by
  construction: an absent row is said to be absent, never turned into zero or an invented date.
- **No writer exists.** A search for the three key names finds only readers, tests and comments —
  no `INSERT`/`UPDATE` into `setting` for them anywhere in `lib`, `app` or `scripts`.
- **No scheduler exists.** `package.json` has no job script; there is no `vercel.json`.
- **Cleanup is a manual CLI.** `lib/cleanup.ts` is imported only by
  `scripts/cleanup-readiness.ts:10`, which is not even an npm script. The office shows only car
  tombstones.

## What Vercel Cron gives us (facts that shape the job)

- A `vercel.json` with a `crons` array: `{ "path": "...", "schedule": "..." }`.
- **Authentication:** set `CRON_SECRET` in the project; Vercel sends it automatically as
  `Authorization: Bearer <value>`. The route compares the header before doing anything. Without the
  variable, the route must refuse.
- **Hobby limits:** once per day only; the run happens **somewhere inside the scheduled hour**
  (±59 minutes). Function duration is the normal Hobby limit (up to 300 s per the current plan
  table). So the job must not assume a precise hour, and a small demo database fits comfortably.
- **Delivery is best effort:** Vercel does not retry a failed run, and it may occasionally invoke
  the same scheduled run **twice**. The job must therefore be **idempotent** and safe to repeat —
  and must not overwrite a good backup with a worse one.
- **Local run:** the route is an ordinary endpoint; call it with the secret
  (`curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/...`).
- **Logs:** runtime logs, filtered by the route; Hobby keeps **1 hour** of runtime logs.

## What this means for the task

The job must do four things and write only facts it has proved:

1. **Backup** the database to Sanity, and only after the upload is confirmed, write
   `last_backup_at`. (Target, scope and retention are Q4–Q6.)
2. **Measure storage** — Neon and Sanity — and write `storage_used_bytes` (the combined figure, or
   a documented composition) against `storage_warning_bytes`.
3. **Report cleanup** — the lists from `lib/cleanup.ts` (enquiries at their year, car tombstones,
   unreferenced uploads, missing-asset rows), shown in the office. It reports; it never deletes
   customer data.
4. **Leave the System card honest** — a failed run leaves the old heartbeat in place, so the 48-hour
   notice eventually speaks; it must not write "now" on a failure.

The job must be a single route with the bearer check, callable by hand for testing, and idempotent
because Vercel can run it twice. On Hobby it runs once a day somewhere in the chosen hour.

**Open:** Q4 (private dataset or encryption), Q5 (database only or assets too), Q6 (how many dumps
kept), Q10 (storage thresholds and where the warning appears).
