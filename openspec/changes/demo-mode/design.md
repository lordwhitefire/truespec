# Design — demo mode

## 1. The shape in one picture

```
                         one Vercel deployment, one URL
                                      |
                         one Clerk application
                         /                    \
             publicMetadata                 no main grant
             truespec_space=main                   |
                    |                              |
                 main space                     demo space
                    |                              |
              main branch                      demo branch
           (showroom + invited office)      (self-serve office)
                    |                              |
          public reads, taps, backup        demo reset from a fixed
          main office sessions              encrypted snapshot of main
```

The public showroom is always the left side. A demo account gets the right side's office, never a
second showroom. The demo branch is a separate branch in the same Neon project; it has its own
connection string and its own endpoint. The fixed snapshot is the only data path from main to demo,
and it is taken once.

## 2. Why this shape

The owner's six fixed points are the contract: one site/address/click; invited users main;
self sign-ups demo; demo resets daily; accounts survive; main never touched. The design meets each
one without a second Vercel project or a second Clerk application:

- **One site, one deployment**: space is chosen per request, not per hostname. The same Next.js app
  and the same Clerk application serve both.
- **No second Clerk**: main is a provider metadata grant on the existing account or invitation. The
  client's invitation → provider → office path is unchanged; the invitation now carries metadata.
- **No second Neon project**: the demo is a branch in the same project. It is physically separate
  at the connection-string level, so a demo query cannot reach main even if a filter is forgotten.
- **Main untouched**: the reset writes only to the demo connection. The only main connection in the
  reset is a lock, not a data write. The snapshot is taken before the reset and never re-taken by
  the daily job.
- **No schema change**: `office_user`, `session`, `car`, `enquiry`, `draft`, `setting` and the rest
  already carry everything both branches need. `is_demo` remains a legacy column, not the boundary.

## 3. Space resolution

### 3.1 The only grant

A signed-in Clerk user is **main** only when its `publicMetadata.truespec_space` is exactly the
string `"main"`. Every other signed-in user is **demo**. This is a single grant, not a role system:
there is no role table, no permission table, no allow-list, and no role-editing screen. The activity
log continues to name the actor.

The owner's own Clerk user carries the grant. The client's Clerk invitation carries the same
`publicMetadata`; Clerk copies invitation metadata onto the accepted user. If the client already
has an account, the owner sets the metadata on the user instead. The client still accepts an
invitation, signs in with Google or the provider's flow, and lands in the office exactly as before.

The Clerk application's sign-up mode becomes open so a stranger can create a demo account. Main is
still invitation-only because the grant, not the global sign-up mode, is what selects main.

### 3.2 Reading the grant

`lib/space.ts` will hold the one resolver:

- `spaceFromMetadata(metadata: unknown): "main" | "demo"` is a pure function. Only the exact string
  `"main"` returns main; a missing, malformed or different value returns demo. This default is the
  safety property.
- `resolveSpace()` reads `auth()`. With a user, it reads `currentUser().publicMetadata` and applies
  `spaceFromMetadata`. With no provider user it **throws**; it never returns main. Public pages do
  not call it — they use the main doors — so an anonymous showroom request is unaffected. An office
  request without a verified session is refused by `checkOfficeSession` before the store is read,
  and the throw is the backstop if a page or action forgets that check.
- The resolver is wrapped in React `cache()` so one request makes at most one `currentUser()` call.
  It is not cached across requests, so a metadata change is seen on the next request.

Why `currentUser()` rather than `auth().sessionClaims`: Clerk does not guarantee public metadata in
the default session token. Relying on a custom session-token claim would add a dashboard
configuration that, if missed, silently sends the owner to demo or a stranger to main. The backend
user object is authoritative. The cost is one Clerk API call per office request; the app is small,
and the alternative is a security boundary resting on an unverified claim.

### 3.3 What cannot choose the space

A cookie, request header, query parameter, form field, local-storage value or client-supplied
metadata never selects main. The application does not set a space cookie and does not accept a space
header. A forged value has no effect. If the demo connection string is missing or invalid, a
non-main account gets a configuration error; there is no fallback to main.

## 4. Store doors

`lib/db.ts` will hold two Neon clients:

- `mainDb()` — `getConfig().databaseUrl`, the existing main connection.
- `demoDb()` — `DEMO_DATABASE_URL`; missing or malformed throws a `ConfigError`, never falls back.
- `db()` remains as a main-only alias for existing scripts (`scripts/reconcile.ts`), or those
  scripts move to `mainDb()`; either way no script reaches demo by accident.

`lib/store-guard.ts` will have two families:

| Door | Used by | Space |
|---|---|---|
| `storeQuery` | office reads and writes | resolved from the signed-in user; an explicit `{ space }` option is available for the session check |
| `storeQueryRefusing` | office writes | same as `storeQuery` |
| `storeQueryMain` | public showroom, public settings, backup, seed/reconcile | main, always |
| `storeQueryOnceMain` | buyer tap | main, always; still not retried |
| `storeQueryMainRefusing` | any main write that needs the refusal pattern | main, always |

The public paths that must change:

- `lib/public-cars.ts` — every public car read and `getSetting` uses `storeQueryMain`.
- `lib/tap.ts` — the tap insert uses `storeQueryOnceMain`.
- `lib/backup-run-live.ts` — the daily backup, heartbeat, measurement and setting writes use
  `storeQueryMain`. The backup never reads demo.
- `scripts/reconcile.ts` and any CLI that reads the store — main, explicitly.
- `scripts/cleanup-readiness.ts` — a main-only report; the CLI has no Clerk request.
- `lib/cleanup.ts` — a main-only report (`storeQueryMain`). The main settings page renders it; the
  demo settings page does not call it. The asset-store comparison excludes demo-marked assets and
  the fixed snapshot as well as `backup-` files.
- `lib/settings.ts` — `readSettings` (the three editable settings) uses the office space;
  `readNotices` (the daily job's storage/backup figures) is main-only. The settings page calls the
  notice and cleanup readers only for a main session; a demo session gets `readSettings` alone and
  does not receive main's operational values in its client props.

The office paths that must change:

- `lib/session.ts` — `OfficeSession` gains `space`. `checkOfficeSession` resolves the space before
  the first store call, passes it explicitly to the session query, and creates the lazy row in that
  branch. `endSession` deletes from the same branch.
- Every office action, page and route handler already goes through `getOfficeSession` /
  `requireOfficeSession`; those now carry the space. No page chooses a door by itself.
- `app/api/upload/route.ts` and `app/office/actions/photo.ts` pass the session's space to the asset
  upload so the demo mark is set server-side.

A page that reads `storeQuery` before checking the session would resolve demo/main from Clerk
anyway, but the intended order remains session first. The session check is the authorization; the
space is the data boundary.

**CLI import safety is a hard constraint.** `scripts/demo-snapshot.ts` and the other command-line
tools run outside a Next request and import the main doors. `lib/store-guard.ts` therefore must not
import `next/headers`, `@clerk/nextjs/server` or `lib/space.ts` at the top level. The office
`storeQuery` resolves the space through a request-only lazy import (or an equally request-scoped
module) only when the caller has not passed an explicit space; `storeQueryMain` and
`storeQueryOnceMain` never load Clerk. A test must import a main door from the project's Node script
environment (`--conditions=react-server`, which is what lets `server-only` modules load outside
Next) and prove it does not pull in `next/headers`; the snapshot script itself is the practical
witness. This is also why the session check passes `{ space }` explicitly: it avoids a second
resolver call and keeps the script-imported module free of the request layer.

## 5. Sign-up and the door

- `app/office/sign-up/[[...sign-up]]/page.tsx` mounts Clerk's `<SignUp />` with
  `fallbackRedirectUrl="/office"`. It renders only when `DEMO_SIGNUP_ENABLED` is on; otherwise it
  redirects to `/office/sign-in`.
- The sign-in page keeps Clerk's `<SignIn />` and adds a secondary demo link when the flag is on.
  The client's normal sign-in is unchanged.
- The sign-up page states, in plain words: this is a demo account; its data resets daily; uploads
  are deleted with the demo; the public showroom shows main, not the demo inventory.
- The application builds no credential form and stores no password material. Clerk creates the
  account. The first office request creates `office_user` and `session` in demo.
- Clerk sign-up mode is the outer switch. `DEMO_SIGNUP_ENABLED` hides the link and refuses the route,
  but it does not change Clerk's own sign-up mode; the handover says so.

## 6. The fixed snapshot

### 6.1 Why a logical snapshot, not a Neon branch restore

The product plan assumed a Neon snapshot restored in place. The Free plan makes that unsafe for a
daily job:

- Neon instant restore works on **root** branches, and restoring a root branch from another branch
  creates a backup branch that cannot be deleted. Repeating the reset would accumulate
  undeletable root branches and hit the Free plan's root-branch limit.
- Restoring a Neon snapshot creates a **new branch**; the connection string and endpoint change,
  so `DEMO_DATABASE_URL` would have to be replaced on every reset.
- A normal child branch is desirable for isolation and does not count against the root-branch
  limit, but it is not a safe target for the in-place snapshot restore described above.

The design therefore uses the same **logical backup archive** the project already has: every public
table and sequence, in a fixed order, JSON, gzipped and AES-256-GCM encrypted with
`BACKUP_ENCRYPTION_KEY`. The archive is restored into the existing demo branch with the existing
`restoreArchive` code in one transaction. The demo branch's connection string never changes, no
Neon branch is created or deleted by the daily job, and the Free plan's branch limits are not
involved. The snapshot is still a snapshot of main; it is just stored as an encrypted logical dump
rather than a Neon branch.

The Neon API is still used for the safety check in §7.3. `NEON_API_KEY` is already in the secrets
environment and in Vercel; no new key is required.

### 6.2 Taking the one snapshot

`scripts/demo-snapshot.ts` reads main only and writes one file asset, `demo-seed.json.gz.enc`:

1. Refuse if `BACKUP_ENCRYPTION_KEY` or the main URL is missing.
2. Refuse if the demo URL is present and names the same database as main (the branch should be
   different; this is a mistake guard, not the reset's only guard).
3. Build the archive with `buildBackupArchive` over `storeQueryMain`, so the fixed table list is
   checked and a new table cannot be silently missed.
4. Encrypt with `encryptBackup`; upload with the existing `uploadFile` under the fixed filename and
   the system label `truespec-demo-seed`. The label is what the reset uses; the filename is for
   humans. A demo user cannot set that label, so a demo upload cannot impersonate the seed.
5. Delete older assets carrying the seed label, so the reset finds exactly one. Report counts only;
   never row contents, the key or the connection string.

The snapshot is taken after main's showroom/demo content is final and **before** the first demo
account uses the space. It is not a daily job. If the owner later wants a new demo starting point,
he runs the snapshot deliberately and then resets; the design does not copy main every day. This is
what keeps future real main data out of demo, and it is why the snapshot is fixed.

The snapshot is a system file, not a backup and not litter. Its seed label and the fixed name
(`isDemoSeedFilename`) both recognise it; the cleanup card excludes it, the backup retention's
`backup-` pattern ignores it, and the demo asset cleanup only deletes assets carrying the exact demo
mark. The file lives in the public-read dataset as ciphertext; the key stays in Vercel/`.env.local`.

### 6.3 The demo branch

The demo branch is created once in the same Neon project, from main, and given an endpoint and
connection string. It is migrated to the current schema. The branch is a child branch; it does not
need to be a root. Its name is `demo`; the reset verifies the branch id/name and the endpoint host,
not just the URL's database name.

The branch is **created once**, at setup, while main holds the generated content. It is never
recreated from main later: recreating it would copy whatever main holds at that moment, including
future real client data, defeating the fixed snapshot. If the branch is lost, the safe recovery is
to create an empty branch with the same schema and reset it from the fixed snapshot, not to branch
from live main; the handover records this.

The branch's data is irrelevant after the first reset: the fixed snapshot replaces it. The branch's
schema is not irrelevant. Any migration applied to main must also be applied to demo before the next
reset; `restoreArchive` checks the target's columns and refuses before truncating if they disagree.

## 7. The daily reset

### 7.1 The route

`app/api/demo/reset/route.ts`, GET only, `force-dynamic`, `maxDuration = 300`, scheduled at
`0 3 * * *` UTC in `vercel.json`. Hobby allows 100 daily crons and may start within the hour; the
banner says "daily" rather than promising the exact minute.

The route checks, in order:

1. `Authorization: Bearer $CRON_SECRET`; a missing secret refuses every request.
2. `DEMO_RESET_ENABLED === "1"`; otherwise refuse without touching a database.
3. `DEMO_DATABASE_URL` is present; `BACKUP_ENCRYPTION_KEY`, `NEON_API_KEY`, `NEON_PROJECT_ID` and
   `DEMO_BRANCH_ID` are present.
4. `isSameDatabase(DEMO_DATABASE_URL, DATABASE_URL)` is false (the existing connection-identity
   helper normalises Neon's pooled and direct hosts).
5. The Neon API says the configured project/branch is the demo branch: the branch id matches
   `DEMO_BRANCH_ID`, the branch name is `demo`, it is not main, and the host in `DEMO_DATABASE_URL`
   is the **read-write** endpoint host of that branch (pooled and direct normalised). If the API or
   the endpoint list is unreachable, the reset refuses; it does not assume the URL is safe. This is
   what stops a correctly named branch id from being paired with a connection string from another
   project, or with a read-only replica that cannot be restored.
6. Exactly one asset carries the seed label `truespec-demo-seed`. Zero or multiple candidates
   refuse; a demo upload with a similar filename does not count.
7. The main advisory lock is acquired.

The route returns a summary and logs one line: snapshot `generated_at`, row counts before and after,
asset deletions, duration, and the step that failed. It never logs a key, a connection string, a row
or a person.

### 7.2 The lock

The lock is a Postgres advisory lock on **main**, not on the branch being replaced. A lock inside
demo would disappear when demo's tables are truncated/replaced, so it could not stop two overlapping
resets. The route opens a direct (unpooled) `pg` connection to main, uses
`pg_try_advisory_lock(hashtext('truespec-demo-reset'))`, and releases it in `finally`. The main
connection is not used for data. If main is unreachable, the reset refuses.

The restore uses a direct `pg` connection to demo. `restoreArchive` does the `TRUNCATE` and inserts
inside one transaction; a failure rolls back and leaves the previous demo data in place. The lock is
held across the restore and the asset cleanup.

### 7.3 The restore

1. Find the one asset carrying the seed label (the fixed filename is for humans); download its
   bytes from Sanity.
2. `decryptBackup` (tag verified) then `parseBackupArchive` (fixed table/sequence set checked).
3. `readColumnTypes` on demo; `restoreArchive` builds insert plans before `BEGIN`, then truncates,
   inserts in foreign-key order, verifies counts and sequences, commits.
4. The restore preserves the **demo branch's own `schema_migrations` rows**. The snapshot's
   migration history describes main at snapshot time; restoring it into a demo branch that has since
   been migrated would make `db:migrate` believe old migrations are missing and could replay them.
   `restoreArchive` will gain an option to preserve named tables (skipped by truncate, insert and the
   count check for that table); the demo reset passes `schema_migrations`, the manual main restore
   does not. The demo branch must still be migrated normally; the preserved history is what makes the
   reset safe after a migration.
5. After commit, clean demo uploads (§8) and release the lock.
6. Return `ok` only when the data restore and cleanup both passed. If the restore passed and
   cleanup failed, report the reset as done with a failed cleanup step; do not roll back the data
   and do not touch unmarked assets.

### 7.4 What survives

- The Clerk account survives; the reset does not call Clerk's user API.
- The local `office_user` and `session` rows are in demo and are replaced by the snapshot. A demo
  user's next office request lazily recreates them in demo.
- The snapshot's `office_user`/`session` rows (including any main owner row) are restored into
  demo. They are not a way into main: the Clerk session id and the branch are different, and a
  demo request never checks main.
- Main's cars, enquiries, drafts, photos, PDFs, taps, activity and settings are not read by the
  reset except for the advisory lock. The snapshot was taken earlier.

## 8. Demo uploads

### 8.1 Marking at upload

The server sets a Sanity asset label from the session space:

- demo space → `truespec-demo`;
- main space → `truespec-main` (or no label, but never the demo mark).

The label is not a person, an email or a filename. It is set by the server from
`OfficeSession.space`; a client cannot set it. The existing 15 MB per-file cap remains.

The upload result must be **verified**: if the asset comes back without the requested label, the
route deletes that just-uploaded asset and fails the action. An unmarked demo upload would survive
the reset and be invisible to the cleanup, so a failed mark is a failed upload, not a silent success.

### 8.2 Cleanup after reset

After the data restore commits, the route lists stored assets with their label and creation time.
It deletes only assets that:

- carry the **exact** label `truespec-demo` (never a prefix match — the seed's
  `truespec-demo-seed` must not match), and
- were created before the reset started.

The creation-time filter avoids deleting a demo upload made after the reset started; that upload
belongs to the fresh demo and can wait for the next reset. Assets without the mark are never
candidates, even if they look unreferenced. The fixed snapshot, the daily backups and main assets
are not marked. If the listing or a delete fails, the route reports it and leaves the asset.

### 8.3 The cap

The demo space has a total marked-asset cap (`DEMO_ASSET_CAP_BYTES`, default 2 GiB) in addition to
the 15 MB per-file cap. Before a demo upload, the server sums the sizes of demo-marked assets; if
the new file would exceed the cap, it refuses with a plain message. If the sum cannot be read, the
upload is refused rather than allowed unmetered. Main assets are not counted. The cap is an
operational limit, not a permission.

### 8.4 System files are not litter

`demo-seed.json.gz.enc` is recognised as a system file by its `truespec-demo-seed` label (and its
fixed name), and excluded from the cleanup card and from the demo upload cleanup. The existing
backup retention only matches `backup-YYYY-MM-DD.json.gz.enc`; the seed is outside it. The seed is
in the public-read dataset as ciphertext, so its URL is not a secret, but its contents are not
readable without the key. The seed label is distinct from the `truespec-demo` upload label; a demo
user's upload cannot carry the seed label because the server sets labels and the demo path never
sets that one.

## 9. Public showroom and office UI

- `lib/public-cars.ts` and `lib/tap.ts` use the main doors. The site layout, home, inventory, car
  page, privacy page and tap route therefore ignore any demo session.
- `app/office/(shell)/layout.tsx` uses the session's space. Demo renders a persistent banner:
  "Demo — everything here resets daily (around 03:00 UTC). Uploads are deleted with the demo."
  Main renders nothing.
- `app/office/(shell)/car/[ref]/page.tsx` and the add form pass `isDemo` to `CarForm`; the
  "Preview the buyer page" block is absent when true. The settings page's "live preview" is a local
  form preview, not a public car link, and stays.
- The settings System card (database/photo/backup notices) is main's operational figures carried in
  the snapshot. Showing it in demo would imply the demo is backed up and would expose main's usage
  as if it were the demo's. The demo shell omits that card; the demo strip still says the data
  resets. The rest of Settings remains available because the demo is an office practice space.
- The **cleanup readiness card is main-only and is omitted in demo**. It reads the global asset
  store and compares it with one space's rows; in demo it would report every main asset not
  referenced by the demo snapshot as "unreferenced" and show main filenames to a prospect. The demo
  settings page does not call the cleanup reader. `lib/cleanup.ts` becomes a main-only report
  (`storeQueryMain`), and `scripts/cleanup-readiness.ts` is explicitly main. The main cleanup report
  must also exclude demo-marked assets and the fixed snapshot, so it never invites the owner to
  delete a demo upload or the seed as "litter".
- The sign-in page adds a secondary demo link only when `DEMO_SIGNUP_ENABLED` is on. The demo
  sign-up page carries the demo note and a link to the privacy notice.
- The privacy notice is corrected: the showroom itself still has no accounts; the optional demo
  account is explained; the email is used for sign-in only; demo data and uploads reset daily; no
  marketing email. The application still has no email channel of its own — it sends no enquiry,
  marketing or notification email. Clerk may send its own authentication messages as part of the
  sign-up the person chose; the notice says the email is for signing in, not for contact.

## 10. Legacy data and tools

The existing `is_demo` columns and the old `demo:wipe` script were built for demo-marked rows
inside main. That is not the new boundary. Two consequences:

- The main showroom's generated rows may still carry `is_demo`; they are **main data** now. Nothing
  in the new reset reads that flag.
- `scripts/demo-wipe.ts` currently defaults to `DATABASE_URL_UNPOOLED ?? DATABASE_URL`, i.e. main,
  and deletes rows where `is_demo` is true. Running it after this change could delete the showroom.
  It is **retired**: the npm command is removed and the source is removed or fails closed without
  opening a database. The daily reset and the reset route are the demo deletion path, and the
  owner's ordinary office delete remains the main-data deletion path. There is no replacement
  `is_demo` CLI; a manual demo reset is the reset route with its operator guard.
- `scripts/seed.ts` is a main seeding tool. It is not the demo reset. The demo starts from the
  fixed snapshot; running the seed against main is an owner action with its existing meaning.

## 11. Configuration and setup

New or newly required environment values (names only; values never enter the repo, a log or a
report):

| Name | Purpose |
|---|---|
| `DEMO_DATABASE_URL` | the demo branch's connection string |
| `DEMO_SIGNUP_ENABLED` | app-level sign-up link/route switch |
| `DEMO_RESET_ENABLED` | app-level reset switch |
| `NEON_PROJECT_ID` | project containing the demo branch |
| `DEMO_BRANCH_ID` | the one branch the reset may replace |
| `NEON_API_KEY` | branch-identity check (already present and allowed) |
| `BACKUP_ENCRYPTION_KEY` | encrypts the demo snapshot (existing key; no new key) |
| `CRON_SECRET` | bearer for both cron routes (existing requirement) |
| `DEMO_ASSET_CAP_BYTES` | optional; default 2 GiB |

The owner's setup sequence, outside the code. The order matters: **sign-up stays closed until the
demo branch is seeded**, so the first demo account cannot land in a half-built space.

1. Set `publicMetadata.truespec_space = "main"` on the owner's Clerk user.
2. Ensure the client's invitation carries the same metadata (or set it on the client's user if the
   invitation was already accepted). The sign-in path stays invitation → provider → office.
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

## 12. Failure behaviour

| Failure | Result |
|---|---|
| Clerk metadata missing/not `main` | demo; never main |
| Clerk backend unreachable | request fails; never main by fallback |
| demo URL missing/invalid | configuration error for demo users; main users unaffected |
| demo URL equals main | reset refuses before opening a write connection |
| Neon branch identity or endpoint list cannot be read | reset refuses |
| demo URL host is not a read-write endpoint of the configured branch | reset refuses |
| snapshot missing/corrupt/wrong key | reset refuses; demo unchanged |
| snapshot has a table/column mismatch | restore refuses before truncating |
| two resets overlap | second refuses |
| main lock unavailable | reset refuses |
| restore transaction fails | rollback; demo unchanged |
| asset cleanup fails | data reset stays; cleanup reported; no unmarked asset deleted |
| demo upload cap check fails | upload refuses; no bytes stored |
| sign-up flag off | link hidden, route refuses; Clerk's own mode remains the outer switch |
| reset flag off | route refuses; demo unchanged |

## 13. Risks and trade-offs

- **One Clerk backend call per office request.** `currentUser()` is authoritative but slower than a
  session claim. The alternative is a custom token claim that can silently misroute if the dashboard
  is not configured. For this app's scale, the authoritative call is the safer trade. It can be
  replaced later by a verified custom claim without changing the space rule.
- **A public demo can be abused.** Clerk's abuse controls and the 2 GiB demo cap bound it; the cap
  is global, not per account, so one person can consume the demo's storage. The daily reset and
  cleanup free it. If this becomes a problem, a per-account cap or WAF rule is the next layer; it is
  not part of this change.
- **The snapshot goes stale by design.** A change to main does not reach demo until the owner
  deliberately re-snapshots. This is the privacy property: a future real main record does not leak
  into demo. The owner must know that "update the demo" is a deliberate action, not a daily copy.
- **Schema drift between branches.** Migrations must be applied to both. The reset's column check is
  the backstop; it refuses rather than coercing.
- **03:00 UTC is the literal schedule.** Vercel Hobby may start within the hour, and the office's
  own display is UTC. The banner says "daily" rather than a promise of the exact minute.
- **The snapshot is in a public-read dataset.** It is ciphertext under AES-256-GCM; the key is the
  boundary. Anyone with the key and the file can read main's snapshot, so the key stays in Vercel /
  `.env.local` and is never logged.
- **The old `is_demo` flag is now misleading.** It remains in the schema for compatibility, but no
  new behaviour depends on it. Any future reader must not treat it as the demo boundary.
- **The demo is not a full second product.** It has no public showroom of its own, no buyer preview,
  and no promise that its data survives. That is the owner's decision, and the sign-up page says it.
