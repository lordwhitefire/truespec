# RECON-001 — home page runtime check (reference vs build)

**Date:** 2026-10-09. **Comes from:** owner instruction — check the home page against
`/home/lordwhitefire/current-project/test-truespec-v2/truespec.html` in a browser: HTML structure,
CSS, JS. This is the Phase-E1-style runtime comparison applied to the one screen (B1) whose
report already exists. **No screenshots** (owner ruling); the owner checks the look by hand.

## What is being compared

| Side | URL |
|---|---|
| Reference | `file:///home/lordwhitefire/current-project/test-truespec-v2/truespec.html` (or served same dir) |
| Build | the dev server's `/` (started if not running: `npm run dev` in project root) |

Both opened in real Chrome via `playwright-core` (`developer-workspace/scripts/runtime-compare.mjs`,
read-only — navigates and reads, writes nothing to either site).

## Method — three diffs, per owner's verification ruling

**1. HTML / structure (live DOM after JS runs)**
- Ordered section skeleton of `<body>`: tag + class signature for top-level sections, both sides.
- Class inventory: classes in ref missing from build, classes in build not in ref.
- Element counts per class (ref vs build) — catches extra/missing nodes (e.g. cards, slides).
- Headings (h1–h4) text, in order.

**2. CSS (computed, not source)**
- All CSS custom properties on `<html>` — token-by-token equality.
- Per-class computed style of the first matching element: ~40 properties (layout, box, type,
  colour, border, grid/flex) + bounding rect — ref value vs build value.
- Matched rules for any class whose computed styles differ (walk `el.computedStyleMap` /
  `CSSStyleSheet` rules to name the winning declaration) — only for differing classes, to keep
  the report readable.
- Run in **both modes** (dark default, light after `data-theme=light`).

**3. JS (runtime behaviour)**
- Console: errors/warnings/pageerrors on both sides (filtered of React dev noise).
- Behaviour probes on the build (events → observed state change), each also run on the ref as
  the oracle:
  1. Hero slider — auto-advance + arrow/dot navigation changes the active slide.
  2. Inventory tabs (Available / On order / Landed) — switches the grid + count.
  3. "Show all" — reveals the full grid.
  4. Featured slider — arrows/dots move it; 1/2/3 cards per row at 560 / 820 / 1100.
  5. Theme toggle — flips `data-theme`, choice persists across reload, device setting ignored.
  6. First-visit welcome modal appears on a clean profile; dismiss stores the flag.
  7. Ask-bar answers, social-proof toast, return bar — present and firing per ref.

**Widths:** 560, 820, 1100 (phone / tablet / laptop) — structure + CSS diff at each;
behaviour probes at 1100 plus the tab/slider probes at 560.

## Steps

1. Confirm/start the dev server; confirm the reference file opens in Chrome.
2. Run `runtime-compare.mjs` at 560/820/1100 × dark/light → token, class, structure diffs.
3. Write a small probe script (in `developer-workspace/scripts/`) for the 7 behaviour checks —
   same script runs against ref and build; report = expected vs observed, per side.
4. For every differing class, pull the matched rules so the report says *which rule* diverges.
5. Write `developer-workspace/reports/RECON-001-home-runtime-check.md`:
   verdict per section (structure / CSS / JS), the diff tables, and a failure list —
   screen, what was done, what was seen, what was expected. **Fix nothing in this pass.**

## Out of scope

Any other screen, any fix, screenshots, source-file diffing (the comparison is over the
rendered pages only).

---

## Change (rev 2) — 2026-10-09: rewrite `home-probe.mjs` to the installed skill

**Why.** The first `home-probe.mjs` (step 3 above) crashed: on the reference side,
`page.click('.tab[data-t="o"]')` timed out — the first-visit welcome modal overlay
(`#ovl`) intercepted pointer events, and the probe ran one long, non-isolated session with
fixed `waitForTimeout` sleeps. **Design error in the probe, not a Playwright fault.** Full
account: `reports/RECON-001-probe-error-and-skill.md`.

**Authority.** Owner ran the skill-search command; it surfaced the Playwright authoring skill,
and the owner approved installing **`playwright-core`** (`hzijad/playwright-agent-skills`) →
`~/.agents/skills/playwright-core`. Its rules now govern step 3:

- **No `waitForTimeout`** — every wait is a state wait (modal/toast visible or hidden,
  `data-theme` changed).
- **Accessible locators first** (`getByRole`) — theme button, hero/featured arrows, tabs,
  "Show all", modal close. Stable-id containers (`#hero`) only to disambiguate; no class
  selectors.
- **Strict isolation** — one fresh browser context per check (clean localStorage), runnable in
  any order; the first-visit-modal state is therefore deterministic.
- **Provable assertions** — each negative assertion ("toast not visible at start", "ask hidden")
  is checked once against the same locator resolving when the element *is* present.

**Revised step 3.** Rewrite `developer-workspace/scripts/home-probe.mjs` under the rules above;
re-run against ref and build at 1100/dark. Add the 560-light HTTP-500 case as a separate
isolated check (transient vs reproducible). Then continue steps 4–5 (matched rules; report).

**Unchanged.** No fixes to either page; no screenshots; report only.
