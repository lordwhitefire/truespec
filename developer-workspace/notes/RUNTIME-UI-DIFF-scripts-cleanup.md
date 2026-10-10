# Cleanup — stale local copy of runtime-ui-diff scripts

Date: 2026-10-10
Author: Developer agent (owner-approved)

## What was removed
Under `developer-workspace/scripts/runtime-ui-diff/`:
- `scripts/` — the project-local copy of the diff tooling.
- `SKILL.md` — the project-local skill copy.

## Why
The local `scripts/` copy was stale and broken:
- `run.mjs` called `applyActions(page, ctx, ...)` — arguments swapped vs the
  signature `applyActions(ctx, page, ...)` → crashed with
  `page.evaluate is not a function`.
- It also lacked the newer `{reload}` / `{wait}` action support.
- `diff.mjs` and `SKILL.md` were likewise out of date.
A broken copy that still looks runnable is a trap: the next session runs it,
hits the crash, and loses time. The skill is the single source of truth.

## What was kept
- `runs/` — the real capture data (`runs/car/captures/`, `runs/car/captures-v2/`,
  `runs/car/car.config.json`). Project data, not code.
- `references/extracting.md` — currently byte-identical to the skill's copy
  (not stale, so left in place).

## Run the diff from here (canonical skill)
    node ~/.agents/skills/runtime-ui-diff/scripts/run.mjs  <config.json> <capturesDir>
    node ~/.agents/skills/runtime-ui-diff/scripts/diff.mjs <capturesDir> <state>

No file in the project references the deleted local path; all references point
at `~/.agents/skills/runtime-ui-diff/scripts/`.
