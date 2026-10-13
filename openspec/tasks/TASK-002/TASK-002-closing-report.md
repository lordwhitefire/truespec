# TASK-002 — closing report (plain language)

**Date:** 2026-10-13 · **Layer:** business logic (Layer 2) · **Authority:** `models/TASK-002-model.md`

This is the short, plain-language report. The detailed one is `report.md` in the same folder.

---

## What this layer did

It gave the product **one place** to work out each number, instead of the same sums being redone
on every screen:

- which section a car is in,
- how many cars there are,
- what a car cost and earns,
- whether an amount typed in is valid,
- a car's `TS-####` code,
- whether a car is sold.

Six small rule files in `lib/` hold these. Every screen — the showroom and the office — now asks
those files instead of doing its own maths.

**The dollar rate is gone completely.** Every amount is naira, typed as naira, nothing converted.

---

## What I checked, and how

| Check | Result |
|-------|--------|
| Automated tests | **47 of 47 pass** |
| Type check | clean |
| Leak check (can a buyer see costs?) | **passed** — no cost, price-internal or profit leaked on any public page |
| Build | clean |
| Rule-by-rule model check | **29 of 29 rules pass** |
| Real browser, 8 screens × widths × light/dark = **56 views** | all loaded; intended changes match the plan |
| Office numbers vs the old office | the new rule reproduces **every number** but one (below) |

**The one difference in the office numbers:** "money tied up" is now **₦451,040,000**; the old office
showed **₦587,040,000**. The old office counted the *price* of cars whose costs aren't filled in yet;
the new rule counts only real costs. That is a difference in the data, not a broken rule — and it is
written down with the reason.

**Every disagreement is written down** — 19 of them, each saying which side won — in
`TASK-002-conflict-log.md`.

---

## What I did **not** check

- **Typing and clicking.** The browser check only *looks* at the pages. I did not drive the form —
  so "a bad amount blocks Save", "editing a cost live-updates the totals", and the save/delete flows
  are **not** confirmed end-to-end here.
- **Writing anything.** Creating a car, editing a car, marking it sold — none of that exists yet.
  It is **TASK-004's** job. This layer only holds the rules those writes will use.
- **The office's own car table vs the showroom's** — that is **TASK-003's** job.
- **How it looks** (colours, spacing) — checked by hand by you, not by me. I took no screenshots.

---

## The one open question

The task says: when this is done, **all 9 benchmarks are met**. But **4 of the 9 benchmarks need the
write features** — saving a car, editing a cost, creating a car, marking it sold. Those writes are
TASK-004, per this same plan. So I did **not** tick "all benchmarks met" — it would not be true yet.

Everything the layer was actually asked to build is built, and every claim above is backed by a run
kept on disk.

---

## Where the evidence is

- `report.md` — the detailed report (built / verified / not verified)
- `TASK-002-conflict-log.md` — every disagreement and its winner
- `TASK-002-browser-check.md` — the browser check
- `TASK-002-model-check.md` — the rule-by-rule check
- `TASK-002-reconcile-output.txt` — the office reconciliation numbers
- `rules/` — the six rule files · `model/TASK-002-model.md` — the authority

All of these sit in this folder, copied straight from `developer-workspace/`.
