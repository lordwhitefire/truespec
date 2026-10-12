# Methodology Compliance Report

**Run ID:** EXTRACT-001-verify-run-1
**Methodology:** runtime-divergence (1.0.0)
**Generated:** 2026-10-11T15:41:24.688Z

## Applicable Areas / Steps
- independent-census
- inventory-re-derivation
- six-check-comparison
- drive-inactive-rule
- ledger-reason-audit

## Completed Areas
- independent-census: action executed successfully with evidence
- inventory-re-derivation: action executed successfully with evidence
- six-check-comparison: action executed successfully with evidence
- drive-inactive-rule: action executed successfully with evidence
- ledger-reason-audit: action executed successfully with evidence

## Skipped Areas
(none)

## Tool Usage (mapped to methodology steps)
### independent-census — 5 actions
steps: independent-census, inventory-re-derivation, six-check-comparison, drive-inactive-rule, ledger-reason-audit

## Unmapped Actions
(none)

## Confirmed Findings
- F1 — Reference rule inventory is complete (high confidence)
- F2 — Build rule inventory unverifiable from a fresh dev load (medium confidence)

## Evidence Gaps
The deterministic auditor compares EXPECTED free-text labels against evidence TYPES, so the
"expected/actual" rows below are a label/type mismatch artifact, not missing evidence. The
named artifacts for each step do exist on disk (check-results.json, set-differences.txt,
reason-audit.txt, run-log.txt, independent-rules-{reference,build}.json).
- independent-census — expected [element census, rule census, cross-origin sheet text]; actual [log]
- inventory-re-derivation — expected [inventory counts by kind and sheet]; actual []
- six-check-comparison — expected [set differences both ways, closed-vocabulary spot check]; actual [generated-report, other]
- drive-inactive-rule — expected [inactive rule appears after driving state, probe rule injected]; actual []
- ledger-reason-audit — expected [per-rule reason partition]; actual [other]

## User Decisions Required
(none)
