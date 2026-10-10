# Plan — Complete the `runtime-ui-diff` skill

Status: owner approved 2026-10-10 ("write the plan and go").

## Goal
Make the skill's code embody the method its `SKILL.md` already documents:
compare **rules, not names**; match the documented **report shape**; drop the
TO DO banner; prove it generalises beyond the car page.

## The gap (evidence, not memory)
- `SKILL.md` line 8: TO DO — the skill "does not yet encode **compare rules,
  not names** as the unit of comparison." → still the settled-method blocker.
- `diff.mjs` line 119-126: the structure verdict is a **tag-histogram overlap**
  (`tag-overlap=NN%`) plus id lists — the very "name signal" the SKILL.md calls
  "a pointer, not the target."
- `diff.mjs` line 209-220: CSS is compared only on **elements sharing an id** —
  a name-based match.
- No explicit JS/behaviour (event → effect) section.
- `SKILL.md` §Report shape wants: verdict → **what is common** → first
  divergence → a11y → CSS → behaviour → **what you did not check**. `diff.mjs`
  has no "what is common" and no "what was not checked."

## What a "rule" is, in code
- **Structure rule** = a node's type (tag) + role, its nesting relations, and
  counts. Before comparing: remove framework/void nodes (`script`, `style`,
  `link`, `meta`, `template`, `nextjs-portal`, `noscript`) and **collapse glue**
  (a roleless element with exactly one element child and no name/text) into its
  child. Everything removed is listed as "framework/glue — not a content rule",
  so nothing is hidden.
- **CSS rule** = the computed values on elements matched by **rule-path**
  (collapsed structural position), never selector text, never id.
- **Behaviour rule** = event → effect for a conditional state: the action
  performed and whether both sides reacted the same (resulting controls /
  hidden layers in that state).
- **Names** (ids/classes) = pointer only: the id lists stay, relabelled.

## Report shape (target, per SKILL.md)
1. Structure verdict (rule-based)  2. What is common  3. First divergence
4. Accessibility  5. CSS rules  6. Behaviour  7. What was NOT checked

## Target files
By owner direction (outside the data workspace):
- `~/.agents/skills/runtime-ui-diff/scripts/diff.mjs` — main rework.
- `~/.agents/skills/runtime-ui-diff/SKILL.md` — remove banner, align prose.
- `~/.agents/skills/runtime-ui-diff/scripts/extract.mjs` — only if a needed
  field is genuinely missing.
- new under `developer-workspace/scripts/runtime-ui-diff/runs/{home,inventory}/`.

## Steps
1. Inspect a real capture (`runs/car/captures/default/{ref,build}.json`) to
   build from the actual JSON shape, not from memory.
2. Rework `diff.mjs`:
   a. `collapse(tree)` — prune framework + glue; return pruned list.
   b. Rule verdict + "What is common" + rule divergences.
   c. CSS: match by collapsed path; diff computed style there.
   d. Behaviour section from `snap.actions` + resulting controls/hidden layers.
   e. "What was NOT checked" section.
   f. Keep all raw numbers (nodes, ids, overlap) — demoted to pointers.
3. Verify against the known car truth: car default must read as "content
   structure the same; the build adds N framework nodes", with real diffs named
   — matching the earlier established result (build = ref + framework overhead).
4. Remove the SKILL.md banner; make the prose and the code agree.
5. Prove generalisation: build configs (states enumerated from the reference
   source, discovery only), capture, and diff **home** (`/` vs `truespec.html`)
   and **inventory** (`/inventory` vs `inventory.html`).
6. Verify each run produces a rule-first report; record results.

## Invariants / non-goals
- Extraction still captures everything (no selector shortlists).
- Raw data printed, not deleted — demoted to a pointer.
- The app is not modified in this change.
- Reference source is read for state discovery ONLY; never diffed.
- One persistent visible Chrome; no headless.

## Verification (how I prove it, not assume it)
- `node ~/.agents/skills/runtime-ui-diff/scripts/diff.mjs <captures> default`
  runs clean on the existing 23-state car captures.
- Car default rule-verdict matches the previously established truth.
- Reports lead with a rule verdict; names only as pointers.
- Banner gone (`grep`).
- home + inventory each produce a report.
