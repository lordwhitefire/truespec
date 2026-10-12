# EXTRACT-001 — Independent Testing Report

**Page under test (graded standard):** http://localhost:3211/car.html?car=1999-not-a-real-car
**Inventory:** developer-workspace/scripts/runtime-ui-diff/runs/extract-001/reference.json
**Methodology:** runtime-divergence (runtime-only; the build/reference source trees were never diffed)
**Tester:** independent session — did not run the extraction
**Date:** 2026-10-11

## Verdict

| # | Check | Result | Basis |
|---|-------|--------|-------|
| 1 | Element count | **PASS** | independent QSA 163 = TreeWalker 163 = inventory 163 |
| 2 | Rule completeness | **PASS** | independent rule set == inventory rule set both ways; 0 only-in-inventory, 0 only-in-independent, 0 count mismatch |
| 3 | Closed vocabulary | **PASS** | 497 closed props; every element carries 497 values; live re-read of 3 elements × 497 props = 0 mismatches |
| 4 | Hidden / dynamic rule | **PASS** | `html[data-theme=dark]` 0 matches at light → 1 after clicking #thm; injected probe rule appears in CSSOM and computed style |
| 5 | No invention | **PASS** | 0 inventory rules without a page counterpart |
| 6 | Reason for every gap | **PASS** | 2274 rule lines / 2274 reason lines; unused 2172 = 2031 no-element + 13 inactive-cond + 128 n/a (0 unmatchable) |

**All six checks pass on the reference page. One remaining gap is named below.**

## How independence was achieved

- Elements and rules were enumerated from the **browser's own CSSOM** (`document.styleSheets[i].cssRules`),
  not from the extractor's parser. Cross-origin sheets (Google Fonts, Font Awesome) throw `SecurityError`
  on `cssRules`, so their text was fetched with the **browser's User-Agent** and re-parsed via
  `new CSSStyleSheet().replaceSync(text)` + that sheet's own `cssRules`.
- The inventory's own numbers were never used as the answer; they were re-derived from `ruleRegistry`
  and compared.
- No `used` flag was trusted — the inventory has none; usage is per-state in `matchedInStates`, and the
  human-readable ledger reason text was re-parsed independently.

## Item detail

**2 — Rule completeness.** Independent: 2140 style + 6 at-block + 22 keyframes + 60 keyframe + 46 font-face = 2274.
Inventory: identical by kind; per-sheet identical (inline 234, Google Fonts 36, Font Awesome 2004).
Distinct style selectors: 2125 both sides. Set difference: 0 / 0.

**3 — Closed vocabulary.** `closedListSize` 497 == each element's `vals` length. `<absent>` never occurs
(0 of 731,584 values) — consistent, since every closed-list property resolves on every element.
Live `getComputedStyle` re-read of `html`, `head`, `meta` across all 497 props: 0 mismatches.

**4 — Hidden/dynamic rule.** At the pinned light default, `html[data-theme=dark]` matches 0 elements;
one click on `#thm` sets `data-theme=dark` and it matches 1. A probe stylesheet
`.extract001-verify-planted{outline:7px solid rgb(3,5,7)}` plus a matching element showed both in the
CSSOM and as computed `outline: rgb(3, 5, 7) solid 7px`.

**6 — Reason for every gap.** Ledger partition (sums to 2274): used 102; unused-noElement 2031;
unused-inactive-condition 13 (style-rule subset 7); n/a-declaration 128; unmatchable 0.

## Process note (a caught false negative)

The first automated pass reported checks 2/5 as FAIL with a symmetric 1880 / 1880 split. That was a
**normalizer artifact**, not a real gap: the browser serializes pseudo-elements as `::before`/`::after`
while the served text/inventory uses `:before`/`:after`, and CSSOM inserts spaces around combinators
(`.inf > i` vs `.inf>i`; `::before` vs `*::before`). After canonicalizing both sides, the sets are
identical. This is recorded so the change is auditable — a careless test would have shipped a false fail.

## Remaining gap (named)

**G1 — The BUILD inventory's completeness is NOT independently verified.** The build page
(http://localhost:3210/car/NOPE-9999) is a **next dev** server whose CSSOM changes between loads:
- elements 194 / 196 / 197 across runs, plus 2 dev-overlay shadow hosts not in the inventory;
- the inline `<style>` sheet held 171 then 382 rules across two runs;
- `layout.css` version token changed between runs (`?v=1791732795296` → `?v=1791733006184`).

Because the page is not stable across reloads, a fresh-load census cannot confirm or refute the
captured build inventory (196 elements / 2960 rules). Everything the report claims about the **reference**
is reproduced exactly; the **build** claim needs either a production (non-HMR) build or a pinned commit
to be falsifiable. This is the only unverified area and it does not affect checks 1–6, which are defined
against the reference.

## Cross-check against the proof report's headline numbers
- report: 163 elements, 2274 rules, 102 used / 2038 unused style rules, 7 inactive-media,
  2031 no-element, 0 unmatchable, 17 handlers, 9 states.
- independent: 163 / 2274; ledger USED 102; unused style 2140−102 = 2038; no-element 2031;
  style-rule inactive-media subset 7; unmatchable 0. **Exact agreement.**

## Artifacts
- check-results.json — machine results for all six checks
- set-differences.txt — both-way set differences for reference style rules
- reason-audit.txt — item-6 ledger reason partition (reference + build)
- run-log.txt — environment, method, run history, reproducibility
- independent-rules-reference.json / independent-rules-build.json — the independent rule sets
- sheet-cache/ — cached CDN sheet text (offline-reproducible)
- methodology-audit.json, compliance-report.md — post-run methodology audit
