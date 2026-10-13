# TASK-003 — Task 23: the agreement witness, in a real browser

**Date:** 2026-10-13. Benchmarks **2, 10, 11** of `task.md`.
Method followed as written: `developer-workspace/procedures/browser-check.md`. Evidence:
`developer-workspace/scripts/task-003/runs/browser-check/`.

The reference site is the **old** implementation and the demo fleet legitimately differs from it, so the
procedure's §7 applies: this layer's witness is **build-office vs build-showroom on the same car**. Both
tabs therefore point at the build (`:3210`) — tab A the office surface, tab B the showroom.

| the discipline | what happened |
|---|---|
| attach, never launch | attached to the one Chrome on CDP `:9222`; UA has no `Headless` — ours |
| the guard | chromium processes **6 → 6** — no browser was launched |
| the cell matrix | **40 cells**: office 8 per screen on `/office/inventory` + `/office`; public 6 per screen on `/`, `/inventory`, `/car/TS-1001`, `/car/TS-1025` |
| surfaces only | no screenshots; rendered text, badges, figures |
| detach on exit | detached; the window and its tabs stay open |

## The verdicts — five, all PASS

| verdict | detail |
|---|---|
| every cell loaded | 40/40 HTTP 200 |
| **mileage is labelled in km wherever it appears — one unit** (task.md:96) | 26 cells show a mileage · units seen: **km** |
| **the office and the showroom agree on the same car (TS-1001)** | 4/4 shared cells (560/820 × dark/light): office **₦34,500,000 / 31,000 km** = showroom **₦34,500,000 / 31,000 km** |
| **no public surface renders an office state label, a cost figure, an asset reference or a customer's number** | 24 public cells · all four: none |
| **the sold car (TS-1025) has left the showroom** | 6 cells, all loaded; no price, no section chip — the page reads "That one found a new owner" |

## Benchmark 2 — the office's figure and the showroom's rule

> **2.** …the office shows a car's cost, the figure is the sum of that car's six naira lines, and it is the
> same figure the showroom's rule produces for the same car.

The showroom renders **no** cost, so the agreement that matters here is *office figure = the one money rule
applied to the store*, and that is `scripts/reconcile.ts` — **exit 0**, re-run today, reproducing every office
figure from `lib/money.ts`: 17 prices, 17 cost/profit figures, 2 cars **honestly shown "Costs incomplete"**, and
the cost's *name* by state (R-MON-7 — never "Landed cost" before landing). The browser check adds what
reconcile cannot: the same car, opened on both **surfaces**, agreeing on every figure both surfaces show.

**The note the plan asks for — how the office's figures moved when the fleet was written** (recorded at
Checkpoint C, cited not re-derived): the office's money figures — money tied up **₦995,368,000** over the 24
cars then in stock, projected profit **₦319,312,000** from 22 of 24, real profit **₦7,840,000** on the one sale
— are now computed from the **six `cost_line` rows per car over the one `car` table**, by the same
`lib/money.ts` / `lib/overview.ts` rule the car form and the showroom use. Before this layer the office's
figures came from **one lump-sum column on its own table** (`office_car.landed_cost_kobo`), expanded onto the
six-line shape by an adapter that put the total on the first line and five **zeros** on the rest — five genuine
zeros where nobody had entered anything. The move *is* the point of the layer: while the office read the second
table, "one car" could not be true. After Task 20's rebuild the store is 17 cars / 99 lines, and reconcile still
reproduces every figure.

## Benchmark 10 — every public response inspected

`leak-check` remains the exhaustive check: **PASSED**, 26 public routes, case-sensitive over the HTML (18 field
tokens, 34 cost values, 51 asset/file references, 18 customer values, 3 office state labels, forbidden-content
separated from did-not-render). The browser check confirms it on a real surface: **24 public cells**, none
rendering a cost figure, an asset reference, a customer's number, or one of the office's three own state
labels.

One word is named rather than counted: **"Cleared" appears on the home page as prose** — *"Our cars are
delivered fully cleared with all requirements completed."* It sits inside a sentence, lowercase, in a `<p>`;
the office state label is the badge word **`Cleared`**, and that is exactly the casing distinction
`leak-check`'s rule relies on. The harness was corrected to judge a **label** (a badge, or a line of its own)
rather than a word in a sentence, so the prose is reported and not failed.

## Benchmark 11 — the same car on both surfaces

> **11.** …the office and the showroom are opened on the same car, they show the same car and agree on every
> figure the rule produces; *[…second half: the demo fleet can be removed in one move — Task 24]*

The first half is the paired table above: same ref, same name ("Toyota Camry XSE V6 2021"), same price, same
mileage, at every shared cell. The second half is **Task 24**, not claimed here.

---

## The defect this witness found — and the fix

The unit check failed on the first run, and it was right to:

| surface | before | after |
|---|---|---|
| home page (`components/site/car-view.ts:22`) | `` `${…} mi` `` | `km` |
| public inventory (`components/site/InventoryBrowser.tsx:628`) | `{…} mi` | `km` |
| office car form hint (`app/office/(shell)/car/car-client.tsx:398`) | "Shown exactly as the car reads — **miles** for US imports." | "…— **kilometres**." |
| public car page (`app/(site)/car/[ref]/page.tsx:54`) | `km` ✓ | `km` |
| office inventory (`app/office/(shell)/inventory/page.tsx:49`) | `km` ✓ | `km` |

**Why this is a defect and not a preference.** The store holds one number per car, and the same number was
labelled **"31,000 mi"** on the home page and public inventory and **"31,000 km"** in the office and on the car
page. One of those two readings is factually wrong about the same column — and `task.md:96` settles which:
*"**Mileage: kilometres.** One unit, stored and labelled once."* Task 15 moved the office and the car page to km
and **missed these two renderers and the form hint**; the tracker row was corrected accordingly. After the fix
the browser check reads **km on all 40 cells**, and the HTTP surface agrees (`/` and `/inventory` both serve
`12,000 km … 71,000 km`).

Not touched, and named so the record is straight:

- `components/CarCard.tsx:31` still renders `${…} mi` — **it is imported nowhere** (dead code). Changing it
  would be a change to a surface nobody is shown, so it is reported, not edited.
- `lib/serialize.ts:153` aliases the store's raw `mileage` column to **`mileageKm`**. With km now the single
  unit the name is true, but the column itself is unit-agnostic; any future unit change has to face that alias.

## Three defects in my own harness (found by running, fixed, re-run)

1. **The site's own WhatsApp number counted as a customer's.** `+2348000000000` is in the footer of every
   public page by design; the check now reads the site's own `wa.me` link on each page and excludes it.
2. **The doorstep price was reported absent when it was present.** The label and the figure are separate
   elements; the figure is now looked for in a short window after the label rather than required to be adjacent.
3. **Word-boundary matching against rendered text.** At narrow widths the office row renders
   `31,000 kmAvailable` — a surface fact, not a defect; and a badge can be uppercased by CSS while the stored
   label keeps its casing.

## What was not run — stated plainly

- The **office-only** cells 1440 and 390 and the **public-only** cell 1100 are checked for their own facts but
  are **not paired**, because only one surface was captured at those widths (pairing is at 560 and 820).
- The check ran against **`next dev` on `:3210`**, not a production `next start`. The production gate is
  `npm run build` at Task 25.
- No screenshots, by the procedure's rule — the owner checks the look by hand.
- The exhaustive forbidden-token comparison is **leak-check's**; the browser check confirms it on 24 cells and
  does not replace it.
- Benchmark 11's second half (the demo wipe) and benchmark 8 are **Task 24**.

## Gates after this change (public copy changed, so re-run)

`npm run typecheck` **exit 0** · `npm test` **50/50, 0 fail** · browser check **exit 0, 5/5 verdicts**. The full
gate order (`leak-check` → `build` → `store-freshness` → restart `next dev`) runs at **Task 25**.
