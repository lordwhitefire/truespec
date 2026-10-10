# RECON-001 — Whole-UI-layer plan

**Status:** draft, awaiting owner go. This is a plan, not an instruction (per the RECON-001 ruling).
**Covers:** the whole UI layer (TASK-001 / RECON-001) — every screen, every approved element, three widths, both modes.
**Method:** the same one used on the home page, generalised.

**Registry:** TASK-001 — UI (Layer 1). The Builder works from `openspec/tasks/RECON-001/`, not the old entry.

---

## 0. Owner directives recorded in this plan

- **Rebuild the inventory page**, then run the HTML/CSS/JS check at runtime.
- **Chrome process cap.** The home run spawned >30 Chrome processes — bad behaviour. This plan fixes it: **one browser instance per run, checks serial, contexts opened and closed per check, hard guard at 10 chromium processes, browser always closed in `finally`.** Never parallel browser launches. (See §7.)
- **Do not repeat a known error.** The do-not-repeat list is §8; every item is a rule, not advice.
- **No screenshots.** Verification is runtime comparison (your ruling). No image files are produced or committed; `.gitignore` already blocks raster images.
- **References are read-only.** `test-truespec-v2/*.html` are visual truth; never edited.
- **UI layer only — not functionality.** The "JS" checked here is **interactive UI**: what a control does on interaction (tabs filter, theme toggle, modal open/close, slider advance, hover/active/empty states). It is **not functionality** — no saves, no CRUD, no data logic, **no authentication**. Authentication is a functionality-layer concern, so it is **not** a UI dependency.
- **Record, don't fix.** After a page is rebuilt and the runtime comparison is run, **any difference is written to the difference log and left as is** — record it and move to the next screen. No fixing mid-flight. Continue until the layer is walked end to end.

---

## 1. Goal and scope

Get the **whole UI layer provably done**: the public showroom and the office, screen by screen, matching the approved design at phone / tablet / laptop, in both modes (dark default + light toggle).

**In scope:** every screen in §2, every approved element Q1–Q95 puts on it.

**Out of scope:** the other five layers (business logic, functionality, UX, data model, system model) except where a screen needs something from them to render; any change to the approved design. Where a screen hits a wall only a lower layer can clear, **log it and stop** — do not invent it.

---

## 2. The screens (coverage list)

Yardstick references are in `test-truespec-v2/` (13 screens). The build currently has 3 routes.

| # | Reference (read-only) | Build route / target | Status today |
|---|---|---|---|
| 1 | `truespec.html` | `app/page.tsx` (home) | Built; RECON done; tab-filter change committed, not browser-verified |
| 2 | `inventory.html` | `app/inventory/page.tsx` | Exists but **missing search, filters, sorting (Q41)** — **rebuild first** |
| 3 | `car.html` | `app/car/[ref]/page.tsx` | Exists; needs recon |
| 4 | `404.html` | *no route* | Missing |
| 5 | `not-available.html` | *no route* | Missing (sold/deleted page, Q43) |
| 6 | `privacy.html` | *no route* | Missing (Q44) |
| 7 | `login.html` | *no route* | Missing (office login/first-run, Q45–46) |
| 8 | `office-dashboard.html` | *no route* | Missing |
| 9 | `office-inventory.html` | *no route* | Missing |
| 10 | `office-car.html` | *no route* | Missing (add/edit car) |
| 11 | `office-enquiries.html` | *no route* | Missing |
| 12 | `office-activity.html` | *no route* | Missing |
| 13 | `office-settings.html` | *no route* | Missing |

Note: `not-available.html` carries no `<title>` (unlike the others) — confirm against Q43, don't assume.

**Coverage list output** (the RECON-001 benchmark) is one row per screen, marked **done / missing / does not match**, kept current as work lands.

---

## 3. The yardstick (load before touching any screen)

- **`product-management/ui-plan.md`** — the approved look and the 95 answers (Q1–Q95). Where a screen and this file disagree, this file wins on look.
- **`product-management/product-overview.md`** — the product's content.
- **Reference screens `test-truespec-v2/`** — visual truth, read-only.
- **Specs** — `openspec/changes/truespec-architecture/specs/<name>/`: `showroom`, `inventory`, `dashboard`, `money`, `enquiries`, `office-access`, `office-settings`, `media`. Where a screen and a spec disagree, **the spec wins and the conflict is logged**, never silently reconciled.

---

## 4. The process, per screen (the home method, generalised)

Four phases. Every screen runs all four; order between check and build depends on whether the screen exists.

**A — Load the yardstick.** Read the reference screen, the `ui-plan.md` answers that name it, and any spec it carries. (Read-only. No browser yet.)

**B — Recon / runtime check (HTML, CSS, JS).** Against the running build and the reference:
- **HTML** — live DOM tree vs reference: sections, landmarks, controls, wording, element counts.
- **CSS** — computed styles and matched rules: tokens, colours, sizes, per-rule deltas.
- **Interactive UI** — what a control does on interaction: what toggles, opens/closes, navigates, or persists (e.g. the theme choice). Interactive UI only — never functionality (no saves, no data logic, no auth) (per §5).
- Output: a recon sheet — *done / missing / does not match*, with exact deltas and an honest "not checked" where something was out of reach.

**C — Build / close the gaps.** The smallest change to satisfy the approved design. No architecture changes, no drift. Missing screens are built to the reference + `ui-plan.md`, then verified.

**D — Verify at runtime, then record — do not fix.** Re-run B against the page just rebuilt. Any difference is **written to the difference log and left as is** — record it and move on to the next screen. Do not fix a difference mid-flight; the report states **built / checked / difference recorded**, never "should work".

**Rebuild first, then check, then move on** (owner directive): each page is built to the reference, checked at runtime, differences recorded, and the next screen started. Nothing is fixed until the owner says so.

**Inventory special order (this directive):** because inventory is known-missing (Q41), it goes **C → B** — rebuild the page (search, filters status/make/year/price/colour, sorting, grid/list per Q41), **then** run the HTML/CSS/JS check at runtime.

---

## 5. The runtime check, defined

Run against the **build at `localhost:3210`** and the **reference files** (static; served locally). Never judged from a screenshot. The JS part checks **interactive UI**, not functionality.

**Matrix per screen:** 3 widths × 2 modes = 6 cells.
- Widths: phone 560, tablet 820, laptop 1100 (Q77).
- Modes: **dark (default)** and **light** (saved choice wins; device setting not consulted, Q7).

**Tooling** (generalise the home scripts; do not write new ones from scratch):
- `screen-compare.mjs` — HTML + CSS. Params: reference file, build path, width, mode. (Generalises `developer-workspace/scripts/runtime-compare.mjs`.)
- `screen-probe.mjs` — interactive-UI behaviour (not functionality). Params: screen, width, mode. (Generalises `developer-workspace/scripts/home-probe.mjs`.)
- Both follow the installed **`playwright-core` skill**: role-first locators (`getByRole`), web-first waits, **no `waitForTimeout`**, fresh context per check, provable negative assertions, per-check timeout, incremental logging.

**Housekeeping:** outputs to `/tmp/opencode/`; reports to `developer-workspace/reports/`.

---

## 6. Order of work

**Public first (customer-facing, 3 of 7 half-built):**
1. **Inventory** — rebuild (Q41), then runtime check. *(directive)*
2. **Car page** — recon, then close gaps.
3. **Public extras** — `404`, `not-available`, `privacy`, `login`.

**Office after that** (draft only; redone per ui-plan §5): dashboard → inventory → add/edit car → state editor (inside settings) → enquiries → activity → settings.

**Office is UI only.** Authentication is a functionality-layer concern, not a UI dependency — the office screens are built as UI to the reference + `ui-plan.md`, and any real login/auth machinery is out of scope. The login / first-run **screens** themselves (Q45–46) are UI and are in scope.

---

## 7. Constraints and guardrails

- **Chrome cap (hard rule).** One browser instance per run. Checks serial. A context per check, closed after. A guard counts chromium processes and **aborts the run above 10**. The browser closes in a `finally` block even on error. No parallel browser launches — ever again.
- **No screenshots.** Runtime comparison only. No image output.
- **References read-only.** Never edit `test-truespec-v2/`.
- **Spec wins over screen;** conflicts are logged.
- **Recon first, change on instruction.** No design changes; nothing built beyond what a screen needs to render.
- **Three widths, both modes** on every screen before it is called done (Q7, Q77, Q79).
- **Never colour alone**; state labels carry their written label beside the colour (Q64, Q90).

---

## 8. Do-not-repeat list (known errors)

1. **Chrome herd** — >30 chromium processes on the home run. Fixed by §7. Do not run browsers in parallel.
2. **`waitUntil: "load"` false result** — it produced a phantom 500 on the build at 560/light. Use `domcontentloaded`.
3. **False-positive finding not checked** — the "sun/moon difference" was wrong. Confirm against the reference before reporting any finding.
4. **`visual_inspect` tool** — broken (Gemini quota). Do not use it.
5. **Raw `eslint`** — there is no eslint config in the repo; it errors. Use `next lint` or skip; do not "fix" by adding config unasked.
6. **Port 3000 is a stale legacy app** — the build is on **3210**. Do not test 3000.
7. **Screenshots** — not produced (owner ruling); images gitignored.

---

## 9. Evidence left behind

- **Coverage list** — one row per screen: done / missing / does not match. Answers "is the UI done?" (benchmark 1).
- **Recon sheet per screen** — HTML/CSS/JS deltas, widths × modes, honest "not checked".
- **Gap-closed list** — what was built and the runtime check that confirmed it.
- **Conflict log** — screen vs spec disagreements, with the spec's ruling.
- **Difference log** — every difference the runtime check found, recorded and left unfixed (owner directive). This is the list the owner reviews after the layer is walked.

---

## 10. Per-screen acceptance criteria

A screen counts as done when, at 560 / 820 / 1100 in dark and light:

- its structure, sections, controls and wording match the reference and the `ui-plan.md` answers;
- every approved element the plan puts on it is present (for inventory: **search, filters, sorting, grid/list** — Q41);
- dark is the default, the toggle works and the saved choice persists; no flash (Q7);
- no screen contradicts a binding spec, and any conflict is logged;
- the runtime check (HTML/CSS/interactive UI) is run and its result recorded; any difference is logged, not fixed.

---

## 11. Owner checkpoints

1. **Approve this plan and the order** (§6), or give your own.
2. **Recon or build first?** Home worked recon→report→change-on-go. Inventory is directive: rebuild→check. Confirm the other screens follow recon-first.
3. **Coverage-list cadence** — one sheet at a time, or all screens then close gaps.
4. **Scope confirmation** — UI only (interactive UI yes, functionality no). Flag anything else you want excluded before I start.
