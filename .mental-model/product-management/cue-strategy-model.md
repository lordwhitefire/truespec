# Cue/Strategy Model — product manager

**Phase:** P3 Analyze (a)
**Input:** `extraction-log.md`
**Every cue carries the extraction item it came from.** Citations resolve through `extraction-log.md` §0.

---

## The governing cue

Cues below are the things that *arise*. Strategies are what the expert does. The top cue is
different in kind from the rest: it is not a situation, it is a standing constraint on how every
other situation is handled.

**v3 correction.** v2's governing cue was "I am about to sound scripted", fired by the prospect of
being *read* as robotic, and justified by interviewer reaction (X-1). The rule survives; the ground
does not. The cue below is fired by a mismatch **between the method and the question**, and every
strategy in it is justified by what the analysis does or fails to do.

---

### CS-1 · "This question does not need all seven steps"

**Trigger.** The question is plainly narrower than the method — e.g. it is strictly about
implementation, and you are about to run Identify on a persona the prompt already gave you.
— X-64 (`PMIV` L6875-6876), X-63 (`D&C` L3660-3663)

**Why it fires.** Applying a step the question does not call for costs the question: the answer
becomes about a step instead of about the decision. Lin's own framing of a framework is "a mental
checklist for a complete response, not to recite it verbatim… Adapt the framework as you see fit"
(`D&C` L3660-3663) — the test is **completeness relative to the question**. The named defects are
"using all seven steps… when it is clear that this is strictly about implementation", "not
adapting frameworks to a specific situation", and "using a framework in a way that feels generic and
forced" (`PMIV` L6875-6876, L5808-5813).

> **The corpus states this rule four separate ways, in four different chapters.** Only the first was
> found before v4. The other three: "Spending too much time with the CIRCLES design framework such as
> too much time spent talking about goals or personas" (L8036-8037); "Insisting on walking through
> the full CIRCLES framework when interviewer is simply looking for a subset" (L8651-8652); "Trying
> to force the CIRCLES Method™ into the discussion, when the interviewer simply wants a list of ideas"
> (L8882-8883). And a fifth, in a per-question note rather than a defect list: "the interviewer only
> wants a subset of the CIRCLES Method™, articulating use cases and then prioritization, not the full
> framework" (L9536-9537). A rule a source repeats five times is not an inference from one line —
> which is why this cue, and the demand it carries, are the model's top judgement rather than one
> option among several. — X-84

**Strategies.**

1. **Ask what the question is actually asking, then answer that.** — X-3 (`D&C` L1953-1955),
   X-64 (`PMIV` L6875-6876)
2. **Keep the coverage, drop the announcement.** The steps still happen; they stop being labelled.
   Lin's rule is against *blind* following (`D&C` L1933-1936), and the memory-aid framing is
   explicit: "CIRCLES Method™ is a guideline on what makes a complete, thoughtful response… It's a
   memory aid that prevents us from forgetting a step" (`D&C` L515-517). — X-3
3. **Reach the decision the question asked for.** "Interviewers can tell when you used a hammer when
   a scalpel would have sufficed" (`D&C` L1956-1957) — the mismatch is the defect, not the tool.
4. **Guard the checklist's actual purpose.** "The expert understands that a framework is a checklist,
   not a recipe… CIRCLES is there to prevent errors of **omission**." — X-4 (`PMIV` L1808-1812)

> **Room-ground held out.** v2 justified this cue on "Some will label the person as over prepared.
> Others, like me, would fear that the candidate is inexperienced" (`D&C` L1940-1943) and on "the
> interview is about establishing credibility and likability" (`D&C` L1949-1952). Those are
> judgments about how a listener reads a person and are **not** part of this cue. The gate's
> relevance judge failed v2 on exactly this. See `extraction-log.md` §8, Finding 1.

---

## Step cues

### CS-2 · "I don't know this product"

**Trigger.** The prompt names something unfamiliar, or you are about to describe its features and
cannot. — X-8 (`D&C` L543-549)

**Strategies.**

1. **Say so.** "If you don't know the product, speak up. It's not fair for you to discuss a product
   you don't know." — X-8 (`D&C` L550-551)
2. **Ask the four.** 3W's and H — what is it, who is it for, why do they need it, how does it
   works. — X-11 (`D&C` L564-568)
3. **Pull up the website, app or artefact.** A visual improves communication — "A visual improves
   communication… It would be lethal if you and the interviewer were thinking of different things."
   — X-13 (`D&C` L573-579)

### CS-3 · "The interviewer won't answer"

**Trigger.** Clarifying questions meet resistance. — X-12 (`D&C` L569)

**Strategies.**

1. **Assume out loud.** "Make an assumption based on what you know." — X-12 (`D&C` L569-570)
2. **Hand back the correction.** "Then, give the interviewer an opportunity to correct you, in the
   event he thinks differently about whom it is for or how the product works." — X-12
   (`D&C` L570-572)

### CS-4 · "Who is this even for?"

**Trigger.** Before any need can be named, or when a prompt hands you a platform and does not say
which side. — X-14 (`D&C` L582-586)

**Strategies.**

1. **Focus one persona, for a stated reason.** "You want to propose an amazing product, not a
   mediocre one." — X-14 (`D&C` L585-586)
2. **Name the failure you are avoiding.** "There's no magical device that does everything for
   everyone… all-in-ones usually aren't very good." — X-14 (`D&C` L582-584)
3. **Show it on the 2x2.** Behaviors × Demographics/Needs & Goals, so the interviewer comprehends
   whom you mean. — X-15, X-16 (`D&C` L596-598, L598-628)

### CS-5 · "What does this person actually need?"

**Trigger.** Before any solution is entertained. — X-17, X-19 (`D&C` L631-635, L653-654)

**Strategies.**

1. **Write the user story.** "As a ⟨role⟩, I want ⟨goal/desire⟩ so that ⟨benefit⟩." — X-18
   (`D&C` L636)
2. **Keep solution out of it.** "A user story conveys what the end user wants to do in normal
   everyday language. **It does not describe how the solution works.**" — X-17 (`D&C` L634-635)
3. **Know what the sentence bought you.** "Concise, complete and casual. In a single sentence, we
   know the user, the user's needs and user's justification." — X-18 (`D&C` L649-651)

### CS-6 · "I cannot cover all of these"

**Trigger.** Two or more use cases that "each one screams for completely different solutions," and
time to talk through only one. — X-20 (`D&C` L653-661)

**Strategies.**

1. **Pick one, out loud.** — X-20 (`D&C` L659-661)
2. **Score the matrix, including ease of implementation.** User Story | Revenue | Customer
   Satisfaction | Ease of Implementation | Overall. — X-21 (`D&C` L662-673)
3. **Prefer the imperfect process.** "I'd rather have an imperfect process than no process at all.
   The matrix method forces the decision maker to think and articulate what's important." — X-22
   (`D&C` L703-705)
4. **Go quantitative if you want to.** Revenue per point of effort = revenue impact ÷ engineering
   effort, where story size estimates the effort. — X-23 (`D&C` L708-711, L749-750)
5. **Know what actually settles it.** "Ultimately, the true arbiter of go versus no-go for a
   particular feature should be A/B testing." — X-22 (`D&C` L706-707)

### CS-7 · "I have no idea"

**Trigger.** Freezing on a design problem — "Most candidates freeze when they have a design problem
without a solution on the tip of their tongue." — X-24 (`D&C` L753-755)

**Strategies.**

1. **Reverse the situation.** Reversal: buyers don't have time to travel to the dealership →
   deliver test drives to the buyer. — X-25 (`D&C` L760-764)
2. **Mix attributes.** Attribute: Material × Shape × Finish × Position, then choose a combination.
   — X-26 (`D&C` L765-817)
3. **Challenge the status quo.** Why?: why should coffee cups have handles? Because cups are too hot
   to hold → mug with an insulation layer. — X-27 (`D&C` L818-826)
4. **Reach past the obvious.** Avoid "me too ideas" and "integration ideas" — both answered with
   "Yawn". "**Most employers are evaluating your creativity or product vision.**" — X-28
   (`D&C` L828-840)
5. **Get at least three, on the quality ground.** "Your first idea is rarely the best… Innovation is
   an iterative process… idea number 2 or 3 will usually be the best of the bunch." — X-29
   (`D&C` L866-872)

> **Room-ground held out.** X-29's source continues with the interpersonal argument — "it will help
> you from being defensive… if you have only one idea, you'll take it personally"
> (`D&C` L873-876). Recorded as **X-29b**, excluded from this cue's strategies.

### CS-8 · "They will criticise this"

**Trigger.** Any moment your idea is exposed — and especially the moment you have only one.
— X-32 (`D&C` L888-893)

**Strategies.**

1. **Critique it yourself first.** "If you've taken the initiative to critique your own solutions,
   the interviewer has fewer things to criticize. You'll also mentally prepare yourself for criticism
   by critiquing yourself." — X-32 (`D&C` L890-893)
2. **Lay out the trade-off.** Define criteria if it helps — customer satisfaction, implementation
   difficulty, revenue potential — then pro/cons. — X-30, X-31 (`D&C` L879-884)
3. **Bring alternatives, and the reason is that options are better work.** At least three
   (`D&C` L871-872), and not all from the two dull categories (X-28). The stated ground for having
   alternatives is that iterative invention usually improves later ideas — **not** defensiveness
   about critique. — X-29, X-29b

> **v3 correction on this cue's stated ground.** v2 listed "bring alternatives so it is not
> personal" as a strategy and cited X-29's interpersonal passage as a co-equal reason for evaluating
> trade-offs. Both were relabelled: the interpersonal part is **X-29b** (room-ground, excluded),
> and X-32's own grounding is now the on-task one — critiquing your own work surfaces objections you
> had not found. The stated perception returns ("thoughtful and analytical", "objective") are
> recorded in X-32 but are **not** the reason. See `extraction-log.md` §8, Finding 1.

### CS-9 · "How do I land this?"

**Trigger.** A recommendation exists and needs saying. — X-33, X-34 (`D&C` L895-905)

**Strategies.**

1. **Three beats, in order.** Which feature you recommend; what it is and why it benefits the user
   and/or company; why you preferred it over the others. — X-34 (`D&C` L902-905)
2. **Make the hard cut.** "Can you make the hard decision to suggest just one solution?" — X-33
   (`D&C` L901)

> **Room-ground held out.** "A short 20 to 30 second summary" (`D&C` L900-901) is a spoken-pacing
> target. Retained in X-33 as extraction; **no demand in this model turns on duration.**

### CS-10 · "I already know the answer I want"

**Trigger.** Arriving with a solution in hand. — X-35, X-36 (`D&C` L911-920)

**Strategies.**

1. **Know that this is legitimate.** "If that's the case, it's okay to have a solution in mind and
   lead your CIRCLES Method™ discussion toward it." — X-35 (`D&C` L912-914)
2. **Use it as a constraint, not a script.** "Having a solution in mind can help constrain the realm
   of potential personas, needs, and solutions, which can improve the quality of your responses."
   — X-35 (`D&C` L916-918)
3. **Or set it aside.** "I would love for you to embrace the great unknown and enjoy a design
   problem without having a solution in mind." — X-36 (`D&C` L919-920)

---

## Problem-discovery cues (new in v3)

### CS-22 · "The problem behind the complaint"

**Trigger.** A user complaint exists but the reason behind it has not been established — Lin's
framing: "**Understand Unarticulated Problems**… As part of understanding customer needs, you may
have to delve into a customer's work flow with their existing solutions. To find areas of
improvement, you'll have to understand obstacles they are facing and **gaps that existing solutions
have left open**." — X-65 (`D&C` L2029-2034)

**Strategies.**

1. **Ask the Five Whys.** "It involves iterative inquiry to
   identify a problem's root cause." — X-65, X-66 (`D&C` L2034-2037)
2. **Read the chain's end.** In the worked case the chain stops at a constraint, not a cause: "We
   could [reduce cleaning time] if we simply put inexpensive aluminum foil on the parts that get
   dirty often" → "**We can't get the procurement department to approve the purchase.**" — X-66
   (`D&C` L2047-2064)
   > *This model's reading of the worked case:* the answer that is no longer a cause is the one
   > you can act on. The source states the instrument and the example; it states **no stopping rule**.
3. **Know what it applies to — three objects.** "we'll use it diagnose problems with **processes,
   proposed innovations and existing customer solutions**." — X-67 (`D&C` L2036-2038)

> **Why this cue is new.** v1 and v2 both recorded the corpus's only "reframe with Why?" rule as
> Torres's opportunity test (`cd/01` L60-63), because `D&C` chapter 6 was logged as unextracted.
> The primary source contains a fuller, distinct technique and it is **the only
> problem-discovery instrument in the whole corpus.** Both models were missing it.

### CS-23 · "What does the ranting actually contain?"

**Trigger.** Collecting pain points before selecting any — the prompt is "Rant about organizing a
child's 1st birthday party" (`PMIV` L6388). Nothing here is an insight yet; it is structured rants.
— X-80 (`PMIV` L6386-6422)

**Strategies.**

1. **Group, then decompose, two levels deep.** Three groups in the worked case — planning
   (`PMIV` L6392), the day itself (`L6412`), other rants (`L6419`) — and each item split into
   sub-concerns that carry their own consequences. "Putting together the invite list is a hassle" →
   invite both parents and kids; don't know how many, where too few "gives others the impression
   that we don't have friends" and too many "will make the party complicated"; people who don't get
   invited will feel offended. — X-80 (`PMIV` L6393-6398)
2. **Enumerate the signals before deciding.** On "People You May Know", the answer lists what
   identifies a friend — mutual friend, same interests prioritized by how well liked they are by
   **both** A and B, same events, same pages, same school, same workplace, already known via email,
   same major, lives close, has lived where A has — and only then decides. — X-81
   (`PMIV` L6854, L6894-6904)

---

## Measurement and diagnosis cues (new in v3)

### CS-24 · "What are the metrics?"

**Trigger.** A feature or product needs measurement. — X-68 (`D&C` L3462-3468), X-71
(`PMIV` L10677-10707)

**Strategies.**

1. **Walk AARM.** Acquisition (signing up) → Activation (completing a lazy registration) → Retention
   (using the service often in a way that helps the user or the business) → Monetization
   (collecting revenue; paying users or ARPU). — X-68 (`D&C` L3462-3487); named as a *starting
   point*, not a gate, at `PMIV` L9874 (definition), L11108 ("as a starting point")
2. **Draw the Three Loops for retention.** Data loop (adding information) → Compulsion loop
   (checking frequently) → Viral loop (inviting friends), and note that they **reinforce each
   other** — that is the point, not three separate metrics. — X-69 (`D&C` L3489-3513)
3. **Let the business model pick the top metric, and say why.** eCommerce: GMV, because VC needs
   multiple returns to cover failed ventures, so it must dominate and gain brand power, logistics
   infrastructure and supplier negotiation power. Two-sided marketplace: **supply-side capacity** —
   drivers, listings, rentals — because it means coverage with low wait times and fewer "zeroes"
   (a passenger who opens the app and cannot find a driver). — X-71 (`PMIV` L10677-10707,
   L10774-10792)
4. **Commit, and cut scope to make the commitment real.** Named defect: "Not committing to a
   particular goal"; the worked answer narrows to one feature — "Which feature do you want me to
   focus on? I would pick text messaging." — X-70 (`PMIV` L11113 (the defect), L11131 (the worked narrowing)). The opposite defect
   is equally named: "Giving a short, uninspiring response (e.g. 'I'd go with profits.')"
   — X-73 (`PMIV` L10710-10713)

### CS-25 · "This metric dropped — why?"

**Trigger.** A metric went the wrong way and the cause is unknown. — X-74 (`PMIV` L10901-10939)

**Strategies.**

1. **Decompose the metric into a structured tree, then walk every branch.** Geography (US /
   international), device (desktop / mobile / tablet), browser (Chrome / Safari / Firefox), traffic
   source (paid search, unique views, direct traffic, landing pages), then down the funnel —
   "add to cart", "unsupported payment type". — X-74 (`PMIV` L10901-10939)
2. **Keep the top metric's own drawbacks on the list.** For GMV: it "does not factor in customer
   acquisition cost", "does not consider cost of sales or other margin information", and "may not be
   correlated with cash flow" — tracked separately as the mitigation. — X-72 (`PMIV` L10758-10772)

### CS-26 · "We are entering somewhere new"

**Trigger.** Launching into a market the product does not already serve. — X-75
(`PMIV` L14292-14330), X-76 (`D&C` L3953-3993)

**Strategies.**

1. **Start where you already operate heavily and the category already has usage — the US is often
   not it.** "Since Expedia.com operates globally, I would start by focusing on countries with high
   consumer train usage. **The US is not one of them.**… I would first pick a country Expedia already
   operates heavily in with a lot of consumer train usage and then do a launch there. From there, we
   can improve how we operate and open it up to the world country by country." — X-75
   (`PMIV` L14323-14328)
2. **Ask the acquisition and relationship questions before the plan.** "Do we know how to
   efficiently acquire customers?", "Does Expedia have relationships with train travel providers? If
   not, can it easily obtain relationships?", "How can they get the travel provider data? Will the
   data be fresh?" — X-75 (`PMIV` L14299-14307)
3. **Price on willingness to pay, and distrust survey optimism.** "the most important number to know
   is the customer's **willingness to pay**" — from-scratch price for a new category, competitor
   price plus parity additions for an existing one. Vary price points in practice; if you cannot run
   real-time experiments, "you can survey customers instead. But note that surveys can lead to
   **overly optimistic predictions** on price points and volume." — X-79 (`D&C` L3282-3297)
4. **Use pro/con for strategy, and price the cost in time.** "the most prevalent and satisfying
   analysis tool" — but across three to five dimensions "this analysis would easily consume two to
   four minutes." — X-77 (`D&C` L3861-3869)

> **Out-of-scope boundary.** CS-26's strategies 3 and 4 come from new-market entry, pricing and
> corporate strategy — adjacent to, not inside, this model's declared scope. They are cues because
> v2's gap note wrongly denied the material existed; **no decision demand is built from them** (see
> `decision-model.md` D-33–D-35 and `source-map.md` G-10). CS-27 is **not** out of scope. X-75's
> data-difficulty point —
> "Not appreciating how hard it is to get train data" / "fresh and accurate data" / "how complicated
> is to calculate possible trip permutations" (`PMIV` L14312-14320) — *is* in scope, because it
> changes what a launch plan commits to.

---

## Discovery cues (the continuous-discovery corpus)

### CS-11 · "Is this evidence or a belief?"

Generate opportunities **only from stories** — X-40 (`cd/01` L64-66). Sales calls, support
tickets, feature requests and analytics are **inspiration for the next interview, not tree input**,
because they lack context — X-40 (`cd/01` L66). Priors are excluded outright, because they "bring
biases and half-truths" — X-40 (`cd/01` L65).

### CS-12 · "How many stories is enough?"

Three to four. Under it you overreact to one; over it you cause analysis paralysis — X-41
(`cd/01` L70, L94).

### CS-13 · "Opportunity or feature want?"

"Users want better recommendations" is a want; "users need continuity across contexts" is a job.
Then the test: **is there more than one way to address it?** If not, it is a solution in disguise —
reframe with **"Why?"** until there is — X-44 (`cd/01` L60-63).

> **Object discipline, now two-part.** CS-13 is Torres's test on an **opportunity** (continuous
> discovery). CS-5 is Lin's method for **reporting a need** (design interview). They are different
> objects and neither substitutes for the other — X-44, `source-map.md` C-5. CS-22 is a third and
> separate thing: a **root-cause instrument** for the problem behind a complaint, and not a framing
> test for tree input.

### CS-14 · "Can I ship more than one at a time?"

One solution in flight moves the loop; test **sets** of solutions against the same opportunity to
find a clear frontrunner, because working one idea at a time sets you up for confirmation bias —
X-46 (`cd/01` L44, L85-86; `cd/02` L54).

### CS-15 · "What is worth building at all?"

Hold all four risks — valuable, usable, feasible, viable — early, with **viability the PM's**,
usability the designer's, feasibility the tech lead's — X-47 (`svpg/02` L81, L97-100). **Feasibility is a
checkbox**, not a gate — X-50 (`circles/03` L33, L52). **Viable** = will people or companies pay to
have this solved at scale — X-48 (`svpg/01` L48; `svpg/02` L33). **Lovable** = fits where users
already work without a new habit — X-49 (`circles/03` L23).

### CS-16 · "What is the outcome?"

**Product outcome** — customer behaviour or sentiment in the product. Not a business financial
metric (a team cannot reliably influence it), not a traction metric on one feature (too narrow) —
X-43 (`cd/01` L52-56). Business value leads, because creating it earns the right to serve the
customer over time — X-43 (`cd/01` L54). **One outcome per team.** New tree when the direction
changes, not the number — X-42 (`cd/01` L93).

### CS-17 · "How do I rank these?"

Score impact per unit of time. Keep impact deliberately blunt — 3, 2, 1, half, quarter — X-52
(`rice/01` L27). Stack order, **no ties** — X-53 (`rice/02` L10). A score is a hypothesis: sort,
then re-evaluate, and be willing to conclude the gut is wrong — X-52 (`rice/01` L41). RICE is not for
acquisitions or pricing — X-55 (`rice/02` L62).

### CS-18 · "Is this shippable?"

Set an **appetite** first and let the design fall out of it — the reverse of estimating. **Fixed
time, variable scope**: the deadline forces the trade-offs, the variable scope lets the team make
them — X-57 (`shape-up` L40-44, L71).

### CS-19 · "Is this shaped well enough to hand over?"

Neither a wireframe (over-specifies, hides difficulty behind a "just so" interface) nor bare words
(under-specifies, marks nothing out of scope). Breadboard words or fat marker sketches. Find the
rabbit holes first. Hand over rough, solved, bounded work with No Gos — X-58 (`shape-up` L30-37,
L48-53, L56-61).

### CS-20 · "When is this done?"

Compare to **the baseline customers have today, not the ideal**. Hammer the scope. Tilde the
nice-to-haves. Cutting scope is not lowering quality. Extension is rare and diagnostic — a
cool-down means the shaping was wrong — X-59 (`shape-up` L101, L110-115).

### CS-21 · "Can this team actually act?"

One cross-functional team for both discovery and delivery. The test of empowerment: the team **can
decide the best way to solve the problems it was assigned** — X-60 (`svpg/05` L44). If one group
obtains the learnings and another executes, you get **missionaries, not mercenaries** — X-61
(`svpg/05` L36; `svpg/06` L19-21). The standing check on your own team: are you staffed with
competent people with character, skilled across the competencies you need — X-62 (`svpg/05` L58).
Hiring is the staffing manager's job, not yours — **this model's inference**, not a sentence in the
source: `svpg/05` L40 assigns vision to people managers, L42 assigns sourcing, recruiting,
interviewing and on-boarding to staffing, and L43 notes "PMs to managers of product management".
X-62 (`svpg/05` L40, L42-43).

### CS-27 · "I have been defending my first position"

**Trigger.** Having committed to an answer, and being pressed on it. — X-78
(`D&C` L3912-3920, L3942-3947)

**Strategies.**

1. **Commit first, hard.** "be decisive and have hard conviction behind a single position" — while
   staying factual, "because subjective statements invite skepticism particularly if they're not
   backed with evidence." — X-78 (`D&C` L3912-3920)
2. **Then be able to abandon it.** When asked to argue the opposite side, the disposition being
   tested is whether you "can see both sides of the issue, adapt to change and leave behind a
   preconceived notion of what should have been done." — X-78 (`D&C` L3942-3947)

> **Room-ground held out.** The source's framing is about a reader — "The interviewer will note
> candidates who refuse to commit one way or the other" (`D&C` L3919-3920), "The interviewer is seeing
> how quickly a candidate can abandon…" (`D&C` L3943-3944). The strategies above are the disposition,
> not the observation.

### CS-28 · "I have described an idea in general terms"

**Trigger.** The answer names a solution without showing how it would work. — X-88 (`PMIV` L9015-9017,
L8537-8538, L8877-8878, L9021, L8300)

**Strategies.**

1. **Name a specific scenario and a specific customer problem.** "Not picking a specific scenario and /
   or customer problem, leading to generic solutions." — X-88 (`PMIV` L9021)
2. **Show the implementation.** "Proposing a magical solution without going into the implementation
   details" is the defect — "Yelp will magically find the best local service … Just press the 'I'm
   Feeling Lucky' button" — and "Suggesting an auto-recommender feature and being vague about the
   implementation by stating 'machine learning' is the solution, without going into details." — X-88
   (`PMIV` L9015-9017, L8877-8878)
3. **Claiming a UX improvement is not showing it.** "Claiming one can improve the UX, without showing
   how." — X-88 (`PMIV` L8537-8538)
4. **Use the product's own words.** "Using the wrong terminology, such as calling a pin or save a
   retweet." — X-88 (`PMIV` L11912)

> **New in v4, and missed entirely by v1–v3.** The corpus names vagueness as a first-class failure.
> Neither the original seven-step reading nor this build's earlier passes treated "be specific" as a
> judgement with its own trigger. It is the sharpest single demand in the chapter.

### CS-29 · "My idea is safe and small"

**Trigger.** A solution that would not embarrass anyone. — X-89 (`PMIV` L7056, L7893, L7897, L7901,
L7608, L7525-7526, L9374, L8718, L8041)

**Strategies.**

1. **Reach past the obvious fix.** "Considering only superficial problems such as removing ads";
   "Considering only superficial needs such as 'User needs the ability to share photos'"; "Suggesting
   half-hearted ideas like make the button more visible or colorful." — X-89 (`PMIV` L7897, L7901,
   L7608)
2. **Go further on the answer you have.** "Not thinking creatively or big enough" (L7056); "Failing to
   come up with a big, game-changing idea" (L9778); "Thinking small by suggesting underwhelming
   adjacent features" (L7525-7526).
3. **Bring an audacious option.** "Most companies, especially Google, would strongly prefer to hear one
   audacious, moonshot idea than ten good ideas." — X-89 (`PMIV` L8722-8723)
4. **Know the space so originality is real.** "Suggesting an idea that already exists" (L8304);
   "Incorrectly assuming a complete and accurate understanding of how Pinterest works" (L8164);
   "Overlooking traditional alternatives like hotels" (L5883); "Copying competitor's innovations … is
   a sign of an unoriginal and uncreative candidate" (L9246-9247); "Picking a trite example such as
   iPhone" (L9374).

> **The corpus states this as ambition, not risk-taking.** Every instance is a *content* defect —
> nothing here concerns how the answer sounded. This is the largest in-scope cluster the earlier
> passes never extracted: 18 defects here, plus 6 more on staying inside the object asked about
> (**X-89**) — 24 in all.

### CS-30 · "I answered a different question"

**Trigger.** The answer is coherent but answers something other than the prompt. — X-89, X-90 (`PMIV`
L6016-6017, L7428, L7801-7802, L11814-11815, L11881, L12025)

**Strategies.**

1. **Draw the map that was asked for.** "Accidentally drawing the employer journey map when the
   interviewer is asking for the candidate journey map." — X-89 (`PMIV` L6016-6017)
2. **Work the layer the question is about.** "Incorrectly focusing on the UX, not algorithm, design."
   — X-89 (`PMIV` L7428)
3. **Do not narrow the object without reason.** "Automatically assuming that this is about improving
   Bing.com. The prompt is really about helping the salesperson in general." — X-89 (`PMIV`
   L7801-7802)
4. **Keep the analysis inside its boundary, on both sides.** "Focusing too much on low value-add items
   such as whether the driver offers water to its riders" (L11814-11815); "Not considering non-Amazon
   issues, such as slow Internet connectivity" (L11881); "Not mentioning a complete set of go-to-market
   metrics" (L12025).

> **Distinct from CS-1.** CS-1 fires on *too much* framework. CS-30 fires on *the wrong object*. Both
> are answered by the governing demand, and the corpus names each separately.

### CS-31 · "I am reasoning inside a frame we have not agreed"

**Trigger.** About to reason on a term that carries more than one reading. — X-90 (`PMIV` L12020-12021,
L9495, L9366, L9774)

**Strategies.**

1. **Establish the shared frame first.** "'Go-to-market' can have differing interpretations. Many
   candidates assume that they share a common understanding with the interviewer." — X-90 (`PMIV`
   L12020-12021)
2. **Fix what the criterion means before scoring against it.** "Not aligning with the interviewer on
   what constitutes 'favorite' website." — X-90 (`PMIV` L9495)
3. **Lead with the instrument.** "Not providing a scorecard upfront." — X-90 (`PMIV` L9366)
4. **Answer every part asked.** "Answering part 1 and not part 2. Or vice versa." — X-90 (`PMIV`
   L9774)

### CS-32 · "A constraint is in the prompt and I have not used it"

**Trigger.** The question states a limit, an objective or a dependency, and the answer ignores it. —
X-91 (`PMIV` L7797, L9770, L9539, L14471)

**Strategies.**

1. **Apply the stated limit.** "Not factoring in the 30-minute constraint." — X-91 (`PMIV` L7797)
2. **Meet the stated objective.** "Coming up with ideas that don't meet the 3X revenue objective." —
   X-91 (`PMIV` L9770)
3. **Raise safety where safety is the risk.** "Not mentioning safety issues." — X-91 (`PMIV` L9539)
4. **Name the dependencies.** "Missing critical dependencies such as driver availability." — X-91
   (`PMIV` L14471)

> **New in v4.** Safety and dependencies entered the model here. No earlier pass carried either as a
> named judgement, and neither is prominent in the `D&C` material the model otherwise rests on.

### CS-33 · "I have not looked at the customer closely enough"

**Trigger.** A persona, a cohort or a customer journey treated as a label rather than as a read on
behaviour. — X-92 (`PMIV` L9241-9242, L5816, L5887, L5891, L6023, L6027, L7701)

**Strategies.**

1. **Depth is what unlocks the idea.** "Not empathizing with the customer deeply enough, limiting your
   ability to come up with innovative ideas." — X-92 (`PMIV` L9241-9242)
2. **Walk the experience, not the org chart.** "Not checking whether one has reviewed each step of the
   customer experience." — X-92 (`PMIV` L5816)
3. **Get the model right before the cohort.** "Forgetting that Airbnb is a marketplace and customers
   interact with hosts"; "Not acknowledging that new users may not feel 100% confident with Airbnb's
   concept." — X-92 (`PMIV` L5887, L5891)
4. **Read the attributes that change the design.** "Not taking into account the career level of the job
   seeker"; "Not considering that a job seeker may eventually leave his or her job"; "Assuming user
   engagement is identical for 3 and 15 second videos." — X-92 (`PMIV` L6023, L6027, L7701)

### CS-34 · "My design answer will not explain itself"

**Trigger.** Proposing a design without the reasoning that makes it legible. — X-93 (`PMIV` L6975,
L6971, L6979-6980, L8647)

**Strategies.**

1. **Explain the critical choices.** "Missing commentary that explains critical design choices, despite
   detailed and visually stunning designs." — X-93 (`PMIV` L6975)
2. **Do the design work the question implies.** "Fear of wire framing." — X-93 (`PMIV` L6971)
3. **Justify the unconventional choice.** "Drawing out unconventional UI interfaces … especially if
   there is no reason to do so." — X-93 (`PMIV` L6979-6980)

> **The mirror of CS-1.** CS-1 fires when the whole framework is run regardless of the question. CS-34
> fires when the question's own work is done but not explained. The corpus names both; the model
> holds both.

### CS-35 · "My data assumption is doing more work than my analysis"

**Trigger.** A recommendation whose feasibility rests on data nobody has established exists. — X-92
(`PMIV` L14312, L14316, L14320)

**Strategies.**

1. **Price the data, don't assume it.** Three distinct lines in one block: "Not appreciating how hard
   it is to get train data"; "Not appreciating how hard it is to get fresh and accurate data"; "Not
   appreciating how complicated is to calculate possible trip permutations." — X-92 (`PMIV` L14312,
   L14316, L14320)

> **Confirms and widens X-75**, which already carried all three together. The second and third are
   separable judgements: freshness is a different problem from acquisition, and combinatorial cost is
   a third.
