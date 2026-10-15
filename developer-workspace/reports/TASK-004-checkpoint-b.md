# TASK-004 — Checkpoint B: the car's life + the registries, live

**Date:** 2026-10-15 · **Covers plan tasks 10–18** (the write layer's whole middle: make, edit,
delete/tombstone/undo/removal, Sold and un-mark, the car-state registry editor, the enquiry board +
registry + activity from real rows, the dashboard's real feed panels, the image flow).

Per your rule, **I did not stop for this checkpoint** — it is reported here and the build continues.
Nothing below needs a decision; the one thing I want your eyes on is at the end.

---

## What was asked

Everything the office *writes*, from the moment a car is first typed in to the moment it is sold and
the enquiry board answers it: one statement per write so a half-changed car cannot exist, every figure
on screen read from the store rather than invented, and no seed left standing in for a real row.

## What is built (tasks 10–18)

| # | Built | Commit |
|---|---|---|
| 10 | The car is **made**: one statement writes the car, its cost lines, its secondary states and its `car.created` row together; the id is minted once by the server and a retry (same id) is a true no-op. | `faeaf50` |
| 11 | The car is **edited**: `private_note` is the office's own textarea; the public `note` is owned but not a form field; the edit target is per-car (`/office/car/TS-####`), bare `/office/car` means inventory. | `cde1146` |
| 12 | The car's **change-check**: the write sets every editable column, recomputes `content_hash`/`hash_version`, and never names `id`/`ref` — and the whole write is gated on `changed`, so a retry writes no second `car.updated`. | `1590efe` |
| 13 | **Delete = tombstone**: `deleted_at` + an 8-second undo, never a row destroyed; the tombstone list is a view of the same rows, not a second store. | `d997ad0`, `90157b2` |
| 14 | **Sold / un-mark**, as the fourth primary state — a sale row writing `sale.prior_state_id` (migration `0021_sale_prior_state.sql`), so un-marking returns the car to where it actually was. | `1c96479` |
| 15 | **The car-state registry editor**: states added, renamed and retired from the office; a state still holding a car cannot be removed (`ON DELETE RESTRICT`, SQLSTATE **23001**, surfaced as an actionable refusal, never a 500). | `04c0395` |
| 16 | **The enquiry board**: enquiries read from real rows, their states from the registry, the activity log drawn by one shared wording rule; `app/office/actions/enquiry.ts` is the write door. | `d1a5cc3` |
| 17 | **The dashboard's two feed panels** read real rows; the fabricated counts and the fabricated header date are gone; an empty feed **says it is empty** rather than looking broken. | `4074ab3` |
| 18 | **The image flow**: the bytes reach the asset store **before** any row exists and the row links on save; the reference column holds a reference and never an address; 15 MB cap; **EXIF stripped at the write boundary**; a missing asset or an unreachable store renders a drawn placeholder. | `6848c8f` |

Two cross-cutting things landed inside this stretch and are worth naming:

- **Resilience in one place** (`lib/store-guard.ts`, commit `7982435`): every store read goes through
  `storeQuery`, which retries **only transient** errors; writes are idempotent so a retry is safe.
  Before this, a cold Neon connection surfaced as a 500 on a page that had done nothing wrong.
- **The state model, rebuilt** (migration `0020_state_model_split.sql`, design D15): four primary
  states — **Available, On Order, Landed, Sold**. `section` *is* the primary state; the showroom
  presents three of them and never Sold. The ruling is written down in
  `notes/TASK-004-D15-section-ruling.md`.

## What is verified — and how

- **All five gates green on the finished tree** (leak-check → typecheck → test → build →
  store-freshness), plus **161/161 tests**.
- **A witness per write, run against the live store inside a transaction that is rolled back** — so
  each proof exercises the *same statement text the action runs*, and leaves the store as it found it:
  `create-car-check.ts`, `update-car-check.ts`, `delete-car-check.ts`, `sold-car-check.ts`,
  `state-registry-check.ts`, `secondary-section-check.ts`, `enquiry-registry-check.ts`,
  `dashboard-feeds-check.ts` (19/19), and `photo-write-check.ts` (20/20).
- **The image boundary measured, not asserted** (`photo-write-check.ts`): a real JPEG built carrying
  EXIF comes out of the strip with none, uploads, and the store is read back holding **exactly the
  prepared 784 bytes** — then the throwaway asset is deleted.
- **In a real browser** (`photo-placeholder-check.mjs`, 6/6 over three runs, attach-only on `:9222`):
  a car page's photo loads from the address derived from its stored reference, and forcing that image
  at bytes that are not there swaps in the drawn placeholder, which actually decodes and draws.

## What is NOT verified — and needs you

1. **No office screen has been driven in a browser by me.** Every office route is Clerk-gated and your
   session is the only way in, so the office half of tasks 10–18 — the car form, the drop zone, the
   photo upload, the state editor, the enquiry board, the undo toast, the sold view — has been checked
   by the typecheck, the statement-level witnesses and the refusal proofs, but not by a click.
   **This is the one thing I want your eyes on**, and it is a *look*, not a decision: the office is
   yours to drive.
2. **No photo over the cap was sent through the real action.** The cap is proved on the rules and the
   boundary is measured at the byte level; `bodySizeLimit: "16mb"` is configured, not exercised with a
   real 15 MB file (the Clerk-gated action is the only door to it).
3. **A stripped photo shows in its stored orientation.** EXIF removal takes the orientation tag with
   it and v1 has no derivative pipeline to bake the rotation in — the trade truth 7 asks for. Accepted
   and documented in `lib/photos.ts`, not worked around.
4. **The retryable-state *wording*** and the per-width interaction split (including the genuinely open
   tablet nav) are TASK-005's, as the plan already names.

## Decisions I made where the authority was silent

All of these are in the plan's tracker and in the per-task notes; the short list:

- **`/office/car` edit target** — per-car at `/office/car/<ref>`; bare `/office/car` → inventory.
- **A retry is a true no-op** — every write carries a `changed` guard rather than a "last write wins".
- **`sale.prior_state_id`** — un-marking returns a car to the state it actually held, not to Available.
- **`activity_event` is `kind` + `subject`** (D20), and a registry edit writes no activity row (a
  registry is not the car's life).
- **The photo set is part of the change-check**, in its order — so a reorder is a real write.
- **The placeholder is client-side** (`<img>` + `onError`), so no layout around it moved; a stored value
  that is *not a reference at all* is still a named failure, deliberately not softened.

## Gaps handed over, named not hidden

- **TASK-005:** the wording of the retryable state; the per-width interaction split; toast/confirm
  presentation; the 8-second undo's presentation.
- **TASK-006:** the daily job — drift report, retention notice, `last_backup_at` heartbeat,
  `auth_attempt` 90-day trim, and clearing assets no draft and no record ever referenced.
- **Architecture:** the specs still say "section" where D15 says "primary state" — built to D15's
  semantics, logged as a pending vocabulary rewrite rather than silently rewritten.

## Next

Task 19 — the tap + the privacy notice + the office badge/list (build step 6). No stop planned unless a
decision is needed.
