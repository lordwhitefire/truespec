# TASK-005 — Report: the UX layer, and the handover to the testing pass

**STATUS: complete for what the owner ruled buildable — 43 tasks built/closed as ruled, 1 closed
not done (Task 39).** Every gate that could run on this tree is green: typecheck clean, tests
**311/311**, `leak-check` **PASSED** (21 public routes), `npm run build` exit 0, and the store is
net-zero for this layer. One gate is **not** run: the rendered office reconciliation, blocked by the
expired Clerk session. The nineteen testing groups in `testing.md` remain **deferred** — this
report is their handover, not their run. Nothing is pushed.

This is the closing report for the 44-task plan in `developer-workspace/plans/TASK-005-plan.md`.
Task 39 is **closed — not done** by the owner's ruling of 2026-10-19; the plan tracker marks it
**☒**, and this report counts **43 built/closed, 1 not done** — it does **not** claim 44 built
tasks. Checkpoint C was approved and committed (`a555115`); checkpoint D is this report,
**approved 2026-10-19**.

## What this layer was

`openspec/tasks/TASK-005/task.md` defines a UX/truth layer over the already-built product: make
the sentences the product shows match what it actually does, and remove the places where a control
or a word lies. The plan turned that into 44 tasks across eleven phases, with gates A–H, three
owner checkpoints, and twelve outcome benchmarks. The line this layer had to walk is in its own
scope note (`task.md:360-361`):

> It adds **no feature, no route, no data and no rule**.

That line was **widened once**, by the owner, in Q11 — recorded below rather than hidden.

## What was built, by phase

| phase | tasks | gate | headline |
|---|---|---|---|
| 0 — foundation | 1–2 | — | plan, brief, current truth; green baseline |
| 1 — truth in reporting | 3–7 | **A** | write failures refuse in place and never throw; a save that changed nothing says **“Nothing changed.”**; a restored car is **RESTORED**, not “Deleted” |
| 2 — the status family | 8a, 8–9 | **B** | the waiting line moved off pages that must answer a status; a dead car answers a real **404** with its view; a mistyped office address lands in the office, in the office's words |
| 3 — the undo window | 10–12 | **C** | a bar drains for the full **8 000 ms**; the animation is the clock and its own end closes the offer; the failsafe is 12 000 ms and never wins; nothing hard-erases |
| 4 — dialogs and focus | 13–17 | **D** | every confirmation is the platform's `<dialog>` (`showModal`, focus in, Escape, focus back, page frozen); destructive actions named and ordered; focus survives a removal and a refusal |
| 5 — inert controls | 18–21 | **E** | the dead Search control removed; the car form's delete really deletes with the same undo; the phone **More** sheet reaches Drafts/Activity/Settings; the showroom chat control behaves the same at every width |
| 6 — empty, count, refusal | 22–25 | **F** | an empty area says it once with one next action; the live result announced exactly once; the honest count; a refusal keeps its own voice |
| 7 — photos | 26–28 | — | the no-photo box and the failed photo are the same drawn box; a deterministic gradient from the car's own ref, unit-tested |
| 8 — the contact number | 29–30 | **G** | no number is invented and no recipient is dead; with no number saved every chat control is visibly off, not live-looking |
| 9 — the unreadable store | 31–32 | **H** | a boundary inside each shell; a store that cannot be read is never emptiness or a number; the settled retry/waking words unchanged |
| 10 — slow and offline | 33–38, 40 | checkpoint C | the waiting sign on a slow nav; the showroom offline line; the office banner and disabled Save with its reason; the device draft store; auto-restore and the recovery line; erase only on save/discard/sign-out; no customer data in the payload |
| 11 — witness, gates, report | 41–44 | checkpoint D | the owner's rulings written down; benchmarks 1–11 witnessed; gates and net-zero; this report |

Per-task detail, commit hashes and the exact readings are in the plan tracker
(`developer-workspace/plans/TASK-005-plan.md`) and the task notes under
`developer-workspace/notes/`. The plan tracker is the index; this report does not repeat it.

## The Q11 widening, the Task 39 closure, and the copy flags

**Q11 — the one new feature.** The owner asked for the office's sentence *“Offline, your draft is
kept on this device.”* to be **true even if that meant building a feature**. It does now: a
client-side draft store (`lib/device-draft.ts`, Tasks 36–38, 40) under `ts-draft:` keys, restored
automatically, erased only by a successful save, an explicit discard, or sign-out. It adds **no
route, no data model and no business rule** — but it **is a feature**, and that is exactly the
conflict with `task.md:360-361`. The owner widened the line; `notes/TASK-005-rulings.md` records
the quotes and the widening, and this report names it rather than hiding it. The draft holds the car
form's own fields and the settings cards; it never holds a customer/enquiry key, and the inventory
count stayed **“25 cars — 24 in stock, 1 sold”** while both drafts existed.

**Task 39 — closed, not done.** The plan's Task 39 asked for a one-line draft disclosure on the
public privacy page. The owner ruled on 2026-10-19 that the public notice is visitor-facing while
the draft is private, owner-only office storage in the browser — never a public payload — and that
the line did not belong there. The page is **byte-identical**; no copy was approved or added. This
is a **waived task, not a hidden failure**: `notes/TASK-005-task39.md`, plan row **☒**.

**The showroom “Reload” line — flagged.** The showroom's approved offline line is **“You are
offline. Reload to see the site.”** It is kept verbatim. But there is no service worker and no
cached showroom (Q16), so a hard reload while offline still exits to the browser's own error page.
The line's instruction is therefore only true once connectivity returns; the residual is recorded
in `notes/TASK-005-rulings.md` (Q16a) and here. This is a **copy conflict**, not a built claim.

**The office lines** are the approved ones and are true: *“Offline, your draft is kept on this
device.”* and *“You're back online. Your draft is still here — press Save.”* The second one shows
only after a shown offline line when a draft is present; it is not a timer.

## Verification — what was actually run

| gate | result |
|---|---|
| `npm run typecheck` | **exit 0** |
| `npm test` | **311 / 311**, 9 suites, 0 fail/skip/cancelled |
| `npm run leak-check` | **PASSED** — 21 public routes; 18 tokens · 36 cost values · 52 asset/file refs · 18 customer values · 3 office labels; every route 200 |
| `npm run build` | **exit 0** — compiled in 49 s, 24 routes, middleware 92.3 kB; dev server stopped first and restarted after |
| live witnesses | **benchmarks 1–11 have live evidence** — 3/4/6/10/11 re-driven on 2026-10-19; 1/2/5/7/8/9 carried from their live task runs; B1's 8 s carried from Task 12 as the plan allows (Task 42) |
| checkpoint C | **approved** (`a555115`): banner at 1200 ms, car draft restored after reload, recovery line **3 ms** after reconnect, Cancel/settings Save/sign-out erase drafts, exactly 2 intended saves, settings demo net-zero, 0 errors, Chrome 6→6 |
| store net-zero | **25 cars · 25 live · 0 tombstones · 25 demo (all created 15–16 Oct; 0 new) · 1 sold · settings original · no throwaway refs or activity subjects** |
| working tree | no task source changes in Tasks 41–44; owner-dirty files untouched and unstaged; at the Task 43 gate the branch was **45 commits ahead of `origin/main`**, and Task 44 adds this report's commit; **nothing pushed** |

Command logs: `/tmp/opencode/task43/{typecheck,test,leak-check,build}.log`; the readings are summarised
in `developer-workspace/notes/TASK-005-gates.md`.

## What was not verified — plainly

- **The rendered office reconciliation** (`scripts/reconcile.ts`) was not run: it needs the signed-in
  Chrome, and the Clerk session expired after checkpoint C. The store side was read directly and is
  net-zero; the rendered comparison remains for the final testing pass, which must sign in first
  (Chrome is on `/office/sign-in`).
- **All nineteen testing groups in `testing.md` are deferred.** No formal group run exists. The
  layer's own task drives are evidence, not a substitute for the groups. **A group not run is not a
  group that passed.**
- **Benchmark 12** — a first-time visitor walking the journey and answering the five Q-003 questions
  in their own words — is **person-only** and was not run. It remains Group 17.
- **The 215 ms row departure / 1 227 ms offer arrival** from `findings/05-runtime-observations.md`
  were **not re-measured**. The numbers are in **§R2.3 §6**, not §R2.2 as `testing.md` says; the
  pointer is wrong. On the current bar, Task 11 read click **1 661 → offer 3 988** (2 327 ms) with
  the automation tab's **1 017 ms** frame cadence. The **8 000 ms window** is verified (8 536 ms in
  Task 12; 8 524 ms Task 10; 8 336 ms Task 11). The two older timings are explicitly not claimed.
- **No service worker / hard-reload offline** — the Q16 residual above. The layer deliberately did
  not build one.

## The handover `testing.md` asks for

**Which groups ran, which did not, and why.** None of the nineteen groups has been run as a group.
The layer's tasks drove the same behaviours individually (see the plan tracker's rows 3–40 and
`notes/TASK-005-witnesses.md`), but the groups are the human testing stage and were deferred after
the build phase by the plan. Reasons, per the handover: the groups begin only when the owner opens
the testing pass; the office session is currently expired; the person-only group needs a person who
has not seen the product.

**Which checks a person ran, which an agent ran.** All build-time checks were agent-run:
typecheck, tests, the live drives, the store reads, the build and the leak-check. The **owner** ran
the two checkpoints (C approved; D is this report) and approved the wording. The checks that a
person must run are **Group 17** and every “does it read right” judgement inside the other groups;
they have **not** been run.

**The one check that needs a car safe to lose (Group 1, last bullet).** Not run as a formal group;
not blocked by the product. The layer's own undo drives used **demo throwaways created through the
office's own form and removed for good** (`is_demo = true`, net-zero **25 → 25** on every run), so a
safe-to-lose car exists and the mechanic is exercised. The formal Group 1 run is still pending.

**Every number re-measured, and whether it still matches.** The 8 000 ms window: **matches**
(8 336–8 536 ms across Tasks 10–12; animation end, not the failsafe). The row departure 215 ms and
offer arrival 1 227 ms: **not re-measured** (wrong §R2.2 pointer; current drive reads 2 327 ms
click→offer with a 1 017 ms frame cadence; recorded in Task 42). The banner appearance ~1 200 ms:
**matches** (1 204/1 267 ms fresh in Task 42; checkpoint C 1 200 ms). The recovery line: **matches**
(21/10 ms Task 37; 3 ms Task 38).

**Every place a check failed, in the failing screen's own words.** The layer found and fixed **two
product-level failures**, and also recorded two **test/harness** failures, kept here because the
handover asks for them:

- **Task 8:** a dead car rendered its view but answered **200** in both dev and a production build
  (`/car/TS-9999` — 200 / 200). The status was the failure; the view's own words were the not-found
  view's. Fixed by Task 8a (the waiting line moved off the pages that must answer a status).
- **Task 19:** the car form's delete offer could be unmounted by its own revalidation; the screen
  read **“THAT PAGE ISN'T IN THE OFFICE”** with the offer gone (case 2 lost the race). Fixed by
  deferring the editor's revalidation (`deleteCar(..., { revalidate: false })` on the form).
- **Task 35's old drive:** exits 1 with **`the banner never withdrew`**, **`the banner did not
  withdraw`**, **`the banner is still visible`**, **`the withdrawn banner still has text`**. This is
  a **stale test**, written before Task 37: the current correct screen after reconnect with a draft
  is the approved recovery line, and Task 37/38 + checkpoint C drove it. Quoted, and classified as
  a test failure, not a product failure.
- **Blocked re-runs:** `office-404.mjs` and `more-sheet.mjs` timed out while the attached Chrome
  was on **“Owner sign in | TrueSpec Automotive”** — the expired session, not a screen failure.

**Any check that could not be run.** The nineteen groups; Group 17 / Q-003; Benchmark 12; the
rendered office reconciliation; the hard-reload-offline check (the product deliberately has no
service worker). All are named above, none is reported as passed.

## Evidence index

- Plan and tracker: `developer-workspace/plans/TASK-005-plan.md`; brief:
  `developer-workspace/briefs/` (Task 1).
- Rulings, including Q11–Q18, Q16a and the Task 39 closure supersession:
  `developer-workspace/notes/TASK-005-rulings.md`; privacy closure:
  `developer-workspace/notes/TASK-005-task39.md`.
- Witnesses and numbers: `developer-workspace/reports/TASK-005-witnesses.md`,
  `developer-workspace/notes/TASK-005-witnesses.md`.
- Gates, command readings and net-zero: `developer-workspace/notes/TASK-005-gates.md`.
- Current behaviour and the draft/privacy boundary: `developer-workspace/notes/TASK-005-current-truth.md`.
- Task notes: `developer-workspace/notes/TASK-005-task*.md`; live drives and readings:
  `developer-workspace/scripts/task-005/` (including `runs/`).
- Source task packet: `openspec/tasks/TASK-005/task.md`, `testing.md`,
  `findings/05-runtime-observations.md`; approved UX wording:
  `design-workspace/decisions/ux-implementation-plan.md`.
- Commits: the plan tracker's rows carry the per-task hashes; the final phase is Task 41
  `9822731`, Task 42 `a5bf83a`, Task 43 `6b8c7b4`, Task 44 (this report and its copy). Checkpoint C
  is `a555115`; Task 39's closure is `10236c0`.

## Checkpoint D — approved

This report is the checkpoint-D artifact. **The owner approved it on 2026-10-19.** The Q11
widening, the Task 39 closure, the showroom “Reload” flag, and the deferred nineteen groups were
read before approval. The testing handover in `openspec/tasks/TASK-005/testing.md` is released;
no push has been made.

## Addendum — post-checkpoint D (2026-10-19)

The owner reported, after approval, that the new-visitor welcome popup “is not responsive”.
Checked live (`notes/TASK-005-welcome-responsive.md`): on phones the home page's featured strip
widened the mobile layout viewport, and the fixed dialog stretched with it. Fixed as **Task 45**
(plan tracker): `contain: layout` on the strip plus an honest device-width source for its per-row
count — re-verified on the fixed build (18 configurations + taps; phones 375/360/430 all
in-screen, ✕ tappable; desktop unchanged; typecheck 0, tests **311/311**).

Counts with this addendum: the layer stands at 45 tasks — **44 built/closed, 1 closed-not-done
(Task 39)**. The report body above remains the approved record of the layer before the fix.

## Addendum 2 — inventory browsing (owner request, 2026-10-19)

After checkpoint D the owner asked for two inventory changes: the filter groups' sub-items must not
show until the group's icon is clicked, and the cars must be paginated — *"limited to the ones that
can show"*. Planned first as Tasks 46–49 (`plans/TASK-005-plan.md` Phase 13), then built.

- **Filter groups start closed.** The five `open` attributes are gone; the native `<details>`
  supplies click, keyboard, focus, expanded state and the existing +/− indicator. Live at 1440 and
  375: **0** groups open and **0** options visible on load, Status opens to 3 and closes on a second
  click, Enter opens/closes Make, and a Make selection still filters to **3 of 19**.
- **Nine cars a page.** Only the current slice renders in grid and list; the live store (**19 cars**)
  gives **9 / 9 / 1** over three pages. Numbered pages plus Prev/Next, page 1 current, the ends
  disabled. `?page=2` deep-links; `?page=99` clamps to page 3 and rewrites the URL; a filter, the
  sort and Clear all return to page 1; grid/list keeps the page; the pager is absent at ≤ 9. A page
  click focuses and scrolls the results heading under the nav and announces "Page N of 3". At
  1440/1024/768/375 the grid is **3/2/2/1** columns with **0 px** overflow; the controls are
  **42 px**; a phone tap reaches page 2 with 9 cards.
- **Verified:** fresh attach-only run `scripts/task-005/inventory-paging-check.mjs` — **0 failures**,
  Chromium **6 → 6**, both run windows closed, no store writes; `npm run typecheck` clean;
  `npm test` **311/311**. The first run's six failures were the check, not the product: a
  `getClientRects()` visibility metric (boxes still exist inside a closed `<details>`) and four
  clicks that landed before hydration; the check now uses `checkVisibility()` and waits for React
  before interacting. No product change was made between the two runs.
- **Not verified / out of scope:** the deferred nineteen testing groups remain deferred (expired
  office session); the home modal's dead `/inventory?body=SUV|Sedan` links were left untouched.

Counts with this addendum: the layer stands at **49 tasks — 48 built/closed, 1 closed-not-done
(Task 39)**. The report body above remains the approved record. Commits: plan and brief `0f17b1b`,
closed groups `dbef89f`, paging `447544f`; Task 49 carries this addendum, the notes and the check.
Nothing is pushed.

## Addendum 3 — pagination beyond inventory (owner request, 2026-10-19)

The owner clarified the rule: *"pagination is to prevent endless scrolling not swiping"*. It applies
to a vertical stack of cars; it does not apply to a horizontal slider / swipe track.

- **Home inventory grid paged.** `HomeInventory` now renders **12** cars per page — three full rows
  of the 4-up grid (12 also divides by 3/2/1). The live Available tab (**13 cars**) becomes
  **12 / 1**; On order (6) stays on one page with no pager. Numbered pages + Prev/Next; page 1
  current; page 2 keeps the URL `/`, announces "Page 2 of 2", and focuses the "TrueSpec Inventory"
  heading; a tab change returns to page 1. The count line stays the honest total.
- **Sliders left alone, checked live.** The home featured strip (3-up at 1440, 1-up at 375) and the
  car page's "More available cars" / "On the lot right now" (`.rt` —
  `display:flex; overflow-x:auto; scroll-snap-type:x mandatory` with Prev/Next) have no pager.
- **Verified:** fresh attach-only run `scripts/task-005/home-paging-check.mjs` — **0 failures**,
  Chromium **6 → 6**, both run windows closed, no store writes; grid **4/3/2/1** columns at
  1440/1024/768/375 with **0 px** overflow; controls **42 px**; phone tap page 2 = 1 card;
  `npm run typecheck` clean; `npm test` **311/311**. The check's first run was aborted by the
  first-visit welcome dialog (it closes it now) and the home page's `load` event (it waits for
  hydration instead); no product change was needed.
- **Not built:** the office inventory table's rows-per-page rule (Task 53) — it needs the owner's
  number and a signed-in office session (Clerk expired), so it could not be runtime-proven.

Counts with this addendum: the layer stands at **53 tasks — 51 built/closed, 1 open (Task 53,
blocked), 1 closed-not-done (Task 39)**. Commits: plan `e1780c8`, home grid `8f97356`; Task 52
carries this addendum, the notes and the check. Nothing is pushed.

## Addendum 4 — the office inventory rows-per-page rule (owner ruling, 2026-10-20)

The owner chose **25** rows by default, with **10 / 25 / 50 / 100** offered and the choice
remembered in the browser. No store write.

- **Built.** The office inventory toolbar now offers **10 / 25 / 50 / 100 per page**, defaulting to
  **25**. The choice is kept in `localStorage` (`truespec.office.inventory.page-size`); if storage is
  unavailable, the default still works. Numbered pages plus **Prev** / **Next** appear when there is
  more than one page; the current page is clamped when a delete or a smaller page size shrinks the
  list. Search, state chips, sort and Clear filters all return to page 1. The count line stays the
  total (`list.length` / `rows.length`), never the page length. The desktop table and the phone cards
  render the same `shown` slice.
- **The rule is pure and tested.** `lib/inventory-paging.ts` holds the page-count, clamp and slice
  arithmetic; `lib/inventory-paging.test.ts` pins the default/choices, first page, remainder,
  beyond-the-end clamp, empty list, size changes, clamping and the no-row-lost partition. The UI and
  the tests share that one rule.
- **Verified.** `npm run typecheck` clean; `npm test` **368/368**; production build passed. The built
  office-inventory chunk carries `Rows per page`, `Inventory pages`, `Previous page` and `Next page`.
- **Not clicked through.** The pager, page-size select, remembered choice and responsive layout were
  **not** exercised in a real browser — the office Clerk session is expired. The arithmetic and the
  built output are verified; the rendered interaction at 375/1440 is still owed after sign-in.
- **Witness note.** `scripts/reconcile.ts` still reads one server HTML response and expects every
  car in it. While the inventory is at or below 25 rows, the default shows all of them and that check
  still sees every row; if the inventory grows past 25, the check must walk pages or read the data
  directly. The script is owner-dirty and was not changed.

Counts with this addendum: **53 tasks — 52 built/closed, 0 open, 1 closed-not-done (Task 39)**.
Task 53 carries this addendum. Nothing is pushed.
