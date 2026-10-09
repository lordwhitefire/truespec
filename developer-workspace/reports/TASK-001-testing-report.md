# TASK-001 — verification report

**Verifier:** Developer (testing pass) · **Date:** 2026-10-09
**Task under test:** TASK-001 Showroom foundation & public boundary (`openspec/tasks/TASK-001/`)
**Method:** ran the app and leak check; read the source; queried the live DB; exercised the
listing gate and sold/deleted paths against a temporary Neon branch. Did not fix anything.

## 1. Verdict

**FAIL.**

The boundary itself holds in substance — no cost, rate or profit value was found on any public
route — and the showroom foundation is largely correct. But two checks fail as written:

- **1.6** — `neon.ts` is not committed: the repository has **zero commits**; every file is untracked.
- **3.2** — the `/inventory` response body contains `priceKobo` / `wasPriceKobo` (integer minor
  units) — the token `kobo` on the explicit search list, present with a value. These are public
  prices, not cost data, but the check fails by its own wording. The automated leak check lists
  `kobo` as forbidden yet is **case-sensitive**, so `priceKobo` slips past it (check 3.1 passes
  while the string it names is present).

A third item (**2.6**) diverges from the checklist and is recorded as a scope dispute, not a code
defect.

## 2. Check table

| # | Check | Result | One line |
|---|---|---|---|
| 1.1 | Loud configuration failure | **PASS** | Blank `SESSION_SECRET`: startup logs a clear `ConfigError` naming the key; server fails to prepare; request returns 500 — no broken page. |
| 1.2 | Seed idempotence | **PASS** | Fresh DB: seed #1 inserted 15 cars, seed #2 was a no-op; counts unchanged. |
| 1.3 | Schema shape | **PASS** | All 12 required entities exist; every money column `bigint` scale 0; every timestamp `timestamptz`. |
| 1.4 | No global rate | **PASS** | No rate in `setting` (columns key/value/updated_at) or UI; USD costs carry per-line `rate_minor`. |
| 1.5 | One totals function | **PASS** | Single `totalCostKobo`; single rounding point `Math.trunc(usdProduct/100)`. |
| 1.6 | Neon binding hygiene | **FAIL** | `neon.ts` exists at root but repo has **no commits** — it is not committed (nothing is). |
| 2.1 | Home page | **PASS** | Brand, tagline, WhatsApp path, three section previews; numbers equal inventory. |
| 2.2 | Exactly three sections | **PASS** | Tabs Available / On Order / Landed only; Landed rendered inside Available; no config adds a 4th. |
| 2.3 | Counting rule | **PASS** | A new arrival shows under both Landed and Available; counted once; "of which 4 new arrivals" present. |
| 2.4 | Car page completeness | **PASS¹** | Arrows + thumbnails + touch-swipe; all public facts; full naira price (₦22,500,000). |
| 2.5 | WhatsApp button | **PASS¹** | Car-page link pre-fills a message naming the car. |
| 2.6 | Responsive split | **FAIL** | Cards at every width; **no table on laptop, no filter sheet/dropdown** anywhere (see observation). |
| 2.7 | Theme persistence | **PASS¹** | localStorage `truespec-theme` only; `prefers-color-scheme` never read. |
| 2.8 | Listing gate | **PASS** | Missing price *or* photo → absent from all pages/counts/links and direct link 404; restored → appears. No `₦0`. |
| 2.9 | Sold / deleted links | **PASS** | Sold and soft-deleted links both 404 gracefully; no crash, no stale "available". |
| 3.1 | Automated leak check | **PASS²** | 16 routes, all ok, "LEAK CHECK PASSED", output retained. |
| 3.2 | Manual sweep | **FAIL** | `priceKobo`/`wasPriceKobo` (containing `kobo`, with values) in the `/inventory` JSON payload. No cost/rate/profit data found. |
| 3.3 | No credentials in the browser | **PASS** | Client chunks carry no DB URL/secret; only the naira formatter survives. |
| 3.4 | Error responses | **PASS¹** | Malformed/missing/sold refs → graceful 404; no reflection of submitted values in rendered text. |
| 4.1 | Count agreement | **PASS** | Home 10/4/4 == inventory 10/4/4 at the same moment. |
| 4.2 | Benchmark figures | **PASS** | Prices in full naira; matches observable task figures. |

¹ Source/HTML-inferred — no browser available this session, so the actual gesture/visual was not
exercised (see "Not tested").
² Green, but see 3.2 — the check's `kobo` token is case-sensitive and does not catch the emitted
`*Kobo` field names.

## 3. Failures — reproduction

### 1.6 — `neon.ts` not committed
- **Did:** `git ls-files` (0 files), `git log` (no commits), `ls neon.ts`.
- **Happened:** `neon.ts` is present at the project root (82 bytes) but **untracked**; the working
  tree is entirely untracked (`?? neon.ts`, `?? .env.local`, …). `.neon` and env files are correctly
  gitignored, and no connection string appears in any tracked file (trivially — nothing is tracked).
- **Expected:** `neon.ts` present **and committed**. Not met. This is a packaging gap (no commits
  made), not a `neon.ts` content defect.

### 3.2 — `kobo`-bearing public field names in the inventory payload
- **Did:** fetched `/`, `/inventory`, three car pages with `curl`; searched the full bodies for
  `purchase, shipping, clearing, trucking, tank, cost, profit, rate, kobo`.
- **Happened:** `/inventory` body contains, 14 times each:
  `"priceKobo":2250000000`, `"wasPriceKobo":null`, … (the `PublicCar` passed to the client
  `InventoryTabs` component). `grep -c -i kobo` = 28. No `purchase/shipping/clearing/trucking/tank/
  cost/profit/rate` **data** was found anywhere.
- **Expected (3.2):** none of the listed tokens appear with any value. `kobo` does.
- **Substance:** `priceKobo` is the public doorstep price and `wasPriceKobo` the public "was" price,
  both on the allow-list (`PUBLIC_CAR_FIELDS`, `specs/showroom` "price") — **not** cost, rate or
  profit. So the one rule (task.md constraints) is not broken; the representation choice conflicts
  with the checklist token.
- **Companion defect (why 3.1 is green anyway):** `scripts/leak-check.ts` FORBIDDEN contains
  `"kobo"` (line 24) and matches with `body.includes(token)` — case-**sensitive** — so
  `priceKobo`/`wasPriceKobo` are never detected. The guardrail is weaker than its own token list
  implies.

## 4. Observations (out of scope / stale docs / divergences)

1. **2.6 divergence is documented.** Builder conflict-log #8 (and #2): the reference inventory
   filter sidebar / sort / list view depends on car fields (`body, engine, drive, seats, fuel, hp`)
   that are not in the approved public model; the table/filter sheet is claimed as office
   (TASK-002). The public inventory is cards at every width with three fixed sections. task.md item
   10 nevertheless lists "table on laptop … filtering as full-screen sheet / sheet / bar dropdown"
   as in scope. **Owner should rule** whether 2.6 is TASK-001 or TASK-002.
2. **`priceKobo` exposure is a design choice, not a leak.** Home and car pages do **not** contain it
   (`CarCard` is a server component); only the client `InventoryTabs` payload does. If raw minor
   units should not be public, send a formatted string, or rename the fields; either way, make the
   leak-check's `kobo` match case-insensitive so it can see `*Kobo`.
3. **Arrival-note text.** "Clearing in progress — 10 days" (TS-0008) and "Shipping booked — 4 weeks"
   (TS-0010) appear as public chips. The 3.2 note permits seller-typed public feature text; these are
   not cost data, but they do contain the words `clearing`/`shipping` (the leak check is
   case-sensitive and they are capitalised, so it ignores them).
4. **Change-log price range is loose.** change-log/conflict-log say seed prices span "₦22M–₦96M";
   the actual seeded range is **₦15.2M–₦78M** (max TS-0007 = ₦78,000,000). The `bigint`-not-`int4`
   argument still holds (7.8B kobo > 2.147B).
5. **No README.** testing.md "Before you start" says ask the Builder or read the README/notes;
   there is no README. `change-log.md` / `conflict-log.md` serve as the notes.
6. **RLS.** change-log: RLS is enabled with no policies; the boundary is the serializer, not RLS.
   Not independently re-verified here (out of check scope).
7. **Stale doc flagged, not patched:** `seed-content.md` "rate set in Settings" line (conflict #1)
   is contradicted by ruling R3 and by the build; correctly left unedited.
8. **Placeholder secrets.** `.env.local` holds placeholder Clerk/Sanity/session values (documented);
   real values are later tasks.

## 5. Not tested (and why)

- **Real browser behaviour** (2.4 swipe/arrow click, 2.6 actual widths, 2.7 persist-across-navigation,
  2.5 real WhatsApp open) — no browser/Chrome-DevTools available in this session. Verdicts for those
  rows are from source + served HTML, and are flagged ¹.
- **1.1 process exit** — the server logs the config error and fails to prepare, but does **not**
  exit on its own; it had to be stopped. It never renders a broken page (returns 500), so the check
  passes, but "stops" here means "refuses to serve", not "exits cleanly".

## 6. Evidence

**1.1 (blank SESSION_SECRET):**
```
✓ Ready in 1911ms
Failed to prepare server Error [ConfigError]: An error occurred while loading instrumentation hook:
  TrueSpec configuration error — missing: SESSION_SECRET. Set the value in .env.local (see the README) and restart.
…
--- request with blank secret ---  status=500 bytes=21   → "Internal Server Error"
```

**1.2 (fresh DB `seedtest` on temp branch `br-morning-tree-b2eevfkp`):**
```
applying 0001_people.sql … done … applied 6 migration(s).
seed: inserted 15 demo car(s).
seed: already seeded — no-op (idempotent).
counts after both runs: cars 15 · photos 45 · cost_lines 90 · car_states 5 · enquiries 2 · sale 1
```

**3.1 (leak check, `LEAK_BASE_URL=http://localhost:3210`):**
```
leak-check against http://localhost:3210 — 16 public route(s)
ok   / (200, 18981 bytes)   ok   /inventory (200, 21670 bytes)
ok   /car/TS-0001 … /car/TS-0014 (200 each)
LEAK CHECK PASSED — no cost, rate or profit value on any public route.
```

**3.2 (`/inventory` body):** `grep -oiE '[a-z_]*kobo[a-z_]*' | sort | uniq -c` →
`14 priceKobo` · `14 wasPriceKobo`; example `"priceKobo":2250000000,"wasPriceKobo":null`.
Home and car pages: 0 hits. `purchase/shipping/clearing/trucking/tank/cost/profit/rate` **data**: 0.

**2.8 / 2.9 (branch `neondb`):**
```
TS-0002 price=NULL  → link 404 · Available 10→9 · absent from inventory+home · no ₦0
TS-0002 restored    → link 200 (immediate)
TS-0003 photo removed → link 404 · Available 9 · absent ;  restored → 200
TS-0004 deleted_at=now() → link 404 "This car is no longer available." · absent
TS-0015 (sold)      → link 404 (graceful)
```

**1.3 / 1.4 (live schema):** money columns `bigint` (scale 0): `car.doorstep_price_kobo`,
`car.was_price_kobo`, `cost_line.amount_minor`, `cost_line.rate_minor`, `sale.sale_price_kobo`.
All timestamps `timestamp with time zone`. `setting` = key, value, updated_at.

## 7. Leftover state

- I created a temporary Neon branch **`task001-verify` (`br-morning-tree-b2eevfkp`)** off
  `production`, plus a scratch database `seedtest`, and mutated then restored `neondb` on that
  branch. **Deleted (owner-approved, 2026-10-09); only `production` remains.**
- Test servers I started (:3210, :3100, :3999) were stopped. The pre-existing server on :3000 was
  left running.

## 8. Cause analysis — task file vs build (added 2026-10-09)

The two FAIL rows and the 2.6 divergence trace to the task/testing files, not the code:

- **3.2 (`kobo`)** — testing.md 3.2 lists `kobo` as a forbidden token, but task.md's constraint
  (line 62) forbids only purchase / shipping / clearing / trucking / fuel / rate / total-cost /
  profit, and `specs/showroom` forbids the same set. `specs/money` (line 37) **requires** integer-
  kobo money and `specs/showroom` (line 19) allow-lists `price`. A public price in kobo is therefore
  spec-compliant; the token is testing.md over-reaching. → **checklist defect**, not a build defect.
- **2.6 (table/filter)** — task.md item 10 and testing.md 2.6 require an office-style table/filter;
  `specs/showroom` never mentions them, and task.md's own out-of-scope table gives office screens to
  TASK-002 (design D9's sheets describe the office). Builder logged it (conflict-log #8). →
  **task-file conflict**, not a build defect.
- **1.6 (`neon.ts` not committed)** — task.md line 39 requires "a committed `neon.ts`" (a real miss:
  zero commits), but testing.md 1.6's **Fail** clause is only "…or `neon.ts` is missing entirely" —
  it cannot catch "present but uncommitted". → **task-file ambiguity**.

**Registry goal** (`tasks-registry.md` line 11): the six deliverables — app scaffold, migrations,
seed, allow-list serializer, three-section showroom, leak check — **all exist and work**, and the
core rule holds. **Goal achieved.**

Open items (neither task-file edits nor a commit):

1. Delete the temp Neon branch — **done**.
2. `scripts/leak-check.ts` token match is case-sensitive — a camelCase cost field (`purchaseKobo`,
   `rateMinor`, `totalCostKobo`) would also slip past. Blocked on the `kobo` decision below.
3. Owner decision: `priceKobo` **and** `wasPriceKobo` in the public payload vs the allow-list
   "price … and nothing else".

Correcting `testing.md` / `task.md` / the registry belongs to the Architect (`openspec/`); a message
is drafted at `developer-workspace/reports/TASK-001-architect-message.md`.
