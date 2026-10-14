# TASK-004 — Functionality. Layer 4 of 6.

**Written 2026-10-14.** A plan, not instructions: it says what must be true and what must not happen,
names the choices that belong to whoever builds it, and leaves the rest open. Its twin is `testing.md`
in this folder, written for a session that did not do the building.

**Where the requirements live:** `openspec/changes/truespec-architecture/specs/*` (binding — showroom,
office-access, inventory, money, media, enquiries, office-settings, dashboard), `design.md` (D2, D3, D4,
D7, D8, D9, D11, D12), and `tasks.md` §4.1 and §6.1–6.10 (this layer's work items). The data layer's
authority still binds every write here: `openspec/tasks/TASK-003/key-and-hash-v1.md` — the change-check
is made by the server, never sent by the browser. The plans in `product-management/` are **read, not
trusted**, and never edited; where one disagrees with a spec, the spec wins and the disagreement is
logged.

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
5. **Sold is an action, not a state.** Marking a car sold carries a sale price and a date, takes the car
   out of the showroom entirely, leaves it in Sold/Archive, keeps it in lifetime totals and out of stock
   counts, and moves profit from projected to real. Un-marking **reverses or voids the sale record** and
   returns the car to its section, with no stale real-profit residue anywhere.
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
   popup, an alert or a sound.
9. **The PDF import is preview-and-confirm, and nothing persists before confirm.** The owner uploads a PDF;
   the application reads it; he sees an editable table of what was read and can correct it; only an
   explicit confirm writes anything. A row that cannot be read is **explained and named, never silently
   dropped**. On confirm the file lives in the asset store under a **randomized filename** with its
   reference held only in the database — never in a public payload — and the rows link to the enquiry (or
   enquiries) they became. Deleting an imported PDF removes the link and the file behind it, leaves the
   enquiry rows in place, and is recorded in `activity`.
10. **Both registries are the owner's, edited live, and the store refuses what it must.** He can add,
    rename and reorder a state, choose its colour, and (for car states) set the new-arrival flag and the
    one section it maps to. A car state with no section cannot exist; two states cannot share a name; a
    state a car sits in cannot be deleted — refused by the store itself, with the reason shown. Buyers see
    only the three section names, never a label of his. Enquiry states are the same kind of thing and no
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
    — every car with its costs, every enquiry, every tap, every activity row and every setting — in a form
    that is both human-readable and machine-readable. A file the owner already holds contains everything
    the product knew.
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
  The listing gate holds: no price or no photo means draft, absent from every public page, count and link.
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
2. **The export's shape.** The requirement says CSV and JSON. Is the owner's expectation *one download
   holding both*, or *two separate actions* — and is the human-readable form one table per subject or a
   single combined sheet? **Open.**
3. **The PDF the import reads.** The import must be built to a real shape, not to the authored demo file
   alone. What does the owner's PDF actually look like — which columns does it carry (customer name, number,
   what they asked for, note?), and is it a text PDF he prepares rather than a scan? **Open.**
4. **What replaces the delay schedule and the per-IP window — answered 2026-10-14.** The owner ruled: **the
   provider's own lockout, after 10 failed attempts, for 30 minutes — not indefinite.** So the provider's
   abuse control is taken as it comes, with two limits that must hold: the lock is **bounded and clears
   itself** (no support action, no ticket, nothing anyone clears by hand), and the provider's per-address
   rate limits and bulk enumeration protection stay in force. The application applies no per-attempt rule at
   all, because it never sees an attempt. See truth 2 above; the office-access spec and design D4 were
   rewritten to say exactly this.

*Question 2 is needed before step 7 of the build order, question 3 before step 6. Question 4 is answered.*

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

## Process — how to work it

- **Build in this order, because each step needs the one before it:**
  1. **The door** — the provider installed and linked, its instance put in invite-only mode so no public
     sign-up path exists, the owner's one account created, Clerk's own sign-in mounted as the office's door,
     the session row and its cookie, the server-side session check on every office route, sign-out. Whatever
     answers open question 4 goes in here too, once it is ruled. Nothing else is safe to demonstrate while
     the office is open to anyone.
  2. **The car's life** — create, edit (all fourteen columns, including the private note and the "was"
     price), the live profit figure, the malformed-amount block, the ref's one-time assignment, delete →
     tombstone → undo → the owner's permanent removal, and sold/un-mark.
  3. **The registries, live** — both state editors reading and writing the registry, the refusal rules, and
     the enquiries board and activity feed reading real rows instead of seeds.
  4. **Images** — upload-first/save-second, cover, reorder, EXIF stripping, the size cap, the placeholder.
  5. **Taps** — the notice, the record, the badge and the list; and the dashboard's two feed panels.
  6. **The PDF import** — upload, read, preview, confirm, rejection wording, the randomized filename, the
     delete.
  7. **Settings and export** — the three settings with inline validation, password change delegated, the
     operational notice, and the one-action export.
  8. **The resilience half** — the carried cold-connection finding: a transient store failure becomes a
     clear retryable state rather than a 500, on the pages that read the store.
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
10. …the owner imports an enquiry PDF, he sees an editable preview and nothing at all is written before he
    confirms; a row that cannot be read is explained rather than dropped; and the file lands in the asset
    store under a randomized filename whose reference appears in no public response.
11. …the owner adds a state, renames it, reorders it and maps it to a section, it is available for every car
    afterwards; deleting a state a car sits in is refused with the reason shown; and buyers still see only
    the three section names.
12. …the owner gives an enquiry Sold on the day it arrives, nothing about any car changes, and no screen,
    rule or job objects — nothing anywhere required a state to come first.
13. …the owner saves a malformed WhatsApp number, the save is blocked inline and the previous number stays
    active; and changing the password leaves no password material in any application table.
14. …the owner presses export once and gets everything the system holds — every car with its costs, every
    enquiry, every tap, every activity row and every setting.
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

---

## Evidence this layer must leave behind

- **The flows exercised by hand in a browser, before and after** — creating a car, editing it, changing a
  cost, marking it sold and un-marking it, deleting it and undoing it, uploading photos, importing the PDF,
  changing a state, saving a setting, exporting. The owner watches; no screenshots are needed, but the
  *figures before and after* are worth writing down.
- **The refusals, each with what was asked and what came back:** an office URL with no session; a
  signed-out tab; a state deleted while a car sits in it; a malformed WhatsApp number; a malformed amount in
  the form; a GET that would have changed data; a request carrying its own `content_hash`; a request trying
  to change a car's identity.
- **The store's state after the flows have run**, so that "the office and the showroom agree" can be
  checked rather than claimed — and that **every row the demonstration created carries the demo marker**.
- **A dry run of the wipe afterwards**, showing the demonstration and everything this layer's writes left
  behind can still be removed in one move, and that nothing else would be touched.
- **The export file**, opened and shown to hold every subject the requirement names.
- **The gate runs:** `npm test`, `tsc --noEmit`, `store-freshness`, and the **leak check passing with the
  writes in place**.
- **The conflicts above, each with its winner**, and every gap this layer leaves named for TASK-005 or
  TASK-006.
