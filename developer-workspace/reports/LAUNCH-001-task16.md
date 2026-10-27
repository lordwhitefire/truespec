# LAUNCH-001 Task 16 — Security headers and CSP

**Status:** done; CSP enforcing with zero violations; high-risk change isolated in its own commit.

## What changed

- `lib/security-headers.ts` (new) — one header configuration for every response:
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`,
  `Strict-Transport-Security`, and `Content-Security-Policy`. CSP accounts for Clerk,
  Sanity images, Clerk brand images, Unsplash design backgrounds, self-hosted fonts and local
  Font Awesome; nothing else is a named source. `'unsafe-inline'` is scoped to scripts (Clerk +
  Next.js inline-script trade-off, documented); `worker-src 'self' blob:` covers Clerk workers.
- `next.config.mjs` (modified) — `headers()` applies the config to every route (`/:path*`).
  Flipped from report-only to enforcing after the local exercise showed no violations.
- `docs/security.md` (new) — headers table, full CSP directive, source rationale, and what to do
  if a violation appears.
- `developer-workspace/scripts/LAUNCH-001/security.mjs` (new) — D6/D7 runtime script.
- `developer-workspace/reports/LAUNCH-001-task16.md` (this report).

## Verified

- `npm run typecheck` — pass.
- `npm run build` — pass; `/privacy`, `/robots.txt`, `/sitemap.xml`, `/terms` all build.
- Runtime script (D6/D7) — 21/21:
  - D6: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`,
    `Permissions-Policy`, `Strict-Transport-Security` present on home, inventory, car, privacy,
    terms.
  - D6: CSP present on every public response.
  - D7: home, inventory, car, privacy, terms render; **0 CSP violations in the console** with
    the enforcing CSP.
  - D7: `/office/sign-in` reachable (Clerk sign-in loads); fonts and icons load (no
    request-failed on media/fontawesome/clerk).
  - tabs unchanged (4→4); 1 Chromium; no Chrome launched.

## Not verified / caveats

- `'unsafe-inline'` for scripts is a documented trade-off required by Clerk/Next.js inline
  scripts; it is narrowly scoped and recorded here rather than silently widening the whole
  policy.
- Clerk sign-in was tested as an anonymous office door (reachability + no office data renders);
  a full authenticated Clerk session requires the separate testing session (owner-only).
- The owner's visual look check on headers/CSP is not applicable (headers are invisible).

## Evidence

- `lib/security-headers.ts`
- `next.config.mjs` (headers section)
- `docs/security.md`
- `developer-workspace/scripts/LAUNCH-001/security.mjs`
- `/tmp/opencode/security-task16c.json`
