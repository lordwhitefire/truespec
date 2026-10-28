# LAUNCH-001 — testing task

**For:** a tester in a separate session that did **not** build this work.
**When:** after all building is done and the owner starts the testing phase. The owner has
deliberately deferred runtime testing until then; this file is ready for that pass and is not a
second implementation.
**Read first:** `task.md` (the guarantees and benchmarks), then the change's `proposal.md`,
`specs/`, `design.md` and `tasks.md` in `openspec/changes/launch-foundations/`. The specs are the
contract; this file says how to prove it.

## The tester's rules

- **Do not fix code.** The tester reports what was done, what was seen, expected versus actual, and
  any residue. The Builder fixes.
- **Test data only.** Use a local or preview environment and clearly named test values. Do not use
  the client's real account, real customer data or the production database for destructive checks.
- **Never point a destructive check at main.** Demo cleanup, reset, rate-limit and header tests use a
  throwaway branch, a local server or a preview environment. A mistake here could delete or expose
  the showroom.
- **A check that cannot run is not a pass.** Record **NOT RUN** with the reason and whether code
  inspection or a unit test covers the same guarantee.
- **The build's own evidence is not the independent pass.** A builder's browser run, a green unit
  test or a clean build report is useful, but it does not replace the checks below.
- **No secret in the report.** Do not print the backup key, `CRON_SECRET`, `NEON_API_KEY`,
  connection strings, tokens, customer names or phone numbers. A failure may quote a non-secret
  fragment.
- **Keep the visual reference.** An accessibility or performance fix that changes the approved look
  is a fail unless the owner approved the change.

## Setup

- A clean clone of the repository on a test machine, plus the existing working tree for comparison.
- A local or preview deployment with its own database and asset store. Do not use the production
  database for test writes.
- Node and the project's package manager installed. The README is the only setup guide allowed for
  the clean-clone check; do not use private notes for that check.
- A GitHub account that can open a throwaway pull request in the repository, or an existing CI run
  plus code inspection if the tester cannot push. A red-path CI check needs a deliberately broken
  throwaway branch; delete the branch and never merge it.
- A browser with DevTools, a keyboard, and a screen reader (NVDA, VoiceOver, or the platform
  equivalent).
- Read-only access to the preview database for car states, sold cars and sitemap checks.
- The owner or an administrator available for dashboard facts: Vercel project/environment/cron/WAF,
  the monitoring vendor, the error tracker, the production domain and the terms approval.
- A test demo account, a test main account and a test client/main account. Do not share passwords;
  sign in through the provider.
- A test social-preview tool or direct Open Graph parsing. No third-party SEO service is required.

## A. Repository truth

**A1 — clean-clone setup.**
Clone into an empty directory and follow only the README. Expected: prerequisites, install,
environment, migration, seed, test and build commands all work in the documented order. Record every
command and result.

**A2 — missing variable.**
Start with one required variable absent. Expected: the error names that variable and points to
`.env.example` and the README section. Restore it afterwards.

**A3 — value-free example.**
Open `.env.example`. Expected: every variable used by the app, scripts, cron routes and demo reset is
named; required/optional is clear; every value is empty or an obvious placeholder. Scan for a real
key, token or connection string.

**A4 — operational commands.**
Find the documented commands for migration, seed, backup restore, demo snapshot, leak check,
store-freshness and cleanup readiness. Expected: each names the script and what it touches, and the
production-safe warning is present. Do not run a destructive command against production.

**A5 — changelog.**
Open the changelog. Expected: the launch-foundations work is recorded with a date, in reverse
chronological order.

**A6 — handover.**
Open the developer handover. Expected: it links the README, the current OpenSpec changes, the task
registry, the environments, the deployment shape and the known owner decisions without duplicating
their full content.

## B. Discoverability

**B1 — home metadata.**
Fetch the home page. Expected: title, description, absolute canonical URL, Open Graph title,
description and image, and Twitter card metadata. No relative canonical or social URL.

**B2 — inventory metadata.**
Fetch `/inventory`. Expected: a title and description that describe the stock and a canonical URL
that excludes status, make, price, sort, view and page parameters.

**B3 — car metadata.**
Fetch a currently listed car. Expected: the title names year, make and model; the description
includes the public price and mileage; the Open Graph image is the car's cover photo or the default;
the canonical URL is absolute.

**B4 — car structured data.**
Inspect the car page's JSON-LD. Expected: `Vehicle` with make, model, year, mileage, colours, price
in NGN, availability, seller and image, using only fields visible on the public page. No cost,
private note or customer value.

**B5 — sold car.**
Fetch a sold car URL. Expected: it is not presented as available and does not emit an available
`Offer`. If the route is a 404, record that and confirm it is not indexable as a normal car.

**B6 — unknown car.**
Fetch a made-up car reference. Expected: a real 404 status and no successful empty car page.

**B7 — robots.**
Fetch `/robots.txt`. Expected: public showroom allowed, `/office/` and `/api/` disallowed, sitemap URL
named. Confirm the rule is not treated as access control by requesting a private path directly.

**B8 — sitemap.**
Fetch `/sitemap.xml`. Expected: home, inventory, privacy, terms and every currently listed car;
absolute URLs; sold, deleted and draft cars absent. If a car is sold during the check, refetch and
confirm it leaves the sitemap.

**B9 — llms.txt.**
Fetch `/llms.txt`. Expected: plain text with the business description, page links, Naira currency and
WhatsApp contact rule. Scan for cost, profit, private note, customer, office and demo-only terms; none
may appear.

**B10 — social preview.**
Use a preview tool or parse the Open Graph tags. Expected: image and canonical URL resolve to the
production origin, the image is reachable, and the preview does not show a broken or relative URL.

## C. Accessibility

**C1 — home heading.**
Parse the home page. Expected: exactly one `<h1>` naming TrueSpec or the showroom; section headings
are `<h2>` or deeper; no skipped level.

**C2 — inventory heading.**
Parse `/inventory`. Expected: exactly one `<h1>` naming the inventory; result and card headings do
not introduce a second `<h1>`; no skipped level.

**C3 — car and legal headings.**
Parse a car page, `/privacy` and `/terms`. Expected: one page-level `<h1>` each, with a sensible
heading order below it.

**C4 — keyboard inventory.**
Using only the keyboard, open the inventory, change a filter, page the results, open a car and return.
Expected: every control is reachable, focus is visible, no focus trap outside a deliberate dialog, and
the result count is announced.

**C5 — dialog focus.**
Open a confirmation dialog. Expected: focus moves inside; Escape and Cancel close it; focus returns
to the control that opened it; the background does not scroll while the dialog is open.

**C6 — status without colour.**
View a car state, a form error and a success message in grayscale or with colour-blind simulation.
Expected: each is still understandable from text or an icon, not colour alone.

**C7 — contrast and names.**
Check text and meaningful interface elements against WCAG 2.2 AA contrast. Check screen-reader names
for filters, result counts, forms, dialogs and icon buttons. Expected: no unnamed control and no
contrast failure that changes meaning.

**C8 — release evidence.**
Open the accessibility release check. Expected: it records WCAG 2.2 AA as the target, the pages
tested, a keyboard pass and a screen-reader pass — not only an automated scanner result.

## D. Delivery quality

**D1 — lint and format.**
Run the documented lint and format-check commands. Expected: they check application code, scripts and
tests; lint exits non-zero on a lint error; format-check reports without rewriting.

**D2 — CI green path.**
Open the CI workflow and a successful run. Expected: install, typecheck, unit tests, lint and
production build all ran on a pull request and on `main`.

**D3 — CI red path.**
Create a throwaway branch with a deliberate TypeScript error (or a failing unit test) and open a pull
request. Expected: CI fails at that step. Delete the branch and close the pull request; do not merge.

**D4 — production build.**
Confirm the CI build step builds the application, not only the tests. Expected: a production build
completes in the workflow.

**D5 — smoke test.**
Run the documented browser smoke test against a preview or local build. Expected: home, inventory and
a car page load with their main heading; an anonymous office request is sent to sign-in and no office
data is rendered.

**D6 — security headers.**
Inspect a public page response with the browser network panel or a header request. Expected:
content-type, frame, referrer, permissions and transport-security headers are present as documented.

**D7 — CSP.**
Load home, inventory and a car page with the policy active. Expected: pages render; the browser
console has no content-security-policy violation; Clerk sign-in still works; fonts and icons load.

**D8 — dependency check.**
Run the documented dependency check or inspect the CI step. Expected: a known vulnerability blocks
the merge or has a dated acceptance naming the package, severity, owner and review date.

## E. Public trust

**E1 — terms page.**
Open `/terms`. Expected: the approved terms render, with a last-updated date and an owner/review
record. A placeholder or unapproved draft is a fail.

**E2 — footer link.**
Open the public home, inventory and a car page. Expected: each footer links to the terms page.

**E3 — privacy contact.**
Follow the privacy notice's contact instruction. Expected: the channel exists, matches the contact
shown elsewhere on the site, and reaches the owner. Do not send a real customer request; use a test
message.

**E4 — deletion path.**
Read the privacy notice's deletion instruction. Expected: it explains how a deletion request reaches
the owner and what the owner can remove; it does not promise an email address or a self-service
channel the site does not provide.

**E5 — cookie/storage inventory.**
Open DevTools on a fresh public session and on an office session. Expected: the recorded inventory
matches the observed Clerk session cookie, theme preference and demo state; no unrecorded analytics,
advertising or tracker is present. If a consent banner is absent, confirm the recorded position says
it is not required for this set.

**E6 — legal review date.**
Open each legal page. Expected: an owner and a last-updated date are present, and the date is
consistent with the recorded review.

## F. Launch operations

**F1 — uptime monitor.**
Inspect the monitor configuration. Expected: a public page is checked on a schedule, the alert owner
is named, and the failure threshold is recorded. If the vendor offers a test alert, use it; never take
production down to test.

**F2 — error tracking.**
Throw a controlled test error in a preview environment with fake customer data in the request.
Expected: the tracker records route, release and error type, and the customer name, phone number,
cost, private note, cookie and environment value are absent.

**F3 — rate-limit record.**
Open the rate-limit record. Expected: Clerk sign-in, the tap WAF rule, demo sign-up and any public
form each have a boundary; every unauthenticated write has an enforced limit or a dated owner
acceptance. If a form has no limit, the acceptance explains why.

**F4 — tap limit.**
Use a local/preview test or a small, safe threshold test. Expected: requests above the configured
threshold are refused or throttled and no store write occurs. Do not flood production.

**F5 — demo sign-up limit.**
Use a test or preview configuration. Expected: sign-ups above the threshold are refused or
throttled. Do not create a large number of real accounts.

**F6 — demo identity lifecycle.**
Open the recorded lifecycle. Expected: whether demo identities live forever, expire or are deleted is
stated. If cleanup is configured, use a throwaway demo account/branch and prove no main identity, row
or asset is removed. Never run the cleanup against main.

**F7 — environments.**
Inspect the deployment settings and documentation. Expected: local, preview and production are
defined; preview does not point at the production database or asset store; a separate staging
environment is recorded as required or not required.

**F8 — rollback.**
Read the deployment/rollback note. Expected: it names how to restore the previous deployment, what
happens to forward-only migrations, and who performs the rollback. Do not perform a real production
rollback unless the owner asks.

**F9 — runbook.**
Open the runbook. Expected: showroom outage, office sign-in failure, backup failure, demo reset
failure and suspected data exposure each have a first response, an owner and a containment/rotation
path.

**F10 — existing guarantees.**
Re-check the existing showroom/office and main/demo boundaries after the new configuration. Expected:
the public showroom still reads main; the office still resolves the signed-in space; no new route
exposes costs, private notes or customer data.

## G. Performance

**G1 — mobile baseline.**
Run Lighthouse or the agreed lab test on home, inventory and car pages on the agreed mobile profile.
Expected: LCP, CLS and INP are recorded and compared with LCP ≤ 2.5 s, CLS ≤ 0.1 and INP ≤ 200 ms at
the 75th percentile. Field data is recorded separately if available; do not call lab data field data.

**G2 — car card images.**
Open the inventory at phone width and inspect image requests. Expected: each card requests a
display-sized transformed image, not the original upload; dimensions or aspect ratio reserve space;
below-the-fold images lazy-load.

**G3 — missing image.**
Block or break a car image in DevTools. Expected: the placeholder occupies the same space and the page
does not jump.

**G4 — font fallback.**
Block the font stylesheet. Expected: the page remains readable with a fallback font and no invisible
text.

**G5 — font payload.**
Inspect the font requests. Expected: only the weights the page uses are requested; no render-blocking
third-party font request.

**G6 — cache policy.**
Open the recorded public cache/revalidation policy and compare it with the response headers. Expected:
the policy is deliberate and matches the showroom's freshness requirement; no public page is
uncached by accident.

**G7 — bundle budget.**
Run the documented bundle command. Expected: it reports public route sizes and the configured budget;
a breach is named in the release note.

**G8 — regression.**
Compare the after-change measurements with the baseline. Expected: no metric is worse beyond its
target without a recorded owner acceptance.

## H. Close-out

**H1 — OpenSpec validation.**
Run `openspec validate --all`. Expected: the launch-foundations change and the existing changes pass.

**H2 — release evidence.**
Collect the green CI run, smoke test, accessibility check, header check, CWV/Lighthouse run and the
legal/cookie review. Expected: each is present and dated; a missing item is **NOT RUN**, not a pass.

**H3 — no regression.**
Re-check the showroom, office door, demo banner and public/office data boundary. Expected: the new
metadata, headers, sitemap and docs did not change the product's visible rules.

## Pass and fail

- **PASS** — the expected result was observed and the evidence is recorded.
- **FAIL** — the expected result was not observed, or a regression was introduced.
- **NOT RUN** — the check could not be performed safely or the required owner input was absent. The
  reason and any compensating code/unit evidence are recorded.
- A group passes only when every check is PASS, or a NOT RUN is explicitly accepted with a reason and
  compensating evidence. A not-run check is never counted as a pass.

## Evidence and residue

For each check, record:

- the check ID and a one-line result;
- the page, route, browser, viewport or command used;
- expected versus actual;
- the evidence (a non-secret snippet, status code, screenshot name or command result);
- any test data or residue left behind, and what was restored or removed.

Do not put a secret, connection string, customer name, phone number or private note in the report.
If a test creates a car, setting, upload, demo account or branch, remove it or name it as deliberate
test residue and restore the previous state. Activity rows may remain; say so.

## Report

Write the result under `developer-workspace/reports/LAUNCH-001-testing-report.md` (or the task folder
copy the owner asks for). Start with the verdict, then the groups, then the NOT RUN list and the
residue list. The report is the evidence for the closing gate; it is not a place to fix the code.
