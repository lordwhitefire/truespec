# Test Strategy — EXTRACT-001 rule-extraction inventory verification

- **Date:** 2026-10-11
- **Agent:** Software Assurance Agent (a session that did NOT run the extraction)
- **Task:** `openspec/tasks/EXTRACT-001/testing.md`
- **Status:** strategy written BEFORE execution (planning phase)

## 1. Objective

Try to **falsify** the claim that the EXTRACT-001 rule-extraction inventory is complete:
that it captures every element and every HTML/CSS/JS rule present on the running
reference — with nothing silently dropped and nothing invented — and that the build
produces a comparable inventory.

Each of the six checks in `testing.md` is reported **pass or fail, named**. Anything that
fails is reported as the remaining gap.

## 2. Project understanding (from discovery + evidence, not from the inventory's claims)

- **Product:** TrueSpec — a Next.js 15 / React showroom app; a static HTML/CSS/JS
  **reference** site is the standard.
- **Two running pages (both on the same state: car not found), Chrome CDP `:9222`:**
  - Reference (static, python http.server) — `http://localhost:3211/car.html?car=1999-not-a-real-car`
  - Build (Next.js dev, `next-server` on :3210) — `http://localhost:3210/car/NOPE-9999`
- **Inventory under test** (`developer-workspace/scripts/runtime-ui-diff/runs/extract-001/`):
  `reference.json` (49.9 MB), `build.json` (38.1 MB), `comparison.json`, `meta.json`,
  `reference-rule-ledger.txt`, `build-rule-ledger.txt`.
- **Inventory's own headline claims (to be checked, not trusted):**
  reference 163 elements / 2274 rules (102 used, 2038 unused) / 497-property closed list;
  build 196 elements (+2 shadow hosts) / 2960 rules (139 used) / 701-property closed list.
- **Existing tests / frameworks:** none in the project besides `playwright-core`.
- **Source of truth:** the running pages, read live. Never the inventory's JSON numbers
  alone, and never a hand diff of the two source trees.

## 3. Testing surfaces (only the surfaces this task touches)

| Surface | What it is | In scope |
|---|---|---|
| Element inventory verification | independent element count vs the inventory's count | yes (item 1) |
| CSS rule-inventory verification | independent rule enumeration vs the inventory's set, both directions | yes (items 2, 5) |
| CSS property vocabulary | the closed property list present per element, absence visible | yes (item 3) |
| Hidden / dynamic rules | a rule not active on load, surfaced after driving | yes (item 4) |
| Gap-reason evidence | every unused/omitted rule carries a checkable reason | yes (item 6) |
| Build comparability | the same run on the build yields a comparable inventory | yes (secondary — task benchmark 5) |

Out of scope for this task: business logic, data model, functionality, UX, system model
(these are later layers, `TASK-002..006`). No product change is made.

## 4. Methodology selection

- **Selected:** `runtime-divergence` v1.0.0 — differential runtime comparison.
- **Reason:** reference-vs-target comparison performed at runtime only; the task
  mandates runtime-only and reuse of the runtime-divergence scripts; testing.md's checks
  are state-driven rule comparison. Chosen explicitly by the user after the detector
  flagged the surface as methodology-ambiguous (see
  `.saa/methodology-decisions/EXTRACT-001-methodology.md`).
- **Techniques used:** independent-census, state-driving, set-equality, probe-injection,
  evidence-audit.

## 5. Framework and tools

- **Framework:** `playwright-core` 1.64.0.
- **Tools:** `rd-browser` (browser-automation), `rd-extract` (runtime-extraction),
  `rd-compare` (runtime-comparison), `independent-census` (independent-css-census).
- **Initialization required before execution:** yes — this run **bootstraps `.saa/`**
  (it did not exist): methodology registry, tool registry, project.yaml, strategy,
  methodology decision, plans. Nothing else is installed.

## 6. Planned coverage — the six checks mapped to method

| # | Check (testing.md) | Method | Pass condition |
|---|---|---|---|
| 1 | Element count | Independent `document.querySelectorAll('*')` count + independent TreeWalker count, on the live page | all three (mine ×2, inventory) equal |
| 2 | Rule completeness | Independent CSSOM enumeration (`document.styleSheets` → `cssRules`, recursive) → set A; inventory `ruleRegistry` → set B | A ⊇ page, B ⊆ page, and A↔B agree (both directions) |
| 3 | Closed vocabulary | Read inventory `closedList` + per-element `vals`; sample properties across the list; independently read computed styles | every sampled property is present as a column (value or `<absent>`) — none missing without a reason |
| 4 | Hidden / dynamic rule | Drive a state (theme click) and inject an ephemeral probe rule; re-census | a non-load rule (state-gated or planted) appears |
| 5 | No invention | For every inventory rule, locate a counterpart (selector+sheet) in the independent census / live CSSOM | every inventory rule is found on the page |
| 6 | Reason for every gap | Parse `*-rule-ledger.txt`; check every unused rule row carries a reason; spot-check that a flagged-unused rule is genuinely not applied | all reasons present and checkable; no gap without a reason |

Secondary: the same census run on the **build** side, to confirm a comparable inventory.

## 7. Evidence to be produced

Under `.saa/evidence/`:
- `independent-census.mjs` — the census script (the instrument).
- `census-reference.json`, `census-build.json` — the independent census output.
- `check-results.json` — per-check pass/fail with the underlying counts/sets.
- `set-differences.txt` — rule set differences, both directions, human-readable.
- `probe-evidence.txt` — the hidden/dynamic-rule drive result.
- `reason-audit.txt` — the ledger reason audit.
- `run-log.txt` — what was executed, when, against which URLs.

## 8. Known gaps / limitations (declared up front)

- **Cross-origin stylesheets:** `cssRules` throws for cross-origin sheets. Both pages are
  same-origin localhost, so this is expected to be empty — it will be counted and named if
  not.
- **The build includes the Next.js dev overlay** (shadow hosts, dev-tools CSS). The
  inventory counts it separately; the verification will separate it the same way and name
  it, not fold it in.
- **Dynamic JS behaviour completeness** (research note §11's "honest gap"): no code path
  proves *all* JS behaviour without driving. This run drives the 9 states the extraction
  used; states outside that list are not claimed.
- **A single load snapshot is not enough** — the driving steps are mandatory, hence item 4.

## 9. User questions (from the strategy engine) — carried, not silently assumed

- Methodology ambiguity → **asked and answered** (runtime-divergence).
- Tool capability gap for the census → **asked and answered** (reuse runtime-divergence scripts).
- Authorization to drive + inject → **asked and answered** (authorized).
- Items 1–6 are a falsification checklist, not a coverage question; no further user input
  is required to execute. Any new uncertainty found during execution will be raised, not guessed.
