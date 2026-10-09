# Source Map — product manager

**Subject:** a product manager who answers product-design questions with CIRCLES and who
governs product work under the SVPG product operating model, continuous discovery, prioritisation
and Shape Up.
**Source corpus:** `/home/lordwhitefire/agentic-frameworks/product-management/intent/knowledge-base/`
— **24 knowledge files**, 25 in total including the `sources.md` provenance index. Twenty-two
fetched 2026-09-30; two Lewis C. Lin books ingested 2026-10-01.
**Citation key:** short source forms (`cd/01`, `rice/01`, `prio/04`, `svpg/02`, `shape-up`,
`D&C`, `PMIV`) are defined in `extraction-log.md` §0, which maps each to its full KB filename.
**Traceability rule:** every element in the mental model resolves as element → this map → the named
KB file and line.

**Revision history.** v1 (22 files, primary source absent, five conflicts resolved against
third-party guides). v2 (2026-10-01, two books ingested — contradicted four v1 resolutions; see
`build-report.md`). v3 (same day, after the gate: relevance FAILED; v2 had carried an
interview-performance frame as product judgement and had recorded present material as absent. Owner
ruled: product-judgement model, and extract the in-scope material).

---

## 1. What this expert's task actually is

The corpus describes one job performed at three altitudes.

- **Altitude 1 — answering a bounded product-design question.** CIRCLES' home ground. A prompt,
  seven steps, one recommendation (`D&C` L511-514).
- **Altitude 2 — running the product continuously.** Which problem to work on, keeping discovery
  weekly and assumption-tested, keeping the delivery loop intact (`cd/01`, `cd/02`, `svpg/01`,
  `svpg/02`).
- **Altitude 3 — deciding when the work is shippable.** Fixed-time/variable-scope bets, appetite,
  scope hammering, deciding when to stop (`shape-up`).

A model that only covers altitude 1 is an interview coach. One that only covers altitude 3 is a
project manager. **A model that treats interview technique as its top layer is neither** — that was
v2's error, corrected in v3.

---

## 2. Corpus inventory — what each group is authoritative for

| Group | Files | Authoritative for | Standing |
|---|---|---|---|
| **`circles/`** | **8** | The seven steps as Lin teaches them; why the method exists; how to find unarticulated problems; measurement | **`D&C` (`07`) is primary — the book in which Lin creates and teaches CIRCLES** (`D&C` L511). `PMIV` (`08`) is practice and proficiency material. `circles/01`/`02` are Lin's public statements and corroborate. `03`–`06` third-party, **subordinate to `07`** |
| `product-model-svpg/` | 8 | Operating model, four risks, discovery vs delivery, empowerment | 01–06 primary SVPG; 07 index; 08 citation list only |
| `continuous-discovery/` | 3 | Opportunity vs solution, the tree, weekly cadence | 01 primary; 02 keynote summary; **03 show notes — no substance** |
| `prioritization/` | 4 | Scoring mechanics and stated limits | 01 RICE origin; 02 teaching adaptation; 03 research in progress; **04 abstract-level only** |
| `shape-up/` | 1 | Shipping: appetite, bets, scopes, stopping | 01 substantive |

### 2.1 The two ingested books

**`circles/07` — *Decode and Conquer*, 2nd ed. (D&C).** 229 pages, 5,785 lines. Origin of the method
and the four stumbles it answers (`L500-519`); all seven steps with worked content (`L525-920`); the
tip on solution-in-hand (`L909-920`); **the Five Whys for unarticulated problems (`L2029-2068`)**;
adapt-the-framework-not-recite-it (`L3660-3663`, `L3845-3850`); AARM and Three Loops
(`L3462-3513`); new-market checklist (`L3953-3993`); pro/con as strategy instrument (`L3861-3869`);
willingness to pay and survey bias (`L3282-3297`); the warning against blind framework-following
(`L1931-1959`).

**`circles/08` — *The Product Manager Interview* (PMIV).** 299 pages, 16,354 lines. Novice-vs-expert
ladder (`L1787-1813`); worked design exercises Ch. 11–14 (`L5800-9844`); metrics Ch. 15–18
(`L9845-12070`); strategy Ch. 19–23. Authoritative for **practice method and named defects**, not
for what the method is.

**Authority order for CIRCLES content:** `D&C` → `circles/01`/`02` → `circles/03`–`06`. Where a
guide and the book disagree, the book wins — **including where the guide is more recent.**

---

## 3. Through-line one: adapt the framework, don't recite it

This replaces v2's through-line, which rested on interviewer reaction.

**The rule, on primary-source ground.** "Notice how the candidate didn't strictly follow the AARM
Method™. That's okay. **The goal of frameworks is to serve as a mental checklist for a complete
response, not to recite it verbatim at the interview. Adapt the framework as you see fit.**"
— `D&C` L3660-3663. Marked satisfied on a worked design answer: a candidate using CIRCLES and AARM
"without sounding mechanical" (`D&C` L3845-3850).

**The defect, stated as a defect in the work.** "**Using all seven steps of the CIRCLES Method™
especially when it is clear that this is strictly about implementation.**" — `PMIV` L6875-6876.
With "Not adapting frameworks to a specific situation" and "Using a framework in a way that feels
generic and forced" (`PMIV` L5808-5813).

**What this is grounded on.** Over-application produces an analysis that does not fit the question.
Nothing about a listener is required for the rule to hold.

> **What v2 had here, and why it was withdrawn.** v2 ranked "sounding scripted = failed" above every
> product judgement, citing "over prepared", "fear the candidate is inexperienced", "establishing
> credibility and likability", "similar to the interviewer" (`D&C` L1940-1952). Those are judgments
> about a candidate in a room. The gate's relevance judge failed the build on exactly this. The
> rule survives; the reasoning does not.

**Why the method exists: four ways candidates stumble.** Starting ("deer in headlights"), rambling
(improvising while talking), unable to end, and focusing on the solution alone — which "begs the
question, 'Why?'", because the listener does not know the customer or the problem (`D&C` L500-510).
Each step answers one. **This is product content and stays.**

## 4. Through-line two: output to outcomes

Unchanged. `svpg/01` L22, `svpg/02` L12: ship **products to achieve outcomes**, not features on
dates. Reaches into prioritisation (`cd/01` L53) and into delivery, where `shape-up` L22 inverts its
own priority. The feasibility shift — floor not ceiling, weight on viable and lovable — is real
(`circles/03` L23, L33, L52; `svpg/01` L48; `svpg/02` L29-33) and is **SVPG's and Torres's, not
Lin's sixth step**.

---

## 5. Conflicts and how each resolves

**C-1 — clarifying questions. (v1's ruling superseded.)** `circles/04` L26 says
clarify with the 5 W's and H, as does `circles/06` L23; (`circles/05` L14 gives goal / constraints /
context and does **not** mention the 5 W's and H); `circles/03` L13, L37 says ask **one** question; v1 ruled for "one" on
recency. **`D&C` L564-568: four — "what is it, who is it for, why do they need it, and how does it
work? So we'll call our version the '3W's and H.'"** Lin names the full list himself at L564, so the
5 W's and H guides were not wrong — the *starting* set is four. **Now: four.** C-1a: Comprehend is the
name; `circles/01` L11's clause is the goal it serves.

**C-2 — how many solutions. (v1's ruling superseded.)** `circles/05` L38 says 10+; `circles/03` L21
says 2–3 for differentiation; `circles/06` L31 says at least 3. **`D&C` L871-872: "brainstorm at
least three ideas… idea number 2 or 3 will usually be the best."** **Now: at least three**, on the
quality ground — "your first idea is rarely the best… Innovation is an iterative process"
(`D&C` L866-870). The interpersonal ground (`D&C` L873-876) is recorded as **X-29b** and is not a
pass condition. The differentiation requirement from `circles/03` is not refuted; it is a separate
requirement carried by D-20.

**C-3 — where Evaluate's weight sits. (v1 corrected.)** v1 placed viable/lovable/feasible **inside
CIRCLES Evaluate**. **It does not belong there.** **`D&C` L879-884: define criteria (optional) —
customer satisfaction, implementation difficulty, revenue potential — then "a pro and cons list is a
good way to do this."** Viable/lovable/feasible are **SVPG's four risks** (`svpg/02` L29-33,
L97-100); "lovable" appears nowhere in Lin's sixth step. The feasibility-to-viability shift is real
and now sits in its own demand, labelled as SVPG's.

**C-4 — whether effort belongs in prioritisation. (New; was unresolvable.)** `cd/01` L79-80 excludes
effort when assessing an **opportunity**. **`D&C` L662-673 puts Ease of Implementation in the cut of
user stories.** v1 generalised the exclusion and so contradicted Lin — and could not see both were
right, because v1 had one "prioritisation" decision. **Resolved by naming the object:** a user story
is scoped work, so its effort is knowable; an opportunity is not yet scoped, so Torres excludes it.
Both stand; neither is universal.

**C-5 — what CIRCLES' Report is. (New.)** `circles/03` L17 says report the **underlying job, not the
feature want** — that wording is verbatim there, not in `cd/01`; `cd/01` L60-63 supplies the separate
**opportunity-vs-solution** test. **`D&C` L631-651 says report a user story** — "As a ⟨role⟩,
I want ⟨goal/desire⟩ so that ⟨benefit⟩" — which "does not describe how the solution works." v1 fused
these into one demand. **Different objects:** Lin's Report is a **need** in a **design interview**;
Torres's test is an **opportunity** in **continuous discovery**. Neither substitutes for the other.

**C-6 — one solution or three.** `cd/01` L85 (one in flight) vs L86 and `cd/02` L54 (test sets).
**Unchanged:** a cadence rule and a decision rule about different moments. Distinct from `D&C`'s
"at least three ideas", which is about **generating** options.

**C-7 — which method governs which risk.** `shape-up` L22: discovery is out of scope, improve it after
shipping is regained. **Unchanged; v1 was wrong to say no source arbitrates — `shape-up` L22 is the
arbitration, and it favours shipping.**

**C-8 — ProdPad's 2017 origin date.** `circles/06` L45. Not authoritative, not used.

---

## 6. Gaps

- **G-1 — CLOSED in v2.** The primary CIRCLES method was v1's largest gap. Now ingested (`circles/07`).
- **G-2 — Two books still cited, not ingested.** *Inspired* (Cagan) and *Continuous Discovery Habits*
  (Torres) remain named references only (`sources.md` L12-13). All discovery material here is
  second-hand through Torres's Product Talk article and an interview transcript, **not her book**.
- **G-3 — `cd/03` has no substance.** Podcast timestamps (`L10-25`); its own L8 says the substance is
  elsewhere. Nothing extracted.
- **G-4 — `prio/04` is abstract-level only.** L13 sets the ceiling; L37 forbids quoting technique
  names. Only counts, the output/assumption/outcome split, and the cross-functional finding.
- **G-5 — Lifecycle-aware prioritisation has no method.** `prio/03` L54 says the process guidelines
  **do not yet exist**. Carried as a gap the expert holds open.
- **G-6 — CLOSED in v3.** v2 recorded "no material on pricing, metrics, go-to-market" as an absence.
  **That was wrong.** `PMIV` Ch. 15–18 and 22, and `D&C` L3282-3297 and L3953-3993, supply metrics,
  diagnosis, launch, pricing and market entry. Extracted at **X-68**–**X-79**.
- **G-7 — CLOSED in v4.** v3 left `PMIV` Ch. 11–18 and 22 partly extracted. **Every "Common
  Mistakes" block in the in-scope chapters is now extracted** — 47 blocks, **104 individual defects**,
  at `extraction-log.md` §4d (**X-82**–**X-93**). 86 are product judgement and enter the model; 18 are
  room-ground, delivery or medium and are quarantined at **X-83**. This pass added **CS-28–CS-35**,
  **D-36–D-40**, **J30–J34** and seven demand rows. The largest clusters the earlier passes had
  entirely missed: **be specific** (X-88), **ambition and originality** (X-89), **framing before
  reasoning** (X-90), **stated constraints, safety and dependencies** (X-91), and **customer depth**
  (X-92). What remains unextracted is the worked *answers* and the per-question **"Things to Consider"**
  notes. The answers illustrate these defects and add no judgement the defect list does not already
  carry. The notes are a genuine residual — they instruct the candidate rather than state defects, and
  reading them is what found the **fifth** statement of the governing rule at `PMIV` L9536-9537 ("the
  interviewer only wants a subset of the CIRCLES Method™, articulating use cases and then
  prioritization, not the full framework"). A further pass would take them.
- **G-8 — Edition drift unknown.** `circles/02` advertises a Fifth Edition, 528 pages
  (`circles/02` L8-10); **only the Second Edition is in the corpus**. Every `D&C` claim is bounded
  by that edition.
- **G-9 — `D&C` Ch. 8 (estimation) not extracted. Owner call, not an oversight.** Business-model
  estimation — revenue, headcount, ROI — is adjacent to but outside the declared scope. Recorded so
  the omission is visible. `D&C` Ch. 6 **is** in scope and **is** extracted (Five Whys, **X-65**).
- **G-10 — X-76, X-77 and X-79 extend past scope.** New-market entry, corporate strategy and pricing
  are extracted because v2's gap note wrongly denied them, but **no demand is built from them**.
  Extracted ≠ in the model. **X-78 is not in this group** and is built into the model.

---

## 7. What the model must therefore be

Twelve load-bearing demands, each traceable to at least one KB line. These are the demands that
**structure the model**; the full demand set — **31 rows** in `mental-model.md` §Cognitive Demands,
after the v3 additions and the v4 full extraction — carries them. The cues (35) and criteria (34) are
in the two corresponding analysis models. The decisions run **D-0 – D-40 = 41 entries**, of which
**38 carry a resolution** (D-0, D-1 – D-32, D-36 – D-40) and **3 are recorded without one**
(D-33 willingness to pay, D-34 new-market entry, D-35 pro/con as a strategy instrument), listed so
that the out-of-scope boundary is visible rather than silent.

1. **Adapt the framework to the question, don't recite it** — grounded in the defect of
   over-application (`D&C` L3660-3663; `PMIV` L6875-6876), not in listener reaction.
2. **All seven steps as Lin teaches them**: four clarifying questions (`D&C` L564-568), one persona
   (`D&C` L582-586), the user-story template (`D&C` L636), the cut matrix including ease of
   implementation (`D&C` L662-673), three brainstorm techniques (`D&C` L760-826), pro/cons
   (`D&C` L879-884), three summary beats (`D&C` L902-905).
3. **The four stumbles the method answers** (`D&C` L500-510).
4. **Finding unarticulated problems — the Five Whys** (`D&C` L2029-2068). **New in v3; v1 and v2
   both lacked it.**
5. **The object split in prioritisation** — effort in the cut of a user story (`D&C` L662-673),
   effort out of opportunity assessment (`cd/01` L79-80).
6. **The framework/object split between Report and the opportunity test** (`D&C` L631-651 vs
   `cd/01` L60-63).
7. **The feasible-as-floor / viable-and-lovable shift, labelled SVPG's** (`circles/03` L23, L33, L52;
   `svpg/01` L48; `svpg/02` L29-33, L97-100).
8. **The solution-in-hand tension, carried unresolved** (`D&C` L911-920).
9. **Output-to-outcomes** as it reaches strategy, discovery and delivery.
10. **The stopping judgement**, owned by no single method.
11. **The gaps as expert knowledge** — G-2, G-3, G-4, G-5, G-8, G-9 and G-10.
12. **Specification, ambition, frame, constraints, customer depth, and self-explaining design** — the
    six clusters the full defect inventory surfaced (X-88 – X-93). Each is a product judgement the
    earlier passes did not know existed.