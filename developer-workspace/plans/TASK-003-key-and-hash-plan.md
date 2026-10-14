# Implementation Plan — TASK-003 follow-up v1: cars and enquiries kept apart, and a change-check that spares the filler

**Authority:** `openspec/tasks/TASK-003/key-and-hash-v1.md` (v1, 2026-10-13) — its Round 1 (decisions 1–14)
is settled and this plan mirrors it. Where they disagree, the file wins and the disagreement is reported.
**Home:** `developer-workspace/` (plans · reports · scripts/task-003). **Task list target:** the Progress
checklist at the foot of this file (this agent's plan convention).
**Registers nothing new:** no runtime write flow (TASK-004), no VIN, no office-screen state names.

---

## Overview

Three things in the store are wrong: an enquiry is joined to a car (`enquiry.car_ref`), the car's key and
spoken code are protected only by habit, and the filler deletes. This plan removes the join, adds the
car's and the enquiry's own identity-lock and change-check, rewrites the filler so it removes nothing, and
rebuilds the demo fleet (the only fleet there is) from the recipes archived in `openspec/tasks/TASK-003/`.

Order follows the dependency graph: store migrations first (high-risk), then the shared change-check code,
then the filler that uses both, then the demo's words and PDF, then the rebuild, then the proof.

## Architecture decisions (carried from the file; not re-decided here)

- **A1** — `enquiry.car_ref` is dropped; `asked_for text NOT NULL` replaces it (decision 2).
- **B1** — the change-check is **server-computed, stored, never sent from the browser**; `content_hash text
  NOT NULL` + `hash_version smallint NOT NULL DEFAULT 1` on `car` and `enquiry` (decision 3). One module:
  `lib/change-check.ts`.
- **B2** — car recipe, canonical order, 14 editable fields only: brand, model, trim, year, exterior_colour,
  interior_colour, mileage, features, note, private_note, was_price_kobo, arrival_note,
  doorstep_price_kobo, state_id. Never id, ref, is_demo, dates, `version`, the hash (decision 4).
- **B3** — enquiry recipe, 5 fields: name, number, asked_for, note, enquiry_state_id (decisions 3–4).
- **B4** — normalisation: trim; collapse runs of whitespace; empty ≡ missing; case folded only where case
  cannot matter (**the customer's `number`**); field name + value length between values so two rows cannot
  collide; SHA-256; version 1. *(The one point this plan decides that the file leaves generic — recorded
  here; correct it if wrong.)*
- **C1** — one trigger function refuses any UPDATE changing `car.id`, `car.ref` or `enquiry.id`, raising a
  named exception; two triggers (decision 5). Setting a value to itself is allowed (the seed upserts on
  `ref`). DELETE is not touched — the wipe stays.
- **D1** — the filler finds its rows by: car → `ref`; cost_line → `(car_id, kind)`; sale → `car_id`; photo →
  `(car_id, position)`; enquiry_pdf → `filename`; enquiry → a **new nullable, UNIQUE `handle`** (the
  recipe's own name, e.g. `demo-enquiry-01`). No other new key (decision 6).
- **E1** — the **seed is the store's single writer** for the demo's rows and **never deletes**; the upload
  scripts are developer tools — they upload files, write the manifests, and at most *update* rows
  (decision 14). The seed reads the manifest the uploads write.
- **F1** — build order for the rebuild: **uploads before the seed** (decision 9), so no row ever points at
  a file that is not up.
- **G1** — one concern per migration file, forward-only (decision 10): `0016` enquiry · `0017` change-check
  columns · `0018` identity lock · `0019` the enquiry handle.

## Dependency graph

```
migration 0016 + its readers/writers  ──┐
lib/change-check.ts (+ unit tests) ─────┤
migrations 0017 / 0018 / 0019  ─────────┼──► seed rewrite (removes nothing) ──┐
enquiry handle (0019) ──────────────────┘                                      │
                                                                               ▼
                                    recipes in the customer's words ──▶ rebuild demo → witnesses + gates → report
```

---

## Task list

### Phase 1 — Foundation: the enquiry leaves the car

## Task 1: An enquiry carries no car reference

**Description:** Apply migration `0016` — drop `enquiry.car_ref`, add `asked_for text NOT NULL` — and move
every read and write of it in the same slice: the retention report (`lib/cleanup.ts`,
`scripts/cleanup-readiness.ts`) reads `asked_for`; `scripts/seed.ts`'s two handwritten demo enquiries and
`developer-workspace/scripts/task-003/upload-enquiry-pdf.mts` write the customer's own words instead of a
code. A sweep then proves no `car_ref` remains anywhere that runs.

**Acceptance criteria:**
- [ ] `enquiry` has `asked_for text NOT NULL` and no `car_ref`; the live store shows the same.
- [ ] The retention list renders the customer's words, not a car code.
- **`grep -r car_ref` over `lib/ app/ components/ scripts/ developer-workspace/scripts/` = 0 hits.
- [ ] `db:seed` still completes (its two demo enquiries carry real customer words).

**Verification:**
- migration applies on a scratch database and on the live store; ledger lists `0016`
- `npm run typecheck` clean · `npm run leak-check` PASS · `npm run test` green · `npm run build` ✓ ·
  `npm run store-freshness` PASS
- grep sweep returns nothing

**Dependencies:** none. **Files:** `migrations/0016_enquiry_asked_for.sql`, `lib/cleanup.ts`,
`scripts/cleanup-readiness.ts`, `scripts/seed.ts`, `scripts/demo-enquiry-import.json` (+ its archive copy),
`developer-workspace/scripts/task-003/wipe-proof.mjs` (one-line sweep). The **developer upload scripts** are
Task 5's, not here — they are only run at rebuild time, and they move with the PDF's own column. **Scope:** M.

---

## Task 2 — The change-check module

**Description:** `lib/change-check.ts` — `carChangeCheck(car)`, `enquiryChangeCheck(enquiry)`,
`CHANGE_CHECK_VERSION = 1` — implementing B1–B4 above; the canonical field order and the normalisation
written down in one place. Unit tests pin the rules.

**Acceptance criteria:**
- [ ] A changed editable field changes the hash; a reordered or untrimmed equivalent does not.
- [ ] `null` and `""` hash the same; the customer's number is case-insensitive; names/notes are not.
- [ ] Two rows whose values could concatenate to the same text hash differently.
- [ ] The hash is 64 lowercase hex characters; SHA-256, not MD5.

**Verification:** `npm test` (new `lib/change-check.test.ts`); `npm run typecheck`.

**Dependencies:** none. **Files:** `lib/change-check.ts`, `lib/change-check.test.ts`. **Scope:** S.

### Checkpoint A — after Tasks 1–2

- [ ] Migrations apply on a scratch DB and the live store; ledger exact
- [ ] `typecheck` clean · `leak-check` PASS · `test` green · `build` ✓ · `store-freshness` PASS
- [ ] `grep car_ref` = 0 across app and scripts

---

## Task 3 — The store keeps identity and a change-check

**Description:** three migrations, high-risk, each its own concern: **0017** adds `content_hash text NOT
NULL` + `hash_version smallint NOT NULL DEFAULT 1` to `car` and `enquiry`; **0018** adds
`refuse_identity_change()` and its two triggers; **0019** adds `enquiry.handle text` with a UNIQUE index.
The refusal witness proves the lock.

**Acceptance criteria:**
- [ ] `UPDATE car SET ref = …` is refused by the trigger, named in the error; nothing changed.
- [ ] `UPDATE car SET id = …` and `UPDATE enquiry SET id = …` are refused likewise.
- [ ] An ordinary update (e.g. `note`) still succeeds; a seed-style upsert that sets `ref` to its own
      value still succeeds.
- [ ] `enquiry.handle` is unique when present and may be NULL many times.
- [ ] The store is empty, so `content_hash NOT NULL` needs no backfill.

**Verification:** scratch apply of 0017–0019; `developer-workspace/scripts/task-003/refusals-0016-0019.mjs`
(all cases pass, each judged by SQLSTATE/constraint name **and** by "nothing changed"); ledger lists 19;
the four gates.

**Dependencies:** Task 1 (migrations run in order). **Files:** `migrations/0017_change_check.sql`,
`migrations/0018_identity_lock.sql`, `migrations/0019_enquiry_handle.sql`,
`developer-workspace/scripts/task-003/refusals-0016-0019.mjs`. **Scope:** M. **Risk:** high.

---

## Task 4 — The filler removes nothing

**Description:** rewrite `scripts/seed.ts`: all six `DELETE` statements go; every child is found by its
handle and upserted (cost_line `(car_id, kind)`, photo `(car_id, position)`, sale `car_id`, enquiry
`handle`, enquiry_pdf `filename`); the car's and the enquiry's `content_hash`/`hash_version` are computed
by `lib/change-check.ts` and written; the demo enquiries get their handles.

**Acceptance criteria:**
- [ ] The filler's path contains no delete of any kind.
- [ ] Run twice: the same content **and the same row ids** — nothing deleted, nothing rewritten.
- [ ] Every car and enquiry carries a `content_hash` matching its editable fields.
- [ ] Nothing the filler touches is outside the demo's own rows (`is_demo` + handle scoping).

**Verification:** run `db:seed` twice against the live store; diff ids and content (witness b);
`grep -n "DELETE" scripts/seed.ts` → none; the four gates.

**Dependencies:** Tasks 1–3. **Files:** `scripts/seed.ts`. **Scope:** M (one file, wide edit).

---

## Task 5 — The demo's words, and its PDF

**Description:** the demo PDF's own "Car" column stops holding our codes: `author-enquiry-pdf.mts` authors
the customer's words (and its heading says so); `upload-enquiry-pdf.mts` writes the manifest's rows as
`askedFor` (no `car_ref`) and stops inserting its own enquiry rows — the seed owns those, from the
manifest. The archived recipe copies under `openspec/tasks/TASK-003/` are regenerated with it.

**Acceptance criteria:**
- [ ] No script or JSON in the tree names a car in an enquiry (`grep car_ref`/`carRef` = 0).
- [ ] The authored PDF shows what each customer asked for, in words.
- [ ] `scripts/demo-enquiry-import.json` (and its archive copy) carry `askedFor`, not `carRef`.

**Verification:** re-run the author script; open the PDF and read the column; `grep` sweep; the four gates.

**Dependencies:** Tasks 1, 4. **Files:** `developer-workspace/scripts/task-003/author-enquiry-pdf.mts`,
`developer-workspace/scripts/task-003/upload-enquiry-pdf.mts`, `scripts/demo-enquiry-import.json`,
`openspec/tasks/TASK-003/demo-enquiry-import.json`. **Scope:** S.

### Checkpoint B — after Tasks 3–5

- [ ] The store's shape is final (ledger 19); refusals pass
- [ ] The filler removes nothing (ids identical across two runs)
- [ ] The demo's recipes carry the customer's words
- [ ] The four gates green

---

## Task 6 — Rebuild the demo fleet

**Description:** in the file's order — author the PDF → upload the 49 photos and the PDF to Sanity (new
asset ids; the manifests are rewritten) → run the seed (the cars, their photo rows pointing at live ids,
the six enquiries, the PDF row) → inspect the store.

**Acceptance criteria:**
- [ ] 17 cars, 49 photos, 6 enquiries, 1 enquiry_pdf, the cost lines and the sale; every car `is_demo`.
- [ ] Every photo row points at a live Sanity asset; no row points at a dead id.
- [ ] Every car and enquiry carries a valid `content_hash`.

**Verification:** `check-photo-sources.mjs` / `sanity-probe.mts` (assets resolve);
`developer-workspace/scripts/task-003/store-inspection.mjs`; the four gates.

**Dependencies:** Tasks 4–5. **Files:** none authored — runs the upload scripts + the seed. **Scope:** M.

---

## Task 7 — The proof

**Description:** run the witnesses on the rebuilt store and the standing gates, then the browser check.

**Acceptance criteria:**
- [ ] Witness b re-run on the live store: seed twice → identical content and ids.
- [ ] The browser check passes on the rebuilt demo (showroom and office agree on every figure the rule
      produces — km, the office's ₦34,500,000 / 31,000 km).
- [ ] The four gates green in the learned order (`leak-check` before `build`).

**Verification:** `developer-workspace/scripts/task-003/browser-check.mjs` (attach-only CDP :9222);
`runs/` evidence written.

**Dependencies:** Task 6. **Files:** the witness scripts only. **Scope:** S.

### Checkpoint C — after Tasks 6–7

- [ ] Store inspection green; the demo present
- [ ] Browser check passes; no leak
- [ ] The store's own screens agree with the rule

---

## Task 8 — The report

**Description:** `developer-workspace/reports/TASK-003-key-and-hash.md` — built, verified, not verified, the
one decision this plan made (B4's case-folding), and any finding for TASK-004/the owner. Update the tracker
row in `developer-workspace/plans/TASK-003-plan.md`.

**Acceptance criteria:** the report names what was proven, how, and what was not; nothing claimed without a
witness.

**Dependencies:** Tasks 1–7. **Files:** `developer-workspace/reports/TASK-003-key-and-hash.md`,
`developer-workspace/plans/TASK-003-plan.md`. **Scope:** XS.

### Checkpoint D — close

- [ ] Every requirement in `key-and-hash-v1.md` ("What must be true after this", 1–6) has a witness
- [ ] Nothing was committed or pushed

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| The identity trigger refuses a legitimate upsert (seed sets `ref` to itself) | High | Trigger compares values, not presence; a self-update passes; proved in Task 3's witness |
| `content_hash NOT NULL` blocks an insert path not yet rewritten | High | Store is empty; only the seed and the upload script insert; both are rewritten before any run (Tasks 1, 4, 5). Nothing runs the seed between Task 3 and Task 4 |
| Dropping `car_ref` breaks a hidden reader | Med | Task 1 greps the whole tree, not just the known readers |
| Re-uploading 49 photos from Unsplash is slow or a source 404s | Med | The archived manifest carries origin + url; `check-photo-sources.mjs` proves each resolves |
| The dev server holds a stale build or the CDP attach fails | Med | Learned gate order (`leak-check` before `build`) and the standing browser-check procedure |

## Open questions

- **None on shape** (the file's Round 1 settled 1–14). **One recorded decision this plan makes:** B4's
  per-field case-folding — only the customer's `number` is case-folded, because case cannot matter there and
  does matter for names, notes and features. If that is wrong, it costs one hash-version bump.

---

## Progress — the tracker (this is the task-list target; update it as work lands)

**Phase 1 — the foundation**
- [x] **T1 the enquiry leaves the car** — 0016 · `lib/cleanup.ts` · `cleanup-readiness.ts` · the seed's
  writes · the recipe JSONs · `car_ref` sweep = 0
- [x] **T2 the change-check module** — `lib/change-check.ts` + `lib/change-check.test.ts` (14 tests, 64/64)
- [x] **A — checkpoint** — 0016 on scratch (4/4) + live (ledger 16) · typecheck · leak-check · build ·
  store-freshness all green

**Phase 2 — the store's shape**
- [x] **T3 the store keeps identity and a change-check**
  - [x] 0017 `content_hash text NOT NULL` + `hash_version smallint NOT NULL DEFAULT 1`, both tables
  - [x] 0018 `refuse_identity_change()` + two triggers (refuses a *changed* id/ref only)
  - [x] 0019 `enquiry.handle text` + partial UNIQUE index
  - [x] the store-shape witness: **21/21** on a fresh 0001…0019 chain — the columns and their
        nullability, a record with no change-check refused, a changed name refused *and nothing
        changed*, an ordinary update / a same-value write / the `ON CONFLICT (ref)` pattern all
        allowed, a handle naming one row, many NULL handles
        (`runs/key-hash/03-store-shape.json`)
  - [x] scratch apply + live apply · ledger **19** · typecheck · test 64/64 · leak-check PASS · build ✓ ·
        store-freshness PASS · dev on `:3210`

**Phase 3 — the filler**
- [x] **T4 the filler removes nothing**
  - [x] the six `DELETE`s gone; cost_line `(car_id, kind)`, photo `(car_id, position)`, sale `car_id`,
        enquiry `handle`, enquiry_pdf `filename` — each found and written only where it differs
  - [x] `content_hash`/`hash_version` computed by `lib/change-check.ts` and written; the six demo
        enquiries carry `demo-enquiry-01/02` and `demo-enquiry-pdf-01…04`
  - [x] witness b: seed twice on a fresh chain → **13/13**, every table byte-identical including ids,
        every car and enquiry's hash agrees with the recipe, `hash_version` = 1
        (`runs/key-hash/04-seed-idempotent.json`)
- [x] **T5 the demo's words, and its PDF**
  - [x] `author-enquiry-pdf.mts`: the car-code column is gone; the sheet carries `askedFor` — the
        customer's own words — under an "Asked for:" label, and the heading says so. The panel fonts
        now declare `/Encoding /WinAnsiEncoding` and the stream is mapped through cp1252, so an em
        dash in a customer's words is one correct byte (0x97), not garbage; anything Helvetica cannot
        carry fails loudly (`runs/task-13/enquiries-2026-09-30.pdf`, 2149 bytes, 4 rows)
  - [x] `upload-enquiry-pdf.mts`: writes `askedFor` (no `carRef`), **writes no enquiry rows at all** —
        it points its own `enquiry_pdf` row at the new asset and writes the manifest; the filler owns
        the enquiries (decision 14)
  - [x] the archived JSONs regenerated: `openspec/tasks/TASK-003/{demo-photo-manifest,demo-enquiry-import}.json`,
        byte-for-byte the recipe the store was built from
  - [x] sweep: no `car_ref`/`carRef` in any enquiry path — the only survivors are `tap.car_ref`
        (a tap *is* about a car we hold), the applied migrations, and older evidence files
- [x] **B — checkpoint** — ledger 19 · refusals 21/21 · the filler removes nothing · recipes in words ·
      typecheck · test 64/64 · leak-check PASS · build ✓ · store-freshness PASS · dev on `:3210` (200)

**Phase 4 — the rebuild and the proof**
- [x] **T6 rebuild the demo fleet** — author the PDF → upload the 49 photos + the PDF → seed, twice
  - [x] the 49 photographs re-uploaded (their Sanity assets had gone); `scripts/demo-photo-manifest.json`
        rewritten with 49 live asset ids, 3/3 references proved to resolve untransformed
  - [x] the PDF re-uploaded; `enquiry_pdf` row written from the manifest (`enquiries-2026-09-30.pdf`)
  - [x] the seed run on the live store: **17 cars · 49 photos · 99 cost lines · 1 sale · 6 enquiries ·
        1 PDF**, every row `is_demo`, every car and enquiry agreeing with the recipe at
        `hash_version` 1 (`runs/key-hash/05-live-rebuild.json`, 15/15)
- [x] **T7 the proof** — witness b on the live store · the four gates in the learned order · the browser
      check on the rebuilt demo
  - [x] browser check on the rebuilt demo: **5/5 verdicts PASS** — 40 cells 200 (8 office × 2 · 6 public ×
        4); km everywhere (26/40 cells show a mileage); office = showroom on TS-1001 (**₦34,500,000 /
        31,000 km**) at all four shared cells; no leak on 24 public cells; sold car TS-1025 gone
        (`runs/browser-check/`). The Task 23 evidence was preserved first as `runs/browser-check-task23/`.
        **First run FAILED** — office-inventory 500 on 5/8 cells, a Neon cold-concurrency drop (env, not
        code); fixed by warming the pool and re-running (`notes/T7-browser-check-and-db-flakiness.md`)
  - [x] witness b on the live store: **16/16** — the filler's re-run left every table byte-identical (same
        rows, same ids); 17 cars · 49 photos · 99 cost lines · 1 sale · 6 enquiries · 1 PDF
        (`runs/key-hash/05-live-rebuild.json`)
  - [x] the four gates, in the learned order — leak-check **PASS** (18 public routes) → typecheck clean →
        test **64/64** → build ✓ (store routes ƒ Dynamic) → store-freshness **PASS** (9 routes, none
        prerendered, no DB response cached) → dev restarted on :3210 (`/`, `/office/inventory`,
        `/car/TS-1001` all 200)
- [x] **C — checkpoint** — the demo present · no leak · showroom and office agree
- [x] **T8 the report** — `developer-workspace/reports/TASK-003-key-and-hash.md` + the older tracker row
  - [x] report written; copy placed at `openspec/tasks/TASK-003/TASK-003-key-and-hash.md` (byte-identical);
        the older plan (`plans/TASK-003-plan.md`) gained the follow-up row **F**
- [x] **D — close** — every requirement in `key-and-hash-v1.md` has a witness (§3 of the report maps all
      six "what must be true" and all seven "how we'll know"); nothing committed

