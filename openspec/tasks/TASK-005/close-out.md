# TASK-005 — close-out

**Closed 2026-10-20, on the owner's word — "task 5 is done".** The closing report is
`TASK-005-report.md` (checkpoint D approved 2026-10-19) with its four addenda. This note records
what the layer changed, what the closing gate re-checked, and what remains — written before the
registry entry was ticked, so the record is complete rather than assumed.

## What the layer changed

The layer is the UX pass over an already-built product: it made the sentences and controls match
what the product actually does. Its **59 commits** run from Task 1 (`4e79e1f`) to Task 45
(`12583b7`, the welcome-popup fix). Source footprint: **87 files, +3 811 / −611** (app, components,
lib, scripts).

| phases | tasks | what the person now gets |
|---|---|---|
| 0–1 | 1–7 | a save that changed nothing says **"Nothing changed."**; a failed write refuses in place and never throws; a restored car is named a **restoration** |
| 2 | 8a, 8–9 | a dead car answers a real **404** and keeps its view; a mistyped office address lands **in the office** |
| 3 | 10–12 | the undo offer drains for the full **8 000 ms** (measured 8 336–8 536 ms); the animation is the clock; no hard erases |
| 4–5 | 13–21 | dialogs are the platform's `<dialog>`; focus survives a removal and a refusal; the dead Search control is gone; the car form's delete really deletes with the same undo; the phone **More** sheet reaches Drafts / Activity / Settings |
| 6–7 | 22–28 | empty states say it once; the honest count; the no-photo box and the failed photo share one drawn box with a deterministic gradient from the car's ref |
| 8 | 29–30 | **FIX-001**: no invented number anywhere; every chat control stays and is visibly off |
| 9–10 | 31–38, 40 | store boundaries inside each shell; the waiting sign; the showroom offline line; the office offline banner and the **device draft store** (Q11 — the one owner-widened feature) |
| 11 | 41–45 | rulings recorded; benchmarks 1–11 witnessed; gates; the closing report; the phone welcome-popup fix |

**Addenda after checkpoint D (owner requests, 2026-10-19):**

- **Tasks 46–49 — inventory browsing.** The five filter groups start closed (native `<details>`);
  the inventory is paged **9 cars a page** (19 live cars → 9 / 9 / 1), numbered pages and
  Prev/Next, `?page=` deep links and clamping, and filters / sort / Clear all return to page 1.
  Live check: **0 failures**.
- **Tasks 50–52 — pagination beyond inventory.** The home inventory grid is paged **12 a page**
  (13 available → 12 / 1); horizontal sliders and swipe tracks are deliberately left unpaged.
  Live check: **0 failures**.
- **Task 53 — the office inventory rows-per-page rule (built 2026-10-20, Addendum 4).** The owner
  chose 25 rows by default, with 10 / 25 / 50 / 100 offered and the choice remembered in the browser
  (`localStorage`); no store write. `lib/inventory-paging.ts` holds the pure rule; typecheck clean,
  **368/368**, build passed (commit `b2dfe21`). **Not clicked through** in a browser — the expired
  office session; owed with the other signed-in passes.

## What sits above it — a separate stream

After the addenda, an **11-commit office stream** (`OFFICE-pdf-autofill`, P1–P9) sits on top:
enquiry-template PDF download and reader, car autofill from a PDF, editable car and enquiry drafts
with **Save as draft**, editable saved enquiries, and **`ENQ-####`** refs with one activity event
per change. It has its own plan and report
(`developer-workspace/plans/OFFICE-pdf-autofill-plan.md`,
`developer-workspace/reports/OFFICE-pdf-autofill.md`) and is **not part of TASK-005's plan**. Its
migrations (0024, 0025) are applied; its live signed-in browser matrix is owed after sign-in. It
touched **46 files, +4 817 / −141**.

## What the closing gate re-checked — not taken on trust

Run on the tree as it stands (HEAD `b2dfe21` plus the owner's uncommitted edits), re-run after
Task 53. Logs: `/tmp/opencode/task5-close-gate/` and `/tmp/opencode/task53-gate/`.

| check | reading |
|---|---|
| `npm run typecheck` | **exit 0** |
| `npm test` | **368 / 368**, 9 suites, 0 fail / skip / cancelled (360 / 360 before Task 53) |
| `npm run build` | **exit 0** |
| `npm run store-freshness` | **PASSED** — 9 store-reading routes, none prerendered, no DB response cached |
| `npm run leak-check` (production server on :3210) | **PASSED** — 21 public routes, every route 200, no cost / currency / profit, no asset or file reference, no customer detail, no office label |
| `npm run db:migrate` | **up to date — no migrations applied** (0025 current) |
| store audit (read-only) | **25 cars (25 demo) · 21 drafts (21 demo) · 6 enquiries (6 demo) · 1 sale · 103 cost lines · 52 photos · 4 taps · 116 activity rows · 3 settings**; no unmarked row; no child row off a non-demo car |
| FIX-001 by code | no invented number in production code (only test fixtures); `waLink` returns `null` with no digits; every chat control carries the off state (`role="link"`, `aria-disabled`, no `href`, the reason as its title) |
| paging constants | `InventoryBrowser` **9**; `HomeInventory` **12** |
| device draft | `ts-draft:` prefix, with its tests (`lib/device-draft.test.ts`) |
| the two report copies | **identical** |

## What remains — named, not hidden

- **All nineteen testing groups remain deferred** (the standing owner ruling: one independent pass
  once everything is built). None has been run as a group; the build's own drives are evidence, not
  a substitute. They are added to the registry's deferred list.
- **The rendered office reconciliation** (`scripts/reconcile.ts`) and **every live signed-in
  browser pass** — including the OFFICE stream's — wait on a renewed Clerk session. Chrome is on
  `/office/sign-in`; the final pass must sign in first.
- **Group 17 / Benchmark 12** — the first-time-visitor walk — needs a person who has not seen the
  product.
- **Task 39** — closed not done by the owner: the privacy page is byte-identical, no copy added.
- **Q16 residual** — the showroom's approved "Reload" line has no service worker behind it; a hard
  reload while offline still exits to the browser's error page. A recorded copy conflict, not a
  built claim.
- **The 215 ms / 1 227 ms timings** from `findings/05` were not re-measured and are explicitly not
  claimed. The `testing.md` pointer said §R2.2; the numbers are in **§R2.3 §6**, and the pointer is
  corrected there.
- **The OFFICE stream** is separately reported; its live browser matrix is owed. It is not
  TASK-005's work.
- **Repo state at closing:** `origin/main` = `12583b7` (Task 45); local `main` is **19 commits
  ahead** (7 TASK-005 addenda + 11 OFFICE + Task 53). Nothing was pushed by the closing gate.
- **Working tree:** 53 uncommitted paths remain — including the owner's own pending office edits
  (5 files under `app/office/`, 3 under `components/office/`), the TASK-004 records and scripts,
  the `openspec/changes/` files, and this layer's packet. The closing gate touched only the
  registry entry, the `testing.md` pointer, and this note.
