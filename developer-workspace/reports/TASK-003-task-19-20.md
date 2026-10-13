# TASK-003 — Task 19 (cleanup readiness) and Task 20 (rebuild from nothing)

**Date:** 2026-10-13 · Tasks 19 and 20 of the plan.

## Task 19 — what is waiting to be cleared, as it stands

`task.md` truth 10 and line 154: the system clears nothing itself — the office can tell the owner
exactly which assets are waiting to be cleared. Task 19 is that telling, and only that.

- **`lib/cleanup.ts`** — `listWaitingToBeCleared()`. Reads only. No delete, no job, no purge path:
  the owner clears by his own hand. It answers the five things the store must be able to answer:
  1. a car the owner deleted — the tombstone (`car.deleted_at`), its age, and everything that
     travelled with it (photo count + asset ids, cost lines, the sale);
  2. an enquiry recorded at or past its year — the clock is the row's own `created_at`;
  3. every stored image/file by the record that owns it (asset references, so ownership is nameable);
  4. a row pointing at an asset the store does not hold;
  5. the two exceptions the owner **settled** — an asset no row ever referenced, and `auth_attempt`
     rows past 90 days. Machine litter only, never a record.
  A failed read of the asset store is reported as failed, never as "nothing missing".
- **`scripts/cleanup-readiness.ts`** — the witness that prints it.

What it says today:

| | |
|---|---|
| a deleted car | **none** — the store holds no tombstone; nothing is hidden from him |
| an enquiry at its year | **1** — Chidi O. · +2348030000001 · about TS-1001 · recorded 2025-08-14 · **425 days** |
| rows that name an asset | **50** (49 images + 1 PDF) — every one resolves in the store |
| a row pointing at a missing asset | **none** |
| rows holding a third-party address | **24** on 8 cars (the named interim — not ours to clear) |
| assets no row references | **0** |
| sign-in attempts past 90 days | **0** |

**"No code path removes a record" — checked, not asserted.** `grep` for `DELETE FROM|TRUNCATE|DROP
TABLE|.delete(|purge` across `lib/`, `app/`, `components/`, `scripts/`: the only hits are in
`scripts/seed.ts` — the demonstration's own authoring tool re-syncing the rows it wrote (how the
seed proves it is idempotent). No application path removes a record. Recorded because the claim is
in the plan, and it is the kind of claim that quietly stops being true.

## Task 20 — the rebuild-from-nothing run (benchmark 6)

`task.md` benchmark 6: *"the database is dropped and rebuilt from the migrations and the seed, every
screen shows the same numbers as before the rebuild."*

**Run on the live store, with the owner's explicit ruling (2026-10-13)** — asked first, because it is
the first step in this layer that destroys data, and it is also the move that clears the two named
interims. He was told exactly what it would remove. The retired rows are the demonstration's own: the
store held **0 non-demo rows** before the drop (25 cars, all `is_demo`).

**A full JSON dump of all 15 tables was taken first** — `runs/task-20/before-dump.json` — so the
pre-rebuild store is recoverable.

| | before | after | why |
|---|---|---|---|
| cars | 25 (all demo) | **17** (all demo) | the 8 leftover TASK-002 cars leave |
| cost lines | 147 | **99** | their 48 lines go with them (6 × 8) |
| photos | 73 | **49** | the 24 address rows go with the 8 cars; the fleet's 49 stay |
| — asset references | 49 | **49** | the fleet's own photos, untouched |
| — third-party addresses | **24** | **0** | **interim 1 cleared** |
| enquiries | 6 | 6 | the demo enquiries stay |
| sale / PDF | 1 / 1 | 1 / 1 | stay |
| `office_car` | absent | absent | `0015` still lands |
| ledger | 15 (`0001…0015`) | **15**, applied **from an empty schema** | the chain rebuilds itself |

Checked, every one green:

- **the fleet is unmoved** — all **17** cars compared before/after on state, km, price, cost and
  profit: **0 differing figures**;
- **only the leftovers left** — the 8 refs that disappeared are *exactly* the 8 cars that held
  third-party address rows, and their refs appear on no public route afterwards
  (`/`, `/inventory`, `/car/TS-1001`) — 0 rows in `car` for them;
- **nothing else moved** — enquiries, sale, PDF, ledger identical;
- **the authored fleet is the authored fleet** — `At port 2, Available 8, Cleared 1, Landed 3, On the
  way 3` = 17, the shape the owner approved;
- **the drop was total** — 0 tables in `public` before migrating;
- **the chain is enough** — 15 migrations applied from nothing, ledger ending `0015_retire_office_car.sql`;
- **`reconcile.ts` green before and after**, and **Checkpoint C re-run and PASS** on the rebuilt
  store (`runs/checkpoint-c/`): office and showroom still agree on every figure for all five states
  and the sold car;
- **the seed a second time changes nothing** (benchmark 7 re-proved on the fresh store): 17 cars,
  99 cost lines, 49 photos, 6 enquiries — unchanged; seed reported *"0 earlier demo row(s) marked"*
  (there was nothing left to mark).

### The honest part: the first run's exit code said FAIL

The first execution **proved every substantive clause above** (fleet unmoved 0 diffs; drops exactly as
predicted; reconcile green; seed stable) but exited 1 on two **faults in my own harness**, both since
fixed in `checkpoint-d.mjs`:

1. it read the address-holding refs **after** the drop — so the list came back empty and "the gone
   refs are exactly the address-holding refs" could not be true. It now reads them **before** the drop.
2. its showroom sample was drawn from **whatever was in the store**, so it included leftover cars and
   then demanded they remain. The sample now comes from the **approved fleet list**.

Neither fault touched the store, and the store is not re-dropped to re-run a proof for cosmetics:
instead the same claims were re-executed after the rebuild — the 8 refs absent from the store and from
every public route, `car_photo` at 49 rows with **0 addresses**, and Checkpoint C's agreement harness
**PASS** on the rebuilt store.

### What this leaves

- **cleared:** interim 1 (24 hotlinked rows) and interim 2 (the 8 leftover cars beside the fleet).
- **still open:** interim 3 — `lib/serialize.ts`'s `https?://` address branch. It can now go: no row
  holds an address any more, so the branch has nothing to branch on. That is Task 18's second half,
  next.
