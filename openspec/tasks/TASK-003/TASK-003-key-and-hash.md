# TASK-003 — cars and enquiries kept apart, and a change-check that spares the filler

**The report of the follow-up build.** Follow-up v1, the "key and hash" work under TASK-003 (no new task
number — Round-1 decision 1).

**Date:** 2026-10-14 · **Authority:** `openspec/tasks/TASK-003/key-and-hash-v1.md` (v1, 2026-10-13) — its
Round 1 (decisions 1–14) is the settled shape; this build mirrors it and this report says where it does
not. **Home:** `developer-workspace/` (plan `plans/TASK-003-key-and-hash-plan.md` · witnesses under
`scripts/task-003/runs/key-hash/` and `runs/browser-check/`). **Status:** built, witnessed, and reported.
**Nothing was committed or pushed.**

**One line.** The enquiry is no longer tied to a car; each record (car and enquiry) keeps its own identity
and its own server-made change-check, and the store refuses any change to a key; the filler finds its own
rows by a handle and deletes nothing; and the demo fleet is rebuilt from the recipe archived in
`openspec/tasks/TASK-003/`, showing the same figures in the showroom and the office.

---

## 1. What was built

| | |
|---|---|
| **migrations** | forward-only, one concern each — `0016` the enquiry leaves the car (`car_ref` out, `asked_for text NOT NULL` in) · `0017` the change-check columns (`content_hash text NOT NULL` + `hash_version smallint NOT NULL DEFAULT 1` on `car` and `enquiry`) · `0018` the identity lock (`refuse_identity_change()` + two triggers) · `0019` the enquiry handle (`enquiry.handle text` + partial UNIQUE index). Ledger now `0001…0019`. |
| **one shared module** | `lib/change-check.ts` — `carChangeCheck`, `enquiryChangeCheck`, `CHANGE_CHECK_VERSION = 1`. Server-computed, stored, never sent from a browser. `lib/change-check.test.ts` (14 tests) pins the rules. |
| **the readers/writers moved** | `lib/cleanup.ts` + `scripts/cleanup-readiness.ts` read the customer's words (`asked_for`), not a car code; `scripts/seed.ts`'s demo enquiries write the customer's own words. |
| **the filler no longer deletes** | `scripts/seed.ts` — all six `DELETE`s gone; every child found by a handle and written only where it differs (car by `ref`; cost line by `(car_id, kind)`; sale by `car_id`; photo by `(car_id, position)`; enquiry by `handle`; enquiry_pdf by `filename`); `content_hash`/`hash_version` computed by the one module and written; the six demo enquiries carry `demo-enquiry-01/02` and `demo-enquiry-pdf-01…04`. |
| **the demo's words, and its PDF** | `author-enquiry-pdf.mts` and `upload-enquiry-pdf.mts` (developer tools under `developer-workspace/scripts/task-003/`) now carry the customer's words (`askedFor`, no `carRef`); the upload script writes no enquiry row — the filler owns the enquiries, from the manifest. The archived recipes were regenerated: `openspec/tasks/TASK-003/{demo-photo-manifest,demo-enquiry-import}.json`. |
| **the demo fleet rebuilt** | author the PDF → upload the 49 photos + the PDF to Sanity (new asset ids) → run the seed. Result: **17 cars · 49 photos · 99 cost lines · 1 sale · 6 enquiries · 1 enquiry PDF**, every row `is_demo`, every car and enquiry agreeing with the recipe at `hash_version` 1. |
| **the architecture mirrored** | in the same pass (owner, 2026-10-13, per the authority file §"What this changes in the architecture"): `specs/inventory` and `specs/enquiries` no longer join an enquiry to a car, `design.md` gained **D11 — An enquiry is not a car record** and **D12 — States are labels, not stages**, and `task.md` truth 1 + conflict 18 were rewritten. Context for the store work; not part of this build. |

## 2. The witnesses — what was verified, and how

Every claim below has a file on disk. Nothing is claimed from memory.

| witness | what it proves | evidence | result |
|---|---|---|---|
| **(a) the migration + the refusal, judged by error name and by "nothing changed"** | `0016` applies to a fresh chain; `asked_for` exists and is NOT NULL; `car_ref` is gone | `runs/key-hash/01-0016-scratch.json` | **4/4** |
| | `0017`–`0019` on a fresh chain; both change-check columns required; a record with no change-check refused; a changed `car.ref` / `car.id` / `enquiry.id` refused *and nothing changed*; an ordinary update, a same-value write and the seed's `ON CONFLICT (ref)` pattern all allowed; a handle names one row; many NULL handles allowed; a delete still works | `runs/key-hash/03-store-shape.json` | **21/21** |
| **(b) the filler removes nothing — the load-bearing one** | two runs on a scratch chain: the same content **and the same row ids**; every car and enquiry agrees with the recipe; every enquiry carries its handle | `runs/key-hash/04-seed-idempotent.json` | **13/13** |
| | the same, **on the live store**: the rebuilt shape (17/49/99/1/6/1), `is_demo` on all 17, hashes agree, no photo holds a third-party address, no enquiry is stored as a car code; the filler's **re-run left every table byte-identical** (same rows, same ids) | `runs/key-hash/05-live-rebuild.json` | **16/16** |
| **(c) the browser check, on the rebuilt demo** | 40 cells loaded 200 (8 office × 2 screens · 6 public × 4 screens); mileage is `km` everywhere; **the office and the showroom agree on TS-1001 at all four shared cells — ₦34,500,000 / 31,000 km**; no public cell leaks an office state label, a cost figure, an asset reference or a customer's number; the sold car TS-1025 has left the showroom | `runs/browser-check/` (`surface-probe.json`, `surface-probe.txt`, per-screen `compare-report.txt`) | **5/5 PASS** |
| **(d) the four gates, in the learned order** | `leak-check` (before build — they share `.next`) → `typecheck` → `test` → `build` → `store-freshness` → dev restarted | logs in the table below | all green |

**The gates, as run (2026-10-14):**

| gate | result |
|---|---|
| `npm run leak-check` | **PASSED** — 18 public routes (home, inventory, every listed car), all 200, no cost/currency/profit value, no asset or file reference, no customer detail, no office state label |
| `npm run typecheck` | clean (exit 0) |
| `npm test` | **64/64**, 0 fail (14 of them the change-check's) |
| `npm run build` | ✓ — the store-reading routes build `ƒ (Dynamic)`; the four static routes are exactly the ones that read nothing |
| `npm run store-freshness` | **PASSED** — none of 9 store-reading routes prerendered; no database response cached |
| dev on `:3210` | restarted after the build; `/`, `/office/inventory`, `/car/TS-1001` all 200 |

The grep sweeps that back it: **no `enquiry.car_ref`** anywhere in `lib/ app/ components/ scripts/` (the
only `car_ref` left is `tap.car_ref` — a tap *is* about a car we hold — and the witness scripts' own
text); **no `DELETE` in `scripts/seed.ts`**.

## 3. The six things that must be true — each with its witness

| # | must be true | witnessed by |
|---|---|---|
| 1 | a car and an enquiry are **separate records, nothing joins them**; an enquiry holds the customer's own words and no reference to a car | `0016`; `enquiry.car_ref` gone (sweep); seed writes `asked_for`; no car row is created for an enquiry |
| 2 | everything **about a car we hold names it by its key**, and the store refuses a row about a car that is not there | FKs on `car_photo`/`cost_line`/`sale`; `tap` keeps the code as text — existing shape, unchanged |
| 3 | **each record carries its own identity and its own change-check** | `lib/change-check.ts` (two functions, one module); both tables carry `content_hash`/`hash_version`; `05-live-rebuild` — every stored hash agrees with its own row |
| 4 | **the car's key and code cannot change** | `0018` triggers; `03-store-shape` — `ref`, `car.id`, `enquiry.id` all refused, *nothing changed*, and a self-value write still allowed |
| 5 | **the filler removes nothing** | `04` (scratch, 13/13) and `05` (live, 16/16) — two runs, same content and same ids; no `DELETE` in the path |
| 6 | **the demo fleet is present again** | `05-live-rebuild` — 17 cars · 49 photos · 99 cost lines · 1 sale · 6 enquiries · 1 PDF, all `is_demo`; `(c)` — visible in the showroom and the office |

**And the seven "how we'll know"** (authority §"How we'll know"): 1–2 enquiry/car separation — items 1 and
3 above; 3 the key-bearing children — existing FKs, unchanged; 4 a refused key change — witness (a), 21/21;
5–6 the filler run twice and searched for a delete — witness (b) + the sweep; 7 showroom and office agree —
witness (c), 5/5.

## 4. The one decision this plan made (recorded, not hidden)

The authority file left the change-check's **normalisation** generic ("spaces trimmed, one letter-case
where case does not matter, empty ≡ missing"). The plan had to pick *where case does not matter*
(**B4**). It chose: **case-fold only the customer's `number`; never the name, the note, the features or
any other field.** The reason — case cannot matter in a phone number, and it does matter in a name
("Ade" ≠ "ade") and in what a customer asked for. If that is wrong, the fix is cheap: raise
`CHANGE_CHECK_VERSION` to 2 and everything recalculates once. Every other decision here mirrors the
authority file's Round 1 (1–14); none was reopened.

## 5. Findings handed over (not fixed here)

| finding | for |
|---|---|
| **TASK-004's gaps, as the authority file names them**: the demo form carries no input for a car's **private note** or its crossed-out **"was" price** (the change-check already covers them; the form does not) | TASK-004 |
| the office **enquiries board is a hardcoded client mock** — it reads no database, and its five state names are typed in; wiring it to the store is the write layer's | TASK-004 |
| the seed looks a state up **by its label** — correct today, but a rename would need care | TASK-004 |
| **VIN is not in this** — a safety check for the client's own cars; it belongs with the first real car | owner |
| `components/CarCard.tsx:31` says `mi` and is **dead code** (exported, imported nowhere); every live path says `km` | TASK-004 |
| `lib/serialize.ts:153` aliases the stored `mileage` column to `mileageKm` — a *name*, not a unit conversion; correct today | TASK-004 |
| **the office inventory page opens 5 concurrent database connections per load** (`getOfficeCarViews` ×2 — the page *and* `getOfficeCounts` — plus `getOfficeStates`), and it has **no graceful degradation**: a transient database blip 500s the whole screen | TASK-004 / design |
| the fleet recipe and photo manifest are archived in `openspec/tasks/TASK-003/` — the demo can be rebuilt from them | owner |

## 6. What was **not** done, and is not claimed

- **No runtime write flow.** Saving a car or an enquiry from a form is TASK-004's. Everything here is the
  store's shape and the seed that fills the demo.
- **No VIN.** Named in the authority file as belonging with the first real car.
- **No Sanity Studio** was opened (none exists — a build fact). The assets were verified through the
  dataset's own API.
- **The browser evidence checks surfaces, not looks** — no screenshots (the owner checks the look by
  hand), no interactive behaviour was driven, and nothing outside this layer's surface was compared. The
  reference site was not compared: per the procedure's §7 the demo legitimately differs from the old site,
  so the witness is **build-office vs build-showroom on the same car**.
- **One environment caveat, recorded in full** (`developer-workspace/notes/T7-browser-check-and-db-flakiness.md`):
  the **first** browser check failed — `office-inventory` 500 on 5/8 cells — because the network path to
  Neon (eu-central-1) **drops concurrent, cold connections** (measured: raw TCP 3/12 dropped; the warmed
  pool then stabilises). It is environmental, not a code fault; the run above is after warming the pool.
  The same flakiness is why the first request after an idle spell can 500 a store-reading page.
- **Nothing was committed.** Everything since the last commit is uncommitted; I commit on the owner's word.

## 7. Evidence on disk

- `developer-workspace/scripts/task-003/runs/key-hash/` — `01-0016-scratch.json` (4/4) ·
  `03-store-shape.json` (21/21) · `04-seed-idempotent.json` (13/13) · `05-live-rebuild.json` (16/16)
- `developer-workspace/scripts/task-003/runs/browser-check/` — `surface-probe.json` · `surface-probe.txt`
  · per-screen `compare-report.txt` (the Task 23 evidence is preserved alongside as
  `runs/browser-check-task23/`)
- `developer-workspace/scripts/task-003/` — the witnesses: `key-hash-01-0016.mjs`,
  `key-hash-03-store-shape.mjs`, `key-hash-04-seed-idempotent.mjs`, `key-hash-05-live-rebuild.mjs`,
  `browser-check.mjs` (+ `_lib.mjs`, `checklist.*.json`)
- `developer-workspace/plans/TASK-003-key-and-hash-plan.md` — the plan and its progress tracker
- `developer-workspace/notes/T7-browser-check-and-db-flakiness.md` — the environment finding
- `openspec/tasks/TASK-003/` — the authority file, the archived recipe (`demo-fleet.md`,
  `demo-photo-manifest.json`, `demo-enquiry-import.json`), and this report
