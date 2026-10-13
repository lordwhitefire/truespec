# TASK-003 — Tasks 21 & 22: the refusals, and the store inspected

**Date:** 2026-10-13. Benchmarks 4 and 5 (Task 21) and 3 and 7 (Task 22) of `task.md`.

Both witnesses run on **their own scratch store** — the whole chain plus the seed, then dropped. The
owner's store is read, never written, by either.

---

## Task 21 — the refusals (benchmarks 4, 5)

> **4.** …a car is stored with two lines of the same kind, or a state with no section, or two states
> sharing a name, the database refuses the row.
> **5.** …a state is deleted while a car sits in it, the store refuses and the office can say why.

`developer-workspace/scripts/task-003/refusals.mjs` — scratch `truespec_scratch_003d`, chain
`0001…0015`, then the seed, then seven attempts, each in its own savepoint inside one transaction
that is rolled back at the end. Evidence: `runs/task-21/refusals.json`.

| # | the attempt | refused | SQLSTATE · constraint | what the store said |
|---|---|---|---|---|
| 4a | a second cost line of kind `purchase_price` on a car that has one | yes | `23505` · `cost_line_car_kind_unique` | duplicate key value violates unique constraint |
| 4b | a car state stored with **no section** | yes | `23502` | null value in column "section" violates not-null constraint |
| 4c | a car state whose section is not one of the three (`waiting`) | yes | `23514` · `car_state_section_check` | new row violates check constraint |
| 4d | a second car state named `Available` | yes | `23505` · `car_state_label_unique` | duplicate key value violates unique constraint |
| 4e | a second enquiry state named `New` | yes | `23505` · `enquiry_state_label_unique` | duplicate key value violates unique constraint |
| 5a | deleting the state `Available` **with 8 cars sitting in it** | yes | `23001` · `car_state_id_fkey` | violates RESTRICT setting of foreign key constraint |
| 5b | deleting the enquiry state `New` **with 3 enquiries in it** | yes | `23001` · `enquiry_enquiry_state_id_fkey` | violates RESTRICT setting of foreign key constraint |

Each refusal was judged on four things, not one — refused; the **right rule** refused it (SQLSTATE
and constraint named); **nothing changed** (the row count for that key was identical before and
after — "refused" is not "quietly accepted"); and the parent survived (after 5a the state and its
eight cars were still there). Every one passed, and the scratch store after the whole battery —
rolled back — matched the seeded store exactly (17 cars · 5 car states · 99 cost lines · 6
enquiries · 5 enquiry states).

**A harness defect, mine:** the two delete cases were written expecting `23503`. The store answered
`23001` (`restrict_violation`) — which is correct: `23503` belongs to a `NO ACTION` constraint
checked at the end of the statement, while `ON DELETE RESTRICT` refuses immediately. The store was
right; the expectation was fixed.

**What is not claimed here.** Benchmark 5's second half — *"and the office can say why"* — is a
write-flow behaviour: something has to catch that refusal and put the reason in front of the owner.
There is no write flow in this layer (TASK-004 owns it). What this layer establishes is the half a
write flow needs: **the refusal names itself** — SQLSTATE `23001` and `car_state_id_fkey` — so the
reason is on the wire and can be said. The saying is named as TASK-004's witness, not claimed.

---

## Task 22 — the store inspected (benchmarks 3, 7)

> **3.** …the store is inspected for a rate or a currency, nothing is found — no column, no setting
> key, no seed value, no constraint that mentions one.
> **7.** …the seed is run twice, nothing duplicates and no figure changes.

`developer-workspace/scripts/task-003/store-inspection.mjs`. Evidence:
`runs/task-22/store-inspection.json`.

### Part A — the live store, read-only

| inspected | result |
|---|---|
| every column of every table (90 columns, 15 tables) | **no floating-point and no fractional column at all** — `21× uuid · 34× text · 20× timestamptz · 4× boolean · 7× integer(32,0) · 4× bigint(64,0)`. Money is whole minor units throughout; there is no type that could hold a rate |
| every constraint's own definition (104 read) | **none names a rate or a currency.** `0008` dropped `cost_line.currency`, `cost_line.rate_minor` and both rate CHECKs; what is left is naira-only |
| every column name and table name | none matches a rate or a currency word |
| **every value in every text column** (34 columns, all rows), word-boundary match | **none** — so "no seed value mentions one" is a measurement over the stored values, not a reading of the seed file |
| the money-holding columns | `car.was_price_kobo`, `car.doorstep_price_kobo`, `cost_line.amount_minor`, `sale.sale_price_kobo` — all `bigint`, and each is written down as what it is (a typed price, one line's amount, the price actually sold for). **None is a computed total.** The only column whose name mentions a total is `enquiry_pdf.rows_total` — an imported document's own row count, `integer`, not money |
| the setting keys | three: `full_tank_default = "0"`, `tagline`, `whatsapp_number`. **None names a rate or a currency** |

The office's figures are *not* in the store: a car's cost is the sum of its lines and its profit is
price − cost, both produced per read by `lib/money.ts` — pinned by `lib/money.test.ts` in both
directions, and `scripts/reconcile.ts` (exit 0) already proves the rendered figures equal that
computation over the store.

A note so the ledger is not misread: the migration **history** does mention `USD` and `rate_minor` —
`0003` created them and `0008` removed them, with the reason in its header. That is the ladder
telling the truth about itself. The **store**, as it stands, holds neither.

### Part B — a scratch store, seeded twice

Chain, seed, a fingerprint of all 15 tables, seed again, fingerprints compared. Benchmark 7's two
clauses, tested one at a time:

- **nothing duplicates** — every one of the 15 tables holds the same number of rows after the
  second seed (201 rows in total, unmoved). ✓
- **no figure changes** — **59 figure columns** compared across the 15 tables (a car's price,
  mileage, colours, state; every cost line's car, kind, amount; every photo's car, position, asset
  reference, origin; every enquiry's car, state, name, number, note and recorded date; the sale; the
  document's filename and row count): **not one moved.** ✓

### The finding beside it — measured, not hidden

The fingerprint also covers identity, and there the seed is **not** idempotent. A second run
*rewrites* its child rows instead of syncing them in place:

| table | what changes on a second seed |
|---|---|
| `car_photo` (49) | `id`, `created_at` |
| `cost_line` (99) | `id`, `created_at`, `updated_at` |
| `enquiry` (6) | `id`, `pdf_import_id`, `updated_at` |
| `enquiry_pdf` (1) | `id` |

`car` (17), `car_state`, `enquiry_state`, `sale`, `setting` and `schema_migrations` do **not** move:
the fleet is upserted by `ref`, which is why every figure is stable.

**Why this matters, and why it does not fail benchmark 7.** Benchmark 7 asks for nothing duplicated
and no figure changed, and both hold. What it does not ask — and what is nevertheless true — is that
identity churns: on every seed run the demo's photos, costs, enquiries and their document are new
rows with new UUIDs and fresh insert times. The practical consequences, stated plainly:

- `enquiry.created_at` is **not** among the changed columns, so the retention clock that Task 19's
  cleanup reads does not move — the year-old enquiry stays a year old.
- Nothing in the store references `cost_line.id` or `car_photo.id`, and `enquiry.pdf_import_id` is
  re-pointed inside the same transaction, so no reference dangles.
- But a **write flow must not hold a `cost_line` or `enquiry` id across a seed run** until this is
  settled — which is a TASK-004 concern, and the reason it is being raised now rather than
  discovered later.

**The owner's call, not mine:** the seed can be made to sync children in place (upsert by
`(car_id, kind)` for cost lines — the unique constraint is already there — and by car+position and a
natural key for the others), which would make identity stable too. That is a rewrite of the demo's
authoring tool, and the spec does not require it. It is recorded here, flagged in the plan's
tracker, and left for the owner to rule on.

---

## What was not run

- No part of Task 21 or 22 touched the owner's store with a write.
- Benchmark 5's "the office can say why" — not run, not claimed (no write flow in this layer).
- The identity churn was **not** fixed; it is reported.
