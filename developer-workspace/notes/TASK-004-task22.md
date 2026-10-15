# TASK-004 · Task 22 — a car file becomes drafts

**Repo:** `truespec` · **Date:** 2026-10-15 · **Plan row:** 22 · **Status:** built, verified, committed
**Authority:** `openspec/tasks/TASK-004/task.md` — truth 9 (an upload lands as **drafts**, one per
car; **a draft is not a record**; nothing is "inferred, defaulted or invented"; "the state a file
names is applied at the save"), the D16 block (lines 401–407), line 96 (the **receiving** handler
carries the origin check) and line 253 (no GET changes data). Plan block lines 277+.

---

## What was asked

> **AC:** a downloaded blank can hold **more than one car**; the filled file comes back and becomes
> **one draft per car**, with the file itself held. A row that cannot be read is **explained and
> named** — never stored, never silently dropped.
> **Verify:** a 10-car file → 10 drafts; 0 cars; the next `TS-####` untouched; refusals named.

Built in two slices. Slice one (`3167b70`) was the blank's batch and naming contract; this note
covers slice two — the reader, the count, and the upload handler — which completes the task.

---

## What was built

### 1. The blank's contract gains *how a field is read back* (`lib/template-rules.ts`)

The blank already owned the field names. It now also owns **how the owner writes each one** — because
that is the same fact:

- `FEATURE_SEPARATOR = ","` — the blank's fields are single-line and a single-line field cannot hold
  a newline, so the list it asks for is comma-separated and **the caption says so**. The HTML car
  form is a textarea and splits on newlines; two inputs, two separators, each declared with the input
  that has it.
- `isMoneyField(name)` — the store's "an amount of money is a `*_kobo` key" convention. The runtime
  rule is a name suffix with nothing to keep in step; the **test** pins the convention against
  `CAR_RECIPE`, so a new `*_kobo` field joins the money reading by construction and no other field
  can land in it by accident.
- `readingFor(name, kind)` → `FieldReading` = `"text" | "whole" | "money" | "list"`, carried on every
  `TemplateField` as `reads`. The store calls a year, a mileage and a price all `number`; a form must
  not. This is where those two vocabularies part.
- `readCarCount(value)` — the download's `?cars=` fact, pure and testable.
- `isCarFieldNameBeyondLimit(name)` — recognises **our own naming** for a car past `TEMPLATE_MAX_CARS`.
  Without it, a file carrying `brand_21` would read as if car 21 were simply absent: a dropped row in
  silence. The upload refuses the whole file instead.

### 2. One reader for a car's fields, two inputs (`lib/car-input.ts`)

`readCarFields(raw)` joins `readCarInput` in the module that owns "what a car's field means", so
"2,500,000" becomes kobo in **one** place and a feature list splits in **one** place per input.

Where it deliberately differs from the save's reader: **it requires nothing.** A draft may be
incomplete — the owner fills what he knows now and finishes later — so a blank field is not a
failure. What it will not do is invent: a value the file **did** carry and that cannot be read is
named, field by field, and that car is refused rather than a wrong number stored.

Keyed by the **recipe** name, not the blank's — the blank's vocabulary is turned back into the
record's first (`readCarFieldName`). The state is the one field with a destination of its own: a
hand-filled blank can name a state but cannot know a key the store minted, so the state comes back as
a **label** and never enters `values`.

### 3. The file, read (`lib/draft-read.ts`)

Pure — bytes in, drafts and refusals out; no store, no session, no clock, so a filled blank is
readable in a test without a database.

- A text field's value is read by `readCarFieldName` — the **exact inverse** of the mapping that drew
  the blank, so the two halves are one contract rather than two lists that agree today.
- A field this blank does not write is left alone (a foreign file is *not ours*, not guessed at).
  A name that is not a text field is a refusal naming it.
- **One car per page, in order**, so a car's number *is* the page the owner sees — which is what a
  refusal is named by.
- A page with nothing on it is a **refusal**, not a car quietly left out.

Refusal wording is the owner's own: the field's caption from `CAR_TEMPLATE_FIELDS`, minus its
parenthetical. So a bad mileage reads `page 2: "Mileage" — enter a whole number`.

### 4. The write, and the held file

- `lib/draft.ts` — `recordCarDrafts`, one `INSERT … SELECT … FROM jsonb_to_recordset(...)` under
  `ON CONFLICT (id) DO NOTHING`. Each draft's `id` is minted **before** the write and travels *in* the
  statement, so `storeQuery`'s retry (D18) re-runs the same keys and inserts nothing twice. `ref`,
  `state_id` and `content_hash` are absent by design; `is_demo` is left to its default, exactly as an
  owner-created car is.
- `lib/upload-rules.ts` — the pure upload facts: the ceiling, `heldFilename(uuid)` (randomised, the
  owner's name never reaches the store) and `sourceFilename` (the owner's name, trimmed and bounded,
  **stored, never used as a path**).
- `app/api/upload/route.ts` — **POST only**, the origin check **first** (before the body is read or
  the door consulted), then the door, then size, then read, then hold, then record. Its order is the
  order that leaves the least behind: **the file is held only once at least one car has been read
  from it** — a file nothing waits on has no draft that would need its source. The response never
  carries the asset id.

### 5. The download's count (`app/api/template/route.ts`)

`?cars=N`, absent = 1. The count is read **before** the door: a request asking for a blank no blank
can be is refused without a store call, and saying so serves no data. That ordering is also what made
the rule verifiable live — see the gaps below.

---

## Verified

**Automated — `npm test`, 217/217** (was 200; +17 here). New: `lib/draft-read.test.ts` (9),
`lib/upload-rules.test.ts` (3), and 5 added to `lib/template-rules.test.ts`. The reader's tests build
a blank from the blank's **own names** (`carFields`) and read it back, so the round trip *is* the
contract test.

**Witness — `developer-workspace/scripts/task-004/draft-read-check.ts`, 30/30 PASSED**
(`runs/TASK-004-task22-draft-read.txt`). It drives the **real** download (`carTemplatePdf`), the
**real** reader, the **real** write and the **real** asset store. In one run: a 3-car file → 3 drafts
in page order; a 10-car file → 10 drafts; money read as kobo by the form's own rule; the feature list
split the caption's way; the state kept as a name and never as a value; a blank page refused by page;
an unreadable value refused by field; **every page accounted for as a draft or a refusal**; a non-PDF
and a foreign PDF refused whole with reasons; the batch written with one `batch_id`; `values` holding
exactly what the file carried; `car` unchanged at 17; `ts_ref_seq` unchanged at 1025; the file held
under a randomised name and its reference resolving to real bytes; and then **the witness removed
exactly what it wrote** (its own drafts by `batch_id`, its own asset by id).

**Regression — the blank's witness** `template-check.ts` still PASSED after the batch changes.

**Live — dev server on `:3210`** (`runs/TASK-004-task22-live.txt`), all ten as expected:

| Probe | Expected | Got |
|---|---|---|
| `GET /api/upload` | 405 (POST only — no GET can change data) | 405 |
| `POST /api/upload`, no `Origin` | 403 | 403 |
| `POST /api/upload`, foreign `Origin` | 403 | 403 |
| `POST /api/upload`, right `Origin`, no session | 401 `{"ok":false,"reason":"Not signed in."}` | 401 |
| `GET /api/template` | 401 | 401 |
| `GET /api/template?cars=abc` | 400 + reason | 400 `The number of cars must be a whole number, 1 to 20.` |
| `GET /api/template?cars=0` | 400 + reason | 400 `One blank holds 1 to 20 cars, not 0.` |
| `GET /api/template?cars=21` | 400 + reason | 400 `One blank holds 1 to 20 cars, not 21.` |
| `GET /api/template?cars=10` | 401 (a holdable count passes the rule, reaches the door) | 401 |
| `GET /api/template?cars=3` | 401 | 401 |

Pages still serve: `/`, `/inventory`, `/privacy`, `/office` all 200.

**Five gates, in order:** leak-check ✓ · typecheck ✓ · test 217/217 ✓ · build ✓ (with `/api/upload`
in the route table) · store-freshness ✓. Dev was stopped by PID before the build and restarted after.

---

## Not verified — and why

- **The signed-in happy path.** No office session exists here, so nothing signed in can be exercised
  (the standing Checkpoint B gap). What *is* proven is every piece the handler calls — the reader, the
  write, the hold — and every refusal the handler makes. What is **not** proven end-to-end is one
  request going through all of them with a session attached, and the `503` paths (the store or the
  asset store refusing).
- **The `allowedDevOrigins` / production host in the origin check.** The live probes used
  `Origin: http://localhost:3210`, which is the dev host; the same check on the deployed host is not
  exercised here.

## Flags for the owner

- **`?cars=` is the download's count**, default 1, cap 20. The office screen (Task 24) will need the
  input that fills it.
- **A file is held only when at least one car was read from it.** A file where *every* page was
  refused is refused with 422 and **nothing is stored** — no drafts, and no orphaned asset. That is a
  deliberate reading of "a draft that is still waiting has its source in that file": nothing waiting,
  nothing held.
- **`next lint` was not run** (no lint script in this project); typecheck stands in for it.
