# TASK-004 · Task 21 — migration `0022`, the draft table

**Repo:** `truespec` · **Date:** 2026-10-15 · **Plan row:** 21 · **Status:** built, verified, committed
**Authority:** `openspec/tasks/TASK-004/task.md` — truth 9 (an upload lands as a draft; **a draft is
not a record**; the code is given at the save) and the D16 block (lines 401–407, the column list and
"**Images live on the draft's own row, not in a second table** — D13 promised one new table"). Plan
block lines 264–267.

---

## What was asked

> **AC:** one table per D16: `id`, `kind` (`car`|`enquiry`), `batch_id`, `source_filename`,
> `source_asset_id`, `values` jsonb, `image_asset_ids` (ordered), `state_label` (a **name**,
> nullable), `is_demo`, timestamps. No second table.
> **Verify:** scratch rebuild; a draft row round-trips; no `car`/`enquiry` row is created by holding
> a draft.

The table a file lands in before anyone has decided anything. Nothing enters `car` or `enquiry`
until the owner saves, so the boards, the counts, the section lists and the showroom need no filter
to keep drafts out — **they never see one**. That is why the table is shaped the way it is: what it
leaves out is doing as much work as what it has.

---

## What was built

**`migrations/0022_draft.sql`** — one table, `draft`, forward-only.

| Column | What it holds, and why it is this shape |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` — the store mints it, as everywhere (Task 10). |
| `kind` | `text NOT NULL CHECK (kind IN ('car','enquiry'))` — the two kinds of record a file can produce, and nothing else. Guard named by Postgres (`draft_kind_check`), enforced by the store. |
| `batch_id` | `uuid NOT NULL`, **not** a foreign key. Every draft read from one file shares it; **D16 and D13 settle on exactly one new table**, so a batch is a value rather than a row. |
| `source_filename` | The owner's own file name. Lives only here. |
| `source_asset_id` | The image store's reference. Both are `NOT NULL`: a draft that is still waiting *has* its source in a held file, and a draft with no file it came from is not a draft. |
| `values` | `jsonb NOT NULL`, **no default**. The record's editable fields — a car's fourteen, an enquiry's five. No default because truth 9 says nothing is "inferred, defaulted or invented": what a file carried is the writer's to declare. |
| `image_asset_ids` | `text[] NOT NULL DEFAULT '{}'` — **ordered**, index 0 the cover. Arrives **empty by design**: a template carries values, not pictures; the owner adds images by hand. |
| `state_label` | `text`, **nullable** — the state the file named, as the owner knows it ("On Order"), applied at the save. Nullable because a file may name no state. |
| `is_demo` | `boolean NOT NULL DEFAULT false` — drafts carry the demo marker, so the wipe clears them (D16). |
| `created_at` / `updated_at` | `timestamptz NOT NULL DEFAULT now()`. |

Plus `CREATE INDEX draft_batch_id_idx ON draft (batch_id)` — the batch is the unit the upload
**writes** and the review **reads**, so it is the one thing worth an index; and
`ALTER TABLE draft ENABLE ROW LEVEL SECURITY` like every other table.

### What the table deliberately does NOT have

Each absence is a claim, and each is asserted by the witness rather than assumed:

- **no `ref`, no `TS-####` column** — the code is given once and never reused, so it is given at the
  **save**. A draft that took a code and was abandoned would burn that number for good (truth 9).
  The witness proves the sequence does not move when a draft is held.
- **no `content_hash` / `hash_version`** — the change-check is a fact about a *record*, computed from
  the values that are stored. A draft is not stored as anything yet.
- **no `state_id`** — a draft **sits in no state and occupies none**, so a waiting draft can never
  block a state's deletion (D15). It holds a state's *name*, if it holds one at all.
- **no images table** — the images live on the draft's own row; D13 promised one new table.
- **no `deleted_at`** — a draft waits for the owner, and nothing removes it, so there is nothing to
  tombstone (truth 9).

### The one guard I added beyond D16's column list

`CONSTRAINT draft_state_label_is_a_name CHECK (state_label IS NULL OR state_label !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-')`

The column's own words in D16 are "a **name**, never a state id". A CHECK cannot express "is the name
of a state that exists" — the state may legitimately be gone by the time the draft is saved, and
truth 9 says the owner is *asked to choose* then. What a CHECK **can** do is make the "never" real: a
state id is a uuid, a state's name is not. So the store refuses a uuid-shaped label rather than
trusting whoever writes the row to remember. It is one line and it is proved by a refusal test
(`sqlstate 23514, draft_state_label_is_a_name`).

---

## What was verified

**Witness** `developer-workspace/scripts/task-004/migration-0022-check.ts` — **31/31**, transcript at
`developer-workspace/runs/TASK-004-task21-migration-0022.txt`. It opens one transaction, runs the
migration file, and rolls back:

1. the migration runs to the end and adds **exactly one table** — `draft`, and nothing else;
2. the columns are **exactly D16's**, compared as sets in **both directions**, so an extra column or
   a missing one both fail;
3. the columns carry D16's meanings: `values` jsonb and required with no default;
   `image_asset_ids` an ordered `text[]` defaulting to `'{}'`; `state_label` nullable text; `is_demo`
   defaulting false; both timestamps defaulting to `now()`; `id` minted by the store;
4. **none** of `ref`, `content_hash`, `hash_version`, `state_id`, `deleted_at` exists;
5. RLS is on; `draft_batch_id_idx` exists;
6. a draft **round-trips whole** — kind, batch, file name, file reference, values (structure and
   all), the ordered images with the cover first, the state's name, a store-set timestamp;
7. a draft may name **no** state, and images arrive **empty** without being asked for;
8. **holding a draft creates no record**: `car` and `enquiry` counts unchanged, and
   **`ts_ref_seq` does not move** (1029 → 1029);
9. the store **refuses**: a third kind (`23514`), a state **id** where a name belongs (`23514`), a
   draft with no `values` (`23502`), a draft with no batch (`23502`);
10. after the rollback the store is **exactly as it was** — same table list, same sequence.

**Then applied for real** — `migrate.ts` applied `0022_draft.sql`, 22 migrations recorded. Live
table re-checked: columns equal D16 exactly, 0 rows, `draft_pkey` + `draft_batch_id_idx`, RLS on.

**Scratch rebuild** (the plan's Verify, and the risk table's "the rebuild is the strongest check"):
`drop` → `migrate` (**all 22** files, 0001→0022 from nothing) → `seed`.
**The fingerprint before and after is byte-for-byte identical** (`store-fingerprint.ts`: states, all
17 cars with their secondaries, sale flags, cost-line counts and photo counts, plus the totals) — so
the chain from nothing reproduces the store, not merely a store.

**Five gates, in order, after the rebuild:** `leak-check` **PASSED** · `typecheck` clean ·
`test` **194/194** · `build` green · `store-freshness` **PASSED**. The dev server came back up
against the rebuilt store: `/`, `/inventory`, `/privacy`, `/office` → 200; `/api/template` → 401.

### The one thing the migration dropped that I must say plainly

**The scratch rebuild drops `public` CASCADE and re-seeds — it destroys the store's rows.** Before
doing it I confirmed **every row in the store was demo** (`not-demo = 0` for `car` and `enquiry`;
`tap` empty; `office_user`/`session` empty), took a **snapshot** of all 16 tables
(`/tmp/opencode/truespec-store-before-0022-rebuild.json`), and the fingerprint proves nothing was
lost. There is **no restore script** in the repo — the snapshot is insurance I can read by hand, not
a button. That is the honest state of the safety net, not a claim that one exists.

---

## What was NOT verified

- **The witness cannot be re-run now.** It is a *pre-apply* check: it runs the migration file in a
  transaction, so while the table exists the `CREATE TABLE` would fail. This is the same one-shot
  property the `0020` witness has. Its transcript is kept, and the live table was compared against
  D16 by hand afterwards. If re-runnability matters later, the check moves to a scratch schema.
- **Nothing reads or writes a draft yet.** The table's *shape* and the store's *refusals* are proven;
  its *use* is not, because no code uses it. That is Task 22 (the car reader) and Task 23 (the
  enquiry reader). Nothing here should be read as "uploads work".
- **`values`' shape is not constrained** — deliberately. A car's fourteen fields and an enquiry's
  five are different shapes in the same column, and the store cannot police the difference without
  inventing a schema the spec does not have. The recipe stays the single source (`lib/change-check.ts`),
  and the reader is what holds a file's values to it.
- **No index on `is_demo`.** The wipe (Task 25) will scan drafts for the demo marker; if that scan
  ever matters, it adds its own index rather than this migration guessing.

---

## Flags for the owner

1. **I dropped and re-seeded the store.** Everything in it was demo and the fingerprint proves the
   rebuild reproduced it exactly — but it *is* a destructive step, and the plan asked for it. If you
   would rather not have that happen again until there is real data, say so and it becomes a snapshot
   + scratch-schema check instead.
2. **`values` is stored by `jsonb`, which keeps no key order.** A draft read back has the file's
   fields, never the file's order. Task 22 must read a draft's values **by the recipe's field list**,
   not by position. Recorded here so it is not rediscovered the hard way.
3. **`state_label` refuses anything uuid-shaped.** If you ever name a state something that looks like
   a uuid, it will be refused — pathological, and cheap to relax if you object.

---

## Notes on the craft

- **The absence checks are the ones worth having.** "It has the right columns" is weakly tested by
  naming them; "it has *no* `ref`, *no* `state_id`" is what truth 9 actually claims, and it is
  asserted by name so a later change that adds one fails loudly.
- **`ts_ref_seq` untouched is the load-bearing check.** It is the difference between a holding area
  and a record, and it is the kind of thing that would work by accident today and fail quietly later.
- **The scratch rebuild is worth its cost** precisely because it is destructive: it is the only check
  that exercises 0001→0022 as a chain, and the fingerprint is the only proof that "reproduced the
  store" is true rather than assumed.
- The witness's first run **failed**, on "the values come back as they were written" — because I
  compared serialised strings and `jsonb` had reordered the keys. That failure is what produced both
  the `canonical()` comparison and flag 2 above. Worth recording: the check was wrong, not the
  migration.
