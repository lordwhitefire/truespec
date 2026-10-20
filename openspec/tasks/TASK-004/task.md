# TASK-004 — Functionality. Layer 4 of 6.

**Written 2026-10-14.** A plan, not instructions: it says what must be true and what must not happen,
names the choices that belong to whoever builds it, and leaves the rest open. Its twin is `testing.md`
in this folder, written for a session that did not do the building.

**Where the requirements live:** `openspec/changes/truespec-architecture/specs/*` (binding — showroom,
office-access, inventory, money, media, enquiries, office-settings, dashboard), `design.md` (D2, D3, D4,
D7, D8, D9, D11, D12, **D13, D14**), and `tasks.md` §4.1 and §6.1–**6.11** (this layer's work items). The data
layer's authority still binds every write here: `openspec/tasks/TASK-003/key-and-hash-v1.md` — the
change-check is made by the server, never sent by the browser. The plans in `product-management/` are
**read, not trusted**, and never edited; where one disagrees with a spec, the spec wins and the
disagreement is logged.

---

## Why this layer exists

The office looks finished and saves nothing. Every screen in it either reads the store through the
office read layer, or draws a hardcoded seed; every button on them is decoration. Nothing can be signed
into, nothing can be created, changed, deleted, uploaded, imported or exported — and the whole office is
reachable by anyone who types its address.

This is the layer that turns the drawing into the product: **the door, and every write behind it.** After
it, the owner signs in, and what he types becomes a record — a car, a photo, a cost, a state, an enquiry,
a setting — with the same rules the store already enforces, and with nothing deleted, invented or leaked
on the way.

---

## Where the layer stands today (grounded 2026-10-14)

**Already built and read from the store.** The office read layer (`lib/office.ts`) and the shared rules it
stands on — `lib/money.ts`, `lib/counts.ts`, `lib/sections.ts`, `lib/refs.ts`, `lib/sale.ts`,
`lib/change-check.ts`, `lib/serialize.ts`, `lib/sanity.ts`, `lib/config.ts`. The dashboard, the inventory
list, the car form's shared fields and Settings' car-state counts already read the store. `lib/**` tests
pass 64/64 and `tsc --noEmit` is clean as this layer opens.

**Drawn from a hardcoded seed, reading no database at all.** The enquiries board, the activity log, the
two Settings state editors (with `state-seeds.ts`, whose colours are now stale against the registry), and
the login screen — whose "sign in" is `window.location.href = "/office"` and whose "forgot password" is a
dead `#`.

**Nothing writes, and nothing is guarded.** No Server Action, no Route Handler, no `app/api/`, no
middleware, no session check on any office route. The office shell prints **"Signed in as Umar"** for a
user who does not exist.

**The store is ready and waiting for exactly this layer.** `office_user`(id, email — 0 rows) ·
`session`(user_id, created_at, last_seen_at, expires_at, clerk_session_id — 0 rows) · `auth_attempt`(ip,
at, ok — 0 rows) · `activity_event`(kind, subject, at, actor_id — 0 rows) · `tap`(page, car_ref, at — 0
rows) · `setting`(key, value — three rows: `whatsapp_number`, `tagline`, `full_tank_default`) · both state
registries (five each, with colour, order and section) · `car` with its fourteen editable columns, its
change-check pair and its ref defaulted from the sequence · `enquiry` with `asked_for`, `handle`, its
change-check pair and its `enquiry_pdf` link · `enquiry_pdf`(sanity_asset_id, filename, rows_total) ·
`car_photo`(sanity_asset_id, position, origin) · `cost_line`(car_id, kind, amount_minor) · `sale`. The
identity lock's two triggers and the uniqueness the filler relies on are in place.

**The identity provider is not installed.** There is no Clerk client in the project, and the Clerk keys in
`.env.local` are well-shaped **placeholders** — Sanity's are real (TASK-003 uploaded the fleet to them),
Clerk's are not. `.env.local` never enters the repository; it is the owner's file.

**And one carried obligation, measured at TASK-003's gate:** a first, cold visit to a store-reading page
can return an error page (500) instead of the page. That is the network's cold start, but the code-side
half — *a transient blip must not become an error page* — belongs to this layer's screens.

---

## What must be true

1. **The office has exactly one door, and the server holds it.** Every office page and every office data
   request is checked on the server against an active session — the request is refused, not the link
   hidden. After sign-out every page and action refuses the old session, including a tab left open. Six
   things must be true together: there is exactly one account — the owner's own — and **no public sign-up
   path exists at all** (the provider is put in its invite-only mode, so the only account is the one the
   owner creates, by hand, once); **the provider carries the sign-in** (owner ruling 2026-10-14), so the
   office builds no password form and holds no password material; a failed attempt is answered by the
   provider, the office adds no message of its own and never echoes the account's identity back, and probing
   which identifiers exist is rate-limited by the provider's bulk protection (the *concealment* limit — why
   this is not absolute — is recorded in the spec and in design D4); a session is valid only while
   `now < expires_at` (7 days) and idle
   no more than 12 hours, judged from the application's own `session` row, so no paid vendor feature decides
   it; the session cookie is `HttpOnly`, `SameSite=Lax`, `Secure`, with no "remember me" that outlives the
   7-day cap; and every office route still verifies the session on the server, on the request itself. There
   is **no in-app password reset flow**: Settings says, in words, that recovery is an identity-provider
   operation, so the owner knows the route before he needs it.
2. **Abuse control is the provider's, and its lock clears itself.** Repeated failed sign-ins are limited by
   the identity provider: the account is locked after **10 failed attempts**, for a **bounded period that
   clears itself** — the owner's own words, 2026-10-14: *ten attempts, thirty minutes, not indefinite* — and
   the provider's per-address rate limits stay in force, with bulk user-enumeration protection on. The lock
   clears itself with no support action, no ticket and no state anyone has to clear by hand, so the real
   owner is never shut out for good. **Because the office never sees an attempt, it applies no per-attempt
   rule of its own** — no delay sequence, no per-IP window, and no `auth_attempt` row written by us (the
   table's purpose is now an open consequence, see design D4).
3. **Every change the owner makes is a POST with its origin verified, and no GET ever changes anything.**
   Writes arrive through Server Actions. A Route Handler is used only where something other than a form
   must post — a buyer's tap, the export download, the PDF upload — and each such handler carries the
   same explicit origin check. A crafted URL that would change data if it were a GET changes nothing.
4. **A car is created, changed and removed through the form the office already shows, and the store is the
   single truth.** The form offers every editable column it is meant to own — including the **private
   note** and the **crossed-out "was" price**, which the showroom already displays and the form does not
   yet offer. On save: the car appears in the office immediately and, if it passes the listing gate
   (price and photo), in the showroom immediately. The profit figure beside the form updates as the owner
   types and is labelled "estimated" until the car has landed. A malformed amount cannot save and is
   caught at the field. **A car is never saved without a state** — a car with no state has no section, and
   nothing may invent one. The `TS-####` reference is given once by the store, never chosen, never edited,
   and never reused after a car is deleted.
5. **Sold is a primary state, and setting it is what performs the sale.** It is a **state first** and an
   action follows from it: the moment a car is set Sold the sale is recorded — a sale price and a date — and
   the car takes itself out of the showroom entirely, sits in Sold/Archive, stays in lifetime totals and out
   of stock counts, and moves profit from projected to real. Un-marking **reverses or voids the sale record**
   and returns the car to its **previous primary state**, its secondary states untouched, with no stale
   real-profit residue anywhere.
6. **Deleting is a tombstone the owner clears, and nothing is ever deleted for him.** Deleting requires
   confirmation and offers undo within **8 seconds**; undo restores the car byte-for-byte with its photos,
   costs and state. After the window it is a tombstone: hidden from every read, and listed as waiting to be
   cleared. **Removing it for good is the owner's action** — his hand, whenever he chooses — and that
   removal takes its photos, cost lines and sale row with it and clears its stored images, leaving no
   orphan. No job, rule, script or clock removes it: not for age, not for tidiness, not at any interval.
   The two exceptions the owner already settled are the machine's own litter (assets no record ever
   referenced; `auth_attempt` rows past 90 days) and they belong to the daily job in TASK-006 — **this
   layer adds no third exception and removes nothing.**
7. **Images: the bytes go first, the row second, and a missing asset shows a placeholder.** Assets upload
   to Sanity independently of the car; the rows link on save, so a car is never saved pointing at bytes
   that were never uploaded. Cover is position 0; reorder and set-cover hold. A photo's `origin` records
   where it came from — `owner upload` for anything the owner supplies. The asset-reference column never
   holds a web address. EXIF is stripped at the write boundary and a size cap is enforced, so no
   derivative pipeline exists and no oversized original is stored. When an asset is missing or the asset
   store is briefly unreachable, the page renders the placeholder rather than breaking.
8. **A tap is three facts and no person.** A buyer's WhatsApp tap records the **page, the car's reference
   and the time** — nothing else: no name, no number, no message, no address. The privacy notice is shown
   on the way to WhatsApp, **before** the tap. The tap is recorded by the application and the buyer then
   continues to WhatsApp as before. The office surfaces taps as a count badge and a recent list — never a
   popup, an alert or a sound. The badge counts **the taps since the office last looked**: opening the
   full tap list marks them seen, the figure clears, the glyph stays so the list keeps its entry point,
   and a tap arriving afterwards counts as new again — the mark is written by a POST, so no GET changes
   data, and it is taken from a tap the store actually holds and can only move forward (design D21).
9. **An upload lands as a draft, and a draft is not a record.** A file uploaded to create cars or
   enquiries is read, and what it carries becomes **drafts** — one per record the file holds, in a holding
   place of their own. **Nothing enters the `car` or `enquiry` table until the owner saves it**, so the
   board, the counts, the section lists and the showroom need no filter to keep a draft out — they never
   see one. A draft holds only what the file carried and what the owner put into it: **nothing is inferred,
   defaulted or invented**, exactly as no value may be invented for a record. The record's own rules (its
   required fields, its state, a well-formed amount) are enforced **when the draft is saved**, never at
   upload, because a draft is allowed to be incomplete. A draft that cannot be read is **explained and
   named, never silently dropped**, and saving one draft creates one record and leaves its brother drafts
   untouched. Four consequences follow, and each must hold:
   - **The `TS-####` and the change-check are given at the save, never at the upload.** A draft carries no
     reference code, no `content_hash` and no `hash_version`. The code is given once and never reused, so a
     draft that took one and was abandoned would burn that number for good; a draft that is never saved
     consumes nothing and disturbs no sequence. A draft also **sits in no state and occupies none** — it may
     hold the state its file named, applied at the save, but a waiting draft never blocks a state's
     deletion, and if that state is gone by the time the draft is saved the owner is asked to choose.
   - **A draft waits for the owner.** No job, rule or clock removes it, exactly as nothing else of his is
     removed for him.
   - **Images are put on by hand, after the values.** A template carries values and not pictures, so a draft
     arrives with its fields filled and its images empty, and the owner adds them himself before saving. A
     draft's images are referenced by the draft — the image store's "no row ever referenced it" clearance
     applies to assets **no draft and no record** ever referenced — and on save they become the record's
     photo rows, cover at position 0 (truth 7).
   - **The blanks are ours, and they sit where the upload happens.** The car's template — its fourteen
     editable details — is a PDF; the enquiry's file carries its five editable details (name, number, what
     they asked for, note, and the state), because five fields need no made-up form. **A file carries the
     record's editable fields and nothing else** — nothing beyond them is read, inferred or filled in — and a
     file that is not the format we expect is refused with a reason the owner can act on.
10. **Both registries are the owner's, edited live, and the store refuses what it must.** For **car** states
    he can add, rename, reorder and recolour — but only **secondary** states: the **four primary states
    (Available, On Order, Landed, Sold) are not his to add to, rename or delete**, they are what the showroom
    groups by, and a **secondary** state needs no section and sets no new-arrival flag (those belong to the
    primary states, which are fixed). Two states cannot share a name, across both kinds; a state a car
    carries cannot be deleted — refused by the store itself, with the reason shown. Buyers see only the three
    primary-state names — Available, On Order, Landed — never a label of his. **Enquiry** states are the same
    kind of thing and no
    more: adding, renaming, reordering and removing them is his, and **giving an enquiry any state at any
    time is legal** — nothing requires one state to come before another, and setting an enquiry to Sold
    changes nothing about any car.
11. **Every figure on every screen comes from the one shared rule, and a write cannot make two screens
    disagree.** A changed cost or price recomputes total cost and profit everywhere they appear, with no
    figure frozen at entry and no per-screen arithmetic. Counting stays one function; section mapping
    stays one function; money stays one function. The dashboard keeps its fixed shape whatever the owner
    configures, carries an explicit reach line on every money total ("from N of M cars"), keeps the "still
    building" line when costs are incomplete, and refreshes when the tab regains focus — there is no
    Refresh control.
12. **Settings save for real, and the WhatsApp number cannot be saved wrong.** Settings holds exactly: the
    WhatsApp number, the tagline, the full-tank default (a form prefill only) and password change, plus
    the export action. The number is validated inline before it saves, because a wrong one silently kills
    the showroom's primary action. The password is the provider's: changing it is delegated, and **no
    password material exists in any application table**. Operational notices the owner needs — storage
    usage past a threshold, backup status — appear in the office, because there is no mail channel.
13. **The export is the owner's exit and it is complete.** One action produces everything the system holds
    — every car with its costs and photos, every enquiry, every tap, every activity row and every setting —
    and it is **one download, not two**: a single **ZIP** archive holding **`master.json`** — a
    machine-readable master that keeps the shape of the data (a car's cost lines and photo list nested
    where they belong) — and **one CSV per subject** — cars, costs, photos, enquiries, taps, activity,
    settings — rather than one combined sheet, which could not hold a car (costs and photos) and a tap
    (neither) without most of its cells empty. It also carries a short **`README.txt`** naming what is
    inside and when it was made, and it is **not an Excel workbook** — one vendor's file that flattens the
    nesting. A file the owner already holds contains everything the product knew, and the export is
    reachable **only from inside the office** — never a public path.
14. **The change-check is the server's, on every write.** `content_hash` and `hash_version` are computed by
    the application from the record's stored editable values and stored with the row; a value arriving from
    a browser is never trusted as the hash. Nothing can change `car.id`, `car.ref` or `enquiry.id` — the
    store's trigger refuses it — so every write path must leave a record's identity alone and let the guard
    stand.
15. **The office screens show the store, not a seed.** The enquiries board, the activity feed, the two
    state editors and the dashboard's taps/activity panels all read real rows. Where a screen has to group
    or order by a state, it does so from the registry, in the registry's order.
16. **A blank or blinking store must not become an error page.** A transient failure reading the store must
    surface as a clear, retryable state — never a fabricated figure, never a silent empty list that looks
    like real emptiness, and never a bare 500. The *wording* of that state is TASK-005's; the page not
    breaking is this layer's.
17. **A car's state comes in two kinds, and one of them is mandatory** (owner ruling 2026-10-14; design
    **D15**). Every car sits under exactly one of exactly **four fixed primary states — Available, On Order,
    Landed, Sold** — and under no other; the four are **not the owner's to add to, rename or delete**. Beyond
    that, a car may carry **any number of secondary states** — the ones the owner creates for his own
    tracking. A car may carry none; a car can never carry a secondary state without its primary one. The
    **showroom reads only the primary state**: its three groups are three of the four — Available, On Order,
    Landed — and **Sold is never shown**. A secondary state never reaches a public page and never changes a
    public count. This **revises the older decision that "sold" was only a flag** (D6); the sale record still
    holds the money facts (price, date, profit), and un-marking a sale returns the car to a non-Sold primary
    state, logged.

---

## Constraints — what must not happen

- **No rule bends to fit the data, and no read point drifts in silence.** Writing through the office will
  move the demo fleet's figures — that is expected. What must hold instead is that the office and the
  showroom **agree** and that every figure comes from the one shared rule. A number that moves for any
  other reason is a data change, named and logged.
- **Nothing is deleted on the owner's behalf — ever.** No job, rule, script, seed or write path removes a
  record, a file or an asset on its own initiative: not for age, not for tidiness, not at any interval.
  The store's and the screens' obligation is to make the owner *able to act* — and to list what waits to be
  cleared. The only two exceptions are the machine's own litter, both settled by the owner on 2026-10-13
  (assets no record ever referenced; `auth_attempt` rows past 90 days); both belong to TASK-006's daily
  job, and **this layer adds none**.
- **No invented data inside the system.** The application must never fill in, guess, default or spread a
  value the owner did not enter — no placeholder price saved as a number, no state conjured for a car that
  has none, no section chosen to make a screen work, no hash accepted from a caller. A seed may author
  content; the application may not.
- **Car records and customer records stay separate.** Nothing joins an enquiry to a car; no car row is
  created, changed or implied to make an enquiry fit; an enquiry's "what they asked for" is only ever what
  the owner typed or imported, in the customer's own words. Marking an enquiry sold changes no car.
- **States are labels, not stages.** No screen, rule, job or write may assume a pipeline: no state requires
  another to come first, no order is enforced, no progression may be implied or required, and a car or an
  enquiry may take any of its states at any time.
- **The public boundary is untouched.** `lib/serialize.ts` remains the only public path. No public
  response may contain a cost, a profit, an asset reference, a customer detail or an office state label.
  The listing gate holds: no price or no photo means **not yet listed**, absent from every public page,
  count and link. (This state was called "draft" in earlier text; "draft" now means only the staged row an
  upload produces, per truth 9 — see Conflict 9.)
  **The write path must never accept a money value, a hash, an asset id or an identity from a public
  request**, and the leak check must still pass with the writes in place.
- **No secret in the repository.** The Clerk and Sanity details live in the environment; the placeholder
  values in the repository stay placeholders, and `.env.local` is the owner's file — never invented, never
  committed. Supply from the owner, not from a guess.
- **No GET changes data, and no write skips the origin check** — including the tap and the export
  download.
- **The migration ledger must not lie, and no new table appears without a requirement needing it.** An
  applied migration is never edited. If this layer needs a schema change it is forward-only, concern-sized
  (continue at `0020…`) and justified by a requirement — not by convenience.
- **The application's own rules, not a vendor's plan tier.** Session lifetime is enforced by our code, so no
  paid feature of any provider may be load-bearing for it — and the provider's invite-only mode, which is
  what makes "exactly one account" true, is free on any plan (its allowlist, which needs a paid plan in
  production, is therefore not used).
- **TASK-005 owns the polish.** This layer lands the behaviour — the confirmation, the 8-second undo
  window, the inline validation, the empty states' existence, the page not breaking. Focus handling, toast
  ordering and wording, the offline indicator, the gold-vs-red attention wording and the per-width
  interaction split are TASK-005's, named here so neither layer silently assumes the other did them.
- **`product-management/` is never edited.** Stale documents are flagged; the known ones stay flagged for
  TASK-007.
- **Nothing is bent to fit a screen.** Where a screen and a requirement disagree, the requirement decides
  and the disagreement is written down with its winner.

---

## The data is demonstration data (owner ruling, 2026-10-13)

Everything in the store today is demonstration content that we wrote, and it stays that way: the fleet is
the only fleet there is for now, and the store is rebuilt, never left empty.

Two consequences that land squarely in this layer, because this is the layer that starts writing:

- **Anything the application creates while the demonstration is the fleet is demonstration data.** A car
  the owner adds while trying the office out, an enquiry he imports to see the import work, a tap from our
  own testing — each carries the demo marker (`is_demo`) like the seeded rows do, so the one-move wipe
  still clears the whole demonstration and nothing of the client's. Nothing this layer writes may slip in
  without it.
- **The wipe must cover everything the writes leave behind**, or "removable in one move" stops being true
  the moment the office starts saving: every demo car (its photos, costs and sale go with it), every demo
  enquiry together with its imported PDF row **and the file behind it**, the taps whose ref is a demo car,
  the activity rows naming a demo car, and the demo assets themselves. Nothing else is touched.

The application's own honesty rule is untouched by this: the seed may author, the application may not.

---

## Questions this layer put to the owner

1. **The identity provider's keys.** **Answered 2026-10-14** — see Round 1 below. Clerk, linked to the
   owner's own application, installed with Clerk's CLI.
2. **The export's shape — answered 2026-10-14 (owner asked for best practice; ruling written in).** One
   action produces **one download** — a single archive — holding a **machine-readable master** that keeps
   the shape of the data (each car's cost lines and photo list nested where they belong) and **one
   human-readable table per subject** (cars, costs, photos, enquiries, taps, activity, settings), never one
   combined sheet, plus a short readme naming the contents and the date. The reasoning: one action leaves
   nothing behind to remember; the master keeps the shape a flat table cannot; and one sheet per subject
   exists because a car carries costs and photos while a tap carries neither, so a combined sheet would be
   mostly empty cells with columns that mean nothing. The export is reachable only from inside the office
   and appears on no public path. *(Truth 13, build list §6.10, specs/office-settings.)*
3. **The PDF the import reads — answered 2026-10-14.** The owner's word: **"the PDF must have all the
   editable fields in the enquiry"** — so the file carries the record's editable fields and nothing else.
   For the **car**, fourteen (brand, model, trim, year, exterior colour, interior colour, mileage, features,
   the note, the private note, the was-price, the arrival note, the doorstep price, the state); for the
   **enquiry**, five (name, number, what they asked for, note, and the state) — the same lists the
   change-check already treats as editable (`lib/change-check.ts`), which is where the counts came from, not
   from a form. Nothing beyond those fields is read, inferred or filled in, and a file that is not the
   expected format is refused with a reason the owner can act on. Two consequences follow: the **counts sit
   either side of the owner's five-field line** — the car's fourteen put it over (its template is a PDF); the
   enquiry's five do not — and the **state a file names is applied at the save**, because a draft sits in no
   state and occupies none (truth 9, design D13). *(Build list §6.11, specs/inventory, specs/enquiries.)*
4. **What replaces the delay schedule and the per-IP window — answered 2026-10-14.** The owner ruled: **the
   provider's own lockout, after 10 failed attempts, for 30 minutes — not indefinite.** So the provider's
   abuse control is taken as it comes, with two limits that must hold: the lock is **bounded and clears
   itself** (no support action, no ticket, nothing anyone clears by hand), and the provider's per-address
   rate limits and bulk enumeration protection stay in force. The application applies no per-attempt rule at
   all, because it never sees an attempt. See truth 2 above; the office-access spec and design D4 were
   rewritten to say exactly this.
5. **The review cadence — answered 2026-10-14.** Continuous build with **three checkpoints**: after the
   door, after the car's life together with the registries, and at the end. The reasoning the owner
   accepted: the door is the risky hinge — nothing is safe to demonstrate while the office is open to
   anyone — and the car's life with the two registries is the biggest slice, so the owner looks at a
   **working demonstration at each checkpoint** before the work carries on, rather than at one reveal at the
   end. *(§Process below.)*
6. **Who runs the Clerk setup — answered 2026-10-14.** The work is split at the account line: the **owner**
   does what touches his account — installing (or updating) the CLI and signing in to it — and the
   **builder** runs `clerk init` against the application, the config patch, `clerk doctor`, and wires the
   code. His keys never pass through the builder's hands and the account stays under his control — which is
   also what Round 1 item 1 already required. *(§Process below.)*
7. **Where the sign-in lives — not a new choice: the architecture already fixes it (confirmed
   2026-10-14).** The office-access spec requires the sign-in to be the identity provider's own,
   **"mounted in the office"** (*The identity provider carries the sign-in*), and build-list §4.1 says the
   same. So the provider's embedded sign-in sits at **`/office/sign-in`** inside the office's own shell, and
   **`/office` sends a visitor there when there is no session** — never the provider's separately hosted
   page. The route's name is fixed in §Process step 1; no spec change was needed.
8. **The export's file format — answered 2026-10-14.** One **ZIP** holding `master.json` — the
   machine-readable master, nested (each car with its costs and photos) — **plus one CSV per subject**
   (cars, costs, photos, enquiries, taps, activity, settings) and a short `README.txt` naming the contents
   and the date. Reason: anything can open it, nothing needs Excel, and the nesting survives — which is what
   makes the export provable as complete. **Not** an Excel workbook, which is one vendor's file and flattens
   the nesting. *(Truth 13, build list §6.10, specs/office-settings.)*

*All eight are answered, so nothing in this layer waits on a ruling. Questions 3 and 8 shape build steps 7
and 8; questions 5 and 6 shape how the work is handed over (§Process).*

### Round 1 — the owner's answers (2026-10-14)

1. **Clerk, linked to the owner's own application, set up with Clerk's CLI — and Clerk does the sign-in,
   not the office** (owner ruling, 2026-10-14, superseding the earlier reading in which the office's own
   form would be the door). **Taken from the runbook:** the CLI installed (or updated) and signed in by the
   owner; `clerk init --app app_3KfevzKd9JdCG86xfx301JYsTuU` run against this project — the SDK install,
   the provider, the proxy/middleware with the matcher including `/__clerk/:path*` after `/(api|trpc)(.*)`,
   and the keys reaching the environment file; and `clerk doctor` as the check that follows.
   `ClerkProvider` sits inside `<body>`, never around `<html>`, and `auth()` is awaited (Next 15). **The
   environment file is never read into a log, never printed and never committed** — a key that reaches a
   terminal is a key to rotate, and `.env.local` is the owner's to edit.
   **"One account, no public sign-up" — checked against Clerk's own documentation on 2026-10-14, and it is
   possible.** The application is put in **Invite-only** access mode (Dashboard → Access mode; the API
   value is `sign_up_mode: "restricted"`, settable from the CLI with `clerk config patch` rather than by
   hand). Clerk describes that mode as *"user access is controlled by the application admin(s)"*, with users
   added by invitation, enterprise connection or manual creation; in it the `<SignIn />` component **keeps
   its sign-up prompt hidden by default**, and `<SignUp />` is reachable only through a valid invitation.
   It is free on any plan — which decides the choice. The alternative, Open mode plus the **allowlist**
   holding the owner's address, was rejected because Clerk's allowlist **requires a paid plan in
   production**. So: the owner's account is created once, by him, as the application's only user, and no
   public registration path exists at all. **The owner has already applied it himself (2026-10-14, his own
   word): the application is in invite-only mode.** So this is a state to verify, not a step to perform —
   and if it is ever found back in Open mode, that is a regression, because the office's whole account rule
   rests on it. The runbook's sign-up controls and its "sign up as your first test user" step are therefore
   **not** followed as written.
   **Also worth knowing, from the same reading:** Clerk's **Device Trust** is on by default for
   applications created after 2025-11-14, so a password sign-in from a **new device** will ask for an email
   code as a second factor — harmless for one owner, but it means he needs access to that mailbox to sign
   in somewhere new. And Clerk's own protections include an **account lockout** — which the owner ruled on
   2026-10-14 to **keep, set to ten failed attempts and thirty minutes, not indefinite** (see truth 2 and
   question 4) — plus per-address rate limits on its sign-in API, which stay in force. The office-access
   requirement that mattered here (the real owner is never shut out for good) is met by the lock being
   bounded and self-clearing rather than by there being no lock at all; the residual cost is that he cannot
   sign in during those thirty minutes, which he accepted.

---

## What the dev asked at handover — eleven questions, all answered (owner rulings 2026-10-14)

These were raised by the dev reading this plan before starting. They are answered here so the build begins on
a settled plan; each is carried into the design and the specs, and the two that change the store belong to
build step 2.

1. **The two loose ends in the schema — both left alone (D20).** (a) `activity_event` gains **nothing**: the
   writer records the action's `kind` and puts the car's `TS-####` in `subject`, and no new typed column is
   added — a column needs a requirement, and none asks for one. (b) `auth_attempt` is kept **exactly as it
   is**: the daily job's 90-day rule survives, and the table is a harmless no-op because a provider-carried
   sign-in never passes through our server. Removing it was declined — it would cost a forward-only migration
   plus edits to `specs/media` and TASK-006's plan, for no behaviour gained.
2. **The draft table's shape, and where uploads are worked — one table (D16).** Columns: `id`; `kind`
   (`car`|`enquiry`); `batch_id`; `source_filename`; `source_asset_id`; `values` (jsonb, the record's
   editable fields); `image_asset_ids` (an **ordered** list — index 0 is the cover); `state_label` (nullable —
   a **name**, never a state id); `is_demo`; timestamps. **Images live on the draft's own row, not in a second
   table** — D13 promised one new table. "Create from file" sits on the office inventory and enquiry screens,
   the car template downloads there, and all drafts are reviewed at **`/office/drafts`**. Drafts carry the
   demo marker, so the wipe clears them.
3. **Our session row is created lazily (D17).** The first office request carrying a valid provider session
   upserts one row, keyed by the provider session id on the unique column that already exists. No webhook, no
   callback route, no new public endpoint, no signing secret.
4. **The photo size cap is 15 MB.** Truth 7 said "a cap" and never gave the number; the number now lives in
   `specs/media`.
5. **A valid WhatsApp number is a Nigerian mobile (owner ruling).** `+234…`, `234…`, or `0…` is accepted and
   stored **normalised to `+234…`**, digits only — because the `wa.me` link the tap button builds only
   resolves when the number holds one shape. Anything else is refused inline with a reason, and the previous
   number stays active.
6. **A transient store failure is caught by one shared guard (D18).** One server-side guard around every store
   read, one retryable-state component, and route-level error boundaries behind it — on the office **and** the
   public showroom. Never a 500, never an invented figure.
7. **Both operational notices are read from setting rows (D19).** Storage-past-threshold and backup status are
   settings the office only displays: `last_backup_at` (written by the daily job — TASK-006's work) and a
   storage-warning figure, default **4 GB**. This layer reads; TASK-006 writes. No new table, and no live
   storage computation from Sanity.
8. **The retention numbers are confirmed as written.** An enquiry becomes due for the owner's decision **12
   months** after it was recorded; a buyer's record is kept **6 years** after the sale. The office notifies;
   the system never deletes customer data on its own. (This closes the last open question in the design.)
9. **A car's secondary states are kept when it is marked Sold (D15 f).** Only the **primary** state becomes
   Sold. Un-marking returns the car to its previous primary state **with its labels intact** — nothing is
   cleared, so nothing has to be undone.
10. **The demo fleet's mapping (D15 g).** Available → primary Available; On the way / At port / Cleared →
    primary **On Order**, the old label kept as a **secondary**; Landed → primary Landed. The showroom looks
    exactly as it does now. Plus **at least one car carrying a secondary label and one car Sold**, so both new
    behaviours are visible. The builder performs this in the state-model migration and seed (step 2).
11. **The wording clash is corrected, and the rule behind it is the owner's own.** Truth 5 now reads **"Sold
    is a primary state, and setting it is what performs the sale"** — the owner's words: *"it is a state
    first, you set it, then an action occurs."* The rule keeps its force (the money stays on the sale row;
    un-marking returns the car to its previous primary state, logged). Logged as part of **conflict 11**, not
    silently rewritten.

## Process — how to work it

- **Build in this order, because each step needs the one before it:**
  1. **The door** — the provider installed and linked, its instance put in invite-only mode so no public
     sign-up path exists, the owner's one account created, Clerk's own sign-in mounted as the office's door,
     the session row and its cookie, the server-side session check on every office route, sign-out. The
     provider's sign-in is **mounted in the office at `/office/sign-in`**, and `/office` sends a visitor
     there when there is no session (question 7 — the spec already requires it mounted in the office). The
     provider's own bounded lockout and per-address limits are the abuse control (question 4, answered).
     **This step's division of labour is the owner's ruling (question 6):** he installs (or updates) the CLI
     and signs in to it, because that touches his account; the builder runs `clerk init` against the
     application, the config patch, `clerk doctor`, and wires the code. All eight of this layer's questions
     are answered, so nothing here waits on a ruling. **Stop here and demonstrate** — nothing else is safe
     to show while the office is open to anyone.
  2. **The state model** (owner ruling 2026-10-14, design **D15**) — **the store's state shape is settled
     before anything writes or reads a car**, because a car cannot be created without a primary state and
     "sold" stops being only a flag. This step is the store's change and the read paths that follow it:
     `car_state` distinguishes the two kinds; the **four primary states — Available, On Order, Landed,
     Sold — are fixed** (not addable, renamable or deletable, unlike the owner's **secondary** states, which
     are his to create); a car's **primary state is mandatory** (today `car.state_id` is nullable); a car may
     carry **many secondary states**, so the link that holds them exists; the store's five present states are
     reshaped — Available and Landed stay primary, **On the way, At port and Cleared become secondary**, and
     **On Order** and **Sold** are added as primary states; and **D6's sold flag gives way** to Sold as a
     primary state, with the sale row keeping the money facts. The read paths follow: a car's showroom
     grouping comes from its **primary state**, the three groups being three of the four (**Sold is never
     shown**), and a landed car still appears under Available as it does today. The store is rebuilt
     (drop → migrate → seed) and the figures reproduce. **This step is TASK-004's by the owner's ruling
     2026-10-14**, and its migrations land **before** the draft table, because a draft carries a state label.
  3. **The car's life** — create, edit (all fourteen columns, including the private note and the "was"
     price), the live profit figure, the malformed-amount block, the ref's one-time assignment, delete →
     tombstone → undo → the owner's permanent removal, and sold/un-mark. Creating a car takes **one of the
     four primary states** and any number of the owner's secondary states (step 2).
  4. **The registries, live** — both state editors reading and writing the registry (**the car editor creates
     secondary states only — the four primary states are not the owner's to change**), the refusal rules, and
     the enquiries board and activity feed reading real rows instead of seeds.
  5. **Images** — upload-first/save-second, cover, reorder, EXIF stripping, the size cap, the placeholder.
  6. **Taps** — the notice, the record, the badge and the list; and the dashboard's two feed panels.
  7. **Uploads and the template** — the car's PDF template offered as a blank at the upload point, an
     upload read into **drafts** (one per record, in their own holding place, nothing in `car` or
     `enquiry`), the owner's images added by hand per draft, the review, the save that creates the record
     and gives it its `TS-####` and change-check, rejection wording, the held file with its randomized
     filename, and the delete. The enquiry's imported-PDF flow lands as drafts the same way. A draft's state
     label is applied at the save against the model step 2 settled.
  8. **Settings and export** — the three settings with inline validation, password change delegated, the
     operational notice, and the one-action export.
  9. **The resilience half** — the carried cold-connection finding: a transient store failure becomes a
     clear retryable state rather than a 500, on the pages that read the store.
- **Stop at three checkpoints and show a working demonstration at each (owner's ruling, question 5).** The
  build runs continuously — the builder does not ask between steps — but it stops for the owner's eyes
  **after step 1 (the door)**, **after step 4 (the car's life and the registries both live)**, and **at the
  end**. The door is the risky hinge, since nothing is safe to demonstrate while the office is open to
  anyone; the car's life with the two registries is the biggest slice. At each checkpoint the owner watches
  a working office, not a report — and he may redirect before the next block of work starts.
- **Read the code that reads the store before writing to it:** the office read layer, the shared rules, the
  seeds, and the change-check module. The write path follows the shapes the read path already uses.
- **Keep the store rebuildable and the demonstration whole at every step.** A drop → migrate → seed → open
  the office run that reproduces the figures is still the cheapest and strongest check this layer has, and
  the demo wipe must still clear everything after this layer's writes have run.
- **Do not take the demonstration's figures as fixed.** The office's acceptance numbers move when the office
  starts saving; what must hold is agreement between the office and the showroom, and that nothing else
  moved.
- **Where a stake is the owner's, ask — do not guess.** The questions above are this layer's; a new
  one is added here, with its answer, rather than settled quietly in code.
- **Leave the witnesses runnable.** The browser check, the leak check, the office's reconcile script and the
  store-freshness check must all still be obtainable when this layer closes.
- **Name the gaps you leave.** A gap handed to TASK-005 or TASK-006 is a result of this layer, not a failure
  of it — but an unnamed gap is a failure.

---

## Benchmarks — after this, when…

1. …an unauthenticated visitor opens any office URL, the server refuses to render the page or return its
   data — and after the owner signs out, a tab left open is refused too.
2. …the owner fails to sign in repeatedly, the account is locked after ten consecutive failures, the lock is
   bounded (thirty minutes), and once it passes **he signs in normally with no support action and no one
   clearing state by hand** — nothing about the lock is indefinite. *Rewritten 2026-10-14 by the owner's
   ruling that the provider carries the sign-in: the office no longer sees the attempt, so the delay
   sequence and the per-IP window are no longer the application's to apply, and the lockout — which the
   spec had forbidden outright — is now the ruled shape, bounded and self-clearing.*
3. …the owner creates a car with a price and a photo, it appears in the office at once and in the showroom
   at once; its `TS-####` is given once, never changes on any edit, and is never reused after the car is
   deleted.
4. …the owner types in the car form, the profit figure beside it moves as he types and says "estimated"
   until the car is landed; a malformed amount cannot be saved and is caught at the field.
5. …the owner changes a cost on a landed car, the total cost and the profit change on every screen that
   shows them — including the dashboard, which states which cars its total counts.
6. …the owner marks a car sold with a price, it leaves the showroom, appears in Sold/Archive, is counted out
   of stock and into lifetime totals, and profit moves from projected to real; un-marking reverses the sale
   record and leaves no real-profit residue.
7. …the owner deletes a car, undo inside eight seconds restores it byte-for-byte with its photos, costs and
   state; after the window it is hidden from every read and listed as waiting to be cleared; and when the
   owner removes it for good, its photos, costs and sale go with it and no orphan is left — at no point did
   any job or clock remove anything.
8. …the owner uploads photos, the bytes reach the asset store before any row is saved, the cover is position
   0, reorder and set-cover hold, the stored file carries no EXIF, and an image whose asset is missing
   renders the placeholder instead of breaking the page.
9. …a buyer taps WhatsApp on a car, the privacy notice is shown before the tap, the recorded row holds the
   page, the car's reference and the time and nothing else, and the office's badge and list show it on
   refresh.
10. …the owner uploads a file holding ten cars, **ten drafts appear and no car exists** — the next `TS-####`
    is untouched and the showroom is unchanged; he adds one draft's photos by hand, saves it, and **one**
    car exists carrying the next `TS-####`, its change-check and its photos, while the other nine drafts are
    untouched; a draft survives a reload and is still a draft; a draft he never saves consumes no code and
    is still waiting for him; a row that cannot be read is explained and named rather than dropped; and the
    uploaded file is held under a randomized filename whose reference appears in no public response. The
    same holds when the file is an enquiry PDF, and no draft is countable or listed as a record.
11. …the owner adds a **secondary** state, renames it, reorders it and changes its colour, it is available
    for every car afterwards; the **four primary states cannot be added to, renamed or deleted at all**;
    deleting a secondary state a car carries is refused with the reason shown; and buyers still see only the
    three primary-state names — never one of his own.
12. …the owner gives an enquiry Sold on the day it arrives, nothing about any car changes, and no screen,
    rule or job objects — nothing anywhere required a state to come first.
13. …the owner saves a malformed WhatsApp number, the save is blocked inline and the previous number stays
    active; and changing the password leaves no password material in any application table.
14. …the owner presses export once and gets **one ZIP** holding everything the system holds — every car with
    its costs and photos, every enquiry, every tap, every activity row and every setting — as `master.json`
    (the nested master, parts intact) and **one CSV per subject** (not one combined sheet, and not an Excel
    workbook), plus a `README.txt` naming the contents and the date; and requesting the same export without
    a session returns nothing.
15. …the office is opened, its numbers and the showroom's agree; the activity feed lists the owner's own
    actions with what changed and when; the figures refresh when the tab regains focus and no Refresh
    control exists.
16. …the enquiries board, the activity log and the two state editors are opened, they show the store's rows,
    not a hardcoded seed — and the board groups by the registry's states in the registry's order.
17. …a crafted GET that would change data is opened, nothing changes; the session cookie is inspected and is
    `HttpOnly`, `SameSite=Lax` and `Secure`.
18. …every public response is inspected with the writes live, no cost, no profit, no asset reference, no
    customer detail and no office state label appears — the leak check still passes.
19. …a hand-crafted request carries its own `content_hash`, the stored hash is still the server's; and a
    request that tries to change a car's or an enquiry's identity is refused by the store.
20. …the store is briefly made unreachable, a store-reading page shows a clear, retryable state rather than
    an error page — and shows no invented figure.
21. …the owner creates a car, he must give it **one of the four primary states**, may add **as many of his
    own secondary states as he likes** (or none), cannot invent a fifth primary state, and cannot save a car
    with no primary state at all; and when he looks at the showroom, the car appears under **Available, On
    Order or Landed** — never under Sold — while none of his secondary states appears anywhere public.

---

## Conflicts found while grounding (logged; the requirement decides)

1. **The office is open to anyone, and it greets a user who does not exist.** No office route checks
   anything today, and the shell prints "Signed in as Umar" while `office_user` holds no rows. Build-list
   4.1 makes sign-in the only door and the spec makes the check server-side. **Winner: the requirement** —
   after this layer no office page renders without a session, and the shell's name comes from the signed-in row
   — and the office itself creates no account: the one account is made by the owner at the identity provider,
   which the application's invite-only setting makes the only possible source of one.
2. **The car form's own comment denies the fields it draws.** `app/office/(shell)/car/page.tsx` says the
   form-only fields (exterior, interior, features, private notes) are "not owned by the office data model"
   and fills them with presentational demo values — but `car` owns `exterior_color`, `interior_color`,
   `features`, `private_note`, `note` and `was_price_kobo`. **Winner: the store** — the form saves what it
   shows, and the stale comment is corrected in passing so it cannot mislead the next reader.
3. **The Settings state editors' colours disagree with the registry's.** `state-seeds.ts` hardcodes
   Available `#0e7a3e` and four others; the store's registry holds `#16a34a` and four others, backfilled by
   TASK-003's migration. **Winner: the store** — the editors read the registry, and the seed file stops
   being a second source of truth about the states.
4. **Three screens call themselves presentational while a requirement gives them data.** The dashboard's
   tap and activity panels, the activity log and the enquiries board all say, in their own comments, that
   they are drawn from a hardcoded seed with no data layer. The dashboard spec requires a recent-taps list
   and a recent-activity feed from `activity_event`; the enquiries spec requires the board. **Winner: the
   requirement.**
5. **The enquiries board's five states are hardcoded, and the registry is the owner's.** The board's counts
   come from a fixed seed in `state-seeds.ts` while `enquiry_state` holds five rows the owner may rename,
   reorder or add to. **Winner: the registry** — the board groups by the registry's states in the
   registry's order, and a state the owner adds appears without a code change.
6. **The board's shape invites a pipeline the requirements forbid.** The reference draws the enquiry states
   as columns to move cards between, which reads as stages — and D12 rules that states are labels, not
   stages, with nothing requiring one to precede another. **Winner: the requirement** — the grouping is a
   display of labels; no order is asserted, nothing moves a card on its own, and no rule may require a
   progression. Logged so the shape is not mistaken for a flow when it is wired.
7. **The provider and the app's own form — closed 2026-10-14 by the owner's ruling.** The office-access spec
   required the app's own form to submit to the app's own route, which would apply its checks before
   forwarding — so the provider had to accept an attempt the application had already vetted, and no hosted
   login page could take attempts directly. The integration fact was not settled; the *requirement* was: the
   owner ruled that **the provider carries the sign-in, not the office**. The spec, design D4, the build
   list and this file were rewritten accordingly — the office builds no password form and the provider's own
   bounded lockout and rate limits are the abuse control.
8. **The provider's own setup recipe, against two settled rules — both halves now ruled.** The runbook
   installs sign-up controls into the application and closes with "sign up as your first test user". The
   office has **exactly one account and no public sign-up** (the office-access spec's *exactly one account,
   and no sign-up path*). **Winner: the requirement** — satisfied by Clerk's **invite-only** access mode
   (checked against Clerk's documentation 2026-10-14: the sign-in component hides its sign-up prompt, and
   `<SignUp />` needs a valid invitation; free on any plan, unlike the allowlist, which needs a paid plan in
   production). The runbook's sign-up step is not followed. The second half — whether the attempt passes the
   application's own delay and per-IP checks before reaching the provider — **was the owner's call, and he
   made it on 2026-10-14: the provider carries the sign-in, not the office.** That is a changed rule, not a
   bent one: the office-access spec's delay schedule and per-IP window were replaced by the provider's own
   bounded lockout (ten attempts, thirty minutes, self-clearing) plus its per-address rate limits — question
   4, answered. See truths 1 and 2.
9. **Two meanings of one word, "draft" — found while writing this in.** The earlier text already called a
   car a "draft" when it has no price or no photo (`tasks.md` 3.4; TASK-001's truth 11; the listing-gate
   line above), *and* the owner's 2026-10-14 ruling calls an upload's staged row a **draft**. Two rules,
   one word, same layer — the exact shape that makes a builder implement the wrong one. **Winner: the
   owner's most recent word.** "Draft" now means **only** the staged row an upload produces (truth 9);
   the listing gate's meaning is renamed **not yet listed**, and the rule itself is unchanged. The live
   build list (`tasks.md` 3.4) and this file's listing-gate line were reworded; `openspec/tasks/TASK-001/
   task.md` is **closed history and was left as written**, and this entry is why its line reads as it does.
10. **The enquiries spec said nothing persists before a confirm; the owner ruled a draft is stored.**
    The requirement *Imported PDFs are kept, linked, and deletable* ended "before confirmation nothing
    persists server-side beyond the parsing scratch state". The owner ruled on 2026-10-14 that an upload
    **is saved** — "it is saved in neo as draft, not real data". **Winner: the owner** — and this is a
    changed rule, not a bent one: what persists before a save is now a **draft** (a row in its own
    holding place), and still never a record. Both requirements were rewritten to state the positive rule —
    what persists before a save is a draft, never an enquiry — and the superseded wording is gone from the
    spec. See design D13 and truth 9.
11. **"Sold is a flag, not a state" — the owner overruled it.** Design **D6** decided `car.sold` was a
    boolean with the sale price and date, *independent of* `state_id`, and it **explicitly rejected
    "Sold-as-state"** on the ground that reversal corrupts history. On 2026-10-14 the owner ruled that the
    car's states are **four fixed primary states — Available, On Order, Landed, Sold** — and that **every car
    sits under one of them**, so **Sold is a primary state** after all. **Winner: the owner** (design
    **D15**). What D6 was protecting is kept: the **money facts stay on the sale record** (price, date,
    profit), so un-marking a sale still reverses cleanly — it moves the car back to a non-Sold primary state
    and logs it, rather than resurrecting money. D6 is marked revised rather than deleted, and its
    "Sold-as-state (rejected)" line is now history, not a rule. **The same clash also sat inside this plan:**
    truth 5 read "Sold is an action, not a state" while truth 17 records that Sold *is* one of the four primary
    states. The owner settled the direction on 2026-10-14 — *"sold is a state with an action … it is a state
    first, you set it, then an action occurs"* — and truth 5's heading and body were **corrected, not
    deleted**, to "Sold is a primary state, and setting it is what performs the sale". Its rule keeps its
    force: the money stays on the sale row, and un-marking returns the car to its previous primary state with
    its secondary states intact, logged. `specs/inventory`'s contradicted requirement was rewritten with it.

### Deviation filed during the build (2026-10-16; ruled by the Architect, reconciled into the architecture)

**The conflict:** built, the tap notice counts **only the taps since the office last looked** — which this plan
and `specs/dashboard` did not say when they were written; the requirement read as a plain count of taps. The
developer **filed it as a deviation** (`developer-workspace/architecture-deviations/TASK-004-tap-seen-watermark.md`)
rather than quietly editing the spec to match the code that already existed.

**Winner: the owner's ruling (2026-10-16), written into the architecture — not the code alone.** The notice means
**new since last looked**: a one-row `tap_seen` watermark holds the `at` of the newest tap the office has
rendered, the badge counts `tap.at > seen_through`, and **every** tap is new while no mark exists. Viewing the
full tap list writes the mark by **POST** (so no GET changes anything — truth 3), the count clears, the glyph
stays so the list keeps its entry point, and a later tap counts as new again. Recorded as design **D21**; truth
**8** and `specs/dashboard` amended; the full tap list given a home of its own in `specs/enquiries`; `tap_seen`
named as operational read-state — not customer data, not one of `setting`'s three keys; **both names kept**
(`getOfficeTapCount` = every row, `getNewOfficeTapCount` = since the mark). **The build was right to file rather
than edit, and the plan was wrong to leave the notice's meaning unsaid** — that is the plan's miss, recorded here.

---

## Evidence this layer must leave behind

- **The flows exercised by hand in a browser, before and after** — creating a car, editing it, changing a
  cost, marking it sold and un-marking it, deleting it and undoing it, uploading photos, **uploading a
  template and saving its drafts one by one** (with a draft's images added by hand, and one left unsaved),
  importing the enquiry PDF, changing a state, saving a setting, exporting. The owner watches; no
  screenshots are needed, but the *figures before and after* are worth writing down.
- **The refusals, each with what was asked and what came back:** an office URL with no session; a
  signed-out tab; a state deleted while a car sits in it; a malformed WhatsApp number; a malformed amount in
  the form; **an uploaded file that is not the expected template**; a GET that would have changed data; a
  request carrying its own `content_hash`; a request trying to change a car's identity.
- **The store's state after the flows have run**, so that "the office and the showroom agree" can be
  checked rather than claimed — and that **every row the demonstration created carries the demo marker**.
- **A dry run of the wipe afterwards**, showing the demonstration and everything this layer's writes left
  behind can still be removed in one move, and that nothing else would be touched.
- **The export file**, opened and shown to hold every subject the requirement names.
- **The gate runs:** `npm test`, `tsc --noEmit`, `store-freshness`, and the **leak check passing with the
  writes in place**.
- **The conflicts above, each with its winner**, and every gap this layer leaves named for TASK-005 or
  TASK-006.
