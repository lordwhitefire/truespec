# DEMO-001 — commit tracker

**Purpose:** commits are made at the plan's **checkpoints**, not after every task. A checkpoint
commit contains all task work since the previous checkpoint, so the owner can revert to a coherent
point without a trail of tiny commits. The checkpoint's focused tests and typecheck must pass first.

**Where:** `/home/lordwhitefire/current-project/truespec`, branch `main`, local repository.
**No push** unless the owner asks. A commit here is a local revert point, not a published change.

**What is staged:** explicit paths only. Never `git add -A` and never a broad `git add .` — the
repository already holds the owner's unrelated modified and untracked files. Those stay out of every
commit:

- `.opencode/agent/product-management-agent.md`
- `openspec/tasks-registry.md`
- `openspec/changes/demo-mode/` (the task's design/specs, supplied before this build)
- `openspec/tasks/DEMO-001/` (the task and testing files, supplied before this build)
- `openspec/research/demo-mode-owner-decisions.md`
- `product-management/*`

**Commit message:** `DEMO-001 checkpoint <A|B|C1|C2|D1|D2|E|F>: <scope>` — one line, imperative,
no secret, no row, no person.

**Revert:** `git revert <hash>` keeps history; `git reset --hard <hash>` is local-only and would
discard uncommitted work, so it is never used without the owner asking. The tracker records the hash
after each commit.

## Checkpoint commits

| Checkpoint | Tasks | Scope | Gate | Status | Hash |
|---|---|---|---|---|---|
| A | 1–3 | Space rule, two DB clients, doors, public showroom and tap main-only | Focused tests + typecheck | committed as the fine-grained C1–C3; this is the checkpoint point | `b95f411` |
| B | 4–5 | Backup/notices/cleanup main-only; import-safety and door-isolation proofs | Focused tests + typecheck | Task 4 in `0b8c8e6`; Task 5 passes; checkpoint B commit is this point | — |
| C1 | 6–7 | One-time snapshot tool; `restoreArchive` `preserveTables` | Focused tests + typecheck | not started | — |
| C2 | 8–9 | Reset target proof, direct main lock, reset route, demo-asset cleanup, cron | Focused tests + typecheck + build | not started | — |
| D1 | 10–11 | `OfficeSession.space`, cross-space sign-out, demo banner | Focused tests + typecheck | not started | — |
| D2 | 12 | Demo upload mark, verification and cap | Focused tests + typecheck | not started | — |
| E | 13–15 | Demo Settings, no buyer preview, sign-up page and privacy | Typecheck + build + copy review | not started | — |
| F | 16–19 | Cleanup exclusions, retire `demo:wipe`, handover, full gates and report | Full gates + honest report | not started | — |

**Checkpoint commit contents:** every task file since the previous checkpoint, plus this tracker's
updated row. The handover at C18 is outside the repository and is not committed. The report at C19
is committed with the final checkpoint if it is not ignored.

## History before the checkpoint-only rule

- `1bf99c4` — C0: plan and this tracker.
- `a10ef70` — C1: pure space rule and request resolver.
- `9d86bc6` — C2: main and demo database clients.
- `b95f411` — C3: store doors and main-only public reads. Together with C1–C2, this is checkpoint A.
- `0b8c8e6` — C4: backup, notices and cleanup pinned to main. This is part of checkpoint B.
- `9237219` — ledger: recorded the C0–C4 hashes.

The owner set the checkpoint-only rule after C4. History is not rewritten; the next commit is
checkpoint B after Task 5. The fine-grained commits remain usable revert points.

## Progress notes

- 2026-10-26: Tasks 1–4 implemented. Focused tests and `npm run typecheck` pass. Checkpoint A is
  covered by C1–C3 (`b95f411`); Task 4 is in C4 (`0b8c8e6`).
- 2026-10-26: checkpoint-only rule adopted. Task 5 passes; checkpoint B is the next commit (Task 4
  is already in C4). No separate Task 5 commit.
- The plan file's task checkboxes are updated as tasks complete. The plan remains the roadmap; this
  file is the checkpoint ledger.
