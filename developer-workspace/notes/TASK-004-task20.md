# TASK-004 · Task 20 — the car PDF blank, served at the upload point

**Repo:** `truespec` · **Date:** 2026-10-15 · **Plan row:** 20 · **Status:** built, verified, committed
**Authority:** `openspec/tasks/TASK-004/task.md` — the "blanks are ours" truth (lines ~152–158), the
Route-Handler rule (line 96: a handler that *receives* something carries the origin check; a
download does not), and "the car template downloads there" (line ~406). Plan block lines 259–262.

---

## What was asked

> The car's template — its **fourteen editable details** — is a PDF; the enquiry's five-field file
> needs no made-up form.
> **Verify:** the blank downloads and opens; its fields are exactly the fourteen in
> `lib/change-check.ts`'s car recipe.

The blank is *ours* — the office hands out the form, so the file the owner fills in is a file the
upload can read back. That is the whole reason it exists: a file we did not design is a file we
cannot read.

---

## What was built

| File | What it is |
|---|---|
| `lib/template-rules.ts` | The contract: the blank's fields, built **from `CAR_RECIPE`** — not from a second list. Plus the words the owner reads, and the download's name and type. No `server-only`, no pdf-lib: pure, so the upload can use the names without the PDF machinery. |
| `lib/template-rules.test.ts` | 7 tests holding the names and the words to the recipe: one field per recipe field, in order, no extras, names unchanged, every field carries words, kinds carried. |
| `lib/template.ts` | `carTemplatePdf()` — the bytes. A4 portrait, one page, fourteen **real AcroForm text fields**, one car to a page, drawn dull on purpose. `server-only`. |
| `app/api/template/route.ts` | `GET`, **office-only** (`getOfficeSession()` → 401 for anyone else). `GET` only: there is no `POST` here — the upload is a different handler and is the one that must carry the origin check. |
| `app/office/(shell)/inventory/page.tsx` | A **"Car template"** link (secondary `.ghost`) beside "Add a car" — the download at the point where the upload will happen. |
| `app/office/(shell)/inventory/inventory.css` | `.hbtns` — the house arrangement, copied from `car.css`/`enquiries.css`; one line so the ghost is a box rather than a line of text. |
| `developer-workspace/scripts/task-004/template-check.ts` | The witness: 22 checks. |
| `package.json` / `package-lock.json` | `pdf-lib@^1.17.1` added — see *The dependency* below. |

### The one source

The fourteen field names are `CAR_RECIPE`'s fourteen, taken by import, not retyped. So the blank,
the record and the change-check cannot describe a car differently: a fifteenth editable field
appears on the blank the moment it appears in the recipe, and cannot appear on the blank without
appearing there. The test that proves it is a set-equality both ways.

**One name differs, deliberately.** A form the owner fills by hand can carry the state's **name**
("On Order"), never a key the store minted. So the state's field is **`state`**, and the mapping to
the recipe's `state_id` is declared once in `lib/template-rules.ts`. Truth 9's own words back this:
"the state a file names is applied at the save", and D16 stores it as `state_label` — *a name, never
a state id*. Naming the field `state_id` and filling it with a name would have been a lie in the
file's own vocabulary.

**Nothing else is asked for** — asserted by name (`id`, `ref`, `is_demo`, `version`, `state_id`,
`cost`, `photos`, `notes`: absent) as well as by the set equality, because truth 9 says "a file
carries the record's editable fields and nothing else — nothing beyond them is read, inferred or
filled in".

### The dependency — `pdf-lib`, and why

The pages needed a real PDF **form**: a picture of a form cannot be read back, so the values have to
live in AcroForm fields. Nothing in the repo could write one.

- **`pdf-lib@1.17.1`** — MIT, pure JS (no native build), the canonical create-and-read-AcroForm
  library. Chosen because its create *and* read API is the one I could **verify from its own
  documentation and source today**, which matters: Task 22 must read a form filled by *someone
  else's* reader (Acrobat, Preview, Chrome, Firefox), and that is the part where being wrong is
  expensive.
- It has been **unmaintained since November 2021**. I know, and it is stated rather than glossed: the
  maintained drop-in fork is `@cantoo/pdf-lib` (MIT, v2.11.1, published 2026-09-15). The mitigation is
  structural, not optimistic — **every use of pdf-lib is inside `lib/template.ts` and
  `lib/template-rules.ts`**, so moving to the fork is an import change in two files, and the witness
  is what would catch a difference. If the owner would rather not carry a frozen library, that is one
  small change; flagged rather than decided silently.
- It brought 4 transitive packages (`@pdf-lib/standard-fonts`, `@pdf-lib/upng`, `pako`, `tslib`) and
  **moved no existing version** (verified against `HEAD`'s lockfile).

---

## What was verified

All five gates, in order, on the committed tree:

| Gate | Result |
|---|---|
| `leak-check` | **PASSED** — no cost, currency, profit, asset reference, customer detail or office state label on any public route |
| `typecheck` | clean (exit 0) |
| `test` | **194/194** (was 187; +7 rules tests) |
| `build` | green — `/api/template` a **dynamic** route (`ƒ`) |
| `store-freshness` | **PASSED** — none of 9 store-reading routes prerendered |

Witness `developer-workspace/scripts/task-004/template-check.ts` — **22/22**, transcript kept at
`developer-workspace/runs/TASK-004-task20-template-check.txt`:

1. the download is a PDF (`%PDF-1.7`), whole (`%%EOF`), 7.7 kB;
2. it opens as a PDF, **one page**;
3. it asks for **exactly the car's fourteen editable details** — the field-name set equals
   `CAR_TEMPLATE_FIELDS`'s, both directions;
4. it asks for nothing else — `id`, `ref`, `is_demo`, `version`, `state_id`, `cost`, `photos`,
   `notes` are each absent by name;
5. every field is a **`PDFTextField`** — a field a reader can fill, not a checkbox or a dropdown;
6. the blank is **empty** — all fourteen values absent;
7. **a filled copy round-trips**: fourteen values written → saved → reloaded → read back exactly, the
   state included as the name ("On Order");
8. **the value is in the file's own bytes**, not just the object graph;
9. **office-only, proven live**: `GET /api/template` with no session → **401**,
   `text/plain; charset=utf-8`, body `"Not signed in."`, **no `%PDF` in the response** — the blank
   does not leak to a caller without a session;
10. **the route has no `POST`**: `POST /api/template` → **405**.

Live confirmations on `:3210` after the build: `/`, `/inventory`, `/privacy`, `/office` → 200;
`/api/template` → 401.

### Two facts the witness turned up that Task 22 will want

- **A text field's value is serialised the way a real reader serialises it**: a hex string holding
  UTF-16BE behind a byte-order mark — `/V <FEFF005A...>` — **not** ASCII. So a byte-level search for
  a typed word will not find it. (Found the hard way; the check now looks for the encoding.)
- **pdf-lib's default save packs objects into compressed object streams** (`useObjectStreams: true`),
  which is the shape a real reader's save has. Reading works regardless; only a literal in the raw
  bytes needs `useObjectStreams: false`. Neither costs the reader anything.

---

## What was NOT verified

- **The signed-in download was never exercised.** `/api/template` is Clerk-gated, and there is no
  office session here, so the developer cannot reach the 200: the `content-disposition` filename, the
  `application/pdf` type and the bytes over HTTP are **not** confirmed end-to-end. The *content* is
  proven directly (the same `carTemplatePdf()` the route calls, checks 1–8) and the *refusal* is
  proven live (check 9). What remains unproven is the two lines of header the route sets on the
  signed-in path. **Standing gap, same one reported at Checkpoint B** — the owner's session is the
  only way in.
- **`/office/inventory` was not driven in a browser** for the same reason. The link and the CSS were
  read back from disk; the page's render is gated.
- **The blank was not filled in a real PDF reader** (Acrobat/Preview/Chrome) and read back. The
  round trip is proven *within pdf-lib* (check 7). Whether a specific desktop reader writes the value
  to `/V` rather than only into an appearance stream is the one thing no local test can settle —
  it is settled on the first real upload in Task 22. Named so it cannot be mistaken for proven.
- **The blanks are one car to a page.** Task 22's verify needs "a 10-car file → 10 drafts", so
  Task 22 extends the blank with a per-car grouping of the field names **in the same change as the
  reader that reads them** — deliberately not guessed here, where no reader exists to test the shape
  against. The `state`↔`state_id` mapping and the recipe-driven field list are the parts that will
  not move.

---

## Flags for the owner (not blocking, not decisions I need)

1. **A new dependency entered the project** — `pdf-lib`, unmaintained since 2021. Reasons and the
   one-import-change exit are above. Say the word and it becomes `@cantoo/pdf-lib`.
2. **The blank says "NGN", not "₦".** The PDF's built-in fonts are WinAnsi and **cannot draw a naira
   sign** — `drawText` throws. Letters instead of a glyph costs a reader nothing, but it *is* a
   difference from the office's own screens, which write "₦". Putting the sign on the blank means
   embedding a font file, which means adding a font binary to the repo. Flagged; reversible.
3. **The "Car template" link sits on `/office/inventory`** (beside "Add a car"). That is where the
   spec puts it ("the car template downloads there", with "Create from file"). When Task 22 adds the
   file input, the link may want to move next to it — a one-line move, flagged so it is not a
   surprise.

---

## Notes on the craft

- **The recipe is the single source.** The blank has no list of its own to fall out of step with the
  change-check — which is the same failure mode as a second copy of the field names, and it is the
  reason the test asserts set-equality in *both* directions rather than a count.
- **A missing word is a loud failure**, not a blank label: `wordsFor` throws if the recipe grows a
  field with no words, and the test fails.
- **A fresh document per request.** Nothing is cached and nothing is stored, so a download cannot
  hand out a copy somebody filled in — the risk that comes with generating a document once and
  serving it forever.
- **`GET`-only, and the reason is stated in the file.** The origin check on line 96 belongs to the
  handler that *receives* something (the tap, the export, the upload); a download receives nothing,
  so the check that matters for it is the session, and it has that.
- The witness originally contained a check that could not fail (it compared `TEMPLATE_FILENAME` with
  itself via an `||` fallback). It was **deleted rather than shipped** — a check that always passes is
  worse than no check, because it is counted. What replaced it is the honest pair either side of it:
  content proven directly, refusal proven live.
