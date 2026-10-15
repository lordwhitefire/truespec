# TASK-004 · Task 23 — the enquiry sheet becomes drafts

**Date:** 2026-10-15 · **Status:** built, verified, committed · **Plan:** `plans/TASK-004-plan.md` §Task 23

## What was asked

Truth 9 / D16, `specs/enquiries`: an uploaded **enquiry file** is read into **drafts** carrying its
five editable details (name, number, what they asked for, note, the state). Nothing enters `enquiry`.
The PDF is held beside the drafts; the same refusal rules apply as for a car file ("nothing is
invented and nothing is dropped in silence").

## The block this task carried, and how it was closed

The plan recorded a **BLOCKED** note: the spec and task.md:308 say the file carries the enquiry's
**five** fields *including the state*, but the only enquiry file that exists — TASK-003's authored
sales-desk sheet (`scripts/task-003/author-enquiry-pdf.mts`, and the real PDF it wrote) — carries
**four**: name, number, `Asked for:`, `Note:` (plus a per-row `Recorded` date), and **no state**.

**Owner ruling (2026-10-15): "continue"** — take the safe reading and proceed; flag any assumption.
So this task was built on two decisions, both taken to be safe *and* to match the one real file:

1. **The enquiry file is the sales desk's own sheet, not a form we draw.** The TASK-003 author script
   calls itself *"the manually prepared enquiry sheet the office imports"*, and truth 9 says the car's
   file "is a PDF; the enquiry's file carries its five editable details … because five fields need no
   made-up form". So there is **no AcroForm**: the reader reads the words the sheet draws.
2. **The state is read only if the sheet names one.** The reader understands a `State:` label and, if
   present, keeps it as the `state_label` (the spec's "MAY hold the state its file named"); the sample
   sheet names none, so its drafts carry `state_label = NULL` and the save (Task 24) asks the owner to
   choose. **This is the one assumption; it is flagged, not hidden.**

**The `Recorded` date is deliberately NOT read** — it is not one of the five editable fields and
"nothing beyond them SHALL be read". A saved enquiry's recorded date is its save time (retention,
Task 27). *Flagged to the owner as the second, smaller point.*

## What was built

- **`lib/enquiry-read.ts` (new).** `readEnquiryFile(bytes)` → `{ ok: true, enquiries, refusals }` or
  `{ ok: false, reason }`, mirroring `lib/draft-read.ts`. Split in two on purpose: `parseEnquirySheet(lines)`
  is **pure** (the whole rule, testable with plain strings), and the PDF half only pulls the words out.
  - The PDF's words are got by decoding the page content stream with the installed **`pdf-lib`**
    (`decodePDFRawStream`) — **no new dependency** (only `pdf-lib` is installed; there is no
    text-extraction library). The stream is decoded as **Windows-1252**, because the sheet's fonts
    declare `WinAnsiEncoding`: a byte like `0x97` is the **em-dash** the owner sees, not the control
    character a Latin-1 read makes of it (this bug was found and fixed during verification).
  - Rows come from the sheet's own shape: the `Name … Phone … Recorded` header, then each row's
    name/number/day line followed by its labelled details. `Asked for:` → `asked_for`, `Note:` → `note`,
    `State:` → `state`. A label that is not one of the five is **the sheet's own word and is left alone**.
  - **Nothing is invented:** a field the sheet left off produces no value. **Nothing is dropped in
    silence:** a detail written twice refuses the **row** (we will not guess which value is right), and a
    line that is neither a detail nor a row is refused by **row number**. A sheet that is not ours (no
    title / no column header) is refused whole.
- **`lib/draft.ts` (edited).** One insert for both kinds: `kind` now travels as a **parameter** (`$5`),
  not the literal `'car'`; the store's own `CHECK (kind IN ('car','enquiry'))` (`migrations/0022_draft.sql`)
  is what makes a third kind impossible. New `recordEnquiryDrafts(batch)` beside `recordCarDrafts(batch)`;
  both share one `recordDrafts`. `recordCarDrafts`'s shape is unchanged, so its witness needed no edit.
- **`app/api/upload/route.ts` (edited).** The route now dispatches: it asks `readCarFile` first; a
  **car file** records as before, but `NOT_OUR_TEMPLATE` (a readable PDF that carries none of our car
  fields) is the one failure that means *try the other kind*, so it then asks `readEnquiryFile`. The
  origin check, door, size ceiling, hold and record are all shared between the two kinds in one `hold`
  step, so the two paths cannot drift on the parts that must match.
- **`lib/enquiry-read.test.ts` (new, 11 tests).** The pure rule: one row's fields; every row in the
  sheet's own order; a row carrying only what it was given; the state read as a name (and not as one of
  the record's fields); no state when none is named; a label that is not ours left alone; a detail
  written twice refusing the row; an unplaceable line refused by row; a foreign PDF refused whole; our
  heading with no column header refused whole; all-rows-refused still answering with the refusals.

## Verification (all run in this session)

- **`npm test` — 228/228** (was 217; **+11** enquiry tests).
- **`npm run typecheck`** — clean. (`tsconfig` typechecks `**/*.ts`, so the witness is covered too.)
- **Witness `developer-workspace/scripts/task-004/enquiry-read-check.ts` — 21/21.** The **real** sample
  sheet (`scripts/task-003/runs/task-13/enquiries-2026-09-30.pdf`) reads as **four drafts, in order**,
  zero refusals; the first row's name/number are "Ada Nwosu" / "0803 000 0101"; what they asked for is
  read whole **including the em-dash** ("a 2021 Camry XSE V6 — the black one on your lot"); a draft's
  `values` is exactly `asked_for, name, note, number`; every draft's `state_label` is `NULL`; a non-PDF
  and a foreign PDF are each refused whole with `NOT_AN_ENQUIRY_SHEET`; the write records **one batch**
  of **4**, every row `kind = 'enquiry'` and not a demo row, the owner's filename kept trimmed; `enquiry`
  is **6 → 6** (a draft is not an enquiry); the held file gets a randomised name and its reference
  resolves to real bytes; then the witness removed exactly what it wrote (store back to size).
- **`npm run build`** — passed; `/api/upload` in the route table.
- **`leak-check`** — PASSED (flaky connection; passed on retry): no customer detail on any of the 18
  public routes, including the new enquiry reading.
- **`store-freshness`** — PASSED: none of 9 store-reading routes was prerendered and no DB response was
  cached.

### Store handling note (environment)

The Neon store became **unreachable mid-run** (both pooled and unpooled endpoints `ETIMEDOUT`;
the IPv6 route has been `ENETUNREACH` throughout the session). The witness succeeded before the drop,
`store-freshness` after it; `leak-check` and the raw connectivity probe failed between and later
recovered. All store failures seen here were **transport**, not the change — no gate failure was
caused by this task.

## What was **not** verified (honest gaps)

- **The signed-in upload happy path** — there is no office session here (standing Checkpoint B gap).
  The door (`401`) and the origin check are proven live by the earlier curls, not by this witness.
- **The `503` store/asset failure paths** — not exercised.
- **The state-carrying case** — no real sheet names a state, so the `State:` branch is proven only by
  the unit test (a synthetic line), not against a real file.
- **A real `Recorded` date is not read** — by decision (above); if the owner rules the file *does*
  carry the date or the state, this reader is the one place to change.

## Files

- `lib/enquiry-read.ts` (new) · `lib/enquiry-read.test.ts` (new)
- `lib/draft.ts` (edited) · `app/api/upload/route.ts` (edited)
- `developer-workspace/scripts/task-004/enquiry-read-check.ts` (new witness)
- `developer-workspace/plans/TASK-004-plan.md` (Task 23 block updated)
