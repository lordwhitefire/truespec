# DEMO-001 — demo mode

**Capability:** a second data space on the same site. **Status:** built and closed on the owner's
word on 2026-10-26; owner setup and the live session/isolation checks are recorded in the build
report, not all passed. **Testing:** `testing.md`, a separate session that did not build it; the
independent pass was not run and is deferred to the final test at TASK-007 (owner ruling,
2026-10-13; owner deferred runtime testing until all building is done, 2026-10-26).

**This is a plan, not a set of commands.** It states what must be true, the constraints, and the
benchmarks that decide it. The Builder chooses the code and the order of work. The change's
`design.md`, `specs/` and `tasks.md` carry the settled detail; where this file is silent, they
decide. A genuine gap is a question for the owner, not a new rule.

## What this task is

The same site gets two rooms behind one door:

- **Main** is today's office: the owner's inventory, enquiries, drafts, settings and activity. It is
  what the public showroom reads.
- **Demo** is a practice copy for people who sign themselves up. It has its own database branch, its
  own generated sample data, and its own uploads. It resets every day from a fixed snapshot of main
  taken once, before the first demo account exists.

The public showroom is always main. A demo account never becomes a second shopfront: it gets the
office, not the showroom, and it does not get the buyer-page preview. Main is never written,
truncated or restored by the demo path. Demo accounts survive a reset; their local office records do
not, because the whole demo branch is replaced.

One Vercel deployment, one public URL, one Clerk application, one Neon project. The demo is a
separate Neon branch in that project, not a second project. There is no role system, no permission
table and no email allow-list. The activity log still names the actor.

## What is already true — do not rebuild it

- The showroom, office, sessions, drafts, uploads, export, settings, activity log, enquiry delete,
  daily backup, encrypted archive, restore code and cleanup report are built.
- `lib/db.ts` has one store client; `lib/store-guard.ts` is the shared door; `lib/session.ts` owns
  the office session; `lib/sanity.ts` uploads and deletes assets with the existing `SANITY_TOKEN`.
- TASK-006 built the daily backup: AES-256-GCM with `BACKUP_ENCRYPTION_KEY`, the fixed table and
  sequence archive, seven-file retention, and `restoreArchive`. The demo snapshot uses the same
  archive and key; it is not a new encryption scheme.
- `scripts/seed.ts` remains the main seeding tool.
- The legacy `is_demo` columns describe main's generated sample rows. They are **main data** now and
  are not the demo boundary. `scripts/demo-wipe.ts` still defaults to main and deletes `is_demo`
  rows; it is dangerous and must go.
- At planning time there was no demo branch, seed asset, `lib/space.ts`, demo sign-up page or reset
  route. The 2026-10-26 build report now records them as built: the demo branch and 26/26
  migrations, the fixed encrypted snapshot, the first reset, the sign-up page, the space resolver
  and the reset route. What remains is the owner setup and the live session/isolation checks listed
  in that report — not unbuilt code.
- The schema does not change. The existing tables serve both branches.

## The rule that shapes every part

- **The only main grant** is `publicMetadata.truespec_space` exactly equal to `"main"` on the
  signed-in Clerk user. Every other signed-in account is demo. A missing, malformed or unreadable
  value is demo. No cookie, header, query parameter, form field, local-storage value or
  client-supplied metadata may choose main.
- **No role surface:** no role table, permission table, email allow-list or role-editing screen. The
  app never writes Clerk metadata.
- **Anonymous office requests are refused** before a store read. The resolver throws; it never
  returns main. Public pages do not call the resolver; they use the main doors.
- **The demo URL is not optional for a demo account.** If `DEMO_DATABASE_URL` is missing or invalid,
  a non-main account gets a configuration error; there is no fallback to main.
- **The fixed snapshot is the privacy boundary.** It is taken once, before the first demo account
  uses the space. The daily reset does not copy live main. Later real main data cannot leak into
  demo unless the owner deliberately takes a new snapshot.
- **Main is never touched.** The reset writes only the demo branch. The only main connection in the
  reset is an advisory lock, not a data write. The backup reads main only. The public showroom, taps,
  settings and seed/reconcile tools read main only.
- **The system never deletes main or client data on its own.** The demo reset deletes only demo data
  and exact demo-marked uploads. The owner's ordinary office delete remains the way he deletes main
  data.
- **Secrets stay out of the repository.** Values live in Vercel or `.env.local`; the handover lives
  outside the repo. No key, secret or connection string appears in a log, report or commit.

## The work

The change's `tasks.md` carries the step-by-step plan. This section states the guarantees the build
must meet.

### A. The space resolver and the store doors

- `lib/space.ts` holds the one rule: `spaceFromMetadata(metadata: unknown)` returns `"main"` only
  for the exact string `"main"`, and `"demo"` for everything else. It is a pure function and is
  testable without Clerk.
- `resolveSpace()` reads the authoritative Clerk user, applies the rule, and is cached per request
  with React `cache()`. It is not cached across requests, so a metadata change is seen on the next
  request. With no signed-in user it throws; it never returns main. A Clerk backend failure never
  falls back to main.
- `lib/db.ts` provides `mainDb()` from `DATABASE_URL` and `demoDb()` from `DEMO_DATABASE_URL`.
  `demoDb()` throws a configuration error when the demo URL is missing or invalid. No caller gets
  the main client as a fallback. Existing scripts that used the single client are explicitly main.
- `lib/store-guard.ts` exposes an office door resolved from the signed-in user's space, and explicit
  main-only doors for the public showroom, the buyer tap and the backup. A page or action does not
  choose a door by itself. `storeQueryOnce` for the tap becomes main-only and stays unretried.
- **CLI import safety is a hard constraint.** The snapshot and other command-line tools run outside
  a Next request and import the main doors. `lib/store-guard.ts` must not import `next/headers`,
  `@clerk/nextjs/server` or `lib/space.ts` at the top level. The office door's request-only
  resolution is lazy; the main doors never load Clerk. A test imports a main door from the project's
  Node script environment (`--conditions=react-server`) and proves the request layer is not pulled
  in. The snapshot script is the practical witness.
- The session check passes its resolved space explicitly to the store door. That avoids a second
  resolver call and keeps the script-imported module free of the request layer.
- Unit tests cover the pure rule (exact main, missing, wrong type, demo), the resolver's refusal for
  no signed-in user, the missing-demo configuration error, and the main-only doors. A test at the
  door level proves a demo request cannot reach main.

### B. Pin the public side and the backup to main

- Every public showroom read, count and setting read uses the main door: the site layout, home,
  inventory, car page, privacy page, and `getSetting` even when the visitor holds a demo session.
- The buyer tap writes to main through the main-only, unretried door. The existing origin, body,
  204/403/422/503 behaviour and the `/api/tap` WAF rule (30 requests per minute per IP, action 429)
  do not change.
- The daily backup, its heartbeat, storage measurement and setting writes use main. The backup never
  reads or writes demo. The filename, seven-file retention and `BACKUP_ENCRYPTION_KEY` behaviour do
  not change.
- Scripts and CLIs that read the store are explicit about main; no script resolves a Clerk space
  outside a request. `lib/cleanup.ts` and `scripts/cleanup-readiness.ts` are main-only. The demo
  settings page does not call the cleanup reader: the asset store is global, and the report would
  name main assets the demo does not reference.
- The operational notices (`last_backup_at`, storage and database figures) are read from main and
  sent only to a main settings page. A demo session must not receive them in its client props. The
  demo Settings omits the System card and the cleanup-readiness card; the rest of Settings remains
  available for practice.
- A verification shows that a demo session, or a forged demo/main cookie or header, does not change
  the showroom's cars, settings or taps and does not enter the backup.

### C. The office session carries the space

- `OfficeSession` gains `space`. `checkOfficeSession` resolves the space before its first store call,
  reads or creates the `office_user` and `session` rows in that branch, and keeps the lazy upsert and
  the 12-hour / 7-day limits.
- Sign-out deletes the session row in the same space and still revokes the provider session. A row
  in one space must not authorise a request in the other.
- The office shell renders the demo notice from the session's space; the main shell renders none.
  The notice is visible on every page in the shell, not only the dashboard.
- Every office route handler that uploads or reads files passes the session space to the asset
  layer, so a demo upload cannot be marked as main and a main upload cannot be marked demo.
- Tests cover a main session row in main, a demo session row in demo, a provider session that exists
  only in the other space, and sign-out in each space.

### D. Accounts, sign-up and the main grant

- The office mounts Clerk's own sign-up at `/office/sign-up/[[...sign-up]]` with a return to
  `/office`. The application builds no credential form and stores no password material. The page
  states, in plain words: this is a demo account; its data resets daily; uploads are deleted with
  the demo; the public showroom shows main, not the demo inventory. It links to the privacy notice.
- `DEMO_SIGNUP_ENABLED` hides the sign-in page's demo link and refuses the sign-up route when off.
  Clerk's own sign-up mode is the outer switch; the app flag is not a substitute for it. The
  handover says so.
- Main remains invitation-only by provider metadata. The owner's user and the client's invitation
  carry `publicMetadata.truespec_space = "main"`. The client's invitation → provider → office path
  stays the path already verified. If the client's account already exists, the grant is on the user.
- No role, permission screen, table or allow-list is introduced. The activity log still names the
  actor. The demo default is fail-safe: an account without the exact main grant is demo.
- The sign-in page keeps the client's normal provider sign-in unchanged; only the secondary demo
  link is added when the flag is on. Existing lockout, rate limits and enumeration protection stay.
- The owner-facing handover names the Clerk steps and the exact metadata key, without putting a
  secret value in the repository.

### E. The demo branch and the one fixed snapshot

- The demo space is a separate branch in the same Neon project, created as a child of main, with its
  own endpoint and connection string. It is named `demo`; its branch id and project id are recorded
  in the deployment settings. It is migrated to the current schema.
- The branch is created once, while main holds the generated content. It is never recreated from
  live main later: recreating it would copy whatever main holds then, including future real client
  data, and defeat the fixed snapshot. Recovery from a lost branch is an empty branch with the same
  schema plus a reset from the fixed snapshot. No second Neon project and no second Vercel project.
- A one-time snapshot of main's database is produced as the existing fixed-table, fixed-sequence
  archive, encrypted with `BACKUP_ENCRYPTION_KEY`, and stored as `demo-seed.json.gz.enc` with the
  system label `truespec-demo-seed`. The reset identifies it by that label, not by a filename a demo
  user could reuse. The demo upload label is different.
- The snapshot tool reads main only. It refuses a missing key or a missing main URL. It does not
  create a schema, a seed table or a new database table. It deletes older assets carrying the seed
  label so the reset finds exactly one. It prints only counts, the generated time and the asset
  id/filename; never row contents, the key, a connection string or a person.
- The snapshot is taken after main's demo content is final and before the first demo account uses
  the space. It is not a daily job and is not re-taken by the reset. Refreshing it is a deliberate
  owner action. A later real main record must not leak into demo by accident.
- The snapshot file is a system file: recognised by its seed label and fixed name, excluded from the
  cleanup card, outside the `backup-` retention pattern, and never selected by the demo upload
  cleanup. A demo upload with the same filename carries the demo upload label; it is not counted as
  the seed and is not deleted as the seed.

### F. The daily reset and its guards

- A GET-only reset route exists at `/api/demo/reset`, `force-dynamic`, `maxDuration = 300`, guarded
  by `CRON_SECRET` and `DEMO_RESET_ENABLED`, and scheduled in `vercel.json` at `0 3 * * *` UTC. The
  existing backup stays at `0 2 * * *`. Vercel Hobby may start a cron within ±59 minutes; the banner
  says daily rather than promising the exact minute. One deployment, one cron list.
- Before any write, the reset proves the target: demo URL present; not the same database as main
  (pooled and direct hosts normalised); the configured project and branch ids are the demo branch;
  the branch name is `demo` and not main; the URL's host is the read-write endpoint of that same
  branch. A missing Neon API key, project/branch id, an unreachable Neon API, or an unreadable
  endpoint list refuses. The URL host alone is not enough, and the branch id alone is not enough if
  the URL could name another project. A read-only replica refuses.
- The reset holds an advisory lock in main, not in demo, for the whole restore and cleanup. The main
  connection is direct (`pg`, unpooled), uses
  `pg_try_advisory_lock(hashtext('truespec-demo-reset'))`, and is released in `finally`. It is for
  the lock only and writes no main data. A second reset refuses while the lock is held. If main is
  unreachable, the reset refuses.
- The restore finds exactly one asset carrying the seed label. Zero or more than one refuses; a demo
  upload with the same filename does not count. It downloads the asset, verifies the GCM tag, parses
  the fixed table/sequence archive, reads demo's column types, and restores in one transaction
  through `restoreArchive`, using a direct `pg` connection to demo.
- The demo restore preserves the demo branch's own `schema_migrations` rows. `restoreArchive` gains
  a `preserveTables` option, skipped by truncate, insert and the count check for that table; the
  demo reset passes `schema_migrations`; the manual main restore keeps its existing full-restore
  behaviour. The demo branch is still migrated normally.
- A parse, schema, count or sequence failure leaves demo unchanged. A restore transaction failure
  rolls back. A timeout is reported and never claimed as success. A failure leaves main untouched
  and demo as it was.
- After a successful data restore, clean demo uploads. A cleanup failure is reported as a cleanup
  failure, not hidden and not compensated by deleting unmarked assets. The data reset stands.
- Return and log a summary: snapshot time, row counts before and after, asset cleanup counts,
  duration, and the failed step. Never log a key, connection string, row or person.
- What survives: the Clerk account survives; the reset does not call Clerk's user API. The local
  `office_user` and `session` rows are in demo and are replaced by the snapshot. A demo user's next
  office request lazily recreates them in demo. The snapshot's `office_user`/`session` rows are not a
  way into main: the Clerk session id and the branch are different, and a demo request never checks
  main.

### G. Demo uploads and the cap

- Every upload made through a demo session carries the exact Sanity demo mark `truespec-demo`, set
  server-side from the session space. Main uploads carry no demo mark. The mark contains no name,
  email, phone or filename.
- The upload result is verified. If the requested mark is absent, the just-uploaded asset is deleted
  and the upload is refused. An unmarked demo upload must not survive the reset.
- After a successful data restore, cleanup deletes only assets whose label is **exactly**
  `truespec-demo` and whose creation time is before the reset started. A prefix match would catch
  `truespec-demo-seed` and is forbidden. It never deletes by "unreferenced" inference, never deletes
  an unmarked asset, and never deletes the snapshot, a daily backup or a main/seeded asset.
- The cleanup reports assets it cannot classify or delete. A failed cleanup does not roll back the
  data reset; the next run may clear the remainder.
- A demo total-asset cap exists in addition to the 15 MB per-file cap: `DEMO_ASSET_CAP_BYTES`,
  default 2 GiB. It counts only demo-marked assets. A demo upload that would exceed it, or whose cap
  check cannot be read, is refused with a clear message. Main uploads do not count. The cap is an
  operational limit, not a role or permission; it is global, not per account.
- A demo user cannot set or forge the demo mark. A main user cannot upload an asset that the demo
  cleanup will delete.

### H. The demo UI, the preview and the privacy notice

- Every page inside the demo office shows a persistent, accessible notice that the data is a demo
  and resets daily (around 03:00 UTC), and that uploads are deleted. The main office shows none. The
  notice is not enforcement; the server-side space rule remains the boundary.
- The "Preview the buyer page" control is absent for a demo car. The main office keeps it. The
  public showroom never renders demo data; the demo is not a second shopfront.
- The demo Settings omits the System card (main's storage and backup notices carried in the
  snapshot) and the cleanup-readiness card (a global asset-store report that would name main
  assets). The rest of Settings remains available for practice. The demo page does not call
  `readNotices` or `lib/cleanup.ts`, and must not receive main's operational values in client props.
- The privacy notice stops saying the site has no accounts while demo sign-up is offered. It
  distinguishes a showroom visitor from a person who chooses a demo account. It says the email is
  used for sign-in only, that demo data and uploads reset daily, that there is no marketing email,
  and that the application has no email channel of its own while the identity provider may send
  authentication messages as part of the sign-up the person chose. The sign-up page links to it.
- The sign-in page's "invite-only / no sign-up" comments and copy are corrected; no page may still
  claim there is no sign-up path. The client's normal sign-in screen otherwise stays unchanged.

### I. Legacy data and tools

- The old `scripts/demo-wipe.ts` must not remain able to delete main's `is_demo` showroom rows. It
  is retired: the npm script is removed and the source is removed or fails closed without opening a
  database. There is no replacement `is_demo` CLI. The daily reset is the demo deletion path; the
  owner's office delete remains the main-data path. An unguarded manual demo reset does not exist.
- No new behaviour depends on `is_demo`. The reset replaces the whole demo branch, including rows
  without the flag. The old flag's new meaning (legacy main data) is recorded.
- `scripts/seed.ts` remains a main seeding tool, not the demo reset. The demo reset uses the fixed
  snapshot. Running the seed against main keeps its existing meaning and is not presented as a demo
  refresh.
- The cleanup card and machine-litter report exclude the fixed snapshot (seed label), all `backup-`
  files and all demo-marked uploads. No report may invite the owner to delete the snapshot or a demo
  upload as litter. The main report may count the asset store, but its "unreferenced" list does not
  include demo space assets.

### J. Configuration, owner setup and handover

The new configuration names and meanings are documented: `DEMO_DATABASE_URL`,
`DEMO_SIGNUP_ENABLED`, `DEMO_RESET_ENABLED`, `NEON_PROJECT_ID`, `DEMO_BRANCH_ID`,
`DEMO_ASSET_CAP_BYTES`, plus the existing `NEON_API_KEY`, `BACKUP_ENCRYPTION_KEY` and
`CRON_SECRET`. No value enters the repository, a log, a report or a commit. `NEON_API_KEY` already
exists in the secrets environment and in Vercel; no new key is needed. `BACKUP_ENCRYPTION_KEY` is
the existing TASK-006 key. The Architect creates no key file.

The owner's setup is recorded outside the repository, in an order that keeps sign-up closed until
the demo is ready:

1. Set `publicMetadata.truespec_space = "main"` on the owner's Clerk user.
2. Ensure the client's invitation carries the same metadata, or set it on the client's user if the
   invitation was already accepted. The sign-in path stays invitation → provider → office.
3. Create the demo branch in the same Neon project, migrate it, and put its connection string and
   ids in Vercel. Start with `DEMO_SIGNUP_ENABLED` off.
4. Put `NEON_API_KEY`, `BACKUP_ENCRYPTION_KEY`, `CRON_SECRET` and the demo values in Vercel; keep
   them in `.env.local` for local runs. No value goes into the repository.
5. Run the one-time snapshot against main after main's demo content is final.
6. Deploy the demo code with sign-up still off; run the first reset (the route with
   `DEMO_RESET_ENABLED` on and the bearer secret) and verify the demo branch holds the snapshot.
7. Open Clerk sign-up; keep the existing lockout and enumeration protections. Then turn
   `DEMO_SIGNUP_ENABLED` on and redeploy.
8. Add the `/api/demo/reset` cron at `0 3 * * *` UTC and redeploy.
9. Verify: owner main/no banner; client invitation main; self sign-up demo/banner; a demo edit does
   not appear on the showroom; a main marker survives a reset; a demo upload disappears, a main
   upload does not.

The handover says the provider's sign-up mode is the outer switch and `DEMO_SIGNUP_ENABLED` is only
the app-level switch, and that the first demo account must not arrive before the snapshot and first
reset.

The deployment adds no second Vercel project, no second Clerk application and no second Neon
project. The existing `/api/tap` WAF rule and `/api/cron/daily` backup schedule remain. The demo
branch is migrated whenever main is migrated; the reset's column check is the backstop, and the
handover names this operational step.

## Benchmarks

Each is a fact to observe after the work, not a test name. The testing pass in `testing.md` mirrors
them. The owner setup in section J is a precondition for the checks that need the branch, snapshot
and reset.

1. **Owner signs in.** After this change, when the owner opens the office, he sees the main
   inventory, no demo banner, and the buyer-page preview on a car.
2. **Client accepts the invitation.** When the client accepts the invitation carrying the main
   grant and signs in, he sees the main office through the same provider path as before, with no
   demo banner.
3. **A stranger signs up.** When a person completes Clerk's sign-up from the demo link, the office
   opens in demo with the demo banner and the demo data; no main row is read or written.
4. **A demo edit stays in demo.** When a demo user adds or edits a car, price, photo or setting, no
   public page, count, setting or main office value changes.
5. **A main edit stays in main.** When a main user adds or edits a car, the demo office's data does
   not change.
6. **A forged main choice is ignored.** When a demo account sends a cookie, header or query
   parameter claiming main, the office still uses demo; it never reads or writes main.
7. **An anonymous office request.** When an office page or action is reached without a signed-in
   account, it is refused before a store read; the resolver does not return main.
8. **The demo store is missing.** When a non-main account opens the office with
   `DEMO_DATABASE_URL` missing or invalid, it gets a configuration error; it never falls back to
   main. Main users are unaffected.
9. **The showroom under a demo session.** When a signed-in demo user opens the home page,
   inventory, a car page or the privacy page, every car, price, photo and setting comes from main,
   exactly as it does for an anonymous visitor; no demo car appears.
10. **A showroom tap.** When a visitor taps a WhatsApp link, the tap row is written to main, never
    to demo.
11. **The daily backup.** When the backup runs, it reads and writes main only; its filename,
    seven-file retention and encryption are unchanged; no demo row or demo asset enters it.
12. **The one snapshot.** When the snapshot tool runs, exactly one asset carries
    `truespec-demo-seed` and the name `demo-seed.json.gz.enc`; older seed-labelled assets are gone;
    a demo upload with the same filename is not counted; the output names only counts, time and the
    asset id/filename, never a row, key, connection string or person.
13. **The daily reset.** When the reset succeeds, the demo's data rows match the fixed snapshot,
    demo's own `schema_migrations` rows are preserved, a demo account still signs in and its local
    rows are recreated, a demo row created after the snapshot is gone, a main change made after the
    snapshot is absent from demo, and main's counts/checksum before and after are unchanged.
14. **The reset refuses the wrong target.** When the demo URL is the same database as main, the
    branch id or name is not the configured demo branch, the URL host is not that branch's
    read-write endpoint, the Neon API is unreachable, or the seed count is zero or more than one,
    the reset refuses before a write; main and demo are unchanged.
15. **Two resets overlap.** When a second reset starts while the main advisory lock is held, it
    refuses; the first continues alone.
16. **A failed reset.** When the snapshot is missing, corrupt or under the wrong key, or the restore
    fails mid-transaction, demo remains as it was and main is untouched. When the data restore
    succeeds but the asset cleanup fails, the data reset stands, the failure is reported, and no
    unmarked asset is deleted to compensate.
17. **Demo uploads are cleared.** When a demo user uploads a photo or a PDF and the reset runs, that
    asset is deleted; a main photo/PDF, the snapshot and the daily backup remain; an unmarked asset
    is not deleted; a demo upload named like the snapshot is not selected as the seed.
18. **The demo cap.** When a demo upload would take marked demo assets over
    `DEMO_ASSET_CAP_BYTES`, it is refused with a clear message and no bytes are stored; when the cap
    cannot be read, the upload is refused; main's asset usage does not count and does not change the
    demo cap.
19. **The switches.** When `DEMO_SIGNUP_ENABLED` is off, the sign-in page hides the demo link and
    the sign-up route serves no form. When `DEMO_RESET_ENABLED` is off, the reset route refuses
    without changing demo or main. Neither switch grants main.
20. **The demo office's look.** Every demo office page shows the banner; the main office shows none.
    A demo car has no buyer-page preview; a main car keeps it. Demo Settings has no System card and
    no cleanup-readiness card, and its page source/props do not contain main's storage, backup or
    asset filenames. The settings the demo can practise still work.
21. **The privacy notice.** The notice explains the optional demo account, the email used for
    sign-in only, the daily reset and deletion of demo data and uploads, the absence of marketing
    email, and the identity provider's authentication messages. The sign-up page says the same and
    links to it. No page claims there is no sign-up path, and no `mailto` or invented email address
    appears.
22. **The legacy wipe.** The `demo:wipe` command is gone; the old script is gone or fails closed
    without opening a database; no replacement `is_demo` CLI exists; the reset does not depend on
    `is_demo`; the owner's office delete still removes main data he chooses.
23. **The deployment shape.** One Vercel project, one Clerk application, one Neon project; the demo
    is a branch named `demo` in that project. The `/api/tap` WAF rule and the daily backup cron are
    unchanged; the reset cron exists at `0 3 * * *` UTC. The env names exist; no secret value is in
    the repository, a log or a report.
24. **The handover.** The owner setup checklist exists outside the repository and names the Clerk
    steps, the exact metadata key and the env names, with no values. The first demo account was not
    created before the snapshot and first reset. The owner has confirmed the Vercel and Clerk
    settings.

## Gates (all must pass before the task is reported done)

- `npm run typecheck` — 0.
- `npm test` — all pass.
- `npm run build` — 0.
- `npm run leak-check` — PASSED where the remote store is reachable; a timeout is reported as a
  blocked check, never claimed as passed.
- `npm run store-freshness` — PASSED.
- `npm run db:migrate` — main up to date; the demo branch up to date (owner-provided connection).
- `openspec validate --all` — passes (it was 2/2 when this task was written).
- The report names the exact commands and figures it saw. No claim without a command or a store
  reading.
- The owner setup has been performed, the snapshot exists, and the first reset has run. Until then
  the demo is built but not live; the task is not reported as done.

## Boundaries — what this task does not do

- No second Vercel project, second public URL, second Clerk application or second Neon project.
- No schema change; `is_demo` remains a legacy column, not the boundary.
- No role system, permission table, allow-list or RLS policy.
- No email channel, no marketing email, no contact email address.
- No public demo showroom and no buyer-page preview for a demo car.
- No demo data in the backup; the backup remains database-only.
- No automatic deletion of main or client data; the only demo cleanup is exact demo-marked uploads.
- No new Clerk, Sanity or Neon key. `NEON_API_KEY` and `BACKUP_ENCRYPTION_KEY` already exist.
- No change to the tap route's origin/body checks or the `/api/tap` WAF rule.
- No redesign of the showroom or the office's look; the new UI is the demo banner, the sign-up
  page/link, the hidden preview and the two hidden Settings cards.

## Open questions

None. The change's decisions cover the shape. If the build finds a genuine gap the decisions do not
cover, it stops and asks; it does not invent a rule.
