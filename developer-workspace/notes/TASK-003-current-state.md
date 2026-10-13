# TASK-003 — current state, at the start of the build

**Date:** 2026-10-13 · **Verified by:** reading the files on disk and running the four gates (this session).
Everything below is what the tree actually says today — not what a task or a plan says it should say.
**Change-point map for:** `migrations/0008…0015`, `scripts/seed*.ts`, `lib/office.ts`, `lib/serialize.ts`,
`scripts/reconcile.ts`.

---

## 1. The schema as built (`migrations/0001…0007`)

Applied migrations today: `0001_people`, `0002_registries`, `0003_car`, `0004_enquiries`,
`0005_feed_settings`, `0006_indexes`, `0007_office`. Read in full; the columns that matter to this task:

| Table | Columns that matter here | What is wrong for TASK-003 |
|-------|--------------------------|----------------------------|
| `office_user` | `id`, `email` NOT NULL UNIQUE, `password_hash text NOT NULL`, `created_at`, `updated_at` | password material must go |
| `session` | `user_id` FK→`office_user` CASCADE, `created_at`, `last_seen_at`, `expires_at` | no column names the provider session |
| `auth_attempt` | `ip text NOT NULL`, `at`, `ok` | **stays** — the one stored address with a job (C2) |
| `car_state` | `id`, `label text NOT NULL` (**not unique**), `section text NOT NULL CHECK (available\|on order\|landed)`, `is_new_arrival`, `sort` | label must be unique; no colour |
| `enquiry_state` | `id`, `label text NOT NULL` (**not unique**), `sort` | label must be unique; no colour, no section (correct) |
| `car` | `ref text NOT NULL UNIQUE`, `state_id` FK→`car_state` RESTRICT, `version`, `exterior_color text`, `interior_color text`, **`deleted_at timestamptz`** (tombstone), timestamps | no `is_demo` |
| `cost_line` | `car_id` FK CASCADE, `kind` CHECK(6 kinds), **`currency text NOT NULL CHECK (USD\|NGN)`**, **`rate_minor`**, `CONSTRAINT cost_line_usd_needs_rate`, `CONSTRAINT cost_line_ngn_no_rate`, `amount_minor` | rate + currency must go; no `UNIQUE (car_id, kind)` |
| `sale` | `car_id` UNIQUE FK CASCADE, `sale_price_kobo bigint NOT NULL`, `sold_at` | nothing (already one sale per car) |
| `car_photo` | `car_id` FK CASCADE, `sanity_asset_id text NOT NULL`, `position`, `UNIQUE (car_id, position)` | no `origin` |
| `enquiry_pdf` | `id`, `path text NOT NULL`, `filename`, `rows_total`, `imported_at`, **`deleted_at timestamptz`** | `path` is an asset ref (rename); `deleted_at` must go |
| `enquiry` | `name`, `number`, `car_ref text` (no FK), `note`, `enquiry_state_id` FK RESTRICT, `pdf_import_id` FK SET NULL, `created_at`, `updated_at` | no `is_demo`; **no `deleted_at`** (correct — nothing is added) |
| `tap` | `page`, `car_ref text`, `at`, **`ip text NOT NULL`** | `ip` must go |
| `activity_event` | `kind`, `subject text NOT NULL`, `at`, `actor_id` FK SET NULL | stays as-is (subject carries the ref) |
| `setting` | `key` PK, `value`, `updated_at`; rows: `whatsapp_number`, `tagline`, `full_tank_default` | no rate key exists (correct) |
| `office_car` | `ref` UNIQUE, `brand`, `model`, `state text CHECK(Available\|On the way\|At port\|Cleared\|Landed)`, `is_new_arrival`, timestamps | **retires** — the office's second car table |

Notes that matter downstream:

- **Cost kinds (6):** `purchase_price`, `shipping`, `clearing`, `trucking_usa`, `trucking_ng`, `full_tank`.
- **Base registries are seeded by `0002`:** car states `Available`(available) `On the way`/`At port`/`Cleared`
  (on order) `Landed`(landed, new arrival); enquiry states `New` `Talking` `Negotiating` `Sold` `Lost`.
- **`car.deleted_at` (tombstone) stays** — the store reports, the owner deletes (plan Task 19 reads tombstone age).
- **RLS is on for every table** and deliberately not the boundary; the app connects as owner (D2/D5).
- `enquiry.car_ref` and `tap.car_ref` are **text with no FK by design** (a ref outlives the car).
- `mileage` is `car.mileage` (kilometres); the miles figure lives on `office_car` only, so it retires with it.

## 2. The migration runner (`scripts/migrate.ts`)

Creates `schema_migrations (name, applied_at)` if missing; reads applied names; applies `migrations/*.sql`
**sorted**; inserts each name. **No checksums** — so an edited applied file would not be caught: hence
forward-only corrective files, never edits. `npm run db:migrate`.

## 3. The read/write surface

- **`lib/` (18 files):** `config.ts`, `db.ts`, `money.ts` (+test), `counts.ts` (+test), `overview.ts` (+test),
  `refs.ts` (+test), `sale.ts` (+test), `sections.ts` (+test), `rules.smoke.test.ts`, `office.ts` (**the TASK-002
  "seam"; main re-point target**), `public-cars.ts` + `serialize.ts` (**the only public read path**).
- **Tests:** `npm test` = `node --import tsx --test "lib/**/*.test.ts"` — 7 suites, **47 tests**.
- **`scripts/`:** `leak-check.ts` (fetches public routes on `LEAK_BASE_URL ?? http://localhost:3210`),
  `migrate.ts`, `reconcile.ts` (TASK-002 reconciliation over `office_car` — must be re-pointed, not deleted),
  `seed.ts`, `seed-office.ts` (**runs `main()` at import — never import it**).
- **App routes (13):** public `/`, `/inventory`, `/car/[ref]`, `/privacy`, `/not-found`; office `/office`
  (`(shell)` page, `activity`, `car`, `car/new`, `enquiries`, `inventory`, `settings`, `login`).
- **`lib/serialize.ts`** branches at `resolvePhotoUrl` on photo URL-vs-asset-id — that branch is removed (Task 18).
- Top-level oddities that must not be touched: `product-management/`, `design-workspace/`, `decisions/`,
  `demo_product.pdf`.

## 4. Environment, ports, commands (verified)

- **Servers now:** `next dev` on **`:3210`** (pid restarted this session; log `/tmp/opencode/dev-truespec-3210.log`);
  reference static `python3 -m http.server 3211` on `test-truespec-v2` (pid 24834).
  **Port `3000` is never used.**
  - Start the dev server as **`npm run dev -- -p 3210`**. `npm exec next dev -p 3210` is wrong — npm eats `-p`
    and Next reads `3210` as a directory.
- **Gate order:** `leak-check` **before** `build` (they share `.next`); restart `next dev -p 3210` after a build.
- **Chrome:** attach-only on CDP `:9222` (answering; UA `Chrome/149.0.7827.200`, no `Headless`). The browser
  check is the standing procedure in `developer-workspace/procedures/browser-check.md`.
- **Importing `lib/office.ts` from a plain script** needs
  `node --env-file=.env.local --conditions=react-server --import tsx` (its `server-only` guard throws otherwise).
- **`.env.local` (gitignored, present, 1058 B) — checked with values masked:**
  `DATABASE_URL` set · `DATABASE_URL_UNPOOLED` set · `NEON_BRANCH=production` · `CLERK_*` placeholder ·
  **`SANITY_PROJECT_ID` placeholder** · `SANITY_DATASET=production` · `SANITY_TOKEN` set (write-capable, `skJZ…`) ·
  `SESSION_SECRET` placeholder.
  → **The Sanity project id is not filled in yet** (`c2lc8g8n` is not in the file). It must be before Task 11's
  read-only check; the project id is not a secret. The token does not travel into the workspace — expect this.
- **Sanity (owner, 2026-10-13):** project `c2lc8g8n`, dataset `production`, **public-read**, **no Studio**.

## 5. Data divergence carried in (from TASK-002, not to be "fixed" here)

The office's money figures differ from the old static site's witness: money tied up **₦451,040,000** (ours) vs
**₦587,040,000** (old) — a ₦136,000,000 gap = TS-1013 ₦58M + TS-1014 ₦78M. This is a recorded divergence with a
named cause, not a defect. The TASK-002 conflict log carries the hand-offs into this layer (#10 two car tables,
#14 colour, #16 HELD state).
