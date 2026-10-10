# Report — `runtime-divergence` skill (generalized + renamed)

## Built

The global skill `runtime-ui-diff` is now **`runtime-divergence`** — a
surface-agnostic method, not a "web UI diff". Live at
`~/.agents/skills/runtime-divergence/`.

Method (in `SKILL.md`): **reference runtime → model → compare the target runtime
against the model → divergence report → stop.** It does not fix and gives no
score. Two modes (with a reference / without — make your own). Kept the core
ideas: *compare rules, not names*; ambient↔conditional state mapping; the two
traps (targeted extraction, one snapshot); runtime-only, source for discovery
only; not exact.

Files:
- `SKILL.md` — rewritten (general name/description; model→compare; two modes;
  stops at divergence). Removed the "TO DO" banner.
- `scripts/normalize.mjs` — **new.** Collapse a captured runtime into comparable
  rules (rule-signature = element-type chain from `body`): framework tags dropped
  and pass-through glue collapsed, so shape is compared, not labels.
- `scripts/model.mjs` — **new.** Build the **model** from the reference captures →
  `model/<state>.json` (rule signatures, types, controls, hidden layers, tokens,
  a11y, and box+computed style for uniquely-signed elements).
- `scripts/compare.mjs` — **new.** Compare a target capture against the model and
  print the divergence report (structure verdict → what's common → behaviour →
  accessibility → CSS rules → what was NOT checked). Position-free: CSS is
  compared on *unique* rule-signatures, never on index slots.
- `scripts/{run,extract,browser}.mjs`, `references/extracting.md` — prose
  generalized (reference/target). No behaviour change.
- `scripts/diff.mjs` — **removed** (superseded by model + compare).

## Verified

Ran the real pipeline on the existing car captures (23 states):

```
node model.mjs   <captures> /tmp/opencode/rd-model     → 23 models written
node compare.mjs /tmp/opencode/rd-model <captures>     → exit 0, 3636-line report, 23 states
```

Result: **9 states = structural DIVERGENCE**, **12 states = target did not reach
the state** (an action had no effect — e.g. `#stayB` absent on the build),
**2 states = invalid capture** (reference at 549×1189 vs target 390×844, so not
like-for-like). Every flag is a real finding — the compare refuses to score
across mismatched states rather than produce a misleading number. Confirmed by
reading the emitted report.

Global grep: no `runtime-ui-diff` references remain under `~/.agents/`.

## Not verified

- The **fix loop** (fix → re-run → converge). That is not this skill's job and
  was not attempted.
- Screens other than the car page (home, inventory) — no model built for them yet
  (done in the UI-layer plan).
- Whether the car **build page** is currently mid-edit (its thin structure /
  missing controls are reported as divergence, not judged).

## Note

The car content divergences (thin `main`, 18 missing controls) are the **project's
UI-layer work**, not the skill. The skill's job ends at the divergence report.
