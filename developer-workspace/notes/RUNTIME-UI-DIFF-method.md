# RUNTIME-UI-DIFF — the method (terminology + how)

Full runtime comparison of two pages: the **reference** and our **build**.

---

## Two forms

Every piece of what a page presents has two forms:

- **Ambient** — there the moment the page opens, without touching anything. The
  as-loaded HTML, the as-applied CSS, the JS that already ran, and animation that
  plays on its own.
- **Conditional** — only appears or runs *after* a condition is met (a click, a
  hover, a resize, a scroll, focus, an event).

Plain: **ambient = it's there when the page opens; conditional = it only happens
when you do something.**

## Three layers

Within both forms, there are three layers:

- **HTML** — structure (the DOM as it exists).
- **CSS** — style, including **animation**.
- **JS** — behaviour (what runs; what reacts to events).

## A state

A **state** is a condition we set the page in to make something conditional
show up. It is the "something you do". The complete set of them is the
**checklist**. Examples (non-exhaustive):

- open the page (the default state)
- different screen widths — responsiveness
- hover
- focus
- click a button that toggles / opens
- open a tab, an accordion, a modal, an overlay, a lightbox
- a toast that appears
- scroll
- time-based animation
- data-driven variation (card A vs card B; the one item that is sold)

## The matrix

Everything captured falls in one of six cells:

|            | HTML          | CSS                | JS             |
|------------|---------------|--------------------|----------------|
| **ambient**| as-loaded DOM | as-applied + auto-animation | ran on load |
| **conditional** | DOM under a state | styles under a state | handlers under a state |

## The comparison

The **comparison is always ref vs build at the same state** — never ambient
against conditional, never ref's HTML against build's CSS.

For each state: capture ref and build, then diff **ref-that-state vs
build-that-state** across all three layers.

## Where the checklist comes from

Ambient we get by simply opening the page. But the conditional states cannot be
guessed from the default render, and cannot be picked by hand (that is how the
targeted method failed). So:

- Read the **reference's own source** to enumerate **every** condition that can
  cause a change — its ambient ones and its conditional ones.
- That source is used for **discovery only**. The comparison never diffs source;
  it is always runtime-vs-runtime.

## The browser

One **persistent, visible** Chrome:

- if CDP is not alive, launch it; then attach (`connectOverCDP`);
- reuse the open window, one tab per side (2 tabs is fine);
- on exit, detach only — the window stays open for the next run and for the
  human to watch and click.
- Never headless. Never a second instance. Never a swarm.

The working pattern is `novel_reader.py` (ensure CDP → attach → reuse/detach).

## What "divergence" means

The report answers: at this state, do these two pages differ — in HTML, in CSS,
in JS — and how much. It does **not** decide which side is right and does not
fix. The human examines the divergence.
