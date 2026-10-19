# TASK-005 · Task 40 — A draft is never a record, and carries no customer data

**Date:** 2026-10-19 · **Outcome:** done. **Deps:** 36. **Product files:** none — the test is the
assertion. **Verification artifacts:** `task40.mjs`, this note.

## What was built

**A test pins the car payload's boundary.** It builds the car form's field set, captures it through
`captureFormData`, writes it, reads it back, and asserts:

- the payload's keys are exactly the car form's own fields (including `arrivalNote` and
  `privateNote`, which are the car's columns — the showroom may show the arrival note; the private
  note never leaves the office);
- there is no `photo` key and no photo bytes (`File`, `Blob`, `data:image`, base64);
- there is no customer/enquiry-shaped key (`customer`, `buyer`, `enquiry`, `lead`, `contact`);
- the car draft carries no `name`, `fullName`, `firstName`, `lastName`, `phone`, `whatsapp`, `email`,
  `address`, `message`, `customerNote` or `enquiryNote`;
- the car's own notes round-trip unchanged, so the test pins the boundary without deleting the car
  form's own fields.

The existing store test still pins that the only storage keys are `ts-draft:car:*` and
`ts-draft:settings:*`, and that an enquiry/customer key is never written.

**The settings payload is one base and one value.** The live check records `{v, base, value}` for
the tagline card and no customer/enquiry content. The settings card's own WhatsApp number is the
office's business number, not customer data.

## AC

- **Never a record (SD13):** the inventory count read **25 cars — 24 in stock, 1 sold** before the
  car draft, while the car draft existed, and while both drafts existed. It did not move. No Save
  was pressed; **0** server actions posted.
- **No customer name, number or note (SD11):** the car payload's keys are the form's own fields;
  no customer/enquiry key exists; no customer-shaped value was stored. The car's own two notes are
  car columns, not customer notes. The settings draft holds only the tagline base/value.
- **Proven, not asserted:** the stored keys and the actual draft payloads were inspected live; the
  boundary is also a unit test (`npm test`).

## Live witness — both forms, no record, no count change

Attach-only Chrome on `:9222`, public dev server `:3210`, signed in, 1440 × 900. The drive aborts
rather than overwrite an existing draft; the store had none.

| point | inventory count | draft storage |
|---|---|---|
| before | `25 cars — 24 in stock, 1 sold` | `[]` |
| after typing the car form | `25 cars — 24 in stock, 1 sold` | `ts-draft:car:new`: 19 form fields; car's own notes; no photo bytes; no customer key |
| after typing the settings tagline | `25 cars — 24 in stock, 1 sold` | `ts-draft:settings:tagline`: `{v, base, value}`; base is the saved tagline |

- **Car payload keys observed:** `arrivalNote`, `brand`, `cost.clearing`, `cost.full_tank`,
  `cost.purchase_price`, `cost.shipping`, `cost.trucking_ng`, `cost.trucking_usa`, `exteriorColor`,
  `features`, `interiorColor`, `mileage`, `model`, `price`, `privateNote`, `stateId`, `trim`,
  `wasPrice`, `year`; **no** unknown field.
- **Photos:** `photos: []`; no `photo` key; no `File`/`Blob`/`data:image`/base64 in the payload.
- **Network:** **0** `next-action` posts; 6 non-GETs total, all external with no `next-action`.
  **0** console / **0** page / **0** HTTP errors.
- **Cleanup:** both test drafts removed; `[]` `ts-draft:` keys after; Chrome **6 → 6**.
- **Typecheck clean · `npm test` 311/311** (one test added).

Readings: `developer-workspace/scripts/task-005/runs/task40/task40.json`; drive `task40.mjs`.

## Interpretation carried from Task 36

Task 40's "name, number or note" is **customer/enquiry** data (SD11). The car draft necessarily
contains the car's own `arrivalNote`, `privateNote`, and its `stateId`; the settings tagline draft
contains the owner's public tagline. Removing those would break the form's own data. The test pins
that no customer/enquiry record or key is present — not that the car form's own columns are absent.

## Flags / not verified

- **The car's own note fields can hold anything the owner types.** If a customer name or number were
  pasted into the car's private note, it would be stored as that car column. The boundary proved is
  that the device draft has no customer/enquiry record, key, or field; it does not sanitise free
  text inside a car's own note. That is a car form property, not a customer-data store.
- The live drive typed the car form and the **tagline** card, not the WhatsApp/tank cards; the same
  capture path runs for all three. The settings card's business WhatsApp number is not customer data.
- Photo-byte exclusion is unit-proven (Blob), not live-uploaded; the live car draft had no photos.
- No customer/enquiry form was driven: the office has no unsaved typing there, and the feature does
  not touch it.
- The count is read from the inventory screen's server-rendered count; a store-level SQL count was not
  run in this task. The 0 server actions plus the unchanged screen count are the live evidence.

## Verified

Typecheck clean · `npm test` **311/311** · drive **PASS, 0 problems** · inventory count unchanged ·
0 server actions · Chrome **6 → 6** · test drafts removed.
