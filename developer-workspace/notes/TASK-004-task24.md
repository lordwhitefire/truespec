# TASK-004 · Task 24 — `/office/drafts`: review, save, delete (+ the upload's entry point)

**Date:** 2026-10-15 · **Status: done.** Built, witnessed against the live store, five gates green,
committed. The holding place is now a place: an upload becomes drafts, the owner reviews each one and
either **saves** it (which is when the record and its `TS-####` are made) or **deletes** it (which
makes nothing).

## The ruling that shaped it

Everything on this screen follows one line from truth 9: **a draft is not a record until it is
saved.** So the board, the counts, the showroom and the section lists carry **no filter for a draft** —
none was needed, because no draft is ever in them. A draft spends no code, and the code it eventually
gets is minted **at the save, not the upload** — the witness proves the sequence does not move until
the owner presses Save.

The second line is how a car draft is judged, and it is deliberately *not* a second rule. A car draft
is rebuilt into the office form's strings and handed to **`readCarInput`** — the very reader a
hand-typed car is judged by. There is no such thing as "a car that was valid in a file but not in the
form", because there is only one reader. The money round trip is exact (`(kobo / 100).toFixed(2)`);
`formatNaira`/`nairaDigits` are *display* helpers that drop kobo and must not be used to re-read a
value.

## What is built

- **`lib/draft-save.ts`** — the pure half: a draft's values read as the record it will become
  (`readDraftAsCar`, `readEnquirySeed`). An enquiry has no create action, so its one rule lives here,
  written once: `name`, `number`, `asked_for` required at the save; `note` optional.
- **`lib/enquiry-create.ts`** — the first INSERT into `enquiry`; the id travels in, so `storeQuery`'s
  retry lands on the same key.
- **`lib/draft-store.ts`** — the draft reads, the idempotent delete, and the lookups the save needs
  (a file names a state by *name*; the save is where a name becomes an id).
- **`lib/car-form.ts`** (`54423dc`, behaviour-preserving) — the car form's rules lifted out of a
  `"use server"` file, which may only export server actions. Split so `carFormFacts(value, photoIds)`
  takes what a draft has: an already-read value and its photo ids.
- **`lib/draft-save-run.ts`** (`ff12b49`) — `runSaveDraft`, the run itself. It lives in a plain module
  **so the witness can drive it**: a `"use server"` file reaches Clerk through `lib/session` and needs
  a live request, so no script can load it. It takes the actor's id as an argument precisely because
  only the action may know it. The action thinned to what only an action may do: **session → run →
  revalidate**.
- **`app/office/actions/draft.ts`** — `saveDraft`, `deleteDraftAction`, and the three image actions
  (`addDraftImage`, `removeDraftImage`, `makeDraftCover`), each idempotent.
- **`app/office/(shell)/drafts/`** — `page.tsx` (server: `getDrafts()` + both state registries +
  `carFields(1)` captions + `imageUrl`), `drafts-client.tsx`, `drafts.css` (the house pattern: a
  page-local copy of the shell CSS).
- **`components/office/CreateFromFile.tsx`** — **"Create from file"**, placed on the inventory and
  enquiry screens exactly where `task.md:405` says. It sends the file to `/api/upload` and reports
  what came back: how many drafts are waiting and **every refused row, named**.
- **Nav** — a `Drafts` entry on the desktop sidebar.

## The owner's four rulings (2026-10-15), all taken

1. **Images persist on the draft.** `addDraftImage` writes `image_asset_ids` immediately, so an added
   picture survives a reload exactly as the draft does. The bytes go up through the existing
   `uploadCarPhoto` (bytes first, then the reference — truth 7's order); the action only records the
   id. `makeDraftCover` moves one to index 0, and is a **no-op for an id that is not already on the
   draft**, so it cannot be used to smuggle a reference in.
2. **Deleting a draft leaves its assets.** Nothing is deleted on his behalf; the owner's own cleanup
   reports orphans. The record the draft never became already consumed no code.
3. **A file's drafts have no stored order** (D16's table has no ordinal) — accepted, no migration. The
   screen groups by batch and shows the drafts as the store returns them, and the note says so.
4. **"Create from file" folded into Task 24.** Without it nothing calls `app/api/upload`, so the
   drafts page would be review-only and unreachable.

## Verified

- **`developer-workspace/scripts/task-004/draft-save-check.ts` — 22/22, all passing**, on the live
  store. It makes **ten** car drafts from one imagined file, puts a **real image** in the **real**
  asset store, and saves one of them through the **real** `runSaveDraft`. Proven: one car made and
  only one; it carries the file's own values and nothing invented; the money survives to the kobo
  (**₦12,500.50**, not ₦12,500); it is given the **next `TS-####`** (1025 → 1026) and its change-check
  **at the save**; the picture rides with it at **position 0**; the save is recorded as the owner's
  own act; the **nine brothers are still waiting**; a draft that is not saved **survives a reload**; a
  **deleted draft creates nothing and spends no code**; a file that named a state that **is gone is
  asked to choose** rather than guessed at; and a draft **missing a required field is refused at that
  field** — still waiting, nothing lost. It removes every row it wrote (0 drafts, 0 cars left behind).
  The only thing it cannot put back is the `TS-####` it spent — a sequence is not rewound, and should
  not be; that *is* the claim.
- **Five gates green:** leak-check **PASSED** · typecheck clean · **238/238** tests · build clean
  (`/office/drafts` in the route list) · store-freshness **PASSED**.
- **The door holds for the new route.** `GET /office/drafts` without a session streams
  `NEXT_REDIRECT` → **`/office/sign-in`**, the same as the other office routes. (The first byte is a
  200 carrying `app/office/loading.tsx`'s "Just a moment" shell while the store resolves — that is the
  streaming fallback, not the answer. A probe that reads only the initial status will misread it.)

## Not verified (honest)

- **The signed-in path through a browser** — every office route is Clerk-gated and there is no office
  session here. This is the standing Checkpoint B gap, now extended to the drafts screen: nobody has
  clicked Save on a draft in a real browser.
- The `503` paths (store or asset store unreachable) — proven by code, not by a live refusal.
- The **enquiry** half of the save end-to-end. The car's save is witnessed; the enquiry's runs the
  same run with its own rule and statement (`enquiryCreateStatement`), and only the pure rule is
  unit-tested. A second witness for it would need an enquiry draft; worth one.
- The mobile bottom bar still has the **reference's** five destinations, so it carries no Drafts entry;
  on mobile the owner reaches Drafts from the upload's success message. The desktop sidebar carries
  the entry. One line to reverse if the owner wants it in the bar (it would need the `.bnav` grid
  changed in all seven page stylesheets).

## Files

- **Committed:** `lib/draft-save.ts`, `lib/draft-save.test.ts`, `lib/enquiry-create.ts`,
  `lib/draft-store.ts`, `lib/car-form.ts`, `lib/draft-save-run.ts`,
  `app/office/actions/{car.ts,draft.ts}`, `app/office/(shell)/drafts/{page.tsx,drafts-client.tsx,drafts.css}`,
  `components/office/CreateFromFile.tsx`, `components/office/OfficeNav.tsx`,
  `app/office/(shell)/inventory/page.tsx`, `app/office/(shell)/enquiries/enquiries-client.tsx`,
  `developer-workspace/scripts/task-004/draft-save-check.ts`.
