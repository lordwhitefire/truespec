# 06 — The cleanup report and the delete button

**Checked:** 2026-10-23, current working tree (code reading only; no store writes).
**Tracker items:** 9 and 10. **Owner answers:** Q7 and Q8.

## 1. The cleanup surface — already computed, not yet shown

`lib/cleanup.ts:112` already answers the whole question in one read:

- **Deleted cars** (`:114-125`) — every tombstone (`car.deleted_at IS NOT NULL`), with its photos,
  photo asset ids, cost-line count and whether it sold.
- **Enquiries at their year** (`:128-134`) — `created_at <= now() - interval '1 year'`, with the
  customer's own details and the age in days.
- **Rows holding an address** (`:149-158`) — a `car_photo` or `enquiry_pdf` row whose
  `sanity_asset_id` is a `http(s)://` address instead of an asset id. Not ours to clear; reported.
- **Rows pointing at a missing asset** (`:179-214`) — a referencing row whose asset id the store does
  not hold. Reported, never repaired.
- **Machine litter** (`:161-225`) — assets no row references (with size), and `auth_attempt` rows past
  90 days. The system may clear these itself (TASK-003 ruling), but this layer only reports them.
- **Asset-store readability** (`:165-177`, `:226-230`) — a failed Sanity read is reported as such,
  never as "nothing missing".

The module is read-only by construction; its own comment says so (`lib/cleanup.ts:5-22`). Its only
caller today is the manual `scripts/cleanup-readiness.ts` (findings/04); the office shows only car
tombstones in Inventory.

**Q7's surface.** Add a **report-only "Waiting to be cleared" card in Settings**:

- Read it on the Settings page, in the same `Promise.all` as the registries and settings
  (`app/office/(shell)/settings/page.tsx:25-30`).
- Render the card between **System** and **Export** (`settings-client.tsx:633-686`).
- Show the five groups with counts and short explanations. No delete buttons, no writes, no job
  output: the list is live, behind the office session.
- When `assetStore.readable` is false, the card says the store could not be read and prints the note;
  it never implies the missing-asset list is empty.
- The owner clears a car through Inventory → Remove for good (`removeCarForever`,
  `app/office/actions/car.ts:242`), and an enquiry through the delete below. The card only tells him
  what waits.

No new setting key and no new table: `listWaitingToBeCleared()` already returns the shape.

## 2. The delete button — what it removes, and the shared PDF

**Where.** The enquiry detail dialog (`app/office/(shell)/enquiries/enquiries-client.tsx:211-358`)
already has WhatsApp, Call and Edit. A **Delete** control belongs in that footer. It opens a second
confirmation dialog (the same `Dialog` component) naming the `ENQ-####`.

**What it removes (Q8).**

- The `enquiry` row. Its `pdf_import_id` is the link to the imported sheet
  (`migrations/0004_enquiries.sql:21`).
- The `enquiry_pdf` row and its Sanity file **only when no other enquiry and no waiting draft still
  references that PDF**. One imported sheet produces many enquiries (`scripts/seed.ts:380-403`), so
  they share one `enquiry_pdf` row; a draft from the same upload also points at the file through
  `draft.source_asset_id` (`migrations/0022_draft.sql:48-51`). Deleting one must not break the
  others' link; the foreign key is `ON DELETE SET NULL`, so deleting the PDF row would silently
  unlink them. The action counts the remaining enquiries with the `pdf_import_id` **and** the drafts
  with the same `source_asset_id` first, and keeps the PDF while either remains.
- The taps stay: `tap` rows carry no customer data and no link to an enquiry
  (`migrations/0005_feed_settings.sql:4-10`).
- The deletion writes one `activity_event` as `enquiry.deleted`, subject the `ENQ-####`, actor the
  session user — never the customer's name or number (owner ruling 2026-10-20 #4).
- The action is retry-safe: a second call finds no row and says it is already gone; no second event.

**The PDF link — DATA-001 / Q3.** The app never writes `enquiry_pdf`: only `scripts/seed.ts:360`
does, and `enquiryCreateStatement` (`lib/enquiry-create.ts:43-76`) does **not** set `pdf_import_id`.
So an enquiry saved from an imported PDF today has no link, and the delete has nothing to remove.
The fix, in this layer:

1. When an enquiry draft is saved, find or create the `enquiry_pdf` row for the draft's source file
   (`draft.source_asset_id`, `draft.source_filename`; the file is already in Sanity — no second
   upload), and write its id as the new enquiry's `pdf_import_id`.
2. One stored file gets one row: add a unique index on `enquiry_pdf.sanity_asset_id` (migration
   `0026`). A repeat save or a second draft from the same sheet reuses the row.
3. `rows_total` is the number of enquiry drafts in the batch at save time; it is metadata.
4. The seeded enquiries already carry the link; they need no backfill.

**The delete action's shape.**

- A `DELETE ... RETURNING ref, pdf_import_id` CTE that also inserts the `enquiry.deleted` event from
  the deleted row, so the event exists only when the delete happened.
- After it, count the remaining enquiries with that `pdf_import_id` **and the drafts with that
  source asset**. If both are zero, read the `enquiry_pdf.sanity_asset_id`, delete the row, then call
  `deleteAsset` (the only asset delete, `lib/sanity.ts:138`). A file that will not delete is
  **reported**, not swallowed — the same pattern as `removeCarForever`
  (`app/office/actions/car.ts:260-268`).
- Revalidate `/office/enquiries`, `/office/activity` and `/office` (the dashboard counts); the
  Settings cleanup card revalidates with the page.

**The confirmation.** "Delete ENQ-####? The enquiry is removed, and its imported PDF when nothing
else uses it. Taps stay. This cannot be undone." Two buttons, Cancel and Delete; Delete is
disabled while pending. A success closes both dialogs, shows a toast and refreshes the board. A
failure is shown in the dialog, in the store's own words.

**The activity display (Q9).** `lib/activity-feed.ts:96-99` returns the initial and the email as a
`title` only; the row renders the initial (`activity-client.tsx:134-139`). The email is already in
the feed (`lib/office.ts:441-448`). The task makes it visible in the row — a small label beside or
under the action — on the activity page and the dashboard's recent-activity panel, so a touch screen
shows it. `operator()` can return the email; the initial and the title stay.

## 3. What the task must make concrete

- The Settings card's five groups and its wording; no controls that delete.
- The delete action, its confirmation, its toast, and the shared-PDF guard.
- The `enquiry_pdf` link at draft save, and the unique index.
- `enquiry.deleted` in `ACTIONS` (`lib/activity-feed.ts:45-62`) under the existing `del` category.
- The actor's email visible in the activity row and the dashboard panel.

**Open:** none. Q7 and Q8 are closed; the shared-PDF rule follows from the store's own foreign key
and the draft's source reference, and is recorded here so the task cannot quietly delete another
enquiry's or a waiting draft's source file.
