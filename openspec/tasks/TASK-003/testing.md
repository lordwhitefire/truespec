# TASK-003 — Testing the store (data model, Layer 3)

**Written 2026-10-13.** This is written for a session that did **not** build the work. Nothing here is taken on trust from the build report; every claim below is re-established from the running store and the code.

**Owner's ruling (2026-10-13):** the separate testing pass is run **once, at the end, when everything is built** — so these checks join the deferred final test rather than running when this layer closes. They still belong to this layer, and the final test must account for each group.

---

## Before you start

- Read `task.md` in this folder. It holds the ten "what must be true" statements, the constraints, the Round-1 answers and the seventeen logged conflicts. This file checks those, not a memory of them.
- Get the store into a known state, and keep a record of how: the migrations applied, the seed run, and whether the database was rebuilt or migrated forward. Every group below assumes you can say which.
- Have the office screens' today-figures to hand — from before the change. They are the witnesses; a group 9 failure is likely a group 1 or 2 failure wearing a costume.
- Do not accept "it looks right". Every claim in the build report needs a row you queried, a screen you loaded, or a command's output.

---

## 1. One car, one identity (run this first — it is the negative check)

The dangerous failure is a *second* place a car can live, or a ref that means two things. Positive evidence (the office works, the showroom works) does not rule either out.

- **How you will know it passed:** there is exactly one table in the schema that stores cars; every `TS-####` code appears on exactly one car; and for a handful of refs — including at least one that used to exist in both catalogues — looking the code up from the showroom, from the office, from a tap row and from an enquiry row lands on the same car, make, model and year.
- **What fails this group:** a leftover car-shaped table (even empty); a code that resolves to different cars through different read paths; an enquiry or tap whose ref no longer resolves to any car; two rows in one table sharing a ref.

## 2. Money against the requirement

- **How you will know it passed:** every car's cost is its six lines, one per kind, all naira; the office's shown cost for a car equals the sum of that car's six lines and equals what the showroom's shared rule computes for the same car; a car with a missing line is *not* reported complete, and a genuinely entered zero is distinguishable from a missing value; and a search of the schema, the seed, the code and the settings rows finds **no rate and no currency** — no column, no key, no constant, no default, no constraint mentioning one.
- **What fails this group:** any car whose cost comes from a single stored total; any place where a lump total is spread onto six lines to satisfy a shape; any cost line stored in anything but whole kobo; any rate or currency surviving anywhere.

## 3. The store's refusals

The requirements say certain rows must not be able to exist. Try to create them.

- **How you will know it passed:** the store itself refuses each of these — a second cost line of the same kind for one car; a state with no section; two states with one label; deleting a state that a car (or an enquiry) currently sits in; and (if a section is required) a car pointing at no state. Each refusal is a database-level refusal, not merely a screen that hides a button.
- **What fails this group:** a row that is accepted; a "refusal" that only exists in application code, so a direct write slips past it; a deletion that succeeds and strands a car or enquiry in a state that no longer exists.

## 4. Identity and sessions

- **How you will know it passed:** no application table contains password material of any kind; the app's session row names the provider session it mirrors; and, given nothing but the store, you can compute for a session whether it is within its 7 days and within its 12 idle hours — and you get the same answer the app gives.
- **What fails this group:** any password hash, salt or reset material on an application table; a session row that cannot be tied back to its provider session; session validity that depends on a vendor feature rather than a stored date.

## 5. Every stored byte has an owner we can name

- **How you will know it passed:** every photo row holds a reference into the decided asset store — no `http`/`https` URL anywhere in the photo table — and each reference resolves to a **real asset in the project's own Sanity dataset** (the same project and dataset the running app is configured with); the cover of a car is the photo at position 0; and for an imported PDF you can find both its asset reference and its original filename in the database, while the reference appears in no public and no unauthenticated response.
- **What fails this group:** an `http`/`https` URL where an asset reference belongs; a reference that does not resolve in the configured dataset — a value shaped like an asset id but pointing at nothing; a car whose photos have no position 0 (or two); a PDF reference reachable without a session.

## 6. Rebuild and idempotency

- **How you will know it passed:** a database dropped and rebuilt from the migrations and the seed runs clean and reproduces the figures the screens show; running the seed a second time changes nothing (same rows, same counts, same totals); and the migration ledger contains exactly the migrations that actually ran — none claimed that did not.
- **What fails this group:** a rebuild that fails or halves; a second seed run that duplicates rows or moves a figure; a ledger entry for a migration that is not in the tree, or a tree migration silently absent from the ledger.

## 7. Readiness for retention and cleanup

The jobs themselves belong to a later layer; whether the store can carry them is this layer's.

- **How you will know it passed:** from the store alone you can answer — how old a tombstoned car is; **when an enquiry was recorded**, so an enquiry's age is answerable without anyone being asked to type a "last contact" date; when a sale happened; how far back the sign-in attempt rows reach; and which asset references are currently referenced. Each answer comes from a stored date or key, not from a guess or a computed proxy. And a tap row holds **no visitor address anywhere** — taps carry no personal data — while the sign-in attempt rows still hold the one address in the system that has a job. Nothing in the store invites an automatic deletion of **any** record, file or asset: ages are readable, what waits to be cleared is listable, and the decision is always the owner's — with exactly two exceptions, both the machine's own litter and settled with the owner on 2026-10-13: an asset no record ever referenced, and `auth_attempt` rows past 90 days. Nothing belonging to a record is removed by any path.
- **What fails this group:** a question with no home in the store — for instance an age that could only be known if someone had typed a date the system never asks for; or any path — job, rule, script or seed — that removes a record or a record's file by itself; or a third exception beyond the two settled ones.

## 8. The public boundary

- **How you will know it passed:** the leak check passes, and inspecting every public response — showroom pages, the inventory list, the home page, any JSON the site returns — finds no cost, no margin, no asset reference belonging to the office, no customer detail, and no office-only state label.
- **What fails this group:** anything from the office side of the boundary appearing in a response a visitor can read; a public read path that is no longer the single allowed one.

## 9. The witnesses, and that nothing was invented

- **How you will know it passed:** opening the office and the showroom on the same car shows the same car and the same figures, and every figure traces to the one shared rule; the office's numbers may have moved from the reference's — expected, now that we write the fleet — but each movement has a stated cause, never an unexplained drift; the demo fleet can be removed in one move, leaving nothing of itself behind and touching no other record; and, taken car by car on a sample, the store holds authored demo content and nothing else — the application has not filled in a split, a colour, a unit or a code to make a shape fit, and a value it does not know is absent rather than invented.
- **What fails this group:** the office and the showroom disagreeing on the same car; a moved figure with no stated cause; a witness tool that no longer runs because it pointed at a retired table; demo rows that cannot be separated from everything else; a value the application invented rather than the seed authoring it.

## 10. The rulings came first

- **How you will know it passed:** every owner answer and every Round-1 decision is recorded and dated **before** the part of the store that follows it was shaped — the data is demonstration data, so the fleet is one authored set of 15–18 cars with one code each; kilometres; no visitor address on taps; a colour on both kinds of state; Clerk as the identity provider; Sanity installed and the photos uploaded in this layer; the retention dates present; the office reading the single car table; the registry's colour and unique labels. The shape visibly follows each one.
- **What fails this group:** a shape that quietly presupposes an answer nobody gave — a demo fleet still written on the old two-list split, a unit picked to make numbers line up, an `ip` column left on taps "just in case", a state colour with nowhere to live, a password column kept because it was easier, an image column still holding someone else's web address, a second car-shaped table left in place, or a retention rule with no date to run on.

---

## How to report

Report per group: **passed / failed / not checked**, with the evidence you actually produced (the query, the command, the screen) — not a restatement of the requirement.

For every failure, say which of the seventeen logged conflicts it belongs to, or name it as a new one. Where the work and a requirement disagree, the requirement is what the work is measured against; a disagreement resolved by bending the requirement is itself the finding.

Finish with what you could not check, and why — an unchecked group is not a passed one.
