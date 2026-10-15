# TASK-004 · Task 25 — Demo marker + the wipe covers drafts

**Date:** 2026-10-15 · **Status: done.** Built, witnessed against a scratch store, five gates green,
committed.

## The line that shaped it

One sentence from the spec settles the whole task (`task.md:273-290`):

> Anything the application creates while the demonstration is the fleet is demonstration data …
> Nothing this layer writes may slip in without it.

So **every content write this write layer makes writes `is_demo = true`** — and it writes it as a
**literal in the statement**, not as a bound parameter and not by leaning on the column default. The
default is a schema fact; the marker is a write-layer promise, and a promise that lives in the default
is a promise nothing here made.

Three tables carry the column: `car`, `enquiry`, `draft`. Every write this layer makes to any of them
now says so. Children (`cost_line`, `car_photo`, `sale`, `car_secondary_state`) have no such column —
they inherit the car's marker through the car. `car_state` and `enquiry_state` have no column either;
that is stated honestly rather than quietly fixed, because changing their schema is not this task.

## What changed

- **`lib/car-create.ts`** — the `car` INSERT gains the column `is_demo` with the value `true`, written
  as a literal (no parameter renumbering). A doc comment records why.
- **`lib/enquiry-create.ts`** — the same on the `enquiry` INSERT.
- **`lib/draft.ts`** — `DRAFT_INSERT` gains `is_demo` / `true`. The comment that stood here said the
  marker was "left to its column default … `seed.ts` is the only place that sets it true" — that was
  **wrong**, and it is rewritten.
- **`scripts/demo-wipe.ts`** — the one-move wipe now covers the holding place:
  - `OWNED_BY_OTHERS.draft` — the rows that are **not** the demo's, and so are never touched
    (`SELECT id FROM draft WHERE NOT is_demo`).
  - a `draftAssetIdsOf(rows)` helper gathers a draft's file asset and its image assets (DRY — used by
    both the dry-run count and the delete).
  - the summary learns `demo.drafts` / `demo.draftAssets`, and the result learns `removed.drafts`.
  - the delete is now `DELETE FROM draft WHERE is_demo RETURNING source_asset_id, image_asset_ids`; the
    asset set that may be deleted grows to include `draftAssetIds`, and `stillDemo` now checks `draft`
    too — so a demo draft's held file and its images are removed with it, and nothing else is.
  - the header, the totals query, the dry-run output lines and the emit wording were updated to name
    drafts.

## What was verified

- **`demo-wipe-drafts-check.ts` — 12/12 PASS** (scratch store, both halves in one run). It builds a
  scratch database from nothing (migrate → seed), then:
  - **the dry run** reports `demo.drafts = 1`, `demo.draftAssets = 2`, and changes nothing;
  - **the real wipe** (with assets) reports `removed.drafts = 1`, `assets.collected = 2` — **exactly
    the witness's own two assets** — `assets.deleted` holding both, `failed = []`;
  - the query API (`findImageAsset` / `findFileAsset`) confirms **both references are gone from the
    store** — no orphaned asset a draft named remains;
  - the demo draft is gone, and **a draft that is not the demo's survives untouched** (1 → 1), with
    `untouched.missing = []` and the summary matching the store afterwards.
  - The gate that makes the asset half honest: the witness first removes the scratch copy's *seeded*
    asset references (the demo `car_photo` and `enquiry_pdf` rows name the same real Sanity assets the
    live store holds), then hard-gates that `car_photo` / `enquiry_pdf` hold **no** non-null asset
    reference — so the wipe can only ever be offered the witness's own two uploaded assets. The
    measured `collected = 2` is that gate holding.
- **The three writes carry the marker, proven by the existing witnesses (re-run, all pass):**
  `draft-save-check.ts` **28/28** — the saved car carries `is_demo = true`, and the **enquiry save leg
  now runs end-to-end** (an enquiry draft saved → one `enquiry`, name/number/asked_for + the named
  state, `is_demo = true`, draft consumed) — a gap Task 24 had flagged as unit-tested-only, now closed.
  `draft-read-check.ts` and `enquiry-read-check.ts` assert the marker at the upload
  ("carries the demo marker like a seeded row, task.md:280").
- **The five gates, in order:** leak-check **PASSED**; typecheck **clean**; **238/238** tests; build
  clean with `/office/drafts`; store-freshness **PASSED**.
- **Live store intact after all runs:** `car` 17 (all demo), `enquiry` 6, `draft` 0, `car_photo` 49,
  `office_user` 0; `ts_ref_seq` last_value **1028** — the save witness spent one code (its car is
  deleted; the sequence does not go backwards, by the house's own rule).

## Not verified

- The signed-in browser path — the standing Checkpoint B gap (no office session exists in this
  environment).
- The wipe **with assets against the live store**. It is deliberately never run there: the live demo's
  asset references are the same real assets, and the wipe would need the live store to itself. The
  scratch witness is the proof, and it is the proof *because* it isolates the asset half.
- `car_state` / `enquiry_state` carry no `is_demo` column. A demo wipe leaves any states this layer
  creates (a demonstration state the owner made by hand). Flagged, not changed — the schema is not this
  task's to alter.

## Findings for later tasks

- **`store-freshness-check.ts`'s route list is now stale.** TASK-004 made `/office/enquiries`,
  `/office/drafts` and the office car screens read the store, but the gate's list of store-reading
  routes predates them. Today it does not bite — the build marks every one of them `ƒ` (dynamic), so
  nothing is prerendered — but the gate would not catch it if one ever were. Belongs with Task 29 (the
  shared store guard) or Task 33 (the final gates). Not changed here: it is outside Task 25's scope.
