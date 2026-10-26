# DEMO-001 — commit tracker

**Purpose:** one local commit per task, so the owner can revert any single task without reverting the
whole build. A task's focused tests and typecheck must pass before its commit. The commits are the
revert points; the checkpoint letters below are review milestones, not commits.

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

**Commit message:** `DEMO-001 T<n>: <scope>` — one line, imperative, no secret, no row, no person.
The existing `C1`–`C4` commits are Tasks 1–4 under the earlier naming; they remain valid revert
points.

**Revert:** `git revert <hash>` keeps history. If a later task changed the same lines, git reports a
conflict; resolve it or revert the later task first. `git reset --hard` is local-only and would
discard uncommitted work, so it is never used without the owner asking.

## Task commits

| Task | Scope | Main files | Gate | Status | Hash |
|---|---|---|---|---|---|
| 1 | Pure space rule and request resolver | `lib/space-rule.ts`, `lib/space.ts`, `lib/space.test.ts` | focused tests + typecheck | committed (C1) | `a10ef70` |
| 2 | Main and demo database clients | `lib/db.ts`, `lib/config.ts`, `lib/db.test.ts`, `package.json` | focused tests + typecheck | committed (C2) | `9d86bc6` |
| 3 | Store doors and main-only public reads | `lib/store-guard.ts`, `lib/public-cars.ts`, `lib/tap.ts`, `lib/store-guard.test.ts` | focused tests + typecheck | committed (C3) | `b95f411` |
| 4 | Backup, notices and cleanup pinned to main | `lib/backup-run-live.ts`, `lib/settings.ts`, `lib/cleanup.ts`, `scripts/reconcile.ts` | focused tests + typecheck | committed (C4) | `0b8c8e6` |
| 5 | Import-safety and door-isolation proofs | `lib/store-guard-import.test.ts`, `lib/space-isolation.test.ts` | focused tests + typecheck | committed | `6a3749b` |
| 6 | Sanity label/created-time and the one-time snapshot tool | `lib/sanity.ts`, `lib/demo-snapshot.ts`, `scripts/demo-snapshot.ts`, `lib/demo-snapshot.test.ts`, `package.json` | focused tests + typecheck | committed | `6b14af7` |
| 7 | `restoreArchive` `preserveTables` | `lib/backup-restore.ts`, `lib/backup-restore.test.ts` | focused tests + typecheck | committed | `c0b3ba9` |
| 8 | Reset target proof and direct main advisory lock | `lib/demo-reset.ts`, `lib/neon-api.ts`, `lib/demo-reset.test.ts` | focused tests + typecheck | committed | `754afef` |
| 9 | Reset route, restore, demo-asset cleanup, cron | `app/api/demo/reset/route.ts`, `lib/demo-reset.ts`, `lib/demo-assets.ts`, `lib/sanity.ts`, `vercel.json`, `lib/demo-reset.test.ts` | focused tests + typecheck + build | committed; hash recorded in T10 | — |
| 10 | `OfficeSession.space` and cross-space sign-out | `lib/session.ts`, `lib/session.test.ts`, `app/office/actions/session.ts`, `lib/store-guard.ts` | focused tests + typecheck | pending | — |
| 11 | Persistent demo banner | `app/office/(shell)/layout.tsx`, `app/office/(shell)/demo-banner.tsx`, `app/office/(shell)/office.css` | focused tests + typecheck | pending | — |
| 12 | Demo upload mark, verification and cap | `lib/sanity.ts`, `lib/demo-assets.ts`, `app/api/upload/route.ts`, `app/office/actions/photo.ts`, `lib/demo-assets.test.ts` | focused tests + typecheck | pending | — |
| 13 | Demo Settings omits System and cleanup cards | `app/office/(shell)/settings/page.tsx`, `app/office/(shell)/settings/settings-client.tsx`, `app/office/(shell)/settings/cleanup-card.tsx` | focused tests + typecheck | pending | — |
| 14 | No buyer-page preview for a demo car | `app/office/(shell)/car/[ref]/page.tsx`, `app/office/(shell)/car/new/page.tsx`, `app/office/(shell)/car/car-client.tsx`, `app/office/(shell)/drafts/car/[id]/page.tsx` | focused tests + typecheck | pending | — |
| 15 | Sign-up page, demo link, corrected privacy notice | `app/office/sign-up/[[...sign-up]]/page.tsx`, `app/office/sign-in/[[...sign-in]]/page.tsx`, `app/(site)/privacy/page.tsx`, `lib/config.ts` | typecheck + build + copy review | pending | — |
| 16 | Cleanup card and machine-litter exclusions | `lib/cleanup.ts`, `lib/cleanup-litter.ts`, `lib/sanity.ts`, `app/office/(shell)/settings/settings-client.tsx`, `scripts/cleanup-readiness.ts` | focused tests + typecheck | pending | — |
| 17 | Retire `demo:wipe` | `package.json`, `scripts/demo-wipe.ts` | typecheck | pending | — |
| 18 | Owner setup handover | `/home/lordwhitefire/current-project/truespec-handover/DEMO-001-setup.md` (outside the repository; not committed) | handover review | pending | — |
| 19 | Full code-level gates and report | `developer-workspace/reports/DEMO-001-report.md` | full gates + honest report | pending | — |

**Hash bookkeeping:** a task's hash is recorded in the next task's commit (the commit cannot contain
its own hash). `git log --oneline` is always the live truth. The final report commit records the last
task hash.

## Review milestones

- **A** — Tasks 1–3: space rule, two clients, doors, public showroom and tap.
- **B** — Tasks 4–5: main-only backup/notices/cleanup; import and door isolation proofs.
- **C1** — Tasks 6–7: snapshot and `preserveTables`.
- **C2** — Tasks 8–9: reset target proof, lock, route and cleanup.
- **D1** — Tasks 10–11: session space and demo banner.
- **D2** — Task 12: demo uploads.
- **E** — Tasks 13–15: demo UI, no buyer preview, sign-up and privacy.
- **F** — Tasks 16–19: cleanup exclusions, legacy wipe retirement, handover, gates and report.

## Progress notes

- 2026-10-26: Tasks 1–5 implemented. Focused tests and `npm run typecheck` pass. The owner chose
  per-task commits so any task can be reverted on its own.
- Task 5's commit is `6a3749b` (it also carried the plan/tracker update made at the time). The
  earlier `C1`–`C4` commits are Tasks 1–4.
- 2026-10-26: Task 6 implemented. `lib/demo-snapshot.test.ts` (7 tests) and `npm run typecheck`
  pass. The live Sanity upload is owner action, not claimed.
- 2026-10-26: Task 7 implemented. `lib/backup-restore.test.ts` (14 tests) and `npm run typecheck`
  pass; the demo-branch restore itself is owner action, not claimed.
- 2026-10-26: Task 8 implemented. `lib/demo-reset.test.ts` (20 tests) and `npm run typecheck`
  pass. The Neon API proof and the real `pg` lock are owner actions, not claimed.
- 2026-10-26: Task 9 implemented. `lib/demo-reset.test.ts` (32 tests), the full suite (478 pass),
  `npm run typecheck` and `npm run build` pass. The route is built; the first live reset, the demo
  branch and the real snapshot remain owner actions, not claimed.
- The plan file's task checkboxes are updated as tasks complete. The plan remains the roadmap; this
  file is the commit ledger.
