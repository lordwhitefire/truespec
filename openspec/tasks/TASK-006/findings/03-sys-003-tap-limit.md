# 03 — SYS-003, the tap endpoint's missing limit

**Checked:** 2026-10-20, current working tree; Vercel documentation read the same day.
**Tracker items:** 4 (verification done; the choice is Q1).

## What the route does

`app/api/tap/route.ts` is the only public write. Its order is deliberate:

1. **Origin first** — `isSameOrigin(origin, host)`; a mismatch is `403` before the body is read.
2. **Body** — `readTap` refuses anything that is not a path and one of our car references (`422`).
3. **Write** — `recordTap`; a store refusal is `503`.

There is **no counter and no rate limit**. The route does not read the visitor's address; `0011`
dropped it, and the privacy notice says no address is kept. A script outside a browser can set the
`Origin` header, so the origin check is a filter, not a lock. A flood of valid taps is a flood of
database writes.

## The options

**In-app** — needs shared state across serverless instances:

- **In-memory**: each instance has its own counter; a flood spreads over instances and walks past it.
- **A database counter**: needs a key — normally the IP. Storing the IP (even hashed and short-lived)
  contradicts the notice's "no address" statement and means new retention rules. It is also more
  code on the one route that must stay simple.
- **Redis/Upstash**: works, but adds a service and a secret for a demo.

**Edge — Vercel WAF rate limiting** (documented as available on all plans; Hobby has one rule per
project):

- Key: **IP**; fixed window, minimum 10 s, maximum 10 min; Hobby includes 1,000,000 allowed
  requests per month.
- A rule on `/api/tap` answers `429` before the function runs. No application code, no visitor
  address stored, one deployment step.
- Caveat from the docs: counters are **per region**, so a distributed flood can exceed a single
  region's limit; for a demo that is acceptable.

## Recommendation (Q1)

**Edge.** One rule: `/api/tap`, per IP, 30 requests per 60 seconds, action `429`. The app's origin
and body checks stay as they are. The rule lives in the Vercel dashboard, so the task records it as
a deployment step; the testing pass hammers the route from one address to see the `429`.

If the owner prefers everything in the repository, the honest in-app version needs a counter store,
and the privacy notice would have to change. That is a bigger cost than the risk it removes.

**Answered (findings/07):** edge WAF, **30 requests per minute per IP**; a Vercel dashboard
setting, no application code.
