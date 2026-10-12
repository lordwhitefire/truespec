# OFFICE screens — work tracker

Living tracker for building the **7 office screens** to the reference-runtime model.
Owner directive: build in the given order, one page at a time. Plan: `plans/OFFICE-screens-plan.md`.

Reference site (static): `/home/lordwhitefire/current-project/test-truespec-v2/`
Reference served at `http://localhost:3211/` (python http.server).
Build served at `http://localhost:3210/` (Next.js). One persistent Chrome, CDP `:9222`.
Skill: `~/.agents/skills/runtime-divergence/` (`scripts/{run,model,compare}.mjs`).

## The pipeline — every screen goes through these 5 stages, in order

1. **Source recon** — read the reference source (`<screen>.html`) to enumerate the **ambient**
   (screen at rest) + **facets** + **every conditional** (widths, theme, modals, panels, tabs,
   toasts, typing, drag, **hover, focus**, keydown, timers). Discovery only; never the compare.
2. **Reference runtime + rules** — drive the reference through the checklist; extract HTML/CSS/JS
   rules from the running page.
3. **Model** — collapse the reference captures into the model. The model is the standard.
4. **Build** — build the React page to meet the model, with generated fake data in the database.
5. **Build-mode check** — produce a production build, drive the *same* checklist on it, extract
   rules, compare to the model, rule by rule. Report divergence; change nothing in the compare.

## Environment decisions (carried from the plan)

- Ambient: **1440×900, dark**. Conditionals: **820 / 560 / 390 widths**, **light at 1440**,
  and **hover / focus** on every interactive control.
- **Theme toggle on all 7 screens** = owner-approved addition (reference has it only on
  activity / settings / login). Modelled from those three; compare treats it as approved.
- **UI only.** Dead controls stay dead; log them, do not wire them.
- Reference (`office-*.html`, `login.html`) links are the interlinks; office route is `app/office/`.
- `app/layout.tsx` = bare shell; `app/(site)/layout.tsx` = public chrome. Office gets its own layout.
- **Production build for the target check** (G1: the `next dev` CSSOM is unstable; a moving
  target proves nothing).

## Status

| # | Screen | 1. Recon | 2. Ref rules | 3. Model | 4. Build | 5. Compare |
|---|--------|:---:|:---:|:---:|:---:|:---:|
| 1 | Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Inventory | ✅ | ✅ | ✅ | ✅ | 🔄 |
| 3 | Car form | ✅ | ✅ | ✅ | ✅ | 🔄 |
| 4 | Enquiries | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 5 | Activity | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 6 | Settings | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 7 | Login | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

Legend: ✅ done · ⏳ not started · 🔄 in progress · ➖ n/a

## Screen 1 — Dashboard (`office-dashboard.html`, 268 lines)

**Ambient (1440, dark).** `.shell` grid `240px minmax(0,1fr)`. Sidebar `.side`: brand
(`.sl`), 6-link `.sn` nav, `.sfoot` ("Signed in as Umar" + sign out). Topbar `.topbar`
hidden. `.main`: `.hrow` (h1 "Dashboard", `.sub2` line, "Add a car" `.btn`), `.kpis`
(3 cards — Money tied up / Projected profit `warn` / Real profit), `.strip` (3 `.sc`),
`.duo` (2 `.panel`: Recent activity, Recent WhatsApp taps), `.legend` (1 `.pill`).
`.bnav` hidden.

**Conditionals.**
- **Widths:** `≤1000` (kpis 2-col, strip 1-col, duo 1-col); `≤820` (shell 1-col, sidebar
  hidden, topbar shown, `.main` padding, `.bnav` shown); `≤560` (kpis 1-col, hrow btn full width).
- **Theme:** `html[data-theme=dark]`; head script reads `localStorage ts-theme`. **No `#thm`
  element on the reference dashboard** (script references one; none rendered) — toggle is our
  approved addition, modelled from activity/settings/login.
- **Hover:** `.sn a:hover`, `.sn a:hover i`, `.btn:hover` (translateY −2px), `.more2:hover`,
  `.topbar .ico:hover`, `.wt p a:hover`, `.ph2 a/button:hover`.
- **Focus:** `:focus-visible` (gold outline).
- **Reduced motion:** `@media (prefers-reduced-motion:reduce)`.
- **Dead controls (log, do not wire):** "Show older entries", "Show all taps", topbar search button.

**Interlinks:** sidebar → 6 office pages; "Add a car" → office-car.html; "Full log" → activity;
"All enquiries" → enquiries; "See which" → inventory; sign out → login.html.

## Screen 1 — Dashboard: compare result (2026-10-11)

Target = production build on `:3210/office`; model = 9 reference states. Report:
`scripts/office-diff/dashboard/compare-report.txt`. Across **all 9 states the divergence is
identical and is exactly two things**:

1. **The owner-approved theme toggle** in the shared shell footer. Reference dashboard footer is
   `<b>Signed in as Umar</b>` + `<a>` direct (`.sfoot a{margin-top:8px}`); our shell uses the
   settings/activity footer shape `.sfoot > <b> + .srow{ .thm, <a> }`. That yields the 2 ref-only
   rules (`aside>div>a`, `aside>div>a>i`) and 5 target-only rules (`.srow` + `.thm` + link), plus
   the one CSS/box difference (sidebar `nav` height 734→723px, because the 30px toggle row is ~11px
   taller than the plain link row). **Cause is the approved addition, not a defect.**
2. **Next.js's own `next-route-announcer` node** — the `~ body>div reference=1 target=2` count and
   the `+ alert` line in the a11y diff. Framework glue injected by the App Router; not our markup.

Everything else matches: **49 shared rule signatures**, **0 design-token differences**, a11y diff is
URLs only, every state reached (all actions applied, none failed). No other divergence.

**Re-verified 2026-10-11** after the dashboard was made DB-backed (office data layer). Fresh
production build → re-captured 9 states → compare: **identical profile** — 9/9 states reached, 49
shared signatures, 0 token diffs, same 2 approved ref-only rules, same 5 target-only rules, same
`body>div 1→2` + `alert` (route announcer), same sidebar-nav box 734→723px. Report:
`scripts/office-diff/dashboard/compare-report-verify.txt`.

## Data layer — RESOLVED (owner option 1, 2026-10-11)

Owner chose **option 1**: seed a **separate office demo dataset** reproducing the reference figures,
plus a **new office read layer in `lib/`**. Owner directive "simple things" → minimal shape.

- `migrations/0007_office.sql` — new **`office_car`** table. Own table (not the public `car`) because
  the office refs `TS-1001…` collide with the public seed's refs and `car.ref` is UNIQUE; a public
  read-layer discriminator was rejected as worse. Columns: `ref` UNIQUE, brand/model/trim/year,
  mileage, `state CHECK IN ('Available','On the way','At port','Cleared','Landed')`, `is_new_arrival`,
  `doorstep_price_kobo`, `landed_cost_kobo`, `arrival_note`, `sold_at`, `sale_price_kobo`, timestamps
  + 2 indexes. RLS enabled.
- `lib/office.ts` — `getOfficeCars()`, `getOfficeDashboard()`; computes money-tied-up (landed ?? price
  for in-stock), cars in stock, profit from/excluded counts, projected profit, real profit, sold
  count/label/price, available, new arrivals, on order.
- `scripts/seed-office.ts` — 15-car `DEMO` array, idempotent `ON CONFLICT (ref) DO UPDATE`; script
  `db:seed:office`.
- `lib/money.ts` — added `nairaDigits(kobo)`; `formatNaira` ≥ `₦${nairaDigits(kobo)}` (behaviour-preserving).
- `app/office/(shell)/page.tsx` — now `async`, reads `getOfficeDashboard()`; KPI numbers/counts
  DB-backed. **Feeds** (activity, taps) and the **"5 open enquiries"** line stay presentational
  (activity/enquiries screens' data, built later).

**Verified 2026-10-11:** `db:migrate` (applied 0007) → `db:seed:office` (15 cars) → `typecheck` clean →
`build` clean (`/office` static, prerendered) → served on :3210; rendered page shows
**₦587,040,000 / 14 cars / 12 of 14 / 2 excluded / ₦57,760,000 / ₦3,850,000 / 1 car sold (2018 Camry XLE,
sale ₦31,500,000) / 12 available / 1 new arrival / 2 on order** — all traced to the reference. Re-ran the
9-state compare on the rebuilt page → same profile (see below).

## Office demo dataset — extracted from the reference RUNTIME (2026-10-11)

Pulled from the running `office-inventory.html` / `office-car.html` (not source):
`scripts/office-data/ref-inventory.txt`, `ref-car.txt`.

**15 cars, refs `TS-1001`…`TS-1015`** (brand / model / trim / year · mileage · state · doorstep price · landed cost · profit):

| ref | car | state | price | landed cost | profit |
|-----|-----|-------|------:|------------:|-------:|
| TS-1001 | Toyota Land Cruiser V8 ZX 2019 | Available | 96,500,000 | 89,600,000 | 6,900,000 |
| TS-1002 | Toyota Corolla LE 2020 | Available | 24,750,000 | 21,270,000 | 3,480,000 |
| TS-1003 | Honda Accord EX-L 2019 | Available | 28,900,000 | 25,550,000 | 3,350,000 |
| TS-1004 | Toyota Highlander XLE 2018 | Available | 38,750,000 | 34,520,000 | 4,230,000 |
| TS-1005 | Toyota RAV4 XLE AWD 2020 | Available | 35,200,000 | 31,415,000 | 3,785,000 |
| TS-1006 | Toyota Tacoma TRD Off-Road 2021 | Available | 62,000,000 | 55,590,000 | 6,410,000 |
| TS-1007 | Lexus RX 350 2019 | Available | 47,500,000 | 40,605,000 | 6,895,000 |
| TS-1008 | Toyota Venza XLE 2019 | Available | 36,400,000 | 32,210,000 | 4,190,000 |
| TS-1009 | Toyota Sienna LE 2020 | Available | 33,900,000 | 32,655,000 | 1,245,000 |
| TS-1010 | Toyota Hilux SRV 2019 | Available | 41,000,000 | 28,760,000 | 12,240,000 |
| TS-1011 | Honda CR-V EX-L 2020 | Available | 29,400,000 | 26,455,000 | 2,945,000 |
| TS-1012 | Toyota Camry SE 2021 | Landed (new arrival) | 34,500,000 | 32,410,000 | 2,090,000 |
| TS-1013 | Toyota Fortuner 2021 | On the way (arr 18th) | 58,000,000 | incomplete | incomplete |
| TS-1014 | Toyota Land Cruiser Prado TX 2020 | At port (arr 12th, clearing) | 78,000,000 | incomplete | incomplete |
| TS-1015 | Toyota Camry XLE 2018 | Sold 29 Sep 2026 | 31,500,000 | 27,650,000 | 3,850,000 |

**Figures tie out exactly.** Money tied up 587,040,000 = Σ landed cost of the 12 complete in-stock
cars (451,040,000) **+ the 2 incomplete cars at their price** (58M+78M=136M). Projected 57,760,000 =
Σ profit of those 12. Real 3,850,000 = TS-1015. Available 12 = 11 available + TS-1012 landed (the
1 new arrival). On order 2 = TS-1013 + TS-1014. Filters on the page: All 15 / Available 11 /
On the way 1 / At port 1 / Landed 1 / Sold 1.

Car detail (default TS-1009): US costs $32,020 + Nigeria ₦635,000 at rate ₦1,000/$1 → landed
32,655,000; price 33,900,000; profit 1,245,000. Only the US total / NG total / rate are exposed —
the 6 individual cost lines are not shown, so they cannot be faithfully seeded yet (screen 3 work).

**Critical:** these refs (`TS-1001`…) **collide** with the existing public seed (also `TS-1001…TS-1025`),
and `car.ref` is UNIQUE — so the office demo cars cannot live in the `car` table. They need their
own table. (Enquiry / activity_event / tap tables are office-domain and untouched by the public
site, so those could be shared.)

## Screen 2 — Inventory (`office-inventory.html`, 406 lines) — built; compare re-check pending

**Ambient (1440, dark).** Same shell as dashboard. `.main`: `.hrow` (h1 "Inventory", `.sub2`, "Add a
car" `.btn`), bar (search `#q`, sort `#sort`, state chips `#states` `[data-s]`: All 15 / Available 11 /
On the way 1 / At port 1 / Landed 1 / Sold 1), table `.t` (ref, car, state, mileage, price, landed,
profit, Edit/Delete), `#emptyT`/`#emptyC` empty states, delete dialog `#dltw`+`#ovl`, toast `#toast` +
`#undo`, `.note` lock line; `.bnav` shown. Cards replace the table ≤820.
**Conditionals (19 states).** widths ≤1000 / ≤820 / ≤560 / ≤390; light at 1440; hover (`nav`, row);
focus (tab); chips; search; sort `pf`/`pl`; empty; clear-filters; delete modal; toast; undo. Theme
toggle = approved addition (as dashboard).
**Interlinks:** sidebar → 6 office pages; "Add a car" → car form; Edit → car form; sign out → login.

**Pipeline.** 1 Recon ✅ (source read; 19 states enumerated) · 2 Ref rules ✅
(`scripts/office-diff/inventory/captures/`) · 3 Model ✅ (`.../model/` — 76 rule signatures, 94
controls) · 4 Build ✅ · 5 Compare 🔄 (first run done; re-run after the fixes pending).

**Build.** `app/office/(shell)/inventory/{page,inventory-client}.tsx` + self-contained `inventory.css`
(verbatim port + approved toggle); new `components/office/OfficeTopbar.tsx` (inventory topbar =
settings-ico only, vs dashboard's search+settings); shell/root split so each area loads its own
fonts (root = FA + theme-init; `(site)` = Oswald 600;700 public; new `app/office/layout.tsx` = Oswald
500;700 office). Modal + toast render via `createPortal(…, document.body)` to keep the reference's
body-child order (`shell → bnav → ovl → toast`). `typecheck` + `build` clean; `/office` and
`/office/inventory` prerender.

**First compare (2026-10-12 00:08, 19 states).** Every state reached; only the approved noise (theme
toggle `.srow`/`.thm` + Next `next-route-announcer` + sidebar `nav` box 734→723px) **except 4 real
diffs** — 3 fixed, 1 judged a variance:
1. Oswald ~3px glyph metrics (ref loads 500/700; build loaded 400/700) → **fixed** by the per-area fonts.
2. Undo: build cleared the toast message; ref keeps it visible → **fixed** in the client.
3. `#undo` missing underline → **fixed** in CSS.
4. `toast-deleted` `button>i` colour → **judged a model-vs-current-reference variance** (the current
   reference matches our build), not a real defect.

**Open:** re-run the inventory compare on the rebuilt page to prove parity; re-check the dashboard
(the font/layout split is global).

## Screen 3 — Car form (`office-car.html`, 515 lines) — built; first compare (edit)

Reached **by route** (plan §9 Q2): `/office/car` = edit (demo subject `TS-1009`), `/office/car/new` = add.
The reference's `.demo` edit/add switcher is deleted. Shared fields read from the office data layer
(`getOfficeCars` → `TS-1009`); the form-only fields the data model does not own (ext/int, features,
private notes, photos, the 6 cost lines) are a presentational `FORM_DEMO` constant mirroring the
reference's hardcoded `EDIT` seed (data model out of scope, plan §1). Files:
`app/office/(shell)/car/{car.css,car-client.tsx,page.tsx,new/page.tsx}`.

**Edit compare (24 states)** — checklist `checklist.json`, model `model/` (85 rule signatures /
58 controls), captures `captures-compare/`, report `compare-report.txt`. Every state reached (all
actions applied, none failed). Structure: **9 diverging rules out of 85 (ref) / 87 (build)**, and all
9 are the two approved divergences — nothing unapproved:
- ref-only ×3 — deleted `.demo` switcher (`body>div>b`) + the sign-out link sitting directly in `.sfoot`.
- build-only ×5 — the approved theme toggle (`.srow` wrapper, its sign-out `a`/`i`, `.thm` button + icon).
- count ×1 — `body>div>button`: ref 3 (2 demo buttons + toast Undo) vs build 1 (toast Undo).
Content nodes equal (247 = 247).

**Owner-approved divergence (2026-10-12).** The reference renders the profit strip (`.pr`) text
**flush-left** (1px inset) — `.pr` is a *sibling* of `.pb`, so its `-18px` bleed margin leaves none of
its own 18px padding; the rows above sit at 18px inset. At the owner's request the profit strip is
indented without re-padding the whole block: `.pr small, .pr .num, .pr .sub { padding-left: 15px }`.
The owner also changed `.pr`'s bottom margin from the reference's `-16px` (which pulls the strip flush
and lets it clip into the panel's bottom edge) to `1px`, so the strip sits fully inside the panel and
the panel's bottom border shows. Verified live — build `#p-profit`/`#p-psub` text x=1493 (15px inset;
the rows are 18px, so the profit text is 3px left of them) and `.pr` bottom 2px above the panel's
border-box bottom; the reference is x=1478 and bleeds flush. Both are deliberate; the compare will flag
`.pr`.

**Open:** add-mode compare (`checklist-add.json`, 7 states) not yet run; the inventory compare re-run
(and the global font/layout dashboard re-check) is still pending.

## Change log

- 2026-10-12 — **screen 3 Car form built (edit + add by route) + first compare (edit).** `car.css`
  (self-contained port of the reference `<style>`, `.demo` dropped, approved `.srow`/`.thm` toggle kept),
  `car-client.tsx` (uncontrolled form + live costing + portals to `document.body`), `page.tsx` (edit,
  DB-backed shared fields), `new/page.tsx` (add). `typecheck` + `build` clean; both routes prerender;
  served on `:3210`. Edit compare: all 24 states reached; 9/85 rules diverge, all approved. Then, at the
  owner's request, indented the profit strip (`padding-left:15px` on `.pr small/.num/.sub`) and changed
  its bottom margin `-16px → 1px` (strip no longer bleeds to the panel bottom), fixing the reference's
  flush-left quirk — verified live.
- 2026-10-11 — tracker created; dashboard source recon done; ambient + conditionals recorded above.
  Wrong premature shell bits removed (built before modelling). Reference extraction next.
- 2026-10-11 — dashboard: ref captures + model built (9 states). Shell + dashboard page written
  (`app/office/(shell)/{layout,page}.tsx`, `office.css`, `components/office/{OfficeNav,OfficeBottomNav}.tsx`).
  Root `app/layout.tsx` themeInit guard aligned to reference; `components/ThemeToggle.tsx` icon
  now sun-in-dark. `npm run typecheck` clean; `npm run build` clean (`/office` static).
  Killed a stale `next dev` (pid 57211/57212/57224) squatting :3210 and rebuilt cleanly — a
  `next build` cannot run beside a `next dev` on the same project (they clobber `.next`; first
  attempt gave `Cannot find module './14.js'`). Production build now served on :3210.
  Compare run: only the approved toggle + Next route-announcer diverge.
- 2026-10-11 — **office data layer built + verified (option 1)**. New `migrations/0007_office.sql`
  (`office_car`), `lib/office.ts` (`getOfficeCars`, `getOfficeDashboard`), `scripts/seed-office.ts`
  (15 cars, idempotent) + `db:seed:office`; `lib/money.ts` gained `nairaDigits`; dashboard
  `app/office/(shell)/page.tsx` now DB-backed. Ran migrate → seed → typecheck → build (all clean);
  rendered figures match the reference exactly (₦587,040,000 / ₦57,760,000 / ₦3,850,000 etc.);
  re-compared the rebuilt page (9 states) → identical divergence profile. See "Data layer — RESOLVED".
- 2026-10-11/12 — **screen 2 Inventory: recon → model → built → first compare.** 19-state checklist
  written; reference runtime captured; model built (76 rule signatures, 94 controls); React page +
  client + `inventory.css` written; `OfficeTopbar` added; root/site/office **font split**; modal+toast
  portalled to body. `typecheck` + `build` clean (`/office`, `/office/inventory` prerender). First
  19-state compare: all reached; only the approved divergence **plus 3 fixed diffs** (Oswald 500/700
  fonts, undo keeps the toast, `#undo` underline) and 1 judged a model-vs-current-ref variance
  (`toast-deleted` icon colour). **Inventory compare re-run still pending.** See "Screen 2 — Inventory".
- 2026-10-12 — session recovered after a laptop restart: restarted the reference server (`:3211`),
  the production build server (`:3210`, `next start` of the current build) and the persistent visible
  Chrome (CDP `:9222`); loaded the built inventory. This commit records the uncommitted office work
  (screens 1–2 + shell/data layer + workspace docs).
