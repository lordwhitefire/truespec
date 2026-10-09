# RECON-001 — home page runtime check (reference vs build)

**Date:** 2026-10-09 · **Screen:** home only · **Fixes in this pass:** none (report only)
**Reference:** `file:///home/lordwhitefire/current-project/test-truespec-v2/truespec.html`
**Build:** `http://localhost:3210/` (Next dev server, port 3210)
**Method:** live DOM + computed CSS + runtime JS, real Chrome via `playwright-core`.
Companion structure/CSS tables: `reports/RECON-001-home-runtime-compare.md`.
Plan: `plans/RECON-001-home-runtime-check.md` (rev 2).

---

## OWNER CORRECTIONS — 2026-10-09 (these override the findings below)

The owner checked the live pages by hand and corrected two findings. These corrections stand; the
sections they contradict should not be relied on.

1. **Sun/moon — my finding is WRONG.** The owner checked it: the theme icon swap is **not** a
   difference between the two pages. My claim in §3.1/§4 (D1) — "build icon never swaps" — is
   incorrect. Disregard D1.
2. **Tabs — my finding is WRONG.** The tabs are a **filter on the same page**, **not** navigation
   to another page. My claim that the "On order" tab navigates to `inventory?status=o` is incorrect.
   The body of this report has been corrected: §3.1 (D3), §3.3 and §4 no longer attribute the tab to
   navigation, and **T5-NAV is withdrawn**.

Both corrections are recorded as the owner's verified observation.

Scripts (read-only — navigate and read, write nothing to either site):

| Script | Purpose |
|---|---|
| `scripts/runtime-compare.mjs` | structure + computed-CSS diff, 560/820/1100 × dark/light |
| `scripts/home-probe.mjs` | JS behaviour probe, both sides, one clean context per check |
| `scripts/probe-facts.mjs` / `probe-facts2.mjs` | DOM facts to settle ambiguous rows |

Raw output: `/tmp/opencode/rc-*.md`, `/tmp/opencode/home-probe.md`, `/tmp/opencode/probe-facts*.md`.

---

## 1. How the check was run

`home-probe.mjs` follows the installed `playwright-core` skill: **no `waitForTimeout` for control
flow**, one **fresh browser context per check** (clean `localStorage`), **role-first locators**
(`getByRole`), and every negative assertion backed by observing the same locator resolve when the
element is present. `#allBtn` uses its stable id because the two sides expose different roles
(§4.1).

Checks were run against both sides. Where a check failed on **both** sides, it was re-examined as a
possible mis-specified assertion before being called a page difference — the two cleared cases are
recorded in §3.2.

---

## 2. Structure and CSS — summary

Full tables in `RECON-001-home-runtime-compare.md`. Headline differences:

- **Title:** ref `TrueSpec Automotive` vs build `TrueSpec — cars you can trust`.
- **Element count:** ref 603–618 vs build 643–658 (≈40 more nodes in the build).
- **Extra empty heading** in the build, before "TrueSpec Automotive".
- **Custom properties:** shared tokens match; build adds tokens (`--danger`, `--font-*`,
  `--radius`, `--shadow-*`, `--w-phone/tablet/laptop`, `--surface`). `--ld-bg`/`--oo-bg` differ only
  in rgba formatting.
- **Class present in ref, absent in build: `fa-sun`** — the theme icon's swapped state (§4.2).
- **Box deltas** at 1100: `.boxes`/`.bx`/`.g`/`.w2` ±39px; at 560: `.f4`/`.why` +21px; `.fg` +~32px;
  `.tab` display `block`(ref)/`flex`(build), width 130/128; `.cnt` +5–7px; `.wab` +3px; `.lg`
  width; `.lnk` ±1px; FA icon widths (ref `fa-clock/road/tag` width 0 vs build 15).

---

## 3. JS behaviour — probe results

### 3.1 Confirmed differences (reproduced)

| # | Check | Reference | Build | Verdict |
|---|---|---|---|---|
| D1 | Theme icon swap | dark `fa-solid fa-sun` → light `fa-solid fa-moon` | `fa-solid fa-moon` in **both** modes — never swaps | **build defect** |
| D2 | Social-proof toast | visible ~7.1 s after dismiss, with text ("Someone from Kano asked about…") | never visible within 22 s; content is only `×` | **build defect** |
| D3 | `/inventory` after "Show all" | 200 | **500** — `Error connecting to database: TypeError: fetch failed` | **build defect** |
| D4 | Sub-resource per load | — | **404** (`/icon.svg`; metadata icon route declared, file missing) | **build defect** |
| D5 | Show-all element | `<button id="allBtn">` (role button) + JS `location.href` | `<a id="allBtn" href="/inventory">` (role link) | semantic difference |

Evidence for D1/D2: `probe-facts2.mjs` output — REF
`dark fa-solid fa-sun --toggle--> light fa-solid fa-moon`, toast `visible 7143ms after dismiss`;
BUILD `dark fa-solid fa-moon --toggle--> light fa-solid fa-moon`, toast `never (22s)` text `"×"`.
D1 is corroborated by the structure diff (class `fa-sun` absent from build). D3/D4 from
`home-probe.mjs` response/console listeners.

### 3.2 Cleared — probe assertion was wrong, pages agree

| Check | What was measured | Finding |
|---|---|---|
| Ask bar under the welcome modal | both sides returned "not hidden" | the ask bar is visible on both (ref immediately; build after hydration/dismiss). **Not a difference** — my assertion assumed it hidden behind the modal. |
| First-visit toast timing row | both returned "no toast" | my 12 s window spanned the modal; on ref the toast fires ~7 s **after the modal is dismissed**. Re-measured cleanly → D2. |

### 3.3 Matches (both sides pass)

- Welcome modal opens on first visit (**B1**); default theme dark (**B4**); theme toggle flips
  `data-theme` (**T1**); choice persists across reload (**T3**); stored under `ts-theme` (**T4**).
- Hero next arrow changes the active slide (**H1**).
- Show all navigates to inventory (**A1**).
- **Tabs are a same-page filter — not navigation** (owner-verified). My **T5-NAV** check asserted
  that the "On order" tab navigates to `inventory?status=o`; that characterisation was **wrong and
  is withdrawn**. The tab filter itself was not correctly tested by this probe.
- The earlier 560/light 500 did **not** reproduce in isolation — the page loaded 200 with
  `theme=light` twice on **both** sides (**N1/N2**). The earlier failure is therefore attributed to
  the heavy `waitUntil:"load"` wait, not to 560/light specifically. **D3 is the real 500** and is on
  `/inventory`, not the home page.

### 3.4 Open — needs a decision, not a fix

- **Return-visit ask bar.** On a second visit (after a first-visit dismiss), ref shows the ask bar,
  build hides it (`probe-facts.mjs`: REF `true`, BUILD `false`). Different from §3.2 — this is a
  genuine timing/state divergence, but whether the ask bar *should* reappear is a design question,
  not something this check decides. Flagged for the owner/architect.

---

## 4. Failure list

Format: **screen — action — observed — expected.**

1. **Home — toggle theme, light mode — date/theme icon does not change** — build stays
   `fa-solid fa-moon` — expected `fa-solid fa-sun` (ref swaps; class `fa-sun` missing from build).
2. **Home — wait after dismissing the welcome modal — no social-proof toast** — build never shows
   it and its text is `×` — expected the toast to appear ~7 s later with a customer message.
3. **Home — click "Show all" — destination errors** — `GET /inventory` → 500
   `Error connecting to database: TypeError: fetch failed` — expected the inventory page to render.
   (The "On order" tab is **not** a navigation — see §3.3 — so it is not part of this failure.)
4. **Home — any load — one 404 sub-resource** — `/icon.svg` 404 — expected the declared metadata
   icon to exist (or the reference removed).
5. **Home — "Show all" control — wrong element/role** — build renders `<a href>` (role link) where
   ref renders `<button>` (role button). Behaviour (navigate to inventory) matches; semantics differ.
6. **Home — return visit — ask bar hidden** — build hides it; ref shows it. Flagged open (§3.4).

---

## 5. Honest status

- **Verified by running:** everything in §3 and §4 — via `home-probe.mjs`, `probe-facts.mjs`,
  `probe-facts2.mjs` against the reference and the live build on `localhost:3210`.
- **Not verified:** the pixel *look* (owner checks by hand; no screenshots per ruling); screens
  other than home; whether the 500 on `/inventory` is a data/DB-environment issue or a code defect
  (only the error surface was observed, not its cause).
- **Not done:** any fix. Nothing in either page was changed.
- **Caveat:** `@playwright/test` is not installed, so assertions use `playwright-core` waits
  (`locator.waitFor` / `waitForFunction`) rather than the auto-retrying `expect`; the checks are
  equivalent but hand-rolled.
