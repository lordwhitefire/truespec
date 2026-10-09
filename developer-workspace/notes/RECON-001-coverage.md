# RECON-001 — UI coverage list

**Phase 1 output.** Task: `openspec/tasks/RECON-001` (UI completeness).
**Date:** 2026-10-09 · **Author:** Developer.
**Method:** compared built source (`app/`, `components/`, `app/globals.css`) against the reference
screens in `test-truespec-v2` and the `ui-plan.md` answers, at markup/CSS level.
**Honesty flag:** **no screen was render-verified.** There is no browser in this session, so "does
not match" below means a difference visible in the markup/CSS, not a screenshot comparison. Every
row's `render-checked` column is **No**. Exact visual match is unproven until a browser checks it.

---

## 1. Screen register — 13 screens

Status key: **OK** = built and matches · **PARTIAL** = built but differs · **MISSING** = no route.
"Render" = confirmed against a real render (all No).

| # | Screen | Reference | Built | Status | Render |
|---|---|---|---|---|---|
| 1 | Showroom home | `truespec.html` | `app/page.tsx` | **PARTIAL** | No |
| 2 | Buyer inventory | `inventory.html` | `app/inventory/page.tsx` + `InventoryTabs` | **PARTIAL** | No |
| 3 | Car page | `car.html` | `app/car/[ref]/page.tsx` + `Gallery` | **PARTIAL** | No |
| 4 | Login / first-run | `login.html` | — | **MISSING** | No |
| 5 | Privacy | `privacy.html` | — | **MISSING** | No |
| 6 | 404 | `404.html` | `app/not-found.tsx` | **PARTIAL (wrong content)** | No |
| 7 | Sold / deleted ("not available") | `not-available.html` | — | **MISSING** (ref file is 0 bytes) | No |
| 8 | Office dashboard | `office-dashboard.html` | — | **MISSING** | No |
| 9 | Office inventory | `office-inventory.html` | — | **MISSING** | No |
| 10 | Office car form | `office-car.html` | — | **MISSING** | No |
| 11 | Office enquiries | `office-enquiries.html` | — | **MISSING** | No |
| 12 | Office activity | `office-activity.html` | — | **MISSING** | No |
| 13 | Office settings | `office-settings.html` | — | **MISSING** | No |

**Verdict: no screen is a confirmed match.** 3 partial, 1 wrong, 9 missing.

---

## 2. Screen-by-screen differences

### 1. Home — PARTIAL
Built: hero (`h1` + tagline + two buttons) then three static sections (Available / On Order /
Landed). Reference `truespec.html` has, in order: header strip · **hero slider** (arrows, dots,
auto-advance) · **"Ask" bar** (Umar's one first-visit question) · **"TrueSpec Inventory" band with
the three tabs + car count** · inventory grid + **"Show all"** · two info boxes ("Are you looking
for a car?" / "Want a car you cannot see here?") · **"Featured cars" slider** · **"Why choose us"**
(4 items + chat button) · **about box** ("Vehicle imports done right") · **multi-column footer** ·
floating WhatsApp button · welcome/farewell modal · social-proof toast.

Missing on home: the slider, the ask bar, the inventory band + tabs (home shows no tabs, but
`ui-plan` Q41 says **home has the tabs**), "Show all", the two info boxes, Featured cars, Why choose
us, the about box, the footer columns, the floating WhatsApp button, the modal and the toast.

### 2. Inventory — PARTIAL
Built: `h1` + a tab component (three tabs). Reference `inventory.html` has: heading band with car
count · a **search options sidebar** (status / make / year / price / colour filters) · a results
toolbar with **Sort by** (newest / price low-high / price high-low / year) and **grid ⇄ list view**
buttons · a breadcrumb · results. **Everything in bold is missing.** The tabs the built page shows
belong on the home page per `ui-plan` Q41.

### 3. Car page — PARTIAL
Built: gallery + title/meta/price/specs/features. Reference `car.html` has: breadcrumbs · a **chips
row** · **information tabs** (Overview / Features / Delivery, with the 4-step buying steps) · a
**price sidebar** (doorstep-price card, old price, savings, "included" line) · **Make an offer** and
**Book a viewing** · a spec table · trust lines · a **"More cars" related carousel** · a **mobile
bottom bar** (price + chat) · a **lightbox**. Built gallery has arrows, thumbnails and swipe but no
photo counter and no lightbox. The built page has no sidebar, no tabs, no related cars, no mobile
bar, no privacy link under the WhatsApp button.

### 4. Login / first-run — MISSING
No route. Reference `login.html` has three states: "First-time setup" · "Sign in" · "Reset link"
(centred card, logo, gold Sign in, theme toggle bottom-right).

### 5. Privacy — MISSING
No route. Reference `privacy.html` has a full notice (short version, storage, what is never
collected, WhatsApp enquiries, retention, rights, contact, changes). `ui-plan` Q44 requires the link
in **every** footer and under the car page's WhatsApp button — neither exists.

### 6. 404 — PARTIAL (wrong content)
Built `app/not-found.tsx` reads **"This car is no longer available"** (sold-specific). Reference
`404.html` is the generic **"We couldn't find that page"**. The sold/deleted page (screen 7) is a
*separate* screen and is missing, so the built 404 conflates the two.

### 7. Sold / deleted page — MISSING
No route; and `not-available.html` itself is 0 bytes, so there is no visual truth either. Fall back
to `ui-plan` Q43 (friendly "no longer available" + similar cars + "Ask for a similar car" WhatsApp).

### 8–13. Office screens — ALL MISSING
No office routes exist. References present for dashboard, inventory, car form, enquiries, activity,
settings; none has been started.

---

## 3. Element checklist (from `ui-plan.md`)

| Element (Q) | State | Note |
|---|---|---|
| Dark default + toggle (Q7) | **PARTIAL** | toggle exists, but labelled Light/Dark, not the sun/moon button; token values differ (§5) |
| Hero slider, 3 most expensive (Q33) | **MISSING** | no slider anywhere |
| Hero badge short price (Q34) | **MISSING** | follows the slider |
| Three tabs + count, gold active (Q35) | **PARTIAL** | tabs + counts exist, but on the inventory page (wrong place); active treatment unverified |
| Special ribbon + crossed-out `was` (Q37) | **OK** | `CarCard` + car page |
| On Order arrival chip (Q38) | **OK** | |
| One WhatsApp button/size; header small link only (Q40) | **FAIL** | header ships a **full** WhatsApp button; car page has no sidebar/bottom bar |
| Inventory search/filters/sort (Q41) | **MISSING** | |
| Empty-tab message + WhatsApp (Q42) | **MISSING** | empty grid renders with no message |
| Sold/deleted page (Q43) | **MISSING** | |
| Privacy link in every footer + under car button (Q44) | **MISSING** | |
| No-photo tile (Q29) | **PARTIAL** | gallery says "No photo"; cards have no fallback |
| Gallery: counter, thumbs, arrows, lightbox, swipe (Q31) | **PARTIAL** | arrows/thumbs/swipe only |
| State label + owner colour + computed ink (Q11/Q12/Q36) | **PARTIAL** | labels present; state colours not wired |
| Card: photo, label, year, name, price, mileage, colour (Q39) | **PARTIAL** | no exterior colour; state label generic |
| Logo gauge icon + text (Q1/Q2) | **PARTIAL** | text only, no icon |
| Favicon + share image (Q3) | **MISSING** | |
| Tagline in hero, footer, description (Q4) | **PARTIAL** | hero yes; footer no |
| Font Awesome icons (Q26) | **MISSING** | builds use text glyphs (‹ ›) |
| Office elements (Q45–Q59, Q60–Q81) | **MISSING** | whole office |

---

## 4. Widths × modes

- **Widths:** built CSS has breakpoints at **820px and 560px only**. `ui-plan` Q77/Q79 requires a
  third width at **1100px (laptop)**. The 1100 breakpoint is absent → office rail / desktop layout
  rules cannot apply. **Does not match.**
- **Modes:** `theme-dark` (default via head script) and `theme-light` exist; toggle persists. The
  *look* of both modes is **unverified** (no render). `ui-plan` Q7/Q81 require every screen checked
  in both modes on a real phone and laptop before it ships.
- **Token** class names use `.theme-*`, `ui-plan` names `[data-theme]` — cosmetic difference, but
  the token **values** differ (§5), which is not cosmetic.

---

## 5. Token / spec divergences (look, not just structure)

| Token | Built | `ui-plan` approved | Verdict |
|---|---|---|---|
| gold | `#c8a24a` | `#c8a24a` | matches |
| ink on gold | `#14171c` | `#1a1405` | differs |
| bg (dark) | `#0d0f12` | `#15171a` | differs |
| bg (light) | `#f6f7f8` | `#ffffff` | differs |
| band/strip | `--band:#0a0c0f` (no `--strip`/`--footer`) | strip `#212529`, band `#222629`, footer `#212529` (dark both modes) | differs |
| surface dark/light | `#14171c` / `#ffffff` | `#1e2125` / `#ffffff` | differs (dark) |
| breakpoints | 560 / 820 | 560 / 820 / 1100 | differs (missing 1100) |

Spec check: the header's full WhatsApp button (Q40) and the home page carrying no tabs (Q41) are the
two clearest screen-vs-plan conflicts. Neither is a *binding-spec* conflict yet; both are `ui-plan`
conflicts and are logged here, not silently reconciled.

---

## 6. Summary

- **Confirms the reason RECON-001 exists:** the UI is not done, and until now no artifact said so.
- The **showroom is a skeleton** — three public routes, each a simplified version of its reference;
  none matches.
- The **office does not exist** — 6 screens + login, all missing.
- **Public extras** (privacy, sold/deleted) are missing; the 404 is the wrong page.
- Widths are short one breakpoint; token values diverge from the approved set; **nothing is
  render-verified.**
- Next (Phase 2): turn this into the ordered gap-closure plan.

*No files outside `developer-workspace/` were changed. Recon only.*
