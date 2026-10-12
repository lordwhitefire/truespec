# Research: extracting all HTML, CSS and JS rules from running code

- **Date:** 2026-10-11
- **Author:** Architect
- **Status:** research note. Not a change. No decision taken yet.
- **Feeds:** the question *"is there a proven way to work through a code/page and find every element and every rule (HTML, CSS, JS)?"*

---

## 1. The question

When we compare a build against a reference, we need to be sure we have captured **every element and every rule** — all HTML rules, all CSS rules, all JS rules — with nothing silently dropped and nothing invented. This note records what was found when that was researched.

---

## 2. The universe is closed: three languages, one pipeline

A browser converts **HTML, CSS and JavaScript** into pixels, and nothing else. Anything else on a page — images, SVG, canvas, fonts — is content placed by HTML/CSS or pixels drawn by JS; it does not escape the three.

Source: MDN, *Critical rendering path* — "the sequence of steps the browser goes through to convert the HTML, CSS, and JavaScript into pixels on the screen […] includes the Document Object Model (DOM), CSS Object Model (CSSOM), render tree and layout."
<https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path>

The pipeline (MDN, web.dev): parse HTML → DOM; parse CSS → CSSOM; combine → render tree; layout; paint; composite. JS only matters insofar as it changes the DOM or CSSOM.
<https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work>
<https://web.dev/articles/rendering-performance>

**Consequence:** the set of rules that can render is finite and specified. "Every rule" is well-defined once we say "every rule expressible in HTML, CSS and JS, as actually used by the page."

---

## 3. The method in one line

Do not invent an extractor. Use **the browser's own two models** — the **DOM** (all the HTML) and the **CSSOM** (all the CSS) — plus a parse of the **JavaScript**.

---

## 4. Finding ALL the elements

Two ways; good tools use both.

- **Read the code (static):** parse HTML into a tree. Tools: `parse5`, `htmlparser2`.
- **Ask the browser (live):** `document.querySelectorAll('*')` returns every element on the page; walk that tree.

## 5. Finding ALL the HTML rules

The element tree *is* the HTML rules: each element, its tag, its attributes, its text, its position in the tree. An HTML parser yields all of it.

## 6. Finding ALL the CSS rules

Three levels, all real and named:

1. **What is written** — `document.styleSheets` → every sheet → `.cssRules` → every rule. Catches `<link>` files, `<style>` blocks, and CSS created by JavaScript (CSS-in-JS), including `adoptedStyleSheets`.
   Method: CSS-Tricks, *How to Get All Custom Properties on a Page*; Project Wallace, *How Project Wallace extracts all CSS from any webpage*.
   <https://css-tricks.com/how-to-get-all-custom-properties-on-a-page-in-javascript/>
   <https://www.projectwallace.com/blog/extracting-css-from-webpage>
2. **What a rule is made of** — each rule = selector + declarations (property: value). Parsers `PostCSS` and `csstree` turn CSS into an AST where every declaration can be pulled, e.g. `csstree.findAll(ast, n => n.type === 'Declaration')`. `csstree` is W3C-spec compliant and models every node type (Rule, Selector, Declaration, at-rules `@media` / `@keyframes` / `@font-face` / `@supports`).
   <https://github.com/csstree/csstree>
   <https://github.com/postcss/postcss>
3. **What actually applies** — `getComputedStyle(element)` returns the resolved value of **all CSS properties of an element** (dash-named and camel-case, shorthand expanded to longhand) after the cascade, for pseudo-elements too. This is the browser's own answer, not a guess.
   <https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle>

## 7. Finding ALL the JS rules

- **Read it:** parse JS into an AST (`acorn`, `@babel/parser`, `espree`) → every function, handler and DOM call.
- **Tie it to elements:** `@osmn-byhn/htmlparser` inlines `<style>` onto the elements it targets and resolves `onclick="f()"` to the actual body of `f`, producing one JSON of element + styles + event functions.
  <https://github.com/osmn-byhn/htmlparser>

## 8. The completeness check (kills "did we miss one?")

Chrome's **Coverage** system — DevTools Protocol `CSS.startRuleUsageTracking` / `stopRuleUsageTracking` / `takeCoverageDelta` (and `Profiler.startPreciseCoverage` for JS) — returns **every CSS rule with a `used: true/false` flag**, and byte ranges of used JS. So every rule can be listed and marked real/unused on the page; nothing hides.
<https://developer.chrome.com/docs/devtools/coverage>
<https://chromedevtools.github.io/devtools-protocol/tot/CSS/#method-stopRuleUsageTracking>

## 9. Tools that already bundle "extract all rules"

- **`projectwallace/extract-css-core`** — extracts all CSS from a URL: server-side, client-side, CSS-in-JS, inline. Built to not miss any. <https://github.com/projectwallace/extract-css-core>
- **`holloway/css-sniff`** — given elements, returns all matching CSS rules (selector + properties), including responsive modes and pseudo-elements. <https://github.com/holloway/css-sniff>
- **`jnpn/domcssdump`** — dumps the DOM tree **plus every `getComputedStyle` value per node**, with hashing/dedup, explicitly built to **diff two versions of a page**. `getStyleNames(node)` = every CSS property known at runtime. <https://github.com/jnpn/domcssdump>
- **`ui.rip` / `viniciuscffreitas/site-deep-clone` / `kkkqkx123/web-clone` / `rblyz/chrome-capture`** — capture the rendered DOM, computed styles, CSS rules with hover/media queries, tokens, breakpoints, animations, routes. <https://ui.rip/guides/how-to-reverse-engineer-websites/>

## 10. Literature and guides found

- MDN, *Critical rendering path* / *How browsers work* (the pipeline; cited above).
- **"On Mining DOM Trees to build Information Extractors"** — Fernández, Sleiman, Corchuelo, Frantz (2011). A *methodology* using DOM-tree + CSS features. <https://exa.ai/library/publication/746sj5dspjg>
- Reverse-engineering overview (ScienceDirect topic) naming web RE tools: **WAVI** (static extraction of HTML/CSS/JS elements), **FireDetective** (dynamic AJAX execution traces), **DynaRIA**, **WARE** (static+dynamic → UML model), **Genie** (interaction model), **Spider** (explicit-state / Markov model). <https://www.sciencedirect.com/topics/engineering/reverse-engineering-approach>
- Guides: ui.rip "How to Reverse Engineer a Website"; freeCodeCamp (API-focused, not HTML/CSS/JS). <https://www.freecodecamp.org/news/how-to-reverse-engineer-a-website/>
- *Practical Reverse Engineering* (Dang et al.) — general RE method, but about binaries/assembly, **not** web pages. Noted so it is not mistaken for a web reference.

## 11. The honest gap

Every route above captures **HTML fully** and **CSS fully**. **JavaScript behaviour is the weak one**: a JS rule is not what the code says but **what happens when it runs** — on hover, click, scroll, typing. Some tools catch pieces (hover/focus computed-style diffs, `getAnimations()`, MutationObserver on `style`/`class`/`transform`), but none gives *all* JS behaviour rules by reading the code alone. That part still needs **driving the page and watching what changes**.

## 12. Open decision (NOT taken)

- Which extraction governs each layer (UI vs functions vs whole-app vs security), and how large a frame we adopt — e.g. **every CSS property actually used on the page** vs **every property the spec allows**. These are very different sizes of job.
- In this workspace decisions go through the Decision agent (`.opencode/skills/decision-consultation`). Not yet dispatched.

## 13. Sources (collected)

- <https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path>
- <https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work>
- <https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle>
- <https://web.dev/articles/rendering-performance>
- <https://developer.chrome.com/docs/devtools/coverage>
- <https://chromedevtools.github.io/devtools-protocol/tot/CSS/#method-stopRuleUsageTracking>
- <https://css-tricks.com/how-to-get-all-custom-properties-on-a-page-in-javascript/>
- <https://www.projectwallace.com/blog/extracting-css-from-webpage>
- <https://github.com/projectwallace/extract-css-core>
- <https://github.com/holloway/css-sniff>
- <https://github.com/jnpn/domcssdump>
- <https://github.com/osmn-byhn/htmlparser>
- <https://github.com/csstree/csstree>
- <https://github.com/postcss/postcss>
- <https://ui.rip/guides/how-to-reverse-engineer-websites/>
- <https://www.freecodecamp.org/news/how-to-reverse-engineer-a-website/>
- <https://exa.ai/library/publication/746sj5dspjg>
- <https://www.sciencedirect.com/topics/engineering/reverse-engineering-approach>
