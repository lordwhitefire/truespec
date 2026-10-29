# SEO Heavy Stack — Build Report

**Task:** Build the Heavy Search Stack and the 24 public SEO surfaces, including the
non-standard `ai.txt` and `trust.txt` experiments.
**Commit:** `2b7eb97` — `feat(seo): complete the public discovery surface`
**Date:** 2026-10-28
**Push:** not pushed. Local `main` is `2b7eb97`; `origin/main` is `40f16aa`.

## What was built

### Discovery and files

- `/sitemap.xml` now has 23 URLs, 51 car image entries, and honest legal `lastmod` dates.
  The image URLs are the original public Sanity photos; derivative URLs carried `&` and made
  the XML invalid, so they were not used.
- `/feed.xml` — RSS 2.0 inventory feed, 19 public cars, channel `lastBuildDate` only. Item
  `pubDate` is deliberately omitted because the data has no honest per-car publication date.
- `/llms.txt` and `/llms-full.txt` — canonical pages, inventory list, one-line descriptions,
  buying/trust notes, and all public car facts. No office-only fields.
- `/manifest.webmanifest` and `/apple-icon` — manifest, SVG favicon link, Apple touch icon.
- `/ai.txt` — AI-reader experiment, with an explicit statement that it is not a standard.
- `/trust.txt` — trust/verification experiment, pointing at the real GSC and Bing files, with
  an explicit statement that it is not a standard.
- `/humans.txt` — TrueSpec Automotive and the stack, no personal data.
- `/ads.txt` — no authorized sellers; the site runs no ads.
- `scripts/indexnow.ts` and `npm run seo:indexnow` — reads the sitemap, checks the key file,
  supports `--dry-run`, and submits to both IndexNow endpoints. No key or secret is printed.
- `/.well-known/security.txt` plus a `/security.txt` 308 redirect. Contact, `Expires`, and
  canonical are the owner-approved values.

### Metadata and structure

- `Organization` + `WebSite` JSON-LD site-wide.
- `BreadcrumbList` on car and legal pages; `ItemList` on inventory; `Vehicle` + `Offer` on car
  pages, with the real seller `Organization`.
- No `AutoDealer`, `SearchAction`, `Review`, `AggregateRating`, or `FAQPage`. No invented
  address, phone, geo, tax ID, reviews, FAQ, prices, availability, or credentials.
- Car meta descriptions are now fitted to 150–160 characters. The builder prefers a complete
  sentence; only a genuinely overlong name is cut at a word boundary.
- Semantic `main`, `header`, and breadcrumb `nav` landmarks. Legal pages now have a
  breadcrumb nav wrapper.
- Real 404s: `/not-found`, unknown paths, and missing cars return HTTP 404; sold cars are
  `noindex, nofollow`; `/security.txt` is a 308.

### Surface checklist

| Surface | State |
|---|---|
| Titles | done |
| Meta descriptions | done; all public pages 151–159 characters |
| Canonicals | done; one canonical origin |
| Robots meta | done; sold and 404 pages noindex |
| Open Graph | done; image type, alt, locale, site name, dimensions |
| Twitter cards | done; `twitter:site` still needs a real handle |
| JSON-LD | done; truthful graph only |
| Semantic HTML | done; main/header/nav landmarks |
| Internal links / breadcrumbs | done; car and legal breadcrumbs |
| URL structure | done; clean canonical paths |
| Alt text / image sitemap | done; alt from car data only; image sitemap valid |
| 404 / redirects | done; real 404s and security.txt 308 |
| `robots.txt` | done; sitemap declared |
| `sitemap.xml` | done; 23 URLs, 51 images, valid XML |
| `llms.txt` / `llms-full.txt` | done |
| `security.txt` | done locally; live check waits on deploy |
| `humans.txt` | done |
| Manifest / favicons | done |
| RSS / Atom | done |
| `ads.txt` | done; no sellers |
| IndexNow | done; key live, 23 URLs accepted, script added |
| Verification files | done; GSC and Bing files live |
| Performance / security headers | existing headers verified; LCP blocker remains |
| Off-site | GSC/Bing/IndexNow done; social handles and citation tracking owner-gated |

## Verified

Run on the final tree before the commit:

- `npm run lint` — 0 errors, 13 pre-existing warnings.
- `npm run format:check` — pass.
- `npm run typecheck` — pass.
- `npm test` — 554 tests pass, 0 fail.
- `npm run build` — pass; new routes present.

Local `:3210` checks:

- 200: `/`, `/inventory`, `/car/TS-1005`, `/car/TS-1033`, `/privacy`, `/terms`,
  `/feed.xml`, `/llms.txt`, `/llms-full.txt`, `/manifest.webmanifest`, `/apple-icon`,
  `/ai.txt`, `/trust.txt`, `/humans.txt`, `/ads.txt`, `/sitemap.xml`, `/robots.txt`,
  `/.well-known/security.txt`, `/BingSiteAuth.xml`, the GSC file, and the IndexNow key file.
- 308: `/security.txt` → `/.well-known/security.txt`.
- 404: `/not-found`, `/this-does-not-exist`, `/car/TS-9999`.
- Sitemap XML parses; 23 URLs and 51 images.
- Feed XML parses; 19 items; no `cost`, `priceKobo`, `soldAt`, `customer`, `enquiry`, or
  private fields.
- `llms.txt` and `llms-full.txt` contain 19 cars and no office-only fields.
- Metadata lengths: home 156, inventory 154, privacy 159, terms 151, sold car 157; all 19
  public car pages 151–157. No car description over 160.
- JSON-LD types present: `Organization`, `WebSite`, `BreadcrumbList`, `ItemList`, `Vehicle`,
  `Offer`. No `AutoDealer`, `SearchAction`, `Review`, `AggregateRating`, or `FAQPage`.
- Headers include HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  and `Permissions-Policy`.
- `npm run seo:indexnow -- --dry-run` with a local base URL listed 23 URLs and did not submit.

## Not verified

- Google Rich Results Test / Schema Markup Validator was not run. JSON-LD was parsed and
  type-checked locally; the official validator needs a browser or an owner-run check.
- Screen-reader pass and the rest of the owner/testing session were not run.
- Live deployment checks were not run. The three local commits are unpushed, so
  `security.txt`, the new routes, and the updated sitemap/feed are not live yet.
- Bing dashboard verification and sitemap status need the owner's login.
- No social profile handles exist, so no `sameAs` or `twitter:site` was invented.
- Citation tracking needs a tool/account or an owner-approved prompt list.
- Test-car cleanup needs owner approval. Three public test rows (`TS-1033`, `TS-1035`,
  `TS-1036`) still appear in inventory, sitemap, feed, `llms-full.txt`, and `ItemList`.
  Five hidden test rows do not appear publicly.

## Non-standard files — honest position

- `llms.txt` is a community proposal, not an IETF/W3C standard. Google Search says it ignores
  the file; we keep it for agents that do read it.
- `ai.txt` has no RFC or registry. It is an experiment.
- `trust.txt` is a journalism-oriented proposal, not a general web standard. It is an
  experiment.
- None of the three has a measured ranking effect on this site.

## Owner next actions

1. Push `4fd28b5`, `3cbcc7f`, and `2b7eb97`, then deploy.
2. Verify live: `/.well-known/security.txt` (200), `/security.txt` (308), `/sitemap.xml`,
   `/feed.xml`, `/llms.txt`, `/llms-full.txt`, `/manifest.webmanifest`, and the IndexNow key.
3. Confirm Bing dashboard verification and sitemap; import from GSC if the upload still fails.
4. Supply real social handles for `sameAs` / `twitter:site`, or confirm they stay omitted.
5. Choose citation tracking (tool/account or prompt list) and approve test-car cleanup.
6. Decide the existing blockers: C7 contrast, G1 LCP, D8 dependencies, and the owner/testing
   session items.
7. Optional after deploy: run `npm run seo:indexnow` to resubmit the 23 URLs. No secrets are
   printed.
