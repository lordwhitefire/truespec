# Developer handover

This document hands the TrueSpec launch layer over to the next developer or the owner. It links
to the canonical sources rather than duplicating them.

## Entry point

- `README.md` — product, public/office split, stack, directory map, prerequisites, install,
  environment, migrations, seed, tests, build, deployment, main/demo boundaries, operational
  commands and links to OpenSpec.

## Public/office split

- Public showroom: `http://127.0.0.1:3210` locally, `https://truespec-k4y6.vercel.app` in
  production. Reads the public car set; never takes payment.
- Private office: `/office/*`, invitation-only, Clerk sign-in.
- Demo office: separate practice space; demo identities live until the owner removes them;
  daily reset never touches identities, main rows or main assets.

## Stack

- Next.js 15 (App Router), React Server Components, TypeScript.
- Neon Postgres (Lakebase): demo branch for local/preview, main for office/public.
- Sanity: car cover assets.
- Clerk: authentication (public showroom needs no account; office is invitation-only).
- Self-hosted fonts (`next/font/google`) and local Font Awesome.

## Configuration

- `.env.example` names every variable used by the app, scripts and cron routes, with
  required/optional marked and no real secrets. Copy to `.env.local` and fill in values.
- `lib/config.ts` (`getConfig`, `assertConfig`) validates required variables at startup and
  throws a `ConfigError` naming any missing variable and pointing to `.env.local` and the
  README.
- `Sentry` is wired behind optional `SENTRY_DSN` (server) / `NEXT_PUBLIC_SENTRY_DSN`
  (client). With no DSN, no error-tracker network call is made.

## Commands

- `npm install` — install dependencies.
- `npm run db:migrate` — apply schema migrations.
- `npm run db:seed` — seed demo data only (never production).
- `npm test` — unit suite (helper, not the release gate).
- `npm run typecheck` — TypeScript check.
- `npm run lint` — ESLint over app code, scripts and tests.
- `npm run format:check` — Prettier check over app code, scripts and tests.
- `npm run build` — production build.
- `PORT=3210 npm start` — local production build on port 3210.
- `npm run smoke-test` — Playwright smoke test against `:3210` (attaches to Chrome on CDP
  `:9222`; never launches a browser).

## Release gate

The release gate is the agent-run browser checklist
(`developer-workspace/procedures/LAUNCH-001-runtime-checklist.md`), executed through the
standing browser procedure. It is not a GitHub Actions workflow or branch protection. The owner
decides whether to push.

## OpenSpec references

- `openspec/tasks/LAUNCH-001/task.md` — task guarantees and benchmarks.
- `openspec/changes/launch-foundations/` — change specifications (site-discovery, public-trust,
  security, site-design, etc.).
- `openspec/tasks-registry.md` — task registry.
- `openspec/changes/launch-foundations/tasks.md` — change tasks.

## Environment and deployment

- `docs/environments.md` — local, preview and production; preview uses the demo Neon branch and
  the Sanity `preview` dataset; no separate staging environment; the owner scopes the Vercel
  Preview environment variables.

## Machine-readable routes

- `app/robots.txt`, `app/sitemap.xml`, `app/llms.txt` — public crawler truth.

## Legal pages

- `app/(site)/terms/page.tsx` — terms of service (owner-approved).
- `app/(site)/privacy/page.tsx` — privacy notice.

## Reports

- `developer-workspace/reports/` — per-task reports (Tasks 6–23) and the release handoff
  (`LAUNCH-001-handoff.md`, Task 28).

## Owner decisions and gates

- Terms wording: drafted in-house, seller "TrueSpec Automotive", governing law Federal Republic
  of Nigeria (Lagos); owner approves before publish.
- Sentry project + `SENTRY_DSN`: owner creates the project.
- UptimeRobot monitor + owner alert email: owner creates the account and monitor.
- Vercel Preview environment scoped to the demo Neon branch and Sanity `preview` dataset: owner
  scopes the preview env and creates the dataset.
- Demo identities: live until the owner removes them; daily reset never touches identities,
  main rows or main assets.

## Working-tree discipline

- Commit per task; do not squash multiple tasks into one commit.
- Stage explicit paths only; never `git add -A`.
- Do not commit or push the owner's uncommitted DEMO-001/OpenSpec files
  (`.opencode/agent/product-management-agent.md`, `openspec/`, `product-management/`,
  `developer-workspace/notes/DEMO-001*`, `developer-workspace/plans/DEMO-001*`).
- The owner handles pushes.
