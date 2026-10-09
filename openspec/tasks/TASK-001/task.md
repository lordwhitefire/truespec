# TASK-001 — Showroom foundation & public boundary

**Registry entry:** "Next.js app scaffold, schema migrations, seed, the allow-list serializer, and the three-section showroom with the leak check" (change tasks 1–3 of `openspec/changes/truespec-architecture/tasks.md`).

**Form (owner ruling 2026-10-08):** this is a plan for the Builder, not an instruction. It states what must be true, what must not happen, and the process to follow. It guides; it does not command. Completion is judged against the benchmarks and the specs, not against whether a verb was obeyed.

---

## Why

Everything else in TrueSpec stands on this task. The product's whole promise is one rule — *what the owner paid never reaches the browser* — and that rule can only be kept if the boundary and the public pages are born together, with the boundary already in the middle. This task also lays the floor the office will stand on later: the application, the schema, the seed, and the one money function. A defect here (a leaking serializer, a float in a money column, a seed that duplicates rows) is cheap to fix today and expensive after six more tasks.

## Scope

**In scope** — change tasks 1–3:

- The application itself (Next.js + TypeScript) and its configuration behaviour
- The initial schema and the built-in registry rows
- The first-run demo seed
- The one shared money module
- The public showroom: home, inventory, car pages, responsive behaviour
- The public boundary: the allow-list serializer, its use by every public read, the listing gate, and the automated leak check

**Out of scope** — expected to be absent here, not defects:

| Belongs to | What it is |
|---|---|
| TASK-002 | All office screens (login, dashboard, inventory, forms) |
| TASK-003 | Live profit reads, cost labels, office consumption of the counting rule |
| TASK-004 | Sessions/auth, WhatsApp **tap recording**, privacy notice, PDF import |
| TASK-005 | Toast/undo/empty-state/failure-wording pass |
| TASK-007 | Daily jobs, prune/convergence, monitoring |

## What must be true

### Foundation

1. The project root holds a Next.js + TypeScript application. Its look is governed by `ui-plan.md`: dark default with a persisted visitor toggle (the visitor's choice wins over the device setting), one shared token set, `#c8a24a` gold, Oswald + Inter.
2. Startup with a missing or wrong key (Neon database URL, Clerk publishable + secret keys, Sanity project/dataset/token, session secret) fails loudly with a clear error — a broken page never renders in place of a configuration error. The database connection arrives from the owner's already-created Neon project (id `bold-dew-39255926`, region `aws-eu-central-1`): the directory carries a `.neon` context file pinned to the `production` branch, and `DATABASE_URL` is pulled into the gitignored `.env.local` by Neon's tooling — never hardcoded, never committed. A committed `neon.ts` policy file declares the project's Neon services (owner setup 2026-10-08; its future tenant is the daily function of design D8).
3. The schema covers the entities the rest of the work needs: `office_user`, `session`, `auth_attempt`, `car`, `cost_line`, `car_state`, `car_photo`, `enquiry`, `enquiry_state`, `tap`, `activity_event`, `setting`. Every money column is integer minor units; every timestamp is `timestamptz` UTC.
4. Built-in registry rows (the seeded car states for the three sections, the five enquiry states) live in migrations; demo cars live in an idempotent first-run seed. Running the seed twice leaves the same rows as running it once.
5. One money module exists — integer kobo arithmetic, per-line rate conversion, one totals function. Rounding happens there and nowhere else. (The showroom shows no costs; the module is foundation for the office.)

### Showroom

6. The home page carries the brand, tagline, a prominent WhatsApp path, and previews of the three sections with counts.
7. The inventory page shows exactly three sections — Available, On Order, Landed — with Landed rendered inside Available. No configuration can produce a fourth top-level section.
8. Counts follow the one counting rule from `specs/dashboard`: Available = Available group + landed-this-year, new arrivals listed once with "of which N new arrivals", sold excluded. The rule exists as a single implementation here, so the office can read the same function later (its wiring is TASK-003's).
9. A car page carries everything needed to decide: swipeable gallery (arrows additionally on laptop), brand/model/trim/year/colours/mileage/full naira price/features, and a WhatsApp button that opens a chat with a message already naming that car.
10. Responsive behaviour follows the width table: cards on phone, table on laptop, filtering as full-screen sheet / sheet / bar dropdown. Widths are not designs — the content and rules are identical at all three.
11. A car without a price or without a photo is a draft: absent from every public page, count, and link. A public page can never render an unset price as a number.
12. Links to sold or deleted cars resolve gracefully — no crash, no stale availability.

### Boundary

13. Exactly one server-side mapping function produces all public car data, from the explicit allow-list in `specs/showroom` (brand, model, trim, year, colours, mileage, features, photos, price, section, reference code — and nothing else).
14. Every showroom read — pages, counts, lists — passes through that mapping. No raw row serialization exists on any public path, and the browser never holds database credentials.
15. An automated leak check exists: it walks every public route and asserts that no cost, rate, or profit field name or value appears in any response. It passes.

## Constraints — what must not happen

- **The one rule that must never break:** no purchase, shipping, clearing, trucking, fuel, rate, total-cost, or profit value reaches any public response — not in HTML, not in serialized payloads, not in counts, not in error messages.
- No visual decision may contradict `ui-plan.md`. Where `ui-plan.md` is silent, the choice is the Builder's and must be recorded in a change log — not left invisible.
- The reference screens in `test-truespec-v2` are read-only visual truth. Where screen and spec disagree, the spec wins, and the conflict is logged for the owner rather than quietly reconciled.
- Money: no float, no scale > 0 anywhere; no global or settings-level FX rate anywhere (ruling R3). The "rate set in Settings" line in `seed-content.md` is stale — seed data honours per-line rates and the stale line is flagged to the owner, not followed.
- `product-management/` is never edited by this task. Stale docs found here are flagged (close-out 10.2), not patched.
- Nothing about CryptoPilot enters this repository or this task.
- Absence of the out-of-scope items above is expected; inventing them here would collide with the tasks that own them.

## Process — how to work it

**Reading order, in this order, before building:**

1. `specs/showroom` — the binding requirements for everything public.
2. `specs/dashboard` — the counting rule as it must be computed.
3. `specs/money` — the money module's contract (integer units, per-line rate, one rounding point).
4. `design.md` D1 (server rendering), D2 (the allow-list is the boundary, not RLS), D5 (money), D10 (migrations vs seed).
5. `ui-plan.md` and `product-overview.md` — the decided look and content.
6. Reference screens `test-truespec-v2` — visual truth, read-only.

**Order that matters:** the boundary function exists and is the only path to the public before the pages render live data — so no page ever grows its own private fetch that later has to be found and removed. The leak check runs from the moment the first public route exists, not at the end.

**Where judgment belongs to the Builder:** file and component structure, state handling, how the gallery gesture is implemented, how the toggle persists, and any layout gap `ui-plan.md` did not answer. These are choices, not requirements — make them, record them, keep them inside the constraints.

**Conflicts:** spec vs screen → spec wins, log it. Spec vs this plan → spec wins. Planning doc vs ruling date → later ruling wins, flag it.

## Benchmarks — after this change, when…

- …the app starts with a required key missing, it stops with a clear configuration error instead of rendering a broken page.
- …the seed runs twice, the second run leaves the same rows as the first — no duplicated states, no double demo cars.
- …a visitor opens the home page on a phone or a laptop, they see the brand, the tagline, a prominent WhatsApp path, and three section previews whose numbers match the inventory page exactly.
- …a new-arrival car exists, it appears under both Landed and Available, both counts include it once, and the note reads "of which N new arrivals".
- …the inventory page opens, there are exactly three sections, Landed sitting inside Available — and no office configuration can add a fourth.
- …a car page opens, the gallery swipes (arrows also on laptop), the price reads in full naira, all the public facts are present, and the WhatsApp button opens a chat message naming that car.
- …a car is missing its price or its photo, it appears on no public page, no count, and no link; when the missing piece is added, it appears immediately.
- …a sold or deleted car's old link is opened, the visitor gets a graceful outcome — never a crash and never a stale "available".
- …any public response is inspected — any page, any list, any count, any error — no cost, rate, or profit value appears anywhere in it, and the automated leak check passes on every public route.
- …the visitor switches theme and moves between pages, their choice persists and the device setting is not consulted.
- …any money figure is computed, it comes from the one totals function over integer kobo — rounding exists in exactly one place.

## Evidence the Builder leaves behind

- The leak-check run, green, with its output retained (it is a pre-handover gate — TASK-008 will ask for it).
- The change log of choices made where `ui-plan.md` was silent.
- The conflict log: spec vs reference screen, stale planning docs found (including the `seed-content.md` rate line).
