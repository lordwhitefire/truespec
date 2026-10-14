# Plan — resilience layer (TASK-004, Task 29 pulled forward)

Smallest change that satisfies D18 + truth 16 and the owner's two asks. Steps verified as each lands;
two hats kept apart (add function, don't restructure).

Authority: `openspec/changes/truespec-architecture/design.md` **D18**; truth 16 / acceptance 20 in
`openspec/tasks/TASK-004/task.md`; Neon's documented retry guidance (5 attempts, exponential backoff,
1 s → 16 s cap, **jitter**, retry **transient only**); the project's own split of pure rules
(`lib/session-rules.ts`) from the server-bound half (`lib/session.ts`).

## Steps

| # | Step | Where | State |
|---|---|---|---|
| 1 | Retry policy as pure rules (attempts, backoff, jitter, transient vs permanent) | `lib/store-retry-rules.ts` | ✅ |
| 2 | Unit tests pinning the policy | `lib/store-retry-rules.test.ts` | ✅ 12/12 |
| 3 | The one shared guard — every store read goes through it | `lib/store-guard.ts` | ✅ |
| 4 | Point the four store modules at the guard | `lib/session.ts`, `lib/office.ts`, `lib/public-cars.ts`, `lib/cleanup.ts` | ✅ 17 call sites |
| 5 | The "just a moment" screen (the wait) | `components/store-waking.tsx` | ✅ |
| 6 | The retryable state (every attempt failed) | `components/retryable.tsx` | ✅ |
| 7 | Route boundaries: loading + error | `app/loading.tsx`, `app/office/loading.tsx`, `app/error.tsx`, `app/office/error.tsx` | ✅ (office *error* not yet exercised — needs a session) |
| 8 | Witness: store unreachable → retryable state, no 500, no invented figure; store slow → "just a moment" appears | `developer-workspace/scripts/task-004/resilience-check.ts` + `resilience-probe.mjs` | ✅ |
| 9 | Five gates + browser check | — | ✅ |

Report: `developer-workspace/reports/TASK-004-resilience.md`. The retry loop is also proven
deterministically — the policy and the loop run against a fake operation in `lib/store-retry-rules.test.ts`,
so the number of attempts, which failures are retried and the delays are pinned rather than observed.


## Boundary placement (from the current docs, not memory)

`loading.js` wraps **nested** `layout.js` files but **not** the layout in its own segment (Next docs
v16.4; the mechanism is unchanged in the installed 15.5). Both slow layouts await the store:

- `app/office/(shell)/layout.tsx:19` → `requireOfficeSession()`
- `app/(site)/layout.tsx:53` → `getSetting()` / `getPublicCars()`

So the wait-that-shows must sit in a **parent** segment: `app/office/loading.tsx` (covers `(shell)`) and
`app/loading.tsx` (covers `(site)`). A `loading.tsx` beside either slow layout would show nothing.

The loading fallback is styled **inline**: at `app/loading.tsx` it streams before the `(site)` layout —
and therefore before that layout's CSS — has resolved.

## Two things worth stating plainly

- **All our writes are already idempotent** (`ON CONFLICT … DO UPDATE … RETURNING`, and idempotent
  `UPDATE`/`DELETE`), so retrying a write after an unacknowledged reply cannot double-apply. That is
  Neon's documented precondition for retrying, and it already holds.
- **No separate "wake" probe.** Retrying the real query is enough and avoids a second round-trip and a
  false "already awake" window. If the witness shows concurrent cold requests stampeding, a single-flight
  gate is the follow-up — evidence first.

## Not done here

State wording (TASK-005); caching; any change to what a page shows when the store *is* awake.
