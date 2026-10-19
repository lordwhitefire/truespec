# TASK-005 — Gates, reconciliation, net-zero

**Run 2026-10-19** on the working tree at HEAD `a5bf83a` (Task 42), dev server `:3210`, live
store. The build includes the owner's still-uncommitted working tree; no source file was changed
by Tasks 41–43.

## The order actually run, and why

`npm run typecheck` → `npm test` → the Task 42 live witnesses → `npm run leak-check` → **stop the
dev server** → `npm run build` → restart the dev server → store-side net-zero + `git status`.

**Deviation recorded:** the plan's Task 43 AC line lists `build` before `leak-check`. That order is
wrong for this tree: TASK-004's learned rule is **leak-check before build**, because the build
replaces the `.next` input the dev server is serving; running it while `next dev` is up is not a
valid gate. The plan's own Gate rows already use the learned order. This note records the order
that was run, not a silent swap.

## Results

| gate | command | result |
|---|---|---|
| typecheck | `npm run typecheck` | **exit 0**, no output |
| tests | `npm test` | **311 / 311**, 9 suites, **0 fail / 0 cancelled / 0 skipped / 0 todo**, 7 160 ms |
| live witnesses | Task 42 | **B1–B11 have live evidence**; 3/4/6/10/11 fresh, 1/2/5/7/8/9 carried from their live runs; B12 person-only; `reports/TASK-005-witnesses.md` |
| leak check | `npm run leak-check` | **PASSED** — 21 public routes, 18 tokens · 36 cost values · 52 asset/file refs · 18 customer values · 3 office labels; every route answered 200 |
| build | `npm run build` | **exit 0** — compiled in 49 s; 24 routes; middleware 92.3 kB; static generation 5/5 |
| dev restart | `setsid nohup npm run dev -- -p 3210` | **up**, `/` → **200** |

`leak-check` was run while the dev server was up, then the dev server was stopped before the
build, then restarted. Build log: `/tmp/opencode/task43/build.log`. Command logs:
`/tmp/opencode/task43/{typecheck,test,leak-check}.log` (not committed; the readings are above).

## Store reconciliation (direct, read-only)

The browser session for the office had expired (Chrome is on `/office/sign-in`), so
`scripts/reconcile.ts`'s **rendered** office side could not be compared. The **store side** was read
directly with `pg` against `.env.local`'s `DATABASE_URL`, read-only:

| reading | value |
|---|---|
| `car` rows | **25 total · 25 live · 0 tombstones · 25 demo · 25 live demo** |
| demo rows created by this layer | **0** — the 25 demo rows are the standing fleet, `created_at` **2026-10-15 12:04:52.137649+00 → 2026-10-16 10:18:00.084727+00**; none created after the layer began (2026-10-17) |
| sold | **1** → the office's *“25 cars — 24 in stock, 1 sold”* |
| throwaway refs (`TS-T*`, `TASK*`, `ZZTEST*`, `TS-FLOW*`) | **none** |
| throwaway activity subjects | **none** |
| `activity_event` rows | **116** total; the only `TS-1001` rows are its 4 demo-car events (2 from 17 Oct 09:30, 2 from the Task 5 saves at 18:33) |
| `setting` values | tagline `Cars you can trust, prices you can see` (`updated_at 2026-10-16T10:18:23.881Z`); whatsapp `+2348146927170` (`updated_at 2026-10-16T11:55:53.863Z`) — both original |
| demo car touched by Task 5 | **TS-1001**, version **3** — the two real saves, recorded; not a throwaway |

**Net-zero:** no car created by this layer, no throwaway ref, no tombstone, no demo car removed,
no setting changed. The only car changed is the pre-existing demo **TS-1001** (Task 5), and its
version/activity are the recorded writes, not a leftover row.

## Working tree

`git status --short` at this point had **49 entries**, all pre-existing owner work except the
TASK-005 note/plan files about to be staged. The task did **not** edit or stage:

- `app/office/(shell)/{page,layout}.tsx`, the three enquiries files, `components/office/{OfficeNav,
  OfficeTopbar,TapBadge}.tsx`;
- TASK-004 plan/report/scripts and `openspec/changes/truespec-architecture/*`,
  `openspec/tasks-registry.md`, `openspec/tasks/TASK-004/*`;
- `scripts/leak-check.ts`, `scripts/reconcile.ts`;
- untracked `components/office/{FocusRefresh,MarkTapsSeen,TapNotice}.tsx`,
  `design-workspace/decisions/*`, `developer-workspace/architecture-deviations/`, TASK-004 scripts,
  `lib/leak-match*.ts`, `migrations/0023_tap_seen.sql`, `openspec/tasks/TASK-004/TASK-004-report.md`,
  and the whole untracked `openspec/tasks/TASK-005/` packet.

They were preserved byte-for-byte; the build saw them as the current surface and passed.

## Not run, and why

- **The rendered office reconciliation** (`scripts/reconcile.ts`) — requires the signed-in Chrome;
  the Clerk session expired before Task 43. The store side above is the part that can be checked
  without it. The final testing pass must sign in and run the rendered comparison.
- **The 19 testing groups** in `testing.md` — still deferred by design; Task 44 is the handover,
  not a group run.
- **Benchmark 12** and **Q-003** — person-only.

## Verdict

Typecheck, tests, leak-check and build all pass. The store is net-zero for this layer's throwaway
records and settings. The one gate not run is the **rendered** office reconciliation, blocked by the
expired browser session; it is named, not hidden.
