# TASK-005 · Task 25 — A refusal keeps its own voice

**Date:** 2026-10-18 · **Outcome:** done. **Deps:** 4.

## What changed

- **`lib/draft-read.ts`** — `refusalReason()` no longer rewrites the field's message when it
  lists why a filled blank's car was refused: it used to lowercase the message's first letter to
  sit after the dash (`"Mileage" — enter a whole number`), flattening the rule into the house
  style. The message is now quoted exactly as its field wrote it:
  `"Mileage" — Enter a whole number; "Doorstep price" — Enter a naira amount, e.g. 12500 or 12500.50`
  (DR12: a refusal quotes a rule the owner must satisfy; the sentence bends around it).
- **`lib/draft-read.test.ts`** — the refusal test now pins the rule's own capitalisation and
  wording (`Enter a whole number`, `Enter a naira amount`), not just the field labels. Written
  before the fix and seen red, then green.

## Files-line discrepancy (the AC governs; Task 13 precedent)

The plan's Files line named `lib/car-form.ts`, `lib/car-input.ts`,
`app/office/(shell)/car/car-client.tsx`. All three were checked: they **carry and display the
field messages verbatim** — no flattening anywhere in them, live or in code. The one flattening
site in the product — recorded in the observations (§3(e), `lib/draft-read.ts:59-65`: "it
*lowercases the first letter* of the field's own message and hangs it after a dash") — is
`lib/draft-read.ts`, the reader behind the **from-file import** ("Create from file"). That is
where the fix landed.

## Live readings — signed in, read-only (no store writes)

`refusal-voice.mjs`; fixture `build-refused-pdf.ts` (a filled blank, two pages, every page
refused — so no car is readable, the upload answers 422 and writes nothing: no draft row, no
held asset). Chrome 3 → 3.

| reading | before | after |
|---|---|---|
| from-file, page 1 | `"Mileage" — enter a whole number; "Doorstep price" — enter a naira amount…` | **`"Mileage" — Enter a whole number; "Doorstep price" — Enter a naira amount…`** |
| from-file, page 2 | `"Year" — enter a whole number; "Was price" — enter a naira amount…` | **`"Year" — Enter a whole number; "Was price" — Enter a naira amount…`** |
| car form (save refused: blank make and model, unreadable mileage, out-of-range year) | `Enter the make` · `Enter the model` · `Enter a year between 1900 and 2027` · `Enter the mileage in km` | **identical** |

Readings `runs/task25/before.json` / `after.json`.

## Verification

`npm run typecheck` clean · `npm test` **295/295** (the draft-read test red before the fix, green
after) · live drive on the signed-in build · the upload path touched no store row and no asset
(every page refused — `cars.length === 0` returns before the hold).

## Honest notes

- One 500 during the first after-run: the store's session check `ETIMEDOUT` (the known
  intermittent Neon); a retry answered 422 normally. Not caused by the change — the dev log's
  stack shows `lib/session.ts` → `fetch failed`, and the before-run's same POST answered 422.
- The dash-joined sentence shape is unchanged; only the rewriting is gone. Per-field refusals
  (state, sale price/date, secondary states) and the form's error-block list show the same
  verbatim messages.
- The car form's out-of-range year was driven as `1500` (its input is `type="number"`, so a
  non-number cannot be typed there; `1500` is what the server's own bound refuses).
