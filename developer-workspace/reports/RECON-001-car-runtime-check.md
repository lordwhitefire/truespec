# RECON-001 — Car page runtime check

- **Date:** 2026-10-09
- **Screen:** buyer car detail — `/car/<ref>` (only this screen)
- **Method:** `developer-workspace/plans/RECON-001-ui-layer-plan.md` §4–§8
- **Build:** http://localhost:3210/car/TS-1001 (and `/car/2021-honda-civic-ex`, `/car/TS-0000`)
- **Reference (read-only truth):** `test-truespec-v2/car.html`, served on :3211 for the run (`?car=<slug>`)
- **Matrix:** normal 560 / 820 / 1100 px × dark / light = 6 cells; sold + not-found at 1100/dark + 560/dark
- **Status:** recorded — **nothing fixed** (owner ruling: check, do not rebuild)

## How it ran

- `node developer-workspace/scripts/car-run.mjs`, run twice.
- One browser, serial; one fresh context per cell/check, closed after each; browser closed in `finally`.
- Guard: own chromium processes before launch = 4 (< 10 threshold). The owner's GUI Chrome was never counted or killed.
- No screenshots. No `waitForTimeout` for control flow. `domcontentloaded`. Light forced via `localStorage ts-theme="light"` + `dataset.theme` before load; ref toast/farewell suppressed via `sessionStorage`.
- Run 1's probe failures included two **harness bugs**, fixed and re-verified before any finding was accepted: C10's `#wa,a.btn-whatsapp,a.wab` selector matched the header nav CTA; C4 flaked on the first cell without `scrollIntoViewIfNeeded`. Second run: **15 both-pass, 0 both-fail, 13 diverge**.
- The compare does not wait for the reference's price count-up animation (see note under D-c6).

## Matches (all 6 normal cells)

- HTTP 200 both sides, page renders, **0 failed requests, 0 console errors** both sides.
- Gallery present both sides: prev/next arrows, **3 thumbnails**, active index 0.
- **Theme toggle** — flips and persists `ts-theme` (probe C6 PASS both, all cells).
- **Price settles** to the same exact figure on both sides — `₦34,500,000` (probe C9 PASS both, all cells).
- **WhatsApp CTA** is a `wa.me` link carrying this car's name (probe C10 PASS both, all cells).
- Probe C1 (next arrow advances the photo) and C2 (thumbnail click selects that photo) PASS both sides, all cells.
- Sold / not-found: both sides correctly stop showing a car (gallery, tabs, aside, specs = 0/absent); see state section.

## Interactive-UI probe (C1–C10; verdicts)

BOTH PASS on reference and build:

- **C1 next arrow** advances the gallery photo.
- **C2 thumbnail click** selects that photo.
- **C6 theme toggle** flips + persists (`ts-theme`).
- **C9 price** settles at `₦34,500,000`.
- **C10 primary WhatsApp CTA** is a `wa.me` link for this car.

### Divergences (REF PASS / BUILD nothing to drive)

The build car page is a thin stub: the elements these probes act on do not exist, so each is `present=0`.

| Probe | Reference | Build | Cells |
|-------|-----------|-------|-------|
| C3 gallery click opens lightbox | `lbPresent=1 opened=true` | `lbPresent=0 opened=false` | all 3 |
| C4 tab click switches panel | `tabs=3 p2Shown=true` | `tabs=0` | all 3 |
| C5 related rail next scrolls rail | `cards=11 buttons=2 moved=true` | `cards=0 buttons=0 moved=false` | all 3 |
| C7 ≤820 mobile bar appears past price | `present=1 shown=true` | `present=0 shown=false` | 560/dark |
| C8 Share chip shows copy toast | `present=1 shown=true text="Link copied"` | `present=0 shown=false` | all 3 |

- **Minor (graded PASS, wording differs):** C10's link *target* is the same, but the message body differs — ref `…the 2021 Toyota Camry XSE V6 (Ref TS-1001).` vs build `…(TS-1001).` (build omits the `Ref ` prefix).

## Structural / CSS differences — recorded, NOT fixed

| # | Item | Reference | Build | Note |
|---|------|-----------|-------|------|
| D-c1 | `<title>` | `2021 Toyota Camry XSE V6 \| TrueSpec Automotive` | `TrueSpec — cars you can trust` | build uses fixed layout metadata, not car-specific |
| D-c2 | `h1` | `Toyota Camry XSE V6 2021` | `Toyota Camry` | build drops trim + year; no `#ti` |
| D-c3 | breadcrumb `#crumb` | `Home Inventory Toyota Camry 2021` | absent | build has no breadcrumb |
| D-c4 | chips `#chips` | 3 (`Available` / `Ref TS-1001` / `Share this`) | absent | |
| D-c5 | speak line `#speak` | "This one is on the lot right now…" | absent | |
| D-c6 | price | `₦34,500,000` | `₦34,500,000` | 1100/dark compare shows ref `₦34,487,901` — the ref count-up animation caught mid-tween; probe C9 proves both settle identical |
| D-c7 | gallery main image | `…&w=1400&q=70` | `…&w=900&q=70` | same photo, different render width |
| D-c8 | counter `#cn` / ribbon `#rib` | `1 / 3` / present | absent | |
| D-c9 | lightbox `#lb` | present | absent | also C3 |
| D-c10 | details tabs `#tabs`, bar `#bar`, panels `#p1/#p2/#p3` | present | absent | also C4 |
| D-c11 | desktop aside `.aside` | present | absent | build renders details inline in `.vdp` |
| D-c12 | CTAs | `Chat on WhatsApp` / `Make an offer` / `Book a viewing` | absent | |
| D-c13 | spec rows | 8 (Brand, Model, Trim, Year, Mileage, Exterior, Interior, Status) | 4 (Year, Mileage, Exterior, Interior) | build omits Brand/Model/Trim/Status |
| D-c14 | trust items `.trust` | 3 | 0 | |
| D-c15 | related rail `.rel` | `More available cars` + 11 cards + 2 rail buttons | absent | also C5 |
| D-c16 | mobile bar `#mbar` | present; shown (`flex`) ≤820, `none` at 1100 | absent | also C7 |
| D-c17 | covering modal, stop toast, proof toast | present | absent | deliberately suppressed in run; build doesn't render them |
| D-c18 | feature items | 10 | 7 | |
| D-c19 | landmarks | `header 0 / main 0 / aside 1 / section 1 / footer 1 / h2 2 / h3 11 / button 17 / a 26` | `header 1 / main 1 / aside 0 / section 0 / footer 1 / h2 0 / h3 1 / button 3 / a 11` | build adds real layout `header`+`main`; body is a stub |
| D-c20 | total elements | 352 | 174 | |
| D-c21 | headings | 22 | 10 | |
| D-c22 | 33 reference ids absent in build | `crumb ti chips speak gal gi cn rib thumbs tabs bar p1 p2 p3 wa of vw spec rt rt2 mbar lb …` | — | structural: stub page |
| D-c23 | `.thumbs` | `display:grid; gap:12px; overflow:visible` | `display:flex; gap:8px; overflow:auto` | |
| D-c24 | `.big` (WhatsApp button) | `display:flex; width:772/512/340px` full-width | `inline-flex; ~170px` | |
| D-c25 | `:root` tokens | — | build adds ~30 vars (`--card,--surface,--gold-ink,--font-*,--radius*,--shadow-*,--green,--w-*`…) | |
| D-c26 | classes in ref, absent in build | `crumbs chips speak gal thumbs tabs mbar lb rel spec trust chip ofr …` (+ many `fa-*`) | — | consequence of D-c22 |

## Sold / not-found states (1100 & 560, dark)

| State | Reference (HTTP 200) | Build (HTTP 404) |
|-------|----------------------|------------------|
| sold slug `2021-honda-civic-ex` | `h1` = "That one found a new owner"; breadcrumb `Home Inventory Sold`; related `More cars`; mbar present | `h1` = "This car is no longer available." (`app/not-found.tsx`); no breadcrumb; CTA "Browse inventory" / "Back to home"; 1 failed request = the 404 document |
| not found `TS-0000` / `no-such-car-xyz` | `h1` = "We could not find that car"; breadcrumb `Home Not found`; related `More cars` | same generic `h1` "This car is no longer available." |

- Both sides stop rendering a car body (gallery/tabs/aside/specs absent). Build routes **both** the sold slug and an unknown ref to the one shared `not-found.tsx`; the reference distinguishes sold from not-found, with breadcrumbs and a "More cars" rail.
- Build 404 is an expected Next.js response for a missing ref; recorded, not a defect against the ref's 200.
- **Evidence note (added on coordinator review):** the build identifies a car by **`ref`**, the reference by **`slug`**. The sold row was probed with the reference *slug* on the build path, so it exercises the build's *unknown-ref* path, not a real sold car. The build's absence of a distinct sold state is established by **code**, not by that probe: `app/not-found.tsx` is the single 404 and no sold route exists (Phase-1 coverage §1, screen 7).

## Not checked (honest gaps)

- Lightbox zoom/close/keyboard nav, gallery swipe, related-rail card navigation, offer/viewing CTAs and their flows (the build lacks the elements, so nothing was driveable).
- The cover/stop/proof modal + toast lifecycles (deliberately suppressed in the run); Share actually writing to the clipboard (only the toast was observed).
- Keyboard focus order, colour contrast, reduced-motion.
- Breakpoints other than 560/820/1100, other cars (`TS-1002`, `TS-1003`), and any page other than the car page.

## Artifacts

- Raw: `/tmp/opencode/car-compare-<560|820|1100>-<dark|light>.md` (6), `/tmp/opencode/car-sold-<1100|560>-dark.md` (2), `/tmp/opencode/car-notfound-<1100|560>-dark.md` (2), `/tmp/opencode/car-probe.md`.
- Scripts: `developer-workspace/scripts/{car-run,car-compare,car-probe,screen-compare}.mjs`.
