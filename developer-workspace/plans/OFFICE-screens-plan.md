# Plan — the Office screens (built to the reference-runtime model)

**Owner directive (2026-10-10).** We build the Office screens. We do **not** build from
source code — that is the mistake. We read the reference's source **only** to map the
*ambient* and the *conditionals*; the **runtime** gives us the rules; and the model we build
from those runtime rules is what the React build must meet.

**This is a living document.** Written *as we talk*, not summarised at the end. Every answer
the owner gives is written straight in. If a decision changes, the section is rewritten.

**Status:** v5 — Rounds 1–3 settled (§8–§10); **execution begins: page by page, delegated.**

---

## 0. The method (the owner's instruction, restated exactly)

1. **Read the reference source to see the conditions — the conditionals.** The source is the
   fast way to enumerate *every* state a screen has. It is **never** the thing we compare.
2. **Map the state space of a screen:** the **ambient** (the screen at rest, normal load),
   its **facets** (the parts that carry state), and **all the conditionals** — every state
   reachable by an action or a condition: other widths, light/dark, modals, panels, tabs,
   toasts, drag, typing, **hover, focus**, keydown, exit-intent. **Nothing is "too small". Every
   one of these is a conditional.**
3. **Run the reference at runtime:** drive the ambient, then **every** conditional.
4. **Get the rules from the runtime** — HTML rules (structure), CSS rules (resolved style),
   JavaScript rules (event → effect, in order, with timing). **Not from source.**
5. **Build the model** from those runtime rules. The model is the **standard**.
6. **Build the React screens** to meet the model.
7. **Check** the build against the model (runtime-divergence compare), rule by rule.

One line: **source maps states → runtime yields rules → rules make the model → React meets the model → compare.**

## 0.1 The mistake we will not make

- We will **not** copy the reference's HTML/CSS/JS and call it done.
- We will **not** diff source against source, or read the reference's source *in the compare*.
- We will **not** judge divergence from a single load snapshot, or from a shortlist of guesses.
- We will **not** reduce the result to a score. The verdict is rule by rule.
- We will **not** skip a state because it looks small — **hover and focus are conditionals too.**

## 0.2 CRISP-DM — the skeleton of this plan

| CRISP-DM phase | What it is here |
|---|---|
| **1. Business Understanding** | Why, what "done" means, scope. §1 |
| **2. Data Understanding** | The reference runtime as the data source; map ambient + facets + conditionals. §2–§3 |
| **3. Data Preparation** | Turn the inventory into per-screen **state checklists** + capture configs. §4 |
| **4. Modeling** | Run the reference; collapse into **HTML / CSS / JS rules**; build the **model**. §5 |
| **5. Evaluation** | Compare the build against the model, rule by rule. §7 |
| **6. Deployment** | The React build of the screens, and the hand-off. §6–§7 |

Phases are not one-way: a drive gap sends us back to Preparation; a wrong model back to the reference.

---

## 1. Business Understanding

**Goal.** Build the Office screens so they behave, structurally and stylistically, the way the
reference Office runtime behaves — proven against a model built from that runtime, never from source.

**Scope (settled — §8 Q2/Q3).** **Seven screens:** dashboard, inventory, car form (add/edit),
enquiries, activity, settings, **and login**. The **state editor** (ui-plan Q58–59) is **deferred** —
it has no reference runtime to model from.

| # | Screen | Reference |
|---|---|---|
| 1 | Dashboard | `office-dashboard.html` |
| 2 | Inventory | `office-inventory.html` |
| 3 | Car form (add / edit) | `office-car.html` |
| 4 | Enquiries | `office-enquiries.html` |
| 5 | Activity | `office-activity.html` |
| 6 | Settings | `office-settings.html` |
| 7 | Login / first-run / reset | `login.html` |

**UI only (settled — §10 Q1).** We build the **interface**, not the functionality. A control that does
nothing in the reference stays doing nothing here. Nothing is wired to real data or real actions this
layer. Working behaviour is a later layer. Every dead control is logged, not fixed.

**What "done" means.** A model exists per screen (HTML + CSS + JS rules), ambient + conditionals; the
React build matches that model, state by state; divergence reported rule by rule; React-native — same
rules, not a source clone.

**Out of scope.** Business logic, data model, UX, system model. The approved design is fixed (ui-plan);
no new design here.

**Authority.** `ui-plan.md` (office Q45–Q90), `product-overview.md`, the reference screens (read-only),
the change specs. **Default: the reference runtime governs when it and ui-plan disagree** (§8 Q6) —
except where the owner has **explicitly overridden** it (§10 Q3, theme toggle).

---

## 2. Data Understanding — the reference runtime (facts, reconnaissance)

All seven pages are standalone static files, **no redirect**, each with styling + script **inline**:

| Screen | File | Lines |
|---|---|---|
| Login | `login.html` | 288 |
| Dashboard | `office-dashboard.html` | 268 |
| Inventory | `office-inventory.html` | 405 |
| Car form | `office-car.html` | 514 |
| Enquiries | `office-enquiries.html` | 436 |
| Activity | `office-activity.html` | 288 |
| Settings | `office-settings.html` | 447 |

**Facts that shape the plan (all verified):**
- **No shared stylesheet.** `css/*.css` and `js/*.js` are **0 bytes** and unlinked. Each page embeds
  its own inline `<style>`; the **office token set is byte-identical across the six** (login minus
  `--ok/--warn/--bad`). "Shared tokens" is a **plan target** (ui-plan §4), not yet a built artifact.
- **The shell is real and shared:** `.shell` = grid `240px minmax(0,1fr)`; sticky `.side` sidebar
  (brand, 6-link nav, "Signed in as Umar" + sign-out); `.topbar` (mobile only); `.main`; `.bnav` fixed
  5-item bottom bar. **≤820px** → 1 col, sidebar hidden, topbar shown, bnav on. Per-page extras:
  dashboard ≤1000/≤560; inventory ≤1000/≤820 (tables→cards); car ≤1150/≤820 (+`.mbar`); enquiries ≤1180.
- **No icon rail in the reference.** ui-plan Q79 asks for a 56px icon rail at 820–1100px; the reference
  keeps 240px to 820 then topbar+bnav. **Conflict → reference governs (§8 Q6); logged.**
- **No auth gate.** No office page checks anything; every page renders "Signed in as Umar".
  `login.html` redirects to the dashboard **only when the password is the literal `"demo-only"`**;
  otherwise it fakes an error/lockout. Theme in `localStorage ts-theme`.
- **Interlinks:** sidebar links all six; bnav links five (activity not a bnav destination); sign-out →
  `login.html`; login footer → the public showroom.
- **`office/` in the reference is 0-byte stubs** — ignore; the real files are the `office-*.html` above.

**Ambient vs conditional.** Ambient = the screen at the chosen width (laptop 1440, §8 Q1), dark mode,
everything at load. Conditional = **every** state reached by an action or condition — other widths,
light mode, modals, toasts, tabs, drag, typing, **hover, focus**, keydown, exit-intent.

**Facets.** The named parts of a page that carry state (e.g. dashboard: the shell, the stat row, the
taps list; inventory: the search/sort bar, the table, the cards, the delete dialog, the toast). The
state space = ambient + facets + conditionals.

---

## 3. Conditional inventory (per screen)

> From reading each reference script (full extraction). Each entry is a candidate checklist state in
> §4; confirmed by driving. Timer/exit-intent states are driven with an `eval` that dispatches the event.

**Login** — ambient (dark). Conds: theme `#thm`; panels `[data-goto]` login/setup/locked; reveal `.eye`
(`su-pass`,`li-pass`); strength `#su-pass`→`m1/m2/m3`+`#mtxt`; mismatch `#su-pass2`→`#su-err.on`;
`#su-go`→login; `#li-go`→error/`.bad`, 3 tries→`#lock.on`, `demo-only`→dashboard; `#li-pass` clears
error; `#fr-go`→`#sent.on`.

**Dashboard** — ambient. Conds: theme `#thm` (owner override — toggle on all screens, §10 Q3);
"Show older"/"Show all taps" static (no handler). No `data-*`.

**Inventory** — ambient. Conds: search `#q`; sort `#sort`; state chips `[data-s]`; delete `[data-del]`→
`#dltw`,`#ovl`; `#no`/scrim/Escape→hide; `#yes`→remove+toast(6s); `#undo`→restore; empty `#emptyT/#emptyC`;
theme.

**Car form** — ambient; **modes** add/edit (by route, §10 Q2). Conds: `#thumbs` `[data-mk]`/`[data-rm]`;
`#states` `[data-st]`; live costing on `#f-price`+six cost fields → `#p-*` + mobile `#m-*`; `#mkSold`→
`#ovlS`; `#soldYes`→toast; `#delBtn`→`#ovlD`; `#delYes`→toast; `#save`→toast(buyer link); overlays close
via `[data-close]`/scrim/Escape; toast `#tundo`(6s). **Dead:** `#tundo`, `#drop`. Theme.

**Enquiries** — ambient (board). Conds: drag `.card` between `[data-col]` (→`moveTo`, 4s toast); Enter→
detail `#ovlD`; `#dPills` `[data-mv]`; `[data-close]`/scrim/Escape; import `#importBtn`→`#ovlP` steps
`pdf1→pdf2→pdf3`(timeout); `#pdrop` click/Enter/Space→`startParse`; `[data-back]`→`pdf1`; `#pconfirm`→toast.
Theme.

**Activity** — ambient. Conds: theme `#thm`; chips `[data-tp]`; search `#q`; `#older`→reveal; `#clearf`→reset.

**Settings** — ambient. Conds: theme `#thm`; whatsapp `#wa`→`waCheck()`+preview, `#waSave`→toast; tagline
`#tag`→counter+preview, `#tagSave`→toast; `#fx/#tank` dirty-watch + `#fxSave`; password `#newp/#newp2/#curp`
+ `#pSave`; reveals `.eye`; boot `waCheck()`.

**Plus, for every screen:** the **width conditionals** (≤1180/≤1150/≤1000/≤820/≤560 as they apply) and
**hover / focus / active** states on every interactive control.

---

## 4. Data Preparation — state checklists

Per screen, turn §3 into a `checklist.json` (skill format): `ref`+`build` URLs + ordered `states`
(ambient first, then **every** conditional — including hover/focus and width/theme; same actions both
sides).

**Ambient (settled §8 Q1): laptop 1440×900, dark.** Conditionals: **820 + 560 + 390 widths**, and
**light at 1440**, plus all interaction states.

Locations: `developer-workspace/scripts/office-diff/<screen>/{checklist.json,captures,model}`.

---

## 5. Modeling — build the model from the reference runtime

Drive the reference through each checklist (`run.mjs`), collapse the captures (`model.mjs`). Rule families:
**HTML** (structure/nesting/counts), **CSS** (resolved computed values — this is where hover/focus and the
width rules land), **JS** (event → effect, order, timing). Settled (§8 Q5): a **shared shell/token model**
+ a **per-screen model** each. The model is the standard; not sacred — if wrong, rebuild and re-compare.

```
node <skill>/scripts/run.mjs     <screen>/checklist.json   <screen>/captures
node <skill>/scripts/model.mjs   <screen>/captures         <screen>/model
```

---

## 6. Deployment — build the React screens **page by page**

**Page by page (settled — §10 Q1).** Build one page at a time — **dashboard first, then inventory, car,
enquiries, activity, settings, login.** For each page, build the page **and the components it needs**.
**Reuse a component on the next page only when that page actually needs it** — never build components in
a vacuum, never build a component "for later". A component is extracted from a page already built, at the
moment the next page wants it.

The shell (sidebar/topbar/bottom bar) is **not** built first as a separate step — it comes into being as
part of the **first page that uses it** and is reused (and changed only when a later page requires it).

Build to meet the model: same structure, computed-style and behaviour rules, state by state; shared tokens
(Q20–Q22); dark default (Q7); sentence-case office text (Q16); compact density (Q21). **UI only**, seeded
with the reference's **same demo data** (§9 Q4); no business logic/data-model/UX beyond what a screen needs.
**One commit per screen** (§8 Q8).

---

## 7. Evaluation — check the build against the model

Run the build through the same checklists; compare against the model (`compare.mjs`), rule by rule, per
screen. Fix the **rule** at the source, not the name; smallest change; re-run. A state the target never
reaches is a **drive gap**, not a structure divergence. **Acceptance (§8 Q7): converge rule-by-rule,
stop at ~80%, hand the owner the reports.**

```
node <skill>/scripts/compare.mjs <screen>/model  <screen>/captures  > <screen>/report.md
```

---

## 8. Decisions settled (Round 1 — 2026-10-10)

| # | Question | Decision |
|---|---|---|
| Q1 | Ambient width/mode | **laptop 1440×900, dark**; other widths + light = conditionals |
| Q2 | Login in scope | **Yes** — 7 screens (incl. login) |
| Q3 | State editor | **Deferred** — no reference runtime to model |
| Q4 | Data | **UI-first** with seeded/placeholder data; wiring later |
| Q5 | Model structure | **Shared shell/token model + a per-screen model each** |
| Q6 | Reference vs ui-plan conflict | **Reference runtime governs**; conflicts logged |
| Q7 | Acceptance bar | **Converge rule-by-rule, stop at ~80%**, hand over reports |
| Q8 | Commit cadence | **One commit per screen** + a workspace-docs commit |

---

## 9. Decisions settled (Round 2 — 2026-10-10)

| # | Question | Decision |
|---|---|---|
| Q1 | Dead / demo controls | **UI only.** Exactly what the reference does; dead stays dead; log each; fix later |
| Q2 | Car add vs edit | **By route** (page decides); no demo switcher in the product |
| Q3 | Theme toggle | **Owner override:** light/dark on **all 7 screens** |
| Q4 | Data | **Same demo data** as the reference |
| Q5 | Shell model | Capture the shell on **every** page, merge into **one shared model** |
| Q6 | Route & layout | **`app/office/`**, shared shell, **no auth gate** this layer |
| Q7 | Capture widths | **1440 (ambient, dark) + 820 + 560 + 390 + light-at-1440** |

**Note on §9 Q3:** the reference shows the toggle only on activity/settings/login. Owner **overrode** the
"reference governs" default — toggle required on all seven. Modelled from the pages that have it, applied
to all; the compare treats it as an **approved addition**, not a divergence. Logged.

---

## 10. Decisions settled (Round 3 — 2026-10-10)

| # | Question | Decision |
|---|---|---|
| Q1 | Build order / components | **Page by page** — dashboard → inventory → car → enquiries → activity → settings → login. Build a page and the components it needs; **reuse a component on the next page only when that page needs it.** No component-first, no separate "shell first" step |
| Q2 | Checklist depth | **Every state is a conditional** — including **hover and focus**. Nothing is "too small". Model them all |
| Q3 | Theme toggle on all 7 | Confirmed — model from the 3 pages that have it, apply to all 7, mark approved-addition |
| Q4 | Who executes | **Delegate to a general task agent** — I do not build it myself. Hand the agent the browser connection and full method |

---

## 11. Delegation — how the work is executed

**One general task agent**, resumed page after page (same session, so it keeps context). Each dispatch
carries: the plan file path, the method, the reference/build locations, **and the browser connection**.
The agent updates the living plan (§10 style) and writes per-screen artifacts as it goes.

**Browser connection (must be handed over verbatim):**
- Launch the **visible** Chrome, persisted profile, CDP on `:9222`:
  `/usr/bin/google-chrome --user-data-dir="$HOME/.config/google-chrome-automation" --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1 --no-first-run --no-default-browser-check --no-sandbox --disable-blink-features=AutomationControlled --start-maximized &`
- Use the skill's `scripts/browser.mjs::ensureChrome()` to attach (it owns the launch/attach detail).
- **Reference** static served at `:3211`; **build** (`next dev`) at `:3210` — **not 3000**.
- Drive via the skill's `run.mjs checklist.json ./captures`; collapse with `model.mjs ./captures ./model`;
  compare with `compare.mjs ./model ./captures > report.md`.
- **No screenshots** (`visual_inspect` is broken). Hard cap **10** chromium instances; close in `finally`.
- Read `runtime-divergence/SKILL.md` before starting.

---

## 12. Change log

- **v1 (2026-10-10):** first draft from the directive + first reconnaissance.
- **v2 (2026-10-10):** reconnaissance folded in; Round 1 opened.
- **v3 (2026-10-10):** Round 1 settled; scope 7 screens, state editor deferred, ambient chosen.
- **v4 (2026-10-10):** Round 2 settled; UI-only explicit; theme-toggle override; Round 3 opened.
- **v5 (2026-10-10):** Round 3 settled — **page by page** (no component-first, no shell-first), **all
  states incl. hover/focus are conditionals**, delegation to a general task agent with browser details;
  execution begins.
