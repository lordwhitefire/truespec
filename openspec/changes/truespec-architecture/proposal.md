# TrueSpec Automotive — architecture

## Why

TrueSpec has a complete, closed planning stage (`product-management/`: product model, data model, system model, UI/UX plans, six implementation plans, and a register of every ruling) but no architecture in this repository's OpenSpec store — `openspec/specs/` is empty. The planning knowledge lives in prose files that the Builder, the tester, and future sessions cannot rely on as a contract. This change turns that closed planning into the project's codified architecture: one spec per capability, one design that shows how the pieces fit, and a task list the implementation can be driven from.

## What Changes

- Introduces the full TrueSpec capability set as OpenSpec specs: a public showroom, a private office, and the hard boundary between them.
- Codifies the rulings already made in `product-management/planning-close.md` (C1 sessions, C2 abuse control, C3 visibility gate, C4 incomplete-costs wording, A1–A3/A7/F1–F6, R1–R3 per-line rates) as spec requirements rather than conversation memory.
- Establishes the stack as ruled (revised 2026-10-08): Next.js + TypeScript, Neon (Postgres), Clerk (auth, with session rules still app-enforced), Sanity (images and enquiry PDFs), Vercel hosting — recorded as design decisions, not re-litigated. Supabase was dropped when its free tier's 2-project cap proved too small for TrueSpec.
- Produces `tasks.md` covering the build of the whole product from the six implementation plans, ordered UI → business logic → functionality → UX → data model → system model as `planning-close.md` prescribes.
- Excludes CryptoPilot entirely — it is a different product and out of scope for this change.

## Capabilities

### New Capabilities

- `showroom`: The public site — home, three fixed sections (Available, On Order, Landed-inside-Available), car detail pages, WhatsApp conversion, and the server-side allow-list that keeps cost data from ever reaching the browser.
- `office-access`: The single-owner login — first-run account creation, app-enforced session lifetime (12 h inactivity / 7 d cap), growing-delay abuse control with a per-IP window and no lockout.
- `inventory`: Car records in the office — CRUD, the state registry mapped to the three showroom sections, sold flag separate from state, `TS-####` reference codes, delete with undo and tombstone lifecycle.
- `money`: The financial model — six fixed cost kinds, per-line FX rates (no global rate, R3), integer minor units, one rounding point, live profit while typing, and state-driven figure labelling (estimated / landed / projected / real).
- `dashboard`: The office dashboard — counts under one shared counting rule, money totals with explicit reach ("from 9 of 14 cars"), the "still building" line for incomplete costs, taps and activity feeds.
- `enquiries`: Enquiry tracking — WhatsApp tap recording (page, car, time only), PDF import with preview-and-confirm, the five-state pipeline as an editable registry, and retention rules for customer data.
- `office-settings`: Settings and data ownership — WhatsApp number, tagline, full-tank default, password change, one-click data export, and the PDF/photo storage locations.
- `media`: Image and file lifecycle — Sanity as the image store with CDN, upload-first/car-saves-second flow, orphan pruning, EXIF stripping at the write boundary, and enquiry PDFs stored as private-by-convention files in Sanity.

### Modified Capabilities

_None — this is the first change; `openspec/specs/` is empty._

## Impact

- **New codebase region:** everything under the project root follows from this change — the Next.js app, database schema/migrations, seed scripts, and deployment configuration.
- **Dependencies:** Neon (Postgres), Clerk (auth), Sanity (image and file storage), Vercel (hosting). No other external services.
- **Source material:** `product-management/` remains the readable record; this change does not edit it. Where the two ever disagree, the ruling dates in `planning-close.md` and the requirements here govern.
- **Existing prototype:** the reference screens in `test-truespec-v2` (outside this repo) are the visual source of truth for the UI tasks; this change does not modify them.
- **Compliance surface:** customer-data retention (NDPA-shaped defaults A4–A6) and the cost-leak check that must pass before handover are spec requirements, so they become testable.
