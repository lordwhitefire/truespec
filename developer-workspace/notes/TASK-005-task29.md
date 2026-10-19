# TASK-005 · Task 29 — No invented number, no dead recipient

**Date:** 2026-10-19 · **Outcome:** done. **Deps:** 28.

## What changed

- **`components/whatsapp.ts`** — `waLink` and `carWaLink` now return `string | null`: `null` when
  the number has no digits. The type carries the rule — no caller can build
  `https://wa.me/?text=…` (a chat to nobody) without handling its absence first.
- **The five places (`02-named-gaps.md` §6).**
  - **`app/(site)/layout.tsx`** — the header's WhatsApp number line shows the saved number, or a
    non-breaking space: **nothing is invented**. The nav chat, the footer icon and the footer
    button keep their place and words; with no number they render without an `href`.
  - **`app/(site)/not-found/page.tsx`** — reads the saved setting (it already received the number
    from the site layout's read; now the `null` case builds no link).
  - **`app/not-found.tsx`** — the **root** 404 has no site layout above it, so it now reads the
    setting itself: an async server component with `await connection()` before `getSetting` (a
    per-request read, not a build-time one). Its client theme-speech logic moved to the new
    **`components/site/ThemeSpeech.tsx`** — the page stays a server component, the speech island
    stays client.
  - **`app/(site)/privacy/page.tsx`** — converted to an async server component reading the saved
    number. With a number saved the notice's words and number are exactly as before; with none the
    line is the owner-approved **“Enquiries go to our WhatsApp directly.”** and the “Who to
    contact” sentence keeps its words but renders **“WhatsApp”** without a link (no anchor at all).
  - **`app/(site)/car/[ref]/page.tsx` / `car-parts.tsx` / `components/site/CarBehaviors.tsx`** —
    every car-page chat affordance (`#wa`, `#of`, `#vw`, the mobile bar `#mw`, the sold view, the
    greeting and farewell markup) handles `null`: the control stays on screen, the `href` is gone.
- **The other call sites the nullable type reached** (the AC governs over the Files line — the
  same call sites Task 13's precedent covered): home page “Chat with us”, `HomeInventory`,
  `InventoryBrowser` (empty state and farewell modal), `SiteFab`, the two generated strings in
  `HomeBehaviors`. `app/(site)/layout.tsx`'s FAB is the same control.
- **`lib/phone.test.ts`** — the old assertion (empty → `https://wa.me`), which encoded the dead
  link, is now the opposite: an empty/absent number returns `null`; the saved-number cases are
  unchanged. `npm test` **304/304**.
- **`developer-workspace/scripts/task-004/settings-save-check.ts`** — a tracked TASK-004 check
  narrowed for the nullable helper (`waLink(...)` used where a string is required now asserts
  non-null first). No behavior change in TASK-004's application code.

## Wording

Owner-approved 2026-10-19 (asked and answered **yes**): with no number saved the privacy line is
**“Enquiries go to our WhatsApp directly.”**; with a number saved the existing sentence and
number stay. The contact line's words do not change; only its link disappears.

## Live witness — cleared, then restored

`wa-number.mjs` backs up the one row to `runs/task29/saved-number.json`, deletes it, and puts it
back **with its original `updated_at`**. Live store before and after:
`whatsapp_number = +2348146927170`, `updated_at = 2026-10-16T11:55:53.863Z` — the row it was
(net-zero). The site was driven at `:3210` in the attached Chrome, no launch (3 → 3).

| reading | number cleared | number restored |
|---|---|---|
| header number, 7 site pages | **blank** | **+2348146927170** |
| `wa.me` links | **0** on all 8 pages | home 5 · inventory 4 · empty inventory 5 · car 8 · missing car 5 · site 404 5 · global 404 1 · privacy 5 — every one begins `https://wa.me/2348146927170` |
| nav chat · footer button · floating · home chat | present, **no `href`** | present, live |
| car `#wa` · `#of` · `#vw` · `#mw` | present, **no `href`** | live |
| Message Umar, all three 404s | present, **no `href`** | live (prefilled text intact) |
| inventory empty “Message me on WhatsApp” | present, **no `href`** | live |
| privacy `#whatsapp` | **“Enquiries go to our WhatsApp directly.”** | “Enquiries go to WhatsApp directly (**+2348146927170**).” |
| privacy `#contact` | “message us on WhatsApp.” — **no anchor** | same words, `https://wa.me/2348146927170` |
| invented literal in the page text | **false** on all 8 | **false** on all 8 |
| console | 2 × 404 — exactly the two documents under test (`/car/TS-999999`, `/task-29-no-such-page`) | the same two |

This task removes the lie and the dead link. The controls are **present but not yet visibly off**
— that is Task 30 (D16); the header holds its line with a non-breaking space rather than words.

## Grep — what remains, honestly

Runtime source (`app/`, `components/`, `lib/`) contains **no** `2348000000000` or
`+234 800 000 0000`. Two non-runtime occurrences remain, deliberately not edited here:

- `migrations/0005_feed_settings.sql:28` seeds the invented number as a **saved** setting on a
  fresh store. Editing an applied migration is not this task's call; the live store's real number
  overrides it. **Latent defect reported:** a rebuilt demo store would start with the invented
  number saved (not a fallback — worse, it looks entered). Recommend a separate data decision
  (a new migration that deletes the value only while it still equals the seed).
- `lib/tap-rules.test.ts:91` uses the literal as a test body's `number` — the test proves a tap
  body's number is **dropped**. It is test data, never rendered; left as historical test input.

## Files-line notes

- The plan's Files line names the five places; the AC's “no link to a recipient that does not
  exist” reaches **every** call site of the helper, so the call sites above are included
  (AC governs — Task 13 precedent). `components/site/ThemeSpeech.tsx` is new because the root 404
  had to become a server component. `settings-save-check.ts` is a compile adaptation in a tracked
  TASK-004 script, not application change.
- No CSS change: a control without an `href` still lays out as it did; the visible-off state and
  its reason are Task 30's.
- `carWaLink` is now the one place that trims the car's greeting text; unchanged.

## Verified

Typecheck clean · `npm test` **304/304** (was 303; the new no-number test) · both live legs PASS ·
store restored exactly · Chrome 3 → 3 (no launch). Drive scripts committed:
`wa-number.mjs`, `wa-number-drive.mjs`; readings `runs/task29/cleared.json` and `saved.json`
(`runs/` is gitignored).
