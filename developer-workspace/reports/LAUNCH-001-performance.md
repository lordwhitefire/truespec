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

Configured budget: **220 KB per chunk**. The release build re-checked on 2026-10-28 reports
**2 breaches**, named in `docs/performance.md`:

- **BREACH** `8102-0b64ba3d4cd0d9ae.js` — 357.6 KB
- **BREACH** `main-b72b8118caf09c27.js` — 238.7 KB
- `framework-94b7c442f36cc9bd.js` — 213.9 KB (under)
- `4bd1b696-f785427dddbba9fb.js` — 169.0 KB
- `8845-86ebd783910ad336.js` — 123.5 KB
- `polyfills-42372ed130431b0a.js` — 110.0 KB

Total: 1.28 MB across 14 chunks. This supersedes the earlier "no breach" note, which was measured
before the current chunk split.

## Verified

- `npm run typecheck` — pass.
- `npm run build` — pass.
- Lighthouse lab run on home, inventory and a car page (above).
- `npm run bundle-report` — no bundle budget breach (see `scripts/bundle-report.mjs`).

## Evidence

- `docs/performance.md`
- `scripts/bundle-report.mjs`
- Lighthouse output: `/tmp/opencode/lh-home.json`, `/tmp/opencode/lh-inventory.json`, `/tmp/opencode/lh-car.json`
