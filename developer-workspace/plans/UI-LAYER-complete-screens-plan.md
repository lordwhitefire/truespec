# Plan — bring the UI layer up to the model (all screens)

**This is the *project's* plan, not the skill.** The `runtime-divergence` skill
finds divergence and stops. This plan does the other half: run → find → fix →
run again, until we stop and hand to the owner (~80%).

## Goal

Bring every screen of the UI layer to the **model** built from the reference
runtime, then stop and let the owner judge.

## The screens (build ↔ reference)

| Screen    | Build                              | Reference                                             |
|-----------|------------------------------------|-------------------------------------------------------|
| Home      | `http://localhost:3210/`           | `http://localhost:3211/truespec.html`                 |
| Inventory | `http://localhost:3210/inventory`  | `http://localhost:3211/inventory.html`                |
| Car       | `http://localhost:3210/car/TS-1001`| `http://localhost:3211/car.html?car=2021-toyota-camry-xse-v6` |

Car is furthest along (23-state checklist exists, captures taken). Home and
inventory have no checklist yet.

## Steps

1. **Fix the drive first (car).** Two states captured the reference at 549×1189
   (not 390×844) — the mobile states. Re-capture so both sides are like-for-like
   before comparing anything. Without this, 2 states stay "invalid".
2. **Build the model per screen.** For each screen: write its state checklist
   (read the reference's script to enumerate every handler/toast/modal/tab/theme
   switch/exit-intent), capture both sides (`run.mjs`), build the model
   (`model.mjs`). Car is done bar step 1.
3. **Compare and read the divergence.** `compare.mjs` per screen. The list is the
   work queue. Read structure first, then behaviour, then CSS.
4. **Work the queue.** For each divergence: fix the **rule** at the source (not
   the name), smallest change, keep it green, then re-run the compare. Drive
   first — a target that never reaches a state is a drive/behaviour gap, not a
   structure gap.
5. **Loop until ~80%.** Converge screen by screen. Stop at ~80% and hand the
   owner the divergence reports — they decide continue or stop. Nothing has to be
   exact.

## Known gaps to start from (from the car run)

- **12 car states never reach the state on the build** — missing controls/effects
  (e.g. `#stayB`, tab controls, gallery controls). These are the first fixes.
- **Car `main` is thin** vs the reference (124 vs 311 content nodes) — the build
  wraps content under `header`/`main`/`footer` while the reference wraps in a
  single `div`; the behaviour/control gaps above are the substantive part.
- **18 controls** the reference exposes that the build does not.
- Home and inventory: not started.

## Rules carried from the skill

- Runtime only; source for state discovery only.
- Compare rules, not names.
- Like-for-like states only (same viewport, same actions, target actually
  reached).
- No score; rule-by-rule divergence.

## Definition of done

Divergence reports for all three screens, the bulk of the queue worked, stopped at
~80%, and the state handed to the owner with the reports. Not "zero divergence".
