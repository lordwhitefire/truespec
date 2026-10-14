# TASK-003 — follow-up v1: cars and enquiries kept apart, and a change-check that spares the filler

**Version 1 — written 2026-10-13; the shape was agreed the same day (see Round 1 below).**
A plan, not instructions: it says what must be true and what must not happen, and leaves the rest to whoever builds it.

---

## Why this file exists

TASK-003 is built and re-verified, but the build left things unsettled, and checking the owner's "key and hash" note against the live store found them. The first draft of this file got one of them wrong — it proposed tying an enquiry to a car by the car's key. **The owner corrected it (2026-10-13): the car and the enquiry are two different things and stay separate.** This version carries that correction.

The three things that are still wrong in the store:

1. an **enquiry is tied to a car** — the store holds `enquiry.car_ref`, and the spec said enquiries join to the car by its code;
2. the car's **key and spoken code are protected by habit only** — nothing in the store refuses a change to them;
3. the **filler deletes**, while truth 10 says nothing is deleted on the owner's behalf.

And the framing question is settled (owner, 2026-10-13): **the demo fleet is the only fleet there is for now.** The client's real cars can only come from the client, so nothing here waits for them — and the store is not left empty in the meantime. The demo is rebuilt.

---

## What is true today (and should not be)

**1. An enquiry is joined to a car — and that is wrong.**
`enquiry` carries `car_ref` (plain text), and `specs/inventory` said *"enquiries, taps, and activity rows join to the car by this reference."* An enquiry is not a statement about a car we hold. It is a **customer asking for a car** — often a car we do not have, sometimes several at once. A join would have to invent a car row for something we do not sell, or stand empty in exactly the normal case. It also fuses two records the business keeps apart: cars are what we sell; enquiries are who asked.

**2. "Given once, never reused, never changed" is only a habit.**
The code is assigned by the store and deletion is a tombstone — both true. But nothing stops an update changing a car's key or its code. The promise holds because no code does it, not because the store refuses it.

**3. The filler deletes.** `scripts/seed.ts` erases its own demo enquiry rows, and the cost lines and photos of its cars, then writes them again so a second run does not double them. Truth 10 names "a seed" among the things that must not delete. The plan and the build disagree, and the build must move — not the plan.

---

## What must be true after this

1. **A car and an enquiry are separate records, and nothing joins them.** An enquiry holds the customer (name, number), **what they asked for in the customer's own words**, any note, the state the owner gives it, its imported PDF and its dates — and no reference of any kind to a car. What they asked for may be a car we do not hold, or several cars at once. **No car row is ever created, changed, or implied to make an enquiry fit.** Two customers asking for the same car are two enquiries; a car may have no enquiry at all.
2. **Everything that really is about a car we hold names it by its key.** Photos, cost lines and the sale use the car's key, and the store refuses a row about a car that is not there. Taps are the showroom's own count: a page, the car's code and the time, and nothing about the visitor.
3. **Each record carries its own identity and its own change-check.** The car's identity is the car's; the enquiry's is the enquiry's. Neither borrows the other's, and neither is built from the other's details.
4. **The car's key and its spoken code cannot change** — not in a form, not by a stray update, not by a bug. "Given once, never reused, never changed" is kept by the store, where it counts.
5. **The filler removes nothing.** Run once or twenty times it leaves the same content: the row it wrote before is found by a handle the recipe itself gives it, changed only where the recipe changed, and never deleted. Nothing it touches can be a row that is not its own.
6. **The demo fleet is present again** — the 17 cars, their photos, the demo enquiries and the one demo PDF — visible in the showroom and the office. It is the only fleet there is; the client's real cars arrive later and the store is not held open waiting. The recipe is archived in this folder (`demo-fleet.md`, `demo-photo-manifest.json`, `demo-enquiry-import.json`); the upload path is the developer's own scripts under `developer-workspace/scripts/task-003/`.

**Not in this:** a chassis number (VIN). It is a safety check for the client's own cars, and there is no real car to key one in for — it belongs with the first real car. Named so it is not quietly forgotten.

---

## The change-check (the owner's "hash") and the rules it must obey

The note's real insight is that these are two different jobs:

- **the key** answers *which record is this* — random, made once, never edited, built from no detail;
- **the change-check** answers *did the editable details change* — made by the server, stored by the server, never sent from the browser.

**Every record has its own pair.** The car has the car's; the enquiry has the enquiry's — covering the customer's name and number, what they asked for, the note, and the state. Because the two are not joined, neither can disturb the other: editing a customer never touches a car, changing a car never touches an enquiry.

Used together with the key they are what makes the filler safe: find the row by its handle, compare the change-check, write only where it differs — insert, update, or leave alone; never delete.

Where a change-check is stored, it obeys the whole recipe:

- only fields someone can edit — never the key, never the change-check itself, never the created or updated dates;
- one fixed order of fields, always, because a different order is a different value;
- values tidied first: spaces trimmed, one letter-case where case does not matter, an empty field and a missing field treated the same;
- a separator or the field names between values, so two different rows cannot produce the same text;
- SHA-256, never MD5;
- a version number on the recipe — add or remove a field later and the version rises and everything is recalculated once, or every row looks changed;
- compared only within the same row, so two similar enquiries never confuse each other;
- never identity, never security, never a password.

*Not a requirement, just honesty:* where the filler writes only a handful of fields it may compare those fields directly instead of storing a change-check. Either way the promise holds — "the seed removes nothing". The stored change-check is the owner's preference and is what also pays off when the client's real list arrives as a file and must be importable twice without duplicating.

---

## Round 1 — the decisions (put to the owner 2026-10-13, agreed 2026-10-13)

The builder's first round of questions, answered. Everything here is settled; where the fact-finding changed an answer, the item says so. The fact-finding only fills in details — it does not reopen these.

1. **Where this work lives.** A follow-up under TASK-003 — same folder, migrations continuing at `0016…`, the rebuild scripts beside the TASK-003 ones, a report in the usual place, and **no new task number**. **This file stays the authority**; any build plan mirrors it.
2. **The enquiry's car column leaves.** `enquiry.car_ref` is dropped, replaced by **`asked_for`** — the customer's own words — and it is **required** (not null): every enquiry must say what was asked. An imported one may say "see the attached document". No column anywhere keeps a car reference.
3. **The change-check's shape.** Two columns on each record: **`content_hash`** (lowercase SHA-256, in text, required) and **`hash_version`** (small number, starting at 1). Made by the server from the row's editable fields, stored with the row, **never accepted from a browser**. The store does not recompute it; the store's job is to refuse what must be refused (5). One shared piece of code (`lib/change-check.ts`), used by the seed now and by TASK-004's writes later. The version rises when the recipe gains or loses a field.
4. **What each change-check covers.** The enquiry's: name, number, `asked_for`, note, state — exactly what this file names. The car's: **the car's own editable details, read from the store** — brand, model, trim, year, exterior colour, interior colour, mileage, features, note, private note, was-price, arrival note, doorstep price, state — and never the id, the code, `is_demo`, the dates, `version`, or the hash itself. **The yardstick is the car's editable columns, not today's office form** (checked 2026-10-13): the car table holds exactly those fourteen editable details, while the demo form carries no input for **the private note** or the **crossed-out "was" price** — even though the showroom already displays a was-price. Closing that gap is TASK-004's when the form is wired; the version number exists so that a field added later recalculates cleanly. Photos, cost lines and the sale are not folded into the car's check; they are compared one by one through their own handle (6).
5. **The store refuses change where the promise must hold.** One trigger function attached to both tables, refusing any update that changes `car.id`, `car.ref` or `enquiry.id`, raising a named exception. It refuses **updates only** — the wipe still deletes, on the owner's word, so "the seed removes nothing" and "the demo can be reset" both hold.
6. **How the filler finds its own rows — every handle already exists except one (fact-finding, 2026-10-13).** The car by its **ref** (stable, and now immutable). Cost lines by **(car, kind)** — already unique. The sale by its car — `sale.car_id` is already unique. Photos by **(car, position)** — already unique. The PDF row by its **filename**; the store does not make that unique, so the lookup is only safe while it stays inside the demo's own rows. **The only handle that must be added is the enquiry's** — a new nullable, unique column holding the recipe's own name for the row (`demo-enquiry-01`), because a customer's name and number are not stable identifiers and a real enquiry has no handle. **No other new key is needed.** `car.version` exists — a concurrency token, not an editable detail — and stays out of the change-check.
7. **"Removes nothing" has a price, and it is accepted.** If a car leaves the recipe, its row stays: **the seed can no longer shrink the fleet.** Only the owner — or the wipe — removes a car. Removal still exists; it is just never the seed's.
8. **The boundary of this work — corrected by the fact-finding (2026-10-13).** No runtime save flow (that is TASK-004). **The office enquiries board is a hardcoded client mock — it reads no database at all** (its "Car" field is plain typed text), so there is nothing there to re-point; wiring it to the store is TASK-004's, and the state names it hardcodes go with it. **The one live reader of `enquiry.car_ref` is the retention list** — `lib/cleanup.ts` → `scripts/cleanup-readiness.ts`, which today renders "about TS-1001"; that line must show **the customer's own words** instead. `activity_event.subject` keeps carrying the ref as plain text (ruling 6), untouched.
9. **The demo rebuild, and its order — settled by reading the code (2026-10-13).** The order is: the full chain → **the uploads** (the 49 photos and the demo PDF, from the archived manifest; their old files are gone, so the new assets get new ids — the photo upload writes a fresh `scripts/demo-photo-manifest.json`) → **the seed**, which reads that manifest and writes the cars and their photo rows pointing at live assets → the gates → the browser check on the rebuilt demo. **The uploads stay developer scripts, never shipped code.** Why this way: the seed is what writes the photo rows (it reads the manifest), and the upload script's only database step is its last — pointing rows at the ids — so running the uploads first writes live ids in one pass, and **no row ever points at a file that is not up yet**.
10. **The migration split.** One concern per file, forward-only: `0016` the enquiry (drop `car_ref`, add `asked_for`); `0017` the change-check columns; `0018` the identity lock; `0019` the filler's handle (and any missing unique rule).
11. **The witnesses.** (a) a refusal script — writing an enquiry creates no car row, and changing `car.id`, `car.ref` or `enquiry.id` is refused, each judged by the error name and by "nothing changed"; (b) **the load-bearing one** — the seed run twice leaves the same content *and the same row ids*, the direct proof that it deletes nothing and rewrites nothing, plus a search of the filler's path finding no delete at all; (c) the browser check re-run on the rebuilt demo; (d) the four gates in the learned order.
12. **The demo customers' words.** The six demo enquiries are written in the customer's own words (plainly made up): one asking about a car we do not hold, one naming no car at all, and the imported one saying what they want with its document attached — replacing the codes in the recipe.
13. **The demo PDF's own "Car" column (fact-finding).** Both the authored demo document (`author-enquiry-pdf.mts`) and the archived import recipe (`demo-enquiry-import.json`) put our codes in that column (`"car": "TS-1001"`). Under this rule that column holds the customer's words, so **both are re-authored**: the document is the customer's, so it never contained our codes — the column shows what they asked for, and its heading says so. The recipe's `carRef` field becomes `askedFor` with it.
14. **Does "removes nothing" reach the upload scripts? (fact-finding)** **Only the filler.** The **seed is the store's writer and never deletes**; the upload scripts are the **developer's tools**, run by hand, and may replace their own rows and be re-run from scratch (`upload-enquiry-pdf.mts` already deletes its own row before inserting). The guard that keeps this safe: their reach stays **inside the demo's own rows** — no run can touch a record that is not the demo's.

**Two things deliberately left where they are.** The five state names still typed into the office enquiries screen stay for TASK-004 — this work is not widened to collect them. And the fingerprint is not what makes the seed safe (comparing the fields would do that, as noted above), but it stays: its real pay-off is TASK-004, where it catches two people editing the same car at once. If minimal is ever wanted, dropping it costs nothing.

---

## Constraints — what must not happen here

- **Car records and customer records stay separate.** Nothing joins an enquiry to a car, and nothing fills an enquiry's "what they asked for" from the inventory. What shows on an enquiry is what the owner typed or imported, in the customer's words.
- **This is the cheap moment.** The store is empty: nothing to backfill, no old content to keep in step.
- **Forward-only, concern-sized.** The chain grows with new files (`0016…`); an applied file is never edited and the ledger never lies. Each concern its own file, as Round 2 decided.
- **No column is added because a note suggested one.** A new column must answer a question something actually asks.
- **Nothing invented.** The seed authors demo content; the application never fills in a value the owner did not enter — and never invents a car.
- **The filler's reach is bounded by the recipe, not by hope.** It finds its own rows by a handle written in the recipe and works inside the demo marker, so no run can touch a row that is not the demo's.
- **The upload scripts are the developer's tools; the seed is the store's writer.** Scripts run by hand may replace their own demo rows and be re-run from scratch; the seed may never delete. Both stay inside the demo's own rows, so neither can touch a record that is not the demo's.
- **The wipe stays a deliberate act.** Rebuilding is not un-wiping; the one-move removal stays, dry-run by default, on the owner's word.
- **The public boundary is untouched.** The showroom's link keeps the readable code, and the leak check still passes.
- **Where the store and a requirement still disagree, the requirement wins and the disagreement is written down** — as everywhere else in this layer.

---

## How we'll know (after this)

1. …a customer asks about a car the showroom does not hold, the enquiry is saved with their own words and **no car row is created or changed**.
2. …two customers ask about the same car, two separate enquiries exist and neither affects the other or the car.
3. …a photo, a cost line or a sale is written, it names the car by its key — and a row about a car that is not there is refused by the store.
4. …a form, a script or a stray update tries to change a car's key or its code, the store refuses.
5. …the filler is run twice in a row, the content is the same both times — nothing doubled and **nothing deleted** — and no row that is not the demo's could have been touched either way.
6. …the filler's path is searched for a delete, there is none.
7. …the showroom and the office are opened on the demo fleet, they show the same cars and agree on every figure the rule produces.

---

## What this changes in the architecture (done 2026-10-13)

The owner asked for the architecture to mirror this, so the codified change was corrected in the same pass (validated: `openspec validate --all` ✓):

- **`specs/inventory`** — "Durable reference codes" no longer says enquiries join by ref: **taps and activity join; an enquiry joins to no car.**
- **`specs/enquiries`** — a new requirement, **"An enquiry is not a car record"**, with two scenarios (a car not listed; two customers, one car); the "Sold never moves the car" scenario no longer says "the enquiry's car"; the Purpose says the enquiry is held apart.
- **`design.md`** — a new decision, **D11 — An enquiry is not a car record**.
- **the build list (`tasks.md`)** — 1.3, 4.7 and 5.5 corrected to match.
- **`task.md`** — truth 1 rewritten, a constraint added, **conflict 18** logged.
- **The "pipeline" word removed (same day, same pass).** The owner ruled there is **no pipeline** — car states and enquiry states are **labels for tracking**, not stages: nothing requires one state to precede another, and an enquiry may be given Sold the day it arrives. The word and every implied flow were taken out of `specs/enquiries` (the registry requirement's title and body, the Sold requirement and its scenario, the Purpose), `proposal.md`, and the build list's item 4.7; a new scenario — **"A customer buys immediately"** — pins it; and it is codified as **design D12 — States are labels, not stages**. `product-management/truespec-product-design.md` had one line saying "pipeline by state"; it was corrected on the owner's word — the only edit ever made inside that folder, recorded as such. The file's image-pipeline mentions are a different, correct meaning and were left alone. Two things still carry the old shape and belong to TASK-004: the office enquiries screen has the five states **hardcoded**, and the seed looks a state up **by its label**.

**Not done here — the store itself.** `enquiry.car_ref` leaves by a migration (`0016…`), and the demo recipe's enquiries carry the customer's own words instead of a code. That is the Builder's, with this file as its plan.

---

## Open questions

**None on shape.** The twelve Round-1 decisions above were settled 2026-10-13: the car and the enquiry stay separate, the enquiry keeps its own key and change-check, it names what the customer asked for in their own words, and the state is a label rather than a stage.

**Nothing is open.** Both facts the fact-finding had left were settled by reading the store and the code (2026-10-13):

- **the car's change-check field list** — the car table's editable details are exactly the fourteen item 4 names; the yardstick is the columns, not the demo form, which carries no input for the private note or the was-price (a TASK-004 gap);
- **the upload order** — the uploads run **before** the seed (item 9), because the seed is what writes the photo rows from the manifest the upload writes.

The rest of the fact-finding (the live schema, what the seed deletes today, the spec wording) confirmed what this file already states.

---

**Nothing is built yet. This is v1.**
