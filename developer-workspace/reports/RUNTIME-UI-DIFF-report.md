# RUNTIME-UI-DIFF — report

## What is built

The `runtime-ui-diff` skill at `~/.agents/skills/runtime-ui-diff/`, with
working code:

```
SKILL.md
references/extracting.md
scripts/browser.mjs   — one persistent, VISIBLE Chrome (attach; launch if down)
scripts/extract.mjs   — full extraction of a page in a state
scripts/run.mjs       — run a state checklist over both pages → captures
scripts/diff.mjs      — two captures → divergence report
```

How it mirrors the method:

- **browser.mjs** follows `novel_reader.py`: check CDP `:9222`; if down, launch
  `/usr/bin/google-chrome` with the `google-chrome-automation` profile; attach
  (`connectOverCDP`); reuse the open window. Two tabs (A = ref, B = build).
  On exit it only detaches — the window stays open. No headless, no second
  instance.
- **extract.mjs** captures everything (no selector shortlist): the whole DOM
  tree, per-element computed style (a broad property set), every `:root` token,
  every same-origin CSS rule, the accessibility tree (`ariaSnapshot`), all
  controls, and all hidden layers (overlays/panels that a state must open).
- **run.mjs** reads `{ ref, build, states[] }`; applies each state's actions to
  *both* pages identically; extracts both; writes `ref.json` / `build.json` per
  state.
- **diff.mjs** prints, per state: structure verdict, element-count differences,
  first divergences walking both trees, outlines, a11y diff, controls diff,
  hidden layers, `:root` token diff, and computed-style diff for shared ids.

## Verified

Run against the real pair, in the **persistent visible browser** (no headless):

```
node ~/.agents/skills/runtime-ui-diff/scripts/run.mjs <config> <captures>
```

- ref   : `http://localhost:3211/car.html?car=2021-toyota-camry-xse-v6`
- build : `http://localhost:3210/car/TS-1001`
- state : `default`

Output:

```
default/ref:   336 nodes, 51 controls, 14 hidden layers
default/build: 153 nodes, 14 controls,  4 hidden layers
```

`diff.mjs` verdict (full output →
`reports/RUNTIME-UI-DIFF-car-default.md`):

- **Not the same shape.** ref 336 nodes vs build 153; tag-overlap **36.6%**.
- **shared ids: 2** (`top`, `contact`). **ids only in ref: 44** (incl.
  `site-header`, `crumb`, `chips`, `tabs`, `p1`/`p2`/`p3`, `aside`, `rail`,
  `mbar`, `lb`, `ovl`, `ovl`, `ptoast`). **ids only in build: 1** (`_R_`).
- tag counts diverge (div 110↔35, button 17↔3, aside 1↔0, aside/h2/h3/ol …).
- hidden layers: ref 14 vs build 4 — the overlays/panels/lightbox/mobile bar
  that only show under a state are present in ref, absent in build.
- `:root` tokens diverge heavily (ref set vs build set are largely different
  names).
- shared-id computed style differs (`#top`, `#contact` font-family).

This confirms, with real runtime data instead of a guessed selector list, that
the reference and the build are **structurally different (HTML), styled
differently (CSS)** — and that a large set of ref's UI is **conditional** and
must be opened to be seen.

## How to run

```
# one-time: a Chrome window (run anywhere that can reach the project's
# node_modules for playwright-core)
node ~/.agents/skills/runtime-ui-diff/scripts/run.mjs car.config.json captures
node ~/.agents/skills/runtime-ui-diff/scripts/diff.mjs captures default
```

`car.config.json`:

```json
{
  "ref":   "http://localhost:3211/car.html?car=<slug>",
  "build": "http://localhost:3210/car/<ref>",
  "states": [ { "name": "default" } ]
}
```

Run `node` from the project directory so `playwright-core` resolves.

## Not yet done

- The **full state checklist** per page — to be enumerated from the reference
  source (discovery only), then added to the config as states.
- `run.mjs` currently stops if an action targets a control the build lacks;
  it should record that as a finding and continue.
- The two forms are handled for silent capture (hidden layers) but each state
  still needs to be listed and run.
- Page-by-page application (home, inventory, car, …).
