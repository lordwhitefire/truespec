# OFFICE — the enquiry template, car autofill, editable drafts and saved-enquiry edits

**Date:** 2026-10-20 · **Owner ruling:** 2026-10-20, requirements #1–#4 ·
**Base:** `94515fa` (P8) · **Plan:** `developer-workspace/plans/OFFICE-pdf-autofill-plan.md`
**Scope:** P1–P8 built and verified. **P9 is partly built:** the owner explicitly authorized the
Edit button on the owner-dirty Enquiries client, and that one hunk is committed. The Download
template link and the board's `ENQ-####` display remain held. Nothing was pushed.

---

## What was built

| Step | Commit | What the office can do now |
|---|---|---|
| P1 | `2130559` | Download a blank enquiry template: a **20-page AcroForm** with five fields on each page (`name`, `number`, `asked_for`, `note`, `state`). `/api/enquiry-template` is the route; blanks are skipped, and the old words-only sheet is still accepted. |
| P2 | `209f1ae` | Read a filled template: the AcroForm reader runs first; the old words-only sheet is the fallback. A refusal names the page and/or row, never a customer. |
| P3 | `b4bb0a6` | **Autofill** on the manual car form: upload a car PDF, the form is filled, and a replace confirmation protects typing that is already there. A multi-car file is refused rather than silently taking the first car. The old hidden edit note is replaced by a visible public note field. |
| P4 | `01a1926` | Edit a **car draft** and **Save as draft** without creating a car. The edit layer lives in `draft.form`, photos stay on the draft, and the normal Add/Edit car page is the editor. |
| P5 | `ec6a81c` | Edit an **enquiry draft**: all four values and the state, with **Save as draft** and **Save enquiry**. No record, ref or activity row is written until the enquiry is saved. |
| P6 | `fed28d7` | Edit a **saved enquiry** at `/office/enquiries/[id]/edit`: the five editable details and the state, one statement, the server's hash, and a true no-op that says “Nothing changed.” |
| P7 | `97a1090` | Every enquiry has an **`ENQ-####`**, minted by a plain sequence. Creating, editing and changing state each write **one** `activity_event` whose subject is that code and whose actor is the signed-in user. Names, numbers and notes stay in the enquiry row. The edit page and the draft-save confirmation show the code; the board's display is P9. |
| P9 (partial) | this commit | The enquiry detail dialog now has an **Edit** action beside WhatsApp and Call, opening `/office/enquiries/[id]/edit`. It uses the existing `.call` button style, so no CSS change was needed. The owner explicitly authorized this one hunk on the owner-dirty client; the owner's other changes in that file remain unstaged. |

`migrations/0025_enquiry_ref.sql` is applied. It created `enquiry_ref_seq`, the `ref` column
(`NOT NULL`, `UNIQUE`, default `ENQ-####`), backfilled the six existing enquiries in creation order
(`ENQ-0001`…`ENQ-0006`), and moved the sequence past them. The identity trigger was corrected
narrowly so the one-time backfill may *assign* a code to a row that had none; changing an existing
code is still refused (`23514`), and the witness proves it.

`scripts/demo-wipe.ts` now treats demo enquiries' `ENQ-####` subjects as the demo's own, so their
activity rows leave with the demo instead of being mistaken for someone else's.

---

## Behaviour against the four requirements

1. **Enquiry template PDF downloadable on Enquiries.** The PDF route and its reader are built and
   tested. The visible **Download template** link on the Enquiries page is P9 and is **not yet
   there** — that page is owner-dirty.
2. **Autofill the manual car form from a car PDF.** Built: the button is on the car form, the read
   route and pure reader are tested, one car is filled, and multi-car files are refused.
3. **Drafts are completely editable, with “Save as draft.”** Built for both car and enquiry drafts.
   Editing a draft opens the normal editor; saving a draft keeps it waiting and creates nothing.
4. **Saved customer enquiries are editable, and every change is logged.** Built at the row's URL.
   The board's detail dialog now has an **Edit** action; the page is still reachable by URL after
   sign-in. The log entry is `Added an enquiry` / `Edited an enquiry` followed by `ENQ-####`, with
   no customer detail.

---

## Verified

| Check | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | **360 passed, 0 failed** (`node --test`, all `lib/**/*.test.ts`) |
| `npm run build` | compiled; the office routes include `/office/drafts`, `/office/drafts/car/[id]`, `/office/drafts/enquiry/[id]`, `/office/enquiries`, `/office/enquiries/[id]/edit` |
| P9 Edit button | **typecheck clean; 360 tests passed; production build passed** after the button was added. The href is `/office/enquiries/[id]/edit`, the route P6 built and the build lists. Not clicked through in a browser — the session is expired. |
| `npm run db:migrate` | up to date (0025 applied) |
| `draft-edit-check.ts` | **PASSED** — car and enquiry draft edits, Save as draft creates nothing, Save car/enquiry creates one record, car `TS-####` and enquiry `ENQ-####` are reported, and the enquiry create writes one `enquiry.created` event with no PII |
| `enquiry-update-check.ts` | **PASSED** — all five details and the state move in one statement; the stored hash is the server's; `updated_at` moves once; a retry is a true no-op with no second event; clearing the state is a real change and logs a second event; every subject is the code |
| `enquiry-registry-check.ts` | **PASSED** — a state change logs one event and a repeat logs none; a back-change logs a second; the code is `ENQ-####`; an enquiry's `id` and `ref` cannot be changed; the transaction rolls back with the store as it was |
| Ref backfill query | 6 rows, `ENQ-0001`…`ENQ-0006`, no creation-order mismatch, sequence moved past them |
| `npm run leak-check` | **PASSED** — 21 public routes; 0 with forbidden content; no cost/currency/profit, asset/file reference, customer detail or office state label appeared |
| Store cleanup | 6 enquiries, no orphan `ENQ-####` activity rows, no witness rows left behind |

The three witnesses run the same statement builders the actions run, against the live store, and
remove what they make. `draft-edit-check` and `enquiry-update-check` now clean their activity rows
in `finally`; the registry check rolls back.

---

## Not verified (honest gaps)

- **Live signed-in browser matrix.** The office Clerk session is expired. The template link,
  Autofill button, draft editors, saved-enquiry editor and activity log were **not** clicked through
  in a real browser at 375/1440. Their routes compile, their pure rules and statements are tested,
  and the database behaviour is witnessed; the browser pass is still owed after sign-in.
- **P9 is partly built.** The detail dialog's **Edit** action is committed and typechecked, but it
  was **not** clicked through in a real browser (the office session is expired). The **Download
  template** link on Enquiries and the board's **`ENQ-####`** display are still not built; they
  would touch the owner-dirty page/client/CSS again.
- **The board's `ENQ-####` display and detail** remains P9; the code appears on the saved-enquiry
  edit page and in the draft-save confirmation now.
- **Task 53 rows-per-page** still needs the owner's number and a signed-in session.
- **The deferred TASK-005 testing pass** (19 groups) remains blocked by the expired session; group
  17 and Benchmark 12 are person-only.
- A stale dev server on `:3210` was serving 500s from a `.next` left inconsistent by concurrent
  dev/build. It was stopped, the tree was rebuilt clean, and the production build was served on
  `:3212` for the leak check, then stopped. No source change came from that cleanup.

---

## Store and repository state

- **No push.** `main` is 17 commits ahead of `origin/main`: 10 from this pass (P0–P8 and the P9
  partial) and 7 earlier TASK-005 commits.
- **One owner-dirty file was touched, with the owner's explicit authorization.** The Edit button was
  added to `app/office/(shell)/enquiries/enquiries-client.tsx`; only that 8-line hunk was staged.
  The owner's other changes in that client, and the owner-dirty page/CSS, remain unstaged. No other
  owner-dirty file was edited or staged — not the dashboard, layout/nav/topbar/badge, the TASK-004
  plan/report, the pre-existing task-004 scripts, or the openspec/registry files.
- TASK-005's **53-task count** and **both identical report copies** were not changed.
- The task-004 plan and report remain owner-dirty; this report is the new, separate record.

## Next

1. The rest of P9 when the Enquiries page/client/CSS are clean (or the owner authorizes more
   hunks): the **Download template** link and the board's **`ENQ-####`** display. A card-level Edit
   action is possible but was not asked for; the detail dialog now has one.
2. After the office session is renewed: the live browser matrix (including the new Edit button),
   the remaining P9 entry points, Task 53 rows-per-page, and the deferred TASK-005 pass.
3. No push until the owner asks.
