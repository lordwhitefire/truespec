# LAUNCH-001 Task 26 — Clean-clone proof

**Status:** run 2026-10-28 against the committed tree. **Clone path:**
`/tmp/opencode/truespec-a1` (`git clone` of this repository into an empty directory).

## Procedure (follow only the README)

1. `npm install` — install dependencies.
2. `cp .env.example .env.local` then fill in the prerequisites.
3. `npm run db:migrate` — apply schema migrations.
4. `npm run db:seed` — seed demo data only (never production).
5. `npm test` — unit suite.
6. `npm run typecheck` — TypeScript check.
7. `npm run build` — production build.
8. `PORT=3210 npm start` — local production build on port 3210.

## Environment used for the clone

The working `.env.local` points `DATABASE_URL` at the **production** Neon branch. The clone did
**not** inherit that. After copying the file, `DATABASE_URL` and `DATABASE_URL_UNPOOLED` were
overridden with `DEMO_DATABASE_URL` (demo branch `ep-rough-smoke-b2d1vf9j`), so migrate and seed
could run without touching production. This is the documented "fill in the values" step, pointed at
the demo branch as the README requires.

## Commands and results

| Command | Result |
|---------|--------|
| `npm install` | 431 packages, ~30 s |
| `npm run db:migrate` | `up to date — no migrations applied` (demo branch) |
| `npm run db:seed` | `17 fleet car(s) synced`, 6 secondary links, 49 photos, 6 enquiries; `nothing deleted` |
| `npm run typecheck` | pass (`tsc --noEmit`) |
| `npm test` | 526 pass, 0 fail, 10 suites |
| `npm run build` | pass (production build; route list includes `/`, `/inventory`, `/car/[ref]`, `/privacy`, `/terms`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`) |
| `PORT=3212 npm start` | 200 on `/`, `/inventory`, `/car/TS-1001`; server stopped after the check |

Port 3212 was used because the release surface already holds 3210; the documented command's port is
configurable and no other step changed.

## Notes

- `npm run db:seed` writes to whatever `DATABASE_URL` points at. It deletes nothing, but it must
  point at the demo branch, never main. The clone was configured that way.
- `.env.example` declares 25 variables, all empty or obvious placeholders; the 21 project
  variables read by app/scripts/crons are all declared (`NEXT_RUNTIME` is provided by Next.js).
  No real key, token or connection string is in the file.
- The release gate is the agent-run browser checklist
  (`developer-workspace/procedures/LAUNCH-001-runtime-checklist.md`), executed in a real attached
  browser — not a GitHub Actions workflow or branch protection. The owner decides whether to push.

## Working-tree discipline observed

- Commits are per task; no `git add -A`; explicit paths staged only.
- The owner's uncommitted DEMO-001/OpenSpec files
  (`.opencode/agent/product-management-agent.md`, `openspec/`, `product-management/`,
  `developer-workspace/notes/DEMO-001*`, `developer-workspace/plans/DEMO-001*`) were not touched
  or committed.
