# P9 — the missing Enquiries entry points

**Status:** owner go, 2026-10-20 — implement now.
**Base:** `a697ce8` (the detail Edit button).
**Why:** P9 was held because the Enquiries page/client were owner-dirty. The owner has now told me to
finish the client entry points and layer on those files, staging only my hunks.

## 1. Download template link

**File:** `app/office/(shell)/enquiries/page.tsx` (owner-dirty)

In `.hbtns`, beside `CreateFromFile`, add:

```tsx
<a className="btn gh" href="/api/enquiry-template">
  <i className="fa-solid fa-file-arrow-down" aria-hidden="true" />
  Enquiry template
</a>
```

Change the import hint to name both supported files:

> Import a filled enquiry template or the sales desk's sheet — its rows become drafts.

No CSS change; `.btn.gh` already exists. The route stays office-only; a signed-in click downloads
`truespec-enquiry-template.pdf`.

## 2. Board `ENQ-####`

**Files:** `lib/office.ts` (clean), `app/office/(shell)/enquiries/page.tsx` (owner-dirty),
`app/office/(shell)/enquiries/enquiries-client.tsx` (owner-dirty),
`app/office/(shell)/enquiries/enquiries.css` (owner-dirty).

- `OfficeEnquiry` gains `ref: string`; `getEnquiries` selects `e.ref` and maps it.
- The page passes `ref: e.ref` into the board rows.
- `BoardEnquiry` gains `ref: string`.
- The card shows the ref under the phone line; the detail dialog gets a **Ref** row.
- CSS adds `.cref` for the card line; the detail row uses the existing `.dgrid` style.
- The ref is the log identifier, not the customer. No name, number or note is added to the log.

## 3. Autofill on a car draft edit

**File:** `app/office/(shell)/car/car-client.tsx` (clean)

- Change `const canAutofill = mode === "add";` to `const canAutofill = !isEdit;` so the button is on
  the Add form **and** a draft edit, and stays off a saved car's Edit.
- Update the comment: the manual forms are where a file becomes the form; a saved car's values are
  the record's, not a file's reading.
- The existing replace confirmation still protects a filled draft. Autofill still fills only the 14
  fields and the primary state; costs, secondary states, sale fields and photos are untouched.

## 4. Staging and commit

- `page.tsx`, `enquiries-client.tsx` and `enquiries.css` carry the owner's uncommitted work. Build a
  temporary copy of HEAD plus only my hunks, apply that patch to the index, and commit; the owner's
  other changes stay unstaged.
- `lib/office.ts` and `car-client.tsx` are clean and stage normally.
- **One commit:** `office: add the enquiry entry points`.

## 5. Verification

- `npm run typecheck`
- `npm test` (expect 360 passed)
- `npm run build`
- Confirm the built Enquiries page chunk carries the template link and the `ENQ-`/ref display.
- The signed-in browser click-through is still blocked by the expired Clerk session; say so in the
  report rather than claiming it was seen.

## 6. Out of scope

- A card-face Edit button. The saved-enquiry Edit is in the detail dialog, as P6 planned.
- Task 53's inventory rows-per-page control.
