# Planning close — open items and stage status

**Planning stage: CLOSED, 2026-10-06** — by the owner's instruction: *"It doesn't need to be perfect,
note down every disagreement, and then close it."*

**Implementation stage: OPEN.** Screens are being wired now. They are rough, and that is fine —
they are the input to everything below.

Nothing in this file is a decision. It is the list of what is not decided, kept in one place so
nothing has to be hunted down later.

---

## The two stages

| | Order | State |
|---|---|---|
| **Planning** | business logic → functionality → UX → UI | closed |
| **Implementation** | UI → business logic → functionality → UX | in progress |

Planning and implementation are deliberately opposite in order. The UI is planned **last**, because
a design written before the rules exist has to be bent to fit them afterwards. The UI is built
**first**, because once the screens exist there is something concrete to write the rest against.

The data model and the system model are planned once, and then **re-refined during implementation
from what is actually on the screens**.

---

## The register

### A — Your decisions: A1–A3, A7, A8 decided 2026-10-08; A4–A6 answered in plan #6 §14 (you confirm with the "go")

| # | Open item | State |
|---|---|---|
| A1 | `ux-plan.md` Q44 — how fast a wrong sign-in slows down, and how many attempts one IP gets | **DECIDED (2026-10-08, proposal accepted):** delay starts after 3 failures — 1s → 5s → 15s → 30s, capped at 60s; an IP gets **10 failed attempts per 15 minutes**, then further attempts are logged and rejected for that window; **nothing ever locks**. See F |
| A2 | `ux-plan.md` Q53 — whether the dashboard needs a manual Refresh | **DECIDED (2026-10-08):** no manual refresh — focus-refresh is trusted. See F |
| A3 | `ux-plan.md` Q77 — whether taps need an alert beyond the badge | **DECIDED (2026-10-08):** no alert beyond the badge — one owner with a tab open. See F |
| A4 | `system-model.md` M115 — how long customer names and numbers are kept | **ANSWERED — plan #6 §14** (recommended defaults below): lost/no-contact deleted 12 months after last contact · open reviewed every 12 months · buyers 6 years. **Owner confirms with the "go"** |
| A5 | `system-model.md` M116 — whether the site tells visitors the retention period, or only the privacy notice | **ANSWERED — plan #6 §14**: yes — the privacy notice on the WhatsApp page states it before the tap. **Owner confirms with the "go"** |
| A6 | `system-model.md` M117–M120 — who in the office sees customer details, what deleting a customer leaves behind, data export, what the owner loses on exit | **ANSWERED — plan #6 §14** (recommended defaults below). **Owner confirms with the "go"** |
| A7 | Image storage — **Supabase Storage** vs **Sanity** (product-design stack said Sanity; functionality plan drifted to Supabase Storage 1 GB free) | **DECIDED (2026-10-08): Sanity stores images** (asset store + CDN, per the product-design stack). Written into data-model plan §1/§4. **The PDF clause originally recorded here is superseded by A8** — enquiry PDFs also live in Sanity |
| A8 | **Stack change — three owner rulings, 2026-10-08.** (1) **Supabase is out; Neon + Clerk are in** — Supabase caps free accounts at 2 projects, which TrueSpec cannot fit under. **Neon hosts Postgres (data), Clerk handles accounts/sessions (auth).** Sanity (images) and Vercel (hosting) unchanged — the stack is now four vendors: **Neon, Clerk, Sanity, Vercel**. (2) **Enquiry PDFs are stored in Sanity** — the owner's explicit ruling: not Supabase Storage (gone), not Vercel Blob, not database bytes; PDFs join the same vendor that already holds the images. (3) **The daily maintenance job** (data cleanup, image pruning, retention sweep) **runs as a Neon scheduled function** — same once-a-day behaviour, different carrier — **with Vercel's cron as the documented backup** | **DECIDED (2026-10-08)** — vendor names and carriers only. **No product rule changed:** sessions (12 h idle / 7 d cap), the C2 login delays, the listing gate, R3 per-line rates and the retention defaults all stand exactly as closed. The 7-day cap is Clerk's default setting; the 12-hour idle is enforced in the app ourselves, which is what the spec already required. Supersedes A7's PDF clause |

### A4–A6 recommended defaults — researched 2026-10-08, chosen to match what small businesses actually do

**The legal shape (Nigeria):** the NDPA 2023 has **no fixed number** — data kept only as long as the purpose needs (s.24(1)(d)), the controller must *inform data subjects of the retention period before collecting* (s.27(e)), and once the purpose ends, data must be securely deleted or irreversibly de-identified. Where no law sets a period, the NDPR-Implementation Framework suggests **3 years after last active platform use** and **6 years after the last transaction on a contract**, and the GAID says processing must end within **6 calendar months** of the purpose completing where no period is fixed by law. Cross-border (EU/UK) practice for the same businesses is shorter for prospects: **sales leads deleted/anonymised ~12 months after last meaningful contact**, buyers kept for tax/accounting (commonly 6–7 years). These defaults sit comfortably between the Nigerian minimum and the international norm for a single-showroom business far below the NDPC registration threshold (unverified).

| # | Recommended default (owner to confirm) |
|---|---|
| A4 | **Lost / Not-serious enquiries** (incl. open ones with no contact for 12 months): delete or irreversibly anonymise **12 months after last contact**. **Open enquiries:** kept while engagement continues, **reviewed every 12 months**. **Buyers:** kept as long as accounting/tax requires — default **6 years after the sale** (NDPR-IF convention; the exact figure is an accountant's question) |
| A5 | **Yes — the site tells visitors**, in the privacy notice carried on the WhatsApp page before the tap. Plain words: what is collected (name, number, car asked about, time), why (to respond and follow up on car interest), how long (open enquiries — 12-month review; lost — deleted after 12 months; buyers — accounting period, typically 6 years), and the right to demand deletion. This is the NDPA-compliant shape (s.27(e)) and it is what auto-industry privacy notices do |
| A6 | **Who sees customer details:** only the owner — v1 has no staff roles. **Deleting a customer leaves behind:** the enquiry card is gone; tap rows carry no name/number (page, car, time only); the car record is untouched; the deletion is logged in the activity feed. **Data export:** yes — a full one-click export from Settings (cars, costs, enquiries, activity, settings) as CSV/JSON, plus per-subject access on request. **On exit:** the owner keeps his export and the codebase; he loses hosting access and ongoing support — documented so nothing is a surprise |

The A4 defaults deliberately reuse the starting points already in `system-model.md` M115, now anchored in the NDPR-IF/GAID figures and the 12-month prospect norm from EU/UK automotive practice. **These were proposals on paper — they are now answered in plan #6 §14 and are confirmed by the owner's "go" on that plan.**

### B — Two files that do not agree

| # | The tension | What has to be settled |
|---|---|---|
| B1 | `truespec-product-design.md` H3 says *never render an unset price as a number — show "Price on request"*. `ux-plan.md` Q24/Q54 say *a car needs one photo and a price before it is listed publicly* | **CLOSED (2026-10-08) by C3:** a listed car is **always priced** — the gate (price + ≥1 photo, BL §6.2) means a public page can never have an unset price; H1/H3 scope down to office drafts |

### C — Settled by you earlier, not yet written into the model

These are not disagreements. They were ruled on in conversation and never landed in a file. They get
written in properly during the implementation pass, where they can be checked against the real
screens rather than against a plan.

| # | Settled decision | Where it should land | Where it is open today |
|---|---|---|---|
| C1 | Session length: **12 hours, or 7 days.** The 7-day cap is Clerk's default setting (A8); the 12-hour inactivity timeout is enforced by the app itself | `system-model.md` J86 | **landed** — FUN §2.3, DM §2 (`session`), plan #6 §11 |
| C2 | Abuse control: **growing delay plus a per-IP limit, never a lockout**, with a rate-limited logger; the same shape guards the WhatsApp tap | `system-model.md` J90, K97–K99 | **landed** — FUN §2.4/§5.3, DM §2 (`auth_attempt`), plan #6 §11–12 |
| C3 | Visibility gate: **one photo and a price before a car appears publicly** — otherwise it stays a draft the office can work on | `truespec-product-design.md` — the UX plan itself says the rule belongs there | **landed** — product-design gate paragraph, BL §6.2, plan #6 §3; closes B1 |
| C4 | Dashboard money wording: **"still building", never "excluded"** | `truespec-product-design.md`, under the incomplete-costs rule | ✅ written in, 2026-10-06 |

### D — A file that disagrees with your reading of it

| # | What you said | What the file says |
|---|---|---|
| D1 | "We planned our system model." | `system-model.md` states: *"every item below is unworked, except the eight marked **[settled]**."* That is 8 answered out of 120. **Two readings:** (a) the model is planned because the *structure* — the questions, their order, their dependencies — is settled, and only the answers are pending; or (b) it is not planned yet. The implementation pass is where the answers get written either way, so this does not block closing planning — but the status line should say whichever one you mean. |

### E — A correction I owe you

| # | What I claimed | What I found when I checked |
|---|---|---|
| E1 | That your UI-plan edit had left `ux-plan.md`'s pointers into `ui-plan.md` pointing at answers that say something different | **Spot-check found no break.** `ui-plan.md` still carries all 95 answers in order, and the pointers I tested still resolve: Q3 is still the favicon/share image, Q59 is still the state editor with the disabled delete button, Q75 is still the command palette. I withdraw the claim unless you show me a specific pointer that is wrong |

### F — Decided 2026-10-08, owners' proposals accepted wholesale

| # | Decision | The chosen value |
|---|---|---|
| F1 | What happens to the uploaded enquiry PDF after a confirmed import | **Kept**, linked to the import, deletable by the owner (from the functionality plan) |
| F2 | Password recovery for the one admin | **No in-app reset** — recovery via the database, stated in settings |
| F3 | Image processing in v1 | **None** — serve original uploads, cap upload size; downscaling flagged for the data-model pass |
| F4 | The A1 numbers (login abuse) | Delay from 3 failures: 1s → 5s → 15s → 30s, capped at 60s; **10 failed attempts per IP per 15 min**, then logged + rejected for the window; never a lockout |
| F5 | The A2 number (dashboard refresh) | No manual Refresh — focus-refresh is trusted |
| F6 | The A3 number (tap alert) | No alert beyond the badge |

A1–A3 above are now answered and point into F4–F6; A4–A6 carry research/reasoning-based recommendations and stay **owner-to-confirm** (confirmed at the system-model pass).

---

## What happens when the screens are ready

Six implementation plans, all written **from the screens**, in the build order.

| # | Plan | Written by |
|---|---|---|
| 1 | **UI implementation plan** — what the wired screens actually are | you / the designer |
| 2 | **Business logic implementation plan** — schema, money, counting, states, visibility, reference codes, checked against the real screens | this role |
| 3 | **Functionality implementation plan** — auth, CRUD, gallery, images, WhatsApp, enquiries, dashboard, settings | this role |
| 4 | **UX implementation plan** — dialogs, focus, toasts, undo, offline, failure wording | you / the designer |
| 5 | **Data model implementation plan** — refined from what the screens actually store | this role |
| 6 | **System model implementation plan** — refined from what the screens actually request, and the place where register items A4–A6 and C1–C3 get answered | this role |

**The test on all six: do they still sync?** UX and UI are downstream of the rules, not the other
way round. When the screens and the rules pull apart, the rule wins and the screen changes.

**Planning products in play:** `truespec-product-design.md` (product model), `system-model.md`,
`ui-plan.md`, `ux-plan.md`, plus the data model held in `truespec-product-design.md` and the
original brief.

---

## Change log

| Date | What changed |
|---|---|
| 2026-10-06 | File created. Planning marked closed per the owner's instruction; register of open items A1–A6, B1, C1–C4, D1, E1; six implementation plans listed with owners. |
| 2026-10-08 | A1–A3 decided (proposals accepted); A4–A6 given research-based defaults, owner to confirm; F1–F6 recorded (decided 2026-10-08); UX implementation plan (#4) landed from the designer; A7 added then **decided: Sanity stores images** (owner ruling 2026-10-08); data-model plan (#5) written; **system-model plan (#6) written, A4–A6 answered there, B1 closed by C3, C1–C3 landed.** |
| 2026-10-08 (later) | **Owner's stack rulings folded in as A8:** Supabase out — **Neon (data) + Clerk (auth/sessions)** in; **enquiry PDFs to Sanity** (supersedes A7's PDF clause); the **daily maintenance job to a Neon scheduled function**, Vercel cron documented as the backup. Vendor names updated across the TrueSpec planning docs; C1's free-tier rationale replaced with Clerk's default 7-day cap. **No decision reopened — product rules stand.** CryptoPilot docs untouched (separate project). |
