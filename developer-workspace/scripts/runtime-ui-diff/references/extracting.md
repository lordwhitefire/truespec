# What "full extraction" means — and the bits that must not fool you

The scripts do the work. This file explains what they capture and why, so you can
read their output without being misled.

## What comes back per page, per state

From the DOM (in `extract.mjs`):

- `body` — the whole element tree from `<body>`. Every element, nested exactly as
  it is, with: `tag`, `role` (explicit or the implicit one the tag carries), `id`,
  `cls[]`, an accessible `name`, `hidden`, a `[w,h]` box, and the picked computed
  `style`. Leaf elements also carry a short `text`.
- `flat` — the same tree flattened depth-first, each entry a `path` like
  `body/0:div/2:nav`. This is what the structural diff walks.
- `tokens` — every `--custom-property` read off `:root` at runtime.
- `rules` — the text of same-origin stylesheet rules. Cross-origin sheets can't be
  read (the browser blocks `cssRules`); the count of those is reported separately
  as `crossOriginSheets`, never silently treated as empty.
- `controls` — every `<a>`, `<button>`, `<input>`, `<select>`, `<textarea>`,
  `summary`, or anything with `role`/`tabindex`/`onclick`: `tag`, `role`, `name`,
  `hidden`. This is what you can actually click.
- `hiddenLayers` — containers that are hidden *now* but hold content — the
  overlays, modals and panels that a state will bring out.

Added outside the page (in `extract.mjs`):

- `a11y` — the accessibility tree via Playwright's `ariaSnapshot()`. This is the
  semantic structure a screen reader experiences, and a good second lens on
  "same shape?" when the raw divs differ.

## Why the checklist exists

Anything in `hiddenLayers` is invisible at load. If you capture only the default
state, you never see whether our overlay opens the same way theirs does. Each
state in the checklist is an action performed on both pages so that hidden thing
is on screen in both captures, and can be compared honestly.

## Volatile things — keep them out of the comparison

These change on every load and would drown the real differences:

- image `src` / `srcset` — record that an image exists, not which file.
- a price mid count-up animation — wait for it to settle, or compare the final.
- generated ids/classes (React `:r0:`, hashed CSS-module names, `styled-components`
  `sc-xxxxx`) — note them, but don't treat a hash difference as a real one.
- timestamps, "3 minutes ago", greeting names, live counters.

The scripts keep the raw values; the diff is where you decide what is signal.

## Gotchas

- **Negative findings need proof.** Before saying "our build is missing X",
  confirm the *same locator* finds X on the reference. Otherwise a wrong locator
  and a genuinely-missing element look identical. This is the playwright rule and
  it matters here.
- **Different languages, different trees.** React renders wrapper elements that a
  hand-written page doesn't. The raw trees will rarely be identical node-for-node.
  That is expected — the useful reading is *where* they diverge and *what* anchors
  they share (same ids, same roles, same controls, same tokens), not a naive
  equal/not-equal.
- **A real browser, one window.** Attach to the persistent Chrome; don't launch
  one Chrome per run. One window, a couple of tabs, and the user can watch.
