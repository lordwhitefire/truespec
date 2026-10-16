# TASK-004 · Task 29 — The shared store guard + retryable state + error boundaries

**Date:** 2026-10-16 · **Status: done** — built earlier as a pulled-forward sub-plan, **re-verified here
against the current tree** (Tasks 10–28 have all landed since it was proved). Five gates green.

## The claim

Truth 16 (`task.md:204-207`) and acceptance 20 (`task.md:571-572`):

> *"A blank or blinking store must not become an error page. A transient failure reading the store must
> surface as a clear, retryable state — never a fabricated figure, never a silent empty list that looks
> like real emptiness, and never a bare 500. The **wording** of that state is TASK-005's; the page not
> breaking is this layer's."*
>
> *"…the store is briefly made unreachable, a store-reading page shows a clear, retryable state rather
> than an error page — and shows no invented figure."*

And (`task.md:418-419`): *"one shared store read, one retryable-state component, and route-level error
boundaries behind it — on the office **and** the public showroom. Never a 500, never an invented figure."*

## Built earlier, in its own plan — not rebuilt here

This was **Task 29 pulled forward** (design **D18**) and finished on **2026-10-14**:

- **Plan:** `developer-workspace/plans/TASK-004-resilience-plan.md` (9 steps, all ✅)
- **Report:** `developer-workspace/reports/TASK-004-resilience.md`

| Piece | Where |
|---|---|
| The retry policy as pure rules (5 attempts · 1 s → 16 s exponential · jitter ≤ +50% · **transient only**) | `lib/store-retry-rules.ts` + `lib/store-retry-rules.test.ts` (12/12) |
| The one shared guard (`storeQuery` retried, `storeQueryOnce` deliberately not) | `lib/store-guard.ts` |
| The wait — *"Just a moment / Setting things up"* | `components/store-waking.tsx` |
| The retryable state — *"We couldn't load this / Try again"* | `components/retryable.tsx` |
| The boundaries (one segment **above** each slow layout — `loading.tsx` never wraps its own segment's layout) | `app/loading.tsx`, `app/error.tsx`, `app/office/loading.tsx`, `app/office/error.tsx` |

**No code changed in this task.** The work here was to prove the claim still holds after eighteen more
tasks landed on top of it — new pages were added (`/office/drafts`, `/office/enquiries`,
`/office/settings`, `/office/account/[[...account]]`, `/api/export`), any one of which could have opened
a hole.

## What was re-verified — run, not assumed

### 1. Every app/lib store read still funnels through the one guard

Asked of the current tree, not of memory:

```
grep "lib/db"  app lib components scripts   →  lib/store-guard.ts (the guard)  +  scripts/reconcile.ts (a witness, see below)
grep "neon("   app lib components           →  lib/db.ts only          (one client, one place)
grep "\.query(" app lib                     →  lib/store-guard.ts:30, :52  (and nothing else)
```

So: one client (`lib/db.ts`), one gate (`lib/store-guard.ts`), and **no store call in `app/` or `lib/`
can slip past the retry**. This includes everything added since — `lib/export.ts`, `lib/settings.ts`,
`lib/draft-store.ts` all call `storeQuery`.

The two direct reaches to `lib/db.ts` are **witnesses that talk to the store to check the store**
(`scripts/reconcile.ts`, `developer-workspace/scripts/task-004/session-row-check.ts`) — the report's §4.3
already named them; they are deliberately not routed through the guard, because a check that inherits
the thing it checks is not a check. They are not app code.

### 2. A store that cannot answer: the wait streams, then the retryable state

A dev server whose `DATABASE_URL` points at a host that never resolves
(`postgresql://u:p@doesnotexist.invalid/db` — the same **transient** shape a cold Neon compute produces),
routes pre-compiled so the numbers are the guard's and not the compiler's:

```
$ node --import tsx developer-workspace/scripts/task-004/resilience-check.ts 3213
  /                status=200  first-chunk=413ms  wait-flushed=413  done=18133ms  42145B  crash=false  figure=false
  /inventory       status=200  first-chunk=390ms  wait-flushed=390  done=18283ms  43882B  crash=false  figure=false
  /car/TS-1001     status=200  first-chunk=522ms  wait-flushed=522  done=20018ms  58323B  crash=false  figure=false
STORE-WAIT WITNESS PASSED — 3/3 route(s) retried for the full budget, streamed the wait before
answering, invented no figure, and showed no bare crash page.
```

Read it precisely: the wait is flushed at **~400 ms** while the guard is still retrying, and the response
only finishes at **~19 s**. So the person is looking at a screen, not a blank — and the witness refuses a
pass unless the response outlasts the plain backoff sum (15 s), which is the one thing that proves the
guard genuinely retried rather than failing fast. Raw output:
`developer-workspace/scripts/task-004/runs/store-wait/streaming-check.txt`.

### 3. The retryable state itself (a client component — only a browser can see it)

Attach-only Chrome on CDP `:9222` (proved ours — no `Headless` in the UA; **6 chromium before, 6 after**,
nothing launched; detached, tabs left open):

```
cold public  waitShown=true (14747ms)  retryShown=true (33902ms)
             retryText="We couldn't load this"  tryAgainButton=true  waitCleared=true  navError=null
warm  (live) waitShown=false  retryShown=false  carCards=13  atMs=2736
```

So the cold page gives way to **"We couldn't load this"** with a working **Try again** — no crash page,
no invented figure — and the warm page is untouched: no wait, no error, real content. `alertCount=2` in
the cold run is Next's dev overlay *plus* our boundary, the same artefact the original report explains
(it was a false negative source once). Raw artefacts:
`runs/store-wait/surface-probe.{cold,warm}.{json,txt}` (rewritten today).

### 4. The five gates, in order

leak-check **PASSED** (18 public routes, nothing leaked) · typecheck **clean** · tests **278/278** · build
clean · store-freshness **PASSED** ("none of 9 store-reading route(s) was prerendered"). Store untouched —
every run was a read except the retries of a query that could not reach it.

### 5. No hole opened by the later tasks

Each new store-reading route sits under an existing boundary, so it inherits the behaviour rather than
needing its own:

- `/office/drafts`, `/office/enquiries`, `/office/settings`, `/office/account/[[...account]]` → under
  `app/office/` → `app/office/error.tsx` + `app/office/loading.tsx`.
- the public routes (incl. `/privacy`) → the root `app/error.tsx` / `app/loading.tsx` catch the `(site)`
  group (its layout is a *child* of root, so the root boundary catches a throw from it — the parent-segment
  rule, demonstrated live again here by the cold `/` run).
- the route handlers answer for themselves, which is the design: `/api/export` → `500` with a stated
  reason; `/api/upload` and `/api/tap` → `503`. A route handler is not a page and has no boundary above it.

## Not verified

- **The office *error* boundary has still not been exercised in a browser.** On the cold build
  `GET /office` showed the wait (9245 ms) and then landed at `/office/sign-in` — because this browser holds
  no session, so `requireOfficeSession()` redirects **before** any store read happens. Reaching that
  boundary needs a live signed-in session (the standing Checkpoint B gap). What *is* proven: the office
  **wait** renders; the office pages run on the same guard; and the parent-segment rule for `error.tsx` is
  demonstrated live by the root boundary catching a throw from the nested `(site)` layout. The remaining
  gap is narrow — that `app/office/error.tsx` catches a throw from `app/office/(shell)/layout.tsx` — and
  closes the moment the owner signs in on a cold build.
- **No sustained-concurrency test** (carried from the original report): the guard retries each query
  independently and jitter is what keeps a cold stampede from synchronising; that has not been measured
  under load. If it proves insufficient, a single-flight gate is the follow-up — evidence first.
- **The "wording" of the states** is deliberately TASK-005's, as the spec says. The text used here
  ("Just a moment / Setting things up", "We couldn't load this / Try again") is this layer's existing
  interim wording and is not a claim to the final copy.

## Findings

1. **The office error boundary is the one unexercised piece**, and only because it needs a session. It is
   the *same* narrow gap every office screen carries (Checkpoint B) — not a new one.
2. **A fabricated figure survives outside this task's blast radius, and should be ruled on:**
   `app/(site)/layout.tsx:88` renders `{num || "+234 800 000 0000"}` — when the `whatsapp_number` setting
   row is absent, the showroom **invents a phone number**. It is not a store-failure path (Task 29's
   concern) and it is not a *figure* in the money/stock sense, but truth 6 ("no invented data inside the
   system") is broad and the store does hold this setting today, so it is latent rather than visible.
   Flagged, not changed — it is TASK-003 showroom code and outside these files.
3. **A stale list to fix in Task 33:** `scripts/store-freshness-check.ts`'s `STORE_ROUTES` still claims
   *"the office's activity, enquiries and login pages read nothing and are expected to stay static"* —
   they read the store and are `force-dynamic`. The gate still passes (all nine listed routes are `ƒ`), but
   the comment is wrong and the list omits `/office/drafts`, `/office/enquiries`, `/office/car/[ref]` and
   `/office/settings`. Carried (also named in the Task 25 row).
