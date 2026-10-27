# LAUNCH-001 Task 10 — Car images and heading order

**Status:** code and runtime checks done; the owner’s visual look and the G1 LCP target remain open.

## What changed

- `lib/photo-url.ts` — `carGallerySrcSet(url)` builds the gallery’s 640/960/1440-wide
  candidates at the gallery’s 5:3 crop, each with `w`, `h`, `fit=crop`, `auto=format` and `q=75`.
- `lib/photos.test.ts` — one test pins the three candidates, their heights (384/576/864), the
  `w` descriptors and the crop.
- `components/Photo.tsx` — a failed or empty slot no longer keeps a `srcSet`; the drawn box is the
  final state. Callers without `srcSet` are unchanged.
- `components/site/CarBehaviors.tsx` — the initial photo and every thumb step now write a
  display-size `src` (`1200×720`) and the same `srcSet`; a failed photo drops both `src` and
  `srcset`. The lightbox still loads the original on open (full-screen viewer, not an in-flow slot).
- `app/(site)/car/[ref]/page.tsx` —
  - live gallery: `srcSet` 640/960/1440, `sizes="(max-width: 1000px) calc(100vw - 48px), 832px"`,
    `sized={1200×720}`, `fetchPriority="high"`, `decoding="async"`;
  - thumbnails: `sized={320×180}`, `loading="lazy"`, `decoding="async"`;
  - live and sold related cards: `sized={580×320}`, `loading="lazy"`, `decoding="async"`;
  - sold hero: `sized={840×525}`, `height: auto` with the existing 16/10 box, `fetchPriority="high"`.
- Heading order needed no change: the live and sold car pages already had exactly one `<h1>` and no
  skipped level. The runtime check now pins both.

## Verified

- `npm test` — 523 pass, 0 fail, 10 suites.
- `npm run typecheck` — pass.
- `npm run build` — pass; server restarted on `:3210`.
- `developer-workspace/scripts/LAUNCH-001/car-images.mjs` — 44/44 at 390 / 560 / 1440:
  - live main: `currentSrc` 640w at 390 and 560, 960w at 1440; `width`/`height` 1200/720; `sizes`
    present; rendered box 342×205, 512×307, 832×499; `naturalWidth` is the density-corrected CSS
    width (342/512/832), not the request width.
  - live thumbs: 3, each 320×180, lazy, with reserved boxes.
  - live related: 11, each 580×320, lazy, with reserved boxes.
  - sold hero: 840×525 at every width; box 390×244 / 420×263 / 420×263.
  - sold related: 4, each 580×320, lazy.
  - thumb step: the second photo requests the 960w candidate, `srcset` updates, `alt` ends
    “photo 2”.
  - headings: live one `<h1>` “Toyota Camry XSE V6 2021”; sold one `<h1>` “That one found a new
    owner”; no skipped level at any width.
  - broken gallery: `.gal` 832×499 and `#gi` 890×534 before and after (the `#gi` box is the 1.07
    scale animation); `src` and `srcset` are dropped; the placeholder occupies the same space.
  - tabs 4→4; 1 Chromium; no tab opened; no Chrome launched; no unexpected console or page errors.
- `car-404.mjs` from Task 9 remains 34/34; the image change did not alter the 404/sold metadata
  behavior.
- Lighthouse mobile lab on `/car/TS-1001` (separate headless process, not the owner’s tab):
  performance 0.39, **LCP 6.9 s**, **CLS 0.001**, TBT 1.57 s, FCP 2.8 s, SI 6.9 s. INP is not
  measured in a lab run. The LCP element is `#gi`, already a 640w/19 KB request with
  `fetchpriority=high`; the breakdown is 2.4 s TTFB (cold Clerk dev handshake: two 307s), 1.2 s
  image load, 57 ms render delay. The 2.5 s LCP target is **not met** in this local cold run.

## Not verified / caveats

- The owner’s visual look at the car page remains pending. Runtime geometry and requests pass; this
  is not a visual sign-off.
- G1 is recorded above the LCP target. The gallery image itself is correctly sized and prioritized;
  the cold Clerk handshake dominates TTFB. This is a release-baseline caveat, not an image-size
  regression. Production field data is not available.
- The lightbox (`#li`) still requests the original when opened. It is a full-screen viewer, not an
  in-flow gallery slot; a width-only derivative would be a follow-up if wanted.
- The site-wide footer gallery still requests three 1200×800 originals for 62×62 slots (~467 KB).
  That is outside Task 10’s car-page scope and is flagged for a follow-up / Task 28.
- The sold hero’s broken-image path is covered by the same `Photo` behavior and reserved box, but the
  script breaks the live gallery only.
- The `Photo` `srcSet` omission when boxed affects all callers only in the empty/failed state; the
  suite and build pass, and the car runtime is checked. Home/inventory were not re-run for this
  change.
- Changes are uncommitted; no commit or push was made.

## Evidence

- `developer-workspace/scripts/LAUNCH-001/car-images.mjs`
- `/tmp/opencode/car-images-task10.json`
- `/tmp/opencode/lighthouse-car.json`
- Server log: `/tmp/opencode/truespec-3210.log`
