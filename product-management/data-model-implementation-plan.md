# Data Model Implementation Plan — TrueSpec

**Status: DRAFT — written 2026-10-08. Awaiting the owner's "go" before any implementation.**
Implementation plan **#5 of six** (planning-close.md). Covers **the full schema, storage layout (images + PDFs), money representation, sessions/auth tables, rate-limit + tap tables, registries, reference codes, seed split, migrations, cleanup jobs** — refined from what the screens actually store (test-truespec-v2) and from plans #2/#3/#4.

---

## 0. What this plan obeys

- `business-logic-implementation-plan.md` (#2) — the entities it thinks in, the money rules (R3 per-line rate, integer minor units, rounding once), state machines, visibility, ref codes. **This plan is the storage detail that #2 deliberately deferred.**
- `functionality-implementation-plan.md` (#3) — auth/sessions (C1, C2), the upload-first flow, PDF kept (F1), no image derivatives (F3), the C2 shape guarding taps.
- `ux-implementation-plan.md` (#4) — 8-second undo window, toasts, offline guard: those impose **no schema** beyond `deleted_at` tombstone and the prune job timing.
- `planning-close.md` — **C1** (session 12 h / 7 d, app-enforced), **C2** (growing delay, per-IP, rate-limited logger), **F1** (PDF kept, deletable), **F3** (no derivatives), rulings **R1–R3**.
- `truespec-product-design.md` §A — the boundary is **the allow-list on the server**, not RLS; no floats; no stored profit.

**Deferred elsewhere:** backfill/backup scheduling and monitoring → system model (#6)/deployment; leak-check command → #6; EXIF-strip execution, the quota-warning UI, prune-job scheduling → functionality/deploy. This file settles the *shape* those run against.

---

## 1. What this layer actually decides (the five real calls)

Everything else in this plan is plumbing. These five are decisions:

| # | Decision | Recommended value | Where it is tracked |
|---|---|---|---|
| D1 | **Image storage service** | **Sanity** (asset store + CDN) — **decided by the owner, 2026-10-08**. Images live in the Sanity dataset; the showroom renders them through Sanity's CDN. This restores the product-design stack. **Enquiry PDFs live in Sanity too** — owner's ruling 2026-10-08 (**A8**): not Supabase Storage (that vendor is out), not Vercel Blob, not database bytes. PDF access stays **office-only** — the public-read rule for showroom images never applies to them | Register **A7 — DECIDED**, **A8 — DECIDED** |
| D2 | **Session shape** | App-managed `session` table: C1's **12-hour idle is enforced by the app** (the owner: we enforce it ourselves — A8); the **7-day cap is Clerk's default** (auth vendor, A8). The table is where the app enforces the idle half | Settled C1 |
| D3 | **Money units and the per-line rate** | All money in **integer minor units** (kobo / cents). Rate stored **on the cost line** as kobo-per-dollar (integer minor), never anywhere else | Settled R3, product-design 45–46 |
| D4 | **Join keys** | The car's **`TS-####` ref is the durable join key** (tap, enquiry, activity). It is assigned once, never edited, never reused (sequence). Taps deliberately carry no name/number (A6 default; the enquiry PDF is the only PII path) | Business-logic #2 §6.5 |
| D5 | **RLS is not the boundary** | Database is reached **only** server-side (server-held credentials — the Neon connection string never leaves the server). No browser ever holds DB credentials. Row-level security is left at its restrictive default but is **not** the mechanism — the allow-list serializer is (product-design §A1–A2). Documented here so no future pass "fixes" RLS and thinks it has fixed the split | Product-design mechanism, settled |

**D6 (small but worth saying):** base state rows live in the **migrations** (they are the product's built-ins — the four car groups and the five enquiry states), while demo cars live in the **first-run seed**. The migrations are the contract; the seed is data. See §5.

---

## 2. Schema — tables, columns, types

All timestamps are `timestamptz` stored **UTC**, displayed in the owner's local time (system-model I79–80). All money columns are `integer` — never `numeric` with scale, never a float (a `numeric(18,0)` integer is fine; what is forbidden is any scale > 0).

### People and access

| Table | Columns | Notes |
|---|---|---|
| **office_user** | id uuid PK · email text UNIQUE NOT NULL · password_hash text NOT NULL · created_at, updated_at | One row. No signup; first-run creation only (J84–85). Email is the username |
| **session** | id uuid PK · user_id FK→office_user ON DELETE CASCADE · created_at · last_seen_at · expires_at | **C1 app-enforced:** active iff `now < expires_at` and `now - last_seen_at ≤ 12 h`. `expires_at = created_at + 7 d`. `last_seen_at` refreshed on office activity (throttled — every request is too chatty; a 5-minute cooldown is enough and the 12 h slack absorbs it). Cookie carries the session id; token is the id, cookie `httpOnly, SameSite=Lax, Secure` |
| **auth_attempt** | id uuid PK · ip text NOT NULL · at timestamptz NOT NULL · ok boolean NOT NULL | **C2 logger.** Feeds the growing delay (after 3 failures: 1 s → 5 s → 15 s → 30 s → 60 s cap) and the per-IP cap (10 failed per 15 min). No PII beyond an IP; pruned by the cleanup job |

### The registries (editable, R2, seeded in migrations)

| Table | Columns | Notes |
|---|---|---|
| **car_state** | id uuid PK · label text NOT NULL · section text NOT NULL CHECK (`available`/`on order`/`landed`) · is_new_arrival boolean NOT NULL DEFAULT false · sort int NOT NULL DEFAULT 0 | Base rows = the four in use on the screen: `av` (Available, section available), `ld` (Landed, section landed, **is_new_arrival default true** — that flag is "Landed this year" with no date logic, settled 82), `ow` (On way, section on order), `pt` (At port, section on order). **Sold is not a row** — it is the flag on car (§C7). Deleting a state in use is blocked at the **DB** by the RESTRICT FK and at the app by the named reason (business-logic §5) |
| **enquiry_state** | id uuid PK · label text NOT NULL · sort int NOT NULL DEFAULT 0 | Base rows = New, Talking, Negotiating, Sold, Lost. **Just states** (R1) — no is_closed, no open/closed anywhere. Same RESTRICT rule |

### The car

| Table | Columns | Notes |
|---|---|---|
| **car** | id uuid PK · ref text UNIQUE NOT NULL · brand, model, trim text · year int · exterior_color, interior_color text · mileage int (km) · features text · note text (public-facing optional note, per product-design H7) · private_note text (office only) · doorstep_price_kobo int NULL (null = no price yet → office-only draft, C3) · state_id FK→car_state · version int NOT NULL DEFAULT 1 · created_at, updated_at · deleted_at timestamptz NULL | **ref** = `TS-####` from a Postgres **sequence** (never reused — sequences don't roll back). **version** is the optimistic-concurrency token (product-design F1; E54–57): every save bumps it; a save with a stale version is refused. **deleted_at** is the tombstone: reads exclude it, Undo clears it, the cleanup job hard-deletes after the 8 s window (UX #4 owns the timing, this owns the row) |
| **cost_line** | id uuid PK · car_id FK→car ON DELETE CASCADE · kind text NOT NULL CHECK (exactly the six kinds: `purchase_price`, `shipping`, `clearing`, `trucking_usa`, `trucking_ng`, `full_tank`) · currency text NOT NULL CHECK (`USD`/`NGN`) · amount_minor int NULL · rate_minor int NULL · created_at, updated_at | One-to-many, the six lines fixed by the form. **`amount_minor` NULL = not entered; 0 = genuine zero** (different things, business-logic rule 5). **DB CHECK so a dollar line with an amount but no rate cannot exist:** `CHECK (currency = 'NGN' OR rate_minor IS NOT NULL)` — a silent rate-of-1 fallback is impossible at the storage layer too (product-design "no error, never a fallback of 1") |
| **sale** | id uuid PK · car_id FK→car UNIQUE NOT NULL ON DELETE CASCADE · sale_price_kobo int NOT NULL · sold_at timestamptz NOT NULL | One sale per car (UNIQUE). **Unmarking sold deletes this row** (mechanism decided, functionality #3 §3.4) — returning the car to projected profit without a ghost record. Hard-deleting a car cascades here. `sold_at` is the real-profit date |
| **car_photo** | id uuid PK · car_id FK→car ON DELETE CASCADE · sanity_asset_id text NOT NULL · position int NOT NULL · created_at · UNIQUE (car_id, position) | **Cover = position 0**, set by reorder or "set as cover" (which swaps positions). One row per Sanity asset; the asset id is what the CDN URL is built from. An asset with no row is an orphan for the prune job (§4). The 8 s undo covers reorder/delete at the UI, then rows are gone and the asset is removed from Sanity (J6 handled by the prune job below) |
| **tap** | id uuid PK · page text NOT NULL · car_ref text NULL (the `TS-####` — survives after the car row is gone, business-logic §6.5) · at timestamptz NOT NULL · ip text NOT NULL | The C2 shape guards this open write: `ip` exists **so the per-IP cap can be enforced** (and the flood shows as a burst in the feed). **No name, no number, nothing from inside WhatsApp** (A6 default; product-overview "nothing more than that"). Never mutated — it is a raw feed |

### Enquiries and the PDF

| Table | Columns | Notes |
|---|---|---|
| **enquiry_pdf** | id uuid PK · path text NOT NULL · filename text NOT NULL · rows_total int NOT NULL · imported_at timestamptz NOT NULL · deleted_at timestamptz NULL | **F1:** the file is kept and linked, deletable by the owner — delete sets `deleted_at` and removes the stored file (app-side, §4). Imported enquiries keep pointing at it via `pdf_import_id` |
| **enquiry** | id uuid PK · name text NOT NULL · number text NOT NULL · car_ref text NULL · note text · enquiry_state_id FK→enquiry_state (RESTRICT) · pdf_import_id FK→enquiry_pdf NULL · created_at · updated_at | **The only place a customer's name and number live** (product-overview: this PDF is the only path). `car_ref` is the text ref (join by ref, not FK — it outlives the car; business-logic §6.5). Moving a column only changes `enquiry_state_id` — the car never moves (R1) |
| **activity_event** | id uuid PK · kind text NOT NULL · subject text NOT NULL · at timestamptz NOT NULL · actor_id FK→office_user NULL | Kinds documented in the app, e.g. car_added, car_edited, car_state_changed, car_sold, car_unsold, car_deleted, car_restored, enquiry_imported, enquiry_state_changed, enquiry_deleted, settings_changed. `subject` = the ref or "settings". The dashboard "Recent activity" is a plain read of this, newest first |

### Settings

| Table | Columns | Notes |
|---|---|---|
| **setting** | key text PK · value text NOT NULL · updated_at timestamptz NOT NULL | Documented keys: `whatsapp_number` · `tagline` · `full_tank_default` (prefills the sixth line — **the default, not a global applied cost**; the six lines remain per-car) · `last_backup_at` (written by the backup job, shown in settings — functionality §10). **No rate key exists** (R3). Password is not a setting — it is `office_user.password_hash` |

---

## 3. Money — the exact representation

One formula, one rounding event, no stored totals:

- **Every line** stores `amount_minor` in its own currency's minor unit: dollars → cents, naira → kobo.
- **Every dollar line** also stores `rate_minor` = the kobo-per-dollar rate at which that amount was made, in minor units of that rate (e.g. ₦1,450.50 → `145050`). Naira lines carry **no rate** (the CHECK forbids a rate on NGN; the CHECK also forbids a missing rate on USD).
- **Total cost (naira)** = Σ over NGN lines of `amount_minor` + ( Σ over USD lines of `amount_minor × rate_minor` ) ÷ 100 — **one division, at the end**, truncating to kobo. That single division is the single rounding point (business-logic rule 7). All other display formatting (commas, ₦ symbol, "estimated"/"landed"/"total" and "projected"/"real" labels) is presentation on top of this integer and lives in `money.js`, not here.
- **Profit** = `doorstep_price_kobo − total cost` (projected) or `sale.sale_price_kobo − total cost` (real) — computed, never stored. Negative values are legal (system 52).
- **Money tied up** = Σ of *entered* lines over non-sold, non-deleted cars — computed, never stored (business-logic §4).

**Worked example:** purchase price $2,400 at ₦1,450.50 → `(240000 × 145050) ÷ 100 = ₦3,481,200`. Shipping $1,100 at ₦1,460 → `(110000 × 146000) ÷ 100 = ₦1,606,000`. Trucking Nigeria ₦350,000, full tank ₦110,000 → total cost = ₦3,481,200 + ₦1,606,000 + 350,000 + 110,000 = **₦5,547,200**. Price ₦6,900,000 → projected profit ₦1,352,800. All integers.

---

## 4. Storage layout (stores, paths, lifetimes)

| Bucket / store | Access | Path / id | Notes |
|---|---|---|---|
| **Sanity dataset — car images** | **public read** via the Sanity CDN (buyers render it in the showroom), private write (server token only) | Sanity asset id (`image-…`), stored in `car_photo.sanity_asset_id` | Upload-first, car-saves-second (functionality §4.1): at upload time the car may not exist, so the asset is uploaded to Sanity independently and the row links it on save. **No derivative pipeline built in v1** (F3 holds as decided): originals are served; the upload field caps size, EXIF is stripped at the write boundary (E6). Sanity's on-demand CDN params (`?w=…&fm=webp&auto=format`) exist for a later pass — they are the documented upgrade path, not built now. Orphans (assets with no `car_photo` row for > 24 h) are pruned via the Sanity API by the daily job |
| **Sanity — enquiry PDFs** | **private** — office only, served through the server only (never a public CDN URL) | Sanity file/asset id, referenced from `enquiry_pdf` | Kept, linked, deletable (F1): the daily job also removes files whose `enquiry_pdf.deleted_at` is set. **PDFs join the images in Sanity** (owner's ruling 2026-10-08, **A8**) — Supabase Storage (vendor gone), Vercel Blob and database bytes were all explicitly ruled out. **The PII constraint stands:** showroom images are public-read, enquiry PDFs never are — whether that privacy rides on a private dataset or on server-proxied reads is an implementation check (J3), not a reopened ruling |

**Lifetimes:** the daily cleanup job — a **Neon scheduled function, once a day; Vercel cron is the documented backup** (A8): (1) hard-deletes tombstones whose `deleted_at` cleared the 8 s undo window and cascades photos/costs/sale rows + removes their Sanity assets (images and enquiry PDFs); (2) prunes orphan Sanity assets older than 24 h (failed upload or deleted record); (3) prunes files flagged deleted; (4) prunes `auth_attempt` rows older than 90 days. **Quota:** the office is told in-product when Sanity bandwidth/asset usage passes a threshold (functionality §4.5); no schema beyond `last_backup_at`-style settings — Sanity's usage data is read by the scheduled check (#6/deploy).

---

## 5. Seed — what is migration, what is data

| Layer | Contents | Idempotency |
|---|---|---|
| **Migrations** | base `car_state` rows (av/ld/ow/pt), base `enquiry_state` rows (New/Talking/Negotiating/Sold/Lost), default settings | Migrations run once, by definition |
| **First-run seed** | ~15 demo cars with believable detail (real-feeling mileage, features, photos), their six cost lines, sale records for a couple of sold cars, a few enquiries | **Idempotent** (J5): the seed runs only when `office_user` is empty, or is keyed on the demo refs so a re-run is a no-op. Demo photos come from a small bundled/placeholder set — they must not consume the free tier meaningfully |

First run = no admin yet → seed runs → first-run screen creates the one account (J84, J91). The registries are **already present from migrations** — the owner edits them, not re-seeds them.

---

## 6. Counts, totals and the reads that serve them

- **No totals/profit/counts are stored anywhere.** Every card on every screen is a read through the business-logic `counts()`/`totals()` function (#2 §4) over these tables. The schema only makes those reads cheap:
  - `car.state_id`, `car.deleted_at` (partial: `WHERE deleted_at IS NULL`), `car.ref` (UNIQUE), `car.version` — main filters and the concurrency key
  - `cost_line.car_id` (FK index already), `sale.car_id` (UNIQUE)
  - `tap.at DESC`, `activity_event.at DESC` (feeds)
  - `enquiry.enquiry_state_id` (the per-state column counts), `enquiry.pdf_import_id`
  - `auth_attempt (ip, at)` — the C2 window queries
- The dashboard "of which N new arrivals" line = cars whose state has `is_new_arrival = true` — data model supports it with one index on `(state_id)`.
- The 15-row office inventory join: `car + cost_line + sale + car_state` — indexed left to right; at this scale (< ~40 cars) no materialization, no caching layer.

---

## 7. Retention hooks (schema is ready for the A4–A6 defaults — not yet applied)

The A4–A6 retention answers are **owner-to-confirm** (register A4–A6) and land in the system-model plan (#6). The schema is built so those answers are cheap once confirmed, and so that the enforceable defaults need no redesign:

- An **enquiry's name+number live in exactly one table** (enquiry) — deleting or anonymising a lead is a WHERE, not a hunt.
- **Tap rows already carry no name or number** — the raw feed survives any enquiry cleanup untouched.
- `enquiry.deleted_at` (add when confirmed) gives a soft delete under the 12-month review; the hard cleanup is a job like §4.
- Nothing links personal data into car/cost/activity structures in a way a retention answer would have to demolish.

---

## 8. Migrations — ordered

1. `office_user`, `session`, `auth_attempt`
2. `car_state`, `enquiry_state` + base-row inserts
3. `car`, `cost_line`, `sale`, `car_photo` (+ the `cost_line` money CHECKs)
4. `enquiry_pdf`, `enquiry`
5. `tap`, `activity_event`
6. `setting` + default inserts
7. Indexes from §6

Downward: every FK is either RESTRICT (registry deletion blocked while in use) or CASCADE (parts die with the car). No migration touches public/office code; the schema is the same object store for both halves — the split is enforced at the read boundary (D5), not by two schemas.

---

## 9. Acceptance (checked in a scratch project, not in production)

- **No float anywhere:** `information_schema.columns` on the public schema returns no column of a numeric type with scale > 0; no money column is `double precision`/`real`.
- **No stored totals/profit:** no generated/computed column in the cars/money tables; grep the migrations for `AS GENERATED`.
- **The CHECK bites:** inserting a USD `cost_line` with `rate_minor IS NULL` fails; a NGN line with a rate fails; `amount_minor NULL` and `0` both exist and are distinct.
- **RLS is not the mechanism:** no client credential exists outside the server env; a browser-level attempt to reach the DB is refused (no anon key in client code).
- **Refs never reused:** two inserts get distinct `TS-####`; a deleted car's sequence slot is never reissued (sequence semantics).
- **Registry guards:** deleting a `car_state`/`enquiry_state` that a car/enquiry sits in fails at the DB (RESTRICT) with the app translating it to the named reason.
- **Unmark sold:** deleting the `sale` row puts the car back in projected profit with no residual.
- **Tombstone lifecycle:** deleted car invisible to reads; undo within the window restores it byte-for-byte; the job hard-deletes after the window, its Sanity assets are gone, and no orphan remains (J6).
- **Seed idempotency:** first-run seed works once; a re-run is a no-op.
- **Storage decision recorded:** car images and enquiry PDFs both live in **Sanity** (A7 decided 2026-10-08; PDFs added by owner ruling **A8**, same date — office-only, never public-read); the Sanity project id/dataset and read permissions are verified present (J3) — while no cost field ever leaves the server.

---

## 10. Open items

| # | Item | Status |
|---|---|---|
| — | **A7 (storage service) — DECIDED by the owner, 2026-10-08: Sanity stores images; A8 (same day) adds enquiry PDFs to Sanity and moves the stack to Neon + Clerk + Sanity + Vercel** | Closed (D1, §4) |
| — | A4–A6 retention/ownership | Owner-to-confirm at #6; §7 guarantees the schema needs no redesign when they land |

Everything else the layers above rely on is settled here: money units and the per-line rate, session enforcement shape, the C2 logger, the registries, the ref sequence, the tombstone, and the Sanity stores (images and enquiry PDFs).

---

*Companion docs: `business-logic-implementation-plan.md` (#2, the rules), `functionality-implementation-plan.md` (#3, the flows), `ux-implementation-plan.md` (#4, the timing), `planning-close.md` (C1–C4, F1–F6, A1–A8, register), `system-model.md` (items A–M). The screens in `test-truespec-v2` are the input; nothing here changes UI/UX files.*