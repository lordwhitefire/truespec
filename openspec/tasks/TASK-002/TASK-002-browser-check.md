# TASK-002 — Task 21: browser check (surfaces only)

**Run:** `node developer-workspace/scripts/task-002/surface-probe.mjs`
**Date:** 2026-10-13
**Sides:** build `next dev` on `http://localhost:3210` · reference (old implementation, `test-truespec-v2`) on `http://localhost:3211`
**Chrome:** attached to the one persistent visible automation Chrome on CDP `:9222` — **never launched** (Task 7 harness `_lib.mjs`: attach / assertOurs / guardCount). Guard: `chromium 6 → 6`. `ps` shows only that Chrome (pid 8324, `--remote-debugging-port=9222`, profile `google-chrome-automation`) plus the owner's own snap chromium (pid 5296, no debug port) — nothing launched by this run.
**No screenshots** — surfaces only; the look is checked by hand. This layer's authority is the model (`developer-workspace/models/TASK-002-model.md`), not the browser.

**Output artifacts:** `developer-workspace/scripts/task-002/runs/surface-probe.txt`, `…/runs/surface-probe.json` (56 screen-cells).

---

## Matrix actually run

8 screens × cell matrix = **56 screen-cells**, all HTTP 200.

- **Public** (matrix 560 / 820 / 1100 × dark, light): `home`, `inventory`, `car` (TS-1001 ↔ `2021-toyota-camry-xse-v6`), `car-sold` (`/car/TS-1025` ↔ `2021-honda-civic-ex`).
- **Office** (matrix 1440 / 820 / 560 / 390 × dark, light): `office-dashboard`, `office-inventory`, `office-car`, `office-settings`.

Each cell navigates **tab A = reference** and **tab B = build** at the same viewport + theme, waits for the rendered text, and captures named surface facts (title, h1, section chips, cost labels, naira figures, owner-state labels, rate words, form inputs, keyword lines) — then reports them side by side.

**Rewired screens covered** (every one the layer touched): public **home / ticker** (the strip lines are captured in the home `keyLines`), **inventory**, **car page**, **cards/listing**; office **dashboard**, **inventory**, **car form**, **settings**. All eight ran and reported.

---

## Intended divergences — each tied to the requirement that wins

| # | Surface | Reference (old) | Build | Requirement it satisfies |
|---|---------|-----------------|-------|--------------------------|
| 1 | Public car page — price | a **flickering, rate-derived** figure (`₦11,396,649` / `₦11,191,655` / `₦11,880,023` / `₦10,681,243` / `₦12,088,137` / `₦13,947,616` across cells — a new value each load) | the car's fixed doorstep price (`₦34,500,000` for TS-1001) | R-MON-3 (no rate exists) + the doorstep-price-is-a-field-on-the-car rule |
| 2 | Office car form — rate | `rateWords=["rate","$"]`, an `fx:number` input, a "Rate ₦1,000 / $1" line, and "Purchase + US costs / Nigeria costs" breakdown | none of these; six named naira cost lines | R-MON-3 (no rate; every amount naira) — the exact sites to remove |
| 3 | Office settings — rate | card title "CURRENCY & COST DEFAULTS", "DOLLAR RATE", `fx:number`, copy "Landed cost = dollar costs × this rate + naira costs" | card title "COST DEFAULT", no rate, copy "Every amount is in naira — there is no currency conversion" | R-MON-3 + Task 18 retitle (**named divergence 4**) |
| 4 | Office inventory — cost label | every row/card labelled "LANDED COST"/"Landed cost" | wide table header "COST"; card label "ESTIMATED TOTAL COST" for a not-landed car, "Landed cost" once landed; note reads "Cost and profit appear only in the office" | cost-label-by-state rule (model §R-MON, lines 299–311: never "Landed cost" before landed) |
| 5 | Office car form — profit line | "Price − **landed**." | "Price − **cost**." | same cost-label rule (generic word "cost") |
| 6 | Public inventory — section chip | "On order" | "On Order" | sections rule (exactly `Available`, `On Order`, `Landed`) |
| 7 | Public home — summary line | "AVAILABLE **12 READY · 6 LANDED**" | "AVAILABLE **18 CARS · OF WHICH 6 NEW ARRIVALS**" | R-CNT — the "of which N new arrivals" note; counts rule-derived |
| 8 | Office dashboard — money tied up | `₦587,040,000` (price-as-proxy for incomplete cars) | `₦451,040,000` (incomplete cars TS-1013/1014 contribute 0 via the shared rule) | owner ruling 2026-10-12 + `totalCostKobo` (**named divergence 1**) |
| 9 | Office car form — amount inputs | `f-price:number`, `c-*:number` | `f-price:text`, six `c-*:text` | Task 17 (naira amount fields as text, `inputMode=decimal`) |

Rule-derived figures that **must** match *do* match, on both sides: office inventory per-car price/cost/profit (all 41 naira figures identical), projected profit `₦57,760,000`, real profit `₦3,850,000`, "12 AVAILABLE · 2 ON ORDER", sold car 2018 Camry XLE `₦31,500,000`, and the public **sold** cell (title "Sold", h1 "That one found a new owner").

---

## Data divergences — the reference carries its own dataset, so these are **not** rule differences

The reference and the build do not run the same seed (`naila` vs the reference's own). Observed, and classified as data, not rule:
- Public **"New on the lot"** strip: ref `2019 Toyota Sienna XLE — landed July 2026` vs build `2019 Lexus RX 350 350 — landed this year`.
- Public **"Biggest drop"** strip: ref `2021 Toyota Camry SE … ₦31,500,000 → ₦27,900,000` vs build `2022 Toyota RAV4 Prime SE … ₦50,900,000 → ₦45,500,000`.
- Public **"More available cars"** strip values differ accordingly.

No rule in the model is contradicted by any of these; they are content differences between two datasets.

---

## Unintended divergences — named (each outside TASK-002's declared change surface)

Named here, **not fixed** — each is outside what TASK-002 was asked to build; the fix belongs to the task that owns that surface.

1. **Office page titles.** Every `/office/*` route renders the root public title `TrueSpec — cars you can trust`, not `Dashboard | TrueSpec Office` / `Inventory | TrueSpec Office` / `Add / edit car | TrueSpec Office` / `Settings | TrueSpec Office`. Cause: no office layout or page sets `metadata` — `app/office/layout.tsx` and `app/office/(shell)/layout.tsx` set none; only `app/layout.tsx:3` does. Verified: no title requirement exists in the model, `openspec/tasks/TASK-002/`, or the plan. **The office shell owns this, not TASK-002.**
2. **Seed-data doubling.** The build's home ticker shows `2019 Lexus RX 350 350` (also TS-1009 `ES 350 350`, TS-1022, TS-1023). Source is the seed row — `scripts/seed.ts:56` carries `model:"RX 350"` **and** `trim:"350"`; the title builder (`app/(site)/layout.tsx:21-23`) is correct. **Seed content, not a rule.**
3. **Public inventory filter dimensions.** Build renders 30 filter checkboxes (3 sections + 9 makes + 5 years + 13 colours in `components/site/InventoryBrowser.tsx`) vs the reference's 16. The public browser predates TASK-002. **Boundary check is a positive result:** the public status filter uses only `lib/sections.ts` (`Available`/`On Order`/`Landed`) — **no owner-state name leaks** into any public filter.

---

## Checked and found *not* a divergence

- **Settings account/password panel.** Present in the build behind the **"Account"** tab (`app/office/(shell)/settings/settings-client.tsx:455,467-503`). The reference shows it at load; the build's default surface is the **"General"** tab, so the probe read the default tab. Not a divergence.
- **Sold-car cell (first pass).** The first probe pass mapped the build's sold URL wrongly (the build routes by ref code, not the reference's slug) → a spurious "Car not found". Corrected to `/car/TS-1025` (`scripts/seed.ts:63-68`) → title and h1 **identical** to the reference.

---

## What was **not** checked

- **Look / CSS / pixels / layout** — surfaces only, no screenshots (the owner checks the look by hand).
- **Interactive behaviour** — the probe loads and reads rendered surfaces; it does **not** drive interactions. Not exercised here: the car form's malformed-amount-blocks-Save path, the live panel recompute, filters actually filtering, Save / "Mark as sold" / delete flows, keyboard nav. (These are covered by the rule tests and the Task 20 model check.)
- **Per-state colour** (named divergence 2 / TASK-003) — not visible in text.
- **Office account tab, login, enquiries** and other routes outside TASK-002.
- **Reference internals** — the reference is the old implementation; only surface facts were compared, never its DOM/CSS (runtime-divergence rule).

---

## Verdict

Every rewired screen's probe ran and reported (56 cells, all HTTP 200). Intended divergences are each tied to the requirement that wins; the rule-derived figures that must agree do agree. Unintended divergences are named and each lies outside TASK-002's change surface. No Chrome was launched, no screenshots were taken, and the probe says plainly what it did not check. **The build matches the model on the surfaces this layer rewired.**
