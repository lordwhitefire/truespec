# TASK-001 — conflict log

Spec vs screen, plan vs ruling, and stale docs. Spec wins; screen is visual truth only where it
does not contradict the spec; a later owner ruling wins over an earlier planning doc. Each conflict
is recorded for the owner rather than silently reconciled.

## 1. `seed-content.md` — the "rate set in Settings" line is stale (ruling R3)

`seed-content.md` still describes a single FX rate "set in Settings". Ruling R3 forbids any global or
settings-level rate: every USD cost line carries its own rate. The seed was written to honour
**per-line rates**, and the stale line is flagged here, not followed. (`product-management/` was not
edited — flagged per close-out 10.2.)

## 2. Reference `inventory.html` filters vs the binding schema and the showroom spec

The approved inventory screen carries a filter sidebar (status, **body type**, brand, price),
a sort dropdown and a grid/list view toggle. Several of those filters depend on car fields the
binding schema does not hold — **body, engine, drive, seats, fuel, hp** — which exist only in the
screen's hard-coded demo data. The showroom spec requires exactly three fixed sections built from
the allow-listed public fields (brand, model, trim, year, colours, mileage, features, photos, price,
section, ref). **Spec wins:** the inventory page is built as the three fixed sections; the reference
filter UI was not reproduced because the data behind it is not in the approved model. If per-row
filters are wanted, that is a schema decision for the owner, not a TASK-001 build choice.

## 3. Reference status model vs the "new arrival in both sections" rule

The reference treats `l` (landed) as a status separate from `a` (available). The showroom spec adds
that a stated new arrival must render under **both** Landed and Available while being counted once,
with an "of which N new arrivals" note. **Spec wins.** Implemented in `lib/counts.ts` and the
Available tab. Landed dates in the reference are free-text notes ("Landed in March 2026"); the spec
models the arrival group as an `is_new_arrival` flag with no date logic, which is what the schema and
counter use.

## 4. Reference home layout (tabs) vs task benchmark ("three section previews")

The reference home page (`truespec.html`) presents the three sections as **tabs**
(Available / On order / Landed this year). The TASK-001 benchmark asks the home page to carry
"three section previews". Builder's choice: home shows three **stacked previews** with counts; the
tabs live on the inventory page. Both present exactly three sections; the divergence is layout only
and is recorded here.

## 5. Data-model plan `integer` money vs `int4` overflow

`data-model-implementation-plan.md` specifies `integer` money columns. Seed prices in kobo are
integers, but ₦22M–₦96M is 2.2–9.6 billion kobo and overflows `int4` (max ≈ 2.147B). Columns were
widened to **`bigint`**. Still integer minor units, still no float/scale — the constraint holds; the
type is wider.

## 6. Data-model plan four car states vs inventory spec five

The data-model plan listed four car states; the inventory spec ships five built-ins (Available,
On the way, At port, Cleared, Landed). **Spec wins:** five seeded.

## 7. `task.md` item 3 entity list vs the data-model plan

task.md item 3 lists twelve entities; the data-model plan additionally defines `sale` and
`enquiry_pdf`. Both were created (needed later: sold flag, PDF storage). Noted so the extra tables
are not read as invention.

## 8. `testing.md` 2.6 describes office behaviour (out of TASK-001 scope)

Check 2.6 reads "phone → cards, full-screen filter sheet; laptop → **table**, dropdown in the bar".
The table / landed-cost / profit columns and the filter sheet belong to the **office** inventory
(task.md out-of-scope table: "All office screens … TASK-002"). Its absence here is expected. The
public inventory is cards at every width with three fixed sections; the reference screen's filter
sheet/dropdown is addressed in conflict 2 above. Flagged as an observation, not a defect.

## 9. `testing.md` 3.3 does not check the Clerk secret or session secret

3.3 checks that no DB credential reaches the browser (satisfied). It does not check that
`CLERK_SECRET_KEY` / `SESSION_SECRET` are server-only; the config module reads them server-side and
they are never placed in any client bundle. Noted as a small gap in the checklist, not a build issue.

## 10. Minor: `testing.md` reading order omits design D4/D8 and ruling A8

The task's reading order (task.md §Process) points at D1/D2/D5/D10; D4 (sessions), D8 (daily job /
Neon scheduled function) and owner ruling A8 (Stack: Neon + Clerk + Sanity + Vercel, Supabase
dropped) are binding for later tasks but not listed. Noted, not patched.
