# Rules, not names (owner ruling — 2026-10-10)

## What a "rule" is

A **rule** is a *cause* — a thing that actually governs the rendered result.
A **name** (class, id, tag) is only a label; it changes nothing unless a rule
references it. So we compare the rules that fire, not the labels.

- **HTML rule** — the structural/content rule the markup obeys: element type,
  what may nest inside what, block vs inline, void elements, and **counts**
  (`this block has five children`). The rule is the *shape*, not the tag's name.
- **CSS rule** — a selector + declaration block (`p { margin: 3px }`). The rule
  is the property/value pair — and at runtime, the value the browser **resolves**
  after the cascade (specificity, order, inheritance). Two builds with totally
  different names render identically if the same declarations win. So compare
  the declarations that fire and their **computed** values, never selector text.
- **JS rule** — the behavioural rule: event → effect, in order, with timing
  ("on click show Y"; "ticker advances every 4.2s"; "mouseout to top opens the
  modal"). The rule is what fires, in what sequence, at what speed.

"Rules not names" ⇒ compare the **causes**: winning CSS declarations and their
computed results, the DOM's structural shape and counts, and event→behaviour
mappings with timings. Names are only a pointer to where a rule lives.

Consequence for our diff output: `tag-overlap` and id lists (`tick`, `thm`,
`gl`, `share`, `galwrap`) are a *name* signal — a pointer, not the target. They
tell us where to look, not what to fix.

## Mapping is per state (like-for-like)

Mapping happens **by state**, and each mapped pair is compared **like for
like**:

- **ambient ↔ ambient** — what shows when the page loads, on both sides.
- **conditional ↔ conditional** — the *same* action/condition driven on both
  sides, then compared (click X on both, then compare; resize on both, then
  compare).

Within each mapped state we ask: **do both sides expose the same HTML rules,
CSS rules and JS rules *in that state*?**

- ambient → the HTML/CSS/JS rules available at load.
- conditional → the rules that appear or change after that same action/key/event.

So the question is never "does the page match" in the abstract — it is "in this
state, are the rules equal on both sides?" A **yes** is the target; a **no** is a
divergence to fix at the source. We never compare ambient on one side against a
conditional on the other.

## The ruling on the car page

Asked: can the car page be fixed so its runtime rules equal the reference's?

**Answer: YES.** The runtime is stack-agnostic — the browser exposes the same
DOM, the same CSSOM (computed styles), and the same event/timer behaviour to any
build. Every rule the reference produces can be produced by ours, whatever the
source stack. What differs is the source needed to get there, not whether it is
achievable.

## Open item — the skill is not done

`~/.agents/skills/runtime-ui-diff/SKILL.md` does **not** yet encode "compare
rules, not names". That update is **NOT DONE** and is an open task: the skill
work is unfinished. A `TO DO` marker has been placed in the skill so a future
session picks it up. Finish the skill before treating it as the settled method.

## Status of the car-page rebuild

- Rebuilt the car route to the measured runtime shape: build went from
  **153 nodes → 365 nodes** (ref 338); default-state **tag-overlap 82.6%**.
- Remaining divergences are to be worked **one at a time**, on mapped parts,
  judged by rules (structure counts, computed CSS, behaviour) — not by names.
- Rebuild not finished; not claimed as done.
