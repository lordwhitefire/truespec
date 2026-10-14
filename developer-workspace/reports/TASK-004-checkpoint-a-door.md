# TASK-004 — Checkpoint A: the door

**Date:** 2026-10-14 · **Covers plan tasks 1–6.** This is the first of the three owner
checkpoints (plan §Checkpoints, A = the door, before any screen writes to the store).

---

## What was asked

Make the office have a real door: the identity provider carries the sign-in, our own
session row enforces both lifetime limits, every office route is refused on the server
without a session, and no password form or sign-up path exists anywhere.

---

## What is built

### 1. Clerk, installed and wired (task 3)
- `@clerk/nextjs@7.9.15` installed; `middleware.ts` (bare `clerkMiddleware()`, as the
  installed Clerk skill requires — `createRouteMatcher` is deprecated in SDK 7).
- `ClerkProvider` wrapped **inside `<body>`** in `app/layout.tsx`.
- `lib/config.ts` now reads the standard `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` plus
  `CLERK_SECRET_KEY`; both are real keys (the secret is 50 chars, `sk_`-prefixed), so
  session revocation works.
- The provider's app is in **invite-only** mode (confirmed live from the instance:
  `sign_up_mode = "restricted"`), so no public account can be created. Its own 10-fail
  lockout is on (design D4).
- Evidence: `developer-workspace/runs/TASK-004-clerk-init.txt`.

### 2. Our own session row (task 4)
- `lib/session-rules.ts` — the two limits and the cooldown as **pure rules**: 7 days
  total (strict), 12 idle hours (inclusive), `last_seen_at` refreshed on a 5-minute
  cooldown.
- `lib/session.ts` — `checkOfficeSession()` finds or lazily creates our row, keyed by
  `clerk_session_id` (the unique column TASK-003 already added), and judges it. The
  owner row is matched by **email** — `office_user` carries no provider-user column, by
  design. No webhook, no callback route.
- `endSession()` revokes the provider's session **and** drops our row, provider first:
  dropping the row first would let the lazy upsert recreate it from a live provider
  session and revive a session we had just ended.

### 3. The door screens (task 5)
- The door is at **`/office/sign-in`**, mounting the provider's own `<SignIn/>` inside
  the office's look (`app/office/door.css` — same Oswald/gold theme).
- `/office` and all seven office pages redirect to it with no session; the guard is in
  the `(shell)` layout **and** in every page, because a layout is not re-run on every
  navigation and is never a substitute.
- The shell now shows **the session's own email**; "Signed in as Umar" is gone.
- Sign-out is a **POST** (Server Action `signOutOffice`) that revokes and deletes, then
  hands the browser to `/office/sign-out`, whose client code clears the provider's
  cookie — so a tab left open is refused on its next request.
- The fake `/office/login` (with its hardcoded `umar@truespec.ng` / password fields) and
  Clerk's generated root `/sign-in` and `/sign-up` are removed. There is no password
  form and no sign-up path.

### 4. The refusal proof (task 6)
`developer-workspace/scripts/task-004/refusal-proof.ts` — walks every office route with
no session and with a forged provider cookie, and asserts the route is refused, goes to
the door, and carries no shell markup or office data; that the public routes stay open;
and that the removed routes 404.

---

## What is verified

| Gate | Result |
|---|---|
| `npm run leak-check` | **PASSED** (dev and production) |
| `npm run typecheck` | **PASSED** |
| `npm test` | **71/71 PASSED** (incl. 7 new session-rule tests) |
| `npm run build` | **PASSED** — every office route is `ƒ` (dynamic, never prerendered) |
| `npm run store-freshness` | **PASSED** — none of 9 store-reading routes prerendered |

| Witness | Result |
|---|---|
| `scripts/task-004/session-row-check.ts` (real store) | **10/10** — the exact SQL runs: the owner-row upsert is idempotent by email, `expires_at` is exactly `created_at + 7 days`, a reload reuses the same row, a duplicate `clerk_session_id` is refused |
| `scripts/task-004/refusal-proof.ts` (dev) | **35/35** |
| `scripts/task-004/refusal-proof.ts` (**production**) | **35/35** |

**Every office route refuses:** `/office`, `/office/inventory`, `/office/activity`,
`/office/enquiries`, `/office/settings`, `/office/car`, `/office/car/new` all return
`307` to `/office/sign-in`. A fabricated `__session` cookie is refused identically. No
response body contains shell markup (`class="shell"`, `class="side"`, the nav icon) or
any office data (a car reference, a `₦` figure, the cost vocabulary). Public routes stay
open. `session` and `office_user` still hold **0 rows** after all of this — the refusal
happens before any write.

---

## What is NOT verified — and needs you

1. **A real sign-in has not been run.** The session row's SQL is proven against the live
   store with throwaway rows, but the path through a genuine provider session — the lazy
   upsert creating the one owner row from your account — has not been executed. This is
   what Checkpoint A is for: sign in at `/office/sign-in` and tell me what you see.
2. **Sign-out end-to-end** (the row gone, the provider session revoked, the shell
   refusing a left-open tab).
3. **The idle/7-day path.** Its logic is unit-tested and the revocation call is
   exercised only by the same live session as (1); the 12-hour crossing itself cannot be
   waited out, so I will test it by pushing a real session's `last_seen_at` 13 hours back
   in the store and re-requesting, once a live session exists.

---

## Decisions I made where the authority was silent (please glance at these)

1. **No second cookie.** The plan's Task 4 acceptance criterion said "cookie
   `HttpOnly, SameSite=Lax, Secure`". D4 and D17 settle that the **provider** holds the
   session cookie and our row is looked up by `clerk_session_id` — so a second,
   app-issued cookie would have been a second truth about the same thing. The `Secure` /
   `HttpOnly` / `SameSite=Lax` requirement is met by Clerk's own cookie; the spec's
   sign-out inspection ("the session cookie is `HttpOnly`, `SameSite=Lax` and `Secure`")
   inspects that one cookie. **We set none of our own.**
2. **An invalid session is *ended*, not merely refused.** `specs/office-access` says the
   idle case ends with "the next action requires a fresh sign-in", and the active week
   with "the session ends and a fresh sign-in is required". Refusing alone would be
   bounced straight back inside: the provider session outlives our row, and the lazy
   upsert would recreate the row on the next request. So when a limit is crossed we
   revoke the provider's session too, and route the browser through a client-side
   sign-out (`/office/sign-out`) that clears the shared cookie — otherwise the owner
   could be caught in a redirect loop.
3. **Sign-out is a POST, two steps.** A Server Action revokes and deletes; a client
   component then clears the provider's cookie. Either alone leaves the other end of the
   session alive.

---

## What I changed outside `developer-workspace/`

- **`.env.local`** (the owner's file): repointed `NEXT_PUBLIC_CLERK_SIGN_IN_URL` to
  `/office/sign-in` and its fallback redirect to `/office`, and **removed** the two
  `..._SIGN_UP_...` variables — there is no sign-up path. The file was written by
  `clerk init` in task 3, so these are values I added being corrected, not yours.
- **Removed** `app/office/login/` (the fake password door, 386 lines) and Clerk's
  generated `app/sign-in/` and `app/sign-up/`.

**Still sitting in `.env.local`, not touched:** `CLERK_PUBLISHABLE_KEY` (line 8) — a
TASK-001 placeholder that `lib/config.ts` no longer reads. Its comment block also still
calls the keys placeholders, which is now stale (`CLERK_SECRET_KEY` is real). Say the
word and I will clean both up.

---

## Notes for whoever picks this up

- Hardcoded `"Umar"` still appears in the **demo page content** — the settings activity
  chips, the dashboard's two feed panels, the activity log's placeholder copy, and the
  enquiry WhatsApp template. Those screens are stubs this layer replaces with real data
  (tasks 7+); the shell's own name is now the session's email.
- `app/api/` still does not exist, so there are no office Route Handlers to refuse yet.
  The refusal proof reports this explicitly and will start asserting `401` on each one
  the moment `app/api/` appears.
- Servers: dev on `:3210`; the reference static site on `:3211`. Production was built and
  run on `:3212` only for the gate above, and has been stopped.
- The `office_user` table has 0 rows, so the first real sign-in will create the one
  owner row from your provider account's email.

---

## Next

Task 7 — the car's life and the registries (the state model, D15), running up to
**Checkpoint B**. Nothing behind the door writes to the store until you have signed in
and confirmed this checkpoint.
