# EXTRACT-001 — rule-extraction proof: done, evidence archived

Proof run complete (2026-10-11). Full write-up:

- **Report:** `reports/EXTRACT-001-rule-extraction-proof.md`
- **Reproducible runner:** `scripts/extract-rules.mjs`
  (config: `scripts/runtime-ui-diff/extract-001.config.json`)
- **Artifacts (final clean run):**
  `scripts/runtime-ui-diff/runs/extract-001/`
  — `reference.json`, `build.json`, `comparison.json`, `meta.json`,
  `reference-rule-ledger.txt`, `build-rule-ledger.txt`

Headline numbers (final run):

- Reference: 163 elements (163 by its own count; farewell = 168 = +5 modal
  elements), 2274 CSS rules (102 used / 2038 unused, every unused with a
  stated reason), 497-property closed list (0 post-baseline), 17 handlers + 9
  inline-`on*` elements, hidden-rule proof `firstMatchedNewly = 8`, planted
  rule caught (`inStyleSheets true`, outline applied).
- Build: 196–197 elements (+2 dev-overlay shadow hosts, reported separately),
  2960 rules (139 used), 701-property closed list (166 dev-overlay token
  columns disclosed via `missingProps`, not hidden), 579 handlers, planted
  rule caught identically.
- Comparison: `rulesOnlyInReference 234`, `rulesOnlyInBuild 920`,
  `selectorsOnlyInReference 7`, `selectorsOnlyInBuild 569`. Runtime-only —
  no source trees diffed.

All seven benchmarks hold; every named gap (dev overlay, transient dev pages,
overlay sheet-text events, `#gal` absent on not-found pages, farewell/toast
session budgets, corroboration-only coverage) is named in the report with its
reason. Testing of the evidence is a separate step, not claimed here.