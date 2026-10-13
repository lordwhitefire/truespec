# TASK-003 — plan (data model, Layer 3 of 6)

**Date:** 2026-10-13 · **Status:** plan written; **awaiting the owner's "go" before any build**
**Authority:** `openspec/tasks/TASK-003/task.md` (the plan-not-instructions, its 17 conflicts, the owner's
Round-1, Round-2 and Round-3 answers) + `specs/*`, `design.md`, `tasks.md` in the architecture change + the
TASK-002 model (`developer-workspace/models/TASK-002-model.md`) for the rules the store must express.
**Task list target:** this file's Progress tracker + Task List (Developer workspace convention; no `tasks/todo.md` in this project).

> **PORTS — STANDING RULE (owner, 2026-10-13):** build on **`:3210`**, reference on **`:3211`**. **Port `3000` is never used — not for dev, not for leak-check, not for any probe, not mentioned as a target.**
>
> **GATE ORDER (learned 2026-10-13, extended 2026-10-13):** `next dev` (`:3210`) and `next build` share `.next`. Run **`leak-check` before `build`**, then **`store-freshness`** (which reads the build's own manifest), then restart `next dev -p 3210`. A warm `.next` could serve **pre-build data**: the door cached database reads for a year (`revalidate: 31536000`) until 2026-10-13, when a build rendered the public pages from rows the store had no longer held for hours. Both halves of the fix (`lib/db.ts`, `scripts/store-freshness-check.ts`) are now gates.

---

## Progress tracker

_Updated as work lands. Legend: ⬜ not started · 🟨 in progress · ✅ done+verified · ⛔ blocked._

| # | Task | Status | Notes |
|---|------|--------|-------|
| — | Pre-flight: grilling (Rounds 1–3) + shared understanding | ✅ | All three rounds answered by the owner in `task.md` (2026-10-13); frontier empty |
| 1 | Workspace artefacts + green baseline | ✅ | brief, notes, plan written; 4 gates green on the untouched tree (test 47/47, typecheck clean, leak-check 26/26 routes, build ✓) |
| 2 | Migration `0008` money | ✅ | drop `currency`/`rate_minor`/both rate checks; `UNIQUE (car_id, kind)`; duplicate kind refused |
| 3 | Migration `0009` registries | ✅ | colour (hex) + NOT NULL + CHECK on both, back-filled; both labels unique; duplicate + non-hex refused |
| 4 | Migration `0010` identity | ✅ | `password_hash` gone; `session.clerk_session_id` NOT NULL UNIQUE |
| 5 | Migration `0011` taps | ✅ | `tap.ip` gone; `auth_attempt.ip` kept |
| 6 | Migration `0012` demo marker | ✅ | `is_demo` on `car` + `enquiry`; partial indexes; all existing rows false |
| 7 | Migration `0013` photo origin | ✅ | `origin` NOT NULL + not-blank; 73/73 back-filled as `unsplash:<id>` |
| 8 | Migration `0014` enquiry_pdf | ✅ | `path`→`sanity_asset_id`; `deleted_at` gone |
| A | **Checkpoint A — the chain applies clean** | ✅ | `0008…0014` applied; ledger exact; from-nothing vs corrective schema **IDENTICAL** (empty diff); leak-check green; evidence `reports/TASK-003-checkpoint-a.md`; owner said continue |
| 9 | Demo fleet list (owner gate) | ✅ | Approved 2026-10-13: 17 cars, all from the public list (every one already photographed); office-only models excluded by the owner's choice — `plans/TASK-003-demo-fleet.md` |
| 10 | Demo photo sources + intended manifest | ✅ | 49 images / 17 cars, **all resolve, 0 dead**; `fm=jpg` forced after measuring (one source returned a 1.9 MB PNG); **no Exif segment in any**; `plans/TASK-003-photo-manifest.md` + `runs/task-10/` |
| 11 | Wire the Sanity client | ✅ | `lib/sanity.ts` written (client; `uploadImage`/`uploadFile`; `imageUrl`; `findImageAsset`/`findFileAsset`); read-only probe to `c2lc8g8n`/`production` succeeded (0 assets, so nothing pre-existing) |
| 12 | Upload the demo photos + prove the store | ✅ | **49 uploaded, 0 Exif on the exact bytes sent**, ids in `scripts/demo-photo-manifest.json`; 49 `car_photo` rows pointed at asset ids; re-run **uploaded 0, skipped 49**; reference resolves and the derived address fetches 200/jpeg at original dimensions |
| 13 | Author + upload the one demo enquiry PDF | ✅ | Fictional 4-row sheet authored (1 page, A4); uploaded privately as `enquiry-pdfs/<uuid>.pdf`; `enquiry_pdf` row + 4 linked `enquiry` rows; original filename not in the asset URL; asset id, filename and customer detail absent from 5 public routes |
| 14 | Rewrite `scripts/seed.ts`; retire `seed-office.ts` | ✅ | One demo seed writes the 17-car fleet (all five office states, km, 6 naira lines, TS-1013/TS-1018 genuinely incomplete, 49 photos from the manifest with origins, 2 enquiries + the imported PDF reproduced, sale); `seed-office.ts` retired (npm script removed, file kept with a RETIRED header — not deleted, not mine); the 8 earlier cars marked `is_demo` (a wrong-padding bug Checkpoint B caught, then fixed) |
| B | **Checkpoint B — rebuild + seed twice** | ✅ | Fresh database: `0001…0014`, seed twice — **second run moved nothing**; rebuilt fleet agrees with the live store on every fleet measure (17 cars, 99 lines, 49 asset-referenced photos, 2 incomplete-cost cars, 5 states, 6 enquiries, 1 sale, 1 PDF); gates after: test 50/50, typecheck clean, leak-check pass, build ✓; `reports/TASK-003-checkpoint-b.md` |
| 15 | Re-point `lib/office.ts` | ✅ | Reads `car` + `car_state` + `sale` + `cost_line`; `OfficeCarRow.cost_lines` holds the **stored** lines and `costLinesFor` (the TASK-002 adapter) is **deleted** — nothing expands a total any more; the inventory page takes `c.cost_lines`; **mileage labelled km on the office inventory and the car page** — but this row's original claim ("km on both surfaces") turned out to be **only half true**: Task 23's browser check found `mi` still rendered on the **home page** (`components/site/car-view.ts:22`) and the **public inventory** (`components/site/InventoryBrowser.tsx:628`), plus "miles for US imports" in the office form's hint (`car-client.tsx:398`). All three corrected at Task 23 (task.md:96 — mileage was "mi" on both surfaces originally, a copy artefact: the reference itself mixes `0 km` / `61,000 mi`) |
| 16 | Re-point `scripts/reconcile.ts` | ✅ | Two independent paths: the **rendered** office on :3210 vs the **store** read directly with the shared rules (deliberately not through `lib/office.ts`). All green: 10 dashboard figures, 25 cars' price/cost/profit (2 honestly "Costs incomplete"), 25 cost names (`costLabelFor`). The TASK-002 witness is kept and printed, never compared (different dataset). Exit 0 |
| 17 | Migration `0015` retire `office_car` | ✅ | Guard: refuses while a row's `ref` has no car. Proved: bad row → **REFUSED**, table still present; row removed → dropped. Live: ledger `0001…0015`, `office_car` absent, all **8** office screens 200 |
| C | **Checkpoint C — office agrees with showroom** | ✅ | Same car on both surfaces: doorstep price, mileage (km) and section agree for Available / On the way / At port / Cleared / Landed / sold; `At port`+`Cleared` read "On Order" publicly and no office state word appears on 8 public routes; sold car absent from `/inventory` (closed page, no price). Gates: test 50/50, typecheck clean, leak-check pass, build ✓; `reports/TASK-003-checkpoint-c.md` |
| 18 | Remove the URL branch from `lib/serialize.ts` | ✅ | **done (2026-10-13).** The `https?://` branch is gone; an address is now **refused by name** rather than passed through (`lib/photos.test.ts` pins it). `leak-check` extended: asset/file references, customer detail, office state labels — and its summary separates forbidden content from a server error. **Removing it exposed a worse defect:** the door cached database reads for a year, so `npm run build` rendered pages from rows the store no longer held. Fixed at the door + the store-reading routes declare `force-dynamic` + new `store-freshness` gate. `reports/TASK-003-task-18.md` |
| 19 | Cleanup readiness (report, never remove) | ✅ | `lib/cleanup.ts` (`listWaitingToBeCleared()`) + `scripts/cleanup-readiness.ts` witness. Lists: tombstones (none), the enquiry at its year (Chidi O., 425 days), the 50 referenced assets, any row pointing at a missing asset (none), the 24 address rows, the machine's own litter (none). Reads only — and "no code path removes a record" checked by grep: the only DELETEs are in the demo's own seed |
| 20 | Rebuild-from-nothing run | ✅ | Run on the **live store with the owner's ruling**, after a full JSON dump (`runs/task-20/`). Dropped schema → **15 migrations from nothing** → seed. 25 cars → **17** (the 8 leftover TASK-002 cars and their **24 address rows leave**: interim 1 + 2 cleared); the 17 fleet cars' figures **identical** (0 diffs, all five states intact); enquiries/sale/PDF/ledger unmoved; **reconcile green + Checkpoint C re-run PASS** after. First run's exit code said FAIL on **two faults in my own harness** (address refs read after the drop; sample drawn from the store) — both fixed, the substantive clauses all passed; written up in `reports/TASK-003-task-19-20.md` |
| 21 | Refusals proved | ✅ | `refusals.mjs` — its own scratch store (whole chain + seed, then dropped); **seven** attempts, every one refused: a second cost line of the same kind (`23505` · `cost_line_car_kind_unique`), a state with no section (`23502`), a section that is not one of the three (`23514` · `car_state_section_check`), a second car state carrying an existing name (`23505` · `car_state_label_unique`), a second enquiry state doing the same (`23505` · `enquiry_state_label_unique`), **the state a car sits in deleted** (`23001` · `car_state_id_fkey`, with 8 cars in it) and **an enquiry state with enquiries in it deleted** (`23001` · `enquiry_enquiry_state_id_fkey`). Each judged on four things, not one: refused · the right rule refused it (SQLSTATE + constraint named) · **nothing changed** · the parent survived. Evidence `runs/task-21/refusals.json`. First expectation of `23503` on the two deletes was mine, not the store's — `ON DELETE RESTRICT` raises `23001`; the harness was corrected |
| 22 | Store inspection | ✅ | `store-inspection.mjs`. **Part A, the live store read-only:** 90 columns / 15 tables — **no floating-point and no fractional column** (money is `bigint`/`integer` minor units; `0008` dropped `currency` + `rate_minor`, and the two rate CHECKs with them); **no column, table or constraint names a rate or currency** (104 constraints read); **no stored value does** (all 34 text columns scanned over every row, word-boundary match); every money column is written down and whole-numbered and none is a computed total — the only `/total/` name is `enquiry_pdf.rows_total`, a document's own row count; 3 setting keys, none a rate. **Part B:** a scratch store seeded twice — **nothing duplicates** (all 15 tables, same counts) and **no figure moves** (59 figure columns compared). **Finding beside it, measured not hidden:** the seed *rewrites* child rows — `car_photo`·`cost_line`·`enquiry`·`enquiry_pdf` get new ids and re-stamped times (`enquiry.created_at` does not move, so the retention clock is safe). Benchmark 7's words hold; the churn is the owner's call. Evidence `runs/task-22/store-inspection.json` |
| 23 | Agreement witness | ✅ | Browser check per `procedures/browser-check.md`, attach-only on CDP :9222, **40 cells** in two tabs both on the build (`:3210`): the office surface (8 cells/screen × 2 screens) and the showroom (6 cells/screen × 4 screens). No launch (chromium 6 → 6), no screenshots, detached on exit. Five verdicts, all PASS: every cell 200 · **mileage km everywhere, one unit** · **office ₦34,500,000 / 31,000 km = showroom ₦34,500,000 / 31,000 km at all 4 shared cells** (560/820 × dark/light) · no public surface renders an office state label, a cost figure, an asset reference or a customer's number (24 cells) · the sold car TS-1025 has left the showroom (no price, no chip). **It found a real defect**: `mi` on the home page and the public inventory + "miles for US imports" in the office hint, against the km the office and car page showed for the same number — fixed (3 sites). Also fixed 3 defects in my own harness. Evidence `runs/browser-check/`; `reports/TASK-003-task-23.md` |
| 24 | Demo wipe in one move | ✅ | Built `scripts/demo-wipe.ts` (`npm run demo:wipe`; `--yes`, `--no-assets`, `--json`; dry run by default) + `lib/sanity.ts` `deleteAsset` (the only delete, one caller). **Proved on a scratch store first** (`wipe-proof.mjs`, **7/7**): a dry run changes nothing · the demo gone · no id lost that wasn't the demo's · **the demo's PDF row spared when a non-demo enquiry still held it** · assets offered exactly the demo's 49 photos. **Then live, on the owner's go** (recipe + photo manifest archived into `openspec/tasks/TASK-003/` *before* the wipe): 17 cars (99 cost lines, 49 photos, 1 sale by cascade) · 6 enquiries · 1 PDF row; **50 assets deleted from Sanity (49 photos + the PDF), 0 failures**, 0 ids lost that weren't the demo's. **Independently verified 16/16** against Postgres and the Sanity query API — demo tables empty, 0 assets left in the dataset, reference data and the `0001…0015` ledger intact. **A correction worth keeping:** `client.getDocument()` returns a document for an id that never existed, and Sanity's `documents:[]`+"reason":"existence" is *absent*, not present — both are recorded; existence is now asked of the query API. The asset delete was proved with a control upload (count 0→1→0 through `deleteAsset`, `asset-delete-proof.ts`). Gates after: leak-check PASS · typecheck clean · test 50/50 · build ✓ · store-freshness PASS · dev restarted on :3210. Evidence `runs/task-24/`; `reports/TASK-003-task-24.md` |
| 25 | Closing: four gates + copy into `openspec/tasks/TASK-003/` | ✅ | The gates ran in the learned order after the wipe — **leak-check** (2 public routes, no leak) → **typecheck** clean → **test** 50/50 → **build** ✓ (public routes `ƒ Dynamic`, the Task 18 fix holding) → **store-freshness** PASS (9 store-reading routes, none prerendered) → **dev restarted on :3210** (`/` 200, the empty store renders). The fleet recipe + photo manifest + import were copied into `openspec/tasks/TASK-003/` **before** the wipe, not after |
| E | **Checkpoint E (final)** — benchmarks tagged by layer | ✅ | `reports/TASK-003-checkpoint-e.md` — all 11 benchmarks tagged with the layer that witnesses them: the store tools (reconcile, refusals, store-inspection, the rebuild, leak-check) and the browser check (Task 23) and the wipe (Task 24) carry the ✅s; the **write-dependent halves of 1, 8 and 9, and benchmark 5's "the office can say why", are named as TASK-004's — not claimed here**. Says plainly what was not run: the browser evidence is the run against the demo **before** the wipe (the store is empty now), no Sanity Studio was opened, and no commit was made. Findings handed over: the seed's child-row id churn, `CarCard.tsx:31` dead-code `mi`, the `mileageKm` alias, and the `getDocument` trap |

---

## Overview

Make storage true to what the screens and the rules already do. One car table, one ref; the money shape in
storage is the six naira lines the rule reads (no rate, no currency); the registries can hold a colour and
refuse a duplicate name; identity leaves the app's tables; the image store is real (Sanity wired here, no
Studio); the demo fleet is authored once, marked, and removable in one move; and nothing is ever deleted on
the owner's behalf — the store only makes the owner able to act.

## Shared understanding — what this layer is, and what it is not

**It is:** storage shape (forward-only corrective migrations `0008…0015`), the authored demo fleet and its
photo upload to Sanity, the office re-pointed onto the one car table, the retirement of `office_car`, and
the witnesses that prove the store is rebuildable, refuses what it must, and leaks nothing.

**It is not:** any runtime write flow (form Save, CRUD, live upload, import) — that is TASK-004. **These are
for this layer only — the forms and buttons that upload and import at runtime are TASK-004.** No rate returns
in any form. No deletion on the owner's behalf, ever (the job only reports; the two exceptions are its own
litter). `product-management/` is never edited. `lib/serialize.ts` stays the only public path and `leak-check`
stays green.

---

## Architecture decisions (already ruled — recorded, not re-decided)

1. **Forward-only corrective migrations, concern-sized, in order** (owner, Round 2 Q1 + condition b):
   `0008` money · `0009` registries · `0010` identity · `0011` taps · `0012` demo marker · `0013` photo origin ·
   `0014` enquiry_pdf · `0015` retire `office_car` (**lands last, with the re-point**). An applied file is never
   edited; the ledger never lies. *(Task line 113 names `0012` for the drop in the base list, but condition (b)
   says the drop lands last — so it is numbered `0015` here.)*
2. **One car, one identity** — the office reads `car` + `cost_line` + `car_state`; `office_car` and its seed retire.
3. **Money is the six naira lines.** `cost_line` loses `currency`, `rate_minor` and both rate checks; gains
   `UNIQUE (car_id, kind)`. No stored total, no stored profit, no float, no scale > 0.
4. **Registries carry a colour** (hex, validated) on **both** `car_state` and `enquiry_state`; **both labels
   become unique**; `car_state.section` stays `NOT NULL` + its check; `enquiry_state` gains no section and
   **no `closed` flag** (R1; D6's "closed flag" logged as stale shorthand).
5. **Identity belongs to the provider.** `office_user` keeps `id`, `email` (unique), timestamps; `password_hash`
   goes; **no provider-user column** is added. `session` keeps its three dates and gains one unique column
   naming the provider session.
6. **Sanity is wired here, with no Studio** (owner 2026-10-13): project `c2lc8g8n`, dataset `production`
   (**public-read**), a write-capable token in `.env.local` only. Reached **only through the API by the app's
   own server code** — never a second admin. `car_photo.sanity_asset_id` holds an asset reference and nothing
   else; `car_photo.origin` records where each image came from; the Unsplash-URL branch leaves `lib/serialize.ts`.
7. **The demo photos are the Unsplash set the seed already names** (owner, Round 3): downloaded, uploaded to
   Sanity, and the photo row points at the uploaded asset. A **dead link is replaced, never left blank**. These
   are photographs of cars that are **not the client's** — which is why the demo marker and `origin` exist:
   nothing from the demo may survive into the real fleet.
8. **`origin` records the photo's identity, not an address:** `unsplash:<id>` (e.g. `unsplash:1552519507-da3b142c6e3d`),
   one style throughout, never blank. Reason: the task's evidence list requires that **no third-party web
   address survives anywhere in the tree**, and the address is reconstructable from the id at any time. A photo
   the owner supplies later records `owner upload`. Never served in a public response.
   **Confirmed by the owner 2026-10-13 — the id form, not the bare address.**
9. **One demo enquiry PDF is authored** (owner, Round 3): a single **plainly fictional** document (invented
   company, invented customer, no real person's details), uploaded privately to Sanity like a real one, with its
   `enquiry_pdf` row and the renamed column pointing at it — so the rename and the private-storage rule have
   something real to prove. Only the **stored result** is authored here; the upload flow stays TASK-004.
10. **The demo is marked and removable in one move** — `is_demo` on `car` and `enquiry`; the wipe covers every
    demo car (children cascade), every demo enquiry with its PDF row and file, the taps and activity naming a
    demo ref, and the demo assets. Nothing else is touched.
11. **The system reports; the owner deletes.** The store can always list what is waiting to be cleared. The
    only removals a job may make are its own litter (an asset no record ever referenced; `auth_attempt` > 90 days).

---

## Task list

### Phase 0 — Groundwork and baseline

- [ ] **Task 1 — Workspace artefacts and a green baseline.**
  Write `briefs/TASK-003-brief.md`, `notes/TASK-003-current-state.md` (the schema + read/write surface from the
  two fact-finds), and this plan. Run the four gates to confirm the starting point is green.
  *Acceptance:* brief, notes and plan exist; all four gates pass on the untouched tree.
  *Verification:* `npm test` (expect 47/47) · `npm run typecheck` · `npm run leak-check` · `npm run build`.
  **Gate order: `leak-check` before `build`; restart `next dev -p 3210` after any `build`.**
  *Depends:* None. *Files:* `developer-workspace/{briefs,notes,plans}/`. *Scope:* S.

### Phase 1 — The migration chain (each its own file, in order)

- [ ] **Task 2 — `0008` money.** Drop `cost_line.currency`, `rate_minor`, `cost_line_usd_needs_rate`,
  `cost_line_ngn_no_rate`; add `UNIQUE (car_id, kind)`. *Verify:* applied; two same-kind lines refused; leak-check green.
- [ ] **Task 3 — `0009` registries.** Add `colour text NOT NULL` to `car_state` and `enquiry_state` with a hex
  `CHECK`; backfill five car states and five enquiry states with sensible colours; make both `label`s unique.
  *Verify:* duplicate label refused; non-hex colour refused; both registries populated.
- [ ] **Task 4 — `0010` identity.** Drop `office_user.password_hash`; add `session.clerk_session_id text UNIQUE`.
  *Verify:* `password_hash` absent; `session` carries the unique column.
- [ ] **Task 5 — `0011` taps.** `ALTER TABLE tap DROP COLUMN ip`. *Verify:* `ip` absent; a tap holds page, ref, time only.
- [ ] **Task 6 — `0012` demo marker.** `is_demo boolean NOT NULL DEFAULT false` on `car` and `enquiry` (+ index on `car(is_demo)`).
- [ ] **Task 7 — `0013` photo origin.** `car_photo.origin text NOT NULL` (backfill existing rows with a token, then drop the temp default).
- [ ] **Task 8 — `0014` enquiry_pdf.** Rename `path` → `sanity_asset_id`; drop `deleted_at`.

  **Checkpoint A (after Tasks 2–8).** `scripts/migrate.ts` applies `0008…0014` cleanly; `schema_migrations`
  names exactly those; `leak-check` green; a scratch drop→migrate→seed of `0001…0014` still builds.
  *Review with the owner before Phase 2.*

### Phase 2 — The demo fleet, the image store, and the demo PDF

- [ ] **Task 9 — Author the demo fleet list (owner gate).** 15–18 cars picked from both existing lists and
  completed, shaped so every showroom section looks full, every office state has something, and there is at
  least one sold car, one new arrival, and one car with genuinely incomplete costs. Each row: code, model,
  state, price, and its job in the demonstration. Written to `plans/TASK-003-demo-fleet.md` and shown **in
  full** in chat; the owner may strike any car.
  *Acceptance:* list written and shown; **owner has approved it** before anything is seeded. *Depends:* Task 3. *Scope:* M.
- [ ] **Task 10 — Demo photo sources and the intended manifest.** Take the Unsplash images the seed already
  names as the source set; **replace any dead link** with a working substitute (never leave one blank); write
  the intended manifest (per car: ordered images, the `unsplash:<id>`, target web size).
  *Verification:* every image in the manifest resolves; manifest lists id + size per image. *Depends:* Task 9. *Scope:* S.
- [ ] **Task 11 — Wire the Sanity client.** **First** load the current Sanity material (official docs; and
  check whether a Sanity skill exists — tell the owner and ask before installing anything). Add the client
  dependency, add a server-only `lib/sanity.ts`, confirm `lib/config.ts` fail-loud keys read from `.env.local`
  (owner copies `.env.local` into the workspace — it is gitignored and does not travel).
  *Verification:* a read-only call to project `c2lc8g8n`/`production` succeeds. *Depends:* Task 10. *Scope:* S/M.
- [ ] **Task 12 — Upload the demo photos and prove the store.** Upload each image at a sane web size (EXIF
  stripped at the write boundary, no derivatives — the asset served as uploaded); write the returned asset ids
  into `scripts/demo-photo-manifest.json` (asset ids and `unsplash:` tokens are not secrets); prove a stored
  reference resolves to a real asset in `production`, and that **no third-party web address survives in
  `car_photo`** (the origin token is not an address).
  *Verification:* manifest holds real ids; a stored reference resolves; `car_photo` holds no URL.
  *Depends:* Tasks 9, 11. *Scope:* M.
- [ ] **Task 13 — Author and upload the one demo enquiry PDF.** Write a plainly fictional document (invented
  company and customer, no real person's details); upload it privately to Sanity; insert its `enquiry_pdf` row
  (`sanity_asset_id`, original `filename`, `rows_total`) and the `enquiry` row that links to it, marked `is_demo`.
  *Verification:* the reference resolves inside the office path only; **no public response ever emits it** (leak-check).
  *Depends:* Tasks 8, 11. *Scope:* S.
- [ ] **Task 14 — Rewrite `scripts/seed.ts` as the one demo-fleet seed; retire `scripts/seed-office.ts`.**
  Write the fleet (mileage in **kilometres**), its six naira `cost_line`s (at least one car genuinely
  incomplete), `sale` rows for the sold ones, `car_photo` rows from the manifest with `origin`, enquiries dated
  across a range **including one older than 12 months** (plus the Task-13 PDF import), taps/activity for demo
  cars, `is_demo = true`, and `setval` to keep the sequence ahead of the data. No rate, no currency anywhere.
  Running it twice changes nothing and duplicates nothing.
  *Verification:* seed twice → identical row counts and figures; no rate/currency in the seed. *Depends:* Tasks 2,3,6,7,12,13. *Scope:* M.

  **Checkpoint B (after Tasks 9–14).** Rebuild-from-nothing (drop → migrate → seed) reproduces the figures;
  seed twice changes nothing; fleet list, photo manifest and the demo PDF are on disk / owner-approved.
  *Review with the owner before Phase 3.*

### Phase 3 — The office moves onto the one car table

- [ ] **Task 15 — Re-point `lib/office.ts`** to read `car` + `cost_line` + `car_state`, dropping the lump-cost
  adapter (the office reads the six real lines through `lib/money.ts`).
  *Verification:* every office figure is rule-derived; the adapter holds no arithmetic. *Depends:* Task 14. *Scope:* M.
- [ ] **Task 16 — Re-point `scripts/reconcile.ts`** at the shared tables; keep `scripts/office-data/ref-*.txt`
  as the historical witness. *Verification:* runs green, prints the office figures beside the witness. *Depends:* Task 15. *Scope:* S.
- [ ] **Task 17 — `0015` retire `office_car`** — drop the table (travels with the re-point; lands last).
  *Verification:* table absent; the office still serves every screen. *Depends:* Tasks 15,16. *Scope:* XS.

  **Checkpoint C (after Tasks 15–17).** The office and the showroom are opened on the same car and agree on
  every figure the one rule produces; the move of the office's naira figures is written down with its reason.
  *Review with the owner before Phase 4.*

### Phase 4 — Public path and cleanup readiness

- [ ] **Task 18 — Remove the third-party-URL branch from `lib/serialize.ts.`** The photo resolver builds only
  Sanity CDN URLs from an asset reference; `lib/serialize.ts` stays the only public path.
  *Verification:* `leak-check` green on every public route; no `https?://` branch remains. *Depends:* Task 14. *Scope:* XS/S.
- [ ] **Task 19 — Cleanup readiness (report, never remove).** Verify the store answers tombstone age, enquiry
  age, sale date, attempt age and asset ownership as it stands; add one read helper that lists what is waiting
  to be cleared (deleted car, enquiry at its year, a record's remaining files, a row pointing at a missing
  asset). No deletion anywhere.
  *Verification:* the helper lists the demo cases; no code path removes a record. *Depends:* Tasks 2–17. *Scope:* S.

### Phase 5 — Witnesses, gates and the report

- [ ] **Task 20 — Rebuild-from-nothing run.** Drop → migrate → seed; capture output (benchmark 6).
- [ ] **Task 21 — Refusals proved** (benchmarks 4, 5): same kind twice for one car; a state with no section; two
  states sharing a name; deleting a state while a car (and an enquiry) sits in it — each refused **by the store**, captured.
- [ ] **Task 22 — Store inspection** (benchmarks 3, 7): no float or scale > 0 money column; no rate or currency
  anywhere (column, setting key, seed value, constraint); no stored totals or profit; **seed run twice, figures unmoved**.
- [ ] **Task 23 — Agreement witness** (benchmarks 2, 10, 11): office and showroom opened on the same car,
  agreeing on every rule figure, with a note of how the office's figures moved when the fleet was written;
  public responses inspected — no cost, no asset reference, no customer detail, no office state label
  (`leak-check` green). **Browser check — follow `developer-workspace/procedures/browser-check.md`** (see the
  section above): attach-only on CDP `:9222`, the full cell matrix, surfaces only, no screenshots, detach on
  exit. This layer's witness is **build-office vs build-showroom agreement on the same car** (the demo fleet
  legitimately differs from the reference; a ref comparison is kept only where a surface should still match).
- [ ] **Task 24 — Demo wipe in one move** (benchmark 8): run the wipe; nothing of the demo is left, no other
  record is touched — and no job removed anything for the owner at any point.
- [ ] **Task 25 — The four gates, the report, and the copy into `openspec/tasks/TASK-003/`.**
  `npm test` · `npm run typecheck` · `npm run leak-check` · `npm run build` (leak-check before build; restart
  `next dev` after build). Write `reports/TASK-003-report.md` (built / verified / not verified) and copy the
  report, the fleet list and the photo manifest into `openspec/tasks/TASK-003/`.

  **Checkpoint E — final.** Every benchmark tagged with the layer that witnesses it — where a witness needs the
  write paths, it is named as TASK-004's, not claimed here (as TASK-002's gate did). The report is honest about
  what was and was not run.

---

## Verification method — browser (standing procedure: `developer-workspace/procedures/browser-check.md`)

The method is **written down once** in `developer-workspace/procedures/browser-check.md` and is followed from
there — never re-derived from an old task. Summary as it applies to this layer:

- **Attach, never launch** — attach to the one visible Chrome on CDP `:9222` (profile
  `~/.config/google-chrome-automation`); never headless; UA has no `Headless`; ≤10-chromium guard; **detach** on
  exit; **no screenshots** (the owner checks the look by hand).
- **Servers:** build on `:3210`, reference on `:3211`; **port `3000` never used**.
- **Harness:** `_lib.mjs` under `developer-workspace/scripts/task-003/` (reusing the TASK-002 harness primitives
  from `~/.agents/skills/runtime-divergence/scripts/browser.mjs`); two tabs — A = reference, B = build.
- **Cell matrix:** public `560/820/1100` × dark/light; office `1440/820/560/390` × dark/light. Every cell is
  ref-that-state vs build-that-state; role-first locators; no `waitForTimeout`.
- **This layer's witness:** office and showroom **agree on the same car** (the demo fleet differs from the
  reference by design), so the primary comparison is **build-vs-build**; a ref comparison is kept only where a
  surface should still match. Intended divergences are tied to their requirement; the rest are defects or named
  for their owning task.
- **Authority for rules is the model/spec, never the browser.**

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `build` clobbers `next dev`'s `.next` (500s on dynamic routes) | Med | `leak-check` **before** `build`; restart `next dev -p 3210` after any build. |
| Migrations applied against the live DB are not reversible | High | Forward-only corrective files only; scratch drop→migrate→seed proves `0001…0015` reproduce the schema. |
| `.env.local` is gitignored, so it does not travel into the workspace | Med | The owner copies it into the workspace (or supplies the key at the pause); a failure there is a missing file, not a broken build. |
| A named Unsplash link is dead by now | Low | Replace the dead link rather than leave it blank (Task 10). |
| A demo photo could be mistaken for the client's | Low | `is_demo` + `origin`; the wipe removes the demo assets; nothing from the demo survives into the real fleet. |
| Sanity free tier consumed by oversized uploads | Low | Upload at a sane web size; no derivatives; manifest records size and origin. |
| The office figures move when the fleet is written | Low | Expected and named; the witness is that office and showroom **agree**, produced by the one rule. |
| Building from memory about Sanity's API | High | Load the current Sanity docs before `lib/sanity.ts`; check for a Sanity skill and ask before installing. |

## Open questions

**None.** Round 1, Round 2 and Round 3 are all answered in `task.md`. The two items raised at the end of
planning are settled: the demo photos are the existing Unsplash set (Task 10), and one fictional demo enquiry
PDF is authored (Task 13). The owner confirmed the `origin` form as `unsplash:<id>` (2026-10-13). The tracker
sits at the top of this file, as asked.

## Standing rules (from TASK-002, unchanged)

- Build `:3210`, reference `:3211`; port `3000` is never used.
- Gate order: `leak-check` **before** `build`; restart `next dev` after a build.
- Chrome automation is attach-only, on CDP `:9222`; the owner's own browser is never touched.
  **The browser check is the standing procedure in `developer-workspace/procedures/browser-check.md` — refer to that file.**
- Work lands in `developer-workspace/`; the only thing this layer writes under `openspec/` is the TASK-003 copy.
