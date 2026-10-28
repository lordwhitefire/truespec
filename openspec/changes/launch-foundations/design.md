# Launch foundations — design

## Context

See `proposal.md` for the motivation. The current repository already has a complete product architecture and a working Next.js App Router application. The gaps are at the edges of that product:

- Root metadata is a single title and description; there are no metadata routes, canonical URLs, social cards or structured data.
- Public home and inventory pages start at `<h2>`; car pages have an `<h1>`.
- The app has no lint/format configuration, no CI workflow, no app-level E2E suite and no security-header configuration.
- The only legal page is `/privacy`; there is no terms page.
- Operational monitoring and abuse limits are partly documented but not owned end to end.
- Public pages are `force-dynamic`; fonts and Font Awesome are third-party stylesheets; photos are plain `<img>` elements served from Sanity.

The design keeps the existing product boundary intact. The showroom remains public and main-only; the office remains private; no payment, cart, order or customer-account system is introduced.

## Goals / Non-Goals

**Goals:**

- Make the repository understandable and runnable from a clean clone.
- Make the public showroom accurately discoverable and machine-readable.
- Give every public page a correct heading structure and an accessible interaction baseline.
- Put an automated quality gate in front of `main`.
- Record a truthful legal and cookie position.
- Make production failures, abuse and rollback owned rather than assumed.

**Non-Goals:**

- New product behavior, pricing, checkout, payments or order management.
- Native mobile apps, PWA/service-worker work or offline inventory browsing. The current offline notice and retry state stay as they are; a PWA is a separate owner decision.
- Multi-tenant roles, staff accounts, real-time collaboration or outgoing webhooks.
- Replacing Clerk, Neon, Sanity or Vercel.
- Rewriting the showroom's visual design. The reference screens remain the visual truth; accessibility fixes are structural, not a restyle.

## Decisions

### D1 — Discovery is produced by the framework, from one metadata source
**Decision:** Use the App Router's metadata API for page metadata and a small shared metadata helper for the repeating rules (title template, description, canonical, Open Graph, Twitter, default image). Generate `robots.txt`, `sitemap.xml` and `llms.txt` as server routes so they read the current inventory rather than a hand-maintained file. Emit car JSON-LD from the same public car object the page renders.

**Why:** The inventory changes; a static sitemap or a second hand-written car list would drift immediately. One public car object already exists and is the only safe source after the cost allow-list. The framework's metadata API keeps canonical and social tags tied to the route that owns them.

**Alternatives:** a static `public/sitemap.xml` (rejected: stale as soon as a car is sold); an external SEO service (rejected: another vendor and another copy of the inventory); a client-side metadata component (rejected: crawlers need server-rendered tags).

### D2 — Indexing is explicit, not incidental
**Decision:** The indexable surface is the public home, inventory, currently listed car pages, privacy and terms. Office, API and authentication routes are disallowed and excluded from the sitemap. Filtered inventory URLs canonicalise to `/inventory`. A sold car either resolves to a sold page that is not offered as available, or to a real 404; an unknown car is a 404. No public page may return a successful status for a private or missing resource.

**Why:** The showroom already has three public sections and a sold/unknown distinction. Search engines must see the same distinction as a buyer. A soft 404 or a sold car presented as available would be a false listing.

**Alternatives:** allow every car URL and let it be indexed after sale (rejected: stale listings and misleading availability); block all query parameters with `robots.txt` (rejected: it does not remove an indexed URL and is not a canonical rule).

### D3 — The README is the contract for a new developer
**Decision:** A root README is the entry point and the single place a new developer or agent starts. `.env.example` is the value-free companion. The startup configuration error points to the exact README section and the example file. Operational commands live in the README or a linked operations note, not only in task reports.

**Why:** The current `lib/config.ts` already tells a failed setup to “see the README”, but no README exists. The repository contains excellent internal task history, but a new developer should not have to reconstruct the setup from 500 tracked developer-workspace files.

**Alternatives:** keep documentation only in `developer-workspace/` (rejected: that is internal build history, not onboarding); generate the README from code comments (rejected: it would miss deployment and demo/main context).

### D4 — The quality gate is small, deterministic and blocking
**Decision:** Add ESLint and a formatter with committed configuration and scripts. Add a GitHub Actions workflow that runs install, typecheck, unit tests, lint and production build on pull requests and `main`. Add one Playwright smoke test for the public showroom and the office door. Add a dependency audit step. A failure blocks merge; an accepted vulnerability needs a dated owner record.

**Why:** The project already has a substantial unit suite and a strict TypeScript configuration. The missing piece is enforcement, not test volume. A single smoke path proves the public pages render and the office remains closed to anonymous visitors before a human opens the browser.

**Alternatives:** Vercel-only build checks (rejected: they do not run lint or the unit suite); a large E2E suite before launch (rejected: slower and more brittle than the small path that protects the contract); Husky-only hooks (rejected: local hooks can be skipped and do not protect the remote).

### D5 — Security headers are configured centrally and rolled out observably
**Decision:** Configure headers in one place in the Next.js configuration: content-type options, frame policy, referrer policy, permissions policy, transport security and a content-security policy. Start the CSP in report-only mode, fix violations on the public and office surfaces, then enforce it. The policy must explicitly account for Clerk, Sanity images, the Google font stylesheet and Font Awesome.

**Why:** The app has no app-level header policy today. A strict CSP written blind will break Clerk or the font/icon stylesheets; report-only gives evidence without a production outage. Central configuration keeps preview and production equal.

**Alternatives:** set headers at Vercel only (rejected: the rules then live outside the repository and previews can diverge); skip CSP and add only basic headers (rejected: leaves the largest injection surface unaddressed); nonce-based CSP on every request (rejected for this change: it complicates caching and needs a separate design; can be a later hardening step).

### D6 — Legal content is owner-approved and tied to actual data flows
**Decision:** Add a terms page using owner-approved wording, keep the privacy notice aligned with the actual data flow, and record the cookie position. The current position is: essential Clerk auth cookies, a theme preference in localStorage, demo state, and no analytics or advertising trackers. A consent banner is not required for that set; any non-essential tracker requires a consent review before release.

**Why:** The site currently has no terms page and no explicit cookie record. The privacy notice already says “no analytics” and describes the WhatsApp tap; the cookie position must agree with it, not be invented separately.

**Alternatives:** copy a generic terms template (rejected: the sale, delivery and governing-law wording must match the owner's business); add a consent banner now (rejected: it would ask for consent to nothing and undermine the no-tracking claim); keep the position only in conversation (rejected: the next developer needs a file).

### D7 — Operational ownership is named, even when the vendor is not
**Decision:** Add uptime monitoring for the public URL and error tracking for server/client errors, with a named owner and a runbook. Record the rate-limit boundary for each unauthenticated write. Record the demo identity lifecycle. Document preview/production separation and rollback. The vendor choice may remain open, but the responsibility may not.

**Why:** The application already has a backup job, a demo reset job and a tap endpoint, but no external uptime/error alert and no written owner. A failed backup or a tap flood should not depend on someone noticing a dashboard. The provider already owns sign-in rate limits; the change makes that boundary explicit rather than assuming it covers the tap.

**Alternatives:** rely on Vercel logs alone (rejected: no alert and no error grouping); add an in-app rate limiter for everything (rejected: more code and state for a single-owner product; the WAF is the correct edge for taps); leave demo identities forever (rejected as an unrecorded decision, not necessarily as a policy).

### D8 — Performance is measured at the public edge, not guessed
**Decision:** Set the Core Web Vitals targets in the spec, measure the home, inventory and car pages on a mobile profile, serve car images through Sanity transformations at display size with reserved dimensions, use a non-blocking font strategy with a real fallback, record the public cache policy, and provide a bundle report and budget.

**Why:** The 15 MB upload cap protects the store, not the buyer. A full-size photo in a card is the most likely LCP problem. The current public pages are `force-dynamic`; that may be necessary for freshness, but it must be a recorded choice with a measured consequence, not an accident.

**Alternatives:** rely on the upload cap as the image strategy (rejected: it optimizes storage, not delivery); self-host every font immediately (rejected: a packaging change that needs its own check; the requirement is non-blocking delivery and fallback, not a particular package); cache everything aggressively (rejected: the showroom must reflect sold and newly listed cars honestly).

### D9 — Accessibility is structural and testable
**Decision:** Give home and inventory one `<h1>` each; preserve one page-level heading on car and legal pages. Add a documented WCAG 2.2 AA target, keyboard/focus checks, contrast checks and screen-reader names. Treat the existing focus, reduced-motion and live-region work as the baseline, not as a reason to skip the audit.

**Why:** The public pages currently start at `<h2>`, which weakens both document structure and search understanding. The office already has strong focus and dialog behavior; the showroom needs the same discipline.

**Alternatives:** visually hidden `<h1>` only (allowed as a fallback, but a visible heading is preferred where the design permits); rely on an automated scanner (rejected: it does not test keyboard flow or screen-reader meaning).

### D10 — The change is a delivery layer, not a product rewrite
**Decision:** Keep all new work outside the domain model. No new database tables are required. The legal, documentation, metadata, CI and monitoring work must not change the showroom/office split, the cost boundary, the main/demo isolation or the existing session rules.

**Why:** The product architecture is already settled and built. Mixing delivery work into domain specs would make both harder to validate and would reopen decisions the owner has already made.

## Risks / Trade-offs

- **[CSP breaks Clerk or the font/icon stylesheets]** → Roll out report-only first; exercise sign-in, sign-up, showroom and office before enforcing; keep the policy in one file with named sources.
- **[Metadata and canonical rules drift between pages]** → One shared metadata helper plus per-page overrides; test canonical and status for home, inventory, a live car, a sold car and an unknown car.
- **[Sitemap includes a sold or private car]** → Generate from the same public car read used by the showroom; add a test that sold, draft and deleted cars are absent.
- **[CI exposes secrets or depends on production]** → Use placeholder env values and a disposable/preview database for the build and smoke test; never put production keys in the workflow.
- **[Security headers break the office sign-in]** → Test the office door with the report-only policy before enforcement; allow the Clerk origins explicitly.
- **[Monitoring captures customer data]** → Scrub names, phone numbers, notes, cookies, request bodies and cost fields before sending; review the tracker configuration.
- **[Legal wording is copied from a template and is wrong]** → Owner approval is required; the terms and privacy pages share one review date and one contact rule.
- **[Performance work changes the approved visual design]** → Treat the reference as visual truth; image sizing, font delivery and heading changes are structural and must preserve the look.
- **[A new analytics request silently breaks the no-tracking promise]** → The cookie position is a requirement; any non-essential tracker is blocked until a consent and privacy review is recorded.

## Migration Plan

1. Documentation first: README, `.env.example`, changelog/handover. No runtime change.
2. Discovery and accessibility: metadata helper, robots, sitemap, `llms.txt`, JSON-LD, headings. Verify on a preview.
3. Quality gate: lint/format, CI, smoke test, dependency audit. Make the workflow blocking only after it is green on the current tree.
4. Security headers in report-only mode; fix violations; enforce.
5. Legal pages and cookie record.
6. Monitoring, alert ownership, rate-limit record, demo identity lifecycle and rollback note.
7. Performance baseline and image/font changes, measured before and after.

No database migration is required. The existing forward-only migration policy and deployment rollback remain unchanged. A metadata or header regression rolls back with the deployment; a legal or documentation change rolls back by reverting the page or note.

## Open Questions

- Which uptime/error vendor, and who receives the alert? The responsibility is required; the vendor is deferrable.
- What is the production domain, and is there an old-URL redirect map? A canonical host is required; the exact host is an owner input.
- Does the owner want a terms page drafted in-house or supplied by a lawyer? The page is required; the wording source is deferrable.
- Should demo Clerk identities expire after a fixed period, or live until the owner removes them? The lifecycle must be recorded; the policy is an owner decision.
- Is a PWA/offline showroom worth building? It is outside this change; the current offline notice remains.
- Does the owner want any privacy-respecting analytics later? The current answer is no; adding it reopens the consent review, not this change's scope.
