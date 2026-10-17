# TASK-005 · Task 3 — Write actions refuse instead of throwing

**Built 2026-10-17.** Commit: _see the commit whose message names this task._

## What the task asked

`task.md` A3 / D32 / DR25 — *a failed write is reported as a failed write, where the person is
working*. The action's own acceptance criteria:

> every office write wraps its store call the way `photosExist` does: catch, return
> `{ ok: false, errors: [{ message, … }] }` with words; **nothing thrown out of a server action on
> store failure**. Covers `createCar`, `updateCar`, `deleteCar`, `undoDeleteCar`,
> `removeCarForever`, the setting saves, the enquiry state change, the draft saves, the tap write.
> Success path byte-for-byte unchanged.

## Why it mattered (the mechanism, measured)

`lib/store-guard.ts:22-23` — *"If every attempt fails the last error is thrown, which an `error.tsx`
boundary turns into a retryable state."* That is right for a **read**. It is wrong for a **write**:
the office's writes are called inside `useTransition` (`inventory-client.tsx:115,195,218`;
`tombstones.tsx:30,35`, then `deleteCar`/`undoDeleteCar`/`removeCarForever`), and a rejected Server
Action inside a transition reaches the nearest boundary — **the boundary replaces the whole office
chrome**. That is research-plan §5 exactly: a failed delete answered with a page-wide *"We couldn't
load this / Nothing was lost — please try again."*, and the code's own *"That car could not be
deleted."* never appeared, because a throw never reaches the caller's `!result.ok` branch.

## What was found before writing (the change-point map)

| Path | store call | before |
|---|---|---|
| `car.ts` create/update/delete/undo/remove | `:81,121,149,170,201` | **threw** |
| `lib/settings.ts` `saveSetting` | `:157` | **threw** |
| `enquiry.ts` add/rename state | `:110,131` | caught `23505` → refusal, **else threw** |
| `enquiry.ts` recolour/reorder state | `:150,164` | **threw** |
| `enquiry.ts` remove state | `:179` | caught `23001/23503` → refusal, **else threw** |
| `enquiry.ts` `setEnquiryState` | `:252` | caught `23503` → refusal, **else threw** |
| `draft.ts` add/remove image, make cover | `:110,148,186` | **threw** |
| `draft.ts` `deleteDraftAction` → `lib/draft-store.ts:91` | via `deleteDraft` | **threw** |
| `lib/draft-save-run.ts` car / enquiry create | `:133,162` | **threw** |
| `lib/draft-save-run.ts` draft delete after create | `:170` | **threw** |
| `app/office/actions/tap.ts` `markTapsSeenAction` | via `lib/office.ts:529` | **threw** (unhandled rejection) |
| `lib/tap.ts` `recordTap` | `:23` | **already refused** — its route answers 503 |
| `app/office/actions/photo.ts` | — | **already refused** — no store call, its only failure is Sanity |
| `app/office/actions/state.ts` | `:108,132,154,168,183` | **still throws** — see §Findings 1 |

## What was changed

1. **`lib/store-refusal-rules.ts`** (new, pure — no `server-only`, no driver, so it is unit-testable,
   the same split as `store-retry-rules.ts` / `store-guard.ts`). It owns the **words**:
   - the store **cannot be reached** → `the store could not be reached. Try again.`
   - the store **refused the change** → `the store refused that change.` — deliberately **no** retry
     nudge, because the same write fails the same way however often it is sent.
   Both clauses are the product's own, already on its screens (`registry-editor.tsx:93,100`,
   `enquiries-client.tsx:120,129`, `drafts-client.tsx:156,176,244,267`); they are lifted to the server
   so one fact is said one way.

2. **`lib/store-guard.ts`** — two additions, no change to `storeQuery`/`storeQueryOnce`:
   - `storeQueryRefusing<T>(text, params, { field, action })` → `{ ok: true, rows } | StoreRefusal`.
     The pattern `photosExist` (`lib/car-form.ts:106-118`) already used around a read, applied to the
     writes: catch, and answer with words.
   - `storeRefusal(field, action, error)` — the same refusal for the call sites that carry their own
     `catch` (a store's **own** refusal — a duplicate name, a foreign key still holding the row —
     keeps its own, more precise words there; everything else is a failed write).
   - Every failure is **logged** (`console.error`), so a defect that is not really an unreachable
     store stays visible to whoever is looking. `writeFailedMessage` decides only what the *person*
     is told.

3. **The call sites**: `car.ts` (5), `lib/settings.ts` (1), `enquiry.ts` (6), `draft.ts` (4),
   `lib/draft-save-run.ts` (3), `app/office/actions/tap.ts` (1).

## Decisions, and why

- **Catch all, not only transient.** The architect's call 2 and the AC both name `photosExist`, which
  is a bare `catch {}`. Catching all guarantees the property the layer exists for — *a write failure
  never reaches a boundary* — whatever the failure turns out to be. The price (a permanent defect
  being told to the person as a store problem) is paid back by the two clauses above and by the log:
  it is never described as an outage, and it is never silent.
- **Never "nothing was lost" (DR25).** No message here claims a safety. The unit test asserts it
  directly, over both causes.
- **`markTapsSeenAction` keeps `Promise<void>` and swallows** (logging). It is fired and forgotten
  (`components/office/MarkTapsSeen.tsx:25` — `void markTapsSeenAction(…)`, no `.catch()`), so a
  rejection only becomes an *unhandled* one. Swallowing hides nothing: the badge goes on showing the
  same taps, which is exactly true, because they were not marked seen. The revalidate is skipped too,
  so the layout keeps the number it already had rather than redrawing a mark that was never made.
- **The draft delete after a successful create is not treated as a plain retry.** If it fails, the
  record already exists, so the words name the half-done state and **do not** invite a retry — saving
  the same draft again would create a second record. Its own message, not the shared clause.

## New strings introduced (drafted by me — the on-disk family's own verbs, joined)

| where | message |
|---|---|
| car create / update | `That car could not be saved` / `That change could not be saved` |
| car delete / undo / remove | `That car could not be deleted` / `…restored` / `…removed` |
| settings | `That setting could not be saved` |
| enquiry states | `That state could not be added` / `…renamed` / `That colour could not be saved` / `That order could not be saved` / `…removed` / `That enquiry could not be given that state` |
| drafts | `That photo could not be added` / `…removed` / `That could not be made the cover` / `That draft could not be deleted` / `That car could not be created` / `That enquiry could not be created` |
| draft save, delete failed | `The record was made, but the draft could not be cleared — reload before saving it again.` |

Each is joined with one of the two clauses above, e.g. *"That car could not be deleted — the store
could not be reached. Try again."* The per-action verbs are the clients' own existing fallbacks
(`inventory-client.tsx:199,222`, `tombstones.tsx:38`, `drafts-client.tsx:163,184,206,214,239,258`) —
so this adds no new vocabulary, only the join.

## Verification (recorded)

- `npm run typecheck` → **clean**.
- `npm test` → **292 pass, 0 fail** (285 before + 7 new in `lib/store-refusal-rules.test.ts`).
- **The forced failure, live** — the task's own verify: the store pointed at a place it cannot work,
  in a scratch run (`.mts`, config set in-script so it *cannot* reach the real database). Both
  branches, both refused, neither thrown — the readings are in `TASK-005-witnesses.md`.
- Dev server smoke: `/office`, `/office/inventory`, `/office/drafts`, `/office/enquiries`,
  `/office/settings`, `/office/car`, `/office/activity` → **200**; no errors in the dev log.
  (`/office/states` → 404: the registry lives under `/office/settings` — and its 404 is Task 9's.)
- **Not run:** `npm run build` — the dev server holds `.next` on `:3210`; the build is the gate's job
  (Gate A / Task 43), and the plan's verify for this task does not call for it.
- **Not driven:** a *successful* write on the live store through a real form. The success path is
  unchanged by construction (each call site keeps its statement, its params and its return), it is
  covered by the 292 tests, and the live drive of a write is Task 4's own evidence.

## Findings — to report, not silently absorb

1. **`app/office/actions/state.ts` still throws on a store failure** (`:114,138,203`). It is the other
   registry editor and it is **not** in this task's file list. It does *not* have the §5 defect: its
   client (`registry-editor.tsx:93`) catches the rejection and reports *"The store could not be
   reached — try that again"* **in place**. So the shell is not wiped; the words are right. Left as-is
   rather than drifting outside the approved file list — say the word and it folds in.
2. **`createCar`'s post-call guard can still throw** (`app/office/actions/car.ts:88`). The statement
   ends `SELECT ref FROM new_car UNION ALL SELECT ref FROM car WHERE id = $1`
   (`lib/car-create.ts:94-96`), so the ordinary repeat **is** covered — the fallback returns the
   existing ref. The retry-after-a-lost-reply case is the one still open: when the first request is
   still in flight the second's `ON CONFLICT (id) DO NOTHING` waits, the first commits, and the
   fallback `SELECT … FROM car WHERE id = $1` runs under this statement's own snapshot — it cannot
   see a row committed after that snapshot, so the statement can return **no row**, and
   `throw new Error("createCar: the store returned no reference for the new car")` fires: a store
   failure reaching a boundary. *(Reasoned from the statement's shape and READ COMMITTED statement
   snapshots — not yet verified at runtime.)* Note `lib/store-guard.ts:18` claims every write is
   `ON CONFLICT … DO UPDATE … RETURNING`, true of the others but **not** of this one; and
   `lib/draft-save-run.ts:134` already treats the same empty row as a refusal, so the two halves of
   the code disagree. Two candidate fixes, both outside this task's file list:
   (a) make the statement's repeat arm return the existing row (`DO UPDATE SET id = EXCLUDED.id
   RETURNING id, ref`) — a small change, and it makes the guard's own doc true; or (b) treat the
   empty row as a refusal. **Not done** — it changes a statement's semantics, which is the
   architect's call, not mine.
3. **`lib/tap.ts:23` (`recordTap`) throws**, but its only caller (`app/api/tap/route.ts:48-52`)
   already catches and answers **503** — and its doc explains why it must not be retried (a tap is an
   event, not a state). Left alone deliberately.
4. **`enquiry.ts:224` and `:190` are reads inside write actions** and can still throw; their clients
   catch and report in place (`enquiries-client.tsx:120`). Reads are Task 31/32's subject, not this
   task's.
5. **The wording is mine** — drafted, not approved. It is the on-disk family's own verbs joined to the
   on-disk clauses; if any of the joins reads wrong, it is one line per action to change.

## Addendum (2026-10-17) — the owner ruled, and the leftover throws are gone

**The ruling.** Asked about findings 1 and 2 as *"four places still fall over instead of saying 'sorry,
that didn't save'"*: the owner said **fold them in**. Checked properly, it was **six** reads of the same
bug, not four — reading `state.ts` whole turned up `recolourCarState` (`:154`) and `reorderCarStates`
(`:168`), which had **no `catch` at all**, so `storeQuery`'s throw left the server action on the first
store failure of any kind. Those two were the worst of the six, and they are in the same file the
ruling named, so they were fixed with the rest.

**What changed — six sites, two files, no new vocabulary.**

| file | site | now |
|---|---|---|
| `state.ts` | `addCarState` | `storeRefusal("label", "That state could not be added", error)` |
| `state.ts` | `renameCarState` | `storeRefusal("label", "That state could not be renamed", error)` |
| `state.ts` | `recolourCarState` | the call is wrapped; `storeRefusal("colour", "That colour could not be saved", error)` |
| `state.ts` | `reorderCarStates` | the call is wrapped; `storeRefusal("order", "That order could not be saved", error)` |
| `state.ts` | `removeCarState` | `storeRefusal("id", "That state could not be removed", error)` |
| `car.ts` | `createCar`'s empty-row guard | `storeRefusal("carId", "That car could not be saved", new Error(…))` |

Every phrase is the one `enquiry.ts` **already uses** for the same five state actions
(`:114,135,153,171,211`) — this adds no new vocabulary, it makes two files that do the same job say the
same words. Each action keeps its own, more precise refusals (the duplicate name `23505`, the state a
car still carries `23001`/`23003`) untouched: only the *fallthrough* changed.

The `createCar` guard now returns rather than throws, using the shared guard so the clause lives in one
place. It is passed a real `Error` carrying the true story, so the log line still explains itself and
the clause classifies to *refused* (`isTransientStoreError` is false for it) — never to *unreachable*.

**Witnessed live** (`:3210`, signed in, store = a throwaway copy carrying a trigger that refuses every
write to `car_state`; the copy was deleted afterwards):

| the write | what the screen said | the action's own POST |
|---|---|---|
| add | *That state could not be added — the store refused that change.* | **200** |
| rename | *That state could not be renamed — the store refused that change.* | **200** |
| recolour | *That colour could not be saved — the store refused that change.* | **200** |
| reorder | *That order could not be saved — the store refused that change.* | **200** |
| remove | *That state could not be removed — the store refused that change.* | **200** |

All five landed in the editor's own `role="alert"` paragraph, with the url, sidebar, topbar and links
intact, and **no Chrome launched** (6 → 6). The status is the decisive reading: a Server Action that
*throws* answers **500**, so a 200 is the proof the refusal was **returned**. The copy's store was then
read directly — still 7 states (4 primary, 3 secondary), nothing moved.

**And the happy path still works** (the copy's trigger dropped): an add really added a row (8 rows, no
refusal, POST 200) and a remove really removed it (back to 7, no refusal) — net-zero on the copy. The
fix did not break the success path.

**Still open, deliberately:**

- `removeCarState`'s holder **read** inside its `23001`/`23003` branch (`:198`) can still throw. It runs
  only *after* the store has answered, it is a read, and its client already reports a rejection in
  place — so it is the class finding 4 describes (reads), not this ruling's class.
- `enquiry.ts:224`/`:190` (reads inside write actions) — unchanged, as finding 4 said.
- `lib/tap.ts:23` — unchanged, as finding 3 said.
- **Not runtime-verified:** the `createCar` empty-row path itself. The race needs a concurrent create
  and was not staged; what *was* verified is its ordinary-repeat arm (the statement returns the row the
  first attempt made), and the guard now returns a refusal rather than throwing. Said plainly rather
  than implied.
