# Methodology decision — EXTRACT-001 inventory verification

- **Date:** 2026-10-11
- **Task:** `openspec/tasks/EXTRACT-001/` — falsify the claim that the rule-extraction
  inventory (`developer-workspace/scripts/runtime-ui-diff/runs/extract-001/`) is complete.
- **Decision:** **runtime-divergence v1.0.0** (chosen by the user).
- **Surface:** runtime rule-inventory verification (reference page + build page).

## Why this decision, and not the agent's own

The six checks in `testing.md` fit more than one established methodology, and no
Methodology Registry existed in `.saa/` to determine a single one. Per the agent's
rules, an ambiguous methodology is an explicit ask, never a silent pick. The
deterministic detector (`ask_uncertainty_detect`) returned an
`ambiguous-methodology` ask; the user was presented the candidates and chose.

## Candidates considered

| Candidate | Why considered | Why it was / was not chosen |
|---|---|---|
| **runtime-divergence** | The project's own method for reference-vs-target comparison; the task mandates runtime-only and "reuse the runtime-divergence scripts"; testing.md's checks are state-driven rule comparison. | **Chosen.** Best fit: reference runtime = the live page's own rules; target = the inventory's claims. |
| Independent differential re-extraction | testing.md items 2 and 5 are literally bidirectional set equality. | Close second; effectively the *technique* used *inside* runtime-divergence here (independent-census + set-equality). Not adopted as the governing frame. |
| Verification & Validation (benchmark pass/fail) | testing.md is an item-by-item pass/fail list. | Too thin: it would score the benchmarks without an independent runtime model, which testing.md explicitly forbids ("accepting the inventory's own numbers"). |

## Framework and tools

- **Framework:** `playwright-core` 1.64.0 (the runtime-divergence browser layer uses it).
- **Tools (all registered, all providing a capability):**
  - `rd-browser` — browser-automation (attach to the persistent Chrome, two tabs, resize).
  - `rd-extract` — runtime-extraction (untargeted full extraction per state).
  - `rd-compare` — runtime-comparison (normalize + compare).
  - `independent-census` — independent-css-census (a from-scratch in-page census on a
    different code path than the Builder's extractor, so the inventory's own numbers
    are never accepted).

## Authorization

The user authorized **driving both live tabs** (synthetic click/scroll/resize/key/timer)
and **injecting an ephemeral probe rule/sheet** (tab-only; no site files change), to
exercise testing.md item 4 (hidden/dynamic rule). Recorded via
`ask_uncertainty_present_ask` → resolved as `authorize-drive-inject`.

## Independence statement

This session did **not** run the extraction. It reads the inventory only as a claim to
be falsified. The census it compares against is taken from the live page by a different
code path. Where a check cannot be completed, it is named as a remaining gap rather than
assumed.
