# Implementation Plan: DEMO-001 — demo mode

**Status:** in progress — Tasks 1–15 code complete, checks pass; live setup and copy approval remain the owner's. **Code
boundary:** the Builder writes code, tests and the handover; the owner performs every live Neon,
Clerk and Vercel action. Live-only checks are reported as **blocked — owner action**, never as
passed. The task is not reported done until the demo branch, the fixed snapshot and the first reset
exist.

**Source of truth:** `openspec/tasks/DEMO-001/task.md`,
`openspec/changes/demo-mode/{design.md,tasks.md,specs/}`, and
`openspec/tasks/DEMO-001/testing.md`. This plan adds no rule; it orders the work and names the
files.

**Plan location:** `developer-workspace/plans/DEMO-001.md` (owner ruling). The change's
`tasks.md` stays untouched. **Task list target:** this plan's checklist; no separate
`tasks/todo.md`. **Commit ledger:** `developer-workspace/plans/DEMO-001-commits.md` — one local
commit per task, no push, unrelated owner files never staged.

**Handover:** `/home/lordwhitefire/current-project/truespec-handover/DEMO-001-setup.md`, outside
the repository. Names and steps only; no secret values. Mode 600 if values are ever added.

## Shared understanding

- One site, one public URL, one Vercel deployment, one Clerk application, one Neon project.
- Main is the existing `production` branch. Demo is a child branch named `demo` in the same
  project, created from `production` once.
- A signed-in Clerk user is main only when `publicMetadata.truespec_space` is exactly `"main"`.
  Everything else is demo. Missing, malformed or unreadable is demo.
- Main is never written, truncated or restored by the demo path. The reset's only main connection
  is the advisory lock.
- The demo source is one fixed encrypted archive of main, taken once. The daily reset never copies
  live main.
- No schema change, no role/permission system, no allow-list, no second project/application, no
  email channel.
- Build order: (1) space rule + doors + public/tap/backup pinning; (2) snapshot + reset, including
  demo-asset cleanup, guards and lock; (3) session space; (4) uploads; (5) UI/sign-up/privacy;
  (6) cleanup-card exclusions, legacy wipe retirement, handover, full gates.
- Privacy and sign-up copy is drafted from the spec, shown at the end, and is pending the owner's
  approval. No invented claims.
- The independent test remains TASK-007. This plan runs code-level gates only.

## Architecture decisions

1. **Space rule is pure and fail-safe.** `lib/space.ts` exports `spaceFromMetadata(metadata:
   unknown): "main" | "demo"` and `resolveSpace()`. The pure rule returns `"main"` only for the
   exact string; the resolver reads `currentUser()`, is wrapped in React `cache()`, and throws when
   there is no signed-in user or Clerk fails. It never falls back to main.
2. **Two database clients, no fallback.** `mainDb()` uses `DATABASE_URL`. `demoDb()` uses the one
   direct `DEMO_DATABASE_URL` and throws `ConfigError` when it is missing or invalid. `db()` remains
   a main-only alias for scripts.
3. **Two door families.** `storeQuery` / `storeQueryRefusing` resolve the office space from the
   signed-in user, with an explicit `{ space }` option for the session check. `storeQueryMain`,
   `storeQueryOnceMain` and `storeQueryMainRefusing` are always main. Public showroom, tap, backup,
   seed/reconcile and cleanup use the main doors.
4. **CLI import safety.** `lib/store-guard.ts` does not import `next/headers`,
   `@clerk/nextjs/server` or `lib/space.ts` at the top level. The office door's request-only
   resolution is lazy; the main doors never load Clerk. A test imports a main door under
   `--conditions=react-server` and proves the request layer is not pulled in.
5. **Main lock is direct and fail-closed.** The reset opens a direct `pg` connection to main using
   `DATABASE_URL_UNPOOLED` only. It refuses before touching demo when that URL is missing or is a
   pooled host. The connection is for the lock only and is held across restore and cleanup; if it
   drops, the run fails and is not reported as success.
6. **Demo has one direct address.** `DEMO_DATABASE_URL` is the direct/unpooled demo branch address
   used by both the app and the reset. No `DEMO_DATABASE_URL_UNPOOLED` is introduced.
7. **Branch guard has four checks.** The demo branch ID must equal `DEMO_BRANCH_ID`; the branch name
   must be `demo`; the branch must not be the project's default branch; and the demo URL host must
   be a read-write endpoint of that branch (pooled/direct normalised). The non-default and host
   checks are additional, never substitutes for the ID/name match.
8. **Main is identified by identity, not the word "main".** Neon's root branch stays `production`.
   The reset compares the default branch by branch ID or default flag from the project's branch
   list. No `MAIN_BRANCH_ID` is added unless the Neon API forces it.
9. **Snapshot reuses the existing archive.** `buildBackupArchive` + `encryptBackup` produce
   `demo-seed.json.gz.enc`, uploaded under the system label `truespec-demo-seed`. The snapshot tool
   deletes older seed-labelled assets so exactly one remains. It never creates a schema or table.
10. **Restore preserves demo's migration history.** `restoreArchive` gains `preserveTables`;
    truncate, insert and count checks skip the named table. The demo reset passes
    `schema_migrations`; the manual main restore keeps its full-restore behaviour.
11. **Demo uploads are marked and capped.** The server sets the exact label `truespec-demo` from
    `OfficeSession.space`. The upload result is verified; a missing label deletes the asset and
    refuses. The cap counts only demo-marked assets and defaults to 2 GiB.
12. **Cleanup is exact.** The reset deletes only assets with the exact label `truespec-demo` created
    before the reset started. Prefix matching is forbidden. Unmarked, seed, backup and main assets
    are never candidates.
13. **Switches are exact.** `DEMO_SIGNUP_ENABLED` and `DEMO_RESET_ENABLED` are on only for the exact
    string `"1"`. One shared check is used and the wrong values are tested.
14. **UI changes are the minimum.** Demo banner in the shell; no buyer-page preview for a demo car;
    no System or cleanup-readiness card in demo Settings; Clerk sign-up page and secondary demo
    link; corrected privacy notice. No redesign.
15. **No live writes, no commits, no pushes.** The owner performs the live setup. The report says
    "code complete, live verification pending owner setup."

## Task list

### Phase 1 — Foundation and main pinning

- [x] Task 1: Pure space rule and request resolver
- [x] Task 2: Main and demo database clients
- [x] Task 3: Store doors + public showroom and tap pinned to main
- [x] Task 4: Backup, settings notices and cleanup pinned to main
- [x] Task 5: Import-safety and door-isolation proofs

### Checkpoint A — after Tasks 1–3
- [x] Focused tests and `npm run typecheck` pass.
- [x] Public showroom and tap cannot reach demo.

### Checkpoint B — after Tasks 4–5
- [x] Backup, settings notices and cleanup are main-only.
- [x] Main-door import test passes under `--conditions=react-server`.
- [x] A demo request cannot reach main at the door.

### Phase 2 — Snapshot and reset (highest risk)

- [x] Task 6: Sanity label/created-time support and the one-time snapshot tool
- [x] Task 7: `restoreArchive` `preserveTables`
- [x] Task 8: Reset target proof and direct main advisory lock
- [x] Task 9: Reset route, restore orchestration, demo-asset cleanup and cron

### Checkpoint C1 — after Tasks 6–7
- [x] Snapshot tool unit tests and `preserveTables` tests pass.
- [x] No schema or table is created by the snapshot tool.

### Checkpoint C2 — after Tasks 8–9
- [x] Wrong-target, missing-lock-URL, lock-drop and seed-count tests pass.
- [x] `schema_migrations` preservation test passes.
- [x] `npm run build` passes.

### Phase 3 — Office session and demo shell

- [x] Task 10: `OfficeSession.space`, cross-space sign-out, tests
- [x] Task 11: Persistent demo banner in the office shell

### Checkpoint D1 — after Tasks 10–11
- [x] Main row in main, demo row in demo, cross-space refusal and sign-out tests pass.
- [ ] Demo banner appears on every shell page; main shows none. (Live render blocked — owner action;
  the code path and static banner render are in place.)

### Phase 4 — Demo uploads

- [x] Task 12: Server-set demo label, verification, 15 MB and total cap

### Checkpoint D2 — after Task 12
- [x] Mark, verify, cap and main-upload tests pass.
- [x] An unmarked demo upload cannot survive.

### Phase 5 — Demo UI, sign-up and privacy

- [x] Task 13: Demo Settings omits System and cleanup-readiness cards
- [x] Task 14: No buyer-page preview for a demo car
- [x] Task 15: Clerk sign-up page, demo link and corrected privacy notice (copy pending owner approval)

### Checkpoint E — after Tasks 13–15
- [x] `npm run typecheck` and `npm run build` pass.
- [x] Demo props contain no main storage, backup or asset filenames.
- [ ] Privacy/sign-up copy is shown to the owner and marked pending approval. (Exact text is in
  `developer-workspace/notes/DEMO-001-copy-review.md`; approval is pending.)

### Phase 6 — Cleanup exclusions, legacy retirement, handover and gates

- [ ] Task 16: Cleanup card and machine-litter exclusions
- [ ] Task 17: Retire `demo:wipe`
- [ ] Task 18: Owner setup handover outside the repository
- [ ] Task 19: Full code-level gates and honest report

### Checkpoint F — final
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `npm run leak-check`,
      `npm run store-freshness`, `npm run db:migrate` (main only) and `openspec validate --all`
      are run and reported with exact figures.
- [ ] Live-only checks are named blocked — owner action, not passed.
- [ ] No secret is in the repository, a log or the report.

---

## Task 1 — Pure space rule and request resolver

**Description:** Create the one server-side space rule. The pure rule lives in `lib/space-rule.ts` so
it is testable without Clerk; `lib/space.ts` re-exports it and holds the request resolver.
`spaceFromMetadata` is pure. `resolveSpace` reads the authoritative Clerk user, applies the rule, is
cached per request with React `cache()`, and throws for an anonymous user or a Clerk failure. It
never returns main by fallback.

**Acceptance criteria:**
- [x] `spaceFromMetadata("main")` is `"main"`; exact string only.
- [x] Missing, `null`, a non-string, `"Main"`, `" main"`, an object and `undefined` are `"demo"`.
- [x] The resolver core refuses when there is no signed-in user.
- [x] A Clerk backend failure is not caught; it never returns main.
- [x] The resolver is request-cached, not cross-request cached.

**Verification:**
- [x] `node --import tsx --test lib/space.test.ts`
- [x] `npm run typecheck`

**Dependencies:** None.

**Files likely touched:**
- `lib/space-rule.ts` (new)
- `lib/space.ts` (new)
- `lib/space.test.ts` (new)

**Estimated scope:** Small (2 files).

---

## Task 2 — Main and demo database clients

**Description:** `lib/db.ts` gains `mainDb()` from `DATABASE_URL` and `demoDb()` from the one direct
`DEMO_DATABASE_URL`. A missing or invalid demo URL raises a configuration error and never returns
the main client. `db()` stays a main-only alias for existing scripts. `lib/config.ts` exposes the
demo URL without making it required for main-only builds.

**Acceptance criteria:**
- [x] `mainDb()` uses `DATABASE_URL`; `demoDb()` uses `DEMO_DATABASE_URL`.
- [x] Missing, empty or malformed `DEMO_DATABASE_URL` throws `ConfigError`.
- [x] `demoDb()` never returns the main client.
- [x] `db()` is main-only and existing scripts do not reach demo.
- [x] Main-only import/build does not require `DEMO_DATABASE_URL`.

**Verification:**
- [x] `node --conditions=react-server --import tsx --test lib/db.test.ts`
- [x] `npm run typecheck`

**Dependencies:** Task 1 (space type only; may run in parallel).

**Files likely touched:**
- `lib/db.ts`
- `lib/config.ts`
- `lib/db.test.ts` (new)

**Estimated scope:** Medium (3 files).

---

## Task 3 — Store doors + public showroom and tap pinned to main

**Description:** Add `storeQueryMain`, `storeQueryOnceMain` and `storeQueryMainRefusing` to
`lib/store-guard.ts`. Make the office `storeQuery` / `storeQueryRefusing` resolve the signed-in
space through a request-only lazy import when no explicit `{ space }` is passed. Pin
`lib/public-cars.ts` and `lib/tap.ts` to the main doors. Keep the tap unretried and its existing
origin/body/204/403/422/503 behaviour unchanged.

**Acceptance criteria:**
- [x] Main doors are always main and never load Clerk.
- [x] Office doors resolve from the signed-in user; an explicit `{ space }` is accepted.
- [x] A page or action cannot choose a door by itself.
- [x] Every public car read, count and `getSetting` uses `storeQueryMain`.
- [x] The tap uses `storeQueryOnceMain` and remains unretried.
- [x] A demo session reading the public showroom reads main.

**Verification:**
- [x] `node --conditions=react-server --import tsx --test lib/store-guard.test.ts`
- [x] `npm run typecheck`

**Dependencies:** Tasks 1–2.

**Files likely touched:**
- `lib/store-guard.ts`
- `lib/public-cars.ts`
- `lib/tap.ts`
- `lib/store-guard.test.ts` (new)

**Estimated scope:** Medium (4 files).

---

## Task 4 — Backup, settings notices and cleanup pinned to main

**Description:** Move the daily backup, heartbeat, storage measurement and setting writes to
`storeQueryMain`. Make `readNotices` main-only; keep `readSettings` on the office space. Make
`lib/cleanup.ts`, `scripts/cleanup-readiness.ts` and `scripts/reconcile.ts` explicit main. The demo
Settings page must not call the cleanup reader or receive main's operational values.

**Acceptance criteria:**
- [x] The backup never reads or writes demo; filename, seven-file retention and encryption are
      unchanged.
- [x] `readNotices` is main-only; `readSettings` uses the office space.
- [x] `lib/cleanup.ts` and the cleanup-readiness CLI are main-only.
- [x] No script resolves a Clerk space outside a request.
- [x] Demo settings props contain no main storage, backup or asset filenames.

**Verification:**
- [x] `node --conditions=react-server --import tsx --test lib/backup-run.test.ts lib/notices.test.ts lib/cleanup-litter.test.ts`
- [x] `npm run typecheck`

**Dependencies:** Task 3.

**Files likely touched:**
- `lib/backup-run-live.ts`
- `lib/settings.ts`
- `lib/cleanup.ts`
- `scripts/cleanup-readiness.ts`
- `scripts/reconcile.ts`

**Estimated scope:** Medium (5 files).

---

## Task 5 — Import-safety and door-isolation proofs

**Description:** Add the two proofs the design requires. A test imports a main door from the
project's Node script environment under `--conditions=react-server` and proves `next/headers` and
Clerk are not pulled in. A door-level test proves a demo request cannot reach main, and a forged
cookie/header/query cannot choose main.

**Acceptance criteria:**
- [x] The import-safety test runs under `--conditions=react-server`.
- [x] Importing a main door does not load `next/headers`, `@clerk/nextjs/server` or `lib/space.ts`.
- [x] A demo request through the office door cannot reach main.
- [x] A forged cookie, header or query parameter claiming main is ignored.
- [x] An anonymous office request is refused before a store read.

**Verification:**
- [x] `node --conditions=react-server --import tsx --test lib/store-guard-import.test.ts`
- [x] `node --conditions=react-server --import tsx --test lib/space-isolation.test.ts`
- [x] `npm run typecheck`

**Dependencies:** Tasks 1–4.

**Files likely touched:**
- `lib/store-guard-import.test.ts` (new)
- `lib/space-isolation.test.ts` (new)

**Estimated scope:** Small (2 files).

---

## Task 6 — Sanity label/created-time support and the one-time snapshot tool

**Description:** Extend the Sanity helpers so an upload can carry a server-set label and the asset
listing returns label and creation time. Build `scripts/demo-snapshot.ts`: it reads main only,
refuses a missing `BACKUP_ENCRYPTION_KEY` or main URL, refuses a demo URL that names main, builds
the fixed archive, encrypts it, uploads `demo-seed.json.gz.enc` with `truespec-demo-seed`, deletes
older seed-labelled assets so exactly one remains, and prints only counts, time and asset
id/filename.

**Acceptance criteria:**
- [x] Uploads can carry a label; listings return label and `_createdAt`.
- [x] The snapshot reads main only and creates no schema or table.
- [x] Missing key or main URL refuses; a demo URL naming main refuses.
- [x] Exactly one asset carries `truespec-demo-seed` after the run.
- [x] A demo upload with the same filename is not counted or deleted.
- [x] Output contains no row, key, connection string or person.

**Verification:**
- [x] `node --conditions=react-server --import tsx --test lib/demo-snapshot.test.ts`
- [x] `npm run typecheck`

**Live check:** the first real snapshot upload and the Sanity label read are owner actions; the
tests use the injected asset door. They are not claimed as a live run.

**Dependencies:** Tasks 2–3.

**Files likely touched:**
- `lib/sanity.ts`
- `lib/demo-snapshot.ts` (new orchestration)
- `scripts/demo-snapshot.ts` (new CLI)
- `lib/demo-snapshot.test.ts` (new)
- `package.json` (`demo:snapshot` script)

**Estimated scope:** Medium (5 files).

---

## Task 7 — `restoreArchive` `preserveTables`

**Description:** Add a `preserveTables` option to `restoreArchive`. The named table is skipped by
truncate, insert and the count check. The default keeps the existing full-restore behaviour; the
manual main restore does not pass the option. The demo reset will pass `schema_migrations`.

**Acceptance criteria:**
- [x] `preserveTables` skips truncate, insert and count for the named table.
- [x] Existing calls without the option behave exactly as before.
- [x] A test proves `schema_migrations` survives while other tables are replaced.
- [x] A test proves a wrong column type still refuses before truncation.

**Verification:**
- [x] `node --import tsx --test lib/backup-restore.test.ts` (14 tests)
- [x] `npm run typecheck`

**Live check:** the demo-branch restore is owner action; the tests use an in-memory client. They are
not claimed as a live run.

**Dependencies:** None (existing backup code).

**Files likely touched:**
- `lib/backup-restore.ts`
- `lib/backup-restore.test.ts`

**Estimated scope:** Small (2 files).

---

## Task 8 — Reset target proof and direct main advisory lock

**Description:** Build the reset's pre-write checks and the main lock. The check order is: bearer
`CRON_SECRET`; `DEMO_RESET_ENABLED === "1"`; required envs; `isSameDatabase(DEMO_DATABASE_URL,
DATABASE_URL)` false; Neon API branch ID/name/non-default/host proof; exactly one seed asset; then
the main advisory lock. The lock uses `DATABASE_URL_UNPOOLED` only, is held across restore and
cleanup, and is released in `finally`. If that URL is missing or pooled, the reset refuses before
touching demo. If the lock connection drops, the run fails.

**Acceptance criteria:**
- [x] The four branch checks pass only when the demo branch ID equals `DEMO_BRANCH_ID`, the name is
      `demo`, the branch is not the default branch, and the URL host is its read-write endpoint.
- [x] The non-default and host checks are additional, not substitutes for ID/name.
- [x] Missing `DATABASE_URL_UNPOOLED` or a pooled host refuses before any demo connection.
- [x] `pg_try_advisory_lock(hashtext('truespec-demo-reset'))` is used; no main data write occurs.
- [x] A second reset refuses while the lock is held; a dropped lock connection fails the run.
- [x] Zero or more than one seed asset refuses; a demo upload with the same filename does not count.

**Verification:**
- [x] `node --conditions=react-server --import tsx --test lib/demo-reset.test.ts` (20 tests)
- [x] `npm run typecheck`

**Live check:** the Neon API proof and the real `pg` lock are owner actions; the tests inject the
API and the lock client. They are not claimed as a live run.

**Dependencies:** Tasks 2–3.

**Files likely touched:**
- `lib/demo-reset.ts` (new)
- `lib/neon-api.ts` (new)
- `lib/demo-reset.test.ts` (new)

**Estimated scope:** Medium (3 files).

---

## Task 9 — Reset route, restore orchestration, demo-asset cleanup and cron

**Description:** Add the GET-only route at `/api/demo/reset` with `force-dynamic`,
`maxDuration = 300`, guarded by `CRON_SECRET` and `DEMO_RESET_ENABLED`. It downloads the one seed,
decrypts and parses it, reads demo's column types, and restores in one transaction through
`restoreArchive` with `preserveTables: ["schema_migrations"]` on a direct `pg` connection to demo.
After commit it deletes only exact `truespec-demo` assets created before the reset started. Add the
`0 3 * * *` UTC cron. Return and log the summary; never log a secret, row or person.

**Acceptance criteria:**
- [ ] GET only, `force-dynamic`, `maxDuration = 300`, cron `0 3 * * *` UTC; backup stays `0 2 * * *`.
- [ ] The restore preserves demo's own `schema_migrations`; main's manual restore is unchanged.
- [ ] A parse, schema, count or sequence failure leaves demo unchanged.
- [ ] Cleanup is exact-label and pre-reset; no prefix, no unmarked, no seed, no backup, no main.
- [ ] A cleanup failure is reported; the data reset stands; no unmarked asset is deleted.
- [ ] A timeout is reported and never claimed as success.
- [ ] The summary names snapshot time, row counts, cleanup counts, duration and failed step.

**Verification:**
- [ ] `node --import tsx --test lib/demo-reset.test.ts`
- [ ] `npm run typecheck`
- [ ] `npm run build`

**Dependencies:** Tasks 6–8.

**Files likely touched:**
- `app/api/demo/reset/route.ts` (new)
- `lib/demo-reset.ts`
- `lib/demo-assets.ts` (new)
- `vercel.json`
- `lib/demo-reset.test.ts`

**Estimated scope:** Medium (5 files).

---

## Task 10 — `OfficeSession.space`, cross-space sign-out, tests

**Description:** `OfficeSession` gains `space`. `checkOfficeSession` resolves the space before its
first store call, reads or creates `office_user` and `session` in that branch, and keeps the lazy
upsert and 12-hour / 7-day limits. Sign-out deletes the row in the same space and still revokes the
provider session. A row in one space must not authorise the other.

**Acceptance criteria:**
- [x] `OfficeSession` carries `space`.
- [x] The session check passes its resolved space explicitly to the store door.
- [x] A main session row is created in main; a demo row in demo.
- [x] A provider session that exists only in the other space does not authorise; the selected
  space's lazy check runs.
- [x] Sign-out deletes the row in the same space and revokes the provider session.
- [x] The 12-hour / 7-day limits and lazy upsert are unchanged.

**Verification:**
- [x] `node --conditions=react-server --import tsx --test lib/session.test.ts`
- [x] `npm run typecheck`

**Dependencies:** Tasks 1–3.

**Files likely touched:**
- `lib/session-space.ts` (new pure half)
- `lib/session.ts`
- `lib/session.test.ts`
- `app/office/actions/session.ts`

**Estimated scope:** Medium (4 files).

---

## Task 11 — Persistent demo banner in the office shell

**Description:** The office shell reads the session's space. A demo session renders a persistent,
accessible banner on every page in the shell; a main session renders nothing. The banner says the
data is a demo, resets daily around 03:00 UTC, and uploads are deleted.

**Acceptance criteria:**
- [x] Every demo shell page shows the banner; the main shell shows none. (Code path in place; the
  full demo/main shell render is blocked — owner action.)
- [x] The banner is accessible and persistent, not dismissible.
- [x] The banner is not enforcement; the server-side rule remains the boundary.

**Verification:**
- [x] `npm run typecheck`
- [x] `npm run build`
- [ ] Manual render check of a demo shell page and a main shell page. (Blocked — owner action; the
  banner component's static render was checked for the exact copy and `role="note"`.)

**Dependencies:** Task 10.

**Files likely touched:**
- `app/office/(shell)/layout.tsx`
- `app/office/(shell)/demo-banner.tsx` (new; its styles live with it, following `OfflineBanner`)

**Estimated scope:** Small (2–3 files).

---

## Task 12 — Server-set demo label, verification, 15 MB and total cap

**Description:** Every upload through a demo session carries the exact label `truespec-demo`, set
server-side from `OfficeSession.space`; main uploads carry no demo mark. The upload result is
verified; a missing requested label deletes the just-uploaded asset and refuses. The total cap
`DEMO_ASSET_CAP_BYTES` (default 2 GiB) counts only demo-marked assets and refuses an over-cap or
unreadable check. The 15 MB per-file cap is unchanged.

**Acceptance criteria:**
- [x] A demo upload carries exactly `truespec-demo`; a main upload never carries it. (Code path and
  label decision tested; the live upload is blocked — owner action.)
- [x] A client cannot set or forge the label. (The label is derived from the server session's space;
  neither upload path reads a label from the request.)
- [x] A missing label deletes the asset and refuses the upload.
- [x] The cap counts only demo-marked assets; main assets do not count.
- [x] An over-cap or unreadable cap check refuses with a clear message.
- [x] The 15 MB per-file cap is unchanged.

**Verification:**
- [x] `node --import tsx --test lib/demo-assets.test.ts`
- [x] `npm run typecheck`
- [x] Full suite (501 pass) and `npm run build`.

**Dependencies:** Tasks 6, 10.

**Files likely touched:**
- `lib/demo-assets.ts`
- `app/api/upload/route.ts`
- `app/office/actions/photo.ts`
- `lib/demo-assets.test.ts` (new)

**Estimated scope:** Medium (5 files).

---

## Task 13 — Demo Settings omits System and cleanup-readiness cards

**Description:** The demo Settings page does not call `readNotices` or
`listWaitingToBeCleared`, and does not receive main's storage, backup or asset values in client
props. The System card and cleanup-readiness card are absent for demo. The rest of Settings stays
available for practice; main is unchanged.

**Acceptance criteria:**
- [x] Demo Settings omits the System card and the cleanup-readiness card. (Code path in place; the
  live demo render is blocked — owner action.)
- [x] Demo Settings does not call `readNotices` or `listWaitingToBeCleared`. (Both calls are behind
  the non-demo branch; a demo request evaluates neither.)
- [x] Demo client props contain no main storage, backup or asset filenames. (Demo passes neither
  `notices` nor `cleanup`, so the RSC payload carries no such values.)
- [x] The editable settings still work in demo. (`readSettings`, both registries and their saves stay
  space-aware; no code changed.)
- [x] Main Settings is unchanged. (Main still passes both props and renders both cards.)

**Verification:**
- [x] `npm run typecheck`
- [x] `npm run build`
- [x] Inspect the demo page source/props for main operational values. (Source inspection: the two
  readers are non-demo-only; demo props are `undefined`. Live render blocked — owner action.)
- [x] Full suite (501 pass).

**Dependencies:** Task 10.

**Files likely touched:**
- `app/office/(shell)/settings/page.tsx`
- `app/office/(shell)/settings/settings-client.tsx`

**Estimated scope:** Small (2–3 files).

---

## Task 14 — No buyer-page preview for a demo car

**Description:** Pass `isDemo` from the session space into the car form. The "Preview the buyer
page" control is absent for a demo car; the main office keeps it. The public showroom never renders
demo data.

**Acceptance criteria:**
- [x] A demo car has no buyer-page preview control. (Code path in place; the live demo render is
  blocked — owner action.)
- [x] A main car keeps the preview control. (The same hardcoded link renders when `isDemo` is false.)
- [x] The add, edit and draft car paths use the same space-aware prop. (`CarForm` requires `isDemo`;
  all three pages pass it from `requireOfficeSession()`.)
- [x] The public showroom is unaffected. (No public path changed; the showroom remains main-only.)

**Verification:**
- [x] `npm run typecheck`
- [x] `npm run build`
- [ ] Manual render check of a demo car and a main car. (Blocked — owner action; source inspection
  confirms the link is gated and the three call sites pass the session space.)
- [x] Full suite (501 pass).

**Dependencies:** Task 10.

**Files likely touched:**
- `app/office/(shell)/car/[ref]/page.tsx`
- `app/office/(shell)/car/new/page.tsx`
- `app/office/(shell)/car/car-client.tsx`
- `app/office/(shell)/drafts/car/[id]/page.tsx`

**Estimated scope:** Medium (4 files).

---

## Task 15 — Clerk sign-up page, demo link and corrected privacy notice

**Description:** Mount Clerk's own `<SignUp />` at `/office/sign-up/[[...sign-up]]` with a return to
`/office`. The page states the demo account, daily reset, uploads deleted and public showroom is
main, and links the privacy notice. `DEMO_SIGNUP_ENABLED === "1"` shows the sign-in page's
secondary demo link and allows the route; off hides the link and redirects to sign-in. Correct the
privacy notice and remove every "no accounts" / "no sign-up" claim. No credential form, no password
material, no `mailto`, no invented email address.

**Acceptance criteria:**
- [x] Clerk's `<SignUp />` is mounted with `fallbackRedirectUrl="/office"`.
- [x] The flag off hides the link and redirects the sign-up route to sign-in. (Code path; the live
  flag check is blocked — owner action.)
- [x] The sign-up page carries the four demo statements and links the privacy notice.
- [x] The privacy notice explains the optional demo account, sign-in-only email, daily reset and
  upload deletion, no marketing email, and the provider's authentication messages.
- [x] No page claims there is no sign-up path; no `mailto` or invented address appears. (Grep of
  `app/`, `components/` and `lib/` finds no such claim or address.)
- [x] The client's normal sign-in screen is otherwise unchanged. (Only the secondary demo link and
  the corrected source comment were added.)

**Verification:**
- [x] `npm run typecheck`
- [x] `npm run build`
- [x] Full suite (502 pass).
- [ ] Copy review: show the exact privacy and sign-up text to the owner; mark pending approval.
  (Exact text is in `developer-workspace/notes/DEMO-001-copy-review.md`; owner approval pending.)

**Dependencies:** Task 2 (shared exact-`"1"` check; `demoSwitchOn` now lives in `lib/config.ts` and is
used by both switches).

**Files likely touched:**
- `app/office/sign-up/[[...sign-up]]/page.tsx` (new)
- `app/office/sign-in/[[...sign-in]]/page.tsx`
- `app/(site)/privacy/page.tsx`
- `lib/config.ts` (shared flag check)
- `lib/config.test.ts` (new)
- `app/office/door.css`

**Estimated scope:** Medium (4 files).

---

## Task 16 — Cleanup card and machine-litter exclusions

**Description:** The cleanup card and machine-litter report exclude the fixed snapshot (seed label),
all `backup-` files and all demo-marked uploads. No report invites the owner to delete the snapshot
or a demo upload as litter. The main report may count the asset store, but its unreferenced list
does not include demo space assets.

**Acceptance criteria:**
- [ ] The seed label and fixed seed filename are excluded.
- [ ] All `backup-` files are excluded.
- [ ] All exact `truespec-demo` assets are excluded.
- [ ] The unreferenced list does not include demo space assets.
- [ ] The main report still counts the asset store.

**Verification:**
- [ ] `node --import tsx --test lib/cleanup-litter.test.ts`
- [ ] `npm run typecheck`

**Dependencies:** Tasks 6, 12.

**Files likely touched:**
- `lib/cleanup.ts`
- `lib/cleanup-litter.ts`
- `lib/sanity.ts`
- `app/office/(shell)/settings/settings-client.tsx`
- `scripts/cleanup-readiness.ts`

**Estimated scope:** Medium (5 files).

---

## Task 17 — Retire `demo:wipe`

**Description:** Remove the `demo:wipe` npm script and remove `scripts/demo-wipe.ts` or make it fail
closed without opening a database. No replacement `is_demo` CLI exists. The daily reset is the demo
deletion path; the owner's office delete remains the main-data path. Record the old flag's new
meaning as legacy main data.

**Acceptance criteria:**
- [ ] `demo:wipe` is gone from `package.json`.
- [ ] `scripts/demo-wipe.ts` is gone or fails closed without opening a database.
- [ ] No replacement `is_demo` CLI exists.
- [ ] The reset does not depend on `is_demo`.
- [ ] The owner's office delete still removes main data he chooses.

**Verification:**
- [ ] `grep -r "demo:wipe\|demo-wipe" package.json scripts` returns no active command.
- [ ] `npm run typecheck`

**Dependencies:** Task 9 (confirm the reset does not depend on `is_demo`).

**Files likely touched:**
- `package.json`
- `scripts/demo-wipe.ts` (delete or fail-closed stub)

**Estimated scope:** Small (2 files).

---

## Task 18 — Owner setup handover outside the repository

**Description:** Write the owner setup handover at
`/home/lordwhitefire/current-project/truespec-handover/DEMO-001-setup.md`. It names the Clerk
metadata key `truespec_space` and the exact value `"main"`, the env names and meanings, the setup
order, the direct URL requirement, the branch identity checks, the demo branch creation from
`production`, migration of demo whenever main is migrated, recovery from a lost branch, the
snapshot/first-reset order, and the verification steps. It contains no secret values. If values are
ever added, the file is mode 600.

**Acceptance criteria:**
- [ ] The file is outside the repository.
- [ ] It names `truespec_space = "main"` and every env name without a value.
- [ ] It says `DEMO_SIGNUP_ENABLED=1` / `DEMO_RESET_ENABLED=1`, not `true`.
- [ ] It says `DATABASE_URL_UNPOOLED` is required for the lock and `DEMO_DATABASE_URL` is direct.
- [ ] It says the demo branch is `demo`, created from `production`, and must be migrated with main.
- [ ] It says the first demo account must not arrive before the snapshot and first reset.
- [ ] It says Clerk's sign-up mode is the outer switch.
- [ ] No secret, key, connection string or person appears.

**Verification:**
- [ ] Read back the file; `grep` for `postgres://`, `postgresql://`, `sk_`, `whsec_`, long tokens.
- [ ] Confirm the path is outside `git status`.
- [ ] `stat -c '%a'` is 600 if any value is added.

**Dependencies:** Tasks 1–17.

**Files likely touched:**
- `/home/lordwhitefire/current-project/truespec-handover/DEMO-001-setup.md` (new, outside repo)

**Estimated scope:** Small (1 file).

---

## Task 19 — Full code-level gates and honest report

**Description:** Run every code-level gate and write
`developer-workspace/reports/DEMO-001-report.md`. Report exact commands and figures. Live-only
checks are named blocked — owner action, never passed. The report says "code complete, live
verification pending owner setup."

**Acceptance criteria:**
- [ ] `npm run typecheck` — 0.
- [ ] `npm test` — all pass.
- [ ] `npm run build` — 0.
- [ ] `npm run leak-check` — PASSED where the remote store is reachable; timeout is a blocked check.
- [ ] `npm run store-freshness` — PASSED.
- [ ] `npm run db:migrate` — main up to date; demo blocked (owner connection).
- [ ] `openspec validate --all` — passes.
- [ ] The report names exact commands and figures; no claim without a command or store reading.
- [ ] Live checks are blocked, not passed; no secret appears.

**Verification:**
- [ ] Every command above is run and its output recorded.
- [ ] The report is read back for honesty and secret leakage.

**Dependencies:** Tasks 1–18.

**Files likely touched:**
- `developer-workspace/reports/DEMO-001-report.md` (new)

**Estimated scope:** Small (1 file).

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Reset targets main or a wrong branch | High | ID/name match first; non-default + read-write host as additional checks; `isSameDatabase`; direct lock; tests. |
| Pooled main connection loses the advisory lock | High | `DATABASE_URL_UNPOOLED` only; refuse if missing or pooled; hold across restore/cleanup; drop fails. |
| Snapshot leaks later main data | High | Fixed one-time archive; exact seed label; never copy live main in reset. |
| `preserveTables` breaks main restore | Medium | Default unchanged; dedicated tests; main restore does not pass the option. |
| Import safety regresses | High | `--conditions=react-server` test; snapshot CLI witness; no top-level Clerk/next-headers in `store-guard`. |
| Sanity label API needs a patch step | Medium | Verify label after upload; delete and refuse if absent; test with mocked assets. |
| Clerk `<SignUp />` API mismatch | Medium | Load the current Clerk skill/docs before writing; use the documented component and redirect prop. |
| Vercel Hobby timeout | Medium | `maxDuration = 300`; report timeout as failure, never success. |
| Build requires demo secrets | Medium | Lazy config; demo URL optional for main-only build; tests use fakes. |
| Live gates unavailable | High | Report blocked — owner action; never claim passed. |
| Privacy copy overclaims | Low | Draft only from the spec's list; show exact text; owner approval gate. |

## Open questions

None. The owner has ruled on the code boundary, artifacts, order, connections, switches, branch
identity and copy approval. Two owner gates remain outside this build: approval of the exact
privacy/sign-up text, and the live setup (branch, snapshot, first reset, TASK-007 independent test).

## Stop conditions

- A genuine gap the spec/design do not cover: stop and ask; do not invent a rule.
- A live-only check cannot be run: report it blocked; do not claim it passed.
- A main write would be needed: stop; the demo path must never write main.
- A secret would enter the repository, a log or a report: stop and redact.
- The build cannot keep the system working: stop and report; do not paper over it.

## Definition of done for this build

Code-level: every task's acceptance criteria met, focused tests and full gates pass, the report is
honest. Live-level: **not done** until the owner creates the demo branch, migrates it, takes the
snapshot, runs the first reset and confirms the setup. The report will say so.
