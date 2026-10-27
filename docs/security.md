# Security headers and CSP

One header configuration is applied to every response (public pages, office routes, machine
routes). Configured in `lib/security-headers.ts` and wired through `next.config.mjs` `headers()`.

## Headers on every response

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Stop the browser from MIME-sniffing responses. |
| `X-Frame-Options` | `DENY` | Prevent clickjacking via framing. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Send only the origin to third parties. |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=(), payment=(), usb=()` | Disable powerful features by default. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforce HTTPS for a year. |
| `Content-Security-Policy` | see below | Restrict executable and loadable resources. |

## Content Security Policy

The CSP is **enforcing** (not report-only) on production. Report-only was used during the
Task 16 local exercise; no violations were observed before flipping to enforcing.

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://singular-sawfish-8907.clerk.accounts.dev;
style-src 'self' 'unsafe-inline';
img-src 'self' https://cdn.sanity.io https://img.clerk.com https://images.unsplash.com data:;
connect-src 'self' https://singular-sawfish-8907.clerk.accounts.dev https://cdn.sanity.io;
frame-src https://singular-sawfish-8907.clerk.accounts.dev;
worker-src 'self' blob:;
font-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
```

### Sources and rationale

- `self` — the application itself (HTML, scripts, images, fonts, API routes).
- `singular-sawfish-8907.clerk.accounts.dev` — Clerk SDK, UI and sign-in frames (observed at
  runtime). `'unsafe-inline'` is required because Clerk and Next.js inject inline scripts; this
  is a documented trade-off and is narrowly scoped to script execution.
- `cdn.sanity.io` — Sanity cover images (the showroom's car photos).
- `img.clerk.com` — Clerk brand images (e.g. Google sign-in icon).
- `images.unsplash.com` — design background images in `app/reference.css`.
- `blob:` workers — Clerk web workers run from same-origin blob URLs.
- Nothing else is a named source. No Google Fonts (self-hosted via `next/font`), no cdnjs
  (Font Awesome is local), no analytics, no advertising, no third-party trackers.

## Verified

- Runtime checklist D6: documented headers present on public responses.
- Runtime checklist D7: home, inventory, car, privacy and terms render with no CSP violation in
  the console; Clerk sign-in loads; fonts and icons load.
- Checked via attach-only browser on CDP `:9222` (never launching a second browser); tabs
  unchanged.

## If a violation appears

A CSP violation is logged to the browser console. Do not silently widen the policy. Either add
the specific missing source here (with an owner note) or remove the resource that triggers it.
An authenticated-only violation that cannot be resolved locally stays report-only for that
directive; the rest of the policy remains enforcing.
