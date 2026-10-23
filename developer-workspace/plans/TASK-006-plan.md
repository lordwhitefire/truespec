# TASK-006 — Plan (the system model, layer 6 of 6)

**Written 2026-10-23** by the Developer, from `openspec/tasks/TASK-006/task.md`, the grilling rulings in
`developer-workspace/notes/TASK-006-rulings.md`, and the codebase survey of the same date.
**Convention:** this project keeps plans in `developer-workspace/plans/TASK-XXX-plan.md`; there is no
`tasks/todo.md`. Progress and tasks live in this file.

**Git:** the owner ruled **no commits, no pushes, no branch changes** for this task. Leave the working tree
for review. This overrides the older "one commit per task" convention used by TASK-005.

**Execution rule:** one slice at a time, verify after each slice, keep the system working. No slice is
finished until its verification line has actually been run. A benchmark not exercised is written "not run",
never claimed.

---

## Overview

Layer 6 is the behaviour behind the finished screens: the owner's delete for an enquiry, the imported-PDF
link that makes that delete find its file, the form-session identity that stops a duplicate car, the visible
actor email, the encrypted daily database backup with retention and restore, two honest storage lines, the
report-only cleanup card, the corrected privacy notice, and the deployment/secrets handover.

The governing rule is the task's: the system never deletes client data on its own initiative. The only files
the job removes are its own old backups. Every other delete is the owner's, behind a confirmation.

**No new architecture beyond the task:** one migration (unique index), one new route (`/api/cron/daily`),
one new script (`scripts/backup-restore.ts`), new backup libraries, one delete action, one dialog, one report
card, one label, one notice line, one privacy paragraph, `vercel.json`. No permission system, no private
Sanity dataset, no email channel, no backup of photos or PDFs.

---

## Architecture decisions (Builder choices where the task is silent)

1. **Atomicity by single statement.** The enquiry delete and the PDF linking are each one SQL statement
   (CTE), not count-then-write over the HTTP driver. This preserves the task's guarantees under a concurrent
   save. The external `deleteAsset` remains after the row transaction, because it cannot join it.
2. **One row per stored file.** Migration `0026` dedupes `enquiry_pdf.sanity_asset_id` (keep the row with the
   most enquiry references, tie-break lowest `id`), repoints `enquiry.pdf_import_id`, then creates the unique
   index.
3. **The draft is the idempotency key.** An enquiry saved from a draft uses `draft.id` as the enquiry `id`;
   a car saved from a draft uses `draft.id` as the car `id`. An insert conflict returns the existing row's
   ref. This satisfies benchmark 5 and closes the same duplicate class in the draft car path, without a new
   column or table.
4. **The add form's identity is minted when the form opens**, not per submit: a `submissionId` (UUID) held in
   client state, sent as a hidden field, used as the car `id`. After success the browser navigates to
   `/office/car/<ref>`; edit mode keeps its current behaviour.
5. **Backup envelope** (documented in `lib/backup-crypto.ts` and repeated in the report):
   `TRUESPEC-BACKUP-1` magic, 1-byte version, 12-byte IV, 16-byte GCM tag, then ciphertext of the gzipped
   JSON. Key is 32 bytes, base64, `BACKUP_ENCRYPTION_KEY`. Filename `backup-YYYY-MM-DD.json.gz.enc` (UTC).
6. **Backup archive shape**: `{ format, version, generated_at, tables: { name: rows[] }, sequences: { name: value } }`.
   The table list is fixed in `lib/backup-tables.ts` (18 public tables incl. `schema_migrations`); the run
   compares it to `information_schema.tables` and fails if any public base table is missing or unknown.
7. **Idempotency**: before uploading, list Sanity file assets and reuse an asset whose
   `originalFilename` is exactly the day's filename. Heartbeat is written only after an asset id is in hand.
8. **Retention**: file assets matching `^backup-\d{4}-\d{2}-\d{2}\.json\.gz\.enc$`, sort by the date in the
   name, keep the newest 7, delete the rest. A failed delete is reported, not fatal.
9. **Cleanup honesty**: the unreferenced-asset group excludes the exact backup pattern; a retained backup is
   not machine litter. `deleteAsset`'s comment names all four callers.
10. **Notices carry presence separately from value**: absent → "not reported yet"; present but unreadable →
    "cannot be read"; both never become zero. Database default warning 800 MB; assets default 4 GiB.

---

## Dependency graph

```
T0 baseline + throwaway branch
 └─ T1 migration 0026
     └─ T2 PDF row helper + atomic link
         └─ T3 draft save: link + enquiry idempotency
             ├─ T4 draft car idempotency
             └─ T5 enquiry delete action
                 └─ T6 enquiry delete UI
T7 backup archive ─┐
T8 backup crypto  ─┴─ T9 cron route
                        └─ T10 retention + measurement + cleanup exclusion
                             ├─ T11 restore script + drill
                             └─ T12 vercel.json
T13 add-car identity + navigation
T14 actor email
T15 storage notices
T16 cleanup card (needs T10, T15)
T17 privacy notice
T18 secrets handover (needs T11, T15, T16)
T19 browser check (needs T6, T13–T17)
T20 final gates + report (needs all)
```

---

## Task list

### Phase 0 — baseline and safe ground

#### Task 0 — Baseline gates and throwaway branch
**Description:** Prove the tree starts green and create the disposable Neon branch used for every destructive
check. No product file changes.
**Acceptance criteria:**
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `npm run leak-check`, `npm run store-freshness`,
  `npm run db:migrate`, `openspec validate --all` all pass, or the exact failing output is recorded and work
  stops.
- [ ] A Neon branch exists off `main` in project `bold-dew-39255926`; its connection strings are held only in
  the shell, never written to a tracked file.
**Verification:** the seven commands above with their real output; `neon` branch listing.
**Dependencies:** none.
**Files likely touched:** none.
**Size:** XS.

**Checkpoint 0:** baseline green, branch reachable. If red, stop and report.

---

### Phase 1 — the sheet and the delete (highest data risk)

#### Task 1 — Migration 0026: one row per stored file
**Description:** Dedupe `enquiry_pdf.sanity_asset_id` and create the unique index.
**Acceptance criteria:**
- [ ] The migration keeps one row per asset (most references, tie-break lowest id), repoints every
  `enquiry.pdf_import_id`, creates `enquiry_pdf_sanity_asset_id_key`.
- [ ] No duplicate asset ids remain; no enquiry loses its link.
- [ ] It applies cleanly on the throwaway branch and then on the main branch.
**Verification:** `npm run db:migrate` on both; `SELECT count(*) ... GROUP BY ... HAVING count(*) > 1` = 0;
`pg_indexes` shows the unique index.
**Dependencies:** T0.
**Files likely touched:** `migrations/0026_enquiry_pdf_unique.sql`.
**Size:** XS.

#### Task 2 — PDF row helper and atomic enquiry link
**Description:** Add a find-or-create helper for `enquiry_pdf` and make `enquiryCreateStatement` write
`pdf_import_id` in the same statement as the enquiry and its activity row.
**Acceptance criteria:**
- [ ] Given `sourceAssetId`, `sourceFilename`, `rowsTotal`, the statement upserts one `enquiry_pdf` row and
  inserts the enquiry with its id.
- [ ] No separate insert can leave an orphan PDF row; the whole write is one statement.
- [ ] `enquiryCreateStatement` still writes exactly one `enquiry.created` activity row.
- [ ] Existing unit tests updated; new tests cover link, reuse, and conflict.
**Verification:** `node --import tsx --test lib/enquiry-create.test.ts lib/enquiry-pdf.test.ts`; `npm run typecheck`.
**Dependencies:** T1.
**Files likely touched:** `lib/enquiry-pdf.ts` (new), `lib/enquiry-create.ts`, `lib/enquiry-create.test.ts`,
`lib/enquiry-pdf.test.ts` (new).
**Size:** M.

#### Task 3 — Draft save: link the sheet, save one enquiry
**Description:** At the enquiry-draft save, count the batch's enquiry drafts for `rows_total`, link the source
asset, and use `draft.id` as the enquiry id so a repeat save resolves to the same record.
**Acceptance criteria:**
- [ ] The saved enquiry carries `pdf_import_id` for its draft's `source_asset_id`.
- [ ] One stored file has one `enquiry_pdf` row; a second draft from the same file reuses it.
- [ ] Saving the same draft twice returns the same `ENQ-####`; only one enquiry and one activity row exist.
- [ ] The draft row is deleted after a successful save; a failed delete leaves the record and says so.
- [ ] `rows_total` equals the number of enquiry drafts in the batch at save time.
**Verification:** focused tests; integration script against the throwaway branch: save twice, then count
`enquiry` and `activity_event` rows; confirm `pdf_import_id`.
**Dependencies:** T2.
**Files likely touched:** `lib/draft-save-run.ts`, `lib/draft-save-run.test.ts` (new),
`lib/draft-store.ts` (batch count helper), `lib/enquiry-pdf.ts`.
**Size:** M.

**Checkpoint 1 (Tasks 1–3):** migration applied; a draft save links its sheet; a double save yields one
enquiry. Run typecheck + focused tests + branch integration.

#### Task 4 — Draft-save car idempotency
**Description:** Use `draft.id` as the car id in the draft-save car branch, matching the add-form rule.
**Acceptance criteria:**
- [ ] Two saves of the same car draft create one car and return the same ref.
- [ ] A failed draft delete followed by a retry does not create a second car.
- [ ] Existing car create behaviour (ref, activity, costs, photos) is unchanged.
**Verification:** focused test with a fake store proving one insert; branch integration if cheap.
**Dependencies:** T3.
**Files likely touched:** `lib/draft-save-run.ts`, `lib/draft-save-run.test.ts`.
**Size:** S.

#### Task 5 — Delete an enquiry: action, activity, shared-sheet guard
**Description:** Add the session-guarded Server Action and its single-statement delete.
**Acceptance criteria:**
- [ ] Session and id are checked before the store is asked; a bad id returns a refusal, not a throw.
- [ ] One CTE deletes the enquiry, writes `enquiry.deleted` with the `ENQ-####` and actor, and returns
  `ref, pdf_import_id`; a repeat finds no row and says it is already gone with no second event.
- [ ] The remaining enquiries with that `pdf_import_id` and the waiting drafts with that `source_asset_id`
  are counted in the same statement; only when both are zero is the `enquiry_pdf` row deleted and its
  `sanity_asset_id` returned.
- [ ] `deleteAsset` is called after the row write; a failure is reported, not swallowed.
- [ ] Taps are untouched; `/office/enquiries`, `/office/activity`, `/office`, `/office/settings` revalidate.
- [ ] `enquiry.deleted` is in `ACTIONS` with "Deleted an enquiry" and the existing `del` category.
**Verification:** focused tests for SQL/guard/refusal; branch integration: one of four → PDF/file stay;
last with a draft → stay; last with no draft → row gone and asset delete called; repeat → no second activity;
`tap` count unchanged.
**Dependencies:** T3.
**Files likely touched:** `app/office/actions/enquiry.ts`, `lib/enquiry-delete.ts` (new),
`lib/activity-feed.ts`, `lib/enquiry-delete.test.ts` (new).
**Size:** M.

#### Task 6 — Delete control and confirmation dialog
**Description:** Add Delete to the enquiry detail footer and a second confirmation dialog.
**Acceptance criteria:**
- [ ] The footer has Delete beside WhatsApp, Call, Edit.
- [ ] The confirmation names the `ENQ-####`, says what goes (the enquiry), what stays (taps, the sheet when
  shared), and that it cannot be undone; backdrop dismissal is off.
- [ ] Cancel changes nothing: no action call, no activity, card stays.
- [ ] Confirm removes the card, closes the dialog, and toasts the `ENQ-####`; a kept PDF is named; a failure
  is shown in the dialog in the store's words.
**Verification:** `npm run typecheck`; `npm run build`; browser check at CP7.
**Dependencies:** T5.
**Files likely touched:** `app/office/(shell)/enquiries/enquiries-client.tsx`.
**Size:** S.

**Checkpoint 2 (Tasks 4–6):** duplicate car draft fixed; delete action and UI complete; branch drill proves
shared-sheet and repeat behaviour. Run typecheck + focused tests + build.

---

### Phase 2 — the daily job (highest platform risk)

#### Task 7 — Archive builder and table-list check
**Description:** Read the fixed public tables and sequences over the server connection into one JSON archive.
**Acceptance criteria:**
- [ ] `lib/backup-tables.ts` lists all 18 public tables including `schema_migrations`.
- [ ] The builder queries `information_schema.tables`; any public base table missing from the list, or any
  listed table absent, fails the backup with a named error.
- [ ] Archive shape is `{ format, version, generated_at, tables, sequences }`; `ts_ref_seq` and
  `enquiry_ref_seq` are read.
- [ ] No row contents or secrets are logged.
**Verification:** focused tests with a fake query client (missing table, extra table, happy path); one live
read on the throwaway branch.
**Dependencies:** T0.
**Files likely touched:** `lib/backup-tables.ts` (new), `lib/backup-archive.ts` (new),
`lib/backup-archive.test.ts` (new).
**Size:** M.

#### Task 8 — Encryption envelope
**Description:** gzip then AES-256-GCM with a 32-byte base64 key, random 12-byte IV, 16-byte tag.
**Acceptance criteria:**
- [ ] Envelope is documented in code: magic, version, IV, tag, ciphertext.
- [ ] Round-trip decrypt returns the exact JSON; wrong key and tampered ciphertext fail.
- [ ] Key length is validated; the key never appears in an error, log, or fixture.
**Verification:** focused tests including wrong key, tamper, bad key length.
**Dependencies:** T0.
**Files likely touched:** `lib/backup-crypto.ts` (new), `lib/backup-crypto.test.ts` (new).
**Size:** S.

#### Task 9 — Cron route: auth, dump, upload, heartbeat
**Description:** One authenticated `GET /api/cron/daily` that orchestrates the run.
**Acceptance criteria:**
- [ ] `GET`, `dynamic = "force-dynamic"`, `maxDuration = 300`; missing/wrong bearer is refused before any
  work; `CRON_SECRET` is read from env, never logged.
- [ ] On success: one `backup-YYYY-MM-DD.json.gz.enc` exists in Sanity, `last_backup_at` is written only
  after an asset id returns, and the summary is one JSON object with one log line per step.
- [ ] A second run the same day reuses the exact filename asset; no second upload, no duplicate heartbeat row.
- [ ] A failed upload leaves the old heartbeat untouched and returns a failure summary.
- [ ] `deleteAsset`'s comment names the four callers (demo wipe, car removal, enquiry delete, backup retention)
  and keeps the rule.
**Verification:** focused tests with injected dump/upload/settings; one local run against the throwaway branch
with a throwaway test backup asset, then delete the test asset; confirm heartbeat and summary.
**Dependencies:** T7, T8.
**Files likely touched:** `app/api/cron/daily/route.ts` (new), `lib/backup-run.ts` (new),
`lib/sanity.ts`, `lib/backup-run.test.ts` (new).
**Size:** M.

#### Task 10 — Retention, measurement, cleanup exclusion
**Description:** Keep the newest seven backups, measure database and assets, and stop calling backups litter.
**Acceptance criteria:**
- [ ] Only `^backup-\d{4}-\d{2}-\d{2}\.json\.gz\.enc$` files are considered; newest 7 stay; older ones are
  deleted via `deleteAsset`; a failed delete is reported and does not fail the run.
- [ ] `pg_database_size(current_database())` is written as `database_used_bytes`; the sum of
  `sanity.imageAsset.size` and `sanity.fileAsset.size` is written as `storage_used_bytes`; measurement happens
  after upload and retention.
- [ ] No client photo or PDF can match the retention filter.
- [ ] `listWaitingToBeCleared()` excludes the exact backup pattern from machine litter.
**Verification:** focused tests for filter/order/failure; one live measurement on the branch; cleanup test with
a backup-named asset and a client-named asset.
**Dependencies:** T9.
**Files likely touched:** `lib/backup-maintenance.ts` (new), `lib/backup-maintenance.test.ts` (new),
`lib/cleanup.ts`, `lib/cleanup.test.ts` (new).
**Size:** M.

#### Task 11 — Restore script and drill
**Description:** Read a backup, verify the tag, gunzip, load in FK order, restore sequences.
**Acceptance criteria:**
- [ ] Refuses to run if `DATABASE_URL_RESTORE` is missing or resolves to the main `DATABASE_URL`.
- [ ] Verifies the auth tag before writing; a bad key/tamper writes nothing.
- [ ] Loads every table in FK order, replaces the contents including `schema_migrations`, and restores both
  sequences.
- [ ] A drill on a fresh Neon branch with migrations applied ends with matching row counts and sequence values.
**Verification:** the drill command + a row-count comparison query + `setval`/`last_value` check.
**Dependencies:** T8, T7.
**Files likely touched:** `scripts/backup-restore.ts` (new), `lib/backup-restore.ts` (new),
`lib/backup-restore.test.ts` (new), `package.json` (script).
**Size:** M.

#### Task 12 — Cron schedule
**Description:** Add the Vercel cron entry.
**Acceptance criteria:**
- [ ] `vercel.json` contains exactly `{ "crons": [{ "path": "/api/cron/daily", "schedule": "0 2 * * *" }] }`.
- [ ] JSON parses.
**Verification:** `node -e` parse + print.
**Dependencies:** T9.
**Files likely touched:** `vercel.json` (new).
**Size:** XS.

**Checkpoint 3 (Tasks 7–9):** archive/crypto/route verified with unit tests and one local run. No real
production backup.
**Checkpoint 4 (Tasks 10–12):** retention, measurement, restore drill and schedule verified; the drill's
row counts match.

---

### Phase 3 — the remaining behaviour

#### Task 13 — Add-car submission identity and navigation
**Description:** Mint a form-session id when the add form opens; use it as the car id; navigate after success.
**Acceptance criteria:**
- [ ] The add form sends a `submissionId` UUID minted on open; `createCar` uses it as the car id.
- [ ] A retry with the same id returns the same ref; `ON CONFLICT (id) DO NOTHING` still holds.
- [ ] After success the browser lands on `/office/car/<ref>`; the form is gone.
- [ ] Edit mode still updates the opened car and stays put.
- [ ] Device-draft capture does not restore a stale submission id as a live identity.
- [ ] The "minted here, once" comment now says the key belongs to the form session.
**Verification:** focused tests for the action/statement; `npm run typecheck`; browser check at CP7.
**Dependencies:** T0.
**Files likely touched:** `app/office/(shell)/car/new/page.tsx`,
`app/office/(shell)/car/car-client.tsx`, `app/office/actions/car.ts`, `lib/car-form.ts`,
`lib/car-form.test.ts`.
**Size:** M.

#### Task 14 — The actor's email is visible
**Description:** Keep the initial and add the email as a small visible label in both activity rows.
**Acceptance criteria:**
- [ ] `operator()` returns `{ initial, email }` (or equivalent) and both the activity page and dashboard panel
  render the email visibly, not only in `title`.
- [ ] A removed account keeps the plain `?` treatment.
- [ ] No new permission work.
**Verification:** focused test for the operator mapping; `npm run typecheck`; browser check at CP7.
**Dependencies:** T0.
**Files likely touched:** `lib/activity-feed.ts`, `lib/activity-feed.test.ts`,
`app/office/(shell)/activity/activity-client.tsx`, `app/office/(shell)/(dashboard)/page.tsx`.
**Size:** S.

#### Task 15 — Two storage lines and the unreadable state
**Description:** Add database storage keys, defaults, and a third notice; distinguish absent from unreadable.
**Acceptance criteria:**
- [ ] Settings keys include `database_used_bytes` and `database_warning_bytes`; defaults 800 MB and 4 GiB.
- [ ] `buildNotices` returns database, photos/files, backup; keys unique.
- [ ] Absent row → "not reported yet"; present but unreadable → "cannot be read"; neither becomes zero.
- [ ] The System card renders all three without new card markup.
**Verification:** updated `lib/notices.test.ts` (three kinds, absent, unreadable); `npm run typecheck`.
**Dependencies:** T10 (the writer of the figures), T0.
**Files likely touched:** `lib/settings.ts`, `lib/notices.ts`, `lib/notices.test.ts`.
**Size:** M.

#### Task 16 — The report-only cleanup card
**Description:** Add "Waiting to be cleared" to Settings, read live.
**Acceptance criteria:**
- [ ] The card lists deleted cars (photos, cost lines, sold), enquiries at their year with `ENQ-####` and
  customer details, address rows, missing-asset rows, machine litter, and the asset-store readability reason.
- [ ] No delete controls; the text points to Inventory and the enquiry delete.
- [ ] Counts are live from `listWaitingToBeCleared()`; an unreadable asset store says so and prints the reason.
**Verification:** focused test for the card data mapping; `npm run typecheck`; browser check at CP7.
**Dependencies:** T10, T15.
**Files likely touched:** `app/office/(shell)/settings/page.tsx`,
`app/office/(shell)/settings/settings-client.tsx`, `components/office/CleanupCard.tsx` (new).
**Size:** M.

#### Task 17 — The privacy notice tells the truth
**Description:** Replace the email instruction with the WhatsApp channel.
**Acceptance criteria:**
- [ ] No email address and no `mailto` remain.
- [ ] The "Your rights" paragraph tells a showroom visitor to message the saved WhatsApp number with enough
  detail to identify the enquiry; the enquiry and its imported sheet (when unshared) are removed; the tap
  record stays.
- [ ] "Last updated" moves to the implementation date; the demo owner note stays.
**Verification:** source assertions (`grep -n "mailto\|email"`), `npm run typecheck`; browser check at CP7.
**Dependencies:** T0.
**Files likely touched:** `app/(site)/privacy/page.tsx`.
**Size:** S.

**Checkpoint 5 (Tasks 13–15):** add-car, actor, notices complete; typecheck + tests + build.
**Checkpoint 6 (Tasks 16–18):** cleanup card, privacy, handover complete; full gates.

---

### Phase 4 — proof and handover

#### Task 18 — Secrets and handover file
**Description:** After the restore round-trip passes, generate the real key and cron secret and write the
handover file.
**Acceptance criteria:**
- [ ] `BACKUP_ENCRYPTION_KEY` = `openssl rand -base64 32`; `CRON_SECRET` = `openssl rand -hex 32`.
- [ ] `/home/lordwhitefire/truespec-secrets/` exists mode 700; the file is mode 600 and contains the exact
  text from the task.
- [ ] No key or secret is in the repo, a log, or the report; the throwaway test key is removed from the local
  env with the test artifacts.
**Verification:** `stat -c '%a %n'`; `git grep` for the values; report has only the names.
**Dependencies:** T11, T15, T16.
**Files likely touched:** `developer-workspace/reports/TASK-006-report.md` (new); outside-repo handover file.
**Size:** S.

#### Task 19 — Runtime browser check
**Description:** Apply `developer-workspace/procedures/browser-check.md` to the changed surfaces.
**Acceptance criteria:**
- [ ] Build on `:3210`; never `:3000`; reference `:3211` only for changed existing surfaces.
- [ ] Automation Chrome on `:9222`, visible, not headless; chromium count unchanged before/after; detach.
- [ ] Probes: enquiry detail → Delete → confirmation copy → Cancel changes nothing; add car → lands on
  `/office/car/<ref>`; activity rows show the email; Settings shows three storage lines and the cleanup card;
  privacy has no email/mailto and the WhatsApp link uses the saved number.
- [ ] Report records intended/unintended divergences and what was not checked. No screenshots.
- [ ] If the Clerk sign-in page appears, stop and wait for the owner.
**Verification:** the probe output + `developer-workspace/reports/TASK-006-browser-check.md`.
**Dependencies:** T6, T13, T14, T15, T16, T17.
**Files likely touched:** `developer-workspace/scripts/task-006/*.mjs` (new),
`developer-workspace/reports/TASK-006-browser-check.md` (new).
**Size:** M.

#### Task 20 — Final gates and honest report
**Description:** Run every gate and write the closing report.
**Acceptance criteria:**
- [ ] `npm run typecheck` 0; `npm test` all pass; `npm run build` 0; `npm run leak-check` PASSED;
  `npm run store-freshness` PASSED; `npm run db:migrate` up to date including 0026; `openspec validate --all`
  1 passed, 0 failed.
- [ ] The report names each command and the figures seen; no claim without a command or a store reading.
- [ ] Every benchmark is marked verified or not run, with the reason; the independent pass remains TASK-007.
- [ ] Owner actions are listed: Vercel WAF rule, Clerk settings, Vercel env values, password-manager entry.
**Verification:** the seven commands with output; report read-back.
**Dependencies:** all.
**Files likely touched:** `developer-workspace/reports/TASK-006-report.md`.
**Size:** XS.

**Checkpoint 7 (Tasks 19–20):** browser check reported, all seven gates green, report honest.

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| The live store is real and destructive tests could lose data | High | All destructive checks run on the throwaway Neon branch; the live browser pass is non-destructive. |
| Count-then-delete race on the shared PDF | High | One SQL statement/CTE for the delete + counts + activity; asset delete after. |
| Backup upload partly succeeds (file exists, heartbeat missing) | High | Idempotent filename reuse; heartbeat only after asset id; second run repairs. |
| Wrong key or envelope makes backups unrestorable | High | Envelope documented; round-trip test and branch drill before handover. |
| Restore writes to the wrong database | High | Refuses missing `DATABASE_URL_RESTORE` or a match with `DATABASE_URL`; drill on a fresh branch. |
| Sanity `assets.list` does not exist in v8 | Medium | Use GROQ `fetch` on `sanity.fileAsset` / `sanity.imageAsset`. |
| Backup files appear as cleanup litter | Medium | Exact-pattern exclusion in `listWaitingToBeCleared`. |
| Neon HTTP driver cannot hold a transaction across statements | Medium | Single-statement CTEs; restore uses `pg` with explicit `BEGIN/COMMIT`. |
| Live DB cold-connection drops under concurrency | Medium | Warm the pool before browser/DB checks, per `T7-browser-check-and-db-flakiness.md`. |
| Clerk session absent in the automation Chrome | Medium | Stop and wait for the owner; do not attempt sign-in. |
| Unrelated working-tree changes get mixed in | Medium | No commits; touch only the files named in the task. |

## Open questions

None. Q1–Q13 are closed; the rulings are in `developer-workspace/notes/TASK-006-rulings.md`.
If the build finds a genuine gap these decisions do not cover, stop and ask.

## Owner actions (not code, recorded in the report)

- Vercel WAF: `/api/tap`, per IP, 30 requests / 60 seconds, action `429`.
- Clerk: sign-up disabled/invite-only; lockout 10 failed attempts / 30 minutes.
- Vercel Production env: `BACKUP_ENCRYPTION_KEY`, `CRON_SECRET` (owner sets; builder does not).
- Google Password Manager entry exactly as the task's handover text says.

## Progress tracker

- [ ] T0 baseline + branch
- [ ] T1 migration 0026
- [ ] T2 PDF helper + atomic link
- [ ] T3 draft save link + idempotency
- [ ] T4 draft car idempotency
- [ ] T5 delete action
- [ ] T6 delete UI
- [ ] T7 archive
- [ ] T8 crypto
- [ ] T9 cron route
- [ ] T10 retention + measurement
- [ ] T11 restore + drill
- [ ] T12 vercel.json
- [ ] T13 add-car identity
- [ ] T14 actor email
- [ ] T15 storage notices
- [ ] T16 cleanup card
- [ ] T17 privacy
- [ ] T18 handover
- [ ] T19 browser check
- [ ] T20 final gates + report
