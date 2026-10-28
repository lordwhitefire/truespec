# System layer findings

The layer that strengthens the system: identity, access, limits, failure paths, jobs.

## What is sound
- **The door**: `requireOfficeSession()` at the top of every office page and every office Server Action; `getOfficeSession()` for the two downloads. Server Actions are treated as public endpoints and re-check the session themselves.
- **Session rule**: 12 h idle / 7 d total, read from the application's own `session` row, not a provider feature (`lib/session-rules.ts`); `last_seen_at` written at most every 5 minutes.
- **Password**: no password material in any application table (`0010` drops `password_hash`); change is delegated to Clerk's `UserProfile` at `/office/account`.
- **Origin**: write handlers check same-origin (`lib/origin-rules.ts`); the two GET downloads deliberately do not, and require the session instead.
- **Upload bound**: 15 MB per photo (declared and re-measured), 10 MB per PDF blank; EXIF stripped before the bytes leave the process; stored filename randomised while the owner's name is kept in the row.
- **Error surface**: office and shell error boundaries offer retry; no stack trace to the owner.
- **Offline**: the banner disables Save controls and names the recovery; a draft left behind is announced when the connection returns.

## SYS-001 — The lockout rule is not implemented
**Severity:** major · **Status:** open
**Evidence:** `migrations/0001_people.sql:23` creates `auth_attempt` and `0006` indexes it; **nothing writes it**. It is read only by `lib/cleanup.ts:162` (itself dead — DATA-003). `middleware.ts` is a bare `clerkMiddleware()`. No lockout, delay or attempt counter exists in this repo.
**Effect:** the spec's "10 failed attempts → bounded period (30 min), never indefinite" is delegated entirely to Clerk's defaults, whatever they are, and the application cannot observe or report attempts. If Clerk's protection differs, the written rule is not the one in force.
**Check:** at the sign-in screen, enter a wrong password ten times; note what the provider says and for how long. That is the real rule.

## SYS-002 — Any provider user becomes an owner
**Severity:** major · **Status:** open
**Evidence:** `lib/session.ts` — `checkOfficeSession` upserts `office_user` by email for the identity it receives; no allow-list, no single-owner count, no domain check.
**Effect:** the office's whole authorisation model rests on the provider instance holding only the owner. A second Clerk user is not refused — it is enrolled. See DATA-005.
**Check:** verify the Clerk user list has exactly one user; do not test by creating one.

## SYS-003 — The public tap endpoint has no limit
**Severity:** minor · **Status:** open
**Evidence:** `app/api/tap/route.ts` — validates origin and body and inserts; no rate limit, no dedupe, no in-memory counter.
**Effect:** anyone who can load a car page can post unlimited rows to `tap` (and grow the table / the badge). The spec says flooding is answered outside the store; nothing here answers it.
**Check:** not device-observable; note for deployment (edge/WAF rate limit).

## SYS-004 — Row-level security contributes nothing
**Severity:** major · **Status:** open
**Evidence:** DATA-004. RLS enabled, zero policies, application role is the owner.
**Effect:** a leaked `DATABASE_URL` reads everything; there is no database-side boundary behind the app. Combined with the export route (one response, every private note and phone number), the store's protection is the session cookie alone.
**Check:** architectural; confirm the production role and whether any policy exists outside the migration chain.

## SYS-005 — Session expiry has no in-page signal
**Severity:** minor · **Status:** open
**Evidence:** expiry is enforced on the next request (`checkOfficeSession`); a client form that has been open across the 12 h boundary keeps accepting typing. Its save is the first thing to learn the session is gone; the action redirects/refuses and the typed values rely on the device draft.
**Effect:** on a phone left open overnight, "Save" can fail with a sign-in redirect. The device draft should survive it; check that it does.
**Check:** not practical to wait 12 h; simulate by clearing the session cookie and pressing Save on a filled form (only if the owner wants to).

## SYS-006 — The jobs the System card reports do not exist here
**Severity:** major · **Status:** open
**Evidence:** `last_backup_at`, `storage_used_bytes`, `storage_warning_bytes` are read by `lib/settings.ts` / `lib/notices.ts` and written by nothing in this repo; there is no cron, scheduler or reconcile entry point (`package.json`, `app/`, `lib/`). Reconcile-cleanup is described as TASK-006.
**Effect:** on a deployment without that external job, Settings → Account → System will permanently say the backup/storage position is unknown and no reconcile ever runs. The office cannot tell a healthy deployment from an abandoned one. See COV-002.
**Check:** on the phone, read the System card. Whatever it says is the truth of the deployment, not of the code.
