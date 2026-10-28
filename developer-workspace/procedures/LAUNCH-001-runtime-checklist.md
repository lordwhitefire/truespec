# LAUNCH-001 — the release checklist

**What this is:** the project's CI/CD pipeline. It is a checklist an agent runs, not a single script
and not a GitHub Actions gate. The agent attaches to the visible Chrome, performs every check, records
**PASS / FAIL / NOT RUN** with evidence, writes the handoff, and leaves the push to the owner.
**Authority:** `openspec/tasks/LAUNCH-001/task.md` (the 47 benchmarks) and `testing.md` (the independent
tester's A1–H3 checks). This file maps both. Where they differ, `task.md` wins.
**Standing browser procedure:** `developer-workspace/procedures/browser-check.md`. Read it before this
file. This checklist is the builder's release gate; it does **not** replace the independent testing
session in `testing.md`.

---

## 1. How to run it

1. **Confirm the surface.** Build on `:3210`, reference on `:3211`, automation Chrome visible on CDP
   `:9222` with no `Headless` in its User-Agent. Port `3000` is never used.
2. **Smoke the harness.** `node developer-workspace/scripts/LAUNCH-001/_lib.mjs` — attach, prove it is
   ours, list the existing tabs, confirm the Chromium count did not rise, detach.
3. **Reuse, never create.** Use the existing build tab for every browser check. Do not open a tab,
   launch a browser, take a screenshot or run headless. If the build or reference tab is missing,
   **stop** and report; do not create one.
4. **Run each check below.** Browser checks use the build tab. CLI/file checks run in the repository.
   Dashboard/owner checks are marked **NOT RUN — owner** until the owner supplies the fact; they are
   never guessed.
5. **Record the result.** `PASS` = the expected result was observed and the evidence is recorded.
   `FAIL` = it was not observed, or a regression appeared. `NOT RUN` = it could not be performed
   safely, or the owner input is absent; state the reason and any compensating evidence. A not-run
   check is never a pass.
6. **Do not fix silently.** A FAIL is named with the route, expected vs actual and evidence. The
   builder fixes it; the checklist is re-run after the fix. A check that is out of scope is named as
   residue, not quietly dropped.
7. **Write the handoff.** `developer-workspace/reports/LAUNCH-001-handoff.md`: what passed, what
   failed, what was not run, residue, and that the owner decides whether to push. No secret, customer
   name, phone number, cost, private note, cookie or environment value in the handoff.
8. **Stop.** The owner pushes. The agent does not push, merge or change branch protection.

**Evidence format:** check ID, route or command, viewport/state, expected, actual, a non-secret
snippet or status code, and the result. Store browser artefacts under
`developer-workspace/scripts/LAUNCH-001/runs/`.

**Viewports:** public `560 / 820 / 1100`; office `1440 / 820 / 560 / 390`; themes `dark / light`.
The full cell matrix is in `browser-check.md`; this checklist names the states it needs, not every
pixel cell.

---

## 2. Preconditions

- [ ] `:3210` returns 200 for `/`.
- [ ] `:3211` returns 200 for the reference.
- [ ] Chrome `:9222` is visible and ours; no Headless.
- [ ] The build tab exists on `:3210`; the reference tab exists on `:3211`.
- [ ] Chromium count before = after; no new tab.
- [ ] No secret is printed in the run log or the handoff.
- [ ] The owner setup gates are known: Sentry DSN, UptimeRobot monitor, Vercel Preview env + Sanity
      `preview` dataset, terms approval. A check that needs one is `NOT RUN — owner`, not a guess.

---

## 3. A — Repository truth

| ID | Method | Route / action | Expected | Evidence | Result |
|---|---|---|---|---|---|
| A1 | CLI + file | Clean clone into an empty directory; follow only `README.md` for prerequisites, install, env, migrate, seed, test, build. | Every documented command works in order; no missing step. | Commands and results; the clone path. | |
| A2 | CLI | Start with one required variable absent (use a throwaway env file). | The error names the variable and points to `.env.example` and the README section. Restore afterwards. | Error text with the variable name; no secret value. | |
| A3 | File | Open `.env.example`; cross-check every variable used by app, scripts, crons and demo reset. | Every variable named; required/optional clear; every value empty or an obvious placeholder; no real secret. | Count of variables; the placeholder pattern; scan result. | |
| A4 | File | Read the operational commands for migration, seed, backup restore, demo snapshot, leak check, store freshness, cleanup readiness. | Each names the script and what it touches; the production-safe warning is present. Do not run a destructive command. | Command names; warning text; what was not run. | |
| A5 | File | Open the changelog. | The launch-foundations work is recorded with a date, newest first. | Entry and date. | |
| A6 | File | Open the developer handover. | Links README, current OpenSpec changes, task registry, environments, deployment shape, owner decisions; does not duplicate their full content. | Link list. | |

**Benchmarks covered:** 1–4. **Testing covered:** A1–A6.

---

## 4. B — Discoverability

| ID | Method | Route / action | Expected | Evidence | Result |
|---|---|---|---|---|---|
| B1 | Browser | `GET /`; read `<head>`. | Unique title, description, absolute canonical, `og:title`, `og:description`, `og:image`, Twitter card. No relative canonical or social URL. | Title, canonical, OG/Twitter values; image status. | |
| B2 | Browser | `GET /inventory`; then `?status=available&make=Toyota&sort=low&page=2`. | Title and description describe the stock; canonical is the unfiltered absolute `/inventory` on both. | Canonical on both URLs. | |
| B3 | Browser | `GET` a currently listed car. | Title names year, make, model; description includes public price and mileage; OG image is the cover or default; canonical is absolute. | Title, description, canonical, image URL. Record the car reference. | |
| B4 | Browser + parse | Inspect the car page's `application/ld+json`. | `Vehicle` with make, model, year, mileage, colours, price in NGN, availability, seller and image; only public fields. No cost, private note or customer value. | JSON-LD snippet; fields present/absent. | |
| B5 | Browser | `GET` a sold car. | Not presented as available; no available `Offer`. If 404, record it and confirm it is not indexable as a normal car. | Status, availability text, JSON-LD `availability`. Record the car reference. | |
| B6 | Browser | `GET /car/TS-999999` (a made-up reference). | Real 404 status; no successful empty car page. | Status; rendered text/404 page. | |
| B7 | Fetch | `GET /robots.txt`; then request a private path directly. | Public showroom allowed; `/office/` and `/api/` disallowed; sitemap named. The rule is not access control. | robots text; private path status. | |
| B8 | Fetch | `GET /sitemap.xml`. | Home, inventory, privacy, terms and every currently listed car; absolute URLs; sold, deleted and draft cars absent. | URL count; sample URLs; sold/deleted check. | |
| B9 | Fetch | `GET /llms.txt`. | Plain text with business description, page links, Naira currency and WhatsApp contact rule; no cost, profit, private note, customer, office or demo-only term. | Text excerpt; forbidden-term scan. | |
| B10 | Parse | Parse the OG/Twitter tags; fetch the image and canonical. | Image and canonical are absolute and resolve to the production origin; image is reachable; no broken or relative URL. | Image status and content-type; canonical origin. | |

**Benchmarks covered:** 5–13. **Testing covered:** B1–B10.

---

## 5. C — Accessibility

| ID | Method | Route / action | Expected | Evidence | Result |
|---|---|---|---|---|---|
| C1 | Browser | Parse `/`. | Exactly one page-level `<h1>` naming TrueSpec/the showroom; section headings `<h2>` or deeper; no skipped level. | H1 count/text; heading outline. | |
| C2 | Browser | Parse `/inventory` (ambient and filtered). | Exactly one `<h1>` naming the inventory; cards/results do not add a second `<h1>`; no skipped level. | H1 count/text; outline. | |
| C3 | Browser | Parse a car page, `/privacy`, `/terms`. | One page-level `<h1>` each; sensible order below it. | H1 count/text; outline. | |
| C4 | Browser + keyboard | Inventory: Tab to filters, change one, page results, open a car, return. | Every control reachable and operable; visible focus; no focus trap outside a dialog; result count announced. | Tab order; focused element; live-region text. | |
| C5 | Browser + keyboard | Open a confirmation dialog; press Escape; reopen and Cancel. | Focus moves inside; Escape and Cancel close; focus returns to the trigger; background does not scroll. | Active element before/inside/after; scroll lock. | |
| C6 | Browser | View a car state, a form error and a success message in grayscale/colour-blind simulation. | Meaning is still readable from text or an icon, not colour alone. | State text/icon; what changed in grayscale. | |
| C7 | Browser + tool | Check text and meaningful controls against WCAG 2.2 AA; check names for filters, counts, forms, dialogs, icon buttons. | No unnamed control; no contrast failure that changes meaning. | Contrast values; accessible names. | |
| C8 | File | Open the accessibility release check. | Records WCAG 2.2 AA target, pages tested, a keyboard pass and a screen-reader pass — not only an automated scan. | File path; the four records. | |

**Benchmarks covered:** 14–19. **Testing covered:** C1–C8.
**Not checked here:** the real screen-reader pass is the separate testing session (C8 may be
`NOT RUN — testing session` until then; record it, do not claim a pass).

---

## 6. D — Delivery quality

| ID | Method | Route / action | Expected | Evidence | Result |
|---|---|---|---|---|---|
| D1 | CLI | Run the documented lint and format-check commands. | They check app, scripts and tests; lint exits non-zero on an error; format-check reports without rewriting. | Commands; exit codes; file count. | |
| D2 | Checklist + CLI | Run the green-path checks: install, typecheck, unit tests, lint, production build. (Owner ruling: the checklist is the pipeline; a GitHub Actions run is not the gate.) | Every step passes on the current tree. | Command results; build ID. | |
| D3 | CLI | Introduce a deliberate TypeScript error or failing unit test on a throwaway branch/copy; run the same checks. | The check fails at that step; restore the tree. | Failing output; restoration proof. | |
| D4 | CLI | Run the production build. | It builds the application, not only the tests. | Build output; route list. | |
| D5 | Browser | Smoke: home, inventory, a car page; then request an office route anonymously. | Pages load with their main heading; anonymous office is sent to sign-in and no office data renders. | Status/final URL; headings; no office data. | |
| D6 | Browser | Inspect a public response's headers. | Content-type, frame, referrer, permissions and transport-security headers present as documented. | Header values. | |
| D7 | Browser | Load home, inventory, a car page with the CSP active; sign in with Clerk; load fonts/icons. | Pages render; no CSP violation in the console; Clerk works; fonts/icons load. | Console violations (none); sign-in result; font/icon requests. | |
| D8 | CLI | Run the dependency check or inspect the checklist step. | A known vulnerability blocks or has a dated acceptance naming package, severity, owner and review date. | Audit output; acceptance if any. | |

**Benchmarks covered:** 20–25. **Testing covered:** D1–D8.
**Owner ruling:** the checklist replaces the GitHub Actions gate. D2/D3 are agent-run checks; a CI
workflow is not required. The old unit suite is a helper.

---

## 7. E — Public trust

| ID | Method | Route / action | Expected | Evidence | Result |
|---|---|---|---|---|---|
| E1 | Browser | Open `/terms`. | Owner-approved terms render, with a last-updated date and owner/review record. A placeholder or unapproved draft is a fail. | Status; date; approval record. | |
| E2 | Browser | Open home, inventory and a car page; inspect the footer. | Each footer links to `/terms`. | Link href. | |
| E3 | Browser + owner | Follow the privacy notice's contact instruction with a test message. | The channel exists, matches the contact shown elsewhere, and reaches the owner. | Channel; match; test message result. | |
| E4 | File | Read the deletion instruction. | Explains how a deletion request reaches the owner and what can be removed; does not promise an email or self-service channel the site does not provide. | Text; what is promised. | |
| E5 | Browser | Inspect storage on a fresh public session and on an office session. | Recorded inventory matches the Clerk session cookie, theme preference and demo state; no unrecorded analytics/advertising/tracker; the no-banner position is recorded. | Cookie/storage names; tracker scan. | |
| E6 | File | Open each legal page. | Owner and last-updated date present; date matches the recorded review. | Names and dates. | |

**Benchmarks covered:** 26–29. **Testing covered:** E1–E6.
**Owner gate:** E1 is `NOT RUN — owner approval` until the owner approves the terms. E3 needs the
owner's live channel; do not send a real customer request.

---

## 8. F — Launch operations

| ID | Method | Route / action | Expected | Evidence | Result |
|---|---|---|---|---|---|
| F1 | Dashboard + owner | Inspect the uptime monitor. | A public page is checked on a schedule; alert owner named; failure threshold recorded; test alert if available. Never take production down. | Monitor URL, schedule, threshold, owner. | |
| F2 | Preview + owner | Throw a controlled test error with fake customer data. | Tracker records route, release and error type; customer name, phone, cost, private note, cookie and env value absent. | Event fields; scrubbed fields. | |
| F3 | File | Open the rate-limit record. | Clerk sign-in, tap WAF, demo sign-up and every public form have a boundary; every unauthenticated write has an enforced limit or dated acceptance. | Table of boundaries. | |
| F4 | Preview/local | Send taps above the configured threshold. | Requests refused/throttled; no store write. Do not flood production. | Status codes; store count unchanged. | |
| F5 | Preview/local | Create demo sign-ups above the threshold. | Further sign-ups refused/throttled. Do not create many real accounts. | Status; provider response. | |
| F6 | File + preview | Open the demo identity lifecycle; if cleanup is configured, use a throwaway demo branch/account. | Lifecycle stated; no main identity, row or asset removed. Never run cleanup against main. | Lifecycle text; before/after counts. | |
| F7 | File + dashboard | Inspect deployment settings and docs. | Local, preview and production defined; preview does not point at production DB or asset store; staging recorded required/not required. | Env matrix; project settings. | PASS — preview verified on a live preview deployment: home/inventory/terms/privacy render with `c2lc8g8n/preview/` images; production still serves `c2lc8g8n/production/`. Sanity `preview` dataset exists in project `c2lc8g8n` with 63 production assets at original ids; demo-DB references resolve (see `reports/preview-environment.md`). |
| F8 | File | Read the deployment/rollback note. | Names how to restore the previous deployment, what happens to forward-only migrations, and who performs it. Do not perform a real rollback. | Note path; the three facts. | |
| F9 | File | Open the runbook. | Showroom outage, office sign-in failure, backup failure, demo reset failure, suspected data exposure each have first response, owner, containment/rotation. | Section list. | |
| F10 | Browser | Re-check showroom/office and main/demo boundaries after configuration. | Public showroom reads main; office resolves the signed-in space; no new route exposes costs, private notes or customer data. | Route/status/data checks. | |

**Benchmarks covered:** 30–37. **Testing covered:** F1–F10.
**Owner gates:** F1, F2, F4, F5 and F6 need the owner's dashboards/preview; record `NOT RUN —
owner` with the exact fact needed. F3, F7, F8 and F9 are file/verified checks.

---

## 9. G — Performance

| ID | Method | Route / action | Expected | Evidence | Result |
|---|---|---|---|---|---|
| G1 | Lighthouse lab | Home, inventory, car on the agreed mobile profile. | LCP, CLS and INP recorded; compare with LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms at p75. Field data labelled separately. | JSON/report; baseline comparison. | |
| G2 | Browser + DevTools | Inventory at phone width; inspect image requests. | Each card requests a display-sized transformed image, not the original; dimensions/aspect ratio reserve space; below-the-fold images lazy-load. | Request URLs; `srcset`/`sizes`; `loading`; layout box. | |
| G3 | Browser + DevTools | Block or break a car image. | Placeholder occupies the same space; page does not jump. | Before/after layout box; CLS. | |
| G4 | Browser + DevTools | Block the font stylesheet. | Page remains readable with fallback; no invisible text. | Text visible; computed font. | |
| G5 | Browser + DevTools | Inspect font requests. | Only used weights requested; no render-blocking third-party font request. | Request list; weights; blocking. | |
| G6 | Fetch + file | Compare the recorded public cache/revalidation policy with response headers. | Policy deliberate; matches showroom freshness; no public page uncached by accident. | Header values; policy text. | |
| G7 | CLI | Run the documented bundle command. | Reports public route sizes and the configured budget; a breach is named in the release note. | Output; budget; breach note. | |
| G8 | Compare | Compare after-change measurements with the baseline. | No metric worse beyond its target without recorded owner acceptance. | Baseline vs after table. | |

**Benchmarks covered:** 38–44. **Testing covered:** G1–G8.
**Baseline (Task 1):** home Lighthouse performance 33, LCP 11.4 s, CLS 0.057, TBT 1,130 ms;
accessibility 100, best-practices 77, SEO 100. Lab only; the automation Chrome was untouched.

---

## 10. H — Close-out

| ID | Method | Route / action | Expected | Evidence | Result |
|---|---|---|---|---|---|
| H1 | CLI | `openspec validate --all`. | Launch-foundations and existing changes pass. | Output; change count. | |
| H2 | File | Collect the green checks, smoke test, accessibility check, header check, CWV/Lighthouse run and legal/cookie review. | Each present and dated; a missing item is `NOT RUN`, not a pass. | Evidence index. | |
| H3 | Browser | Re-check showroom, office door, demo banner and public/office boundary. | New metadata, headers, sitemap and docs did not change the product's visible rules. | Route/status/data checks. | |

**Benchmarks covered:** 45–47. **Testing covered:** H1–H3.

---

## 11. Failure states

These are the states the checklist must exercise; they are also the failure-state contract in the
task. Run them in the browser where possible; use a preview/local branch for destructive checks.

| State | Route / action | Expected | Evidence | Result |
|---|---|---|---|---|
| Wrong input | `/car/not-a-real-ref`; inventory with an invalid filter value. | Real 404 or a safe, explained empty state; no crash, no stack trace. | Status; text; console. | |
| Missing data | A car with no price/mileage/image (seed or preview). | The page renders with an honest placeholder; no `undefined`/`NaN`; no broken layout. | Rendered text; placeholder; overflow. | |
| Expired session | Office route with an expired/cleared Clerk session. | Sent to sign-in; no office data; no loop. | Final URL; status; no private data. | |
| Broken image | Block a car image. | Placeholder reserves space; no jump; alt text. | Layout box; CLS; alt. | |
| Offline | DevTools offline on a public page and the office. | Existing offline notice/retry state; no blank page; no private data. | Notice text; retry. | |
| Sold car | A sold car URL. | Not available; no available `Offer`; not a normal indexable car. | Status; text; JSON-LD. | |
| Unknown car | A made-up reference. | Real 404; no successful empty car page. | Status; text. | |
| Anonymous office | `/office`, `/office/inventory` with no session. | Sign-in redirect; no office data rendered. | Final URL; page text. | |

**Benchmarks covered:** 7, 8, 22, 40, 47. **Testing covered:** B5, B6, C5, D5, F10, G3.

---

## 12. What this checklist does not check

- **The look.** No screenshots; the owner checks the visual design by hand. A structural change that
  alters the approved look is a fail unless the owner approved it.
- **The real screen-reader pass.** The separate testing session does it (C8). This checklist may run
  an automated scan as a helper, not as the pass.
- **Production dashboards and destructive operations.** Uptime, error tracking, WAF, demo cleanup,
  rollback and backup restore are owner-run or owner-witnessed; record `NOT RUN — owner` with the
  exact fact needed.
- **Field Core Web Vitals.** Lab data only; field data is labelled separately and is not claimed.
- **Third-party social preview services.** Parse the tags and fetch the image directly.

---

## 13. Benchmark map

| Benchmark (`task.md`) | Check | Benchmark (`task.md`) | Check |
|---|---|---|---|
| 1 | A1 | 25 | D8 |
| 2 | A2 | 26 | E1 |
| 3 | A3 | 27 | E3 |
| 4 | A4 | 28 | E5 |
| 5 | B1 | 29 | E5 (no-tracker position) |
| 6 | B3, B4 | 30 | F1 |
| 7 | B5 | 31 | F2 |
| 8 | B6 | 32 | F4 |
| 9 | B2 | 33 | F5 |
| 10 | B7 | 34 | F6 |
| 11 | B8 | 35 | F8 |
| 12 | B9 | 36 | F7 |
| 13 | B10 | 37 | F9 |
| 14 | C1 | 38 | G1, G8 |
| 15 | C2 | 39 | G2 |
| 16 | C4 | 40 | G3 |
| 17 | C5 | 41 | G4 |
| 18 | C6 | 42 | G5 |
| 19 | C8 | 43 | G6 |
| 20 | D2, D3 | 44 | G7 |
| 21 | D4 | 45 | H1 |
| 22 | D5 | 46 | H2 |
| 23 | D6 | 47 | F10, H3 |
| 24 | D7 | | |

Every benchmark 1–47 is mapped. Every testing check A1–H3 is in its group table.
