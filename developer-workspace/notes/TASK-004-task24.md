# TASK-004 · Task 24 — `/office/drafts`: review, save, delete (in progress)

**Date:** 2026-10-15 · **Status:** the save's core and its actions are **built, verified and
committed**; the screen is **designed, not built** — and building it surfaced four decisions that need
the owner before it is written.

## What is built and committed

- **`0b0f3bf` — slice 1, the save's core.** `lib/draft-save.ts`: a car draft is turned back into the
  office form's strings and judged by **`readCarInput`** — the very reader a hand-typed car is judged
  by — so the two cannot be described two ways; the money round trip is exact (`toFixed(2)`;
  `formatNaira` is a *display* helper and drops kobo, so it must not be used here). An enquiry has no
  create action today, so its one rule is written here: `name`, `number`, `asked_for` required at the
  save, the note optional. `lib/enquiry-create.ts`: the first INSERT into `enquiry` — the id travels
  in, so `storeQuery`'s retry (D18) lands on the same key. `lib/draft-store.ts`: the office's draft
  reads (all, one), the idempotent delete, and the state lookups the save needs (a file names a state;
  the save is where a name becomes an id). **+10 tests** (238/238).
- **`54423dc` — refactor, behaviour-preserving.** `toCarForm`, `readPhotos`, `photosExist` and
  `readCarForm` move out of `app/office/actions/car.ts` into **`lib/car-form.ts`**. A `"use server"`
  file may only export server *actions* — a helper exported from it becomes a public endpoint — so it
  could not be shared as it stood. The reader is split so the facts every car write shares
  (`carFormFacts`) take an **already-read value plus the photo ids**, which is exactly what a draft
  has. Order of refusals unchanged; typecheck clean, 238/238, build passed.
- **`c91cccb` — slice 2, the actions.** `app/office/actions/draft.ts`: `saveDraft` (resolve the state —
  the owner's choice proved against the store, else the name the file gave, and **if that state is
  gone it asks rather than invents** — then create the record and delete the draft **last**, so a
  failed create loses nothing; both creates are keyed and idempotent, so a retry converges) and
  `deleteDraftAction` (removes one draft; brothers untouched). The car keeps the add form's
  **"cannot start Sold"** guard, whole.

## What the screen is designed to be (not yet built)

- `app/office/(shell)/drafts/page.tsx` — server: `getDrafts()` + `getCarStateRegistry()` +
  `getEnquiryStateRegistry()` + `carFields(1)` (the captions the owner reads are already in
  `lib/template-rules.ts`, so the screen names a field exactly as the blank does), mapped to plain
  props.
- `app/office/(shell)/drafts/drafts-client.tsx` — the review: drafts grouped by batch (source
  filename), each with its fields, a **state chooser** (the four car primaries / the enquiry states,
  defaulted to the resolved label), its images, an **add-photo** control (reusing `uploadCarPhoto`,
  which is a generic *bytes → asset id* action that writes nothing), **Save** and **Delete**.
- `app/office/(shell)/drafts/drafts.css` — the house pattern: each office page carries its own copy of
  the shell CSS with small deltas (`enquiries.css` is the model).
- A nav entry, and the **"Create from file"** controls (see decision 4).

## Decisions needed before the screen is written

1. **How a hand-added image is kept.** The `draft` row has `image_asset_ids`, and truth 9 says a draft
   holds "what the owner put into it". *Recommend:* persist on add (a small `addDraftImage` /
   `removeDraftImage` action updating the row), so an added image survives a reload like the draft
   itself. The alternative is the car form's pattern — hold it in the browser and send the ids at save.

2. **What deleting a draft does with its assets.** Its held file (`source_asset_id`) and any
   hand-added image live in Sanity. *Recommend:* leave them — the codebase's rule is "nothing is
   deleted on his behalf" (see `photo.ts`), and the owner's own cleanup (TASK-003 Task 19) reports
   orphans. But a draft's file is arguably draft-only litter, so this is a real choice.

3. **A file's drafts have no order.** The `draft` table (D16) carries no ordinal, so the rows of one
   uploaded file come back in an arbitrary order — the file's page order is **not recoverable** from
   the store. Ten cars from one blank would be listed in an order the owner did not write. *Options:*
   accept it; or add a `position` column (a migration) and store it at upload.

4. **Scope — where "Create from file" lives.** `task.md:405` says *"'Create from file' sits on the
   office inventory and enquiry screens, the car template downloads there, and all drafts are reviewed
   at `/office/drafts`."* The plan's Task 24 file list (`app/office/(shell)/drafts/*`,
   `app/office/actions/draft.ts`, ~5) does **not** include those two controls — and with no UI calling
   `app/api/upload`, no draft can arise in the real office today. *Recommend:* fold the two "Create
   from file" controls into Task 24, or the drafts page is review-only and unreachable.

## What is not done (honest)

- the screen, its CSS, the nav entry, and the "Create from file" controls;
- the Task 24 witness — save one draft → **one car** with the next `TS-####`, its hash and its photos,
  the other nine untouched; a reload keeps a draft; an abandoned draft burns no `TS-####`;
- this task's gates.

## Files

- **Committed:** `lib/draft-save.ts`, `lib/draft-save.test.ts`, `lib/enquiry-create.ts`,
  `lib/draft-store.ts`, `lib/car-form.ts`, `app/office/actions/car.ts` (refactor),
  `app/office/actions/draft.ts`.
- **Not yet written:** `app/office/(shell)/drafts/{page.tsx,drafts-client.tsx,drafts.css}`,
  `components/office/OfficeNav.tsx` + `OfficeBottomNav.tsx` (nav entry), the two "Create from file"
  controls, `developer-workspace/scripts/task-004/draft-save-check.ts` (witness).
