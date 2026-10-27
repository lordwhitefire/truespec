# Release checklist

Pre-merge checklist run against the local/demo branch before the owner pushes.
The checklist is the pipeline: every check has an expected result and evidence;
no check is claimed from a script alone. The owner decides whether to push.

## Machine-readable routes (Tasks 11-12)
- `/robots.txt` — 200, `text/plain`; `Allow: /`, `Disallow: /office/`, `Disallow: /api/`,
  names the canonical sitemap. (Runtime checklist B7)
- `/sitemap.xml` — 200, `application/xml`, parses as XML; absolute URLs; home, inventory,
  privacy, `/terms` and every public car; sold/unlisted/unknown cars absent. (Runtime checklist B8)
- `/llms.txt` — 200, `text/plain`; business description, page links, naira price rule,
  configured WhatsApp contact; no forbidden token or office/cost/customer/demo term.
  (Runtime checklist B9)

## Legal pages (Tasks 13-14)
- `/terms` — 200; owner-approved terms with last-updated date and owner/review record
  (E1 — NOT RUN until owner approval).
- Footer links `/terms` from home, inventory and a car page (E2).
- `/privacy` — 200; owner and last-updated date present; contact is the configured
  WhatsApp channel; no email/self-service channel promised (E6).
- No unrecorded tracker; no promise the site cannot keep.

## Security headers and CSP (Task 16)
- `robots.txt`... headers present on public responses: `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`
  (D6).
- CSP present and enforcing; home, inventory, car, privacy and terms render with no
  CSP violation in the console; Clerk sign-in loads; fonts and icons load (D7).

## Smoke test (Task 18)
- `npm run smoke-test` — home, inventory and a car page load with their main heading;
  an anonymous office request is sent to sign-in and no office data renders.
  Runs against `:3210`; no database secret is required. (D5)

## Lint and format (Task 17)
- `npm run lint` — exits non-zero on a lint error. (D1)
- `npm run format:check` — reports without rewriting; exits non-zero on a mismatch. (D1)

## How to run
1. Build locally: `npm run build` (`:3210`).
2. Start locally: `PORT=3210 npm start`.
3. Run the smoke test: `npm run smoke-test` (attaches to the Chrome on CDP `:9222`;
   never launches a browser, never opens a tab).
4. Run lint and format: `npm run lint` and `npm run format:check`.
5. Record PASS/FAIL/NOT RUN with evidence in the handoff (Task 28).

## Owner-only setup (NOT RUN until the owner does it)
- Sentry project + `SENTRY_DSN` (error tracking, Task 19).
- UptimeRobot monitor + owner alert email (uptime, Task 20).
- Vercel Preview environment scoped to the demo Neon branch and Sanity `preview`
  dataset (preview isolation, Task 22).
