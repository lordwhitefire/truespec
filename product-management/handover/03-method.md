# 03 — CIRCLES: Identify, Report, Cut, List, Evaluate, Summarize

The situation is fixed in the plan; the requirement digest is below. This file records the six letters
that decide *what the guide is* before a sentence of it is written.

---

## I — Identify

**The reader is one person: the business owner.** Single admin, non-technical, runs a vehicle import
business, and will read this once — probably on a phone, probably while something else is happening.
He is not reading for pleasure and he will not read it twice. The guide has one pass to work.

- **He is not the builder's peer.** Words like route, API, database, RLS, deployment are noise.
- **He is phone-first.** The office is designed for it: bottom bar, tap targets.
- **He is the decision-maker, not a member of staff.** If something is wrong, he cannot escalate to
  anyone — he calls the builder. Every avoidable call is a failure of this document.
- **His customers are the second audience, but they never read this.** Their experience is described
  so he can answer questions about it.

## R — Report

**Stated want:** "a PDF that explains what each page is for and how to use it."

**The job behind the want** — four of them, and the page-turner only satisfies the first:

1. **Run it without me.** He needs to complete the normal week's work — add a car, fix a price, answer
   an enquiry — with no call.
2. **Know his numbers are safe.** The brief's critical requirement was that cost and profit never reach
   a buyer. He needs to *understand* that this is a rule of the system, not a promise from the builder,
   or he will not trust the site with his real stock.
3. **Know where to start.** A page-by-page reference with no starting point is a dictionary: complete
   and useless at 9am on a Monday.
4. **Recognise the thing as his.** A working product that still says "placeholder WhatsApp number" is
   not yet his. The first five minutes must make it his.

So the document is **an operating manual with a trust section**, not a feature tour.

## C — Cut

Ranked by frequency × consequence. What survives becomes the guide; what does not is named.

| Tier | What | Why it survives |
|---|---|---|
| 1 — every week, costly to get wrong | Sign in; add a car; costs stay private; set the WhatsApp number | The business stops if any of these is unclear |
| 2 — weekly | Inventory list; edit; mark sold; enquiries; drafts | The daily rhythm |
| 3 — occasional | Activity log; car/customer states; tagline; account | Needed once, then rarely |
| Cut | Stack, RLS, API, deployment, database branches, privacy text in full | None of it helps him operate |

**Given up:** completeness. The sold flow gets a short section, not a chapter; privacy gets one line.
The cost of cutting is that a future feature will not be in this edition — accepted, because a guide
that tries to be exhaustive stops being read.

## L — List

Four genuinely different shapes:

- **A. Page-first reference.** One section per screen, in menu order. Exactly what was asked for.
- **B. Task-first recipes.** "How do I add a car?" — written around jobs, not screens.
- **C. Short tour, then reference.** Two pages of "your first five minutes", then a section per screen.
- **D. Screen recording.** Best for learning, but it is not a PDF and was not asked for.

## E — Evaluate

Weighed on: can he act after reading; does it survive printing and re-reading; does it answer "is my
money safe"; does it stay true as the product changes.

- **A** is findable but has no entry point. A reader who does not know the vocabulary cannot look up
  what he does not know the name of. **Fails job 3.**
- **B** is the easiest to act on, but repeats screens across recipes and goes stale the moment a label
  changes. **Weak on job 1 over time.**
- **C** costs pages and risks being read as "a manual". But it is the only shape that answers job 3
  before the reference begins, and the reference still does job 1. **Best overall; its drawback is length, not risk.**
- **D** solves learning best and none of the delivery constraints. **Out.**

## S — Summarize

**Recommendation: C — five minutes of guided setup, then one section per screen.**

- **Success metric:** within 48 hours of receiving it, the client signs in, replaces the placeholder
  WhatsApp number, and saves one car — without contacting the builder to ask how.
- **Trade-off named:** roughly sixteen pages instead of six. Accepted because the first-week failure
  mode is not "he cannot find a page", it is "he does not know where to begin" — and a shorter document
  that fails at the start is longer in the end, in phone calls.
- **Link back to the goal:** the handover exists to move the build from *delivered* to *his*. The guide
  is finished when he can operate it alone and trusts it with real stock.
