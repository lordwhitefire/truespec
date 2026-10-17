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
