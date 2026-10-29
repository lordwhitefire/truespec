# SEO Heavy Build — Owner Gates and External Dependencies

**Task:** Build the Heavy Search Stack (7 layers) and the 24 SEO surfaces, including the
non-standard experiments `ai.txt` and `trust.txt`.
**Agreed:** owner, 2026-10-28. Build locally; commit per task after checks pass; no push.
**Hard rule:** no invented data. No fake reviews, FAQs, prices, availability, credentials,
or business details.

## A. Owner-gated items — needed before these can be finished

| # | Item | What is needed | Why / where it lands | Status |
|---|------|----------------|----------------------|--------|
| A1 | Canonical domain | Confirmed: `https://truespec-k4y6.vercel.app` | Canonicals, OG, sitemap, JSON-LD, `robots.txt` | confirmed |
| A2 | Legal entity | Not a registered business — MVP. No legal entity, address, geo, phone, hours, or price range. | Minimal `Organization` only; defer `AutoDealer`/NAP | deferred |
| A3 | Social/profile URLs | Facebook, Instagram, X, Google Business Profile, others | `sameAs` | waiting |
| A4 | Google Business Profile | Not applicable — MVP, not a real business. Do not create a fake listing. | Defer until a real business exists | n/a |
| A5 | Google Search Console | Verified; sitemap submitted; Generative AI report still processing — check in a day | Measurement | done (report pending) |
| A6 | Bing Webmaster Tools | Verification file live at `/BingSiteAuth.xml` (200). 23 URLs accepted by both IndexNow endpoints. Dashboard verification and sitemap status still need the owner's login. | Bing discovery, IndexNow | verification live; dashboard pending |
| A7 | IndexNow key | Done: key rotated, hosted at the site root (live 200); `npm run seo:indexnow` with `--dry-run` added. | `/{key}.txt`, submit hook | done |
| A8 | Merchant Center vehicle feed | Not applicable until a real business and vehicle-ads eligibility. | Paid vehicle listings; not organic | deferred |
| A9 | Security contact | Owner-approved: `victormakuo2002@gmail.com`; `Expires` 2027-10-28; `Canonical` set. | `/.well-known/security.txt` + `/security.txt` redirect | done |
| A10 | Real reviews | Owner confirmed 2026-10-28: no real third-party reviews. Skip `Review` / `AggregateRating`; no stars or testimonial copy. | No fake reviews | n/a |
| A11 | Real FAQ | None — skip `FAQPage` unless the owner writes real Q&A | No invented answers | n/a |
| A12 | `humans.txt` | Added at `/humans.txt`; names TrueSpec Automotive and the stack, no personal data. | Optional, low value | done |
| A13 | RSS/Atom | Added `/feed.xml`; 19 public cars, no fabricated `pubDate`. | Optional | done |
| A14 | `ads.txt` / `app-ads.txt` | Added `/ads.txt` with no authorized sellers. No ads run on the site. | Only if ads | done (empty seller list) |
| A15 | `ai.txt` / `trust.txt` | Confirmed: try both as experiments | Non-standard; no ranking claim | agreed |
| A16 | Citation tracking | Tool/account, or a manual prompt list | GEO/AEO measurement | waiting |
| A17 | Deployment | Vercel `truespec-k4y6`; git deployments are disabled; owner pushes/deploys | Release | owner-only |

## B. Build-now set — state at commit `2b7eb97`

| Surface | State |
|---|---|
| Titles and descriptions | Done. All public pages 151–159 characters; car descriptions are fitted to 150–160 without cutting a sentence. |
| JSON-LD | Done. `Organization` + `WebSite` site-wide; `BreadcrumbList` on car and legal pages; `ItemList` on inventory; `Vehicle` + `Offer` on car pages. No `AutoDealer`, `SearchAction`, `Review`, `AggregateRating`, or `FAQPage`. |
| OG / Twitter | Done. Image type/alt, locale, site name, dimensions. `twitter:site` still needs a real handle. |
| `llms.txt` / `llms-full.txt` | Done. Inventory list plus one-line descriptions; full text has all public cars. |
| `robots.txt` / `sitemap.xml` | Done. Sitemap has 23 URLs, 51 image entries, legal `lastmod`; XML validates. |
| `security.txt` | Done locally at `/.well-known/security.txt`; `/security.txt` is a 308. Live check waits on deploy. |
| `ai.txt` / `trust.txt` | Done as experiments; both say they are not recognized standards. |
| IndexNow | Done. Key hosted, 23 URLs accepted by both endpoints, `seo:indexnow` script with `--dry-run`. |
| Internal links, breadcrumbs, semantic HTML, alt text | Done. `main`/`header`/`nav` landmarks; legal breadcrumb nav; car alt text from car data only. |
| Checks | Lint 0 errors / 13 pre-existing warnings; format pass; typecheck pass; 554 tests pass; build pass. |

## B2. Build state

- Local `main`: `2b7eb97`; remote `origin/main`: `40f16aa`.
- Unpushed: `4fd28b5` (security.txt), `3cbcc7f` (site graph, breadcrumbs, ItemList, real 404),
  `2b7eb97` (feed, image sitemap, manifest, AI/trust/humans/ads files, IndexNow, car descriptions).
- The owner pushes and deploys; Vercel git deployments are disabled.
- Local `:3210` verified: all new routes 200; `/security.txt` 308; `/not-found`, unknown paths,
  and missing cars 404; sitemap and feed are valid XML; JSON-LD types and lengths checked.
- Not run: Google Rich Results Test / Schema Markup Validator, a screen-reader pass, and live
  checks after deploy.

## C. Existing blockers that remain

- **C7 contrast:** brand gold `#c8a24a` on white is 2.4:1. Owner decides darken, accept, or block.
- **G1 LCP:** 7.3 s vs 2.5 s. Owner decides accept baseline or schedule performance work.
- **D8 dependencies:** critical `next` advisory plus three high. Owner decides accept with a
  dated record or upgrade.
- **Owner/testing session:** C8 screen reader, E3 privacy contact, F2 Sentry payload/email,
  F4 WAF threshold, F5 demo sign-up limit, office sign-in end-to-end.

## D. Non-standard files — honest position

- `llms.txt` is a community proposal (Jeremy Howard, v2 August 2026), not an IETF/W3C
  standard. Google Search says it ignores the file (Google AI optimization guide,
  2026-07-10). We keep it for agents that do read it.
- `ai.txt` has no RFC or registry. It is an experiment.
- `trust.txt` is a journalism-oriented proposal, not a general web standard. It is an
  experiment.
- The report will state that none of the three has a measured ranking effect here.

## E. Data truth

VIN, price, mileage, fuel, transmission, body, colour, and availability must come from
Sanity. If a field is missing, omit it or say "not specified" — never invent. Reviews and
FAQ only from real, owner-approved content.

## F. Definition of done

- All 24 surfaces implemented, or explicitly marked owner-gated / not applicable with a reason.
- `npm run lint`, `format:check`, `typecheck`, `test`, `build` pass.
- JSON-LD parsed and type-checked locally; Google Rich Results Test / Schema Markup Validator
  not run (needs a browser or owner-run validator).
- Local `:3210` checks pass; report written.
- Commit per task; no push.
