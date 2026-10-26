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
| 9 | Reset route, restore, demo-asset cleanup, cron | `app/api/demo/reset/route.ts`, `lib/demo-reset.ts`, `lib/demo-assets.ts`, `lib/sanity.ts`, `vercel.json`, `lib/demo-reset.test.ts` | focused tests + typecheck + build | committed | `c65ae66` |
| 10 | `OfficeSession.space` and cross-space sign-out | `lib/session-space.ts`, `lib/session.ts`, `lib/session.test.ts`, `app/office/actions/session.ts` | focused tests + typecheck | committed | `26b335c` |
| 11 | Persistent demo banner | `app/office/(shell)/layout.tsx`, `app/office/(shell)/demo-banner.tsx` | typecheck + build + static render | committed | `efee9ea` |
| 12 | Demo upload mark, verification and cap | `lib/demo-assets.ts`, `app/api/upload/route.ts`, `app/office/actions/photo.ts`, `lib/demo-assets.test.ts` | focused tests + typecheck + build | committed | `13eefa0` |
| 13 | Demo Settings omits System and cleanup cards | `app/office/(shell)/settings/page.tsx`, `app/office/(shell)/settings/settings-client.tsx` | typecheck + build + source inspection | committed | `ba0dee8` |
| 14 | No buyer-page preview for a demo car | `app/office/(shell)/car/[ref]/page.tsx`, `app/office/(shell)/car/new/page.tsx`, `app/office/(shell)/car/car-client.tsx`, `app/office/(shell)/drafts/car/[id]/page.tsx` | typecheck + build + source inspection | committed | `478f3eb` |
| 15 | Sign-up page, demo link, corrected privacy notice | `app/office/sign-up/[[...sign-up]]/page.tsx`, `app/office/sign-in/[[...sign-in]]/page.tsx`, `app/(site)/privacy/page.tsx`, `lib/config.ts`, `lib/config.test.ts`, `app/office/door.css`, `developer-workspace/notes/DEMO-001-copy-review.md` | typecheck + build + full suite + copy review | committed; copy approval pending | `e9282f3` |
| 16 | Cleanup card and machine-litter exclusions | `lib/cleanup.ts`, `lib/cleanup-litter.ts`, `lib/cleanup-litter.test.ts`, `scripts/cleanup-readiness.ts` | focused tests + typecheck + full suite | committed | `84f2a60` |
| 17 | Retire `demo:wipe` | `package.json`, `scripts/demo-wipe.ts`, `lib/sanity.ts` | typecheck + fail-closed run | committed | `07a566f` |
| 18 | Owner setup handover | `/home/lordwhitefire/current-project/truespec-handover/DEMO-001-setup.md` (outside the repository; plan/ledger record committed) | handover review + secret scan + mode check | committed (record only); hash recorded in T19 | — |
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
- 2026-10-26: Task 10 implemented. `lib/session.test.ts` (16 tests), the full suite (487 pass),
  `npm run typecheck` and `npm run build` pass. The session row is read and created in the resolved
  space; the live Clerk session and the demo branch remain owner actions, not claimed.
- 2026-10-26: Task 11 implemented. The shell renders the banner only when the session's space is
  demo; the component's static render carries the exact copy and `role="note"`. `npm run typecheck`,
  `npm run build` and the full suite (487 pass) pass. The full demo/main shell render is blocked —
  owner action, not claimed.
- 2026-10-26: Task 12 implemented. The server chooses the exact label from the session's space; both
  upload paths verify it, delete an unmarked upload and refuse. The demo cap counts only exact
  `truespec-demo` assets and defaults to 2 GiB; an over-cap, unreadable or misconfigured check
  refuses. `lib/demo-assets.test.ts` (14 tests), the full suite (501 pass), `npm run typecheck` and
  `npm run build` pass. A live demo upload is blocked — owner action, not claimed.
- 2026-10-26: Task 13 implemented. A demo session gets `readSettings` and the two state registries;
  `readNotices` and `listWaitingToBeCleared` are not called, and `notices`/`cleanup` are absent from
  the demo client props. Main still supplies both and renders both cards. `npm run typecheck`,
  `npm run build` and the full suite (501 pass) pass. The live demo Settings render is blocked —
  owner action, not claimed.
- 2026-10-26: Task 14 implemented. `CarForm` requires `isDemo`; the edit, add and draft pages pass
  the session's space. The "Preview the buyer page" block is absent for a demo car and unchanged for
  main. `npm run typecheck`, `npm run build` and the full suite (501 pass) pass. The live demo/main
  car render is blocked — owner action, not claimed.
- 2026-10-26: Task 15 implemented. Clerk's `<SignUp />` is mounted at `/office/sign-up` with
  `fallbackRedirectUrl="/office"`; `DEMO_SIGNUP_ENABLED` gates the route and the sign-in page's
  secondary demo link through the shared `demoSwitchOn` rule. The privacy notice is corrected for the
  optional demo account, sign-in-only email, daily reset, upload deletion, no marketing email and the
  provider's authentication messages. `lib/config.test.ts` (1 test), the full suite (502 pass),
  `npm run typecheck` and `npm run build` pass. Exact copy is recorded for owner approval in
  `developer-workspace/notes/DEMO-001-copy-review.md`; approval is pending, not claimed.
- 2026-10-26: Task 16 implemented. The cleanup query now reads each asset's label. The pure litter
  rule excludes the exact seed label, the fixed seed filename, the exact `truespec-demo` label and
  the existing backup-name pattern; prefix near-misses remain litter. `scripts/cleanup-readiness.ts`
  still prints the asset-store count and no longer derives a false "referenced" count from the
  filtered list. `lib/cleanup-litter.test.ts` (5 tests), the full suite (504 pass) and
  `npm run typecheck` pass.
- 2026-10-26: Task 17 implemented. `demo:wipe` is removed from `package.json`; `scripts/demo-wipe.ts`
  is a fail-closed stub with no database/Sanity import and exits 1. `grep` finds no active old
  command, `lib/demo-reset.ts` has no `is_demo`, and the owner's office delete is unchanged. The
  `deleteAsset` caller comment now records the retired wipe and the current callers.
  `npm run typecheck` and the fail-closed run pass.
- 2026-10-26: Task 18 handover written at
  `/home/lordwhitefire/current-project/truespec-handover/DEMO-001-setup.md`, outside the repository
  and mode 600. It names the Clerk metadata key/value, every environment name, the direct-URL and
  branch identity rules, the demo branch creation/migration/recovery order, the snapshot/first-reset
  order, the Clerk outer switch and the verification checklist. The secret-pattern scan is clean;
  the path does not appear in `git status`.
- The plan file's task checkboxes are updated as tasks complete. The plan remains the roadmap; this
  file is the commit ledger.
