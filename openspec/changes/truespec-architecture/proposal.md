# TrueSpec Automotive — architecture

## Why

TrueSpec has a complete, closed planning stage (`product-management/`: product model, data model, system model, UI/UX plans, six implementation plans, and a register of every ruling) but no architecture in this repository's OpenSpec store — `openspec/specs/` is empty. The planning knowledge lives in prose files that the Builder, the tester, and future sessions cannot rely on as a contract. This change turns that closed planning into the project's codified architecture: one spec per capability, one design that shows how the pieces fit, and a task list the implementation can be driven from.

## What Changes

- Introduces the full TrueSpec capability set as OpenSpec specs: a public showroom, a private office, and the hard boundary between them.
- Codifies the rulings already made in `product-management/planning-close.md` (C1 sessions, C2 abuse control, C3 visibility gate, C4 incomplete-costs wording, A1–A3/A7/F1–F6) as spec requirements rather than conversation memory. R3 (per-line FX rates) is **superseded by the owner's 2026-10-12 ruling: no rate exists anywhere and every amount is naira** — the costs and the price to customers alike (the rate was never in the source spec; it came from the prototype screens).
- **Records the owner's 2026-10-14 ruling that an upload lands as a draft, not a record** (design D13): a file uploaded to create cars or enquiries is read into drafts held apart from the record tables, the owner adds the images by hand and saves each one, and the `TS-####` and the change-check are given at that save — so nothing unfinished can reach a count, a list or a public page, and an abandoned draft consumes no reference code.
- **Records the owner's 2026-10-14 ruling that a car's states come in two kinds** (design D15): **four fixed primary states — Available, On Order, Landed, Sold — one mandatory per car**, and any number of the owner's own **secondary** states, which never reach a public page. **Sold is one of the primary states, and setting it is what performs the sale** (design D6 as revised): the state comes first, the sale action follows, and the money facts stay on the sale row. The showroom keeps showing exactly three sections — three of the four — and the store's present five car states are reshaped to match.
- **Records the dev's eleven handover answers (2026-10-14)**: the draft table's shape is one table with its images ordered on the row (D16); our session row is created lazily, with no webhook (D17); a transient store failure becomes one shared retryable state (D18); the two operational notices read setting rows the job writes (D19); `activity_event` and `auth_attempt` are both left alone (D20); the photo cap is 15 MB and a WhatsApp number normalises to `+234…`; the retention numbers are confirmed as written; and a car's secondary states survive being marked Sold.
- **Records the owner's 2026-10-16 ruling that the tap notice counts the taps since the office last looked** (design D21, reconciling the developer's architecture deviation rather than editing the specs behind its back): a one-row `tap_seen` watermark holds the newest tap the office has rendered; the badge reads the taps newer than it; opening the full tap list marks them seen through a **POST** (no GET changes data) and the count clears while the glyph stays; and a look that writes a mark is named as the system's **first write-on-view** — *reads are effectless; acknowledging a read is a write.* The amendment also gives the full tap list a home of its own beside the enquiries board, uncapped, and closes the design record's two open questions (what the number counts, and whether the glyph survives at zero).
- Establishes the stack as ruled (revised 2026-10-08): Next.js + TypeScript, Neon (Postgres), Clerk (auth, with session rules still app-enforced), Sanity (images and enquiry PDFs), Vercel hosting — recorded as design decisions, not re-litigated. Supabase was dropped when its free tier's 2-project cap proved too small for TrueSpec.
- Produces `tasks.md` covering the build of the whole product from the six implementation plans, ordered UI → business logic → functionality → UX → data model → system model as `planning-close.md` prescribes.
- Excludes CryptoPilot entirely — it is a different product and out of scope for this change.

## Capabilities

### New Capabilities

- `showroom`: The public site — home, three fixed sections (Available, On Order, Landed-inside-Available), car detail pages, WhatsApp conversion, and the server-side allow-list that keeps cost data from ever reaching the browser.
- `office-access`: The single-owner login — exactly one account, created by the owner himself at the identity provider, with the provider's own sign-in as the only door and no public sign-up anywhere (invite-only); app-enforced session lifetime (12 h inactivity / 7 d cap); and abuse control the provider applies — a bounded, self-clearing lockout after ten failed attempts plus per-address rate limits, never an indefinite lockout (owner ruling 2026-10-14).
- `inventory`: Car records in the office — CRUD, creation from an uploaded template that lands as **drafts** the owner saves one by one, the two kinds of car state (four fixed **primary** states — Available, On Order, Landed, Sold — and the owner's own **secondary** states; Sold being a primary state that performs the sale), `TS-####` reference codes, and the delete-with-undo tombstone lifecycle.
- `money`: The financial model — six fixed cost kinds, all in naira, no exchange rate anywhere, integer minor units, one totals function, live profit while typing, and state-driven figure labelling (estimated / landed / projected / real).
- `dashboard`: The office dashboard — counts under one shared counting rule, money totals with explicit reach ("from 9 of 14 cars"), the "still building" line for incomplete costs, taps and activity feeds.
- `enquiries`: Enquiry tracking — WhatsApp tap recording (page, car, time only), PDF import landing as **drafts** the owner saves one by one, enquiry states the owner edits (seeded New, Talking, Negotiating, Sold, Lost — labels for tracking, never a required flow), and retention rules for customer data.
- `office-settings`: Settings and data ownership — WhatsApp number, tagline, full-tank default, password change, one-click data export, and the PDF/photo storage locations.
- `media`: Image and file lifecycle — Sanity as the image store with CDN, upload-first/car-saves-second flow, drift *reported* to the owner rather than pruned by the system, EXIF stripping at the write boundary, and enquiry PDFs stored as private-by-convention files in Sanity.

### Modified Capabilities

_None — this is the first change; `openspec/specs/` is empty._

## Impact

- **New codebase region:** everything under the project root follows from this change — the Next.js app, database schema/migrations, seed scripts, and deployment configuration.
- **Dependencies:** Neon (Postgres), Clerk (auth), Sanity (image and file storage), Vercel (hosting). No other external services.
- **Source material:** `product-management/` remains the readable record; this change does not edit it. Where the two ever disagree, the ruling dates in `planning-close.md` and the requirements here govern.
- **Existing prototype:** the reference screens in `test-truespec-v2` (outside this repo) are the visual source of truth for the UI tasks; this change does not modify them.
- **Compliance surface:** customer-data retention (NDPA-shaped defaults A4–A6) and the cost-leak check that must pass before handover are spec requirements, so they become testable.
