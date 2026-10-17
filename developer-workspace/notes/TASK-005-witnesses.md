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
