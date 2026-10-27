# Changelog

All notable changes to TrueSpec are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased] — LAUNCH-001 launch/delivery layer

### Added
- Public showroom: home, inventory and car pages with display-sized Sanity images, reserved
  dimensions, one `<h1>` and no skipped heading levels.
- `robots.txt`, `sitemap.xml` and `llms.txt` machine-readable routes.
- `/terms` terms of service page (owner-approved) with last-updated date, owner/review record
  and footer link.
- Privacy notice alignment: `pageMetadata`, last-updated date, owner/review record, WhatsApp
  contact channel, deletion path, no email channel.
- Cookie/storage inventory (`docs/cookies.md`) and accessibility release check
  (`docs/accessibility.md`).
- Security headers and CSP (`app/robots.txt` headers, `app/sitemap.xml` CSP), enforced after the
  local public + anonymous-office exercise.
- ESLint and Prettier configuration (`eslint.config.mjs`, `.prettierrc`, `.prettierignore`).
- Playwright smoke test (`e2e/smoke.spec.ts`, `playwright.config.ts`, `npm run smoke-test`).
- Error tracking with scrubbing (`lib/error-tracking.ts`, `lib/error-tracking.test.ts`,
  `instrumentation.ts`, `instrumentation-client.ts`) behind optional `SENTRY_DSN`.
- Terms page, privacy notice, robots, sitemap and llms.txt.

### Changed
- `lib/site.ts`: added `TERMS_LAST_UPDATED` and `PRIVACY_LAST_UPDATED`; `SITE_DESCRIPTION`.
- `app/(site)/layout.tsx`: footer links to `/terms`; self-hosted fonts replaced Google Fonts;
  Font Awesome is local.
- `next.config.mjs`: security headers on every response.

### Removed
- Google Fonts and cdnjs requests (self-hosted fonts and local Font Awesome instead).

## [0.1.0] — Initial release

- Public showroom, private office, demo office.
- Clerk authentication, Sanity images, Neon Postgres.
