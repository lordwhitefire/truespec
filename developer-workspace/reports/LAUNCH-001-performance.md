# LAUNCH-001 Task 27 — Performance re-measure, cache policy and bundle budget

**Status:** done.

## Lighthouse lab baseline

Measured against the local production build (`PORT=3210 npm start`) on the agreed mobile profile
(Lighthouse, simulated throttling). Lab data; field data is labelled separately and not invented.

| Page | Performance | LCP | CLS | TBT | FCP | SI |
|------|-------------|-----|-----|-----|-----|-----|
| Home (`/`) | 0.59 | 7345 ms | 0.0004 | 0 ms | 4795 ms | 8545 ms |
| Inventory (`/inventory`) | 0.62 | 7091 ms | 0.0004 | 0 ms | 4691 ms | 5937 ms |
| Car (`/car/TS-1001`) | 0.55 | 5908 ms | 0.0045 | 589 ms | 3028 ms | 4667 ms |

## Interpretation

LCP is dominated by the cold Clerk dev handshake (two `307` redirects, ~2.4 s TTFB) plus the
Sanity image load (~1.2 s). The gallery image itself is already display-sized (640w/960w) and
prioritized (`fetchpriority=high`), so the image work is not the bottleneck. The 2.5 s LCP target
is not met in this local cold lab run; field data is not available and is not invented here.

CLS is excellent (≤ 0.005) because gallery images reserve their dimensions and the layout is
stable.

## Cache / revalidation policy

- Public showroom pages (`/`, `/inventory`, `/car/[ref]`, `/privacy`, `/terms`) are server-rendered
  on demand (`force-dynamic` where data-dependent) so a sold or unlisted car leaves the sitemap and
  page on the next request.
- Machine-readable routes (`/robots.txt`, `/sitemap.xml`, `/llms.txt`) reflect the current public
  car set on every request (`sitemap.xml` and `llms.txt` are `force-dynamic`; `robots.txt` is static
  because it contains no car data).
- Image assets from Sanity are cached by the browser per their cache headers; the gallery uses
  `sizes` and `srcset` so only display-sized derivatives are downloaded.

## Bundle budget

Total client JavaScript (`.next/static/chunks`): ~1.6 MB across chunks. The largest individual
chunks are:

- `framework-67e87833b9140bb8.js` — ~214 KB
- `4bd1b696-f785427dddbba9fb.js` — ~169 KB
- `1255-5cd2fe06309409a0.js` — ~170 KB
- `main-24b24585c266ce83.js` — ~126 KB
- `polyfills-42372ed130431b0a.js` — ~110 KB
- `8845-86ebd783910ad336.js` — ~124 KB

No single chunk exceeds ~220 KB; the shared framework chunk is the largest. No bundle budget
breach is identified in this release; if a future change pushes a single chunk above ~250 KB, it
should be named in the release note and split or deferred.

## Verified

- `npm run typecheck` — pass.
- `npm run build` — pass.
- Lighthouse lab run on home, inventory and a car page (above).
- `npm run bundle-report` — no bundle budget breach (see `scripts/bundle-report.mjs`).

## Evidence

- `docs/performance.md`
- `scripts/bundle-report.mjs`
- Lighthouse output: `/tmp/opencode/lh-home.json`, `/tmp/opencode/lh-inventory.json`, `/tmp/opencode/lh-car.json`
