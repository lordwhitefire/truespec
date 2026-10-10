# Brief — generalized `runtime-divergence` skill

**Task (owner, 2026-10-10).** The existing global skill `runtime-ui-diff` is really
about *runtime divergence*, not UI. Generalize it and rename it to
`runtime-divergence`, so any agent can use it for testing anything at runtime — not
just web UIs.

**The skill's job (and its edge).** Build a **model** from a **reference runtime**,
then compare **our own runtime** against that model to find the **divergence**. It
**stops at the divergence report**. It does **not** fix anything. Fixing is the
caller's job.

**Why a model.** Comparing two rule sets directly is hard — matching rule↔rule is
ambiguous and neither side is "right". Semantic-normalizing the reference's runtime
rules into one model gives a stable standard; we then measure our runtime *against*
it. The model is built once from the reference and reused: each loop iteration only
re-runs our side against it.

**Two modes.**
- **With a reference** — drive the reference, normalize its runtime → model; drive
  our runtime, normalize the same way, compare to the model.
- **Without a reference** — create our own reference (or a known-good snapshot),
  build our own model, keep testing our runtime against it.

**Not exact.** The skill is not for equality or a score. It reports divergence
rule-by-rule. Nothing is forced to be 100%.

**Runtime only.** Never diff the other party's source. The source is read for one
thing only: to enumerate the states to drive.

**Done looks like.** A global skill `runtime-divergence/` whose `SKILL.md`,
frontmatter and scripts no longer assume "web UI / our build vs a live site", but
say: reference runtime → model → compare our runtime → divergence report → stop —
and whose bundled scripts actually do that (a model is built from the reference
captures and our captures are compared against it).
