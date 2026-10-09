# Extraction Log — product manager

**Phase:** P2 Extract
**Input:** `source-map.md`
**Corpus:** the product-management knowledge base — **24 knowledge files** under
`intent/knowledge-base/` (25 including the `sources.md` provenance index).
**Rebuild:** second pass, 2026-10-01, after the two Lewis C. Lin books were ingested. See
`build-report.md` for why the first pass was superseded.

---

## §0 Citation key

Short forms used throughout this log and the models. Every short form resolves to one
knowledge-base file.

| Short form | File |
|---|---|
| `circles/01` | `circles/01-circles-official-what-each-step-does.md` |
| `circles/02` | `circles/02-decode-and-conquer-intro.md` |
| `circles/03` | `circles/03-circles-worked-example.md` |
| `circles/04` | `circles/04-circles-logrocket-guide.md` |
| `circles/05` | `circles/05-circles-productschool-guide.md` |
| `circles/06` | `circles/06-circles-prodpad-glossary.md` |
| **`D&C`** | **`circles/07-decode-and-conquer-2nd-ed-full-text.md`** — *Decode and Conquer*, 2nd ed., full text, 5,785 lines. **Primary source for CIRCLES.** |
| **`PMIV`** | **`circles/08-product-manager-interview-full-text.md`** — *The Product Manager Interview*, full text, 16,354 lines. Practice and proficiency layer. |
| `svpg/01`–`svpg/08` | `product-model-svpg/01`–`08` |
| `cd/01`–`cd/03` | `continuous-discovery/01`–`03` |
| `prio/01`–`prio/04` | `prioritization/01`–`04` |
| `rice/01` | `prioritization/01-rice-origin-intercom.md` (McBride/Intercom) |
| `rice/02` | `prioritization/02-rice-guide-productteacher.md` |
| `shape-up` | `shape-up/01-shape-up-book.md` |

Line numbers in `D&C` and `PMIV` are lines of the extracted text file in this knowledge base.
They are **not** printed-book page numbers; each file carries `<!-- page N -->` markers giving the
PDF page position.

**Authority order for CIRCLES content.** `D&C` is the book in which Lin creates and teaches the
method (`D&C` L511). Where `D&C` speaks, it is primary. `circles/01` and `circles/02` are Lin's own
public statements and corroborate it. `circles/03`–`circles/06` are third-party guides with no
authority over Lin's method.

---

## §1 The finding that reframes the whole model

**X-1. Blind framework-following is the failure signal.** Lin states it as a warning about his own
method: "Whether it's the CIRCLES Method™ or a different design framework, **don't blindly follow
it.** It'll sound scripted." — `D&C` L1933-1936

> **The reported reaction, recorded and set aside.** The passage continues that such a candidate
> would "react to candidates that sound robotic. Some will label the person as over prepared. Others,
> like me, would fear that the candidate is inexperienced" (`D&C` L1940-1943). That is a judgment
> about how a listener reads a person — **room-ground, not product judgement.** The rule "don't
> blindly follow it" stands on the work-side defect named at **X-64** (over-application when the
> question is plainly narrower). See §8, Finding 1.

**X-2. The contrast candidate — one question, reacted to, then explored.** The worked contrast asks
one question, reacts genuinely ("That's fascinating. I can see why they would find feature X
valuable. However, it doesn't quite sound like the product meets their needs"), and asks to explore
further. — `D&C` L1941-1948

> **What follows in the source is room-ground.** "The interview is about establishing credibility and
> likability. Interviewers don't like robots. They like candidates that have personality and are
> similar to the interviewer" (`D&C` L1949-1952) is a claim about interviewer preference and is
> **not** used as a product criterion. What is carried is the on-task behaviour: ask, react to what
> you were given, chase the gap you noticed.

**X-3. What a framework is for.** "The interviewer is looking for problem solvers who can think
critically. **Frameworks are meant to be a memory aid. Adapt to your specific interview question.**
Interviewers can tell when you used a hammer when a scalpel would have sufficed." — `D&C` L1953-1957
Corroborated at `D&C` L515-517: "CIRCLES Method™ is a guideline on what makes a complete,
thoughtful response any design question. It's a memory aid that prevents us from forgetting a step."

**X-4. The same rule as a proficiency ladder.** "A novice follows the CIRCLES Method™ step-by-step,
like a home cook trying to make a sophisticated soufflé for the first time. The novice is afraid of
making mistakes and clings tightly to a prescribed framework. The novice is so busy trying to
recall the different steps of the CIRCLES framework that the novice's responses sound robotic and
textbook. **The expert understands that a framework is a checklist, not a recipe.** The expert
understands that CIRCLES is there to prevent errors of omission." — `PMIV` L1808-1812

> **Consequence for the model — restated in v3.** X-4 states the rule as a matter of *method*, not
> of delivery: "The expert understands that a framework is a checklist, not a recipe… there to
> prevent errors of omission." Every step below is subordinate to **coverage judged against the
> question**, and the demand is about which steps this question needs — not about whether the
> response reads as a conversation between peers. **The v2 wording rested on X-1's interviewer-reaction
> evidence and is withdrawn.** See §8, Finding 1.

---

## §2 Why the method exists — the four stumbles

**X-5. Product-design questions are the most dreaded, and candidates stumble in four ways.**
"Reasons Why Candidates Stumble: **Starting.** I can't tell you how many times I receive that 'Oh,
no!' deer in headlights look. **Rambling.** The candidate doesn't have a clue how to answer. He
tries to improvise a solution as he is talking. It's painful for the listener. **Ending the
response.** Candidates find it uncomfortable to stop, unsure if the interviewer is satisfied with
his answer. **Focusing on the solution only.** Giving a solution without the appropriate context
begs the question, 'Why?' The listener doesn't know who the intended customer is or what problem
the product solves. And it's not clear why this is the best solution, relative to other
possibilities." — `D&C` L500-510

**X-6. The method is the answer to those four, and it is general.** "I created the CIRCLES Method™
to answer any design question. Use it for questions on how you would design a new desktop,
website, or mobile application. You can even use it to design new consumer products like a car,
camera or can opener." — `D&C` L511-514. The mnemonic is that designers love circles (`D&C`
L518-519).

**X-7. Naming the acronym aloud is the tell.** `circles/03` L48 independently records that
announcing "now I'll move to the L step" marks someone who has read a checklist rather than
practised. `D&C` L1935-1939 supplies the primary-source instance: the candidate who opened by
enumerating the seven steps in order.

---

## §3 The seven steps, as Lin teaches them

### C — Comprehend the Situation (`D&C` L534, L542-579)

**X-8. Admit ignorance first.** The anecdote: a candidate asked to improve Windows 8, stopped 45
seconds in, "rambled and used nonsense phrases like 'Windows 8 deepens customer empowerment.'" Asked
whether she had used Windows 8: "Never. I use a MacBook Air." "I don't want anyone performing
open-heart surgery if he or she doesn't know what the heart looks like. **If you don't know the
product, speak up. It's not fair for you to discuss a product you don't know.**" — `D&C` L543-551

**X-9. You are entitled to ask.** "You're entitled to ask the interviewer clarifying questions."
— `D&C` L552-553

**X-10. The full list is the 5W's and H.** What is it? Who is it for? Why do they need it? When is
it available? Where is it available? How does it work? "This list of basic questions is frequently
called the '5W's and H.'" — `D&C` L555-564

**X-11. But you start with four.** "However, the interviewer may not have patience for you to ask 101
questions about the product. **To start the interview, you really just need answers for the four
bolded questions: what is it, who is it for, why do they need it, and how does it work? So we'll
call our version the '3W's and H.'**" — `D&C` L564-568

> **This overturns the previous build.** The first pass ruled for "one clarifying question,"
> taking the most recent third-party source (`circles/03` L13, L37) over the older guides. Lin's
> own text gives a specific number: **four**, named explicitly. The 5W's and H is not the
> contradicted claim — it is the full list Lin names at `D&C` L564, and Lin himself calls it that.
> Both third-party guides were partly right; the first pass mis-ranked them.

**X-12. If refused, assume out loud.** "If the interviewer refuses to answer your clarifying
questions, make an assumption based on what you know. **Then, give the interviewer an opportunity to
correct you**, in the event he thinks differently about whom it is for or how the product works."
— `D&C` L569-572

**X-13. Show the artefact.** "I also recommend that you pull up the website, mobile app or
application. A visual improves communication. And who knows, since we live in the world of rapid
experimentation, the website that you saw yesterday may have changed today. Or if you're talking
about a product that the interviewer is working on, it's possible they use a beta version
internally, which is completely different from what you use. **It would be lethal if you and the
interviewer were thinking of different things.**" — `D&C` L573-579

### I — Identify the Customer (`D&C` L535, L581-628)

**X-14. The reason is product quality, not segmentation theory.** "There's no magical device that
does everything for everyone. But that hasn't stopped companies from trying to build all-in-one
devices. As sexy as they sound, more often than not, all-in-ones usually aren't very good. **During
the interview, you want to propose an amazing product, not a mediocre one. To do so, focus on a
single customer segment or persona.**" — `D&C` L582-586

**X-15. Choose one and explain it.** List candidate personas — food lovers, soccer moms, college
students, small business owners (`D&C` L587-592) — then "Time is limited, so choose one persona to
focus on. **The interviewer may not be familiar with your chosen persona; help them comprehend whom
you are talking about.**" — `D&C` L596-598

**X-16. The 2x2 is Lin's own device.** "A 2x2 matrix is a powerful way to visualize it." The worked
persona "Kat, the traveling reader" is described on two axes — **Behaviors** (goes on vacations with
books; travels four times a year; carries four books per trip) and **Demographics / Needs & Goals**
(55 year old, single female, Hoquiam, Washington, income $70,000 USD; discover new books; discuss
books with others; write a book one day). — `D&C` L598-628

> Note against `circles/03` L15: the first pass recorded the criterion as "a cohort defined only
> demographically is **unfalsifiable**." Lin does not reject demographics — he **puts them in the
> matrix** (`D&C` L612-626) alongside behaviour. The first pass's framing survives only as the
> third-party claim it was.

### R — Report the Customer's Needs (`D&C` L536, L630-651)

**X-17. It is a user story.** "The third step of the CIRCLES Method™ is reporting the customer's
needs. You can call it user needs, user requirements, or use cases. In modern product development,
the use case format is a popular way to capture user needs. **A user story conveys what the end
user wants to do in normal everyday language. It does not describe how the solution works.**" — `D&C`
L631-635

**X-18. The template, and what one sentence buys.** "As a `<role>`, I want `<goal/desire>` so that
`<benefit>`." The two worked stories, both on Kat: "As a traveling reader, I want to get
recommendations so that I read books that are either well-written or are good examples of my
favorite genres" and "As a traveling reader, I want to write 500 words a day so that I can publish
my memoir." "User stories have become popular because they are **concise, complete and casual**. In
a single sentence, we know the user, the user's needs and user's justification." — `D&C` L636-651

**X-19. This is the direct answer to "solution only."** The two stories above "each one screams for
completely different solutions" (`D&C` L653-654) — which is precisely the contrast with the fourth
stumble at `D&C` L507-510.

> **This overturns the previous build.** The first pass recorded Report as "name the underlying
> **job, not the feature want**," sourced to `circles/03` L17 and `cd/01` L60-63. That is Teresa
> Torres's *opportunity* concept, not Lin's Report step. The two were fused. They are different
> acts on different objects, and the model now keeps them apart — see X-44.

### C — Cut, Through Prioritization (`D&C` L537, L652-750)

**X-20. The situation it is cutting.** "Looking at our 'book discovery' and 'write a book' use
cases above, each one screams for completely different solutions. **The prioritization step mimics
the real world development process.** You'll have a big backlog of use cases, but you're limited by
time, money, and labor. Which one do you do first? **In the interview, you don't have time to talk
through all use cases. So you'll have to pick one.** When you make your choice, it's an opportunity
to showcase your ability to prioritize, assess trade-offs and make decisions." — `D&C` L653-661

**X-21. The cut matrix — effort is IN.** Columns: **User Story | Revenue | Customer Satisfaction |
Ease of Implementation | Overall.** — `D&C` L662-673

**X-22. Why a matrix at all.** "Real world prioritization is not that different from the matrix
above. That is, it's based on **subjective criteria, weights and grades**. Despite some flaws, I
feel the matrix is effective. **I'd rather have an imperfect process than no process at all. The
matrix method forces the decision maker to think and articulate what's important.** Is revenue more
important? Or is customer satisfaction? **Ultimately, the true arbiter of go versus no-go for a
particular feature should be A/B testing.**" — `D&C` L699-707

**X-23. The quantitative form.** "If you're looking for an even more thoughtful and quantitative
approach to prioritization, you could estimate the revenue impact and investment, measured in
engineering effort. From there, you can calculate ROI-like metric, which I call **revenue per point
of effort**." Worked: "Write a book" $500,000 revenue / story size 8 / $62,500 / priority 1; "Book
discovery" $20,000 / 2 / $10,000 / priority 2. Note: "'Story size' is a metric to estimate the
engineering effort necessary to complete a story." — `D&C` L708-750

> **This overturns the previous build, and resolves the apparent contradiction.** The first pass
> recorded a universal rule sourced to `cd/01` L79-80: **"Effort is excluded from opportunity
> assessment and belongs to solution evaluation."** Lin's Cut step puts **Ease of Implementation
> straight into the cut matrix** (`D&C` L662-673). These are not in conflict once the objects are
> named: a **user story is already a scoped thing to build**, so effort is knowable and belongs in
> the cut; an **opportunity is not yet scoped**, so Torres excludes effort because an opportunity
> assumed too hard may have a dead-simple solution (`cd/01` L79-80). The first pass had no way to
> see this because it had collapsed both into one "prioritisation" decision.

### L — List Solutions (`D&C` L538, L752-876)

**X-24. The failure is freezing.** "Most candidates freeze when they have a design problem without
a solution on the tip of their tongue. Brainstorming frameworks can help overcome designer's block.
**Here are my three favorites:**" — `D&C` L753-759

**X-25. Reversal method.** "Reversing the situation helps uncover new possibilities." Worked: "Create
a new car buying experience. **Need:** Buyers don't have time to travel to the car dealership.
**Solution based on reversal:** Dealership should deliver test drives to the buyer's home." — `D&C`
L760-764

**X-26. Attribute method.** "List all the product attributes. Mix and match to get interesting new
combinations." Worked on a laundry hamper, four attribute families — **Material** (Wicker, Plastic,
Paper, Metal) × **Shape** (Square, Cylindrical, Rectangle, Hexagonal, Cube) × **Finish** (Natural,
Painted, Clear, Neon) × **Position** (Sits on floor, On ceiling, On wall, On door, Basement chute).
"Solution based on attributes: I suggest we build a rectangle, plastic hamper with a natural finish
that can be mounted on the door." — `D&C` L765-817

**X-27. Why? method.** "Challenge the status quo." Worked: "Design a new coffee cup. **Start by
challenging the status quo: Why should coffee cups have handles? Because cups are too hot to hold
directly. Solution based on Why? Method: Create a coffee mug with an insulation layer.**" — `D&C`
L818-826

**X-28. Tip #1 — Think big, and the two dull categories.** "Your typical candidate usually list
solutions that fall into one of two categories: **Me too ideas.** For example, 'As the Google+
product manager, I would create a new feature that's similar to Facebook's groups feature.' Yawn.
**Integration ideas.** For instance, 'As the Google product manager, I would integrate YouTube with
Android.' Yawn. As part of the interview, **most employers are evaluating your creativity or
product vision.** They're looking for product managers that can see future trends, both in
technology and customer behavior. They expect those product managers to plot and execute a plan that
exploits that trend, for the company's benefit." — `D&C` L828-840

The trend exemplars are given as big, audacious bets: Google's $4.6 billion 2008 wireless-spectrum
bid, made with no wireless experience, which lost the auction but won FCC open-access rules worth
billions, "for free" (`D&C` L843-850); and Facebook Connect, which let Facebook track user behaviour
across the web to build better products and target ads more precisely — "Better ad targeting can
easily lead to a 500 percent increase in revenue" (`D&C` L854-865).

**X-29. Tip #2 — at least three ideas, on the quality ground.** "**Great innovators know that your
first idea is rarely the best.** Why? **Innovation is an iterative process.** As you learn more about
customer needs and competitive products, your proposed solutions will be more precise and focused.
You'll avoid ideas that have failed in the marketplace. **At the interview, brainstorm at least
three ideas.** It's hard but it'll be worth it. You'll find that idea number 2 or 3 will usually be
the best of the bunch." — `D&C` L866-872

> **Second ground, recorded and set aside as room-ground.** The same paragraph continues: "Also, it
> will help you from being defensive during the interview… If you have only one idea, you'll take
> it personally" (`D&C` L873-876). This is real advice but its ground is the interviewer's
> reaction, not the product decision, so it is carried at **X-29b** and is not a pass condition in
> the model. See §8.

**X-29b. The interpersonal ground (room-ground; not a product criterion).** "Also, it will help you
from being defensive during the interview. The interviewer will critique your idea. If you have only
one idea, you'll take it personally. If you have multiple ideas, you'll be more comfortable because
you'll have other solutions to prove your self-worth." — `D&C` L873-876

**X-63. Adapting beats strict compliance, stated twice and once as an explicit standard.** Lin
marks a candidate for metrics work and notes: "**Notice how the candidate didn't strictly follow the
AARM Method™. That's okay. The goal of frameworks is to serve as a mental checklist for a complete
response, not to recite it verbatim at the interview. Adapt the framework as you see fit.**"
— `D&C` L3660-3663. The same judgment appears in the book on a *design* answer: a candidate who
"does a good job using the CIRCLES Method™ design and AARM Method™ metrics framework, **without
sounding mechanical**" (`D&C` L3845-3850). And on the framework's own terms: "Frameworks are meant
to be a memory aid. Adapt to your specific interview question." — `D&C` L1953-1955

> **What survives of the scripted-delivery warning, and on what ground.** The rule that survives is
> **adapt the framework to the question rather than recite it verbatim**, stated as a primary-source
> standard (`D&C` L3660-3663) and marked satisfied on a design answer (`D&C` L3845-3850). The
> reasoning that does **not** survive is Lin's evidence for it — interviewer impressions
> ("over prepared", "fear the candidate is inexperienced", "establishing credibility and
> likability", "similar to the interviewer") at `D&C` L1940-1952. Those are judgments about a
> candidate in a room, not about a product decision. See §8, Finding 1.

**X-64. Over-application is its own named defect.** Two independent instances in the practice
material, and both are about the *work*, not about a listener:

- On a question that is plainly about implementation, one listed common mistake is "**Using all seven
  steps of the CIRCLES Method™ especially when it is clear that this is strictly about
  implementation.**" — `PMIV` L6875-6876
- Two more listed on a journey-map question: "**Not adapting frameworks to a specific
  situation**", and "**Using a framework in a way that feels generic and forced.**"
  — `PMIV` L5808-5813

> **This overturns the previous build.** The first pass ruled for "two or three, not ten or more,"
> and reduced idea-count to a device for "are the options actually different" (`circles/03` L21).
> Lin says **at least three**, and gives **two** reasons the first pass had none of: quality
> (innovation is iterative, so the first idea is uninformed) and **interpersonal** (one idea means
> you take critique personally). The protection reason is the operative one in an interview.

### E — Evaluate Trade-offs (`D&C` L539, L878-893)

**X-30. Defining criteria is optional and named as such.** "The sixth step of the CIRCLES Method™
is to evaluate trade-offs. **The first part is optional: define your trade-off criteria.** Criteria
could include **customer satisfaction, implementation difficulty, and revenue potential. It's not
necessary, but it'll keep your response organized and easier to follow.**" — `D&C` L879-882

**X-31. The instrument is a pro/con list.** "The next part is analyzing the solution. **A pro and
cons list is a good way to do this.**" — `D&C` L883-884

**X-32. Why evaluating is worth the time.** The analysis earns its cost because **critiquing your
own work surfaces objections you had not found, and leaves the ones you did not find already
anticipated**: "If you've taken the initiative to critique your own solutions, the interviewer has
fewer things to criticize. You'll also mentally prepare yourself for criticism by critiquing
yourself." The stated returns — that you "come across as thoughtful and analytical" and are "perceived
as objective" — are **room-ground** and are recorded but not treated as the reason.
— `D&C` L888-893

> First-rebuild wording made the three perception returns co-equal grounds for the step. The
> relevance judge flagged this: the grounds were about appearing rigorous, not about the analysis.
> The on-task ground — finding your own objections first — is now primary. See §8, Finding 1.

> **This overturns the previous build.** The first pass recorded Evaluate as **viable / lovable /
> feasible**, sourced to `circles/03` L23, L33 and the SVPG four risks. Those are Marty Cagan's
> four risks, not Lin's sixth step — the first pass attributed another framework's content to
> CIRCLES. Lin's Evaluate names three criteria and one instrument, and "lovable" does not appear
> anywhere in it.

### S — Summarize Your Recommendation (`D&C` L540, L895-906)

**X-33. Optional — and the two things worth carrying are not the same thing.** "The seventh step of the
CIRCLES Method™ is to summarize your recommendation. **This is an optional step; sometimes the
interviewer is satisfied with a brainstorm and the pro and con analysis. But others want to test your
communication and decision making skills.**" — `D&C` L896-900. Of the two things the source then
lists, only one is product judgement:

- **Carried: "can you make the hard decision to suggest just one solution?"** `D&C` L901
- **Room-ground, dropped as a criterion: "a short 20 to 30 second summary."** `D&C` L900-901 — a
  pacing target for a spoken answer. It is retained here as extraction, but no demand in the model
  turns on hitting a duration. See §8, Finding 1.

**X-34. Three beats.** "**1.** Tell the interviewer which product or feature you'd recommend.
**2.** Recap on what it is and why it's beneficial to the user and/or company. **3.** Explain why
you preferred this solution vs. others." — `D&C` L902-905

> **This overturns the previous build.** The first pass recorded Summarize as "name the trade-off"
> and "give a metric specific enough to separate 'it worked' from 'people tried it once'"
> (`circles/03` L25). No metric appears in Lin's step. His third beat is **comparative
> justification** — why this solution over the others.

### The Tip on using CIRCLES (`D&C` L909-920)

**X-35. Solution-in-hand is legitimate and has a stated upside.** "My clients often struggle with
design questions because they're **uncomfortable exploring customers and needs without a
solution**. If that's the case, **it's okay to have a solution in mind and lead your CIRCLES Method™
discussion toward it.** It's important for you to exude confidence during the design discussion,
and if this is what makes you feel better, fantastic. **I also find that having a solution in mind
can help constrain the realm of potential personas, needs, and solutions, which can improve the
quality of your responses.**" — `D&C` L911-918

**X-36. And his own ideal is the opposite.** "Ultimately, I would love for you to embrace the great
unknown and enjoy a design problem without having a solution in mind." — `D&C` L919-920

> The first pass had no representation of this tension. It is a real judgement with two defensible
> ends, and Lin states a reason for each.

---

## §4 Proficiency — what separates novice from expert

**X-37. Novelty (room-ground framing; the on-task content is X-28).** "A novice suggests the obvious
or copies competitive features. **An expert suggests novel and memorable ideas.** An expert suggests
ideas that make the interviewer go, 'Hmm, I wish I thought of that; maybe I should build a company
based off of that idea.'" — `PMIV` L1795-1797

> The differentiator is real product content and is carried by **X-28** ("me too ideas" and
> "integration ideas" both get "Yarn"; employers evaluate creativity or product vision). The
> *"make the interviewer go hmm"* clause is room-ground and is not a pass condition. See §8.

**X-38. User empathy.** "A novice mentions shallow user insights. The novice does not take interest
in users or their motivations. The novice is deficient in user empathy. **The expert is a lifelong
learner of human psychology and behavior. An expert continually asks questions about what people do
and why they do it.** As a result, an expert easily points out insights that are **urgent,
relevant, and surprising**." — `PMIV` L1801-1804

**X-39. WITHDRAWN — preparation volume, not product judgement.** The source said: "The best
candidates will have practiced at least 20 product sense cases" (`PMIV` L1787-1788). This is volume
of exam preparation from a Day-14 study plan, and it was **extracted and cited in the first rebuild
before being checked for relevance**. It is withdrawn. See §8, Finding 1.

---

## §4a Problem discovery — Five Whys (`D&C` L2029-2069)

**X-65. What it is for.** "As part of understanding customer needs, you may have to delve into a
customer's work flow with their existing solutions. To find areas of improvement, you'll have to
understand obstacles they are facing and gaps that existing solutions have left open. Here's an easy
way to determine gaps: ask the '**Five Whys**.' This is a technique popularized by the car maker
Toyota. It involves iterative inquiry to identify a problem's root cause. In this case, we'll use it
diagnose problems with processes, proposed innovations and existing customer solutions."
— `D&C` L2029-2038

**X-66. The mechanism is an iterated why-chain, and the worked chain is five deep.** Five questions,
five answers, each paired with the issue it implies — `D&C` L2041-2068:

| Question | Answer and the corresponding issue |
|---|---|
| Why does the production line close down every third Sunday? | We have to clean the equipment. |
| Why do we have to clean the equipment? | Dirt and dust will damage critical parts, leading to more downtime if they must be replaced. |
| Why does cleaning take all day? | We have to disassemble the machine part by part and then clean all the internal parts. |
| Why can't we reduce the cleaning time? | **We could if we simply put inexpensive aluminum foil on the parts that get dirty often.** |
| Why haven't we covered the easily dirty parts with aluminum foil? | **We can't get the procurement department to approve the purchase.** |

— `D&C` L2047-2068

> **What the source states, and what it does not.** The source states the instrument — "it involves
> iterative inquiry to identify a problem's root cause" (`D&C` L2034-2037) — and then *shows* five
> rounds. **It does not state a stopping rule.** The reading that the chain has run far enough once
> the answer is no longer a cause but a **constraint** ("we can't get the procurement department to
> approve the purchase", `D&C` L2062-2064) is an inference from the worked example, and it is carried
> as this model's reading — flagged, not asserted as source. Earlier passes of this build called the
> chain "four deep" with the constraint fourth; the fifth question is at `D&C` L2062-2068 and the
> fourth answer is the aluminum-foil **solution**, not the constraint. See §8, Finding 3.

> **Why this belongs in the model and the earlier build missed it.** The first build sourced its
> only "reframe with Why?" rule to `cd/01` L60-63, Torres's opportunity test. Lin has the fuller
> technique in the primary source, framed as **part of understanding customer needs** — a product
> discovery instrument, not an interview rhetorical move. The build recorded `D&C` chapter 6 as
> unextracted (old G-9) and so never found it.

**X-67. It applies to three different objects.** Lin's own scoping: "we'll use it diagnose problems
with **processes, proposed innovations and existing customer solutions**." — `D&C` L2036-2038

---

## §4b Measurement and diagnosis — closing the old G-6

The first rebuild recorded G-6 as "no material on pricing, metrics, go-to-market or post-launch
operations". That was **stale**: the ingested `PMIV` supplies metrics, prioritisation, diagnosis and
launch content on the declared prioritisation altitude. Extracted now.

**X-68. AARM as the default metric spine.** "When asked to define metrics for a product, keep AARM
Metrics™ in mind" — **Acquisition** (signing up; the typical metric is lazy registrations),
**Activation** (completing a lazy registration to fully register — for a social site, uploading a
photo or completing a profile), **Retention** (using the service often in a way that helps the user
or the business — adding more profile information, checking the feed frequently, inviting friends),
**Monetization** (collecting revenue; number of paying users or ARPU).
— `D&C` L3462-3487; named as a starting point at `PMIV` L9874 (definition), L11108 ("as a starting point")

**X-69. Three Loops — the retention visual.** **Data loop**: adding more information (a photo, a
list of favourite movies). **Compulsion loop**: checking the application frequently. **Viral loop**:
inviting friends. And the loops are mutually reinforcing, which is the actual point: "as a single
user adds more personal information to a service, it compels their friends to check the service more
often. When the friends see the new information, the friends find the service more valuable, pushing
them to invite more contacts. And when new people join the service, they'll add more data, starting
the cycle anew." — `D&C` L3489-3513

**X-70. A strong answer commits.** The named common mistake is "**Not committing to a particular
goal**", and the worked answer narrows scope explicitly — pick one feature and say which: "Which
feature do you want me to focus on? I would pick text messaging." — `PMIV` L11113 (the defect), L11131 (the worked narrowing)

**X-71. The top metric follows the business model, and the reasoning is given.** eCommerce: venture
capital needs multiple returns to cover failed ventures, so the company must dominate the industry
and enjoy scale benefits — brand power, logistics infrastructure, supplier negotiation power — and
the metric is **gross merchandising volume**, the total sales volume in dollars flowing through the
site. — `PMIV` L10677-10707. Two-sided marketplace: **supply-side capacity is the most important
metric** — for Uber the number of drivers, for eBay seller listings, for Airbnb apartment rentals —
because more supply means better geographic coverage with low wait times, more likely matches
(Uber's "minimizing zeroes", a passenger who opens the app and cannot find a driver), and lower wait
times. — `PMIV` L10774-10792

**X-72. The chosen top metric still has named drawbacks, and they are tracked separately.**
Choosing GMV, the corpus lists: it "does not factor in customer acquisition cost", "does not
consider cost of sales or other margin information", and "may not be correlated with cash flow" —
then "We could mitigate those drawbacks by tracking those metrics separately." — `PMIV` L10758-10772

**X-73. A weak answer is the uninspiring one.** "Giving a short, uninspiring response (e.g. 'I'd go
with profits.')" — the contrast is a candidate who enumerates conversion rate, customer acquisition
cost, site traffic by source, average order size, margins, GMV, shopping cart abandonment, then
defends a choice with reasons. — `PMIV` L10710-10735

**X-74. Diagnose by decomposing the metric, not by guessing.** The method for a dropped metric is to
build a structured decomposition and explore each branch: geography (US / international), device
(desktop / mobile / tablet), browser (Chrome / Safari / Firefox), traffic source (paid search,
unique views, direct traffic, landing pages), then down the funnel to "add to cart" and "unsupported
payment type". — `PMIV` L10901-10939

**X-75. Launch sequencing — start where the category already has usage, and respect data
difficulty.** On entering a new category, the worked answer is explicit: "Since Expedia.com
operates globally, I would start by focusing on countries with high consumer train usage. **The US is
not one of them.**… I would first pick a country Expedia already operates heavily in with a lot of
consumer train usage and then do a launch there. From there, we can improve how we operate and open
it up to the world country by country." — `PMIV` L14323-14328

The prompt's own considerations are the acquisition and relationship questions that gate the plan:
"Do we know how to efficiently acquire customers?", "Does Expedia have relationships with train
travel providers? If not, can it easily obtain relationships?", "How can they get the travel provider
data? Will the data be fresh?" — `PMIV` L14299-14307

And the three named mistakes are all about underestimating data: "Not appreciating how hard it is to
get train data", "Not appreciating how hard it is to get fresh and accurate data", "Not appreciating
how complicated is to calculate possible trip permutations." — `PMIV` L14312-14320

**X-76. New-market entry runs a checklist, so the analysis can be argued with.** Market
characteristics (size, growth, profit margins, trends including changing preferences and regulatory
change), competitive environment (number of competitors, their resources, their unique competencies),
company fit (expertise, economies of scale, access to distribution, supplier relationships, related
to existing brand promise). Lin's stated purpose: the checklist "offers tangible criteria for which
the interviewer can agree or disagree with your assessment" and "makes sure that nothing is left off
of your analysis." — `D&C` L3953-3993

**X-77. Pro/con is the strategy instrument, and it costs time.** "When it comes to strategy, the
most prevalent and satisfying analysis tool is pro/con analysis… across three to five different
dimensions, this analysis would easily consume two to four minutes." — `D&C` L3861-3869

**X-78. Commit factually, then be able to abandon the commitment.** Two requirements in sequence,
from the worked Amazon strategy answer.

*Commit, and back it with evidence.* "The key is to be precise and specific, avoiding the corporate
jargon and nonsense words that cloud most corporate communications. **Stay factual, or at least
logical, because subjective statements, invite skepticism particularly if they're not backed with
evidence.** Having numbers and hard data always helps. Also, **be decisive and have hard conviction
behind a single position.**" — `D&C` L3912-3918

*Then move when pressed.* On the follow-up that asks you to argue the opposite side: "The interviewer
is seeing **how quickly a candidate can abandon your previous position, take a new position and
identify the right arguments for the opposing view.** It's testing whether a candidate **can see both
sides of the issue, adapt to change and leave behind a preconceived notion of what should have been
done.**" — `D&C` L3942-3947

> **Room-ground in this item, held out.** The source's own framing is about a reader — "The
> interviewer will note candidates who refuse to commit one way or the other" (`D&C` L3919-3920) and
> "The interviewer is seeing how quickly a candidate can abandon…" (`D&C` L3943-3944). The **content**
> carried into the model is the disposition, not the observation: decide, back it with data, and be
> able to move when the facts change. See §8, Finding 1.

**X-79. Willingness to pay is the anchor, and surveys lie optimistically.** "When it comes to
pricing, the most important number to know is the customer's willingness to pay." For a new category
it is the price of building the product from scratch; for an existing category it is the
competitor's price plus whatever additions are needed for parity. Real-world best practice is to try
different price points; if you cannot run real-time experiments, survey instead — "but note that
surveys can lead to overly optimistic predictions on price points and volume." — `D&C` L3282-3296

> **Boundary, stated honestly.** X-76, X-77 and X-79 extend past this model's stated scope of design
> questions, discovery, prioritisation and shipping, into new-market entry, corporate strategy and
> pricing. They are extracted and cited because the material was in the corpus and the old gap note
> wrongly said otherwise — but **no demand is built from them**, and says so. **X-78 is not in this
> group**: commit-then-reposition is strategy discipline and *is* built into the model. See §8,
> Findings 2 and 4.

## §4c Design-question patterns (`PMIV` Ch. 11–14)

**X-80. The pain-point method is structured rant, not insight.** Chapter 12's exercise — "Rant about
organizing a child's 1st birthday party" — is answered by **grouping, then decomposing each item**
into sub-concerns (`PMIV` L6386-6422). Three groups: planning (`L6392`), the day itself (`L6412`),
other rants (`L6419`). Decomposition goes two levels deep and each level names its own consequence:
"1. Putting together the invite list is a hassle. a. Have to invite both parents and kids. b. Don't
know how many to invite. i. Too few gives others the impression that we don't have friends. ii. Too
many will make the party complicated. c. People who don't get invited will feel offended."
— `PMIV` L6393-6398. Other items decompose the same way: food allergies, non-drinkers judging
drinkers, kid-friendly food unpopular with adults (`L6399-6403`); venue children-friendly,
baby-friendly, diaper-changing facilities, private nursing rooms, parking (`L6404-6408`);
"Determine optimal party date feels like herding cats" (`L6409`).

**X-81. Decompose the signal before deciding.** Chapter 14 asks "What are real-life signals for
identifying friends?" (`PMIV` L6854), and the answer enumerates the signals before any decision is
reached: mutual friend C (`L6894`), same interests prioritized by how well liked they are by **both**,
ranked by related pages or posts (`L6895-6896`), same events (`L6897`), same pages (`L6898`), same
school (`L6899`), same workplace (`L6900`), already known via email or other contacts (`L6901`), same
major (`L6902`), lives close (`L6903`), has ever lived where A has (`L6904`).

## §4d The full in-scope defect inventory (`PMIV` Ch. 11–18, 22)

The owner directed **full extraction** of these chapters. This section closes the remainder. Every
"Common Mistakes" block in the in-scope chapters is extracted: **47 blocks, 104 individual defects**,
each quoted and line-cited. This is the highest-value part of the chapters — the worked exercises are
illustrations of these defects, not separate content. Of the 104, **86 are product judgement** and
**18 are quarantined** under the owner's ruling that the model is product judgement, not interview
performance.

**X-82 · The inventory — 86 judgement defects.** Grouped by chapter, each with its line:

| Ch. | Block | Line | Defect as written | |
|---|---|---|---|---|
| **Ch. 11** | L5805 | | |
| | L5808 | Not adapting frameworks to a specific situation. | judgement |
| | L5812 | Using a framework in a way that feels generic and forced. | judgement |
| | L5816 | Not checking whether one has reviewed each step of the customer experience. | judgement |
| **Ch. 11** | L5880 | | |
| | L5883 | Overlooking traditional alternatives like hotels. | judgement |
| | L5887 | Forgetting that Airbnb is a marketplace and customers interact with hosts. | judgement |
| | L5891 | Not acknowledging that new users may not feel 100% confident with Airbnb’s concept. | judgement |
| **Ch. 11** | L6013 | | |
| | L6016-6017 | Accidentally drawing the employer journey map when the interviewer is asking for the candidate journey map. | judgement |
| | L6023 | Not taking into account the career level of the job seeker. | judgement |
| | L6027 | Not considering that a job seeker may eventually leave his or her job. | judgement |
| **Ch. 14** | L6864 | | |
| | L6875-6876 | Using all seven steps of the CIRCLES Method™ especially when it is clear that this is strictly about implementation. | judgement |
| **Ch. 14** | L6968 | | |
| | L6971 | Fear of wire framing. | judgement |
| | L6975 | Missing commentary that explains critical design choices, despite detailed and visually stunning designs. | judgement |
| | L6979-6980 | Drawing out unconventional UI interfaces. For instance, a photo-capture mobile UI with the capture button on the top, not bottom, especially if the… | judgement |
| **Ch. 14** | L7053 | | |
| | L7056 | Not thinking creatively or big enough. | judgement |
| **Ch. 14** | L7243 | | |
| | L7246 | Believing that Amazon Prime is perfect, as-is. | judgement |
| | L7250 | Not wanting to suggest new ideas, fearing criticism. | judgement |
| | L7254-7255 | Afraid of doing the calculations and talking about benefits from a qualitative, not quantitative, perspective. | judgement |
| **Ch. 14** | L7424 | | |
| | L7428 | Incorrectly focusing on the UX, not algorithm, design. | judgement |
| | L7434 | Proposing a rule-based, not artificial intelligence-based (aka neural network) system. | judgement |
| | L7438 | Not brainstorming enough features (aka prediction variables) for the AI-based system. | judgement |
| **Ch. 14** | L7517 | | |
| | L7520-7521 | Erroneously focusing on a secondary metric such as increasing share of wallet of existing customers when Amazon’s true goal is to increase Prime si… | judgement |
| | L7525-7526 | Thinking small by suggesting underwhelming adjacent features. For example, triggered by Amazon’s video offering, many candidates suggest that Prime… | judgement |
| **Ch. 14** | L7601 | | |
| | L7604 | Assuming there is no room for improvement for Facebook login. | judgement |
| | L7608 | Suggesting half-hearted ideas like make the button more visible or colorful. | judgement |
| **Ch. 14** | L7690 | | |
| | L7701 | Assuming user engagement is identical for 3 and 15 second videos. | judgement |
| **Ch. 14** | L7794 | | |
| | L7797 | Not factoring in the 30-minute constraint. | judgement |
| | L7801-7802 | Automatically assuming that this is about improving Bing.com. The prompt is really about helping the salesperson in general. | judgement |
| **Ch. 14** | L7890 | | |
| | L7893 | Suggesting unoriginal improvements. | judgement |
| | L7897 | Considering only superficial problems such as removing ads. | judgement |
| | L7901 | Considering only superficial needs such as “User needs the ability to share photos.” | judgement |
| **Ch. 14** | L8029 | | |
| | L8036-8037 | Spending too much time with the CIRCLES design framework such as too much time spent talking about goals or personas. | judgement |
| | L8041 | Coming with unimpressive solutions because the candidate forgot to ask for time to think. | judgement |
| **Ch. 14** | L8152 | | |
| | L8155-8156 | Damage credibility by proposing a seemingly innovative solution, only to have the interviewer explain that Pinterest does that already. | judgement |
| | L8160 | Proposing unimpressive features such as faster load times or a cleaner UX. | judgement |
| | L8164 | Incorrectly assuming a complete and accurate understanding of how Pinterest works. | judgement |
| **Ch. 14** | L8297 | | |
| | L8300 | Not clearly describing suggested ideas. | judgement |
| | L8304 | Suggesting an idea that already exists. | judgement |
| | L8308-8309 | Assuming revenue is the only goal and being perceived as very business focused rather than product (or customer) focused. | judgement |
| **Ch. 14** | L8402 | | |
| | L8409 | Choosing a persona that the candidate does not know well. | judgement |
| **Ch. 14** | L8526 | | |
| | L8529 | Incorrectly thinking that a structured thinking process is sufficient. The answers matters. | judgement |
| | L8533 | Raising common or superficial improvements such as improving the recommendation algorithm. | judgement |
| | L8537-8538 | Claiming one can improve the UX, without showing how. Draw the proposed UX on the whiteboard, if relevant. | judgement |
| **Ch. 14** | L8644 | | |
| | L8647 | Not being thoughtful in the recommendation. | judgement |
| | L8651-8652 | Insisting on walking through the full CIRCLES framework when interviewer is simply looking for a subset. | judgement |
| **Ch. 14** | L8715 | | |
| | L8718 | Having trouble suggesting monetization ideas aside from ads. | judgement |
| | L8722-8723 | Afraid of suggesting dumb ideas. Most companies, especially Google, would strongly prefer to hear one audacious, moonshot idea than ten good ideas. | judgement |
| **Ch. 14** | L8864 | | |
| | L8872-8873 | Suggesting a Disney theme park map that provides the optimal route to maximize rides or any other idea that feels unoriginal and overused. | judgement |
| | L8877-8878 | Suggesting an auto-recommender feature and being vague about the implementation by stating “machine learning” is the solution, without going into d… | judgement |
| | L8882-8883 | Trying to force the CIRCLES Method™ into the discussion, when the interviewer simply wants a list of ideas. | judgement |
| **Ch. 14** | L9008 | | |
| | L9011 | Oversimplifying the solution. | judgement |
| | L9015-9017 | Proposing a magical solution without going into the implementation details. For instance, “Yelp will magically find the best local service for our… | judgement |
| | L9021 | Not picking a specific scenario and / or customer problem, leading to generic solutions. | judgement |
| **Ch. 14** | L9095 | | |
| | L9107-9108 | Not being clear to the interviewer about which sub-question you are tackling and what your overall approach will be. | judgement |
| **Ch. 14** | L9234 | | |
| | L9237 | Blurting “Just make the coffee better” and other similarly hasty responses. | judgement |
| | L9241-9242 | Not empathizing with the customer deeply enough, limiting your ability to come up with innovative ideas. | judgement |
| | L9246-9247 | Copying competitor’s innovations, like Blue Bottle’s cold-drip coffee makers below, is a sign of an unoriginal and uncreative candidate. Screenshot… | judgement |
| **Ch. 14** | L9363 | | |
| | L9366 | Not providing a scorecard upfront. | judgement |
| | L9374 | Picking a trite example such as iPhone. | judgement |
| **Ch. 14** | L9482 | | |
| | L9495 | Not aligning with the interviewer on what constitutes “favorite” website. | judgement |
| **Ch. 14** | L9538 | | |
| | L9539 | Not mentioning safety issues | judgement |
| **Ch. 14** | L9619 | | |
| | L9622-9623 | Rather than answering the question, responding with a process that you’d use to approach this problem in real life. | judgement |
| **Ch. 14** | L9675 | | |
| | L9686 | Going straight into solutions and not discussing pain points first. | judgement |
| **Ch. 14** | L9767 | | |
| | L9770 | Coming up with ideas that don’t meet the 3X revenue objective. | judgement |
| | L9774 | Answering part 1 and not part 2. Or vice versa. | judgement |
| | L9778 | Failing to come up with a big, game-changing idea. | judgement |
| **Ch. 16** | L10710 | | |
| | L10713 | Giving a short, uninspiring response (e.g. “I’d go with profits.”) | judgement |
| **Ch. 18** | L11110 | | |
| | L11113 | Not committing to a particular goal | judgement |
| **Ch. 18** | L11190 | | |
| | L11193 | Saying that you would “find out by looking at the data” and not providing specifics | judgement |
| | L11197 | Having a short, unsatisfying list of metrics | judgement |
| **Ch. 18** | L11231 | | |
| | L11234 | Coming across as spineless by first blurting out three metrics and then changing them later. | judgement |
| **Ch. 18** | L11379 | | |
| | L11382 | Choosing a vanity metric that’s easy-to-collect but not actionable. | judgement |
| **Ch. 18** | L11426 | | |
| | L11427-11428 | Jumping to conclusions that a competitor’s actions are the cause and hence the company should react by releasing identical features. | judgement |
| **Ch. 18** | L11537 | | |
| | L11540-11541 | Not factoring one of the biggest drivers of Dropbox engagement: whether or not a new user uploaded a file. | judgement |
| **Ch. 18** | L11619 | | |
| | L11622 | Drilling down too quickly on very specific issue such as sync errors or billing issues. | judgement |
| **Ch. 18** | L11697 | | |
| | L11700 | Choosing vanity metrics such as visitors and visits to UberPool web page | judgement |
| **Ch. 18** | L11811 | | |
| | L11814-11815 | Focusing too much on low value-add items such as whether the driver offers water to its riders or whether the driver is a good conversationalist. | judgement |
| **Ch. 18** | L11878 | | |
| | L11881 | Not considering non-Amazon issues, such as slow Internet connectivity. | judgement |
| **Ch. 18** | L11909 | | |
| | L11912 | Using the wrong terminology, such as calling a pin or save a retweet. | judgement |
| **Ch. 18** | L12017 | | |
| | L12020-12021 | “Go-to-market” can have differing interpretations. Many candidates assume that they share a common understanding with the interviewer. | judgement |
| | L12025 | Not mentioning a complete set of go-to-market metrics. | judgement |
| **Ch. 22** | L14309 | | |
| | L14312 | Not appreciating how hard it is to get train data. | judgement |
| | L14316 | Not appreciating how hard it is to get fresh and accurate data. | judgement |
| | L14320 | Not appreciating how complicated is to calculate possible trip permutations. | judgement |
| **Ch. 22** | L14460 | | |
| | L14463 | No thoughtful plans. | judgement |
| | L14467 | Disorganized discussion. | judgement |
| | L14471 | Missing critical dependencies such as driver availability. | judgement |

— `PMIV` L5808-9778 (Ch. 11–14, `L5800-9844`), L10556-12025 (Ch. 15–18, `L9845-12070`), L14312-14471
(Ch. 22, `L14292-14561`)

**X-83 · The 18 quarantined defects.** Extracted for completeness, admitted to no cue, decision or
criterion. Each is about how the answer came across, what the listener already knew, or a delivery aid:

| Line | Defect as written | Why it is not product judgement |
|---|---|---|
| `PMIV` L6867 | "Answering too casually." | manner |
| `PMIV` L6871 | "Not drawing the solution on a whiteboard." | medium — a delivery aid |
| `PMIV` L7060 | "Answering too casually. The interviewer is looking for a detailed and thoughtful response." | manner, framed by what the interviewer wants |
| `PMIV` L7064 | "Spending too much time asking for context. It comes across as not wanting to answer the question." | framed as what it 'comes across as' |
| `PMIV` L7693 | "Freezing up" | nerves |
| `PMIV` L7697 | "Unstructured, stream-of-consciousness discussion." | delivery form |
| `PMIV` L8032 | "Mumbling and/or speaking too quickly" | manner |
| `PMIV` L8405 | "Not showing enthusiasm, making the answer boring." | manner |
| `PMIV` L8413 | "Not using the whiteboard to help the listener visualize a proposed improvement." | medium — a delivery aid |
| `PMIV` L8943 | "Answering casually." | manner |
| `PMIV` L8947 | "Giving a stream-of-consciousness answer that is hard to answer." | delivery form |
| `PMIV` L9098 | "Not wanting to make calculations because the candidate is insecure about calculating numbers." | stated as candidate psychology |
| `PMIV` L9102-9103 | "Feeling overwhelmed with the multi-question answer and reacting with a hard-to-follow, poorly thought-out response." | stated as feeling overwhelmed |
| `PMIV` L9370 | "Choosing a product that the interviewer is unfamiliar with, causing the interviewer to get bored." | what the interviewer finds boring |
| `PMIV` L9485-9486 | "Not explaining (or explaining poorly) what the website is because the candidate assumes the listener knows the product that they are talking about." | assumes what the listener knows |
| `PMIV` L9490-9491 | "Neglecting to draw what the current or proposed website looks like. Pictures are more effective than words. A low fidelity sketch, taking no more t…" | medium — pictures over words |
| `PMIV` L9682 | "Needlessly defining the persona further, given that the interviewer the persona already." | assumes what the interviewer already knows |
| `PMIV` L10556-10557 | "Not getting familiar with the topic beforehand, considering how widely Uber’s business model and metrics are covered by mainstream business press." | preparation, not judgement |

— `PMIV` L6867-10556

**X-84 · The over-application defect has three more instances the earlier passes never found.** X-64
rests on one line (`PMIV` L6875-6876). The corpus's own defect list names the same failure three
further times, each in different words:

- "Spending too much time with the CIRCLES design framework such as too much time spent talking about
  goals or personas." (`PMIV` L8036-8037)
- "Insisting on walking through the full CIRCLES framework when interviewer is simply looking for a
  subset." (`PMIV` L8651-8652)
- "Trying to force the CIRCLES Method™ into the discussion, when the interviewer simply wants a list of
  ideas." (`PMIV` L8882-8883)

**And a fifth, in a per-question note rather than a defect list:** "Don't forget to clarify the
interviewer's intent if it's unclear. Here, the interviewer only wants a subset of the CIRCLES
Method™, articulating use cases and then prioritization, not the full framework." (`PMIV` L9536-9537)

**Five independent statements of one defect.** The model's governing rule is not an inference from a
single line; the primary source says it five separate ways. This materially strengthens CS-1, D-0, J1.

**X-85 · Diagnostic discipline, in the corpus's own words.** Four named ways to diagnose badly:
"Drilling down too quickly on very specific issue such as sync errors or billing issues" (`PMIV`
L11622); "Oversimplifying the solution" (L9011); "Jumping to conclusions that a competitor's actions are
the cause and hence the company should react by releasing identical features" (L11427-11428); and the
two failures of assumed stasis — "Assuming there is no room for improvement for Facebook login"
(L7604), "Believing that Amazon Prime is perfect, as-is" (L7246). The source adds the diagnostic
instrument the corpus names in passing: "For diagnosis, think about the root causes of a decline.
Drawing out an issue tree can help." (`PMIV` L11425)

**X-86 · Three defects about the form of the answer, not its content.** "Rather than answering the
question, responding with a process that you'd use to approach this problem in real life" (`PMIV`
L9622-9623) — process displaced an answer. "Incorrectly thinking that a structured thinking process is
sufficient. **The answers matters.**" (L8529) — the structure is the vehicle, not the result. And
"Going straight into solutions and not discussing pain points first" (L9686) — the corpus's own rule
that pain precedes solution, stated as a defect. Together these justify CS-1's opposite demand: an
answer *is* required, not a plan to produce one.

**X-87 · The metric defects, the corpus's own list.** Beyond X-68 and X-73: a **secondary** metric
treated as the point — "Erroneously focusing on a secondary metric such as increasing share of wallet
of existing customers when Amazon's true goal is to increase Prime signups" (L7520-7521); a
**superficial** metric — "Raising common or superficial improvements such as improving the
recommendation algorithm" (L8533); **vanity** metrics — "vanity metric that's easy-to-collect but not
actionable" (L11382), "vanity metrics such as visitors and visits to UberPool web page" (L11700);
**deferral** instead of specifics — "'find out by looking at the data' and not providing specifics"
(L11193), "Having a short, unsatisfying list of metrics" (L11197); **revision under questioning**
— "first blurting out three metrics and then changing them later" (L11234); and **missing the actual
driver** — "Not factoring one of the biggest drivers of Dropbox engagement: whether or not a new user
uploaded a file" (L11540-11541). — `PMIV` L7520-7521, L8533, L11193, L11197, L11234, L11382,
L11540-11541, L11700

**X-88 · Be specific, or you have not answered.** A distinct cluster the earlier passes missed entirely.
"Proposing a magical solution without going into the implementation details" (`PMIV` L9015-9017);
"Claiming one can improve the UX, without showing how" (L8537-8538); "Suggesting an auto-recommender
feature and being vague about the implementation by stating 'machine learning' is the solution, without
going into details" (L8877-8878); "Not picking a specific scenario and / or customer problem, leading
to generic solutions" (L9021); "Blurting 'Just make the coffee better' and other similarly hasty
responses" (L9237); "Not clearly describing suggested ideas" (L8300); "**Using the wrong terminology**,
such as calling a pin or save a retweet" (L11912). The corpus treats vagueness as a first-class
failure, not a style note.

**X-89 · Ambition, originality and scope — the largest cluster, entirely new.** **Twenty-four
defects**, in four groups: think bigger (5), don't be derivative (9), know the space before claiming
originality (4), and stay inside the object asked about (6). All say the same thing from different
sides.

- *Ambition.* "Not thinking creatively or big enough" (L7056); "Failing to come up with a big,
  game-changing idea" (L9778); "Having trouble suggesting monetization ideas aside from ads" (L8718);
  "Most companies, especially Google, would strongly prefer to hear one audacious, moonshot idea than
  ten good ideas" (L8722-8723); "Coming with unimpressive solutions because the candidate forgot to ask
  for time to think" (L8041).
- *Originality.* "Suggesting unoriginal improvements" (L7893); "Considering only superficial problems
  such as removing ads" (L7897); "Considering only superficial needs such as 'User needs the ability to
  share photos'" (L7901); "Suggesting half-hearted ideas like make the button more visible or
  colorful" (L7608); "Thinking small by suggesting underwhelming adjacent features" (L7525-7526);
  "Picking a trite example such as iPhone" (L9374); "Copying competitor's innovations … is a sign of an
  unoriginal and uncreative candidate" (L9246-9247); "Proposing unimpressive features such as faster
  load times or a cleaner UX" (L8160); "Suggesting a Disney theme park map that provides the optimal
  route to maximize rides or any other idea that feels unoriginal and overused" (L8872-8873).
- *Know the space before proposing.* "Overlooking traditional alternatives like hotels" (L5883);
  "Suggesting an idea that already exists" (L8304); "Incorrectly assuming a complete and accurate
  understanding of how Pinterest works" (L8164); "Proposing a rule-based, not artificial
  intelligence-based (aka neural network) system" (L7434).
- *Stay on the object asked about.* "Accidentally drawing the employer journey map when the
  interviewer is asking for the candidate journey map" (L6016-6017); "Incorrectly focusing on the UX,
  not algorithm, design" (L7428); "Automatically assuming that this is about improving Bing.com. The
  prompt is really about helping the salesperson in general" (L7801-7802); "Focusing too much on low
  value-add items such as whether the driver offers water to its riders" (L11814-11815);
  "Not considering non-Amazon issues, such as slow Internet connectivity" (L11881); "Not mentioning a
  complete set of go-to-market metrics" (L12025).

— `PMIV` L5883, L6016-6017, L7056, L7428, L7434, L7525-7526, L7608, L7801-7802, L7893, L7897, L7901,
L8041, L8160, L8164, L8304, L8718, L8722-8723, L8872-8873, L9246-9247, L9374, L9778, L11814-11815,
L11881, L12025

**X-90 · Framing comes before reasoning.** "'Go-to-market' can have differing interpretations. Many
candidates assume that they share a common understanding with the interviewer." (`PMIV` L12020-12021).
"Not aligning with the interviewer on what constitutes 'favorite' website" (L9495). "Not providing a
scorecard upfront" (L9366). "Answering part 1 and not part 2. Or vice versa" (L9774). "Automatically
assuming that this is about improving Bing.com" (L7801-7802). One rule, stated five times: **establish
what is being asked, in the shared frame, before reasoning inside it.**

**X-91 · Constraints and risk bind the answer.** "Not factoring in the 30-minute constraint" (`PMIV`
L7797); "Coming up with ideas that don't meet the 3X revenue objective" (L9770); "**Not mentioning
safety issues**" (L9539); "Missing critical dependencies such as driver availability" (L14471). No
earlier pass carried safety or dependencies as a named judgement.

**X-92 · Customer understanding has a depth the earlier passes never stated.** "Not empathizing with
the customer deeply enough, limiting your ability to come up with innovative ideas" (`PMIV`
L9241-9242); "Not checking whether one has reviewed each step of the customer experience" (L5816);
"Forgetting that Airbnb is a marketplace and customers interact with hosts" (L5887); "Not
acknowledging that new users may not feel 100% confident with Airbnb's concept" (L5891); "Not taking
into account the career level of the job seeker" (L6023); "Not considering that a job seeker may
eventually leave his or her job" (L6027); "Assuming user engagement is identical for 3 and 15 second
videos" (L7701). And the data the launch plan runs on: "Not appreciating how hard it is to get train
data" (L14312), "Not appreciating how hard it is to get fresh and accurate data" (L14316), "Not
appreciating how complicated is to calculate possible trip permutations" (L14320) — the three-line
expansion of X-75 that the earlier pass compressed to one.

**X-93 · The design answer must show its work.** "Missing commentary that explains critical design
choices, despite detailed and visually stunning designs" (`PMIV` L6975); "Fear of wire framing"
(L6971); "Not being thoughtful in the recommendation" (L8647); "Drawing out unconventional UI
interfaces" with no reason given (L6979-6980); "Proposing a rule-based, not artificial
intelligence-based system" (L7434); "Not brainstorming enough features (aka prediction variables) for
the AI-based system" (L7438). The line between this and X-84's over-application is exact: **do the
work the question asked for, and show why** — the opposite failure to running the whole framework.

## §5 The discovery corpus — standing material

These are unaffected by the book's ingestion. Retained, re-grounded, with objects named.

**X-40. Opportunities come only from stories.** Generate opportunities only from stories, prompted
with "Tell me about a time when…". Everything else — sales calls, support tickets, feature
requests, analytics — usually lacks context, so it is **inspiration for the next interview, not
tree input**. Priors are excluded outright, because generating opportunities from what the team
already knows "brings biases and half-truths." — `cd/01` L64-66

**X-41. The three-to-four window.** Wait for three to four stories: enough to stop overreacting to
one, not so many as to cause analysis paralysis. Interview week over week; revise the opportunity
space every three to four interviews. — `cd/01` L70, L94

**X-42. A new tree on a changed direction, not a changed number.** A new tree when the direction of
the outcome changes — switching to acquisition, changing the aha moment — and not when the target
number changes. — `cd/01` L93

**X-43. Product outcome, one per team.** Choose the **product outcome** — customer behaviour or
sentiment in the product — not a business financial metric, which a team cannot reliably influence,
and not a traction metric on one feature, which is too narrow. Business value leads, because
creating it earns the right to serve the customer over time. Give **one outcome per team**, split by
segment or journey step. — `cd/01` L52-56, L95; `cd/02` L38, L44-45

**X-44. Job versus want — and the object it applies to.** Name the **underlying job, not the
feature want**: "users want better recommendations" is a want, "users need continuity across
contexts" is a job. Then run the opportunity test — ask whether more than one way addresses it; if
not, it is a solution in disguise, and you reframe with **"Why?"** until there is. Opportunities
include desires as well as pain points, which is why the corpus says "opportunity", not "problem".
— `cd/01` L60-63

> **Object separation, established against X-18.** X-44 is Torres's test for an **opportunity**, in
> continuous discovery. X-18 is Lin's method for **reporting a customer need**, in a design
> interview. They are not the same act and neither is a correction of the other. The first pass
> fused them into one demand; this build separates them into two.

**X-45. Effort is excluded from opportunity assessment specifically.** Assess an **opportunity** on
four factor sets — sizing, market, company, customer — and **exclude effort entirely**; effort
belongs to assessing the **solution**, because an opportunity assumed too hard may have a
dead-simple solution. — `cd/01` L79-80

**X-46. Testing solutions against the opportunity.** Test **sets of solutions against the same
opportunity** to find a clear frontrunner, because working one idea at a time sets you up for
confirmation bias. Keep **one solution in flight** to move the loop. — `cd/01` L44, L85-86; `cd/02`
L54. Brainstorm for the **target opportunity only**, not across the whole tree.

**X-47. SVPG's four risks, and who owns each.** Hold all four risks — valuable, usable, feasible,
viable — assessed early in the process, with **viability the product manager's accountability**,
usability the designer's, feasibility the tech lead's. — `svpg/02` L81, L97-100; `svpg/01` L48

**X-48. What viable means.** **Viable**: will this be a problem people or companies will **pay to
have solved at scale**, where viable reaches past marketing into sales, finance, service, legal and
compliance. — `svpg/01` L48; `svpg/02` L33

**X-49. Lovable.** **Lovable**: does it **fit where users already work** without asking them to
form a new habit. — `circles/03` L23

> X-47 and X-48 are SVPG's. X-49's only source in the corpus is a third-party guide. Stated as
> such rather than as Lin's.

**X-50. Feasibility is a checkbox.** Spend **minimal time on feasibility** — a brief checkbox — and
a trade-off argued purely on engineering complexity is the tell of a weak answer. — `circles/03`
L33, L52

**X-51. AI work changes the question.** Will people use it or does it add a task to an already
overloaded workflow; does the output need to be editable; what happens when the model is wrong; and
does it **reduce** decisions or add them. — `circles/03` L44

**X-52. RICE.** Score impact per unit of time; keep impact deliberately blunt — 3, 2, 1, half,
quarter — because the alternative is a tangled mess of gut feeling. A score is a hypothesis, not a
mandate: sort, then re-evaluate, and be willing to conclude the gut is wrong. — `rice/01` L27, L41;
`rice/02` L19, L26

**X-53. Stack order, no ties.** The corpus prefers a stack-ordered sequence with no ties, since two
"first priorities" means nothing is important. It distrusts checklists because they produce good/bad
rather than sequence — SWOT, 4 Ps, PEST, growth/share matrix, Ansoff, GE/McKinsey and 3 Cs all fail
as prioritisation tools. — `rice/02` L10, L13

**X-54. Three named lens failures.** **"Ship the smallest wins" never ships high-value
sustained-effort initiatives**; **"ship the most immediate revenue" chases monetisation over
strategic bets**; **"most advanced technology" confuses the technology with the value driver.**
— `rice/02` L14

**X-55. RICE's boundary.** RICE is not to be used for acquisitions or pricing. — `rice/02` L62

**X-56. Shape Up's risk.** Shape Up targets the risk of *not shipping on time* and explicitly **not**
the risk of building the wrong thing; discovery is deliberately out of its scope, and improvement of
discovery should come **after** the ability to ship is regained. — `shape-up` L22

**X-57. Fixed time, variable scope.** Set an **appetite** first — a time budget for a standard team
size, small batch one to two weeks with one designer and one or two programmers, big batch a full
six — and let the design come out of it, the reverse of estimating. **A real deadline forces the
trade-offs** and the variable scope lets the team make them. — `shape-up` L40-44, L71

**X-58. Shaping.** Wireframes over-specify and hide difficulty behind a "just so" interface; bare
words under-specify and leave nothing marking what is out of scope. Concept with **breadboard
words** — Places, Affordances, Connection lines — or **fat marker sketches**. Find the **rabbit
holes** before the team commits. Hand over rough, solved and bounded work, with **No Gos**.
— `shape-up` L30-37, L48-53, L56-61

**X-59. Knowing when to stop.** Compare against **the baseline customers have today, not against the
ideal**. Hammer scope in order: must-have, can we ship without it, new problem or pre-existing, how
likely, which customers, core or edge case, actual impact, aligned with the intended audience. Tilde
the nice-to-haves. Cutting scope is not lowering quality. Treat extension as rare and diagnostic —
running into a cool-down means the shaping was wrong, not that the schedule slipped. — `shape-up`
L101, L110-115

**X-60. Empowerment.** There is **one cross-functional team responsible for both discovery and
delivery**, every member engaged in both, and the test of empowerment is whether the team **can
decide the best way to solve the problems it was assigned**. Never let one group obtain the
learnings and hand them to another to execute. — `svpg/06` L12, L19, L25; `svpg/05` L44

**X-61. The missionaries failure.** Handing learnings off produces **missionaries, not mercenaries**
— the receiving end feels that way and stops proposing better solutions; over time it self-selects
to those willing to work that way, and then founders complain about the resulting lack of
initiative. — `svpg/05` L36; `svpg/06` L19-21

**X-62. The standing team check.** The corpus's empowerment litmus question any product manager can
answer about the team in front of them: **are you staffed with competent people with character,
skilled across the competencies you need** — product manager, product designer, engineers.
Competence is capabilities, skills and track record; **character** is what replaces "cultural fit",
because in practice "cultural fit" means hiring people who look and think like we do, and the
consequence is that they think like us — when what you need is people who think differently.
**Hiring itself is the staffing manager's job, not the product manager's** — *this model's inference
from the structure of `svpg/05` L40, L42-43, not a sentence in the source* — so the
product manager's version is the standing check on their own team, not the sourcing decision.
— `svpg/05` L50-51, L58

---

## §6 What the first pass got wrong, itemised

Recorded so the correction is auditable. Each row names the first-pass claim, the primary-source
line that contradicts it, and the ruling now in force.

| # | First-pass claim | Contradicted by | Now |
|---|---|---|---|
| 1 | Ask **one** clarifying question (`circles/03` L13, L37) | `D&C` L564-568 | **Four** — the 3W's and H, named explicitly |
| 2 | Cohort defined by context and friction, **not** demographics (`circles/03` L15) | `D&C` L612-626 | Focus **one persona** for product quality; demographics go **in** the 2x2 |
| 3 | Report = **underlying job, not feature want** (`circles/03` L17) | `D&C` L631-651 | Report = **user story**, "As a ⟨role⟩, I want ⟨goal⟩ so that ⟨benefit⟩" |
| 4 | **Effort excluded** from the cut (`cd/01` L79-80, applied universally) | `D&C` L662-673 | Effort is **in** the cut of user stories; **out** of opportunity assessment. Different objects |
| 5 | **Two or three** ideas, not ten-plus (`circles/03` L21) | `D&C` L866-876 | **At least three**, for quality *and* interpersonal protection |
| 6 | Evaluate = **viable / lovable / feasible** (`circles/03` L23, L33) | `D&C` L879-884 | Evaluate = **pro/cons** vs customer satisfaction, implementation difficulty, revenue potential |
| 7 | Summarize = **name the trade-off + a metric** (`circles/03` L25) | `D&C` L902-905 | Summarize = **three beats**: recommend one, why beneficial, why preferred over others |
| 8 | No top-level criterion; step coverage was the standard | `D&C` L1933-1957; `PMIV` L1808-1812 | **This ruling was later withdrawn.** The first pass made "Sounds scripted = failed" the top criterion; §8 Finding 1 withdrew it as room-ground and replaced it with adaptive coverage |
| 9 | SVPG's four risks attributed to CIRCLES Evaluate | `D&C` L879-884 | Four risks are **SVPG's**; they stand as a separate demand, not as Lin's step 6 |
| 10 | One fused "need or want" demand | `D&C` L631-651; `cd/01` L60-63 | **Two demands**: report a need (Lin's R) and test an opportunity (Torres's) |

**Rulings 1 and 5 supersede owner rulings from the first pass** (C-1 "one clarifying question";
C-2 "two to three, not ten-plus"). Both were made on recency grounds over `circles/03`. The
primary source now in the corpus states the opposite, and recency does not outrank the author.

---

## §7 What the corpus still does not carry

- **`Continuous Discovery Habits` and `Inspired` are still cited, not ingested.** Only the two Lin
  books were provided. `sources.md` L12-13, `svpg/08`.
- **`cd/03` carries no substance.** Podcast show notes — chapter timestamps (`cd/03` L10-25); its own
  header says the substance is elsewhere (`cd/03` L8). Nothing taken.
- **`prio/04` is abstract-level only.** Full text unobtainable; the note forbids quoting technique
  names (`prio/04` L13, L37). Only counts and the output/assumption/outcome split are available.
- **Lifecycle-aware prioritisation has no method.** The gap is documented — RICE, MoSCoW and Kano
  ignore the life-cycle phase, producing "the right functionality at the wrong time" — but the
  promised process guidelines do not exist; the paper is a work in progress (`prio/03` L11-14, L54).
- **No material on legal, compliance or accessibility practice**, though viability is stated as
  reaching into them (`svpg/02` L33).
- **`circles/02` describes a Fifth Edition** (528 pages) that is not in the corpus; only the Second
  Edition is (`circles/02` L8-10). Whether the method changed across editions is unknown.
- **`D&C` chapters 6–7 are extracted; chapters 8–12 are an owner call, not an oversight.** Ch. 6
  (Five Whys) is in scope and **is** extracted at **X-65** – **X-67**. Ch. 8 (business-model
  estimation) is adjacent to the declared scope and remains unextracted by owner decision. Chs. 9–12
  (pricing existing products, ROI, strategy) are out of the declared scope — design questions,
  discovery, prioritisation, shipping — and the pricing and new-market material that v2 wrongly
  recorded as absent was extracted from `PMIV` instead, at **X-76** – **X-79**.
## §8 Judge findings and how this build answers them

The first rebuild passed traceability and cognitive content but **FAILED relevance** (75 RELEVANT /
11 MARGINAL / 3 NOT RELEVANT across 89 items). Owner ruled: keep this a **product-judgement model**,
and extract the in-scope material the build had wrongly recorded as absent.

### Finding 1 — the governing frame was interview performance carried as product judgement

The first rebuild made "sounding scripted = failed" its top cognitive demand, above every product
judgement, on evidence that was entirely about a candidate's impression on an interviewer:
"over prepared", "fear the candidate is inexperienced", "establishing credibility and likability",
"similar to the interviewer" (`D&C` L1940-1952). **No product decision turns on any of it.**

**What was done.**

- **The rule is kept, on different grounds.** It survives as **adapt the framework to the question
  rather than recite it verbatim**, which Lin states as a primary-source standard — "The goal of
  frameworks is to serve as a mental checklist for a complete response, not to recite it verbatim at
  the interview. Adapt the framework as you see fit" (`D&C` L3660-3663, **X-63**) — and marks
  satisfied on a worked design answer: a candidate who uses CIRCLES and AARM "without sounding
  mechanical" (`D&C` L3845-3850, **X-63**). The reasoning that made it a room-ground criterion is
  dropped.
- **Over-application is now grounded in the work, not the room.** "**Using all seven steps of the
  CIRCLES Method™ especially when it is clear that this is strictly about implementation**"
  (`PMIV` L6875-6876, **X-64**), plus "Not adapting frameworks to a specific situation" and "Using a
  framework in a way that feels generic and forced" (`PMIV` L5808-5813). These are defects in the
  *analysis*, and they are stated by the primary source.
- **Room-ground is quarantined and labelled, not deleted.** Three items are retained as extraction
  items but demoted from pass conditions: the interpersonal ground of idea count (**X-29b**,
  `D&C` L873-876), the "make the interviewer go hmm" clause (**X-37**, `PMIV` L1797), and the
  perception returns of trade-off evaluation (see **X-32**, amended below). Their content is real
  advice; their ground is a listener.
- **X-39 withdrawn.** "Practice at least 20 product sense cases" (`PMIV` L1787-1788) is volume of
  exam preparation from a Day-14 study plan. It was extracted and cited in the first rebuild without
  being checked for relevance. **Removed.**
- **X-32 amended.** Its three returns are now stated as *why the analysis is worth doing* — it
  surfaces your own objections and pre-empts the ones you did not find — with the perception terms
  ("comes across as thoughtful", "perceived as objective") marked as the room-ground part. **X-32.**

### Finding 2 — in-scope material was missed and misrecorded as absent

- **The Five Whys is now extracted** (`D&C` L2029-2069, **X-65**–**X-67**). Lin frames it as "part of
  understanding customer needs" — a product discovery instrument for finding unarticulated problems
  and gaps existing solutions left open. The first build recorded `D&C` chapter 6 as unextracted, so
  it never found this, and sourced its only why-framing to `cd/01` L60-63. **The model previously
  lacked the only problem-discovery technique its own primary source contains.**
- **G-6 closed.** Metrics, metric prioritisation, diagnosis and launch are extracted at **X-68**–
  **X-79**, from `D&C` L3462-3513 and `PMIV` L9845-9846, L10677-10792, L10901-10939, L11104-11113,
  L14292-14330.
- **G-9 corrected, not closed.** See below.
- **Design-question patterns extracted** — **X-80**, **X-81** (`PMIV` L6386-6430, L6848-6880).

### Finding 3 — the Five Whys chain was described wrong, in both earlier passes

This build's own new material carried an error, found by the traceability audit and corrected here.

- **It is five deep, not four.** The questions are at `D&C` L2047, L2050, L2054, L2058 and L2062.
- **The fourth answer is the solution, not the constraint.** "We could if we simply put inexpensive
  aluminum foil on the parts that get dirty often" (`D&C` L2058-2061). The **fifth** answer is the
  constraint: "We can't get the procurement department to approve the purchase" (`D&C` L2062-2064).
- **The source states no stopping rule.** "It involves iterative inquiry to identify a problem's root
  cause" (`D&C` L2034-2037) is the whole of the stated method. The reading that the chain has run far
  enough once the answer stops being a cause is **this model's inference from the worked example**,
  and it is now labelled as such in **X-66** and in CS-22, D-30, J26 and the mental model's demand
  row.

### Citation defects the audit found and this pass fixed

**Nine wrong line references** were found by the v3 traceability audit and corrected across all six
artifacts. The list is kept here with the pre-fix values, because a defect record whose "before" has
been overwritten in place cannot be audited:

| # | What | Was | Now |
|---|---|---|---|
| 1 | Over-application defect | `PMIV` L6871-6873 | **L6875-6876** |
| 2 | Metric enumeration list | `PMIV` L10710-10720 | **L10710-10735** |
| 3 | "text messaging" narrowing quote | `PMIV` L11129 | **L11131** |
| 4 | Staffing, cited to a **blank line** | `svpg/05` L41 | **L40, L42-43** |
| 5 | "assessed early" — line missing | `svpg/02` L97-100 | **L81, L97-100** |
| 6 | Opportunities include desires | `cd/01` L60-62 | **L60-63** |
| 7 | "without sounding mechanical" | `D&C` L3845-3847 | **L3845-3850** |
| 8 | Procurement constraint sentence | `D&C` L2064-2068 | **L2062-2068** |
| 9 | Room-ground block | `D&C` L1937-1940 | **L1940-1943** |

Two claims needed more than a line fix. **"Hiring is the staffing manager's job, not the product
manager's"** is the model's *inference* from the structure of `svpg/05` L40, L42-43, not a sentence in
the source, and is now marked as such at every one of its four occurrences. And the **Five Whys
stopping rule** is the model's inference from the worked example, not a source statement — see
Finding 3.

**The v4 audit found 35 further findings, of which 20 were high or medium severity**, and they
clustered the same way: counts that were never recomputed after material grew, inferences asserted as
source in one artifact and correctly labelled in another, and history sections that narrated a pass a
later section had superseded. All are fixed; §8 records what changed.

### Finding 4 — X-78 was mis-filed as out-of-scope

The out-of-scope boundary said "X-76–X-79 … no demand is built from them". That is true of X-76, X-77
and X-79, and **false of X-78** — "commit factually, then be able to abandon the commitment" is
strategy discipline, not new-market entry or pricing, and it *is* built into a demand row, J27, CS-27
and D-31. X-78 has been removed from the out-of-scope group in every artifact.

### Honest boundaries recorded rather than papered over

- **X-76, X-77 and X-79 (new-market entry, pricing, pro/con strategy) extend past this model's
  stated scope.** They are extracted because the material was present and the old gap note wrongly
  denied it, but no demand is built from them. Flagged, not smuggled in. **X-78 is not in this
  group** — see Finding 4.
- **G-7 was a real gap in v3 and is now closed.** `PMIV` Ch. 11–14 (L5800-9844) is worked CIRCLES
  application question by question — squarely in scope — and v3 extracted only the pain-point method
  (X-80), the decomposition method (X-81) and three named defect instances (X-64). **All 47 in-scope
  "Common Mistakes" blocks — 31 in Ch. 11–14, 14 in Ch. 15–18, 2 in Ch. 22 — are now extracted**:
  104 defects, 86 of them product judgement (§4d, X-82 – X-93). What remains unextracted is the
  worked *answers* and the per-question "Things to Consider" notes, which illustrate these defects
  rather than add judgement.
- **`D&C` Ch. 8 (estimation) is an owner call, not a silent omission.** It is business-model
  estimation — revenue, headcount, ROI — which is adjacent to but not inside the declared scope. Not
  extracted; recorded here so the omission is visible rather than buried.
