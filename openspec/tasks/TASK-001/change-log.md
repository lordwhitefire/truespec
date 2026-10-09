# TASK-001 — change log (Builder choices)

Choices made where `ui-plan.md` was silent, plus the judgment calls and deviations,
recorded so nothing is invisible. Spec wins over plan; plan wins over screen; a later
owner ruling wins over an earlier planning doc.

## Toolchain / scaffolding (forced by what actually builds)

- **TypeScript pinned to 6.x, not 7.** `typescript@7.0.2` was installed first; Next.js 15.5.27
  refuses it ("The TypeScript 7 native compiler does not provide the JavaScript compiler API that
  Next.js requires"). Downgraded to `typescript@^6` (6.0.3). Next 15 is the installed framework.
- **`next.config.mjs`, not `next.config.ts`.** The TS config loader crashed under the TS7 toolchain
  ("Cannot read properties of undefined (reading 'fileExists')"). The `.mjs` config is loaded by Next
  directly and is not affected by the TypeScript version.
- **`@/*` alias registered in `next.config.mjs` as well as `tsconfig.json`.** With only the tsconfig
  `paths` entry, `@/…` imports failed to resolve specifically inside the dynamic-route folder
  `app/car/[ref]/` (everything else resolved). Registering `resolve.alias["@"]` in the webpack config
  makes resolution independent of file location.
- **`global.d.ts` declares `declare module "*.css"`.** TypeScript 6's new side-effect-import check
  rejects `import "./globals.css"`; Next's own CSS types were not enough on their own here.
- **`baseUrl` removed from `tsconfig.json`.** TS6 deprecates it; `paths` resolves relative to the
  config location without it.
- **DB-backed routes are `export const dynamic = "force-dynamic"`.** Home, inventory and car pages
  read live stock; without this Next prerendered them at build time and would have served stale
  numbers.

## File / component structure (Builder's to choose)

- `app/` — routes: `page.tsx` (home), `inventory/page.tsx`, `car/[ref]/page.tsx`, `not-found.tsx`,
  `layout.tsx`, `globals.css`.
- `components/` — `ThemeToggle`, `CarCard`, `Gallery`, `InventoryTabs`, `whatsapp.ts` (link helper).
- `lib/` — `config.ts` (fail-loud), `db.ts` (server-only Neon client), `money.ts` (one module),
  `counts.ts` (one counting rule), `serialize.ts` (the allow-list boundary), `public-cars.ts`
  (the only public read path).
- `scripts/` — `migrate.ts`, `seed.ts`, `leak-check.ts`. `migrations/0001…0006`.

## Showroom layout choices

- **Inventory = three tabs** Available | On Order | Landed, each with its count; the **Available tab
  lists available-group cars *plus* landed new arrivals**, so a new arrival renders under both
  Landed and Available and is counted once, with the "of which N new arrivals" note. This is the
  reading of task.md item 7 ("exactly three sections … Landed rendered inside Available") and the
  showroom spec's "Three fixed sections". See the conflict log for why the reference inventory
  screen's filter UI was not reproduced.
- **Home = three stacked section previews** (three cars each) with counts, because the benchmark
  asks for "three section previews" (not tabs). The reference home uses tabs; recorded in the
  conflict log.
- **Theme persistence:** `localStorage` key `truespec-theme`; a tiny inline script in `<head>` sets
  `.theme-dark` / `.theme-light` before first paint. Dark is the default. The device's
  `prefers-color-scheme` is never read.
- **Gallery:** touch handlers for swipe; arrow buttons and a thumbnail strip are always rendered
  (a safe superset of "arrows additionally on laptop").
- **Tablet is a width, not a design:** grids use `auto-fill` between 560/820/1100; no separate
  tablet layout was invented.

## Schema / data deviations (logged, not silent)

- **Money columns are `bigint`.** `data-model-implementation-plan.md` says `integer`, but seed
  prices (₦22M–₦96M) are 2.2–9.6 billion kobo and overflow `int4`. All money columns use `bigint`.
- **Five seeded car states** (Available, On the way, At port, Cleared, Landed) per the inventory
  spec; the data-model plan listed four. `Landed` carries `is_new_arrival = true`.
- **`sale` and `enquiry_pdf` tables added** beyond the twelve entities listed in task.md item 3;
  both are listed in the data-model plan and are needed for later tasks (sold flag, PDF storage).
- **Q37 / Q38 implemented:** `car.was_price_kobo` (Special ribbon + crossed-out price) and
  `car.arrival_note` (On Order arrival chip).
- **RLS enabled with no policies** (restrictive default). The binding boundary is the allow-list
  serializer, not RLS (design D2).
- **Seed = 15 cars** (6 available, 4 on order, 5 landed of which 1 is sold = TS-0015). Idempotent via
  `ON CONFLICT (ref) DO NOTHING`; refs come from `ts_ref_seq`, never reused.
- **Seed photos are placeholder URLs** (`picsum.photos`). `resolvePhotoUrl` passes full URLs through
  and builds `cdn.sanity.io` URLs for real Sanity asset ids; real assets are a later task.
- **Placeholder Clerk / Sanity / session keys** were added to `.env.local` so the fail-loud config
  passes locally and the app can run. Real values are later tasks; `.env.local` is gitignored.

## Boundary

- `scripts/leak-check.ts` is HTTP-based: it fetches every listed public route (`/`, `/inventory`,
  every listed `/car/{ref}`), greps each response for forbidden field names and for the real
  computed cost totals, and fails non-zero on any hit. Output retained in
  `leak-check-output.txt`.
