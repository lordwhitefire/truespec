# TASK-004 — Phase 2 report (Task 7 → Gate 2)

**Date:** 2026-10-15 · **Owner ruling:** D15 option **A** (a section *is* a primary state).
**Scope of this report:** the state-model split (migration 0020), the read layers that move to
primary/secondary, the seed rewrite, and the scratch rebuild. No owner checkpoint passed — Gate 2
is an internal gate.

---

## What this phase is

TASK-004's first real change to the data model: the old three-value `section` becomes a *view* of
four fixed **primary states**, and the owner's own stages become **secondary states** carried
alongside. The showroom keeps presenting three groups; the office gains a fourth (Sold) and keeps
its own vocabulary out of the public path.

Owner rulings folded in (from `notes/TASK-004-D15-section-ruling.md`):
- Four primaries: **Available, On Order, Landed, Sold**; a section and a primary state name the same thing.
- The showroom presents **three** (`PUBLIC_SECTIONS`); Sold is never public.
- Old stages **On the way / At port / Cleared** become **secondary** states, carrying no section.
- The sold fleet car keeps a **sale row** *and* sits in the Sold primary.

---

## Built

### Task 7 — migration `0020_state_model_split.sql` (new file)

- `car_state.kind` (`'primary' | 'secondary'`), backfilled.
- `car_state.section` relaxed (`DROP NOT NULL`), old three-value CHECK dropped, re-added as a
  four-value + NULL invariant.
- Four primaries pinned. Two are new: **On Order** (sort 60, `#06b6d4`), **Sold** (sort 70, `#475569`).
- `car_secondary_state (car_id, state_id)` link table. `car_id` FK **ON DELETE CASCADE** (a car's own
  links go with it — required so the demo-wipe keeps working); `state_id` FK **RESTRICT**.
- Car backfill: a car sitting in a now-secondary state moves to **On Order** and keeps the old label
  as a secondary it carries.
- `car.state_id` becomes **NOT NULL** (nulls backfilled to Available).
- Invariants: `car_state_kind_section_ck` (a primary has a section, a secondary does not),
  `car_state_kind_new_arrival_ck`, `car_state_section_check` (four + NULL), `car_state_primary_label_pinned`,
  `car_state_primary_section_pinned`.
- Trigger `refuse_primary_state_change()` + `car_state_primaries_are_final` — a primary cannot be
  renamed, re-kinded, or deleted.

### Task 8 — shared rules + read layers

- `lib/sections.ts`: `Section`/`SECTIONS` = **four**; new `PUBLIC_SECTIONS` = **three**;
  `SECTION_LABEL`/`SECTION_TOKEN` four (`sold: "s"`); `presentedSections(sold)` returns `[]`.
- `lib/counts.ts`: a car counts as Sold if its section is `sold` **or** it carries the `sold` flag.
- `lib/office.ts`: `getOfficeCars` excludes tombstones (`deleted_at IS NULL`); `sectionsByState` and
  `getOfficeStates` read **primary** states only (`kind = 'primary'`).
- `lib/public-cars.ts`: `getPublicCars` lists only `PUBLIC_SECTIONS`.
- UI: public `InventoryBrowser` iterates `PUBLIC_SECTIONS` (no Sold tab); the office state-editor select
  iterates `PUBLIC_SECTIONS` (Sold hidden until its Task 15 rewrite); `inventory-client` gives `sold`
  a chip class.
- `scripts/leak-check.ts`: the office-private watch list is now derived from `kind = 'secondary'`
  (dropping the old "every label but the section names" derivation).

### Task 9 — seed rewrite

`scripts/seed.ts` now gives each demo car a **`primary`** and an optional **`secondary`** (the
scripts are otherwise unchanged: found-by-ref, change-checked, never deleting). Fleet mapping:
Available → Available; On the way / At port / Cleared → **On Order** + that stage as a secondary;
Landed → Landed; TS-1025 → **Sold** (with its sale row). Secondary links are written with
`ON CONFLICT DO NOTHING` — added where absent, never removed.

---

## Verified (with numbers)

| Gate | Result |
| --- | --- |
| migration 0020 (rolled-back transaction, live store) | **14/14 PASS** — `scripts/task-004/migration-0020-check.ts` |
| scratch rebuild | drop → migrate (**20** migrations) → seed, **from nothing** |
| seed idempotent | fingerprint run 1 **==** run 2 (`scripts/task-004/store-fingerprint.ts`) |
| showroom membership | Available **10** (7 + 3 landed-new-arrival) · On Order **6** · Landed **3**; header "**16 cars**"; **no Sold tab**; TS-1025 absent |
| leak-check | **18/18 PASS** — watching "3 office state labels" (the secondaries) |
| typecheck | clean |
| tests | **86/86** (3 new) |
| build | clean |
| store-freshness | **PASSED** |

The migration was proven **non-destructively first** (run inside a transaction on the live store,
asserted, then `ROLLBACK`), so the model and every refusal were checked before anything was applied.

A JSON snapshot of the pre-rebuild store is at `/tmp/opencode/truespec-store-snapshot-*.json`
(pg_dump 16 cannot talk to the Neon server, v18).

---

## Store facts after the rebuild

- `car_state`: Available[primary/available], On the way[secondary/—], At port[secondary/—],
  Cleared[secondary/—], Landed[primary/landed], On Order[primary/on order], Sold[primary/sold].
- 17 cars (7 Available, 6 On Order, 3 Landed, 1 Sold), 6 secondary links, 1 sale, 6 enquiries, 99 cost lines.
- `office_user` / `session` were emptied by the rebuild because they are rebuilt on demand: the owner
  row is upserted by email on the first office request carrying a valid Clerk session (`lib/session.ts`).
  `setting` rows are the 0005 defaults (nothing owner-edited was at risk).

---

## Not done / findings

- **Migration 0020 was never applied to a *kept* store as a forward change** — it was applied only as
  part of the from-nothing rebuild. Forward application on a populated store is exercised by the
  rolled-back proof, but a real in-place application has not been run (the rebuild superseded it).
- **Office data path not checked in a browser** — the office needs a real Clerk sign-in, which is the
  owner's. The office read changes are typechecked and SQL-reviewed, not end-to-end observed.
- **No tombstone exists in the store**, so `deleted_at IS NULL` was not exercised end-to-end (the clause
  is reviewed, not observed). Task 13 creates tombstones and will exercise it.
- **`scripts/seed-office.ts`** still names the old stages, but it is **RETIRED** (no npm script) — left as-is.
- **`scripts/reconcile.ts`** still reads `s.section` from a car's state (always a primary), so it keeps
  working; it was not re-pointed at the new vocabulary (a TASK-003 benchmark tool, out of scope here).
- Deferred, unchanged from the ruling: `lib/sale.ts` / R-SLD-1 ("Sold is a flag, never a state") is
  stale under D15 → **Task 14**; car-form hardcoded `STATES` + section picker → **Task 11**; the office
  state-editor's secondary-only rewrite → **Task 15**; the specs' "section"→"primary state" vocabulary
  rewrite stays a logged architecture gap.

---

## Files touched

`migrations/0020_state_model_split.sql` (new) · `lib/sections.ts` · `lib/counts.ts` · `lib/office.ts` ·
`lib/public-cars.ts` · `lib/sections.test.ts` · `lib/counts.test.ts` · `components/site/InventoryBrowser.tsx` ·
`app/office/(shell)/settings/state-editors.tsx` · `app/office/(shell)/inventory/inventory-client.tsx` ·
`scripts/leak-check.ts` · `scripts/seed.ts`.
Witnesses (developer workspace only): `scripts/task-004/{migration-0020-check,snapshot-store,drop-schema,store-fingerprint}.ts`.
