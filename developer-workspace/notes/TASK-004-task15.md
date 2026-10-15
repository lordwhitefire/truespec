# TASK-004 · Task 15 — Car state editor writes the registry (secondary only)

**Date:** 2026-10-15 · **Status:** done · **Commit:** (this task)
**Authority:** `openspec/tasks/TASK-004/task.md` truth 10 (the registries), design **D15** (four
primaries, secondary states, `section` ≡ primary state), truth 15 (both editors read real rows),
**D18** (resilience/idempotence). Plan row 15.

**What was asked.** The Settings screen's car-state editor must stop being a demo. It must be the
store's `car_state` registry: the owner can **add, rename, reorder and recolour secondary states**,
the **four primaries are not** addable, renamable or deletable, **deleting an occupied state is
refused by the store with the reason shown**, a secondary carries **no section and no new-arrival
flag**, and **two states never share a name across both kinds**.

---

## What was built

### The statements — `lib/car-state.ts` (new)

Five statements and one lookup, plus the `RegistryState` row shape the editor renders. Every write
carries `kind = 'secondary'` in its **own** `WHERE`, so a primary state is out of reach at the
statement level — with the store's `car_state_primaries_are_final` trigger standing behind it, so
there are two guards and neither is the browser. The file has **no argument** for `section` or
`is_new_arrival` on any write, which is how "a secondary needs no section and carries no
new-arrival flag" is structurally true rather than merely checked.

| Statement | What makes it retry-safe (D18) |
| --- | --- |
| `carStateAddStatement` | the key is minted by the caller once; `ON CONFLICT (id) DO NOTHING` + a trailing `UNION ALL` lets a repeat still report the row. `sort = MAX(sort)+1` **among secondaries**, so a new state lands last. |
| `carStateRenameStatement` | `label IS DISTINCT FROM $2` — a repeat writes nothing and returns no row. |
| `carStateRecolourStatement` | `colour IS DISTINCT FROM $2`, same shape. |
| `carStateReorderStatement` | the **whole order** is the list sent, read with `jsonb_array_elements_text(…) WITH ORDINALITY`; a repeat moves nothing. |
| `carStateRemoveStatement` | the row's *effect* is idempotent — a repeat finds it gone and says so. |
| `carStateHoldersStatement` | the store's own reference count, asked **only after** a delete has been refused. |

The order is the list rather than a swap of neighbours on purpose: a fresh registry has every
secondary at `sort = 0`, so swapping two equal values would be a silent no-op; the list form writes
positions 0..n-1 and survives a drag to any position. A primary in the list is simply not matched.

### The actions — `app/office/actions/state.ts` (new)

`addCarState`, `renameCarState`, `recolourCarState`, `reorderCarStates(ids)`, `removeCarState(id)` —
the house pattern (`requireOfficeSession`, a `{ ok } | { ok: false, errors }` result, `revalidatePath`
for the four office paths a state touches). Values are read the way a Server Action must read them:
`FormDataEntryValue` in, validated, refused with a field and a message before the store is asked. A
name is collapsed to single spaces and capped at 40 characters; a colour must be the six-digit hex
the store's own `car_state_colour_hex` check accepts; an id must be a UUID; an order must be a
non-empty array of UUIDs, capped at 200.

**Two refusals come from the store and are reported as the store means them:**
- a name another state carries → `23505` on `car_state_label_unique` → *"Another state already has
  that name — names are shared by both kinds."* (The constraint covers **both** kinds, which is
  exactly the AC.)
- deleting a state a car carries → the `ON DELETE RESTRICT` keys → *"N cars still carry this state —
  move them out first."*, where **N is the store's own count** (`carStateHoldersStatement`), not the
  screen's.

### The reader — `getCarStateRegistry()` in `lib/office.ts`

One query, `ORDER BY kind, sort, label` (primaries first), resolving a primary's section through the
one rule and giving a secondary `null`. `cars` counts **every** car row pointing at the state —
tombstoned ones included — because that is exactly the set `ON DELETE RESTRICT` refuses on, so the
number beside a state and the store's refusal can never disagree.

### The screen — `app/office/(shell)/settings/car-state-editor.tsx` (new)

The four primaries render as **locked rows** (a `.edro` cell: a lock glyph and the name, no field),
with their colour and their car count and no affordance to change them. Below them the owner's own
states are full rows: a drag/keyboard grip, the name, a colour picker with a live sample, the count,
and a delete button.

Edits are written when they are finished — a name when the field loses focus (or Enter), a colour
when the picker does, an order when a row is dropped or arrowed, a delete when it is clicked. There
is no unsaved state and no Save button: what the screen shows is the store. A refused edit bumps
that row's key, which puts the field back to what the store holds, and shows the store's reason.
Text inputs stay enabled during a write; only the delete buttons disable, so typing in one row is
never interrupted by a write in another.

`Add a state` mints a placeholder name the registry does not already carry (`New state`, then
`New state 2`, …) and focuses it, so the owner types the real name straight away — a placeholder
cannot collide with the store's unique name.

### What was deleted, not left behind

- `state-seeds.ts` lost its **car** half (`CAR_STATES`); the enquiry seeds and `CUSTOMER_STATES` /
  `CUSTOMER_COUNTS` stay, and are Task 16's.
- `state-editors.tsx` lost its whole **car mode** — the per-state section dropdown and the "show as
  a tab" switch were the pre-D15 model, and the car editor now reads the store. It is the enquiry
  editor only, still in-memory.
- `settings.css` lost the dead pre-D15 rules (`.edtbl-car` and its grid override, `.edsection`, the
  `.edswitch`/`.edtrack`/`.edknob` switch, `.edh-tab`) and gained `.edro`. Reused throughout, no new
  layout.

Neither component is a second, staler answer to a question the store already answers.

---

## Decisions taken here (with their reasons)

1. **The store is the delete guard, so the delete button is never disabled for being "in use".**
   The AC says deletion is *refused by the store, with the reason shown*. A client-side disable would
   mean the store's refusal is never exercised and its reason never shown. So the button is always
   offered, the action always attempts it, and the reason comes back from the store. The count
   column stays, now as information rather than a gate.
2. **`cars` counts tombstoned cars too.** The FK refuses on every referencing row, tombstones
   included. Counting only live cars could show `0` beside a state the store will not delete — the
   number would contradict the refusal. The count now matches the guard exactly.
3. **The order is the whole list, not a swap.** See above; it does not depend on existing sorts
   being distinct, which they are not.
4. **Only the omniscient columns are drawn.** The registry has `colour` and `sort` but no read path
   exposed them; `RegistryState` adds them because the editor is the one screen that needs them. The
   other office screens keep their narrower shapes (`OfficeState`, `OfficeSecondaryState`), untouched.
5. **Registry edits write no `activity_event`.** The activity feed is about cars and enquiries
   (`car.created`, `car.updated`, `car.sold`, …); nothing in truth 10 or truth 15 asks for a row per
   state rename. Left as a gap rather than an invention.
6. **A new state's default colour is `#8a9096`.** The old seed used `""` for "no colour yet"; the
   store requires a hex, so "unset" is now a neutral grey the owner recolours.

### Store finding — the delete refusal is `23001`, not `23503`

Postgres reports `ON DELETE RESTRICT` as **23001 `restrict_violation`**, while `NO ACTION` reports
**23503 `foreign_key_violation`**. The store's keys are `RESTRICT`. The action catches **both** (the
refusal is the same one), and the witness pins the real code. Had the action only matched `23503`,
the occupied-state refusal would have escaped as a 500 *and* the delete would have looked like a bug
rather than a rule — this was caught by the witness, not by reading the schema.

---

## Left alone on purpose

- **The enquiry-state editor is still in-memory** — Task 16's, by the plan's own split.
- **No activity row for a registry edit** (decision 5).
- **Case-different names are allowed.** `car_state_label_unique` is case-sensitive, so `landed` and
  `Landed` can coexist. That is the store's rule; inventing a stricter one on the screen would be a
  second, invisible rule the store does not have. Noted, not changed.
- **The read-side vocabulary sweep** from Task 13/14 (sold-ness derived from `sale`) still stands.

---

## Verification

Five gates, in order, all green:

| Gate | Result |
| --- | --- |
| `npm run leak-check` | **PASSED** — 18 public routes, no office state label on any of them |
| `npm run typecheck` | **clean** |
| `npm test` | **121/121** (was 114; `lib/car-state.test.ts` adds 7) |
| `npm run build` | **clean** (`/office/settings` 6.55 kB) |
| `npm run store-freshness` | **PASSED** — none of 9 store-reading routes prerendered, no cached response |

**Witness — `developer-workspace/scripts/task-004/state-registry-check.ts`, 31/31 PASSED against the
live store, inside one transaction that was rolled back** (the store is left exactly as it was). It
runs the *same* statements the actions run and proves:

- a new state *is* a secondary, carries no section and no arrival flag, and lands after every
  existing one (40 < 41 < 42); a retry adds no second row;
- rename and recolour write it and a repeat writes nothing; the other secondary is untouched;
- the order writes the list sent (2 rows moved), a repeat moves 0, and a primary's `sort` does not
  move (10 → 10) even when a primary id is in the list;
- rename, recolour and remove each match **no row** on a primary, and the primary is unchanged after;
- a name a primary carries and a name a secondary carries are both refused `23505`
  (`car_state_label_unique`); a secondary handed a section is refused `23514`
  (`car_state_kind_section_ck`);
- a state a car carries cannot be deleted — `23001` (`car_secondary_state_state_id_fkey`) — the
  reason's count is the store's own `1`, and the car is **still** in the state afterwards;
- a state nothing carries is removed cleanly, and a repeat finds nothing;
- after `ROLLBACK`, the store holds no trace.

Note on the rig: an expected refusal aborts the whole PG transaction, so each refusal probe is fenced
in a `SAVEPOINT` / `ROLLBACK TO SAVEPOINT`. Without it every later statement failed `25P02` — the
first run showed this, which is why the harness now does it.

---

## Not verified

- **The office screens in a real browser.** `/office/settings` is Clerk-gated
  (`x-clerk-auth-status: signed-out`) and there is no component-test harness, so the editor's
  interactions — commit-on-blur, the drag grip, the arrow keys, the lock rows, the refusal message
  landing in `.err.on` — were **not** exercised in a browser. What *is* proven is everything below
  the screen: the statements, their refusals, the reader, and that the page builds and does not leak.
  This needs a signed-in Clerk session, which is the owner's to give.
- **A cold rebuild** (`drop → migrate → seed`). No migration was added by this task; the store was
  read and written forward only.
