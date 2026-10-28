# DEMO-001 — testing task

**For:** a tester in a separate session that did **not** build this work.
**When:** DEMO-001 was built and closed on the owner's word on 2026-10-26. The owner has deferred
runtime testing until all building is done; the 2026-10-13 ruling places the independent pass at the
final test, TASK-007. This file is ready for that pass and is not a second implementation.
**Read first:** `task.md` (the guarantees and the benchmarks), then the change's `design.md` and
`specs/` in `openspec/changes/demo-mode/`. The specs are the contract; this file says how to prove
it.

## The tester's rules

- **Never point a destructive check at main.** The reset guards are designed to refuse a main
  target, but a guard test must use a throwaway branch, a local server or a unit test — never the
  live deployment's environment. A mistake here could delete the showroom. If no safe environment
  exists, verify the guard by code and unit test and mark the live check **NOT RUN** with the
  reason.
- **Test data only.** Use a test demo account and clearly named test cars, settings and uploads.
  Do not use the client's real account or real customer data. Prefer a throwaway demo account.
- **Main is read-only except for clearly named test markers that are restored or removed.** Most
  checks read main's counts and checksum. If a check needs a main write, use a clearly named test
  setting or test car and restore or delete it afterwards; record the residue (activity rows may
  remain).
- **Do not fix code.** The tester reports what was done, what was seen, expected versus actual, and
  any residue. The Builder fixes.
- **No secret in the report.** Do not print the backup key, `CRON_SECRET`, `NEON_API_KEY`,
  connection strings, tokens, customer names or numbers. A failure may quote a non-secret fragment.
- **A check that cannot run is not a pass.** Record the reason and whether code inspection or a unit
  test covered the same guarantee.
- **The build's own evidence is not the independent pass.** A builder's browser run or a green unit
  test is useful, but it does not replace the checks below.

## Setup

- The app running locally or on the preview, with main and demo stores reachable. The live demo
  branch is the practice copy; testing it is allowed, because it resets daily. Still avoid
  destructive guard tests against the live deployment.
- Clerk test accounts: one **owner/main** account (the owner's, or a test account carrying the
  exact main grant), one **client/main** account created through an invitation carrying the grant,
  and one **demo** account created through the demo sign-up. Do not share passwords; the tester
  signs in through the provider.
- The owner or an administrator available for dashboard facts: Clerk sign-up mode and metadata,
  Vercel project/cron/WAF, Neon project/branch, and environment-variable names (values not printed).
- A local/preview test environment for the guard checks, with test values for
  `DEMO_DATABASE_URL`, `DEMO_SIGNUP_ENABLED`, `DEMO_RESET_ENABLED`, `NEON_PROJECT_ID`,
  `DEMO_BRANCH_ID`, `DEMO_ASSET_CAP_BYTES`, `NEON_API_KEY`, `BACKUP_ENCRYPTION_KEY` and
  `CRON_SECRET`. This environment may use a throwaway demo branch; it must not point at main.
- Read-only SQL access to both branches (or the owner's read-only queries) for counts,
  `schema_migrations`, `office_user`, `session`, `tap` and activity checks.
- Sanity read access for asset labels and existence. A test dataset is preferred for tamper and
  unmarked-asset checks; do not modify the production seed.
- Test data: a unique demo car, a unique demo setting value, a demo photo, a demo PDF, a main photo
  and a main PDF (test-marked), and a main marker (setting or car) created **after** the snapshot.

## A. The space rule and the doors

**A1 — the owner is main.**
Sign in as the owner/main account and open `/office`.
Expected: the main inventory and main settings; no demo banner; the buyer-page preview is present on
a car. A read-only query shows the session row in main, not demo.

**A2 — the client is main.**
Accept the test invitation carrying `publicMetadata.truespec_space = "main"` and sign in.
Expected: the main office through the same provider path as before; no demo banner; the session row
is in main. If the client's account already existed, the grant is on the user and the result is the
same.

**A3 — a self sign-up is demo.**
Complete Clerk's sign-up from the demo link with a throwaway test address.
Expected: the office opens in demo; the banner is present; the data is the demo snapshot; the
session row is in demo; no main row is read or written.

**A4 — a forged main choice is ignored.**
With the demo account signed in, request an office page with each of: a `?space=main` query, an
`x-truespec-space: main` header, and a `truespec_space=main` cookie (use browser devtools or a
request tool). Also try setting a local-storage key if the app reads none.
Expected: the office still uses demo; no main data appears; no main write occurs. A forged value
never selects main.

**A5 — anonymous office request.**
Sign out, then open `/office` and call an office action directly.
Expected: refused before a store read; the sign-in page or a refusal appears; no main data is
rendered; the resolver does not return main. A unit test may be the evidence for the resolver throw.

**A6 — the demo store is missing.**
In the local/preview test environment, remove or break `DEMO_DATABASE_URL`; sign in as the demo
account; open `/office`. Then sign in as a main account.
Expected: the demo account gets a clear configuration error and never main data; the main account
still works. No fallback to main.

**A7 — session rows belong to one space.**
Query `office_user` and `session` in both branches for the test accounts.
Expected: main accounts' rows are in main; the demo account's rows are in demo; no row from the
other space authorises a request. The lazy upsert still works after a row is removed.

**A8 — sign-out in each space.**
Sign out the demo account, then the main account.
Expected: the provider session is revoked; the session row is deleted in the same branch; the other
branch's row is untouched; a second request does not become authorised by the other row.

**A9 — the door tests.**
Run the space-rule and store-door unit tests, including a test that imports a main door from the
project's Node script environment (`--conditions=react-server`) and proves the request layer is not
pulled in; and a test that a demo request cannot reach main.
Expected: all pass; no top-level `next/headers`, `@clerk/nextjs/server` or `lib/space` import in
the script-imported module.

## B. Isolation and the public side

**B1 — a demo write does not change main.**
Record main's `car`, `enquiry`, `draft`, `tap`, `setting` and `activity_event` counts and a checksum
of the relevant rows. Add a uniquely named demo car and change a demo setting.
Expected: main's counts and checksum are unchanged; the demo car and setting exist only in demo.

**B2 — a main write does not change demo.**
Record demo's counts. Change a main setting to a unique test value and restore it (or add and delete
a clearly named test car).
Expected: demo's counts and values are unchanged; the main write is seen in main only. Record any
activity residue.

**B3 — the showroom under a demo session.**
While signed in as the demo account, open the home page, inventory, a car page and the privacy page.
Compare with an anonymous window.
Expected: the same main cars, prices, photos, counts and settings; the unique demo car never appears;
no demo price or photo reaches the page; public metadata and links do not name demo.

**B4 — a showroom tap is main.**
From a main car page, record a WhatsApp tap while signed in as the demo account.
Expected: a new `tap` row in main for that car; no `tap` row in demo.

**B5 — the backup is main.**
Create a unique demo marker (a demo car or setting). Run the daily backup in the test environment,
or inspect the latest backup with the test key. Decrypt and search the archive for the marker.
Expected: the marker is absent; the backup contains main's tables only; the filename, seven-file
retention and encryption are unchanged. If decrypting the production backup is not safe, verify the
read path by code and mark the archive search NOT RUN.

**B6 — a demo setting does not reach the showroom.**
Change the demo's WhatsApp number or tagline. Open the public header and car page.
Expected: main's setting is shown, not demo's.

**B7 — a main setting reaches the showroom.**
Change a main setting and open the public page.
Expected: the main value appears; the demo value does not; restore the setting afterwards.

## C. The fixed snapshot

**C1 — one system seed.**
List the asset store and filter by label.
Expected: exactly one asset carries `truespec-demo-seed`; its filename is `demo-seed.json.gz.enc`;
no other asset carries that label. A demo upload with the same filename carries only
`truespec-demo`.

**C2 — the snapshot is authentic and complete.**
Download the seed asset; verify the GCM tag and decrypt with the environment key; parse the
archive.
Expected: the archive verifies; its table and sequence set is the fixed set; its generated time and
row counts are present; no key, connection string or row is printed in the report. If the production
key must not be used by the tester, do this in a test environment with a test snapshot and mark the
production decrypt NOT RUN.

**C3 — a demo upload cannot impersonate the seed.**
As a demo user, upload a file named `demo-seed.json.gz.enc` (a harmless test file).
Expected: the asset carries only `truespec-demo`; the seed count remains exactly one; a reset still
finds the real seed; the fake is deleted by the demo cleanup, not treated as the seed.

**C4 — older seeds are removed.**
In a test environment, run the snapshot tool twice (or create an old seed-labelled copy with the
Sanity API). Run the snapshot tool again.
Expected: only one seed-labelled asset remains; the old one is removed; the new one is the snapshot
the reset will use. Do not do this against the production seed.

**C5 — the snapshot output is clean.**
Run the snapshot tool and capture its output.
Expected: counts, generated time and asset id/filename only; no row contents, key, connection string
or person.

**C6 — a later main change does not enter the snapshot.**
Create a clearly named main marker **after** the snapshot. Run the reset. Open demo and query its
rows.
Expected: the marker is absent from demo; the original snapshot rows are present. Remove the main
marker afterwards.

## D. The reset and its guards

**D1 — the happy path.**
Record demo's row counts, `schema_migrations` and a checksum before the reset. Call
`GET /api/demo/reset` with the correct bearer and `DEMO_RESET_ENABLED` on.
Expected: a success summary; demo's data rows match the fixed snapshot; the snapshot's generated
time is reported; the reset's duration and counts are present; no secret in the response or logs.

**D2 — the demo branch's migration history is preserved.**
Compare demo's `schema_migrations` rows before and after D1. Run `db:migrate` against demo.
Expected: the rows are identical; migrations are not replayed; the command reports up to date. The
snapshot's older migration history did not overwrite the branch's own.

**D3 — a demo account survives.**
Sign in the demo test account after D1 and open the office.
Expected: the provider account still exists; the office opens in demo with the snapshot data; the
local `office_user` and `session` rows are recreated in demo; no main row is created.

**D4 — demo-only rows disappear.**
Create a uniquely named demo car before a reset; run the reset.
Expected: the car is gone; the snapshot's cars are present; no row without `is_demo` survives the
replace.

**D5 — main is untouched.**
Record main's counts and checksum before and after D1, and keep a main marker created before the
reset.
Expected: identical counts/checksum; the marker is still there; no main table was truncated or
written by the reset; the only main connection was the lock.

**D6 — a failed reset leaves demo unchanged.**
In the local/preview test environment, run the reset with a wrong `BACKUP_ENCRYPTION_KEY` (or a
tampered copy of a test snapshot), then with a snapshot whose table/column set disagrees.
Expected: the reset refuses or rolls back; demo's rows and `schema_migrations` are unchanged; main
is unchanged. Do not corrupt the production seed.

**D7 — overlapping resets are refused.**
Open a direct `pg` connection to main and hold
`pg_try_advisory_lock(hashtext('truespec-demo-reset'))`; call the reset; release the lock. If
possible, also fire two reset requests together.
Expected: the reset refuses while the lock is held; demo and main are unchanged; the second of two
concurrent requests refuses. After release, a reset can run.

**D8 — the wrong target is refused.**
In the local/preview test environment, try each of: `DEMO_DATABASE_URL` equal to `DATABASE_URL`;
a wrong `DEMO_BRANCH_ID`; a branch name that is not `demo`; a URL host that is not the configured
branch's read-write endpoint; a read-only endpoint; a missing `NEON_API_KEY`; and a Neon API that
cannot be reached.
Expected: every case refuses before a write; demo and main are unchanged; a read-only replica is not
used. Never run these against the live deployment.

**D9 — the operator switches and bearer.**
Call the reset with no bearer, a wrong bearer, and with `DEMO_RESET_ENABLED` off.
Expected: refused before touching a database; demo and main unchanged; a clear status, not success.

**D10 — the lock is in main, not demo.**
Hold an advisory lock with the same key on the **demo** branch (direct connection); call the reset.
Expected: the reset still runs, because its lock is in main; the lock on demo does not block it. This
checks the lock placement without relying on a race.

**D11 — a timeout is not success.**
Read the route's `maxDuration` and, if a test environment can delay the restore, force a timeout.
Expected: the configured duration fits the Hobby ceiling; a timeout returns/reports a failure, not
`ok`; demo is left as it was by the transaction. If a timeout cannot be forced, record the code
evidence and mark the live check NOT RUN.

**D12 — cleanup failure is reported, not hidden.**
In a test environment, use a Sanity token that can read/download but not delete (or mock the delete
failure). Run the reset.
Expected: the data restore commits; the summary says the cleanup step failed; no unmarked asset is
deleted to compensate; the next run may clear the remainder. If the failure cannot be induced, verify
the code path and mark the live check NOT RUN.

## E. Demo uploads, cleanup and the cap

**E1 — a demo photo and PDF are deleted.**
As a demo user, upload a test photo and a test PDF; record their asset ids. Run the reset.
Expected: both asset ids are gone from Sanity after the cleanup; the demo's rows are replaced; no
main asset is affected.

**E2 — main uploads are untouched.**
As a main user, upload a test photo and a test PDF; record their asset ids. Run the reset.
Expected: both assets still exist; their rows in main are unchanged; the demo cleanup never
considered them.

**E3 — the snapshot and backup are untouched.**
Record the seed asset id and the newest backup asset id. Run the reset.
Expected: both still exist; neither was listed as a cleanup candidate; the backup retention did not
treat the seed as a backup.

**E4 — an unmarked asset is not deleted.**
In a test dataset, create an asset with no demo mark (or use a main/seed asset). Run the reset.
Expected: the asset remains; if the cleanup cannot classify it, the summary reports it rather than
deleting it by elimination.

**E5 — the demo filename does not match the seed.**
Repeat C3 with the reset: upload a demo-marked file named `demo-seed.json.gz.enc`; run the reset.
Expected: the seed count remains one; the demo-marked file is deleted by the demo cleanup; the seed
is still present and used.

**E6 — the cap refuses an over-cap upload.**
In the local/preview test environment, set `DEMO_ASSET_CAP_BYTES` to a small value (for example,
less than the next test file). Upload a demo photo or PDF that would exceed it.
Expected: the upload is refused before bytes are stored; the message says the demo storage is full
until the next reset; the existing demo assets remain; a main upload is still allowed.

**E7 — a cap-read failure refuses.**
Make the demo-marked asset sum unreadable (bad Sanity token/list failure in the test environment).
Attempt a demo upload.
Expected: refused; no bytes stored; the person gets a clear message; it does not upload unmetered.

**E8 — the cap counts demo only.**
With main holding a large test asset, check the demo cap calculation.
Expected: main's asset is not counted; the demo cap is unchanged; main is not considered.

**E9 — main cleanup excludes demo, seed and backup.**
Open the main Settings cleanup card with demo assets, the seed and backups present.
Expected: the "unreferenced" list does not include a demo-marked asset, the seed, or a `backup-`
file; the card may count the store but does not invite the owner to delete those. The demo Settings
does not render this card at all.

## F. Accounts, the demo office and the preview

**F1 — owner main, no banner.**
Already A1. Check the office shell on the dashboard, inventory, car, enquiries, activity and
settings.
Expected: no demo banner anywhere; main's data.

**F2 — client main, no banner.**
Already A2. Check the same pages.
Expected: no demo banner; main's data; the buyer-page preview is present.

**F3 — self sign-up demo, banner on every page.**
As the demo account, open the dashboard, inventory, a car, enquiries, activity and settings.
Expected: the banner is present on every page; it says the data is a demo, resets daily (around
03:00 UTC), and uploads are deleted; it is accessible (not color-only; readable at all widths). The
main office shows none.

**F4 — demo sign-up off.**
In a test environment set `DEMO_SIGNUP_ENABLED` off. Open the sign-in page and the demo sign-up URL
directly.
Expected: the demo link is hidden; the sign-up route serves no form and returns to sign-in; the
provider's own sign-up mode is unchanged and is recorded as the outer switch.

**F5 — demo reset off.**
In a test environment set `DEMO_RESET_ENABLED` off. Call the reset with the correct bearer.
Expected: refused; demo and main unchanged; no database write.

**F6 — sign-out in each space.**
Repeat A8 and check the provider session is revoked, not only the local row.
Expected: the office returns to sign-in; the local row in the same branch is gone; the other space
is unaffected.

**F7 — a demo account after a reset.**
Use the account from D3 after a reset.
Expected: signs in; the office opens in demo; the snapshot data is present; the local session row is
recreated; the account still has no main access.

**F8 — the buyer-page preview.**
Open a demo car in the demo office and a main car in the main office.
Expected: the demo car has no "Preview the buyer page" control; the main car keeps it and the link
opens the main showroom's car page, not a demo page.

**F9 — demo Settings omits the main cards.**
Open Settings as the demo account.
Expected: no System card (storage/backup figures) and no cleanup-readiness card; the settings the
demo can practise are present and save in demo; the page source, server props and client payload do
not contain main's storage, backup or asset filenames. The main Settings still shows the System and
cleanup cards.

**F10 — the activity actor is visible.**
On a touch viewport (or with hover unavailable), open the activity page and the dashboard panel in
both spaces.
Expected: the actor's email is visible in the row; the initial remains; a demo action names the demo
actor; a main action names the owner; no customer name or number appears.

**F11 — uploads are marked from the session.**
As a demo user, upload a photo and a PDF; as a main user, upload a test photo and PDF. Read the
asset labels in Sanity.
Expected: the demo assets carry exactly `truespec-demo`; the main assets carry no demo mark; no
label contains a name, email, phone or filename. The demo assets are the only ones the cleanup
considers.

## G. Privacy and the sign-up words

**G1 — the privacy notice.**
Open the privacy page.
Expected: it distinguishes a showroom visitor from a person who chooses a demo account; says the
email is used for sign-in only; says demo data and uploads reset daily; says there is no marketing
email; says the application has no email channel of its own and the identity provider may send
authentication messages; it does not say the site has no accounts at all while demo sign-up is
offered. No `mailto` or invented email address.

**G2 — the demo sign-up page.**
Open `/office/sign-up` with the flag on.
Expected: Clerk's own sign-up form; the demo note says demo account, daily reset, uploads deleted,
and the public showroom shows main, not the demo inventory; a link to the privacy notice. No
application credential form and no password material.

**G3 — the sign-in page.**
Open `/office/sign-in`.
Expected: the client's normal provider sign-in is unchanged; the demo link is present only when the
flag is on; no "invite-only" or "no sign-up" copy or comments remain in user-facing text.

**G4 — no page claims there is no sign-up.**
Search the rendered public and office pages and the source for "no sign-up", "invite-only",
"no accounts" and similar claims.
Expected: none in user-facing copy. The old access requirement's wording is gone.

**G5 — no email channel.**
Search the code and the running app for outbound email, marketing or contact-email behaviour.
Expected: none; the notice's statement is true; only Clerk's own authentication messages are
possible, as described.

## H. Legacy, deployment and the handover

**H1 — the wipe is retired.**
Read `package.json` and the scripts folder; try the old `demo:wipe` command.
Expected: the npm script is gone; the source is gone or fails closed without opening a database or
deleting an asset; no replacement `is_demo` CLI exists. The old command cannot delete main's
`is_demo` rows.

**H2 — the reset does not depend on `is_demo`.**
Search the reset and session paths for `is_demo`; create a demo car without the flag and reset.
Expected: no new behaviour depends on the flag; the whole demo store is replaced; the car without
the flag is gone; the flag's legacy meaning is recorded.

**H3 — the seed is not the demo reset.**
Read `scripts/seed.ts` and the npm scripts.
Expected: `db:seed` is a main seeding tool; it is not presented as a demo refresh; the demo reset
uses the fixed snapshot. Do not run a destructive seed against main for this check.

**H4 — one deployment and one project.**
Read the Vercel, Clerk and Neon dashboards (or owner-provided screenshots).
Expected: one Vercel project and one public URL; one Clerk application; one Neon project; the demo
is a branch named `demo` with its own connection string; no second Vercel/Clerk/Neon project; no
second public URL.

**H5 — the schedules.**
Read `vercel.json` and the deployment's cron list.
Expected: the backup at `0 2 * * *` and the demo reset at `0 3 * * *` UTC; both paths match their
routes; both routes require the bearer; the Hobby start window and 100-cron allowance are recorded;
there is no second deployment.

**H6 — the configuration names.**
Read the Vercel and local environment (names only) and the code's config reader.
Expected: `DEMO_DATABASE_URL`, `DEMO_SIGNUP_ENABLED`, `DEMO_RESET_ENABLED`, `NEON_PROJECT_ID`,
`DEMO_BRANCH_ID`, `DEMO_ASSET_CAP_BYTES` (optional, default 2 GiB), plus `NEON_API_KEY`,
`BACKUP_ENCRYPTION_KEY` and `CRON_SECRET`; no value in the repository; `.env.local` is ignored.

**H7 — no secret in the repository, a log or a report.**
Search the repository, the build/run logs and the report for key names and value patterns. Do not
print a value.
Expected: no `BACKUP_ENCRYPTION_KEY=`, `NEON_API_KEY=`, `CRON_SECRET=` or connection string in a
committed file, a log or a report; the handover is outside the repo.

**H8 — the owner setup order.**
Read the handover outside the repo and the deployment's current state.
Expected: the metadata steps, the demo branch/migration, the env with sign-up off, the snapshot, the
first reset, then Clerk sign-up and the app link, then the cron/redeploy. The first demo account was
not created before the snapshot and first reset. If the historical order is not evidenced, record
that fact rather than assuming it.

**H9 — both branches are migrated.**
Compare `schema_migrations` on main and demo; run `db:migrate` against both (owner-provided
connection).
Expected: both up to date; the reset's column check is the backstop; a demo branch behind main
refuses rather than coercing. Do not intentionally break the schema for this check.

**H10 — the neighbours are unchanged.**
Read the `/api/tap` WAF rule and the backup cron.
Expected: `/api/tap` is still 30 requests per minute per IP with action 429; the backup is still
`0 2 * * *`; the origin/body checks are unchanged; no second WAF rule or deployment was added.

## I. Gates, regression and residue

**I1 — the gates.**
Run `npm run typecheck`, `npm test`, `npm run build`, `npm run leak-check` (where the remote store
is reachable), `npm run store-freshness`, `npm run db:migrate` against main and demo, and
`openspec validate --all`.
Expected: 0; all pass; 0; PASSED or a recorded timeout; PASSED; up to date on both; validation
passes. Record the exact figures.

**I2 — the neighbours.**
Exercise the TASK-006 backup and enquiry delete, the tap buttons and WAF, the showroom, the office's
car/draft/settings/export flows, and the privacy page.
Expected: unchanged behaviour; the demo work does not leak into main's paths.

**I3 — isolation after the whole pass.**
Re-check the unique demo car/setting and the main marker after the resets and writes.
Expected: the demo items are in demo only; the main marker survived; no main data appears in demo;
no demo data appears in the showroom or backup.

**I4 — the reset summary is truthful.**
Compare the reset summary's counts and cleanup counts with the store.
Expected: the reported counts match; a failed step is named; a failure is not reported as success;
no secret appears in the summary or logs.

**I5 — residue and accounts.**
List every test car, setting, photo, PDF, tap, activity row and Clerk account created for the pass.
Expected: demo rows/uploads are removed by the reset or by the tester; main test markers are restored
or deleted; test Clerk accounts that remain are named for the owner to remove; no customer data was
used.

## Reporting

For each group: **PASS / FAIL / NOT RUN**, the exact URL or command, what was seen, and the evidence.
A FAIL names expected versus actual and the smallest useful reproduction. A check that could not run
names the reason and whether code inspection or a unit test covered the guarantee.

The report ends with:

- the gates' figures;
- every created demo row/file and whether it was removed;
- every main test marker and whether it was restored or deleted;
- every test Clerk account left behind;
- any check that could not run and why;
- any genuine gap in the task's decisions (a question for the owner, not an invented rule).

No secret, key, connection string, customer name or number appears in the report.
