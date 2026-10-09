# Functionality Implementation Plan — TrueSpec

**Status: DRAFT — written 2026-10-08. Awaiting the owner's "go" before any implementation.**
Implementation plan **#3 of six** (planning-close.md). Covers **auth, sessions, car CRUD, gallery & images, WhatsApp taps, enquiries + PDF, dashboard, settings** — grounded in the real screens and `system-model.md` items A–L.

---

## 0. What this plan obeys

- Build order: **UI → business logic → functionality → UX.** This layer assumes the business-logic pass (money, totals, states, visibility, ref codes) is in place — it does not re-derive rules.
- `system-model.md`: items 8 (CSRF, settled), 19 (immediacy promise), 27–41 (writing), 54–66 (concurrency & breakage), 73–78 (images), 84–92 (access), 93–99 (WhatsApp), 104–108 (deployment checks).
- `planning-close.md`: **C1** (session 12h app-enforced idle / 7d — the cap is Clerk's default), **C2** (growing delay + per-IP limit, never a lockout, rate-limited logger, same shape guards the WhatsApp tap).
- Rulings from 2026-10-08: **R1** (enquiry states have no open/closed), **R2** (owner adds states freely), **R3** (no global rate — the settings rate field is void).
- Every "the rule says…" below points at the business-logic plan; functionality only *implements* it.

---

## 1. What the screens already give us (grounding)

| Screen | Functional surfaces present |
|---|---|
| `office-login.html` | Login: email + password; nothing loads until signed in |
| `office-car.html` | Add/edit car: six cost lines, price, state picker, photos, notes, live money panel |
| `office-inventory.html` | List + per-row state/price/landed/profit + actions (edit/delete) |
| `office-dashboard.html` | Static cards (money tied up, projected/real profit, counts, taps, activity) |
| `office-enquiries.html` | Five columns (New, Talking, Negotiating, Sold, Lost) — from the states registry |
| `office-settings.html` | WhatsApp, tagline, password …and a **rate field that dies with R3** |
| `car.html`, `inventory.html`, `truespec.html` | WhatsApp buttons (per car + general), three tabs, car detail |

---

## 2. Auth & sessions (J84–92, C1, C2, settled 8)

1. **First run: one admin account is created** (J84, J91). No signup ever (settled 85). The first-run screen also loads the demo/seed cars (J91) so the showroom is never empty.
2. **The lock is on the door, not the curtain.** Every office page and every write is checked **server-side, per request** (product 164). Hiding the office link protects nothing; refusing unauthenticated requests protects everything.
3. **Session: 12 hours, or 7 days** (C1) — the 7-day cap is Clerk's default setting, and the 12-hour idle is enforced by the app (A8: the owner enforces it ourselves, which is what the spec required). A session dies on inactivity and on the 7-day cap; no exceptions, no "remember me" that beats it.
4. **Abuse control (C2):** a wrong sign-in gets a **growing delay**, each IP gets a **limit**, and nothing ever hard-locks the account. All attempts go through a **rate-limited logger**. Same shape guards the WhatsApp tap (K97–99). **Numbers (decided 2026-10-08, planning-close F4):** delay starts after 3 failures — 1s → 5s → 15s → 30s, capped at 60s; an IP gets **10 failed attempts per 15 minutes**, then further attempts are logged and rejected for that window. Nothing locks forever.
5. **CSRF (settled 8):** `SameSite=Lax`/`Strict` session cookie; **every change is a POST, never a link**; Origin header checked on writes.
6. **Passwords:** hashed, never stored in the clear (J87). Changing the password signs out other sessions. **Lost password path (J89):** no in-app reset for a one-admin system — recovery via the database, stated in settings (**decided F2**).
7. **The owner's number is never in a seed file** (J92) — real number only in production settings; demo uses a placeholder.

**Acceptance:** with no cookie, every office URL answers "not signed in" and serves nothing else. With a dead/short session, the next action is refused and the login page appears. Ten bad attempts from one IP produce delays and log lines, not a lockout.

---

## 3. Car CRUD (C25–41)

1. **Add (25):** one form for add and edit. Save creates the car, assigns the reference code (`TS-####`, never edited/reused — rule from the business-logic pass), sets the state, and the showroom sees it **immediately** (B19).
2. **Edit (26–27):** save is a single write of the whole car; the field that was saved last wins; the form carries the version it was loaded from (E54–57).
3. **State change (28):** one dropdown/bottom-sheet action; the car's visibility follows the state silently (rule, not feature). Sold is the one separate action (29).
4. **Mark sold (29–30):** set sold flag + sale price + date. **Unmarking reverses or voids the sale record** — projected/real profit only stay right if the record is cleaned up (settled 30, mechanism now decided: unmark deletes the sale row from the sale table).
5. **Delete & undo (31–33):** delete asks first; logic holds a **tombstone until the Undo window expires** (timing belongs to UX, retention rule belongs here); a deleted car's ref code is never reused (41). Visitors on a dead link see "no longer listed" (B21–22).
6. **Cost lines (34):** add/change/remove the six lines. A dollar line with **an amount but no rate is invalid on save** — inline, never after (rule from business logic; the live money panel shows it while typing).
7. **Concurrency (E54–57):** two edits of the same car — the newer save wins; the person holding the older page is told their copy is stale and their change would be lost, with reload offered.

**Acceptance:** add → appears in showroom instantly; state change → tabs follow; sold → gone from showroom, in Archive, counted in real profit; delete → undo restores the exact row in the exact state.

---

## 4. Gallery & images (G67–78)

1. **Upload path (73):** device → Sanity (asset store + CDN, per the product-design stack — **decided 2026-10-08, register A7**). Upload first, car saves second — a photo referenced before its record exists is a photo that already exists (70). The data-model plan (#5) holds the `car_photo` link (`sanity_asset_id`) and the storage rules.
2. **Cover photo rule (76):** exactly one cover per car, chosen by the owner; it leads the page and the slider.
3. **Derivatives (74):** **v1 serves what was uploaded** — no server-side processing (**decided F3**). Uploads are constrained (size limit on the field, resolution hint) so a 12 MB phone photo isn't shipped to buyers. Flag "downscale on upload" for the data-model/storage pass; do not build it in this pass unless the client wants it.
4. **Brokenness (60, 69, 72):** a missing image shows the placeholder, never a broken icon; a photo deleted at the store but still referenced is cleaned by a small daily check (69) that also prunes orphaned uploads.
5. **Cost (77–78):** Sanity's free limits (asset count + monthly CDN bandwidth) hold comfortably for this scale as long as the daily check keeps only referenced images, so drift is slow; the moment usage passes a threshold, the owner is told in the office, not in an email (the usage read is a deployment/scheduling item).

**Acceptance:** upload 5 photos → all five show, cover first; delete one → gone from every page; storage quota crossing warns inside the product.

---

## 5. WhatsApp taps (K93–99)

1. **The tap (93–95):** a button press records `(page, car_ref, at)` — nothing more. The tap opens `wa.me/<number>?text=<fixed message naming the car>`. The **number comes from settings** (94), never from a seed (92).
2. **Never in a message (96):** no price unless a price is public (it is), and **never any cost, rate, or note** — the message is built from the public whitelist only.
3. **Floods (97–99):** taps are an open write anyone can trigger. The C2 shape guards them: per-IP growing delay, a cap, a rate-limited logger. What a flood looks like is visible in the dashboard tap feed; what it costs the owner is ~0 (a WhatsApp tap costs nothing), which is why the guard caps harm rather than blocking forever.

**Acceptance:** tapping Chat logs one row in the tap feed; tapping 30 times in a minute yields a handful of rows and then silence, with the excess logged.

---

## 6. Enquiries & the PDF process (A6, C37–39, R1)

1. **The two-track rule (product 154; business-logic R1):** enquiry states and car states are separate registries. Moving a customer's column **never moves the car**. No open/closed grouping on enquiry states — counts are per state.
2. **The import process (37):** upload PDF → parse → **preview table** of every row → the owner corrects anything → **nothing is saved until he confirms** (product 145).
3. **Rejects (38):** a row the parser cannot read is shown as a flagged row with the reason ("missing name", "no car ref") — he can fix or drop it in the preview. Nothing is silently skipped.
4. **The file after (39):** the PDF is **kept for the record and linked to the imported enquiries, deletable by the owner** (**decided F1**). No retention timer on it — files stay until the owner deletes them; the 12-month enquiry data review (A4 default) covers what it implies.
5. **Movements:** each confirmed import lands rows in **New**; moving between columns is one action with the per-state count updating (business-logic R1). State registry edits: add/rename/delete, block delete while occupied (40b).

**Acceptance:** a fresh PDF → preview shows every row correctly or flagged → confirm → each enquiry appears as a card in New, counted per state; no row is ever saved or silently lost without the owner seeing it.

---

## 7. Dashboard (B15–18, C4)

1. **Totals:** every number card calls the business-logic totals function — the dashboard is a **reader**, never a computer (B18).
2. **The lines:** "of which N new arrivals" under Available; the still-building line on the profit card ("…still building: costs not complete", C4).
3. **Recent taps & activity:** the tap feed (latest first) and the activity feed, fed by `activity_event` rows the other features already emit (add, state change, sold, unmark, delete, undo, import, settings change) — so the dashboard is true without its own logic.

**Acceptance:** change a car's price → dashboard, inventory, and showroom all update together; the card labels obey the state-aware naming from the business-logic pass.

---

## 8. Settings (C35–36, R3, 105)

1. **Fields:** WhatsApp number, tagline, password. **No rate — R3 killed it;** dollar rates live on cost lines (the settings rate field on the screen is void).
2. **Validation (36):** the WhatsApp number is validated on save — a wrong number makes the main button dead, so "invalid" is caught inline **before** save, never after.
3. **Settings check before go-live (105):** the verified walkthrough includes "tap Chat on the live shop → the WhatsApp draft opens to the right number" — the main button actually works.
4. Password change signs out other sessions (2.6).

---

## 9. Search & filtering (B12)

- Inventory: filter by state and by text (brand/model/ref). Showroom: three tabs are the state→section mapping, never hand-curated; a per-state filter in the office list.
- No pagination in v1 (fewer than ~40 cars); the list is the list.

---

## 10. When things break (F58–66)

- **DB unreachable (58):** a clear "saving is unavailable right now" message; typed fields stay in the form (that part is UX wording; the *no silent loss of a form* is this layer's promise).
- **Mid-action failure (59):** each write is one transaction — sale saved *and* car moved, or neither. No half-states.
- **Session expiry mid-action (62):** the action is refused; the draft remains in the form so nothing typed is lost.
- **Backups (65–66):** scheduled export of the database, verified weekly by restoring to a scratch project — this is a deployment item (L) but the *promise* belongs here: a lost database is restoreable to ≤7 days old, and the owner knows the last good backup date in settings.

---

## 11. Deferred to other plans

| Goes to | What |
|---|---|
| UX (#4) | Dialog shapes, focus, toast/undo timing, offline wording, the failure copy |
| Data model (#5) | Column types, storage layout (Sanity for images and enquiry PDFs — A7 + A8, PDFs office-only), image downscale |
| System model (#6) | M-items (privacy/retention, export, exit), J89 final word, B19/104–108 verification |
| Deployment (L) | Secrets, monitoring, backup scheduling execution |

---

## 12. Decisions made 2026-10-08 (owner accepted all proposals — planning-close F)

| # | Decision | Chosen |
|---|---|---|
| F1 | PDF after a confirmed import | **Kept**, linked to the import, deletable by the owner |
| F2 | Password recovery for the one admin | **No in-app reset** — via the database, stated in settings |
| F3 | Image derivatives in v1 | **None** — serve original uploads, cap size; downscale flagged for the data-model pass |

**No open functionality decisions remain.** (A4–A6 retirement/data-owner policies carry research-based defaults in `planning-close.md`, owner to confirm at the system-model pass.)

---

## 13. Build order inside this layer

1. Auth + first-run + sessions + the door checks
2. Car CRUD + sold + undo (binds to the business-logic money/states/visibility modules)
3. Settings (fields, validation) — before taps, which read the number
4. WhatsApp taps + flood guard
5. Gallery & images + prune check
6. Enquiries + PDF import
7. Dashboard readers
8. Pre-go-live checks: leak check (104), settings check (105)

**Done means:** a visitor on the showroom can do everything a buyer can do; the owner can run his whole business from the office; every number is read from the shared functions; and nothing on the public side could ever contain a cost (checked against the live address).

---

*Companion docs: `business-logic-implementation-plan.md` (the rules this implements), `system-model.md` (items A–L), `planning-close.md` (C1–C4, register), `product-overview.md` (the promise). The screens in `test-truespec-v2` are the input; nothing here changes UI/UX files.*