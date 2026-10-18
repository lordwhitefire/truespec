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
