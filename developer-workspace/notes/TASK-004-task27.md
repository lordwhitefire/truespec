# TASK-004 · Task 27 — Password delegated + operational notices

**Date:** 2026-10-15 · **Status: done.** Built, witnessed against the live store, five gates green.

## The two claims

Truth 12 (`task.md:180-185`) makes both, in one breath: *"The password is the provider's: changing it is
delegated, and no password material exists in any application table. Operational notices the owner
needs — storage usage past a threshold, backup status — appear in the office, because there is no mail
channel."*

### 1. The password is the provider's

The Settings screen used to carry a full in-app password form — current password, new password, confirm,
a strength meter, an unsaved-change flag, and a literal `demo-only` prefilled into the current-password
field. That is exactly what truth 12 forbids: **"the office builds no password form and holds no
password material"**, and — from `task.md`: *"There is no in-app password reset flow: Settings says, in
words, that recovery is an identity-provider operation, so the owner knows the route before he needs
it."*

So the form is gone. In its place the card says what is true and offers one control:

- **the password is held by the identity provider, not the office** — nothing on this screen stores it,
  sees it, or changes it;
- **`Change password`** goes to `/office/account`, where **Clerk's own account UI** does the whole job
  (current password, new password, its rules, its verification). Nothing about the password passes
  through this application;
- **the recovery sentence, in words** — recovery is an identity-provider operation; it happens at the
  sign-in screen, not in the office.

The fake audit line (`Password last changed 12 Sep 2026`) is gone with it. It was a literal, and the
office has no way to know the real one — Clerk holds it. A date the office cannot know is a lie on
screen, which is the same rule the tagline counter and the settings audit lines were already held to.

**No password material exists in any application table** — and that is asked of the database that is
actually running, not of the migrations: **0** columns in `public` are password-shaped, `office_user` is
`id, email, created_at, updated_at`, and **0** `setting` rows mention one. (`migrations/0010_identity.sql`
drops the only column that ever existed — `office_user.password_hash` — under the same ruling.)

### 2. The notices are read from rows, and invent nothing

`specs/office-settings` and D19: the two notices are **setting rows the office only displays** — it
must not compute storage live from the image store, and there is no mail channel, so the office is
where the owner is told.

The rule lives in **`lib/notices.ts`** — **pure**, for the same reason `lib/phone.ts` is: a
`server-only` module cannot be unit-tested, and this is the part that must be right. Given the three
values and a clock it returns the notices, so "says so honestly" is a test rather than a hope.
`lib/settings.ts` gains `readNotices()`, which reads the rows and hands them over; the page builds the
notices on the server, so the office's own clock (UTC, like every other date in the office) is the one
they are built from.

**Honest by construction:** a missing row is never turned into a number. An absent backup is *said to
be absent*; an unreported storage figure is *said to be unreported*; a row that is present but cannot be
read says *that*, rather than becoming a fabricated date or a `NaN`. The warning figure falls back to
the spec's 4 GB only when there is no row.

## Decisions taken here

1. **Password delegation is a mounted provider UI at a new route.** Clerk's docs are explicit: the
   `<UserProfile />` component "must be embedded using the Next.js optional catch-all route in order for
   the routing to work" — so `app/office/account/[[...account]]/page.tsx` mounts it exactly the way the
   office already mounts the provider's sign-in at `app/office/sign-in/[[...sign-in]]`. `routing="path"`
   is the framework default and sub-paths (`/office/account/security`) work. It is behind the door
   (`requireOfficeSession`), and a "Back to the office" link returns to Settings.
2. **The notice card sits in Settings → Account** (the "System" card). Reuses one stylesheet and stays
   inside the task's declared files.
3. **The notice setting-row contract is defined here** (this is the reading end; TASK-006 writes them):
   - `last_backup_at` — an ISO 8601 instant; the daily job's heartbeat after a backup.
   - `storage_used_bytes` — whole bytes the image store holds, as the job measured it.
   - `storage_warning_bytes` — whole bytes, the figure usage is measured against; absent, the spec's
     4 GB (`4 × 1024³`) is the default.
   Written down in a comment in `lib/settings.ts`, because the keys must match the job's keys or the
   notice never lights and nothing would say so.
4. **The whole password form and its `#pDirty` quirk are gone**, not merely disabled — a disabled form
   would still be a password form the office built. The file's header comment now records why.

## What was verified

- **`lib/notices.test.ts` — 11/11**, and **260/260** tests overall (was 249; +11).
- **`notices-check.ts` — 13/13 against the live store:**
  - **no password material**: 0 password-shaped columns, `office_user` = `id, email, created_at,
    updated_at`, 0 password-mentioning setting rows;
  - **rows absent** → both read as absent (never as zero); storage says the figure *has not been
    reported*; backup says *"No backup recorded yet"* with **no date in it at all** (asserted: no
    4-digit run appears);
  - **`last_backup_at` present** → read back *exactly*, and the notice shows the day and time it
    carries (`Last backup 15 Oct 2026, 13:52.`);
  - **a heartbeat gone quiet** (72 h) → warns, and says how long (`3 days ago`);
  - **storage past the figure** (5 GB of 4 GB) → warns, both numbers shown;
  - **no warning row** → falls back to the spec's 4 GB (`1 GB of 4 GB`);
  - **an unreadable row** → *"Backup status could not be read"*, with no `NaN` and no fabricated date;
  - **the office is left with exactly the notice rows it started with** (0 — none were invented, and
    none the witness wrote were left behind).
- **The door holds for the new route:** `GET /office/account` **and** `GET /office/account/security`
  unauthenticated → Clerk `signed-out`, the page render-redirects to `/office/sign-in`, no account
  markup served. `/office/settings` still does the same.
- **Both cards are in the build:** the notice texts and the "Change password" / System-card copy are
  present in the built server and client bundles, and `/office/account/[[...account]]` appears in the
  route table.
- **The five gates, in order:** leak-check **PASSED**; typecheck **clean**; **260/260**; build clean;
  store-freshness **PASSED**.
- **Live store intact after every run** — the three settings unchanged with their original
  `updated_at`, `car` 17 · `enquiry` 6 · `draft` 0 · `car_photo` 49, and no notice rows.

## Not verified

- **The signed-in screen** — the standing Checkpoint B gap. There is no office session here, so
  nothing behind the door can be rendered: not the Settings screen itself, not the notice card's
  appearance, and not Clerk's profile UI on `/office/account`. The *data* path is witnessed end to end
  and both cards are proven to be in the build; the pixels are not.

## Findings — three choices that want the owner's ruling

None blocks this task's acceptance; all three are visible or contractual enough to name.

1. **The new `/office/account` route is outside the plan's declared files** (`settings/*`,
   `lib/settings.ts`). It is the documented Clerk shape (catch-all route) and mirrors the office's own
   sign-in route, and there is no way to *delegate* inside `settings/*` except embedding the provider's
   whole profile UI in a card — a much bigger visual change to a screen the owner specified. Flagged.
2. **The notices live in Settings → Account.** The plan's file list put them in `settings/*`, and the
   office shell carries its CSS per page (a shell-wide banner would mean editing every office page's
   stylesheet). The trade-off: a storage warning is only seen by an owner who opens Settings, whereas
   "there is no mail channel" argues for the **dashboard** (where he lands, and where a `warn` KPI
   style already exists). Easy to move — the logic is already separate from the display.
3. **The notice setting-row contract is mine to define, and it is a contract with TASK-006.** The spec
   names `last_backup_at` and "a storage-warning figure (default 4 GB)" but a *storage-past-threshold*
   notice also needs a **usage** figure read from a row (the spec forbids computing it live), and it
   names no key for one. I chose `storage_used_bytes`; bytes rather than GB, so no rounding is baked
   into storage; and `4 × 1024³` for "4 GB". If TASK-006 or the owner wants different keys or units,
   this is the moment — the job is not built yet and the keys cost nothing to change now.

Also still open from Task 26, and unaffected by this task: nothing on the showroom renders the
**tagline**; the car form does not yet **prefill from the full-tank default**.
