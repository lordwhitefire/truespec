# Gated methodology step plan — EXTRACT-001 verification

Methodology: `runtime-divergence` v1.0.0. State machine:
discovery → methodology-selection → framework-selection → initialization → planning →
validation → execution.

| Step | State | Action | Methodology step | Framework | Tools | Expected evidence |
|---|---|---|---|---|---|---|
| P1 | discovery | Project + live-page + artifact discovery | discovery | playwright-core | rd-browser, independent-census | discovery notes |
| P2 | methodology-selection | Ambiguity detected → user chose runtime-divergence | state-enumeration | — | — | methodology decision record |
| P3 | framework-selection | playwright-core 1.64.0 selected | state-enumeration | playwright-core | rd-browser | strategy §5 |
| P4 | initialization | Bootstrap `.saa/` registries | reference-capture | playwright-core | — | registries on disk |
| P5 | planning | Write this plan + strategy | reference-capture | — | — | strategy + plan files |
| P6 | validation | Independent census of reference + build (checks 1,2,3) | reference-capture / target-capture | playwright-core | rd-browser, rd-extract, independent-census | census-*.json |
| P7 | validation | Drive states + inject probe (check 4) | target-capture | playwright-core | rd-browser, independent-census | probe-evidence.txt |
| P8 | validation | Set equality + reason audit (checks 5,6) | compare | playwright-core | rd-compare, independent-census | set-differences.txt, reason-audit.txt |
| P9 | execution | Record approved execution | report | playwright-core | rd-browser, rd-extract, rd-compare, independent-census | run-log.txt, check-results.json |
| P10 | — | Finding verification + methodology audit + compliance report | report | — | rd-compare | audit result + compliance report |

Steps P6–P9 are the significant testing actions and are gated through `controller_gate`
before execution. Nothing destructive; the one sensitive action (driving the live browser
+ probe injection) was explicitly authorized by the user.
