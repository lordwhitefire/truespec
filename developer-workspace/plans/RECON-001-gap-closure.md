# RECON-001 — gap-closure plan (Phase 2)

**Comes from:** `developer-workspace/notes/RECON-001-coverage.md` (Phase 1).
**Task:** `openspec/tasks/RECON-001` — UI completeness. **Date:** 2026-10-09.
**Status:** Phase A + B1 done and verified; B2 built and verified locally (report to write);
B3–E not started. Owner direction 2026-10-09 applied (see below).

---

## How this plan works

- One step = **one screen or one element**. Each has: what changes, the files, and how it is checked.
- Small steps, verified as we go; the build stays green after every step.
- **Bar:** each screen **looks exactly like its reference** in `test-truespec-v2` (structure, order,
  spacing, colour, type, controls, wording, empty/sold states). Add **no new design**.
- **Verification (owner direction, 2026-10-09):** **no screenshots**. The owner checks the look
  **by hand**. The Developer compares the two sites **at runtime** — the reference
  (`test-truespec-v2` HTML, opened in a real browser) vs the build — and reports the differences in
  **HTML** (the rendered/live DOM after JS runs), **CSS** (the actual **computed styles + matched
  rules per element**, not the source files), and **JS** (runtime behaviour: events, state changes,
  dynamic renders, console). Done programmatically over the live pages, element by element.
- A step's check column stays **No** until that runtime comparison — or, where a point is purely
  visual, the owner's own hand check — has confirmed it.
- Nothing outside `developer-workspace/` changes in this planning phase.

**Order:** foundations → public showroom → public extras → office → verify. Foundations first
because every screen depends on the tokens and widths; the showroom before the office because the
office reuses the same tokens and shell patterns.

---

## Phase A — Foundations

**A1. Tokens — taken from the reference (owner: the reference is the colour truth).** Port the
reference's own two themes verbatim into `app/globals.css`: the `:root` (light) and
`html[data-theme=dark]` blocks in `test-truespec-v2/truespec.html` (lines 19–47) —
`--gold/--gt/--wa/--dk`, ink/mute/lt, bg/band, photo tiles `--ph1/--ph2`, `--card/--card-line`,
`--nav/--nav-line/--tick`, `--dash/--dts/--nv`, tab colours, `--oo/--oo-bg`, `--ld/--ld-bg`,
`--chip-bg/--chip-line`, per-theme `color-scheme`.
· *Files:* `app/globals.css`, `app/layout.tsx`, `components/ThemeToggle.tsx`. · *Check:* every value
equals the reference's. Move the toggle from `.theme-*` classes to `data-theme` so it matches the
reference's own selector.

**A2. Widths.** Add the missing **1100px** laptop breakpoint and align the existing 560/820 to the
approved names (phone <560, tablet 560–1099, laptop ≥1100).
· *Files:* `app/globals.css`. · *Check:* the three widths exist; tablet is a width, not a design.

**A3. Theme control.** Make the toggle the approved **sun/moon** button in the header (showroom) and
top of the office sidebar, 44px target, dark default, saved choice wins, no flash.
· *Files:* `components/ThemeToggle.tsx`, `app/layout.tsx`. · *Check:* Q7.

---

## Phase B — Public showroom (match the references exactly)

**B1. Home — rebuild to `truespec.html`.** Header strip · hero **slider** (arrows, dots,
auto-advance, 3 most expensive — Q33) · **ask bar** (first-visit question) · **inventory band with
the three tabs + car count** · grid + **Show all** · two info boxes · **Featured cars** slider ·
**Why choose us** (4 items) · **about box** · **multi-column footer** · floating WhatsApp button ·
welcome/farewell modal · social-proof toast.
· *Files:* `app/page.tsx`, `app/layout.tsx`, new components. · *Check:* structure vs
`truespec.html`; home carries the tabs (Q41).

**B2. Inventory — rebuild to `inventory.html`.** Heading band + count · **search options sidebar**
(status, make, year, price, colour) · **Sort by** (newest / price low-high / price high-low / year) ·
**grid ⇄ list** toggle · breadcrumb · results. Remove the tabs from this page (they move to home).
· *Files:* `app/inventory/page.tsx`, `components/InventoryTabs.tsx` (reuse/replace). · *Check:* Q41,
grid/list view, filters present.

**B3. Car page — rebuild to `car.html`.** Breadcrumbs · chips row · **info tabs** (Overview /
Features / Delivery + the 4 buying steps) · **price sidebar** (doorstep-price card, old price,
savings, "included" line) · **Make an offer** · **Book a viewing** · spec table · trust lines ·
**More cars** carousel · **mobile bottom bar** · **lightbox** + photo counter · **privacy link under
the WhatsApp button** (Q44).
· *Files:* `app/car/[ref]/page.tsx`, `components/Gallery.tsx`, new components. · *Check:* Q31, Q40,
Q43/Q44.

**B4. Card component.** Bring `CarCard` to Q39: photo, state label (owner colour + computed ink —
Q11/Q12/Q36), year + name, price tag, mileage **and exterior colour**; Special ribbon + `was` (Q37);
On Order arrival chip (Q38). No-photo tile per Q29.
· *Files:* `components/CarCard.tsx`. · *Check:* Q36/Q37/Q38/Q39.

**B5. Header WhatsApp rule.** One main button per size, **header keeps a small text link only**
(Q40). Remove the full WhatsApp button from the header.
· *Files:* `app/layout.tsx`. · *Check:* Q40.

---

## Phase C — Public extras

**C1. Privacy page** — build to `privacy.html` (short version, storage, what is never collected,
WhatsApp enquiries, retention, rights, contact, changes). · *Check:* Q44.

**C2. Sold / deleted page** — per Q43 (friendly "no longer available", similar cars, "Ask for a
similar car" WhatsApp). Reference `not-available.html` is empty, so `ui-plan` Q43 + the showroom
spec are the source. · *Check:* Q43.

**C3. Generic 404** — fix `app/not-found.tsx` to the generic "We couldn't find that page"
(`404.html`); the sold/deleted page becomes its own route.
· *Files:* `app/not-found.tsx`, `app/car/[ref]/page.tsx`. · *Check:* 404 vs sold are distinct.

**C4. Footer privacy link on every page** + under the car WhatsApp button (Q44).

---

## Phase D — Office (all new; 6 screens + login)

**D1. Office shell** — 208px sidebar with five items + "Add car" gold button; 56px icon rail at
tablet; bottom bar on phone; theme toggle at top of the sidebar (Q25, Q78, Q79).
**D2. Login / first-run / reset** — build to `login.html` (centred 380px card, logo, gold Sign in,
theme toggle; first-run says "This is the only account.").
**D3. Dashboard** — row 1 four number cards; row 2 three money cards each with the confirmed figure,
coverage line and named shortfall (Q47, decision 6); row 3 two lists. No charts (Q48).
**D4. Office inventory** — compact table (Q50), sticky header, pagination (Q70), sold/deleted rows
(Q66, Q67), negative profit (Q68).
**D5. Add / Edit car** — one page: Car details, Photos, Costs, Private notes (Q51); sticky live
panel (Q52); cost lines in three written states (Q53); photo grid + reorder + resize-on-upload (Q54).
**D6. Enquiries** — board on laptop, list + dropdown on tablet/phone (Q55); PDF preview panel (Q56).
**D7. Activity log** — table + type/date filters, times in WAT (Q57).
**D8. Settings** — sub-menu General / Car states / Customer states / Account (Q58); state editor
with **colour picker** + live sample + no random generator (Q59, Q12); "Show as a tab" is an
inventory filter only (Q59).

---

## Phase E — Verification

**E1. Runtime comparison pass** — for every screen, both modes, three widths: open the reference
(`test-truespec-v2` HTML) and the build in a real browser and diff the **live HTML/DOM**, the
**computed CSS** (with the matched CSS rules), and the **runtime JS** (events, state changes,
dynamic renders, console). **No screenshots** — the owner checks the visual look by hand. Repeat
until they match.
**E2. RECON-001 testing pass** — the independent screen-by-screen check, including the at-risk
inventory search/filters/sort (Q41).

### Verification tooling (owner direction, 2026-10-09 — supersedes screenshots)
- **No screenshots.** The owner checks the visual look **by hand**.
- The Developer compares the two sites **at runtime** — live **DOM** / **computed CSS + matched
  rules** / **runtime JS** — over a real browser (Playwright over the live pages, or Chrome
  DevTools). `playwright-core` + system Chrome are available (`developer-workspace/scripts/
  recon-shot.mjs` already opens real Chrome).
- **Screenshots + Gemini vision are dropped**: the owner ruled no screenshots, and the Gemini free
  tier is out of quota anyway (429). The built-in **`visual_inspect` tool is broken** — not used.
- **Images — closed decision:** use the owner's truespec images — the Unsplash car photos in
  `test-truespec-v2` (`img(id,w)=>https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`).
  Replace the `picsum.photos` placeholders in `scripts/seed.ts` and the `car_photo` rows.

---

## Owner answers (2026-10-09) — resolved, not open

1. **State colours are UI.** First layer. Build the colour picker and the owner-coloured label now;
   no cross-layer data path blocks it. (B4 and D8 are unblocked.)
2. **`was` = a discount price** the owner chooses to show. (B3/B4 unblocked.)
3. **Interactivity is UI.** Everything on screen — slider, tabs, modals, toasts, filters, hover
   lifts — is Layer 1 and is built here. **UX (Layer 5) is the last product layer, just before the
   system model**, and only *makes it feel good*: focus, undo timing, offline handling, failure
   wording, per-width interaction polish. Nothing in B1–B3 is deferred to it.
4. **Office data is placeholder** for now; wiring is Layers 3/4. (Phase D unblocked.)
5. ~~**Verification = Playwright + Gemini vision.**~~ **Superseded (2026-10-09):** **no
   screenshots** — the owner checks the look by hand; the Developer compares the two sites at
   runtime (live HTML DOM / computed CSS + matched rules / runtime JS). See the tooling section.
6. **Images — closed.** Use the owner's truespec images (the Unsplash car photos in
   `test-truespec-v2`). No picsum, no random images, and no further questions about images.

## Not built here (out of scope)

Business logic, data model, functionality, UX (the Layer-5 *feel*: focus, undo, offline, failure
wording), and the system model — except where a screen needs something to render. **Interactive UI
on the screens is Layer 1 and is in scope.** Reference screens are read-only; no new design.

## Shape

This is a **full UI build**, not a touch-up: 3 public screens to redo, 2 public extras + a 404 to
add, and 7 office screens from nothing, on foundations that need correcting first. It should be
worked in the step order above, each step landed and checked before the next.
