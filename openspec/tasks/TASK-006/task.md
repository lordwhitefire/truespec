# TASK-006 — the system model

**Layer:** 6, the last layer. **Status:** ready to build. **Testing:** `testing.md` (a separate
session that did not build it; the owner's 2026-10-13 ruling defers the independent pass to the
final test).

**This is a plan, not a set of commands.** It states what must be true, the constraints, and the
benchmarks that decide it. The Builder chooses the code; where this file is silent, the code's own
rules and the existing architecture decide.

## What this task is

The screens are built. This layer is the behaviour behind them: the daily job that backs up and
measures, the warnings that tell the owner when storage or the backup needs attention, the
report-only cleanup list, the owner's own delete for an enquiry, and the guards that stop a
repeated save from making a second record. It also removes the last two false promises: the
privacy notice's missing email channel, and the imported PDF that the app never linked.

It is the last layer. TASK-007 is the final pass, not another layer.

## The rule that shapes every part

The system never deletes client data on its own initiative — not a customer, not a car, not a
file. It makes the owner **able** to act, and it **reports** what waits. The only litter it may
clear is its own: an upload no record ever referenced, and `auth_attempt` rows past 90 days
(TASK-003 ruling). Every job in this task reports; none removes a customer's record.

The owner is the client. The delete is his control over data he owns, not a customer-rights
portal. The privacy notice speaks to **showroom visitors**; it owes the client no privacy notice
about his own office data.

## What is already true — do not rebuild it

- The office reads and writes through the shared store guard; sessions, drafts, the export, the
  car delete and undo, the settings, and the Sanity client all exist.
- `lib/settings.ts:43-50` names the job's keys: `last_backup_at`, `storage_used_bytes`,
  `storage_warning_bytes`. `lib/notices.ts` turns them into the System card's notices, honestly:
  an absent row is said to be absent, never turned into zero or an invented date.
- `lib/cleanup.ts` already computes the five cleanup groups and the asset-store readability. It is
  read-only; its only caller is the manual CLI.
- `lib/sanity.ts` uploads images and files and deletes assets with the existing `SANITY_TOKEN`
  (`lib/config.ts:27-29`). No new Sanity key is needed.
- `app/office/actions/car.ts:242` (`removeCarForever`) is the pattern for a delete that removes the
  rows in the store first, then clears the external bytes and reports any that would not go.
- `app/api/tap/route.ts` checks origin and body, then writes. It has no counter and no limit.
- The privacy notice offers WhatsApp only (`app/(site)/privacy/page.tsx:127-140`) but its "Your
  rights" paragraph names an email that does not exist (`:121`).
- `enquiry.pdf_import_id` exists (`migrations/0004_enquiries.sql:21`), but only `scripts/seed.ts`
  writes an `enquiry_pdf` row; the app never does.

## The work

### A. The owner's delete for an enquiry (Q8)

**The guarantee.** The owner can remove an enquiry he owns, with a confirmation. The enquiry row
goes; its imported PDF row and Sanity file go **only when no other enquiry still references that
sheet**; the taps stay; the deletion is written to the activity log with the
`ENQ-####` and the actor, never the customer's name or number.

**Where.** The enquiry detail dialog (`app/office/(shell)/enquiries/enquiries-client.tsx`) already
has WhatsApp, Call and Edit. A Delete control belongs in that footer. It opens a second
confirmation dialog (the same `Dialog` component) naming the `ENQ-####`. The confirmation says
what goes, what stays, and that it cannot be undone.

**The action.** A Server Action in `app/office/actions/enquiry.ts`:

- It checks the session and validates the id before the store is asked.
- A `DELETE ... RETURNING ref, pdf_import_id` CTE writes the `enquiry.deleted` activity row from
  the deleted row in the same statement, so the event exists only when the delete happened.
- It counts the remaining enquiries with that `pdf_import_id` **and the waiting drafts with the
  same source asset** (`draft.source_asset_id`). If both are zero, it reads the
  `enquiry_pdf.sanity_asset_id`, deletes the `enquiry_pdf` row, and calls `deleteAsset`. A file that
  will not delete is reported, not swallowed; the cleanup list will show it.
- A repeat finds no row and says the enquiry is already gone; no second event.
- It revalidates `/office/enquiries`, `/office/activity`, `/office` and `/office/settings`.

**The UI.** The card disappears after the action; the dialog closes; a toast names the
`ENQ-####`. If the PDF was kept because other enquiries or a waiting draft still use it, the toast
says so. A failure is shown in the dialog, in the store's own words.

**The activity.** Add `enquiry.deleted` to `ACTIONS` (`lib/activity-feed.ts`) with the word
"Deleted an enquiry" and the existing `del` category. The subject is the `ENQ-####`.

**The edge the task must not get wrong:** one imported sheet produces many enquiries, and they
share one `enquiry_pdf` row; a draft from the same upload also points at the file through
`draft.source_asset_id`. Deleting one must not null the other enquiries' `pdf_import_id`
(`ON DELETE SET NULL`) or remove the file they or a waiting draft came from. The enquiry count and
the draft count are the guard.

### B. Link the imported PDF (Q3 / DATA-001)

**The guarantee.** An enquiry saved from an imported sheet remembers the sheet, so the delete can
find the file.

Today `enquiryCreateStatement` (`lib/enquiry-create.ts`) does not write `pdf_import_id`, and the
app has no other writer of `enquiry_pdf`. The fix is in the draft save:

- A draft carries `source_asset_id` (the PDF already in Sanity) and `source_filename`
  (`migrations/0022_draft.sql:48-51`). At the save of an enquiry draft, find or create the
  `enquiry_pdf` row for that source asset; write its id as the new enquiry's `pdf_import_id`.
- One stored file gets one row. A migration adds a unique index on
  `enquiry_pdf.sanity_asset_id`; a repeat save or a second draft from the same sheet reuses the row.
  If the store somehow holds duplicates, the migration keeps one and repoints the enquiries before
  the index is created.
- `rows_total` is the number of enquiry drafts in the batch at save time; it is metadata.
- The seeded enquiries already carry the link. No backfill is attempted for an old enquiry whose
  draft is already gone: it has no source id to look up, and the delete says it has no PDF. The
  orphan file, if any, is exactly what the cleanup report exists to show.

### C. Stop the duplicate car (the spec gap)

**The guarantee.** A second Save after a completed add cannot make a second car, and a retry after
a lost response resolves to the same car.

- The add form carries an identity for the form session — a `submissionId` minted when the add form
  is opened (a UUID). The form sends it; `createCar` uses it as the car's id instead of minting a
  fresh one per call. A retry with the same id is the same car; the existing
  `ON CONFLICT (id) DO NOTHING` does the rest. If the field is absent (an old client), the action
  may mint one as today; the shipped form always sends it.
- After a successful add, the browser navigates to the created car (`/office/car/<ref>`), as the
  draft path already does (`car-client.tsx:888`). The add form is gone, so the after-completion tap
  has nowhere to land. Edit mode keeps its current behaviour.
- The action's comment that says the key is minted "here, once" is corrected: the key belongs to
  the form session, not to one call.

**Not the fix:** disabling the button harder. The duplicate is the tap after the save finishes, not
the tap during it; the button is already disabled while pending.

### D. Show the actor (Q9)

`lib/activity-feed.ts:96-99` returns the operator's initial and puts the email only in a `title`
(hover). The feed already carries the email (`lib/office.ts:441-448`). The email must be **visible
in the row** on the activity page and the dashboard's recent-activity panel, so a touch screen
shows who acted. Keep the initial; add a small label. A removed account keeps its existing plain
"?" treatment. No new permission work: this is the demo's compensating control (SYS-002).

### E. The tap limit (Q1 / SYS-003)

The limit is a **Vercel WAF rate-limit rule** on `/api/tap`: per IP, **30 requests per 60 seconds**,
action `429`. It is a dashboard setting on the project, not application code; the app's origin
(`403`) and body (`422`) checks stay exactly as they are. Hobby allows one rule; this is it. The
task records the exact rule and the testing pass hammers it from one address.

The WAF's counters are per region; a distributed flood can exceed one region's limit. For the demo
that residual is accepted.

### F. The daily job (SYS-006 / Q5 / Q6)

**One authenticated route, one schedule.**

- Route: `app/api/cron/daily/route.ts`, `GET`, `dynamic = "force-dynamic"`, `maxDuration = 300`.
- Schedule: `vercel.json` with `{ "crons": [{ "path": "/api/cron/daily", "schedule": "0 2 * * *" }] }`.
  On Hobby it runs once a day, somewhere inside the scheduled hour (±59 minutes); the job must not
  assume a precise hour.
- Auth: read `CRON_SECRET`; require `Authorization: Bearer <value>`. A missing or wrong value is
  refused before anything runs. No secret in the repo.
- Delivery is best effort: Vercel does not retry and may invoke the same run twice. The job must be
  **idempotent** and must not overwrite a good backup with a worse one.

**What the run does, in order:**

1. **Dump the database.** No `pg_dump` binary runs in a Vercel Function. Read the public tables the
   app owns (including `schema_migrations`, the migration ledger, so a restore knows what ran) over
   the server-only connection, plus the sequences (`ts_ref_seq`, `enquiry_ref_seq`), and write one
   JSON archive. The table list is fixed and documented; the run checks it against
   `information_schema.tables` and fails the backup if a `public` base table is missing, so a future
   table cannot be silently missed. The testing pass confirms the check with a query.
2. **Compress and encrypt.** gzip the JSON, then AES-256-GCM with `BACKUP_ENCRYPTION_KEY`
   (32 bytes, base64), a random 12-byte IV and the 16-byte auth tag. The envelope is documented so
   the restore script can read it. The filename is `backup-YYYY-MM-DD.json.gz.enc`; it leaks only
   the date. The key is never logged.
3. **Upload to Sanity.** Use the existing `@sanity/client` `assets.upload("file", ...)` (the
   existing `uploadFile` helper is the door; its \"an enquiry PDF\" comment is widened to any app
   file, since the backup is the second caller). The current dataset is public-read by design; the
   ciphertext is the protection. No private dataset, no permissions.
4. **Write the heartbeat only after the upload returns an asset id.** `last_backup_at` is written
   after the upload is confirmed. A failed upload leaves the old heartbeat exactly where it was, so
   the 48-hour notice eventually speaks.
5. **Idempotency.** If an asset with that exact filename already exists, reuse it; do not upload a
   second copy. If the first run uploaded but died before the heartbeat, the second finds the file
   and writes the heartbeat.
6. **Retention.** List the Sanity file assets whose filename matches the backup pattern, sort by
   the date in the filename, and remove all but the newest **7** via `deleteAsset`. Only files with
   the exact backup prefix and suffix; never a client photo or a PDF. A failed old-file delete is
   reported and does not fail the backup.
7. **Measure storage.** `pg_database_size(current_database())` for the database; the sum of
   `sanity.imageAsset.size` and `sanity.fileAsset.size` for the assets. Write
   `database_used_bytes` and `storage_used_bytes`. The existing `storage_warning_bytes` stays; the
   database gets `database_warning_bytes` if present, otherwise the default below. Measure after
   the upload so the day's dump is included.
8. **Return a summary** (one JSON object) and log one line per step. No row contents, no secrets.

**What the job never does.** It never deletes a client record, never deletes a client asset, never
rewrites a good backup, and never writes "now" on a failure. It may delete only its own old backup
files. The `deleteAsset` comment (`lib/sanity.ts:127-136`) says only two callers exist; that is no
longer true. It must name all four: the demo wipe, the owner's car removal, the owner's enquiry
delete, and this job's own old backup files — and keep the rule: the job deletes nothing a customer
or the owner still holds.

**Restore.** A script (`scripts/backup-restore.ts`) reads a backup file, verifies the auth tag,
gunzips, and loads the JSON into an empty database or a Neon branch in foreign-key order, then
restores the sequences. The drill starts from an empty branch with the schema applied (migrations),
then replaces the table contents — including the migration ledger — so the row counts match the
dump; the exact sequencing is the Builder's. It refuses to run against the main `DATABASE_URL`; the
drill uses a separate `DATABASE_URL_RESTORE`. The testing pass includes a restore drill on a branch.

### G. Storage lines and the cleanup card (Q7 / Q10)

**Two storage lines, because one figure cannot serve both limits.**

- Neon Free is 1 GB per project; a combined 4 GiB warning would never speak before the database
  stops accepting writes.
- Sanity Free is 100 GB of assets; a combined figure would be dominated by photos.
- The System card shows **Database** (used: `pg_database_size`; warning: **800 MB**) and **Photos
  and files** (used: Sanity asset sizes; warning: **4 GiB**), each with its own honest
  "not reported yet" state. The existing `storage_used_bytes` / `storage_warning_bytes` pair
  carries the assets line; the database gets `database_used_bytes` / `database_warning_bytes`.
  Defaults: 800 MB and 4 GiB. A present-but-unreadable row is said to be unreadable, never zero.
- `lib/notices.ts` returns three notices: database, photos/files, backup. The System card renders
  them; the keys stay unique.

**The cleanup card.** Settings gets a report-only **"Waiting to be cleared"** card, read live from
`listWaitingToBeCleared()`:

- Deleted cars (tombstones), with photos, cost lines and whether they sold.
- Enquiries at their year, with the `ENQ-####` and the customer's own details.
- Rows holding an address instead of an asset id.
- Rows pointing at an asset the store does not hold.
- Machine litter: unreferenced assets and stale `auth_attempt` rows.
- If the asset store cannot be read, the card says so and prints the reason.

No delete controls on this card. The owner clears a car through Inventory and an enquiry through
the delete above. The card is a report, not a queue of buttons.

### H. The privacy notice (Q11)

The "Your rights" paragraph (`app/(site)/privacy/page.tsx:121`) currently tells visitors to email a
request; there is no email address on the site. Replace it with a WhatsApp instruction: a showroom
visitor who sent an enquiry can message the business on WhatsApp, with enough detail to identify
it, and the enquiry (and its imported sheet when unshared) is removed; the tap record stays. No email address, no `mailto`. The contact section already offers WhatsApp; use the saved
number. The owner's own delete is his office control and is not advertised as a visitor channel.
The "Last updated" date may move to the implementation date; the demo owner note stays.

### I. Deployment checks and the handover (SYS-001 / SYS-002 / SYS-004)

These are settings, not code:

- **Clerk:** sign-up disabled/invite-only; lockout **10 failed attempts / 30 minutes**. The app is
  meant to have no lockout of its own (owner, 2026-10-14). Record the settings in the report.
- **Vercel WAF:** the `/api/tap` rule above exists.
- **No permission system, no allow-list, no RLS policies.** Accepted for the demo; the activity log
  names the actor, and the showroom's fence is the server-only read path plus the serializer.
- **Vercel environment:** `BACKUP_ENCRYPTION_KEY` and `CRON_SECRET` in Production; `SANITY_TOKEN`
  already exists.

**The handover file — a build output, not a planning artifact.** After the encryption works and a
round-trip test passes, the Builder generates:

- `BACKUP_ENCRYPTION_KEY`: 32 random bytes, base64 (`openssl rand -base64 32`).
- `CRON_SECRET`: a random value (`openssl rand -hex 32`).

Then writes **one file** at `/home/lordwhitefire/truespec-secrets/` (create the folder if missing;
`chmod 700`; file `chmod 600`; outside the repo, never committed) containing:

```
TrueSpec — secrets to set
BACKUP_ENCRYPTION_KEY=<key>
CRON_SECRET=<secret>

Google Password Manager entry:
Site: TrueSpec backup key
Username: daily-backup
Password: <the same backup key>
Note: Encryption key for the daily TrueSpec database backups. Needed to restore. Do not delete.
```

The owner sets both values in Vercel (Production) and saves the Google entry himself, then deletes
the file or keeps it somewhere safe. The Builder does not put the handover values into Vercel or
`.env.local`; the owner does. A throwaway test key may live in a local `.env.local` for the
round-trip and is removed with the test artifacts. Nothing is printed in a report or a log. The only
secret the owner must keep for recovery is the backup key; the cron secret authenticates the
schedule and can be replaced.

## Benchmarks

Each is a fact to observe, not a test name. The testing pass in `testing.md` mirrors them.

1. **Delete one of several enquiries from one imported sheet:** the card disappears; the enquiry
   row is gone; the `enquiry_pdf` row and its file **stay** for the other enquiries; the taps are
   unchanged; the activity log shows "Deleted an enquiry `ENQ-####`" with the owner's email.
2. **Delete the last enquiry of a sheet:** with no draft from that sheet waiting, the `enquiry_pdf`
   row and its Sanity file go; if the file will not delete, the result says so and the cleanup card
   lists it; no orphan row is claimed clean. With a draft from the same sheet still waiting, the
   PDF row and file stay and the draft still saves.
3. **Cancel the delete confirmation:** nothing changes; no activity row; the card stays.
4. **Repeat the same delete:** the second call says the enquiry is already gone; no second activity
   row; no crash.
5. **Save an enquiry from an imported PDF:** the new row carries `pdf_import_id`; the board says it
   came from the imported sheet; the PDF row exists once for that file; a repeat save of the same
   draft does not create a second enquiry.
6. **Add a car:** after Save the browser lands on `/office/car/<ref>`; a second Save cannot create a
   second car; a retry with the same form-session id returns the same ref; edit mode still updates
   the opened car and stays put.
7. **Tap limit:** 30 requests from one IP in a minute record; the 31st answers `429`; a request from
   another IP still records; a bad origin still answers `403` and a bad body `422`.
8. **The daily job with the correct bearer:** one `backup-YYYY-MM-DD.json.gz.enc` is uploaded;
   `last_backup_at` and both storage figures are written; the file decrypts with the key, verifies,
   and restores into an empty Neon branch with matching row counts and sequences.
9. **A second run the same day:** no second dump; the existing file is reused; no duplicate
   heartbeat row; no client asset is touched.
10. **Retention:** with eight backup-pattern files present, a run leaves the newest seven; no client
    photo or PDF is deleted.
11. **A failed upload:** no new heartbeat; the old one stays; the System card eventually says the
    backup is stale; the run reports the failure instead of claiming success.
12. **Storage warnings:** the database line warns at 800 MB, the photos/files line at 4 GiB; an
    absent row says "not reported yet"; an unreadable row says it cannot be read; neither invents a
    zero.
13. **The cleanup card:** a deleted car, an enquiry at its year, a row holding an address, a row
    pointing at a missing asset, and machine litter all appear with counts; there is no delete
    button; an unreadable asset store says so.
14. **The actor:** on a touch screen the activity row shows the email; the dashboard panel does too;
    `enquiry.deleted` is in the Deleted filter with the `ENQ-####`, never the customer's name.
15. **The privacy notice:** no email address and no `mailto`; the WhatsApp link uses the saved
    number; the text speaks to showroom visitors and says the tap record stays.
16. **The handover:** after the build, the file exists at
    `/home/lordwhitefire/truespec-secrets/` with `600`, outside the repo; it contains the key, both
    env names and the exact password-manager entry; no key or secret is in the repo, a log, or a
    report; the owner sets both Vercel values and saves the password-manager entry.

## Gates (all must pass before the task is reported done)

- `npm run typecheck` — 0.
- `npm test` — all pass.
- `npm run build` — 0.
- `npm run leak-check` — PASSED.
- `npm run store-freshness` — PASSED.
- `npm run db:migrate` — up to date, including the `enquiry_pdf` unique index.
- `openspec validate --all` — 1 passed, 0 failed.
- The report names the exact commands and the figures it saw; no claim without a command or a store
  reading.

## Boundaries — what this task does not do

- No permission system, roles, allow-list, or RLS policies.
- No private Sanity dataset; no new Sanity key.
- No email channel; no customer-rights portal.
- No backup of photos or PDFs; the database only.
- No automatic deletion of client data; the job's only deletes are its own old backup files.
- No in-page session-expiry warning; the draft stays the mitigation.
- No redesign of the showroom or the office's look; the new UI is a delete control, a report card,
  an email label, and a third System line.
- No change to the tap route's origin/body checks.

## Open questions

None. Q1–Q11 are closed (findings/07). If the build finds a genuine gap the decisions do not
cover, it stops and asks; it does not invent a rule.
