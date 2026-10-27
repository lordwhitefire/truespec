# LAUNCH-001 — implementation plan

**Date:** 2026-10-26
**Plan and task list:** this file (`developer-workspace/plans/LAUNCH-001.md`).
**Build gate:** the runtime checklist in `developer-workspace/procedures/LAUNCH-001-runtime-checklist.md`,
executed through the standing browser procedure in `developer-workspace/procedures/browser-check.md`.
The old unit suite is a helper, not the gate. The CI/CD pipeline is the agent-run browser checklist
plus a handoff, not a single script or a GitHub Actions gate. No push unless the owner asks; commits are
local and stage explicit paths only. **Commit per task:** each LAUNCH-001 task is committed separately
when its checks are green, never squashed across tasks (see `developer-workspace/notes/commit-per-task.md`).

**Owner rulings recorded:**
- Canonical host: `https://truespec-k4y6.vercel.app`, one constant, no redirect map.
- Monitoring: Sentry free for errors, UptimeRobot free for uptime; owner creates both with the owner's
  email; Sentry is wired behind an optional `SENTRY_DSN`.
- Terms: drafted in-house, seller “TrueSpec Automotive”, governing law Federal Republic of Nigeria
  (Lagos), owner approves before publish.
- Demo identities: live until the owner removes them; daily reset never touches identities.
- Preview: demo Neon branch for the database, separate Sanity `preview` dataset for assets; no separate
  staging environment; owner scopes the Vercel Preview values and creates the dataset.
- CSP: enforced in code after the local public + anonymous-office exercise; the separate testing session
  does the full sign-in/keyboard/screen-reader pass. Lighthouse lab baseline only; no analytics.
- Smoke test: documented pre-merge job against the local/demo branch; no database secret in GitHub.
- CI/CD: the pipeline is the agent-run browser checklist plus a handoff, not a GitHub Actions script;
  the agent runs it after changes, records PASS/FAIL/NOT RUN, writes the handoff, and the owner pushes
  if they want. No branch protection.

---

## Overview

Add the launch layer around the already-built showroom and office: repository truth, discoverability,
accessibility, delivery quality, public trust, launch operations and performance. No product scope
change, no schema change, no provider replacement, no main/demo reopening.

The work is sliced so each slice leaves a working site and is checked in the real browser before the
next slice. The highest-risk surfaces come first: the metadata helper, the home/inventory/car pages,
font and image delivery, and the CSP. Documentation, legal pages, operations and CI follow once the
runtime surfaces are stable.

---

## Architecture decisions

1. **One site constant.** `lib/site.ts` owns the canonical origin, title template, default social image
   and absolute-URL helper. No page hard-codes the host.
2. **Metadata from the page that owns it.** The App Router metadata API plus the shared helper. No
   client-side tags.
3. **Dynamic machine routes.** `robots.txt`, `sitemap.xml` and `llms.txt` read the same public car
   source as the showroom; no hand-maintained car list.
4. **JSON-LD from the public car object.** The same object the page renders; no second query and no
   private fields.
5. **Runtime gate, not unit-test gate.** Every slice is checked through the attach-only browser
   procedure: CDP `:9222`, build `:3210`, reference `:3211`, no headless, no screenshots, detach on exit.
   Where no reference exists, the check is build-vs-spec.
6. **Fonts and icons non-blocking.** Replace the render-blocking Google Fonts and Font Awesome
   stylesheets with a non-blocking strategy and a real fallback; keep the approved look.
7. **Images at display size.** Sanity transformations with width/height reserved and lazy loading below
   the fold. The 15 MB upload cap is not a 15 MB delivery.
8. **CSP enforced centrally.** One header configuration in `next.config.mjs`; report-only exercise
   first, then enforce. Clerk, Sanity, fonts and icons are named sources.
9. **Sentry optional.** `SENTRY_DSN` unset means no-op. Scrubbing is unit-tested; the owner adds the DSN
   in Vercel.
10. **Preview isolation by environment values, not code guesses.** The demo branch and the `preview`
    Sanity dataset are owner-scoped in Vercel; the docs state the exact values and the rollback.
11. **CI/CD is the agent-run checklist and handoff.** The checklist is the pipeline; scripts are
    helpers, not the gate. The agent attaches to the browser, runs every check, records PASS/FAIL/NOT RUN,
    and writes the handoff. The owner pushes if they want. No GitHub Actions gate; no branch protection.
12. **No new database table.** If a task appears to need one, stop and report.

---

## Dependency graph

```
Task 1 baseline + runtime checklist
        │
        ├── Task 2 site constant + metadata helper + default OG image
        │       ├── Task 3 home metadata + H1
        │       │       └── Task 4 home fonts + images
        │       ├── Task 5 inventory metadata + canonical + H1
        │       │       └── Task 6 inventory images
        │       │               └── Task 7 inventory keyboard/focus
        │       ├── Task 8 car metadata + OG image
        │       │       └── Task 9 car JSON-LD
        │       │               └── Task 10 car images + headings
        │       ├── Task 11 robots + sitemap
        │       │       └── Task 12 llms.txt
        │       ├── Task 13 terms (owner approval gate)
        │       │       └── Task 14 privacy alignment
        │       │               └── Task 15 cookies + accessibility release check
        │       └── Task 16 security headers + CSP
        │               ├── Task 17 lint + format
        │               │       └── Task 18 Playwright smoke test
        │               ├── Task 19 error tracking
        │               │       └── Task 20 uptime monitor docs
        │               │               └── Task 21 rate limits + demo lifecycle
        │               │                       └── Task 22 environments + rollback
        │               │                               └── Task 23 runbook + guarantees
        │               └── Task 24 README + .env.example
        │                       └── Task 25 config error + changelog + handover
        │                               └── Task 26 clean-clone proof
        ├── Task 27 performance re-measure + cache + bundle
        │       └── Task 28 agent checklist + handoff (last)
        │               └── Task 29 openspec validate + release evidence + registry
```

Tasks 3-15 are independent of 16-26 once Task 2 lands; the order above is the execution order, not a
hard serialisation. Each checkpoint is a stop-and-check, not a merge gate.

---

## Task list

### Phase 0 — Baseline and gate

#### Task 1 — Capture the baseline and write the runtime checklist

**Covers:** pre-work for every group.
**Description:** Establish the current runtime truth before any change, and write the checklist that
will judge every slice. The checklist maps the 47 benchmarks in `task.md` plus the failure states
(wrong input, missing data, expired session, broken image, offline, sold car, unknown car, anonymous
office access) to observable checks with PASS / FAIL / NOT RUN and evidence.

**Acceptance criteria:**
- [x] Harness under `developer-workspace/scripts/LAUNCH-001/` attaches to the existing visible Chrome on
      CDP `:9222`, proves it is ours, reuses the build tab on `:3210`, launches nothing, takes no
      screenshots, and detaches.
- [x] Baseline report records current status, title, H1 count, headers, console and Lighthouse lab
      numbers for `/`, `/inventory`, a car page, `/privacy` and `/office/sign-in`.
- [x] Checklist maps every benchmark A1–H3 and every failure state; each item names the route, the
      action, the expected result and the evidence.

**Verification:**
- [x] `node developer-workspace/scripts/LAUNCH-001/_lib.mjs` smoke check passes.
- [x] Browser procedure run on the five routes; chromium count before = after.
- [x] Checklist reviewed against `openspec/tasks/LAUNCH-001/task.md`; no benchmark unmapped.

**Done (2026-10-26):** harness smoke check passed (6 tabs, 1 Chromium before/after); baseline captured
for five routes (no console/page errors; launch metadata, headers and H1s absent as expected);
Lighthouse home lab: performance 33, LCP 11.4 s, CLS 0.057. Evidence:
`scripts/LAUNCH-001/runs/baseline.json`, `runs/lighthouse-home.json`,
`reports/LAUNCH-001-baseline.md`, `procedures/LAUNCH-001-runtime-checklist.md`.

**Dependencies:** none.
**Files:** `developer-workspace/scripts/LAUNCH-001/_lib.mjs`,
`developer-workspace/procedures/LAUNCH-001-runtime-checklist.md`,
`developer-workspace/reports/LAUNCH-001-baseline.md`.
**Size:** M (3 files).

---

### Phase 1 — Home slice

#### Task 2 — Site constant, metadata helper and default social image

**Covers:** 2.1, 2.8 (default image).
**Description:** One source for the canonical origin, title template, default social image and
absolute-URL helper; a generated 1200×630 default card so no binary asset is needed.

**Acceptance criteria:**
- [x] `lib/site.ts` exposes the origin, `absoluteUrl()`, `pageMetadata()` and the default image path.
- [x] The default Open Graph image renders at 1200×630 with the TrueSpec wordmark and palette.
- [x] No page or route hard-codes `truespec-k4y6.vercel.app`.

**Verification:**
- [x] Unit test for absolute URLs and canonical joining (7/7 pass).
- [x] Browser fetch of the default image returns `200 image/png`, 42,646 bytes, 1200×630.
- [x] `rg 'truespec-k4y6' app components lib` returns only `lib/site.ts`.

**Dependencies:** 1.
**Files:** `lib/site.ts`, `app/opengraph-image.tsx`, `lib/site.test.ts`, `app/layout.tsx`
(`metadataBase` + root constants; the build warned without it).
**Size:** M (4 files).
**Done (2026-10-26):** typecheck 0; production build 0 (no `metadataBase` warning); OG image visually
confirmed (dark card, gold TS mark, "TrueSpec / AUTOMOTIVE", "Cars you can trust.", host, Lagos).
Home now inherits the default OG image/title; canonical and page description are Task 3.

#### Task 3 — Home page metadata and one H1

**Covers:** 2.2 (home), 3.1.
**Description:** Give the home page a unique title, description, absolute canonical, Open Graph/Twitter
metadata and exactly one page-level `<h1>` naming the showroom, without changing the approved look.

**Acceptance criteria:**
- [x] Home has title, description, absolute canonical, OG title/description/image and Twitter card.
- [x] Exactly one `<h1>`; section headings stay `<h2>` or deeper; no skipped level.
- [ ] The visible design is unchanged (owner look check) — hidden h1 and footer h3 only.

**Verification:**
- [x] Runtime checklist B1, C1: canonical `https://truespec-k4y6.vercel.app/`, OG/Twitter
      absolute, one h1, no heading skip, no console/page errors.
- [x] Browser procedure at 1440 and 560 widths; no horizontal overflow.
- [x] Lighthouse lab baseline recorded for the home page (Task 1: performance 33, LCP 11.4 s).

**Dependencies:** 2.
**Files:** `app/(site)/(home)/page.tsx` (metadata + hidden h1), `app/(site)/layout.tsx` (hidden
footer h3), `app/globals.css` (`.sr-only`), `components/site/HomeBehaviors.tsx` (default modal
title, so the closed dialog has no empty heading). `HeroSlider.tsx` was not changed; the hero
headings stay `<h2>`.
**Size:** S (4 files).
**Done (2026-10-26):** typecheck 0; build 0; home verified at 1440 and 560 (h1=1, skips=0,
overflow=0, console=0, tabs 6→6, chromium 1→1). Visible look unchanged by construction (hidden
heading only); owner look check pending.

#### Task 4 — Home fonts and hero images

**Covers:** 7.2 (home), 7.3.
**Description:** Remove the render-blocking Google Fonts and Font Awesome stylesheets from the critical
path, keep only the weights the page uses, provide a readable fallback, and serve hero images at
display size with reserved dimensions.

**Acceptance criteria:**
- [x] No render-blocking third-party font request; text is readable with the font stylesheet blocked.
- [x] Only the used weights are requested; icons still render.
- [x] Hero images request a display-sized Sanity transformation with width/height reserved; no CLS jump.

**Verification:**
- [x] Runtime checklist G4, G5; network panel shows no third-party font CSS. The only render-blocking
      CSS is the first-party app bundle (including the local icon CSS); the font files themselves use
      `font-display: swap`.
- [x] Block the font files in the browser (`.woff2` aborted, cache disabled); the page remains
      readable in the fallback.
- [ ] Browser procedure confirms the approved look — runtime checks pass; owner look check pending.

**Dependencies:** 3.
**Files:** `app/layout.tsx`, `app/(site)/layout.tsx`, `app/office/layout.tsx`,
`components/site/HeroSlider.tsx`, `components/Photo.tsx`.
**Size:** M (5 files). **High risk** — isolate in its own commit.
**Done (2026-10-27):** Oswald/Inter self-hosted with `next/font`; Font Awesome 6.5.1 local; root
`--font-head`/`--font-body` aliases fix the standalone door and office-shell stylesheets; hero uses
Sanity 800×800/1200×450 transforms, eager/high first slide, lazy rest. Home at 1440/820/560 dark and
light, car and anonymous door: no overflow, console or page errors; tabs 6→6; Chromium 1→1. Font-block
check readable; no Google/cdnjs requests. Lighthouse home: LCP 7.5 s (TTFB 6.73 s from the Clerk dev
handshake), CLS 0.024, accessibility 100, SEO 89 (false negative on the meta description; B1 passes).
The earlier non-blocking stylesheet attempt was reverted after CLS 0.368. Evidence:
`developer-workspace/reports/LAUNCH-001-task4.md`.

**Checkpoint 1 — home slice**
- [x] B1, C1, G4, G5 pass.
- [ ] No visual regression on home at 1440 / 820 / 560, dark and light — runtime checks pass; owner
      look check pending.
- [x] Typecheck and build pass.

---

### Phase 2 — Inventory slice

#### Task 5 — Inventory metadata, canonical and one H1

**Covers:** 2.2 (inventory), 2.3 (filtered canonical), 3.2.
**Description:** Inventory metadata that describes current stock, a canonical URL that excludes
status/make/price/sort/view/page, and one page-level `<h1>` with result and card headings below it.

**Acceptance criteria:**
- [x] Title/description/canonical/OG/Twitter are present; canonical is always `/inventory`.
- [x] Exactly one `<h1>`; no duplicate page-level heading; no skipped level.
- [x] Filtered URLs still render the filtered results; only the canonical is unfiltered.

**Verification:**
- [x] Runtime checklist B2, C2.
- [x] Browser procedure with `?status=available&make=Toyota&sort=low`; canonical stays `/inventory`.
- [x] No visual regression — the band's existing h2 style now applies to h1 as well; runtime layout
      unchanged.

**Dependencies:** 2.
**Files:** `app/(site)/inventory/page.tsx`, `components/site/InventoryBrowser.tsx`.
**Size:** S/M (2 files).
**Done (2026-10-27):** `pageMetadata` gives “Inventory | TrueSpec Automotive”, a stock description,
absolute canonical `/inventory`, OG and Twitter. The band heading is now the page's one h1
(“TrueSpec Inventory”); the result heading stays h2 and cards h3. Runtime at 1440/820/560: one h1,
h1→h2→h3, no skips, overflow 0, console/page errors 0, tabs 6→6, Chromium 1→1. Filtered
`?status=available&make=Toyota&sort=low&view=list` renders 2 Toyota available cars in ascending price
order; `?view=list&page=2` shows a different 9-car page; the all-parameters URL and the server HTML
both canonicalise to `https://truespec-k4y6.vercel.app/inventory`. Evidence:
`developer-workspace/scripts/LAUNCH-001/inventory-check.mjs`.

#### Task 6 — Inventory car-card images

**Covers:** 7.2 (inventory), 7.1 (inventory part).
**Description:** Request card images at display size through Sanity, reserve their space, lazy-load
below the fold, and keep the placeholder the same size when an image fails.

**Acceptance criteria:**
- [x] Each card requests a transformed image appropriate to the card, not the original upload.
- [x] Width/height or aspect ratio is present; no layout shift when images load.
- [x] Below-the-fold images lazy-load; a broken image leaves the same space.

**Verification:**
- [x] Runtime checklist G2, G3.
- [x] Browser procedure at 390/560 width; inspect image requests and CLS.
- [x] No visual regression — runtime layout unchanged; owner look check pending.

**Dependencies:** 5.
**Files:** `components/Photo.tsx`, `components/CarCard.tsx`,
`components/site/ReferenceCard.tsx`, `components/site/FeaturedSlider.tsx`,
`components/site/InventoryBrowser.tsx`, `components/site/HeroSlider.tsx`,
`lib/photo-url.ts`, `lib/photos.test.ts`, `app/reference.css`.
**Size:** M/L (9 files, 1 new module).
**Done (2026-10-27):** `Photo` gained a `sized` prop; `sizedPhotoUrl()` moved to the client-safe
`lib/photo-url.ts`. Card derivatives: grid 700×326, featured 700×400, list 516×330, unused
`CarCard` 640×480. `FeaturedSlider` always renders three cards and CSS shows 1/2/3 at the
breakpoints, removing the hydration reflow. Tests 513 pass, 0 fail; typecheck and build pass.
Runtime at 390/560: every sampled grid card requests `w=700&h=326`, every list row `w=516&h=330`,
every featured card `w=700&h=400`; all lazy; width/height reserved; natural size matches. CLS:
inventory 0.0171/0; list 0.0171/0; home 0/0.051 (under 0.1). A blocked-image run keeps every card
slot and card rectangle identical (`sameSlot`/`sameCard` true); normal pages have 0 console/page
errors; tabs 6→6 and Chromium 1→1. 820/1440 `verify` keeps one h1, canonical, no overflow, 0
console/page errors. Evidence: `developer-workspace/scripts/LAUNCH-001/cards-check.mjs`,
`developer-workspace/reports/LAUNCH-001-task6.md`.

#### Task 7 — Inventory keyboard, focus and live region

**Covers:** 3.4, 3.5, 3.6 (inventory part).
**Description:** Keyboard-only pass on the inventory and the office: every control reachable, visible
focus, dialogs move/return focus, Escape closes, result count announced, state not colour-only.

**Acceptance criteria:**
- [x] Filter, sort, view and paging controls are keyboard operable; focus is visible.
- [x] The result count is announced when it changes.
- [x] State, error and success messages remain understandable without colour.
- [x] No focus trap outside a deliberate dialog; Escape closes and returns focus.

**Verification:**
- [x] Runtime checklist C4, C6, C7 — public inventory runtime; office inventory code and
      typecheck; the office signed-in runtime is NOT RUN (owner/testing session).
- [x] Browser procedure keyboard walk; ARIA state inspection — 38 checks; the full screen-reader
      pass belongs to the testing session.
- [x] No visual regression — verify at 390/560/820/1440; owner look check pending.

**Dependencies:** 6.
**Files:** `components/site/InventoryBrowser.tsx`, `app/reference.css`,
`app/office/(shell)/inventory/inventory-client.tsx`,
`app/office/(shell)/inventory/inventory.css`, `app/office/(shell)/office.css`,
`components/office/OfficeNav.tsx`, `components/office/OfficeBottomNav.tsx`,
`components/office/MoreSheet.css`, `components/office/Dialog.tsx` (audited; no change),
`developer-workspace/scripts/LAUNCH-001/keyboard-check.mjs`,
`developer-workspace/scripts/LAUNCH-001/grayscale-check.mjs`.
**Size:** M (8 product files; 1 audited).
**Done (2026-10-27):** Public inventory keyboard walk passes 38 checks at 1440/390: filter group
and checkbox, sort, view, paging, car round trip and the native WhatsApp dialog are operable;
focus stays on the control, `#ttl` has a visible ring, Escape returns focus to the dialog trigger.
The live region carries the count only (400 ms settle, no price pitch); clear all keeps focus and
announces the cleared count. The view has an inset pressed ring; the current page is underlined;
Share names its car; the duplicate list image link left the tab order. Grayscale pass 13 checks:
view/pager/filter cues, state chip text, empty-state text and live region, Share success toast,
car detail state text; 0 console/page errors. `verify` on `/` and `/inventory` at 390/560/820/1440:
one h1, canonical, overflow 0, 0 console/page errors, tabs 6→6, Chromium 1→1. Tests 513 pass,
0 fail; typecheck and build pass. Office inventory: live `pgstatus` count, `aria-pressed` chips,
clear/undo focus recovery, `.in:focus-visible`, nav `aria-current` and weight cues; typechecked and
built, but `/office/inventory` is signed out so the office runtime keyboard/screen-reader pass is
NOT RUN — it belongs to the owner/testing session. Evidence:
`developer-workspace/reports/LAUNCH-001-task7.md`.

**Checkpoint 2 — inventory slice**
- [x] B2, C2, C4, G2, G3 pass. C4 is the public inventory runtime; the office C4 is in the
      owner/testing session.
- [x] Keyboard walk recorded; no visual regression at 390 / 560 / 820 / 1440. Owner look check
      pending.

---

### Phase 3 — Car slice

#### Task 8 — Car metadata, canonical and social image

**Covers:** 2.2 (car), 2.3 (sold/unknown), 2.8 (car fallback).
**Description:** Car titles and descriptions from public fields, absolute canonical, the cover photo or
the default social image, and honest metadata for sold and unknown cars.

**Acceptance criteria:**
- [x] Title names year, make and model; description includes public price and mileage.
- [x] Canonical is absolute; OG image is the cover photo or the default.
- [x] Sold and unknown cars are not presented as normal indexable cars.

**Verification:**
- [x] Runtime checklist B3, B5, B6.
- [x] Browser procedure on a live car, a sold car and a made-up reference.
- [x] Unknown reference returns a real 404.

**Dependencies:** 2.
**Files:** `app/(site)/car/[ref]/page.tsx`, `lib/public-cars.ts`,
`developer-workspace/scripts/task-005/car-404.mjs`.
**Size:** S/M (2 product files + 1 runtime script).
**Done (2026-10-27):** live `TS-1001` has a title naming year/make/model, a description with
₦34,500,000 and 31,000 km, absolute canonical `/car/TS-1001`, cover 1200×630 OG/Twitter and no
noindex. Sold `TS-1025` has `Sold — …`, the price/mileage description, canonical
`/car/TS-1025`, cover, and `robots: noindex, nofollow`; the sold view is unchanged. Unknown
`TS-9999` is a real 404 with `noindex`; unlisted `TS-1029` (price, 0 photos) is a 404 through
the new `getPublicCarForView` gate (FN-001). The extended attach-only script passes 26 checks;
tabs 6→6; no Chrome launched. Tests 513 pass; typecheck and build pass. The null-`soldAt`
fallback and section-only sold branch are code-only (no matching rows). Evidence:
`developer-workspace/reports/LAUNCH-001-task8.md`,
`developer-workspace/scripts/task-005/car-404.mjs`.

#### Task 9 — Vehicle/Offer JSON-LD

**Covers:** 2.7.
**Description:** Emit Vehicle/Offer JSON-LD from the same public car object the page renders, with NGN
price, availability, seller and image; a sold car emits no available Offer.

**Acceptance criteria:**
- [x] JSON-LD has `@type` Vehicle and the public make, model, year, mileage, colours, price, currency,
      availability, seller and image.
- [x] No cost, private note or customer value appears.
- [x] Sold car emits no available Offer.

**Verification:**
- [x] Runtime checklist B4, B5.
- [x] Unit test for the structured-data builder; browser parse of the JSON-LD.
- [x] No private field appears in the JSON.

**Dependencies:** 8.
**Files:** `lib/structured-data.ts`, `lib/structured-data.test.ts`,
`app/(site)/car/[ref]/page.tsx`, `developer-workspace/scripts/task-005/car-404.mjs`.
**Size:** M (3 product/test files + 1 runtime script).

**Done (2026-10-27).** Live `TS-1001` renders one Vehicle with an `InStock` Offer; sold `TS-1025`
renders a Vehicle with a `SoldOut` Offer. Browser check 34/34; 522 tests; typecheck and build pass.
The `on order`, `landed`, section-only sold, sale-marker-only sold, no-photo and null-field paths are
unit-tested. No private or office-only field appears. Evidence:
`developer-workspace/reports/LAUNCH-001-task9.md`.

#### Task 10 — Car images and heading order

**Covers:** 7.2 (car), 3.3 (car part).
**Description:** Car gallery and related-card images at display size with reserved space and lazy
loading; one `<h1>` and no skipped heading level on the car page.

**Acceptance criteria:**
- [x] Gallery/related images request display-sized transformations.
- [x] Reserved dimensions; broken image placeholder occupies the same space.
- [x] Exactly one `<h1>`; heading order below it does not skip.

**Verification:**
- [x] Runtime checklist G1, G2, G3, C3 (car). G2/G3/C3 pass; G1 recorded at LCP 6.9 s, CLS
      0.001 (2.5 s target not met in the local cold run; INP not lab-measured).
- [x] Browser procedure at 390/560/1440; inspect image requests.
- [ ] No visual regression. Runtime geometry and requests pass; the owner look check is pending.

**Dependencies:** 9.
**Files:** `app/(site)/car/[ref]/page.tsx`, `components/Photo.tsx`,
`components/site/CarBehaviors.tsx`, `lib/photo-url.ts`, `lib/photos.test.ts`,
`developer-workspace/scripts/LAUNCH-001/car-images.mjs`. (`ReferenceCard.tsx` was not changed: the
car page’s related cards are the inline `.rc` cards, not `ReferenceCard`.)
**Size:** M (5 product/test files + 1 runtime script).

**Done (2026-10-27).** Live main requests 640w at 390/560 and 960w at 1440; thumbs 320×180 and
related 580×320, lazy; sold hero 840×525. Broken gallery keeps the same `.gal`/`#gi` boxes and drops
the dead address. One `<h1>` and no skipped heading level on live and sold at all three widths.
Browser check 44/44; 523 tests; typecheck and build pass. Lighthouse mobile lab: LCP 6.9 s, CLS
0.001; the LCP element is the correctly sized, high-priority gallery image, and the cold Clerk
handshake dominates TTFB. Owner visual look pending. Evidence:
`developer-workspace/reports/LAUNCH-001-task10.md`.

**Checkpoint 3 — car slice**
- [ ] B3–B6, C3 (car), G2–G3 pass; G1 recorded (LCP 6.9 s, CLS 0.001; 2.5 s target not met in the
      local cold run; INP not lab-measured). Tasks 8–10: B3–B6, C3, G2 and G3 pass.
- [x] Sold and unknown behavior recorded (Tasks 8–10; live, sold, unlisted and unknown references).
- [ ] No visual regression on the car page. Task 10 runtime geometry and image requests pass; the
      owner look check is pending.

---

### Phase 4 — Machine-readable surface

#### Task 11 — robots.txt and sitemap.xml

**Covers:** 2.4, 2.5.
**Description:** Dynamic robots and sitemap routes from the public car source; private surfaces
disallowed; sold, deleted, draft and unknown cars absent.

**Acceptance criteria:**
- [x] `robots.txt` allows the public showroom, disallows `/office/` and `/api/`, names the sitemap.
- [x] `sitemap.xml` lists home, inventory, privacy and every currently listed car; absolute URLs.
      `/terms` is temporarily omitted until Task 13 (the route does not exist yet; recorded below).
- [x] Sold, deleted and draft cars do not appear; unknown car URLs are not listed.

**Verification:**
- [x] Runtime checklist B7, B8.
- [x] Browser fetch of both routes; parse XML.
- [x] Compare the sitemap car set with the public car set.

**Dependencies:** 2, 5, 8, 13 (terms route must exist before it is listed).
**Files:** `app/robots.ts`, `app/sitemap.ts`,
`developer-workspace/scripts/LAUNCH-001/sitemap.mjs`. (`lib/public-cars.ts` was not changed: its
existing `getPublicCars()` is the filtered source.)
**Size:** S (2 routes + 1 runtime script).

**Done (2026-10-27).** `robots.txt` has the public allow, office/API disallows and the canonical
sitemap URL. `sitemap.xml` is dynamic, parses as XML, and carries 22 absolute URLs: `/`,
`/inventory`, `/privacy` and all 19 public cars. The car set equals `getPublicCars()`; sold
`TS-1025`, unlisted `TS-1029` and unknown `TS-9999` are absent. `/office` still 307s to sign-in; the
robots rule is not access control. No `lastModified` is emitted because the public read model has no
update timestamp. Runtime 18/18; 523 tests; typecheck and build pass. Terms omission recorded.
Evidence: `developer-workspace/reports/LAUNCH-001-task11.md`.

#### Task 12 — llms.txt

**Covers:** 2.6.
**Description:** Plain-text public truth: business, pages, inventory, Naira and WhatsApp rule; no office,
cost, private note, customer or demo-only data.

**Acceptance criteria:**
- [x] `/llms.txt` returns plain text with the public description, links, naira prices and contact
      rule. `/terms` is temporarily omitted until Task 13 (the route does not exist yet).
- [x] No forbidden token, cost, private note, customer value or office term appears.
- [x] The WhatsApp number is the configured public one; no invented number.

**Verification:**
- [x] Runtime checklist B9.
- [x] Scan the response against the leak-check forbidden list.
- [x] Browser fetch of `/llms.txt`.

**Dependencies:** 11.
**Files:** `app/llms.txt/route.ts`, `developer-workspace/scripts/LAUNCH-001/llms.mjs`.
**Size:** S (1 route + 1 runtime script).

**Done (2026-10-27).** `/llms.txt` is dynamic and returns plain text with the business name, public
description, canonical home/inventory/privacy links, the current 19-car count, the naira price rule
and the configured WhatsApp URL. B9 16/16; the forbidden-token scan and the office/demo/customer/
profit/cost/rate/kobo/currency scan both return zero hits. Tabs 4→4; 1 Chromium; no Chrome launched.
523 tests; typecheck and build pass. The `/terms` link is added with Task 13. Evidence:
`developer-workspace/reports/LAUNCH-001-task12.md`.

**Checkpoint 4 — machine-readable surface**
- [x] B7–B9 pass. B7/B8 in Task 11; B9 in Task 12. The llms.txt `/terms` link is added with the
      Task 13 page; the current links are home, inventory and privacy.
- [x] Sitemap includes terms only after Task 13; the temporary omission is recorded in the Task 11
      report.
- [x] No private value in any machine route. robots, sitemap and llms scanned; no office, cost,
      private-note, customer or demo-only term.

---

### Phase 5 — Legal and trust

#### Task 13 — Terms page (owner approval gate)

**Covers:** 5.1.
**Description:** Draft the terms from the real business rules; the owner approves the wording before it
is published. The page carries a last-updated date, owner/review record, metadata and a footer link.

**Acceptance criteria:**
- [x] Draft covers availability, price changes, the WhatsApp sale path, delivery and governing law
      (Federal Republic of Nigeria, Lagos). Approved by the owner as drafted on 2026-10-27.
- [x] Seller is “TrueSpec Automotive”; no registered name/RC supplied by the owner.
- [x] Owner approves the draft before the page is public. Approval recorded in the report.
- [x] `/terms` renders with a last-updated date and owner/review record; every public footer links it.
      E1/E2/E6 verified against the local production build.

**Verification:**
- [x] Runtime checklist E1, E2, E6 (terms part passes; privacy owner/review record is Task 14).
- [x] Browser procedure on `/terms`; footer link on home, inventory and a car page.
- [x] Owner approval recorded in `developer-workspace/reports/LAUNCH-001-task13.md`.

**Dependencies:** 2.
**Files:** `app/(site)/terms/page.tsx`, `app/(site)/terms/terms.css`, `app/(site)/layout.tsx`,
`lib/site.ts`, `app/sitemap.ts`, `app/llms.txt/route.ts`,
`developer-workspace/scripts/LAUNCH-001/terms.mjs`.
**Size:** M (6 files incl. 2 new + 1 runtime script). **Hard owner gate** — page now published after
approval; do not change wording without the owner.

**Done (2026-10-27).** `/terms` returns 200 with the approved copy, last-updated date and
owner/review record; the footer links it from home, inventory and the car page. Terms runtime
10/10; sitemap 18/18 and llms 16/16 now include `/terms`; 523 tests; typecheck and build pass.
Privacy's owner/review record is deferred to Task 14 (accepted NOT RUN for E6 privacy part).
Evidence: `developer-workspace/reports/LAUNCH-001-task13.md`.

#### Task 14 — Privacy notice alignment

**Covers:** 5.2, 5.5.
**Description:** Make the contact and deletion path real and consistent with the site; remove any
promise the site cannot keep; add the owner/review date.

**Acceptance criteria:**
- [x] The contact is the configured WhatsApp channel, consistent with the rest of the site.
- [x] The deletion path explains how a request reaches the owner and what the owner can remove.
- [x] No email address or self-service channel is promised.
- [x] Owner and last-updated date are present.

**Verification:**
- [x] Runtime checklist E3, E4, E6 — privacy part passes (runtime 8/8).
- [x] Browser procedure on `/privacy`; contact compared with header/footer.
- [x] No secret or customer data in the page.

**Dependencies:** 13.
**Files:** `app/(site)/privacy/page.tsx`, `lib/site.ts`,
`developer-workspace/scripts/LAUNCH-001/privacy.mjs`.
**Size:** S (2 files + 1 runtime script).

**Done (2026-10-27).** Privacy page now carries `pageMetadata`, "Last updated: 27 October 2026"
and "Owner: TrueSpec Automotive · Reviewed: 27 October 2026"; contact stays the configured
WhatsApp number; deletion path reaches the owner; no email/self-service promised. E3/E4/E6
runtime 8/8; 523 tests; typecheck and build pass. Evidence:
`developer-workspace/reports/LAUNCH-001-task14.md`.

#### Task 15 — Cookie/storage inventory and accessibility release check

**Covers:** 5.3, 5.4, 3.7.
**Description:** Record the actual browser storage and the no-analytics position; record WCAG 2.2 AA as
the target and the release check that includes keyboard and screen-reader passes.

**Acceptance criteria:**
- [x] Inventory matches the observed Clerk session cookie, theme preference, demo state and office
      device drafts; no unrecorded tracker.
- [x] Consent position says a banner is not required for this set; any non-essential tracker requires a
      consent and privacy review.
- [x] Accessibility release check records WCAG 2.2 AA, the pages, the keyboard pass and the
      screen-reader pass (NOT RUN with reason — separate testing session).

**Verification:**
- [x] Runtime checklist E5, C8.
- [x] Browser DevTools storage inspection on a fresh public session and an office session.
- [x] Release check reviewed against the accessibility spec.

**Dependencies:** 14.
**Files:** `docs/cookies.md`, `docs/accessibility.md`, `README.md`.
**Size:** S (3 files).

**Done (2026-10-27).** E5 storage inspected live on `:3210` (public) and `:3211` (office): only
Clerk session cookies and app localStorage (`ts-theme`, `ts-visits`, `ts-seen`, `ts-lastcar`,
`ts-known`), zero analytics/tracker cookies, no consent banner. C8 recorded WCAG 2.2 AA target,
pages tested, keyboard pass; screen-reader pass NOT RUN pending separate session. README added as
entry point. Evidence: `developer-workspace/reports/LAUNCH-001-task15.md`.

**Checkpoint 5 — legal and trust**
- [x] E1–E6 pass. E1/E2 verified for terms (runtime 10/10); E6 terms part passes; E6 privacy
      part passes (runtime 8/8) — no longer deferred.
- [x] Owner approved the terms wording (2026-10-27, as drafted).
- [x] No unrecorded tracker; no promise the site cannot keep. robots/sitemap/llms scanned; no
      analytics or email channel; privacy names WhatsApp only and does not promise self-service
      deletion.

---

### Phase 6 — Security and delivery

#### Task 16 — Security headers and CSP

**Covers:** 4.4, 4.5.
**Description:** One header configuration for content-type, framing, referrer, permissions and
transport security; a CSP that accounts for Clerk, Sanity images, Google Fonts and Font Awesome.
Start report-only, exercise the public pages and the anonymous office door, then enforce.

**Acceptance criteria:**
- [x] Documented headers are present on public responses.
- [x] CSP is present; after the local exercise it is enforcing, not report-only.
- [x] Public home, inventory, car, privacy and terms render with no CSP violation in the console.
- [x] Clerk sign-in page loads; fonts and icons load.

**Verification:**
- [x] Runtime checklist D6, D7 — 21/21, 0 CSP violations with enforcing CSP.
- [x] Browser procedure with console capture on all public routes and `/office/sign-in`.
- [x] No authenticated-only violation; no directive kept report-only.

**Dependencies:** 3, 5, 8, 13.
**Files:** `next.config.mjs`, `lib/security-headers.ts`, `docs/security.md`,
`developer-workspace/scripts/LAUNCH-001/security.mjs`.
**Size:** M (3 files). **High risk — isolated in its own commit.**

**Done (2026-10-27).** `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy`, `Strict-Transport-Security` present on every response. Enforcing CSP with
Clerk, Sanity, Clerk brand images and Unsplash backgrounds as named sources; zero console
violations on home/inventory/car/privacy/terms; `/office/sign-in` loads; fonts/icons load.
Runtime D6/D7 21/21. Evidence: `developer-workspace/reports/LAUNCH-001-task16.md`.

#### Task 17 — Lint and format

**Covers:** 4.1.
**Description:** Add ESLint and Prettier with committed configuration and scripts for application code,
scripts and tests. Format the tree once in a separate mechanical commit so the check can be green.

**Acceptance criteria:**
- [ ] `npm run lint` checks app code, scripts and tests; exits non-zero on a lint error.
- [ ] `npm run format:check` reports files without rewriting; exits non-zero on a mismatch.
- [ ] The mechanical format commit contains no logic change.

**Verification:**
- [ ] Runtime checklist D1.
- [ ] Run `npm run lint` and `npm run format:check`; both green.
- [ ] Inspect the mechanical commit diff for non-format changes.

**Dependencies:** 16.
**Files:** `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `package.json`.
**Size:** M (4 files) plus one mechanical formatting commit.

#### Task 18 — Playwright smoke test

**Covers:** 4.3.
**Description:** One browser smoke test for home, inventory, a public car page and the anonymous office
door, run as a documented pre-merge job against the local/demo branch.

**Acceptance criteria:**
- [ ] Home, inventory and a car page load and show their main heading.
- [ ] An anonymous office request is sent to sign-in and no office data is rendered.
- [ ] The test runs against a local build; no database secret is required in GitHub.
- [ ] The pre-merge command is documented.

**Verification:**
- [ ] Runtime checklist D5.
- [ ] Run the smoke test locally against `:3210`.
- [ ] No production data is written.

**Dependencies:** 17.
**Files:** `playwright.config.ts`, `e2e/smoke.spec.ts`, `package.json`,
`docs/release-checklist.md`.
**Size:** M (4 files).

**Checkpoint 6 — security and delivery**
- [ ] D1, D5, D6, D7 pass. D6/D7 pass (Task 16, 21/21, 0 CSP violations); D1 waits for Task 17,
      D5 waits for Task 18.
- [x] No CSP violation on the exercised routes.
- [ ] Lint and format green; smoke test green.

---

### Phase 7 — Launch operations

#### Task 19 — Error tracking with scrubbing

**Covers:** 6.2.
**Description:** Wire Sentry behind an optional `SENTRY_DSN`; capture server and client errors with
route, release and error type; scrub customer names, phone numbers, costs, private notes, cookies and
environment values.

**Acceptance criteria:**
- [ ] With no DSN, the app builds and runs with no error-tracker network call.
- [ ] Server and client errors are captured with route, release and type.
- [ ] The scrubber removes known sensitive fields before transmission.
- [ ] No secret or customer value is sent.

**Verification:**
- [ ] Runtime checklist F2 (or NOT RUN with code evidence if no DSN is configured).
- [ ] Unit test for the scrubber with a fake customer/cost payload.
- [ ] Build and typecheck pass.

**Dependencies:** 16.
**Files:** `lib/error-tracking.ts`, `lib/error-tracking.test.ts`, `instrumentation.ts`,
`instrumentation-client.ts`, `package.json`.
**Size:** M (5 files). **High risk** — isolate.

#### Task 20 — Uptime monitor and alert owner

**Covers:** 6.1.
**Description:** Document the UptimeRobot monitor for the public showroom: URL, interval, failure
threshold, alert owner and test-alert path. The owner creates the account and monitor.

**Acceptance criteria:**
- [ ] The monitor checks a public page on a schedule; it needs no office session and no database write.
- [ ] The alert owner is named; the failure threshold is recorded.
- [ ] A test-alert path is documented; the healthy site is not noisy.

**Verification:**
- [ ] Runtime checklist F1 (owner dashboard; if not set up, NOT RUN with the documented setup).
- [ ] The monitor URL is a public route that returns 200.
- [ ] No production outage is caused by the test.

**Dependencies:** 19.
**Files:** `docs/monitoring.md`, `README.md`.
**Size:** S (2 files).

#### Task 21 — Rate-limit record and demo identity lifecycle

**Covers:** 6.3, 6.4.
**Description:** Record the boundary for every unauthenticated write: Clerk sign-in, the tap WAF rule,
demo sign-up and any public form. Record the demo identity lifecycle.

**Acceptance criteria:**
- [ ] Each unauthenticated write has an enforced limit or a dated owner acceptance with a reason.
- [ ] Clerk sign-in limits, the tap WAF rule and demo sign-up limits are named.
- [ ] Demo identities live until the owner removes them; daily reset never touches identities, main rows
      or main assets.
- [ ] Manual removal steps in Clerk are documented.

**Verification:**
- [ ] Runtime checklist F3–F6.
- [ ] Code inspection of the tap and demo paths; existing tests as helper.
- [ ] No main identity is deleted by any demo cleanup.

**Dependencies:** 20.
**Files:** `docs/rate-limits.md`, `docs/demo-lifecycle.md`.
**Size:** S (2 files).

#### Task 22 — Environments, preview isolation and rollback

**Covers:** 6.5.
**Description:** Define local, preview and production; preview uses the demo Neon branch and the
`preview` Sanity dataset; no separate staging environment; document migrations and deployment rollback.

**Acceptance criteria:**
- [ ] Preview does not point at the production database or the production asset store.
- [ ] The Vercel Preview values are named; the owner scopes them.
- [ ] A separate staging environment is recorded as not required.
- [ ] Rollback restores the previous deployment and states what happens to forward-only migrations.

**Verification:**
- [ ] Runtime checklist F7, F8.
- [ ] Inspect the documented Vercel environment names; no secret value in the doc.
- [ ] Preview build uses the demo branch; no production write.

**Dependencies:** 21.
**Files:** `docs/environments.md`, `README.md`.
**Size:** S (2 files).

#### Task 23 — Runbook and existing guarantees

**Covers:** 6.6, 6.7.
**Description:** Write the runbook for showroom outage, office sign-in failure, backup failure, demo
reset failure and suspected data exposure. Re-check the showroom/office and main/demo boundaries.

**Acceptance criteria:**
- [ ] Each failure has a first response, an owner and a containment/rotation path.
- [ ] The public showroom still reads main; the office resolves the signed-in space; no new route
      exposes private data.
- [ ] The existing backup, demo reset, tap and session rules still hold.

**Verification:**
- [ ] Runtime checklist F9, F10, H3.
- [ ] Browser procedure on the public showroom and the office door.
- [ ] Existing tests as helper; no main/demo regression.

**Dependencies:** 22.
**Files:** `docs/runbook.md`, `developer-workspace/reports/LAUNCH-001-operations.md`.
**Size:** S (2 files).

**Checkpoint 7 — launch operations**
- [ ] F1–F10 pass, or owner setup pending with a documented NOT RUN.
- [ ] Runbook reviewed; no secret in the docs.
- [ ] Existing guarantees hold.

---

### Phase 8 — Repository truth

#### Task 24 — README and `.env.example`

**Covers:** 1.1, 1.2.
**Description:** The root README is the entry point: product, public/office split, stack, directory map,
prerequisites, install, environment, migrations, seed, tests, build, deployment, main/demo, operational
commands and links to OpenSpec. `.env.example` names every variable, required/optional, with no secret.

**Acceptance criteria:**
- [ ] A new developer can follow the README to install, configure, migrate, seed, test and build.
- [ ] Every variable used by the app, scripts, cron routes and demo reset is named; required/optional
      is clear.
- [ ] `.env.example` contains only empty or obvious placeholder values.
- [ ] The README names which operational commands are safe against production.

**Verification:**
- [ ] Runtime checklist A1–A4.
- [ ] Scan `.env.example` and the README for real keys, tokens and connection strings.
- [ ] The clean-clone proof in Task 26 follows only the README.

**Dependencies:** 23.
**Files:** `README.md`, `.env.example`.
**Size:** M (2 files, substantial content).

#### Task 25 — Configuration error, changelog and handover

**Covers:** 1.3, 1.4, 1.5.
**Description:** Make the missing-variable error name the variable, `.env.example` and the README
section; add a changelog; add the developer handover.

**Acceptance criteria:**
- [ ] The error names the missing variable and points to `.env.example` and the README section.
- [ ] The changelog records the launch-foundations work with a date, newest first.
- [ ] The handover links the README, the OpenSpec changes, the registry, the environments, the
      deployment shape and the owner decisions.

**Verification:**
- [ ] Runtime checklist A2, A5, A6.
- [ ] Focused test for the configuration error; no secret in the message.
- [ ] Handover has no duplicated full content.

**Dependencies:** 24.
**Files:** `lib/config.ts`, `CHANGELOG.md`, `docs/handover.md`.
**Size:** M (3 files).

#### Task 26 — Clean-clone proof

**Covers:** 1.6.
**Description:** Clone into an empty directory, follow only the README, and run install, configure,
migrate, seed, test and build against the demo branch. Record every command and result.

**Acceptance criteria:**
- [ ] Every documented command works in the documented order.
- [ ] No production database or production asset store is written.
- [ ] Any missing step found in the README is fixed and re-run.

**Verification:**
- [ ] Runtime checklist A1.
- [ ] Report records the clone path, commands, results and any residue.
- [ ] The working tree is not used as the source of private setup knowledge.

**Dependencies:** 25.
**Files:** `developer-workspace/reports/LAUNCH-001-clean-clone.md`.
**Size:** S (1 file).

**Checkpoint 8 — repository truth**
- [ ] A1–A6 pass.
- [ ] Clean clone succeeds from the README alone.
- [ ] No secret in the README, `.env.example` or the reports.

---

### Phase 9 — Performance close-out and CI

#### Task 27 — Performance re-measure, cache policy and bundle budget

**Covers:** 7.1 (all pages), 7.4, 7.5, 7.6.
**Description:** Re-measure home, inventory and car pages on the agreed mobile profile; record the
public cache/revalidation policy; add a bundle report and a documented public-route budget.

**Acceptance criteria:**
- [ ] LCP, CLS and INP are recorded as lab data and compared with the targets; field data is labelled
      separately and not invented.
- [ ] The cache/revalidation policy matches the showroom's freshness requirement.
- [ ] The bundle command reports public route sizes and the budget; a breach is named in the release
      note.

**Verification:**
- [ ] Runtime checklist G1, G6, G7, G8.
- [ ] Lighthouse lab run on home, inventory and a car page.
- [ ] Bundle report output reviewed; no unexplained breach.

**Dependencies:** 26.
**Files:** `scripts/bundle-report.mjs`, `docs/performance.md`, `package.json`,
`developer-workspace/reports/LAUNCH-001-performance.md`.
**Size:** M (4 files).

#### Task 28 — Agent-run release checklist and handoff (last)

**Covers:** 4.2, 4.6, 4.7 (owner ruling: the checklist replaces the GitHub Actions gate).
**Description:** Turn the runtime checklist into the release pipeline: the agent attaches to the browser,
runs every check, records PASS/FAIL/NOT RUN with evidence, writes the handoff, and leaves the push to the
owner. Scripts are helpers; no single script and no GitHub Actions workflow is the gate.

**Acceptance criteria:**
- [ ] The checklist is the pipeline: every benchmark and failure state has a check, an expected result
      and evidence.
- [ ] The agent runs it in the browser after the changes; no check is claimed from a script alone.
- [ ] The handoff states what passed, what failed, what was not run, the residue, and that the owner
      decides whether to push.
- [ ] The dependency audit is a checklist item; a finding is fixed or has a dated owner acceptance.
- [ ] No `.github/workflows/ci.yml` gate and no branch protection.

**Verification:**
- [ ] Runtime checklist D2–D4, D8 as agent-run checks; the old unit suite is a helper.
- [ ] Run the helper commands locally; record the results.
- [ ] The handoff is written and contains no secret.

**Dependencies:** 27.
**Files:** `developer-workspace/procedures/LAUNCH-001-runtime-checklist.md`,
`developer-workspace/reports/LAUNCH-001-handoff.md`.
**Size:** S (2 files).

#### Task 29 — OpenSpec validation, release evidence and registry

**Covers:** 8.1, 8.2, 8.3.
**Description:** Run `openspec validate --all`, collect the release evidence, update the task registry
and the change task checkboxes, and write the honest report.

**Acceptance criteria:**
- [ ] `openspec validate --all` passes.
- [ ] The report lists every runtime check PASS / FAIL / NOT RUN with evidence, the owner approvals and
      the residue.
- [ ] The registry records LAUNCH-001 as built and leaves the independent testing phase to the owner.
- [ ] No push is made.

**Verification:**
- [ ] Runtime checklist H1–H3.
- [ ] Report reviewed for secrets and invented claims.
- [ ] `git status` shows only the intended files staged/committed.

**Dependencies:** 28.
**Files:** `openspec/tasks-registry.md`, `openspec/changes/launch-foundations/tasks.md`,
`developer-workspace/reports/LAUNCH-001-report.md`.
**Size:** M (3 files).

**Final checkpoint**
- [ ] Every runtime checklist item is PASS, or an accepted NOT RUN with reason and evidence.
- [ ] The report states what was built, what was verified and what was not.
- [ ] The working tree contains no accidental secret and no unrelated staged file.

---

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| The working tree has uncommitted DEMO-001/OpenSpec files | Staging the wrong file | Stage explicit paths only; never `git add -A`; inspect `git diff --cached` before each commit. |
| The browser procedure's Chrome is not running | No runtime gate | Stop and report; never launch a second browser or a headless one. |
| Font or image changes alter the approved look | Visual regression | Browser procedure at the approved widths, dark/light; owner look check; isolate the change. |
| CSP breaks Clerk or the font/icon stylesheets | Sign-in outage | Report-only first; exercise public + anonymous office; enforce only after no violations; name sources. |
| The terms wording is not approved | Illegal/unapproved public page | Hard owner gate: draft, show, wait; do not publish without approval. |
| Sentry/UptimeRobot/Vercel preview/Sanity preview dataset are not set up | F1/F2/F7 NOT RUN | Code ships with optional DSN and docs; record owner setup as pending; do not claim live monitoring. |
| The agent checklist depends on the browser | No release gate | Stop and report if CDP 9222 is missing; never launch a second/headless browser. |
| A real screen reader is unavailable on this machine | C8 NOT RUN | Record NOT RUN with the reason; the separate testing session does the screen-reader pass. |
| A repo-wide format creates a large diff | Review noise | One mechanical commit, no logic change; inspect the diff before committing. |
| The runtime checklist becomes a second test suite | Drift and brittleness | Keep it observable: route, action, expected result, evidence; no internal function names. |

---

## Owner setup gates

These are not code tasks; the build documents them and records them as pending until the owner does
them:

1. Create the Sentry project and add `SENTRY_DSN` to Vercel (Production and Preview).
2. Create the UptimeRobot monitor for the public URL; name the owner email; set the threshold.
3. Scope the Vercel Preview environment to the demo Neon branch and the `preview` Sanity dataset; create
   the dataset.
4. Approve the terms draft before it is published.
5. Push the commits; the owner handles pushes.
6. Run the independent LAUNCH-001 testing session (`testing.md`); the builder's runtime checklist is not
   that pass.

---

## Definition of done

- Every runtime checklist item is PASS, or an accepted NOT RUN with reason and compensating evidence.
- The terms page is published only with the owner's approval.
- The public showroom still reads main; the office still resolves the signed-in space; the main/demo
  isolation is unchanged.
- No new database table, no provider replacement, no product scope change.
- No secret in the repository, a commit, a log or a report.
- `openspec validate --all` passes.
- The report is honest about what was built, what was verified and what was not.
- Commits are local; no push unless the owner asks.
