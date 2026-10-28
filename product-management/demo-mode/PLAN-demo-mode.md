# PLAN — Demo mode on the same site

Date: 2026-10-25
Status: proposed, corrected to the owner's decision. Nothing built.
This replaces the earlier twin-deployment draft. There is **no second site, no second URL, no second
Clerk application**.

---

## 1. The owner's decision — fixed

1. **One site, one address, one click.** The same Vercel deployment, the same domain, the same
   sign-in screen.
2. **Invited users see the main data.** The client, and anyone the owner invites, work on the real
   inventory.
3. **People who sign themselves up see the demo data.** They get the full office — add, edit,
   delete, upload photographs, change settings — so the product can be pitched to them.
4. **Demo data resets at 03:00 every day** to a fresh copy, so the next prospect sees a clean,
   correct demo.
5. **Accounts survive the reset.** Only data resets; a prospect can sign in again the next day.
6. **Main data is never touched** — not by a demo user, not by the reset.

Those six lines are the contract. Everything below is how to meet them.

---

## 2. What "two spaces" means here

One Neon project. Two data spaces inside it:

| Space | Who | Contents |
|---|---|---|
| `main` | invited users | the client's real inventory |
| `demo` | self sign-ups | the seeded demo fleet and anything a prospect creates |

The demo space is a **branch** — Neon's copy-on-write database inside the same project. It is not a
second project, not a second deployment, not a second URL. The **office** chooses the branch from the
verified Clerk session on each request. The **showroom** always uses `main`.

### Why a branch and not a `space` column

The obvious alternative is one branch with a `space` column on every table. It is rejected for this
build because:

- The code has one store chokepoint (`lib/store-guard.ts`) but **79 SQL statements** across the
  modules that touch `car`, `enquiry`, `setting`, the state registries and the user/session tables.
  A column means editing all of them; one missed `WHERE space = …` shows a prospect the client's
  purchase prices and profit.
- A branch makes the separation physical. A demo request cannot read a main row even if a query is
  wrong.
- It needs **no migration, no new unique constraints, no per-space settings/state rows** — the whole
  schema works unchanged, twice.
- Undo is deleting the branch. Main never changed.

The column design is kept in §8 so the architect can see what was weighed; it is not the plan.

---

## 3. Who is in which space

The space is decided once per request, from the **verified Clerk session** — never from a cookie, a
header, a query parameter or a form field.

| Case | Space |
|---|---|
| No session (anonymous visitor) | `main` |
| Clerk user with `publicMetadata.space = "main"` | `main` |
| Clerk user whose email is in `MAIN_EMAILS` | `main` |
| Any other signed-in user (self sign-up) | `demo` |
| `DEMO_DATABASE_URL` missing | refuse the demo request — **never** fall back to `main` |

- The client is invited with `publicMetadata.space = "main"`.
- The same email is also put in `MAIN_EMAILS` as the belt-and-braces check, in case invitation
  metadata is ever lost.
- Self sign-up carries no metadata, so the default is `demo`. That default is the safe direction.
- `lib/session.ts` already auto-provisions an `office_user` row for any authenticated user. That is
  safe here because the branch is chosen **before** the row is written; the row is created inside the
  chosen branch.

**The session decides the office only. It never decides the showroom.** Public showroom queries use
`main` explicitly, whether the visitor is anonymous or signed in as a demo user. A demo user browsing
the site sees the client's real showroom; they have no path to change it.

**Important:** enabling sign-up on the existing Clerk application is required. It does not change the
client's path — invite → Google → office — which was verified earlier. It only adds a sign-up route
for prospects.

---

## 4. What each person sees

| Visitor | Showroom | Office |
|---|---|---|
| Anonymous | main | sign-in |
| Invited / main | main | main, no demo marker |
| Demo | **main** | demo, with a persistent *"Demo — everything resets at 03:00"* strip |

**The showroom is the client's, always.** It displays main data to everyone — anonymous visitors,
invited users, and demo users alike. A demo user's edits never appear there.

Consequences, deliberate:

- The demo is an **office** demo, not a second showroom. A prospect sees the client's real showroom
  and tries the admin behind it.
- "Preview the buyer page" is hidden for demo users. It would open a main page and show them a car
  they did not create, which reads as a bug. The demo strip says the office is the demo; the
  showroom is the product.
- A demo user browsing the showroom is an ordinary public visitor. Taps they generate are ordinary
  public traffic. If the owner wants even those excluded, the tap route skips demo sessions — a
  one-line rule, not a design change.

Today `main` still holds the seeded fleet, so the showroom is populated. When the client enters his
own stock, that is what everyone sees.

The demo strip is not decoration: it is what stops a prospect mistaking the demo for a live business
and what explains why yesterday's edit is gone.

---

## 5. The reset at 03:00

### 5.1 What must return to the seeded state

Cars, cost lines, photographs' references, sales, enquiries, imported PDF rows, drafts, taps,
activity rows, settings, car states, enquiry states, reference counters, and the local
`office_user` / `session` rows.

Clerk accounts are **not** touched. A demo user keeps their login; their local rows are recreated on
the next request.

### 5.2 How

Preferred: **restore the demo branch to a snapshot taken immediately after seeding**, before the
first sign-up. One atomic operation, no drift, no partial state.

Fallback A: **truncate the demo branch's tables and restore them from a `demo_seed` schema** kept on
the same branch. Pure SQL, no external API, but the seed copy must be refreshed whenever a migration
changes a table.

Fallback B: **truncate and re-run `db:seed`** against the demo branch. Reuses the existing seed; the
seed becomes the definition of "fresh".

The architect picks based on what the Neon plan supports. The requirement is the same in all three:
*the demo branch returns to exactly the seeded state, atomically or in one transaction.*

### 5.3 The job

- `app/api/demo/reset/route.ts`, `GET`, `force-dynamic`, `maxDuration = 300`.
- Same bearer-secret pattern as `app/api/cron/daily/route.ts`.
- Guards, in order, before anything is deleted:
  1. `DEMO_RESET_ENABLED === "1"` — otherwise 403.
  2. `DEMO_DATABASE_URL` is set and its host is **not** the main host — otherwise refuse.
  3. A Postgres advisory lock, so two runs cannot overlap.
- Response: a summary — rows before, rows after, what was restored, the snapshot used.
- Schedule: `0 3 * * *`, added to the **existing** `vercel.json`. The production backup cron at
  02:00 stays exactly as it is. Vercel Hobby allows two cron jobs; this reaches the limit, so
  confirm the plan before adding it.
- The run is recorded in the `activity` table (or logs) so there is evidence it happened. The owner
  asked for a reset nobody has to check; the record is how it can be checked anyway.

### 5.4 During the reset

A prospect may be mid-edit at 03:00. Acceptable for a demo. The strip names the time. The job does
not lock the UI.

### 5.5 Photographs

The reset does **not** delete Sanity assets. The seeded photographs must still exist after the
restore. A prospect's uploads become orphans when their rows vanish; the existing litter cleanup
runs after the reset and removes them. Never run the asset-deleting form of `demo:wipe` here.

---

## 6. Code changes

Small and concentrated. No migration.

1. **`lib/db.ts`** — two lazily created clients: `mainDb()` from `DATABASE_URL`, `demoDb()` from
   `DEMO_DATABASE_URL`. No other module may import the driver.
2. **`lib/space.ts`** (new) — the one place the rule lives: resolve the space from Clerk
   (`auth()`), the metadata, and `MAIN_EMAILS`; return `main` for anonymous, `demo` for any other
   signed-in user; throw if `demo` is resolved and `DEMO_DATABASE_URL` is missing.
3. **`lib/store-guard.ts`** — two doors, so intent is visible at the call site:
   - `storeQuery` / `storeQueryRefusing` — resolve the space from the session. **Office only.**
   - `storeQueryMain` / `storeQueryMainRefusing` — always the main client. **Every public path**
     (`lib/public-cars.ts`, counts, taps, the public API routes) uses these.
   Both accept an explicit `{ space }` for scripts and tests. This is the only routing point.
4. **`app/office/sign-in/…`** — add a secondary "Try the demo — create an account" link. The
   invitation/Google path stays the primary one and must not change.
5. **Office shell** — the demo strip, rendered when the resolved space is `demo`. **Not** on the
   public header: the showroom is main for everyone and must not carry a demo label.
6. **`app/api/demo/reset/route.ts`** + **`vercel.json`** — §5.
7. **Clerk dashboard** — enable sign-up (Google + email); invite the client with
   `publicMetadata.space = "main"`; add `MAIN_EMAILS` and `DEMO_DATABASE_URL` to Vercel.
8. **`npm run leak-check`** — extend it: a test asserts no module outside `lib/db.ts` imports the
   driver; every office call goes through the session resolver; every public call goes through the
   main door.

No changes to `migrations/`, no RLS, no `space` columns, no query rewrites, no second deployment.

---

## 7. How it is proven

1. **Role test.** Invited account → main rows. Fresh sign-up → demo rows. A forged cookie or header
   changes nothing.
2. **Showroom test.** Signed in as a demo user, every public page and public API still reads main.
   A car the demo user created never appears on the showroom, in the counts, or in the public feed.
3. **Isolation test.** With demo credentials, request every office route, every API route, and known
   main refs/ids. Nothing from main may be returned. Then the reverse.
4. **Reset test.** Add a car and change a setting as a demo user; run the reset; the car is gone, the
   setting is back, the seeded fleet is exactly as before; the Clerk account still signs in.
5. **Main test.** Row counts and a checksum of main are identical before and after a reset.
6. **Failure test.** Unset `DEMO_DATABASE_URL` → demo requests are refused; they do not reach main.

A demo that resets but leaks is worse than no demo. §7.3 is the gate.

---

## 8. The alternative — one branch, a `space` column (not the plan)

If the owner ever forbids a branch, the same behaviour can be built in one branch:

- Add `space text NOT NULL DEFAULT 'main'` to `car`, `car_photo`, `cost_line`, `sale`, `enquiry`,
  `enquiry_pdf`, `draft`, `tap`, `activity_event`, `setting`, `car_state`, `enquiry_state`,
  `office_user`, `session`.
- Replace `car.ref UNIQUE` with `UNIQUE (space, ref)`, `car_state.label UNIQUE` with
  `UNIQUE (space, label)`, and the same for enquiries.
- Change `setting`'s primary key to `(space, key)`.
- Edit all 79 statements to name the space; add a static test that fails any statement that does not.
- Reset becomes per-space and must not touch `main`.

It works. It costs several days, touches the delivered schema, and puts the client's cost data behind
a `WHERE` clause. The branch design gets the same user experience with none of that.

---

## 9. Order of work

1. Create the demo branch, run `db:migrate` and `db:seed` against it, take the snapshot.
2. Add `DEMO_DATABASE_URL`, `MAIN_EMAILS`, `DEMO_RESET_ENABLED` to the existing Vercel project.
3. `lib/space.ts`, `lib/db.ts`, `lib/store-guard.ts`; tests.
4. Sign-in sign-up link and the demo strip.
5. Reset route and cron; dry-run against the demo branch only.
6. Clerk: enable sign-up; set the client's invitation metadata.
7. Clean-browser tests: invited → main office; sign-up → demo office; the showroom reads main in
   both, and a demo car never appears there.
8. Hand the same URL to the owner.

---

## 10. Rollback

- Set a flag to hide the sign-up link and refuse new demo sessions (`DEMO_SIGNUP_ENABLED=0`).
- Remove the reset cron.
- Delete the demo branch.
- Main is untouched throughout; there is no migration to reverse.

---

## 11. Answered, assumed, open

**Answered by the owner:** same URL; 03:00; accounts persist; reset demo data only; **the showroom
displays main data only, and a self sign-up must not touch it**.

**Open:** whether the Neon plan supports an in-place snapshot restore. This decides §5.2 preferred vs
fallback A.
