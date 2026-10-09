# Build Report — product manager mental model

**Subject:** how an expert product manager works — cues, decisions, judgment criteria
**Built:** v4, full extraction, product-judgement scope
**Location:** `product-management/mental-models/product-manager/`

---

## 1. What was built

| Artifact | Lines | Contents |
|---|---|---|
| `source-map.md` | 231 | Corpus, authority order, scope decisions, conflicts, gap ledger |
| `extraction-log.md` | 1189 | `X-1` – `X-93`, §0–§8, every finding tied to a source line |
| `cue-strategy-model.md` | 607 | **35 cues** (`CS-1` – `CS-35`): what the expert notices, and what they do |
| `decision-model.md` | 495 | **D-0** – **D-40** = 41 entries; 38 with a resolution, 3 recorded without |
| `judgment-criteria-model.md` | 450 | **34 criteria** (`J1` – `J34`): how the work is judged pass/fail |
| `mental-model.md` | 491 | The assembled model — **31 cognitive-demand rows**, 12 of them load-bearing |
| `traceability-audit.md` | 110 | Independent re-derivation of the inventory and every citation |
| `traceability-verdict.md` | 135 | Gate 1 — traceability |
| `cognitive-content-verdict.md` | 45 | Gate 2 — real cognition vs restatement |
| `relevance-verdict.md` | 84 | Gate 3 — on-task vs adjacent |

## 2. Source material

| File | Lines | Role |
|---|---|---|
| `circles/07-decode-and-conquer-2nd-ed-full-text.md` | 16,354 | **Primary authority.** The CIRCLES Method™ as Lin teaches it |
| `circles/08-product-manager-interview-full-text.md` | 16,354 | **Practice authority.** 164 worked questions, Ch. 11–18 and 22 in scope |
| `circles/01`–`circles/06`, `svpg/*`, `rice/*` | — | Third-party commentary; subordinate to the two above |
| `sources.md` | — | Provenance and authority index |

Authority order, as ruled: `D&C` → `circles/01`–`02` → third-party `circles/03`–`06`. Citations are
line numbers in the **extracted Markdown**, never page numbers. PDF page artifacts (`<!-- page 138 -->`
and bare numbers like a stray `138`) are conversion noise and are never cited.

## 3. Owner decisions taken

1. **Product judgement, not interview performance.** Room-ground material — how the answer came
   across, nerves, whiteboard use, enthusiasm, what the listener already knew — is extracted but
   quarantined, never admitted as a cue, decision or criterion.
2. **Full extraction** of the in-scope chapters, not a sample.
3. **`D&C` Ch. 8 (business-model estimation)** is adjacent to the declared scope. Recorded as an
   owner call, not silently omitted.
4. **D-33 – D-35** (willingness to pay, new-market entry checklist, pro/con as strategy instrument)
   sit outside scope and are carried **without resolutions**, so the boundary is visible.

## 4. The v4 extraction

The owner directed full extraction of `PMIV` Ch. 11–18 and 22. Result:

| Chapter | Blocks | Defects |
|---|---|---|
| Ch. 11 | 3 | 9 |
| Ch. 12, 13, 17 | 0 | 0 |
| Ch. 14 | 28 | 72 |
| Ch. 15 | 1 | 1 |
| Ch. 16 | 1 | 1 |
| Ch. 18 | 12 | 13 |
| Ch. 22 | 2 | 6 |
| **In scope** | **47** | **104** |

**104 defects: 86 product judgement (X-82), 18 quarantined (X-83).**

Independently re-derived from the source, not read back from the model: 113 `Common Mistakes` headings
exist corpus-wide, **47** in the in-scope chapters and 66 outside them. The v3 build had cited 113 as
the in-scope remainder — correct corpus-wide, wrong in scope.

## 5. What the full extraction added

Seven new cues (`CS-28`–`CS-35`), five new decisions (`D-36`–`D-40`), five new criteria
(`J30`–`J34`) and seven integrated demand rows. The substance:

- **Ambition and originality as a defect class** — the largest one, 18 of the 104 defects. Plus 6
  scope defects.
- **Framing before reasoning** — establish the shared frame before scoring against it.
- **Stated constraints, safety and dependencies** must be priced into the answer.
- **Customer and data depth** — a first-idea answer usually comes from a shallow customer read.
- **Answer form vs process** — a design answer must explain *why* those choices, not just present them.
- **Diagnostic discipline** — decompose a moved metric rather than guess at it.
- **Specificity** — name the end state, the actor, and the measure.

The governing rule turned out to be the best-corroborated item in the corpus: **stated five separate
times** (`PMIV` L6875-6876, L8036-8037, L8651-8652, L8882-8883, and — in a per-question note rather
than a defect list — L9536-9537).

## 6. Gates

Each gate ran as an independent read-only judge, given only the item and its source pointer.

| Gate | Result |
|---|---|
| **Traceability** | **104 / 104 TRACEABLE. 0 PARTIAL, 0 UNTRACEABLE.** |
| **Cognitive content** | **11 / 11 COGNITION. 0 RESTATEMENT.** |
| **Domain relevance** | **11 / 11 RELEVANT. 0 MARGINAL, 0 NOT RELEVANT.** |

The traceability judge caught three real defects the earlier passes had missed, all now fixed:

1. The five-fold governing rule was being corroborated with the wrong citation set — three of the five
   lines cited belong to a *different* rule ("stay on the object asked about", X-89).
2. `mental-model.md` claimed five statements while enumerating four.
3. `extraction-log.md` cited `PMIV` L9246-9253 for a defect that ends at L9247 — the range ran past the
   defect into a page-number artifact and a screenshot caption.

The relevance judge also caught that my own gate prompt carried **wrong label pairs**: CS-2, CS-3, CS-4
and D-1, D-3 do not describe the items I attributed to them. Those six were re-gated against the files
as they actually stand, and all six passed.

## 7. Corrections made in v4

The model asserts one thing very often — **"hiring is the staffing manager's job"** — and the source
never says it. It is an inference from the *structure* of `svpg/05` L40 and L42-43, and it is now
labelled that way at every occurrence.

Likewise, the **Five Whys stopping rule**. The chain is five questions deep; the answer to the fourth
is the aluminum-foil solution and the fifth is the procurement constraint. But `D&C` L2035-2039
describes the technique's purpose and never states a stopping rule. Reading "stop at the constraint"
is the model's own inference, and is now marked as such wherever it appears.

The quarantine itself is a judgment, not an omission: the 18 excluded defects are each recorded with
a line and a stated reason, so a reader can disagree with the call rather than having to discover what
was dropped.

## 8. Known residuals

| Residual | Status |
|---|---|
| `PMIV` per-question **"Things to Consider"** notes | **Not extracted.** They instruct the candidate rather than state defects — but reading them is what surfaced the fifth statement of the governing rule. A genuine residual. |
| `PMIV` worked **answers** | Not extracted. They illustrate the defects already listed and add no judgment. |
| `circles/02` describes a **Fifth Edition** (528 pp.) not in the corpus | Unknown whether the method changed across editions. |
| `D&C` Chs. 9–12 (pricing, ROI, strategy) | Out of declared scope. |

## 9. What this model is for

It is a **product-judgement** model. It will tell you that the first defensible idea is usually not the
best one, that "safe and small" is a warning rather than a compliment, that the object's own meaning
has to be agreed before anything is scored against it, and that the framework is a checklist rather
than a recipe. It will not tell you how to sound confident in an interview — that material was
extracted, and deliberately kept out.

The build is complete and gated. All three gates pass on independently re-derived evidence.