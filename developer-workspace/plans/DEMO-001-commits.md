# DEMO-001 — commit tracker

**Purpose:** every task gets its own local commit, so the owner can revert to any point without
losing the work after it. A commit is made **when the task is done and its focused checks pass**,
not once at the end.

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

**Commit message:** `DEMO-001 C<n>: <scope>` — one line, imperative, no secret, no row, no person.

**Revert:** `git revert <hash>` keeps history; `git reset --hard <hash>` is local-only and would
discard uncommitted work, so it is never used without the owner asking. The tracker records the hash
after each commit.

## Commit points

| Point | Task | Scope | Files | Status | Hash |
|---|---|---|---|---|---|
| C0 | — | Plan and this tracker | `developer-workspace/plans/DEMO-001.md`, `developer-workspace/plans/DEMO-001-commits.md` | pending | — |
| C1 | 1 | Pure space rule and request resolver | `lib/space-rule.ts`, `lib/space.ts`, `lib/space.test.ts` | implemented, checks pass; commit pending | — |
| C2 | 2 | Main and demo database clients | `lib/db.ts`, `lib/config.ts`, `lib/db.test.ts`, `package.json` | implemented, checks pass; commit pending | — |
| C3 | 3 | Store doors + main-only public showroom and tap | `lib/store-guard.ts`, `lib/public-cars.ts`, `lib/tap.ts`, `lib/store-guard.test.ts` | implemented, checks pass; commit pending | — |
| C4 | 4 | Backup, notices and cleanup pinned to main | `lib/backup-run-live.ts`, `lib/settings.ts`, `lib/cleanup.ts`, `scripts/reconcile.ts` | implemented, checks pass; commit pending | — |
| C5 | 5 | Import-safety and door-isolation proofs | `lib/store-guard-import.test.ts`, `lib/space-isolation.test.ts`, `package.json` (only if a script is needed) | not started | — |
| C6 | 6 | Sanity labels/created-time + one-time snapshot tool | `lib/sanity.ts`, `scripts/demo-snapshot.ts`, `lib/demo-snapshot.test.ts`, `package.json` | not started | — |
| C7 | 7 | `restoreArchive` `preserveTables` | `lib/backup-restore.ts`, `lib/backup-restore.test.ts` | not started | — |
| C8 | 8 | Reset target proof + direct main advisory lock | `lib/demo-reset.ts`, `lib/neon-api.ts`, `lib/demo-reset.test.ts` | not started | — |
| C9 | 9 | Reset route, restore, demo-asset cleanup, cron | `app/api/demo/reset/route.ts`, `lib/demo-reset.ts`, `lib/demo-assets.ts`, `vercel.json`, `lib/demo-reset.test.ts` | not started | — |
| C10 | 10 | `OfficeSession.space` and cross-space sign-out | `lib/session.ts`, `lib/session.test.ts`, `app/office/actions/session.ts`, `lib/store-guard.ts` | not started | — |
| C11 | 11 | Persistent demo banner | `app/office/(shell)/layout.tsx`, `app/office/(shell)/demo-banner.tsx`, `app/office/(shell)/office.css` | not started | — |
| C12 | 12 | Demo upload mark, verification and cap | `lib/sanity.ts`, `lib/demo-assets.ts`, `app/api/upload/route.ts`, `app/office/actions/photo.ts`, `lib/demo-assets.test.ts` | not started | — |
| C13 | 13 | Demo Settings omits System and cleanup cards | `app/office/(shell)/settings/page.tsx`, `app/office/(shell)/settings/settings-client.tsx`, `app/office/(shell)/settings/cleanup-card.tsx` | not started | — |
| C14 | 14 | No buyer-page preview for a demo car | `app/office/(shell)/car/[ref]/page.tsx`, `app/office/(shell)/car/new/page.tsx`, `app/office/(shell)/car/car-client.tsx`, `app/office/(shell)/drafts/car/[id]/page.tsx` | not started | — |
| C15 | 15 | Sign-up page, demo link, corrected privacy notice | `app/office/sign-up/[[...sign-up]]/page.tsx`, `app/office/sign-in/[[...sign-in]]/page.tsx`, `app/(site)/privacy/page.tsx`, `lib/config.ts` | not started | — |
| C16 | 16 | Cleanup card and machine-litter exclusions | `lib/cleanup.ts`, `lib/cleanup-litter.ts`, `lib/sanity.ts`, `app/office/(shell)/settings/settings-client.tsx`, `scripts/cleanup-readiness.ts` | not started | — |
| C17 | 17 | Retire `demo:wipe` | `package.json`, `scripts/demo-wipe.ts` | not started | — |
| C18 | 18 | Owner setup handover | `/home/lordwhitefire/current-project/truespec-handover/DEMO-001-setup.md` (outside the repository; not committed) | not started | — |
| C19 | 19 | Full code-level gates and report | `developer-workspace/reports/DEMO-001-report.md` | not started | — |

## Progress notes

- 2026-10-26: Tasks 1–4 implemented. Focused tests and `npm run typecheck` pass. Commits C1–C4 are
  the next action; C0 commits the plan and this tracker.
- The plan file's task checkboxes are updated as tasks complete. The plan remains the roadmap; this
  file is the commit ledger.
