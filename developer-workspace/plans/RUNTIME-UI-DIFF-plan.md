# RUNTIME-UI-DIFF — plan

## The capability

A skill at `~/.agents/skills/runtime-ui-diff/` (global), whose bundled code does
the whole job end to end:

```
~/.agents/skills/runtime-ui-diff/
  SKILL.md                 — when to use it, the method, the commands
  references/extracting.md — what "everything" means to capture
  scripts/
    browser.mjs  — connect/launch the one persistent visible Chrome; tabs
    extract.mjs  — FULL extraction of a page in a state (in-page + a11y)
    run.mjs      — run the state checklist over both pages → captures to disk
    diff.mjs     — turn two captures into the divergence report
```

## How it maps to the method

- **browser.mjs** — the persistent visible browser (mirrors
  `novel_reader.py`: launch if CDP down, attach, reuse window, detach only).
  Two tabs = ref and build.
- **extract.mjs** — the full capture, no shortlist. Per page: the whole DOM
  tree, per-element computed style, every `:root` token, every same-origin
  rule, the accessibility tree, all controls, all hidden layers. Hidden layers
  are how conditional UI is spotted before a state opens it.
- **run.mjs** — reads a config (`ref`, `build`, `states`). For each state it
  applies the state's actions to *both* pages identically, then extracts both.
  Writes one capture per page per state.
- **diff.mjs** — reads the captures and prints, per state: the structure
  verdict, element-count differences, the first divergences walking both trees,
  outlines, a11y diff, controls diff, hidden layers, `:root` token diff, and
  computed-style diff for elements sharing an id.

## Why the full extraction and the whole state list

The earlier attempt extracted a fixed shortlist of selectors. That can only
surface differences already guessed, and it hid everything the guesser did not
think of (overlays, popups, mobile bar, animations). The correction is: capture
**everything** at every state, then let the divergence show itself.

## Order of work

1. Write the four scripts.
2. Smoke-test against one real pair (ref `car.html` ↔ build `/car/TS-1001`)
   in the default state.
3. Confirm the report shows the real divergence (the reference and build are
   structurally different).
4. Then: read the reference source to enumerate the **full state checklist**
   for a page, add those states to the config, and extend the run.
5. Then: apply this to each page in turn.

## Open items

- The state checklist for a page must be derived from the reference source
  (discovery only).
- Actions in `run.mjs` should tolerate a control that the build lacks — record
  it as a finding instead of throwing.
- Where per-page capture outputs live.
