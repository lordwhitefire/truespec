---
name: decision-consultation
description: "Consult the Decision agent correctly — the scout dispatch, the craft dispatch, what to send, what comes back, and the never-list. Use before declaring a decision, at Plan, or whenever a question needs answering from the brain."
metadata:
  generatedBy: "1.0.3"
---

# Decision consultation — hand over the package, get a decision

The Decision agent (`decision-agent`) is **one generic consultant**, the same file for every
agent and every project. **It has no framework and no mental model of its own** — its authority
is borrowed, never owned. It is the only reader of the brain; you are the executor.

**The skill supplies the job.** Without a skill telling it to advise, it does nothing. That is
by design: same file, every time.

## Who does what

| | You | `decision-agent` |
|---|---|---|
| reads the brain | **never** | **only** |
| reasons the answer | **never** | yes |
| executes | yes | no — it is read-only apart from the one decision it records |
| owns the mental model | your workspace does; **you may not read it** | it owns none of what it reads |

## Dispatch 1 — scout, on entering a workspace

Before any substantive work, spawn it with a **scout dispatch naming the workspace**.

- If it returns brain material (one or more of mental model / ontology / knowledge base found),
  **write the returned declaration data verbatim** to `.opencode/domain-brain.json` at the
  workspace root.
- If it reports **no brain found**, write nothing and proceed. The workspace gets no declaration,
  and its questions are answered from its own workspace's brain through the decider.

Do not look for the brain yourself. The scout's answer is the declaration.

## Dispatch 2 — craft, before you declare and again at Plan

Spawn it with the **whole package** and one question — *"what is your decision?"*

**What to send — the whole package, together, not in pieces:**

- the skill you are operating under
- what the owner said
- what you have found so far, and your analysis of it
- the results of anything you ran, and what those results showed
- the one question

**What comes back — the decision, and where it is.** It works the answer out, writes it into its
own `decisions/` folder together with the brain elements it cited, and hands you back the **path**.
You read it there. Do not go looking for it anywhere else.

**It may ask for more** material or analysis. Provide it and re-present the package until it
answers. A partial package gets a partial answer, so re-presenting the whole thing is the point.

## Knowledge-base material comes through the decider too

When a question turns on material that lives in a knowledge base — how to divide something up,
what to call it, which of two options fits — that reasoning is **consulted through the Decision
agent**: dispatch the question, and it returns the relevant knowledge-base material with its
citations. You record which material informed each decision.

The material that answers it sits in the knowledge base of the brain for the workspace you are
working in — the decider brings it back to you with its citations. You do not open it.

**The material guides; it is never a gate.** A judgement that differs from what a source suggests
is still accepted, unless it breaks a mechanical invariant you can actually test. Only a real
check can reject it — never a source's opinion.

## Execute the returned decision

You execute what it decided, within the scope you declared. **If you disagree with it, raise the
disagreement to the user.** You do not silently re-derive it and you do not override it.

## Never

- **Never open a brain path yourself** to check a citation, and never invent one. If a citation
  is missing from the returned decision, ask the decider again — do not look it up yourself.
- **Never consult your own mental model.** It lives in your workspace; the Decision agent reads
  it on your behalf and hands the decision back.
- **Never pass a partial package** and expect a complete decision.
- **Never treat the decision as optional.** The judges measure the work against it; without it
  there is nothing to check.
- **Never expect it to act.** It advises; you execute.