# TASK-004 · Task 16 — Enquiry editor + board + activity from real rows

**Date:** 2026-10-15 · **Status:** in progress
**Authority:** `openspec/tasks/TASK-004/task.md` truths 10 (the registries), 13 (labels not stages),
15 (every office screen reads real rows — the enquiries board, the activity feed, the two state
editors), 14 (the change-check is the server's); `specs/enquiries/spec.md`; design **D12**, **D18**,
**D20**; divergence 6. Plan row 16.

## The owner's ruling (2026-10-15) — how far the enquiry screen goes

Asked, because the spec requires *"an enquiry that has just arrived is given the state Sold the same
day … the change is accepted"* (`specs/enquiries/spec.md`, "Enquiry states as an editable registry")
and **no later task in the plan provides a way to set an enquiry's state**.

**Owner chose:** *"Board + state editor + activity, plus setting an enquiry's state."*

So Task 16 is:

1. **The board reads real rows.** `enquiry` + `enquiry_state`, grouped in the **registry's order**, a
   display of labels — **no progression implied**, and **no card-move write**. A crafted "move a card"
   shape changes nothing (the AC's own verify line; divergence 6's winner).
2. **The enquiry-state editor writes the registry** — add, rename, recolour, reorder, remove; a state
   an enquiry carries **cannot be deleted** (the store's `ON DELETE RESTRICT` refuses it, the reason
   carrying the store's own count).
3. **The activity log reads `activity_event`** — real rows, no demo list.
4. **Setting an enquiry's state is the one enquiry write** — opening an enquiry's card can give it
   **any** state at any time (truth 10: nothing requires one state to come before another; Sold on an
   enquiry changes nothing about any car), written through `app/office/actions/enquiry.ts` with the
   server's change-check (truth 14).
5. **The card's other fields stay read-only** — name, number, what they asked for and note are the
   import's to set (Task 23/24); editing them is **not** in this task.
6. **No seed remains.**

### The board does not write, but a card does

The distinction that reconciles the AC with the spec's scenario: the **board** is a display (dropping
a card between columns is the demo's shape and must change nothing — no write path exists for it), but
**an enquiry's own card** carries the one legal write — *give this enquiry a state*. That is what
*"given the state Sold the same day … the change is accepted"* describes: an explicit, one-enquiry
action by the owner, not a pipeline.

---

## What was built

**Reads** (`lib/office.ts`, truth 15):

- `getEnquiryStateRegistry()` — every `enquiry_state` row, ordered `sort, label`, each carrying
  `enquiries`: **the store's own count** of the enquiries sitting in it (a correlated `count(*)`),
  so the number a chip shows can never contradict the store's refusal to delete an occupied state.
- `getEnquiries()` — every enquiry, newest first, with `stateId` **nullable** (the store allows a row
  with no state; the board draws those in a group of their own rather than inventing one) and
  `imported` = `pdf_import_id IS NOT NULL`.
- `getOfficeActivity()` — the raw feed, newest first, **bounded to `ACTIVITY_LIMIT` = 200**. One row
  is `kind` + `subject` + `at` + `actor` (the operator's email by FK; `null` when the account is gone),
  and nothing else — D20's shape. `lib/office-time.ts` formats the day and the time in **UTC
  server-side**, so the screen never formats from the browser's clock.

**Registry writes** (`lib/enquiry-state.ts`, `app/office/actions/enquiry.ts`):

- add / rename / recolour / reorder / remove, each retry-safe the same way the car registry's are: the
  add's key is minted once (`ON CONFLICT (id) DO NOTHING` + the trailing `UNION ALL`, so a repeat still
  reports the row), rename and recolour set a value to a target under `IS DISTINCT FROM`, the reorder
  writes the whole ordered list, the remove's effect is idempotent.
- No primary/secondary split and **no kind guard**: `enquiry_state` has no `kind` column, so the states
  the store ships with are edited exactly like one the owner adds. That is truth 13 in code.
- The two refusals are the store's and are reported as it means them: a name another state carries
  (`23505`), and deleting a state an enquiry sits in — `ON DELETE RESTRICT`, which Postgres reports as
  **23001**; the action catches 23001 and 23503 and asks `enquiryStateHoldersStatement` **only after**
  the refusal, so the message carries the store's number ("4 enquiries are still in this state ...").

**The one enquiry write** (`lib/enquiry-set-state.ts`, `setEnquiryState`):

- `enquiryEditableStatement` reads the row's stored editable values; the **action** computes the hash
  with `enquiryChangeCheck` with the new state in place (truth 14 — a hash from a browser is never
  trusted); `enquirySetStateStatement` writes it gated on `enquiry_state_id IS DISTINCT FROM $2`, so a
  repeat is a true no-op, and the trailing arm still reports the row found. `23503` is reported as
  "That state is no longer in the office".
- **No `activity_event`** is written when an enquiry's state changes. Its only subject is the
  customer's own name or number — PII that must not outlive the enquiry row, and an activity row
  outlives it by design; an opaque id would make an unreadable entry, and no requirement asks for one.
  The log stays the office's own changes to the cars. Noted, not invented.

**Screens** (`app/office/(shell)/...`):

- `settings/page.tsx` + `settings-client.tsx` now render **both** registries. The add / rename /
  recolour / reorder / remove machinery is one component, `settings/registry-editor.tsx`; each
  registry is a thin adapter (`car-state-editor.tsx` carries the car rows' `locked` flag for the four
  primaries, the enquiry rows carry none). Drag-to-reorder was **removed** from the board and the
  reorder now lives in the editor's arrow controls, which write the full ordered id list.
- `enquiries/page.tsx` + `enquiries-client.tsx`: the board reads the real rows, groups them in the
  registry's order, and gives each card a state picker posting to `setEnquiryState`. The card's other
  fields (name, number, asked for, note) are read-only, per the ruling. The **import modal and its
  7-row demo preview are gone** (that is Task 23's, and it was a seed), and the hardcoded "4 taps
  today" line is gone (Task 19's).
- `activity/page.tsx` + `activity-client.tsx`: renders `getOfficeActivity()` as JSX (never
  `dangerouslySetInnerHTML`), a known kind by name and an unknown kind as `kind — subject` under a
  neutral `.tag.other` rule. The `.more2` "Show 3 older days" button and the dead `.taps`, `.drop`,
  `.reading`, `.twrap`, `.t`, `.flagchip`, `.psum` rules went with the seed.
- Deleted: `settings/state-seeds.ts`, `settings/state-editors.tsx`.

## Verified

- **Five gates, in order, on the finished code:** `leak-check` (18 public routes, all `ok` — no cost,
  currency or profit) -> `npx tsc --noEmit` clean -> `npm test` **138/138** (121 + 17 new) -> `npm run
  build` clean (`/office/enquiries` 2.78 kB, `/office/activity` 1.75 kB, `/office/settings` 6.34 kB) ->
  `npm run store-freshness` PASSED (none of 9 store-reading routes prerendered, no cached db response).
- **Witness `developer-workspace/scripts/task-004/enquiry-registry-check.ts` — 42/42 PASSED** against
  the live store, inside one transaction rolled back. The statements are the same builders the actions
  run; the reads are the **real read functions**, imported under `--conditions=react-server` so
  `server-only` resolves. Measured on the live store: registry 5 of 5 states in the owner's order and
  the chip counts are the store's own (`New=3 Talking=2 Negotiating=1 Sold=0 Lost=0`); board 6 of 6
  enquiries, each in a state the registry holds; the activity read bounded and matching. Then, in the
  transaction: add lands last (`50 < 51 < 52`) and a retry adds no second row; rename/recolour write
  once and a repeat writes nothing; reorder writes 7 of 7 and a repeat moves nothing, **including the
  states the store shipped with**; duplicate name refused `23505
  enquiry_state_label_unique`; **New -> Lost accepted** with the stored hash equal to the server's own
  recomputation and the details untouched; a repeat of the same state leaves a `SENTINEL` hash in
  place (a true no-op, proved rather than assumed — `now()` is the transaction clock, so `updated_at`
  cannot show it); the occupied delete refused `23001 enquiry_enquiry_state_id_fkey` with the store's
  count and **no enquiry moved out**; the unoccupied delete clean and a repeat finding nothing; an
  enquiry's `id` refused `23514`; and after the rollback the store is the size it was, with the reads
  saying the same thing.
- Run line: `node --conditions=react-server --dns-result-order=ipv4first --import tsx
  developer-workspace/scripts/task-004/enquiry-registry-check.ts`.

## Not verified

- **The office screens were not driven in a browser.** Every office route is Clerk-gated and needs the
  owner's session; the client components (the board, the editor, the activity list) are not
  unit-tested either. What stands behind them is the build, the typecheck, the read/write witnesses
  above, and the fact that the reads are the real functions.
- **The activity log is empty.** `activity_event` holds 0 rows and no seed authors one, so the
  `/office/activity` screen honestly shows nothing until the owner acts on a car. Reported, not hidden.

## Findings worth keeping

- `enquiry_state` has **no `kind` column and no primary/secondary split** — every row is the owner's.
  Contrast `lib/car-state.ts`, where the four primaries are locked in the statements as well as the
  screen.
- `ON DELETE RESTRICT` on `enquiry.enquiry_state_id` reports **23001** (`restrict_violation`), the same
  as the car registry's — the action catches **both 23001 and 23503** at both places.
- `now()` is the transaction timestamp, so `updated_at` cannot prove a write inside a witness's
  transaction; a sentinel hash can.
