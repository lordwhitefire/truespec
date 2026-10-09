# RECON-001 — plan: cover the UI layer

**Task:** `openspec/tasks/RECON-001` — UI completeness (make sure all the UI is done).
**Plan owner:** Developer · **Date:** 2026-10-09 · **Status:** awaiting owner go.

---

## 1. What this task is, and what "done" means

RECON-001 replaces TASK-001 as the thing the Builder works from. Its job is to answer one plain
question — **is the UI done?** — screen by screen, then close every gap so it is.

Done (from the task's benchmarks):

- A **screen-by-screen coverage list** exists — every screen in the approved design, each marked
  done / missing / does not match. No screen unaccounted for.
- Every screen that exists **looks exactly like its reference screen** in `test-truespec-v2` —
  layout, spacing, colours, type, controls, wording, content states. The references are the visual
  truth; a screen is not "done" until it matches its reference. (Where a screen and a binding spec
  genuinely disagree, the spec wins and the conflict is logged — but the default bar is exact match
  to the reference.)
- Every approved **element** is present where `ui-plan.md` puts it — including the at-risk ones
  (buyer inventory search/filters/sort, grid/list toggle, Special ribbon + discount price, theme
  toggle, WhatsApp placement, empty states, sold/deleted page, privacy, office login/first-run).
- All **three widths** behave per `ui-plan.md`; **both modes** render, dark default.
- No screen contradicts a binding spec; conflicts are logged, not silently reconciled.

## 2. The yardstick (where "done" is defined)

- `product-management/ui-plan.md` — the approved look and the 95 answers (Q1–Q95).
- `product-management/product-overview.md` — the product's content.
- The reference screens **`test-truespec-v2`** — visual truth, read-only.
- The change specs where a screen carries a requirement (`specs/showroom`, `specs/office-access`,
  `specs/office-settings`, `specs/media`, …). **Spec wins over screen; conflict is logged.**

## 3. Current state (grounded, 2026-10-09)

**Built** (public showroom, partial):
`app/page.tsx` (home) · `app/inventory/page.tsx` · `app/car/[ref]/page.tsx` · `app/not-found.tsx` ·
components `CarCard`, `Gallery`, `InventoryTabs`, `ThemeToggle`, `whatsapp.ts`.

**Not built at all:** privacy page · a distinct sold/deleted "not available" page · office
login/first-run · every office screen (dashboard, inventory, car form, state editor, enquiries,
activity, settings) · buyer-inventory search/filters/sort · grid/list toggle.

**Reference screen register** (`test-truespec-v2`, 13 files — 12 with content, one empty):

| # | Reference file | Screen | Built today? |
|---|---|---|---|
| 1 | `truespec.html` | Showroom home | yes |
| 2 | `inventory.html` | Buyer inventory | partial (no search/filters/sort, no grid/list) |
| 3 | `car.html` | Car page | yes |
| 4 | `login.html` | Office login / first-run | no |
| 5 | `privacy.html` | Privacy | no |
| 6 | `404.html` | 404 | yes (generic) |
| 7 | `not-available.html` | Sold / deleted page | no (reference file is 0 bytes) |
| 8 | `office-dashboard.html` | Office dashboard | no |
| 9 | `office-inventory.html` | Office inventory | no |
| 10 | `office-car.html` | Office car form | no |
| 11 | `office-enquiries.html` | Office enquiries | no |
| 12 | `office-activity.html` | Office activity | no |
| 13 | `office-settings.html` | Office settings | no |

## 4. Approach

### Phase 0 — Setup
Create the brief (`developer-workspace/briefs/RECON-001-*.md`). No code.

### Phase 1 — Recon (the core; read-only)
1. **Screen register from the design, not the build.** Start from the 13 reference screens + the
   screens `ui-plan.md`/`product-overview.md` name, so a never-built screen cannot hide.
2. **One row per screen:** reference file · built route/component (or "none") · status
   (done / missing / does not match) · **how the built screen differs visually from its reference
   (layout, spacing, colour, type, controls, wording, content states)** · what it needs to render
   (dependency on another layer) · width/mode notes.
3. **Element checklist:** walk the `ui-plan.md` answers and tick each; check the at-risk list
   explicitly (Q41 search/filters/sort, Q42 empty states, Q37 ribbon + discount, Q7 theme, Q40
   WhatsApp, Q43 sold/deleted, Q44 privacy, Q45–46 login, Q77/Q79 widths).
4. **Widths × modes grid:** each screen on phone/tablet/laptop × dark/light.
5. **Spec check:** note any screen that would contradict a binding spec; log, do not reconcile.
6. **Output:** the coverage list → `developer-workspace/notes/RECON-001-coverage.md`.

**Match bar (exactness).** The reference screen is the target shape — the built screen must match it
visually, not merely contain the same sections. For each screen the recon compares against the
reference at the level of: structure and order of sections, layout and spacing, colours and tokens,
type, controls and their states, wording, and content states (empty / sold / loading). Any visible
difference is a "does not match" until closed. Confirming exactness honestly needs rendered output,
so the recon records for each screen whether the match was checked against a real render or only
against markup/CSS (see §7) — it will not claim a visual match it could not see.

### Phase 2 — Gap-closure plan
From the coverage list, write an ordered, small-step plan: each step = one screen or one element,
with the exact change and how it will be checked. Added to this file (or a sibling plan).

### Phase 3 — Close gaps
Implement in small steps against the **approved design only** (add no new design). Log every
conflict (spec wins). Test after each step; keep the build green.

### Phase 4 — Verify
The independent RECON-001 testing pass: every screen opens and matches, every element present,
widths and modes behave — confirmed on a **real phone and a real laptop**, both modes (not judged
from colour values alone, per `ui-plan.md` line 77).

## 5. Why nothing hides (the coverage guarantee)

- The list is derived from the reference + `ui-plan.md`, **not** from what we built — so gaps show
  up as "missing", not as silence.
- **Every screen must resolve to a status** — and the bar for "done" is a **visual match to its
  reference screen**, not the presence of a section. "Unaccounted for" is itself a failure.
- Coverage is checked at three levels, not one: **screens**, **elements**, and **widths × modes**.

## 6. Scope boundaries

- **In scope:** all UI — public showroom + extras (privacy, 404, sold/deleted) and the whole office —
  all approved elements, three widths, both modes.
- **Out of scope:** the other five layers, except where a screen needs something from them to
  render; and any change to the approved design.
- Recon first — nothing is changed before the coverage list exists.
- Reference screens are read-only.
- This voids the earlier "filters belong to the office/TASK-002" reading (conflict-log #8): in this
  layer the buyer inventory's search/filters/sort and grid/list toggle are **required**.

## 7. Risks / dependencies

- **No browser in this session** (no Chrome-DevTools MCP): width/mode/visual checks and the
  real-device check (Phase 4 / testing 4.3) need one, or a human. Flagged, not assumed.
- **Office screens need auth/session** (a later layer) to render live; recon will note the dependency
  rather than build the other layer.
- **`not-available.html` is empty** — no visual truth for the sold/deleted page; fall back to
  `ui-plan.md` Q43 and the showroom spec's "graceful outcome".
- **Office screen references may not cover every `ui-plan.md` answer** — `ui-plan.md` is the tiebreak.

## 8. Deliverables

- `developer-workspace/notes/RECON-001-coverage.md` — the screen-by-screen coverage list.
- `developer-workspace/plans/RECON-001-gap-closure.md` — the ordered gap-closure plan (Phase 2).
- A short report at the end — what was closed, what was verified, what was not.
