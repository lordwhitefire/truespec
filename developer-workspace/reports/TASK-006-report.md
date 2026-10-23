# TASK-006 — final report

Date: 23 October 2026  
Status: built; seven gates green; browser check recorded; handover file written. No commit or push.

## What was built

- **A — Enquiry deletion.** Server action, confirmation dialog and activity event. The delete
  statement counts the shared imported sheet before removing it, keeps the sheet while another
  enquiry or waiting draft uses it, and returns the asset to clear only on the last use.
- **B — PDF import link.** One stored file gets one `enquiry_pdf` row; drafts from one upload share
  it; saving a draft links the enquiry to that row; repeat and concurrent saves create one enquiry.
  Migration `0026_enquiry_pdf_unique.sql` dedupes by most references then lowest id, repoints
  enquiries and creates `enquiry_pdf_sanity_asset_id_key`.
- **C — Add-car identity.** Each Add page mints a `submissionId`; the server uses it as the car
  `id`; a repeat save returns the same ref; a successful save lands on `/office/car/<ref>`.
- **D — Actor email.** Activity rows and the dashboard recent-activity panel show the actor email
  beside the initial; an account that no longer resolves keeps a plain `?`.
- **E/F — Storage and backup.** Three System notices (database, photos/files, backup) with absent
  and unreadable distinct from zero. Backup archive (gzip + AES-256-GCM), encrypted envelope,
  upload, same-day reuse-before-dump, heartbeat only after asset id, newest-7 retention, fixed
  public-table list and cleanup exclusion. Restore refuses missing/same-as-main, runs one
  transaction, truncates and repopulates in `BACKUP_TABLES` order, and verifies counts/sequences.
  `vercel.json` schedules the route at `0 2 * * *`.
- **G — Cleanup card.** Report-only “Waiting to be cleared” card with deleted cars, aged enquiries,
  address-instead-of-asset rows, missing assets, machine litter and an unreadable-asset message.
  No delete controls on the card.
- **H — Privacy notice.** Rights paragraph uses the saved WhatsApp number, says the enquiry and its
  unshared imported sheet are removed and the tap record stays. No email address and no `mailto`.
- **I — Handover.** Real backup key and cron secret written outside the repo; Vercel/Clerk/WAF and
  password-manager actions remain the owner’s.

## Seven gates

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0, no diagnostics |
| Tests | `npm test` | 416 tests, 416 pass, 0 fail, 391 top-level tests |
| Build | `npm run build` | exit 0; compiled successfully, route table emitted |
| Leak check | `npm run leak-check` | PASSED; 21 public routes checked; no cost, currency, profit, asset, customer or office state leak |
| Store freshness | `npm run store-freshness` | PASSED; 9 store-reading routes, none prerendered, no database response cached |
| Migrations | `npm run db:migrate` | exit 0, “up to date — no migrations applied”; latest row `0026_enquiry_pdf_unique.sql`; index `enquiry_pdf_sanity_asset_id_key` present |
| OpenSpec | `openspec validate --all` | 1 passed, 0 failed |

The app was stopped for the final build and restarted on `:3210` against the throwaway branch.
The browser remains at exactly two tabs.

## Browser check

Full report: `developer-workspace/reports/TASK-006-browser-check.md`.

- Build cell matrix: **38 cells** — Enquiries, Add a car, Activity and Settings at
  `1440/820/560/390` dark/light; Privacy at `560/820/1100` dark/light. **0 failures**, no
  horizontal overflow after the fix below.
- Reference cells: 3 (Privacy, Activity, Add a car), light, one width.
- **2 tabs before and after; 1 automation Chrome before and after.** No screenshots.
- Intended divergences: explicit WhatsApp rights copy; visible actor email; minted
  `submissionId` and `/office/car/<ref>` navigation; new delete/System/cleanup surfaces.
- Unintended divergence found and fixed: Settings overflowed by 24px at `390px` because machine-
  litter filenames did not shrink/wrap. Fixed in
  `app/office/(shell)/settings/settings.css`; full matrix rerun at 0 overflow.
- Enquiry cancel probe: `ENQ-0004` confirmation opened; Cancel left it on the board.
- Add probe: browser save created `/office/car/TS-1072`; car `id` is
  `608409fc-1dc0-452b-8e5c-f7feffa5ca18`, the form’s minted session id. This car remains on the
  throwaway branch only; no live store write.

## Benchmarks

| # | Fact | Status and evidence |
|---:|---|---|
| 1 | Delete one of several enquiries from one sheet | **Verified on branch** — `enquiry-delete.txt`: `ENQ-0037`, shared PDF stays, row gone, one `enquiry.deleted`, taps unchanged. Not live. |
| 2 | Delete last enquiry of a sheet | **Partial** — branch witness verifies the PDF row and returned asset id, including the waiting-draft case. Actual Sanity file deletion was not exercised. |
| 3 | Cancel the delete confirmation | **Verified in browser** — confirmation opened; Cancel left `ENQ-0004` and no delete fired. |
| 4 | Repeat the same delete | **Verified on branch** — second call found no row and wrote no second event. |
| 5 | Save an enquiry from an imported PDF | **Verified on branch** — one PDF row, `pdf_import_id` carried, second save creates nothing, concurrent double save makes one enquiry. |
| 6 | Add a car | **Verified for add/retry** — browser TS-1072; branch TS-1073 with `sameRef:true`, one car, one event, one cost line. Edit-stays-put was covered by the `car-update` statement tests, not by the browser. |
| 7 | Tap limit | **Not run** — `/api/tap` was unchanged by this task; no request flood was sent. |
| 8 | Daily job with correct bearer and restore | **Verified earlier this session; not rerun after the laptop restart** — missing/wrong bearer `401`, correct bearer `200`, 18 tables/389 rows, archive decrypted and restored. The `task006-restore` branch still reads **18 tables / 389 rows**. Earlier command output was not persisted across the restart. |
| 9 | Second run the same day | **Verified earlier; not rerun** — `reused:true`, no second dump/encrypt/upload, no duplicate heartbeat. |
| 10 | Retention | **Verified earlier; not rerun** — 9 backup files became 7; 7 client assets unchanged. |
| 11 | Failed upload | **Not run** — no failed-upload injection in this pass. |
| 12 | Storage warnings | **Partial** — threshold/absent/unreadable logic is covered by `lib/notices.test.ts`; the browser showed the three lines with real branch values. A full 800 MB / 4 GiB store was not exercised. |
| 13 | Cleanup card | **Partial** — browser shows all groups and no delete controls; mapping tests pass. An unreadable asset store was not exercised in the browser. |
| 14 | Actor on activity and dashboard | **Partial** — email visible on activity at all four widths and on the dashboard; branch witness verifies `enquiry.deleted`. The Deleted filter with a specific enquiry row was not exercised in the browser. |
| 15 | Privacy notice | **Verified in browser** — no email address, no `mailto`, saved WhatsApp number `2348146927170`, imported-sheet and tap-record copy present. |
| 16 | Handover | **Verified** — `/home/lordwhitefire/truespec-secrets/` is `700`; `env` is `600`; exact heading, both env names and the Google Password Manager entry; key 44 characters, cron secret 64; no value printed or placed in the repo. Owner still must set Vercel and save the password entry. |

## Secrets and owner actions

The handover file is outside the repository at `/home/lordwhitefire/truespec-secrets/env`.
Its values were not printed, committed, or written to a report; `.env.local` contains neither key.

Owner actions still required:

1. Set `BACKUP_ENCRYPTION_KEY` and `CRON_SECRET` in **Vercel Production**.
2. Save the Google Password Manager entry exactly as written in the handover file; then delete or
   secure the handover file.
3. Vercel WAF: `/api/tap`, per IP, 30 requests / 60 seconds, action `429`.
4. Clerk: sign-up disabled/invite-only; lockout 10 failed attempts / 30 minutes.
5. Confirm the `vercel.json` cron (`0 2 * * *`) is active.

## State left behind

- No commit or push. Working tree left for owner review, including pre-existing unrelated changes
  (for example `.opencode/agent/product-management-agent.md`, `openspec/tasks-registry.md` and
  `product-management/`) that were not touched.
- App on `:3210` is branch-backed; reference on `:3211`; automation Chrome on `:9222` has exactly
  two tabs.
- The throwaway branch retains test car `TS-1072`. The restore branch retains the 18-table / 389-row
  drill. Neither is the configured live store.

## Not done / boundaries

No permission system, roles, allow-list or RLS; no email channel; no backup of photos or PDFs; no
automatic deletion of client data; no in-page session-expiry warning. The independent pass remains
TASK-007.
