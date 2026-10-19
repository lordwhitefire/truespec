# TASK-005 · Task 27 — The empty photo box is a gradient from the car's ref

**Date:** 2026-10-19 · **Outcome:** done. **Deps:** 26.

## What changed

- **`components/PhotoBox.tsx`** (new) — the drawn box itself. `photoGradient(refCode)` walks the
  reference code (`h = (h * 31 + charCode) >>> 0`, then one xor-shift/multiply avalanche with two
  different seeds) into **two muted stops** — hue anywhere on the wheel, saturation 22–31% /
  30–41%, lightness 18–23% / 28–34% — so the same car always shows the same pair (no
  randomness, no clock, no per-render drift) and adjacent references walk far apart (the
  un-mixed walk put TS-1029/TS-1030 one degree apart; measured after mixing: 155° vs 119°).
  `<PhotoBox refCode>` renders `div.pbox`, `aria-hidden="true"`, the gradient inline. The hash
  moves to `lib/photo-gradient.ts` with its own tests in Task 28; this file then imports it.
- **`components/Photo.tsx`** — new optional `boxRef?: string`. When set, the box is rendered as a
  **prior sibling of the img** and boxed states (`!src || failed`) render the image **transparent
  and silent**: no `src` attribute at all and `alt=""`. When a photo is present it paints over
  the box; when it is still in flight it has not painted yet, so the box shows through until its
  first frame — one rule for "no photo" and "photo failed", and the loading case needs no JS
  (E2's "cleared on load" is satisfied in effect, not by a removal step — recorded below).
- **`app/(site)/car/[ref]/page.tsx`** — the gallery's `#gi` slot passes `boxRef={car.ref}`. It is
  the only slot with a box; the sold view's bare `Photo` is unchanged.
- **`components/site/CarBehaviors.tsx`** — the driven-failure handler now lands the **boxed
  state**, not the placeholder: `im.onerror` removes `src` **and clears `alt`**, dropping the
  `PHOTO_PLACEHOLDER` import. Clearing the alt is load-bearing: `set()`'s re-kick writes
  `im.alt` directly, and React's second `setFailed` is a bail-out (already true) — measured
  without it, the failed slot ended `alt="… photo 1"` (the photo is gone, the name is not).
- **`app/(site)/car/car.css`** — `.pbox { position: absolute; inset: 0; }` and `.gal img` gains
  `position: relative`. The box is a prior sibling of the image, so both positioned with
  z-index auto paint in DOM order — **the image above the box**; the ribbon/arrows/counter
  (z 2/3) stay above both. No other rule touched.

## Why a gradient, and behind rather than instead

The AC (statements 18/19, testing.md group 11) asks that the box "look like a photo", be "a
gradient of different colours — not a flat grey", keep the same shape/size, not animate, and be
decorative. D7/E2 ask for "a gradient of different colours" from the car's own reference, sitting
**behind the image slot**: the photo paints over it when it loads, and the box shows through
whenever the slot is empty or the image failed. That is also why nothing is ever "cleared": a
boxed slot's image is transparent at the source (`src` removed, `alt=""`) — there is no layer to
take down when a photo arrives.

## Files-line notes (the AC governs; Task 13 precedent)

- The plan's Files line named `PhotoBox.tsx`, `Photo.tsx`, `page.tsx`, `car.css`. **`CarBehaviors.tsx`
  is not named but the AC requires it**: the mid-session (driven) failure path ends there — with
  the placeholder, a failed re-kick would put the grey SVG over the gradient; with `src` removed
  but the alt left behind, the box would still be announced. Both were measured and fixed there.
- `car.css` **is** used as planned: the box and the paint order are CSS, not conditional rendering
  (Task 26's counter/arrows were the opposite case).

## Live readings — read-only; CDN blocked for leg D, block lifted in the `finally`

`photo-gradient.mjs`; Chrome 3 → 3.

| reading | before | after |
|---|---|---|
| A. no photos (TS-1029) — the box | flat grey SVG (`#eef0f2`), announced (role `image`, name `… photo 1`) | **gradient** `linear-gradient(135deg, rgb(41,66,56), rgb(61,48,105))` (green → violet) |
| A. `.pbox` | absent | present · `aria-hidden="true"` · animation **none** · 832×499 (= `#gal`) |
| A. the slot in the AX tree | `role: image`, **ignored: false**, name `… photo 1` | `role: none`, **ignored: true**, no name · `.pbox` also **ignored** |
| A. reload · 1.3 s calm | — | **identical gradient** · unchanged after 1.3 s |
| B. no photos (TS-1030) | the same flat grey | **its own gradient** `rgb(41,66,41) → rgb(90,109,55)` (green → olive), different from A |
| C. photographed (TS-1001) | photo | **the photo over its own box** (`rgb(69,52,39) → rgb(49,76,94)` behind it) · `#gi` announced with its alt (a real photo) |
| D. TS-1001 with `*sanity.io*` blocked before the load | grey SVG placeholder | **the box** — the same colours as C (same car) · `#gi` silent (`alt=""`, no `src`, `role: none`, ignored) |
| layout | `galRect` 832×499 | `galRect` 832×499 on every leg — no shift |
| console errors | — | none |

Two distinct colours per car (never a flat grey) · same car, same pair after reload · two cars,
two pairs · no animation · geometry equal to a photographed car · no broken image or machine text
in the failed state.

## Verification

`npm run typecheck` clean · `npm test` **295/295** · live drive above (`runs/task27/before.json` /
`after.json`, sample frames beside them) · read-only: no store row written; the CDN block lived
only in the drive's browser session and was lifted in the `finally`.

## Honest notes

- **E2's "cleared on load" is met in effect, not in code.** No JS removes the box when a photo
  paints — the box is *behind* the image, and the photo's own paint covers it (and a loading
  image has no frame yet, so the box shows through while it waits). Recorded as a deviation in
  form, not in behavior: nothing shimmers, nothing flickers, and there is no second state.
- **The failed-slot alt needed the handler.** React renders the boxed state once
  (`alt=""`, `src` gone); `CarBehaviors.set()` then writes `src` and `alt` directly for the
  re-kick, the re-kick's error fires `onerror` (src removed) and React's second `setFailed`
  bails — so the alt would stay written without the handler clearing it. Measured: before the
  handler change, leg D read `alt="Toyota Camry XSE 2021 photo 1"` with no `src`; after,
  `alt=""`, `ignored: true`.
- **Screen captures in this attached browser are fragile.** Element screenshots never settle
  (the page's infinite `shine`/`pulse` animations keep Playwright's stability wait running);
  PNG-from-clip hangs; a clip-based JPEG lands offset from the requested region; one capture
  stalled for 14 minutes without answering. The drive's `shot()` now takes a full-viewport CDP
  JPEG (with the gallery centred in it) under a 15 s deadline, retrying once on a fresh CDP
  session. The sample frames are viewport images, not tight crops.
- **A ~10 px light glyph at TS-1001's gallery top-left in the captures — pre-existing, not from
  this task.** It is present in the BEFORE frame (Task 26 code, same corner), absent from the
  boxed cars' frames, and there is **no node at that point** (`DOM.getNodeForLocation` found
  none), no image in the document is broken (`complete && naturalWidth === 0`: none — `#gi`'s
  own broken-at-load path is `src`-less and silent), and the instrumented page logged **no image
  errors at all**. It reads as a paint artifact of this long-running attached browser's
  captures (the same session that drops clip captures); the live-pages sample is the
  owner's check. Nothing in the page's DOM or AX tree backs it.
- The sold view's bare `Photo` and the showroom's cards keep the shared placeholder — the box's
  AC is the gallery slot; only `#gi` passes `boxRef`.

## Files touched

`components/PhotoBox.tsx` (**new**) · `components/Photo.tsx` ·
`app/(site)/car/[ref]/page.tsx` · `components/site/CarBehaviors.tsx` · `app/(site)/car/car.css` ·
`developer-workspace/scripts/task-005/photo-gradient.mjs`
