# DEMO-001 — live setup tracker

**Purpose:** one place to see what is left. The owner performs live Neon/Clerk/Vercel actions; the Developer runs local commands when values are present. Say "go" before any Developer action.

## Verified complete

- [x] Code tasks 1–15 code-complete, committed on `main`
- [x] Task 16 cleanup exclusions code-complete, committed
- [x] Task 17 `demo:wipe` retired, committed
- [x] Task 18 handover written outside repo, mode 600, committed record
- [x] Task 19 full gates pass; report committed as `d088316`
- [x] Clerk owner badge: `truespec_space = "main"` set by owner
- [x] Clerk client badge: set by owner
- [x] Privacy/sign-up copy: APPROVED by owner 2026-10-26

## Remaining live steps (in order)

### 1. Neon demo branch (ruling: Developer does it when owner says go)
- [x] Create branch named exactly `demo` from `production`, not default — branch id `br-cold-firefly-b2gzi24t`
- [x] Use direct/unpooled read-write connection — host `ep-rough-smoke-b2d1vf9j.c-6.eu-central-1.aws.neon.tech`; connection verified
- [x] Record branch id and project id — branch id above; project `bold-dew-39255926`
- [x] Migrate demo with `DATABASE_URL_UNPOOLED='<demo direct>' npm run db:migrate` — up to date
- [x] Confirm main up to date; demo migrated to same migration set — 26/26 migration names match, last `0026_enquiry_pdf_unique.sql`

### 2. Vercel Production settings
- [x] Add `DEMO_DATABASE_URL` (demo direct connection) — owner reports added; not independently verified
- [x] Add `DEMO_BRANCH_ID` (exact demo branch id) — owner reports added
- [x] Add `NEON_PROJECT_ID` — owner reports added
- [ ] Confirm `NEON_API_KEY` exists
- [ ] Confirm `BACKUP_ENCRYPTION_KEY` exists (same key as snapshot)
- [ ] Confirm `CRON_SECRET` exists
- [x] Add `DEMO_RESET_ENABLED=1` — owner reports added
- [x] Leave `DEMO_SIGNUP_ENABLED` unset/off — owner reports `0`
- [ ] Optional: `DEMO_ASSET_CAP_BYTES`
- [ ] Keep `DATABASE_URL` and `DATABASE_URL_UNPOOLED` pointing at main
- [x] Redeploy — owner pushed `main`; new build serves `/api/demo/reset` (401 without auth, 200 with bearer)
- [ ] No second Vercel project

### 3. Cron confirmation
- [x] Confirm `/api/demo/reset` at `0 3 * * *` UTC — owner confirmed
- [x] Confirm `/api/cron/daily` at `0 2 * * *` UTC — owner confirmed
- [x] Redeploy if not present — both present

### 4. Local values (not in repo, not in chat)
- [x] `.env.local` gets `DEMO_DATABASE_URL`, `DEMO_BRANCH_ID`, `NEON_PROJECT_ID`, `DEMO_RESET_ENABLED=1`, `DEMO_SIGNUP_ENABLED=0`
- [x] Add existing `BACKUP_ENCRYPTION_KEY` and `CRON_SECRET` to `.env.local` — owner copied both; present, key decodes to 32 bytes, cron secret 64 chars
- [x] Main `DATABASE_URL`/`DATABASE_URL_UNPOOLED` left unchanged in `.env.local`

### 5. Snapshot
- [x] Run after main demo content is final and before first demo account
- [x] `npm run demo:snapshot` — 392 rows, 18 tables, 20,306 bytes, generated `2026-10-26T15:54:08.462Z`
- [x] Confirm exactly one `truespec-demo-seed` asset — `file-5d405e31d97317188457e5c1d0ce180e58d1df22-enc`, `demo-seed.json.gz.enc`
- [ ] Do not rerun unless deliberately refreshing demo

### 6. First reset
- [x] `DEMO_RESET_ENABLED=1` in Vercel, bearer secret set — owner reports added
- [x] Call `curl -i -H "Authorization: Bearer $CRON_SECRET" 'https://truespec-k4y6.vercel.app/api/demo/reset'` — first attempt 404 (old build); retry after push: HTTP 200
- [x] Expect 200, `ok: true`, `step: "done"`, `cleanup.failed: 0` — HTTP 200, `ok: true`, `step: "done"`, `cleanup.failed: 0`, 42.7s
- [x] Blocker resolved: `origin/main` at `d088316`; route live
- [x] Confirm demo branch holds snapshot; public showroom still shows main — demo/main both 26 cars, 117 events, 2 office users; `/` and `/inventory` 200; exactly one seed asset

### 7. Clerk sign-up (open only after first reset works)
- [x] Open Clerk sign-up — owner done in Clerk dashboard
- [x] `DEMO_SIGNUP_ENABLED=1` in Vercel — owner done; redeployed
- [x] `/office/sign-up` renders Clerk sign-up, title "Try the demo office"
- [x] `/office/sign-in` shows demo link and post-sign-up note — T21 commit `d6c0c1e`
- [x] Public `/` and `/inventory` return `200`
- [ ] Remaining live session checks — owner work, not claimed
- [ ] Push T20/T21 — owner push
- [ ] Keep lockout and enumeration protections
- [ ] Main stays invitation-only through `truespec_space = "main"`
- [ ] No roles or allow-list

### 8. App switch
- [ ] `DEMO_SIGNUP_ENABLED=1` in Vercel
- [ ] Redeploy
- [ ] Confirm sign-in page shows demo link
- [ ] Confirm `/office/sign-up` shows approved copy

### 9. Live checks
- [ ] Owner main, no banner, buyer preview present
- [ ] Client main, no banner
- [ ] Stranger signs up, lands in demo with banner
- [ ] Demo edits never in main or public showroom
- [ ] Demo account cannot claim main via cookie/header/query
- [ ] Anonymous office requests refused
- [ ] Demo uploads labelled `truespec-demo`; main uploads `truespec-main`
- [ ] Main marker survives reset; demo upload disappears
- [ ] Seed, backups, demo uploads excluded from cleanup card
- [ ] `DEMO_SIGNUP_ENABLED` off: link hidden, sign-up redirects
- [ ] `DEMO_RESET_ENABLED` off: reset returns 403

### 10. Code cleanup before sign-up
- [x] Remove visible "Owner note" block from privacy page — removed in `57ff673`; typecheck, 504 tests and build pass

### 11. Independent testing
- [ ] TASK-007 (separate task, not claimed by this report)

## Blocked until owner says go
All live Neon/Clerk/Vercel steps above. Say "go" for each step; Developer will not act alone.

## Do not create
- No second Neon project
- No second Vercel project
- No second Clerk application
- No schema change
- No role/permission system
- No email channel
