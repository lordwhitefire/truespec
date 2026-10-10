# Plan — generalize `runtime-ui-diff` → `runtime-divergence`

Owner: "it is more about runtime divergence than ui, so generalize it and rename it
to be runtime divergence."

## What changes and where

All inside the global skill (nothing under `developer-workspace/` is rewritten —
those are dated records).

1. **Rename** `~/.agents/skills/runtime-ui-diff/` → `~/.agents/skills/runtime-divergence/`.
2. **`SKILL.md`** — rewrite:
   - frontmatter `name: runtime-divergence`; description generalized (any runtime,
     any agent, testing); keep the pushy trigger language but drop "web page only".
   - drop the TO DO banner (owner is replacing the whole framing).
   - new core: **reference runtime → model → compare our runtime → divergence →
     stop**; the two modes (with / without a reference); "not exact"; runtime-only;
     ambient vs conditional map; compare rules not names; the two traps; report
     shape; stops at divergence (fixing is the caller's).
3. **Scripts**
   - `normalize.mjs` (new, shared): collapse tree to content rules; rule signatures
     (element type + nesting + counts); controls, hidden layers, tokens, a11y.
   - `model.mjs` (new): build the model from the **reference** captures
     (`ref.json` per state) → `model/<state>.json`.
   - `compare.mjs` (new): compare our captures (`build.json`) against the model →
     divergence report. Replaces the old `diff.mjs`.
   - `run.mjs`, `extract.mjs`, `browser.mjs`: keep working code; generalize prose
     ("reference"/"target", not "our page vs a site"); no behaviour change.
   - remove `diff.mjs` (superseded by `compare.mjs`).
4. **`references/extracting.md`** — generalize wording (same content).
5. **Project pointer** — update `developer-workspace/README.md` to the new live
   path. Leave historical reports/notes as records; add a rename note.

## Order (small steps, verified)

1. brief + plan (this).
2. rename dir.
3. normalize.mjs → model.mjs → compare.mjs (smallest working versions).
4. rewrite SKILL.md.
5. generalize run/extract/references prose.
6. **Verify**: build a model from the car reference captures, compare the car build
   against it → a divergence report must come out. Spot-check honesty.
7. report; hand to owner (the fixing + 80% is the *UI-layer plan*, a separate task).

## Invariants

- Runtime only; source for state discovery only.
- The skill stops at divergence — no fixing, no score.
- Never a percentage as the verdict.
- One persistent visible browser; full extraction (no selector shortlists).
- Existing car captures stay usable (don't break `ref.json`/`build.json` names).
