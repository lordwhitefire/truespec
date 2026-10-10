# RECON-001 — Inventory page runtime check

- **Date:** 2026-10-09
- **Screen:** buyer inventory — `/inventory` (only this screen)
- **Method:** `developer-workspace/plans/RECON-001-ui-layer-plan.md` §4–§7
- **Build:** http://localhost:3210/inventory
- **Reference (read-only truth):** `test-truespec-v2/inventory.html`, served on :3211 for the run
- **Matrix:** 560 / 820 / 1100 px × dark / light = 6 cells
- **Status:** recorded — **nothing fixed** (owner ruling: check, do not rebuild)

## How it ran

- `node developer-workspace/scripts/inv-run.mjs`, run twice, identical output.
- One browser, serial; one fresh context per cell, closed after each; browser closed in `finally`.
- Guard: own chromium processes before launch = 0. The owner's GUI Chrome was never counted or killed.
- No screenshots. No `waitForTimeout` for control flow. `domcontentloaded`.
- Run 1's 76 "FAILs" were probe bugs (hidden `#sb` at ≤900px, `<s>` inside `.pt` price parse, a hydration race) — fixed and re-verified before any finding was accepted.

## Matches (all 6 cells)

- HTTP 200 both sides, page renders, **0 failed requests, 0 console errors** both sides.
- Initial view identical: 24 cards, grid on, `#cnt`="24 cars", `#ttl`="All inventory", sidebar "Refine search", same sort options.
- Shared ids present both sides: `out, sb, cnt, ttl, speak, vg, vl, sort, sbt, pmin, pmax, clr`.

## Interactive-UI probe (S1–S19; PASS both sides except S11)

All pass on **both** reference and build:

- **Status filter** — filters the grid to the checkbox count (`12 of 24 cars`), sets the title, speaks the match line.
- **Sort** — low→high and high→low order prices correctly.
- **View toggle** — `#vl` shows list rows (`.lc`), `#vg` shows grid (`.grid .card`).
- **Clear all** — resets title to "All inventory", unchecks every box. *(announcement exception below)*
- **Empty state** — impossible price shows `#out .empty`, speaks "Nothing matches those filters…".
- **Theme toggle** (`.thm`) — flips theme, stores `ts-theme`, persists across reload. *(Works — not a finding.)*
- **Mobile sidebar** (≤900px) — "Search options" shows, sidebar hidden; opens and closes with `aria-expanded`.

### Finding S11 — Clear-all announcement (the one real divergence)

- **Cells:** all three probe cells (1100/dark, 560/dark, 1100/light). **REF PASS / BUILD FAIL.**
- **Reference speaks:** `Showing everything — 24 cars, every price door-to-door.`
- **Build speaks:** `24 cars match — every price is the full doorstep price.`
- **Root cause (confirmed at):** `components/site/InventoryBrowser.tsx`
  - `:156` `clearAll` calls `speak("Showing everything — …")` — the correct reference line.
  - `:166` the filter-change effect then fires `announce(list.length)` and overwrites it.
- **Impact:** visible/audible only via the screen-reader live region (`#speak`). Clear itself works (`#ttl`→"All inventory", boxes unchecked, 24 cards).

## Structural / CSS differences — recorded, NOT fixed

| # | Item | Reference | Build | Note |
|---|------|-----------|-------|------|
| D-i1 | `<title>` | `Inventory \| TrueSpec Automotive` | `Inventory — TrueSpec` | metadata wording |
| D-i2 | landmarks | `header=0 main=1` | `header=1 main=2` | build shares the real layout header + inner `<main>` |
| D-i3 | sidebar groups | Status(3)/Body type(4)/Brand(9)/Price | Status(3)/Make(9)/Year(5)/Colour(13)/Price | **expected** per data model + ui-plan Q41 (`.fs` 4→5, `.ck` 16→30) |
| D-i4 | `.sb` height ≥900 | 1038px | 1588px | consequence of D-i3 |
| D-i5 | `.sbb` height ≥900 | 967px | 1517px | consequence of D-i3 |
| D-i6 | `.fg` height | 290px (≥820) / 518px (560) | 321.9px / 581.8px | footer |
| D-i7 | total elements | 640 | 704 (dark) / 701 (560 light) | |
| D-i8 | classes in ref, absent in build at load | `av, mdl, mdlh, mx, ovl, toast` (+ `fa-sun` dark) | — | modal/toast are conditionally rendered in build |
| D-i9 | `:root` tokens | — | build adds ~28 vars (`--card,--surface,--gold-ink,--font-*,--radius*,--shadow-*,--w-*`…) | |
| D-i10 | `--ld-bg` / `--oo-bg` | `rgba(87,204,138,.12)` | `rgba(87, 204, 138, 0.12)` | comma-spacing only, no value change |
| D-i11 | headings | 35 | 34 | ref has one trailing empty heading |
| D-i12 | `#thm` | button **id** | class `.thm` only (no id) | toggle still works (S14–S16 pass) |
| D-i13 | favicon | — | `/favicon.ico` → 404 at 560 (CDP) | benign, not inventory-specific |

## Not checked (honest gaps)

- Modal open/close (`.ovl/.mdl/.mx`) and toast lifecycle; share buttons; WhatsApp links; card-detail navigation.
- Keyboard focus order, colour contrast, reduced-motion.
- Breakpoints other than 560/820/1100 (incl. the exact 900px boundary) and any page other than inventory.

## Artifacts

- Raw: `/tmp/opencode/inv-compare-<560|820|1100>-<dark|light>.md` (6), `/tmp/opencode/inv-probe.md`.
- Scripts: `developer-workspace/scripts/{inv-run,screen-compare,screen-probe}.mjs`.
