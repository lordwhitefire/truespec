# Report — resilience layer (TASK-004, D18 / Task 29 pulled forward)

**Asked:** when the store is asleep, the app must not look broken — "we use the knock again but there
should be a kind of loading screen saying something loading setting up bla bla bla till the db wakes
up". Two asks: knock again (retry), and a wait worth looking at.

**Built, verified, not verified** — below.

---

## 1. What was built

| File | What it is | State |
|---|---|---|
| `lib/store-retry-rules.ts` | The retry policy as pure rules + the loop that executes them | new |
| `lib/store-retry-rules.test.ts` | Pins the policy and the loop | new, 12 tests |
| `lib/store-guard.ts` | The one place a store call becomes retryable (`storeQuery`) | new |
| `lib/session.ts`, `lib/office.ts`, `lib/public-cars.ts`, `lib/cleanup.ts` | Every store call now goes through `storeQuery` — 17 call sites | changed |
| `components/store-state-styles.ts` | The styles for both states (one string, rendered into `<style>`) | new |
| `components/store-waking.tsx` | "Just a moment / Setting things up" — the wait | new |
| `components/retryable.tsx` | "We couldn't load this / Try again" — the retryable state | new |
| `app/loading.tsx`, `app/office/loading.tsx` | The wait boundaries | new |
| `app/error.tsx`, `app/office/error.tsx` | The retryable boundaries | new |

`db()` is now imported by `lib/store-guard.ts` **and nowhere else under `lib/`** — verified by grep — so
no store call can slip past the retry.

**The policy** (Neon's own documented guidance, which is why these numbers): 5 attempts, exponential
backoff from 1 s capped at 16 s, jitter up to +50%, and **only transient failures retried** — the
SQLSTATEs `57P01` / `08006` / `08003` and the socket codes/messages a cold compute produces
(`fetch failed`, `ETIMEDOUT`, `ECONNRESET`, …). A unique violation, a syntax error or a bad password is
thrown on the first attempt.

**Why retrying is safe here:** every write this project makes is already idempotent
(`INSERT … ON CONFLICT … DO UPDATE … RETURNING`, and idempotent `UPDATE`/`DELETE`), which is Neon's
documented precondition for retrying.

**Boundary placement** (from the current Next docs, not memory): `loading.js` wraps *nested* layouts but
never the layout in its own segment. Both slow layouts are nested — `app/office/(shell)/layout.tsx:19`
and `app/(site)/layout.tsx:53` — so the boundaries had to sit one segment **above** them.

**The loading fallback is styled inline**, because at `app/loading.tsx` it streams before
`app/(site)/layout.tsx` — and therefore before that layout's `globals.css`/`reference.css` — has
resolved. It also fades in after 450 ms, so a warm load never flashes "setting things up".

---

## 2. What was verified

### The retry loop is proven deterministically (12/12, `node:test`)

`lib/store-retry-rules.test.ts` runs the loop against a fake operation with a recording sleep — no
database, no waiting. It pins:
- a transient failure is retried until it lands, and the waits are the policy's, in order;
- a failure that is **not** transient is never retried (1 call, 0 waits);
- a transient failure that outlasts every attempt throws after **exactly** `STORE_ATTEMPTS` calls,
  with one wait fewer than attempts.

This is the half the browser cannot show.

### The wait streams, and the retryable state follows (live, unreachable store)

Dev server on `:3213` with `DATABASE_URL` pointing at a host that never resolves, so every store read
fails `TypeError: fetch failed` — the same transient shape a cold compute produces:

```
node --import tsx developer-workspace/scripts/task-004/resilience-check.ts 3213
  /                status=200  first-chunk=428ms  wait-flushed=428   done=19640ms  41671B  crash=false  figure=false
  /inventory       status=200  first-chunk=348ms  wait-flushed=348   done=17664ms  42786B  crash=false  figure=false
  /car/TS-1001     status=200  first-chunk=562ms  wait-flushed=562   done=19799ms  56417B  crash=false  figure=false
STORE-WAIT WITNESS PASSED
```

Read it precisely: the wait markup is flushed at **~400 ms** while the guard is still retrying, and the
response only finishes at **~19 s** — i.e. the wait is on screen *during* the retries, not delivered with
the final page. The script refuses a pass unless the response takes at least the plain backoff sum
(15 s), which is exactly the check the first version lacked.

Browser, same cold build (`resilience-probe.mjs cold`):

```
cold public   waitShown=true  waitAtMs=984   retryShown=true  retryAtMs=19975
              retryText="We couldn’t load this"  tryAgainButton=true  waitCleared=true  alertCount=2
```

The wait appears at 984 ms, gives way at 19 975 ms to a retryable state reading "We couldn't load
this" with a working **Try again** button, and no crash page. `alertCount=2` is not a defect: it is
Next's dev overlay plus our boundary — and it is what produced a **false negative** in an earlier run
(see §3).

The office wait is proven in place too — `app/office/loading.tsx` showed at 4425 ms during `/office`.

### The real cold start was absorbed (not staged)

The live store went cold during this work and the dev server logged it end to end:

```
GET / 200 in 12920ms      ← cold, through the guard
GET / 200 in 1387ms       ← warm
GET / 200 in 1396ms
GET / 200 in 1457ms
```

and the server error trace named the mechanism: `runWithRetry (lib/store-retry-rules.ts:132)`,
`[cause]: getaddrinfo ENOTFOUND`, retried, page returned 200 with 16 car cards. The owner's actual
failure — a cold read becoming an error page — is what this fixes.

### The warm path is untouched

```
warm (live store)  waitShown=false  retryShown=false  carCards=13  atMs=2119
```

No wait, no error, real content, ~2 s.

### All five gates green, after the final code

`leak-check` (18/18 public routes 200, no leak) · `typecheck` · `test` **83/83** · `build` (all office
routes still `ƒ` dynamic) · `store-freshness` (nothing prerendered, no cached store response).

Browser discipline followed as written in `procedures/browser-check.md`: attach-only on CDP `:9222`,
proven ours (no Headless), chromium **6 → 6** (nothing launched), no screenshots, role/text locators,
no `waitForTimeout`, detached on exit, tabs left open. Artefacts under
`developer-workspace/scripts/task-004/runs/store-wait/`.

---

## 3. My mistake, and what it cost

**The first witness passed while the code was not retrying at all.** I pointed `DATABASE_URL` at
`127.0.0.1:1` assuming a connection refusal. The Neon driver *rewrites the host*, producing
`https://api.0.0.1/sql` → `ERR_INVALID_URL` — a **permanent** error, so the guard correctly did not
retry, and the page threw immediately. The script still printed `PASSED`, because it only asked "did
the wait markup appear", which it did (the fallback renders regardless).

I caught it by not trusting a green result whose numbers were wrong: the response finished in 0.35 s
and the wait appeared only 59 ms before the end. A witness whose timing contradicts its claim is not
evidence. I then probed the driver directly for a host that fails **transiently**
(`doesnotexist.invalid` → `fetch failed`) and added the retry-budget floor to the assertions, so the
script can no longer pass unless the guard genuinely retried — and I moved the retry loop into the
pure module so it can be proven deterministically instead of only observed.

A second, smaller false negative: the warm probe first reported `cars=false`, because it looked for the
ref as visible text when the ref lives in the card's `href`. Corrected to count `a.card[href^="/car/"]`
(13 cards).

Both are the same lesson: verify the assertion, not just the result.

---

## 4. What was NOT verified — stated plainly

1. **The office *error* boundary has not been exercised in a browser.** Doing so needs a live signed-in
   session, and the browser currently has none (`/office` on both `127.0.0.1` and `localhost` redirects
   to the door). What *is* proven: the office **wait** renders (`app/office/loading.tsx` at 4425 ms);
   the same guard (`storeQuery`) serves the office; and the parent-segment rule for `error.tsx` is
   demonstrated live by `app/error.tsx` catching a throw from the nested `app/(site)/layout.tsx`. The
   remaining gap is narrow — that this specific file catches a throw from `app/office/(shell)/layout.tsx`
   — and can be closed in one step: sign in on the cold build and request `/office`.
2. **No sustained concurrency test.** The guard retries each query independently; jitter is what is
   meant to keep a cold stampede from synchronising. It has not been measured under load. If it proves
   insufficient, a single-flight gate is the follow-up — evidence first.
3. **The two witness scripts still reach `lib/db` directly** — `scripts/reconcile.ts` (a TASK-003
   artefact) and `developer-workspace/scripts/task-004/session-row-check.ts`. They are witnesses that
   deliberately talk to the store to check the store, not app code, so they were left alone rather than
   changed out of scope. They do **not** benefit from the retry.
4. **Not run:** the idle-path test (push a session's `last_seen_at` 13 h back and confirm the revoke) —
   carried over from Checkpoint A, unrelated to this change.

---

## 5. Deliberate exclusions

- No separate "wake" probe: retrying the real query avoids a second round trip and a false "already
  awake" window. Revisit only if §4.2 shows a stampede.
- No `global-error.tsx`: the root layout reads nothing from the store (fonts/theme only), so there is
  no store failure for it to catch.
- Nothing cached; no change to what a page shows when the store *is* awake.

---

## 6. Files to look at, for a fresh session

`lib/store-retry-rules.ts` (policy) → `lib/store-guard.ts` (the gate) → the four store modules →
`components/store-waking.tsx` / `components/retryable.tsx` → `app/{loading,error}.tsx` and
`app/office/{loading,error}.tsx`. Witnesses: `developer-workspace/scripts/task-004/resilience-check.ts`
(streaming) and `resilience-probe.mjs` (browser).
