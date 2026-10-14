# TASK-004 — current state, at the start of the build

**Date:** 2026-10-14 · **Verified by:** reading the files on disk, running the five gates, and querying
the store directly (this session). Everything below is what the tree actually says today — not what a
task or a plan says it should say.
**Change-point map for:** `app/office/**`, `middleware.ts` (new), `lib/session.ts` (new),
`migrations/0020…0021` (new), `lib/office.ts`, `lib/counts.ts`, `lib/sections.ts`, `lib/public-cars.ts`,
`lib/change-check.ts`, `scripts/seed.ts`, `scripts/reconcile.ts`.

---

## 0. Baseline gates — the untouched tree, all green

`developer-workspace/runs/TASK-004-baseline-gates.txt` (run 2026-10-14 in the learned order):

| Gate | Result | Elapsed |
|------|--------|---------|
| `leak-check` | rc=0 | 19s |
| `typecheck` | rc=0 | 6s |
| `test` | rc=0 — **64 tests, 64 pass, 0 fail** (9 suites) | 2s |
| `build` | rc=0 — compiled successfully | 49s |
| `store-freshness` | rc=0 | 0s |

**Gate-order law confirmed again:** `build` clobbers `next dev`'s `.next`; `leak-check` must run
**before** `build`, and `next dev -p 3210` must be restarted after any build.

## 0b. Baseline store figures (direct query — `developer-workspace/scripts/task-004/db-baseline.ts`)

```
cars_total 17 · cars_live 17 · cars_null_state 0
cars_by_state: Available(available)=8  On the way(on order)=3  At port(on order)=2
               Cleared(on order)=1  Landed(landed)=3        (= 17)
photos 49 · cost_lines 99 · sales 1 · enquiries 6 · enquiry_pdfs 1
taps 0 · activity_event 0 · settings 3 · migrations 19 (last 0019_enquiry_handle.sql)
car_states:  Available(available,10) On the way(on order,20) At port(on order,30)
             Cleared(on order,40) Landed(landed, new-arrival,50)
enq_states:  New(10) Talking(20) Negotiating(30) Sold(40) Lost(50)
```

Two facts to carry: **taps and activity_event are empty today** (the dashboard feed panels are
hardcoded), so this layer is what first writes them; and **Available counts 8** because the sold car
TS-1025 still sits in state "Available" with a separate `sale` row.

---

## 1. Auth today — **none is implemented or enforced**

- **No `middleware.ts`** anywhere.
- **`/office` is unguarded.** `app/office/layout.tsx:15-22` is fonts + `{children}` only.
  `app/office/(shell)/layout.tsx:25` hardcodes `<b>Signed in as Umar</b>`; `:28-31` is a plain
  `<Link href="/office/login">` labelled "Sign out", with no cookie clear.
- **The login page is a fake client screen.** `app/office/login/login-client.tsx:114-117`:
  `if (p.value === "demo-only") { window.location.href = "/office"; return; }`; the field is prefilled
  `defaultValue="demo-only"` (`:234`). No fetch, no cookie, no server call.
- **No cookie/session read in `lib/` or `app/`** — grep `cookies(|headers(|next/headers` → no matches.
  No `lib/session*.ts` exists.
- **`lib/config.ts` requires 7 env vars** (`:21-29`): `DATABASE_URL`, `CLERK_PUBLISHABLE_KEY`,
  `CLERK_SECRET_KEY`, `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_TOKEN`, `SESSION_SECRET`;
  shape-checked (`:52-61`), asserted at boot from `instrumentation.ts:3-7`.
  `.env.local` has all 7 present (`CLERK_*` and `SESSION_SECRET` currently placeholders).
- **⚠️ Nuance:** the Clerk-shaped *intent* is already scaffolded (config requires the keys;
  `migrations/0010_identity.sql` names Clerk) but **no Clerk package, no middleware, no cookie read**
  exists. So "no auth" is true; "no Clerk intent" is not.
- **No `app/api/`, no Server Actions** (`"use server"` → no matches). The only server write path in
  the repo today is `scripts/*.ts` run by npm scripts.

## 2. The office write surface — there are **no `<form>` elements at all**

Every "form" is a `<div>` of controlled inputs; every submit is `type="button"` + `onClick` →
`showToast("… (demo)")`.

| Route | Status | Evidence |
|---|---|---|
| `app/office/login/*` | fake | `demo-only` redirect `login-client.tsx:114-117` |
| `app/office/(shell)/layout.tsx` | hardcoded identity | `:25` "Signed in as Umar" |
| `app/office/(shell)/page.tsx` (dashboard) | **reads real** figures; feed panels hardcoded | `:17 getOfficeDashboard()`; "5 open enquiries" `:101`; rows `:109-210` |
| `app/office/(shell)/inventory/page.tsx` | **reads real** | `:66-70` |
| `app/office/(shell)/car/page.tsx` | real shared fields + hardcoded form-only fields; save stub | `:49` real; `FORM_DEMO :26-46`; save `car-client.tsx:679-689` |
| `app/office/(shell)/car/new/page.tsx` | real states; blank form; save stub | `:43 getOfficeStates()` |
| `app/office/(shell)/enquiries/*` | **hardcoded seed**, local | seed `enquiries-client.tsx:37-44`; import stub `:557-560` |
| `app/office/(shell)/activity/*` | **hardcoded** demo timeline | data `activity-client.tsx:35+` |
| `app/office/(shell)/settings/page.tsx` | **reads real** car counts | `:15 getOfficeCars()` |
| `app/office/(shell)/settings/settings-client.tsx` | write stubs (toast only) | `saveWa :129-134`, `saveTag :139-142`, `saveTank :147-150`, `savePassword :177-184` |
| `app/office/(shell)/settings/state-editors.tsx` | UI-only, no save | comment `:11-12` "no save button, no storage" |

Exact stub shapes (what gets replaced): car save `car-client.tsx:674-689` (with the malformed-amount
guard already dwelled at the field), mark-sold `:811-813`, delete `:848-850`, settings saves above,
enquiry import confirm `enquiries-client.tsx:557-560`, inventory delete/undo `inventory-client.tsx:164-184`
(pure React state). The stale comment `app/office/(shell)/car/page.tsx:17-18` says private notes and
photos are "not owned by the office data model".

## 3. The read layer

**`lib/office.ts` (207 lines)** — `getOfficeCars()` `:109` query `:111-122` joins
`car → car_state → sale? → cost_line?` ordered by `ref, kind`. **No `WHERE` clause at all** — so it
**does not filter `deleted_at`**. Private `sectionsByState()` `:154`; `getOfficeCarViews()` `:164`;
`getOfficeStates()` `:177` (`SELECT label, section, is_new_arrival … ORDER BY sort, label` `:180`);
`getOfficeCounts()` `:190`; `getOfficeDashboard()` `:194`.

**`lib/counts.ts` (58 lines)** — `countStock(cars)` `:27`: loop `:34-55`, `sold` counted then skipped
`:35-38`, then `switch (car.section)` `:39` — `available`→`available` `:40`; `on order`→`onOrder` `:43`;
`landed`→`landed` and, if `isNewArrival`, also `newArrivals` **and** `available` `:46-53`.
Returns `{ available, onOrder, landed, newArrivals, sold }` `:57`.

**`lib/sections.ts` (112 lines)** — `Section` `:12`, `SECTIONS` `:15`, `SECTION_LABEL` `:18`,
`isSection` `:24`, `sectionLabel` `:28`, `SECTION_TOKEN` `:37`, `tokenOf` `:43`, `sectionOfToken` `:47`,
`sectionOfState` `:58` (throws unless exactly one mapping), `AVAILABLE_PRESENTATION` `:89`,
`inAvailablePresentation` `:91`, `presentedSections` `:101`.

**`lib/public-cars.ts` (67 lines)** — `SELECT_CARS` `:9-25` **includes `WHERE c.deleted_at IS NULL`**
`:24`; reads `s.section AS configured_section` `:13`. `getPublicCars` `:32`, `getPublicCar` `:38`,
`getPublicCarForView` `:46`, `getPublicCounts` `:54`, `getSetting(key)` `:61`.

**`lib/serialize.ts` (169 lines)** — `PUBLIC_CAR_FIELDS` allow-list `:42`; `toPublicCar` `:140` resolves
`sectionOfState(row.state, row.configured_section)` `:159`. This is the **only public read path** and is
not redesigned by this layer.

**Where `section` is a grouping key (exact lines):** `lib/counts.ts:39`; `lib/sections.ts:105-111`;
`app/(site)/page.tsx:14`; `app/(site)/layout.tsx:33-34,57`; `components/site/HomeInventory.tsx:41-42`;
`components/site/InventoryBrowser.tsx:259,358`; `app/(site)/car/[ref]/page.tsx:328,506`.
**Readers of `car_state.section`:** `lib/office.ts:156,180`, `lib/public-cars.ts:13`,
`scripts/reconcile.ts:97`.

## 4. The store (as of `0019`)

`migrations/` holds exactly `0001…0019`. Columns that matter:

- **`car`** — identity `id`, `ref` (`TS-####` from `ts_ref_seq`), 14 editable columns
  (`brand, model, trim, year, exterior_color, interior_color, mileage, features, note, private_note,
  was_price_kobo, arrival_note, doorstep_price_kobo, state_id`), `version`, timestamps,
  `deleted_at` (tombstone), `is_demo`, `content_hash`, `hash_version`.
  **`state_id` is nullable** (`0003:25`). Trigger `car_identity_is_final` (`0018:41-43`) refuses
  changing `id`/`ref`.
- **`car_state`** — `id`, `label` (**unique**, `0009:45`), `section text NOT NULL CHECK (section IN
  ('available','on order','landed'))` (`0002:8`), `is_new_arrival`, `sort`, `colour` (hex CHECK).
  **No `kind` column, no `is_demo` column.**
- **`enquiry_state`** — `id`, `label` (unique), `sort`, `colour`. No `section` (deliberate).
- **`session`** — `id`, `user_id` FK→`office_user` CASCADE, `created_at`, `last_seen_at`, `expires_at`,
  `clerk_session_id` (unique, `0010:19-22`).
- **`enquiry`** — `asked_for text NOT NULL` (`0016:23`), `handle` (unique partial, `0019:21`),
  `enquiry_state_id`, `is_demo`, `content_hash`/`hash_version`. Trigger `enquiry_identity_is_final`.
- **`enquiry_pdf`** — `id`, `sanity_asset_id`, `filename`, `rows_total`, `imported_at`. No `deleted_at`.
- **`cost_line`** — `UNIQUE (car_id, kind)` (`0008:18`); kinds = purchase_price, shipping, clearing,
  trucking_usa, trucking_ng, full_tank; `amount_minor bigint` NULL = not entered.
- **`car_photo`** — `(car_id, position)` unique; `origin` NOT NULL non-blank (`0013`).
- **`tap`** — `id`, `page`, `car_ref` (text, no FK), `at`. **No `ip`** (removed `0011`).
- **`activity_event`** — `id`, `kind`, `subject` (text), `at`, `actor_id`. Unchanged here (D20).
- **`setting`** — `key` PK, `value`, `updated_at`; rows `whatsapp_number`, `tagline`, `full_tank_default`.
- `office_car` **dropped** by `0015`.

## 5. Seed + wipe

`scripts/seed.ts` (382 lines) — **17 demo cars**, inline `DEMO :38-68`; states resolved **by label**
(`:137-138,155-156`, throws if a label is missing). Photos from `scripts/demo-photo-manifest.json`;
enquiry import from `scripts/demo-enquiry-import.json`. Cars written `is_demo=true` (`:210,224`);
enquiries `is_demo=true` (`:286-289,344-349`). Change-check gate `:201-227`: a car whose stored hash and
`hash_version` match is **left untouched**. Cost lines written only where the amount differs; photos
upsert by `(car_id,position)`; sale upsert by `car_id`.
`scripts/seed-office.ts` is **RETIRED** (no npm script runs it).
`npm run demo:wipe` → `scripts/demo-wipe.ts`: dry-run by default, `--yes` deletes; removes only
`is_demo` rows (`:174-196`), records every non-demo id and refuses if any is missing after (`:198-214`),
then optionally deletes the Sanity assets (`:227-237`) unless `--no-assets`.

## 6. The change check (`lib/change-check.ts`)

- **14-field car recipe** `CAR_RECIPE :40-55` — exactly the 14 editable columns, in order.
- **5-field enquiry recipe** `:58-64` — `name, number(foldCase), asked_for, note, enquiry_state_id`.
- **Hash** = `sha256` hex over a preimage (`:90-96,99-101`), `CHANGE_CHECK_VERSION = 1` (`:28`),
  separators `\u001f`/`\u001e`; values trimmed + whitespace-collapsed; null→`""`.
- **Written only by `scripts/seed.ts`** today. **Never read from the client** — no `app/`/`components/`
  file references `content_hash`. The write path will compute it server-side (TASK-003's rule).

## 7. Routes, tests, scripts

- **`app/` routes:** public `/`, `/inventory`, `/car/[ref]`, `/privacy`, `/not-found`; office
  `/office/login`, `/office`, `/office/activity`, `/office/car`, `/office/car/new`, `/office/enquiries`,
  `/office/inventory`, `/office/settings`. **No `app/api/**` at all.**
- **`npm test`** = `node --import tsx --test "lib/**/*.test.ts"` — 9 suites, 64 tests, all in `lib/`.
  **Nothing tests `lib/office.ts`, `lib/public-cars.ts`, `lib/serialize.ts`, `lib/config.ts`,
  `lib/cleanup.ts`, or any `app/` route.**
- **`scripts/leak-check.ts`** builds public routes from listed refs and fails on any forbidden token
  (`purchase_price`, cost kinds, `amount_minor`, `kobo`, `private_note`, `doorstep_price_kobo`, …),
  computed cost totals, private asset refs, customer name/number/note, or an office state label on a
  public page; any 5xx also fails.
- **`scripts/reconcile.ts`** compares **rendered** office (`/office`, `/office/inventory`) against the
  **store read directly** (its own SOL join, not `lib/office.ts`). **No longer reads `office_car`** —
  that table name survives only in comments as the frozen TASK-002 witness. Its store query also does
  **not** filter `deleted_at`.
- **`scripts/store-freshness-check.ts`** asserts none of the store routes was prerendered and no DB
  response leaked into the build cache.

## 8. Environment, ports, commands (verified this session)

- **Dev** on **`:3210`** (`setsid nohup npx next dev -p 3210`, log `/tmp/opencode/dev-truespec-3210.log`);
  reference static site on **`:3211`** (pid 24834). **Port 3000 is never used.**
- **Kill by PID, never by pattern** — `pkill -f "next dev -p 3210"` matches the *shell running that very
  command* and kills it (happened this session). Use `ss -ltnp` / `pgrep -f next-server` and kill the pid.
- **Chrome** attach-only on CDP `:9222` (Chrome/149, not headless), per
  `developer-workspace/procedures/browser-check.md`.
- **Neon cold-connection flakiness (re-confirmed):** firing concurrent cold queries drops TCP
  (`ETIMEDOUT`/`ENETUNREACH`); a single warm-up query first, then **sequential** queries, is fine.
  The office inventory opens ~5 concurrent DB queries per load — warm the pool before browser runs.
- **Importing `lib/office.ts` from a script** needs
  `node --env-file=.env.local --conditions=react-server --import tsx`.
