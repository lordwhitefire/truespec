# 01 — The two carried findings, re-verified

**Checked:** 2026-10-20, against the current working tree (code reading only; no store writes).
**Tracker items:** 1 and 2.

## 1. The delete control for the client's data

**The promise.** `app/(site)/privacy/page.tsx:121` — *"If you'd like us to delete a WhatsApp
enquiry, email a short request to the contact below with enough detail to identify it."*

**What the page actually offers.** The contact section (`app/(site)/privacy/page.tsx:127-140`) offers
**WhatsApp only**. There is no email address anywhere on the page, and `grep -rn "mailto"
'app/(site)'` returns nothing. So the named channel does not exist.

**No office action deletes an enquiry.** A search for `DELETE FROM enquiry` finds only
`scripts/demo-wipe.ts:236` — and that deletes **demo rows only**. The enquiry actions
(`app/office/actions/enquiry.ts`) create, update and set a state; the only "delete" nearby is the
state-delete guard, which refuses while an enquiry sits in the state
(`app/office/actions/enquiry.ts:210`, `lib/enquiry-state.ts:126`). There is no screen and no action
that removes an enquiry.

**The PDF caveat (DATA-001).** The app never writes an `enquiry_pdf` row; only `scripts/seed.ts`
does. So for an imported enquiry there may be a PDF row and a Sanity file behind it, and a delete
must decide whether those go too.

**What is settled — and corrected (owner, this session).** The **client is the owner of the
business**, not the visitor. The privacy notice speaks to **users coming to the showroom**; the
client owns the office data and owes no privacy to himself. So the delete button is the **client's
own control over data he owns** — not a customer-rights portal. **No email channel is needed.** The
notice's "email a short request" sentence should point at the existing WhatsApp channel (or be
removed); the visitor already contacts the business there. The TASK-003 rule forbids the **system**
from deleting on its own; it never restricted the owner. The system may still clear only its own
litter (unreferenced uploads, `auth_attempt` past 90 days).

**What the task must make concrete.** Where the button lives (the enquiries board is the natural
place), what exactly it removes (the enquiry row; its PDF link and file; taps stay because they hold
no customer data), whether a confirmation is required, and that the deletion is written to the
activity log (the subject code `ENQ-####`, never the customer's name or number).

**Open:** Q3 (PDF link belongs here or its own item), Q8 (the button's exact scope). Q11 is closed:
no email — the notice is for showroom visitors, and the channel is WhatsApp.

## 2. A second Save creates a duplicate car

**The form has no identity.** `/office/car/new` is add mode; the form carries no `carId`. The only
thing that names the car being made is created **inside the action**.

**The server mints a new key on every call.** `createCar` (`app/office/actions/car.ts:61`) calls
`randomUUID()` at line 82 and passes it to `carCreateStatement`
(`lib/car-create.ts:53`). That statement's `ON CONFLICT (id) DO NOTHING` protects only a retry of
**the same UUID** — as the action's own comment says (`app/office/actions/car.ts:29`). Two calls are
two different cars, and `car.ref` is unique per row, so there is no content-level uniqueness either.

**The client stays on the form after success.** On a successful add the submit handler
(`app/office/(shell)/car/car-client.tsx:906-915`) sets the result, clears the local draft and shows
the toast — **no navigation and no form reset**. The Save button is disabled only while the save is
pending (`car-client.tsx:1778`); when it finishes, the button re-enables and the same form can be
submitted again, which mints another UUID and another car. So the duplicate is the after-completion
tap, not the double-tap during the save (that one is blocked).

**The draft path is different.** A draft converted to a car navigates to the created car
(`car-client.tsx:888`), so that path closes the window. Add mode does not.

**It is a spec gap.** `demo_product.pdf` (Non-Functional Requirements) requires: *"Creating/editing a
listing twice in quick succession does not create duplicate records."* So this is not only a PM
finding; the build misses a stated requirement.

**What the task must choose.** The guarantee, not just a patch:

- **(a) A post-save state that cannot repeat** — after a successful add, navigate to the created
  car's edit screen (as the draft path does) or to the inventory. Cheap, and it removes the window
  the user actually hits.
- **(b) A key that belongs to the form session** — generate a submission id when the add form opens,
  send it with the save, and let the server use it as the car's id. A repeat — including a retry
  after a lost response — resolves to the same car instead of making a second one. This fulfils what
  the action's comment already claims ("the key, minted once so a retry is the same car"); today the
  key is minted once **per call**, not once per form.
- **(c) Both.** The navigation closes the ordinary window; the key closes the retry window.

**Leaning:** (c). It is the only option that matches the spec's wording for both "quick succession"
and a retry, and it keeps the existing statement's conflict handling honest.

## 3. The activity log already records the actor

- Every action passes `actorId: session.officeUserId` (e.g. `app/office/actions/car.ts:89,144`;
  `app/office/actions/enquiry.ts:264,337`).
- `getOfficeActivity` resolves it to the operator's email with a left join on `office_user`
  (`lib/office.ts:441-448`); a removed account gives `null`, shown plainly.
- The row displays the operator's **initial**, with the email only in a `title` attribute —
  i.e. **hover** (`lib/activity-feed.ts:96-99`, `app/office/(shell)/activity/activity-client.tsx:134`;
  same helper on the dashboard, `app/office/(shell)/(dashboard)/page.tsx:140`). On a touch screen
  there is no hover, so the actor is effectively hidden.

**What the task must settle:** show the actor in the row itself (the email is already there; a small
label under or beside the action is enough), not only on hover. **Open:** Q9.

## What this means for the layer

Both carried findings are real in the current code — nothing has changed them. The delete button
needs a concrete scope and the privacy notice needs a real channel. The duplicate save is a stated
requirement with a clear guarantee to build. The activity log records the actor correctly; only its
display hides them on touch.
