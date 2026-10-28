# LAUNCH-001 — launch foundations

**Capability:** the delivery layer around the already-built TrueSpec showroom and office.
**Status:** ready to build. **Testing:** `testing.md`, a separate session that did not build it; the
owner has deferred the runtime pass until all building is done.

**This is a plan, not a set of commands.** It states what must be true and why. The change's
`openspec/changes/launch-foundations/` carries the settled detail: `proposal.md`, seven capability
specs, `design.md` and 49 build tasks. Where this file is silent, the change decides. A genuine gap
is a question for the owner, not a new rule.

## What this task is

TrueSpec already works as a product: the public showroom, the private office, the inventory, the
money rules, the enquiries, the media store, the sessions, the backups and the demo space are built.
This task adds the layer that makes that product **findable, understandable, accessible, tested,
legally honest and operable after launch**.

It is not a restyle and not a new product feature. The approved visual reference remains the truth.

The work has seven parts:

1. **Repository truth** — a root README, `.env.example`, a changelog and a developer handover, so a
   clean clone can be set up without guessing.
2. **Discoverability** — metadata, canonical URLs, `robots.txt`, `sitemap.xml`, `llms.txt`, social
   cards and Vehicle JSON-LD, so search engines and AI readers see the public showroom correctly
   and never see the office.
3. **Accessibility** — the missing `<h1>`s, heading order, keyboard/focus, contrast, screen-reader
   names and a recorded WCAG 2.2 AA target.
4. **Delivery quality** — lint/format, a blocking CI gate, a browser smoke test, security headers
   and a dependency check.
5. **Public trust** — a terms page, a real privacy contact and a truthful cookie/consent position.
6. **Launch operations** — uptime and error alerts with an owner, rate-limit boundaries, the demo
   identity lifecycle, environment separation and rollback.
7. **Performance** — measured Core Web Vitals, image sizing, font loading, cache policy and a bundle
   budget.

## What is already true — do not rebuild it

- The public showroom and private office work; the office is guarded; the main/demo split is built
  and must not be reopened.
- The product's data model, cost boundary, WhatsApp enquiry path, import/export, settings, activity
  log, backups and daily demo reset are existing behaviour. This task does not change their rules.
- Some accessibility foundations already exist: focus handling, dialogs, live regions and reduced
  motion. Keep them; fix what is missing rather than replacing the interaction model.
- Sanity stores media; Clerk owns sign-in; Neon owns the database; Vercel hosts the app and runs the
  crons. Do not replace a provider.
- The site has no analytics, no advertising tracker and no email channel. That is a position, not an
  accident. Do not add one unless the owner changes it.

## The rules that shape every part

- **No product scope change.** No payments, cart, checkout, shipping, orders, reviews, native apps,
  multi-tenancy, realtime collaboration or outgoing webhooks. A PWA is deferred; the current offline
  notice and retry state stay as they are.
- **The showroom/office boundary and the main/demo boundary do not move.** The public showroom reads
  main only. The office resolves the signed-in space and never falls back to main. The new metadata,
  sitemap and `llms.txt` must never expose office data, costs, private notes, customer details or
  demo-only pages.
- **The approved visual design is the reference.** Accessibility and performance work may change
  structure (a heading level, an image size, a font delivery method) but must not turn the showroom
  into a different design.
- **Owner decisions are recorded, not invented.** The production domain, monitoring vendor, terms
  wording, demo identity retention and any future analytics are owner inputs. If a decision is
  missing, record it as open and do not bake a guess into code.
- **Secrets stay out of the repository.** `.env.example` contains names and placeholders, never a
  real key, token, connection string or customer value. Reports and logs never print one.
- **A public page must not lie.** A sold car must not be presented as available, an unknown car must
  be a real 404, and a private route must not return a successful public page.
- **No new database table is required.** This task is documentation, metadata, headers, tests,
  legal pages, monitoring and delivery work. If a piece seems to need a schema change, stop and
  report the gap; do not quietly add one.

## The work

The detailed order is in the change's `tasks.md`. The guarantees below are the contract.

### A. Repository truth

- A root `README.md` explains the product, the public/office split, the stack, the directory layout,
  local setup, environment, migrations, seed, tests, build, deployment and the main/demo model.
- A value-free `.env.example` names every variable, marks required versus optional, and is the file
  a missing-variable error points to.
- The configuration error names the missing variable and the README section.
- A changelog records user-visible and deployment-affecting changes.
- A developer handover links the architecture, the OpenSpec workflow, the environments, the
  deployment shape, the known owner decisions, the task registry and the test records.
- The operational commands for migrations, seed, backup restore, demo snapshot, leak check,
  store-freshness and cleanup readiness are documented, with which ones are safe against
  production.

### B. Discoverability

- Every indexable public page has a unique title, description, canonical URL and Open Graph/Twitter
  metadata. The metadata base is absolute, so no social or canonical URL is relative.
- Car pages use the public cover photo or a default social image. Car metadata names the year, make,
  model, price and mileage from public fields only.
- `robots.txt` allows the public showroom, disallows office/API/auth routes and names the sitemap.
  It is not treated as access control.
- `sitemap.xml` lists home, inventory, privacy, terms and every currently public car. Sold, deleted
  and draft cars do not appear. URLs are absolute.
- `llms.txt` describes the business, the public pages, the inventory, the Naira currency and the
  WhatsApp contact rule. It contains no office data, costs, private notes or customer data.
- Car pages carry Vehicle/Offer JSON-LD built only from fields already public: make, model, year,
  mileage, colours, price in NGN, availability, seller and image. A sold car is not offered as
  available.
- The indexing rules are explicit: filtered inventory canonicalises to `/inventory`; office, API and
  auth routes are excluded; unknown and sold cars are not presented as normal indexable cars.

### C. Accessibility

- Home and inventory each have exactly one page-level `<h1>`. Car and legal pages keep theirs. The
  heading order below the `<h1>` does not skip levels.
- Every control is reachable and operable by keyboard, with a visible focus indicator. A dialog
  moves focus inside, closes on Escape and returns focus to its trigger.
- State, error and success messages use text or an icon, not colour alone. Text and meaningful
  interface elements meet WCAG 2.2 AA contrast.
- Screen-reader names and live regions are correct for filters, result counts, forms and dialogs.
- WCAG 2.2 AA is recorded as the target. The release check includes a keyboard pass and a
  screen-reader pass, not only an automated scanner.

### D. Delivery quality

- ESLint and a formatter are configured and runnable for application code, scripts and tests.
- A GitHub Actions workflow runs install, typecheck, unit tests, lint and production build on pull
  requests and `main`. A failing step fails the workflow and blocks the merge.
- One Playwright smoke test loads home, inventory and a public car page, opens the office door, and
  proves an anonymous visitor cannot reach office data.
- Security headers are configured in one place: content-type, framing, referrer, permissions and
  transport security. A CSP starts in report-only, is exercised on Clerk, fonts, icons, Sanity
  images and the showroom, then enforced.
- A dependency vulnerability check runs in CI. A finding blocks the merge or has a dated owner
  acceptance with a remediation plan.
- The quality gate is made blocking only after it is green on the current tree.

### E. Public trust

- A terms page is published with owner-approved wording, a last-updated date and a footer link. It
  covers availability, price changes, the WhatsApp sale path and governing law.
- The privacy notice names a contact channel that exists, describes the WhatsApp tap and demo data
  accurately, and does not promise a deletion channel the site does not provide.
- The cookie/storage inventory matches what the browser actually stores: essential Clerk session,
  theme preference, demo state; no analytics or advertising tracker.
- The no-analytics position is recorded, and a consent banner is not required for the current set.
  Any non-essential tracker requires a consent and privacy review before release.
- Each legal page names its owner and review date.

### F. Launch operations

- Uptime monitoring requests a public page on a schedule and alerts a named owner after a sustained
  failure.
- Error tracking records server and client errors with route, release and scrubbed context. Costs,
  customer names, phone numbers, private notes, cookies and environment values are never sent.
- Every unauthenticated write has a recorded boundary: Clerk sign-in, the Vercel WAF tap rule, demo
  sign-up and any public form. Each has an enforced limit or a dated owner acceptance.
- The demo identity lifecycle is recorded, and demo cleanup never deletes a main identity, row or
  asset.
- Local, preview and production are defined; preview never writes to the production database or
  asset store. A separate staging environment is recorded as required or not required.
- The deployment and rollback note explains migrations, preview isolation and how to restore the
  previous deployment without losing committed data.
- A runbook covers showroom outage, office sign-in failure, backup failure, demo reset failure and
  suspected data exposure, including containment and key rotation.

### G. Performance

- LCP ≤ 2.5 s, CLS ≤ 0.1 and INP ≤ 200 ms at the 75th percentile on the agreed mobile profile for
  home, inventory and car pages. A regression is named and accepted, not hidden.
- Car images are requested at display size, reserve their space and lazy-load below the fold. The
  15 MB upload cap is not a 15 MB delivery.
- Fonts load without a render-blocking third-party request, use only the weights the page uses, and
  leave readable text when the font request fails.
- The public cache/revalidation policy is recorded and matches the showroom's freshness needs.
- A bundle report or analyzer exists with a documented public-route budget. A breach is explained in
  the release note.

## Benchmarks

These are the checks that decide whether the task is done. They are written as observable results,
not as code instructions.

### Repository truth

1. **After this change, when a new developer clones the repository, they can follow the README to
   install, configure, migrate, seed, test and build without asking for a missing step.**
2. **When a required environment variable is missing, the startup error names it and points to
   `.env.example` and the README section.**
3. **When `.env.example` is opened, every variable is named, required/optional is clear, and no real
   secret is present.**
4. **When an operator needs a backup restore, the documented command names the script, the key and
   the target, and warns against restoring into main.**

### Discoverability

5. **After this change, when the home page is fetched, it has a title, description, absolute
   canonical URL, Open Graph/Twitter metadata and a social image.**
6. **When a public car page is fetched, its title names the car, its description includes the public
   price and mileage, and its JSON-LD is a Vehicle/Offer with NGN price, availability, seller and
   image.**
7. **When a sold car is fetched, it is not presented as available and no available `Offer` is
   emitted.**
8. **When an unknown car reference is fetched, the response is a real 404, not a successful empty
   car page.**
9. **When the inventory is opened with status, make, price or sort parameters, the canonical URL is
   the unfiltered `/inventory`.**
10. **When `robots.txt` is fetched, it allows the public showroom, disallows `/office/` and `/api/`,
    and names the sitemap.**
11. **When `sitemap.xml` is fetched, it lists the public pages and every currently listed car, and a
    sold or deleted car is absent.**
12. **When `llms.txt` is fetched, it contains the public business description, page links, currency
    and contact rule, and no cost, private note, customer or office data.**
13. **When a social link preview is generated, the image and canonical URL are absolute and resolve
    to the production origin.**

### Accessibility

14. **When the home page is parsed, it has one `<h1>` naming the showroom and no skipped heading
    level.**
15. **When the inventory is parsed, it has one `<h1>` naming the inventory and no duplicate
    page-level heading.**
16. **When a keyboard-only visitor opens the inventory, changes a filter and pages the results, every
    control is reachable, focus is visible and the result count is announced.**
17. **When a dialog is opened and closed with Escape or Cancel, focus moves inside and returns to the
    trigger.**
18. **When a state or error is shown without colour, the meaning is still readable as text or an
    icon.**
19. **When the release check is run, it records the WCAG 2.2 AA target, the pages tested, the
    keyboard pass and the screen-reader pass.**

### Delivery quality

20. **When a pull request contains a TypeScript error, a failing unit test or a lint error, CI fails
    at that step.**
21. **When a pull request changes application code, CI runs the production build and reports success
    or failure.**
22. **When the smoke test runs, home, inventory and a car page load with their main heading, and an
    anonymous office request is sent to sign-in with no office data rendered.**
23. **When a public page response is inspected, the documented content-type, frame, referrer,
    permissions and transport-security headers are present.**
24. **When the public pages load with the CSP active, there is no content-security-policy violation
    in the browser console.**
25. **When the dependency check finds a known vulnerability, CI fails or a dated owner acceptance
    names the package, severity, owner and review date.**

### Public trust

26. **When a visitor opens `/terms`, the approved terms render with a last-updated date and a footer
    link from every public page.**
27. **When a visitor follows the privacy contact instruction, the named channel is reachable and
    matches the contact shown elsewhere on the site.**
28. **When the browser storage is inspected, the recorded cookie/storage inventory matches what is
    actually stored and no unrecorded tracker is present.**
29. **When a non-essential analytics or advertising script is proposed, the change is blocked until
    a consent and privacy review is recorded.**

### Launch operations

30. **When the public showroom fails repeatedly for the configured threshold, the named owner
    receives an alert naming the URL, time and failure.**
31. **When a server error is thrown, the tracker records route, release and error type without a
    customer name, phone number, cost, private note, cookie or environment value.**
32. **When one source sends taps above the configured threshold, the edge refuses or throttles them
    and no store write occurs.**
33. **When one source creates demo accounts above the configured threshold, the provider or app
    refuses or throttles further sign-ups.**
34. **When the daily demo reset runs, demo rows and demo assets reset and demo identities follow the
    recorded lifecycle; no main account, row or asset is removed.**
35. **When a production deployment is found to be bad, the documented rollback restores the previous
    deployment and states what happens to forward-only migrations.**
36. **When a preview deployment runs, it does not write to the production database or the production
    asset store.**
37. **When the backup job fails, the named owner is alerted and the runbook says how to inspect the
    job and rerun safely.**

### Performance

38. **When home, inventory and car pages are tested on the agreed mobile profile, LCP, CLS and INP
    are recorded and compared with the targets.**
39. **When the inventory is opened on a phone-width viewport, each car card requests a
    display-sized image and reserves its space before the image loads.**
40. **When a car image fails to load, the placeholder occupies the same space and the page does not
    jump.**
41. **When the font stylesheet is unavailable, the page remains readable with the fallback font and
    no invisible text.**
42. **When the public pages are loaded, only the font weights the page uses are requested.**
43. **When a public page is deployed, its cache/revalidation behavior is recorded and matches the
    showroom's freshness requirement.**
44. **When the bundle command is run, it reports the public route sizes and the configured budget;
    a breach is named in the release note.**

### Close-out

45. **When `openspec validate --all` runs, the launch-foundations change and the existing changes
    pass.**
46. **When the release evidence is collected, it contains the green CI run, smoke test,
    accessibility check, header check, CWV/Lighthouse run and the legal/cookie review.**
47. **When a demo or main account is used after the change, the public showroom still reads main, the
    office still resolves the signed-in space, and no new route exposes private data.**

## Boundaries

- No payments, cart, checkout, shipping, orders, reviews, native apps, multi-tenancy, realtime
  collaboration or outgoing webhooks.
- No PWA/service-worker work in this task. The current offline notice and retry state stay.
- No analytics, advertising tracker or email channel. Any future addition reopens the consent and
  privacy review.
- No new database table. If the work appears to need one, stop and report it.
- The existing main/demo isolation and the showroom/office boundary are not reopened.

## Read first

- `openspec/changes/launch-foundations/proposal.md`
- `openspec/changes/launch-foundations/specs/` — the seven capability contracts
- `openspec/changes/launch-foundations/design.md` — decisions, risks and open questions
- `openspec/changes/launch-foundations/tasks.md` — the 49-step build order
- `openspec/research/truespec-checklist-2026-10-26.md` — the audit that named the gaps
