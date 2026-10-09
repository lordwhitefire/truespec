# RECON-001 — probe error, skill search, and the change that follows

**Date:** 2026-10-09
**Task:** RECON-001 home-page runtime check (reference `truespec.html` vs build on `localhost:3210`)
**Author:** Developer

This report records what happened in this session, the error I made, the skill search the owner
triggered, what it found, and the change now written into the plan. It fixes nothing.

---

## 1. What I did, in order

1. **Wrote the plan** — `developer-workspace/plans/RECON-001-home-runtime-check.md`. Three diffs:
   HTML structure, computed CSS, runtime JS. Widths 560/820/1100 × dark/light. Report only, fix
   nothing.
2. **Ran the structure/CSS comparison** — `developer-workspace/scripts/runtime-compare.mjs`
   (Playwright, real Chrome) 6 times against `http://localhost:3210/`. Outputs in
   `/tmp/opencode/rc-{560,820,1100}-{dark,light}.md`. Five ran; the **560-light run returned a
   build HTTP 500** (`Error connecting to database: TypeError: fetch failed`).
3. **Wrote the JS behaviour probe** — `developer-workspace/scripts/home-probe.mjs`. Same script
   run against both sides: theme toggle, hero slider, featured slider, first-visit welcome modal,
   social-proof toast, inventory tabs, "Show all" navigation.
4. **Ran the probe — it crashed** on the first full run (details in §2).
5. **Debugged the crash** with two isolated mini-runs; found the cause (details in §2).
6. **Ran the owner's skill-search command** for the browser/testing tooling (details in §3).
7. **Installed the matching Playwright skill** the owner approved (details in §3).
8. **Wrote the change into the plan** (§4).

---

## 2. The error

**What the probe did.** On one browser session per side it: waited 2.5 s, closed the welcome
modal, toggled the theme, reloaded, clicked the hero arrow and featured arrow, clicked "Show all"
(navigating to inventory), navigated back home, then clicked the "On order" tab.

**The failure.** Playwright threw `TimeoutError: page.click: Timeout 30000ms exceeded — waiting
for locator('.tab[data-t="o"]')` on the **reference** side. The tab never appeared to the locator.

**Classification: design error in my probe — not a Playwright fault.**

**Root cause.** Two flaws in how I wrote it:

- **The welcome-modal overlay.** The first-visit modal (`#ovl`) opens ~1 s after load and
  intercepts pointer events. A debug run confirmed Playwright reporting exactly this:
  `<div id="ovl" class="ovl">…</div> intercepts pointer events`. My probe closed the modal once,
  but the flow is timing-dependent and the state was not reset between phases.
- **A single long, non-isolated session with fixed sleeps.** The probe chained ~8 checks in one
  page session, driving navigation and waiting with `waitForTimeout`. Once the sequence drifted
  (a modal late, a navigation not settled), everything after it was invalid — exactly the
  fragility the (later-installed) skill warns about.

**What is *not* the cause.** Playwright behaved correctly. It waited for the element as designed
and reported a truthful timeout. The script's design caused the failure.

---

## 3. The command, and the skill it found

**The owner ran the skill-search procedure** (`/find-skill`, the global check-and-ask command).
Its steps: (1) list installed skills; (2) check the skills directory (skills.sh) and the web;
(3) report candidates; (4) stop and ask before installing; (5) if nothing matches, say so.

Run for **browser testing**, it found `browser-testing-with-devtools` (addyosmani/agent-skills) —
**already installed**, but requiring the Chrome DevTools MCP server, which is **not** configured
in this project.

Pushed to search for the **actual tool in use (Playwright)**, the procedure found several, with
the vendor's own being the preferred pick. Candidates:

| Skill | Owner/repo | Teaches | Vendor? |
|---|---|---|---|
| `playwright-cli` / `playwright-trace` | Playwright (Microsoft) | drives `playwright-cli` — sessions, snapshots, traces | **Yes** |
| `playwright` | magnus919/agent-skills | operating Playwright — selectors, network, CI | No |
| `playwright-core` (+ auth/network/debug) | hzijad/playwright-agent-skills | authoring discipline: accessible locators, web-first assertions, isolation | No |
| `playwright-skill` | lacksy/tech-leads-club | general automation | No |
| `playwright-skill` | lackeyjb/playwright-skill | on-the-fly scripting | No — **flagged medium-risk by audit** |

**What was chosen and installed (owner approved).** `playwright-core` from
`hzijad/playwright-agent-skills` — because it owns the *authoring discipline* that the crash
violated:

```
npx -y skills add hzijad/playwright-agent-skills --skill playwright-core -g -y --agent opencode
→ ~/.agents/skills/playwright-core   (audit: Safe / Low Risk)
```

**The rule that governs my probe now** (from the installed skill):

- **No `waitForTimeout`.** Wait for the end-state with auto-retrying waits.
- **Accessible locators first** (`getByRole`, `getByLabel`), not CSS classes.
- **Strict isolation** — each check its own clean state; no shared session, any order.
- **Provable assertions** — confirm a negative assertion's locator resolves when the element is
  actually present, so a broken locator can't masquerade as a pass.

Against that rule sheet, my probe violates all four. That is the whole reason it is being
rewritten.

---

## 4. The change, now written into the plan

The plan (`RECON-001-home-runtime-check.md`) gains a "Change (rev 2)" section: **rewrite
`home-probe.mjs` to the installed skill's rules** —

1. One fresh browser context per check (clean localStorage), so the welcome-modal state is
   deterministic and checks run in any order.
2. No `waitForTimeout`; every wait is a state wait (modal visible/hidden, toast visible,
   `data-theme` changed).
3. `getByRole(...)` locators for the theme button, hero/featured arrows, tabs, "Show all", and the
   modal close; stable-id containers (`#hero`) only to disambiguate, never class selectors.
4. Negative assertions proved once against the locator resolving when the element is present.
5. The 560-light HTTP 500 re-run as a separate isolated check (transient vs reproducible).

Fixing nothing else. The comparison and its report remain the goal.
