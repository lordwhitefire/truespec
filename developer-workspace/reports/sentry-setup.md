# Sentry setup — 2026-10-28

## Done

- Created Sentry project `lordwhitefire/truespec` (platform `javascript-nextjs`).
- DSN stored in:
  - local `.env.local` as `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` (gitignored);
  - Vercel project **`truespec-k4y6`** (the project behind the client URL), environments
    Production + Preview:
    - `SENTRY_DSN` (Secret)
    - `NEXT_PUBLIC_SENTRY_DSN` (Config)
- Local directory linked to `truespec-k4y6` (`.vercel/project.json`).
- Added `.vercel` to `.gitignore` (created by the Vercel CLI; contains project/org IDs).

## Verified

- `https://truespec-k4y6.vercel.app/` → HTTP 200.
- Sentry ingestion: a test error event sent through the DSN was accepted
  (`HTTP 200`, event id returned) and appeared as issue `TRUESPEC-1`.
  The test issue was then resolved.
- Both env vars listed in Vercel for Production and Preview.

## Deployment check (2026-10-28 04:34)

A new production deployment (`truespec-k4y6-h4wtiuijm-...`) is live and aliased to
`truespec-k4y6.vercel.app` (HTTP 200). The LAUNCH-001 pages are live too: `/terms`,
`/privacy`, `/llms.txt`, `/sitemap.xml`, `/robots.txt` all return 200. The deployed
client bundle contains the Sentry DSN (`main-app-8882e2d61ed817e0.js`), so the
browser-side wiring is live. Sentry shows no issues yet — no app error has occurred.

## Not verified

- A real app error has not been thrown in production yet. Capture is verified by the
  DSN being present in the deployed bundle and by the earlier ingestion test, not by a
  live thrown error.

## Project mix-up (corrected)

There are four Vercel projects for this app:

| Project | Role | Action |
| --- | --- | --- |
| `truespec-k4y6` | **Real project** — owns `truespec-k4y6.vercel.app`, has demo/backup/cron vars | **Keep** |
| `truespec` | Old copy, no DB/Clerk/Sanity vars, alias 500s | Delete |
| `truespec-x8fo` | Old copy, has base vars but no demo/backup/cron vars | Delete |
| `truespec-miqx` | Old copy | Delete |

While identifying the live project I initially picked `truespec-x8fo` and moved the
`truespec-k4y6.vercel.app` domain onto it. That was wrong. The domain has been moved
back to `truespec-k4y6` (verified project domain, HTTP 200). `truespec-x8fo` and
`truespec` also received the two Sentry env vars during the mix-up; they are harmless
and disappear when those duplicate projects are deleted.

## Finding for the owner

**Git deployments disabled.** `truespec-k4y6` has
`gitProviderOptions.createDeployments = "disabled"`, so pushing to `main` will not
create a Vercel deployment. Production must be deployed another way (`vercel --prod`)
or the setting must be re-enabled.
