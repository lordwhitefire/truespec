# Working procedure — the browser check

**What this is:** the project's established way of checking the built app **in a real browser**, written
down once so it is never re-derived. Refer to **this file**, not to the old task's plan.
**Status:** standing procedure, applies to every layer.
**Authority for rules:** the layer's model/spec, **never** the browser. This procedure checks **surfaces** only.
**Comparison:** none. We no longer compare against the reference (`:3211`) — there is nothing to match against.
We simply check that each item we finished is okay on its own. The attach-only discipline, no-screenshots rule and
no-new-tab rule **do not change**.

---

## 1. The discipline — non-negotiable

- **Attach, never launch.** Attach to the **one persistent, visible** Chrome already listening on
  **CDP `:9222`** (`connectOverCDP("http://127.0.0.1:9222")`). If nothing is there, **stop with a clear
  message** — do **not** start one. (The skill's `ensureChrome()` *would* launch; the project rule is the
  stricter attach-only variant in the harness.)
- **Never headless. Never a second instance. Never a swarm.**
- **Confirm the Chrome is ours before navigating** — its User-Agent must contain no `Headless`.
- **≤10 chromium guard** — count real browser processes (`google-chrome|chromium`, excluding `--type=`)
  before and after; the count must not go up. The owner's own browser (e.g. a snap chromium) is not ours and
  is never touched.
- **Detach on exit** (`finally`) — the window and its tabs stay open for the next run and for the human to
  watch and click.
- **No screenshots.** The owner checks the look by hand.

## 2. Servers and ports

- **Build:** `next dev -p 3210` (or the built app) on **`:3210`** — `LEAK_BASE_URL`/`BUILD_URL`.
- **Reference:** the static reference site `test-truespec-v2` on **`:3211`**
  (`python3 -m http.server 3211 --bind 127.0.0.1 --directory …/test-truespec-v2`) — `REF_URL`.
- **Port `3000` is never used** — not for dev, not for leak-check, not for any probe.

## 3. The harness

- Lives under `developer-workspace/scripts/<task>/` (TASK-002: `scripts/task-002/`).
- `_lib.mjs` imports the skill's primitives — `CDP_URL`, `CDP_PORT`, `twoTabs`, `resize`, `clearResize`,
  `detach` — from `/home/lordwhitefire/.agents/skills/runtime-divergence/scripts/browser.mjs`, and adds the
  project's own **attach-only** `attach()`, `assertOurs()`, `guardCount()`, `chromiumCount()`.
- It reuses **two tabs**: **A = reference (`:3211`)**, **B = build (`:3210`)**.
- `node _lib.mjs` is the smoke check: attach → prove it is ours → print the two tabs → confirm no Chrome was
  launched → detach.

## 4. The checklist (states) and the cell matrix

A **state** is a condition the page is put in so a conditional surface shows up; the complete set is the
**checklist**. Ambient (as-loaded) is always included. The checklist is enumerated by reading the **reference's
own source for discovery only** — the comparison itself is always runtime-vs-runtime.

- **Public surfaces:** `560 / 820 / 1100` × `dark / light` → 6 cells per screen.
- **Office surfaces:** `1440 / 820 / 560 / 390` × `dark / light` → 8 cells per screen.
- Matrices are held in `checklist.public.json` / `checklist.office.json` beside the harness.

**How to check each item** — open the item's page on `:3210`, put it in the state, look at it, and record OK /
not OK. No ref vs build, no cell matrix, no compare scripts unless one is genuinely needed.

## 5. Probes

- **One probe per screen**, under the task's script folder.
- **Role-first locators**; **no `waitForTimeout`**; `waitUntil: "domcontentloaded"`.
- Each cell prints the **same named surface facts** for tab A and tab B side by side.
- Where a full capture helps: `run.mjs → model.mjs → compare.mjs` (the skill's pipeline).

## 6. What it produces

- Per-screen artefacts under `scripts/<task>/runs/<screen>/` — `surface-probe.txt`, `surface-probe.json`,
  and `compare-report.txt`.
- A report at `developer-workspace/reports/<TASK>-browser-check.md` that states:
  - the cell count and that every cell loaded;
  - **intended divergences, each tied to the requirement that wins** (the intended log *is* the conflict log);
  - **unintended divergences** — a defect (fixed) or named for its owning task, not silently fixed;
  - the guard result (chromium before → after) and that no Chrome was launched;
  - **what was NOT checked** (look/CSS/pixels — no screenshots; interactive behaviour unless actually driven;
    anything outside the layer's surface).

## 7. When a check is not run

A check that cannot be performed safely, or needs owner input, is **NOT RUN** — state the reason and any
compensating evidence. A not-run check is never a pass.

---

### Quick checklist for a run

- [ ] Automation Chrome visible and listening on `:9222` (profile `~/.config/google-chrome-automation`); attach-only; UA has no `Headless`.
- [ ] Build on `:3210`; port `3000` untouched; `:3211` reference is no longer needed.
- [ ] `node _lib.mjs` smoke check: attach, ours, build tab present, **no launch** (guard unchanged), detach.
- [ ] Check each finished item: open its page on `:3210`, confirm it behaves as expected, record OK / not OK.
- [ ] Record the result: check ID, route, expected vs actual, evidence snippet or status code.
- [ ] No screenshots. Detach on exit.
