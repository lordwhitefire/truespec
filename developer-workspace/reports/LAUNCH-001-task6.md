# LAUNCH-001 — Task 6 report

**Date:** 2026-10-27
**Scope:** inventory car-card images (runtime checklist G2/G3), plus the shared card image path.
**Status:** code and runtime checks pass; owner look check remains pending.

## What changed

- `lib/photo-url.ts` — new client-safe `sizedPhotoUrl()`. It adds `w`, `h`, `fit=crop`,
  `auto=format` and `q=75` to a Sanity CDN address and leaves non-Sanity addresses alone. It lives
  outside `lib/serialize.ts` so a client card does not pull the whole public-car serializer into
  its bundle.
- `components/Photo.tsx` — new optional `sized` prop. When set, the image address is transformed,
  and the intrinsic `width`/`height` are reserved on the `<img>`. A failed image still swaps to the
  placeholder and keeps the same reserved slot.
- `components/site/ReferenceCard.tsx` — default derivative 700×326; callers may override.
- `components/site/FeaturedSlider.tsx` — featured cards use 700×400. The strip always renders the
  widest three-card window; CSS shows 1, 2 or 3 at the breakpoints, so the card DOM no longer
  changes when the `per` state settles after hydration.
- `components/site/InventoryBrowser.tsx` — list rows use 516×330.
- `components/CarCard.tsx` — the currently unused card uses 640×480 for consistency.
- `components/site/HeroSlider.tsx`, `lib/photos.test.ts` — import `sizedPhotoUrl` from its new
  module.
- `app/reference.css` — featured-strip 1/2/3-column rules and the matching hidden-card rules.

## Verification

**Code gate (helper, not the release gate):** `npm test` 513 pass, 0 fail; `npm run typecheck`
pass; `npm run build` pass.

**Runtime procedure:** attach-only through CDP `:9222`, existing build tab, 390×823 and 560×900;
no new tab, no new browser, no screenshots. Tabs 6→6, Chromium 1→1 before and after.

- Inventory grid, 390 and 560: six sampled cards request
  `?w=700&h=326&fit=crop&auto=format&q=75`; all are `loading="lazy"`; the `width`/`height`
  attributes are 700/326; the slot is 342×159 at 390 and 512×238 at 560; the loaded image is
  700×326. CLS 0.0171 at 390, 0 at 560. Overflow 0, console/page errors 0.
- Inventory list, 390 and 560: six sampled rows request `?w=516&h=330`; lazy; slot 342×219 at 390
  and 512×327 at 560. CLS 0.0171 at 390, 0 at 560. Overflow 0, console/page errors 0.
- Home, 390 and 560: the featured strip renders three cards and requests `?w=700&h=400`; CSS shows
  one at 390 and two at 560; the inventory grid requests `?w=700&h=326`; all lazy. CLS 0 at 390 and
  0.051 at 560 (under the 0.1 target). Overflow 0, console/page errors 0.
- Broken-image test: all Sanity image requests aborted, then the inventory loaded and scrolled to
  the first card. The six card slots and card rectangles match the normal page (`sameSlot: true`,
  `sameCard: true`); the placeholder occupies the same space; overflow 0; page errors 0. The seven
  console errors are the deliberately aborted image requests.
- 820/1440 `verify`: home and inventory keep their title, canonical, one h1 and heading order;
  overflow 0; console/page errors 0; tabs 6→6; Chromium 1→1.

## Notes

- One post-build check initially hit an orphaned `next-server` still holding `:3210`. It served the
  previous build's HTML and returned 400 for that build's old webpack chunk. The old process was
  killed and the server restarted; every result above is from the new build, and the old-chunk 400
  did not recur.
- The owner's visual look check for the home/door changes remains pending. The visible card layout
  is 1/2/3 at 390/560/820/1440; no overflow at any checked width.
