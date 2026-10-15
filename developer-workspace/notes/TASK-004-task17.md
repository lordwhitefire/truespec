# TASK-004 · Task 17 — Dashboard feed panels real; seeds retired

**Date:** 2026-10-15 · **Status:** done (gates green, committed)
**Authority:** `openspec/tasks/TASK-004/task.md` truth 15 (every office screen reads real rows — the
dashboard's taps/activity panels named), truth 16 (a blank store must not look like a broken one),
truth 11 (figures from the one shared rule); `openspec/changes/truespec-architecture/specs/dashboard/spec.md`
(one counting rule; every money figure states its reach; recent taps and recent activity);
design **D12** (labels, not stages), **D20** (`activity_event` is `kind` + `subject`); divergence 4
(a stale comment is corrected in passing). Plan row 17.

## What was built

**`lib/activity-feed.ts`** (new) — the wording rule an activity row is drawn by, moved out of the
client-only log and made importable from both sides: `ActivityEntry` (the row as a screen draws it),
`ActivityEvent` (the row as the store holds it), `ACTIONS` / `CATEGORIES` / `categoryOf` / `wordOf` /
`categoryLabel` / `operator`, and `toActivityEntries(events, now)`. `now` is passed in, so one render
words every row against one instant and the mapping is a pure function a test can pin. A kind this
build does not name reads as itself, never as a blank or a guessed word.

**`lib/activity-feed.test.ts`** (new, 6 tests) — every named kind words and chips consistently and its
chip is one the filter offers; an unnamed kind reads as itself under `Other`; every kind
`actions/car.ts` can write is worded; the avatar; the day/title/clock mapping in UTC, with the instant
carried through so a panel can still say how long ago; and an empty feed maps to nothing.

**`lib/office.ts`** — `getOfficeTaps()` (+ `OfficeTap`, `TAP_LIMIT = 200`), the visitor half of the
same story: newest first, bounded, with the car's **own name resolved by the ref**
(`LEFT JOIN car ON c.ref = t.car_ref`). A tap's ref outlives the car (`0011`, `0004`), and `car.ref` is
unique and never reassigned (`0018`), so a tap on a removed car keeps its code and reads no name
rather than the wrong one; a general tap (`car_ref` null) has neither. `getOfficeActivity()` is
unchanged — it is Task 16's read and it is reused, not copied.

**`app/office/(shell)/page.tsx`** (the dashboard) — all three reads in one `Promise.all`:
`getOfficeDashboard()` (the one shared counting rule), `getOfficeActivity()`, `getOfficeTaps()`.
Both feed panels now draw real rows, worded and timed by the shared rule, with a **real empty state**
that says it is empty rather than standing in as real-looking rows (truth 16). The dead
`Show older entries` / `Show all taps` buttons are gone (nothing was behind them; the taps list is
Task 19's). The stale comment claiming the panels "stay presentational" is corrected (divergence 4);
the fabricated header date is now the real UTC day; the fabricated `arriving Nov – Jan` sub-line is
now a true statement.

**Where the "5 open enquiries" went.** It is **gone, not replaced by another enquiry figure**, and
that is a decision already on the record, not a choice made here: the approved UX implementation plan
says *"Badges and filters read per state only … no 'open enquiries' total"*
(`design-workspace/decisions/ux-implementation-plan.md:48`), and truth 13/D12 make "open" a stage
claim the store does not hold. The design record also names the dashboard's counts as the stock
counts, so the third strip cell is now **Landed** — the same three the inventory offers as its own
tabs (Available / On Order / Landed this year) — with every number from `countStock`. Sold is counted
separately where the spec puts it, on the profit card.

**CSS** (`office.css`, the dashboard's own stylesheet): `.tag.del` and `.tag.other` added, so a real
`car.deleted` row and an unnamed kind draw a chip instead of an unstyled span; `.feed-empty` added for
the two panels' empty state.

**`activity/page.tsx` / `activity-client.tsx`** — the log now imports the shared wording rule rather
than holding its own copy. Its own behaviour and markup are unchanged.

## Verified

- **Five gates, in order, on the finished code:** `leak-check` — PASSED (all public routes, no cost,
  currency or profit value, no office state label) → `npx tsc --noEmit` clean → `npm test` **144/144**
  (138 + 6 new) → `npm run build` clean (`/office` 178 B, `/office/activity` 1.76 kB, `/office/enquiries`
  2.78 kB, `/office/settings` 6.34 kB) → `npm run store-freshness` PASSED (none of 9 store-reading
  routes prerendered, no cached db response).
- **Witness `developer-workspace/scripts/task-004/dashboard-feeds-check.ts` — 19/19 PASSED**, run
  against the live store with `--conditions=react-server` so the **real read functions** load.
  Measured: an activity row read back by id with its own kind, subject, ISO instant and null actor,
  newest first and within `ACTIVITY_LIMIT`, and worded by the shared rule (`car.updated` → "Edited a
  car"); a tap on `TS-1001` read back with `carRef` `TS-1001` and the car's own name
  (`2021 Camry XSE V6`, resolved from `car`), a general tap with neither ref nor car and still its
  page, and a tap on a ref no car holds (`TS-0000`) keeping the ref with no name; one tap first and
  within `TAP_LIMIT`.
  **This witness writes and removes exactly its own rows** (fixed ids, deleted by id — never by a
  pattern), because the store holds no tap and no activity row, and a `pg` transaction could not prove
  the read the screens use (the read goes over the Neon HTTP driver on its own connection). It checks
  its own footprint at the end: back to `0 tap(s), 0 activity row(s)`.
- Run line: `node --conditions=react-server --dns-result-order=ipv4first --import tsx developer-workspace/scripts/task-004/dashboard-feeds-check.ts`.

## Not verified

- **The dashboard was not driven in a browser.** Every office route is Clerk-gated and needs the
  owner's session. What stands behind the page is the build, the typecheck, the two real reads proved
  above, the shared wording rule's tests, and the reads being the real functions.
- **The panels are empty on the live store** (0 taps, 0 activity rows), so what is seen on `/office`
  today is the honest empty state, not rows — the seed authors neither. Reported, not hidden. The taps
  panel stays empty until the tap route is built (Task 19); the activity panel fills as the owner
  changes cars.

## Findings worth keeping

- **`state-seeds.ts` was already retired in Task 16**, so the AC's verify ("no longer imported
  anywhere") holds and nothing was left to delete here.
- **The dashboard's own stylesheet is `office.css`** and it is imported by the dashboard page alone —
  each office page carries its own CSS, so a tag colour added here does not reach the log screen (and
  the log's copy is unchanged).
- **A real read of an empty store cannot be proved from inside a transaction.** The reads take their
  own HTTP connection, so a witness proves them by writing, reading, and removing its own rows — the
  one exception to the roll-back witness pattern, and it was kept to that footprint on purpose.
- The `arriving Nov – Jan` sub-line and the fixed header date were **both fabricated** and both sat in
  the strip/header this task was already touching; the first became `waiting to arrive`, the second the
  real UTC day. Flagged here because neither was named in the AC.
