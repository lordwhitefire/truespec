---
name: decision-brain-precedence
description: "Which brain wins when two disagree — an agent carries its own workspace's model into every workspace, both are consulted, and the workspace being worked in wins on a clash. Use on entering a workspace, when a consultation returns something unexpected, or when deciding which material governs."
metadata:
  generatedBy: "1.0.3"
---

# Brain precedence — which brain wins

There is more than one brain in play, and they do not have equal weight. This is the rule for
choosing.

## The one rule

> **Both models are consulted. The workspace you are working in wins on a clash.**

An agent **carries its own workspace's model with it** into every workspace it enters. That
carried model is how the agent thinks — its judgment, its patterns. **It is not set aside because
the agent walked into someone else's workspace.** An expert does not arrive in a new room with an
empty head; they arrive with their expertise intact.

So when a workspace declares a model of its own, there are **two**, and neither is a fallback for
the other:

| | Governs | Rank |
|---|---|---|
| **the model the agent carries** | how **the agent** thinks and decides | outranked on a clash |
| **the model of the workspace being worked in** | how things work in **that workspace** | **wins on a clash** |

On any point where they disagree, the working workspace's model **supersedes** the carried one.
Not gap-filling — the carried model is consulted in full, and simply loses where the two conflict.

**Without the carried model the agent is an empty file with tools.** There is no thinking pattern
behind the calls, which is why it is consulted even when the working workspace has a model of its
own.

## The universal three-part format

Every brain is the same three parts, wherever it lives:

1. **mental model** — judgment: how an expert decides
2. **ontology** — structure: named concepts and their relations
3. **knowledge base** — the material the mental model was built from

A brain folder may hold one, two, or all three. A scout reports whichever it found.

## Where each layer sits

| Brain | Location |
|---|---|
| **the model the agent carries** | the `intent/` directory of the **agent's own** workspace — the three parts under it are `mental-model/`, `ontology/`, `knowledge-base/` |
| **the working workspace's model** | declared per workspace in `.opencode/domain-brain.json`; paths are **relative to that workspace** |

Neither row names *which* model. The agent's own is wherever the agent came from; the other is
whatever the workspace it is standing in declares. A skill that hardcoded either one would only
work in one place.

## Declaring a workspace's brain

1. On entering a workspace, **spawn the Decision agent with a scout dispatch naming it** — see
   `decision-consultation`. You do not search for the brain yourself.
2. If brain material comes back, **write the returned declaration data verbatim** to
   `.opencode/domain-brain.json` at the workspace root.
3. If it reports no brain, **write nothing.** No declaration — and the agent still carries its own
   model, which is then the only one consulted. It is not a fallback: it was never one.

The declaration names the workspace's brain paths. It is the block's own configuration, not brain
content, which is why it is the one declared path you can always read and write.

## The hard block

**Direct reads and writes into declared brain paths are refused at the tool boundary** — in the
framework workspace and in any consumer workspace alike. The Decision agent is the only reader.
This is the rule that an agent owns its mental model and may not read it: ownership is not
access.

## Never

- **Never hardcode a workspace's brain.** It is declared, not assumed, so the same framework
  works in any consumer workspace.
- **Never drop the carried model because the workspace has one of its own.** Both are consulted;
  the workspace wins the clash, it does not silence the other.
- **Never let the carried model override the model of the workspace being worked in.**
- **Never read a declared brain path directly**, not even to check a citation.
- **Never write a declaration the scout did not return.** Verbatim, or nothing.
