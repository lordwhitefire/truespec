# OFFICE-001 — Dashboard (screen 1 of 7)

**Date:** 2026-10-11
**Spec:** `developer-workspace/plans/OFFICE-screens-plan.md` (v5) — build order §9 Q1, routes §9 Q6,
data §6 / §9 Q4.
**Method:** runtime-divergence skill — build to a model extracted from the reference *runtime*,
then compare a production build to that model rule by rule.

## Built

| File | Purpose |
|------|---------|
| `app/office/(shell)/layout.tsx` | Shared office shell: `.shell` → `.side`(brand, nav, footer) + `.topbar` + `.main`; `.bnav` outside `.shell`. |
| `app/office/(shell)/page.tsx` | Dashboard content: `.hrow`, `.kpis` (3 cards), `.strip` (3 counts), `.duo` (Recent activity + Recent WhatsApp taps), `.legend`. |
| `app/office/(shell)/office.css` | Shell + dashboard CSS ported from the reference inline `<style>` (lines 17–147) + modelled `.srow`/`.thm`. |
| `components/office/OfficeNav.tsx` | Client sidebar nav, `.on` by pathname. |
| `components/office/OfficeBottomNav.tsx` | Client mobile bottom bar (5 items), `.on` by pathname. |
| `app/layout.tsx` (edit) | themeInit guard aligned to the reference (`if(t!=="light")t="dark"`). |
| `components/ThemeToggle.tsx` (edit) | Icon now `fa-sun` in dark / `fa-moon` in light, matching the reference `applyTheme()`. |
| `migrations/0007_office.sql` | New `office_car` table for the separate office demo dataset (15 cars). Own table — office refs collide with the public `car.ref` UNIQUE. |
| `lib/office.ts` | Office read layer: `getOfficeCars()`, `getOfficeDashboard()` + types; computes every dashboard figure. |
| `scripts/seed-office.ts` | Idempotent 15-car office seed (`ON CONFLICT (ref) DO UPDATE`); `npm run db:seed:office`. |
| `lib/money.ts` (edit) | Added `nairaDigits(kobo)`; `formatNaira` refactored (behaviour-preserving). |
| `app/office/(shell)/page.tsx` (edit) | Now `async`, reads `getOfficeDashboard()`; KPI numbers/counts are DB-backed (feeds + "5 open enquiries" stay presentational until the activity/enquiries screens). |

Routes used (plan §9 Q6): `/office`, `/office/inventory`, `/office/car`, `/office/enquiries`,
`/office/activity`, `/office/settings`, `/office/login`.

## Verified

- `npm run db:migrate` → applied `0007_office.sql`.
- `npm run db:seed:office` → upserted 15 office demo cars (idempotent).
- `npm run typecheck` → clean.
- `npm run build` → clean; `/office` prerendered (static), 162 B / 106 kB First Load JS.
- **Data rendered** — served build `:3210/office` shows the reference figures exactly:
  ₦587,040,000 tied up / 14 cars / 12 of 14 / 2 excluded; ₦57,760,000 projected; ₦3,850,000 real /
  1 car sold (**2018 Camry XLE**, sale ₦31,500,000); 12 available (1 new arrival); 2 on order.
- **Runtime compare** — production build (`:3210/office`) vs model (9 reference states):
  `scripts/office-diff/dashboard/compare-report.txt`; re-run after the DB change →
  `scripts/office-diff/dashboard/compare-report-verify.txt` (identical profile).

## Compare verdict — what diverges

All 9 states show the **same** single divergence, and it is composed of exactly two known things:

1. **Owner-approved theme toggle** (shell footer, modelled on settings/activity `.sfoot > .srow`).
   The reference dashboard footer is `<b>` + `<a>` direct. => 2 ref-only rules, 5 target-only rules,
   and 1 box difference (sidebar `nav` 734→723px — the 30px toggle row is ~11px taller than the
   plain link row). Not a defect; the approved cost of the addition.
2. **Next.js `next-route-announcer`** — the extra `body>div` (count 1→2) and the `+ alert` a11y
   line. App Router framework glue, not our markup.

Everything else matches: 49 shared rule signatures, 0 design-token differences, a11y diff is URLs
only, all 9 states reached with every action applied and none failed.

## NOT verified / open

- **Not run:** nothing outstanding on the dashboard UI. The compare did not exercise any dashboard
  control that changes state (the dashboard is static at rest; dead controls are intentionally left
  dead). Feeds (activity/taps) and "5 open enquiries" are presentational until their own screens are
  built — the dashboard figures that *are* DB-backed are verified above.
- **Resolved — data source.** Owner chose option 1: a separate office demo dataset (`office_car`,
  15 cars) + a new `lib/office.ts` read layer. Built, seeded, and verified (see Verified). Relative
  tap timestamps stay live, so they will drift from the reference's frozen strings — accepted.
