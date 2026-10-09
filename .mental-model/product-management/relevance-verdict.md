---
artifact_writer: true
judge: judge-domain-relevance
artifact: relevance-verdict.md
subject: v4 pass of the product-manager mental model — eleven items submitted for a relevance check
items_judged: 11 (the eleven listed in the evaluation request)
basis: workspace domain brain — product-management/mental-models/product-manager (source-map.md §1 "What this expert's task actually is", mental-model.md "The expert's task" and its Scope line), read against the model files that carry the items (cue-strategy-model.md, decision-model.md, judgment-criteria-model.md, extraction-log.md, mental-model.md)
supersedes: the 2026-10-01 13:34 / 16:28 relevance verdicts on mental-model.md and on the X-1..X-62 / D-0..D-26 rebuild; those judged a different item set (89 items, three altitudes, second pass). This pass judges eleven named items of the current build.
---

# Relevance verdict — v4 product-manager mental model (eleven items)

## Judge question

Is each item about the expert's actual task, or off to the side?

## The test applied

The declared task is to model **how this PM works**: the cues they notice, the decisions they make,
the criteria by which they judge the work — across answering a bounded product-design question,
running discovery, prioritising, and shipping. The declared out-of-scope list is the mirror image:
interview performance and delivery style (how the answer sounded, nerves, whiteboard, enthusiasm),
business-model estimation, pricing existing products, competitive-strategy chapters, and
third-party commentary on CIRCLES as a method.

So the test on every item is one of three shapes:

- **content** — the item encodes a judgement about the product work (what problem, what customer,
  what need, what cut, what ships, what the question needs);
- **room-ground** — the only thing it encodes is a judgement about how an answer is being received;
- **boundary work** — the item is not a cue, decision or criterion at all, but it records and holds
  the declared scope's edge, so that out-of-scope material is quarantined or an owner call logged
  rather than silently imported or silently dropped.

Room-ground is a FAIL for this build; it is the exact failure the owner already ruled on against the
second pass. Boundary work is in scope — the declaration *contains* an out-of-scope list, and
enforcing it serves the declared task; punishing visible scope discipline would reward silence,
which is the other error already ruled on.

## Verdicts

| # | Item | Verdict | Reasoning |
|---|---|---|---|
| 1 | CS-1 / D-0 / J1 — run only the subset of the framework the question needs | **RELEVANT** | This is a scoping judgement about the analysis itself — "using all seven steps … when it is clear this is strictly about implementation" (`PMIV` L6875-6876) and "a framework is a checklist, not a recipe" (`PMIV` L1808-1812) — and the model explicitly re-grounds it away from listener perception ("over-application produces an analysis that does not fit the question. Nothing about a listener is required for the rule to hold", `source-map.md` §3), so it is content, not the v2 room-ground error. |
| 2 | CS-2 / D-1 / J2 — Lin's Report = user story; Torres's job/want test = opportunity filter | **RELEVANT** | Naming the *object* before you cut — a scoped user story (effort knowable, `D&C` L662-673) versus an unscoped opportunity (effort excluded, `cd/01` L79-80) — is a prioritisation judgement about the work itself, and resolving the two corpora by object rather than by picking a winner is real PM reasoning. |
| 3 | CS-3 / D-2 — Report is a user story because `D&C` separates Report from Evaluate; L623-627 is the chapter's own example | **RELEVANT** | How the PM states a need — "As a ⟨role⟩, I want ⟨goal⟩ so that ⟨benefit⟩", carrying no solution mechanics, because a bare solution "begs the question, 'Why?'" — is core CIRCLES product content and a discovery judgement, not delivery. |
| 4 | CS-4 / D-3 — Five Whys: five deep, answer four the solution, answer five the constraint | **RELEVANT** | Lin frames the why-chain as part of understanding customer needs — digging into the customer's workflow, the obstacles and the gaps existing solutions leave open (`D&C` L2029-2068) — which is problem discovery by name, inside the declared scope. |
| 5 | CS-28 / D-36 / J30 — general ideas fail on specificity | **RELEVANT** | "Proposing a magical solution without going into the implementation details" and "claiming one can improve the UX without showing how" are defects in the *content* of the recommendation, and the model draws exactly the right line by keeping them in (CS-28) while quarantining the medium-based twins — "not drawing the solution on a whiteboard", "pictures are more effective than words" (X-83, L8413/L9490). |
| 6 | CS-29 / D-37 / J31 — "safe and small" is a red flag | **RELEVANT** | The judgement is the ambition and originality of the answer itself — reject the superficial fix ("removing ads", "make the button more visible or colorful"), bring one genuinely audacious option, survey the space so originality is real — which is about the product work. Caveat noted, not disqualifying: two of its citations lean outward — "copying competitor's innovations" (L9246-9247) brushes the declared out-of-scope competitive territory, and L8722-8723 is phrased as what companies prefer to *hear*; both are support lines under a content judgement, not the judgement itself. |
| 7 | CS-32 / D-40 / J34 — apply price/constraints, safety and dependencies | **RELEVANT** | Reading the item as the model carries it — apply every limit, objective, safety issue and dependency the question stated ("not factoring in the 30-minute constraint", "missing critical dependencies such as driver availability") — this is requirements discipline on the work, and safety and dependencies are real pre-ship judgements. One line to be careful with: the "3X revenue objective" instance is *meeting a stated objective*, not estimating revenue, so it does not cross into the declared out-of-scope business-model estimation. |
| 8 | X-83 quarantine ruling — 18 excluded defects are delivery, manner, listener knowledge or nerves | **RELEVANT** (boundary work) | Not a cue, decision or criterion — a scope record, and a good one: its four exclusion categories are the declared out-of-scope list almost item-for-item (manner, medium, nerves, assumes what the listener already knows), and it carries each excluded defect with its line and reason rather than deleting it. This is the mechanism that keeps interview-performance material out of the model, so it serves the declared scope directly. |
| 9 | D-26 / J22 / X-62 — the leadership material read as a question about the team in front of you, not a hiring policy | **RELEVANT** | The substance is a standing check on the team the work runs through — competent people with character, cross-functional, able to decide how to solve what they are assigned — which sits inside the model's own declared scope ("governs discovery, prioritisation and shipping under a team that has to be able to act on the result"), and the item's whole work is stripping the off-task frame the source carries, since sourcing, recruiting and on-boarding belong to people managers (`svpg/05` L40-43). It is the item furthest from product judgement proper among the eleven, but it is on-task and its boundary is explicit. |
| 10 | CS-30 / D-38 / J32 — right framework, wrong object is a distinct failure from running the whole framework | **RELEVANT** | Answering the named object at the right layer, with the analysis bounded on both sides — not silently narrowing the target ("the prompt is really about helping the salesperson in general", `PMIV` L7801-7802) and not ignoring what lies outside it — is object discipline on the work, and the model correctly holds it apart from the too-much-framework cue because the corpus names them separately. One support line leans outward: "not mentioning a complete set of go-to-market metrics" (L12025) touches declared out-of-scope competitive territory; the judgement does not depend on it. |
| 11 | The model records `D&C` Ch. 8 (business-model estimation) as an owner call, unextracted, rather than silently omitting it | **RELEVANT** (boundary work) | The declared out-of-scope list names business-model estimation — revenue, headcount, ROI — in so many words, so logging it as an owner call is the declaration being applied at its own edge; the alternative the item rejects (silent omission) is the error the owner already corrected once, when present material was recorded as absent. The adjacent loss it makes visible — top-down and bottom-up estimation at the worth-it / can-we-build seam — is a legitimate owner question, which is exactly why it is surfaced rather than buried. |

## Counts

| Verdict | Items |
|---|---|
| RELEVANT | 11 (2 of them boundary work — #8, #11) |
| MARGINAL | 0 |
| NOT RELEVANT | 0 |

**Verdict: PASS.** Every item encodes a judgement about the product work, or is a record that holds
the declared scope's edge. No item imports interview performance and delivery style, business-model
estimation, pricing, or competitive-strategy content as a cue, decision or criterion. The build
does not repeat the second pass's error: where the corpus grounds a rule in a room (L873-876,
L1797, L900-901) the room-ground is held out and labelled, and where the corpus grounds it in the
work (`PMIV` L6875-6876, L5808-5813, L1808-1812) the model keeps it.

## Notes carried forward (not counted)

- **Label drift in the submission.** Several label pairs in the request do not match the current
  files: `CS-2` is "I don't know this product" and `D-1` is "take the prompt at face value…",
  `CS-3` is "the interviewer won't answer", `CS-4` is "who is this even for?", `D-3` is "if the
  interviewer refuses to answer, stall or assume?". Items 2-4 were judged on the payloads as
  described (the Report/user-story and opportunity-object split; the Five Whys), which map to
  `source-map.md` C-4, `D-5`/`D-13`, `J4`/`J12` and `J26`. Whether the labels should be corrected is
  another judge's question, not this one.
- **Three outward-leaning support lines**, none load-bearing: `PMIV` L9246-9247 (copying
  competitor's innovations) and L12025 (go-to-market metrics) lean toward the declared out-of-scope
  competitive territory; `PMIV` L8722-8723 ("companies would prefer to hear…") is phrased as a
  listener's preference. If the competitive territory is meant to be a hard edge, these are the
  three citations to prune — the judgements they support survive without them.
