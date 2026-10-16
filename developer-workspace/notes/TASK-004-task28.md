# TASK-004 · Task 28 — The export (one action → one ZIP)

**Date:** 2026-10-16 · **Status: done.** Built, opened by an independent extractor, five gates green.

## The claim

Truth 13 (`task.md:186-195`) and AC 14 (`task.md:555-558`):

> *"One action produces everything the system holds — every car with its costs and photos, every
> enquiry, every tap, every activity row and every setting — and it is **one download, not two**: a
> single **ZIP** archive holding **`master.json`** — a machine-readable master that keeps the shape of
> the data (a car's cost lines and photo list nested where they belong) — and **one CSV per subject** …
> It also carries a short **`README.txt`** naming what is inside and when it was made, and it is **not
> an Excel workbook** … and the export is reachable **only from inside the office** — never a public
> path."*
>
> *"…requesting the same export without a session returns nothing."*

So: nine files in one archive, the nesting intact, and a door.

## No dependency was added

`package.json` carries **no ZIP and no CSV library** (`jszip`, `archiver`, `adm-zip`, `fflate` are all
absent; `pako` is present but only as a transitive, so importing it would be reaching through someone
else's dependency). Rather than add three packages to write a file the platform can already write,
the container is built from Node's own `zlib` — verified on this machine, **v22.23.1**: `crc32`,
`deflateRawSync`, `inflateRawSync`.

**`lib/zip.ts`** writes the three structures an extractor looks for — local file header
(`0x04034b50`), central directory (`0x02014b50`), end record (`0x06054b50`) — little-endian, with the
UTF-8 name flag set and **the CRC taken over the *uncompressed* bytes** whichever storage method is
used (reading the CRC from the wrong buffer is the classic way to produce an archive that extracts and
then reports a checksum error). A stored entry is used when deflate does not actually pay — which is
why `taps.csv`, a 20-byte header-only file, appears in `zipinfo` as `stor` while the rest are `deflN`.

**`lib/csv.ts`** writes RFC 4180 as written: commas between fields, CRLF between records, quotes
doubled, and a field quoted only when it must be. **A null is an empty cell** — the format has no word
for "no value" and inventing one (a dash, `NULL`) would put something in a cell the store does not
hold, which is the opposite of what an export is for.

Both are **pure modules with tests** — the `lib/phone.ts` / `lib/notices.ts` pattern, and for the same
reason: a `server-only` module cannot be unit-tested, and these are the parts that must be right.

## Three things the store itself decided

1. **The header comes from the catalog, not from a row.** Two subjects are **empty in the live store**
   (`tap` 0, `activity_event` 0), and a Neon result with no rows carries **no keys at all** (verified:
   a 0-row query returns an empty array with `Object.keys` = `[]`). A header read from `row[0]` would
   therefore have written `taps.csv` with no columns. Each file's columns come instead from
   `information_schema.columns`, which has one property a hard-coded list cannot have: **it cannot
   drift from the table.** If the store gains a column, tomorrow's export carries it with no code
   change here — and `cellFor` refuses to write a cell for a column the query did not return, so a
   disagreement raises instead of emitting a hollow export.

2. **`timestamptz` comes back as a real `Date`** (checked at runtime, not assumed), so the CSV's
   ISO-8601/UTC rule and `JSON.stringify` produce **the same string** — which is what lets the README
   claim the two files "always say the same thing".

3. **The office's own readers cannot serve an export**, and each for a reason that is deliberate
   elsewhere: `getOfficeCars()` returns a *view* (it drops the colours, the features, the notes,
   `private_note` and the timestamps); `getOfficeTaps()` and `getOfficeActivity()` are **capped at
   200** because they feed a panel; `readSettings()` reads only the keys the code already knows. So
   `lib/export.ts` reads the seven tables itself — complete, uncapped, in a deterministic order.

## Decisions taken here

1. **Every car, tombstoned or not.** This is the one place that does **not** filter
   `deleted_at IS NULL`. The office's inventory excludes a tombstone because the clear-out is coming;
   the export's job is different — a tombstoned car's cost lines and photos are still in the store, and
   dropping the car would leave those children in `costs.csv` and `photos.csv` with nowhere to nest in
   `master.json`. That is precisely the AC's *"the nested master, parts intact"*. `deleted_at` travels
   with the row, so a tombstone reads as exactly that. (There are **0** tombstones today, so this
   changes nothing now and everything the first day one exists.) This follows the owner's own earlier
   ruling — *"deleting a draft leaves its assets"* — that deletion does not immediately destroy what a
   record held. **Flagged for a ruling.**
2. **Two foreign keys are resolved, because their registries are not among the seven subjects.** A car
   carries `state_id` (the `car_state` registry) and an activity row carries `actor_id`
   (`office_user`); neither registry is exported. Writing only the ids would hand the owner a column of
   UUIDs pointing at rows the same archive does not contain — a dead end. So both rows carry the id
   **and** the value it names (`state`, `actor`), exactly as the office's own readers resolve them.
   Nothing else is derived: no totals, no formatting, no invented values.
3. **`master.json` is the master of everything**, with the nesting where the spec puts it: `counts` and
   `exported_at`, then `cars` (each with `cost_lines` and `photos` **nested**, matched by `car_id`),
   then `enquiries`, `taps`, `activity`, `settings`. Costs and photos are deliberately **not**
   top-level — they live where they belong.
4. **The refusal is an empty body.** The spec's word is *"returns nothing"*, so a request with no
   session gets `401` and **0 bytes** — not even a sentence. That is a deliberate difference from the
   template route beside it, which sends a plain-text line; an endpoint that would otherwise confirm
   which subjects exist is better off saying nothing.
5. **No origin check on this route, and that is not an omission.** D17 puts the origin rule on
   handlers that *receive* something (the upload, the writes); a cross-origin `GET` with no body has
   nothing to forge, and its response is not readable by the caller anyway. What protects these bytes
   is the session — the same thing that protects the same rows on `/office/*`.
6. **The Settings control is a plain `<a>`, never `Link`** — `Link` prefetches when it scrolls into
   view, which would build a whole archive the owner never asked for.

## What was verified

- **`lib/zip.test.ts` + `lib/csv.test.ts` — 18/18** (the suite went 260 → **278**): the CRC is the
  standard CRC-32 (`crc32("123456789") = 0xCBF43926`) taken over the uncompressed bytes for a
  *compressed* entry too; every payload round-trips through Node's own `inflateRawSync` and checksums;
  the central directory's recorded offsets point back at real local headers carrying the same CRC; the
  timestamp reads back as the UTC instant asked for; empty files and >65535 entries handled; and for
  CSV, quoting, doubled quotes, embedded CRLF, nulls-as-empty-cells, ISO dates, jsonb and a strict
  RFC 4180 re-parse.
- **`export-check.ts` — 52/52, and 40 of them are an *independent* implementation.**
  `export-unzip-check.py` opens the real archive with **Python's `zipfile`** (its own CRCs via
  `testzip()`) and parses the CSVs with **Python's `csv`** — a different implementation from the
  hand-rolled writer, so if `lib/zip.ts` or `lib/csv.ts` were wrong it would disagree. It checks:
  the nine expected files and nothing else; **the README is first**; every entry's CRC verifies;
  `master.json`'s counts equal the store's own counts; **the nested cost lines and photos total their
  subjects**; **each car nests exactly the rows `costs.csv`/`photos.csv` file under it, id for id**
  (this is what "parts intact" means, not merely equal numbers); every CSV header equals the store's
  own columns in order; every row is as wide as its header; and the README names the date and every
  file. Plus the archive itself: it begins `PK\x03\x04`. **`zipinfo` and `unzip -t` (a third
  implementation) both read it cleanly.**
- **The live store, counted here, not by the code under test:** cars **17**, costs **99**, photos
  **49**, enquiries **6**, taps **0**, activity **0**, settings **3** — and the archive's counts match
  to the row.
- **The door holds, over real HTTP, with no session:**
  `GET /api/export` → **`401 Unauthorized`**, `x-clerk-auth-status: signed-out`, `cache-control:
  no-store`, and a body of **0 bytes** — no ZIP signature, no subject name. (The archive is 24,081
  bytes when it *is* built.) A `404` would have meant no route; the `401` proves the route exists
  behind the door.
- **The build:** `/api/export` is **`ƒ` (dynamic, server-rendered on demand)** — never prerendered; the
  route's own strings (`truespec-export-`, `application/zip`, "The export could not be built") and the
  card's copy ("Download the export", "Take everything with you") are all present in the built server
  output; `/office/settings` grew **6.77 → 7.05 kB**.
- **The five gates, in order:** leak-check **PASSED** (18 public routes, nothing leaked);
  typecheck **clean**; **278/278**; build clean; store-freshness **PASSED** ("none of 9 store-reading
  route(s) was prerendered").
- **The store is untouched** — the export is read-only and every run was a read.

## Not verified

- **The signed-in branch of the route** — the standing Checkpoint B gap, confirmed again here:
  `getOfficeSession()` calls Clerk's `auth()` and there is **no dev bypass** (`lib/session.ts` has no
  local fallback). So the route's `200` path — the one that actually serves the archive — cannot be
  exercised from this machine. What *is* proved instead: the content, end to end, from the live store
  through `buildExport`/`buildZip` and into an independent extractor; and the refusal, over real HTTP.
  The bytes that would be served are the bytes that were verified. It is the *serving* that is
  untested.
- **The card's pixels** — no office session, so the Export card has not been seen rendered (as with
  every office screen).

## Findings — for a ruling

1. **`master.json` includes tombstoned cars.** The spec says the export holds *"every car"*, and the AC
   says the nesting must survive *"parts intact"*; including them is the only way both hold once a car
   is tombstoned with costs and photos still in the store. Today there are **0**, so this is a choice
   about the future, not an observable difference now. If the owner would rather the export show only
   the live fleet, it is a one-line change (`WHERE c.deleted_at IS NULL`) — but then a tombstoned car's
   cost lines and photos appear in `costs.csv`/`photos.csv` with no car to nest under.
2. **The two resolved columns** (`cars.csv.state`, `activity.csv.actor`) sit beside their ids. Without
   them the archive refers to rows it does not contain. If the owner would rather export the
   `car_state` / `office_user` registries as subjects too, that is a ninth and tenth CSV — the spec
   names seven.
3. **Still open from Tasks 26/27, untouched here:** nothing on the showroom renders the **tagline**;
   the car form does not **prefill from the full-tank default**; and
   **`store-freshness-check.ts`'s `STORE_ROUTES` list is stale** — it omits `/office/drafts`,
   `/office/enquiries`, `/office/car/[ref]` and `/office/settings`. It does not bite (all are `ƒ`
   dynamic) but the gate would miss one if it were ever prerendered. Carried to Task 29.
