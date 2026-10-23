# 00 — Findings summary

**Written:** 2026-10-23. **Layer:** System model (Layer 6, the last layer).
**Inputs:** findings/01–07, all checked against the current working tree.

## The rule that shapes the layer

The system never deletes client data on its own initiative. It makes the owner able to act and
reports what waits. The only litter it may clear is its own: an upload no record ever referenced,
and `auth_attempt` rows past 90 days (TASK-003 ruling). Every job in this layer reports; none
removes a customer's record.

## What is real in the code today

- **The delete gap is real.** The privacy notice promises an email deletion channel that does not
  exist (`app/(site)/privacy/page.tsx:121`), and no office action deletes an enquiry. The only
  delete path for an enquiry is the demo wipe (`scripts/demo-wipe.ts`); the car has its own
  `removeCarForever` (`app/office/actions/car.ts:242`).
- **The duplicate-save gap is real.** `createCar` mints a fresh UUID per call
  (`app/office/actions/car.ts:82`); the add form stays on the page after success
  (`car-client.tsx:907-914`). A second Save makes a second car. The original spec forbids it.
- **The PDF link is missing.** The app never writes `enquiry_pdf`; only `scripts/seed.ts:360` does.
  An enquiry saved from an imported sheet has `pdf_import_id = NULL`, so the delete has no PDF to
  remove.
- **The actor is recorded but hidden on touch.** The email is resolved
  (`lib/office.ts:441-448`) but rendered only as a `title` on the initial
  (`lib/activity-feed.ts:96-99`).
- **The tap route has no limit.** `app/api/tap/route.ts` checks origin and body, then writes.
- **The job has no writer and no scheduler.** `lib/settings.ts:43-50` names the keys; nothing writes
  them. There is no `vercel.json`, no route, no npm job script.
- **The cleanup report exists but is not on a screen.** `lib/cleanup.ts` computes it; only the manual
  CLI calls it. The office shows car tombstones only.
- **The two storage figures do not fit one line.** Neon dies at 1 GB; a combined 4 GiB warning would
  never speak before the database stops. Two lines are required.
- **The dataset is public-read by design.** The showroom reads photos without a token; the encrypted
  dump is the protection, not dataset visibility. Private datasets are Growth-only, and even then
  assets stay public by URL.

## The answers (Q1–Q11, full text in findings/07)

| # | Answer |
|---|---|
| Q1 | Tap limit: Vercel WAF edge rule, **30 requests/minute/IP**; dashboard setting, no app code. |
| Q2 | Session expiry: accepted; **no in-page warning**. |
| Q3 | `enquiry_pdf` link: **fixed in this layer**; the delete needs it. |
| Q4 | Backup: **AES-256-GCM**, new key in Vercel, existing `SANITY_TOKEN`, current dataset; no private dataset, no permissions. |
| Q5 | Backup scope: **database only**. |
| Q6 | Retention: **the last 7 dumps**. |
| Q7 | Cleanup: **report-only "Waiting to be cleared" list in Settings**. |
| Q8 | Delete: **on an enquiry, with confirmation**; enquiry + its PDF when unshared; taps stay; logged. |
| Q9 | Actor: **email visible in the activity row**, not only on hover. |
| Q10 | Storage: **database 800 MB; photos/files 4 GiB**. |
| Q11 | Privacy notice: **no email**; speaks to showroom visitors; points to WhatsApp. |

## The work the task must carry

1. **Delete an enquiry** — button in the detail dialog, confirmation, action, shared-PDF guard,
   `enquiry.deleted` activity row, taps untouched. (findings/06)
2. **Link the imported PDF** — create/reuse the `enquiry_pdf` row at draft save and write
   `pdf_import_id`; unique index on `sanity_asset_id`. (findings/06)
3. **Stop the duplicate car** — the add form carries a form-session `submissionId`; the action uses
   it as the car's id; after success the browser lands on the created car. (findings/01)
4. **Show the actor** — email visibly in the activity row and the dashboard panel. (findings/01, 02)
5. **Tap limit** — one Vercel WAF rule; deployment note, no code. (findings/03)
6. **The daily job** — one authenticated route, `vercel.json` cron, database dump, gzip + encrypt,
   Sanity upload, heartbeat only after the upload, last-7 retention, storage measurement,
   idempotent on a double invocation, 300 s cap. (findings/04, 05)
7. **Storage lines and cleanup card** — second used/warning pair for the database; three System
   notices; the Settings cleanup card. (findings/05, 06)
8. **Privacy notice** — remove the email sentence; speak to showroom visitors; WhatsApp. (findings/01, 07)
9. **Deployment checks** — Clerk invite-only and 10-attempt/30-minute lockout; the WAF rule; the cron
   secret; the backup-key handover. (findings/02, 07)
10. **Session expiry** — no code; the testing pass checks the clean redirect and the surviving draft.
    (findings/02)

## Secrets and the handover

- `SANITY_TOKEN` exists; **no new Sanity key**.
- `BACKUP_ENCRYPTION_KEY` is the only new secret the owner must keep for recovery: Vercel
  (Production) and Google Password Manager.
- The cron route also needs a `CRON_SECRET`. It is a separate env value generated at build time and
  set by the owner in Vercel; it authenticates the schedule only and is replaceable, so it does not
  need the password manager.
- The **builder** generates both after the encryption works and writes **one handover file** at
  `/home/lordwhitefire/truespec-secrets/` (outside the repo, `chmod 600`), containing the key, both
  env names/values, and the exact Google Password Manager entry. The owner sets the values, saves
  the entry, then deletes or keeps the file. The Architect creates no file now.

## Not in this layer (settled, not forgotten)

- No permissions or roles; the activity log is the compensating control (SYS-002).
- No RLS policies; the server-only read path and the serializer are the fence (SYS-004).
- No private Sanity dataset; encryption is the protection (Q4).
- No email channel; WhatsApp is the visitor's channel (Q11).
- No backup of assets; the photos already live in Sanity (Q5).
- No automatic deletion of client data; the system may clear only its own litter (TASK-003 ruling).
- No in-page session-expiry warning; the draft is the mitigation (Q2).

## Position

Q1–Q11 are closed. Findings 01–07 are written. The task and its testing companion are the next and
last artifacts this plan produces.
