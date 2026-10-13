# TASK-003 — Checkpoint A (after Tasks 2–8: the migration chain)

**Date:** 2026-10-13 · **Status:** ⬜ awaiting the owner's review before Phase 2
**What it proves:** the corrective chain `0008…0014` applies cleanly to the live database, the ledger names
exactly those, and the **from-nothing path and the corrective path end in the same schema**.

## 1. The seven files

| File | What it does | Verified how |
|------|--------------|--------------|
| `0008_money.sql` | drop `cost_line.currency`, `rate_minor`, both rate CHECKs; add `UNIQUE (car_id, kind)` | columns listed; both probes **refused** (same kind twice; a `currency` column) |
| `0009_registries.sql` | `colour` NOT NULL + hex CHECK on both registries, five car + five enquiry states back-filled; both `label`s UNIQUE | non-hex refused ×2; duplicate label refused ×2; `enquiry_state` gains neither a section nor a closed flag (0 such columns) |
| `0010_identity.sql` | drop `office_user.password_hash`; add `session.clerk_session_id text NOT NULL UNIQUE` | password material and any provider-user column absent; unique constraint present |
| `0011_taps.sql` | drop `tap.ip` | `ip` absent from `tap`, **still present on `auth_attempt`** (the one address with a job) |
| `0012_demo_marker.sql` | `is_demo` NOT NULL DEFAULT false on `car` + `enquiry`; partial indexes on both | present; every existing row false (0 true rows) |
| `0013_photo_origin.sql` | `car_photo.origin` NOT NULL + not-blank CHECK; back-filled from each row's seeded address | **73/73** derived as `unsplash:<id>`, none blank; blank and NULL both refused |
| `0014_enquiry_pdf.sql` | rename `path` → `sanity_asset_id`; drop `deleted_at` | columns listed; `enquiry.pdf_import_id` still `ON DELETE SET NULL` |

## 2. The ledger — exact

`schema_migrations` holds `0001…0014`, in order, each applied once. Nothing else. No applied file was
edited (forward-only), so nothing the ledger records is untrue.

## 3. The witness that matters — both paths, one schema

- **Corrective path:** `0008…0014` applied one at a time to the live database.
- **From-nothing path:** a fresh database (`truespec_scratch_003`) → `npm run db:migrate` → **all 14 applied**.

`developer-workspace/scripts/task-003/schema-dump.mjs` dumps columns (106), constraints, indexes and
sequences as canonical text; the two dumps were diffed:

```
### diff (corrective path  vs  from-nothing path)
IDENTICAL — no differences
```

Artefacts: `scripts/task-003/runs/checkpoint-a/schema-live.txt`, `schema-scratch.txt`, `schema.diff`
(empty). The scratch database was **created for this check and dropped afterwards** (own litter); the live
database was not touched (25 cars before and after).

## 4. Gates at Checkpoint A

- `npm run leak-check` — **PASSED**, 26 public routes, all 200, no cost/currency/profit leaked.
- Every office route 200: `/office`, `/office/inventory`, `/office/enquiries`, `/office/settings`,
  `/office/activity`, `/office/login`, `/office/car/new`. No errors in the dev log.
- (Full four gates run again at Task 25; `npm test` was 47/47 and `typecheck` clean at Task 1.)

## 5. Interim states — named, not hidden

1. **Legacy Unsplash addresses remain in `car_photo.sanity_asset_id`** (73 rows). That column must hold a
   reference we own and there is no asset behind those rows yet; inventing an id would make the ledger lie,
   and nothing is deleted on the owner's behalf (truth 10). The demo seed writes real Sanity references over
   them (Tasks 12, 14) and the rebuild-from-nothing run (Task 20) ends with references only. Their provenance
   is already recorded truthfully in the new `origin` column.
2. **`scripts/seed.ts` still writes `cost_line.currency`** (line ~150), which the schema no longer has — so a
   re-seed would fail today. That is expected: Task 14 rewrites it as the one demo-fleet seed. Named here so
   it is not mistaken for breakage.
3. **A note on numbering:** `task.md` line 113 names `0012` for the `office_car` drop, but condition (b) says
   it lands last, with the re-point. The plan numbers it `0015` and the three shape changes `0012…0014`.
   Recorded earlier; unchanged here.

## 6. What was NOT checked

- The seed half of "drop→migrate→seed still builds" — the seed is rewritten at Task 14, so the from-nothing
  run here proves the **chain**, and Task 20 proves the chain **plus** the seed.
- No browser check at this checkpoint (nothing user-visible changed yet).
