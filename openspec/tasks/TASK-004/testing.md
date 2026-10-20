# TASK-004 — Testing the office's writes (functionality, Layer 4)

**Written 2026-10-14.** This is written for a session that did **not** build the work. Nothing here is
taken on trust from the build report; every claim below is re-established from the running application,
the store, and the responses it returns.

**Owner's ruling (2026-10-13):** the separate testing pass is run **once, at the end, when everything is
built** — so these checks join the deferred final test rather than running when this layer closes. They
still belong to this layer, and the final test must account for each group.

---

## Before you start

- Read `task.md` in this folder. It holds the seventeen "what must be true" statements, the constraints, the
  eight questions put to the owner (**all eight answered 2026-10-14**), and the eleven logged
  conflicts. This file checks those, not a memory of them. The **state model** (truth 17, design D15) is
  checked inside groups **4, 6 and 7** — the store's shape is checked where it is used, not in a group of its
  own — and the **eleven handover answers** (D16–D20, D6, D15) are checked in group **17**.
- Get the store into a known state, and keep a record of how: migrations applied, the seed run, and
  whether it was rebuilt or migrated forward. Several groups below read the store directly, so you must be
  able to say what was in it *before* your own actions.
- **You will be writing to a live store, and everything you create must be demonstration data.** Every row
  your own testing produces carries the demo marker, exactly as the seeded fleet does — check that in group
  16, because a test record left unmarked is a record the demo wipe would not clear.
- Have one signed-in session ready and one browser with a session you can sign out of. Two groups need a
  vandals'-eye view: no session at all, and a common attacker's.
- Do not accept "the button worked". Every claim needs a row you queried, a response you inspected, or a
  command's output.

---

## 1. The door (run this first — it is the negative check)

The dangerous failure is an office reachable without a session, or one that only *hides* its links.

- **How you will know it passed:** with no session — a fresh browser profile, or the cookie removed — every
  office URL (dashboard, inventory, car form, enquiries, activity, settings) is *refused by the server*:
  no page, no data. `/office` **sends a visitor to the provider's sign-in mounted in the office, at
  `/office/sign-in`** — not to a separately hosted page on the provider's domain — and the sign-in the owner
  sees carries the office's own chrome around the provider's component. Sign-out, then reloading an office
  tab that was already open, is refused too. **The
  provider's instance is in its invite-only mode**, so **no registration path exists anywhere** — the office
  offers no sign-up, and attempting to reach the provider's own sign-up is refused without a valid
  invitation. Exactly one account exists, and it is the owner's. A failed sign-in is answered by the provider,
  the office adds no message of its own, and the account's identity is never echoed back — and the provider's
  **bulk** enumeration protection is on, so probing which identifiers exist is rate-limited. *(Not absolute
  concealment: hiding existence outright needs the provider's strict mode, which forbids password-first
  sign-in — recorded in the spec. Do not test for "identical messages"; test that the office itself reveals
  nothing and that probing is rate-limited.)*
- **What fails this group:** any office URL rendering or returning data without a session; a page that
  renders and then redirects client-side; **`/office` landing on the provider's hosted page instead of the
  sign-in mounted in the office**; a sign-up path reachable by anyone who finds the address; more
  than one account; a sign-in message, timing signal or status code that comes from **our** code rather than
  the provider's, or an account identity echoed back; bulk enumeration protection found off; a default
  password anywhere in the code, the seeds or the database.

## 2. Abuse control — the provider's lockout, and that it clears itself

The shape is ruled (owner, 2026-10-14): the provider carries the sign-in, so the office's own delay sequence
and per-IP window are gone; the provider's lockout stands — ten failed attempts, thirty minutes, not
indefinite.

- **How you will know it passed:** firing failed sign-ins one after another, the account is locked after ten
  consecutive failures and the attempts beyond that do not reach the account. The lock is **bounded**: when
  the period passes, **the owner signs in normally, with no support action, no ticket and no state anyone
  clears by hand**. The provider's per-address rate limiting is in force, and bulk user-enumeration
  protection is on. The office is writing no record of attempts — it never saw one.
- **What fails this group:** an indefinite lock; a lock that outlives its period or needs an operator to
  clear; a lock configured to something other than the ruled duration; the office writing an attempt row for
  a failure it never saw; a refusal that still reached the account.

## 3. Every write is a POST, origin-checked, and no GET changes anything

- **How you will know it passed:** watching the network while the owner acts, every state change leaves as a
  POST — a Server Action, or a Route Handler that checks the origin — and no `GET` anywhere changes data.
  Crafting a URL that *would* change data if it were a GET leaves the store exactly as it was. The session
  cookie is `HttpOnly`, `SameSite=Lax` and `Secure`. A write submitted from a foreign origin is refused.
- **What fails this group:** any state change reachable by opening a link; a cookie missing any of the three
  attributes; a write handler without an origin check; a working `GET` that mutates.

## 4. A car's whole life

- **How you will know it passed:** the owner creates a car with a price, **a primary state** and a photo — it
  appears in the office list immediately and in the showroom immediately; its `TS-####` was assigned once by
  the store; the state he chose is one of the **four fixed primary states**, and he may attach **any number of
  his own secondary states** to the car (or none), with **only the primary state visible on the showroom**;
  editing anything (including the private note and the crossed-out "was" price, which the form now offers)
  leaves the ref unchanged. Deleting it and undoing inside eight seconds restores it byte-for-byte — the same
  ref, the same photos, the same cost lines, the same state. Deleting it and waiting past the window leaves a
  tombstone: absent from every read, and listed as waiting to be cleared. Its permanent removal is performed
  **by the owner** and takes its photos, cost lines and sale row with it, clearing its stored images and
  leaving no orphan — and nothing removed it before he did.
- **What fails this group:** a car saved without a **primary** state; a fifth primary state existing at all,
  or a primary state renamed or deleted; a secondary state, or its label, reaching any public page or count;
  a second `TS-####` on any edit; an undo that
  restores a car with a different ref, a missing photo or a lost cost line; a tombstone visible in any read;
  any row — a photo, a cost, a sale or an asset — left behind as an orphan after the owner's removal; or any
  hint that a job, a rule or a clock removed anything.

## 5. Money in the real form

- **How you will know it passed:** typing a price and cost values moves the profit figure beside the form as
  he types, and it says "estimated" until the car is landed. A malformed amount cannot be saved and is caught
  at the field, not after submit. Changing a cost or the price on a landed car moves the total cost and the
  profit on **every** screen that shows them — the car form, the inventory row, the dashboard — and the
  dashboard's total carries its explicit reach line. A genuinely entered zero stays distinguishable from a
  missing value, and a car with an incomplete cost is excluded from profit totals with the "still building"
  line present, while money tied up still includes it.
- **What fails this group:** a figure frozen at entry; a value that moved on one screen and not another; a
  per-screen sum that disagrees with `lib/money.ts`; a malformed amount stored, or rounded, or silently
  coerced to zero; a zero displayed as missing or the reverse.

## 6. Sold, in both directions

- **How you will know it passed:** marking a car sold with a price and a date **sets its primary state to
  Sold** and removes it from the showroom entirely — **Sold is the one primary state the showroom never
  shows** — puts it in Sold/Archive, keeps it in lifetime totals and out of stock counts, and moves profit
  from projected to real. Un-marking reverses or voids the sale row, returns the car to a **non-Sold primary
  state** (logged), and no real-profit residue survives anywhere.
- **What fails this group:** a sold car still visible in the showroom or still counted in stock; an un-mark
  that leaves the car sitting under Sold; an un-mark that leaves an orphaned or half-reversed sale row, or a
  total that still counts a sale that no longer exists; the money facts (price, date, profit) held anywhere
  other than the sale record — e.g. folded into the state, or lost when the state moves.

## 7. The registries, edited live

- **How you will know it passed:** the owner adds a **secondary** car state, renames one, reorders one and
  changes its colour — the change is available for every car afterwards and survives a reload — while the
  **four primary states (Available, On Order, Landed, Sold) cannot be added to, renamed or deleted at all**,
  by him or by any screen. Deleting a secondary state that a car carries is refused, by the store, with the
  reason shown. Two states cannot share a name, across both kinds. A secondary state needs no section, and
  **buyers see only the three primary names — Available, On Order, Landed — never the owner's secondary
  labels**, and the dashboard's layout does not change however many secondary states he adds. The
  enquiry states are the same kind of thing: adding, renaming, reordering and removing them works, and
  **giving an enquiry Sold on the day it arrives is accepted** — nothing requires one state to come before
  another, and setting an enquiry's state changes nothing about any car.
- **What fails this group:** a screen offering to create, rename or delete a **primary** state, or such an
  attempt succeeding; the editor writing a second source of truth (the hardcoded seeds still
  deciding what shows); a secondary state's label leaking into any public response or count; a deletion of an
  occupied state that
  succeeds, or is blocked by the screen alone when the store would allow it; any screen, rule or job that
  treats the states as stages — an implied progression, a required order, or an enquiry's state touching a
  car.

## 8. Images

- **How you will know it passed:** adding photos to a car uploads the bytes to the asset store **before**
  any row is saved, so a car is never saved pointing at bytes that were never uploaded. The cover is
  position 0; reordering and setting a new cover hold across a reload. The stored file carries no EXIF, and
  a file past the size cap is refused rather than stored. `origin` says where the photo came from
  (`owner upload` for the owner's own). With the asset removed or the asset store briefly unreachable, the
  page shows the placeholder instead of breaking, and no web address is ever stored in the asset-reference
  column.
- **What fails this group:** a row saved before its bytes; a broken image instead of the placeholder; two
  photos sharing a position; EXIF surviving the upload; an oversized original stored; a third-party URL in
  the reference column.

## 9. Taps, and the notice

- **How you will know it passed:** tapping WhatsApp on a car shows the privacy notice **before** the tap,
  and the buyer then reaches WhatsApp as before. The recorded row holds the page, the car's reference and
  the time — and nothing else: inspect it and satisfy yourself that no name, no number, no message and no
  address is stored. The office shows it as a badge and in the recent list on refresh, with no popup, alert
  or sound.
- **What fails this group:** a tap recorded without the notice being shown; any extra column carrying a
  person; the figure counting taps the office never received, or missing the ones it did; an alert of any
  kind.

## 10. Uploads — the template, the drafts, and the save

- **How you will know it passed:** the blank templates are offered where the owner uploads, so a person can
  take one away filled and send it back — the car's template carrying its **fourteen editable details**, the
  enquiry's file carrying its **five** (name, number, what they asked for, note, and the state), and **no
  field beyond those read, inferred or filled in** (check against `lib/change-check.ts`, which is where the
  lists come from). Uploading a file
  holding ten cars **creates ten drafts and no car** — check the store before and after, and `car` and
  `enquiry` are unchanged, the next `TS-####` is untouched, every count is unchanged, and nothing appears in
  the showroom or in any public response. Each draft is reviewed and saved on its own: saving one creates
  exactly one record, carrying the next `TS-####`, its change-check and its state, and leaves its brother
  drafts untouched. A draft survives a reload and is still a draft; a draft the owner never saves consumes
  no reference code and is still waiting for him, because nothing removes it for him. Each draft's images are
  added by hand and survive the reload, becoming the record's photo rows only at save; the image store's
  "never referenced" clearance must not touch an asset a draft still references. A record's own rules (a
  required field, a valid state, a well-formed amount) are enforced **at the save**, so a draft may sit
  incomplete without an error. A row that cannot be read is explained and named, never silently dropped, and
  a file that is not the expected format is refused with a reason the owner can act on. A draft occupies no
  state: deleting a state that only a waiting draft names must be **allowed**, and if a draft's named state
  is gone by the time he saves it, he is asked to choose rather than the save inventing one. The uploaded
  file is held under a randomized filename with only its reference in the database — and that reference
  appears in no public response. Deleting an imported PDF removes the link and the file behind it, leaves the
  rows in place, and is recorded in `activity`.
- **What fails this group:** any row written into `car` or `enquiry` before a save; a draft that shows up in
  a count, a list, a section or a public payload; a `TS-####` consumed by a draft that was never saved; two
  drafts on one save; **a field read or invented beyond the record's editable list**; a state whose deletion
  is blocked by a waiting draft; a save that invents a state the file named but the registry no longer holds;
  a draft's images dropped by the day's clearance; the record's rules enforced at upload (so a draft cannot be
  staged incomplete); a rejection that disappears without a word; the original filename used as the stored
  asset name; the reference reachable publicly; a delete that takes the rows with it, or leaves the file
  behind.

## 11. Settings and the export

- **How you will know it passed:** the WhatsApp number, the tagline and the full-tank default save and
  survive a reload; a malformed WhatsApp number is refused inline and the previous number stays active; the
  full-tank default only prefills the form and changes no stored cost. Password change goes through the
  provider, and a search of every application table finds **no password material at all**. Settings says in
  words that recovery happens at the provider, with no reset flow in the app. Pressing export once produces
  **one ZIP** — not two downloads — holding `master.json` (the machine-readable master, nested: a car's cost
  lines and photo list under that car, not flattened) and **one CSV per subject** — cars, costs, photos,
  enquiries, taps, activity, settings — never a single combined sheet, plus a `README.txt` naming the
  contents and the date; and a spot-check finds nothing missing from the list. Requesting the export with no
  session returns nothing.
- **What fails this group:** a bad number stored; any password or hash of one in an application table; an
  in-app reset flow; an export missing a subject the requirement names (the exit path is the owner's only
  guarantee); **two downloads where one ZIP was asked for**; an Excel workbook instead of the ZIP; a single
  combined sheet in place of one CSV per subject; a flattened master that loses a car's cost lines or photo
  list; no `README.txt`; the export reachable without a session.

## 12. The screens show the store, not a seed

- **How you will know it passed:** the enquiries board, the activity log and the two state editors show the
  store's rows. Add a record of each kind and watch the screen change; delete one and watch it go. The board
  groups by the registry's states in the registry's order, and a state the owner adds appears without a code
  change. The activity feed lists the owner's own actions — cars added, states changed, sales, deletions,
  imports — with what changed and when.
- **What fails this group:** a count or a card that survives its record's deletion; a board still drawing
  from the hardcoded seeds; an activity row written by a read; a feed that omits the action you just took.

## 13. The change-check is the server's

- **How you will know it passed:** reading the store either side of an edit, `content_hash` changes exactly
  when an editable value changed and does not change when nothing did; it is present on every row the
  application writes. A hand-crafted request that carries its own `content_hash` does **not** get to set the
  stored one — the stored value is still the server's. A request that tries to change a car's ref, a car's
  id or an enquiry's id is refused by the store's own guard, and no write path is written in a way that
  bypasses it.
- **What fails this group:** a hash accepted from a caller; a row written without one; a hash that fails to
  change when an editable field changed, or changes when nothing editable did; a write that updates a
  record's identity.

## 14. The public boundary, with the writes live

- **How you will know it passed:** the leak check passes with the office able to write. Walking every public
  route, no cost, no profit, no asset reference, no customer detail and no office state label appears — in
  the rendered page or in the serialized payload. The listing gate still holds: a car with no price or no
  photo is absent from every public page, count and link, and no public page ever shows an unset price as a
  number. A draft is absent too — not because it is filtered out, but because it is **not in the record's
  table at all**.
- **What fails this group:** any leaked figure or label, in any response; an unlisted car visible; a draft
  reachable on any public path; an unset price rendered as `0` or `₦0`.

## 15. The figure agreement, and the blip

- **How you will know it passed:** the office's numbers and the showroom's agree at the same moment, before
  and after a write, and every figure is traceable to the one shared rule — counting, section mapping and
  money each existing once. With the store briefly made unreachable, a store-reading page shows a clear,
  retryable state: not a bare error page, not an empty list that looks like real emptiness, and **no
  invented figure**.
- **What fails this group:** two screens disagreeing; a second implementation of any shared rule; a 500
  where a retry belongs; a fabricated number or a silently empty screen standing in for a failure.

## 16. The demonstration is still whole, and this layer left no stray record

- **How you will know it passed:** after all of the above, every row the demonstration created — the seeded
  fleet *and* everything your own testing wrote, **drafts included** — carries the demo marker, and a dry run
  of the wipe shows the demonstration and everything these writes left behind can still be removed in one
  move, touching nothing else. The gate runs are clean with the writes in place: `npm test`, `tsc --noEmit`,
  `store-freshness`, and the leak check from group 14.
- **What fails this group:** an unmarked row created during the build or the testing, a draft among them; a
  wipe that leaves bytes behind (a photo asset, a draft's image, an imported PDF, a tap on a demo car, an
  activity row naming one); a wipe that touches anything that is not the demonstration.

## 17. The eleven handover answers hold

These are the rulings the dev was given before starting (task.md, "What the dev asked at handover"). Check
each where its subject lives, rather than all at once.

- **How you will know it passed:**
  - **The two leftovers (D20).** `activity_event` gained **no** new column — the feed still reads `kind` plus
    the car's `TS-####` in `subject`. `auth_attempt` is **still present and still empty**: the app writes no
    attempt row, and the job's 90-day rule on it still applies.
  - **The draft table (D16).** One new table only; a draft's images are an **ordered list on its own row**
    (index 0 is the cover) with **no second image table**; `state_label` holds a **name, not a state id**;
    drafts of both kinds are reviewed at **`/office/drafts`**; "Create from file" appears on the office
    inventory and enquiry screens with the car template downloadable there.
  - **The session row (D17).** After signing in and opening any office page, exactly one `session` row exists
    for that provider session; reloading adds no second. **No webhook route and no sign-in callback route
    exist** (check the route tree, not just the navigation).
  - **The photo cap is 15 MB.** A file over 15 MB is refused with a reason; a file under it saves.
  - **The WhatsApp number is normalised.** Saving `0803 123 4567`, `2348031234567` or `+234 803 123 4567`
    all store `+2348031234567`, and the showroom's `wa.me` link resolves; a malformed one is refused inline
    and the previous number stays active.
  - **The notices are read, not computed (D19).** Storage and backup notices display the setting rows
    (`last_backup_at`, the warning figure — default 4 GB); no live call to the image store is made on the
    page render, and no new table was added for either.
  - **The blip has one guard (D18).** With the store made unreachable, **both** an office page and a public
    showroom page show the retryable state — not a 500, not an empty list, no invented figure — and a route
    that fails hard lands on an error boundary rather than a stack trace.
  - **Sold keeps the car's secondary states (D15 f).** Mark a car Sold that carries a secondary state, then
    un-mark it: the car returns to its previous primary state **with the label still attached**.
  - **The demo mapping (D15 g).** The showroom looks exactly as it did before the state model changed, and at
    least one demo car carries a secondary label while one is Sold — so an onlooker can see both.
  - **The retention numbers.** An enquiry recorded 12 months ago shows as due for the owner's decision, and
    **nothing is deleted** until he deletes it.
- **What fails this group:** a second image table; a draft whose state is a live id; a webhook or callback
  route that was added "to be safe"; a cap other than 15 MB; a stored number left un-normalised; a storage
  figure computed live from the image store; per-page error handling standing where the shared guard should
  be; un-marking a sale that loses the car's labels; a state-model change that shifts what the showroom
  shows; or any deletion happening because retention came due.

---

## How to report

For each group: what you ran, what you saw, and whether it passed — in plain words, with the row, the
response or the command output that shows it. Name the groups you could not run and why, rather than
leaving them silent. A group you could not run is not a pass. Where something failed, say what it was
expected to be and what it was instead, so the next session does not have to rediscover it.

This layer's checks are part of the **deferred final test** (owner ruling 2026-10-13), run once at the end
with every other layer's — see the registry's "Deferred to the final test".
