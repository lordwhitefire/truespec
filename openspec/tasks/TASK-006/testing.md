# TASK-006 — testing task

**For:** a tester in a separate session that did **not** build this work.
**When:** the owner's 2026-10-13 ruling defers the independent pass to the final test. This file is
ready for that pass; it is not a second implementation.
**Read first:** `task.md` (the guarantees and the benchmarks). This file says how to prove them.

## The tester's rules

- **Demo data only.** Anything created for a check carries a demo marker where the store has one;
  real cars and real customer rows are never touched. Prefer throwaway rows and leave the store
  net-zero.
- **A separate environment for destructive checks.** The restore drill uses a Neon branch. The
  retention check uses a test Sanity project/dataset or a preview environment; if neither exists,
  do not delete the current dataset's real backups — mark the live check **not run**, with the
  reason, and verify the query and the guard from the code.
- **Do not fix code.** The tester reports what was done, what was seen, expected versus actual, and
  any residue. The Builder fixes.
- **No secret in the report.** Do not print the backup key, the cron secret, tokens, customer names
  or numbers. A failure may quote a non-secret fragment.
- **A check that cannot run is not a pass.** Record the reason.

## Setup

- The app running locally or on the preview, with an office session (Clerk) and the demo store.
- A test `BACKUP_ENCRYPTION_KEY` and `CRON_SECRET` in the local/preview environment for the job
  drill. **Do not ask for or use the production handover key**; the production handover is checked
  by its file, permissions, and the owner's confirmation (group J), not by decrypting a production
  backup.
- A Neon branch for the restore (`DATABASE_URL_RESTORE`), empty.
- Dashboard access (or owner-provided screenshots) for the WAF rule, Clerk settings and Vercel Cron.
- Test data: the seeded imported sheet with several enquiries, plus a fresh small PDF import if the
  seeded one is not enough. Know which enquiries share a `pdf_import_id` before deleting one.

## A. Delete an enquiry

**A1 — one of several from a shared sheet.**
Open the seeded sheet's first enquiry; press Delete; read the confirmation; confirm.
Expected: the card disappears; the `enquiry` row is gone; the `enquiry_pdf` row still exists; its
Sanity file still exists; the other enquiries from the sheet still open and still show their
imported-sheet state; the tap count is unchanged; the activity log has exactly one
`enquiry.deleted` row for the `ENQ-####` with the signed-in owner's email; no customer name or
number appears in the log.

**A2 — the last enquiry of a sheet.**
Delete the last enquiry that references a test `enquiry_pdf`, with **no draft from that sheet
waiting**.
Expected: the `enquiry_pdf` row is gone; its Sanity file is gone; if the file will not delete, the
result says so and the Settings cleanup card lists the unreferenced asset; the activity row is
written once; no other row is affected.

**A3 — cancel.**
Open the confirmation; press Cancel.
Expected: the enquiry, the PDF and the activity feed are unchanged.

**A4 — no session.**
Call the delete action without a session (a direct request or a signed-out tab).
Expected: refused before the store is touched; no row deleted; no activity row.

**A5 — repeat.**
Delete the same enquiry twice.
Expected: the second call says it is already gone; no second activity row; no crash; the board still
loads.

**A6 — the confirmation's words.**
Read the confirmation.
Expected: it names the `ENQ-####`; it says what is removed; it says the taps stay; it says it cannot
be undone; the destructive button is not the default focus.

## B. The imported-PDF link

**B1 — a new import.**
Import a small demo PDF, open one enquiry draft, save it.
Expected: the new enquiry carries a non-null `pdf_import_id`; exactly one `enquiry_pdf` row exists
for that source asset; the board says the enquiry came from the imported sheet; deleting it (if it
is the only reference) removes the row and the file.

**B2 — two enquiries from one sheet.**
Save a second draft from the same batch.
Expected: both enquiries point at the **same** `enquiry_pdf` row; deleting one keeps the PDF row and
file for the other; deleting the second removes them.

**B3 — repeat save.**
Repeat the save of the same draft.
Expected: one enquiry, not two; one `enquiry_pdf` row.

**B4 — an old enquiry with no link.**
Find an enquiry saved from a draft before this layer (or create one in the old shape: no
`pdf_import_id`).
Expected: it deletes cleanly; the action does not claim to have removed a PDF; any orphan file is
reported by the cleanup card, not silently deleted.

**B5 — a draft from the same sheet is still waiting.**
Save one enquiry from a sheet but leave another draft from the same upload unsaved. Delete the
saved enquiry.
Expected: the `enquiry_pdf` row and its file **stay**; the waiting draft still opens and still
saves against the same PDF; deleting the draft's saved enquiry later removes the file only when
nothing else references it.

## C. The duplicate car

**C1 — add once.**
Add a demo car and Save.
Expected: the browser lands on `/office/car/<TS-####>`; the car count rises by one; the activity log
has one `car.created`.

**C2 — no second Save.**
After C1, try to reach the old add form (Back, or the add URL) and save again only if the form is
genuinely new.
Expected: the completed add form is gone; a new add is a new form session; the original car is not
duplicated.

**C3 — retry the same submission.**
Replay the add submission with the same `submissionId` (the form's hidden value; a browser network
replay or the builder's test hook).
Expected: the same `TS-####` comes back; the store has one car; there is no second `car.created`
row.

**C4 — edit.**
Open an existing car, change a field, Save.
Expected: one row updated; the browser stays on the edit screen; no duplicate.

## D. The tap limit

**D1 — the limit.**
From one IP, send 30 taps within 60 seconds; send the 31st.
Expected: the first 30 are accepted (the route's own status); the 31st is `429`. A request from a
different IP is accepted. A bad origin still `403`; a bad body still `422`.

**D2 — deployment rule.**
In the Vercel dashboard, read the WAF rule.
Expected: path `/api/tap`; key IP; 30 requests / 60 seconds; action `429`. Record the region scope
(the counters are per region); a distributed flood can exceed one region's limit — accepted for the
demo, noted not failed.

## E. The daily job

**E1 — no key.**
Call the route with no `Authorization`, then with a wrong bearer.
Expected: refused before any work; no backup file; no heartbeat change; a clear status, not `200`.

**E2 — the happy path.**
Call with the correct bearer.
Expected: one `backup-YYYY-MM-DD.json.gz.enc` in the current test dataset; `last_backup_at` written;
`database_used_bytes` and `storage_used_bytes` written; the summary says each step succeeded; no
secret in the response or the logs.

**E3 — a second run the same day.**
Call again.
Expected: no second file with that name; the existing file is reused; no duplicate heartbeat; no
client asset is touched or deleted.

**E4 — the round trip.**
Download the test backup; decrypt with the test key; verify the auth tag; gunzip; parse.
Expected: the JSON has the schema version, the tables, and the sequences; the table list covers every
`public` base table; a restore into the empty Neon branch loads in foreign-key order; the row counts
match the source; the sequences continue from the stored values; the app can read the restored
branch.

**E5 — tamper.**
Change one byte of the ciphertext, then try to decrypt.
Expected: a clean authentication failure; no partial JSON is trusted.

**E6 — retention.**
In a test dataset, place eight files matching the backup pattern (with test dates) and one client
asset.
Expected: after a run, the newest seven backup files remain; the client asset is untouched; the old
files are the only ones deleted.

**E7 — a failed upload.**
Break the Sanity token or the upload (in the test environment).
Expected: the run reports failure; `last_backup_at` is unchanged; the old heartbeat remains; the
System card's stale-backup notice appears after the 48-hour test row; the job does not claim success.

**E8 — no client deletion.**
Search the job's code paths and the run's effects.
Expected: the only deletes are its own old backup files; no customer, car, photo, PDF or tap is
deleted.

## F. Storage and the System card

**F1 — the two lines.**
Set `database_used_bytes` just below and at 800 MB; set `storage_used_bytes` just below and at 4 GiB
(use test rows and restore them).
Expected: below is calm; at the threshold warns; the two lines are independent; the wording names
the measure and the limit, not just "storage".

**F2 — honest absence.**
Remove one used row; make another unreadable.
Expected: "not reported yet" and "cannot be read" respectively; no invented zero; the backup notice
still reads its own row.

**F3 — the card.**
Open Settings.
Expected: three notices — Database, Photos and files, Backup — each with its own state; no layout
break on mobile or desktop.

## G. The cleanup card

**G1 — each group.**
Create or use: a deleted car tombstone; an enquiry at its year; a row holding an address; a row
pointing at a missing asset; an unreferenced test asset; a stale `auth_attempt`.
Expected: each appears under its group with a count; the car shows its photos/cost lines/sold state;
the enquiry shows its `ENQ-####` and details; the address and missing-asset rows are named, not
silently omitted.

**G2 — no writes.**
Record the relevant row counts and the Sanity asset list before and after opening the card.
Expected: unchanged. There is no delete button and no action on the card.

**G3 — unreadable asset store.**
Make the Sanity read fail in the test environment.
Expected: the card says it could not read the store and prints the reason; it does not say "nothing
to clear".

## H. The actor in the activity log

**H1 — visible email.**
On a touch viewport (or with hover unavailable), open the activity page and the dashboard's recent
activity.
Expected: the actor's email is visible in the row, not only in a `title`; the initial still shows;
the action word and subject are readable.

**H2 — a removed account.**
A row whose actor no longer exists.
Expected: the existing plain treatment; no crash; no false email.

**H3 — the delete event.**
Filter the activity log to Deleted.
Expected: `enquiry.deleted` is there, subject the `ENQ-####`, actor the owner's email; no customer
name or number.

## I. The privacy notice

**I1 — no email.**
Search the rendered page for an email address and `mailto:`.
Expected: none. The deletion-request sentence points to WhatsApp, speaks to showroom visitors, and
says the tap record stays.

**I2 — the contact.**
The WhatsApp link uses the saved number, not a literal.
Expected: the same number the Settings card holds.

## J. Deployment and the handover

**J1 — Clerk.**
Read the provider's settings.
Expected: sign-up disabled/invite-only; lockout 10 failed attempts / 30 minutes. Record what was
seen.

**J2 — the WAF rule.**
Read the Vercel rule.
Expected: it exists as in D2.

**J3 — the handover file.**
After the build, check `/home/lordwhitefire/truespec-secrets/`.
Expected: the folder exists, `700`; one file, `600`; outside the repo; it contains
`BACKUP_ENCRYPTION_KEY`, `CRON_SECRET`, and the exact Google Password Manager entry (site
`TrueSpec backup key`, username `daily-backup`, note as written). No key appears in `git grep`, a
committed file, a log, or a report. The owner confirms he set both Vercel values and saved the
password-manager entry; the file may then be deleted or kept.

**J4 — the schedule.**
Read `vercel.json` and the deployment's cron list.
Expected: one cron, path `/api/cron/daily`, daily schedule; the path matches the route; the route
requires the bearer.

## K. Regression and the gates

**K1 — the gates.**
Run `npm run typecheck`, `npm test`, `npm run build`, `npm run leak-check`,
`npm run store-freshness`, and `openspec validate --all`.
Expected: 0, all pass, 0, PASSED, PASSED, 1 passed/0 failed. Record the exact figures.

**K2 — the neighbours.**
Car delete and undo; draft save and discard; Settings saves; the export ZIP; the showroom's tap
buttons and photos.
Expected: unchanged behaviour. The new delete/cleanup/notice work does not leak into them.

**K3 — the store's freshness.**
The demo store's readiness checks still pass; no test residue is left in the counts.

## Reporting

For each group: **PASS / FAIL / NOT RUN**, the exact URL or command, what was seen, and the
evidence. A FAIL names expected versus actual and the smallest useful reproduction. The report ends
with:

- the gates' figures;
- every created demo row/file and whether it was removed;
- any check that could not run and why;
- any genuine gap in the task's decisions (a question for the owner, not an invented rule).
