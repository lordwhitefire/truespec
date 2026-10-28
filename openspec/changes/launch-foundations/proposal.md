# Launch foundations — the missing web and delivery layer

## Why

TrueSpec's product architecture is already written: the showroom, office, inventory, money, enquiries, media, sessions and demo space all have requirements. The separate `web-development-areas.md` audit found the layer *around* that product is incomplete: the repository has no root README or `.env.example`; the public site has no robots, sitemap, `llms.txt`, social metadata, canonical URLs or vehicle structured data; home and inventory have no `<h1>`; there is no lint/CI gate; and legal, monitoring and abuse-control decisions are not recorded.

These are not new product features. They are the conditions under which the existing showroom and office can be handed over, found by search engines and AI readers, maintained by the next developer, and operated safely. This change adds them to the architecture before implementation.

## What Changes

- **Repository documentation:** a root README that explains the product, the public/office split, local setup, migrations, seed, tests, deployment and the main/demo distinction; a checked-in `.env.example` naming every required variable without values; a changelog/onboarding note where it earns its place.
- **Discoverability:** `robots.txt`, `sitemap.xml`, `llms.txt`, a metadata base and title template, per-page descriptions, Open Graph/Twitter cards, canonical URLs, and `Vehicle`/`Offer` JSON-LD on car pages.
- **Accessibility:** one `<h1>` per public page (home and inventory currently start at `<h2>`), a documented WCAG target, keyboard/focus checks, and heading/landmark rules that do not depend on the reference screens.
- **Delivery quality:** ESLint and formatting, a CI workflow running typecheck, tests and build, an app-level E2E smoke test, security headers, and a dependency-vulnerability check.
- **Public trust:** a terms page, a recorded cookie/consent position (the site currently has no analytics but does use Clerk auth cookies), and a real contact path for privacy requests.
- **Launch operations:** error tracking, uptime monitoring, an owner/alert path, rate-limit ownership (Clerk for sign-in, the Vercel WAF rule for taps, and an explicit decision on form throttling), demo identity lifecycle, and a deployment/rollback note.

**Not changing:** payments, cart, checkout, shipping rates, discounts, order management, customer reviews, native apps, subscriptions, multi-tenancy, realtime collaboration, outgoing webhooks, or the product's domain model. Owner decisions that are still open (analytics, PWA, vendor choice, production domain, terms wording) are recorded as open questions rather than silently decided.

## Capabilities

### New Capabilities

- `site-discovery`: public metadata, canonical URLs, robots, sitemap, `llms.txt`, structured data, and the rules that keep sold/filter/private URLs out of search.
- `project-documentation`: the root README, `.env.example`, changelog and onboarding material a new developer or AI session needs.
- `delivery-quality`: lint/format, CI, E2E smoke coverage, security headers and dependency checking.
- `public-trust`: terms, privacy contact, cookie/consent position and the public legal surface.
- `launch-operations`: uptime/error monitoring, alert ownership, rate-limit boundaries, demo identity lifecycle and deployment/rollback.
- `web-performance`: Core Web Vitals targets, font/image strategy, caching and bundle-size expectations for the public showroom.
- `accessibility`: heading structure, keyboard/focus, contrast and the documented WCAG target for both showroom and office.

### Modified Capabilities

_None — this change adds the delivery layer; it does not change the existing product requirements._

## Impact

- **Code:** `app/layout.tsx`, `app/(site)/**`, `app/robots.ts`, `app/sitemap.ts`, `public/`, `next.config.mjs`, `package.json`, new `.github/workflows/`, and a root `README.md` / `.env.example`. Terms and privacy surfaces may add a route; no database schema change is expected.
- **Configuration:** Vercel project settings, the WAF tap rule, error/uptime vendor credentials, and a production domain/redirect map.
- **Dependencies:** one lint/format toolchain, one E2E runner, and one monitoring vendor — selected during implementation; no product dependency is replaced.
- **Risk:** metadata and headers can change crawler and browser behavior; the change therefore treats canonical/indexing rules, security headers and the no-analytics decision as explicit requirements, not incidental configuration.
