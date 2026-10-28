# Environments

TrueSpec has three environments: local, preview and production. There is no separate staging
environment.

## Environments

| Environment | Purpose                        | Database                                | Assets                    |
| ----------- | ------------------------------ | --------------------------------------- | ------------------------- |
| Local       | Developer machine, testing     | Demo Neon branch (local `DATABASE_URL`) | Local Sanity assets       |
| Preview     | Preview deployments for review | Demo Neon branch                        | Sanity `preview` dataset  |
| Production  | Public showroom and office     | Main Neon branch                        | Production Sanity dataset |

## Preview isolation

Preview uses the **demo Neon branch** and the separate Sanity **`preview`** dataset. Preview never
points at the production database or the production asset store.

The Vercel Preview environment is configured as:

| Variable                | Preview value    |
| ----------------------- | ---------------- |
| `DATABASE_URL`          | demo Neon branch |
| `DATABASE_URL_UNPOOLED` | demo Neon branch |
| `DEMO_DATABASE_URL`     | demo Neon branch |
| `SANITY_DATASET`        | `preview`        |
| `NEON_BRANCH`           | `demo`           |

Production has separate values for the same keys. The `preview` dataset carries a copy of the
production assets with their original asset ids, so the demo database's asset references resolve.
Preview deployments are protected by Vercel SSO; `vercel curl` is the CLI path for checking one.

## Deployment rollback

Rollback restores the previous deployment. Because deployments are versioned, reverting to an
earlier deployment restores the code and configuration that were live at that point.

Forward-only migrations (schema changes that cannot be reversed) are noted in the migration
itself; a rollback does not undo a forward-only data migration. Data seeded or migrated after the
rolled-back deployment is not reverted by a code rollback.

## Migration and seed

- Migrations: `npm run db:migrate` — applies schema migrations to the target database.
- Seed: `npm run db:seed` — seeds demo/demo data only, never production.
