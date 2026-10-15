# TASK-004 — plan (functionality, Layer 4 of 6)

**Date:** 2026-10-15 · **Status:** approved ("go") — building; Phases 0–2 done (Tasks 1–9, Gate 2); Tasks 10–19 done (the car form writes, edit, delete/tombstone/undo/removal, **Sold / un-mark**, **the car-state registry editor**, **the enquiry board + registry + activity from real rows**, **the dashboard's real feed panels**, **the image flow**, **the tap + notice + office badge/list**). **Checkpoint B reached (reported, not stopped for — the owner's rule). Next: Task 20 (the car PDF blank). Do NOT stop unless a decision is needed.**
**Authority:** `openspec/tasks/TASK-004/task.md` (16→17 truths, 11 handover answers), `openspec/changes/truespec-architecture/{design.md (D15–D20), specs/*, tasks.md §1.6, §4.1, §4.5, §6.1–6.11}`, and the data layer's `openspec/tasks/TASK-003/key-and-hash-v1.md` (the change-check is the server's).
**Task list target:** this file's **Progress tracker** + Task list (Developer-workspace convention; no `tasks/todo.md` in this project).

---

## Overview

The office looks finished and saves nothing. This layer makes the office's door the identity provider's own sign-in and makes every screen behind it write to, and read from, the store. It also lands a **state-model change** (D15: four fixed primary states + the owner's secondary states), a **drafts** holding place for uploaded files (D16), the **tap** flow, **settings + a one-action ZIP export**, and the **resilience** half so a cold store never becomes an error page. The store is rebuilt (`drop → migrate → seed`) and the demonstration's figures may move; what must hold is that **office and showroom agree** and nothing else moves.

## Shared understanding — what this layer is, and what it is not

**Is:** the door and every write behind it; the state model; drafts; taps; settings + export; the retryable store read.
**Is not:** a redesign of the public boundary (D2's allow-list serializer stands); a change to the change-check (server-side, TASK-003's recipe); a new delete path (no job/clock removes anything); a mail channel; a Sanity Studio; per-width interaction polish, the retry state's *wording*, toast/confirm presentation (all TASK-005); the daily job itself (TASK-006).

## Architecture decisions (already ruled — recorded, not re-decided)

- **The door (D4, Q6, Q7):** Clerk carries the sign-in, invite-only mode, mounted at `/office/sign-in`; `/office` redirects there with no session. Owner installs/signs in the CLI; builder runs `clerk init --app app_3KfevzKd9JdCG86xfx301JYsTuU`, the config patch, `clerk doctor`, and wires the code. No password form, no credential material anywhere.
- **Our session (D4, D17):** one `session` row per provider session; valid iff `now < expires_at` (7 d) and idle ≤ 12 h, refreshed on a 5-minute cooldown; **lazy upsert** on the first authenticated office request, keyed by `clerk_session_id`; cookie `HttpOnly, SameSite=Lax, Secure`; server-side check on every office route; sign-out invalidates both.
- **Writes (D3):** every state change is a Server Action (POST, origin-checked); Route Handlers only for the tap, the export download and the file upload, each with an explicit origin check. No GET ever changes data.
- **State model (D15):** four fixed primaries — **Available, On Order, Landed, Sold** — exactly one per car, mandatory; the owner's **secondary** states (none or several) in a link table; `section` ≡ primary state; the showroom groups by primary and **never shows Sold**; a landed car stays under Available; the store's five states reshape (On the way / At port / Cleared → secondary; On Order + Sold → primary).
- **Drafts (D13, D16):** one new `draft` table; a file's values → one draft per record; images as an ordered list on the row; reviewed at `/office/drafts`; **nothing enters `car`/`enquiry` before a save**; `TS-####` and the change-check are given **at the save**; a draft sits in no state.
- **Money (D5):** integer kobo, one totals function, nothing stores totals; labels estimated/landed/total; projected/real profit.
- **Left alone (D20):** `activity_event` gains nothing (kind + car ref in `subject`); `auth_attempt` kept as-is (harmless no-op; the 90-day trim stays TASK-006's).
- **Resilience (D18):** one shared server-side guard around every store read + one retryable component + route error boundaries, on the office **and** the showroom.
- **Notices (D19):** both read from `setting` rows (`last_backup_at` written by TASK-006; a storage-warning figure, default 4 GB).
- **Export (truth 13):** one action → one **ZIP** = `master.json` (nested) + one **CSV per subject** + `README.txt`; office-only.
- **Confirmed:** photo size cap **15 MB**; WhatsApp number normalised to **`+234…`**; retention **12 months** (enquiry) / **6 years** (buyer); truth 5 corrected to "Sold is a primary state, and setting it is what performs the sale".

## Progress tracker

| # | Task | Status | Notes |
|---|------|--------|-------|
| — | Pre-flight: grilling (Rounds 1–2) + shared understanding | ✅ | Frontier empty; owner said **go**; answers in `task.md` (11 handover answers, D15–D20) |
| 1 | Workspace artefacts + green baseline | ✅ | brief + notes written; **5/5 gates green** (64/64 tests); baseline figures recorded (`runs/TASK-004-baseline-gates.txt`) |
| 2 | Current truth for the external surfaces + skill check | ✅ | Clerk loaded from official docs (CLI 3.4.1; **Next 15.5 → `middleware.ts`**); Sanity+Neon skills installed; **no skill** for PDF/ZIP/EXIF; ⚠️ Clerk skill + CLI sign-in need the owner |
| 3 | Clerk installed + wired (middleware, provider, invite-only, doctor) | ✅ | `@clerk/nextjs@7.9.15`; `middleware.ts` bare `clerkMiddleware()`; provider inside `<body>`; invite-only verified (`sign_up_mode=restricted`); `clerk doctor` pass; `lib/config.ts` reads `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. Evidence: `runs/TASK-004-clerk-init.txt` |
| 4 | Our `session` row (lazy upsert, cookie, 7 d / 12 h, `requireOfficeSession`) | ✅ | `lib/session-rules.ts` (pure: 7 d total, 12 h idle, 5 min cooldown) + `lib/session.ts` (lazy upsert keyed by `clerk_session_id`, `requireOfficeSession`, `endSession` revokes provider + row); **no app cookie** — Clerk's own session cookie is the only one (per D4/D17); `lib/session.test.ts` 7/7; store witness `scripts/task-004/session-row-check.ts` 10/10 |
| 5 | The door screens: `/office/sign-in`, `/office` redirect, real shell name | ✅ | Door at `/office/sign-in` (Clerk `<SignIn/>`, `app/office/door.css`); `requireOfficeSession()` in the shell layout **and** all 7 pages; shell shows `session.email`; sign-out = POST Server Action `signOutOffice` → client `sign-out` route clears the provider cookie; the fake `/office/login` and the root `/sign-in` + `/sign-up` removed (404); `.env.local` door path repointed |
| 6 | Server-side check on every office route + refusal proof | ✅ | `developer-workspace/scripts/task-004/refusal-proof.ts` **35/35 in dev and in production** — every office route 307s to the door, a forged cookie is refused, no shell markup or office data rides along, public routes stay open, removed routes 404 |
| A | **Owner checkpoint A — the door** | ⬜ | unauth refused on every office URL; sign-in/sign-out work; **stop and demonstrate**. Browser check run (the door, 8/8 cells, refusal walk 7/7) — `reports/TASK-004-browser-check.md`, harness `scripts/task-004/door-probe.mjs`; the one item left is the owner's **real sign-in** |
| 7 | Migration `0020` — the state model | ✅ | `migrations/0020_state_model_split.sql`: `kind` + backfill; `section` relaxed and re-checked (four values incl. `sold`); four primaries pinned by name+section (On Order sort 60 `#06b6d4`, Sold sort 70 `#475569`); `car_secondary_state` link table (car FK **CASCADE**, state FK RESTRICT); car backfill (secondary→On Order, old label kept as secondary); `car.state_id` NOT NULL; invariants + `refuse_primary_state_change()` trigger. **Proven** by `scripts/task-004/migration-0020-check.ts` 14/14 on the live store in a **rolled-back** transaction; then applied for real in the scratch rebuild |
| 8 | Shared rules + read layers move to primary/secondary | ✅ | `sections.ts` now four (`SECTIONS`) + `PUBLIC_SECTIONS` (three) + `SECTION_LABEL`/`SECTION_TOKEN` four (`sold:"s"`) + `presentedSections(sold)===[]`; `counts.ts` counts section `sold` OR the `sold` flag; `office.ts` excludes tombstones and reads **primary** states only (`kind='primary'`); `public-cars.ts` lists only `PUBLIC_SECTIONS`. Tests 86/86 (3 new). Gates green |
| 9 | Seed rewrite (D15 g) + rebuild reproduces the showroom | ✅ | `scripts/seed.ts`: each car now a `primary` (+ optional `secondary`); 7 Available, 6 On Order (3 On the way, 2 At port, 1 Cleared), 3 Landed, 1 Sold; one sale row. **Scratch rebuild**: drop → migrate (all 20) → seed; fingerprint run 1 == run 2 (seed idempotent); public inventory shows Available 10 · On Order 6 · Landed 3, 16 cars, no Sold |
| G2 | **Gate 2** — scratch rebuild + gates | ✅ | drop → migrate (20) → seed, twice (fingerprint identical); leak-check 18/18; typecheck clean; tests 86/86; build clean; store-freshness PASSED. No owner stop |
| 10 | Write foundation: Server Actions + validation + create car | ✅ | `lib/car-input.ts` (pure reader: required text, year bound, mileage, price/was-price/cost amounts through the one predicate, primary mandatory, returns every field error; `lib/car-input.test.ts` 9 tests → suite 95/95) + `lib/car-create.ts` (one idempotent CTE: car + cost lines + secondaries + `activity_event`; server-minted id so a retry converges on the same car) + `app/office/actions/car.ts` `createCar` (session check, registry checks, server-computed change-check). Witness `scripts/task-004/create-car-check.ts` **PASSED** (create + idempotent retry; private note + was-price + both notes stored; rolled back) |
| 11 | The car form wired to the store | ✅ | `car-client.tsx` is now a real `<form>`: every stored column carries its own `name` (`brand`…`arrivalNote`, `cost.<kind>`, `privateNote`, `wasPrice`, `stateId`, `secondaryStateIds`); **primary-state picker** from the registry (the four) + **secondary multi-picker**; the private-note textarea writes `private_note`; new **"was" price** field, validated at its own field (R-MON-10); add-mode Save → `createCar` (async transition), field errors + the new ref shown; cost figure named by state ("Estimated total cost" until landed, R-MON-7). Stale "not owned by the office data model" comment corrected. **Fixed `getOfficeSecondaryStates`** (it asked `sectionOfState` for a section a secondary cannot have by D15 → it threw on `/office/car` and `/office/car/new`). Gates green |
| 12 | Edit + ref immutability | ✅ | `lib/car-update.ts` (one idempotent CTE with a `changed` guard: hash + cost-line set + secondary set — a retry is a true no-op) + `lib/car-update.test.ts` (5 tests → 100/100) + `updateCar`; **per-car edit** at `/office/car/<ref>` (owner ruling 2026-10-15), bare `/office/car` → inventory; `getOfficeCarForEdit`; the form's hidden `carId`, and the public `note` carried as a hidden field so an edit cannot wipe it. Witness `scripts/task-004/update-car-check.ts` **22/22** (rolled back). Committed `1590efe` |
| 13 | Delete → tombstone → 8 s undo → owner's removal | ✅ | `lib/car-delete.ts` + `lib/car-delete.test.ts` (6 tests → 106/106); `deleteCar`/`undoDeleteCar`/`removeCarForever`; the inventory delete modal + undo toast wired to the real writes (the undo offer = the 8-second window); **"Waiting to be cleared"** list (new `tombstones.tsx`) with the owner's Remove for good; `getTombstonedCars()`; removal refuses a non-tombstone and cascades photos/costs/sale, clearing the assets best-effort and reporting any that will not go. Witness `scripts/task-004/delete-car-check.ts` **33/33** (rolled back). Note: `notes/TASK-004-task13.md` |
| 14 | Sold / un-mark | ✅ | **Truth 5 built**: Sold is a primary state, and setting it is what performs the sale. Migration `migrations/0021_sale_prior_state.sql` adds `sale.prior_state_id` (backfilled to the Landed primary, then `NOT NULL`) — the state a car sold from is a **stored fact**, not a guess, and it is as long-lived as the sale row. `carUpdateStatement` carries the sale inside the one atomic write: marking upserts the `sale` row taking `prior_state_id` from the car's **own pre-write row** (`old.state_id`, never the browser), a correction preserves it (`ON CONFLICT (car_id) DO UPDATE` touches price + date only), and leaving Sold **deletes** the row. The sale joins the `changed` guard, so a price-only correction is a real write and a retry is still a true no-op; the event names the transition (`car.sold` / `car.unsold`, else `car.updated`). `lib/car-input.ts` reads `salePrice`/`saleDate` (both-or-neither; the day stored at **noon UTC**); `readCarForm` **requires** the pair when the chosen primary's section is `sold` and **drops** it otherwise — the invariant "Sold ⟺ one sale row" — through the rewritten `lib/sale.ts` (`saleForState`; R-SLD-1 restated for D15, its old "sold is never a state" rule deleted). The form shows the sale fields when Sold is picked; a sold car names its prior state and offers **"Move it back"**. Office reads `sale`/`prior_state_id`/prior label for edit; sold-ness in `toOverviewCar` now comes from the **section**, not the sale row (D15). **Owner ruling (2026-10-15):** a car cannot be *created* Sold — "add it, then mark it sold": un-marking must return it to a state it held, and a car that never held one has nothing to return to, so add mode offers the three. Tests 114/114; witness `developer-workspace/scripts/task-004/sold-car-check.ts` **25/25** (rolled back). Note: `notes/TASK-004-task14.md` |
| 15 | Car state editor → registry (secondary only) | ✅ | **Truth 10 built, the car half**: the settings state editor now *is* the store's `car_state` registry — read through `getCarStateRegistry()` (the four fixed primaries first, then the owner's own states, each with the store's own car count) and written through `app/office/actions/state.ts`. **The four primaries are out of reach**: every statement in `lib/car-state.ts` carries `kind = 'secondary'` in its *own* `WHERE` — add, rename, recolour, reorder, remove — so no shape of request can name one, with the store's `car_state_primaries_are_final` trigger behind it; the editor draws them as locked rows. A secondary carries **no section and no new-arrival flag**: the statements have no argument for either and the store's `car_state_kind_section_ck` / `car_state_kind_new_arrival_ck` refuse one that arrives any other way. **The store is the guard, not the screen**: a delete is always offered and always attempted, refused there by the `ON DELETE RESTRICT` foreign keys (SQLSTATE **23001**), and the reason shown carries the store's own count (`carStateHoldersStatement`, asked only after it refuses) — nothing moves a car out of a state on the owner's behalf. A name another state carries is refused by `car_state_label_unique` (**23505**) across **both** kinds. Retry-safe (D18): the add's key is minted once, outside (`ON CONFLICT (id) DO NOTHING` + a trailing `UNION ALL`); rename, recolour and reorder set a value a repeat sets identically (`IS DISTINCT FROM`), the whole order written at once from the list (`jsonb_array_elements_text … WITH ORDINALITY`) so it needs no distinct existing sorts and survives a drag to any position; the remove's *effect* is idempotent. The pre-D15 car-editor seeds (`state-seeds.ts` `CAR_STATES`) and its dead CSS (`.edtbl-car`, `.edsection`, `.edswitch`/`.edtrack`/`.edknob`, `.edh-tab`) are **deleted**, not left as a second, staler answer; the enquiry seeds stay (Task 16). Tests **121/121**; witness `developer-workspace/scripts/task-004/state-registry-check.ts` **31/31** (rolled back). Note: `notes/TASK-004-task15.md` |
| 16 | Enquiry editor + board + activity from real rows | ✅ | **Truth 10's enquiry half, truth 15 and truth 13 built; no seed remains.** The board (`enquiries/page.tsx`) reads `getEnquiries()` (`enquiry` rows, newest first) and draws them grouped in **`getEnquiryStateRegistry()`'s order** — labels, **no progression implied**; a row with no state gets a group of its own rather than an invented one; a card's one write is *give this enquiry a state* (`app/office/actions/enquiry.ts` `setEnquiryState`), and the board itself has **no write path at all** (no card-move), so the crafted "move a card" shape changes nothing. The registry is `enquiry_state` and every row is the owner's — **there is no `kind` column and no primary/secondary split**, so the states the store ships with are added-to, renamed, recoloured, reordered and removed exactly like any other (truth 13 in code); the editor is the shared `settings/registry-editor.tsx`, the same component the car registry uses, with the car adapter passing `locked` for its four primaries and this adapter passing none. **The store is the guard**: deleting a state an enquiry sits in is refused by `ON DELETE RESTRICT` (SQLSTATE **23001**; the action catches 23001 **and** 23503) and the reason carries the store's own count, asked only after the refusal (`enquiryStateHoldersStatement`) — nothing moves an enquiry out of a state on his behalf; a name another state carries is `23505`. Setting a state recomputes the hash **from the row's stored values** with the new state in place (truth 14) and is gated on `enquiry_state_id IS DISTINCT FROM $2`, so a retry is a true no-op. The activity screen reads `getOfficeActivity()` — real `activity_event` rows, D20's `kind` + `subject` shape, newest first, **bounded to 200**, day/time formatted UTC server-side (`lib/office-time.ts`), rendered as JSX with unknown kinds shown as `kind — subject` under a new neutral `.tag.other`. The pre-D15 enquiry seeds (`state-seeds.ts`, `state-editors.tsx`) and the board's import modal + 7-row demo preview (Task 23's) and the hardcoded "4 taps today" line (Task 19's) are **deleted**, not left as a second, staler answer. An enquiry's state change writes **no** `activity_event` (its only subject is customer PII, which must not outlive the enquiry row). Tests **138/138**; witness `developer-workspace/scripts/task-004/enquiry-registry-check.ts` **42/42** (rolled back, the real read functions included). Note: `notes/TASK-004-task16.md` |
| 17 | Dashboard feed panels real; seed files retired | ✅ | **Both feed panels read real rows and the fabricated cell is gone.** The dashboard reads `getOfficeDashboard()` (the one shared counting rule), `getOfficeActivity()` (Task 16's read, reused not copied) and a new `getOfficeTaps()` — newest first, bounded to `TAP_LIMIT = 200`, with the car's **own name resolved by the ref** (`LEFT JOIN car ON c.ref = t.car_ref`), so a tap on a removed car keeps its `TS-####` and reads no name rather than the wrong one, and a general tap (`car_ref` null) has neither. The panels word and time their rows by one shared rule — `lib/activity-feed.ts`, which the log screen now imports too, so the log and the dashboard cannot word the same row two ways (a kind this build does not name reads as itself, never as a blank); the stock counts stay the three `countStock` gives (Available / On Order / Landed this year), with Sold where the spec puts it, on the profit card. **The hardcoded "5 open enquiries" is gone and nothing enquiry-shaped replaced it** — that is on the record already: *"no 'open enquiries' total"* (`design-workspace/decisions/ux-implementation-plan.md:48`), and truth 13/D12 make "open" a stage claim the store does not hold. An empty feed now **says it is empty** instead of standing in as real-looking rows (truth 16). The dead `Show older entries` / `Show all taps` buttons are gone (the taps list is Task 19's); the stale "panels stay presentational" comment is corrected (divergence 4); the fabricated header date and the fabricated "arriving Nov – Jan" sub-line are now real. `activity/page.tsx` + `activity-client.tsx` import the shared wording rule; `office.css` gains `.tag.del`, `.tag.other` and `.feed-empty`. Tests **144/144** (6 new); witness `developer-workspace/scripts/task-004/dashboard-feeds-check.ts` **19/19** (writes and removes exactly its own rows, then checks the store is back to 0/0). Note: `notes/TASK-004-task17.md` |
| B | **Owner checkpoint B — the car's life + registries live** | ✅ | **reported, not stopped for (the owner's rule)** — `reports/TASK-004-checkpoint-b.md`. Tasks 10–18 built: make / edit / change-check / delete+tombstone+undo / sold+un-mark / the state-registry editor / the enquiry board + activity / the dashboard's real feeds / the image flow. Five gates green, 161/161 tests, a rolled-back witness per write. **Outstanding for the owner's eyes (not a decision): no office screen has been driven in a browser by the developer — every office route is Clerk-gated and the owner's session is the only way in.** |
| 18 | Images: upload-first/save-second, EXIF, 15 MB, cover/reorder, placeholder | ✅ | **The bytes go to the store first and the row links after, in one write, with the reference column holding a reference and never an address.** The rules that do not touch bytes live in `lib/photo-rules.ts` (the 15 MB cap, the three types, `isAssetRef`); the byte boundary in `lib/photos.ts` (`preparePhoto` → `stripJpeg`/`stripPng`/`stripWebp`, which drop Exif/XMP without re-encoding). `app/office/actions/photo.ts` (`uploadCarPhoto`) writes **no row and names no car** — an upload dropped before save is an orphan, which is `lib/cleanup.ts`'s job (no third `deleteAsset` caller). `lib/car-create.ts` numbers the incoming list `WITH ORDINALITY` (position 0 = cover, every new photo an `owner upload`); `lib/car-update.ts` reads the stored set as ordered `[reference, origin]` pairs, **keeps the source a photo already had** (only a photo the car did not have becomes `owner upload`), and replaces the set disjointly (upsert on `(car_id, position)`, delete `position >= count`) with the set **in its order** in the `changed` guard — so a reorder is a real write and a retry is still a true no-op. `photos` is **required** on both arguments, so the compiler named all six call sites. The action verifies each posted reference with `findImageAsset` (missing → an actionable refusal; unreachable → a retry-worded one) and photos stay optional on save (task.md:245 — no photo means a draft). One shared client component `components/Photo.tsx` now draws every car photo on both the showroom and the office, falling back to a drawn inline-SVG stand-in when the address is empty or the load fails, and staying an `<img>` so no layout moved; `next.config.mjs` raises `experimental.serverActions.bodySizeLimit` to `"16mb"` (Next's 1 MB default could never have carried a 15 MB photo). Tests **161/161**; witness `developer-workspace/scripts/task-004/photo-write-check.ts` **20/20** (a real sharp-built JPEG carrying EXIF, stripped and uploaded and measured back to `784 = 784` bytes, then deleted; the rows half in a rolled-back transaction incl. origin survival, reorder, deletion and the retry no-op); browser `photo-placeholder-check.mjs` **6/6** over three runs, attach-only on `:9222` (6 → 6, no Chrome launched). Note: `notes/TASK-004-task18.md` |
| 19 | The tap + notice + office badge/list | ✅ | **A tap is three facts and no person — the page, the car's code and the store's own time — and the buyer is told so before it happens.** `lib/tap-rules.ts` is the allowlist (`readTap` reads exactly `page` and `carRef` and ignores every other key) and the only place that knows a car page's path (`carRefInPath`); `lib/origin-rules.ts` is the one same-origin rule — a CSRF guard, **not** authentication, and it trusts `Host` only (`x-forwarded-host` is deliberately not consulted: a caller can set it too). `lib/tap.ts` inserts two columns and never `at`, so the clock is the store's. The write goes through a new `storeQueryOnce` in `lib/store-guard.ts` — **the one store call deliberately not retried**, because a tap is an event and not a state: a retry after a lost reply would count one tap twice, and `testing.md` §9 fails a figure that counts taps the office never received. `app/api/tap/route.ts` exports **POST and nothing else** (405 to everything else, so "no GET changes data" holds by construction), checks the origin **before** reading the body, and answers 403 / 422 / 503 / 204. The buyer's side is `components/site/WhatsAppGate.tsx`, mounted in the site layout: **one document listener catches every `wa.me` link on the showroom** — header, footer, floating button, each car's button, the mobile bar, including the ones built as markup by client behaviours — shows the short notice (three facts + a link to `/privacy` + Continue / Cancel) on the first plain tap, records nothing until the buyer continues, and never blocks them on our bookkeeping (fire-and-forget `keepalive`; Ctrl/Cmd-click before the notice is left alone rather than hijacked). The office's figure is `getOfficeTapCount()` = `count(*) FROM tap` — no window, no "seen" mark (the store has none, and a GET cannot make one) — drawn by `components/office/TapBadge.tsx` on the sidebar's **Dashboard** item, hidden at zero; the mobile bar carries none (a third grid child would grow the fixed bar over the page bottom) — one line to reverse. `/privacy` corrected under the owner's ruling in **four** places (three asked about, plus the "short version" at the top that claimed only browser settings are stored); its "Last updated" date left alone as the owner's. Witnesses: `tap-check.ts` **24/24** (live store, own rows removed — three facts only, store clock, the figure equal to the table, 403 bootleg, 204 same-origin, extras dropped, no GET), `whatsapp-gate-check.mjs` **20/20** attach-only on `:9222`, `tap-badge-check.ts` **9/9**. Tests **187/187**. Five gates green. Note: `notes/TASK-004-task19.md` |
| 20 | The car PDF blank + serving it at the upload point | ⬜ | the 14 editable details |
| 21 | Migration `0022` — the draft table | ⬜ | D16 columns; no second table. (`0021` was taken by task 14 — `sale.prior_state_id`) |
| 22 | Car file → drafts (read, refuse, held file) | ⬜ | one draft per car; nothing in `car` |
| 23 | Enquiry file → drafts | ⬜ | five fields; PDF held, linked, deletable |
| 24 | `/office/drafts` review + save + images by hand + delete | ⬜ | save gives `TS-####` + change-check + state; brothers untouched |
| 25 | Demo marker + wipe cover drafts | ⬜ | every row this layer writes carries `is_demo` |
| 26 | Settings save (WhatsApp normalised, tagline, full-tank) | ⬜ | inline validation; previous number stays active |
| 27 | Password delegated + operational notices | ⬜ | `last_backup_at` + 4 GB threshold read from `setting` |
| 28 | The export (one action → ZIP) | ⬜ | `master.json` + one CSV per subject + `README.txt`; office-only |
| 29 | The shared store guard + retryable state + error boundaries | ⬜ | office **and** showroom; never a 500 |
| C | **Owner checkpoint C — final** | ⬜ | **stop and demonstrate**; owner redirects before TASK-005 |
| 30 | Refusals witness | ⬜ | ten refusals, each asked/returned |
| 31 | Flows witness (browser, before/after) | ⬜ | the standing browser-check procedure |
| 32 | Store state + demo marker + wipe dry run + export opened | ⬜ | office ↔ showroom agreement checked, not claimed |
| 33 | Gates + reconcile + report + copies + tracker closed | ⬜ | leak-check → typecheck → test → build → store-freshness |

Legend: ⬜ not started · ⏳ in progress · ✅ done · ⛔ blocked. **Owner checkpoints A, B, C are the only points the build stops for the owner** (task.md §Process); every other phase ends at an internal *gate* that does not stop the owner.

---

## Task list

### Phase 0 — Groundwork and baseline

**Task 1 — Workspace artefacts + green baseline** (S)
- **AC:** `briefs/TASK-004-brief.md` and `notes/TASK-004-state.md` written (what was asked; current store/seed/read-layer state). The four gates run on the **untouched** tree and recorded with their numbers, plus the demo baseline (17 cars · 49 photos · 99 cost lines · 1 sale · 6 enquiries · 1 PDF).
- **Verify:** `npm run leak-check` · `npm run typecheck` · `npm test` · `npm run build` · `npm run store-freshness` — all green; figures written down.
- **Deps:** none. **Files:** `developer-workspace/briefs/`, `developer-workspace/notes/` (~3).

**Task 2 — Current truth for the external surfaces + skill check** (S)
- **AC:** For Clerk, Sanity, and the PDF/ZIP/EXIF toolchain, the *current* material is loaded (installed skill, official docs) and the chosen libraries/CLI forms written to notes with citations. **If a skill exists for any of them and is not installed, the owner is told and asked before installing** (skill rule). No code written from memory.
- **Verify:** notes cite the docs/skill versions read; the ask-and-wait is recorded.
- **Deps:** 1. **Files:** `developer-workspace/notes/` (~2).

> **Gate 0** — brief, notes, baseline and truth loaded. No owner stop.

### Phase 1 — The door (build step 1)

**Task 3 — Clerk installed + wired** (M)
- **AC:** `@clerk/nextjs` installed; middleware/proxy with the matcher including `/__clerk/:path*` after `/(api|trpc)(.*)`; `ClerkProvider` inside `<body>` (never around `<html>`); `auth()` awaited (Next 15); the application verified **invite-only**; `clerk doctor` clean. **Owner's keys never printed, never committed.**
- **Verify:** `npx clerk doctor`; a dev build renders; `clerk init` output recorded; keys absent from any log/diff.
- **Deps:** 2. **Files:** `package.json`, `middleware.ts`, `app/layout.tsx`, `lib/config.ts` (M).

**Task 4 — Our own `session` row** (M)
- **AC:** `lib/session.ts` upserts one row on the first authenticated office request, keyed by `clerk_session_id`; validity `now < expires_at` (7 d) **and** idle ≤ 12 h; `last_seen_at` refreshed on a 5-minute cooldown; cookie `HttpOnly, SameSite=Lax, Secure`; `requireOfficeSession()` throws/redirects otherwise; sign-out invalidates our row **and** the Clerk session. Unit tests pin the two limits and the cooldown.
- **Verify:** `npm test` (new session tests); a manual request with no/expired/idle session is refused.
- **Deps:** 3. **Files:** `lib/session.ts`, `lib/session.test.ts` (~3).

**Task 5 — The door screens** (M)
- **AC:** `/office/sign-in` mounts the provider's own `<SignIn/>` inside the office shell; `/office` redirects there with no session; all office routes behind the check; the shell's name comes from the signed-in row (the hardcoded "Signed in as Umar" is gone).
- **Verify:** a browser visit to `/office` with no session lands on `/office/sign-in`; after sign-in the real email shows; sign-out returns to the door.
- **Deps:** 3, 4. **Files:** `app/office/sign-in/page.tsx`, `app/office/(shell)/layout.tsx`, `app/office/layout.tsx` (~3).

**Task 6 — Every office route refused without a session + proof** (S)
- **AC:** a script proves every office URL returns no page and no data without a session (and after a sign-out, a previously-open tab is refused). The four-gate run stays green.
- **Verify:** `developer-workspace/scripts/task-004/office-refusal.mjs` (or equivalent) → all refused; gates green.
- **Deps:** 5. **Files:** `developer-workspace/scripts/task-004/` (~2).

> ### ⛔ Owner checkpoint A — the door. Unauthenticated office refused; sign-in/sign-out work; shell name real; gates green. **Stop and demonstrate.** (Nothing is safe while the office is open to anyone.)

### Phase 2 — The state model (build step 2)

**Task 7 — Migration `0020`: the state model** (M)
- **AC:** `car_state` distinguishes `kind` (primary | secondary); the four primaries are pinned (not addable/renamable/deletable); `car.state_id` becomes **NOT NULL**; `car_secondary_state(car_id, state_id)` holds the many-to-many; On the way / At port / Cleared become secondary; **On Order** and **Sold** added as primary; `section` is a primary-only property (≡ the primary state); a secondary needs no section and no new-arrival flag; two states never share a name across both kinds; deletion refused while a car sits in the state. Forward-only; a scratch `drop → migrate → seed` proves the chain.
- **Verify:** scratch rebuild; the store's constraints refuse a fifth primary, a duplicate name, and the deletion of an occupied state (SQLSTATE + constraint named).
- **Deps:** A. **Files:** `migrations/0020_*.sql` (~1).

**Task 8 — Shared rules + read layers move to primary/secondary** (M)
- **AC:** `lib/sections.ts` treats *section* and *primary state* as one (grouping + helpers); `lib/counts.ts` counts by primary state (Available = Available + Landed-new-arrival; Sold outside stock); `lib/office.ts` reads the primary state and **excludes tombstones** (`deleted_at IS NULL`) where it must; `lib/public-cars.ts` shows only the three public groups and never Sold. Tests pin the shape and the counting rule.
- **Verify:** `npm test` (updated/added); a tombstoned car is absent from office counts; Sold is absent from every public response.
- **Deps:** 7. **Files:** `lib/sections.ts`, `lib/counts.ts`, `lib/office.ts`, `lib/public-cars.ts` + tests (~5).

**Task 9 — Seed rewrite (D15 g) + rebuild** (M)
- **AC:** the seed writes the four primaries + the owner's secondaries and maps the demo fleet exactly as ruled: Available→Available; On the way/At port/Cleared→**On Order** with the old label kept as a **secondary**; Landed→Landed; **at least one car Sold** and **at least one carrying a secondary**, so both new behaviours are visible. The showroom's three groups look as they do now. `drop → migrate → seed` reproduces the fleet; running the seed twice moves nothing.
- **Verify:** scratch rebuild twice (second run moves nothing); the showroom group membership matches the pre-change baseline.
- **Deps:** 7, 8. **Files:** `scripts/seed.ts`, demo data files (+ `scripts/seed-content`) (~3–5).

> **Gate 2** — scratch rebuild identical twice; gates green. No owner stop.

### Phase 3 — The car's life (build step 3)

**Task 10 — Write foundation + create a car** (M)
- **AC:** a Server Action creates a car from the form: all fourteen editable columns, **exactly one primary state** and any number of secondary states, the `TS-####` given by the store, the `content_hash`/`hash_version` **computed by the server** (a browser-supplied hash is ignored); a malformed amount is refused at the field; a missing primary state is refused. `activity_event` written with `kind` + the car's ref.
- **Verify:** `npm test` (action tests); a create through the UI writes exactly one car + its cost lines; the ref is present and stable.
- **Deps:** 9. **Files:** `app/office/actions/car.ts`, `lib/car-input.ts`, tests (~4).

**Task 11 — The car form wired to the store** (M)
- **AC:** the form offers every column it owns — including the **private note** and the crossed-out **"was" price** it does not yet offer — plus a **primary-state** picker and a **secondary-state** multi-picker; the profit figure updates as the owner types and is labelled **"estimated"** until landed; a malformed amount cannot save and is caught at the field; the stale "not owned by the office data model" comment is corrected.
- **Verify:** a browser/route check creates and re-reads a car with a private note and a was-price; the live label reads "estimated" pre-landing.
- **Deps:** 10. **Files:** `app/office/(shell)/car/*`, `components/` (~4–5).

**Task 12 — Edit + ref immutability** (M)
- **AC:** every editable column can be changed; `content_hash` is recomputed on each write; `car.id`/`car.ref` cannot change (the store's trigger refuses it) and the write path never attempts it.
- **Verify:** an edit changes values and the hash; a hand-crafted identity change is refused by the store; `npm test` green.
- **Deps:** 11. **Files:** `app/office/actions/car.ts`, car client, tests (~3).

**Task 13 — Delete → tombstone → undo → the owner's removal** (M)
- **AC:** delete asks for confirmation and offers **undo within 8 seconds** (byte-for-byte restore with photos/costs/state); after the window it is a tombstone **hidden from every office read** and listed as **waiting to be cleared**; the owner's permanent removal cascades photos/costs/sale and clears the stored assets, leaving no orphan; **no job/rule/clock removes anything**.
- **Verify:** proof script: delete → undo restores; delete → the car is absent from every office read and present in the "waiting" list; permanent removal leaves no orphan rows/assets.
- **Deps:** 12. **Files:** `app/office/actions/car.ts`, `lib/office.ts`, `lib/cleanup.ts`, inventory client (~5).

**Task 14 — Sold / un-mark** (M)
- **AC:** marking sold sets the **Sold primary state** and writes the sale row (price, date); the car leaves the showroom entirely, sits in Sold/Archive, stays in lifetime totals and out of stock counts, and profit moves projected → real; un-marking reverses/voids the sale, returns the car to its **previous primary** state (logged), keeps its secondary states, and leaves no real-profit residue.
- **Verify:** proof script: sold → absent from showroom/stock, present in lifetime; un-mark → showroom/stock restored, no residue; `npm test`.
- **Deps:** 13. **Files:** `app/office/actions/car.ts`, `lib/money.ts` (use), inventory client, tests (~4).

> **Gate 3** — car lifecycle proof green; gates green. No owner stop.

### Phase 4 — The registries, live (build step 4)

**Task 15 — Car state editor writes the registry (secondary only)** (M)
- **AC:** the editor adds/renames/reorders/recolours **secondary** states only; the four primaries are not addable, renamable or deletable; deletion of an occupied state is **refused by the store**, with the reason shown; a secondary needs no section and carries no new-arrival flag; two states never share a name across both kinds.
- **Verify:** proof script hits each refusal; the editor round-trips a real registry.
- **Deps:** 9. **Files:** `app/office/actions/state.ts`, `settings/state-editors.tsx`, `state-seeds.ts` (retire) (~4).
- **Built (2026-10-15):** `lib/car-state.ts` (the statements + the `RegistryState` row shape), `lib/car-state.test.ts`, `app/office/actions/state.ts` (five actions), `app/office/(shell)/settings/car-state-editor.tsx` (the store-backed editor — primaries locked, secondaries editable), `getCarStateRegistry()` in `lib/office.ts`, and wires in `settings/page.tsx` / `settings-client.tsx`. `state-editors.tsx` keeps only the enquiry side and `state-seeds.ts` only its seeds (both Task 16's). **`state-seeds.ts` retired its car half; the enquiry half stays until Task 16.** Store finding: `ON DELETE RESTRICT` reports **23001**, not 23503 — the action catches both.

**Task 16 — Enquiry editor + board + activity from real rows** (M)
- **AC:** the enquiry-state editor adds/renames/reorders/deletes (deletion refused while occupied); the board reads `enquiry` + `enquiry_state` and groups in the **registry's order** — a display of labels, **no progression implied**; the activity log reads `activity_event`. No seed remains.
- **Verify:** proof: add a state → it appears with no code change; the board shows store rows; a crafted "move a card" shape changes nothing.
- **Deps:** 15. **Files:** `app/office/actions/enquiry.ts`, `enquiries/*`, `activity/*` (~5).
- **Built (2026-10-15):** `lib/enquiry-state.ts` + `lib/enquiry-state.test.ts` (six statements: add, rename, recolour, reorder, remove, holders), `lib/enquiry-set-state.ts` + `lib/enquiry-set-state.test.ts` (`enquiryEditableStatement`, `enquirySetStateStatement`), `lib/edit-result.ts` (the shared `EditResult`; `actions/state.ts`'s `StateEditResult` is now an alias), `app/office/actions/enquiry.ts` (five registry actions + `setEnquiryState`), `app/office/(shell)/settings/registry-editor.tsx` (the shared editor both registries now use — cell edit on blur/Enter, arrow-key reorder, remove), `settings/car-state-editor.tsx` (now a thin adapter that passes `locked`), `enquiry-state-editor.tsx`, `lib/office-time.ts` + test (UTC day/time), and `getEnquiryStateRegistry()` / `getEnquiries()` / `getOfficeActivity()` (+ `OfficeEnquiry`, `OfficeActivityEvent`, `ACTIVITY_LIMIT = 200`) in `lib/office.ts`. Screens: `settings/page.tsx` + `settings-client.tsx` (both registries), `enquiries/page.tsx` + `enquiries-client.tsx` (the board — grouped in registry order, a card's state picker, everything else read-only), `activity/page.tsx` + `activity-client.tsx` (real rows, JSX, unknown kinds as `kind — subject`). Deleted: `settings/state-seeds.ts`, `settings/state-editors.tsx`, the board's import modal + demo preview, the "4 taps today" line, and the dead CSS around them. **The number beside a state is the store's own count, not the screen's.** Store finding: `enquiry_state` has no `kind` column — there is no primary/secondary split to guard, so the reorder writes every row.

**Task 17 — Dashboard feed panels real; seeds retired** (S)
- **AC:** the dashboard's taps and activity panels read real rows; the hardcoded "5 open enquiries" and the inline feed JSX are gone; the figures come from the one shared rule.
- **Verify:** with real rows present the panels show them; `state-seeds.ts` is no longer imported anywhere.
- **Deps:** 16. **Files:** `app/office/(shell)/page.tsx`, `settings/state-seeds.ts` (~2–3).
- **Built (2026-10-15):** `lib/activity-feed.ts` + `lib/activity-feed.test.ts` (6 tests — the one wording rule: `ACTIONS`/`CATEGORIES`/`categoryOf`/`wordOf`/`categoryLabel`/`operator`/`toActivityEntries`, moved out of the client-only log so a server component can use it too), `getOfficeTaps()` + `OfficeTap` + `TAP_LIMIT` in `lib/office.ts`, and the dashboard rewritten around `Promise.all([getOfficeDashboard(), getOfficeActivity(), getOfficeTaps()])`. `activity/page.tsx` + `activity-client.tsx` now import the shared rule. `office.css` gains `.tag.del`, `.tag.other`, `.feed-empty`. **The stores are read, not drafted:** a panel with nothing in it says so. Witness `developer-workspace/scripts/task-004/dashboard-feeds-check.ts` 19/19 — it writes a few tap/activity rows, proves the reads with them, and removes exactly those (back to 0/0), because the reads take their own HTTP connection and cannot see a `pg` transaction. Finding: **an empty store's read cannot be proved from inside a transaction** — the one place the roll-back witness pattern does not apply.

> ### ⛔ Owner checkpoint B — the car's life + both registries live. **Stop and demonstrate** (the biggest slice). Owner may redirect before images/taps/uploads.

### Phase 5 — Images (build step 5)

**Task 18 — The image flow** (M)
- **AC:** assets upload to Sanity **before** any row is saved; rows link on save; cover = position 0 with reorder/set-cover; `origin` records `owner upload`; a **15 MB** cap refuses an oversized original; **EXIF is stripped at the write boundary**; the asset-reference column never holds a URL; a missing asset or an unreachable store renders the **placeholder**, not a broken page.
- **Verify:** proof script: upload → bytes first, row second; the exact stored bytes carry no EXIF; an oversized file is refused; a missing asset renders the placeholder; `npm test`.
- **Deps:** B. **Files:** `lib/sanity.ts`, `lib/photos.ts`, `app/office/actions/photo.ts`, car client (~5).

### Phase 6 — Taps (build step 6)

**Task 19 — the tap + notice + office badge/list** (M) — **BUILT 2026-10-15; one ruling taken**

*The owner's ruling (asked and answered 2026-10-15):*
- **The notice is the short form**: the three facts in plain words, a link to the full notice, Continue /
  Cancel. Not the whole privacy page inside a dialog.
- **`/privacy` is corrected in the same change** — and in **four** places, not the three I asked about:
  `#collect` gains the tap, `#whatsapp` says the tap is recorded before you leave, `#retention`'s "We
  don't store browsing data on our end" becomes "We store no browsing data beyond that tap record", and
  the **"The short version"** paragraph at the top — which also claimed the only things stored were
  browser settings, and would have been left false. The **"Last updated: 4 October 2026"** line was left
  alone: that date is the owner's, not mine.
- The notice's sentence is the owner's, with one parenthesis added so it stays **true** on the footer and
  home links, where no car is involved: "the car's code **(when you tap on a car)**".

*Settled from the authority, no ruling needed:*
- **The badge's figure is every tap the store holds.** `testing.md` §9 is explicit about what fails:
  "the figure counting taps the office never received, or **missing the ones it did**". So a window
  (e.g. "today") would fail the second half, and a `seen` mark would need state the store does not have
  (and the dashboard cannot mark taps seen on load — no GET changes data, task.md:253). The figure is
  `count(*) FROM tap`.
- **Placement: the sidebar's Dashboard item**, hidden at zero — the entry that leads to the recent-taps
  list it announces (Q77 put the alert "in the sidebar"). The **mobile bottom bar carries no badge**: it
  is a fixed 5-cell grid, a third child would grow the bar over the bottom of every page, and the count
  is already one tap away on the Home panel. One line to reverse if the owner wants it there.
- **The record is a POST Route Handler with an explicit origin check** (`app/api/tap/route.ts`), because
  the tap must work for a visitor who holds no session. `origin-rules.ts` holds the one same-origin rule.
- **The write is not retried.** It is the first genuinely non-idempotent write in this layer: a tap is an
  event, not a state, so a retry after a lost reply would count one tap twice. Record once; if the store
  refuses, the buyer still reaches WhatsApp and one tap is lost — the figure stays honest about what the
  office actually received.
- **Every WhatsApp link on the showroom goes through the notice**, not just a car's button: one listener
  on the document (`components/site/WhatsAppGate.tsx`, mounted in the site layout) covers the header,
  the footer, the floating button, each car's button and the mobile bar — including the ones built as
  markup by client behaviours. A new WhatsApp button is behind the notice the day it is written.
  The notice is shown **once per page load** (client-side navigation keeps the layout, so it is not
  shown again within a visit); a modified click before the notice has been shown is left alone rather
  than hijacked.
- **AC:** the WhatsApp entry shows the privacy notice **before** the tap; a Route Handler records **page + car ref + time only** (explicit origin check) and the buyer then continues to WhatsApp; the office shows a count badge and a recent list (never a popup/alert/sound).
- **Verify:** proof: a tap writes exactly three facts (and nothing personal); a bootleg POST without origin is refused; the badge/list update on refresh.
- **Deps:** B. **Files:** `app/api/tap/route.ts`, `components/site/*`, dashboard panel (~4).

*Built:* `lib/origin-rules.ts`, `lib/tap-rules.ts` (+ two test files), `lib/tap.ts`,
`storeQueryOnce` in `lib/store-guard.ts`, `app/api/tap/route.ts`, `getOfficeTapCount` in `lib/office.ts`,
`components/office/TapBadge.tsx`, `OfficeNav` + the shell layout, `components/site/WhatsAppGate.tsx`
(+ its CSS in `app/globals.css`, mounted in the site layout), `/privacy` (four places).

*Verified:* `tap-check.ts` **24/24** (live store, own rows removed) — three facts only, the store's own
clock, the figure equal to the table, 403 without an origin, 204 with one, extras dropped, no GET
exported. `whatsapp-gate-check.mjs` **20/20** in the real browser — the notice before the tap, nothing
recorded until Continue, the row's page + car code, no second notice, a general tap on the home page.
`tap-badge-check.ts` **9/9** — nothing at zero, the count and its label, `99+`, the office's own colours.
Both new rule modules are unit-tested (**187/187** in total). Five gates green in the learned order:
`leak-check` **PASSED** (dev live), `typecheck` clean, `test` 187/187, `build` green (`/api/tap` a
dynamic route), `store-freshness` **PASSED**.

*Not verified:* the office shell as a **rendered screen** — the office is behind Clerk and the developer
holds no office session, so the badge in the sidebar was proved as a component (`tap-badge-check.ts`)
and by typecheck, not by looking at it. Same gap as Checkpoint B.

### Phase 7 — Uploads and the template (build step 7)

**Task 20 — The car PDF blank, served at the upload point** (M)
- **AC:** the car's template is a PDF carrying its **fourteen editable details** and nothing else, downloadable at the upload point; the enquiry's five-field file needs no made-up form.
- **Verify:** the blank downloads and opens; its fields are exactly the fourteen in `lib/change-check.ts`'s car recipe.
- **Deps:** B. **Files:** `app/api/template/route.ts` (or static asset), `lib/template.ts` (~2–3).

**Task 21 — Migration `0022`: the draft table** (S)
- **AC:** one table per D16: `id`, `kind` (`car`|`enquiry`), `batch_id`, `source_filename`, `source_asset_id`, `values` jsonb, `image_asset_ids` (ordered), `state_label` (a **name**, nullable), `is_demo`, timestamps. No second table.
- **Verify:** scratch rebuild; a draft row round-trips; no `car`/`enquiry` row is created by holding a draft.
- **Deps:** 20. **Files:** `migrations/0022_*.sql` (~1). **Note:** the number moved from `0021` because task 14's `sale.prior_state_id` migration landed first.

**Task 22 — A car file becomes drafts** (M)
- **AC:** an uploaded car PDF is read into **one draft per car** (a batch shares `batch_id`); nothing enters `car`; a row that cannot be read is **explained and named**, never silently dropped; a file that is not the expected format is refused with a reason the owner can act on; the uploaded file is held in Sanity under a **randomised filename** with its reference only in the database and in no public payload.
- **Verify:** proof: a 10-car file → 10 drafts, 0 cars, the next `TS-####` untouched; a bad file refused; the held filename is randomised and absent from public responses.
- **Deps:** 21. **Files:** `lib/draft-read.ts`, `app/api/upload/route.ts`, tests (~4).

**Task 23 — An enquiry file becomes drafts** (M)
- **AC:** the enquiry file is read into drafts carrying its **five** fields (name, number, what they asked for, note, the state); nothing enters `enquiry`; the PDF is kept, linked and deletable; the same refusal and held-file rules apply.
- **Verify:** proof: an enquiry file → drafts, 0 enquiries; the PDF links to the record only on save.
- **Deps:** 22. **Files:** `lib/draft-read.ts`, `app/api/upload/route.ts`, tests (~3).

**Task 24 — `/office/drafts`: review, save, delete** (M)
- **AC:** all drafts of both kinds are reviewed on one page; the owner adds a draft's images **by hand** (template carries values, not pictures); a **save** creates the record, giving it its `TS-####` and its change-check **at that moment** and applying the state label (asking him to choose if the state is gone); saving one draft leaves its brothers untouched; a draft survives a reload and is still a draft; an unsaved draft consumes no code; a draft can be deleted.
- **Verify:** proof: save one → one car with the next code + hash + photos; the other nine untouched; a reload keeps a draft; abandoning a draft burns no `TS-####`.
- **Deps:** 23. **Files:** `app/office/(shell)/drafts/*`, `app/office/actions/draft.ts` (~5).

**Task 25 — Demo marker + wipe covers drafts** (S)
- **AC:** every row this layer writes (drafts included) carries `is_demo`, so the one-move wipe clears the whole demonstration and touches nothing of the client's; the wipe also removes any demo asset a draft referenced.
- **Verify:** the wipe's dry run lists drafts; a post-wipe store has no draft rows and no orphaned demo assets.
- **Deps:** 24. **Files:** `lib/demo-wipe.ts` / `scripts/demo-wipe.ts`, draft action (~2–3).

### Phase 8 — Settings and export (build step 8)

**Task 26 — Settings save for real** (M)
- **AC:** the WhatsApp number is validated **inline** and stored **normalised to `+234…`**, digits only; a bad save is rejected and the **previous number stays active**; the tagline and the full-tank default (a form prefill only) save for real.
- **Verify:** proof: `0…`, `234…`, `+234…` all normalise; a malformed save leaves the old value; a public `wa.me` link resolves.
- **Deps:** 6. **Files:** `app/office/actions/setting.ts`, `settings/*`, `lib/phone.ts` + test (~4).

**Task 27 — Password delegated + operational notices** (M)
- **AC:** password change is delegated to the provider and **no password material exists in any application table**; the office displays a storage-past-threshold notice and a backup-status notice read from `setting` rows (`last_backup_at` written by TASK-006; storage-warning figure, default 4 GB). No live Sanity storage computation.
- **Verify:** proof: no password column/row anywhere; with `last_backup_at` absent the notice says so honestly; with it present the notice reads it.
- **Deps:** 26. **Files:** `settings/*`, `lib/settings.ts` (~3).

**Task 28 — The export** (M)
- **AC:** one action produces **one ZIP**: `master.json` (nested — each car with its costs and photos) + **one CSV per subject** (cars, costs, photos, enquiries, taps, activity, settings) + a `README.txt` naming the contents and the date; **not** an Excel workbook; reachable only from inside the office — a request without a session returns nothing.
- **Verify:** open the ZIP and show every subject present; the nesting survives in `master.json`; an unauthenticated download returns nothing.
- **Deps:** 27. **Files:** `app/api/export/route.ts`, `lib/export.ts`, `settings/*` (~4).

### Phase 9 — Resilience (build step 9)

**Task 29 — The shared store guard + retryable state** (M)
- **AC:** every server-side store read passes through **one shared guard**; a transient failure becomes one **retryable-state** component; route-level `error.tsx` boundaries sit behind it; applied to **both** the office and the public showroom. A blip shows no bare 500 and **no invented figure**.
- **Verify:** proof: with the store briefly unreachable, a store-reading page shows the retryable state and never a fabricated number; recover → the page renders normally.
- **Deps:** 28. **Files:** `lib/store-guard.ts`, `components/retryable.tsx`, `app/**/error.tsx` (~5).

> **Gate 9** — resilience proof green; gates green. No owner stop.

### Phase 10 — Witnesses, gates and the report

**Task 30 — Refusals witness** (M)
- **AC:** every refusal proved with what was asked and what came back: an office URL with no session; a signed-out tab; a state deleted while occupied; a malformed WhatsApp number; a malformed amount; a file that is not the expected template; a GET that would have changed data; a request carrying its own `content_hash`; a request trying to change an identity; and an unauthenticated export.
- **Verify:** `developer-workspace/scripts/task-004/refusals.mjs` → each refused, each with the right rule named, nothing changed.
- **Deps:** 29. **Files:** `developer-workspace/scripts/task-004/` (~2).

**Task 31 — Flows witness (browser, before/after)** (M)
- **AC:** the standing browser-check procedure (attach-only CDP :9222, ≤10 chromium, no launch, no screenshots): create a car, edit it, change a cost, mark sold and un-mark, delete and undo, upload photos, upload a template and save its drafts one by one (one left unsaved), import the enquiry PDF, change a state, save a setting, export. **Figures before and after** written down.
- **Verify:** the harness reports PASS; office and showroom agree on every shared car; no leak on public routes with the writes in place.
- **Deps:** 30. **Files:** `developer-workspace/scripts/task-004/`, `runs/` (~3).

**Task 32 — Store state, demo marker, wipe dry run, export opened** (M)
- **AC:** the store's state after the flows is recorded so "office and showroom agree" is **checked, not claimed**; every row the demonstration created carries the demo marker; a dry run shows the demonstration and everything this layer's writes left behind is still removable in one move and nothing else is touched; the export file is opened and shown to hold every subject.
- **Verify:** proof script + the opened export; the wipe dry run changes nothing.
- **Deps:** 31. **Files:** `developer-workspace/scripts/task-004/` (~2).

**Task 33 — Gates, reconcile, report, copies, tracker closed** (M)
- **AC:** the gates in the learned order — **leak-check → typecheck → test → build → store-freshness** — plus the office reconcile script (itself extended for the new state model) and the browser check; a report written at `developer-workspace/reports/TASK-004.md` (built · witnesses with numbers · the ten refusals · findings · not-done · gaps for TASK-005/006 · the pending "section" vocabulary gap); a byte-identical copy into `openspec/tasks/TASK-004/`; this plan's tracker closed.
- **Verify:** all gates green; reconcile green; the browser check PASS; report + copy exist.
- **Deps:** 32. **Files:** `reports/`, `openspec/tasks/TASK-004/` (~4).

> ### ⛔ Owner checkpoint C — final. **Stop and demonstrate.** Owner may redirect before TASK-005.

---

## Verification method

- **The four gates, in the learned order:** `npm run leak-check` **before** `npm run build` (build clobbers `next dev`'s `.next`), then `npm run typecheck`, `npm test`, `npm run build`, and the standing fifth, `npm run store-freshness`; restart `next dev -p 3210` after any build (port 3000 is never used).
- **The store witness:** `scripts/reconcile.ts` — the rendered office vs the store read directly through the shared rules (not through the read layer).
- **The browser witness:** the standing procedure `developer-workspace/procedures/browser-check.md` (attach-only CDP :9222, ref :3211 vs build :3210, ≤10 chromium, no launch, no screenshots).
- **The refusals witness:** one script per refusal, each judged on four things (refused · the right rule refused it · nothing changed · the parent survived).

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Clerk install/keys need the owner's account | High | Task 2 asks about skills; Task 3 gates on `clerk doctor` + invite-only verify; keys never printed/committed; owner installs/signs in the CLI. |
| `0020` reshapes a live store and is not reversible | High | Forward-only corrective files; scratch `drop → migrate → seed` proves the chain; the rebuild is the strongest check. |
| The state-model change moves the demonstration's figures | Med | Expected and named; the witness is **agreement** between office and showroom, produced by the one rule. |
| Building Clerk/Sanity/PDF/ZIP from memory | High | Task 2 loads the current truth; ask before installing any skill; cite the source. |
| Cold Neon connections drop concurrent requests | Med | Warm the pool before the browser check (learned in TASK-003, `notes/T7-browser-check-and-db-flakiness.md`). |
| `build` clobbers `next dev`'s `.next` (500s on dynamic routes) | Med | `leak-check` before `build`; restart dev after any build. |
| A draft or asset is left orphaned | Low | Drafts carry `is_demo` and the wipe clears them; the job's removal list gains **no** third exception. |
| The specs still say "section" where D15 says "primary state" | Low | Build to D15's semantics (section ≡ primary state); log the pending vocabulary rewrite as an architecture gap, don't silently rewrite specs. |

## Gaps this layer hands over (named, not hidden)

- **TASK-005:** the wording of the retryable state; the per-width interaction split (incl. the genuinely-open tablet nav); toast/confirm presentation; the 8-second undo's presentation.
- **TASK-006:** the daily job — the drift report, the retention notice, the `last_backup_at` heartbeat, the `auth_attempt` 90-day trim, and the clearance of assets no draft and no record ever referenced.
- **Architecture:** the pending rewrite of the specs' "section" vocabulary to "primary state" (D15 d).
- **Carried from TASK-003:** the seed's child-row id churn; `components/CarCard.tsx:31`'s dead `mi`; `lib/serialize.ts:153`'s `mileage`→`mileageKm` alias (name only).

## Open questions

None — the frontier is empty; every branch was answered in `openspec/tasks/TASK-004/task.md` on 2026-10-14.

**Operating rule:** Do NOT stop for internal gates (leak-check/typecheck/tests/build/store-freshness); stop ONLY when an architectural/product decision is required that is not answered in the task. Continue building Phase 3 (the car's life, Tasks 10–15) until Checkpoint B.
