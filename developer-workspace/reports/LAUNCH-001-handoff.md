# LAUNCH-001 — Agent-run release checklist and handoff (Task 28)

**Status:** run 2026-10-28 against the local production build on `:3210` (attach-only Chrome on CDP
`:9222`). **Result: 51 PASS, 2 FAIL, 6 NOT RUN.** The push is left to the owner.

**Surface:** `next start` on `:3210`, commit `eec52e7` plus the release fixes in this session.
**Browser discipline:** the one visible Chrome, attach-only; no Chrome launched, no tab opened, no
screenshot. Tabs 5→5 and Chromium 1→1 across the keyboard and storage runs.

**Post-handoff updates:** F1 is **PASS** — UptimeRobot monitor `804452457` ("TrueSpec showroom") is
live and UP at `https://truespec-k4y6.vercel.app/`, 5-minute interval, alert contact
`victormakuo2002@gmail.com` (`docs/monitoring.md`). F7 is **PASS** — preview uses the demo Neon
branch and Sanity `preview` dataset, verified on a live preview deployment
(`reports/preview-environment.md`). F2 is **NOT RUN — owner**: ingestion is verified, but the event
payload and email alert rule were not inspected (`reports/sentry-setup.md`). The current commits are
**not pushed**; the owner handles the push.

---

## How to read this handoff

- **PASS** — the check ran on the current build and met the expected result. Evidence is cited.
- **FAIL** — the check ran and did not meet the expected result. The failure is named; it is not
  waived.
- **NOT RUN** — the check needs an owner dashboard, a live channel, a destructive operation or a
  real screen-reader session. The exact fact needed is named. Not claimed as a pass.

Nothing here was claimed from a script alone unless the script is the evidence.

---

## A — Repository truth

| ID | Result | Evidence |
|----|--------|----------|
| A1 | PASS | Clean clone at `/tmp/opencode/truespec-a1`: `npm install` (431 packages), `db:migrate` (up to date, demo branch), `db:seed` (17 cars synced, nothing deleted), `typecheck`, `npm test` 526/526, `build`, `PORT=3212 npm start` → 200 on `/`, `/inventory`, `/car/TS-1001`. Full record: `reports/LAUNCH-001-clean-clone.md`. |
| A2 | PASS | `DATABASE_URL` unset in the clone: `ConfigError: … missing: DATABASE_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, SANITY_PROJECT_ID, SANITY_DATASET, SANITY_TOKEN, SESSION_SECRET. Set the value in .env.local (see the README) and restart.` No secret value. |
| A3 | PASS | 21 project variables read by app/scripts/crons are all declared in `.env.example` (25 declared; `NEXT_RUNTIME` is Next-provided); all values empty; no secret-looking value. Fixed this session: `BACKUP_FILE`, `DATABASE_URL_RESTORE`, `LEAK_BASE_URL` added. |
| A4 | PASS | README names all seven: `db:migrate`, `db:seed`, `backup:restore`, `demo:snapshot`, `leak-check`, `store-freshness`, `cleanup:readiness`, with what each touches and the production-safe warning. Fixed this session: missing three added, retired `demo:wipe` removed, `cleanup:readiness` script added. Destructive commands were not run; `db:seed` ran only in the clean clone against the demo branch. |
| A5 | PASS | `CHANGELOG.md` records LAUNCH-001 with a date, newest first. |
| A6 | PASS | `docs/handover.md` links README, OpenSpec changes, task registry, environments, deployment shape and owner decisions. |

## B — Discoverability

| ID | Result | Evidence |
|----|--------|----------|
| B1 | PASS | `/` 200; unique title, absolute canonical, OG/Twitter tags. |
| B2 | PASS | `/inventory` 200; filtered `?status=available&make=Toyota&sort=low&page=2` 200; canonical is absolute `/inventory` on both. |
| B3 | PASS | `/car/TS-1001` 200; title names year/make/model; description `2021 Toyota Camry XSE V6 — ₦34,500,000, 31,000 km. Available from TrueSpec Automotive.`; canonical absolute. |
| B4 | PASS | `Vehicle` JSON-LD with make, model, year, mileage, colour, NGN price, availability, seller, image; public fields only. |
| B5 | PASS | Sold `TS-1025` 200; `SoldOut` availability; not shown as available; `robots: noindex, nofollow`. |
| B6 | PASS | `/car/TS-999999` real 404. |
| B7 | PASS | `/robots.txt` public allowed, `/office/` and `/api/` disallowed, sitemap named. Direct `/office/` → 308 → `/office` → sign-in; `/api/export` and `/api/cron/daily` → 401. |
| B8 | PASS | `/sitemap.xml` 23 URLs: home, inventory, privacy, terms + all 19 listed cars. Sold `TS-1025` absent; 6 unlisted cars (no price/photo) 404 and are absent. |
| B9 | PASS | `/llms.txt` plain text, business description, page links, NGN, WhatsApp rule; forbidden-term scan 0 hits. |
| B10 | PASS | OG image `https://cdn.sanity.io/images/c2lc8g8n/production/…` → 200 `image/jpeg`; canonical absolute production origin. |

## C — Accessibility

| ID | Result | Evidence |
|----|--------|----------|
| C1 | PASS | Home: exactly one `<h1>`; no heading skips. |
| C2 | PASS | Inventory ambient and filtered: exactly one `<h1>`; cards do not add another; no skips. |
| C3 | PASS | Car, privacy, terms: one `<h1>` each. |
| C4 | PASS | Keyboard walk 38/38: filters, sort, view toggle, paging, car open/return, focus rings, live-region counts. `runs/keyboard-check.json`. |
| C5 | PASS | Public pre-WhatsApp dialog: focus moves inside; Escape and Cancel close; focus returns to the trigger; background does not scroll. `runs/keyboard-check.json`. (All destructive confirmation dialogs are office-only and behind sign-in; this is the public dialog that exists.) |
| C6 | PASS | Grayscale/colour-blind run 13/13: car state, filter error/empty state, share success all carry text, not colour alone. `runs/grayscale-check.json`. |
| C7 | **FAIL** | Axe-core 4.14.0, WCAG 2.2 AA, 9 runs: **7 colour-contrast violations remain**. The pager label mismatch and carousel target-size defects were fixed. Remaining: brand gold `#c8a24a` on white **2.4:1** (active tab, heading accent, related-car price), gold was-price 4.25:1, `On Order` chip 4.25:1, Clerk sign-in button 3.04:1 and sign-up link 2.4:1. The gold is the approved brand colour; **no colour was changed**. Owner decides: darken the text gold, record a dated acceptance, or leave C7 as a release blocker. `runs/axe-check.json`. |
| C8 | NOT RUN — testing session | `docs/accessibility.md` records the WCAG 2.2 AA target, six pages, and a keyboard pass; the **screen-reader pass is explicitly NOT RUN**. It is not claimed as a pass. |

## D — Delivery quality

| ID | Result | Evidence |
|----|--------|----------|
| D1 | PASS | `npm run lint` 0 errors, 13 warnings; `npm run format:check` pass. |
| D2 | PASS | Install, typecheck, 526 unit tests, lint and production build all pass on the current tree. |
| D3 | PASS | Throwaway worktree: deliberate `TS2322` → typecheck exit 2; restored tree → exit 0. Worktree removed. |
| D4 | PASS | `npm run build` pass; route list includes public and machine routes. |
| D5 | PASS | Smoke 5/5: home/inventory/car headings; sign-in page rendered; no office data. |
| D6 | PASS | `nosniff`, `X-Frame-Options: DENY`, referrer, permissions, HSTS on public responses. |
| D7 | PASS — public; office sign-in NOT RUN — owner | CSP is enforcing and now allows Clerk's bot-protection sources (`https://*.protect.clerk.com`, `https://challenges.cloudflare.com`, `connect-src …:*`); keyboard run reports **0 console/CSP violations**; fonts/icons load. End-to-end Clerk sign-in is not exercised (signed out). |
| D8 | NOT RUN — owner | `npm audit --omit=dev`: **4 production vulnerabilities** — `next` **critical** (direct; unauthenticated RCE in Image Optimization with SVG, plus App Router DoS), `postcss`, `undici`, `zod` high (transitive). Full audit: 30 including dev. No dated acceptance. Owner decides: accept or upgrade. |

## E — Public trust

| ID | Result | Evidence |
|----|--------|----------|
| E1 | PASS | `/terms` 200; owner-approved copy, last-updated date, owner/review record (approved 2026-10-27). |
| E2 | PASS | Footer links `/terms` from home, inventory and car page. |
| E3 | NOT RUN — owner | Privacy contact instruction needs one real test message through the owner's live channel. |
| E4 | PASS | Deletion instruction explains how a request reaches the owner and what can be removed; no false email/self-service promise. |
| E5 | PASS — public; office NOT RUN — owner | Public: Clerk cookies + app keys only (`ts-theme`, `ts-visits`, `ts-seen`, `ts-lastcar`, `ts-known`), **0 tracker hits**; no-banner position recorded. Anonymous `/office` → `/office/sign-in`, no office data. The office-session storage list needs a real office session. `runs/storage-check.json`. |
| E6 | PASS | Owner and last-updated date present on privacy and terms; dates match the review. |

## F — Launch operations

| ID | Result | Evidence |
|----|--------|----------|
| F1 | PASS | UptimeRobot `804452457` "TrueSpec showroom", `https://truespec-k4y6.vercel.app/`, 5 min, threshold 1 failed check, email `victormakuo2002@gmail.com`; status UP (`docs/monitoring.md`). |
| F2 | NOT RUN — owner | Sentry ingestion verified (test event `TRUESPEC-1` accepted and resolved; DSN on Production+Preview). The event's route/release/error-type fields, absence of PII/cookies/env values, and the email alert rule were not inspected. `instrumentation*.ts` has no explicit release/`beforeSend` scrub. Exact fact needed: dashboard payload check + alert rule. |
| F3 | PASS | `docs/rate-limits.md` names Clerk sign-in, tap WAF, demo sign-up; no public enquiry form exists; tap is a 30/60s/IP Vercel WAF rule; demo sign-up is Clerk-managed. F4/F5 are the enforcement runs, not file checks. |
| F4 | NOT RUN — owner | Limit is edge-only (Vercel WAF); local `:3210` has no in-app limiter. Exact fact: 31st tap in 60 s → 429 at the Vercel edge, store count unchanged. Do not flood production. |
| F5 | NOT RUN — owner | Demo sign-up limit is provider-side (Clerk); no in-app limiter. Exact fact: Clerk refuses above-threshold sign-ups. No real accounts created. |
| F6 | PASS — file | `docs/demo-lifecycle.md` states the lifecycle: identities live until the owner removes them in Clerk; daily reset never touches identities, main rows or main assets. No automated identity cleanup is configured, so no destructive preview run applied; manual removal remains owner-only. |
| F7 | PASS | Preview uses demo Neon branch + Sanity `preview` dataset; live preview renders `c2lc8g8n/preview/` images; production still serves `production/`. `reports/preview-environment.md`. |
| F8 | PASS | `docs/environments.md` names previous-deployment restore, forward-only migrations, and who performs it. No real rollback performed. |
| F9 | PASS | `docs/runbook.md` covers showroom outage, office sign-in failure, backup failure, demo reset failure, suspected data exposure. |
| F10 | PASS | Public showroom reads main; anonymous office redirects to sign-in with no office data; `/api/export` and cron 401; public serializer exposes no cost/private note/customer field; only unauthenticated write is `/api/tap`. |

## G — Performance

| ID | Result | Evidence |
|----|--------|----------|
| G1 | **FAIL** | Lighthouse 13.5.0 mobile lab (2026-10-27): LCP **7345 / 7091 / 5908 ms** vs **2.5 s** target; CLS 0.0004 / 0.0004 / 0.0045 (pass); **INP not lab-measured** (no field data; not invented). The cold Clerk handshake dominates TTFB. Owner decides: accept the 7.3 s baseline or schedule performance work. `/tmp/opencode/lh-{home,inventory,car}.json`; `reports/LAUNCH-001-performance.md`. |
| G2 | PASS | Cards request display-sized Sanity derivatives (`w=700&h=326`, `w=516`, etc.), not originals; dimensions reserve space; below-fold lazy. `runs/cards-check.json`. |
| G3 | PASS | Blocked image uses a data-SVG placeholder in the same 342×159 slot; page does not jump. `runs/cards-check.json`. |
| G4 | PASS | Font stylesheet blocked: page readable with fallback, no invisible text, heading visible. `runs/font-block.json`. |
| G5 | PASS | 6 self-hosted woff2 (Inter, Oswald, Font Awesome brands/solid/regular); **0 Google Fonts**; no render-blocking third-party font request. `runs/perf-home.json`. |
| G6 | PASS | Public pages `private, no-cache, no-store, max-age=0, must-revalidate`; `robots.txt`/`sitemap.xml` `public, max-age=0, must-revalidate`; `llms.txt` force-dynamic. Matches `docs/performance.md`. |
| G7 | PASS | `npm run bundle-report`: 2 breaches **named in `docs/performance.md`** — `8102-0b64ba3d4cd0d9ae.js` 357.6 KB and `main-b72b8118caf09c27.js` 238.7 KB vs 220 KB budget; total 1.28 MB / 14 chunks. Build output records public route sizes. The breaches are not waived. |
| G8 | PASS | After vs baseline: LCP 11.4 s → 7.3 s, CLS 0.057 → ≤0.005, TBT 1,130 → 0/0/589 ms; performance score 33 → 59. No metric worse than baseline. |

## H — Close-out

| ID | Result | Evidence |
|----|--------|----------|
| H1 | PASS | `npx openspec validate --all`: 3 passed, 0 failed. |
| H2 | PASS | `reports/LAUNCH-001-evidence-index.md` — dated index of green checks, smoke, accessibility, headers, CWV/Lighthouse and legal/cookie review; missing items marked NOT RUN. |
| H3 | PASS | Showroom, office door, demo banner and boundary re-checked: public renders, `/office` → sign-in with no office data, demo banner is office-only, `/api` 401, public routes unchanged. |

---

## Summary tally

| Category | PASS | FAIL | NOT RUN |
|---|---:|---:|---:|
| A (repository truth) | 6 | 0 | 0 |
| B (discoverability) | 10 | 0 | 0 |
| C (accessibility) | 6 | 1 (C7) | 1 (C8) |
| D (delivery) | 7 | 0 | 1 (D8) |
| E (public trust) | 5 | 0 | 1 (E3) |
| F (launch ops) | 7 | 0 | 3 (F2, F4, F5) |
| G (performance) | 7 | 1 (G1) | 0 |
| H (close-out) | 3 | 0 | 0 |
| **Total** | **51** | **2** | **6** |

Sub-items recorded inside a PASS: office sign-in end-to-end (D7) and the office-session storage list
(E5) are NOT RUN — owner.

---

## Residue (known open items)

1. **C7 — colour contrast** (7 axe violations). The brand gold is the cause; no colour changed.
   Owner decision: darken text gold, record a dated acceptance, or keep C7 as a release blocker.
2. **G1 — LCP 7.3 s vs 2.5 s** in the local cold lab. Owner decision: accept as baseline or
   schedule performance work. INP is not lab-measured; field data is not invented.
3. **D8 — dependency audit**: `next` critical (direct) plus `postcss`, `undici`, `zod` high. Owner
   decision: accept with a dated record naming package/severity/owner/review date, or upgrade.
4. **C8 — screen-reader pass**: separate testing session.
5. **E3 — privacy contact test**: owner's live channel.
6. **F2 / F4 / F5**: Sentry payload + email rule; tap WAF threshold; demo sign-up limit.
7. **Office sign-in end-to-end** (D7/E5): Clerk origin allowlist on preview.
8. **Bundle breaches**: named in `docs/performance.md`, not waived.
9. **Git deployments disabled** on `truespec-k4y6`: pushing to `main` will not create a Vercel
   deployment; deploy with `vercel --prod` or re-enable the setting (`reports/sentry-setup.md`).

---

## Handoff decision

**The agent does not push.** The owner decides on C7, G1 and D8 first; those are the only two
FAILs plus the critical audit finding. Before pushing:

1. Decide C7 (contrast), G1 (LCP) and D8 (audit).
2. Complete the owner-only tests: C8, E3, F2, F4, F5 and office sign-in.
3. Run `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build` and
   `npm run smoke-test` one final time against the tree to be pushed.
4. Push when satisfied; then deploy (`vercel --prod`) or re-enable git deployments.

**All agent-runnable checks that can pass are green. C7 and G1 are named failures, not waived.**
