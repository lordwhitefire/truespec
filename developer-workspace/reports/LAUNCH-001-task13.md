# LAUNCH-001 Task 13 — Terms page (owner approval gate)

**Status:** done — drafted, owner-approved, wired, and structurally verified. E1/E2 verified against the
local production build; E6 pass for terms, deferred for privacy to Task 14. No commit or push.

**Owner approval:** the draft in `developer-workspace/notes/LAUNCH-001-terms-draft.md` was approved
as-is on 2026-10-27. Both dates on the page use that date.

## What changed

- `app/(site)/terms/page.tsx` (new) — terms page with `pageMetadata` (title, description, canonical,
  1200×630 OG/Twitter), last-updated date, owner/review record, and the approved copy covering
  availability, price changes, the WhatsApp sale path, delivery, governing law (Federal Republic of
  Nigeria, Lagos) and contact. Seller is "TrueSpec Automotive" (no registered name/RC supplied by
  the owner).
- `app/(site)/terms/terms.css` (new) — page styles matching privacy/reference.
- `app/(site)/layout.tsx` — footer now links `Privacy notice · Terms of service · Imported from the USA` on every public page (home, inventory, car, privacy, not-found).
- `lib/site.ts` — added `TERMS_LAST_UPDATED = "27 October 2026"`.
- `app/sitemap.ts` — `/terms` added to `PUBLIC_PAGES` (was deliberately omitted until Task 13).
- `app/llms.txt/route.ts` — `Terms:` link added; omission comment updated.
- `developer-workspace/scripts/LAUNCH-001/terms.mjs` (new) — E1/E2/E6 terms runtime script.
- `developer-workspace/scripts/LAUNCH-001/sitemap.mjs` and `llms.mjs` — assertions flipped from
  "omits terms" to "includes terms".

## Verified

- `npm test` — 523 pass, 0 fail, 10 suites.
- `npm run typecheck` — pass.
- `npm run build` — pass; `/terms` is dynamic (`ƒ`); server restarted on `:3210`.
- sitemap runtime — 18/18: `/terms` present, car set equals `getPublicCars()`, sold/unlisted/unknown
  absent.
- llms runtime — 16/16: `Terms:` link present; forbidden-token and office/demo/customer/profit/
  cost/rate/kobo/currency scans zero hits.
- terms runtime (`terms.mjs`) — 10/10:
  - E1: `/terms` → 200; DOM text "Last updated: 27 October 2026" and
    "Owner: TrueSpec Automotive · Reviewed: 27 October 2026"; governing law (Federal Republic of
    Nigeria, Lagos) present.
  - E2: home, inventory and car page footers all link `/terms`.
  - E6 (terms part): terms page file + `lib/site.ts` carry owner and date.
  - tabs 4→4; 1 Chromium; no tab opened; no Chrome launched.

## Not verified / caveats

- Privacy page still lacks its owner/review record — that is Task 14. E6 for privacy is deferred
  (accepted NOT RUN until Task 14); terms E6 passes.
- The owner's visual look check on the new terms page remains pending per the plan's standing owner
  look item. Structural checks pass; this is not a visual sign-off.
- No registered company name/RC number exists in the repo; the page uses the trading name
  "TrueSpec Automotive" as the plan directs ("unless the owner supplies a registered name/RC").
- The liability paragraph is a plain default; edit or remove if the owner prefers.
- Changes are uncommitted; no commit or push was made.

## Evidence

- `app/(site)/terms/page.tsx`, `app/(site)/terms/terms.css`
- `developer-workspace/scripts/LAUNCH-001/terms.mjs`
- `/tmp/opencode/terms-task13e.json`
- Server log: `/tmp/opencode/truespec-3210.log`
