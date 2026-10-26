# DEMO-001 — code-level report

**Date:** 2026-10-26
**Verdict:** code complete; live verification pending owner setup.
**Repository:** `truespec`, branch `main`, local commits only. No push was made.
**Handover:** `/home/lordwhitefire/current-project/truespec-handover/DEMO-001-setup.md` (outside the
repository, mode `600`, no secret values).

**Copy gate:** the privacy notice and demo sign-up text are recorded in
`developer-workspace/notes/DEMO-001-copy-review.md`. Owner approval is still **pending**; this report
does not claim it. Keep `DEMO_SIGNUP_ENABLED` off until that text is approved.

---

## 1. What was built

- One server-side space rule: the exact Clerk public-metadata value `truespec_space = "main"` is
  main; every other account is demo. There is no client-supplied space, role table, or fallback to
  main.
- Main and demo database clients with separate doors. Public showroom, tap, backup, notices and
  cleanup reads stay pinned to main.
- A daily-reset demo space on a separate Neon branch. The reset proves the branch id, name `demo`,
  non-default status and a read-write endpoint before writing; it holds a direct main advisory lock
  and fails closed if that connection drops.
- The one-time snapshot is a fixed encrypted archive under the exact `truespec-demo-seed` label. The
  reset restores that archive and never copies live main.
- Demo uploads carry the server-set `truespec-demo` label and a 2 GiB default cap; main uploads
  carry `truespec-main`. A missing or wrong mark is deleted once and refused.
- Demo session space, a persistent demo banner, Settings without the main-only operational cards,
  and no buyer-page preview for demo cars.
- Sign-up and privacy pages behind the exact `"1"` switch; Clerk's `<SignUp />` at
  `/office/sign-up` with `fallbackRedirectUrl="/office"`; the sign-in page's demo link behind the
  same switch.
- Cleanup reports exclude the fixed seed, backups and exact demo-labelled assets.
- The legacy `demo:wipe` command is retired to a fail-closed stub; `is_demo` is documented as a
  legacy marker on main data, not the demo boundary. There is no replacement `is_demo` CLI.

The owner setup, branch creation, snapshot, first reset, Clerk metadata/sign-up mode, Vercel
environment and cron are in the handover. They are not claimed as done here.

---

## 2. Code-level gates

All commands were run from the repository root on 2026-10-26.

| Command | Result |
| --- | --- |
| `npm run typecheck` | exit 0; no TypeScript errors |
| `npm test` | exit 0; 504 pass, 0 fail, 0 cancelled, 0 skipped |
| `npm run build` | exit 0; production build completed, including `/office/sign-up/[[...sign-up]]` |
| `npm run leak-check` | PASSED; 21 public routes checked against the reachable remote store |
| `npm run store-freshness` | PASSED; 9 store-reading routes, none prerendered, no cached database response |
| `npm run db:migrate` | exit 0; main up to date — no migrations applied |
| `openspec validate --all` | 2 passed, 0 failed (`change/demo-mode`, `change/truespec-architecture`) |

### Test detail

The Node test run reported:

- `# tests 504`
- `# pass 504`
- `# fail 0`
- `# cancelled 0`
- `# skipped 0`

### Leak-check detail

The check ran against the existing development server on `http://localhost:3210` and the reachable
remote store. It reported 21 public routes, all `200`:

- 18 forbidden token(s)
- 36 cost value(s)
- 52 asset/file reference(s)
- 18 customer value(s)
- 3 office state label(s)

No forbidden token, cost, asset/file reference, customer value, or office-only state label was found
in a public response. This is a code-level leak check, not a demo-space live check.

### Migration detail

`npm run db:migrate` connected to main and reported `up to date — no migrations applied`. It did not
apply a schema change. The demo branch was **not** migrated: there is no demo branch or
`DEMO_DATABASE_URL` in this environment yet. That is an owner action and is reported as blocked
below.

---

## 3. Live checks — blocked, not passed

These require the owner's live Neon branch, Clerk application configuration, Vercel environment and
deployment. They were not run by the developer and are not claimed as passing.

| Live check | Status | Why |
| --- | --- | --- |
| Demo branch exists, is named `demo`, is not default, and has a read-write endpoint | **blocked — owner action** | No demo branch exists yet. |
| `DEMO_DATABASE_URL` and `DEMO_BRANCH_ID` are set | **blocked — owner action** | Demo environment values are not present. |
| Demo branch migrated to main's migration set | **blocked — owner action** | No demo connection. |
| One-time snapshot exists under the seed label | **blocked — owner action** | Snapshot has not been taken. |
| First reset returns 200 / `ok: true` / `step: "done"` / `cleanup.failed: 0` | **blocked — owner action** | No demo branch, seed, or live reset. |
| Owner and client have `truespec_space = "main"` | **blocked — owner action** | Clerk live metadata is owner setup. |
| Clerk sign-up mode is open with lockout and enumeration protections | **blocked — owner action** | Clerk live configuration. |
| `/api/demo/reset` cron exists at `0 3 * * *` UTC | **blocked — owner action** | Vercel deployment/cron setup. |
| Owner sees main, no banner, buyer preview present | **blocked — owner action** | No live main session/branch in this environment. |
| Client sees main, no banner | **blocked — owner action** | No live client session. |
| Stranger signs up and lands in demo with the banner | **blocked — owner action** | Clerk sign-up and demo branch are not live. |
| Demo/main isolation under a real session | **blocked — owner action** | Requires live spaces. |
| Demo upload label, cap, and missing-mark refusal | **blocked — owner action** | Requires a live demo session/store. |
| Shell banner, Settings render, and hidden preview on live pages | **blocked — owner action** | Requires live demo session. |
| Reset survival: main marker survives, demo upload disappears | **blocked — owner action** | Requires the first live reset. |
| Cleanup card excludes seed, backups and demo assets on live data | **blocked — owner action** | Requires live store data. |
| Privacy/sign-up copy approval | **blocked — owner gate** | Exact text is waiting for approval. |
| TASK-007 independent testing | **not claimed** | Separate task; this report is not that test. |

`npm run leak-check` is the one gate that read the remote store; it is a public-leak check, not a
demo-space verification. It passed. No live demo claim is made from it.

---

## 4. Commit ledger

One local commit per task, with explicit paths only. The owner's unrelated modified and untracked
files were not staged.

| Task | Scope | Commit |
| --- | --- | --- |
| 1 | Pure space rule and request resolver | `a10ef70` |
| 2 | Main and demo database clients | `9d86bc6` |
| 3 | Store doors and main-only public reads | `b95f411` |
| 4 | Backup, notices and cleanup pinned to main | `0b8c8e6` |
| 5 | Import-safety and door-isolation proofs | `6a3749b` |
| 6 | Sanity label/created-time and snapshot tool | `6b14af7` |
| 7 | `restoreArchive` `preserveTables` | `c0b3ba9` |
| 8 | Reset target proof and direct main lock | `754afef` |
| 9 | Reset route, restore, demo cleanup, cron | `c65ae66` |
| 10 | `OfficeSession.space` and cross-space sign-out | `26b335c` |
| 11 | Persistent demo banner | `efee9ea` |
| 12 | Demo upload mark, verification and cap | `13eefa0` |
| 13 | Demo Settings omits main-only cards | `ba0dee8` |
| 14 | No buyer-page preview for demo cars | `478f3eb` |
| 15 | Sign-up page, demo link, privacy notice | `e9282f3` |
| 16 | Cleanup and machine-litter exclusions | `84f2a60` |
| 17 | Retire `demo:wipe` | `07a566f` |
| 18 | Owner setup handover (record only; handover is outside git) | `2c03fde` |
| 19 | Full gates and this report | this commit |

The handover file itself is outside the repository and is not in a commit. Its plan/ledger record is
`2c03fde`; the handover is the file named at the top of this report.

---

## 5. Handover and secrets

- Handover path: `/home/lordwhitefire/current-project/truespec-handover/DEMO-001-setup.md`
- It is outside `git status`.
- It is mode `600`.
- It names the Clerk metadata key/value, every environment name, the direct-URL requirement, the
  branch identity checks, the `production` → `demo` branch order, the migration/recovery policy, the
  snapshot/first-reset order, the Clerk outer switch, the cron, and the verification checklist.
- It contains no secret value, provider key, connection string, token, or person.
- The handover was scanned for connection-string schemes, provider key prefixes and long token-like
  strings; the scan returned nothing.

No secret is in this report, a commit, or a log.

---

## 6. What remains for the owner

1. Approve the exact privacy/sign-up copy in
   `developer-workspace/notes/DEMO-001-copy-review.md`.
2. Follow the handover in order: owner/client metadata, demo branch from `production`, migration,
   Vercel environment, snapshot, first reset, Clerk sign-up, app switch, cron, live verification.
3. Keep `DEMO_SIGNUP_ENABLED` off until the copy is approved and Clerk sign-up is deliberately
   opened.
4. Run TASK-007 independently; this report does not substitute for it.

The build is code complete. Live verification is pending owner setup, not passed.
