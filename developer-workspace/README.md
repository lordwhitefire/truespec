# developer-workspace

This is the Developer's own home base — briefs, notes, plans, reports and
working scripts from the work done here. It is mine alone.

The **`runtime-divergence`** capability (build a *model* from the reference's
runtime, compare our build *against the model*, report the divergence) is
documented here.

> **Renamed (2026-10-10, owner).** The skill was `runtime-ui-diff`; it is now the
> general **`runtime-divergence`** skill — reference runtime → model → compare the
> target runtime → divergence report → **stop**. Live skill:
> `~/.agents/skills/runtime-divergence/` (was `.../runtime-ui-diff/`).
> New brief/plan: `briefs/RUNTIME-DIVERGENCE-skill-brief.md`,
> `plans/RUNTIME-DIVERGENCE-skill-plan.md`. The docs below keep their original
> names as dated records.

- `briefs/RUNTIME-UI-DIFF-brief.md` — what was asked, what done looks like.
- `notes/RUNTIME-UI-DIFF-method.md` — the method and terminology
  (ambient / conditional × HTML / CSS / JS; states; ref-vs-build).
- `plans/RUNTIME-UI-DIFF-plan.md` — the plan and how it maps to the code.
- `reports/RUNTIME-UI-DIFF-report.md` — built, verified, and not-yet-done.
- `reports/RUNTIME-UI-DIFF-car-default.md` — the machine output of the first
  real run (car page, default state).
- `notes/RESUME-car-full-run.md` — resume checkpoint: the car page full
  23-state run (captures complete, results not yet generated).
- `scripts/runtime-ui-diff/` — a snapshot of the skill's code (old name; captures
  still under `runs/`). The live skill is `~/.agents/skills/runtime-divergence/`.
