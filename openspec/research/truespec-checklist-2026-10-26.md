# TrueSpec — web-development checklist coverage

**Date:** 2026-10-26  
**Checklist:** `/home/lordwhitefire/current-project/athletica/web-development-areas.md` (80 areas)  
**Subject:** TrueSpec (public showroom + private office), not the Athletica store.  
**Method:** read-only review of the repository, not a live browser pass. No secret values were read.  
**Architecture:** the gaps below are now recorded in `openspec/changes/launch-foundations/` (proposal, seven capability specs, design, 49 tasks); no code has been changed.

## Verdict

TrueSpec is not an early-stage project. The engineering core is already strong: Clerk-backed office access with a separate main/demo space rule, 7-day / 12-hour sessions, server-side protection on office routes and API handlers, encrypted daily backups, an activity log, PDF import, ZIP/CSV export, inventory management, settings, design tokens, reduced-motion handling, and a substantial unit-test suite.

The checklist adds real work in five places:

1. **Repository truth** — there is no root `README.md` and no `.env.example`, even though `lib/config.ts` tells a failed setup to “see the README”.
2. **SEO and discoverability** — no `robots.txt`, `sitemap.xml`, `llms.txt`, Open Graph/Twitter metadata, canonical URLs, or vehicle structured data. Home and inventory also have no `<h1>`.
3. **Quality gate** — no lint/format setup and no CI running typecheck, tests, or build.
4. **Legal and launch** — privacy notice exists, but no terms page; cookie/consent position depends on the current no-analytics decision.
5. **Operations** — no error tracking or uptime monitoring; rate limiting is partly delegated to Clerk and a Vercel WAF rule, not an app rule.

Legend: **Done** = implemented in the repo · **Partial** = present but incomplete · **Missing** = applicable and absent · **Skip** = not applicable or deliberately out of scope · **Owner** = business decision not recorded in the repo.

---

## Section A — applies to the whole project

| # | Area | Status | Evidence / what is still open |
|---|---|---|---|
| 01 | Project setup | Partial / Owner | Audience is Nigeria, currency is Naira, and the app targets Vercel + Neon. Client name, deadline, budget, production domain, and dev/staging/prod separation are not recorded in the repo. |
| 02 | Stack decisions | Done | Next.js 15 App Router, React 19, TypeScript strict, plain CSS, native forms, React state, custom validation, no component library. |
| 03 | Design system | Done | Colour, radius, spacing, shadow, font and card/float/button tokens live in `app/globals.css`; dark mode is a token set switched on `<html data-theme>`. |
| 04 | Brand & identity | Partial | Logo/icon exists (`app/icon.svg`), colours and fonts are defined, and the voice is consistent. No written brand-guidelines document. |
| 05 | Frontend architecture | Partial | Clear App Router split between `(site)`, `office`, API handlers and `lib`; server/client boundaries are deliberate. No bundle-size budget or written code-splitting policy. |
| 06 | Routing & navigation | Done | Public home, inventory, car, privacy and 404; office dashboard, inventory, car, enquiries, drafts, activity, settings and account; protected routes and error boundaries exist. No redirect map. |
| 07 | SEO & discoverability | **Missing** | Root metadata has title + description only. No `robots.txt`, `sitemap.xml`, `llms.txt`, Open Graph/Twitter, canonical URLs, or schema.org data. Inventory has title only; car pages have title only. |
| 08 | Performance | Partial | Responsive media queries and reduced-motion rules exist. Public pages are `force-dynamic`; fonts and Font Awesome are third-party stylesheets; photos are plain `<img>` via Sanity URLs; no Core Web Vitals target, bundle analyzer, or Lighthouse budget. |
| 09 | Responsive & cross-device | Done / Partial | Breakpoints at 1100/1000/900/820/700/560 px; mobile navigation and responsive office shell exist. No written device/browser test matrix. |
| 10 | Cross-browser compatibility | Owner / Pending | No documented support matrix or Safari/iOS test evidence. Next 15 baseline is modern browsers. |
| 11 | Accessibility | Partial | ARIA labels, focusable headings, dialog focus handling, live regions and reduced motion are present. **Home and public inventory have no `<h1>`** (they start at `<h2>`); no automated a11y test or documented WCAG target. |
| 12 | Assets & media | Done / Partial | Sanity is the media store; photos are capped at 15 MB; image naming is managed by the asset pipeline. No video hosting, no virus scanning, and no explicit image-format policy. |
| 13 | Error handling | Done / Partial | Root/site error boundaries, office error boundary, real 404s, shared retryable state and refusal messages exist. No Sentry or other error tracker; logging is application/console-level. |
| 14 | Environment & configuration | Partial | `lib/config.ts` fails loud on missing/malformed values; demo switches are exact-string flags. **No `.env.example`** and no documented dev/staging/prod variable set; the config error points at a README that does not exist. |
| 15 | Version control conventions | Partial | Git history exists on `main` with task-prefixed commits. No written branch/commit/PR convention, no PR template, no documented protection rule or release tagging. |
| 16 | Development workflow | **Missing** | TypeScript strict is on. There is no ESLint config, no Prettier config, no pre-commit hook, no lint script, and no code-review gate. |
| 17 | Testing | Partial | 59 unit-test files; the last recorded run was 416/416. No app-level E2E config or `test:e2e` script; Playwright core is present as a tool, not wired to the app. No component/Storybook tests or CI runner. |
| 18 | Deployment & DevOps | Partial | Vercel config and two crons exist; preview deployments are likely. No GitHub Actions, no documented staging environment, no rollback procedure, no build-time target. |
| 19 | Monitoring & observability | Partial / Owner | No Sentry, uptime monitor, Vercel Analytics or user analytics. The privacy notice deliberately says “no analytics.” No alert owner or on-call path. Backups are monitored through the daily job summary, not an external alert. |
| 20 | Legal & compliance | Partial | A real privacy notice exists at `/privacy` and is current. **No terms of service page.** No cookie banner; current no-analytics design may make one unnecessary, but Clerk auth cookies still exist. GDPR/age-restriction position is not written down. |
| 21 | Documentation | **Missing** | No root README, no changelog, no API documentation. Inline comments are unusually strong. `developer-workspace/README.md` and `design-workspace/README.md` are internal, not a project onboarding README. |
| 22 | Naming conventions | Done | Components are PascalCase, routes/files follow the framework's conventions, database tables are snake_case, variables/functions are camelCase, constants are UPPER_SNAKE_CASE. |
| 23 | Animation & interactions | Done | CSS transitions/keyframes, hero slider, ticker and micro-interactions; `prefers-reduced-motion` is handled across public and office surfaces. No separate animation library or performance budget. |
| 24 | Notifications & feedback | Partial | Toasts, dialogs, confirmation states, loading skeletons, empty states and success states exist in the office; public WhatsApp tap notice exists. No email/push, by design. |
| 25 | Forms & validation | Done | Native forms plus shared validation rules, file-upload handling, draft save, and device-side draft recovery. No React Hook Form/Zod, deliberately. |
| 26 | Internationalization | Skip / Owner | English-only, Naira-only, Nigeria-focused. No i18n or RTL layer; adding one later would be a separate architecture change. |
| 27 | Offline & PWA | Partial / Owner | Offline notice and retry states exist, but no service worker, manifest, install flow, background sync, or offline browsing. The checklist notes this matters in Nigeria; it is not currently a PWA. |
| 28 | Cookie & session management | Done | Clerk owns the session cookie; the app keeps its own session row with a 7-day total and 12-hour idle limit, refreshed at most every 5 minutes. Main/demo spaces cannot authorise each other. No “remember me” and no in-page expiry warning. |
| 29 | Redirect & URL management | Partial | URL structure is clean and readable. No 301/302 map, trailing-slash policy, or canonical URLs. Old-URL handling is not defined. |
| 30 | Code splitting & bundle size | Partial | Next.js route-level splitting is automatic; no bundle analyzer, weight audit, or budget. |
| 31 | Backup & recovery | Done | Vercel cron at 02:00 UTC; gzip + AES-256-GCM; last 7 dumps; heartbeat and retention; restore script; backup key in Vercel. Demo reset is a separate 03:00 cron. |
| 32 | Client communication | Owner | No process document in the repo. The `developer-workspace` and registry carry internal progress, not a client communication plan. |
| 33 | Handoff & maintenance | Partial | Internal handover material and task reports exist; no root README, no client training doc, no documented support period. |

---

## Section B — e-commerce (TrueSpec is an enquiry showroom, not a checkout)

| # | Area | Status | Evidence / decision |
|---|---|---|---|
| 34 | Payment integration | **Skip** | No checkout, payment provider, order or refund flow. The sale is completed on WhatsApp. |
| 35 | Product catalog | Done | Cars with brand/model/year/trim/price/mileage/colour/features, three public sections, featured/hero logic and related cars. “Variants” do not apply to unique used cars. |
| 36 | Inventory management | Done | Owner-managed inventory, primary/secondary states, sold handling, tombstones, photos, cost lines and sale record. No low-stock concept for unique cars; no multi-platform stock. |
| 37 | Cart & checkout | **Skip** | No cart or checkout. |
| 38 | Shipping & delivery | **Skip** | Shipping/clearing/delivery are included in the advertised price and handled off-site; no rate calculation or tracking integration. |
| 39 | Discounts & promotions | **Skip** | No promo codes, flash sales or loyalty program. A “was” price exists as a display field, not a promotion engine. |
| 40 | Order management | **Skip** | No orders. Enquiries and the car lifecycle are separate records; WhatsApp carries the transaction. |
| 41 | CMS integration | Partial / Skip | Sanity is used as the media/asset store, not a content CMS. The owner edits cars, enquiries and settings in the office. No preview/publishing workflow because there is no CMS content workflow. |
| 42 | Reviews & testimonials | **Skip** | No customer reviews, star ratings, photo reviews or curated testimonial section. “Why choose us” is value copy, not testimonials. |

---

## Section C — web-app specifics

| # | Area | Status | Evidence / decision |
|---|---|---|---|
| 43 | Authentication & authorization | Done | Clerk sign-in mounted in the office; main access by exact `publicMetadata.truespec_space === "main"`, everything else demo; demo sign-up behind a flag; protected office routes and API handlers; provider handles password reset and email verification. No RBAC beyond main/demo because there is one owner. |
| 44 | User management | Partial / Owner | Account page and demo account exist. No admin user list, search, role editor or account deletion flow. Demo data/assets reset daily, but the reset path does not delete Clerk identities. |
| 45 | Onboarding flow | Partial | Empty states, demo banner and clear office navigation exist. No guided tour, welcome sequence, or progress checklist. |
| 46 | Dashboard & data visualization | Partial | Stat cards, recent taps, recent activity, pagination and export exist. No charts; that is a deliberate “no charts yet” position rather than a missing chart library. |
| 47 | Real-time features | **Skip** | Single-owner office; no live collaboration or realtime subscription. |
| 48 | Notification system | Partial | In-app toasts, tap notices, badge counts and activity feed exist. No email/push/inbox preferences; the privacy notice says the app has no email channel. |
| 49 | Multi-tenancy | **Skip** | Main/demo are isolated spaces, not customer tenants. No subdomains, tenant branding or per-tenant settings. RLS is enabled with no policies; accepted because one office user and one app role. |
| 50 | File management | Partial | PDF and photo uploads to Sanity; 15 MB photo cap; type/size rules; demo asset cap; deletion and cleanup paths. No virus scanning. |
| 51 | Search & filtering | Done | Public inventory filters by status, make, year, colour and price; sort, grid/list view, pagination and URL persistence. Office lists have their own filters. No global search. |
| 52 | Audit logs & activity history | Done | `activity_event` records actor, action and subject; office activity screen reads newest first (bounded to 200 rows); taps have their own record. |
| 53 | Import & export | Done | PDF car/enquiry import into drafts; one-action ZIP export with `master.json`, per-subject CSVs and `README.txt`; demo snapshot/restore. |
| 54 | Subscription & feature gating | **Skip** | No paid plans or entitlements. Demo switches are operational flags, not billing. |
| 55 | Settings & configuration | Done | Office settings for WhatsApp number, car/enquiry states, display preferences and cleanup; app-wide values stored in the database, not localStorage. |
| 56 | Admin panel | Done | The office is the admin panel, separate from the public showroom, with server-side route protection and activity history. |
| 57 | API design | Partial | Internal route handlers for upload, autofill, export, templates, tap, cron and demo reset. No public API, versioning, OpenAPI/Swagger docs, or API keys. |
| 58 | Background jobs & queues | Partial / Done | Vercel cron runs the daily backup and demo reset; both are idempotent and report step failures. No general queue or retry framework. |
| 59 | Soft delete vs hard delete | Done | Cars use `deleted_at` tombstones with undo; enquiries are hard-deleted with their PDF (owner delete); drafts are never auto-deleted. The choices are documented in migrations and code. |
| 60 | Collaboration features | **Skip** | One owner; no presence, locking, comments or conflict UI. |
| 61 | Outgoing webhooks | **Skip** | No external event delivery. |
| 62 | Timezone & localization | Partial | Database timestamps are UTC; office display is local; money is integer kobo and Naira-only. No locale switcher, RTL, or per-user timezone setting. |
| 63 | Rate limiting & abuse prevention | Partial | Clerk owns login attempt limits; tap has an origin check; the owner’s Vercel WAF rule is the intended tap limit (30 req/min/IP). No in-app rate limiter, form throttling, CAPTCHA, or IP blocklist. |
| 64 | Multi-step flows & wizards | Skip / Partial | No checkout/onboarding wizard. Draft forms and device-side draft recovery are the closest equivalent. |

---

## Section D — mobile/desktop app

| # | Area | Status | Reason |
|---|---|---|---|
| 65 | Platform targets | **Skip** | Responsive web app; no native/hybrid target. |
| 66 | App store & distribution | **Skip** | No app store distribution. |
| 67 | Push notifications | **Skip** | No mobile push. |
| 68 | Device features | **Skip** | No camera/mic/GPS/contacts/biometric integration. |
| 69 | Offline mode (mobile) | **Skip** | No native app. Web offline is covered only by the notice/retry state. |
| 70 | App updates | **Skip** | Web deployment only. |
| 71 | Deep linking | **Skip** | Web URLs only; no app URL scheme/universal links. |
| 72 | Mobile performance | **Skip** | No native app; web performance is covered under area 08. |

---

## Section E — universal advanced areas

| # | Area | Status | Evidence / decision |
|---|---|---|---|
| 73 | Progress tracking | Done | `openspec/tasks-registry.md`, per-task `task.md`/`testing.md`, research notes and close-out records carry the build state. |
| 74 | Session recovery | Done | The registry, task reports, notes and checkpoints make the work resumable; the app also keeps a device-side draft for forms. |
| 75 | Constraint identification | Partial | `demo_product.pdf`, decisions, task constraints and research notes exist. No single current constraints register covering budget, hosting, traffic and launch limits. |
| 76 | Scalability planning | Partial / Owner | Neon indexes and bounded reads exist; a single Vercel deployment and single owner. No traffic estimate, load test, upgrade path, or CDN strategy beyond Vercel/Sanity defaults. |
| 77 | Security | Partial | HTTPS via Vercel, parameterized SQL, server-only data access, auth on every office path, origin checks on writes, secret config, encrypted backups. **No app-level security headers** (CSP, frame, referrer, permissions), no dependency-vulnerability scan in CI, and no written incident/key-rotation plan. |
| 78 | Landing page vs app shell | Done | Public showroom and private office are separate route areas with different layouts, fonts, data access and caching (`force-dynamic` public pages, session-gated office). |
| 79 | Design tokens & theming | Done | CSS variables for colour, radius, spacing, shadows and fonts; light/dark token sets; theme switch on `<html data-theme>`. |
| 80 | Third-party integrations | Partial | Clerk, Neon, Sanity, Google Fonts, Font Awesome and WhatsApp are integrated. No email/SMS/maps/analytics/support chat. `.env.example` is missing, so the full key list is not documented in one place. |

---

## The short list — what I would actually do next

### 1. Make the repository self-explanatory
- Add a root `README.md`: what TrueSpec is, the public/office split, the stack, local setup, migration/seed commands, test commands, env variable list, deployment shape, and the demo/main distinction.
- Add `.env.example` with every variable named in `lib/config.ts`, `vercel.json` and the cron/demo routes. Never include values.
- Fix the `ConfigError` sentence that tells the user to “see the README” — after the README exists, make it point to the right section.

### 2. Give the showroom discoverability
- Add `app/robots.ts`, `app/sitemap.ts`, and `public/llms.txt`.
- Add `metadataBase`, a title template, per-page descriptions, Open Graph/Twitter metadata, canonical URLs, and a car image for sharing.
- Add `Vehicle`/`Offer` JSON-LD on car pages.
- Give home and public inventory a real `<h1>`; keep the current visual structure and use an accessible heading.
- Decide whether sold cars, filter URLs and the privacy page should be indexed, noindexed or canonicalised.

### 3. Put a quality gate in front of `main`
- Add ESLint + Prettier (or a documented alternative), a `lint` script, and a GitHub Actions workflow running `typecheck`, `test`, and `build`.
- Add a dependency audit step; fix or explicitly accept findings.
- Add a small E2E smoke test for the public showroom and the office door before enabling it in CI.

### 4. Close the launch/legal/operations gaps
- Add a terms page (or record why it is not needed).
- Record the cookie/consent position now that analytics is deliberately off.
- Add security headers in `next.config.mjs`.
- Choose error tracking and uptime monitoring; assign who is alerted.
- Decide whether the Vercel WAF tap rule is the whole rate-limit story or whether the app needs one too.
- Decide what happens to Clerk demo identities after the daily demo reset.

### 5. Treat performance, accessibility and offline as measured work
- Set Core Web Vitals and Lighthouse targets; self-host or subset fonts; review Font Awesome and the plain `<img>` path.
- Run an accessibility pass with a screen reader and keyboard only; fix the heading order.
- Decide whether the Nigerian offline case justifies a service worker/PWA, or keep the current notice-and-retry design.

## Deliberately not doing now

Payments, cart, checkout, shipping rates, discounts, order management, customer reviews, native mobile apps, subscriptions, multi-tenancy, realtime collaboration and outgoing webhooks are all **not** part of TrueSpec’s current shape. They should stay out unless the owner changes the product.

## Owner decisions still needed

1. Is SEO a priority for launch, or secondary to the WhatsApp showroom?
2. Is a terms page required, and who supplies the wording?
3. Do we keep the no-analytics position, or add privacy-respecting analytics later?
4. Is a PWA/offline mode worth building for the Nigerian audience?
5. Which error/uptime service, and who receives the alert?
6. What is the production domain, and do we need a redirect map from old URLs?
7. Do demo Clerk identities get deleted after the reset, and after how long?
8. What traffic level should the architecture be proven against?
