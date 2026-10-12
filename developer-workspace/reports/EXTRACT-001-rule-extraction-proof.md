# EXTRACT-001 — proof that the rule-extraction method captures everything

**Status:** proof run complete, evidence archived. Testing of the evidence is a
separate step (this is the extraction run, not a test run — nothing here claims
the method is "tested").

## What this proves

`openspec/research/rule-extraction-methods.md` claims the method captures
**every element, every HTML/CSS/JS rule**, with nothing silently dropped and
nothing invented. This run proves each of the task's benchmarks on the live
pair, through the running pages only — never by diffing the two source trees.

The extractor: `developer-workspace/scripts/extract-rules.mjs` (single file,
reproducible). Config: `developer-workspace/scripts/runtime-ui-diff/extract-001.config.json`.
Artifacts: `developer-workspace/scripts/runtime-ui-diff/runs/extract-001/`.

## Method in one paragraph

One persistent, visible Chrome on CDP `:9222`, two tabs (reference `:3211`,
build `:3210`), never headless. Each side is driven through 9 states and in each
state the tool records, **from the running page**:

- the element inventory (own tree walk) plus the page's own element count
  (independent `querySelectorAll` census) — they must agree;
- the CSS: sheet headers from CDP, sheet **bodies via `CSS.getStyleSheetText`**,
  each body parsed (`parseCss`, validated earlier), so every rule is a rule
  present on the page with a byte range; rules carry `kind`, the full selector,
  `@media/@supports` context, and are **matched against the live DOM** state by
  state;
- per element, the computed values for a **closed list of properties**, so a
  property that never appears is visible as `<absent>` instead of missing;
- every JS handler via `DOMDebugger.getEventListeners` on each node,
  `window`, and `document` (pierce into shadow roots), plus inline `on*`
  handler attributes;
- a **planted rule** appended at the end — a labelled style and element that are
  not part of either site — to prove dynamically-created CSS is caught.

An element/rule once recorded is only marked `used` if a driven state matched
it. CDP's own rule-usage tracking is recorded as corroboration only (offset
join), never as the sole evidence for used/unused.

## Reference — car not found (`http://localhost:3211/car.html?car=1999-not-a-real-car`)

| Claim | Result | Evidence |
|---|---|---|
| Elements | **163** — our walk == the page's own count, every state. Farewell adds exactly **5** modal elements (168) | `reference.json` → `snapshots.*.elements`; `counts.qsa` |
| CSS rules | **2274** present (style 2140, at-block 6, keyframes 22, keyframe frames 60, `@font-face` 46); **used 102**, unused **2038**; every unused flagged with a reason | `reference.json` → `ruleRegistry`, `reference-rule-ledger.txt` (one row per rule) |
| Rule reasons at a glance | **7** `unmatchedBecauseInactiveMedia` (**6 from `fontawesome.min.css` screens/print**, 1 attribute; all 2140 matchable selectors run), **2031** `unmatchedBecauseNoElement` (present sheet rules that match no element in *any* driven state), **0** unmatchable — no rule failed to be checked | ledger + `comparison.json→ref` |
| Properties | closed list of **497** properties on every element; `<absent>` marks columns the browser has no value for; `propsOnlyInDrivenStates = 0` — the list is fully known at baseline, nothing appears later | `reference.json` → `closedList`, `snapshots.*.vals`, `propsOnlyInDrivenStates` |
| JS behaviour | **17** handlers (hover/click/scroll/theme) + **9** elements with inline `on*` handlers — all named | `reference.json` → `handlers`, `inlineHandlers` |
| Planted rule | caught: `inStyleSheets true`, `plantedSheetRuleCount 1`, computed outline `7px rgb(7, 7, 7)` applied, 1 matching probe element | `reference.json` → `plant` |

**Hidden/dynamic rules the driven states surfaced (proves state coverage is
needed, not just load):** `firstMatchedNewly = 8` —
`html[data-theme=dark]` and `.thm:hover` (theme state), `body.lock`, `.mp`,
`.mbtns`, `.mbtns button`, `.mbtns .sk`, `:focus-visible` (farewell state).

## Build — car not found (`http://localhost:3210/car/NOPE-9999`)

| Claim | Result | Evidence |
|---|---|---|
| Elements | **196–197** (page's own count agrees with our walk); **2 shadow hosts** = the Next.js dev overlay, counted separately, never folded into the plain count. Farewell adds no elements (no modal) — build farewell swaps a class instead | `build.json` → `snapshots`, `notesShadow` |
| CSS rules | **2960** present (style 2779, at-block 25, keyframes 27, frames 74, `@font-face` 55); **used 139**, unused **2640**; every unused flagged with a reason | `build.json` → `ruleRegistry`, `build-rule-ledger.txt` |
| Rule reasons | **22** inactive-media, **2616** no-element, **2** unmatchable (both build-only interstitial selectors) | ledger + `comparison.json→build` |
| Properties | closed list of **701** properties; 166 are dev-overlay custom-property columns that appear only *after* the baseline state — disclosed per state (`missingProps` = the same 166) rather than hidden; their declared values are captured as `:root{--color-*:…}` rules in the ledger | `build.json` → `closedList`, `propsOnlyInDrivenStates`, `snapshots.*.missingProps` |
| JS behaviour | **579** handlers recorded by CDP (`pierce:true`), the site's own plus the dev overlay's; **0** inline `on*` elements (build uses listeners, matching its React stack); 2 shadow hosts' trees walked | `build.json` → `handlers` |
| Planted rule | caught identically: `inStyleSheets true`, `plantedSheetRuleCount 1`, computed outline `7px rgb(7, 7, 7)`, 1 matching probe element | `build.json` → `plant` |

Build `firstMatchedNewly = 6`: `html[data-theme="dark"]`, `.thm:hover`,
`button:focus`, `button:focus:not(:focus-visible)` (theme state),
`.tick span.out` (farewell state), `:focus-visible` (keyboard state).

## Benchmark-by-benchmark

1. **Every element listed; count matches.** `elementCount 163 == elementCountIndependent 163` (reference), `196 == 196` (build). The per-state snapshots also prove the *state* element set: reference farewell = 163 + exactly the 5 modal nodes (`body.lock` layer), so elements that only exist under a driven state are captured, not assumed.
2. **Every rule, used/unused, reason stated.** Each registry row is a parsed rule from the sheet body the running page served; `used` requires a match in ≥ 1 driven state; unused rows carry one of `unmatchedBecauseInactiveMedia`, `unmatchedBecauseNoElement`, or `unmatchableSelectors`. `reference-rule-ledger.txt` / `build-rule-ledger.txt` are the human-checkable one-rule-per-row views. Reference: 0 unmatchable — 2140 style selectors all had their match attempted and recorded.
3. **Closed property list, absence visible.** `<absent>` is returned for any column the browser reports no value for; the column list is recorded with each snapshot so nothing can silently go missing. Reference has zero post-baseline properties; the build's only additions are the 166 dev-overlay tokens, named.
4. **JS behaviour named.** Every **event handler** is captured by CDP listener enumeration (window, document, every node, pierce into shadow) and every inline `on*` attribute is named; the driven states prove what changes (theme flips `html` `color` `rgb(0,0,0)`→`rgb(255,255,255)` on reference; farewell inserts the 5 modal elements with `body.lock`).
5. **Comparable build inventory.** The identical runner produced the build ledger, snapshots, and renders the same comparison lines (`comparison.json`): `rulesOnlyInReference 234`, `rulesOnlyInBuild 920`, `selectorsOnlyInReference 7` (incl. `*,*:before,*:after`, `.gal:hover .gb,.gb:focus-visible`, `.in,.rv`, `.inf>i`, `html[data-theme=dark]`), `selectorsOnlyInBuild 569` — which break into the dev overlay's own classes (`.nextjs-*`, `.dev-tools-*`, `.error-overlay-*`) and genuinely build-authored CSS (`.band`, `.big-price`, `.card`, `.gallery`, `.hero`, `.btn-whatsapp`, …). Runtime-only: no source tree was diffed.
6. **Planted rule caught.** The probe (`.extract001-planted{outline:7px solid rgb(7,7,7)}`) is appended after everything, verified two ways: it is **in the browser's own `document.styleSheets`** (`inStyleSheets true`, `plantedSheetRuleCount 1`) *and* it applies (computed `outline 7px rgb(7, 7, 7)` on the probe element). Both sides. This is the proof that a rule created after the initial census is still seen.
7. **Nothing invented.** The rule universe is exactly the sheet bodies fetched from the live page and parsed; every row traces to a `sheet@inline|link::start-end` range plus selector (the registry key). No row is synthesized; a rule is marked used only on a live match; the only non-matching classes are `unmatchableSelectors = 2` on the build (both present on the page, named in the ledger).

## What is named rather than hidden (the gaps)

- **Build dev overlay.** The Next.js dev overlay *is* the second shadow host and *is* dev infrastructure, not the site. It drives the 2 shadow hosts, the 166 post-baseline custom-property columns, and most of the build-only selector list. It is counted separately and disclosed — never folded silently into the site's numbers.
- **Transient dev pages.** The busiest build navigations occasionally serve a temporary compile/error page (tens of elements). These are retried and the retries recorded (`loadRetries: 1` on the final build run); a state is never recorded from a broken page (hard-fail instead), and the recovered `ruleTotal` is stable (2960) across runs.
- **12–16 overlay sheet-header events** had no body text on one build run (`missingSheetText`); the same overlay sheets are re-captured in at least one other state, so union coverage is unchanged. Named, recorded, provably non-silent.
- **`#gal` is genuinely absent** on the not-found page on *both* sites, so the `gallery` state correctly reports 1 missing control on both — an expected finding, not a gap.
- **Farewell/toast session budgets.** The reference keeps a per-visit budget in `sessionStorage` (2 modals per visit, one toast per session). The run clears only the inspection tab's `sessionStorage` before those two states to emulate a fresh visitor — test setup, site files untouched, config shows `resetSession: true`.
- **Coverage is corroborating only.** CDP's rule-usage tracking (reference 95 ranges, build 134) is offset-joined to rules as secondary evidence; used/unused always rests on the per-state DOM matches.

## Rerun

```
rm -rf developer-workspace/scripts/runtime-ui-diff/runs/extract-001 && \
node developer-workspace/scripts/extract-rules.mjs \
  developer-workspace/scripts/runtime-ui-diff/extract-001.config.json \
  developer-workspace/scripts/runtime-ui-diff/runs/extract-001
```

Requires the persistent Chrome on CDP `:9222` with both pages open (the runner
only attaches; it changes neither site).

## Artifacts (final run)

```
runs/extract-001/reference.json        reference.json  49.9 MB — elements, rules, registry, handlers, snapshots, plant, coverage
runs/extract-001/build.json            build.json      38.1 MB — same, build
runs/extract-001/comparison.json       summary + rule/selector-only deltas
runs/extract-001/meta.json             run bookkeeping
runs/extract-001/reference-rule-ledger.txt    every reference rule, one row, with used/unused + reason
runs/extract-001/build-rule-ledger.txt        every build rule, one row, with used/unused + reason
```

Each snapshot row records its own column list (`closed`) and which final
columns it could not provide (`missingProps`, only the build's 166 overlay
tokens), so the property tables are checkable column-by-column, not just
count-by-count.