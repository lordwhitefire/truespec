# Security Contact — security.txt

**Date:** 2026-10-28
**Gate:** A9 — security contact
**Owner-approved contact:** `victormakuo2002@gmail.com`

## Built

- `public/.well-known/security.txt` — RFC 9116 file:
  - `Contact: mailto:victormakuo2002@gmail.com`
  - `Expires: 2027-10-28T00:00:00.000Z`
  - `Preferred-Languages: en`
  - `Canonical: https://truespec-k4y6.vercel.app/.well-known/security.txt`
- `app/security.txt/route.ts` — `308` redirect from `/security.txt` to the well-known path.

No other fields: there is no security policy page, PGP key, or acknowledgment page to point at.

## Verified

- Local `:3210`:
  - `/.well-known/security.txt` — **200**, `text/plain; charset=UTF-8`, correct body.
  - `/security.txt` — **308** to `/.well-known/security.txt`.
- `npm run lint` on the route — pass.
- `npm run typecheck` — pass.
- `npm test` — 526 pass, 0 fail.
- `npm run build` — pass; `/security.txt` is in the route list.
- Prettier on the route — pass.

## Not verified

- Deployed site — not pushed by the agent.
- Email delivery/monitoring — owner’s responsibility.

## Next

1. Owner reviews and commits/pushes.
2. After deploy, confirm both URLs on the canonical domain.
