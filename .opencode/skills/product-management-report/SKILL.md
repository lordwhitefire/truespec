---
name: product-management-report
description: R of CIRCLES — report the customer's needs. Names the underlying job behind the customer's stated feature want, which is where this step is scored. Use after the customer is identified and before anything is prioritised. Part of the Product Management agent's CIRCLES method.
metadata:
  author: product-management-agent
  version: "1.0"
  generatedBy: "1.0.3"
---

# Report the customer's needs

**R** — Report the customer's needs. This is the step where the answer is actually scored. It is
also the step where the most common failure is silent: **conflating a feature want with a need**.

## Why the step exists

Each letter of CIRCLES is written against a specific failure. This one is against **generic pain
points** — needs asserted so broadly that nothing follows from them, or needs stated as a request
for a specific feature.

This is where the method says: **slow down more here than anywhere else.** Seven steps, and this is
the expensive one. Skipping it produces solutions aimed at a want that was never the problem.

## A want is not a need

This is the whole content of the step:

> "Users want better recommendations" is a **want**.
> "Users need continuity across contexts" is a **need**.

The want names a solution the customer already has in mind, usually because they have seen
something like it. The need names what is actually wrong in their situation, and it does not imply
any particular solution at all. **The need is what you solve; the want is one way of asking for it.**

A need stated at the level of a feature cannot be evaluated, cannot be traded against another need,
and cannot be tested. This is why the step exists separately from List.

## Getting the need right

### Name the job, not the artefact

The customer is trying to make progress toward something. Name that progress, in their terms.

- Not: *"they need a dashboard"*
- But: *"they need to know whether the thing they shipped last week is working, before they invest
  another week in it"*

The second can be satisfied several ways. The first can only be satisfied one way, and you have
already chosen it before you listed anything.

### Shape it into a narrative

The method's own guidance is to shape raw research into an understandable narrative rather than a
list of complaints — and the standard instrument for it is a **user story**:

> As a **[type of user]**, I want **[goal]** so that **[outcome or benefit]**.

The user story format earns its place because it forces outcome thinking. Its third clause is the
one that matters: it will not accept a feature as an outcome.

The story describes the **goal**, not how the solution works. A user story that specifies the
mechanism has re-introduced the want.

### Ground it in something you actually have

A need is not invented in this step; it is read out of what is known — research, usage data,
support history, interviews, quantitative and qualitative sources. The customer's own words are the
starting material.

**When the need is an inference rather than something the customer said, say so.** "Users need X" is
a strong claim. If X is your inference from three signals, it is a hypothesis, and the honest
wording is "I believe users need X, because…" — that distinction matters more here than anywhere
else, because everything downstream inherits it.

## What this step produces

- **The underlying job or need**, in the customer's terms, free of any feature
- **User stories** carrying goal and outcome
- **The distinction drawn explicitly** between the stated want and the inferred need
- **The evidence each need rests on**, and which needs are inferred rather than reported

Carry it forward. The next step ranks these against each other, so each one must be stated sharply
enough to be compared.

## What this step is not

- **Not a feature request.** A need with a feature in it is already half a List.
- **Not a solution.** Deciding what to build is three steps away.
- **Not a list of complaints.** Raw input is shaped into a job, not restated.
- **Not a place to prioritise.** Ranking is the next letter.

## Standing rules for this step

1. **Name the job, never the feature.** If the need contains a noun that names an artefact, it is a
   want.
2. **Use the story's outcome clause, or do not use the story.** An outcome is the point.
3. **Mark every inferred need as inferred.** Confidence here is inherited by everything downstream.
4. **Slow down here.** The method is explicit that this is the step to spend the time on.