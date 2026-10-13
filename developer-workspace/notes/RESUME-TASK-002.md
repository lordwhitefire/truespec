# Resume — TASK-002 (after the cut, 2026-10-12)

The prior session was cut short when the machine went down (~17:05). This note is the pickup point.

## Where it stands

- **Rules — frozen (Checkpoint A ✅).** `rules/TASK-002/`: `sections.md`, `counting.md`,
  `money.md`, `codes.md`, `sold.md`. **29 rules** (R-SEC-1…5, R-CNT-1…5, R-MON-1…12,
  R-REF-1…4, R-SLD-1…3).
- **Model — built (Checkpoint B ✅, this session).** `models/TASK-002-model.md`, the authority the
  check reads. Every rule carries its forced implementation, the read points it constrains and its
  check. Verified mechanically: 29/29 rules present, 29 `Rule`/`Forces`/`Check` blocks; read-point
  file:line claims spot-checked against the live code.
- **Real build — all six rule modules landed (Tasks 8–11).** `lib/sections.ts`, `lib/counts.ts`,
  `lib/money.ts`, `lib/refs.ts`, `lib/sale.ts`, `lib/overview.ts` exist and are tested
  (47/47, six suites).
- **Read points rewired through Task 19; Checkpoint C ✅.** Public server path (12), public home/inventory (13),
  public layout/car/cards (14), the office adapter (15), the office dashboard + inventory (16), the
  office **car form** (17), office **settings** rate removal (18), and the rate **purge** (19).
- **Model check (Task 20) ✅ 2026-10-13.** `reports/TASK-002-model-check.md`: 29/29 rules PASS
  (unit + mechanical), all 4 gates green (tests 47/47, typecheck clean, build green, leak-check
  26/26 on `:3210`), §7 deletion ledger 16/16 satisfied, no hard defect. Next: Tasks 21–23
  (browser surfaces only, reconciliation + conflict log, report).

## Session facts (pickup)

- **PORTS — STANDING RULE (owner, 2026-10-13): build `:3210`, reference `:3211`. Port `3000` is NEVER used** — not for dev, leak-check, or probes. `scripts/leak-check.ts` defaults to `localhost:3210`. The Task 16–18 "live-verified at `:3000`" notes below were checked on the wrong (now-forbidden) port; their numbers came from the same truespec instance and are re-verified on `:3210` in Task 21.
- **Nothing committed or pushed this session**; the repo carries uncommitted changes (last commit `19c2af2`).
- Tests: `node --import tsx --test "lib/**/*.test.ts"` — 47/47 across `rules.smoke`, `sections`, `counts`, `money`, `refs`, `sale`, `overview`.
- Gates: `npm test`, `npm run typecheck`, `npm run build`, `npm run leak-check`. **All four pass** (Task 19–20): tests 47/47, typecheck clean, build green, `leak-check` **26/26 PASSED** on `:3210` (its earlier false positives — `"shipping"`/`"clearing"` copy, `"rate"` inside `generateMetadata` — were fixed in Task 19's shape-aware token list).
- **GATE ORDER (learned 2026-10-13):** `next dev` (`:3210`) and `next build` share `.next`. Running `build` while dev is live clobbers it → `Cannot find module './vendor-chunks/@neondatabase.js'`, 500 on every dynamic route (bit Task 20). Run **`leak-check` before `build`**, or restart `next dev` after — or give the build its own `distDir`.

## Progress log

- **Task 23 — public boundary re-check, report, closing copy — done.** `reports/TASK-002-report.md`; copies in `openspec/tasks/TASK-002/`.
  - **All four gates green (2026-10-13):** `npm test` **47/47, 0 fail**; `npm run typecheck` **clean**; `npm run leak-check` **PASSED** — "no cost, currency or profit value leaked on any public route"; `npm run build` **clean** (13 routes). Order honoured: leak-check ran **before** build while `next dev` was alive; the build clobbered `.next` as expected (home 500) and `next dev -p 3210` was **restarted** (setsid nohup, pid from `ss`) → home and office routes 200 again.
  - Also added the plan's Task 21 verification artifact: the probe now also writes **`scripts/task-002/runs/<screen>/compare-report.txt`** (8 screens) alongside `surface-probe.{txt,json}`; probe re-run, guard **6→6** (no launch).
  - `reports/TASK-002-report.md` states **built / verified / not verified** honestly: interactive behaviour (save-block, live recompute, filters) not driven; write paths (create/edit/sell/`TS-####` assignment) are **TASK-004**; `office_car`↔`car` is **TASK-003**; per-state colour + `sort` missing by design.
  - **Copied byte-identical** (diff -q verified) into `openspec/tasks/TASK-002/`: `rules/` (6 files), `model/TASK-002-model.md`, `report.md`, `TASK-002-conflict-log.md`, `TASK-002-browser-check.md`, `TASK-002-model-check.md`, `TASK-002-reconcile-output.txt`.
  - **⚠️ Checkpoint D cannot be ticked as written. Raised to the owner.** `task.md` §Benchmarks has 9 items; **4 of them (#4 malformed-amount save-block, #5 edit-a-cost recompute, #7 `TS-####` on creation, #8 mark/unmark sold) require the write paths this plan itself defers to TASK-004.** The report maps each benchmark (met / read-half / not-verifiable-here). Not silently ticked.

- **Task 22 — reconciliation + conflict log — done.** `reports/TASK-002-conflict-log.md` + `reports/TASK-002-reconcile-output.txt`.
  - `scripts/reconcile.ts` runs the ONE rule (`lib/counts.ts`, `lib/money.ts`, `lib/overview.ts`) **through the office adapter** (`lib/office.ts` — imported with `--conditions=react-server` so its `server-only` guard doesn't block a server-side script; no duplication of the adapter) over the live 15 `office_car` demo rows, and prints every figure beside the figure the old office showed (parsed from the recorded witness `scripts/office-data/ref-dashboard.txt` / `ref-inventory.txt`).
  - **Result: the rule reproduces every office figure it is meant to** — counts 12 available · 2 on order · 1 new arrival · 1 sold; projected ₦57,760,000 (12 of 14); real ₦3,850,000 (1 of 1); sold 2018 Camry XLE ₦31,500,000; all 41 per-row price/cost/profit figures. **One disagreement: money tied up ₦451,040,000 (rule) vs ₦587,040,000 (old)** — the old office used the doorstep **price as a proxy** for an incomplete car's cost; diff ₦136,000,000 = exactly TS-1013 ₦58M + TS-1014 ₦78M. **Named DATA divergence — rule wins (R-MON-8).** Script exits 0 (a non-named mismatch would exit 1).
  - Command: `node --env-file=.env.local --conditions=react-server --import tsx scripts/reconcile.ts`.
  - **Conflict log — 19 named disagreements, each with its winner:** (1–9) the rule wins over the old office — money tied up; cost label before landing; office table header "LANDED COST"→"COST"; the rate/dollar; the flickering rate-derived public price → fixed doorstep price; public home "12 READY · 6 LANDED" → "18 CARS · OF WHICH 6 NEW ARRIVALS"; "On order"→"On Order"; settings "Currency & cost defaults"→"Cost default"; car-form amounts number→text. (10) the office's own table (`office_car` vs `car`) — **deferred to TASK-003**. (11–13) internal, accepted: `costLabelFor` takes the section; `inventory-client.tsx:156` display arithmetic; `inventory/page.tsx:33` repeats the adapter's sold derivation. (14–16) earlier named items stand (chip dot colour → TASK-003; headline uses server `counts.sold` → TASK-004; `HELD` fallback). (17–19) unintended, outside TASK-002 (office titles; seed `RX 350 350`; public filter dims — with the positive "no owner-state leak" result).

- **Task 21 — browser check, surfaces only, cell matrix — done. `reports/TASK-002-browser-check.md`.**
  - Ran `node developer-workspace/scripts/task-002/surface-probe.mjs`: **8 screens × cell matrix = 56 cells**, all HTTP 200 — public home / inventory / car / car-sold (560/820/1100 × dark/light), office dashboard / inventory / car / settings (1440/820/560/390 × dark/light). Each cell pulls tab A = ref `:3211` and tab B = build `:3210` at the same viewport + theme and prints the same named surface facts side by side. Attach-only: **no Chrome launched (guard 6→6)**; `ps` shows only the automation Chrome (pid 8324 on `:9222`) plus the owner's own snap chromium (5296). **No screenshots.** Artifacts: `scripts/task-002/runs/surface-probe.{txt,json}`.
  - **9 intended divergences, each tied to its requirement:** (1) public car price no longer flickers — the ref's rate-derived figure (a new value each load: ₦10.6M–13.9M) replaced by the car's fixed doorstep price (R-MON-3 + price-is-a-field); (2) office car form loses `rate`/`$`/`fx`/"Rate ₦1,000 / $1"/US-Nigeria breakdown (R-MON-3); (3) office settings "Currency & cost defaults"/"Dollar rate" → "Cost default" (R-MON-3 + Task 18); (4) inventory cost label by state — ref's uniform "Landed cost" → build's "Estimated total cost" (not landed) / "Landed cost" (landed), table header "Cost" (cost-label rule, model 299–311); (5) car form "Price − landed." → "Price − cost."; (6) inventory chip "On order" → "On Order" (sections rule); (7) home summary "12 READY · 6 LANDED" → "18 CARS · OF WHICH 6 NEW ARRIVALS" (R-CNT); (8) money tied up ₦587,040,000 → ₦451,040,000 (owner ruling + `totalCostKobo`, **named divergence 1**); (9) car-form amounts `type=number` → six `type=text` (Task 17). Rule-derived figures that must match do: office per-car price/cost/profit (41/41), projected ₦57,760,000, real ₦3,850,000, "12 AVAILABLE · 2 ON ORDER", and the public **sold** cell (title "Sold", h1 "That one found a new owner").
  - **3 unintended divergences, each OUTSIDE TASK-002's change surface (named, not fixed):** office `/office/*` pages render the root public `<title>` (no office layout sets `metadata` — office shell owns it); seed data doubles the trim (`2019 Lexus RX 350 350`; `seed.ts:56` carries `model:"RX 350"`+`trim:"350"` — the title builder is correct); public inventory filter has 30 checkboxes vs ref 16 (browser predates TASK-002). **Positive boundary result: no owner-state name leaks into any public filter** (public status uses only `lib/sections.ts`).
  - **Not-a-divergence:** settings account/password panel exists behind the **Account** tab (`settings-client.tsx:455`); the probe read only the default General tab. Sold-cell first pass mis-mapped the build URL (routes by ref code, not slug) → corrected to `/car/TS-1025` (`seed.ts:63-68`).
  - **Not checked:** look/CSS/pixels (no screenshots); interactive behaviour (form validation, live recompute, filtering, Save/delete, keyboard) — covered by the rule tests + Task 20; per-state colour (TASK-003); office login/enquiries/account.

- **Task 20 — model check, rule by rule — done. Model-check: PASS.**
  - `reports/TASK-002-model-check.md`. Walked all **29 rules** in `models/TASK-002-model.md`: each rule's executable check (`npm test` **47/47**) plus its named mechanical search. **29/29 PASS.** Gates: `npm run typecheck` clean, `npm run build` green, `npm run leak-check` **PASSED — 26/26 public routes** on `:3210` (no cost/currency/profit leak). **§7 deletion ledger: 16/16 read points satisfied** (every listed site now calls the forced module; `components/InventoryTabs.tsx` is gone — folded into `InventoryBrowser`).
  - Searches run: no second three-section literal (only `sections.test.ts:37`, the test's expectation list); no state→section map outside `lib/sections.ts` (consumers call `sectionOfState`); no second money total (all via `totalCostKobo`); no `rate` (only comments, the void columns `0003_car.sql:39,44-45`, the leak-check guard, removed-setting history); no seventh cost kind; no price/cost on any state/section record; **0 owner-state labels** rendered on `/`, `/inventory`, `/car/TS-1001`.
  - **No hard defect.** Three new divergences logged for Task 22 (on top of the five already named): (6) `costLabelFor(state: Section, sold)` takes the **section** (the state's resolved stage), not the owner's state label — behaviour-identical for every registered state, wording differs from the model; (7) `inventory-client.tsx:156` `stock = rows.length − counts.sold` — display arithmetic over the presented list minus the rule's *own* sold figure, not a second count; (8) `inventory/page.tsx:33` `sold_at !== null` repeats the adapter's sold-ness derivation (`office.ts:94`) — same source, not a state.
  - **Operational:** running `npm run build` over the live `next dev` (`:3210`) clobbered `.next` → 24 routes 500 (`Cannot find module './vendor-chunks/@neondatabase.js'`). Not code; restarted `next dev` on `:3210`; leak-check then 26/26. Gate order recorded in the plan + resume (see above).
  - `scripts/seed.ts`, all `lib/*`, apps: **unchanged** — Task 20 is a check only.

- **Task 19 — purge the rate everywhere else (seed, leak-check, activity) — done, all gates green. Checkpoint C ✅.**
  - `scripts/seed.ts`: `usdLines()` (rate conversion, USD/NGN currency, `rate_minor`) replaced by `nairaLines()` — six naira kobo lines, `currency` written `'NGN'` only (column still NOT NULL until TASK-003), `rate_minor` never written. Cost lines are now re-synced **every run** (delete + insert, same pattern as photos) so a re-seed converges stale rate-era rows. `db:seed` succeeds; DB now **150/150 NGN lines, 0 non-null rate_minor**.
  - `app/office/(shell)/activity/activity-client.tsx`: removed the "Settings — FX rate set to ₦1,000 per $1" entry.
  - `scripts/leak-check.ts`: FORBIDDEN now shape-aware — identifiers (`rate_minor`, `currency`, `amount_minor`, `cost_line`, `total_cost`, `purchase_price`, `trucking_usa`, `trucking_ng`, `full_tank`, …) plus quoted `"shipping"`/`"clearing"` (JSON-kind shape, not the marketing words), and `\bcost\b`/`\brate\b` word-boundaried so `generateMetadata` can't trip it. Loop handles `string | RegExp`. `BASE` default changed `localhost:3000` → `localhost:3210`. **Result: LEAK CHECK PASSED — 26/26 public routes clean on `:3210`.** (The earlier transient `GET /car/TS-1005 → 500` seen in the old `:3000` log is gone: every car page returned 200.)
  - Repo-wide: the only remaining "rate"/"usd" text is explanatory comments and the standing rule (no field, constant, column value, or copy).
  - **Servers now per the standing rule:** build `next dev -p 3210` (log `/tmp/opencode/dev-truespec-3210.log`), reference `python3 -m http.server 3211` on `test-truespec-v2` (log `/tmp/opencode/ref-truespec-3211.log`). Port 3000 is closed and never used.

- **Task 18 — office settings (`settings-client.tsx`, `state-seeds.ts`, `state-editors.tsx`) — done, build green.**
  - `settings-client.tsx`: deleted `FX0`, the `fx`/`fxSnap` state, `saveFx`, `fxDirty`, and the "Dollar rate" field + `$` row + "Landed cost = dollar costs × this rate + naira costs." hint (model deletion ledger `147-157,390-449`). Card is now **"Cost default"** (icon `fa-naira-sign`): only the **Full tank** default remains, with its own save (`tankSave`/`tankDirty`); copy says every amount is in naira — "no currency conversion" (no word "rate", keeps Task 19's purge clean).
  - `state-seeds.ts`: deleted the second section definition (`CarSection` type + `SECTIONS` list, ledger `12,24-30,51`). `EditorRow.section` is now `Section` from `lib/sections.ts`; `CAR_STATES` rows carry lowercase canonical sections (`available`/`on order`/`landed`). `state-editors.tsx` imports `SECTIONS`, `sectionLabel`, `type Section` from `lib/sections.ts` and renders the section dropdown with `sectionLabel(s)`; new-state default section is `"available"`.
  - `settings/page.tsx` unchanged — it has no section vocabulary; it only maps `c.state` → per-state usage counts (kept per plan, "usage counts stay, not a stock count").
  - **SSR surface verified** (`:3000/office/settings`): no "Dollar rate", no `id="fx"`, no `fxSave`/`fxDirty`, no "Currency & cost defaults"; "Cost default" card with Full tank + Save default. tests 47/47, typecheck clean, build green.
  - **Named divergence (Task 22):** the reference card "Currency & cost defaults" is retitled "Cost default" (the rate is gone by requirement, so the title cannot keep "currency").

- **Task 17 — office car form (`car/page.tsx`, `car/new/page.tsx`, `car-client.tsx`) — done, build green.**
  - `car-client.tsx`: deleted `RATE`, `usd()`, the local `naira()`, and the local `parse()`/`compute()` arithmetic. `compute(priceStr, costs, section)` now reads every figure from `lib/money.ts`: six fields parsed by `parseCostAmount` in `SIX_COST_KINDS` order (`COST_FIELDS`/`KIND_BY_FIELD` — a field's kind is its position, no second kind list), `totalCostKobo`, `isCostComplete`, `profitKobo`, `costLabelFor(section, false)`, `formatNaira`. A malformed amount sets an error at its own field (`CostInput` component renders it, `aria-invalid`), is not counted, and blocks Save (R-MON-10); profit shows only when all six are in (R-MON-8). The live panel drops the "Purchase + US costs"/"Nigeria costs"/"Rate" rows for a single state-named total; header and mobile bar read `{panel.costLabel}` (`p-cost`/`m-cost` replaced `p-usd`/`p-ngn`/`p-rate`/`p-landed`/`m-landed`).
  - `page.tsx` (edit) uses `getOfficeCarViews` + `getOfficeStates`; passes `data.section` and `stateSections` (label → the one section) from the registry; `FORM_DEMO.costs` are now the reference's USD amounts as naira (purchase 26,500,000 … tank 110,000 → total 32,655,000). `new/page.tsx` (add) is async, passes blank state `Available`/section `available` + `stateSections`. Changing the state renames the live cost figure (effect on `curState`) — "On the way" → "Estimated total cost".
  - **SSR surface verified** (`:3000/office/car`): six naira inputs `id="c-purchase…tank"` `type="text" inputMode="decimal"` with naira placeholders; total ₦32,655,000, profit ₦1,245,000, price ₦33,900,000; label "Landed cost" (car is Available); **no** `Rate`/`$`/`p-ngn`/`p-usd`/`p-landed`. tests 47/47, typecheck clean, build green.
  - **Out of scope / untouched:** the form's hardcoded `STATES` + `HELD` state-button list (not in the model's deletion ledger — a *state* list, not a section list). The `HELD` demo state has no registry entry, so `sectionFor` falls back to the car's own section. No new divergence logged beyond that fallback note.

- **Task 16 — office dashboard + inventory — done (build green).**
  - **Dashboard (`app/office/(shell)/page.tsx`) — done, live-verified.** Rewired to the adapter's new shape (`d.counts.*`, `d.moneyTiedUp.{kobo,of}`, `d.projectedProfit.{kobo,counted,of,stillBuilding}`, `d.realProfit.kobo`, `d.sold.{label,priceKobo}`); copy unchanged. Live at `:3000/office`: **Money tied up ₦451,040,000** across 14; **Projected profit ₦57,760,000** "From 12 of 14 cars. 2 excluded"; **Real profit ₦3,850,000** "1 car sold — 2018 Camry XLE, sale price ₦31,500,000"; strip 12 available (of which 1 new arrival), 2 on order. Counts identical to the old witness; **money-tied-up differs on purpose** (see divergences below).
  - **Inventory (`.../inventory/page.tsx` + `inventory-client.tsx`) — done, live-verified.** `page.tsx` dropped `STATE_KEY`; reads `getOfficeCarViews` / `getOfficeStates` / `getOfficeCounts`; cost + profit now from `lib/money.ts` (`costLabelFor`, `isCostComplete`, `totalCostKobo`, `profitKobo`), price = sale price when sold. `inventory-client.tsx` dropped local `naira()`, `ORDER`/`LABEL`/`ST_CLS`: chips are built from the registry `states` prop, money via `formatNaira`, table cost header `Landed cost` → neutral `Cost`, card cost label = `costLabel`, sold via the flag. Live: chips **All 15 / Available 11 / On the way 1 / At port 1 / Landed 1 / Sold 1**; "15 cars — 14 in stock, 1 sold"; cost labels per state — "Estimated total cost" on On-the-way/At-port, "Total cost" on sold, "Landed cost" otherwise (no not-landed car reads "Landed cost"). tests 47/47, typecheck clean, **build green**.
  - **Named divergences (for the Task 22 conflict log):** (1) **money tied up** is ₦451,040,000 not the old ₦587,040,000 — the shared rule counts *entered* costs only, so the incomplete cars (TS-1013 ₦58,000,000, TS-1014 ₦78,000,000) contribute 0; the old code used price-as-proxy. A **data** difference, not a second rule (owner ruling 2026-10-12). (2) Inventory chip **dot colour** is derived from the car's *section*, so "On the way" and "At port" share the blue (reference gave At port a darker blue); per-state colour is TASK-003. (3) After a demo delete the headline still uses the server `counts.sold` (client delete is non-persistent) — sold-row-deleted edge only.
- **Task 15 — office adapter (`lib/office.ts`) — done, verified against the witness.** Rewrote `lib/office.ts` as the one documented, temporary adapter (TASK-003 seam) over `office_car`: no hardcoded state sets, no local sum. Reads `office_car` + `car_state`; resolves each row's section via `sectionOfState(state, registrySection)`; maps rows → `OverviewCar` (six-line expansion of the single `landed_cost_kobo` — total on `purchase_price`, rest `0` when present, all `null` when absent) → `stockOverview`. Exposes `OfficeCarRow`, `OfficeCarView`, `OfficeState`, `OfficeDashboard` (`{ counts, moneyTiedUp, projectedProfit, realProfit, sold }`, each money total a `MoneyTotal`), `costLinesFor`, `toOverviewCar`, `getOfficeCars`, `getOfficeCarViews`, `getOfficeStates` (registry in `sort` order, section via the one rule), `getOfficeCounts`, `getOfficeDashboard`. Tests 47/47, typecheck clean.
- **Task 14 — public site: layout, car page, cards — done, live-verified.** `components/site/car-view.ts` (`sectionLabel`), `app/(site)/car/[ref]/page.tsx` (removed `SECTION_LABEL`/`STATUS_KEY`; uses `sectionLabel`/`tokenOf`; local var renamed `sectionName`), `components/CarCard.tsx` (`CardVariant = Section`, labels via `sectionLabel`). Live: chips/status render "Available"/"On Order"/"Landed", no owner state-label leak.
- **Task 13 — public site: home + inventory — done, live-verified.** `components/site/HomeInventory.tsx` (counts via `countStock`, "of which N new arrivals" note, tab filter via the presented set), `app/(site)/inventory/page.tsx` (URL normalised with `sectionOfToken`), `components/site/InventoryBrowser.tsx` (SECTIONS/labels/tokens from `sections.ts`; `statusCounts` via `countStock`; filter via `presentedSections`), `components/site/HomeBehaviors.tsx` (counts via `countStock`; pool via `inAvailablePresentation`); deleted dead `components/InventoryTabs.tsx` (no importers). Live home: "Available 18 cars · of which 6 new arrivals"; inventory chips "Available 18 / On Order / Landed".
  - Notes carried from Tasks 13/14: `serialize.ts` keeps `export type PublicSection = Section`; `PublicCar.sold`/`soldAt` made required (was optional) to satisfy `Countable`; inventory status chips read "On Order" (intended divergence tied to R-SEC-1); home tab labels ("Available"/"On order"/"Landed this year") left as-is (match the reference); `page.tsx:14` hero / `layout.tsx:51` gallery / `car/[ref]:517` similar left as strict-section filters (not in the ledger).
- **Task 12 — public server path (`lib/serialize.ts` + `lib/public-cars.ts`) — done, verified; one gate blocked by a checker defect.** `serialize.ts` no longer defines the section set: it imports `Section` from `lib/sections.ts` (`export type PublicSection = Section`, the one `HomeInventory` consumer unchanged). `RawCarRow` now carries the state `label` + the registry's `configured_section` instead of a raw `section`, and `toPublicCar` resolves it with `sectionOfState(state, configured_section)` — the one rule (R-SEC-2), never the column. The query selects `s.label AS state, s.section AS configured_section, s.is_new_arrival`; `getPublicCounts` still reads the one counting rule (`countStock`), now passing `sold` honestly. tests 46/46, typecheck clean, build green.
  - **⚠ `npm run leak-check` fails live — but not from this change.** Started the dev server on `:3000`; the checker flags only tokens `"shipping"`, `"clearing"`, `"rate"`. All three are false positives: `"shipping"`/`"clearing"` are legitimate marketing copy ("Shipping, clearing and delivery included.", `app/(site)/car/[ref]/page.tsx:265`, `app/(site)/page.tsx:89`, `app/(site)/layout.tsx:41`, `HeroSlider.tsx:43`, `CarBehaviors.tsx:20`), and `"rate"` is a substring of `generateMetadata` in the RSC bundle the page inlines. **No real leak**: checked the car payload for `kobo`/`cost`/`profit`/`rate_minor`/`totalCost`/`doorstep_price_kobo` — all 0 occurrences, and the checker reported no `cost value` hit (its genuine signal). The checker's substring `FORBIDDEN` list is Task 19's file ("purge the rate everywhere else — Seed, leak-check, activity"), so its refinement is not Task 12's. Pre-existing; not a Task 12 regression.
- **Task 11 — `lib/overview.ts` — done, verified.** `stockOverview(cars)` combines `countStock`
  (counts.ts) with `totalCostKobo`/`isCostComplete`/`profitKobo` (money.ts) and owns no count or cost
  arithmetic of its own. Returns `counts`, `moneyTiedUp` (every in-stock car, complete or not — an
  incomplete car contributes its entered costs), `projectedProfit` (complete in-stock cars) and
  `realProfit` (complete sold cars). Each total is `{ kobo, counted, of, stillBuilding }`; helpers
  `reachLine` → "from 9 of 12 cars" and `stillBuildingLine` → "still building — 3 of 12 cars have
  incomplete costs" (null when none). `overview.test.ts` (8 tests) covers the money spec's "3 of 12
  incomplete" scenario, sold-out-of-stock, and a loss shown as-is. `npm test` 46/46 pass; typecheck
  clean; build green. Nothing imports it yet (dashboard = Task 16, adapter = Task 15).
- **Task 10 — `lib/refs.ts` + `lib/sale.ts` — done, verified.** `lib/refs.ts`: `REF_PREFIX`,
  `formatRef(seq)` (zero-pads to `TS-####`, runs on past four digits), `isValidRef(ref)` (accepts
  exactly a `formatRef` output), and no setter/allocator at all (assignment is the write path,
  TASK-004). `lib/sale.ts`: `Sale`/`SaleRecord`/`SaleAction`, `isSold(sale)`, `salePriceOf(sale)`
  (the R-SLD-2→R-MON-6 flip), `saleTransition(current, action)` (mark sets price+date; unmark
  reverses to `null`, a no-op when already unsold). New tests: `refs.test.ts` (7), `sale.test.ts`
  (6). `npm test` 38/38 pass; typecheck clean; build green. `npm run leak-check` still stops at its
  live fetch (app not served on `:3000`) — unchanged from Task 9. Nothing imports the two modules
  yet (public path = Task 12; forms = Tasks 16/17).
- **Docs — the doorstep-price rule written into the specs (owner ruling, this session).** Added
  `### Requirement: One selling price, on the car, never on a state` (+ two scenarios) to
  `openspec/changes/truespec-architecture/specs/money/spec.md`, and a scenario
  ("The price does not move with the state") to `.../specs/showroom/spec.md`. No rule change was
  needed — `R-MON-11`/`R-MON-12` (rules + model) already hold it, `lib/money.ts` states it, and
  `money.test.ts` asserts it.
- **Task 9 — `lib/money.ts` rewritten naira-only — done, verified.** Removed `Currency`,
  `USD_COST_KINDS`, `NGN_COST_KINDS`, `rateMinor` and the USD-product rounding. API now:
  `SIX_COST_KINDS`, `CostLineInput` (`{ kind, amountMinor }`, kobo, `null` = not entered),
  `totalCostKobo` (exact integer sum — the only place money is combined), `isCostComplete`,
  `profitKobo({ totalCostKobo, priceKobo, salePriceKobo })` → `{ kobo, basis: projected|real|none }`,
  `costLabelFor(state, sold)`, `parseCostAmount(raw)` → `{ ok, amountMinor } | { ok:false, error }`,
  and `nairaDigits`/`formatNaira` kept. `scripts/leak-check.ts` updated (dropped `currency`/
  `rate_minor` from its query and mapping; uses the one `totalCostKobo`). Tests: `lib/money.test.ts`
  — **18 pass** (25/25 with sections + counts); `npm run typecheck` clean; `npm run leak-check`
  runs (loads env, connects to the DB, enumerates 26 routes — stops at the fetch because the app is
  not served on `:3000`).
  **Flagged for the owner:** (a) the model words the label `costLabelFor(state, sold)` while the
  plan says `costLabelFor(section, sold)` — built as `(state: Section, sold)`, since a state
  resolves to exactly one section (R-SEC-2) and that section *is* the stage; (b) the rule names
  labels for on-order/at-port/cleared ("Estimated total cost") and landed ("Landed cost") but the
  **"available"** state's label is unstated — built as "Landed cost" (an available car has landed).
- **Task 8 — `lib/sections.ts` + `lib/counts.ts` (+ tests) — done, verified.** `lib/sections.ts`
  (new): `Section`, `SECTIONS`, `SECTION_LABEL`, `isSection`, `sectionOfState` (raises on
  none/two), the R-SEC-3 inclusion and `presentedSections` (R-SEC-3+4). `lib/counts.ts`
  refactored to import `Section` from `sections.ts` (dropped its local `StockSection` and the
  redundant `| "sold"`); arithmetic unchanged. Tests: `lib/sections.test.ts`, `lib/counts.test.ts`
  — **13/13 pass**; `npm run typecheck` clean. The one caller (`lib/public-cars.ts`) still
  typechecks (its `PublicSection` is structurally the same union).
- **Task 7 — browser-check harness — done, verified.** `scripts/task-002/_lib.mjs`
  (attach-only: reuses the skill's `twoTabs`/`resize`/`clearResize`/`detach`, own guarded
  `attach`/`assertOurs`/`guardCount`) + `checklist.public.json` (560/820/1100 × dark/light) and
  `checklist.office.json` (1440/820/560/390 × dark/light). Started the automation Chrome
  (`/usr/bin/google-chrome`, profile `~/.config/google-chrome-automation`, `--remote-debugging-port=9222`,
  visible on `:0`); the harness then **attached**, confirmed ours (UA has no `Headless`), printed the
  two tabs (both `about:blank` — fresh Chrome), and **launched nothing** (count 6 → 6). The two tabs
  get pointed at the ref (`:3211`) / build (`:3210`) when the surface check runs (Task 21).

## Next steps, in plan order

- **All plan steps done (Tasks 1–23).** Phase 4 complete: Task 21 (browser), Task 22 (reconciliation + conflict log), Task 23 (gate + report + copies) all ✅ 2026-10-13. **Checkpoint D held back** — 4 of 9 `task.md` benchmarks need TASK-004 write paths; raised to the owner (see the Task 23 log entry). The named divergences (Task 16 money-tied-up, chip dot colour, sold-row-delete; Task 18 "Cost default" retitle; Task 17 `HELD` fallback; Task 20 items 6–8; Task 21 items 17–19) are all in the Task 22 conflict log.

## Gates

`npm test` (runs `lib/**/*.test.ts` via tsx — confirmed green on the smoke test),
`npm run typecheck`, `npm run build`, `npm run leak-check`.

## Rule that governs the check

The model is **not** changed to match the build. A difference is a named divergence: either the
build broke a rule (a defect) or the rule needs the owner.
