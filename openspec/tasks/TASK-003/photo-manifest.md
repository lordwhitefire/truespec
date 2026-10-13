# TASK-003 — the demo photo manifest (Task 10)

**Date:** 2026-10-13 · **Status:** ✅ every image checked and resolving; this is the *intended* manifest
(the returned asset ids land in `scripts/demo-photo-manifest.json` at Task 12).
**Depends on:** `plans/TASK-003-demo-fleet.md` (approved). **Feeds:** Task 12 (upload), Task 14 (seed).

## The source set

The Unsplash photographs the seed already names — the owner supplies no images (Round 3, answer 1:
Unsplash's licence permits it, commercial use included). Each is now recorded in the store as
`car_photo.origin` = `unsplash:<id>`, so the store names the photo, not a rendering of it (Round 2,
answer 2). 49 images across the 17 fleet cars: three each, except the sold car (TS-1025), which has one.

## Two decisions, both measured (`scripts/task-003/probe-photo-bytes.mjs`)

1. **`fm=jpg` in the fetch URL.** `auto=format` with no `Accept` header hands back whatever the source was:
   TS-1011's second photo came back as a **1.9 MB PNG**. Forcing JPEG brought it to **155 KB**. Every upload
   is a sane web size, so the free tier is respected (task.md §2).
2. **`w=1200`.** Wide enough for the 1100px layout the browser check exercises, small enough for the tier.
   Total for the fleet: **10.8 MB**.

The fetch URL is therefore:
`https://images.unsplash.com/photo-<id>?auto=format&fit=crop&w=1200&q=70&fm=jpg`

## EXIF — decided on the bytes, not assumed

The renditions carry **no Exif segment**: segment scans of four samples show `APP0/JFIF` + `APP2/ICC` only
(the ICC profile is colour, not EXIF, and stays). So "EXIF stripped at the write boundary" (specs/media) holds
for this set because the bytes handed to the store carry no EXIF to begin with. Task 12 scans **the exact
bytes it uploads** and records that scan, so this is evidence rather than a claim.

## Dead links

**None.** All 49 resolved `200`, `image/jpeg`. Nothing was replaced, and nothing is blank.

## The manifest

| car | position | `origin` (what the row records) | fetch (upload URL) | type | bytes |
|-----|----------|---------------------------------|--------------------|------|-------|
| TS-1001 Toyota Camry XSE V6 | 0 | `unsplash:1621007947382-bb3c3994e3fb` | `photo-1621007947382-bb3c3994e3fb` | image/jpeg | 145968 |
| TS-1001 Toyota Camry XSE V6 | 1 | `unsplash:1623869675781-80aa31012a5a` | `photo-1623869675781-80aa31012a5a` | image/jpeg | 117624 |
| TS-1001 Toyota Camry XSE V6 | 2 | `unsplash:1663530079695-f7bea03451bd` | `photo-1663530079695-f7bea03451bd` | image/jpeg | 106179 |
| TS-1003 Lexus RX 350 F Sport | 0 | `unsplash:1742941129482-843e7492aa0b` | `photo-1742941129482-843e7492aa0b` | image/jpeg | 137476 |
| TS-1003 Lexus RX 350 F Sport | 1 | `unsplash:1748392029242-19b20e799ec8` | `photo-1748392029242-19b20e799ec8` | image/jpeg | 143972 |
| TS-1003 Lexus RX 350 F Sport | 2 | `unsplash:1742941158083-be03727c216b` | `photo-1742941158083-be03727c216b` | image/jpeg | 150593 |
| TS-1005 BMW X5 xDrive40i | 0 | `unsplash:1635990215241-4d2805d729bb` | `photo-1635990215241-4d2805d729bb` | image/jpeg | 231588 |
| TS-1005 BMW X5 xDrive40i | 1 | `unsplash:1635990215146-9931957ac509` | `photo-1635990215146-9931957ac509` | image/jpeg | 228584 |
| TS-1005 BMW X5 xDrive40i | 2 | `unsplash:1696294586764-6baffd088b71` | `photo-1696294586764-6baffd088b71` | image/jpeg | 567242 |
| TS-1007 Honda Accord Touring | 0 | `unsplash:1578659258511-4a4e7dee7344` | `photo-1578659258511-4a4e7dee7344` | image/jpeg | 70647 |
| TS-1007 Honda Accord Touring | 1 | `unsplash:1577112319788-377a2131e05b` | `photo-1577112319788-377a2131e05b` | image/jpeg | 115674 |
| TS-1007 Honda Accord Touring | 2 | `unsplash:1706495100099-a25d9ddffe74` | `photo-1706495100099-a25d9ddffe74` | image/jpeg | 79883 |
| TS-1008 Toyota RAV4 Prime SE | 0 | `unsplash:1706509234538-9831b1b33d66` | `photo-1706509234538-9831b1b33d66` | image/jpeg | 223076 |
| TS-1008 Toyota RAV4 Prime SE | 1 | `unsplash:1706509240407-7f3aa19ae740` | `photo-1706509240407-7f3aa19ae740` | image/jpeg | 222468 |
| TS-1008 Toyota RAV4 Prime SE | 2 | `unsplash:1632137924251-fcea5ff46035` | `photo-1632137924251-fcea5ff46035` | image/jpeg | 173007 |
| TS-1011 Mercedes-Benz C 300 AMG Line | 0 | `unsplash:1542230387-bfc77d26903e` | `photo-1542230387-bfc77d26903e` | image/jpeg | 224356 |
| TS-1011 Mercedes-Benz C 300 AMG Line | 1 | `unsplash:1605556816125-d752c226247b` | `photo-1605556816125-d752c226247b` | image/jpeg | 158216 |
| TS-1011 Mercedes-Benz C 300 AMG Line | 2 | `unsplash:1551836989-b4622a17a792` | `photo-1551836989-b4622a17a792` | image/jpeg | 296895 |
| TS-1012 BMW X3 xDrive30i | 0 | `unsplash:1677961019377-d45643fde74f` | `photo-1677961019377-d45643fde74f` | image/jpeg | 243322 |
| TS-1012 BMW X3 xDrive30i | 1 | `unsplash:1681113163422-aab89b8935c5` | `photo-1681113163422-aab89b8935c5` | image/jpeg | 158319 |
| TS-1012 BMW X3 xDrive30i | 2 | `unsplash:1605437139441-590d3a529b08` | `photo-1605437139441-590d3a529b08` | image/jpeg | 565786 |
| TS-1013 Range Rover Sport HSE | 0 | `unsplash:1602013871952-8379f19a15f1` | `photo-1602013871952-8379f19a15f1` | image/jpeg | 270564 |
| TS-1013 Range Rover Sport HSE | 1 | `unsplash:1563458563737-e60b1f1b345f` | `photo-1563458563737-e60b1f1b345f` | image/jpeg | 87058 |
| TS-1013 Range Rover Sport HSE | 2 | `unsplash:1677228447083-3245a27daf91` | `photo-1677228447083-3245a27daf91` | image/jpeg | 192981 |
| TS-1014 Porsche Macan S | 0 | `unsplash:1699325974549-fd06639650aa` | `photo-1699325974549-fd06639650aa` | image/jpeg | 115408 |
| TS-1014 Porsche Macan S | 1 | `unsplash:1643055359735-908c15445d09` | `photo-1643055359735-908c15445d09` | image/jpeg | 320290 |
| TS-1014 Porsche Macan S | 2 | `unsplash:1672169538777-fb3211046a03` | `photo-1672169538777-fb3211046a03` | image/jpeg | 560212 |
| TS-1015 Toyota Land Cruiser Prado VX | 0 | `unsplash:1510776817148-07252939cf4d` | `photo-1510776817148-07252939cf4d` | image/jpeg | 200284 |
| TS-1015 Toyota Land Cruiser Prado VX | 1 | `unsplash:1708267416480-d139f1e0ec31` | `photo-1708267416480-d139f1e0ec31` | image/jpeg | 301039 |
| TS-1015 Toyota Land Cruiser Prado VX | 2 | `unsplash:1708161712107-4526f8726c63` | `photo-1708161712107-4526f8726c63` | image/jpeg | 222291 |
| TS-1016 Chevrolet Tahoe LT | 0 | `unsplash:1564422426545-8a43cd6598ff` | `photo-1564422426545-8a43cd6598ff` | image/jpeg | 350959 |
| TS-1016 Chevrolet Tahoe LT | 1 | `unsplash:1646844371347-e7eab6275747` | `photo-1646844371347-e7eab6275747` | image/jpeg | 160369 |
| TS-1016 Chevrolet Tahoe LT | 2 | `unsplash:1547580092-6dcd4e7c3797` | `photo-1547580092-6dcd4e7c3797` | image/jpeg | 195324 |
| TS-1017 Ford F-150 Lariat | 0 | `unsplash:1551830820-330a71b99659` | `photo-1551830820-330a71b99659` | image/jpeg | 127942 |
| TS-1017 Ford F-150 Lariat | 1 | `unsplash:1677637279719-b6698ac1765f` | `photo-1677637279719-b6698ac1765f` | image/jpeg | 166296 |
| TS-1017 Ford F-150 Lariat | 2 | `unsplash:1598043249911-1122b7faa4f3` | `photo-1598043249911-1122b7faa4f3` | image/jpeg | 127605 |
| TS-1018 BMW X7 xDrive40i | 0 | `unsplash:1740815514959-07d12c339e8f` | `photo-1740815514959-07d12c339e8f` | image/jpeg | 159537 |
| TS-1018 BMW X7 xDrive40i | 1 | `unsplash:1701985470695-e430a8fdc8d6` | `photo-1701985470695-e430a8fdc8d6` | image/jpeg | 156541 |
| TS-1018 BMW X7 xDrive40i | 2 | `unsplash:1731988666769-ed4dabc44d53` | `photo-1731988666769-ed4dabc44d53` | image/jpeg | 225634 |
| TS-1019 Lexus RX 350 | 0 | `unsplash:1702757329688-073f16ff8893` | `photo-1702757329688-073f16ff8893` | image/jpeg | 459784 |
| TS-1019 Lexus RX 350 | 1 | `unsplash:1698122660387-64acb063dabe` | `photo-1698122660387-64acb063dabe` | image/jpeg | 314719 |
| TS-1019 Lexus RX 350 | 2 | `unsplash:1777015558094-f92d538f9c80` | `photo-1777015558094-f92d538f9c80` | image/jpeg | 236903 |
| TS-1020 Honda CR-V EX-L | 0 | `unsplash:1681697390363-1142eb46b76d` | `photo-1681697390363-1142eb46b76d` | image/jpeg | 145811 |
| TS-1020 Honda CR-V EX-L | 1 | `unsplash:1707070182914-fb69f596c98e` | `photo-1707070182914-fb69f596c98e` | image/jpeg | 544162 |
| TS-1020 Honda CR-V EX-L | 2 | `unsplash:1561823450-db08b67c8440` | `photo-1561823450-db08b67c8440` | image/jpeg | 337856 |
| TS-1023 Mercedes-Benz E 350 | 0 | `unsplash:1609703048009-d3576872b32c` | `photo-1609703048009-d3576872b32c` | image/jpeg | 274451 |
| TS-1023 Mercedes-Benz E 350 | 1 | `unsplash:1748569748174-33f4ba3ddcdf` | `photo-1748569748174-33f4ba3ddcdf` | image/jpeg | 210526 |
| TS-1023 Mercedes-Benz E 350 | 2 | `unsplash:1652453822986-04f70788b118` | `photo-1652453822986-04f70788b118` | image/jpeg | 392138 |
| TS-1025 Honda Civic EX (sold) | 0 | `unsplash:1552519507-da3b142c6e3d` | `photo-1552519507-da3b142c6e3d` | image/jpeg | 148986 |

## Verification (task.md Task 10: "every image in the manifest resolves")

```
node --env-file=.env.local developer-workspace/scripts/task-003/check-photo-sources.mjs
```

Run 2026-10-13: **49 images, 0 dead, 10.8 MB total at width 1200.** Reads only — nothing written to the
database or to Unsplash. Evidence: `scripts/task-003/runs/task-10/photo-resolution.json` (per-image status,
type, bytes) and `scripts/task-003/runs/task-10/photo-manifest.intended.json` (the machine-readable manifest
Task 12 consumes).

---

# Task 12 — uploaded and proved (2026-10-13)

```
node --env-file=.env.local --conditions=react-server --import tsx \
  developer-workspace/scripts/task-003/upload-photos.mts
```

**49 uploaded, 0 skipped** into project `c2lc8g8n` / dataset `production`. The asset id for each image is in
**`scripts/demo-photo-manifest.json`** (origin → asset id, with position and per-image bytes; asset ids and
`unsplash:` tokens are not secrets). Evidence: `scripts/task-003/runs/task-12/upload-run.json`.

## EXIF — measured on the exact bytes uploaded

Every one of the 49 buffers was scanned before it was sent. **All 49: `exif=false`.** The segments present are
`APP0/JFIF` + `APP2/ICC` (colour profile, which is not EXIF and stays). So "EXIF stripped at the write boundary"
(specs/media) holds for this set on evidence rather than assertion — the bytes handed to the store carry no
EXIF to begin with.

## The store now holds references, not addresses

49 `car_photo` rows were pointed at their asset ids (fleet rows, `sanity_asset_id` = `image-<hash>-<dims>-<ext>`).
**Eight cars outside the fleet still hold 24 third-party addresses** (TS-1002, TS-1004, TS-1006, TS-1009,
TS-1010, TS-1021, TS-1022, TS-1024). That is the named interim: those cars are the previous seed's and leave
in the rebuild-from-nothing (Task 20), which is what makes `car_photo` hold references only.

## Proofs

1. **A stored reference resolves.** `findImageAsset(assetId)` (a dataset read) returns the asset for every
   sampled id; the id is the one the store holds.
2. **The address is the documented derivation.** `imageUrl(assetId)` produced exactly
   `https://cdn.sanity.io/images/c2lc8g8n/production/<name>-<w>x<h>.jpg` — the form Sanity's own reference
   documents, assembled from the asset id without fetching anything. Fetched: **200, `image/jpeg`, original
   dimensions** (e.g. 1200x800), **no query parameters**, nothing downscaled, cropped or converted.
3. **What is stored is what was uploaded** — the dataset reports `size` equal to the uploaded byte count and
   the same dimensions.

**One measured nuance, recorded rather than smoothed over** (`scripts/task-003/probe-served-bytes.mts`): the
CDN's bytes are not byte-identical to the uploaded file. Sanity's ingest normalises the JPEG encoding
(progressive SOF2 → baseline SOF0), so e.g. 145,968 B uploaded is served as 129,064 B — **same dimensions,
same pixels, no format change, no parameters**. That is Sanity storing the asset, not us building a derivative
pipeline: no downscaling, crop or format conversion is requested anywhere, and the URL carries no parameters.

## Idempotence

Re-running the uploader skips any image whose recorded asset still resolves; Sanity additionally dedupes
identical bytes to the same asset id, so a re-run cannot duplicate an image.
