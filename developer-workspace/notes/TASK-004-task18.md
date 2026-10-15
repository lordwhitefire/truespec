# TASK-004 · Task 18 — the photos: bytes in, references stored, a placeholder when they are gone

**Date:** 2026-10-15 · **Status:** done (gates green, committed)
**Authority:** `openspec/tasks/TASK-004/task.md` truth 7 (lines 122–128: assets upload independently of
the car and rows link on save; the reference column never holds an address; EXIF stripped at the write
boundary with a size cap and no derivative pipeline; a missing asset or an unreachable store renders
the placeholder rather than breaking the page), and line 245 ("no price or no photo means not yet
listed" — a draft, not a refusal); `specs/media`; `migrations/0013_photo_origin.sql` (the `origin`
vocabulary); plan row 18.

## What was built

**`lib/photo-rules.ts`** (new) — the half of the rules that does not touch bytes, kept apart from
`lib/photos.ts` the same way `lib/session-rules.ts` sits apart from `lib/session.ts`, so a client
component may hold it: `PHOTO_MAX_BYTES` (15 MB), `PHOTO_TYPES` / `isPhotoType` (jpeg, png, webp),
`isAssetRef` (the one reference shape — a web address cannot pass, which is truth 7's own rule), and
`checkPhotoSize(bytes)` (the cap, callable from a `File.size`).

**`lib/photos.ts`** (new) — the byte boundary: `preparePhoto(bytes, type)` measures, then strips, then
hands the bytes back. `stripJpeg` walks the markers before the scan and drops the Exif/XMP `APP1`
segments, copying the scan **verbatim** (the data after `FF DA` is not marker-structured, so it is not
walked); `stripPng` drops the `eXIf` chunk; `stripWebp` drops the `EXIF` and `XMP ` chunks and rewrites
the one RIFF length that counts them. Nothing here touches Sanity or the store.

**`lib/photo-write.test.ts`** (new, 11 tests) — the cap, the three types, the reference check, and the
strip, on bytes the test builds itself (a JPEG's marker walk, a PNG's chunks, a WebP's RIFF size).

**`app/office/actions/photo.ts`** (new, `"use server"`) — `uploadCarPhoto(form)`: session → cap →
`preparePhoto` → `uploadImage`. It names no car and writes **no row**; that is the point of truth 7's
order. An upload dropped before the form is saved is an orphan, and `lib/cleanup.ts` already exists to
report "an uploaded asset no row references" — so this file adds **no third `deleteAsset` caller**
(`lib/sanity.ts` states there are exactly two, and orphans are the cleanup job's business).

**`lib/car-create.ts` / `lib/car-update.ts`** — the photo set rides the one car write. Create numbers
the incoming list with `jsonb_array_elements_text(...) WITH ORDINALITY`, so position 0 is the cover and
every photo of a new car is an `owner upload`. Update reads the stored set as ordered
`[reference, origin]` pairs, resolves each submitted photo's origin from the car's own rows (so a
re-save **keeps** the source a photo already had, and only a photo the car did not have becomes an
`owner upload`), and replaces the set disjointly — upsert on `(car_id, position)`, delete
`position >= count` — the same proven shape the cost lines use. The set **in its order** is part of the
`changed` guard, so a reorder is a real write and a retry is still a true no-op. `photos` is a
**required** argument on both: the compiler then names every call site, which it did (five witnesses
and one test were updated), and no caller can forget the photos silently.

**`app/office/actions/car.ts`** — `readPhotos(form)` collects the repeated `photos` fields in order,
refuses anything that is not a reference, and de-duplicates; `photosExist(photos)` asks
`findImageAsset` about each one, refusing a reference the store does not hold (a row must never be saved
pointing at bytes that were never uploaded) and wording an unreachable store as a retry. **Photos are
optional on save** — a car with no photo is a draft (task.md:245), not a refusal.

**`lib/office.ts`** — `getOfficeCarForEdit` reads `car_photo` ordered by `position` into
`photos: { assetId, origin }[]`.

**`components/Photo.tsx`** (new, client) — the one image both the showroom and the office draw. It
falls back to a drawn inline-SVG stand-in (`data:` address, so it needs no network and cannot itself
fail) when the address is empty **or** the load fails, and stays an `<img>` with the attributes it was
given, so no layout or style around it moved. Wired into `components/CarCard.tsx`,
`components/Gallery.tsx` (stage and thumbnails), `components/site/ReferenceCard.tsx`,
`components/site/InventoryBrowser.tsx`, `app/(site)/layout.tsx` and `app/(site)/car/[ref]/page.tsx`
(the gallery, the thumbnails, the lightbox, the related cars, the sold view) — every remaining raw
`<img>` in `app/` and `components/` is now inside `Photo` itself.

**The office form** (`app/office/(shell)/car/car-client.tsx`) — the presentational drop zone became a
real `<label>` wrapping a real `<input type="file" multiple>`, so a click (or a drop) uploads at once
through `uploadCarPhoto`, with the cap checked from the one rule before the bytes leave the browser.
The dead Unsplash address builder is gone. Each photo renders through `Photo` **and** emits one
`<input type="hidden" name="photos" value={assetId}>`, so what a save posts is the ordered references
and never an address; the file input is deleted from the save's `FormData`, so a save does not carry
the image bytes across a second time. `app/office/(shell)/car/car.css` gained the two lines that make
the label a block and the input an invisible full-area target.

**`next.config.mjs`** — `experimental.serverActions.bodySizeLimit: "16mb"`. The Next.js 15 default is
**1 MB** for the whole action body, so a 15 MB photo could never have reached the action at all.

## Verified

**All five gates, in order, on the finished tree:**
`leak-check` PASSED — 18 public routes 200, no cost/currency/profit value, no asset or file reference,
no customer detail and no office state label on any of them; `typecheck` clean; **161/161 tests**
(141 pre-existing + 3 restored + 11 new in `photo-write.test.ts` + 6 new photo tests in
`car-update.test.ts`); `build` clean (17 routes); `store-freshness` PASSED (9 store-reading routes, none
prerendered, no cached database response). Dev was stopped by PID for the build and restarted on
`:3210` after.

**`developer-workspace/scripts/task-004/photo-write-check.ts` — 20/20 PASS**, against the live store:

- *the bytes*: a real image generated with `sharp` **carrying EXIF** (a control asserted first — a check
  for "no EXIF" proves nothing unless EXIF can be present at all) → `preparePhoto` reports it stripped →
  no EXIF in the bytes handed to the store → the asset store returns a **reference** (`isAssetRef`
  holds, no address) → `findImageAsset` finds it holding **exactly the prepared bytes** (784 = 784), so
  what was uploaded is what was prepared → `imageUrl` derives a `cdn.sanity.io` address on demand →
  the proof's own asset is deleted again in a `finally`;
- *the rows*, inside one transaction that is rolled back: photos land in arrival order at positions
  0,1 as `owner upload`s; a row's non-owner source set directly in the store **survives** a re-save
  while only the newly added photo becomes an `owner upload`; a reorder plus one new photo rewrites
  positions and bumps `version`; removing one deletes the vacant row leaving no gap; and the identical
  call again moves **nothing** (version 3 → 3, events 3 → 3) — the retry idempotence D18 leans on.
  After `ROLLBACK` the store holds no trace.

**`developer-workspace/scripts/task-004/photo-placeholder-check.mjs` — 6/6 PASS, three consecutive
runs**, in the real Chrome attached on CDP `:9222` (attach-only; UA has no `Headless`; **6 → 6** real
browser processes, so no Chrome was launched; no screenshots; detached on exit):

- `/car/TS-1001`: the gallery's `#gi` loads a real image (1200×800 from `cdn.sanity.io`), and the raw
  `image-…` reference is **not** what the browser fetches;
- forcing that image at bytes that do not exist makes the surface swap to the drawn placeholder and the
  placeholder **decodes and draws** (naturalWidth 200) — the missing-asset case, in a browser;
- the same on `/inventory`'s first card photo (16 card photos on the page).

## Not verified

- **The office photo UI was not driven in a browser.** Every office route is Clerk-gated and the owner's
  session is the only way in, so the drop zone, the upload action's happy path from a real click, and
  the hidden `photos` fields' round-trip through a real save were **not** exercised end to end. What
  stands behind them is the typecheck, the action's own validation read back, the statement-level
  witness above and the browser-proved placeholder in the showroom.
- **No file over the cap was sent through the real action.** The cap is proved at the rules level
  (`checkPhotoSize`) and the byte boundary is measured by the witness, but `bodySizeLimit: "16mb"` was
  configured, not exercised with a real 15 MB upload — the Clerk-gated action is the only door to it.
- **The `src` empty branch of `Photo`** (placeholder when there is no address at all) is reasoned, not
  browser-proved: no public car can reach a page with no photo (`isListed` requires one). The `failed`
  branch — the one truth 7 actually names — is the branch the browser check proves.
- The office form's client component and the upload action have **no unit tests** (the project has no
  component test setup; the office client components have never been unit-tested).

## Findings worth keeping

- **`lib/photos.test.ts` already existed** and was about the *read* side — the one derivation from a
  stored asset id to the CDN address (`serialize.resolvePhotoUrl`) — not about these rules. This task
  initially overwrote it; the suite count (144 → 152 rather than 155) is what caught it. It was restored
  from `HEAD` and the new tests were moved to **`lib/photo-write.test.ts`**, so the two boundaries keep
  two separate proofs and neither can quietly rewrite the other's. Recorded because the file name is
  genuinely ambiguous and the next person will meet it.
- **Stripping EXIF also removes the orientation tag**, and v1 has no derivative pipeline to bake the
  rotation in. A photo whose camera stored it rotated, marked only by that tag, therefore shows in its
  stored orientation. This is the trade truth 7 asks for (originals, no derivatives) — accepted, not
  worked around, and written into `lib/photos.ts`'s header so it is not rediscovered as a bug.
- **`v1` serves originals** (`lib/sanity.ts`: "CDN parameters are the documented upgrade path, not part
  of v1"), so the office form's thumbnails are full-size images the browser scales. Bandwidth, not
  correctness — worth revisiting only if it is ever felt.
- **The `photos` argument was made required rather than optional** on both statements. A default of `[]`
  would have compiled silently at every call site — including the ones that *should* carry photos — and
  the six errors it raised were exactly the call sites that needed a decision.
- **The two image-reading hazards are different, and both are handled**: a *missing asset* and an
  *unreachable store* now render the placeholder (truth 7, client-side, browser-proved), while a stored
  value that is **not a reference at all** is still a named failure in `lib/serialize.ts` — deliberately
  not softened here, because that is an invariant broken and it should say so rather than quietly
  putting someone else's media on a public page.
