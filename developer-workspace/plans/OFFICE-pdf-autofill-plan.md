# Office PDF autofill, editable drafts, editable enquiries — plan

**Status:** plan only. No code, no migration, no commit. Waiting for the owner's go.

**Ruling:** office, 2026-10-20 — four points, with #3 extended by "an option to save as draft".

**Scope:** a follow-up to TASK-004's upload and draft work. This is not TASK-005; it does not change
TASK-005's 53-task count or its report. No new task number is assigned. If the owner wants these
counted, they are nine follow-up tasks (P1–P9 below).

---

## 1. What was asked

1. **Enquiry template PDF.** A blank the office can download on Enquiries, and the existing upload
   can read back.
2. **Autofill on the manual car form.** A button that takes a car PDF and fills the form.
3. **Drafts completely editable.** Editing a car draft opens the normal Add/Edit car page — "very
   simple" — and there is now also an option to **save as draft**.
4. **Customer enquiries editable.** The activity log notes the change.

**Done means:** the owner can download an enquiry blank, fill it by hand, upload it, and get
enquiry drafts; can press Autofill on the car form and see the file's fields in the form; can open a
car or enquiry draft in the normal form, change anything, and either save it back as a draft or turn
it into the record; can edit a saved enquiry's details and state; and can see the enquiry change in
the activity log under its `ENQ-####` ref, never the customer's name or number. The old sales-desk
enquiry sheet and the car template still work.

---

## 2. Current truth (checked 2026-10-20)

- **Car template.** `lib/template.ts` builds a PDF blank; `lib/template-rules.ts` is the one field
  contract (the 14 `CAR_RECIPE` fields, the state written as a name); `app/api/template/route.ts`
  serves it office-only, 1–20 cars, no cache. `components/office/CreateFromFile.tsx` uploads a
  filled file on Inventory and Enquiries. Upload lands as **drafts only**.
- **Enquiry import.** `lib/enquiry-read.ts` reads the sales desk's own sheet, **words only**: title
  `"TrueSpec Autos - Enquiry Sheet"`, a `Name / Phone / Recorded` header, then rows with labelled
  details. It has no AcroForm and no template. Its comment records truth 9: "five fields need no
  made-up form." **This ruling changes that truth**: the owner now wants a form of ours, so the
  reader must read an AcroForm as well as the old words sheet.
- **Upload.** `app/api/upload/route.ts` tries the car reader, then the enquiry reader; it creates
  drafts, reports a batch and refusals, and never creates a record. Refusals from the two readers
  currently have different places: cars say `page`, enquiries say `row`; `CreateFromFile`'s type
  only knows `page`, so an enquiry refusal loses its row number on screen.
- **Drafts.** `migrations/0022_draft.sql`; a draft row holds `kind`, `values` (what the file said,
  parsed), `state_label`, `image_asset_ids`, a source file and a batch. The Drafts screen is
  **read-only** for values: it shows state, photos, save and delete. `lib/draft-save.ts`'s
  `carFormFromDraft` deliberately rebuilds only the file's fields and drops costs, secondary states
  and sale; `lib/draft-save-run.ts`'s `runSaveDraft` creates the record and deletes the draft.
  There is no place on a draft for the owner's cost lines or secondary states.
- **Car form.** `app/office/(shell)/car/car-client.tsx` has `mode: "edit" | "add"`; it has a
  device-local autosave (`localStorage`), photos, costs, primary and secondary states. There is no
  PDF autofill. The Add form starts blank; the saved full-tank default is not read by it.
- **Enquiries.** The board and detail are in `app/office/(shell)/enquiries/`; the only write is
  `setEnquiryState` in `app/office/actions/enquiry.ts`. Name, number, asked-for and note are not
  editable after import. `lib/enquiry-set-state.ts` says so, and the action writes **no**
  `activity_event` because the only subject would be the customer's name or number — PII the
  retention rule says must not outlive the row.
- **Activity.** `activity_event` stores `kind`, `subject`, `actor_id`, `at`; `lib/activity-feed.ts`
  names only car kinds; the log and the dashboard both draw from that one map. There is no
  field-level diff.
- **Blockers.** The office Clerk session is expired, so live office checks wait for the owner to
  sign in. The working tree also holds **owner-dirty** office files — the enquiries page/client/css,
  the dashboard, layout/nav/topbar/badge, the TASK-004 plan/report, some task-004 scripts, specs and
  registry files. They must not be overwritten or staged. The core of this plan can be built around
  them; the two visible entry points on the Enquiries screen (the template link and the Edit
  actions) are the only overlapping edits and are held to P9.

---

## 3. The shape of the change

One principle: **the PDF starts the form; the form is the truth.** A file gives the fields it
carries; the owner can change any of them in the normal form; a draft can stay a draft (the owner's
edit is kept on the draft) or become the record (the same readers and rules the office form already
uses). Nothing is inferred from a file, and nothing the owner typed is dropped when a draft is
saved back.

Two save paths, one rule:

- **Save as draft** keeps the work on the draft row. It allows incompleteness, writes no record and
  no activity.
- **Save as car / Save as enquiry** validates with the same reader the normal form uses, creates the
  record, deletes the draft, mints the car's `TS-####` (cars only), and writes the activity event
  the record's create already writes (plus the new enquiry event).

---

## 4. Assumptions the plan is built on

Say if any is wrong before go; otherwise I will build these.

1. **Enquiry template:** one customer per page, five AcroForm fields (name, phone, asked for, note,
   state), a 20-page blank. The old sales-desk words-only sheet stays supported.
2. **Autofill:** one car per file. A file with more than one car is refused with a pointer to
   "Create from file" on Inventory; there is no silent "first car". The button appears on the Add
   form and on a draft edit, not on a saved car's Edit form.
3. **Save as draft:** available only when editing an existing upload draft, because the draft row
   must have a source file and batch. A brand-new Add still saves as a car. Manual, source-less
   drafts are not in this plan.
4. **Enquiry form:** the details and the state are edited together; one Save writes one change and
   one activity event. The board's state control remains, and a real state change there also logs.
5. **Activity:** one event per real save, `kind + subject + actor + time`; the subject is the
   enquiry's `ENQ-####` reference, never the customer's name or number; no field-level diff.
6. **Entry points:** the template link and the board's Edit actions wait for the owner's dirty
   Enquiries work to be committed or explicitly handed over (P9). The server routes and new pages
   can be built before that.

---

## 5. Activity subject — decided: `ENQ-####`

The log carries an identifier, not a person. The enquiry gets a `ref` — `ENQ-` plus a zero-padded
number from its own sequence — and that is the subject of every enquiry event:

- It is minted by the database at the save, once, from `enquiry_ref_seq`; it is not derived from the
  customer's name, number or anything else guessable.
- It is unique and never reused, so two customers with the same name cannot be confused in the log.
- It is stable: it is in the enquiry row, the form and the log; the name and number stay in the
  `enquiry` row only.
- Existing enquiries are backfilled in creation order in the migration; new ones get the next number.
- The log says `ENQ-1234`; to find the person, the office looks up `ENQ-1234` in the protected
  database (or the enquiry detail, which shows the same ref). The log stays clean.

`activity_event` itself does not change: `subject` already holds the car's `TS-####`, and now holds
the enquiry's `ENQ-####`. The identity-lock trigger (`0018`) already treats `ref` as a name that
must not change; adding the column means it covers the enquiry ref too — verify that, and record the
fact in the new migration's comment (0018 is applied and must not be edited).

This is P7's work; it is no longer an open choice.

---

## 6. Tasks, in build order

The order puts the two car tasks first (they touch no owner-dirty file), then the enquiry template
and reader, then the enquiry forms, then the log, then the held entry points, then verification.
One commit per task.

| # | Task | Depends on | Commit |
| --- | --- | --- | --- |
| P0 | This plan | — | `office: plan the PDF autofill and draft edits` |
| P1 | Enquiry template blank + download route | P0 | `office: add the enquiry template` |
| P2 | Reader: AcroForm + old-sheet fallback + refusal places | P1 | `office: read the enquiry template` |
| P3 | Car-form autofill button + read route | P0 | `office: autofill the car form from a PDF` |
| P4 | Car draft edit + Save as draft | P3 | `office: edit a car draft and save it as a draft` |
| P5 | Enquiry draft edit + Save as draft | P2, P4 | `office: edit an enquiry draft` |
| P6 | Saved enquiry edit | P5 | `office: edit a saved enquiry` |
| P7 | Enquiry ref + activity events | P6 | `office: add the enquiry ref and log its changes` |
| P8 | Verification + report | P7 | `office: verify the PDF and edit pass` |
| P9 | Enquiries entry points (template link, Edit actions) | P1, P6, owner-dirty files clean | `office: add the enquiry entry points` |

P9 is last because it is the only task that must edit the owner-dirty Enquiries page/client. If
those files are clean before we start, P9 can fold into P1 and P6; the commits stay separate.

### P1 — Enquiry template blank and download

**Files (new):** `lib/enquiry-template-rules.ts`, `lib/enquiry-template.ts`,
`app/api/enquiry-template/route.ts`, `lib/enquiry-template.test.ts`.

**Build:**
- Derive the five fields from `ENQUIRY_RECIPE` in `lib/change-check.ts`, exactly as the car template
  derives its fields from `CAR_RECIPE`. One source for the blank, the reader and the form; a sixth
  recipe field cannot appear on the blank without words, and a blank field cannot exist that the
  recipe does not name.
- Field names carry a unique per-page prefix (`enquiry_01_name`, …), so another PDF's `name` field
  cannot be mistaken for ours.
- 20 pages, one customer per page. Each page: the sheet's title, "One customer per page", Name,
  Phone, Asked for, Note, State, and "Page N of 20". The state is written as the owner knows it, not
  as a store key.
- `GET /api/enquiry-template` follows the car template route exactly: `getOfficeSession()` first,
  `401` with no bytes when absent, `application/pdf`, attachment filename
  `truespec-enquiry-template.pdf`, `cache-control: no-store`, built per request. No store write, no
  cache, no filled copy anywhere.
- The link on Enquiries is P9; the route and the blank do not depend on it.

**Verify:** build → load with pdf-lib → 20 pages, five fields each, names match the rules; no store
call; `npm run typecheck`; `npm test`.

### P2 — Read the template, keep the old sheet

**Files:** `lib/enquiry-read.ts`, `lib/enquiry-read.test.ts`, `components/office/CreateFromFile.tsx`,
`app/api/upload/route.ts` (types only if needed).

**Build:**
- `readEnquiryFile` checks the AcroForm first: for each page, read the five prefixed fields; a page
  with any field filled becomes one `EnquiryDraft` (`values` = name/number/asked_for/note;
  `stateLabel` = state). A wholly blank page is skipped, not refused; a partially filled page is
  kept (a draft is allowed to be incomplete, and the save asks for what is missing).
- Pages beyond 20 are not read; the reader reports that the file carries more than the blank.
- If the file has none of our fields, fall back to `parseEnquirySheet` unchanged, so the old sales
  sheet still reads. If neither reads it, the existing `NOT_AN_ENQUIRY_SHEET` refusal stands; the
  message gains a line naming the new template.
- **No requiredness at read.** `readEnquirySeed` at the save remains the one rule for name, number
  and asked-for. A car template is not an enquiry: the car reader runs first and the enquiry
  AcroForm/words checks find nothing of ours.
- **Refusal places.** Extend the refusal type to carry `page?` and `row?`; update `CreateFromFile`
  to render "Page N" for a car/template refusal and "Row N" for an old-sheet refusal. No change to
  the upload's batch or draft behavior.
- Update the comment in `lib/enquiry-read.ts`: the old "five fields need no made-up form" truth is
  superseded by this ruling; the old sheet remains supported.

**Verify:** round-trip (build a blank, fill 2 pages with text fields, read back 2 drafts with the
right values and state; blank pages skipped; partial page kept); old words-only fixture still reads;
car template refused as an enquiry; page/row refusals show their place; upload creates drafts, not
records.

### P3 — Autofill the car form

**Files (new):** `app/api/autofill/route.ts`, `lib/autofill.test.ts`;
**modified:** `app/office/(shell)/car/car-client.tsx`.

**Build:**
- `POST /api/autofill`, office-only and same-origin, reusing the upload's origin/size guards. It
  reads the PDF in memory with `readCarFile`; **no store write, no draft, no file record**.
- Exactly one car: return the 14 fields already in the form's string shape (use
  `carFormFromDraft(values, stateId)` — the same reader the draft save uses), the matched state id,
  the state label the file named, and any refusals. Zero cars: a plain refusal. More than one: a
  refusal saying how many, and to use "Create from file" on Inventory; no silent first car.
- State: match the file's label to the office state registry case-insensitively; if it is gone,
  leave the form's state alone and report "The PDF names '<label>', which is not a current state."
- The button ("Autofill from PDF") sits in the form's existing toolbar, in Add and Draft modes only.
  It opens a file picker; on success it fills only the 14 fields and the state, leaving costs,
  secondary states, sale fields and photos untouched. If any of the 14 fields already has a value,
  ask before replacing them. Errors and refusals show in the form's existing error area; the form
  does not submit and the page does not reload.
- The Add form's device-local autosave still catches the filled values; Edit on a saved car is
  deliberately not offered.

**Verify:** pure tests for one car, zero, multi-car refusal, state match/miss; `npm run typecheck`;
runtime after sign-in: choose a filled car PDF, see the fields, save; choose a two-car PDF, see the
refusal.

### P4 — Edit a car draft, and save it as a draft

**Files (new):** `migrations/0024_draft_form.sql`,
`app/office/(shell)/drafts/car/[id]/page.tsx`, `lib/draft-form.ts`, `lib/draft-form.test.ts`;
**modified:** `lib/draft-store.ts`, `lib/draft-save.ts`, `lib/draft-save-run.ts`,
`app/office/actions/draft.ts`, `app/office/(shell)/car/car-client.tsx`,
`app/office/(shell)/drafts/page.tsx`, `app/office/(shell)/drafts/drafts-client.tsx`.

**Build:**
- **One column, no new table:** `ALTER TABLE draft ADD COLUMN form jsonb;` (nullable, commented).
  `values` stays exactly what the file said; `form` is the owner's edit layer. Existing drafts have
  `form IS NULL` and keep working through `values`. The displayed draft is `form ?? values`; the
  save-as-car run uses `form` when present, else `values`.
- `getDraft` reads `form`; the draft page maps `form` (or `values` + `state_label` +
  `image_asset_ids`) into `CarFormData`. All fields are editable: the 14, costs, primary and
  secondary states, section, arrival note, private note, was price, sale fields where the form
  already shows them, and photos.
- **Route:** `/office/drafts/car/[id]`, session and 404 gate, `dynamic = "force-dynamic"`; renders
  the same `CarForm` with `mode="draft"`. The Drafts card gets an **Edit** link; the quick "Save as
  a car" stays for an untouched draft.
- **Two buttons in draft mode.** "Save as draft" stores the form on the draft (`form`), updates the
  chosen state label, keeps the draft, writes no record, no `TS-####`, no activity; it allows an
  incomplete form and returns to the draft with a saved confirmation. "Save as car" sends the same
  form through `readCarInput` + `carFormFacts` (the form's own rule), creates the car, deletes the
  draft, mints the code, writes `car.created`, and reports field errors in place.
- **The existing card save remains** (no form payload): `runSaveDraft` uses `values`, as today. One
  run serves both paths; when a form payload is present it is judged by the same reader, so a
  typed car and a file car cannot be described two ways.
- **Photos:** in draft mode, add/remove/cover go through `addDraftImage`, `removeDraftImage`,
  `makeDraftCover` on the draft row (bytes first, row later), never the car photo actions. The
  cover stays position 0.
- **Device-local autosave is off in draft mode.** The server draft is the draft; a second local copy
  would be a second truth. Add and Edit keep the existing local autosave.
- `carFormFromDraft`'s comment and contract change: a file still carries no costs, but the owner's
  `form` layer can; the save path now reads `form ?? values`.

**Verify:** pure mapping (file-only draft, form-present draft, missing state, photos); save-as-draft
keeps the row and no record; save-as-car creates one record, deletes the draft, keeps the photos and
costs; incomplete draft saves as draft but is refused as a car with the same errors as the Add form;
`npm run typecheck`; `npm test`; runtime after sign-in.

### P5 — Edit an enquiry draft

**Files (new):** `lib/enquiry-form.ts`, `components/office/EnquiryForm.tsx`,
`app/office/(shell)/drafts/enquiry/[id]/page.tsx`, `lib/enquiry-form.test.ts`;
**modified:** `app/office/actions/draft.ts`, `app/office/(shell)/drafts/page.tsx`,
`app/office/(shell)/drafts/drafts-client.tsx`, `lib/draft-save-run.ts`.

**Build:**
- One small form: Name, Phone, Asked for, Note, State. It loads `values` + `state_label` from the
  draft; the state select is the office's enquiry states. A state label that no longer exists is
  shown blank with a "choose a state" note, never invented.
- **Save as draft** writes the trimmed values back to `draft.values` and the chosen label to
  `state_label`; incomplete is allowed; no record, no activity. **Save as enquiry** sends the same
  values through `readEnquirySeed` (name, number and asked-for required), resolves the state,
  creates the enquiry and deletes the draft. P7 adds the ref and the `enquiry.created` event to
  this same save path.
- The existing draft card's quick "Save as an enquiry" still works (no form payload, uses the stored
  values). The card gets an **Edit** link.
- The draft route is `/office/drafts/enquiry/[id]`; session gate; 404 if the draft is gone or not an
  enquiry.

**Verify:** mapping; save-as-draft keeps the draft and no record; save-as-enquiry creates the record
and deletes the draft; missing required fields show the same messages as the existing save; state
gone asks; runtime after sign-in.

### P6 — Edit a saved enquiry

**Files (new):** `lib/enquiry-update.ts`, `lib/enquiry-update.test.ts`,
`app/office/(shell)/enquiries/[id]/edit/page.tsx`;
**modified:** `components/office/EnquiryForm.tsx`, `app/office/actions/enquiry.ts`,
`lib/enquiry-set-state.ts` (only the comment/event behavior), and a by-id read beside the board's
existing select.

**Build:**
- A by-id office read loads the five editable details and the state for the form. The route is
  `/office/enquiries/[id]/edit`; session gate; 404 if the enquiry is gone.
- The same `EnquiryForm` in edit mode. Save validates with `readEnquirySeed`, checks the chosen
  state exists, reads the stored row for the server-side hash, and writes name, number, asked_for,
  note, state, `content_hash`, `hash_version`, `updated_at` in one statement. No-op retries do not
  move `updated_at` and do not write a second change (the same gate `enquirySetStateStatement` uses).
- P7 adds the `ENQ-####` ref, its display on this page, and the `enquiry.updated` event to this
  same path; P6 leaves the update returning the changed row so P7 can write one event from it.
- The board's detail gets the **Edit** action in P9; the page works by URL before that.

**Verify:** update SQL and idempotency; hash matches the stored values plus the new state;
validation; runtime after sign-in (change each field and the state; see the board; the log and the
ref are P7's checks).

### P7 — Enquiry ref and activity

**Files (new):** `migrations/0025_enquiry_ref.sql`, `lib/enquiry-ref.test.ts` (or extend the
existing activity/create tests); **modified:** `lib/enquiry-create.ts`, `lib/enquiry-update.ts`,
`lib/enquiry-set-state.ts`, `lib/activity-feed.ts`, `lib/activity-feed.test.ts`,
`app/office/actions/enquiry.ts`, `lib/enquiry-create.test.ts`, `lib/enquiry-set-state.test.ts`,
`app/office/(shell)/enquiries/[id]/edit/page.tsx` (show the ref), and the draft save's confirmation
(P5).

**Build:**
- **The ref.** Add `enquiry.ref text NOT NULL UNIQUE` with
  `DEFAULT ('ENQ-' || lpad(nextval('enquiry_ref_seq')::text, 4, '0'))`, backed by a new
  `enquiry_ref_seq`; mirror the car's `TS-####` (`0003`). Backfill existing rows in creation order
  in the migration, then set the sequence past them. The ref is minted at the **save**, not at the
  upload — a draft still carries no ref and burns no number (`0022`'s rule). The identity-lock
  trigger (`0018`) already covers `ref` by row shape; verify it now applies to enquiries and record
  that in the migration comment (0018 itself is applied and stays untouched).
- **Create.** `enquiryCreateStatement` mirrors `carCreateStatement`'s CTE: `new_enquiry` returns
  `id, ref`; `ins_event` inserts `'enquiry.created'` with `new_enquiry.ref` and the actor; a retry
  (`ON CONFLICT (id) DO NOTHING`) has an empty `new_enquiry`, so it writes no second event; the
  final select returns the existing `ref`. The save action returns the new `ENQ-####` so the form
  can show it.
- **Update and state.** `enquiryUpdateStatement` and `enquirySetStateStatement` are gated on a real
  change and `RETURNING ref`; only the changed row feeds the `'enquiry.updated'` event. A no-op
  writes no event. The event subject is always the ref.
- **Wording.** Add `enquiry.created` — "Added an enquiry", category `add`; `enquiry.updated` —
  "Edited an enquiry", category `edit`. The log and the dashboard use the one map; no page edit.
- **Comments.** Replace the "no activity because PII" note in `app/office/actions/enquiry.ts` and
  `lib/enquiry-set-state.ts` with the ref rule: identifiers in the log, personal details in the
  `enquiry` row.
- **Display.** The saved-enquiry edit page shows the ref; the draft save's confirmation shows the
  new ref; the board's detail/list shows it in P9. A lookup by ref is the database/board, not a new
  search feature.

**Verify:** migration on a copy with existing rows (backfill unique, non-null, in order; next new
row gets the next number); create writes one event with the ref and a retry writes none; update and
state write one event with the ref and a no-op writes none; the log/dashboard show the ref; no
customer name/number appears in `activity_event`; `npm test`.

### P8 — Verification and report

**Build/verify:**
- `npm run typecheck`, `npm test`, `npm run build`.
- Live, after the owner signs in (the session is expired today): download the enquiry blank; fill
  two pages; upload; two drafts, blank pages skipped; the old sheet still imports; the car template
  still imports 1–20; Autofill one car and refuse a multi-car file; edit a car draft, save as draft,
  reload, save as car; edit an enquiry draft, save as draft, save as enquiry (the confirmation shows
  the new `ENQ-####`); edit a saved enquiry's details and state; see the events in the log and the
  dashboard with the ref, never a name; a no-op state change logs nothing; an existing enquiry has a
  backfilled ref and the edit page shows it; photos/cover survive a car draft save; the office
  layouts at 1280/768/390 with 42 px targets and no horizontal overflow.
- Write `developer-workspace/reports/OFFICE-pdf-autofill.md`: built, verified, not verified, and the
  live-session caveat. Do not edit the owner-dirty TASK-004 report; a second copy waits for a path
  from the owner.
- No push.

### P9 — Enquiries entry points (held)

**Files:** `app/office/(shell)/enquiries/page.tsx`,
`app/office/(shell)/enquiries/enquiries-client.tsx` (both owner-dirty).

**Build:** the "Enquiry template" download link beside "Create from file", and the Edit action on a
draft and on a saved enquiry (the saved one opens `/office/enquiries/[id]/edit`; the draft one opens
`/office/drafts/enquiry/[id]`). This is held until the owner's changes in those files are committed
or the owner says to layer on top. It is the only task that cannot avoid the dirty files.

**Verify:** the links work on the Enquiries screen; the template downloads; the Edit actions open
the right form; the owner's own changes are still intact.

---

## 7. Data and contract changes

- **One new column:** `draft.form jsonb` (nullable). No new table, no backfill. `values` remains the
  file's read; `form` is the owner's edit layer; display and save use `form ?? values`.
- **One field source:** the enquiry template rules derive from `ENQUIRY_RECIPE`; the state is the
  one name-vs-key difference, mapped at the save exactly as the car's is.
- **One refusal shape:** `page?` and `row?` so the upload can name the place for both readers.
- **One new enquiry column and sequence:** `enquiry.ref` (`ENQ-####`, unique, not null, default from
  `enquiry_ref_seq`), backfilled in creation order. The ref is the activity subject; the event table
  is unchanged. A draft still has no ref until it is saved.
- **Two new activity kinds:** `enquiry.created`, `enquiry.updated`; the event table is unchanged.
- **No change** to the car template, the car record rules, the upload's draft-only contract, or the
  public site.

---

## 8. Blockers and risks

1. **Owner-dirty Enquiries files.** The template link and the board Edit actions overlap them. The
   core can be built around; P9 waits. Never overwrite or stage those files.
2. **Office session expired.** Every live check needs the owner to sign in. Until then, only static
   and unit checks are claimed.
3. **The ref must stay non-guessable.** It is a plain sequence, not derived from the name or number;
   the log carries only the ref. Existing rows need a one-time backfill; the ref is locked after
   creation (the identity lock).
4. **Existing drafts.** `form` is null for them; the fallback path keeps them working. The Drafts
   display and save must not assume `form`.
5. **Two save paths.** The card's quick save and the form's Save as car must both go through
   `runSaveDraft`; the form adds a payload, it does not add a second save rule.
6. **Incomplete drafts.** Save as draft must not run `readCarInput` / `readEnquirySeed`; Save as
   car/enquiry must. The server still bounds what it stores (field types, lengths, JSON size).
7. **Photos.** Draft mode must use the draft image actions; a car photo action would write to the
   wrong row. Cover order is position 0.
8. **The template's blank pages** are skipped, not refused; a partial page is a draft, not a
   refusal. This is deliberate and tested.
9. **The old sheet and the car template** must still read; the reader order is car first, then the
   enquiry AcroForm, then the old words sheet.
10. **Multi-car autofill** is refused, not silently narrowed to one. The owner can use Inventory for
    the batch.

---

## 9. Verification matrix

| Layer | What | When |
| --- | --- | --- |
| Static | `npm run typecheck`, `npm test`, `npm run build` | after every task; green at P8 |
| Unit | template round-trip, reader fallback, refusal places, autofill mapper, draft form mapping, save-as-draft, enquiry update/idempotency, activity words | in each task's test file |
| Live | the 10 checks in P8 | after the owner signs in; blocked today |
| Responsive | office screens at 1280/768/390; 42 px targets; no horizontal overflow | P8 |
| Report | built / verified / not verified, honestly | P8 |

The live matrix is the verdict; if the session is still expired at P8, the report says which checks
were not run rather than calling them done.

---

## 10. Not in this plan

- Task 53's office inventory rows-per-page (still needs the owner's number and a signed-in session).
- Multi-car autofill or a car-picker for a multi-car file.
- Manual, source-less drafts from the Add page.
- Deleting, merging or exporting enquiries; creating an enquiry by hand outside a draft.
- Field-level activity diffs or a history per enquiry.
- Any public-site/TASK-005 change; the 53-task count and report stay as they are.
- Changing the car template or the car record's rules.
- Browser-native PDF autofill; this is our button.
- Pushing or deploying.

---

## 11. On go

1. Commit this plan alone: `office: plan the PDF autofill and draft edits` (explicit staging).
2. Build P1–P9 in the order above; one commit per task; stage only that task's files; never stage the
   owner-dirty files; no push.
3. The `ENQ-####` ref is decided and is P7's work; no open choice remains.
4. If the owner-dirty Enquiries files are still dirty at P9, P9 waits; the report names it as not
   done rather than claiming the entry points.
