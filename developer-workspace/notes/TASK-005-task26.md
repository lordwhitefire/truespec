# TASK-005 · Task 26 — A car with no photos, and a photo that failed

**Date:** 2026-10-18 · **Outcome:** done. **Deps:** —.

## What changed

- **`components/site/CarBehaviors.tsx`** — the gallery driver refuses to drive a gallery that does
  not exist. `show()` returns at the top when the car has no photos (its arithmetic was the
  machine text itself: `im.src = undefined` → a literal `"undefined"` src, `photo NaN` in the
  alt, `NaN / 0` in the counter — DR5), and `openLb()` does the same (via `set()`, the lightbox
  image was written `src="undefined"` even without ever opening it). Its failed-photo handler now
  lands the drawn box: `im.onerror` removes `sw` and sets `PHOTO_PLACEHOLDER`. That last part is
  load-bearing: with the load-time detection in place, the mount re-kick's second error no longer
  flips React's `failed` (already true — same state, no re-render), so without this handler that
  error would leave a broken icon where the fix would otherwise regress the car page.
- **`components/Photo.tsx`** — a load that failed **before hydration** is now detected as such:
  one mount-time check reads the element itself (`complete && naturalWidth === 0`, DR6 — the
  finished-without-pixels fact; a still-loading image is untouched by construction, `complete` is
  false while a load is in flight). This is the half Phase 2 proved failing (§R2.4: error events
  fired into a document with no listener — 13 events, 0 swaps; the showroom's cards and the
  gallery's thumbnails kept the browser's broken icon). Docstring updated to say where each
  failure arrives from.
- **`app/(site)/car/[ref]/page.tsx`** — the counter, the arrows and the thumbnails are drawn only
  when there is something to count / step / thumbnail: counter and thumbnails need ≥ 1 photo,
  arrows need ≥ 2 (DR5: "omit the photo counter, the arrows, and the thumbnails entirely"; a
  single photo keeps `1 / 1` and loses the arrows; more than one is unchanged). No photos → the
  framed drawn box alone.

## The one decision the task asked for: `Gallery.tsx` — **deleted**

It was dead code — no importer anywhere (`grep` for `components/Gallery` and `Gallery` tokens: only
its own definition; the `FooterGallery` in `app/(site)/layout.tsx` is a different, local thing) —
and its empty case printed "No photo", contradicting DR5 and the FIX-002 closure. The real gallery
is the server markup (`page.tsx`) plus `CarBehaviors`. Making it "the real gallery" would have
restructured a working, witnessed gallery for no visitor-visible gain. Deleted (`git rm`).

## Files-line notes (the AC governs; Task 13 precedent)

- The plan's Files line named `Photo.tsx`, `page.tsx`, `car.css`, `Gallery.tsx`. **`CarBehaviors.tsx`
  is not named but the AC requires it** — the `undefined`/`NaN` machine text is produced there
  (src/alt/counter and the lightbox write), so "no machine text … reachable" cannot hold without
  its guards. The fix landed there (plus in the two named components).
- **`app/(site)/car/car.css` — no change needed.** Hiding the counter/arrows/thumbnails is
  conditional rendering, not CSS; the box keeps its existing `.gal` / `.gal img` rules.

## Live readings — read-only; CDN images blocked for legs C/D, block lifted in the `finally`

`photo-box.mjs`; fixture lister `photo-fixtures.ts` (read-only store query). Chrome 3 → 3.

| reading | before | after |
|---|---|---|
| A. no photos (TS-1029) — the box | `#gi` src `undefined` (path `…/car/undefined`, alt `… photo NaN`) | **drawn box (`data:image/svg…`), alt `… photo 1`** |
| A. counter / arrows / thumbnails | `NaN / 0` · 2 arrows · thumbs container present | **absent · 0 · absent** |
| A. click the box | lightbox opens, `#li` src `undefined` | **nothing opens (`lbOpen: false`)** |
| A. machine scan (innerText + every img src/alt) | `NaN` in text; `gi: undefined`, `li: undefined`; alt `… photo NaN` | **clean** |
| B. one photo (TS-1033) | `1 / 1` · **2 arrows** · 1 thumb | `1 / 1` · **0 arrows** · 1 thumb |
| C. broken at load (TS-1001; all `*sanity.io*` blocked before the load) | `#gi` drawn (see honest notes), but all 3 thumbnails **broken** (`cdn…`, nw 0) | **`#gi` drawn; all 3 thumbnails drawn** |
| D. the showroom's cards, same block | 23 imgs — **0 drawn, 23 broken** | **23 drawn, 0 broken** |
| console errors | 2 × 404 (the `src="undefined"` fetches) | **none** |

`galRect` 832×499 on every leg, before and after. Readings `runs/task26/before.json` /
`after.json`.

## Verification

`npm run typecheck` clean · `npm test` **295/295** · live drive (below) · grep across
`app|components|lib`: no `"1 / 0"` anywhere; no rendered `No photo` (the string went with
`Gallery.tsx` — the only remaining mentions are the new source comments explaining what must not
appear, and existing `Number.isNaN` guards) · runtime machine-text scan clean on both affected
paths · read-only: no store row written; the CDN block lived only in the drive's browser session
and was lifted.

## Honest notes

- **The box's alt is interim.** With the NaN rewrite gone, the no-photo box's alt is the photo's
  own description (`… photo 1`). DR6's "alt names the car, never 'photo 1'" and D7.4/E2's
  "marked decorative (`alt=""`)" meet in **Task 27**, whose AC is exactly the marked-decorative
  box — the gradient resolves the alt for the box state. No new copy was invented here (drafted
  wording would need approval before landing).
- **Pre-fix, leg C's `#gi` already swapped — by accident.** On mount, `CarBehaviors` re-kicks the
  first image (a 220 ms delayed re-set); the fresh error hit a hydrated React and `onError`
  swapped it. What stayed failing was everything never re-kicked: the three thumbnails and the
  showroom's 23 cards (the §R2.4 half). After the fix the swap is the detection itself, and the
  handler makes it hold even where the re-kick races React's state.
- The `pg` fixture lister prints a security-mode deprecation warning — tool noise (`pg` package),
  not an app change; it also connected fine.

## Files touched

`components/Photo.tsx` · `components/site/CarBehaviors.tsx` · `app/(site)/car/[ref]/page.tsx` ·
`components/Gallery.tsx` (**deleted**) · `developer-workspace/scripts/task-005/photo-box.mjs` ·
`developer-workspace/scripts/task-005/photo-fixtures.ts`
