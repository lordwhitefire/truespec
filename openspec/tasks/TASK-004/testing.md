# TASK-004 — Testing the office's writes (functionality, Layer 4)

**Written 2026-10-14.** This is written for a session that did **not** build the work. Nothing here is
taken on trust from the build report; every claim below is re-established from the running application,
the store, and the responses it returns.

**Owner's ruling (2026-10-13):** the separate testing pass is run **once, at the end, when everything is
built** — so these checks join the deferred final test rather than running when this layer closes. They
still belong to this layer, and the final test must account for each group.

---

## Before you start

- Read `task.md` in this folder. It holds the sixteen "what must be true" statements, the constraints, the
  three questions put to the owner, and the seven logged conflicts. This file checks those, not a memory
  of them.
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
  no page, no data. Sign-out, then reloading an office tab that was already open, is refused too. There is a
  first-run screen while no account exists, it creates the account with an email and a password of the
  operator's choosing, and afterwards **only sign-in is offered** — no registration path exists at all. A
  failed sign-in for an unknown email and a failed sign-in for the right email with a wrong password are
  indistinguishable — same message, same behaviour — and neither message says whether the email exists.
- **What fails this group:** any office URL rendering or returning data without a session; a page that
  renders and then redirects client-side; a sign-up route still reachable after first run; a message, a
  timing difference or a status code that separates "unknown email" from "wrong password"; a default
  password anywhere in the code, the seeds or the database.

## 2. Abuse control, against the numbers

- **How you will know it passed:** firing failed sign-ins one by one, attempts 1–3 are answered with no
  delay, and 4, 5, 6, 7 are delayed by roughly 1s, 5s, 15s, 30s — the delay never exceeding 60s no matter
  how many more you fire. From one address, after 10 failures inside 15 minutes, further attempts inside
  that window are rejected **and logged**, and the rejection comes without the attempt being processed.
  Waiting the window out, sign-in works normally again: nothing has been locked and the account is intact.
  Every attempt you made is in `auth_attempt` with its address, time and outcome, and the table did not
  grow without bound while you hammered it.
- **What fails this group:** a delay applying to the first three failures; no delay at all; a delay that
  exceeds the cap; an account locked out after the window passed; a rejected attempt that still reached the
  provider; a flood that fills the attempt table (the log must be rate-limited).

## 3. Every write is a POST, origin-checked, and no GET changes anything

- **How you will know it passed:** watching the network while the owner acts, every state change leaves as a
  POST — a Server Action, or a Route Handler that checks the origin — and no `GET` anywhere changes data.
  Crafting a URL that *would* change data if it were a GET leaves the store exactly as it was. The session
  cookie is `HttpOnly`, `SameSite=Lax` and `Secure`. A write submitted from a foreign origin is refused.
- **What fails this group:** any state change reachable by opening a link; a cookie missing any of the three
  attributes; a write handler without an origin check; a working `GET` that mutates.

## 4. A car's whole life

- **How you will know it passed:** the owner creates a car with a price, a state and a photo — it appears in
  the office list immediately and in the showroom immediately; its `TS-####` was assigned once by the store;
  editing anything (including the private note and the crossed-out "was" price, which the form now offers)
  leaves the ref unchanged. Deleting it and undoing inside eight seconds restores it byte-for-byte — the same
  ref, the same photos, the same cost lines, the same state. Deleting it and waiting past the window leaves a
  tombstone: absent from every read, and listed as waiting to be cleared. Its permanent removal is performed
  **by the owner** and takes its photos, cost lines and sale row with it, clearing its stored images and
  leaving no orphan — and nothing removed it before he did.
- **What fails this group:** a car saved without a state; a second `TS-####` on any edit; an undo that
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

- **How you will know it passed:** marking a car sold with a price and a date removes it from the showroom
  entirely, puts it in Sold/Archive, keeps it in lifetime totals and out of stock counts, and moves profit
  from projected to real. Un-marking reverses or voids the sale row — the car returns to its section, and
  no real-profit residue survives anywhere.
- **What fails this group:** sold implemented as a state choice; a sold car still visible in the showroom or
  still counted in stock; an un-mark that leaves an orphaned or half-reversed sale row, or a total that still
  counts a sale that no longer exists.

## 7. The registries, edited live

- **How you will know it passed:** the owner adds a car state, renames one, reorders one, changes a colour,
  and maps it to a section — the change is available for every car afterwards and survives a reload.
  Deleting a state that a car sits in is refused, by the store, with the reason shown. A state with no
  section cannot be created; two states cannot share a name. Buyers see only the three section names —
  never the owner's label — and the dashboard's layout does not change however many states he adds. The
  enquiry states are the same kind of thing: adding, renaming, reordering and removing them works, and
  **giving an enquiry Sold on the day it arrives is accepted** — nothing requires one state to come before
  another, and setting an enquiry's state changes nothing about any car.
- **What fails this group:** the editor writing a second source of truth (the hardcoded seeds still
  deciding what shows); a label leaking into any public response; a deletion of an occupied state that
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

## 10. The PDF import

- **How you will know it passed:** uploading a PDF and confirming nothing persists until the confirm —
  check the store before and after the preview, and it is unchanged. The preview is editable and what the
  owner corrects is what is stored. A row that cannot be read is explained and named, not silently dropped.
  The file lands in the asset store under a randomized filename, with only its reference in the database —
  and that reference appears in no public response. Deleting an imported PDF removes the link and the file
  behind it, leaves the enquiry rows in place, and is recorded in `activity`.
- **What fails this group:** any row written before confirm; a rejection that disappears without a word; the
  original filename used as the stored asset name; the reference reachable publicly; a delete that takes the
  enquiries with it, or leaves the file behind.

## 11. Settings and the export

- **How you will know it passed:** the WhatsApp number, the tagline and the full-tank default save and
  survive a reload; a malformed WhatsApp number is refused inline and the previous number stays active; the
  full-tank default only prefills the form and changes no stored cost. Password change goes through the
  provider, and a search of every application table finds **no password material at all**. Settings says in
  words that recovery happens at the provider, with no reset flow in the app. Pressing export once produces
  everything the system holds — every car with its costs, every enquiry, every tap, every activity row,
  every setting — in both a readable and a machine-readable form, and a spot-check of the file finds nothing
  missing from the list.
- **What fails this group:** a bad number stored; any password or hash of one in an application table; an
  in-app reset flow; an export missing a subject the requirement names (the exit path is the owner's only
  guarantee).

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
  number.
- **What fails this group:** any leaked figure or label, in any response; a draft car visible; an unset
  price rendered as `0` or `₦0`.

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
  fleet *and* everything your own testing wrote — carries the demo marker, and a dry run of the wipe shows
  the demonstration and everything these writes left behind can still be removed in one move, touching
  nothing else. The gate runs are clean with the writes in place: `npm test`, `tsc --noEmit`,
  `store-freshness`, and the leak check from group 14.
- **What fails this group:** an unmarked row created during the build or the testing; a wipe that leaves
  bytes behind (a photo asset, an imported PDF, a tap on a demo car, an activity row naming one); a wipe
  that touches anything that is not the demonstration.

---

## How to report

For each group: what you ran, what you saw, and whether it passed — in plain words, with the row, the
response or the command output that shows it. Name the groups you could not run and why, rather than
leaving them silent. A group you could not run is not a pass. Where something failed, say what it was
expected to be and what it was instead, so the next session does not have to rediscover it.

This layer's checks are part of the **deferred final test** (owner ruling 2026-10-13), run once at the end
with every other layer's — see the registry's "Deferred to the final test".
