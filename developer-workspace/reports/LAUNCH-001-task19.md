# LAUNCH-001 Task 19 — Error tracking with scrubbing

**Status:** done; error tracking wired behind an optional DSN, scrubber unit-tested.

## What changed

- `lib/error-tracking.ts` (new) — `scrub` recursively removes known sensitive fields
  (customer names, phone numbers, costs, private notes, cookies, environment values) before
  anything is sent; `captureException` / `captureMessage` wrap Sentry with route/release/type
  context and no-op when Sentry is not initialized (no DSN).
- `lib/error-tracking.test.ts` (new) — unit tests for the scrubber (sensitive keys, nested
  objects/arrays, primitives unchanged).
- `instrumentation.ts` (modified) — server-side `Sentry.init` only when `SENTRY_DSN` is present.
- `instrumentation-client.ts` (new) — client-side `Sentry.init` only when
  `NEXT_PUBLIC_SENTRY_DSN` is present.
- `package.json` / `package-lock.json` — added `@sentry/nextjs` devDependency.

## Verified

- `npm run typecheck` — pass.
- `npm test` — 526 pass, 0 fail (includes 3 scrubber unit tests).
- `npm run lint` — 0 errors (13 pre-existing warnings, none in new files).
- `npm run format:check` — green.
- With no `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN`, Sentry is never initialized and `captureException`
  / `captureMessage` are no-ops — no error-tracker network call.

## Not verified / caveats

- Runtime checklist F2 requires a configured Sentry project/DSN (owner creates the account).
  With no DSN, the code path is a no-op, so this is recorded as NOT RUN until the owner sets up
  Sentry; no secret or customer value is sent in that case.
- The scrubber redacts known sensitive keys and contact/payment patterns; customer names are
  redacted via `customer`-prefixed keys. Free-form customer names in unkeyed strings are not
  detected (a known limitation of an allow-list scrubber).

## Evidence

- `lib/error-tracking.ts`
- `lib/error-tracking.test.ts`
- `instrumentation.ts`
- `instrumentation-client.ts`
- `package.json` / `package-lock.json`
