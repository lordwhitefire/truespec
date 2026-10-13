# TASK-003 Task 24 — removing the demo, and its images with it

**Authority:** `openspec/tasks/TASK-003/task.md:115` — the demo goes, along with the demo's own assets.
**Run:** 2026-10-13, on the live store, on the owner's explicit go.

## What was asked

Take the demo out of the store — the 17 fleet cars with everything hanging off them, the 6 enquiries
and the PDF they came from, and the demo's own images — and touch nothing that is not the demo's.

## What was built

- **`scripts/demo-wipe.ts`** (`npm run demo:wipe`) — dry run by default; `--yes` to act, `--no-assets`
  to keep the images, `--json` for a machine-readable report. One transaction for the rows. Children
  follow their parents (cost lines, photos and the sale cascade with the car); the imported PDF row is
  removed explicitly (its link to an enquiry is `ON DELETE SET NULL`, so the row would otherwise be
  orphaned), and only when no enquiry outside the demo still holds it. Demo `tap` and `activity_event`
  rows go by the refs they name.
- **`lib/sanity.ts` → `deleteAsset(assetId)`** — the only delete in that file, one caller, next to the
  upload and read functions.
- **`scripts/demo-wipe.ts` collects the demo's assets by the ids the store holds** (the 49 photos and
  the imported PDF) and deletes them only after the rows that named them are gone. The manifest of
  origins lives in the repo (below), because after this the assets exist nowhere.

## Proved on a scratch store first — 7 verdicts, all PASS

`developer-workspace/scripts/task-003/wipe-proof.mjs`: a scratch database, the whole chain, the demo
seed, then records planted that are **not** the demo's — a car of its own with cost lines, a photo, a
sale, a tap and an activity row; a real enquiry with its own PDF; and an enquiry sharing **the demo's**
PDF row. Then the wipe ran and its claims were checked against the store.

| verdict | detail |
|---|---|
| a dry run changes nothing | `dryRun=true`, store identical before/after |
| nothing of the demo is left | cars 0 · enquiries 0 · cost lines 0 · photos 0 · sales 0 · taps 0 · activity 0 |
| nothing that isn't the demo's moved | 10 measures identical, no id lost |
| **the shared PDF is spared** | the demo's PDF row survived because a non-demo enquiry still held it |
| the wipe's summary matches the store | cars 17/17 · enquiries 6/6 · 0 ids lost that weren't the demo's |
| assets offered for deletion were exactly the demo's | 49 = the demo's photo count; none left to offer |
| the ledger and the reference data stand | untouched |

Evidence: `runs/task-24/wipe-proof.json`, `runs/task-24/wipe-proof.log`.

## The live run

The demo's sources were archived **before** anything was deleted —
`openspec/tasks/TASK-003/`: `demo-fleet.md` (the fleet recipe), `demo-photo-manifest.json` (the 49
Unsplash origins and the asset ids), `photo-manifest.md`, `demo-enquiry-import.json`. Without those the
demo could not be rebuilt; the images themselves are about to stop existing.

The dry run listed exactly the 17 refs. Then, on the owner's go:

| the wipe's report | |
|---|---|
| removed | **17 cars** (with 99 cost lines, 49 photos and 1 sale by cascade), **6 enquiries**, **1 imported PDF row**, 0 taps, 0 activity rows |
| assets | **50 collected, 50 deleted, 0 failed** — the 49 photos and the demo PDF |
| ids lost that were not the demo's | **0** |

## The verification — 16/16, asked of the store, not the report

`developer-workspace/scripts/task-003/verify-live-wipe.ts` reads the wipe's report and then asks Postgres
and the Sanity dataset whether it is true.

| verdict | now |
|---|---|
| the demo's tables are empty | car 0 · car_photo 0 · cost_line 0 · sale 0 · enquiry 0 · enquiry_pdf 0 · tap 0 · activity 0 |
| every asset the run deleted is gone | none of the 50 remain |
| no assets left in the dataset at all | 0 |
| nothing that wasn't the demo's went missing | 0 ids |
| the five car states stand | At port, Available, Cleared, Landed, On the way |
| the enquiry states stand | 5 |
| the settings stand | 3 |
| the ledger stands | 15 · `0001_people.sql` … `0015_retire_office_car.sql` |

Evidence: `runs/task-24/live-wipe.json`.

## Mistakes I made, and what they cost

- **The asset delete was claimed, not measured.** I wrote `deleteAsset` from a description of the
  client rather than from its behaviour. The wipe reported 50 deletions and every call returned without
  error — and I could not tell from that whether the assets were gone. I then asked the store directly:
  the dataset now holds **0** image/file assets. To prove the *check itself* could see an asset (a check
  that can only ever answer "none" proves nothing) I uploaded one 64×64 image of my own, watched the
  count go 0 → 1, deleted it **with the same function the wipe uses**, and watched it go back to 0.
  `asset-delete-proof.ts` — PASS. The delete path is proven, not assumed.
- **Two wrong readings of "is it there?".** My first check treated Sanity's `{"documents":[],
  "omitted":[…"reason":"existence"]}` as *present* — the regex matched the `"id"` inside the "omitted"
  payload. And `client.getDocument()` returns a document for an id that **never existed**, so it cannot
  tell "gone" from "here" at all. Both are recorded in the scripts; existence is now asked of the query
  API, in one place.
- **A hand-rolled 1×1 PNG was rejected** by Sanity as an invalid image; the control now generates a real
  one with `sharp`, which the project already depends on.
- **The proof harness ran one connection per query** — slow, and on a link that was dropping it lost the
  run twice. It is one connection now.
- **A failed edit left the shared-PDF enquiry unplanted**, so the guard passed vacuously the first time.
  Re-planted, the guard is now genuinely exercised.
- **The wipe crashed twice on my own SQL**: the `tap` select was handed two parameters where it takes
  one; and `setting` has no `id` column — its key is its identity.
- **`npm run` prints a banner onto stdout**, so `--json` output must be sliced from the first `{`. The
  wipe's own dotenv output is silenced; a caller piping through `npm` must still account for the banner.

## The closing gates, in the learned order

| gate | result |
|---|---|
| `leak-check` (before build — they share `.next`) | **PASS** — 2 public routes, 200, no cost/currency/profit value, no asset reference, no customer detail, no office state label |
| `typecheck` | clean |
| `test` | 50/50 |
| `build` | ✓ — and the public routes build as `ƒ (Dynamic)`, the Task 18 fix holding |
| `store-freshness` | **PASS** — none of 9 store-reading routes prerendered, no database response cached |
| `next dev -p 3210` restarted | up · `/` → 200 · the empty store renders correctly ("Nothing here yet — tell me the car you're after") |

## Not verified

- I did not open Sanity Studio to look at the media library — I verified the dataset through its own API,
  by count and by query. If the Studio shows anything else, that is a UI claim I did not make.
- I did not rebuild the demo. The recipe and the manifest are archived; that path is untested end to end.

## Files

- `scripts/demo-wipe.ts` · `lib/sanity.ts` (`deleteAsset`) · `package.json` (`demo:wipe`)
- `developer-workspace/scripts/task-003/wipe-proof.mjs` · `asset-delete-proof.ts` · `verify-live-wipe.ts`
- `developer-workspace/scripts/task-003/runs/task-24/` — `wipe-proof.json`, `wipe-proof.log`, `live-wipe.json`
- `openspec/tasks/TASK-003/`: `demo-fleet.md`, `demo-photo-manifest.json`, `photo-manifest.md`, `demo-enquiry-import.json`
