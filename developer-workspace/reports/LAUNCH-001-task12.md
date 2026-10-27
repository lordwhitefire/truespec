# LAUNCH-001 Task 12 — llms.txt

**Status:** done; the `/terms` link is deliberately deferred to Task 13, when the page exists.
B9 passes 16/16.

## What changed

- `app/llms.txt/route.ts` — a dynamic plain-text route. It uses the same public read path as the
  showroom (`getPublicCars`) and the saved public WhatsApp number (`getSetting("whatsapp_number")`).
  The body names the business, carries the public description, links `/`, `/inventory` and
  `/privacy`, states the current public car count, gives the naira price rule and the WhatsApp
  contact rule.
- `developer-workspace/scripts/LAUNCH-001/llms.mjs` — 16-check browser/DB runtime script, including
  the leak-check forbidden-token scan.
- No office, cost, profit, private-note, customer or demo-only value is read or emitted. `/terms` is
  not linked until Task 13; linking it now would send readers to a 404.

## Verified

- `npm test` — 523 pass, 0 fail, 10 suites.
- `npm run typecheck` — pass.
- `npm run build` — pass; `/llms.txt` is dynamic (`ƒ`); server restarted on `:3210`.
- Runtime script — 16/16:
  - `GET /llms.txt` → 200, `text/plain; charset=utf-8`.
  - body names `TrueSpec Automotive`, carries `SITE_DESCRIPTION`, and links the canonical
    `https://truespec-k4y6.vercel.app/`, `/inventory` and `/privacy`.
  - body states `19 cars currently listed`, matching `getPublicCars()`.
  - body states “Nigerian naira (NGN)” and the full-to-your-door price rule.
  - body carries `https://wa.me/2348146927170`, matching `getSetting("whatsapp_number")`.
  - plain text, no HTML tags; every URL uses the canonical origin; no `127.0.0.1`.
  - forbidden-token scan: zero hits; office/demo/customer/profit/cost/rate/kobo/currency scan: zero
    hits.
  - `/terms` is absent (recorded temporary omission).
  - tabs 4→4; 1 Chromium; no tab opened; no Chrome launched.
- The configured number is the one already used by the public header; no number is hardcoded in the
  route.

## Not verified / caveats

- `/terms` is not linked until Task 13 creates the page and the owner approves it. The spec’s llms
  scenario names the terms page; the current response links the three existing public pages. Task 13
  adds the fourth link with the page.
- The route is dynamic, so the car count and WhatsApp number are current on each request.
- If the saved WhatsApp number is removed, the route says “No WhatsApp number is saved yet.” rather
  than inventing one. The local run had the configured number.
- The forbidden scan uses the same identifiers and quoted shapes as `scripts/leak-check.ts`; the bare
  public words “shipping” and “clearing” are marketing copy, not the quoted field shapes, and are
  allowed by that scan.
- Changes are uncommitted; no commit or push was made.

## Evidence

- `app/llms.txt/route.ts`
- `developer-workspace/scripts/LAUNCH-001/llms.mjs`
- `/tmp/opencode/llms-task12.json`
- `/tmp/opencode/llms-task12.txt`
- Server log: `/tmp/opencode/truespec-3210.log`
