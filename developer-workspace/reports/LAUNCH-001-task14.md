# LAUNCH-001 Task 14 — Privacy notice alignment

**Status:** done; E3/E4/E6 privacy part verified 8/8 against the local production build.

## What changed

- `app/(site)/privacy/page.tsx` — adds `pageMetadata` (title, description, canonical, OG/Twitter),
  updates the last-updated date, and adds an owner/review record below it ("Owner: TrueSpec
  Automotive · Reviewed: 27 October 2026") using the same `.own` pattern as the terms page.
- `lib/site.ts` — adds `PRIVACY_LAST_UPDATED = "27 October 2026"`.
- `developer-workspace/scripts/LAUNCH-001/privacy.mjs` (new) — E3/E4/E6 runtime script.

## Already present (no change needed)

- Contact is the configured WhatsApp channel via `getSetting("whatsapp_number")` — consistent with
  the header/footer; no email address or self-service channel is promised.
- The deletion path ("Your rights") explains how a request reaches the owner on WhatsApp and what
  the owner can remove (enquiry + imported sheet; demo account).
- No `mailto:` links; no self-service channel promised.

## Verified

- `npm test` — 523 pass, 0 fail, 10 suites.
- `npm run typecheck` — pass.
- `npm run build` — pass; `/privacy` is dynamic (`ƒ`).
- Runtime script — 8/8:
  - contact is WhatsApp only; zero `mailto:` links;
  - deletion path names the owner and what can be removed;
  - privacy page renders "Last updated: 27 October 2026" and
    "Owner: TrueSpec Automotive · Reviewed: 27 October 2026";
  - privacy page file + `lib/site.ts` carry the owner/date constant;
  - tabs 4→4; 1 Chromium; no tab opened; no Chrome launched.

## Not verified / caveats

- The owner's visual look check on the privacy page remains pending (structural checks pass).
- Changes are uncommitted until this task's commit below.

## Evidence

- `app/(site)/privacy/page.tsx`
- `developer-workspace/scripts/LAUNCH-001/privacy.mjs`
- `/tmp/opencode/privacy-task14b.json`
- Server log: `/tmp/opencode/truespec-3210.log`
