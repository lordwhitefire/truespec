# TASK-005 · Task 5 — a save reports what actually changed (car)

**What was asked** (`plans/TASK-005-plan.md:153-156`): the server's change fact is returned by
`updateCar`/`createCar` — from the `changed` decision the update statement already makes — with **no
browser-supplied hash read**; a save that changed nothing says so in words of its own ("Nothing
changed.") instead of "Saved"; a save that changed something keeps the words it already had.

**The ruling it serves** (`design-workspace/decisions/TASK-005-ux-rulings.md:298-307`, DR23): *"A save
that changed something says 'Saved'. A save that changed nothing says 'Nothing changed.'"* — and
**never** for a failure, which is DR25's job. **No new vocabulary was drafted**: the success sentence
is the screen's own, untouched, and the no-op sentence is the ruling's own words.

## What changed, and where

| file | what |
|---|---|
| `lib/car-update.ts` | the statement's trailing fallback now carries the fact: `SELECT ref, true AS changed FROM upd UNION ALL SELECT ref, false AS changed FROM car WHERE id = $1 AND deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM upd)` |
| `lib/car-create.ts` | the same on the create statement: `SELECT ref, true AS changed FROM new_car UNION ALL SELECT ref, false AS changed FROM car WHERE id = $1` |
| `app/office/actions/car.ts` | `CreateCarResult`/`UpdateCarResult` carry `changed: boolean`; both actions read the reply's row once and pass the fact through |
| `app/office/(shell)/car/car-client.tsx` | the toast **and** the result panel: `changed` ? *"Saved as \<ref\>. The showroom updates immediately."* : *"Nothing changed."* |
| `lib/car-update.test.ts` | a test pinning the fact on both arms and the `NOT EXISTS` guard |
| `lib/car-create.test.ts` | new — the same pin for the create statement, which had no test file at all |

### The guard is load-bearing, not decoration

Both statements answer the ref from two arms, and the fallback arm reads the car row. For the
**update**, that row is in the statement's own snapshot *whether or not the write happened* (it was
there before the statement ran). Without `NOT EXISTS (SELECT 1 FROM upd)` a changed save would answer
**two rows** — `true` from `upd`, `false` from the fallback — and the action, which reads the first
row, would be handed the no-op arm's word. The `UNION` the statement used before would not have saved
it either: the rows now differ in the `changed` column, so nothing deduplicates them.

The **create** statement needs no guard, and that is reasoned from its shape rather than overlooked: on
a fresh insert the new row is *invisible* to `car WHERE id = $1` (same snapshot — the very reason the
fallback exists), and on a repeat `new_car` is empty, so exactly one arm ever answers. Not staged: a
concurrent double-create.

### No browser-supplied hash is read

True before this task and still true: `actions/car.ts` computes `carChangeCheck(columns)` from the
values it is about to store (`:87`, `:142`), and no form field, hidden input or client value is ever
read as a hash (checked: the only occurrences of `contentHash`/`hashVersion` in the action and the
client are those two server-side computations).

## Witnessed live — signed in, `:3210`, the real store, demo car TS-1001

Drive: `developer-workspace/scripts/task-005/car-save-reports.mjs`; readings in
`runs/car-save-reports/car-save-reports.json`. The car is a **demo** car (`is_demo = true` — the fleet
the demonstration seeded and `demo:wipe` empties), and the one field the drive touches is put back
exactly as it was.

| the save | what the screen said | its own POST |
|---|---|---|
| nothing changed | **Nothing changed.** — panel *and* toast | **200** |
| the arrival note filled in | **Saved as TS-1001. The showroom updates immediately.** | **200** |
| the arrival note put back | **Saved as TS-1001. The showroom updates immediately.** | **200** |

The url stayed `/office/car/TS-1001` throughout; no red box ever appeared; the sidebar, nav and
*"Signed in as rema6…"* were intact after every save; **no Chrome was launched** (6 → 6).

**The store says the same thing.** Read directly before and after:

| reading | before | after |
|---|---|---|
| `car.version` (TS-1001) | 1 | 3 |
| `activity_event` rows for TS-1001 | 2 | 4 |
| `car.arrival_note` | `null` | `null` |
| cars in the office | 25 (25 demo) | 25 (25 demo) |

Exactly the **two real saves** moved anything — and **every no-op save moved nothing at all**: three
no-op saves were clicked across the probes and the drive (all answered 200), and the version rose by
exactly two. The no-op words are true **at the store**, not merely on the screen. What this leaves
behind, said plainly: two `car.updated` rows and two version steps on a demo car — real writes, and
the readings say so rather than claiming "no trace".

## The harness lesson (recorded because it cost a run)

A click sent **before React hydrates** is swallowed and the browser submits the form itself — a GET
that rewrites the url with every field in it. The first attempt's readings show exactly that
(`/office/car/TS-1001?brand=Toyota&model=Camry&…&carId=…`, three of them, no POST anywhere). In dev
the car page is **1779 modules compiled on demand** and hydration lands about **5 s** after
`domcontentloaded` (`car-hydration-probe.mjs`: `<nextjs-portal>` appears at 5424 ms; `readyState`
`interactive` at 3900 ms with no portal). The drive now waits on `<nextjs-portal>` — Next injects it
only once the client bundle has run — and awaits each save on **its own POST response**. The toast is
also a `role="status"`, so the panel is found from the save button rather than by role alone
(`car-save-probe.mjs` listed both).

## What was not done, and why

- `lib/change-check.test.ts` was **not** extended, though the plan's row names it. The fact does not
  live there: `change-check` computes the hash from values; the *statements* decide `changed`. The test
  went where the fact lives. The plan's file list also did not name `lib/car-create.ts` or
  `lib/car-create.test.ts`; both were touched because the AC requires `createCar` to return the fact
  too, and the create statement had no test file to extend.
- **The create half was not driven live.** `changed: false` on a create is reachable only through the
  concurrent/retry path (the one Task 3's `createCar` guard covers), and that path was not staged.
  Pinned: the statement's shape (unit test) and the action's use of it (typecheck and the same
  pass-through the update half proved end to end).
- **The failure case is unchanged and must stay distinct:** a refused save still reports as a refusal
  (red, in the action's own words, DR25) and never takes these words — the branch is `res.ok` only.
