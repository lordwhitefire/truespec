# Traceability Audit — product manager mental model (v4)

**Build:** `mental-models/product-manager/`
**Source of authority:** `intent/knowledge-base/` — `circles/07-decode-and-conquer-2nd-ed-full-text.md`
(16,354 lines) and `circles/08-product-manager-interview-full-text.md` (16,354-line extracted
Markdown; the PDF is not the citation base).
**Method:** every cited line number was resolved against the extracted Markdown, not against page
numbers or recollection. A line that resolves to blank, or to a heading rather than the claimed
content, is a defect.

This audit supersedes the v3 audit, which reported 33 PARTIAL citations. Those 33 are resolved; the
v4 findings are listed in §4.

---

## 1. Inventory reconciliation — the 47/104 claim, independently re-derived

The model claims: **47 in-scope "Common Mistakes" blocks, 104 defects, 86 product-judgement and 18
quarantined.** This was re-derived from the source, not read back from the model.

| Chapter | In-scope blocks | Source total for chapter |
|---|---|---|
| Ch. 11 | 3 | 3 |
| Ch. 12, 13, 17 | 0 | 0 |
| Ch. 14 | 28 | 28 |
| Ch. 15 | 1 | 1 |
| Ch. 16 | 1 | 1 |
| Ch. 18 | 12 | 12 |
| Ch. 22 | 2 | 2 |
| **In scope (11–18, 22)** | **47** | **47** |
| Out of scope (6–10, 19–21, 23–26) | — | 66 |
| **All "Common Mistakes" headings in the corpus** | — | **113** |

The out-of-scope chapters account for the 113 figure that the v3 build cited as an unextracted
remainder. That figure was correct as a *corpus-wide* count and wrong as an *in-scope* one; it is
now stated as 47 in scope / 66 out of scope.

**Defect count.** 104 was re-derived by walking each of the 47 blocks to its `Answer` heading and
counting each `x`-marked item plus the two blocks that carry their defect immediately after the
`Common Mistakes` heading with no marker (`PMIV` L9538–9539, L11426–11427). Result: **104**, matching
the model.

**Classification split.** X-82 holds 86 rows whose class cell reads `judgement`; X-83 holds 18 rows
with a stated reason for exclusion. **86 + 18 = 104.** ✓

## 2. Citation resolution

Every line number cited in X-82 and X-83 — 149 distinct citations across 104 defect rows plus 47
block anchors — was resolved against the source.

| Check | Result |
|---|---|
| Cited lines within file range | 149 / 149 |
| Cited lines resolving to blank content | **0** |
| Cited lines resolving to the claimed defect text | 149 / 149 |

Three citations were contested by the v4 audit and were re-read against the source. **All three model
citations are correct; the parser that challenged them was wrong:**

| Citation | Source | Verdict |
|---|---|---|
| `PMIV` L7428 | L7425 `x`, L7426 `138` *(PDF page artifact)*, L7428 the defect | **Model correct.** L7428 is the defect; L7426 is a page-number artifact and must not be cited. |
| `PMIV` L9539 | L9538 `Common Mistakes`, L9539 defect, no `x` marker | **Model correct.** Unmarked block; L9539 is the defect. |
| `PMIV` L11427 | L11426 `Common Mistakes`, L11427–11428 defect, no `x` marker | **Model correct.** Unmarked block; range L11427–11428. |

## 3. Structural integrity

The v4 remediation reordered whole sections of `extraction-log.md`, which introduced a duplicated
`§5` block. This was detected and repaired, and the following checks were run on the repaired file:

| Check | Result |
|---|---|
| X-ids present | X-1 … X-93, **no gaps** |
| Section headers in order | §0 §1 §2 §3 §4 §4a §4b §4c §4d §5 §6 §7 §8 ✓ |
| Duplicate section blocks | **none** (the introduced `§5` duplication removed) |
| Odd backtick counts, all six artifacts | **0** |
| In-scope block coverage | 47 / 47 |

## 4. Findings resolved in v4

| # | Severity | Finding | Resolution |
|---|---|---|---|
| 1 | High | Five Whys written as four deep, with the answer to the fourth question treated as the constraint | Rewritten five deep; answer four is the aluminum-foil solution, answer five the procurement constraint. Source states no stopping rule — the constraint reading is now labelled model inference at every occurrence |
| 2 | High | "Hiring is the staffing manager's job" asserted as source text in four artifacts | Now labelled inference from the structure of `svpg/05` L40, L42–43 |
| 3 | High | Corroboration counts wrong: "four times" for rules stated five times | Recounted; `PMIV` L9536–9537 added as the fifth statement of the governing rule |
| 4 | High | §7 claimed `D&C` Ch. 6–12 unextracted; Ch. 6 (Five Whys) is in scope and extracted at X-65–X-67 | Rewritten: Ch. 6 extracted, Ch. 8 an owner call, Chs. 9–12 out of scope |
| 5 | High | §6 ruling 8 recorded as in force though §8 later withdrew it | Row now states the ruling was withdrawn and points to the replacement |
| 6 | High | Counts not recomputed after growth: "Twenty-two", "Fourteen", "eleven", "24-row" | All recomputed against the model: 18 ambition/originality + 6 scope; 31/14/2 by chapter; 12 load-bearing demands; 31 demand rows |
| 7 | Medium | Coverage table implied one-to-one cue/decision/criterion mapping | Marked: five one-to-one rows, three secondary-coverage rows that add no new criterion |
| 8 | Medium | `PMIV` L11104 (the prompt) cited where the defect is meant | Now cites L11113 for the defect and L11131 for the worked narrowing |
| 9 | Medium | CS-13 quotes "underlying job" from `circles/03` L17, where L17 does not say it | Re-cited to `D&C` L631–651 |
| 10 | Medium | `circles/05` L14 cited for a claim at L40; AARM starting point; Three Loops endpoint; `D&C` line count | All corrected; `D&C` is 5,785 lines under `wc -l` |
| 11 | Low | Changelog "Eight wrong line references" listing nine, with before-values overwritten in place | Restored as a nine-row table with true pre-fix values, so the defect record is auditable |
| 12 | Low | Stale backticks, a missing full stop, `D-12`/`D-16` cross-reference | Fixed |

## 5. Verdict

**All 104 defect rows are traceable to a specific source line, and every cited line resolves to the
content claimed.** No PARTIAL and no UNTRACEABLE citations remain.

| Class | Count |
|---|---|
| TRACEABLE | 104 |
| PARTIAL | 0 |
| UNTRACEABLE | 0 |

Scope note, carried forward honestly: the per-question **"Things to Consider"** notes in `PMIV`
Ch. 11–18 and 22 are **not** extracted. They instruct the candidate rather than state defects, and
reading them is what surfaced the fifth statement of the governing rule (`PMIV` L9536–9537). They are
a known residual, not a hidden one. The worked *answers* are likewise unextracted; they illustrate the
defects and add no judgement the defect list does not already carry.