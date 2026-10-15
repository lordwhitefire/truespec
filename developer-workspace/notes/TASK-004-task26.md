# TASK-004 · Task 26 — Settings save for real (the WhatsApp number cannot be saved wrong)

**Date:** 2026-10-15 · **Status: done.** Built, witnessed against the live store, five gates green,
committed.

## The line that shaped it

Truth 12 (`task.md:180-185`) settles it: the three settings save **for real**, and the number is
"validated inline before it saves, because a wrong one silently kills the showroom's primary action".

So the settings screen stopped being a presentational port. Until now each card held its value in the
browser and announced "(demo)" when it was "saved" — a reload put the old value back and the showroom
never moved. Now the value goes to the `setting` row the showroom reads.

The second line is *how* the number is judged, and it is deliberately one rule and not two. The rule
lives in **`lib/phone.ts`**, which is **pure** (no store, no session, no Next) — precisely because a
`server-only` module cannot be imported by a `"use client"` component, and the screen must validate
while the owner types *and* the action must validate again before it writes. If those two could
disagree, a number could be refused at the field and accepted at the store. There is one reader here,
exactly as the car form has one (`lib/car-input.ts`).

## What changed

- **`lib/phone.ts`** (new, pure) — `normaliseNigerianMobile`, the whole of the rule. The three accepted
  writings (`+234…`, `234…`, `0…`) are one number; a Nigerian **mobile**'s national number is ten digits
  beginning 7, 8 or 9 (a landline there is a dead chat button too). Everything else is refused with a
  reason a person can act on — letters, a partial number, a foreign number without the country code, a
  number that is not a mobile. `waMeDigits` gives the digits a `wa.me` link carries.
- **`lib/phone.test.ts`** (new) — **11/11**. The three writings normalise to the same `+2348031234567`;
  the stored value matches `^\+234\d{10}$`; each refusal names its reason; and the last two prove the
  point of the rule — the **`waLink` the tap button builds** carries those digits, and the digits the
  preview shows are the digits the link opens with.
- **`lib/settings.ts`** (new, `server-only`) — the only door to the `setting` table. `readSettings`
  returns each value **and the row's own `updated_at`** (a key with no row reads as empty and unknown,
  never an invented value). `saveSetting` **judges before it writes** — with `lib/phone.ts` for the
  number, the field's own 80 for the tagline, and the car form's own money rule (`parseCostAmount`) for
  the full-tank default, so a prefill can never be something the form would then reject. A refusal
  returns its reason and writes nothing, which is exactly what leaves the previous value active. The
  write is an **upsert**, so a key whose row is somehow absent is written rather than silently missed.
- **`app/office/actions/setting.ts`** (new) — the three Server Actions. Each checks the session
  (`requireOfficeSession`), calls `saveSetting`, and revalidates. **The showroom reads these** — the
  number builds every chat button — so the revalidation is the root layout (`revalidatePath("/",
  "layout")`), not a list that would have to be kept in step with the showroom.
- **`app/office/(shell)/settings/page.tsx`** — reads the three settings and passes them as props.
- **`app/office/(shell)/settings/settings-client.tsx`** — the three cards now show and save the stored
  values: real async saves with a busy state, inline errors (the number from the one rule, as it types),
  and the stored number shown back normalised (`0803 123 4567` → `+2348031234567`).

## Decisions taken here (and why)

1. **The audit lines under the three cards are now the row's own `updated_at`.** The port carried
   literal dates ("Updated by Umar on 1 Oct 2026, 09:30"). A false timestamp sitting under a value the
   owner just changed is a lie on screen, so it now reads the store. The **actor** is dropped — there is
   no actor column on `setting`, so "by Umar" is not a fact this layer can know.
2. **The `#tagN` quirk is deliberately NOT kept.** The port booted the counter hardcoded at "44" while
   the tagline was 53 characters, and it was documented as intentional. It was only defensible while the
   value was fake. It now counts the real value.
3. **The `.own` note was reworded.** It said "this is a placeholder for the demo … swap in the real
   number before the client sees it" — true of the seeded value, but false the moment the owner saves a
   real one. It now says what the screen actually does: save your real number here and every chat
   button follows it.
4. **The actions take the value as a plain argument, not `FormData`.** There is no form to submit — each
   card is a button beside a controlled input, and the answer (the stored value, or the refusal's
   reason) comes back to the card that asked. The other actions in the house back real `<form>`s, which
   is why they take `FormData`.

## What was verified

- **`lib/phone.test.ts` — 11/11**, and **249/249** tests overall (was 238; +11).
- **`settings-save-check.ts` — 16/16** against the **live store**. It drives `saveSetting` itself — the
  very function the action calls — and `lib/phone.ts`, the very module the screen validates with:
  - all five refusals return a reason, and **the store still holds the number it held** — the previous
    number stays active;
  - `0803 123 4567`, `2348031234567` and `+234 803 123 4567` each save, and the store holds
    `+2348031234567` — the three writings are one number;
  - the save **moved the row's `updated_at`** (so the audit line is the store's own);
  - **the link resolves, for real**: the stored number builds the tap button's link, and fetching it
    lands on `api.whatsapp.com/send/?phone=2348031234567…` — the number arrives at WhatsApp in one
    piece, which is the whole reason the number has one shape;
  - the tagline and the full-tank default each save for real, and a tagline past its field's length and
    an amount the car form would refuse are both refused with the old value left standing;
  - **and the store is left exactly as it was found** — values *and* audit lines, compared to the
    millisecond. (The witness reads the rows first and a `finally` restores them; an audit line that
    moved because a witness ran would be a lie on the owner's screen.)
- **The door holds:** `GET /office/settings` unauthenticated → Clerk reports `signed-out` and the page
  render-redirects to `/office/sign-in` (`<meta http-equiv="refresh" content="1;url=/office/sign-in"/>`)
  — no settings markup is served.
- **The five gates, in order:** leak-check **PASSED** (18 routes); typecheck **clean**; **249/249**;
  build clean with `/office/settings` at 7.15 kB; store-freshness **PASSED**.
- **Live store intact after every run** — `whatsapp_number` `+2348000000000`, `tagline` "Cars you can
  trust, prices you can see.", `full_tank_default` "0", all three with their original `updated_at`;
  `car` 17, `enquiry` 6, `draft` 0, `car_photo` 49.

## Not verified

- **The signed-in browser path** — the standing Checkpoint B gap. The only part of this task the witness
  cannot reach is the action's session check (`requireOfficeSession`); the save it guards is driven
  directly. The screen's own interaction (typing, the inline message, the toast, the busy state) is not
  exercised in a browser.

## Findings — two things this task does *not* reach, and both want a ruling

Task 26's own proof line is about the number (`task.md`: "proof: 0…, 234…, +234… all normalise; a
malformed save leaves the old value; a public wa.me link resolves"), and its declared files are
`app/office/actions/setting.ts`, `settings/*` and `lib/phone.ts` + test. The save is real and the screen
shows what the store holds. Two consumers the settings *imply* are outside that list, so they are
flagged here rather than built silently:

1. **Nothing on the showroom renders the tagline.** The tagline now persists and is read back into
   Settings, which is what makes the save real, but no public surface displays it — the settings screen
   is currently its only reader. Wiring a public display changes the showroom, which is not in this
   task's files and is not required by any `specs/office-settings` scenario.
2. **The car form does not yet prefill from the full-tank default.** The setting's own description is
   "a form prefill only" (`task.md:181`), and it is saved for real — but it is not yet read by the add
   form, so today it prefills nothing. The change is small (the add page reads it, and the form's tank
   field starts from it in add mode only), but `app/office/(shell)/car/*` is not in this task's files.

Both are one-line changes away and neither blocks this task's acceptance. Raised for the owner's ruling.

3. **The password card is still the port's** — "(demo)" toast, and a literal `demo-only` prefilled into
   the current-password field. That is Task 27's (delegated to the provider), and the standing note about
   "no password material in any application table" holds.
