# TASK-004 · Task 13 — delete → tombstone → 8 s undo → the owner's removal

**Date:** 2026-10-15 · **Status:** done — all five gates green, delete witness 33/33 (rolled back).

## What was asked

Truth 6 and `specs/inventory` ("Delete with confirmation and undo"):

- Deleting a car requires confirmation and is **undoable within an 8-second window**.
- After the window it is a **soft-delete tombstone**: hidden from every read, and listed
  as **waiting to be cleared**.
- **Removing it for good is the owner's action** — no job, rule or clock ever hard-deletes
  it. That removal takes its photos, cost lines and sale row with it and clears its stored
  images, leaving no orphan.
- One accidental delete must never be final.

## What changed

| Where | What |
|-------|------|
| `lib/car-delete.ts` (new) | The three statements — `carDeleteStatement`, `carRestoreStatement`, `carRemoveStatement` — kept apart from the action so the action and the witness run the *same* text (the `car-create`/`car-update` pattern). |
| `lib/car-delete.test.ts` (new) | 6 text-level tests (suite 100 → **106**). |
| `app/office/actions/car.ts` | `deleteCar`, `undoDeleteCar`, `removeCarForever` + `DeleteCarResult`/`RemoveCarResult`. |
| `lib/office.ts` | `OfficeCarRow` now carries `id` (a write names the car by `car.id`); new `getTombstonedCars()` — the one read that still names a tombstone. |
| `app/office/(shell)/inventory/inventory-client.tsx` | The delete modal and undo toast are wired to the real actions; the undo offer is the 8-second window; errors restore the row and say what happened. |
| `app/office/(shell)/inventory/tombstones.tsx` (new) | The "Waiting to be cleared" list with the owner's **Remove for good** (a two-step confirm), and an honest report when an image will not clear. |
| `app/office/(shell)/inventory/page.tsx` + `.css` | Renders the list below the table; small `.clearout` block. |
| `developer-workspace/scripts/task-004/delete-car-check.ts` (new) | The witness. |

## The three claims, and how each is made true

1. **Delete is a tombstone, and only that.** The statement runs
   `UPDATE car SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL` — **no other
   column moves**. Not `updated_at`, not the change-check, not `version`, not a single
   editable column (pinned by a test that fails if any of those names appear). Every office
   read already filters `deleted_at IS NULL`, so the car leaves every screen at once while
   its photos, costs, state and sale stay whole.
2. **Undo restores byte-for-byte.** `UPDATE car SET deleted_at = NULL …` — the one column
   the delete set is the one column the undo clears. Nothing else was touched, so the
   restored car *is* the car (the change-check hash is identical, asserted).
3. **Removal is the owner's, and nothing else's.** The remove statement refuses a car that
   is not a tombstone (`AND deleted_at IS NOT NULL`), so the order cannot be skipped by a
   stale request. Cost lines, photo rows and the sale row go by the foreign keys' own
   `ON DELETE CASCADE`; the photo asset ids are read from the same statement's snapshot
   **before** the rows go and handed back for the caller to clear in Sanity. The activity
   rows stay — they are the log of what the owner did, not part of the car.

**Retry-safety (D18):** all three are idempotent — a repeat delete finds it already
tombstoned, a repeat undo finds it already live, a repeat removal finds nothing left — and
each writes its activity row **from the rows it actually changed**, so no retry doubles an
event. Proven for all three in the witness.

## Decisions taken (no owner stop — the spec settles each)

- **The tombstone is set immediately on delete, not after the 8 s.** The spec's "only after
  the window close as a soft-delete tombstone" is read as *the tombstone persists after the
  window*; the plan's own acceptance line ("delete → the car is absent from every office
  read") requires the car to be absent from a server read straight after delete, which the
  deferred reading would not give. It is also the reading that keeps the delete a real,
  durable server write rather than a client timer's artefact.
- **Where "waiting to be cleared" lives:** the inventory page, below the stock table — the
  place the owner deletes from. No screen in the reference carries this list, and no spec
  names one; the requirement is that the tombstone *is* listed, so it is listed where it is
  found.
- **New activity kinds `car.deleted`, `car.restored`, `car.removed`.** The kinds are free
  text (no CHECK) and the reference feed already has a "Deleted" filter type; Task 16 maps
  kinds to the feed's labels. Removal writes its event before the row goes, keeping the log.
- **Undo works on any tombstone server-side; the *offer* is what lasts 8 s.** The client
  hides the Undo button when the window closes. This is humane and does not contradict the
  spec (which times the offer).
- **A failed image clear is reported, not swallowed.** `deleteAsset` is best-effort (Sanity
  is external, so the row-delete and the byte-clear cannot be one transaction); any image
  that will not clear is counted and named in the toast, and TASK-006's daily job clears
  unreferenced assets, so nothing sits in the store forever.

## Proof

- **`developer-workspace/scripts/task-004/delete-car-check.ts` — PASSED (33/33)**, in one
  rolled-back transaction against the live store: tombstone + nothing-else-moved, retry
  writes no second event, undo restores byte-for-byte, removal refuses a live car, removal
  cascades and returns the right asset ids, the activity rows stay, and the store holds no
  trace after rollback.
- **Five gates:** leak-check **18/18**; typecheck clean; tests **106/106**; build clean;
  store-freshness PASSED.

## Not verified (named, not hidden)

- **Office pages in a browser, and the edit/delete flow through the UI.** The office routes
  are Clerk-gated and need the owner's signed-in session. The actions are therefore proven
  at the statement/store level (above) rather than driven through the form.
- **A real Sanity asset clear on removal** was not run (it would delete a real asset). The
  statement's returned asset ids were asserted; the `deleteAsset` call path is the same one
  `npm run demo:wipe` already uses.

## One environment note

The store's IPv6 route was unreachable during this task (`ENETUNREACH` on the `2a05:…`
address); the witness was run with `--dns-result-order=ipv4first`. This is the network, not
the code — and it is exactly the kind of transient failure `lib/store-guard.ts` retries.
