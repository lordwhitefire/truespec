# TASK-005 · witnesses — the live readings

What was actually run, and what it actually answered. One section per task, appended as the task is
built. A claim that is not in here was not driven.

Environment, each time: the automation Chrome is **not** listening on `:9222` (attach-only rule —
never start one), so a live drive is recorded only where the check does not need a browser.

---

## Task 3 — a failed write refuses, never throws

**The task's own verify:** *"a live forced failure (store pointed at a dead port in a scratch run)
returns a refusal — never a throw."*

Scratch run: `developer-workspace/scripts/task-005/dead-store-refusal.mts`. It points the store at a
place it cannot work, sets its whole config in-script (so it **cannot** reach the real store), calls
the new write wrapper exactly as an action does, and reports which of the two happened. Nothing is
written anywhere.

```
node --conditions=react-server --import tsx \
  developer-workspace/scripts/task-005/dead-store-refusal.mts <url> <unreached|refused>
```

### Case 1 — the store cannot be reached (the cold-compute case)

```
DATABASE_URL = postgresql://dead:dead@dead-store.invalid/dead
```

```json
{
  "case": "unreached",
  "outcome": "REFUSED",
  "ms": 17517,
  "message": "That car could not be deleted — the store could not be reached. Try again.",
  "threw": null
}
```

The real failure underneath, from the run's own log: `getaddrinfo ENOTFOUND api.invalid`. It was
classified transient, so `runWithRetry` **did** retry — 5 attempts, `ms` 17517 ≈ 1+2+4+8 s of
backoff — and then threw. `storeQueryRefusing` caught it. **Refused in place; nothing thrown out.**

### Case 2 — the call itself is refused (permanent)

```
DATABASE_URL = postgresql://dead:dead@127.0.0.1:9/dead
```

```json
{
  "case": "refused",
  "outcome": "REFUSED",
  "ms": 126,
  "message": "That car could not be deleted — the store refused that change.",
  "threw": null
}
```

`ms` 126 — **no retries**, as the classification intends: sending it again would only make the
person wait for the same answer. And the words deliberately **do not** offer a retry.

### What the two readings establish

- A store failure is a **refusal**, in both of its kinds — never a throw. (D32 / the AC.)
- The person gets one of exactly two clauses, decided by the cause, and neither claims a safety that
  was not checked. (DR25.)
- What is **not** established here: that a refusal reaches the screen. That is Task 4's witness, and
  until it is driven this is only half the guarantee.

### Observed, and worth keeping (2026-10-17)

The Neon HTTP driver does **not** fetch the host it is given. It derives its own API host from the
connection string: `127.0.0.1:9` became `https://api.0.0.1/sql`, and `dead-store.invalid` became
`api.invalid`. So "pointing at a dead port" does **not** by itself produce a network failure — it
produced `ERR_INVALID_URL` (`ms` 126, permanent). The genuine `fetch failed` a cold compute produces
came from a hostname that cannot resolve. Anyone repeating this check should use a host, not a port,
and should expect the derived name in the error.

## Task 4 — the refusal reaches the screen the person is in

This is the half Task 3 left open: a store failure becomes a refusal **and the refusal lands in the
screen the person is in**, with the office chrome intact.

### The car form — a real store refusal on the live store (2026-10-17, `:3210`, signed in)

Run: `node developer-workspace/scripts/task-005/refusal-in-place.mjs` (attaches to the Chrome on CDP
:9222, never launches one; readings in
`scripts/task-005/runs/refusal-in-place/refusal-in-place.json`).

The failure is real, not simulated, and net-zero. The form was given a **Mileage of `9999999999`**. The
app's own reader accepts any run of digits with no ceiling (`lib/car-input.ts:97-101,149-152`), the
field is `type="text"` with no `maxLength` (`car-client.tsx:536-544`), and `car.mileage` is a Postgres
`int` (`migrations/0003_car.sql:16`) — so Postgres refuses the statement (SQLSTATE 22003) and the whole
statement rolls back. `car.ts` has no special catch for that code, so it falls into
`storeQueryRefusing` (`lib/store-guard.ts:82-92`) — the code under test.

| what was read | value |
|---|---|
| did it arrive in place | yes — `div[role="alert"]`, `<b>Could not save.</b>` + one `<li>` |
| the words | **That car could not be saved — the store refused that change.** |
| the action's own response | POST to `/office/car/new` → **200** (a returned refusal, not a 500 / a boundary) |
| url afterwards | `/office/car/new` — unchanged |
| the chrome | `aside.side` and `nav.sn[aria-label="Office"]` still present; "Signed in as rema6…"; all 7 nav links |
| the form itself | still there and still typed (`#f-brand` = `ZZTEST-DEMO`) |
| cars before → after | 25 rows / "25 cars — 24 in stock, 1 sold" → **identical**; 0 rows match `ZZTEST-DEMO` |
| Chrome launched | 6 → 6 (none) |

**Established:** a store failure in a write action now arrives as the action's own words in the form's
own result panel, and the chrome is **not** replaced. The measured research-plan §5 defect — a rejected
Server Action inside `useTransition` replacing the whole office shell — does not happen.

### The settings save and the inventory delete — a store that refuses only the write

Neither can be forced from its own form: `setting.value` is unbounded `text` with no CHECK and the app
already applies every rule the store would (`lib/settings.ts:123-143`), and `deleteCar` writes only the
nullable `deleted_at` (`lib/car-delete.ts:36-49`). A dead store cannot be used either, because
`checkOfficeSession` reads the store before any write (below) — the failure would come from the session,
not the write. So the store itself was made to refuse the write, on a copy:

- a throwaway branch **`task-005-witness`** (`br-rapid-king-b287u6zy`) was branched from `production`;
- a `BEFORE INSERT OR UPDATE OR DELETE` trigger on `car` and `setting` there raises SQLSTATE `42501`,
  while **reads and the `session`/`office_user` tables are untouched** — the page still renders and the
  session check still passes, the store simply refuses the write;
- the dev server was started on `:3210` with `DATABASE_URL` pointed at that branch (proven from the
  running process, which carried `TASK005_STORE=witness` and the branch host);
- afterwards the branch was deleted and the dev server restarted on the live store.

Runs: `refusal-in-place-2.mjs` (settings) and `delete-in-place.mjs` (delete).

| what was read | a settings save | an inventory delete |
|---|---|---|
| where it landed | the card's own `p.err` **and** the toast | the toast |
| the words | **That setting could not be saved — the store refused that change.** | **That car could not be deleted — the store refused that change.** |
| the toast's `role` | — (read inline) | **`alert`** |
| the action's own response | POST → **200** | (same server, same action path) |
| url afterwards | `/office/settings` — unchanged | `/office/inventory` — unchanged |
| the chrome | sidebar, nav, all 7 links, "Signed in as rema6…" | sidebar, nav, all 7 links, "Signed in as rema6…" |
| net-zero | reloaded: tagline still `Cars you can trust, prices you can see` | row back to **25** after the optimistic removal |
| Chrome launched | 6 → 6 | 6 → 6 |

**The store was checked directly afterwards, not only the screen:** `production` 25 cars / **0
tombstoned**; the branch 25 cars / 0 tombstoned; production's `setting` rows unchanged, no stray key. The
live store was never reachable from the witness server.

**Established:** in all three places a store failure arrives as the action's own words in the screen the
person is in — the car form's `role="alert"` panel, the settings card's inline error, the inventory's
`role="alert"` toast — with the chrome intact, the store-unreachable page never shown, and no claim that
nothing was lost (DR25). The research-plan §5 defect does not happen.

### Facts for anyone repeating this

- **`checkOfficeSession` reads the store** (`lib/session.ts:108`, `storeQuery` on the `session` table).
  A store that is dead for *reads* fails at the session check **before** any write, so the throw comes
  from the session, not the write. A "point the dev server at a dead host" witness therefore proves
  nothing about the write path — the store must read fine and refuse only the write.
- **`REVOKE … FROM neondb_owner` does not deny `neondb_owner`.** The ACL really does lose the privileges
  (`relacl` became `rDxtm` — no `a`/`w`/`d`) and the role could still `INSERT`: Neon's default role
  carries privileges that bypass the ACL. A restricted login role created by plain SQL was refused by
  Neon's proxy (`password authentication failed for user`). What worked was a `BEFORE` trigger raising a
  SQLSTATE — no new role, no credentials.
- **Wait on the toast's text, not on the toast.** `#toast` exists even when empty, so
  `waitFor({state:"visible"})` resolves before the response arrives, and the row is optimistically
  removed while the call is in flight — a first attempt at the delete read `role="status"` and 24 rows
  and looked like a success. Waiting for `#tmsg` to carry text, then reading role + words + rows, is the
  reliable signal.

## The registry editor's writes — the owner's ruling, carried out (2026-10-17, `:3210`, signed in)

The ruling: findings 1–2 of Task 3 fold in. Six throw sites, not four — `state.ts`'s five writes
(`recolourCarState` and `reorderCarStates` had **no `catch` at all**) and `createCar`'s empty-row guard.
What changed and why is in `TASK-005-task3.md` §Addendum.

**The store.** A throwaway copy (`task-005-rulings`, `br-fragrant-sun-b2mi3z1d`, branched from
`production`) carrying a `BEFORE INSERT OR UPDATE OR DELETE` trigger on `car_state` that raises
`42501` — so the screen renders, the session check passes, and **only the write** is refused. Proven
before the drive: `SELECT count(*) FROM car_state` → 7, and a probe `INSERT` → `ERROR [42501] the store
refused that change`. The dev server was pointed at it (the running process carried
`TASK005_STORE=rulings` and the branch endpoint), then restored to the live store, then the copy was
deleted.

Run: `node developer-workspace/scripts/task-005/states-in-place.mjs` (readings in
`runs/states-in-place/states-in-place.json`).

| the write | the words the screen showed | its own POST |
|---|---|---|
| add | **That state could not be added — the store refused that change.** | **200** |
| rename | **That state could not be renamed — the store refused that change.** | **200** |
| recolour | **That colour could not be saved — the store refused that change.** | **200** |
| reorder (↑/↓ on the grip) | **That order could not be saved — the store refused that change.** | **200** |
| remove | **That state could not be removed — the store refused that change.** | **200** |

Each landed in the editor's own `p.err.on[role="alert"]` inside `.edwrap`; the url stayed
`/office/settings`, and the sidebar, topbar, all links and *"Signed in as rema6…"* were present after
every one. **Chrome launched by the run: none (6 → 6).**

**The status is the decisive reading, not the words.** A Server Action that *throws* answers **500** —
and before the fix that is exactly what these five did, which is why the editor's `catch` showed the
other sentence (*"The store could not be reached — try that again"*). Every POST here answered **200**:
the refusal was **returned**.

**The store was read directly afterwards:** still 7 states (4 primary, 3 secondary) — five refused
writes moved nothing.

**And the success path still works.** With the copy's trigger dropped
(`states-success.mjs`, `runs/states-in-place/states-success.json`): an add really added (7 → **8** rows,
no alert, POST 200) and a remove really removed it (8 → **7**, no alert) — **net-zero on the copy**.

**Not established:** the `createCar` empty-row path itself. Its race needs a concurrent create and was
not staged; the guard now returns a refusal rather than throwing, and the ordinary-repeat arm (the
statement returning the row the first attempt made) is what was read.

## A save that changed nothing says so (2026-10-17, `:3210`, signed in, the **live** store)

Task 5. Car **TS-1001**, a demo car (`is_demo = true`). Drive: `car-save-reports.mjs`; readings in
`runs/car-save-reports/car-save-reports.json`.

| the save | what the screen said | its own POST |
|---|---|---|
| nothing changed | **Nothing changed.** — the result panel *and* the toast | **200** |
| one field changed (the arrival note) | **Saved as TS-1001. The showroom updates immediately.** | **200** |
| the field put back | **Saved as TS-1001. The showroom updates immediately.** | **200** |

The url stayed `/office/car/TS-1001`; no red box ever appeared; the sidebar, nav and *"Signed in as
rema6…"* were intact after every save; **no Chrome launched by the run (6 → 6)**.

**The store, read directly before and after:** `car.version` 1 → **3**; `activity_event` rows for
TS-1001 2 → **4**; `car.arrival_note` `null` → **`null`**; office cars 25 (25 demo) → **25 (25 demo)**.
The two *real* saves are the only writes — **three no-op saves were clicked and the version rose by
exactly two** — so the no-op words are true at the store, not only on the screen.

**A harness fact, recorded because it cost a run:** a click sent **before React hydrates** is swallowed
and the browser submits the form itself — a GET that rewrites the url with every field in it (three
such GETs, no POST anywhere). In dev the car page is 1779 modules compiled on demand;
`car-hydration-probe.mjs` watched `<nextjs-portal>` appear **5424 ms** after `domcontentloaded`, with no
portal and `window.next` undefined at 3900 ms. The drive now waits on that portal and on each save's
own POST response. The toast is also a `role="status"`, so the result panel has to be found from the
save button rather than by role alone (`car-save-probe.mjs` listed both, and their words).

## A settings card that changed nothing says so (2026-10-17, signed in, the **live** store)

Task 6. `settings-save-reports.mjs noop`; readings in `runs/settings-save-reports/noop.json`. The
WhatsApp card, stored `+2348146927170`, typed as **`0814 692 7170`** — a real text difference that is no
change to the setting itself:

| reading | value |
|---|---|
| the *"Unsaved change"* note | **shown** (so Save was pressable) |
| the toast, recorded as it appeared | **“Nothing changed.”** — never a claim of a save |
| its own POSTs | **200, 200** (action + refresh), no page reload |
| the card's audit line before / after | *"Updated 16 Oct 2026, 11:55"* / **the same** |
| the input after the save | back to what the store holds (`+2348146927170`) |
| the store's three rows before / after | **byte-identical** — `whatsapp_number.updated_at` still `2026-10-16T11:55:53.863Z` |

The no-op wrote **nothing at all**. The changed arm was driven on a throwaway copy
(`br-sweet-wind-b2u6d5yg`, deleted afterwards): the tagline really changed → **“Tagline saved. The home
page updates immediately.”** (POST 200, audit line 18:52 → 18:53, `updated_at` 18:52:24 → 18:53:55),
then put back → the same words and the original value restored. In the same copy run the WhatsApp no-op
again said *“Nothing changed.”* and the copy's WhatsApp row stayed unmoved. No Chrome launched by any run
(6 → 6).

The statement's three arms were also read directly at the store on the copy
(`settings-statement-probe.mjs`): a key with no row → written, `changed true`; a different value →
written, `changed true`, timestamp moved; the same value → **`changed false`, timestamp unmoved**; one
row answered each time.

**Harness facts, recorded because they cost three runs:** the card's toast hides after four seconds, so
its words must be **recorded as they appear** (the first attempt read an empty string); a recorder
armed on the toast node watches a node React may replace — the working one observes `document.body`;
and a toast still on screen when the next step arms gets credited to that step (the first copy run's
tagline step opened with the WhatsApp step's words — each save now waits for the toast to drop `show`
before arming).

## A restoration reads as a restoration (2026-10-17, signed in, the **live** store)

Task 7. `activity-delete-undo.mjs TS-1011`; readings in `runs/activity-delete-undo/TS-1011.json`.
One **demo** car deleted and the delete undone at once (net-zero: `deleted_at` null before and after;
the two events are the point):

| reading | value |
|---|---|
| the confirm dialog's words | *"…will be removed. You can undo for a few seconds."* |
| the delete | toast **“Mercedes-Benz C 300 AMG Line 2018 deleted.”**, POST **200**, table 25 → 24 |
| the undo | toast **“…restored.”**, POST **200**, table back to **25** |
| the store's two events | `car.deleted` **22:18:16.850Z**, `car.restored` **22:18:18.222Z** (1.37 s apart) |
| the log before → after | All **38 → 40** · Deleted **6 → 7** · Restored **6 → 7** · every other chip unmoved |
| the newest two rows | **“Restored a car TS-1011 · Restored”** above **“Deleted a car TS-1011 · Deleted”** (`tag res` / `tag del`) |
| counts vs rows | Deleted 7 = the seven rows chipped Deleted · Restored 7 = its rows · All 40 = rows rendered |

Until this change the same kind of pair read *"Restored a car … · Deleted"* and was counted under
*"Deleted 12"* — `runs/activity-read/before.json` keeps that reading (six deletes + six restores in
one facet; the store held 6 and 6). No Chrome launched (6 → 6).

## Gate A — the reporting layer, checked live (2026-10-17, signed in)

The plan's Gate A. `npm run typecheck` clean; `npm test` **295/295**. Then the two live checks:

**1. A forced write failure reports in place** (`refusal-in-place.mjs`; readings in
`runs/refusal-in-place/refusal-in-place.json`). A real fault, net-zero: the car form was given a
Mileage of **9999999999** — the app accepts any run of digits, Postgres refuses the value it cannot
fit an `int` (SQLSTATE 22003), the statement rolls back, and nothing is written. The form's own
result panel said:

> **“Could not save. / That car could not be saved — the store refused that change.”** (role alert)

- the action's own POST answered **200** — a refusal is *returned*, not thrown (a throw answers 500);
- the URL stayed on the form; the sidebar, nav and *"Signed in as …"* never vanished; the typed words were still there;
- the inventory read after: **25 cars — 24 in stock, 1 sold, 0 marked rows** — **net-zero: the refused car was never created**.

**2. A no-op save says nothing changed** (`settings-save-reports.mjs noop`): the WhatsApp card typed
as the stored number in another form → **“Nothing changed.”**, POST 200, the audit line unmoved, the
store's rows byte-identical (Task 6's full reading, re-driven here for the gate).

Both runs launched no Chrome (6 → 6).

## Task 8 — the status reading, and the wall it hits (2026-10-18, before any commit)

`notFound()` in the car page with a co-located boundary: the dead ref renders **the same view**
(crumbs, heading, paragraph, both ways forward, related shell, mobile bar, lightbox, overlay, toasts)
with the chrome and title intact — but the answer is **200**, in dev and in a production build
(`next start :3211`, stopped after the probe).

| reading | dev `:3210` | production `:3211` |
|---|---|---|
| a car (`TS-1001`) | 200 | 200 |
| the sold car (`TS-1025`) | 200 | 200 |
| a dead ref (`TS-9999`) | **200** | **200** |

The cause, isolated with a throwaway probe page (removed afterwards): with `app/loading.tsx` in place
both an async and a synchronous `notFound()` page answer **200**; with the file moved aside both
answer **404**. The root store-waking boundary (TASK-004, `7982435`, design D18) flushes the shell
while the page is still awaiting the store, and the status is fixed at that flush. Full record:
`notes/TASK-005-task8-blocked.md`. **Task 8 is paused for the owner's ruling.**

## Task 8a — the waiting line moved, the 404 freed (2026-10-18, dev `:3210`, live store)

| reading | value |
|---|---|
| `/` | **200** · the initial HTML carries the waking line |
| `/inventory` | **200** · the initial HTML carries the waking line |
| `/privacy` | **200** · no waking line |
| `/car/TS-1001` · `/car/TS-1025` | **200** · no waking line |
| `/car/TS-9999` | **404** (`curl -sI` and `curl` agree) |
| chrome, before → after | `#site-header` **identical** (1 578 chars), `#site-footer` **identical** (2 406), `a.fab` **identical** (215 on `/`, absent on the car page), the number `+2348146927170` — normalising React's `<!--$-->` markers and the ticker's active-line class |

Snapshots: `runs/chrome-before/{car,home}.json`, `runs/chrome-after/{car,home}.json`, taken with
`chrome-snapshot.mjs` (attach-only). Typecheck clean · 295/295 · no Chrome launched (6 → 6).

## Task 8 — a dead car answers a real 404 (2026-10-18, dev `:3210`, live store)

`car-404.mjs`; readings in `runs/car-404/live.json`.

| reading | value |
|---|---|
| a car, `/car/TS-1001` | **200** · *“2021 Toyota Camry XSE V6 \| TrueSpec Automotive”* |
| the sold car, `/car/TS-1025` | **200** · *“That one found a new owner”* |
| a dead ref, `/car/TS-9999` | **404** · *“Car not found \| TrueSpec Automotive”* |
| the view | crumbs *Home › Not found* · `h1` *“We could not find that car”* · the paragraph · **Message Umar** → `wa.me/2348146927170…` · **See all cars** → `/#cars` |
| the chrome + shells | header ✓ footer ✓ `footer#contact` ✓ · related ✓ mbar ✓ lightbox ✓ overlay ✓ both toasts ✓ · *“More cars”* |
| the URL | `http://127.0.0.1:3210/car/TS-9999` — the typed ref kept, no redirect |
| `curl -sI` / GET | **404 / 404** (dead) · 200 / 200 (live and sold) |

The view's words and structure are the ones recorded before the change (`05:467-479`); the JSX moved
verbatim into `car-parts.tsx`. No Chrome launched (6 → 6). Typecheck clean · 295/295.

## Task 9 — the office's own not-found family (2026-10-18, dev `:3210`, live store, signed in)

`office-404.mjs`; readings in `runs/office-404/live.json`; signed-out matrix by curl.

| reading | value |
|---|---|
| `/office/nonsense` (signed in, browser) | **404** · office view inside the shell (sidebar, topbar, *“Signed in as …”*) |
| `/office/car/nonsense-ref` (signed in, browser) | **404** · same view; the URL keeps the ref |
| the view's words | *“That page isn't in the office”* · *“No office screen matches that address. Nothing was lost.”* · *“Back to the dashboard”* → `/office` |
| office routes sweep (browser) | `/office` 200 · inventory 200 · activity 200 · drafts 200 · enquiries 200 · settings 200 · car new 200 · car editor 200 — each with the shell |
| `/office/car` | followed the **307** → `/office/inventory` |
| `/nonsense` (site) | **404** · *“We couldn't find that page”* · chrome-less · two row links + home link — **not merged** |
| signed-out curl, office addresses | **307 → /office/sign-in** for `/office`, inventory, activity, drafts, enquiries, settings, car, car/new, car/nonsense-ref, nonsense, nonsense/deeper/still, account · `/office/sign-in` 200 |
| the waking line | in the served HTML of `/office`, `/office/inventory`, `/office/activity`; none in `/office/car/TS-1001` or the two 404s |
| baseline (before this task) | `/office/nonsense` 404 showroom view · `/office/car/nonsense-ref` **200** · `/office`, `/office/inventory` signed out **200** + client redirect |

No Chrome launched (6 → 6). Typecheck clean · 295/295.

## Gate B — the status family (2026-10-18, dev `:3210`, live store)

| reading | value |
|---|---|
| `curl -sI /car/TS-9999` | **404** |
| `curl -sI /car/TS-1001` · `/inventory` | 200 · 200 |
| `curl -sI /office/nonsense` (signed out) | **307 → /office/sign-in** |
| browser, signed in — dead car | **404** · its view, chrome, ways forward — 10/10 verdicts |
| browser, signed in — office | `/office/nonsense` and `/office/car/nonsense-ref` **404** · the office view inside the shell — 11/11 verdicts |

Drives: `car-404.mjs`, `office-404.mjs` (`runs/car-404/`, `runs/office-404/`). No Chrome launched (6 → 6).

## Task 10 — the undo offer shows eight seconds draining (2026-10-18, dev `:3210`, live store, signed in)

`undo-bar.mjs`; readings in `runs/undo-bar/t10.json`. Throwaway demo car **TS-1038** (created
through the office's own form, deleted through the inventory, removed for good at the end).

| reading | value |
|---|---|
| the bar's registered timing | `duration 8000` · `iterations 1` · `easing linear` · `fill forwards` |
| the drain (in-page sampler, every 100 ms) | `scaleX` **1 → 0** · the animation's own clock **0 → 8016 ms** |
| the drain's rate | exactly **8000 ms per unit**, linear (0.848 @ 1 217 ms · 0.473 @ 4 216 ms · 0.098 @ 7 216 ms) |
| the offer closed | at the animation's end: bar gone, toast down, Undo gone — `shown false`, `undo false` |
| window, animation start → close | **8 524 ms** (8 000 + 524 ms commit/paint lag on the busy dev thread) — the 10 000 ms failsafe never won |
| the store after expiry | **tombstone** (`deleted_at` set) and listed in *“Waiting to be cleared”* |
| removal for good | row gone · section unmounted · store row **absent** · live count **25 → 25** |
| the start gap (handed to Task 11) | bar's element in the DOM at t=4 094; animation `startTime` t=5 775 — **1 681 ms** of full bar with the clock not yet running |

No Chrome launched (6 → 6). Typecheck clean · 295/295. One earlier throwaway (TS-1037) was created
and removed while correcting the drive; store read back, count unchanged.

## Task 11 — the bar's mechanics are constrained (2026-10-18, dev `:3210`, live store, signed in)

`undo-mechanics.mjs`; readings in `runs/undo-mechanics/live.json`. Two throwaways: **TS-1041**
(normal motion), **TS-1042** (reduced motion); both removed for good; net-zero.

| reading | value |
|---|---|
| normal — `aria-hidden` | **true** on the bar's strip |
| normal — the motion | keyframes carry `transform` only (no `width`); bar layout width **held** |
| normal — layout | toast's layout box **held** · document scroll height **held** · bar width **held** across the drain |
| normal — registered / curve | `8000 ms · 1 · linear`; `scaleX = 1 − elapsed/8000` at **every** sample (±0.02) |
| normal — the clock's start | click t=1 661 → offer t=3 988 → **animation start t=5 691, on a logged frame**; offer→clock 1 703 ms, click→close **12 366 ms ≠ 8 000** |
| normal — frame cadence | **1 017 ms** between frames (this automation tab) — why the start lags the DOM |
| normal — window | clock → close **8 336 ms**; tombstoned, listed, removed |
| reduced — the preference | seen (`matchMedia` true) |
| reduced — the bar's place | **no `.ubar` ever**, **no animations (0)**, static label **“8 s”** |
| reduced — window | **8 067 ms** offer-up → closed; Undo offered throughout; tombstoned, listed, removed |
| net-zero | live car count **25 → 25** |

No Chrome launched (6 → 6). Typecheck clean · 295/295.

## Task 12 — the end of the window is true (2026-10-18, dev `:3210`, live store, signed in)

`undo-expiry.mjs`; readings in `runs/undo-expiry/live.json`. Throwaway **TS-1046**, created through
the office, deleted, expired, then removed for good; net-zero.

| reading | value |
|---|---|
| offer up t=3 891 → clock t=4 666 (775 ms) → gone t=13 202 | clock window **8 536 ms** · offer window 9 311 ms |
| closers | animation's own end t=**12 666** · failsafe due t=**15 891** → **animation**, by 3.2 s |
| the bar at its end | animation `currentTime` **8 000 ms**, still mounted — then the close |
| after expiry | `#undo` present, **hidden** · toast down · bar **absent** · label **absent** |
| the deletion stands | tombstone `deleted_at` `2026-10-18T03:36:10.670Z` · live table rows **0** · live count = baseline |
| nothing hard-erases (SD10) | same `deleted_at` after a further 4 s · tombstone count unchanged · still listed after a reload |
| the owner clears it | **Remove for good** → store **null** · live count **25 → 25** |
| the failsafe's margin (found here) | old 10 000 ms was 2 000 ms over the window; a 1 fps tab ate up to 2.1 s of it (first run: offer window **10 267 ms**) — widened to **12 000 ms**, re-verified above |

No Chrome launched (6 → 6). Typecheck clean · 295/295.

## Gate C — the bar drains its full window and the offer closes at expiry (2026-10-18, dev `:3210`, live store, signed in)

The three Phase-3 drives on the committed code, one throwaway each (TS-1038, TS-1041/1042,
TS-1046), all removed for good — net-zero **25 → 25** every time.

| reading | Task 10 (`undo-bar`) | Task 11 (`undo-mechanics`) | Task 12 (`undo-expiry`) |
|---|---|---|---|
| the drain | clock `0 → 8016 ms` · `scaleX 1 → 0` | `scaleX = 1 − elapsed/8000` at every sample | `currentTime 8 000 ms` at the last mounted reading |
| the closer | animation's end (window 8 524 ms), failsafe never won | animation's end (window 8 336 ms) | animation end t=12 666 vs failsafe due t=15 891 — **animation by 3.2 s** |
| the offer at expiry | toast down, Undo gone | — | `#undo` present, **hidden**; toast down; bar and label gone |
| the store | tombstoned and listed | tombstoned and listed | tombstone, absent from the live table, same `deleted_at` after 4 s, listed after reload |
| net-zero | removed for good · 25 → 25 | two throwaways removed · 25 → 25 | removed for good · 25 → 25 |

No Chrome launched (6 → 6). Typecheck clean · 295/295.

## Task 13 — every confirmation is the platform's dialog (2026-10-18, dev `:3210`, live signed in)

`dialogs.mjs`; readings in `runs/dialogs/readings.json`. Each dialog opened through its own trigger
(a click, or the showroom's exit-intent gesture after its dwell), read in the DOM, then closed.

| screen | element | open | `:modal` | display | rect / viewport | name | inner role |
|---|---|---|---|---|---|---|---|
| office inventory | `DIALOG#ovl` | true | true | grid | 1425×900 / 1440×900 | Delete this car? | null |
| office car form | `DIALOG#ovlD` | true | true | grid | 1425×900 / 1440×900 | Delete this car? | null |
| office drafts | `DIALOG` | true | true | grid | 1425×900 / 1440×900 | Delete this draft? | null |
| office enquiries | `DIALOG#ovlD` | true | true | grid | 1440×900 / 1440×900 | Enquiry | null |
| showroom home | `DIALOG#ovl` | true | true | grid | 1440×900 / 1440×900 | What are you after? | null |
| showroom car | `DIALOG#ovl` | true | true | grid | 1440×900 / 1440×900 | Before you go | null |
| showroom inventory | `DIALOG#ovl` | true | true | grid | 1440×900 / 1440×900 | Before you go | null |

| closed | reading |
|---|---|
| office inventory / car / drafts / enquiries | mounted · `open=false` · computed `display:none` |
| showroom home / car | mounted · `open=false` · computed `display:none` |
| showroom inventory | **unmounted** (mounted with its state; `close()` ran before the state removed it) |

| the look, kept | reading |
|---|---|
| no UA box | `border-top-width 0` · padding 20px · dialog fills the layout viewport |
| the panel | `.mdl` centred on the dialog: (713, 450) office · (720, 450) showroom |
| the dim | dialog background `rgba(10,11,13,.62)` · `::backdrop` `rgba(0,0,0,0)` |
| Escape, showroom | `cancel` then `close` 69 ms apart · page `lock` removed |

No Chrome launched (6 → 6). Typecheck clean · 295/295.

## Task 14 — focus, scroll, name, Escape (2026-10-18, dev `:3210`, live signed in)

`focus.mjs`; readings in `runs/focus/readings.json`. Office four opened by keyboard (focus the
opener, Enter); showroom through its own exit-intent gesture after the dwell. First focus read after
the platform's fixup.

| screen | first focus | page controls reached | body stops | overflow before → open → after | wheel | focus back | dialogs |
|---|---|---|---|---|---|---|---|
| office inventory | `BUTTON#no` (Keep it) | 0 | 3 | visible → hidden → visible | 0 → 0 | `BUTTON` opener | 1 → 0 |
| office car form | `BUTTON` (Keep it) | 0 | 3 | visible → hidden → visible | 0 → 0 | `BUTTON#delBtn` opener | 1 → 0 |
| office drafts | `BUTTON` (Close) | 0 | 2 | visible → hidden → visible | 0 → 0 | `BUTTON` opener | 1 → 0 |
| office enquiries | `BUTTON` (Close) | 0 | 0 | visible → hidden → visible | 0 → 0 | `ARTICLE` opener | 1 → 0 |
| showroom home | `BUTTON#mx` (Close) | 0 | 2 | hidden auto → hidden → hidden auto | 0 → 0 | `A` last focus | 1 → 0 |
| showroom car | `BUTTON#mx` (Close) | 0 | 2 | hidden auto → hidden → hidden auto | 0 → 0 | `A` last focus | 1 → 0 |
| showroom inventory | `BUTTON#mx` (Close) | 0 | 2 | hidden auto → hidden → hidden auto | 0 → 0 | `A` last focus | 1 → 0 |

Tab cycle: `office inventory #no → #yes → BODY → #no …`; `office car Keep it → #delYes → BODY …`;
`office drafts Close → button → button → BODY …`; `office enquiries Close → A#dPhone → …` (eight
focusables, no edge reached); every showroom `#mx → link → button → BODY …`. The `BODY` stop is
Chrome's own modal edge — a minimal two-button dialog in the same browser produced
`A → B → BODY → A`, and no control behind the dialog was ever focusable during any tour.

Escape: one dialog closed each time, URL unchanged, focus on the opener, second Escape no change.
Names from `ariaSnapshot`: *Delete this car? · Delete this draft? · Enquiry · Before you go*.

Enter bug found live: an enquiry card opened the dialog and the same keystroke pressed the
just-focused Close (`open true@7322`, `false@7344`, `close@8165`); `preventDefault` on the card's
Enter branch fixes it. Typecheck clean · 295/295 · no Chrome launched (6 → 6).

## Task 15 — destructive actions named and ordered (2026-10-18, dev `:3210`, live signed in)

`destructive-labels.mjs`; readings `runs/destructive-labels/readings.json`. Read-only — every
dialog closed through its safe control (or Escape); nothing written.

| dialog | first (safe) | second (destructive) | class | name |
|---|---|---|---|---|
| drafts | `Keep it` | **`Remove for good`** | `btn` | Delete this draft? |
| inventory | `Keep it` | `Delete` | `btn2 danger` | Delete this car? |
| car form | `Keep it` | `Delete` | `btn2 danger` | Delete this car? |
| enquiry detail | — | no destructive action (five state buttons) | — | Enquiry |
| tombstone (source; 0 live rows) | `Keep it` | `Remove for good` | `btn2 danger` | inline confirm |

Draft `deleteDraftAction → deleteDraft` is permanent with no undo; the confirmation now says
`Remove for good` and the safe control is first. Entry words (card trigger, dialog question) still
say `Delete` — flagged, not changed (copy outside the approved slots). No live tombstone exists
(25 live cars, none deleted); Task 12's live removal covers that action. Typecheck clean · 295/295 ·
no Chrome launched (6 → 6).

## Task 16 — a tap outside closes only what is not destructive (2026-10-18, 375×812, live signed in)

`tap-outside.mjs`; readings `runs/tap-outside/readings.json`. Real click at **(6,6)**, on the dim
outside `.mdl` (`elementFromPoint` = the dialog). Destructive dialogs then closed through *Keep it*;
no writes.

| screen | kind | outside tap | safe / other close | focus after |
|---|---|---|---|---|
| office inventory | destructive | **kept open** (1 dialog) | Keep it closes | `BUTTON` opener |
| office car form | destructive | **kept open** | Keep it closes | `BUTTON#delBtn` opener |
| office drafts | destructive | **kept open** | Keep it closes | `BUTTON` opener |
| office enquiry detail | non-destructive | **closes** (0 dialogs) | — | `ARTICLE` opener |
| showroom inventory offer | non-destructive | **closes**, unmounted | — | `BODY` |
| showroom home offer | non-destructive | **closes** | — | `BODY` |
| showroom car offer | non-destructive | **closes** | — | `BODY` |

The phone inventory hides the desktop table; the card list's own `button.ab.del` opened the
confirmation. Body locked while open, restored after the non-destructive closes (`visible` office,
`hidden auto` showroom). The showroom offers were verified, not edited. Typecheck clean · 295/295 ·
no Chrome launched (6 → 6).

## Task 17 — focus survives a removal and a refusal (2026-10-18, dev `:3210`, live signed in)

`focus-removal-refusal.mjs`; readings `runs/task17/readings.json`. Two throwaway demo cars
(**TS-1047**, **TS-1048**) created through the office's own form, used, undone after each removal,
then removed for good through the tombstones section — **net-zero 25 → 25**, both refs absent at
the end. The list was filtered to the two throwaways so each case was deterministic; the client
focuses from the visible (filtered) `list`.

| case | action | focus after | pass |
|---|---|---|---|
| middle row | delete TS-1047 (first of the two visible) | `BUTTON.ab.del`, `data-car-id` = TS-1048's id — the next row's equivalent control | ✓ |
| last row | delete TS-1048 (last of the two visible) | `H1#inv-h` — the list's heading | ✓ |
| client refusal | price `abc`, was-price `def`; submit | `INPUT#f-price` (first visible `aria-invalid` in DOM order; `f-price` then `f-was`) | ✓ |
| server field refusal | add form, brand empty; submit | `INPUT#f-brand`; block *“Could not save. Enter the make”* | ✓ |
| form-level refusal | edit TS-1001, hidden `carId` tampered to `not-a-car-id`; submit | `DIV#formErr` (*“Could not save. This car could not be identified”*); the car's `updated_at` unchanged | ✓ |

Delete flows were keyboard-only: focus the row's delete control, Enter; the platform puts focus on
*Keep it*; Tab to *Delete*; Enter. The reading is taken after the row leaves. Undo restored each
row. The refusal cases wrote nothing: the client case returns before the Server Action; the
empty-brand add is refused before any insert; the tampered-id edit is refused before any update.

Mechanism: both inventory delete controls carry `data-car-id`; `confirmDelete` records the next
visible row's id (or `heading`) before the optimistic removal; a `useEffect` on `rows` runs one task
after the native dialog's close (which first tries to restore focus to the removed opener) and
focuses the next visible delete control or `#inv-h`. `inventory/page.tsx`'s `<h1>Inventory</h1>`
gained `id="inv-h"` and `tabIndex={-1}` — beyond the plan's Files line, required by the AC; the page
was not owner-dirty. The car form focuses the first visible `aria-invalid` field for a client
refusal; for a server refusal, the first visible field named by the errors, else `#formErr`
(`tabIndex={-1}`, already `role="alert"`).

Typecheck clean · 295/295 · no Chrome launched (7 → 7 processes) · notes `TASK-005-task17.md`.

## Gate D — dialogs, focus, Escape, scroll, outside taps (2026-10-18, dev `:3210`, live signed in)

Fresh pass after Phase 4: `dialogs.mjs` (7/7), `focus.mjs` (7/7, keyboard), `tap-outside.mjs`
(375×812, the one pointer gesture), and the Task 17 removal/refusal drive from the same day.
Readings in `runs/dialogs/`, `runs/focus/`, `runs/tap-outside/`, `runs/task17/`. No store writes;
Chrome 6 → 6 in each (attach-only).

| screen | element / name | entered (safe) | page controls | `BODY` edge stops | scroll behind | Escape → focus | outside tap |
|---|---|---|---|---|---|---|---|
| office inventory | `DIALOG` · *Delete this car?* | `BUTTON#no` | 0 | 3 | hidden · y 0 · 2242 px | closed · `BUTTON` opener | **kept open**, closed via Keep it |
| office car form | `DIALOG` · *Delete this car?* | `BUTTON` | 0 | 2 | hidden · y 0 · 2311 px | closed · `#delBtn` opener | **kept open**, closed via Keep it |
| office drafts | `DIALOG` · *Delete this draft?* | `BUTTON[Close]` | 0 | 2 | hidden · y 0 · 7852 px | closed · `BUTTON` opener | **kept open**, closed via Keep it |
| office enquiries | `DIALOG` · *Enquiry* | `BUTTON[Close]` | 0 | 0 | hidden · y 0 · 900 px | closed · `ARTICLE` opener | **closed** · `ARTICLE` |
| showroom home | `DIALOG` · *Before you go* | `BUTTON#mx` | 0 | 1 | hidden · y 0 · 4874 px | closed · `A` opener | **closed** · body unlocked |
| showroom car | `DIALOG` · *Before you go* | `BUTTON#mx` | 0 | 2 | hidden · y 0 · 2452 px | closed · `A` opener | **closed** · body unlocked |
| showroom inventory | `DIALOG` · *Before you go* | `BUTTON#mx` | 0 | 2 | hidden · y 0 · 3068 px | closed · `A` opener | **closed**, unmounted |

All seven were `open`, `:modal`, `display:grid`, viewport-sized, with the name above read from the
accessibility tree; the inner `role`/`aria-modal` is gone. The `BODY` stops are Chrome's own modal
edge (the minimal two-button control read `A → B → BODY → A` in Task 14); **no control behind a
dialog ever took focus**. Escape closed exactly one dialog, the URL was unchanged, a second Escape
did nothing, and the wheel left `y = 0` with `overflow:hidden` in every case; the showroom's own
`.lock` restored to `hidden auto` after its non-destructive closes.

Outside taps were a real click at **(6,6)** (375×812), where `elementFromPoint` was the dialog: the
three destructive confirmations stayed open and closed only through **Keep it**; the enquiry detail
and the three showroom offers closed. Focus after the enquiry close was its `ARTICLE` opener.

Focus after a removal / a refusal (from §Task 17, same day): middle visible inventory row → the next
row's delete control (`data-car-id` matched); last visible row → `H1#inv-h`; invalid price/was-price
→ `#f-price`; empty brand → `#f-brand`; tampered `carId` (form-level) → `#formErr`, car unchanged;
two throwaways created through the office and removed for good, **net-zero 25 → 25**.

Honest: `focus.mjs` and the delete flows are keyboard; the outside-tap check is necessarily a
pointer gesture. The showroom home's dialog is the exit-intent *Before you go* (the dev StrictMode
welcome artifact noted in Task 14), not the welcome. `dialogs.mjs` opens the drafts dialog without
deleting a draft; `focus.mjs` and `tap-outside.mjs` write nothing. Gate D added no source change, so
Task 17's `npm run typecheck` clean · **295/295** still stands.

## Task 18 — the dead Search control goes (2026-10-18, 375×812, live signed in)

`topbar-search.mjs`; readings `runs/task18/readings.json`. Read-only; viewport restored; no Chrome
launched (6 → 6).

| route | `.topbar` controls (all `<a>` with `href`) | search |
|---|---|---|
| `/office` | Settings · WhatsApp taps | none |
| `/office/inventory` | Settings · WhatsApp taps | none |
| `/office/activity` | Settings · WhatsApp taps | none |
| `/office/settings` | Dashboard · WhatsApp taps | none |

`.topbar` is `display:flex` at 375; every control is an anchor with a destination
(`allReal=true`), nothing `searchish`, the brand a `<span>`. Search still lives where it filters:
inventory `#q` `TS-1001` → **1** card of 25 (desktop table `display:none` at this width); activity
`#q` `removed` → **12 of 80** entries. Both cleared after.

The live tree carried the owner's uncommitted `TapNotice` link (a real `<a>`); the commit stages a
constructed blob of `OfficeTopbar.tsx` with only the Task 18 change, so the owner's hunks stay
uncommitted. `office.css` needed no change (nothing targeted the placeholder; `.ico` is shared).
Typecheck clean · 295/295 · notes `TASK-005-task18.md`.

## Task 19 — the car form's delete really deletes (2026-10-18, live signed in)

`car-delete-offer.mjs`; readings `runs/task19/readings.json`. Two throwaways created through the
form and both removed for good by the end; **net-zero 25 → 25**; Chrome 6 → 6 (attach-only).

| leg | reading |
|---|---|
| 1 · delete → offer → undo → reload | tombstone set; offer *“… A 2020 deleted.”* with Undo visible and the bar mounted (`undodrain` / **8000 ms**); `#delBtn` hidden; Undo → toast *“… restored.”*, **store** `deleted_at = null`, **full reload** shows the car (brand field, delete button back) |
| 2 · delete → window expires | scaleX sampled `1.000 → 0.858 → 0.756 → 0.656 → 0.554 → 0.454`; window ran out in **8 451 ms** (the bar's own end); pushed to `/office/inventory`; tombstone set, listed, removed for good |
| 3 · cleanup | the undo test's car deleted again, window ran out, tombstone removed for good |
| net | **25 → 25** |

The drive found a real defect first: `deleteCar`'s `revalidateCarPaths()` re-rendered the current
editor route, and a tombstoned car's editor answers 404 — the page was read live as
*“THAT PAGE ISN'T IN THE OFFICE”* with the offer unmounted (case 1 only passed by winning the race;
case 2, which sampled the bar first, lost it). The action now takes `{ revalidate: false }`, passed
by the car form only; both ways out of the offer land on fresh renders (undo revalidates; expiry
navigates to the inventory). Typecheck clean · 295/295 · notes `TASK-005-task19.md`.

## Task 20 — the More cell reaches three destinations (2026-10-18, live signed in)

`more-sheet.mjs`; readings `runs/task20/readings.json`. Read-only; Chrome 6 → 6 (attach-only).

| width | reading |
|---|---|
| 375 | cell `BUTTON` "More", icon `fa-ellipsis`, `aria-expanded=false`, `haspopup=dialog`, `controls=more-sheet`; Enter opens: `:modal` true, name "More", focus entered "Drafts"; rows `[Drafts, Activity log, Settings]` + hrefs; Tab cycle `Activity log → Settings → BODY → Drafts` (no page control behind); Escape returns focus to the cell; outside tap (6,6) closes, focus back; choice "Activity log" (Tab+Enter) → `/office/activity`, sheet closed, cell lit, reopened sheet current="Activity log" |
| 375 | drafts: cell lit, current "Drafts" · settings: cell lit, current "Settings" |
| 768 | `.bnav` grid, `:modal` true, same rows |
| 1280 | `.bnav` none; sidebar `[Drafts, Activity log, Settings]` — the order/wording checked against |

Mechanism: cell is a real control (`aria-expanded`/`aria-haspopup="dialog"`/`aria-controls`), icon
`fa-ellipsis` (a gear read as Settings); `MoreSheet.tsx` is the platform `Dialog` with
`dismissOnBackdrop` (navigation, not destructive); rows carry `aria-current="page"` on the current
path and close the sheet on choice. Styles travel with the shell component in the new
`MoreSheet.css` — `office.css` is not loaded shell-wide and needed no change (Files-line
discrepancy, recorded). Typecheck clean · 295/295 · notes `TASK-005-task20.md`.

## Task 21 — the nav chat control behaves the same at every width (2026-10-18, live signed in)

`showroom-chat.mjs`; readings `runs/task21/readings.json`. Read-only; Chrome 6 → 6 (attach-only).

| width | reading |
|---|---|
| 375 | nav chat hidden on **home, inventory, car** (the same); floating fab visible on home + inventory, absent on the car page (DR15); car's own `.mbar` `display:flex`, and it comes up on scroll (`show` true) |
| 768 | nav chat hidden on all three; `.mbar` flex |
| 1440 | nav chat **visible** on all three; fab `display:none`; `.mbar` `none` |

One rule, moved: `.nav .wab { display: none; }` left the car page's sheet and now lives in
`reference.css`'s `@media (max-width: 820px)` block (imported once by the `(site)` layout), so the
same width behaves the same on every showroom page. `SiteFab.tsx` unchanged (Files-line
discrepancy: DR15 leaves the fab car-page-absent — the car page's bar is its phone chat).
Typecheck clean · 295/295 · notes `TASK-005-task21.md`.

## Gate E — the More sheet, the dead Search, the car form's delete+undo (2026-10-18, live signed in)

Aggregated for the gate; every line was read live. Attach-only drives — none launched a Chrome
(this session's Chrome was started once by the owner's instruction after the shutdown; the drive
guards read 3 → 3 / 4 → 4 / 6 → 6 throughout).

| item | widths | reading |
|---|---|---|
| More sheet paths + current marking | 375 / 768 / 1280 | §Task 20 — open `:modal` “More”, focus entered “Drafts”, rows `[Drafts, Activity log, Settings]`, the Tab cycle stays inside, Escape / outside tap / choice all close, current row marked on drafts/activity/settings; at 1280 `.bnav` `none` and the sidebar reads the same order/wording |
| dead Search gone | 375 / 768 / 1280 | `topbar-search.mjs` (375: four routes, top bar all-`<a>`, inventory/activity filtering works) + `gate-e-widths.mjs`: at 375/768 the top bar is `display:flex` with **0 buttons and 0 search-ish controls** — only real destinations (Settings link, taps badge); at 1280 the top bar is `display:none` |
| car form’s delete+undo real | 375 (+ desktop in §Task 19) | `car-delete-offer.mjs` `VIEWPORT=375`: tombstone → offer with the bar (`undodrain` 8000 ms) → Undo → store `deleted_at = null` + full reload shows the car; second throwaway: scaleX `1.000 → 0.467`, window ended **8 461 ms** → pushed, tombstone listed, removed for good; cleanup leg; **net-zero 25 → 25** |
| delete dialog affordance | 375 / 768 / 1280 | `gate-e-widths.mjs`: `#delBtn` visible; dialog opens `:modal` “Delete this car?”; **Keep it** closes; focus returns to `#delBtn` |

Readings: `runs/gate-e/readings.json`, `runs/gate-e-car-375/readings.json`, `runs/task19/`,
`runs/task20/`, `runs/task18/`. Typecheck clean · 295/295 (no source change since Task 21).

## Task 22 — the empty result says it once (2026-10-18, live, read-only)

| reading (showroom over-filtered to zero) | before | after |
|---|---|---|
| promise printings on the screen | **2** — `#speak` + the empty block | **1** — the empty block |
| `#speak` at zero | the full promise **with an `<a>`** | **“No cars match those filters.”**, no link |
| empty block | “Nothing here yet — tell me the car you're after and I'll source it in the USA.” | **“No cars match those filters. Tell me what you're after and I'll source it in the USA.”** |
| heading · count · clear | 0 MATCHING CARS · 0 OF 19 CARS · `#clr` in the filter panel only | unchanged |

Office byte-identical before/after (the office sections of the two readings files are identical;
no office file in the diff): *“No cars match. Clear the search or pick another state.”* +
“Clear filters”; count “0 of 25 cars match”. Readings `runs/task22/before.json` / `after.json`;
drive `empty-result.mjs`; Chrome 3 → 3.

## Task 23 — the live result is announced exactly once (2026-10-18, live, read-only)

| reading | before | after |
|---|---|---|
| inventory `#speak` while empty — display | `none` | **`flex`** |
| inventory `#speak` while empty — own AX node (full-tree membership) | **not in the tree** (`partialRole: none`) | **present, role `status`, height 0** |
| car page `#speak` while empty — display / AX | `none` / not in the tree | **`flex` / present, `status`** |
| inventory unignored `status` nodes (rest · zero) | **2 · 2** | **1 · 1** |
| `#ttl` — DOM role / AX role | `status` / `status` | **none / `heading`** |
| `/not-found` route `.speak` | absent | absent (page renders no region) |

The emptiness was reached with one labelled DOM probe per surface (clear → read → restore), because
no page in dev rests empty (StrictMode announces on mount; `CarBehaviors` greets; the 404 lands a
theme line). AX reads are `Accessibility.getFullAXTree` membership of the element's own node — the
source DevTools' accessibility pane uses. Readings `runs/task23/before.json` / `after.json`; drive
`speak-region.mjs`; Chrome 3 → 3. Zero announcement re-read: "No cars match those filters."

## Task 24 — the honest count, and clearing lives in the panel (2026-10-18, live, read-only)

| reading | before | after |
|---|---|---|
| office 1440 — empty blocks visible (`.empty2`) | **2**, both "…pick another state. \| Clear filters" | **1** |
| office 1440 — "Clear filters" visible | **2** | **1** |
| office 375 — visible | 1 (the cards') | 1 (unchanged) |
| office block text · count | — | **byte-identical** · "0 of 25 cars match" |
| showroom zero (1440 · 375): heading · band · clear | "0 MATCHING CARS" · "0 OF 19 CARS" · `#clr` in the panel only, `emptyHasClear:false` | identical |

The office fix: `#emptyC` moved inside `.cards` (its `#emptyT`/`.panel.tbl` pattern); screenshots
`before-office-1440.png` / `after-office-1440.png` / `after-office-375.png` in the same folder.
Drive `honest-count.mjs`; readings `runs/task24/before.json` / `after.json`; Chrome 3 → 3.

## Task 25 — a refusal keeps its own voice (2026-10-18, live, read-only)

| reading | before | after |
|---|---|---|
| from-file, page 1 | `"Mileage" — enter a whole number; "Doorstep price" — enter a naira amount…` | **`… — Enter a whole number; … — Enter a naira amount…`** |
| from-file, page 2 | `"Year" — enter a whole number; "Was price" — enter a naira amount…` | **`… — Enter a whole number; … — Enter a naira amount…`** |
| car form, save refused | `Enter the make` · `Enter the model` · `Enter a year between 1900 and 2027` · `Enter the mileage in km` | identical |

The from-file leg drives the office's own control with `build-refused-pdf.ts` (every page refused
→ 422, nothing stored, no asset held); the car-form leg is a refused save (`#f-mileage` unreadable,
`#f-year` 1500, make/model blank). Drive `refusal-voice.mjs`; readings `runs/task25/before.json` /
`after.json`; Chrome 3 → 3.

## Gate F — the empty result once, the announcement, the count, the refusals (2026-10-18, live signed in)

One fresh pass, `gate-f.mjs` — all read-only; the from-file leg answered **422 on the first
attempt** (nothing stored, no asset held):

| check | reading |
|---|---|
| region at rest, before the result changes | **empty** on a fresh load; its empty node **present in the accessibility tree, role `status`, unignored** (the `.speak:empty` collapse rule — Task 23's ground). No announcement fires on mount (a separate MutationObserver probe saw no `#speak` mutation in 12 s) |
| zero state — the announcement | `#speak` = **"No cars match those filters."** exactly — bare: no link, no promise |
| zero state — the promise on the screen | printed **once** ("source it in the USA" ×1, "tell me what you're after" ×1) — in the empty block only |
| zero state — the count | `#ttl` **"0 MATCHING CARS"** · `#cnt` **"0 OF 19 CARS"** · the only clear: `#clr` "Clear all filters", filter panel |
| zero state — unignored `status` nodes | **1** |
| from-file refusals (fixture: two pages, every page refused) | `"Mileage" — Enter a whole number; "Doorstep price" — Enter a naira amount, e.g. 12500 or 12500.50` · `"Year" — Enter a whole number; "Was price" — Enter a naira amount…` |
| car form, refused save | `Enter the make` · `Enter the model` · `Enter a year between 1900 and 2027` · `Enter the mileage in km` |

Fresh loads leaving the region empty is the designed behavior (a load is not a change — the
announcement answers changes; Task 22's note separates the dev StrictMode fill from production
truth; the §Task 23 note's "no page rests empty in dev" was that session's quirk reading). The
drive's upload leg retries on the intermittent store; none was needed. Typecheck clean ·
`npm test` **295/295**. Drive `gate-f.mjs`; readings `runs/gate-f/readings.json`; Chrome 3 → 3.

## Task 26 — a car with no photos, and a photo that failed (2026-10-18, live, read-only)

| reading | before | after |
|---|---|---|
| A. no photos (TS-1029) — the box | `#gi` src **`undefined`** (a literal), alt `… photo NaN`, counter `NaN / 0`, 2 arrows, thumbs container present | **drawn box** (`data:image/svg…`), alt `… photo 1`; **no counter, 0 arrows, no thumbnails** |
| A. click the box (and the closed lightbox) | lightbox opens, `#li` src `undefined` | **nothing opens**; `#li` the drawn box |
| A. machine scan (innerText + every img src/alt) | `NaN` in text · `gi: undefined` · `li: undefined` · alt `… photo NaN` | **clean** |
| B. one photo (TS-1033) | `1 / 1` · **2 arrows** · 1 thumb | `1 / 1` · **0 arrows** · 1 thumb |
| C. broken at load (TS-1001, `*sanity.io*` blocked before the load) | `#gi` drawn (re-kick accident); **3 thumbnails broken** (`cdn…`, nw 0) | **`#gi` drawn; 3 thumbnails drawn** |
| D. the showroom's cards, same block | 23 imgs — **0 drawn, 23 broken** | **23 drawn, 0 broken** |
| console errors | 2 × 404 (the `undefined` fetches) | none |

`galRect` 832×499 on every leg (the box unchanged wherever it was already right). Drive
`photo-box.mjs` (CDN block lifted in `finally`); readings `runs/task26/before.json` / `after.json`;
Chrome 3 → 3.

## Task 27 — the empty photo box is a gradient from the car's ref (2026-10-19, live, read-only)

| reading | before | after |
|---|---|---|
| A. no photos (TS-1029) — the box | flat grey SVG (`#eef0f2`), **announced** (`role: image`, name `… photo 1`) | **gradient** `linear-gradient(135deg, rgb(41,66,56), rgb(61,48,105))` (green → violet) |
| A. `.pbox` · the slot in the AX tree | absent · `role: image`, ignored **false**, named | present, `aria-hidden="true"`, animation **none** · `#gi` `role: none`, **ignored: true**, no name · `.pbox` **ignored** |
| A. calm · reload | — | unchanged after 1.3 s · **identical gradient** after reload |
| B. no photos (TS-1030) | the same flat grey | **its own gradient** `rgb(41,66,41) → rgb(90,109,55)` (green → olive) |
| C. photographed (TS-1001) | photo | **the photo over its own box** (`rgb(69,52,39) → rgb(49,76,94)` behind it); `#gi` announced with its alt — a real photo |
| D. blocked before load (TS-1001, `*sanity.io*`) | grey SVG placeholder | **the box**, the **same colours as C** (same car); `#gi` silent — `alt=""`, no `src`, ignored |
| layout | `galRect` 832×499 | `galRect` 832×499 on every leg — no shift |
| console errors | — | none |

Two distinct colours per car, never a flat grey; same car → same pair after reload; two cars →
two pairs; no animation; the box occupies a photo's shape and size. Drive `photo-gradient.mjs`
(CDN block lifted in `finally`); readings `runs/task27/before.json` / `after.json`, sample frames
beside them; Chrome 3 → 3.

## Task 28 — the gradient is deterministic, and tested (2026-10-19)

Moved to `lib/photo-gradient.ts` with the hash documented in the module (walk → avalanche with
two seeds → HSL bounds) and held by `lib/photo-gradient.test.ts`: same ref → same output; a
**golden table** pins 12 real references (hash edit = every car's colour changes, test fails);
stops inside the documented bounds; two cars never share a gradient; adjacent refs ≥ 20° apart
(measured 36°: 155° vs 119°); spread ≥ 180° (measured 270°); source has no `Math.random`/`Date`/
`performance`; empty code still valid. `npm test` **303/303** (295 + 8) · typecheck clean · live
after the move: TS-1029 `rgb(41, 66, 56) → rgb(61, 48, 105)`, TS-1030 `rgb(41, 66, 41) →
rgb(90, 109, 55)`, `aria-hidden="true"`, no console errors — unchanged.

## Task 29 — no invented number, no dead recipient (2026-10-19, live, read-only)

The saved number was cleared from the live store for the first leg and restored **exactly** for the
second (`wa-number.mjs`; the row was backed up, deleted, then written back with its original
`updated_at`). Store before and after: `+2348146927170`, `updated_at 2026-10-16T11:55:53.863Z` —
net-zero. The real site at `:3210` was driven in the attached Chrome (3 → 3, no launch).

| reading | number cleared | number restored |
|---|---|---|
| header number, 7 site pages | **blank** | **+2348146927170** |
| `wa.me` links | **0** on all 8 pages | home 5 · inventory 4 · empty inventory 5 · car 8 · missing car 5 · site 404 5 · global 404 1 · privacy 5 — all begin `https://wa.me/2348146927170` |
| nav chat · footer button · floating · home chat | present, **no `href`** | present, live |
| car `#wa` · `#of` · `#vw` · `#mw` | present, **no `href`** | live |
| Message Umar (car missing, site 404, global 404) | present, **no `href`** | live (prefilled text intact) |
| inventory empty “Message me on WhatsApp” | present, **no `href`** | live |
| privacy `#whatsapp` | **“Enquiries go to our WhatsApp directly.”** | “Enquiries go to WhatsApp directly (**+2348146927170**).” |
| privacy `#contact` | “message us on WhatsApp.” — **no anchor** | same words, `https://wa.me/2348146927170` |
| invented literal in page text | **false** on all 8 | **false** on all 8 |
| console | 2 × 404 — exactly the two documents under test | the same two |

The eight pages: `/`, `/inventory`, `/inventory?min=999999999` (empty state), `/car/TS-1029`,
`/car/TS-999999`, `/not-found`, an unmatched URL (global 404), `/privacy`. The controls are present
but **not yet visibly off** — Task 30. Typecheck clean · `npm test` **304/304**. Drive
`wa-number-drive.mjs`; readings `runs/task29/cleared.json` / `saved.json`.

## Task 30 — With no number saved, chat controls are visibly off (2026-10-19, live)

The saved number was cleared from the live store for the first leg and restored **exactly** for the
second (same value, same `updated_at 2026-10-16T11:55:53.863Z`; net-zero). The real site at `:3210`
was driven in the attached Chrome (3 → 3, no launch), at **375 × 812** and **1440 × 900**, over
`/`, `/inventory`, `/inventory?min=999999999` (empty state) and `/car/TS-1029`, plus the inventory
farewell dialog's own chat control.

| reading | number cleared | number restored |
|---|---|---|
| header line | **“No number saved”** on every page (title = the reason) | **+2348146927170** |
| `wa.me` links | **0** | home 5 · inventory 4 · empty 5 · car 8 |
| every visible chat control | `wa-off` · **no `href`** · `role="link"` · `aria-disabled="true"` · `tabIndex=-1` · `title="No WhatsApp number is saved yet."` · `filter: grayscale(1)` · `opacity: .5` | live: `href` begins `https://wa.me/2348146927170` · no off class · no role/aria/title · `tabIndex 0` · `filter: none` |
| inventory farewell dialog | control present, greyed, same state | control present, live |
| visibility, cleared → restored | — | **identical for every control at both widths** — no control was hidden by the off state |
| console / HTTP | none | none |

Visible at 375: footer icon/button, floating control, home/inventory empty chat, car
`#wa`/`#of`/`#vw` and `#mw` (nav chat hidden by D15); at 1440: nav chat, footer icon/button, home
chat and the car's three buttons (FAB and `#mw` hidden by their normal width rules). The car
page's **generated** greeting “Book a viewing” is seen greyed in the 375 frame — the
`CarBehaviors` markup path is live, not only typechecked. Screenshots (20 frames):
`runs/task30/{cleared,saved}-{375,1440}-{home,inventory,empty,car}.jpeg` and
`…-inventory-dialog.jpeg`. Drive `wa-off-drive.mjs`; readings `runs/task30/cleared.json` /
`saved.json`. Typecheck clean · `npm test` **304/304**.
