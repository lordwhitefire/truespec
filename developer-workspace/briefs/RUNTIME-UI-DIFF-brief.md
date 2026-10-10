# RUNTIME-UI-DIFF — brief

## What was asked

A **full runtime comparison** between the reference pages and our build — not a
targeted shortlist, not source-vs-source.

- Compare **runtime vs runtime**: the reference page as the browser produces it,
  against our build as the browser produces it. Never source of one against the
  other.
- Cover **everything**, in all three layers: **HTML** (structure), **CSS**
  (style, including animation), **JavaScript** (behaviour).
- Include **states**: everything that only appears or runs after a condition
  (click, hover, resize, scroll, open a panel/modal/toast) — the full checklist,
  not a hand-picked few.
- Output is **divergence between the two pages** — where and how much they
  differ. It detects; the human examines. It does not explain or fix.
- Use **one persistent, visible browser** — attach over CDP, reuse the same
  window, never headless, never a swarm of processes. The pattern is already in
  `/home/lordwhitefire/piper/novel_reader.py`.
- Read the **reference's own source** only to *discover* the complete list of
  states we cannot see from the default render. The comparison itself stays
  runtime-vs-runtime.

## What "done" looks like

A working capability — the `runtime-ui-diff` skill and its bundled code:

1. Opens both URLs in the one persistent visible browser (2 tabs).
2. Walks a **state checklist** — applying each state identically to both pages.
3. In each state, extracts **everything** on both pages.
4. Produces a **divergence report** per state: HTML divergence, CSS divergence,
   JS divergence — reported as differences found, not as an explanation.

## The one line

Two forms (ambient / conditional) × three layers (HTML / CSS / JS), captured
ref-and-build at every state, then diffed ref-vs-build.
