# Data layer findings

What the store holds, what it enforces, and what nothing writes. Read from `migrations/` (0001–0025) and `lib/`.

## What is sound
- **Money**: every amount is integer kobo (`bigint` / `amount_minor`); `0008` removed `currency` and `rate_minor` and added `UNIQUE (car_id, kind)` — the six naira cost lines are enforced by the store, not by habit. NULL ≠ 0, and the code preserves that.
- **Identity lock**: `0018` refuses any UPDATE that changes `car.ref` or `enquiry.ref`; a name once given is final. Deleting is still possible.
- **Soft delete**: `car.deleted_at`; the tombstone is excluded from every live read (`WHERE c.deleted_at IS NULL`) and only listed in the clear-out panel.
- **Cascades**: removing a car for good takes `car_photo`, `cost_line` and `sale` with it; the stored images are cleared by the action and failures are reported.
- **One line per kind**: `cost_line_car_kind_unique`; one photo per position: `UNIQUE (car_id, position)`.
- **Refs**: `ts_ref_seq` ascends and is never reused; `ENQ-####` likewise (`0025`).
- **No enquiry→car join**: `0016` removed `car_ref`; what the customer asked for lives in `asked_for` in their own words.
- **Session rows**: `session` participates in the application's own 12 h / 7 d rule; `last_seen_at` refresh is cooldown-bounded.

## DATA-001 — The imported PDF is never linked to anything
**Severity:** major · **Status:** open
**Evidence:** `enquiry_pdf` appears only in `migrations/0014_enquiry_pdf.sql` and in the dead `lib/cleanup.ts` read. `draft.source_asset_id` is read into `Draft` (`lib/draft.ts:60`, `lib/draft-store.ts:62`) and `draftSource` is carried into the form (`lib/enquiry-form.ts:54`), but no save path inserts an `enquiry_pdf` row.
**Effect:** the file is uploaded and held (one Sanity asset per upload), and the draft remembers its id — but the enquiries it produced have no PDF attached. The spec's "imported PDFs are linked to produced enquiries and deletable by the owner" is not wired. The asset also cannot be found from the enquiry it came from.
**Check:** import an enquiry sheet, save two enquiries, then look for any PDF control on either enquiry. There will be none.

## DATA-002 — Customer data cannot be deleted
**Severity:** blocker · **Status:** open
**Evidence:** no `deleteEnquiry` action or UI exists (`app/office/actions/enquiry.ts` exports create/update/state only); `lib/cleanup.ts` can *report* an enquiry at its year but exposes no delete; `/api/export` is the only bulk path out, not a deletion. The public privacy page promises deletion on request and a 12-month retention decision.
**Effect:** every enquiry ever recorded — name, phone, what they asked for, notes — is retained indefinitely with no owner action able to remove it. The promise on the privacy page cannot be kept from inside the product. This is the one finding that is both a spec gap and a live obligation.
**Check:** open an enquiry's detail and edit screen — list every control. There is no Remove/Delete anywhere.

## DATA-003 — `lib/cleanup.ts` is dead code
**Severity:** blocker · **Status:** open
**Evidence:** `listWaitingToBeCleared` is exported and called by nothing (`grep` over `app/`, `components/`, `lib/` returns only its own file). The Inventory clear-out panel reads only `car.deleted_at` tombstones (`tombstones.tsx`).
**Effect:** four of the five things the store says the owner is told about have no surface: enquiries at their year, a record pointing at a missing asset, stored images no record references, and stale auth attempts. Only deleted cars are ever shown. The "system warns, the owner clears" rule has a read but no mouth.
**Check:** Settings → Account, Inventory clear-out panel — confirm there is no "waiting to be cleared" section for anything except deleted cars.

## DATA-004 — Row-level security is enabled and has no policies
**Severity:** major · **Status:** open
**Evidence:** `migrations/0006_indexes.sql:16-18` and `0011_taps.sql` run `ALTER TABLE … ENABLE ROW LEVEL SECURITY`; `grep -rn "CREATE POLICY\|FORCE ROW LEVEL" migrations` returns nothing.
**Effect:** with no policy, a non-owner role is denied everything and the table owner bypasses RLS. Since the application works, its role owns (or is superuser over) the tables — so RLS contributes no protection at all. The database is not the second line of defence the schema implies; the application's `WHERE` clauses and the session are the only line.
**Check:** not device-observable; note for the owner/architect.

## DATA-005 — "One owner" is not enforced by the store
**Severity:** major · **Status:** open
**Evidence:** `migrations/0001_people.sql` creates `office_user` with a unique **email** and no other cardinality constraint. `lib/session.ts` (`checkOfficeSession`) inserts `office_user (email) … ON CONFLICT (email) DO UPDATE` for **any** provider identity it is handed.
**Effect:** the spec's "exactly one owner account at the provider" is a provider setting, not an application rule. If Clerk ever holds a second user (an invited collaborator, a test identity, a misconfigured instance), that person is silently written as an owner and gets the full office. No allow-list, no count check, no refusal.
**Check:** not device-observable from the app; verify the Clerk instance has exactly one user.

## DATA-006 — Device drafts hold private data outside the store
**Severity:** minor · **Status:** open
**Evidence:** `lib/device-draft.ts` writes car form values (including `private_note`, costs and sale price) and settings values to `localStorage`; keys are per car/draft/setting.
**Effect:** the store's privacy boundary is not the browser's. The data is cleared on sign-out (`app/office/sign-out` → `clearDrafts`) and on a successful save of that car, but survives tab close, session expiry if sign-out is never reached, and a shared phone left signed in. It is plaintext. That is a deliberate convenience, but it is invisible to the owner.
**Check:** on the phone, type a private note, close the tab without saving, reopen the car — the note returns.
