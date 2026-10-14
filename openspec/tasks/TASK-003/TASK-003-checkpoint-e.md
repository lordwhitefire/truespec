# TASK-003 — Checkpoint E (final)

**Date:** 2026-10-13 · **Status:** ⬜ awaiting the owner's review
**What it is:** the closing report for the data layer, with **every benchmark tagged by the layer that
witnesses it**. Where a witness needs a write path — a form that saves, an upload, an import — it is named
as **TASK-004's** and not claimed here, the way TASK-002's gate did.

**This layer's one line:** one car with one identity, its money exact and integral, its demo removable in
one move, its images in a real asset store, its office reading the shared tables — with no runtime write
flow, and nothing deleted on the owner's behalf.

---

## What changed

| | |
|---|---|
| migrations | `0008` money · `0009` registries · `0010` identity · `0011` taps · `0012` demo marker (one file) · `0013` photo origin · `0014` enquiry PDF · `0015` retire `office_car` — forward-only, ledger `0001…0015` |
| the office | reads `car` + `cost_line` + `car_state` (+ `sale`); the adapter that expanded a lump onto six lines is deleted; `office_car` and its seed retired; `scripts/reconcile.ts` re-pointed, not lost |
| images | Sanity wired (project in the environment only, no Studio); the demo's 49 photos uploaded and `car_photo` holds asset references only; the third-party-URL branch removed from `lib/serialize.ts`; provenance in `car_photo.origin` |
| the demo | one authored fleet of 17, `is_demo` on `car` and `enquiry`, an authored private enquiry PDF, and a wipe that removes the demo **and its assets** in one move |
| storage truth | no float, no rate, no currency anywhere; labels unique; `(car_id, kind)` unique; `session.clerk_session_id`; `tap.ip` gone; the `enquiry_pdf` column renamed to `sanity_asset_id` and `deleted_at` dropped |
| two defects found and fixed on the way | **mileage in two units** — `mi` on the home page and the public inventory against the km the office and car page showed for the same number (`task.md:96`); and **stale reads**: the public pages were cached for a year and a build served rows the store no longer held (`lib/db.ts`, and `scripts/store-freshness-check.ts` as a standing gate) |

## The acceptance run — on the tree as it stands now

| gate | result |
|---|---|
| `leak-check` (before build — they share `.next`) | PASS — **2** public routes, 200, no cost/currency/profit, no asset reference, no customer detail, no office state label |
| `typecheck` | clean |
| `test` | 50/50 |
| `build` | ✓ — the public routes build `ƒ (Dynamic)`, the freshness fix holding |
| `store-freshness` | PASS — 9 store-reading routes, none prerendered, no database response cached |
| dev on `:3210` | restarted after the build; `/` → 200 |

_The leak check covers **2** routes now because the store is empty: the 26-route coverage was the run
against the demo (Task 1). With no cars there are no car pages to leak from — the coverage shrank with the
data, not with the rule._

---

## The benchmarks, each tagged with the layer that witnesses it

| # | the benchmark | witnessed by | evidence | verdict |
|---|---|---|---|---|
| 1 | **One identity.** A ref names exactly one car; no second table a car could come from | **TASK-003** — store | `0015` dropped `office_car`; store inspection: 15 tables, one car table; `reconcile.ts` exit 0 — every office row resolves to a `car` | ✅ |
| 1 | …a **tap** and an **enquiry** resolve by ref to that one car | **shape** here, **behaviour TASK-004's** | `tap.car_ref` / `enquiry.car_ref` → `car` exist and are seeded; no code reads them yet — there is no write path | ◐ shape proved, runtime TASK-004's |
| 2 | **The office's figure is the sum of the six lines, and equals the showroom's figure for the same car** | **TASK-003** — browser | Task 23: office **₦34,500,000 / 31,000 km** = showroom **₦34,500,000 / 31,000 km** at all 4 shared cells (560/820 × dark/light) on `TS-1001`; store inspection: money is integer kobo, six lines | ✅ |
| 3 | **No rate or currency anywhere** — no column, key, seed value or constraint | **TASK-003** — store | `store-inspection.mjs`: 90 columns, 15 tables, every constraint, the seed values — none mentions a rate or a currency; no float, no scaled numeric | ✅ |
| 4 | **The database refuses** a second line of one kind, a state with no section, two states sharing a name | **TASK-003** — store | `refusals.mjs`, 7 refusals, each judged on SQLSTATE + named constraint + nothing changed + the parent survived: duplicate kind `23505`, no section `23514`, shared name `23505` | ✅ |
| 5 | **A state is deleted while a car sits in it → the store refuses** | **TASK-003** (the refusal) · **TASK-004's** (the office *saying why*) | refusal proved: `23001` on `car_state_id_fkey` with 8 cars in the state (and `enquiry_state`, `23001`); the office's message surface was not re-witnessed in this layer | ◐ store ✅, office wording TASK-004's |
| 6 | **Drop and rebuild → the same numbers** | **TASK-003** — store + browser | Checkpoint B/C: schema-scratch **IDENTICAL**; a fresh chain + seed twice, green; Task 20 rebuilt the live store from nothing (17 cars, 99 cost lines, 49 photos, 6 enquiries, 1 sale, 1 PDF; `reconcile` exit 0); the browser check ran against that rebuilt store | ✅ |
| 7 | **The seed run twice: nothing duplicates, no figure moves** | **TASK-003** — store | `store-inspection.mjs` part B: both runs, every table, no row duplicated and no figure changed. **Finding:** child-row **ids change** on each seed (`car_photo`, `cost_line`, `enquiry`, `enquiry_pdf`); `enquiry.created_at` does not move, so the retention clock is safe. No figure moves | ✅ with a flagged finding |
| 8 | **A car permanently removed takes its photos, costs and sale, and nothing is left waiting to be cleared — and no job removed it** | **TASK-003** — the wipe; **the owner's delete action is TASK-004's** | Task 24 on a scratch store: dry run changes nothing; the run removed the car with 99 cost lines, 49 photos and 1 sale by cascade (and spared a PDF row a non-demo enquiry still held). On the live store: 16/16 verdicts, 0 ids lost that weren't the demo's. Nothing clears itself | ◐ mechanics ✅, the office's delete flow TASK-004's |
| 9 | **Session validity, tombstone age, enquiry age and sale date each have somewhere to answer from — and no rule or job deletes customer data** | **TASK-003** — the shape; **the asking is TASK-004's** | store inspection: `session` carries its three dates + the provider session; `car.deleted_at`; `enquiry.created_at`; `sale.sold_at` — all readable. No trigger, job or rule deletes anything; the only deletion tools are owner-run (`demo:wipe`, dry by default) | ◐ shape ✅, runtime TASK-004's |
| 10 | **No public response leaks a cost, an asset reference, a customer detail or an office state label** | **TASK-003** — store + browser | `leak-check` PASS (18 tokens, 0 cost values, 0 asset references, 0 customer values, 3 office state labels watched); Task 23: 24 public cells, all four: none | ✅ |
| 11 | **Office and showroom agree on the same car; the demo can be removed in one move, leaving nothing of itself behind and touching no other record** | **TASK-003** — browser + wipe | Task 23 (agreement, above); Task 24 — scratch 7/7 + live 16/16: the demo and its 50 assets gone, the reference data and the `0001…0015` ledger untouched | ✅ |

Legend: ✅ witnessed in this layer · ◐ partly witnessed here, the rest named as TASK-004's.

---

## What was **not** run, and what is not claimed

- **The browser evidence is a run against the demo, before the wipe.** The store is empty now; the office
  and showroom cells would need a re-seed to be opened again. The evidence stands as run.
- **Benchmark 5's "the office can say why"** and **benchmark 9's runtime questions** are the write layer's;
  their *shape* is proved here.
- **The owner's delete flow** (a car tombstoned in the office, then permanently removed) is TASK-004's; the
  wipe proves the removal mechanics under it.
- **No Sanity Studio was opened.** The assets were verified through the dataset's own API. "No Studio exists"
  is also a build fact: none is built or deployed.
- **No commit was made.** Everything since Task 14 is uncommitted — I commit on the owner's word, never on
  my own.

## Findings handed over

| finding | where |
|---|---|
| the seed rewrites child-row ids on every run (`car_photo`, `cost_line`, `enquiry`, `enquiry_pdf`); figures and `enquiry.created_at` are stable | TASK-004 / owner |
| `components/CarCard.tsx:31` says `mi` and is **dead code** — exported, imported nowhere. The live paths all say `km` | TASK-004 |
| `lib/serialize.ts:153` aliases the stored `mileage` column to `mileageKm` (a name, not a unit conversion — correct today, worth knowing) | TASK-004 |
| `client.getDocument()` returns a document for an id that **never existed** — it cannot answer "is it there?". Ask the query API | tooling note |
| `npm run` prints a banner onto stdout, so `--json` output must be sliced from the first `{`; the wipe's own dotenv output is silenced | tooling note |
| the fleet recipe and photo manifest are archived in `openspec/tasks/TASK-003/` — the demo can be rebuilt from them | owner |

## Evidence on disk

- `runs/task-24/` — `wipe-proof.json` (scratch, 7/7) · `live-wipe.json` (live, 16/16) · `wipe-proof.log`
| `runs/browser-check/` + `procedures/browser-check.md` | the agreement witness |
| `runs/task-21/refusals.json` · `runs/task-22/store-inspection.json` | refusals · no-rate/currency, seed-twice |
| `runs/checkpoint-b/`, `runs/checkpoint-c/` | schema-scratch identical; the office on one table |
| `runs/task-19-20/`, `runs/task-18/`, `runs/checkpoint-a/` | rebuild, freshness fix, baseline |
| reports | `TASK-003-task-18.md`, `-19-20.md`, `-21-22.md`, `-23.md`, `-24.md`, `checkpoint-c.md` |
| the demo's sources | `openspec/tasks/TASK-003/`: `demo-fleet.md`, `demo-photo-manifest.json`, `photo-manifest.md`, `demo-enquiry-import.json` |
