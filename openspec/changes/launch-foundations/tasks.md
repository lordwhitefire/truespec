# Launch foundations — implementation tasks

**Form:** these are plans for the Builder, not commands. Each task states what must be true; the Builder chooses the exact implementation.

## 1. Repository truth

- [x] 1.1 Write the root `README.md`: product summary, public/office split, stack, directory map, prerequisites, install, environment, migrations, seed, tests, build, deployment, main/demo, and links to the OpenSpec registry and current changes.
- [x] 1.2 Add a value-free `.env.example` naming every variable used by the app, scripts, cron routes and demo reset, with required/optional notes and no real secrets.
- [x] 1.3 Update the configuration error so a missing variable names `.env.example` and the README section that explains it.
- [x] 1.4 Add a changelog or release-note file and record the launch-foundations work.
- [x] 1.5 Add a short developer handover note covering architecture, the OpenSpec workflow, environments, deployment and known owner decisions.
- [x] 1.6 Prove a clean clone can follow the README to install, configure, migrate, seed, test and build.

## 2. Discoverability

- [x] 2.1 Add a shared metadata helper and set the production metadata base and title template.
- [x] 2.2 Give the home, inventory, car, privacy and terms pages titles, descriptions, canonical URLs and Open Graph/Twitter metadata; car metadata uses the public cover photo or the default image.
- [x] 2.3 Define the indexing rules: public pages indexable; office, API and auth excluded; filtered inventory canonicalises to `/inventory`; sold, deleted and unknown cars never presented as available indexable cars.
- [x] 2.4 Add `robots.txt` with the public allow rules, private disallows and sitemap URL.
- [x] 2.5 Add a dynamic sitemap containing the public static pages and currently listed cars only.
- [x] 2.6 Add `llms.txt` with the public business description, page links, currency and contact rule; prove no private value is included.
- [x] 2.7 Add Vehicle/Offer JSON-LD to car pages using only public fields, with NGN price, availability, seller and image.
- [x] 2.8 Provide a default social image and a car-photo fallback; verify every social and sitemap URL is absolute.

## 3. Accessibility

- [x] 3.1 Give the home page one `<h1>` that names the showroom without changing the approved visual design.
- [x] 3.2 Give the inventory page one `<h1>` and remove the duplicate page-level heading; keep result and card headings below it.
- [x] 3.3 Check heading order and landmarks on home, inventory, car, privacy and terms.
- [x] 3.4 Run a keyboard-only pass on the public showroom and office: reach every control, visible focus, dialogs move and return focus, Escape closes.
- [x] 3.5 Check contrast and ensure every state, error and success message has text or an icon, not colour alone.
- [x] 3.6 Check screen-reader names and live-region announcements for filters, result counts, forms and dialogs.
- [x] 3.7 Record WCAG 2.2 AA as the target and add an accessibility release check that includes a keyboard and screen-reader pass.

## 4. Delivery quality

- [x] 4.1 Add lint and format configuration and scripts for application code, scripts and tests.
- [x] 4.2 Add a CI workflow on pull requests and `main` that runs install, typecheck, unit tests, lint and production build.
- [x] 4.3 Add a Playwright smoke test for home, inventory, a car page and the unauthenticated office door; run it in CI or the documented pre-merge job.
- [x] 4.4 Add security headers in one configuration: content-type, framing, referrer, permissions and transport security.
- [x] 4.5 Add a CSP in report-only mode, exercise Clerk, fonts, icons, Sanity images and the showroom, fix violations, then enforce it.
- [x] 4.6 Add a dependency vulnerability check; either block on findings or record a dated owner acceptance with a remediation plan.
- [x] 4.7 Make the quality gate blocking only after it passes on the current tree; record the first green run as evidence.

## 5. Public trust

- [x] 5.1 Publish a terms page with owner-approved wording covering availability, price changes, the WhatsApp sale, delivery and governing law; link it from the public footer.
- [x] 5.2 Make the privacy notice's contact and deletion-request path real and consistent with the rest of the site; remove any promise the site cannot keep.
- [x] 5.3 Record the cookie and storage inventory: essential Clerk session, theme preference, demo state; no analytics or advertising trackers.
- [x] 5.4 Record that a consent banner is not required for the current set, and that any non-essential tracker requires a consent and privacy review before release.
- [x] 5.5 Add the owner and review date to each legal page and update them when the data flow or processor changes.

## 6. Launch operations

- [x] 6.1 Configure uptime monitoring for the public showroom and name the alert owner.
- [x] 6.2 Configure error tracking for server and client errors with PII and cost-field scrubbing.
- [x] 6.3 Record the rate-limit boundary for each unauthenticated write: Clerk sign-in, the tap WAF rule, demo sign-up and any public form; add a limit or a dated acceptance.
- [x] 6.4 Record the demo identity lifecycle and ensure demo cleanup never touches main identities, rows or assets.
- [x] 6.5 Document preview and production environments, migration application and deployment rollback.
- [x] 6.6 Write a runbook for showroom outage, office sign-in failure, backup failure, demo reset failure and suspected data exposure.
- [x] 6.7 Confirm the existing backup, demo reset, tap and session rules still hold after the new configuration.

## 7. Performance

- [x] 7.1 Measure LCP, CLS and INP for home, inventory and car pages on the agreed mobile profile and record the baseline.
- [x] 7.2 Serve car images at display size with reserved dimensions and lazy loading below the fold; prove the 15 MB upload cap is not a 15 MB delivery.
- [x] 7.3 Load fonts without a render-blocking third-party request, with a readable fallback and only the weights used.
- [x] 7.4 Record the public cache and revalidation policy and confirm it matches the showroom's freshness requirement.
- [x] 7.5 Add a bundle-size report or analyzer and a documented public-route budget.
- [x] 7.6 Re-measure after the changes and record any remaining miss or accepted trade-off.

## 8. Close-out

- [x] 8.1 Run `openspec validate --all` and confirm the change and existing changes are valid.
- [x] 8.2 Record the release evidence: green CI, smoke test, accessibility check, header check, lighthouse/CWV run and the legal/cookie review.
- [x] 8.3 Update `openspec/tasks-registry.md` with the work state and leave the implementation start to a new request.
