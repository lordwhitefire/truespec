# Demo mode — implementation plan (tasks)

**Form:** these are plans for the Builder, not instructions. Each entry states what must be true,
what must not happen, and the process to follow. Where a choice belongs to the Builder, the
constraint is named instead of the choice being made. Completion is judged against this change's
specs and design, not against whether a verb was obeyed.

**Fixed inputs from the owner (2026-10-25):** one site, one URL, one Vercel deployment, one Clerk
application, one Neon project. Self sign-ups see demo; invited users see main. Demo resets daily.
Main is never touched. Demo is not a second public showroom. The demo's data is a fixed snapshot of
main's generated data, not a live copy. No permission/role system. No schema change. No email
channel.

## 1. Space rule and store doors

- [ ] 1.1 A single server-side space rule must exist: a signed-in Clerk user is main only when
  `publicMetadata.truespec_space` is exactly `"main"`; every other signed-in user is demo; a
  missing, malformed or unreadable value is demo. The pure rule must be testable without Clerk.
  Constraints: no role table, no permission table, no email allow-list, no cookie/header/query/form
  value may choose main; the app never writes Clerk metadata.
- [ ] 1.2 The resolver must read the authoritative Clerk user and be cached per request, not across
  requests. A provider failure must never fall back to main. With no signed-in user it must throw,
  never return main; public reads use the main doors and do not call it. The design's
  `currentUser()` choice and its one-call cost must be recorded in the change log if the Builder
  chooses another verified source.
- [ ] 1.3 `lib/db.ts` must provide a main client and a demo client from `DATABASE_URL` and
  `DEMO_DATABASE_URL`. A missing/invalid demo URL must raise a configuration error, never return the
  main client. Existing scripts that used the single client must be explicitly main.
- [ ] 1.4 `lib/store-guard.ts` must expose a session-resolved office door and explicit main-only
  doors for public reads, the tap and the backup. The session check must pass its resolved space
  explicitly; a page or action must not choose a door by itself. `storeQueryOnce` for the tap must
  become main-only and remain unretried. The module must remain importable by a plain Node script:
  no `next/headers`, `@clerk/nextjs/server` or `lib/space` import at the top level. The office door's
  request-only resolution must be lazy; a main door must never load Clerk. A test must import a main
  door from the project's Node script environment (`--conditions=react-server`) and prove the
  request layer is not pulled in.
- [ ] 1.5 Unit tests must cover the pure space rule (exact main, missing, wrong type, demo,
  anonymous-public), the resolver's refusal for no signed-in user, the missing-demo configuration
  error, and the main-only doors. A test that a demo request cannot reach main must exist at the
  door level.

## 2. Pin the public side and the backup to main

- [ ] 2.1 Every public showroom read, count and setting read must use the main door. This includes
  the site layout, home, inventory, car page and privacy page; `getSetting` must read main even when
  the visitor holds a demo session.
- [ ] 2.2 The buyer tap must write to main through the main-only, unretried door. The existing
  origin, body, 204/403/422/503 behaviour and the `/api/tap` WAF rule must not change.
- [ ] 2.3 The daily backup, its heartbeat, storage measurement and setting writes must use main.
  The backup must never read or write demo. The existing backup filename, seven-file retention and
  `BACKUP_ENCRYPTION_KEY` behaviour must not change.
- [ ] 2.4 Scripts and CLIs that read the store must be explicit about main; a script must not resolve
  a Clerk space outside a request. The cleanup-readiness CLI and `lib/cleanup.ts` must be main-only;
  the demo settings page must not call the cleanup reader, because the asset store is global and the
  report would name main assets the demo does not reference. The operational notices
  (`last_backup_at`, storage/database figures) must be read from main and only sent to a main
  settings page; a demo session must not receive them in its client props.
- [ ] 2.5 A verification must show a demo session (or a forged demo/main cookie/header) does not
  change the showroom's cars, settings or taps and does not enter the backup.

## 3. Office session carries the space

- [ ] 3.1 `OfficeSession` must carry the resolved space. `checkOfficeSession` must resolve the space
  before its first store call, read/create the `office_user` and `session` rows in that branch, and
  keep the lazy upsert and the 12-hour / 7-day limits.
- [ ] 3.2 Sign-out must delete the session row in the same space and still revoke the provider
  session. A row in one space must not authorise a request in the other.
- [ ] 3.3 The office shell must render the demo notice from the session space; the main shell must
  not. The notice must be visible on every page in the shell, not only the dashboard.
- [ ] 3.4 Every office route handler that uploads or reads files must pass the session space to the
  asset layer, so a demo upload cannot be marked as main and a main upload cannot be marked demo.
- [ ] 3.5 Tests must cover a main session row in main, a demo session row in demo, a provider session
  that exists only in the other space, and sign-out in each space.

## 4. Accounts, sign-up and the main grant

- [ ] 4.1 The office must mount Clerk's own sign-up at a demo sign-up path, with a return to
  `/office`. The application must build no credential form and store no password material. The page
  must state: demo account, daily reset, uploads deleted, public showroom is main.
- [ ] 4.2 `DEMO_SIGNUP_ENABLED` must hide the sign-in page's demo link and refuse the sign-up route
  when off. The provider's own sign-up mode must be documented as the outer switch; the app flag is
  not a substitute for it.
- [ ] 4.3 Main must remain invitation-only by provider metadata. The owner's user and the client's
  invitation must carry `truespec_space = "main"`. The client's invitation → provider → office path
  must remain the path already verified. If the client's account already exists, the grant must be
  on the user.
- [ ] 4.4 No role/permission screen, table or allow-list may be introduced. The activity log must
  still name the actor. The demo default must be fail-safe: an account without the exact main grant
  is demo.
- [ ] 4.5 The sign-in page must keep the client's normal provider sign-in unchanged; only the
  secondary demo link is added. Existing lockout, rate limits and enumeration protection must stay.
- [ ] 4.6 The owner-facing handover must name the Clerk steps and the exact metadata key, without
  putting any secret value in the repository.

## 5. Demo branch and the one snapshot

- [ ] 5.1 The demo space must be a separate branch in the same Neon project, with its own endpoint
  and connection string. It must be named `demo`; its branch id and project id must be recorded in
  the deployment settings. It must be migrated to the current schema. It is created once, while main
  holds the generated content; it must not be recreated from live main later, because that would
  copy whatever main holds then. Recovery from a lost branch is an empty branch with the same
  schema plus a reset from the fixed snapshot. No second Neon project and no second Vercel project.
- [ ] 5.2 A one-time snapshot of main's database must be produced as the existing fixed-table,
  fixed-sequence archive, encrypted with `BACKUP_ENCRYPTION_KEY`, and stored as
  `demo-seed.json.gz.enc` with the system label `truespec-demo-seed`. The reset must identify it by
  that label, not by a filename a demo user could reuse. The demo upload label is different. The
  snapshot tool must read main only and must refuse a missing key or a missing main URL. It must not
  create a schema, a seed table or a new database table.
- [ ] 5.3 The snapshot must be taken after main's demo content is final and before the first demo
  account uses the space. It must not be a daily job and must not be re-taken by the reset. The
  owner's deliberate re-snapshot action must be documented; a later real main record must not leak
  into demo by accident.
- [ ] 5.4 The snapshot file must be recognised as a system file by its seed label and fixed name:
  excluded from the cleanup card, outside the `backup-` retention pattern, and never selected by the
  demo upload cleanup. Old seed-labelled assets must be removed by the snapshot tool so the reset
  can require exactly one; a demo upload with the same filename must not be counted or deleted.
- [ ] 5.5 The snapshot tool must print only counts, the generated time and the asset id/filename;
  it must never print row contents, the key, a connection string or a person.

## 6. Daily reset and its guards

- [ ] 6.1 A GET-only reset route must exist at `/api/demo/reset`, guarded by `CRON_SECRET` and
  `DEMO_RESET_ENABLED`. It must be scheduled in `vercel.json` at `0 3 * * *` UTC. The design must
  state Vercel Hobby's ±59-minute start window and the 100-cron allowance; no second deployment.
- [ ] 6.2 Before any write, the reset must prove the target: demo URL present; not the same database
  as main (pooled/direct normalised); the configured project/branch id is the demo branch; the
  branch name is `demo` and not main; and the URL's host is the read-write endpoint of that same
  branch. A missing Neon API key, project/branch id, an unreachable Neon API, or an unreadable
  endpoint list must refuse. The URL host alone is not enough, and the branch id alone is not enough
  if the URL could name another project. A read-only replica must also refuse.
- [ ] 6.3 The reset must hold an advisory lock in main, not in demo, for the whole restore and
  cleanup. A second reset must refuse while the lock is held. The main connection is for the lock
  only; it must not write main data.
- [ ] 6.4 The reset must find exactly one asset carrying the seed label (zero or more than one
  refuses; a demo upload with the same filename does not count), download it, verify its GCM tag,
  parse it with the fixed table/sequence check, read demo's column types, and restore in one
  transaction through the existing `restoreArchive`. A parse, schema, count or sequence failure must
  leave demo unchanged.
  The demo restore must preserve the demo branch's own `schema_migrations` rows; the snapshot's
  older history must not overwrite them and cause migrations to be replayed. The manual main restore
  must keep its existing full-restore behaviour. The route's `maxDuration` must fit the Hobby
  ceiling; a timeout must be reported and must not claim success.
- [ ] 6.5 The reset must return/log a summary: snapshot time, row counts before/after, asset cleanup
  counts, duration, and failed step. It must never log a key, connection string, row or person.
- [ ] 6.6 A failure must leave main untouched and demo as it was. A partial asset cleanup after a
  successful data restore must be reported as a cleanup failure, not hidden and not compensated by
  deleting unmarked assets.

## 7. Demo uploads and the cap

- [ ] 7.1 Every upload made through a demo session must carry the Sanity demo mark
  (`truespec-demo`) set server-side from the session space. Main uploads must carry no demo mark.
  The mark must not contain a name, email, phone or filename. The upload result must be verified:
  if the requested mark is absent, the just-uploaded asset must be deleted and the upload refused;
  an unmarked demo upload must not be left to survive the reset.
- [ ] 7.2 After a successful data restore, the cleanup must delete only assets whose label is
  **exactly** `truespec-demo` and whose creation time is before the reset started. A prefix match
  would catch `truespec-demo-seed` and is forbidden. It must never delete by "unreferenced"
  inference, never delete an unmarked asset, and never delete the snapshot, a daily backup or a
  main/seeded asset.
- [ ] 7.3 The cleanup must report assets it cannot classify or delete. A failed cleanup must not
  roll back the data reset; the next run may clear the remainder.
- [ ] 7.4 A demo total-asset cap must exist in addition to the 15 MB per-file cap
  (`DEMO_ASSET_CAP_BYTES`, default 2 GiB). It must count only demo-marked assets. A demo upload that
  would exceed it, or whose cap check cannot be read, must be refused with a clear message; main
  uploads must not count. The cap is not a role or permission.
- [ ] 7.5 A demo user must not be able to set or forge the demo mark; a main user must not be able
  to upload an asset that the demo cleanup will delete.

## 8. Demo UI, preview and privacy

- [ ] 8.1 The demo office must show a persistent, accessible notice that the data is a demo and
  resets daily (around 03:00 UTC), and that uploads are deleted. The main office must not show it.
- [ ] 8.2 The "Preview the buyer page" control must be absent for a demo car. The main office must
  keep it. The public showroom must never render demo data; the demo is not a second shopfront. The
  demo Settings must omit the System card (main's storage/backup notices carried in the snapshot)
  and the cleanup-readiness card (a global asset-store report that would name main assets); the
  rest of Settings remains available for practice.
- [ ] 8.3 The privacy notice must stop saying the site has no accounts while demo sign-up is
  offered. It must explain the optional demo account, the email used for sign-in only, the daily
  reset of demo data/uploads, the absence of marketing email, and that the application has no email
  channel of its own while the identity provider may send authentication messages. The sign-up page
  must link to it.
- [ ] 8.4 The sign-in page's "invite-only / no sign-up" comments and copy must be corrected; no page
  may still claim there is no sign-up path. The client's normal sign-in screen must otherwise stay
  unchanged.
- [ ] 8.5 The demo notice must not be the only enforcement; a hidden notice must not grant main or
  demo. The server-side space rule remains the boundary.

## 9. Legacy data and tools

- [ ] 9.1 The old `scripts/demo-wipe.ts` must not remain able to delete main's `is_demo` showroom
  rows. It must be retired: remove the npm script and remove the source or make it fail closed
  without opening a database. There is no replacement `is_demo` CLI; the daily reset is the demo
  deletion path, and the owner's office delete remains the main-data path. An unguarded manual demo
  reset must not exist.
- [ ] 9.2 No new behaviour may depend on `is_demo`. The reset must replace the whole demo branch,
  including rows without the flag. The old flag's new meaning (legacy main data) must be recorded.
- [ ] 9.3 `scripts/seed.ts` must remain a main seeding tool, not the demo reset. The demo reset must
  use the fixed snapshot. Running the seed against main must keep its existing meaning and must not
  be presented as a demo refresh.
- [ ] 9.4 The cleanup card and machine-litter report must exclude the fixed snapshot (seed label),
  all `backup-` files and all demo-marked uploads; no report may invite the owner to delete the
  snapshot or a demo upload as litter. The main report may count the asset store, but its
  "unreferenced" list must not include demo space assets.

## 10. Configuration, owner actions and handover

- [ ] 10.1 The new configuration names and their meanings must be documented: `DEMO_DATABASE_URL`,
  `DEMO_SIGNUP_ENABLED`, `DEMO_RESET_ENABLED`, `NEON_PROJECT_ID`, `DEMO_BRANCH_ID`,
  `DEMO_ASSET_CAP_BYTES`, plus the existing `NEON_API_KEY`, `BACKUP_ENCRYPTION_KEY` and
  `CRON_SECRET`. No value may enter the repository, a log, a report or a commit.
- [ ] 10.2 The owner's setup must be recorded outside the repository, in an order that keeps
  sign-up closed until the demo is ready: owner/client metadata, demo branch creation/migration,
  Vercel env, the one-time snapshot, the first reset, then open Clerk sign-up and enable the app
  link, then the cron and redeploy. The handover must say the sign-up mode is the outer switch and
  `DEMO_SIGNUP_ENABLED` is only the app-level switch, and that the first demo account must not
  arrive before the snapshot/reset.
- [ ] 10.3 The deployment must not add a second Vercel project, a second Clerk application or a
  second Neon project. The existing `/api/tap` WAF rule and `/api/cron/daily` backup schedule must
  remain.
- [ ] 10.4 The demo branch must be migrated whenever main is migrated; the reset's column check is
  the backstop. The handover must name this operational step.

## 11. Verification

- [ ] 11.1 The independent verifier must prove isolation in both directions: a demo write does not
  change main; a main write does not change demo; a public request with a demo session reads main;
  the backup reads main; a forged main choice is not honoured.
- [ ] 11.2 The verifier must prove the reset: the demo's data rows match the fixed snapshot; the
  demo branch's own migration history is preserved; accounts survive; demo rows that are not in the
  snapshot disappear; a snapshot taken before a main change does not pick up the change; main's
  counts/checksum before and after are unchanged; a failed reset leaves demo unchanged; overlapping
  resets are refused; wrong URL/branch/API failures refuse.
- [ ] 11.3 The verifier must prove asset handling: a demo photo/PDF is deleted after reset; a main
  photo/PDF is untouched; the snapshot and backup are untouched; an unmarked asset is not deleted;
  the demo cap refuses an over-cap upload; main does not count.
- [ ] 11.4 The verifier must walk the account paths: owner main/no banner; client invitation main;
  self sign-up demo/banner; demo sign-up flag off; demo reset flag off; sign-out in each space; a
  demo account signing in after a reset.
- [ ] 11.5 The verifier must walk the public site with a demo session and confirm no demo car, price,
  photo, setting or tap appears, and the buyer-page preview is absent in demo.
- [ ] 11.6 The verifier must confirm the privacy notice and sign-up page tell the truth, no page
  claims "no sign-up", and no secret or key is in the repository, a log or a report.
- [ ] 11.7 The Builder's normal gates must pass: typecheck, the full test suite, store-freshness,
  the leak check where reachable, and `openspec validate --all`. A remote Neon/Sanity limit must be
  reported as a blocked check, not claimed as passed.
