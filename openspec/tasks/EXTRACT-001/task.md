# EXTRACT-001 — Prove the rule-extraction method

## What this is
A verification task, not a product change. It exists to find out whether the method described in `openspec/research/rule-extraction-methods.md` really captures **every element and every HTML/CSS/JS rule** on a live page — with nothing silently dropped and nothing invented. If it does not, everything built on top of it inherits the gap.

## Why it is needed
The method is a set of claims. A claim that enters the architecture unproven is the same failure as a rule that enters the model unproven. This run is the proof.

## Where it runs
Two pages, already open on Chrome CDP `localhost:9222`:
- **Reference** — `http://localhost:3211/car.html?car=1999-not-a-real-car` (static).
- **Build** — `http://localhost:3210/car/NOPE-9999` (Next.js).

Both are on the same state: **car not found**. Same state on purpose, so the two pages can be read side by side.

## What must be true afterwards
When someone inspects the evidence the run leaves behind:

1. **Elements** — the reference's element inventory lists every element on the page (a count and a tree), and the count matches the page's own element count.
2. **CSS rules** — every CSS rule present on the reference is listed, each with a used/unused flag, and every rule flagged unused has a stated reason.
3. **CSS properties** — for each element, the values the browser returns for the closed list of CSS properties are recorded, so a property that never appears is **visible as absent** rather than silently missing.
4. **JS behaviour** — every handler that can change the DOM or CSS (hover, click, scroll, and any CSS-in-JS) is named, together with what it changes when the page is driven.
5. **The same run on the build** produces a comparable inventory.
6. **A planted rule is caught** — a rule that is hidden on load or created dynamically appears once the page is driven; this is the proof it sees non-static rules.
7. **Nothing invented** — no rule is recorded that is not actually present on the page.

## What must not happen
- No rule is skipped silently. If something is left out, it is named and the reason is stated.
- No rule is accepted as present without evidence from the running page.
- The two pages are compared through the running pages only — not by diffing the two source trees by hand.

## Constraints
- Runtime-only: read the running pages and the states they are driven through.
- Reuse before rebuild: the existing runtime-divergence scripts are the starting point; they are extended only where they cannot reach.
- Read-only over the two pages: this run changes nothing about either site.

## Left to judgement
Which tools to use (the existing scripts, `extract-css-core`, `domcssdump`, CDP coverage, or new), and how the states are driven, are the Builder's choices; the benchmarks above are what must hold whatever is chosen.
