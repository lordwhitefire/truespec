# TrueSpec — architecture design

## Context

Planning is closed (`product-management/planning-close.md`, 2026-10-06) and six implementation plans were written from real screens (2026-10-08). This design turns that material into one architecture the build follows. The product: a public showroom plus a single-owner office for a Nigerian vehicle-import business, with one invariant above all others — **what the owner paid never reaches the browser**. The reference screens live in `test-truespec-v2` (outside this repo); this change builds the real thing in this repo.

Stack as ruled, revised 2026-10-08 by owner decision: Next.js + TypeScript, **Neon** (Postgres), **Clerk** (auth and sessions), **Sanity** (images *and* enquiry PDFs), Vercel hosting. Supabase is dropped — its free tier caps accounts at 2 projects, which TrueSpec cannot fit under (owner ruling 2026-10-08); the same ruling placed enquiry PDFs in Sanity. Rulings referenced by code (C1–C4, A1–A7, F1–F6, R1–R3) are recorded in `product-management/planning-close.md` and restated as requirements in this change's specs.

## Goals / Non-Goals

**Goals:**

- One repo where the contract (specs), the how (this design), and the work list (tasks) live together, so the Builder and the tester work from requirements, not from prose archaeology.
- The cost-leak invariant enforced structurally (one allow-list serializer), with a check that must pass before handover.
- Money figures that are provably identical everywhere: integer minor units, per-line rates, one rounding function.
- Free-tier survivability: sessions, abuse control, and job scheduling enforced by the app, not by paid features of any vendor.

**Non-Goals:**

- Staff roles, multi-admin, or public accounts — v1 is one owner.
- Image derivative pipeline (F3) — originals with a size cap; Sanity CDN params are the upgrade path.
- In-app password reset (F2) — recovery is a documented operation at the identity provider.
- Any CryptoPilot work — a different product, not part of this architecture.
- Editing `product-management/` — it stays as the readable record; disagreements resolve in favour of ruling dates and this change's specs.

## Decisions

### D1 — Next.js App Router with Server Components as the render model
**Decision:** One Next.js + TypeScript app; showroom pages are server-rendered; office pages are server-rendered behind a session check.
**Why:** The product design already picked Next.js + TypeScript ("one language throughout"). Server rendering means the allow-list serializer is the only path to the browser — no client-side fetch of raw rows to leak.
**Alternatives:** Static-site + API (rejected: the boundary would live in two places); separate SPA + backend (rejected: doubles the surface where costs could escape).

### D2 — The boundary is an allow-list serializer, not database permissions
**Decision:** Public data is produced by exactly one mapping function with an explicit field allow-list; the database is reachable only server-side via a server-only connection (the Neon connection string never reaches the browser); RLS stays restrictive but is explicitly *not* the mechanism (product-design §A, data-model D5).
**Why:** One function is one place to audit and one place to test. A browser that never holds credentials can't be tricked into a cost query. RLS-as-boundary fails open if a key ever leaks; the allow-list fails closed — fields simply aren't in the map.
**Alternatives:** RLS-only (rejected — documented as non-mechanism in D5); field-level views per screen (rejected — N surfaces, N chances to drift).

### D3 — Server Actions for every office write
**Decision:** All office state changes go through Server Actions (automatic origin check, POST-only); Route Handlers are reserved for reads and webhooks, and any write that must be a Route Handler carries an explicit origin check (system-model item 8).
**Why:** CSRF safety comes from the framework's default on the common path instead of a check someone must remember per endpoint.
**Alternatives:** Route Handlers everywhere (rejected — origin check becomes manual and forgettable).

### D4 — Clerk signs in; the app enforces every session rule (C1, C2)
**Decision:** Clerk is the identity provider (accounts, credential checking, provider session cookie); the app keeps its own `session` row per provider session (`created_at`, `last_seen_at`, `expires_at = created_at + 7 d`) and its own `auth_attempt` table, so both limits are app-enforced: valid iff `now < expires_at` and idle ≤ 12 h, with `last_seen_at` refreshed on a 5-minute cooldown. The sign-in form is the app's own, posting to a server-side route that applies the failure rules *before* forwarding the attempt to Clerk: no delay for the first 3 failures, then 1s → 5s → 15s → 30s capped 60s; max 10 failures/IP/15 min then log-and-reject for the window; never lock. Sign-out revokes the provider session and our row together.
**Why:** Clerk's 7-day maximum lifetime is its free default, but its inactivity timeout is a paid feature — so the 12-hour idle rule must live in our table anyway (the spec demands enforcement "regardless of the database vendor's plan tier"), and once the table exists the 7-day cap is enforced there too, independent of plan. The delay and per-IP window can only wrap an attempt that passes through our server; Clerk's hosted sign-in component would receive attempts directly and the schedule would never see them. No-lockout is an owner ruling (A1/F4) — a locked-out owner on a shared machine has no support line.
**Alternatives:** Clerk hosted sign-in component (rejected — bypasses the delay/IP rules the spec requires); Clerk paid inactivity timeout (rejected — spec forbids depending on a paid plan tier); self-managed password hashes in our own table (rejected — Clerk was chosen to own credentials, and F2 recovery then lives at the provider); JWT-only (rejected — no revocation on sign-out).

### D5 — Money: integer kobo, per-line rate, one totals function (R3, 45–46)
**Decision:** Every money column is `integer` (kobo); each $ cost line stores its own rate as integer kobo-per-dollar; total cost and profit are computed by a single function; nothing stores profit or totals — all are derived at read time.
**Why:** Floats drift; storing totals duplicates truth; per-line rates (owner ruling R3) reflect reality — a shipping quote and a purchase price were made at different times.
**Alternatives:** Global settings rate (killed by R3); `numeric` with scale (rejected — scale > 0 invites rounding in more than one place).

### D6 — Sold is a flag; states are data (30, system-model C/40)
**Decision:** `car.sold` boolean + sale price/date, independent of `state_id`. Car states and enquiry states are editable registry rows carrying a section mapping (cars) or closed flag (enquiries); deletion blocked while occupied.
**Why:** Un-marking sold reverses cleanly without resurrecting a state machine; the three showroom sections stay fixed because section is a property of the state, not a separate axis the owner can contradict.
**Alternatives:** Sold-as-state (rejected — reversal corrupts history); hard-coded enums (rejected — owner must be able to add "held for payment").

### D7 — Sanity for images and enquiry PDFs (A7, owner ruling 2026-10-08)
**Decision:** Car photos are Sanity assets behind the CDN, referenced by `car_photo.sanity_asset_id` (cover = position 0). Enquiry PDFs are also stored in Sanity — as file assets with randomized filenames under an `enquiry-pdfs` designation; the real filename and the asset reference live only in the database, and a reference never appears in any payload that leaves an authenticated office response. Upload-first, car-saves-second. Daily job reconciles: prune assets unreferenced > 24 h, prune rows whose asset 404s (outside undo window), remove assets and PDFs of hard-deleted records.
**Why:** A7 restored the product-design stack; Sanity's CDN removes the single largest demo risk (image weight on mobile data) without writing image code. The owner ruled PDFs into Sanity as well (2026-10-08), keeping the stack at four vendors: Neon, Clerk, Sanity, Vercel — one asset store, one failure mode to monitor.
**Trade-off:** A Sanity asset URL is fetchable by anyone holding the exact reference — a randomized filename makes that reference unguessable (capability link, no expiry). The app's guarantee is that such references never appear outside an authenticated office response and die with their import in the daily job. If strict expiry is ever required, the upgrade path is an expiring proxy route or a private dataset — recorded, not built in v1.

### D8 — Jobs: one Neon scheduled function, minimal surface
**Decision:** One daily job — a **Neon scheduled function** (Function Trigger, five-field UTC cron; available on the free tier and fires even when compute has scaled to zero) — doing tombstone hard-deletes, storage reconciliation (images and PDFs), retention sweeps (enquiries A4), `auth_attempt` pruning (90 days), and a backup heartbeat. Vercel Cron (Hobby allows one run per day) is the documented fallback carrier. Monitoring = uptime check + in-office `last_backup_at` — no mail channel in v1.
**Why:** All deferred cleanup shares one cadence; batching daily is plenty for a single-owner product and stays inside free-tier call budgets. A scheduled function beats in-database `pg_cron`, which only runs while compute is awake — on Neon's free tier scale-to-zero cannot be disabled, so `pg_cron` would silently miss runs whenever the database slept.
**Alternative:** Vercel Cron daily trigger (kept as documented fallback — one run per day is all this needs); per-concern jobs (rejected — more triggers, more quota churn, same outcome). The function is declared in the repo's committed `neon.ts` policy (Neon config-as-code) and applied with `neon deploy`, so the job's carrier is versioned and reviewed with the code — set up 2026-10-08 against the owner's linked project.

### D9 — Rendering the office per device (UI plan)
**Decision:** Phone/tablet/laptop are widths, not designs: edit-as-full-page/drawer/inline, state changes via bottom sheet/sheet/inline dropdown, filtering full-screen sheet/sheet/bar dropdown. Dark is default with a persisted visitor toggle; one shared token set for both sides.
**Why:** Adopted UI-plan answers (95 questions, rulings 2026-10-06); recorded here so the build doesn't re-open them.

### D10 — Seed and migrations split (D6 of data-model plan)
**Decision:** Base state rows (four car groups, five enquiry states) live in migrations as built-in contract; demo cars live in an idempotent first-run seed.
**Why:** Migrations survive re-seeding; demo data must be re-runnable without duplicating registry rows.

## Risks / Trade-offs

- **[Cost leak is catastrophic and silent if wrong]** → The allow-list serializer is the only public data path (D2), plus a pre-handover automated check that greps every public response for cost-field names and fails the build; specs make it testable.
- **[Sanity bytes and Neon rows drift]** → Daily convergence job (D7) makes bytes and rows agree within 24 h; placeholder rendering covers the outage window.
- **[A leaked PDF reference is fetchable forever]** → References exist only in the database and authenticated office responses (D7); randomized filenames make guessing infeasible; the daily job deletes each file when its import dies.
- **[Neon scales compute to zero on the free tier]** → The scheduled function fires at scale-to-zero, so the job never depends on a warm database; the office's first load after idle pays one cold start — accepted for a single-owner product.
- **[One-owner lockout via abuse control]** → No lockout by design (D4); delay/IP window only slows, never denies permanently; recovery is a documented identity-provider operation (F2).
- **[Retention sweeps delete data the owner wanted]** → Sweep operates on PII (enquiries/taps), never cars or money; export exists first (office-settings); A4–A6 are owner-confirmed defaults to re-verify at the system-model pass.
- **[Planning prose and specs disagree in places]** → Ruling dates govern; `planning-close.md` is the arbitration record; known stale spots (e.g. `seed-content.md`'s global-rate line vs R3) are called out in tasks rather than silently patched here.
- **[Reference screens live outside the repo]** → Tasks treat `test-truespec-v2` as read-only visual truth; any behaviour conflict resolves to the specs, per planning-close's "rule wins over screen".

## Migration Plan

Greenfield — no production data. Deploy order: schema migrations → seed → showroom → office behind auth → daily job → pre-handover leak check. Rollback = revert deploy; database changes ship forward-only with corrective migrations.

## Open Questions

- A4–A6 retention defaults await the owner's "go" (tracked in planning-close) — defaults are specced as stated; only the confirmation is pending, and it cannot change the structure, only the numbers.
- Tablet office navigation (sidebar vs bottom bar) — deferred in the product overview and genuinely open; it changes no requirement, so it lands as a UI task decision, not a spec change.
