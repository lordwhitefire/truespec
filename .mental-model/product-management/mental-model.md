# Mental Model — product manager

**Phase:** P4 Represent
**Inputs:** `source-map.md`, `extraction-log.md`, `cue-strategy-model.md`, `decision-model.md`, `judgment-criteria-model.md`
**Corpus:** the product-management knowledge base — **24 knowledge files** under `intent/knowledge-base/` (25 including the `sources.md` provenance index). Twenty-two fetched 2026-09-30; two Lewis C. Lin books ingested 2026-10-01. Short source forms resolve through `extraction-log.md` §0.
**Rebuild:** third pass. The first rested on third-party CIRCLES guides because the books were absent; the books are now in and contradict it. The second passed traceability and cognitive content but **failed relevance** — it had made "how the answer sounds to an interviewer" its top criterion, and had recorded material that was present as absent. Owner ruled: **product-judgement model, and extract the in-scope material.** `build-report.md` records what changed and why.

**Scope:** how a product manager answers a product-design question without reciting a framework, finds the problem behind it, measures it, and how the same person governs discovery, prioritisation and shipping under a team that has to be able to act on the result.

---

## The expert's task

A product manager who answers product-design questions with CIRCLES and who governs product work
under SVPG's product operating model, continuous discovery, prioritisation, and Shape Up for
shipping. Three altitudes, and the judgement that matters most is knowing which one the question in
front of you needs.

**The altitude follows the risk you are trying to reduce, not the topic.**

- **"Am I solving the right problem?"** — a bounded product-design or interview question. CIRCLES'
  home ground. Seven steps, one recommendation.
- **"Are we working on the right thing over time?"** — a live product, where the question is not
  whether this bet is right but whether the next one will be. Continuous discovery against a chosen
  outcome, with the opportunity space revisited every three to four interviews (`cd/01` L70, L94).
  **A new tree when the direction of the outcome changes — switching to acquisition, changing the
  aha moment — and not when the target number changes** (`cd/01` L93).
- **"Can we finish what we have already chosen?"** — shipping. Shape Up targets the risk of *not
  shipping on time* and explicitly **not** the risk of building the wrong thing; discovery is
  deliberately out of its scope (`shape-up` L22).

**The order between them is not a preference, and the corpus settles it.** When the ability to ship
has been lost, improving discovery is not the next move — improvement of discovery should come
**after** regaining the ability to ship (`shape-up` L22). A team that cannot finish what it starts
does not solve that by doing more interviews. It fixes the appetite, the bet and the cycle.

**What the PM is accountable for does not change with the altitude.** Value and viability of what the
team builds, and the outcomes (`svpg/02` L98); usability belongs to the designer, feasibility to the
tech lead (`svpg/02` L99-100).

The decisions this person repeatedly makes: which steps does this question need; what problem am I
actually being asked about, and what is behind it; which customer, and why that one; what does this
person actually need; what cuts, and on what basis; are these ideas genuinely different; how do I
land this; is this an opportunity or a feature want; is this evidence or prior belief; which outcome
am I driving; what metrics, and which one leads; this metric dropped — why; did I commit; can this
be shipped, and in what shape; when is it good enough; is this team able to act.

---

## The finding the primary source forces, restated

**Apply the framework to the question; do not recite it.** This is not an inference from the corpus
or a technique this model has added. The primary source states it as a standard, and names the
defect it prevents — on the side of the work, not the side of the delivery.

> "The goal of frameworks is to serve as a mental checklist for a complete response, **not to recite
> it verbatim at the interview. Adapt the framework as you see fit.**" — `D&C` L3660-3663

> "**Using all seven steps of the CIRCLES Method™ especially when it is clear that this is strictly
> about implementation.**" — `PMIV` L6875-6876; with "Not adapting frameworks to a specific
> situation", and "Using a framework in a way that feels generic and forced" (`PMIV` L5808-5813)

> "**The expert understands that a framework is a checklist, not a recipe.** The expert understands
> that CIRCLES is there to **prevent errors of omission**." — `PMIV` L1808-1812

So the governing criterion is **coverage judged against the question**: a framework is a checklist
whose purpose is preventing omissions, so coverage is non-negotiable — but which items the checklist
contains is negotiable, and running an item the question did not call for is a defect in the
analysis.

> **What the second pass had here, and why it is gone.** It made "sounding scripted = failed" the
> top criterion above every product judgement, on evidence that was entirely about a candidate's
> impression on an interviewer: "Some will label the person as over prepared. Others, like me, would
> fear that the candidate is inexperienced" (`D&C` L1937-1943), "the interview is about establishing
> credibility and likability… Interviewers don't like robots" (`D&C` L1949-1952). **No product
> decision turns on any of it.** The relevance gate failed the build on exactly this. The rule
> survives on the citations above; the ground is withdrawn. `extraction-log.md` §8, Finding 1.

**Three further items in the same position**, all recorded and labelled rather than deleted:
the interpersonal argument for having several ideas (`D&C` L873-876, **X-29b**), the bar phrased as
making "the interviewer go, 'Hmm, I wish I thought of that'" (`PMIV` L1797, **X-37**), and the
20-to-30-second pacing target for the summary (`D&C` L900-901, **X-33**). Their content is real
advice; their ground is a listener.

---

## Cognitive Demands

| Cognitive demand | Cues and strategies | Decisions | Judgment criteria |
|---|---|---|---|
| **Which steps does this question need?** This outranks everything below it. The method is a checklist, and its purpose is preventing omissions — so cover what the question needs, and no more. | The cue fires on a **mismatch between method and question** — a prompt that is plainly about implementation while you are about to run Identify on a persona it already gave you. Ask what the question is actually asking, then answer that. Keep the coverage, drop the announcement: the rule is against *blind* following, and "CIRCLES is a guideline on what makes a complete, thoughtful response… a memory aid that prevents us from forgetting a step". "Interviewers can tell when you used a hammer when a scalpel would have sufficed." — `D&C` L3660-3663, L515-517, L1956-1957; `PMIV` L6875-6876, L5808-5813, L1808-1812 | Which steps does this question need? Judge coverage against the question, not in the abstract. | **Fails when** steps are applied the question did not call for — "using all seven steps… when it is clear that this is strictly about implementation". **Not a test of how the answer sounded.** v2's top criterion was, and was withdrawn. |
| **What problem am I actually being asked to solve?** The first move is not designing, it is finding out what you have been handed. Lin's warning is blunt: do not perform open-heart surgery if you don't know what the heart looks like. | If you don't know the product, say so — "It's not fair for you to discuss a product you don't know." You are entitled to ask. Establish four things — **what is it, who is it for, why do they need it, how does it work** — Lin's **3W's and H**, deliberately cut down from the full 5W's and H because the interviewer will not sit through 101 questions. Ask to see the artefact; a visual improves communication and "it would be lethal if you and the interviewer were thinking of different things." If the interviewer refuses to answer, make an assumption and explicitly give them the chance to correct you. — `D&C` L543-579 | Take the prompt at face value, or establish what it actually is? Four questions, not one and not six. If refused, stall or assume-and-offer-correction? Assume-and-offer. | The four are answered, or an assumption was stated **and** offered for correction. An unstated assumption fails. Bluffing about a product you said you know fails worse — the corpus treats it as unfair. |
| **And what is behind the problem I was handed?** A complaint is not a cause. Lin's section heading is "Understand Unarticulated Problems", and his instrument is a why-chain. | "As part of understanding customer needs, you may have to delve into a customer's work flow with their existing solutions. To find areas of improvement, you'll have to understand obstacles they are facing and **gaps that existing solutions have left open**." Ask the **Five Whys** — "it involves iterative inquiry to identify a problem's root cause" — and walk past the surface cause. In the worked case the chain ends at a constraint, not a cause: "We could [reduce cleaning time] if we simply put inexpensive aluminum foil on the parts that get dirty often" → "**We can't get the procurement department to approve the purchase.**" It applies to **three objects**: processes, proposed innovations, existing customer solutions. — `D&C` L2029-2068 | Symptom or root cause? Root cause, walked to the constraint. | **Passes when** the chain runs past the surface cause. Distinct from the opportunity test below — this is a **root-cause instrument**, not a framing test. **Both previous passes were missing this**, because `D&C` ch. 6 was logged as unextracted. |
| **Which customer, and why that one?** The reason is product quality, not segmentation theory: a focused answer beats an ambitious one, because "you want to propose an amazing product, not a mediocre one." | Choose **one** segment or persona. The failure you are avoiding is the all-in-one — "there's no magical device that does everything for everyone… more often than not, all-in-ones usually aren't very good." Then make it legible: the interviewer may not know your persona, so show it on a **2x2 — Behaviors × Demographics / Needs & Goals**, as Lin does for "Kat, the traveling reader." — `D&C` L582-628 | One persona or several? One, with the reason stated and made comprehensible to the interviewer. | One segment, **and** the interviewer can picture it. Note the corpus position on demographics: Lin uses them, on the matrix, alongside behavior — the claim that a demographically-defined cohort is unfalsifiable is `circles/03` L15, a third-party reading, not Lin's. |
| **What does this person actually need?** The need is stated in a form that cannot smuggle in a solution — and the reason it cannot is the fourth way candidates stumble. | Write the **user story**: "As a ⟨role⟩, I want ⟨goal/desire⟩ so that ⟨benefit⟩." It is "concise, complete and casual" — one sentence gives the user, the need and the justification. It "does not describe how the solution works." Two stories written this way "each one screams for completely different solutions," which is what forces the next step. — `D&C` L630-654 | Report the need as a job, or as a user story? A user story — this is Lin's step, on a need, in an interview. | The story is in the form and carries no solution mechanics. **Fails when a solution arrives with no context**, because that "begs the question, 'Why?'" — the listener does not know the customer or the problem. |
| **What cuts, and on what basis?** More than one candidate survives and something has to go. The step mimics the real development process: a big backlog, limited by time, money and labour, and one slot in the interview. | Pick one and **say why out loud**, scored on a matrix — **User Story | Revenue | Customer Satisfaction | Ease of Implementation | Overall**. Lin's justification for using an imperfect instrument: "I'd rather have an imperfect process than no process at all. The matrix method forces the decision maker to think and articulate what's important. Is revenue more important? Or is customer satisfaction?" For more rigour, revenue per point of effort = revenue impact ÷ engineering effort. — `D&C` L653-673, L699-750 | Which use case, and on which axes? And am I cutting a **user story** or assessing an **opportunity**? The difference decides whether effort is in. | **Effort belongs in the cut of a user story** — the story is already scoped, so its effort is knowable. It is **excluded from opportunity assessment** (`cd/01` L79-80), because an opportunity assumed too hard may have a dead-simple solution. The corpus's two rules are not in conflict once the object is named. Lin names the matrix's own flaws and the real arbiter: **A/B testing**. |
| **Are these ideas actually different — and did I beat the freeze?** Most candidates freeze on a design problem without a solution in hand, so the step is built around not freezing. | Reach for a **named** technique rather than free-associating. **Reversal** — reverse the situation: buyers won't travel to the dealership, so the dealership delivers test drives. **Attribute** — list the attributes and mix: Material × Shape × Finish × Position for a laundry hamper. **Why?** — challenge the status quo: why do cups have handles? Because they're too hot to hold, so make an insulated mug. Then reach past the dull answers — "me too ideas" and "integration ideas" both get a "Yawn" from Lin — because employers are evaluating **creativity or product vision**. And generate **at least three**. — `D&C` L753-840, L866-872 | Which technique, when stuck? How many, and how strange? At least three, on the quality ground. | **At least three**, on one ground: "your first idea is rarely the best… Innovation is an iterative process." The bar is novelty against "me too" and "integration" ideas. The second ground in the source — that several ideas stop critique landing personally — is **held out as X-29b**. |
| **How do I land this?** The recommendation exists and now needs saying — and the step is genuinely optional, because some interviewers are already satisfied. | **Three beats, in order:** which product or feature you recommend; what it is and why it is beneficial to the user and/or company; why you preferred this solution versus the others. Then make the hard cut to **one**. — `D&C` L895-905 | Land it or not? When required, three beats and one recommendation. | All three beats present, comparative reason given, one solution. **No metric is required** — that came from a third-party guide. **No duration required either** — "20 to 30 seconds" is a spoken-pacing target and was withdrawn as a criterion in this pass. |
| **Do I arrive with a solution, or stay open?** A real tension with two defensible ends, and the corpus does not settle it. | Both are permitted and both are stated with reasons. Solution-in-hand is "okay" and may even help — it "can help constrain the realm of potential personas, needs, and solutions, which can improve the quality of your responses." Lin's own ideal is the opposite: "embrace the great unknown." — `D&C` L909-920 | Lean solution-in-hand, or embrace the unknown? Judgement, and the reason for it matters. | Test the **reason**, not the fact. The stated driver for solution-in-hand is discomfort — "my clients often struggle… because they're uncomfortable exploring customers and needs without a solution" — which is separable from Lin's actual justification, the constraining effect. |
| **Is this an opportunity, or a feature want?** In continuous discovery, a want is a request for a feature; the job is what the person is trying to accomplish, and only the second is something a team can design against. | Name the **underlying job, not the feature want**: "users want better recommendations" is a want; "users need continuity across contexts" is a job. Then run the opportunity test — is there more than one way to address it? If not, it is a solution in disguise, so reframe with **"Why?"** until there is. Opportunities include desires, not only pain points, which is why the corpus says "opportunity", not "problem". — `cd/01` L60-63 | Is the customer describing a need I can work on, or a want for a particular feature? If only one thing answers it, is it an opportunity at all? | **More than one way to address it, or it is a solution in disguise.** This runs on an **opportunity**; the user story above runs on a **need**; the Five Whys runs on a **reported problem**. Three different objects, three different instruments. |
| **Is this evidence, or what we already believed?** Before the opportunity space can be populated, its inputs have to be earned — and most of what is to hand is not evidence. | Generate opportunities **only from stories**, prompted with "Tell me about a time when…". Everything else — sales calls, support tickets, feature requests, analytics — usually lacks context, so it is **inspiration for the next interview, not tree input**. Priors are excluded outright, because generating from what the team already knows brings biases and half-truths. Wait for **three to four stories**: enough to stop overreacting to one, not so many as to paralyse. Revise the opportunity space every three to four interviews. — `cd/01` L36, L64-66, L70, L94 | Which of these inputs carry the context that makes them usable, and which are prior belief in a customer's clothes? Enough yet? | Only **story-derived evidence** enters the tree. Priors bring biases and half-truths. Three to four is the window — under it you overreact, over it you paralyse. |
| **Are my solutions actually different?** A separate act from generating them, and the first pass merged the two. | Keep **one solution in flight** so the loop moves, and test **sets of solutions against the same opportunity** to find a clear frontrunner — working one idea at a time sets you up for confirmation bias. Brainstorm for the **target opportunity only**, not across the whole tree. — `cd/01` L44, L85-86; `cd/02` L54 | Once generated, do I test one solution against the opportunity, or a set? | **One at a time confirms your own bias** — compare sets and let a frontrunner emerge. Distinct from "at least three ideas", which is about generating in an interview. |
| **Have I decomposed the pain points before selecting on them?** Raw rants are not insights, and the structure is the method. | Group, then decompose, two levels deep, with each level naming its own consequence. In the worked case three groups — planning, the day itself, other rants — and "Putting together the invite list is a hassle" splits into inviting both parents and kids; not knowing how many, where too few "gives others the impression that we don't have friends" and too many "will make the party complicated"; people who don't get invited will feel offended. The same shape in the other case: enumerate the signals before deciding — mutual friend, same interests prioritized by how well liked they are by **both**, same events, pages, school, workplace, email, major, distance, prior residence. — `PMIV` L6392-6398, L6894-6904 | Symptom list, or decomposed causes? Decomposed, and grouped before selection. | **Passes when** every item is broken into sub-concerns that name their own consequences, and the grouping precedes the choosing. |
| **Is this worth doing at all?** The evaluative centre of gravity. Feasibility was a genuine gate when the method was written; it is now a checkbox, and a trade-off argued purely on engineering complexity is the tell of a weak answer. | Spend **minimal time on feasibility**. Hold all four risks early — valuable, usable, feasible, viable — with **viability the PM's accountability**, usability the designer's, feasibility the tech lead's. **Viable**: will this be a problem people or companies will **pay to have solved at scale**, reaching past marketing into sales, finance, service, legal and compliance. **Lovable**: does it **fit where users already work** without asking them to form a new habit. For AI, replace the build question — what happens when the model is wrong, does the output need editing, and does it **reduce** decisions or add them. — `circles/03` L23, L33, L39, L44, L52; `svpg/01` L48; `svpg/02` L29-33, L81, L97-100; `cd/02` L55 | On which grounds am I judging this — what I can build, what people will pay for, or whether it fits the life they already live? And for an AI option, who absorbs the error? | **Feasibility is the floor, not the ceiling.** **Viable is paying at scale**, and wider than marketing. **Lovable is fitting where users already work.** All four risks are assessed, not two. **Cognitive offloading**: the tool must reduce decisions, not add them. Source discipline: the four risks are SVPG's, not Lin's sixth step — the first pass attributed them to CIRCLES and was wrong. |
| **Which metrics, and which one leads?** A feature without a metric has no verdict attached to it. | Walk **AARM** — Acquisition (signing up), Activation (completing a lazy registration), Retention (using the service often in a way that helps the user or the business), Monetization (collecting revenue; paying users or ARPU). Then let the **business model** choose the top metric and say why: eCommerce → **GMV**, because VC needs multiple returns to cover failed ventures, so the company must dominate and gain brand power, logistics and supplier negotiation power; two-sided marketplace → **supply-side capacity**, because more supply means coverage with low wait times and fewer "zeroes". Draw the **Three Loops** for retention and show that they reinforce each other. — `D&C` L3462-3513; `PMIV` L9874 (the AARM definition) and L11108 ("Use the AARM metrics as a starting point"), L10677-10707, L10774-10792, L11108 | Which metrics, and which is the one that leads? | **A walked set plus a named top metric with its reasoning attached.** **Fails when** the answer is "I'd go with profits" — the named defect "Giving a short, uninspiring response". And the chosen top metric still carries its own drawbacks: GMV "does not factor in customer acquisition cost", "does not consider cost of sales or other margin information", "may not be correlated with cash flow" — tracked separately as the mitigation. |
| **This metric moved — guess, or decompose?** One unknown became one opinion; the corpus's method makes it a bounded list of checks. | Decompose and walk every branch: geography (US / international), device (desktop / mobile / tablet), browser (Chrome / Safari / Firefox), traffic source (paid search, unique views, direct traffic, landing pages), then down the funnel — "add to cart", "unsupported payment type". — `PMIV` L10901-10939 | Guess, or decompose? Decompose, and walk every branch. | **Passes when** the metric is broken into a structured tree and each branch is treated as a fact to go and get. |
| **Have I committed to a scoped goal?** An answer that enumerates everything has decided nothing. | Commit, and narrow deliberately. The named defect is "**Not committing to a particular goal**"; the worked answer narrows on request — "Which feature do you want me to focus on? I would pick text messaging." Enumerate the metric set, then **defend a choice**. — `PMIV` L11113 (the defect), L11131 (the worked narrowing), L10710-10735 | Broad survey, or a scoped commitment? Scoped. | **Passes when** something is picked. **Fails both ways**: not committing, and using breadth as a substitute for choosing. |
| **And can I move when the facts do?** Commitment is not the same as being unmovable, and the corpus asks for both. | Commit "decisive and with hard conviction behind a single position", factually and precisely, "because subjective statements invite skepticism particularly if they're not backed with evidence. Having numbers and hard data always helps." Then, when pressed the other way, be able to move — the disposition is whether you "can see both sides of the issue, adapt to change and leave behind a preconceived notion of what should have been done". — `D&C` L3912-3918, L3942-3947 | Hold, or move? Both, in that order. | **Holds when** committed with evidence behind it. **Also holds when** the commitment can be abandoned on new facts. The source's framing — "The interviewer will note candidates who refuse to commit", "The interviewer is seeing how quickly a candidate can abandon" (`D&C` L3919-3920, L3943-3944) — is held out as room-ground. |
| **Which outcome am I actually driving?** Before the next question — what should we work on — there is the outcome that question serves. Getting it wrong makes every later judgement look reasonable and point the wrong way. | Choose the **product outcome** — customer behaviour or sentiment in the product, not a business financial metric, which a team cannot reliably influence, and not a traction metric on one feature, which is too narrow. Lead with business value, because creating it earns the right to serve the customer over time. **One outcome per team**, split by segment or journey step. — `cd/01` L52-56, L93, L95; `cd/02` L38, L44-45 | Business, product, or traction — and can the team move it? One outcome or several, and if several, which gets the tree? | **Product outcome is the right scope.** Business outcomes too hard to influence, traction too narrow. Business value first because it earns the right to serve the customer over time. **One outcome per team**; no company-wide tree. A new tree when the direction changes, not the number. Being **desirable now is not enough — it must be viable over time**: Google Reader was beloved and shut down; Dark Sky was beloved and shuttered by Apple. |
| **Can this be shipped, and in what shape?** The work is decided but not yet committed. This is where the method stops being an argument about the product and becomes a commitment of people and weeks. | Set an **appetite** first — a time budget for a standard team size, small batch one to two weeks with one designer and one or two programmers, big batch a full six — and let the design come out of it, the reverse of estimating. **Fixed time, variable scope**: the deadline forces the trade-offs, the variable scope lets the team make them. — `shape-up` L40-44, L71, L81-82 | Do I estimate a build time and commit to it, or set an appetite and let a design fall out? | **Fixed time, variable scope** — estimates start with a design and end with a number, appetites start with a number and end with a design. **"Good" is relative** to the constraints. Six weeks is long enough to finish something meaningful and short enough to see the end from the beginning. |
| **And can the data for this launch actually be got?** A launch plan commits to facts about data, and the corpus's named mistakes are all data mistakes. | Start where you already operate heavily **and** the category already has usage — "Since Expedia.com operates globally, I would start by focusing on countries with high consumer train usage. **The US is not one of them.**" Ask the gating questions: can we acquire customers efficiently, do we have provider relationships, will the data be fresh. Then price the difficulty — "Not appreciating how hard it is to get train data", "Not appreciating how hard it is to get fresh and accurate data", "Not appreciating how complicated is to calculate possible trip permutations." — `PMIV` L14299-14328, L14312-14320 | Assume the data is available, or price the difficulty? Price it, and choose the pilot by existing presence plus category usage. | **Passes when** the plan assumes the data is hard, fresh and complex to compute. **The pilot market is not the default market.** |
| **Is the shaping sound enough to hand over?** A team is about to be committed. The failure is handing over something whose hidden difficulty nobody has looked at. | Shape at the right level of abstraction. **Wireframes over-specify** — they box designers in and hide the complexities behind a "just so" interface, so scope cannot flex; **bare words under-specify** — "build a calendar view" gives no context and nothing marks what is out of scope, so the project grows. Concept with **breadboard words** — Places, Affordances, Connection lines — or **fat marker sketches** for fundamentally visual ideas. Find the **rabbit holes** before the team commits: declare them out of bounds, cut back, or specify the tricky spot, and put them in front of technical experts. Write **No Gos**. — `shape-up` L30-37, L48-53, L56-61 | Am I handing over a wireframe, a sentence, or elements plus known difficulties plus explicit exclusions? And have the people who would build it looked at the parts I am least sure of? | The right level is neither wireframe nor bare words. Shaped work is **rough, solved and bounded**. Output is elements, not a deliverable; **shaping is not a conveyor belt**. **A rabbit hole is a place the team could get stuck, and you do not hand a team a project with holes.** The appetite goes in as a constraint. |
| **When is it good enough?** No single method in the corpus owns this judgement — the sources that supply it do not agree on how to do it, which is itself the reason to state the judgement rather than assume a method has answered it. | Compare against **the baseline customers have today, not against the ideal**. Hammer the scope in order: must-have, can we ship without it, new problem or pre-existing, how likely, which customers, core or edge case, actual impact, aligned with the intended audience. Tilde the nice-to-haves so they are never built unless time remains. Cutting scope is not lowering quality — being picky differentiates the product, and scope grows like grass unless the team has the tools to cut it. Treat extension as rare and diagnostic. — `shape-up` L101, L105, L110-115; `circles/03` L25 | Against what am I comparing — what people have today, or what I imagine? What survives the scope hammering? And if it doesn't fit, extend or reframe the shaping? | **Compare to baseline, not the ideal.** **Limits motivate trade-offs.** **Cutting scope is not lowering quality.** **Extending is rare and is evidence the shaping was wrong**, not that the schedule slipped. QA is a level-up, not a gate. A dot on the hill that does not move is a raised hand — stuckness surfaces without anyone saying "I don't know", and the language is about the work, not the person. |
| **Is this an answer, or a description of how one would be produced?** Naming a solution is not the same as having one. | **Name a specific scenario and a specific customer problem** — "Not picking a specific scenario and / or customer problem, leading to generic solutions." **Show the implementation** — "Proposing a magical solution without going into the implementation details … Just press the 'I'm Feeling Lucky' button"; "Suggesting an auto-recommender feature and being vague about the implementation by stating 'machine learning' is the solution, without going into details." **Claiming a UX improvement is not showing it** — "Claiming one can improve the UX, without showing how." **Use the product's own words** — "Using the wrong terminology, such as calling a pin or save a retweet." — `PMIV` L9021, L9015-9017, L8877-8878, L8537-8538, L11912 | A named solution, or a description of how it works? Named scenario, named problem, shown mechanism. | **Passes when** it could be argued with. The corpus treats vagueness as a first-class failure, not a style note. **Distinct from the demand above it** — an answer can cover every step of CIRCLES and still fail here. |
| **Would this idea survive "why that one?"** The failure is not a wrong idea. It is a first idea. | **Reach past the obvious fix** — "Considering only superficial problems such as removing ads"; "Considering only superficial needs such as 'User needs the ability to share photos'"; "Suggesting half-hearted ideas like make the button more visible or colorful." **Go further on the answer you have** — "Not thinking creatively or big enough"; "Failing to come up with a big, game-changing idea"; "Thinking small by suggesting underwhelming adjacent features." **Bring one audacious option** — "Most companies, especially Google, would strongly prefer to hear one audacious, moonshot idea than ten good ideas." **Know the space, or originality is fake** — "Overlooking traditional alternatives like hotels"; "Suggesting an idea that already exists"; "Incorrectly assuming a complete and accurate understanding of how Pinterest works"; "Copying competitor's innovations … is a sign of an unoriginal and uncreative candidate." — `PMIV` L7897, L7901, L7608, L7056, L9778, L7525-7526, L8722-8723, L5883, L8304, L8164, L9246-9247 | A safe improvement, or a real one? Reach past the obvious, and bring something audacious. | **Eighteen of the corpus's own defects say the answer was too small.** This is the largest cluster the earlier passes never extracted. |
| **Is this the object the question asked about?** A coherent answer about the wrong thing is still a wrong answer. | **Draw the map that was asked for** — "Accidentally drawing the employer journey map when the interviewer is asking for the candidate journey map." **Work the layer the question is about** — "Incorrectly focusing on the UX, not algorithm, design." **Do not narrow the object without reason** — "Automatically assuming that this is about improving Bing.com. The prompt is really about helping the salesperson in general." **Bound the analysis on both edges** — the low-value interior ("Focusing too much on low value-add items such as whether the driver offers water to its riders") and the unexamined exterior ("Not considering non-Amazon issues, such as slow Internet connectivity"). — `PMIV` L6016-6017, L7428, L7801-7802, L11814-11815, L11881 | The named object, or the one I expected? The named one. | **The mirror of the first demand.** That one catches running the whole framework about a narrow question; this catches running the right framework about the wrong thing. The corpus names both separately. |
| **Were the terms agreed before anything was scored against them?** Reasoning inside an unagreed frame produces a defensible answer to a question nobody asked. | **Establish the shared frame first** — "'Go-to-market' can have differing interpretations. Many candidates assume that they share a common understanding with the interviewer." **Fix what the criterion means before scoring against it** — "Not aligning with the interviewer on what constitutes 'favorite' website." **Lead with the instrument** — "Not providing a scorecard upfront." **Answer every part asked** — "Answering part 1 and not part 2. Or vice versa." — `PMIV` L12020-12021, L9495, L9366, L9774 | Reason inside an agreed frame, or agree it first? Agree it first. | **The corpus states this rule five times** (`PMIV` L12020-12021, L9495, L9366, L9774, and the
scope instance at L7801-7802); this model carried it once, and only as a restatement of Lin's
clarifying question. |
| **Does the answer respect every constraint the prompt stated?** | **Apply the stated limit** — "Not factoring in the 30-minute constraint." **Meet the stated objective** — "Coming up with ideas that don't meet the 3X revenue objective." **Raise safety where safety is the risk** — "Not mentioning safety issues." **Name the dependencies** — "Missing critical dependencies such as driver availability." — `PMIV` L7797, L9770, L9539, L14471 | My own constraints, or the ones the prompt stated? The prompt's. | **Safety and dependencies entered the model here.** Neither is prominent in the `D&C` material the model otherwise rests on. |
| **Have I looked at the customer closely enough?** A persona treated as a label produces solutions for nobody. | **Depth is what unlocks the idea** — "Not empathizing with the customer deeply enough, limiting your ability to come up with innovative ideas." **Walk the experience, not the org chart** — "Not checking whether one has reviewed each step of the customer experience." **Get the model right before the cohort** — "Forgetting that Airbnb is a marketplace and customers interact with hosts"; "Not acknowledging that new users may not feel 100% confident with Airbnb's concept." **Read the attributes that change the design** — "Not taking into account the career level of the job seeker"; "Not considering that a job seeker may eventually leave his or her job"; "Assuming user engagement is identical for 3 and 15 second videos." — `PMIV` L9241-9242, L5816, L5887, L5891, L6023, L6027, L7701 | A label, or a read on behaviour? A read. | **Ties directly to J3** — the cohort has to be right for the cut to mean anything. |
| **Will my design answer explain itself?** A detailed design that does not say why is not an answer. | **Explain the critical choices** — "Missing commentary that explains critical design choices, despite detailed and visually stunning designs." **Do the design work the question implies** — "Fear of wire framing." **Justify the unconventional choice** — "Drawing out unconventional UI interfaces … especially if there is no reason to do so." — `PMIV` L6975, L6971, L6979-6980 | Explain it, or assume it reads itself? Explain it. | **The mirror of the first demand again** — do the question's own work *and* show why. The two failures are opposite and both are named. |
| **Can this team decide, or is it being told?** The recommendation is formed, and the last question is whether the people receiving it can act. The failure is a team handed conclusions rather than asked to reach them. | **One cross-functional team responsible for both discovery and delivery**, every member engaged in both. The test of empowerment is whether the team **can decide the best way to solve the problems it was assigned**. Never let one group obtain the learnings and hand them to another to execute. Applied to your own team, the standing check is whether you are staffed with competent people with character, skilled across product, design and engineering — character replaces "cultural fit", because in practice "cultural fit" produces people who think like you, when what is needed is people who think differently. — `svpg/06` L12, L19, L25; `svpg/05` L44, L50-51, L58 | Is this team able to decide, or is it being told — and have I noticed which? And is my own team staffed for the problem in front of me? | **One cross-functional team does both discovery and delivery.** Handing learnings off produces **missionaries, not mercenaries** (`svpg/05` L36) — the receiving end stops proposing better solutions, self-selects over time, and is then complained about for lacking initiative. **Empowerment means the ability to decide the best way to solve the problems you were assigned.** **Hiring is the staffing manager's job, not the PM's** — *this model's inference from the structure of `svpg/05` L40, L42-43, not a sentence in the source* — so this is a standing check on your own team, not a sourcing decision. |

---

## Integrated narrative — how the expert thinks

**The corpus has more to say about failure than the seven steps suggest, and v4 finally read it.**
The seven steps tell you what to do. The 104 "Common Mistakes" defects tell you what goes wrong, and
they are not the same list. Three things follow, and they change how the whole method is read.

First, **the governing rule is stated five times, not once.** The primary source does not merely say
adapt the framework — it names the same failure independently in four places: "Using all seven steps of
the CIRCLES Method™ especially when it is clear that this is strictly about implementation"
(`PMIV` L6875-6876); "Spending too much time with the CIRCLES design framework such as too much time
spent talking about goals or personas" (L8036-8037); "Insisting on walking through the full CIRCLES
framework when interviewer is simply looking for a subset" (L8651-8652); "Trying to force the CIRCLES
Method™ into the discussion, when the interviewer simply wants a list of ideas" (L8882-8883); and a
fifth time, in a per-question note rather than a defect list — "the interviewer only wants a subset of
the CIRCLES Method™, articulating use cases and then prioritization, not the full framework"
(L9536-9537). A rule a source repeats five ways survives translation into a different frame. — X-84 That is why the top demand in this model is *which steps
does this question need*, and not any criterion about how the answer sounded.

Second, **ambition is a defect class of its own, and it is the largest one.** Eighteen of the
corpus's defects are not wrong answers — they are small ones. "Not thinking creatively or big enough."
"Failing to come up with a big, game-changing idea." "Considering only superficial problems such as
removing ads." "Most companies, especially Google, would strongly prefer to hear one audacious,
moonshot idea than ten good ideas." None of this is about risk appetite in a person; all of it is
about the content of the work. A model that reads the seven steps and stops will produce competent,
complete, forgettable answers, and the corpus would score them as failures.

Third, **being specific is a judgement, and the corpus treats it as a first-class one.** "Not picking
a specific scenario and / or customer problem, leading to generic solutions." "Proposing a magical
solution without going into the implementation details." "Claiming one can improve the UX, without
showing how." "Using the wrong terminology, such as calling a pin or save a retweet." This is the
sharpest correction the full extraction delivers: a response can walk all seven steps correctly and
still fail, because it described an answer instead of giving one.

Around those three sit four more, smaller but real. **Frame before reasoning** — "'Go-to-market' can
have differing interpretations", and the candidate who assumed otherwise; fix what the criterion
means before scoring against it; answer every part that was asked. **Constraints bind** — the
30-minute limit, the 3X revenue objective, safety, "Missing critical dependencies such as driver
availability"; a good answer that ignores a stated constraint is still a wrong answer. **Customer
depth is the source of ideas, not decoration** — "Not empathizing with the customer deeply enough,
limiting your ability to come up with innovative ideas." And **the design answer has to explain
itself** — "Missing commentary that explains critical design choices, despite detailed and visually
stunning designs", which is the exact opposite failure to over-application.

And **eighteen defects are about the room, and the model deliberately leaves them there.** "Answering
too casually." "Freezing up." "Mumbling and/or speaking too quickly." "Not showing enthusiasm, making
the answer boring." "Choosing a product that the interviewer is unfamiliar with, causing the
interviewer to get bored." "Not getting familiar with the topic beforehand." These are real defects in
a real interview and they are recorded in full at **X-83** — but they are not product judgement, and a
model that put them in would be a model of interview performance wearing a product model's clothes. That
distinction is the one the owner drew, and it is the reason the artefact reads the way it does.


**The method is a checklist, not a recipe — and a checklist is judged by what the situation needed.**
Lin states this as a standard for the method he created ("not to recite it verbatim… Adapt the
framework as you see fit", `D&C` L3660-3663), the proficiency ladder states it as the difference
between novice and expert ("a framework is a checklist, not a recipe… prevent errors of
omission", `PMIV` L1808-1812), and the practice material names the failure on the work side — running
all seven steps when "it is clear that this is strictly about implementation" (`PMIV` L6875-6876).
The second pass took the same rule and hung it on a listener's opinion of a speaker. That was the
error that failed the relevance gate, and it is worth naming plainly: **the advice was true and the
ground was wrong.**

**Why the method exists at all: four ways candidates stumble.** Candidates start badly ("that 'Oh,
no!' deer in headlights look"), ramble because they improvise a solution while talking, cannot end
because they are unsure the interviewer is satisfied, and focus on the solution alone — which "begs
the question, 'Why?'", because the listener does not know who the customer is or what problem the
product solves, and cannot see why this solution rather than another (`D&C` L500-510). Each step
answers one of those. That is what "prevents errors of omission" means (`PMIV` L1812).

**Comprehend is about what you do not know, not about scoring points.** Lin opens it with a
candidate who improved Windows 8 without ever having used Windows 8 — "I don't want anyone
performing open-heart surgery if he or she doesn't know what the heart looks like" (`D&C` L543-551).
The clarification is four questions, and Lin deliberately narrows the standard list to make them
countable: the full set is "frequently called the '5W's and H'", but "to start the interview, you
really just need answers for the four bolded questions… So we'll call our version the '3W's and H.'"
(`D&C` L564-568). If the interviewer will not answer, assume — and hand back the correction, which
is what makes the assumption safe rather than a fabrication (`D&C` L569-572).

**Underneath Comprehend sits a section both earlier passes skipped entirely.** Lin does not stop at
the prompt: he asks what the customer's actual workflow looks like and "what gaps that existing
solutions have left open", and gives the **Five Whys** as the instrument (`D&C` L2029-2068). The
worked chain runs **five deep**: cause, cause, cause, then the answer turns into a solution — "We
could if we simply put inexpensive aluminum foil on the parts that get dirty often" (`D&C`
L2058-2061) — and only at the fifth does it become a constraint: "We can't get the procurement
department to approve the purchase" (`D&C` L2062-2064). **The source states the instrument and shows
five rounds; it states no stopping rule.** Reading the chain as run once the answer is no longer a
cause is this model's inference, and it is labelled as such wherever it is used. Both earlier passes
sourced their only why-framing to Torres's opportunity test and logged `D&C` chapter 6 as
unextracted, so **the corpus's only root-cause instrument was absent from both.**

**Identify is about product quality, and the reason is quotable.** "There's no magical device that
does everything for everyone… more often than not, all-in-ones usually aren't very good. During the
interview, you want to propose an amazing product, not a mediocre one" (`D&C` L582-586). One persona,
then make it legible, because "the interviewer may not be familiar with your chosen persona" — Lin's
own device is a 2x2 of behaviors and demographics/needs-and-goals, and he populates it fully
(`D&C` L596-628).

**Report is a sentence, not an analysis.** "As a ⟨role⟩, I want ⟨goal/desire⟩ so that ⟨benefit⟩",
which "does not describe how the solution works" (`D&C` L634-636). Its virtue is that it is
"concise, complete and casual" — one sentence yields the user, the need and the justification
(`D&C` L649-651). The two worked stories then "each one screams for completely different solutions"
(`D&C` L653-654), which is the handoff into prioritisation.

**Cut is a stated matrix with effort in it.** Lin's columns are User Story, Revenue, Customer
Satisfaction, Ease of Implementation, Overall (`D&C` L662-673), and he defends the instrument
honestly — it is "based on subjective criteria, weights and grades" with "some flaws", but "I'd
rather have an imperfect process than no process at all", because "the matrix method forces the
decision maker to think and articulate what's important" (`D&C` L701-705). What actually settles a
feature is A/B testing (`D&C` L706-707). Quantitatively, the metric is revenue per point of effort,
where story size estimates engineering effort (`D&C` L708-750).

**This is where the first pass of this model was wrong, and the object explains why.** It carried a
universal rule — effort excluded from prioritisation — sourced from continuous discovery, where an
**opportunity** is assessed and effort is excluded because an opportunity assumed too hard may have
a dead-simple solution (`cd/01` L79-80). But Lin cuts **user stories**, which are already scoped
work, so effort is knowable and belongs in the cut. Both rules are right about different objects.
The first pass had one "prioritisation" decision and could not hold both.

**List is built around the freeze, and it has three named tools.** "Most candidates freeze when they
have a design problem without a solution on the tip of their tongue" (`D&C` L753-755). Lin's three:
**Reversal** — reverse the situation; **Attribute** — list attributes and mix them; **Why?** —
challenge the status quo (`D&C` L760-826). Then two tips. *Think big*: the dull answers are "me too
ideas" and "integration ideas", and Lin greets both with "Yawn"; employers are evaluating "your
creativity or product vision" — the ability to see future trends in technology and customer
behaviour and plot a plan that exploits them (`D&C` L831-840). *Have at least three ideas*, and the
ground the primary source gives is quality — the first idea is rarely the best because "innovation is
an iterative process" and better knowledge of needs and competitors makes later ideas more precise
(`D&C` L866-872). The same passage also says three ideas keep critique impersonal ("if you have only
one idea, you'll take it personally", `D&C` L873-876). That is true advice about how a person feels
while being questioned, and it is **not** why the options get better — so it is recorded as X-29b and
kept out of the criterion.

**Evaluate is pro/cons, and self-critique is the point.** Lin marks defining criteria as
**optional**, valuable only because it "will keep your response organized and easier to follow", and
names customer satisfaction, implementation difficulty and revenue potential as examples
(`D&C` L879-882). The instrument is a pro/con list (`D&C` L883-884). Its payoff is that critiquing
your own work **surfaces objections you had not found**, and leaves the ones you did not find already
anticipated — "if you've taken the initiative to critique your own solutions, the interviewer has
fewer things to criticize" (`D&C` L888-893). The source also says you come across as thoughtful and
objective; that is a claim about apparent rigour and is not the reason to do the step. The first pass
filled this step with **viable / lovable / feasible**, which are Marty Cagan's four risks, not Lin's
sixth step. Confusing two frameworks' content is how that happened, and the primary source now in the
corpus settles it.

**Summarize is three beats and one hard decision.** Recommend which feature; recap what it is and why
it benefits the user and/or company; explain why you preferred it over the others (`D&C` L902-905).
Optional, because some interviewers are already satisfied — but others are testing whether you can
"make the hard decision to suggest just one solution" (`D&C` L896-901). No metric is required. The
first pass required one, from a third-party guide. The second pass also required 20 to 30 seconds,
which is a pacing target for a spoken answer and is not carried here.

**There is a real tension about arriving with a solution, and it is not resolved.** If you are
uncomfortable exploring without one, "it's okay to have a solution in mind and lead your CIRCLES
discussion toward it" — and it can help, by constraining the realm of personas, needs and solutions
(`D&C` L912-918). But Lin's stated ideal is the opposite: "embrace the great unknown" (`D&C`
L919-920). The model carries both, because the corpus states both, and because the reason for the
first is disclosed as discomfort rather than as method.

**Discovery is a different discipline with different objects, and conflating them is the error the
first pass made most often.** Lin reports a **need**, in a user story, in one sentence. Torres
assesses an **opportunity**, asking whether more than one thing could address it and reframing with
"Why?" until the answer is yes (`cd/01` L60-63) — "I want to go out to eat" becomes "I don't have
time to cook", "I want to eat right now", and "I want something that tastes better than what I know
how to make". One statement turned out to be three, which is the point: an item only one thing can
address was never an opportunity. And the Five Whys runs on a third object — a **reported problem**,
worked past the surface cause (`D&C` L2029-2068). Three objects, three instruments; the first pass
merged two of them and missed the third.

**Evidence is earned, and most of what is to hand is not evidence.** Opportunities come from
stories, because a story carries when it happened and what the person was trying to do (`cd/01`
L64). Sales calls, support tickets, feature requests and analytics lack that context and are
inspiration for the next interview rather than tree input (`cd/01` L66). Priors are excluded
outright, because generating from what the team already knows brings biases and half-truths (`cd/01`
L65). Three to four stories is the window — under it you overreact to one, over it you paralyse
(`cd/01` L70, L94).

**Measurement is where the corpus is least one-sided, and it is mostly practice material.** AARM is
the spine — Acquisition, Activation, Retention, Monetization (`D&C` L3462-3487) — and the
practice material names it as a *starting point*, not a gate, twice — the definition at `PMIV` L9874, and "Use the AARM metrics as a starting point" at L11108. What
makes it more than a checklist is that the **top metric follows the business model and the reasoning
is given**: eCommerce is GMV because venture capital needs multiple returns to cover failed ventures,
so the company must dominate the industry and enjoy scale benefits (`PMIV` L10677-10707); a
two-sided marketplace is **supply-side capacity** — drivers, listings, rentals — because more supply
means coverage with low wait times and fewer "zeroes", a passenger who opens the app and cannot find a
driver (`PMIV` L10774-10792). Lin is also willing to name his own chosen metric's limits: GMV "does
not factor in customer acquisition cost", "does not consider cost of sales or other margin
information", and "may not be correlated with cash flow" (`PMIV` L10758-10772).

**A dropped metric is a decomposition problem, not a guessing problem.** The worked method breaks
the metric into geography, device, browser, traffic source, then walks down the funnel to "add to
cart" and "unsupported payment type" (`PMIV` L10901-10939). One unknown becomes a bounded list of
things to go and check.

**And the answer must commit.** The named defect is "Not committing to a particular goal", and the
worked answer narrows on request — "Which feature do you want me to focus on? I would pick text
messaging" (`PMIV` L11113, L11131). The opposite defect is equally named: "Giving a short, uninspiring
response (e.g. 'I'd go with profits')" (`PMIV` L10713). Enumerate and commit; neither enumerate and
drift, nor land on one word.

**Committing is not the same as being unmovable, and the corpus asks for both.** In the worked
Amazon strategy answer the instruction is precise: "The key is to be precise and specific, avoiding
the corporate jargon and nonsense words that cloud most corporate communications. Stay factual, or at
least logical, because subjective statements, invite skepticism particularly if they're not backed
with evidence. Having numbers and hard data always helps. Also, be decisive and have hard conviction
behind a single position" (`D&C` L3912-3918). Then the follow-up that asks you to argue the other
side asks whether you "can see both sides of the issue, adapt to change and leave behind a preconceived
notion of what should have been done" (`D&C` L3942-3947). The source's own framing in both places is
about an observer — "The interviewer will note candidates who refuse to commit one way or the other",
"The interviewer is seeing how quickly a candidate can abandon" (`D&C` L3919-3920, L3943-3944) — and
that framing is held out. **What is carried is the disposition: decide, back it with data, and move
when the facts change.**

**Launch planning is where data difficulty is the risk.** Entering a new category, the worked answer
starts from countries with high usage of that category rather than the US — "The US is not one of
them" — picks one where the company already operates heavily, and expands country by country
(`PMIV` L14323-14328). All three of its named mistakes are about data: "Not appreciating how hard it
is to get train data", "Not appreciating how hard it is to get fresh and accurate data", "Not
appreciating how complicated is to calculate possible trip permutations" (`PMIV` L14312-14320). The
plan commits to facts about data, so the data difficulty belongs in the plan, not in the surprises.

**The outcome comes before the need.** The tree is rooted in a desired outcome; business outcomes are
too hard for a team to influence and traction metrics too narrow, so the working choice is a product
outcome — customer behaviour or sentiment in the product (`cd/01` L52-53). Business value still
leads, because creating it earns the right to serve the customer over time (`cd/01` L54). The
corpus illustrates the consequence with two warnings rather than an argument: Google Reader, beloved
and shut down; Dark Sky, beloved and shuttered by Apple (`cd/01` L54). One outcome per team, and a
new tree when the direction changes — not when the number does (`cd/01` L56, L93, L95).

**Prioritisation has two object-specific procedures, and the general rules that cross them.** For a
**user story**, Lin's cut matrix, effort included. For an **opportunity**, four factor sets —
sizing, market, company, customer — effort excluded (`cd/01` L79-80). Across both: a stack-ordered
sequence with no ties, because two "first priorities" means nothing is important (`rice/02` L10);
distrust of checklists, which produce good/bad rather than sequence — SWOT, 4 Ps, PEST, growth/share
matrix, Ansoff, GE/McKinsey and 3 Cs all fail as prioritisation tools (`rice/02` L13); and distrust of
single-criterion lenses for three distinct reasons — "ship the smallest wins" never ships high-value
sustained-effort initiatives, "ship the most immediate revenue" chases monetisation over strategic
bets, and "most advanced technology" confuses the technology with the value driver (`rice/02` L14).
Impact is kept deliberately blunt — 3, 2, 1, half, quarter — because the alternative is a tangled mess
of gut feeling (`rice/01` L27). A score is a hypothesis: sort, then re-evaluate, and be willing to
conclude the gut is wrong (`rice/01` L41). RICE is not for acquisitions or pricing (`rice/02` L62).

**Evaluate-in-practice has moved, and the move is the model.** A trade-off argued purely on
engineering complexity is the tell of a weak answer (`circles/03` L33, L52). Feasibility is a
checkbox. The weight sits on **viable** — will people or companies pay to have this solved at
scale, reaching past marketing into sales, finance, service, legal and compliance (`svpg/01` L48;
`svpg/02` L33) — and on **lovable**, whether it fits where users already work without asking anyone
to form a new habit (`circles/03` L23). Underneath both sit the four risks — valuable, usable,
feasible, viable — assessed early, each owned: viability the product manager's, usability the
designer's, feasibility the tech lead's (`svpg/02` L81, L97-100). Assumptions run wider still, to
desirable, viable, feasible, ethical and usable (`cd/02` L55). For AI work the question changes
shape: will people use it or does it add a task to an already overloaded workflow, does the output
need editing, what happens when the model is wrong, and does it **reduce** decisions or add them
(`circles/03` L44).

**Shipping is a separate discipline with its own instruments, and it defers discovery.** Shape Up
targets the risk of *not shipping on time*, and puts discovering what to build deliberately out of
scope, on the view that improvement of discovery should come after the ability to ship is regained
(`shape-up` L22). Its central instrument is **fixed time, variable scope** — an appetite starts with a
number and ends with a design, the reverse of an estimate, because the deadline is what forces the
trade-offs and the variable scope is what lets the team make them (`shape-up` L41). Shaping is
neither a wireframe nor a sentence: wireframes over-specify and hide difficulty behind a "just so"
interface, words under-specify and leave nothing marking what is out of scope (`shape-up` L31-32).
The Dot Grid is the worked case — asked for a calendar, learned that only about a tenth of customers
used past calendars and there was no appetite for six months of it, but appetite for something in
six weeks, so the concept was cut to roughly a tenth (`shape-up` L33). What gets handed over is rough,
solved and bounded, with rabbit holes found before the team commits, because you do not hand a team a
project with holes (`shape-up` L34, L53).

**Knowing when to stop is the judgement no method in this corpus owns.** Three unrelated sources
supply it. Shape Up compares to the baseline customers have today rather than to an ideal, hammers
the scope through a fixed list of questions, and treats extension as rare and diagnostic — hitting a
cool-down means the shaping was wrong, not that the schedule slipped (`shape-up` L110-115). Cutting
scope is not lowering quality; being picky differentiates the product (`shape-up` L112). RICE asks for
the scores to be revisited and the gut possibly overruled (`rice/01` L41). And the corpus refuses to
let quality become an indefinite deferral: QA is a level-up rather than a gate, and a hill-chart dot
that has not moved is a raised hand that surfaces stuckness without anyone having to say "I don't
know" (`shape-up` L105, L114).

**The last question is who is standing behind the decision.** Empowerment is not a mood; it has a
test — the team can decide the best way to solve the problems it was assigned (`svpg/05` L44). The
counter-pattern is handing off: one group obtains the learnings and another executes, and the
receiving group feels like mercenaries and stops proposing better solutions (`svpg/06` L19). The
damage is not only morale — over time the receiving end self-selects to those willing to work that
way, and then founders complain about the resulting lack of initiative (`svpg/06` L21).

Applied to your own team, the same judgement becomes concrete. The corpus's empowerment litmus
question is one any product manager can answer about the people they work with every day: **are you
staffed with competent people with character, skilled across the competencies you need** — product
manager, product designer, engineers (`svpg/05` L58). Competence is capabilities, skills and track
record; character is what replaces "cultural fit", because in practice "cultural fit" means hiring
people who look and think like we do, and the consequence is that they think like us — when what is
needed is people who think differently (`svpg/05` L50-51). So the working form is not a hiring policy
but a question about the team in front of you. **Hiring itself is the staffing manager's job, not the
product manager's** — *this model's inference from the structure of `svpg/05` L40, L42-43, not a sentence
in the source* — so the product manager's version is the standing check on their own team, not the
sourcing decision. The trio can flex, but that is a trade and it should be made
knowingly (`cd/02` L30).

---

## How this model may and may not be used

- **Use it to decide, not to display.** "Frameworks are meant to be a memory aid. Adapt to your
  specific interview question" (`D&C` L1953-1955) — and, from this pass, the sharper form: the
  checklist's contents are negotiable, its purpose of preventing omission is not.
- **Do not let a claim about how you sounded stand in for a claim about the work.** Three items in
  this corpus (X-29b, X-37, and the duration clause in X-33) and the criteria they once supported are
  retained in the Extraction Log and excluded from the model, because their ground is a listener's
  impression rather than a product decision. That distinction is the main content of this rebuild.
- **The primary source outranks the guides.** `D&C` is the book in which Lin creates and teaches the
  method (`D&C` L511). `circles/03`–`circles/06` are third-party guides with no authority over it.
  Where a guide and the book disagree, the book wins — including where the guide is more recent.
- **Where the corpus still disagrees with itself, this model carries the disagreement.** The
  solution-in-hand question has two defensible ends and the corpus settles neither (`D&C` L912-920).
  The Lin/Torres effort question is now resolved by naming the object, not by picking a winner
  (`D&C` L662-673 vs `cd/01` L79-80).
- **Three demands are third-party-sourced and labelled as such.** The feasible-as-checkbox, the
  AI-specific questions and the lovable definition rest on `circles/03` alone (`circles/03` L23, L33,
  L44, L52). They are kept because nothing better is in the corpus, not because they are Lin's.
- **Three extracted decisions sit outside the model's scope and are listed without resolutions.**
  Willingness to pay and survey bias (D-33), the new-market entry checklist (D-34) and pro/con as a
  strategy instrument (D-35) are in `decision-model.md` as *recorded, not resolved*, so the boundary
  is visible. Extracting them does not put them in the model.
- **Payloads and scaling.** The basic truths — fixed time and variable scope, capped downside,
  distinguishing knowns from unknowns, sequencing by unknowns — hold at any size; the specific
  practices are scale-dependent (`shape-up` L129). At two or three people, drop the cycles,
  cool-downs, formal pitches and betting table, but keep shape, bet and build (`shape-up` L130).
- **Do not treat this model as an authority on its sources' full content.** It is built only from
  what the knowledge base holds. Where it is thin, that is because the corpus is thin.

---

## Coverage note — what this model does not have

Each gap traced to the line of the corpus that records it. None filled by inference.

- **Two books are still cited, not ingested.** *Inspired* (Marty Cagan) and *Continuous Discovery
  Habits* (Teresa Torres) remain named references only (`sources.md` L12-13; `svpg/08`) The
  discovery material here is second-hand through Teresa Torres's Product Talk article and an
  interview transcript, not her book.
- **`cd/03` carries no substance at all.** Podcast show notes — a list of chapter timestamps
  (`cd/03` L10-25) — and its own header says the substance is elsewhere (`cd/03` L8). Nothing was
  taken from it.
- **`prio/04` is abstract-level only.** Full text is not obtainable and the note explicitly forbids
  quoting the technique names (`prio/04` L13, L37). Only the counts, the output/assumption/outcome
  split, and the cross-functional finding are available.
- **Lifecycle-aware prioritisation has no method.** The gap is documented — RICE, MoSCoW and Kano
  ignore the life-cycle phase, producing "the right functionality at the wrong time" — but the
  promised process guidelines do not yet exist; the paper is a work in progress contributing problem
  framing and a taxonomy (`prio/03` L11-14, L54). So "prioritise by life-cycle stage" is a question
  the expert holds open with no available answer.
- **Whether the method changed across editions is unknown.** `circles/02` advertises a Fifth Edition
  of 528 pages (`circles/02` L8-10); only the Second Edition is in the corpus. The steps taught
  here are the Second Edition's, and the primary-source claim in this model is bounded by that.
- **`PMIV` chapters 11–18 and 22 were partly extracted in v3 and are now complete.** The worked
  CIRCLES application is squarely this model's declared task, and v3 represented it only by the
  pain-point method, the decomposition method and three named defect instances. **All 47 in-scope
  "Common Mistakes" blocks are now extracted — 31 in Ch. 11–14, 14 in Ch. 15–18, 2 in Ch. 22 — 104
  defects, 86 of them product judgement** (`extraction-log.md` §4d, X-82 – X-93). What remains
  unextracted is the worked *answers* and the per-question "Things to Consider" notes, which
  illustrate these defects rather than add judgement.
- **`D&C` chapter 8 (business-model estimation) is an owner call, not an oversight.** Revenue,
  headcount and ROI estimation is adjacent to but outside the declared scope, and it is not
  extracted. Recorded so the omission is visible.
- **No material on legal, compliance or accessibility practice**, though viability is stated as
  reaching into them (`svpg/02` L33).