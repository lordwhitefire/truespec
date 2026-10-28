# DEMO-001 — owner rulings

## 2026-10-26 — Neon demo branch

**Ruling:** the Developer will create the Neon `demo` branch from `production` when the owner gives
the explicit go.

**Status:** EXECUTED on 2026-10-26. The owner said: “create it.”

**Scope and guardrails:**
- One branch in the existing Neon project; no second project.
- Branch name exactly `demo`; parent `production`; not the default branch.
- Use the direct/unpooled, read-write connection.
- Read the current project and branches first; do not print the connection string.
- Branch created: `br-cold-firefly-b2gzi24t`; name `demo`; parent `production`; not default;
  read-write compute `ep-rough-smoke-b2d1vf9j`; direct connection verified.
- This ruling covered branch creation only. Migration, Vercel environment, snapshot, first reset,
  Clerk sign-up and live checks remain separate steps unless the owner rules otherwise.
