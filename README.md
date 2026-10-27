# TrueSpec

Nigerian vehicle-import showroom. Public pages let buyers browse, judge a car completely and buy
through WhatsApp. A private office manages stock, drafts, enquiries and settings.

## Public / office split

| Surface | URL | Who |
|---------|-----|-----|
| Public showroom | `http://127.0.0.1:3210` (dev) / `https://truespec-k4y6.vercel.app` (prod) | Anyone |
| Private office | `/office/*` | Invitation-only, Clerk sign-in |
| Demo office | Separate practice space; data resets daily | Demo identities until the owner removes them |

The public showroom never writes to production; it only reads the public car set. The office is a
separate signed-in space.

## Stack

- Next.js 15 (App Router), React Server Components
- TypeScript, strict
- Neon Postgres (Lakebase) — public showroom reads the demo branch; office reads main
- Sanity — images and car cover assets
- Clerk — authentication (public showroom needs no account; office is invitation-only)
- Self-hosted fonts (`next/font/google`) and local Font Awesome

## Directory map

```
app/              Next.js App Router (public routes under app/(site), office under app/office)
components/       Shared UI (Photo, FeaturedSlider, ThemeToggle, office components)
lib/              Business rules (public cars, photo URL, structured data, tap, session, config)
docs/             Operational docs (cookies, accessibility, security, rate limits, ...)
developer-workspace/  Agent scratch: plans, reports, scripts, briefs, notes
openspec/         Product specification (tasks, changes, specs, registry)
scripts/          DB migration, seed, backup, demo-reset, leak-check
```

## Prerequisites

- Node.js (see `.nvmrc`/`package.json` engines if present)
- A Neon Postgres database (demo branch for local/dev, main for office)
- A Clerk instance (publishable + secret key)
- A Sanity project (project ID + dataset + token)

## Install and configure

```bash
# 1. Install dependencies
npm install

# 2. Copy the environment example and fill in your values (no secrets committed)
cp .env.example .env.local

# 3. Run migrations against your database
npm run db:migrate

# 4. Seed (demo/dev data only — never production)
npm run db:seed

# 5. Typecheck
npm run typecheck

# 6. Test
npm test

# 7. Build
npm run build

# 8. Start locally
PORT=3210 npm start
```

## Environment variables

All variables used by the app, scripts and cron routes are named in `.env.example`, with
required/optional marked. `.env.example` contains only empty or obvious placeholder values — no
real keys, tokens or connection strings.

Named variables include `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH`, `NEON_API_KEY`,
`CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `SANITY_PROJECT_ID`, `SANITY_DATASET`,
`SANITY_TOKEN`, `SESSION_SECRET`, `NEXT_PUBLIC_CLERK_*`, `DEMO_*`, `BACKUP_ENCRYPTION_KEY`,
`CRON_SECRET`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`.

## Tests, build and deployment

- `npm test` — unit suite (lib tests; helper, not the release gate)
- `npm run typecheck` — TypeScript check
- `npm run build` — production build
- `PORT=3210 npm start` — local production build on port 3210

The release gate is the agent-run browser checklist (runtime checks in a real attached browser),
not a GitHub Actions workflow or branch protection. The owner decides whether to push.

## Main / demo boundaries

- Demo identities live until the owner removes them.
- Daily demo reset never touches demo identities, main rows or main assets.
- The public showroom reads main; the office resolves the signed-in space.
- No new route exposes private data.

## Operational commands safe against production

Read-only commands (safe against production): `npm test`, `npm run typecheck`, `npm run build`.
Write commands (care — can modify data): `npm run db:seed`, `npm run db:migrate`,
`npm run backup:restore`, `npm run demo:snapshot`, `npm run demo:wipe`.

## Monitoring

- `docs/monitoring.md` — UptimeRobot monitor for `https://truespec-k4y6.vercel.app/` (5-minute
  interval, alerts the owner). The owner creates the account and monitor; with no monitor
  configured, runtime checklist F1 is `NOT RUN`.
- Error tracking: `docs/security.md` — Sentry behind optional `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`;
  with no DSN no error-tracker network call is made.

## Links

- OpenSpec tasks: `openspec/tasks/LAUNCH-001/task.md`
- OpenSpec changes: `openspec/changes/launch-foundations/`
- Task registry: `openspec/tasks-registry.md`
- Runtime checklist: `developer-workspace/procedures/LAUNCH-001-runtime-checklist.md`
- Agent reports: `developer-workspace/reports/`

## Licence

All rights reserved. TrueSpec Automotive.
