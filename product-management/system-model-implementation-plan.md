# System Model Implementation Plan — TrueSpec

**Status: DRAFT — written 2026-10-08. Awaiting the owner's "go" before any implementation.**
Implementation plan **#6 of six** (planning-close.md). This is the plan that answers `system-model.md`'s 120 items against the real screens, and the place where register items **A4–A6, B1 and C1–C3 land**. It decides **behaviour** — request paths, guarantees, boundaries, edge cases — and re-derives none of the rules plans #2–#5 already wrote.

---

## 0. What this plan obeys

- The screens in `test-truespec-v2` (the routes below are what they actually are).
- `business-logic-implementation-plan.md` (#2): money, counting, states, visibility, ref codes — referenced as "BL §n".
- `functionality-implementation-plan.md` (#3): auth, CRUD, gallery, taps, PDF, dashboard, settings — "FUN §n".
- `ux-implementation-plan.md` (#4): dialogs, toasts, undo **timing**, offline, failure wording — "UX §n".
- `data-model-implementation-plan.md` (#5): the schema these behaviours run on — "DM §n".
- `planning-close.md`: rulings **R1–R3**, decisions **C1–C4, F1–F6**, register **A1–A8**.

**Deferred:** the *execution* of the backup job, the uptime check, and the pre-handover curl run are deployment-time (L). The *promises* are settled here.

---

## 1. The landing map — register items, and where they are answered

| Register | Status | Answered at |
|---|---|---|
| A1–A3 | decided 2026-10-08 | F4–F6 (register), FUN §2.4, §J90/§K99 below |
| A4–A6 | **answered here, §14 — owner confirms with the "go"** | §14 (M109–120) |
| A7 | decided 2026-10-08 | DM §1/§4 (Sanity) |
| A8 | decided 2026-10-08 — **stack change: Neon + Clerk + Sanity + Vercel; PDFs → Sanity; daily job → Neon scheduled function** | register A8, §8 below, DM §4, product-design stack |
| B1 | **closed here** | §3 (the C3 gate settles it) |
| C1–C2 | decided, now landed | FUN §2 + DM §2 (`session`, `auth_attempt`); §J86, §K97–99 below |
| C3 | decided, now landed | BL §6.2 + **this plan §3** + product-design gate paragraph |
| C4 | landed | product-design "still building" |
| D1, E1 | closed | spot-checks |
| F1–F6 | decided | register F + the plans |

---

## 2. What comes in — the routes and the doors (A1–A10)

**The routes (from the screens):**

| Route | Screen | Kind |
|---|---|---|
| `/` | truespec.html | public |
| `/inventory` (+ `?group=on-order` / `?group=landed`) | inventory.html | public |
| `/cars/[ref]` | car.html | public |
| `/office/login` | office-login.html | office |
| `/office/first-run` | create-account context (UX #4) | office — exists **only** while `office_user` is empty |
| `/office` → dashboard | office-dashboard.html | office |
| `/office/inventory` · `/office/cars/new` · `/office/cars/[ref]` | office-inventory.html / office-car.html | office |
| `/office/enquiries` | office-enquiries.html | office |
| `/office/settings` · `/office/activity` | office-settings.html / office-activity.html | office |

**A2 — public vs office:** public = the five showroom routes. Everything else is office. There is no third class.

**A3, A7 — the door:** any office route with no live session answers "not signed in" and serves nothing else (FUN §2 acceptance). The check runs **server-side, per request** — the lock is on the door, not the curtain (product-overview; BL). The session cookie proves *a live session* — it does not prove who is sitting at the computer; on a shared machine it proves only that someone recently signed in. That is why sessions expire on inactivity and on the 7-day cap, and why the owner signs out on a shared computer (J88).

**A4–A6 — trusted input:**
- Form fields: validated at the server, never trusted from the browser (types, year range, the dollar-without-rate CHECK — DM §2/C).
- URL params: `group` is whitelisted to the three public groups; `ref` must match `^TS-\d{4}$` — anything else is 404.
- The PDF (A6): magic bytes + size cap at the door; the import process itself is FUN §6.
- No client filename is ever used as a storage path (E3; DM §4).

**A8/A9 — CSRF and link-only actions (settled 8, now operational):** every mutation is a **POST**, never a link; `Origin` header checked on all writes; cookie `SameSite=Lax` (top-level GETs may carry it, which is precisely why no state change is ever a GET). **No action in the product is reachable by a bare link.**

**A10 — unexpected input:** a bad ref on a live-but-unlisted car → the "no longer listed" page with an inventory link (B21); an invalid `group` → the default tab; an unexpected field value → inline + server validation, and the error body never echoes what was submitted (A4).

---

## 3. Reading — how each page gets its data (B11–24)

- **The visibility gate (C3, closes B1):** a car appears publicly **iff** it is not deleted, not sold, **has a price and ≥1 photo**, and its state maps to a group. Because a priced car is the only kind that's public, a buyer can *never* see a blank price — **a listed car is always priced**; "Price on request" exists only inside the office for drafts (BL §6.2).
- **Which tab (B11):** state → section. Landed-group cars appear in **both** the Available tab and the Landed tab (product-design: Landed sits inside Available — never counted twice, never shown contradictory).
- **Order (B12):** showroom = newest first (`created_at DESC`). Office list = state (registry sort), then newest.
- **The field list (B13–14):** exactly `toPublicCar`'s whitelist — brand, model, trim, year, colours, mileage, price, features, photos, section label, optional note. **Never the DB row** (product-design §A2: the letter and the envelope). One function, one place (BL §6.1).
- **Counts (B15–18):** every number on every screen comes from the business-logic `counts()`/`totals()` — never counted separately. The three tabs, the home counts, and the office dashboard cannot disagree because they are the same function (BL §4).
- **Immediacy (B19):** the promise is "a new car appears immediately" (product-overview). Mechanically: no long-lived page cache on the showroom in v1 — pages render current data (dynamic render or revalidate-on-write), so a save is visible on the next read. Correctness beats caching at this scale; revisit only if the showroom ever needs CDN.
- **Stale reads (B20):** nothing to hold staleness — no page/CDN cache, no stale-while-revalidate in v1. Browser back keeps the tab state (UX). A slow connection shows placeholders (UX/progressive rendering), never an old car list.
- **Dead links (B21–22):** a shared link to a **deleted** or **sold** car → one page: "no longer listed" + an inventory link. Never a raw error, ever.
- **Payload (B23):** the leak check on the live address is a go-live gate (L104): `curl … | grep -i "purchase_price\|clearing\|shipping\|trucking\|profit\|full_tank\|landed_cost"` returns empty on every public route.
- **Error echo (B24):** server error bodies carry a code and a safe message only — never the submitted payload.

---

## 4. Writing — every mutation and its guarantee (C25–41)

| Mutation | Guarantee (rule from) |
|---|---|
| Add car | one whole-car write; ref assigned once from the sequence (`TS-####`, never edited/reused — BL §6.5); showroom sees it immediately (B19) |
| Edit car | single write of the car; **version guard** — the page carries the version it loaded; a stale save is refused (E57); the newest save wins |
| State change | one POST; visibility follows the rule **silently** (BL); sold is the separate action |
| Mark sold | **one transaction**: sold flag + `sale` row (F59) — car leaves the showroom, stays in Archive/totals (BL §4/§5) |
| Unmark sold | delete the `sale` row (mechanism decided, FUN §3.4); real profit correctly becomes projected again |
| Delete / undo | tombstone (`car.deleted_at`), 8 s undo (UX §toasts), hard delete by the job after the window (DM §4); the dead-link page covers the meanwhile |
| Cost lines | six kinds fixed; per-line rate (R3); dollar-without-rate impossible at both DB (CHECK) and form |
| Settings | WhatsApp validated **with the composed link tested** (36/105); no rate (R3); password change revokes other sessions |
| PDF import | upload → parse → preview → correct → confirm; nothing saved before confirm; rejects flagged, never silent (FUN §6, product 145); file kept, deletable (F1) |
| States (car + enquiry) | registries; in-use deletion blocked (DB RESTRICT + named reason); rename applies everywhere at once (BL §5); enquiry moves never move cars (R1) |

**Double submit (E55):** the Save button disables on submit **and** the version guard refuses the second write (first save bumps the version, the duplicate carries the old one) — the version is the dedupe; no separate idempotency key in v1.

---

## 5. Money — the behaviour answers (D42–53)

| Item | Answer |
|---|---|
| 42 currency per cost | chosen on the line; exactly USD/NGN |
| 43 rate per cost | **on the line** — the rate that amount was made at (R3); a dollar line has one |
| 44 rate carrying forward | the line's rate defaults from the previous line on the same car (product-design money rules) and **stays editable**; changing any input recomputes everywhere, nothing is frozen |
| 45–49 | settled (integer minor units; naira at the edges only; the three totals; which cars count; the "still building" line — carried, not re-opened) |
| 50 zero ≠ not-entered | NULL = not entered (→ incomplete); 0 = a genuine zero (BL rule 5) |
| 51 amount without rate | caught inline **and** physically impossible at the store (DM CHECK) |
| 52 negative profit | allowed — shows a bad buy, never clamped (system 52) |
| 53 rounding | exactly one place: `money.js` totals (BL rule 7; DM §3) |

**I81 (rate's date vs cost's date):** the rate is a *number on the line*, not an object with a chronology — there is no separate rate date; the line's `updated_at` is the evidence. The product cut the FX engine; a single mutable number per line is the design, deliberately.

---

## 6. Two people, two tabs (E54–57)

- The version field is the concurrency token (DM §2/`car`).
- Same car in two tabs: the second save carries a stale version → **refused with "This car was changed somewhere else. Reload to see the latest."** (UX failure wording → Q83/Q90). The refusal never discards what they typed — the draft stays in the form (F62), and reload loses nothing they hadn't saved.
- Same form submitted twice: §4 double-submit rule.
- State changed while an older page is open: the older page's save is refused the same way (a state change bumps the version).

---

## 7. When things break (F58–66)

| Failure | Promise |
|---|---|
| 58 DB unreachable | "Saving is unavailable right now"; every typed field stays in the form (FUN §10, UX wording) |
| 59 action fails halfway | one transaction per write — sale saved *and* car moved, or neither; no half-states |
| 60 image missing/broken at source | placeholder tile, never a broken icon (FUN §4.4); the daily job flags/cleans |
| 61 unexpected value | server validation; safe generic message; nothing echoed (B24) |
| 62 session expiry mid-action | action refused; the draft remains in the form; wording "your work is saved" (UX) |
| 63 case-by-case wording | owned by UX #4 §Failure Wording |
| 64 what is retried | network-class errors only, with backoff; **never** validation errors (product-design G2) |
| 65 DB lost/corrupted | restorable to ≤ 7 days old; the restore path is proven weekly (§9, L) |
| 66 how we know a backup works | daily scheduled export **+ weekly restore-to-scratch verification**; `last_backup_at` is shown in settings so the owner sees the last good date (FUN §10) |

---

## 8. The services and the seams (G67–72, A7)

- **The split (67):** **Neon** = Postgres (data, `session`, `auth_attempt`). **Clerk** = accounts and sessions (auth) — the 7-day cap is its default setting; the 12-hour idle is enforced by the app (C1, A8). **Sanity** = car images *and* the enquiry PDFs (asset store + CDN — A7; PDFs added by owner ruling 2026-10-08, **A8**; PDFs are office-only, never public-read). **Vercel** = hosting. Four vendors, no other service. **The daily maintenance job** (data cleanup, image pruning, retention sweep) runs **once a day as a Neon scheduled function**, with **Vercel cron as the documented backup** (A8).
- **Photo deleted at Sanity but still referenced (69):** render falls back to the placeholder; the daily job finds the dangling row (asset 404) and, once out of the undo window, removes the row. Never a broken icon, never a stuck row.
- **Referenced before processing finished (70):** cannot happen — upload-first (FUN §4.1) means the asset exists before the row does.
- **Who wins when they disagree (71):** Sanity owns the **bytes**, the DB owns the **car's photo list**. A row whose asset 404s is removed (bytes win over the row); an asset with no row is pruned (the DB list wins over bytes). Both directions converge on: only referenced, existing assets remain.
- **Image store unreachable (72):** placeholder, page still loads; the showroom never crashes because Sanity is down.

---

## 9. Images (H73–78)

73 device → Sanity (A7). **74 derivatives: none built in v1** (F3); Sanity's on-demand CDN params are the documented upgrade path, not part of v1. **75 served where:** Sanity CDN URL per asset; the cover leads the page and slider. **76 cover:** position 0 (DM §2). **77 cost over time:** Sanity free limits (asset count + monthly bandwidth) hold at this scale as long as the daily prune keeps only referenced assets — drift is slow by design. **78 cost more than expected:** the office is told in-product past a threshold (FUN §4.5); the response (upgrade, trim photos) is the owner's — this plan only guarantees he is *told*.

---

## 10. Time (I79–83)

- **One timezone:** everything stored **UTC** (`timestamptz`), displayed in Lagos (DM §2).
- **Dates form:** `timestamptz` columns; presentation formatting lives in the UI layer.
- **"Landed this year":** no date logic (settled 82) — the `is_new_arrival` flag on the state (DM §2/`car_state`).
- **Everything that depends on today (83):** the session cap (7 d), `sold_at`, the 8 s undo window, the 90-day `auth_attempt` prune, the 12-month enquiry review (§14), and the backup dates — all clock-driven, all UTC.

---

## 11. Access and sessions (J84–92)

| Item | Answer |
|---|---|
| 84 first run | no admin → **first-run screen creates the one account**, and the seed loads demo data (J91); the screen exists only while `office_user` is empty |
| 85 no signup, ever | settled — there is no registration route to attack |
| 86 session length | **C1: 12 h idle / 7 d cap** — the 12-hour idle is enforced by the app via the `session` table (FUN §2.3, DM §2); the 7-day cap is Clerk's default setting (A8) |
| 87 password storage | hashed (a strong KDF), never plaintext; changing it revokes all other sessions |
| 88 shared/public computer | inactivity expiry + the 7-day cap + explicit sign-out; the owner signs out on shared machines — nothing stores a session beyond the cookie |
| 89 losing the password | **no in-app reset (F2)** — recovery via the database, stated in settings; a uniform response so nothing reveals whether an email exists (B6) |
| 90 login attempt limits | **C2/F4: growing delay from 3 failures (1 s → 5 s → 15 s → 30 s, 60 s cap); 10 failed attempts per IP per 15 min, excess logged and rejected; never a lockout** — fed by `auth_attempt` (DM §2) |
| 91 seed together | first run loads the demo inventory (idempotent, J5) so the showroom is never empty |
| 92 the owner's number | never in a seed file (FUN §2.7) — placeholder in demo, real number in production settings only |

---

## 12. WhatsApp (K93–99)

| Item | Answer |
|---|---|
| 93 the tap | records `(page, car_ref, at, ip)` — nothing else, ever (FUN §5.1; the A6 tap rows stay anonymous) |
| 94 the number | from `setting.whatsapp_number` — validated at save **with the composed link tested** (36, 105) |
| 95 the message | fixed wording naming the car (+ its ref so [TS-####] rides along — the product's one metric); not configurable in v1 |
| 96 never in a message | no cost, rate, note, or anything outside the public whitelist (BL §6.1); the message is built from public fields only |
| 97–99 floods | the C2 shape guards the tap: **per-IP cap (10 taps per IP per 15 min) with excess logged + rejected**; a flood shows as a burst in the dashboard feed (FUN §5.3) and costs the owner ~₦0 — a tap is free, so the guard caps harm rather than blocking forever |

---

## 13. Build order, deployment, verification (L100–108)

- **100 what must exist first:** the schema (migrations, DM §8) and the auth door (§2) — nothing else can be trusted to behave until the door and the store are real.
- **101 what unblocks the most:** the two boundaries — **the session door** (unlocks every office page) and **`toPublicCar`** (unlocks every public read). Wrong here means rewriting both sides.
- **102 buildable without the DB:** the static screens already exist (UI done), and the UX behaviours (#4) can be built against them; only the writes need the schema.
- **103 only testable with real data/hosting:** the PDF import with a real template file, the leak check on the live URL (104), the WhatsApp link on a real phone (105).
- **104 pre-handover leak check:** the curl/grep gate (§3 B23) against the **deployed** URL, every public route — empty output or no handover.
- **105 settings check:** "tap Chat on the live showroom → the WhatsApp draft opens to the right number."
- **106 deployment env:** Neon connection string + Clerk keys, Sanity project id/dataset + token, a **fixed** session secret (J4), idempotent seed (J5); a missing key fails **loudly** at startup, never renders a broken page (J2).
- **107 test and live apart:** never verify localhost and call it done (that is the default failure the whole checklist exists to prevent).
- **108 monitoring:** cheap and sufficient — an uptime check on the public URL, the weekly **restore-to-scratch** that proves backups (66), and in-office visibility: `last_backup_at` in settings, Neon/Clerk/Sanity/Vercel status pages when something looks off.

---

## 14. Personal data and ownership (M109–120) — where register A4–A6 land

**Owner confirms these by giving the "go" to this plan.** Until then they are this plan's recommended answers, exactly as register A4–A6 promised.

**The legal shape, carried as general information (109–112, settled):** the NDPA 2023 sets no fixed period — data stays only as long as the purpose needs (s.24(1)(d)); the controller must *inform* data subjects of the retention period before collecting (s.27(e)); erasure/review time limits must exist; a privacy notice is required on the page carrying the WhatsApp button, before the tap. **No section numbers are ever quoted to the client** (system-model "Notes on quoting the law").

**113 — cross-border:** Neon, Clerk, Sanity and Vercel all store outside Nigeria, so customer names and numbers sit abroad; NDPA transfer conditions apply. **Recommended default:** keep the regions where the services actually run, keep the notice honest about it, and confirm the full read with the client's lawyer — carried as general information, not legal advice.
**114 — registration threshold:** unverified; never quoted to the client.

**115 (register A4) — how long names and numbers are kept — the adopted defaults:**

| Enquiry kind | Rule |
|---|---|
| **Lost / Not-serious**, or any enquiry with **no contact for 12 months** | **deleted (hard, or irreversibly anonymised) 12 months after last contact** |
| **Open / actively engaged** | kept while engagement continues; **reviewed every 12 months** by the retention job |
| **Buyers** | kept as long as accounting/tax requires — default **6 years after the sale** (the exact figure is an accountant's question; the default stands until they say otherwise) |

Mechanics: `enquiry` gains a `last_contact_at` (set when the owner moves or edits a card) and `deleted_at` (set by manual delete and by the review job); the daily job hard-deletes rows past their window and logs the activity. **Anonymise is the available alternative** where the owner wants the row without the person; hard delete is the default because this is a one-showroom business with nothing to keep.

**116 (register A5) — does the site tell visitors?** **Yes.** The privacy notice on the WhatsApp page states: what is collected (name, number, car asked about, time), why (to respond and follow up on car interest), how long (open enquiries — 12-month review; lost/no-contact — deleted after 12 months; buyers — accounting period, typically 6 years), and the right to demand deletion. Plain words, before the tap.

**117–120 (register A6):**

| Question | Answer |
|---|---|
| 117 who sees customer details | **only the owner** — v1 has no staff roles |
| 118 deleting a customer leaves behind | the enquiry card is gone; **tap rows carry no name or number** and are untouched; the car record is untouched; the deletion shows in the activity feed. PII lives in exactly one table (DM §7), so nothing personal survives anywhere else |
| 119 data export | **yes — one-click full export from Settings**: cars, costs, enquiries, activity, settings, as CSV/JSON; plus per-subject access on request (right of access) |
| 120 what the owner loses on exit | keeps his export and the codebase; loses hosting access and ongoing support — stated in the handover so nothing is a surprise |

---

## 15. Landing list — what gets written into `system-model.md`

When the "go" lands, these items move from "unworked" to answered, with the answer stored at the line this plan calls:

**A 1–10** → §2 · **B 11–24** → §3 · **C 25–41** → §4 (+ BL §5, FUN §3/§6) · **D 42–53** → §5 (+ BL §3, DM §3) · **E 54–57** → §6 · **F 58–66** → §7 (+ FUN §10) · **G 67–72** → §8 · **H 73–78** → §9 · **I 79–83** → §10 · **J 84–92** → §11 · **K 93–99** → §12 · **L 100–108** → §13 · **M 109–120** → §14. Register **A4–A6 → answered**, **B1 → closed**, **C1–C3 → landed**.

---

## 16. Open items — none blocking

| Item | Status |
|---|---|
| Buyer-retention tax figure | default **6 years** stands; the accountant's confirmation does not block the build |
| 113/114 legal reads (transfer, registration) | carried as general information; the client's lawyer confirms — does not block the build |
| Deployment execution (backup scheduling, uptime check, env verification, leak-run) | runs at deploy per §13; the promises are settled here |

---

## 17. Acceptance (checked on the deployed staging site, not localhost)

- No session → every office URL answers "not signed in" and serves nothing else.
- Every mutation is a POST; a GET to any mutating URL changes nothing.
- The public leak check (104) passes on all public routes; the WhatsApp link opens to the right number (105).
- A car saved in the office appears in showroom + dashboard + inventory on the next read (B15–19, one function).
- Two tabs editing the same car: the stale save is refused with the reload line, and nothing typed is lost.
- Shared links to deleted/sold cars → "no longer listed", never a 500.
- Sold → unmark round-trip keeps projected/real profit right in both directions.
- Session: idle > 12 h or age > 7 d → next action refused → login with "your work is saved".
- A 30-tap flood from one IP yields a handful of rows, the excess logged, the burst visible in the feed.
- The retention job (on scratch data) removes 12-month-no-contact enquiries and logs it; deleting a customer leaves anonymous taps + an activity line; buyers survive.
- One-click export returns the full dataset; per-subject export returns one enquiry's data.
- Backup restore-to-scratch passes weekly; `last_backup_at` is current in settings.

---

## 18. The six plans, closed

| # | Plan | State |
|---|---|---|
| 1 | UI implementation plan | ✅ done (screens) |
| 2 | Business logic | ✅ written, awaiting "go" |
| 3 | Functionality | ✅ written, awaiting "go" |
| 4 | UX implementation | ✅ done (designer, copied in) |
| 5 | Data model | ✅ written, awaiting "go" |
| 6 | **System model** | ✅ **written — the last one** |

**With the "go" on this plan, every register item is answered, every system-model item has a line, and the whole board is green except the implementation passes themselves.**

---

*Companion docs: `planning-close.md` (register), `system-model.md` (the 120 checked), the plans #2–#5, `product-overview.md` (the promise). The screens in `test-truespec-v2` are the input; nothing here changes UI/UX files.*