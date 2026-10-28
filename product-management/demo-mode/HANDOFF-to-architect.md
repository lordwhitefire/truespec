# HANDOFF — to the architect agent

**Project:** TrueSpec Automotive — secure inventory site and office.
**Task:** add a public demo mode on the **same site, same URL, same database project**, where
self sign-ups use demo data and invited users use the main data. The demo resets at 03:00 daily.
**Date:** 2026-10-25
**Status:** design proposed. Nothing built. Build only after the owner confirms §7.
**Supersedes:** the earlier twin-deployment handoff. There is no second Vercel project, no second
Clerk application, no second URL.

---

## 0. Read these first, in this order

| # | File | Why you need it |
|---|---|---|
| 1 | `product-management/demo-mode/PLAN-demo-mode.md` | **The design.** Spaces, roles, reset, guards, isolation tests, the rejected column alternative. |
| 2 | `product-management/PLAN-mvp-handover.md` | What was delivered and the boundaries the owner set. |
| 3 | `product-management/handover/01-requirement.md` | The original brief and the assumptions carried. |
| 4 | `product-management/handover/02-page-inventory.md` | Every screen and route that exists — the map of what a demo user will see. |
| 5 | `product-management/handover/03-method.md` | Why the delivered scope is what it is. |
| 6 | `product-management/handover/04-change-log.md` | Requirement vs build, including the known gaps. Read before promising a demo. |
| 7 | `product-management/handover/05-send-checklist.md` | The client's access constraints: invitation, Google, no printed password. |
| 8 | `product-management/handover/note-to-client.md` | The message the client received; the commitments already made. |

The repo: Next.js 15 on Vercel, Clerk, Neon Postgres, Sanity for photographs. `lib/` holds the domain,
`migrations/` the schema, `scripts/` the seed/wipe/leak checks, `app/` the routes.

---

## 1. Mission

A prospect lands on the existing URL, signs up, and uses the office exactly as the client would. They
can add cars, upload photographs, edit prices, move enquiries and change settings. The next morning
everything they changed is gone and the seeded fleet is back. The client, who is invited, never sees
the demo and never loses a row.

The owner must be able to switch the demo off without touching the client's data.

**Not in scope:** changing the client's sign-in path, the delivered guide, the client's invitation,
the production backup cron, or any screen's behaviour for main users.

---

## 2. Non-negotiables

1. **Same deployment and same URL.** No second Vercel project, no subdomain, no `/demo` prefix.
2. **Same Clerk application.** Sign-up is enabled on it; invitations keep working. The client's
   invite → Google → office path must remain exactly as verified.
3. **The space is decided from the verified Clerk session**, never from a cookie, header, query
   parameter or form field.
4. **Default is demo.** A signed-in user with no explicit main grant is demo. If
   `DEMO_DATABASE_URL` is missing, refuse the request — never fall back to main.
5. **The reset cannot reach main.** Guard by URL host before anything is deleted.
6. **No schema change.** No `space` column, no RLS rewrite, no new unique constraints, no migration.
   If you find yourself editing `migrations/`, you are building the rejected alternative (§8 of the
   plan).
7. **Photographs are shared.** The reset must not delete the seeded Sanity assets. Litter cleanup
   runs after the restore, never before.
8. **The showroom is main-only.** Every public page and public API reads main, for every visitor,
   signed in or not. A demo session must not change what the showroom shows, what it counts, or what
   it feeds. The session decides the office, and only the office.

---

## 3. The design in one screen

| Layer | Today | After |
|---|---|---|
| Vercel | one project | **same one project** |
| URL | one domain | **same one domain** |
| Clerk | one app, invite-only | same app, sign-up enabled; invitations carry `space=main` |
| Neon | one branch | same project, **two branches**: `main` and `demo` |
| `lib/db.ts` | one client | two clients, selected per request |
| `lib/store-guard.ts` | one query path | two doors: session-resolved (office) and main (public) |
| Public showroom | main | **main, always** — the session never affects it |

`main` is the client's data. `demo` is a copy-on-write branch seeded with the demo fleet. The office
picks one per request. The showroom always picks `main`. That is the whole separation.

Why this rather than a `space` column: there is one store chokepoint but **79 SQL statements** across
the modules touching these tables. A column means editing all 79 and trusting every `WHERE`. A branch
is physical: a wrong query still cannot cross. See `PLAN-demo-mode.md` §2 and §8.

---

## 4. What exists today — facts to build on

| Fact | Where |
|---|---|
| Every store call goes through `storeQuery` / `storeQueryRefusing` | `lib/store-guard.ts` |
| Only `lib/db.ts` creates the Neon client | `lib/db.ts` (`db()`), `grep` confirms no other importer |
| RLS is **not** a boundary in this build; the store module is | comment at the top of `lib/db.ts` |
| Any authenticated user who reaches `/office` is auto-provisioned by email | `lib/session.ts` — `INSERT INTO office_user … ON CONFLICT` |
| Clerk is invite-only; the sign-in screen is the one verified earlier | `app/office/sign-in/[[...sign-in]]/page.tsx` |
| The seeded fleet is 17 cars, with a photograph manifest of fixed Sanity asset ids | `scripts/seed.ts`, `scripts/demo-photo-manifest.json` |
| A demo wipe exists, deletes demo rows and their assets, and is deliberately manual | `scripts/demo-wipe.ts` |
| The existing cron is the **backup**, at 02:00 | `app/api/cron/daily/route.ts`, `vercel.json` |
| `is_demo` exists on `car`, `enquiry`, `draft` only — a wipe marker, not a tenancy boundary | `migrations/0012_demo_marker.sql`, `0022` |
| The public read path is one SQL constant | `lib/public-cars.ts` (`SELECT_CARS`) |
| Settings live in one key-value table | `migrations/0005_feed_settings.sql`, `lib/settings.ts` |
| A leak check already exists | `npm run leak-check` |

`is_demo` is not read by any office or public query — it exists only so the wipe can find demo rows.
Do not mistake it for an existing isolation mechanism.

---

## 5. Work breakdown

Each task has an acceptance test. Nothing is done without it.

### A1 — Create the demo space
Create a Neon branch in the existing project. Run `db:migrate` and `db:seed` against it. Take a
snapshot immediately after seeding, before the first sign-up.

**Accept:** the demo branch holds the 17-car fleet; it contains no row that came from main; main's
counts are unchanged. The snapshot is named and its id recorded in the rollout notes.

### A2 — The two doors
`lib/space.ts` (new): resolve `main` | `demo` from Clerk `auth()`, `publicMetadata.space`, and
`MAIN_EMAILS`. `lib/db.ts`: `mainDb()` and `demoDb()`. `lib/store-guard.ts`: two explicit doors —
`storeQuery` / `storeQueryRefusing` resolve the session space (office only); `storeQueryMain` /
`storeQueryMainRefusing` always use main (every public path: `lib/public-cars.ts`, counts, taps, the
public API routes). Both accept an optional `{ space }` for scripts/tests.

**Accept:** unit tests cover anonymous → main, metadata main → main, allowlisted email → main, any
other signed-in user → demo, missing `DEMO_DATABASE_URL` → refusal. A demo-session call to
`storeQueryMain` returns main rows. No module outside `lib/db.ts` imports the Neon driver. The public
modules import only the main door. `npm run leak-check` proves both.

### A3 — Grant the main space
Set `publicMetadata.space = "main"` on the client's Clerk invitation; add the client's and owner's
emails to `MAIN_EMAILS`. Do not change the sign-in screen's invitation/Google path.

**Accept:** the invited client lands on main rows; a fresh Google sign-up lands on demo rows; a
hand-edited cookie or `?space=main` changes nothing.

### A4 — Sign-up, the demo strip, and the hidden preview
Add a secondary "Try the demo — create an account" link to the sign-in screen. In the **office
shell only**, render a persistent "Demo — everything resets at 03:00" strip when the resolved space
is demo. Do not put a demo label on the public header. Hide the "Preview the buyer page" action for
demo users: it opens a main page and would show them a car they did not create.

**Accept:** a clean browser completes sign-up in under two minutes and reaches the Dashboard; the
strip appears on every demo office route and on no main route or public page; the client's screen is
unchanged except for the secondary sign-in link; no demo user can reach the preview action.

### A5 — The reset job
`app/api/demo/reset/route.ts`, `GET`, `force-dynamic`, `maxDuration = 300`, bearer `CRON_SECRET`.
Guards in order: `DEMO_RESET_ENABLED`, `DEMO_DATABASE_URL` present and not the main host, Postgres
advisory lock. Then restore the demo branch to the snapshot (or the §5.2 fallback).

**Accept:** a manual call restores the fleet, settings, states and counters; a wrong secret returns
401; a missing flag returns 403; a URL equal to main refuses before deleting; two concurrent calls
cannot both run. The response is a summary with rows before and after.

### A6 — Schedule it
Add `0 3 * * *` to the existing `vercel.json`. Leave the 02:00 backup cron untouched.

**Accept:** the demo reset appears in the cron list; one scheduled run completes; its summary is in
the logs; the backup still runs at 02:00. Confirm the Vercel plan allows a second cron before
shipping.

### A7 — Photograph hygiene
The seeded assets must survive the restore; a prospect's uploads may not.

**Accept:** after a reset, every seeded car still renders its photographs; a photograph uploaded by
a prospect is gone after the reset and the litter cleanup; no asset referenced by the seed is
deleted.

### A8 — Isolation and reset proof
Run the tests in `PLAN-demo-mode.md` §7. Record the results in a short report beside this file.

**Accept:** no demo credential returns a main row through any office page, API route, export, or
direct ref/id guess; a demo user's car never appears on the showroom, in the public counts, or in the
public feed, and the showroom still reads main while they are signed in; no main credential sees a
demo row; main's counts and checksum are identical before and after a reset; a demo account still
signs in the next day.

---

## 6. What not to do

- Do **not** create a second Vercel project, domain, or Clerk application.
- Do **not** add a `space` column, rewrite RLS, or edit `migrations/`.
- Do **not** route a demo request to main when `DEMO_DATABASE_URL` is missing — refuse it.
- Do **not** run the asset-deleting form of `demo:wipe` as part of the reset.
- Do **not** change the client's invitation, Google sign-in, or the delivered guide.
- Do **not** move or remove the 02:00 backup cron.
- Do **not** let a demo user reach backup/restore. Export of demo data is acceptable; restore is not.
- Do **not** let a demo session influence the showroom — not its rows, its counts, its taps or its
  feed. Public reads use the main door, always.
- Do **not** label the public showroom as a demo. It is the client's real showroom, to every visitor.

---

## 7. Decisions the owner must confirm before A1

**Confirmed by the owner:** the showroom displays main data only; a self sign-up must not touch it;
the demo is the office, not a second showroom.

Still to confirm:

1. **Neon restore capability.** Whether the plan supports an in-place snapshot restore. This decides
   the preferred reset vs the SQL fallback.
2. **Second cron.** Confirm the Vercel plan allows two daily cron jobs (the backup already uses one).
3. **Owner sign-off on the 03:00 destructive job.** `scripts/demo-wipe.ts` was written with the rule
   that no schedule runs it. This plan deliberately automates a reset on the demo branch only. The
   owner should approve that in writing.

---

## 8. Definition of done

- [ ] A stranger signs up on the existing URL with Google and reaches the demo Dashboard.
- [ ] They can add a car with photographs, edit a price, and change the tagline.
- [ ] The showroom still shows main while they are signed in; their car never appears there.
- [ ] At 03:00 the demo returns to the seeded fleet; the tagline is back; their account still works.
- [ ] The invited client sees main, unchanged, with no demo strip.
- [ ] A demo credential cannot reach a main row by any route, ref or id.
- [ ] Main's counts and checksum are unchanged after a reset.
- [ ] The demo can be switched off by disabling the flag, removing the cron, and deleting the branch —
      with no migration to reverse.
