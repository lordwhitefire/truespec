# TASK-004 · Task 11 — the car form wired to the store

**Date:** 2026-10-15 · **Status:** built; app gates green; store path witnessed.
**Browser check deferred** — the office car form needs a signed-in session (the owner's
Clerk account), which is Checkpoint A's remaining item.

## What changed

- `app/office/(shell)/car/car-client.tsx` — the form is now a real `<form onSubmit>`:
  - every stored column carries its own `name` (the action's `toCarForm` contract):
    `brand, model, trim, year, exteriorColor, interiorColor, mileage, features,
    privateNote, wasPrice, arrivalNote, price, stateId, secondaryStateIds, cost.<kind>`.
  - **primary-state picker** built from the registry's four primaries (`primaries` prop);
    the chosen one rides a hidden `stateId` input.
  - **secondary-state multi-picker** from `secondaries` (checkboxes → `secondaryStateIds`).
  - the private-note textarea writes `private_note` (was the reference's demo `note`).
  - a new **"was" price** field (`wasPrice`), judged at its own field by the one amount
    predicate, same as the doorstep price and the six costs (R-MON-10).
  - add-mode **Save** calls `createCar` in an async transition; field refusals render at
    their fields and the new `TS-####` ref is shown. Edit-mode Save stays demo until Task 12.
  - cost figure named by state (R-MON-7): "Estimated total cost" until landed.
- `app/office/(shell)/car/page.tsx` — the stale "not owned by the office data model"
  comment is corrected (the store owns these columns; the form saves what it shows);
  `stateSections` replaced by `primaries`.
- `app/office/(shell)/car/new/page.tsx` — passes `primaries`.
- `lib/office.ts` — **bug fix** (below).

## The bug found (and fixed)

`getOfficeSecondaryStates` (added in `9c1a5a5`) mapped every secondary's row through
`sectionOfState(r.label, r.section)`. But by D15 a **secondary carries no section** —
`migration 0020` sets `section = NULL` for secondaries — and `sectionOfState` **throws**
when the configured section is empty ("maps to no section"). Verified against the live
store with `scripts/task-004/secondary-section-check.ts`: all three secondaries have
`section IS NULL`.

Consequence: `/office/car` and `/office/car/new` threw at runtime the moment they called
`getOfficeSecondaryStates()`. Typecheck and build never caught it (the query only runs per
request). Fix: a secondary gets its own shape, `OfficeSecondaryState = { id, label }`, and
`getOfficeSecondaryStates` no longer resolves a section it cannot have.

## Readings made (no owner ruling needed — already settled)

- **"estimated" is the cost figure's name, not the profit figure's.** `task.md` acceptance 4
  says "the profit figure … says 'estimated' until the car is landed"; the money spec and
  the owner's TASK-002 ruling (R-MON-7) name the **cost** figure by state — "Estimated total
  cost" until landed. The live panel beside the form reads `{costLabel} — live`, so it says
  "Estimated total cost" for an On Order car. No "estimated profit" label was invented.
- **The form's notes textarea is the private note.** The reference's single "Notes to self"
  field (heading "Private notes", "never sent to the showroom") maps to `private_note`.
- **`note` (the public note) is owned but not a form field.** The reference has no separate
  public-note input and the public read path does not select `note`. Left out; not invented.

## Carried, not in Task 11's AC (noted for later tasks)

- **The "New arrival" checkbox** now does nothing: `is_new_arrival` lives on `car_state`
  (a primary-state property), not on `car`, so a per-car flag has nowhere to store. It was
  already inert before this task. Resolve with the registries (Task 15).
- **Edit mode** does not yet read the car's own `private_note`/`was_price`/secondaries —
  `getOfficeCarViews` does not select them; that is Task 12's edit wiring. Add mode submits
  the real values.

## Verification

- Gates: leak-check ✅ · typecheck ✅ · test **95/95** ✅ · build ✅ · store-freshness ✅.
- Store witness `scripts/task-004/create-car-check.ts` **PASSED** — the same statement the
  action runs creates a car carrying a private note and a was-price, re-reads them, and a
  retry with the same key is a no-op (rolled back).
- Field-name contract checked: the form's `name`s are exactly `toCarForm`'s, less `note`
  (intentionally not a form field).
- **Not verified:** the form in a browser (needs a signed-in session); create through the
  UI. The live "estimated" label is proven by the `costLabelFor` unit test, not by eye.
