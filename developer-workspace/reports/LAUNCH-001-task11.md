# LAUNCH-001 Task 11 — robots.txt and sitemap.xml

**Status:** done; the only deferred item is the `/terms` URL, which Task 13 adds when the page
exists. The plan’s Checkpoint 4 explicitly allows this temporary omission.

## What changed

- `app/robots.ts` — `User-Agent: *`, `Allow: /`, `Disallow: /office/`, `Disallow: /api/`, and
  `Sitemap: https://truespec-k4y6.vercel.app/sitemap.xml`. The comment records that this is a
  crawler rule, not access control.
- `app/sitemap.ts` — dynamic (`force-dynamic`) sitemap built from the same `getPublicCars()` the
  showroom uses, plus the static public pages `/`, `/inventory`, `/privacy`. Every URL goes through
  `absoluteUrl`. `/terms` is deliberately absent until Task 13; listing it now would point at a 404.
- `developer-workspace/scripts/LAUNCH-001/sitemap.mjs` — 18-check browser/DB runtime script.
- `lib/public-cars.ts` — **not changed**: its existing `getPublicCars()` already filters to
  non-sold, non-deleted, non-draft, priced, photographed cars in a public section.

## Verified

- `npm test` — 523 pass, 0 fail, 10 suites.
- `npm run typecheck` — pass.
- `npm run build` — pass; `/robots.txt` is static (`○`) and `/sitemap.xml` is dynamic (`ƒ`).
- Runtime script — 18/18:
  - `robots.txt`: 200, `text/plain`; exact rule set above; sitemap URL is the canonical production
    URL.
  - `sitemap.xml`: 200, `application/xml`; XML parses with no parser error; 22 absolute URLs
    (3 static + 19 cars); no duplicates; no `127.0.0.1`.
  - static URLs: `/`, `/inventory`, `/privacy`; `/terms` absent (recorded temporary omission).
  - car set equals `getPublicCars()` exactly: 19 refs, from `TS-1001` through `TS-1036`.
  - known non-public refs absent: sold `TS-1025`, unlisted `TS-1029`, unknown `TS-9999`.
  - `/office` direct request: 307 to `/office/sign-in` (recorded; the robots rule is not access
    control).
  - tabs 4→4; 1 Chromium; no tab opened; no Chrome launched.
- No `lastModified` is emitted: the public read model exposes no update timestamp (`PublicCar` has
  only `soldAt`, and sold cars are excluded). The spec says “where one is known”; none is known
  here. This is deliberate, not a fabricated date.

## Not verified / caveats

- `/terms` is not in the sitemap until Task 13 creates the page and the owner approves it. The
  sitemap is otherwise complete for the current public site.
- The runtime comparison used the local demo/public DB and the local production build; the
  canonical URLs are the production host by design.
- Deleted/draft rows are excluded by the same `getPublicCars()` filter; the runtime explicitly
  checks sold, unlisted and unknown. No separate deleted/draft row was exercised.
- The robots rule does not protect the office or API; their own guards do. The 307 is recorded as
  evidence, not as a security check.
- Changes are uncommitted; no commit or push was made.

## Evidence

- `developer-workspace/scripts/LAUNCH-001/sitemap.mjs`
- `/tmp/opencode/sitemap-task11.json`
- Server log: `/tmp/opencode/truespec-3210.log`
