# Judgment Criteria Model — product manager

**Phase:** P3 Analyze (c)
**Input:** `extraction-log.md`
**Citations resolve through `extraction-log.md` §0.**

The tests the expert applies to their own answer, ordered by how much they cost when missed.

---

## J1 · Did I cover what this question needed, and no more than it needed?

**The top criterion, and it outranks everything below it.**

**Fails when** steps are applied that the question did not call for. The named defect: "**Using all
seven steps of the CIRCLES Method™ especially when it is clear that this is strictly about
implementation.**" Alongside it: "**Not adapting frameworks to a specific situation**", and "**Using
a framework in a way that feels generic and forced.**" — **X-64** (`PMIV` L6875-6876, L5808-5813)

**The positive form, stated as a standard.** "The goal of frameworks is to serve as a mental
checklist for a complete response, **not to recite it verbatim at the interview. Adapt the framework
as you see fit.**" — **X-63** (`D&C` L3660-3663). Marked satisfied on a worked design answer: a
candidate using CIRCLES and AARM "**without sounding mechanical**" (`D&C` L3845-3850).

**The discriminator.** Fit, not completeness in the abstract. "Interviewers can tell when you used a
hammer when a scalpel would have sufficed" (`D&C` L1956-1957); the framework is "a checklist, not a
recipe" and exists "**to prevent errors of omission**" — so coverage stays, and quantity does not.
— **X-3, X-4** (`D&C` L1953-1957; `PMIV` L1808-1812)

**What this criterion is not.** It is not a test of how the answer sounded, and it does not ask
whether the answer reads as a conversation between peers. v2 made those the top criterion, citing
"Some will label the person as over prepared. Others, like me, would fear that the candidate is
inexperienced" (`D&C` L1940-1943) and "the interview is about establishing credibility and
likability" (`D&C` L1949-1952). **Those are judgments about how a listener reads a person.** The
gate's relevance judge failed the build on exactly this. The rule survives on the work-side defect;
the ground does not. `extraction-log.md` §8, Finding 1.

---

## Design-interview criteria

### J2 · Did I establish what it is, for whom, why, and how?

**Passes when** the four are answered — what is it, who is it for, why do they need it, how does it
work. — **X-11** (`D&C` L566-568)

**Fails when** you guessed at a product you said you know, or asked 101 questions. "If you don't know
the product, speak up." — **X-8** (`D&C` L550-551) "The interviewer may not have patience for you to
ask 101 questions about the product." — **X-11** (`D&C` L564-565)

**Also passes when** an assumption was made *and offered for correction* — that is legitimate, an
unstated one is not. — **X-12** (`D&C` L569-572)

### J3 · Is this one persona, and does the interviewer comprehend it?

**Passes when** a single segment is chosen and made legible. — **X-14, X-15** (`D&C` L582-598)

**Basis.** "You want to propose an amazing product, not a mediocre one." — **X-14** (`D&C` L585-586)

**Fails when** the answer is for everyone, or when the persona is named but not explained — "The
interviewer may not be familiar with your chosen persona." — **X-15** (`D&C` L596-598)

**Note on demographics.** Lin uses them: behavior *and* demographics go on the 2x2. — **X-16**
(`D&C` L598-628) The first pass's "a cohort defined only demographically is unfalsifiable" is
`circles/03` L15, a third-party claim, not Lin's. §6 row 2.

### J4 · Is the need stated without smuggling in a solution?

**Passes when** the user story is in the form "As a ⟨role⟩, I want ⟨goal/desire⟩ so that
⟨benefit⟩", and does not describe how the solution works. — **X-17, X-18** (`D&C` L634-636)

**Why the form earns its keep.** "In a single sentence, we know the user, the user's needs and
user's justification." — **X-18** (`D&C` L649-651)

**Fails when** a solution arrives with no context — which is precisely the fourth stumble: "Giving a
solution without the appropriate context begs the question, 'Why?'. The listener doesn't know who the
intended customer is or what problem the product solves." — **X-5** (`D&C` L507-510)

### J5 · Did I cut on a stated basis, with effort visible?

**Passes when** the choice is scored on the matrix — User Story | Revenue | Customer Satisfaction |
Ease of Implementation | Overall — and said out loud. — **X-21** (`D&C` L662-673)

**Basis.** "The matrix method forces the decision maker to think and articulate what's important.
Is revenue more important? Or is customer satisfaction?" — **X-22** (`D&C` L704-706)

**Fails when** effort was omitted from a cut of user stories. The story is already scoped; its effort
is knowable. This criterion is about **user stories**, and does not govern opportunity assessment.
— **X-45** (`cd/01` L79-80) §6 row 4.

**Acknowledged imperfection.** The matrix is "based on subjective criteria, weights and grades" and
has "some flaws" — Lin says so, and says "I'd rather have an imperfect process than no process at
all." The true arbiter is **A/B testing**. — **X-22** (`D&C` L702-707)

### J6 · Are these ideas actually different, and are there at least three?

**Count.** "At least three." — **X-29** (`D&C` L871-872)

**One pass condition, on quality.** "**Great innovators know that your first idea is rarely the
best.** Why? **Innovation is an iterative process.** As you learn more about customer needs and
competitive products, your proposed solutions will be more precise and focused… You'll find that idea
number 2 or 3 will usually be the best of the bunch." — **X-29** (`D&C` L866-872)

**Named dullness.** "Me too ideas" and "integration ideas" both get "Yawn." — **X-28**
(`D&C` L831-835)

**The bar.** Novelty — "**An expert suggests novel and memorable ideas.**" `PMIV` L1796 — aimed at
the corpus's stated purpose: "most employers are evaluating your creativity or product vision…
looking for product managers that can see future trends, both in technology and customer behavior"
(`D&C` L834-838). — **X-37, X-28**

> **Held out of this criterion.** Two clauses in the source are about the speaker, not the ideas: the
> interpersonal argument for having several ("you'll be more comfortable… to prove your
> self-worth", `D&C` L873-876, **X-29b**) and the bar phrased as making "the interviewer go, 'Hmm, I
> wish I thought of that…'" (`PMIV` L1797, **X-37**). Both are recorded; neither is a pass
> condition. v2 carried both.

**Was the freeze beaten deliberately?** Reversal, Attribute, or Why? — **X-25, X-26, X-27**
(`D&C` L760-826)

> The first pass reduced this to "two or three, not ten-plus" and made the count a device for
> differentness. Lin states three and gives reasons the first pass had none of. §6 row 5.

### J7 · Did I evaluate trade-offs, and did I critique my own work first?

**Passes when** the comparison was made — pro/cons against whatever criteria were declared, or
against customer satisfaction, implementation difficulty and revenue potential. — **X-30, X-31**
(`D&C` L879-884)

**The criterion that does the work.** "If you've taken the initiative to critique your own solutions,
the interviewer has fewer things to criticize. You'll also mentally prepare yourself for criticism by
critiquing yourself." — **X-32** (`D&C` L890-893)

**What this is not.** Viable / lovable / feasible is **not** Lin's Evaluate step — those are SVPG's
four risks and they belong to J13. §6 rows 6 and 9.

### J8 · Did I land it — one recommendation, and why it beat the others?

**Passes when** all three beats are present: which feature you recommend; what it is and why it
benefits the user and/or company; why you preferred it over the others. — **X-34** (`D&C` L902-905)

**The hard part.** "Can you make the hard decision to suggest just one solution?" — **X-33**
(`D&C` L901)

**Held out.** "a short 20 to 30 second summary" (`D&C` L900) is a spoken-pacing target for an
interview answer. Retained in **X-33** as extraction; **not a pass condition here.** v2 required it.

**Legitimately skippable.** "Sometimes the interviewer is satisfied with a brainstorm and the pro
and con analysis." — **X-33** (`D&C` L896-898)

> The first pass required a metric separating "it worked" from "people tried it once", sourced to
> `circles/03` L25. No metric appears in Lin's step. §6 row 7.

### J9 · Am I standing in the unknown, or steering to an answer I already have?

**No settled answer, and the corpus does not supply one.** Both ends are defensible and stated.

Solution-in-hand is legitimate and can improve quality by constraining the search space — **X-35**
(`D&C` L912-918). Embracing the unknown is the stated ideal — **X-36** (`D&C` L919-920).

**Test on the reason, not the fact.** The stated driver for solution-in-hand is discomfort — "My
clients often struggle with design questions because they're uncomfortable exploring customers and
needs without a solution" (`D&C` L911-912). Lin's justification for it is the constraining effect,
which is separable from the discomfort.

---

## Discovery and delivery criteria

### J10 · Is this evidence, or prior belief?

Only **story-derived evidence**. Sales calls, support tickets, feature requests and analytics are
inspiration for the next interview, not tree input. Priors are excluded outright. — **X-40**
(`cd/01` L64-66)

### J11 · Three to four stories?

Under it you overreact to one. Over it you cause analysis paralysis. — **X-41** (`cd/01` L70, L94)

### J12 · Is there more than one way to address this?

If not, it is a solution in disguise — reframe with "Why?" until there is. Opportunities include
desires, not only pain points. — **X-44** (`cd/01` L60-63)

**Object discipline.** This runs on an **opportunity** in continuous discovery. J4 runs on a
**need** in a design interview. Neither substitutes for the other. §6 row 10.

### J13 · Feasibility a checkbox, viability and lovability carrying the weight?

**Feasibility** — minimal time, a brief checkbox. A trade-off argued purely on engineering
complexity is the tell of a weak answer. — **X-50** (`circles/03` L33, L52)

**Viable** — will this be a problem people or companies will pay to have solved at scale, reaching
past marketing into sales, finance, service, legal and compliance. — **X-48** (`svpg/01` L48;
`svpg/02` L33)

**Lovable** — fits where users already work, without asking them to form a new habit. — **X-49**
(`circles/03` L23)

**All four risks are assessed, not two** — valuable, usable, feasible, viable — owned: viability the
PM's, usability the designer's, feasibility the tech lead's. — **X-47** (`svpg/02` L81, L97-100)

**AI work asks something else** — does it reduce decisions or add them. — **X-51** (`circles/03` L44)

### J14 · Stack order, or a list?

No ties. Two "first priorities" means nothing is important. — **X-53** (`rice/02` L10)

**Checklists fail as prioritisation tools** because they produce good/bad rather than sequence —
SWOT, 4 Ps, PEST, growth/share matrix, Ansoff, GE/McKinsey and 3 Cs. — **X-53** (`rice/02` L13)

### J15 · Do I know which lens is quietly running the decision?

- **"Ship the smallest wins"** never ships high-value sustained-effort initiatives.
- **"Ship the most immediate revenue"** chases monetisation over strategic bets.
- **"Most advanced technology"** confuses the technology with the value driver.

— **X-54** (`rice/02` L14)

### J16 · Is the score a hypothesis or a mandate?

Sort, then re-evaluate. Be willing to conclude the gut is wrong. — **X-52** (`rice/01` L41)

### J17 · Is this outcome one a team can move?

Product outcome — customer behaviour or sentiment. Business outcomes too hard to influence; traction
on one feature too narrow. One per team. — **X-43** (`cd/01` L52-56, L95)

**Rebuild trigger.** A new tree when the direction changes, not when the number does. — **X-42**
(`cd/01` L93)

### J18 · Fixed time and variable scope, or an estimate?

Appetites start with a number and end with a design; estimates start with a design and end with a
number. "Good" is relative to the constraints. A real deadline forces the trade-offs. — **X-57**
(`shape-up` L40-44, L71)

### J19 · Is this rough, solved and bounded?

Neither a wireframe (over-specifies, hides difficulty behind a "just so" interface) nor bare words
(under-specifies, marks nothing out of scope). Rabbit holes found before commitment — "you do not hand
a team a project with holes." No Gos written down. — **X-58** (`shape-up` L30-37, L48-53, L56-61)

### J20 · Baseline or ideal?

Compare against **the baseline customers have today, not against the ideal**. — **X-59**
(`shape-up` L101)

**Cutting scope is not lowering quality.** Being picky differentiates the product. — **X-59**
(`shape-up` L112)

**Extension is diagnostic.** Running into a cool-down means the shaping was wrong, not that the
schedule slipped. — **X-59** (`shape-up` L110-115)

### J21 · Can this team decide, or is it being told?

The test: can the team decide the best way to solve the problems it was assigned? — **X-60**
(`svpg/05` L44)

**The counter-pattern.** Handing learnings from one group to another produces missionaries, not
mercenaries; the receiving end stops proposing better solutions, self-selects over time, and is then
complained about for lacking initiative. — **X-61** (`svpg/05` L36; `svpg/06` L19-21)

### J22 · Is the team staffed with competence and character?

The standing check: competent people with character, skilled across product, design and engineering.
Character replaces "cultural fit", because "cultural fit" means hiring people who look and think like
we do — and the consequence is that they think like us, when what is needed is people who think
differently. — **X-62** (`svpg/05` L50-51, L58)

**Boundary.** Hiring is the staffing manager's job — *this model's inference, not a sentence in the
source* (`svpg/05` L40, L42-43). This is a question about the team in front of you.
— **X-62** (`svpg/05` L40, L42-43)

---

## Measurement, diagnosis and commitment criteria (new in v3)

### J23 · Did I give a metric set, and did I say which one leads and why?

**Passes when** AARM is walked — Acquisition, Activation, Retention, Monetization — **and** a top
metric is named with the business-model reasoning attached. — **X-68, X-71** (`D&C` L3462-3487;
`PMIV` L10677-10707, L10774-10792)

**Fails when** the answer is "I'd go with profits" — the named defect, "**Giving a short, uninspiring
response**", against a candidate who enumerates the metric set and then **defends a choice**.
— **X-73** (`PMIV` L10710-10735)

**Retention is a loop, not a number.** Data loop, compulsion loop, viral loop — and the criterion is
that they **reinforce each other**, which is the point of showing them together. — **X-69**
(`D&C` L3489-3513)

**The chosen top metric still gets its drawbacks listed.** For GMV: does not factor in customer
acquisition cost, does not consider cost of sales or margin, may not correlate with cash flow —
tracked separately as the mitigation. — **X-72** (`PMIV` L10758-10772)

### J24 · When a metric moved, did I decompose it or guess at it?

**Passes when** the metric is broken into a structured tree and every branch is walked — geography,
device, browser, traffic source, then down the funnel to "add to cart" and "unsupported payment
type". — **X-74** (`PMIV` L10901-10939)

### J25 · Did I commit to a scoped goal?

**Passes when** the answer narrows deliberately. The named defect is "**Not committing to a particular
goal**", and the worked answer picks: "Which feature do you want me to focus on? I would pick text
messaging." — **X-70** (`PMIV` L11113 (the defect), L11131 (the worked narrowing))

**Fails when** breadth is used as a substitute for choosing — enumerating every metric and committing
to none. — **X-73** (`PMIV` L10710-10735)

### J26 · Did I find the root cause, or treat the symptom?

**Passes when** the why-chain has been walked past the surface cause to the constraint — this is
**this model's reading of the worked case**; the source states no stopping rule. The worked chain
stops at a constraint — "We can't get the procurement department to approve the purchase" — not at a
cause. — **X-65, X-66** (`D&C` L2029-2037, L2047-2064)

**Distinct from J12.** J12 is a framing test on an opportunity ("is there more than one way to address
it?"). This is a root-cause instrument for a reported problem, and it applies to **three objects** —
"processes, proposed innovations and existing customer solutions" (`D&C` L2036-2038). v1 and v2 had
only J12, because `D&C` chapter 6 was logged as unextracted. **X-67**

### J27 · Can I hold a position and abandon it?

**Both, in order, and the second is not a failure of the first.** Commit "decisive… with hard
conviction behind a single position", factually, "because subjective statements invite skepticism
particularly if they're not backed with evidence" (`D&C` L3912-3920). Then, when pressed the other
way, move — the mark is that you "can see both sides of the issue, adapt to change and leave behind a
preconceived notion of what should have been done" (`D&C` L3942-3947). — **X-78**

> **Room-ground held out.** "The interviewer will note candidates who refuse to commit one way or the
> other" (`D&C` L3919-3920) and "The interviewer is seeing how quickly a candidate can abandon…"
> (`D&C` L3943-3944) are not pass conditions. **Fails when** the answer cannot move off a position
> the facts no longer support.

### J28 · Did I price the data difficulty of the launch?

**Passes when** the plan assumes the data is hard, fresh and complex to compute. All three named
mistakes are data mistakes: "Not appreciating how hard it is to get train data", "Not appreciating
how hard it is to get fresh and accurate data", "Not appreciating how complicated is to calculate
possible trip permutations." — **X-75** (`PMIV` L14312-14320)

**And the pilot market is chosen by existing presence plus category usage, not by default.**
"**The US is not one of them**." — **X-75** (`PMIV` L14323-14328)

### J29 · Did I decompose the pain point before selecting on it?

**Passes when** raw rants are grouped and then decomposed into sub-concerns that name their own
consequences, two levels deep. "Putting together the invite list is a hassle" → must invite both
parents and kids; don't know how many, where too few "gives others the impression that we don't have
friends" and too many "will make the party complicated"; people who don't get invited will feel
offended. — **X-80** (`PMIV` L6392-6398)

**Same shape in the other worked case** — the signals are enumerated before any decision: mutual
friend; same interests, prioritized by how well liked they are by **both**, ranked by related pages or
posts; same events, pages, school, workplace; known via email; same major; lives close; has lived
where A has. — **X-81** (`PMIV` L6894-6904)

---

## What changed in this criterion set

| | First pass | v2 | **Now (v3)** |
|---|---|---|---|
| Top criterion | step coverage | sounds scripted = failed | **coverage judged against the question (J1)** |
| Clarifying questions | one | four, named | four, named (J2) |
| Persona | context/friction, no demographics | one persona; demographics in the 2x2 | same (J3) |
| Need | job, not want | user story; job/want to opportunity | same (J4, J12) |
| Cut | effort excluded | effort in for stories, out for opportunities | same (J5) |
| Ideas | two or three | at least three, quality + exposure | **at least three, quality only (J6)** |
| Evaluate | viable/lovable/feasible | pro/cons, self-critique | same (J7) |
| Summarize | trade-off + metric | three beats, comparative reason, **20–30 sec** | **three beats; duration held out (J8)** |
| Problem root cause | — | — | **Five Whys (J26)** |
| Metrics | — | — | **AARM + top metric + drawbacks (J23)** |
| Diagnosis | — | — | **decompose, don't guess (J24)** |
| Commitment | — | — | **commit, then be able to abandon (J25, J27)** |
| Launch | — | — | **data difficulty priced (J28)** |
| Pain decomposition | — | — | **group and decompose before selecting (J29)** |

**Count: 29 at this point.** v2 had 22, and its top criterion, one ground of J6, and J8's length test were
all withdrawn by the relevance gate. The seven criteria here (J23–J29) exist because v2 recorded the
material behind them as absent when it was present in the ingested corpus. Five more (J30–J34) are
added below from the full extraction of Ch. 11–18 and 22.

## §4b The criteria the full extraction adds (J30 – J34)

### J30 · Is this an answer, or a description of how one would be produced?

**Passes when** the response names a specific scenario, a specific customer problem, and the mechanism
that would do the work. **Fails when** it names a solution and stops. **X-88** (`PMIV` L9021,
L9015-9017, L8877-8878, L8537-8538, L8300, L11912)

**Distinct from J1.** J1 asks whether the right steps were covered. J30 asks whether what was covered
is an answer. A response can cover every step of CIRCLES and still fail J30 outright.

### J31 · Would this idea survive the question "why that one?"

**Passes when** the answer reaches past the obvious fix and carries one option that is genuinely
ambitious, with the existing space actually surveyed. **Fails when** the improvement is the first one
that came to mind. **X-89** (`PMIV` L7056, L9778, L8722-8723, L7897, L7901, L7608, L7525-7526, L8304,
L8164, L5883, L9246-9247, L9374)

**Distinct from J2.** J2 asks whether the cut was justified and the goal named. J31 asks whether
anything worth cutting was on the table at all.

### J32 · Is this the object the question asked about?

**Passes when** the work is on the named object, at the right layer, with the analysis bounded on both
sides. **Fails when** the answer has silently narrowed or widened its target. **X-89, X-90** (`PMIV`
L6016-6017, L7428, L7801-7802, L11814-11815, L11881, L12025)

**Distinct from J1.** J1 catches running the whole framework. J32 catches running the right framework
about the wrong thing. The corpus names the two separately — `PMIV` L6875-6876 for the first, and
L6016-6017, L7428, L7801-7802 for this one — which is why they are two rows and not one.

### J33 · Were the terms agreed before anything was scored against them?

**Passes when** any term carrying more than one reading is fixed first, and every part of the question
is answered. **Fails when** an assumption about shared meaning carries the reasoning. **X-90** (`PMIV`
L12020-12021, L9495, L9366, L9774)

### J34 · Does the answer respect every constraint the prompt stated?

**Passes when** stated limits, objectives, safety and dependencies are visibly applied. **Fails when** a
stated constraint is absent from the answer. **X-91** (`PMIV` L7797, L9770, L9539, L14471)

**Distinct from J5.** J5 is the feasibility judgment about what can be built. J34 is the discipline of
applying constraints the question already handed you — including safety, which the corpus names
separately and which no earlier pass carried.

### Coverage table — rows added by the full extraction

The first five rows are one-to-one: each cue has its own decision and its own criterion. The last
three are **secondary coverage**, not one-to-one — each of those cues reinforces criteria that were
already established, and no new criterion exists for it.

| Question type | Cue | Decision | Criterion | Relationship |
|---|---|---|---|---|
| Idea stated in general terms | CS-28 | D-36 | **J30** | one-to-one |
| Idea safe and small | CS-29 | D-37 | **J31** | one-to-one |
| Wrong object answered | CS-30 | D-38 | **J32** | one-to-one |
| Frame not agreed | CS-31 | D-39 | **J33** | one-to-one |
| Stated constraint ignored | CS-32 | D-40 | **J34** | one-to-one |
| Design answer unexplained | CS-34 | — | J30 | secondary — reinforces J30 (be specific, show how) |
| Customer read too shallow | CS-33 | — | J31 | secondary — reinforces J31 (a first-idea answer usually comes from a shallow customer read) |
| Data assumption unpriced | CS-35 | — | — | secondary — reinforces the launch demand's own criterion (J28), not J34 |

**Count: 34 criteria.** Five added by this pass, from X-88 – X-93. The eight rows above map to five
of them; CS-33, CS-34 and CS-35 add no new criterion.
