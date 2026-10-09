# RECON-001 — Homepage runtime comparison (reference vs build)

Method: `developer-workspace/scripts/runtime-compare.mjs` + `rt-detail.mjs` + `rt-why.mjs`.
Both pages opened in real Chrome (viewports 1440 / dark, theme forced `data-theme="dark"`), and compared
on what the **browser computes**: CSS custom properties, per-class computed styles, per-element detail,
DOM structure, and matched CSS rules (CDP `CSS.getMatchedStylesForNode`). No screenshots.

- ref   : `file:///home/lordwhitefire/current-project/test-truespec-v2/truespec.html`
- build : `http://localhost:3210/`

Result: **2 real CSS bugs**, the rest are data/content differences between the two demo data sets
or first-match artefacts (verified and dismissed). Details below.

---

## A. Real CSS bugs (build wrong, reference right)

### A1. Floating WhatsApp button (`.fab`) is shown on desktop — should be hidden
- Reference `@1440`: `.fab` → `display:none` (box 0×0).
- Build `@1440`: `.fab` → visible, box **58×58**.
- Root cause (matched rules): Font Awesome ships a class **`.fab`** (its *brands* icon class):
  `.fa, .fa-brands, …, .fab, .far, .fas { display: var(--fa-display, inline-block) }`.
  In the build, the FA stylesheet is applied **after** `app/reference.css`, so FA's `.fab`
  `inline-block` overrides reference.css `.fab { display:none }` (equal specificity, later wins).
  In the reference, FA is loaded **before** its inline `<style>`, so `.fab{display:none}` wins.
- Build matched rules (`.fab`): `[regular] .fab -> display:none` **and** `[regular] .fa,…,.fab,… -> display:var(--fa-display,inline-block)` → FA wins.
- Also breaks mobile: reference wants `@≤820 .fab{display:grid}` (icon centred via `place-items`); FA forces `inline-block`, so the icon is not centred.
- Proposed fix (minimal, keeps the class name): make the two `display` rules win by specificity — `a.fab` instead of `.fab` (specificity 0,1,1 beats FA's 0,1,0). Lines 90 and 252 of `app/reference.css`.
  (Alternative: load FA before reference.css — not reliable with the CDN `<link>`.)

### A2. Ask-bar (`.speak`) and pill link (`.lnk`) lost their padding — rendered inside `.sv`
- Reference `.speak`: `padding:12px 16px` → box height **52**. Build: `padding:0` → box height **23** (text cramped).
- Reference `.lnk`: `padding:4px 12px` → **110×26**. Build: `padding:0` → **86×17**.
- Root cause (matched rules, `.speak` in build):
  - `[regular] .speak -> padding:12px 16px` (reference.css line 70, specificity 0,1,0)
  - `[regular] .sv * -> padding:0` (reference.css line 95, specificity 0,1,0) — **comes later → wins**
  - `inside .sv: true` for `.speak`; `inside .sv: false` in the reference (reference has no `.sv` wrapper, and its global `*{margin:0;padding:0}` reset precedes `.speak`).
- So the `.sv * { margin:0; padding:0 }` reset clobbers the *global* chrome rules (`.speak`, `.lnk`) whenever those elements are rendered inside `.sv`.
- Proposed fix: move `.sv * { margin:0; padding:0 }` **above** the global chrome rules in `app/reference.css` (i.e. before line 70), so `.speak` / `.lnk` win by order while `.sv .*` two-class rules still win by specificity.
  (Alternative: render the ask bar outside `.sv` — but the reset ordering is the general fix.)

---

## B. Data / content differences (NOT bugs — the two demo data sets differ by design)

Reference demo data is `TS-1001…TS-1024` (24 cars); build seed is `TS-0001…TS-0015` (15 cars, 14 public). This explains:

| Item | Reference | Build | Why |
|---|---|---|---|
| `.card` / `.ph` / `.pt` / `.sr` / `.bars` count | 21 | 13 | different data set / how many cars the home grid lists |
| `.chip.deal` ("Special") | 6 | 0 | our seed sets no `was_price_kobo` → no discount cars, no Special ribbon/chip, no struck price |
| `.chip.ld` ("Landed") | 4 | 4 | matches |
| hero slide dots `.dts` | 123px (more slides) | 45px (fewer) | reference hero has more slides |
| `.grid` / `.inv` heights | 1465 / 1741 | 757 / 978 | follows card count |
| `.fg` (footer) height | 158 | 174 | footer line content differs |
| `.sl` / `.dkc` hero height | 338 | 318 | ~20px; hero content differs — flagged for a closer look, low priority |
| headings | incl. "2021 BMWX5…" etc. | different cars | data |

## C. Cosmetic / no action
- Build defines extra tokens the reference lacks (`--surface`, `--radius`, `--font-body`, `--danger`, …). Shared tokens match. Harmless drift — optional cleanup.
- `--ld-bg` / `--oo-bg`: reference `rgba(87,204,138,.12)` vs build `rgba(87, 204, 138, 0.12)` — same colour, formatting only.
- `.ring` opacity 0.345 (ref) vs 1 (build) — hero ring animation captured mid-cycle; not a real diff.
- Console: build has only the benign `/favicon.ico` 404; reference 0.

## D. Artefacts checked and dismissed (first-match comparison would have misled)
- **`.chip` colour "diff"** (ref gold `rgb(26,20,5)` vs build green `rgb(87,204,138)`): reference's *first* chip is `.chip.deal` (Special/gold); build's is `.chip.ld` (Landed/green). Chip styling itself is identical (79×26, 12/18, w600, pad 3px 10px). Not a bug.
- **`.card` height "diff"** (273 vs 232): the two first-cards are different cars/order; the card template rows are byte-identical (`.ph` 278×129, `.bars` 278×3, `.tt` 278×60, `.sr` 278×33). Not a bug.

---

## Proposed next step
Two small, safe fixes in `app/reference.css`: (A1) `a.fab` for the two display rules; (A2) relocate the `.sv *` reset above the global chrome rules. Then re-run the runtime comparison to confirm both clear, and continue the pass on **`/inventory`** and **`/car/[ref]`**.

---

## FIXES APPLIED + re-verified (same day)

Both fixes are in `app/reference.css`:

- **A1** — the two display rules are now `a.fab` (specificity 0,1,1) so they outrank Font Awesome's `.fab`.
- **A2** — `.sv * { margin:0; padding:0 }` moved to the **top** of the file (before `.wab`, `.speak`, `.lnk`), with a comment saying not to move it down.

Re-ran `runtime-compare.mjs` @1440/dark:

| | before | after | reference |
|---|---|---|---|
| `.fab` @1440 | visible 58×58 | **hidden (display:none)** | hidden |
| `.speak` (ask bar) | 1202×23, padding 0 | **1202×51, padding 12px 16px** | 1202×52 |
| `.lnk` (pill) | 86×17, padding 0 | **110×25, padding 4px 12px** | 110×26 |
| console | favicon 404 only | favicon 404 only | clean |

The residual 1px on `.speak`/`.lnk` is sub-pixel text rounding. `.fab` and the hero-ring artefact no longer appear in the diff.

**Hero/featured row ~20px shorter (was `### .sl/.dkc/.sp`) — resolved as data, not a bug:** those are `.card`s in a grid row that stretches to the tallest card. The reference row contains a "Special" card (two-line price, `.tt` 72 / `.sr` 63 → row 338); our data has no discount cars, so the row is 318. Confirmed by child-height comparison (`.ph` 197, `.bars` 3, `.tt` 60, `.sr` 57 on both).

Remaining diff items are all data/content (card count, Special badges, hero dots, footer lines) or verified first-match artefacts. No outstanding CSS bugs on the home page.

---

## Inventory band — "Available / On order / Landed this year" tabs (runtime, all three layers)

**HTML** — matched. Both render `.band#cars` → `.hd` (`<h2>TrueSpec <em>Inventory</em>` + `.cnt` with the `fa-car-side` icon) → `.tabs role="tablist"` with the same 3 tabs, same order, same labels:
`Available` (active/`on`, `aria-selected="true"`), `On order`, `Landed this year`.
Only structural difference: reference tabs are `<button role="tab" data-t onclick="go()">`; build tabs are `<a role="tab" aria-selected href="/inventory?status=…">`. Same look, same behaviour (build's is also a real link).

**CSS** — matched. `.tabs` flex / gap 2px; `.tab` `height:44px; padding:0 26px; font:700 14px uppercase; white-space:nowrap`. Active `.tab.on` = gold bg `rgb(200,162,74)` + dark text `rgb(26,20,5)`; inactive = `rgb(36,40,44)` bg + `rgb(214,217,220)` text. Computed widths identical (128 / 125 / 187 × 44), active tab identical. (Only `line-height: normal` vs `21px` — invisible at fixed height.)

**JS** — matched. Clicking each tab navigates to the inventory page with the right filter:

| tab | reference | build |
|---|---|---|
| Available | `inventory.html?status=a` | `/inventory?status=a` |
| On order | `inventory.html?status=o` | `/inventory?status=o` |
| Landed this year | `inventory.html?status=l` | `/inventory?status=l` |

Count line matches in form — `Available <b>N ready</b> · <b>M landed</b>` — numbers differ (ref 12/6 vs build 6/4), i.e. the data-set difference already noted.

### Defect found + FIXED — label not vertically centred (owner caught this)
First pass compared box widths/heights/colours and they matched, but the **label's vertical position within the tab was not checked** and it was wrong. Measured with `rt-tabtext.mjs`:

| | reference | build (before) |
|---|---|---|
| text top-gap / bottom-gap | 14 / 14 (centred) | **2 / 25 (top-aligned)** |

**Cause:** the reference tab is a `<button>`, which the browser vertically centres automatically; our tab is an `<a>`, whose label sits at the top of the 44px box (`line-height:21px`).
**Fix:** `app/reference.css:153` — `.sv .tab` now `display:inline-flex; align-items:center; justify-content:center;`.
**Re-verified:** top-gap/bottom-gap 14/14 on all three tabs; widths (128/125/187) and colours unchanged. `align=center` on the element (reference centres via the button UA) — visual result now identical.


