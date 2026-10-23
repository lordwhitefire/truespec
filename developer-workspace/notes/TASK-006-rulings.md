# TASK-006 — grilling rulings

**Date:** 2026-10-23 · **Status:** agreed; plan not yet written.
**Source:** owner answers to the grilling rounds. These govern the build where TASK-006 is silent.

## Scope and order

1. Build **all of A–I in this session**, in one continuous pass. Checkpoints are progress
   reports, not approval gates. Stop only for a genuine spec gap or an unpassable gate.
2. **Risk-first order:** B (schema + PDF link) → A (owner delete) → F (daily backup) →
   C (duplicate car) → D (actor email) → G (storage lines + cleanup card) → H (privacy) →
   I (secrets + handover).

## Data and environment

3. The configured `DATABASE_URL` / Sanity dataset is treated as **live**. No destructive
   writes or externally visible writes against it.
4. A **throwaway copy is authorised**: create a disposable Neon branch in the `truespec`
   project and use it for destructive delete/backup/restore verification. Do not touch the
   main branch. Test Sanity assets must be throwaway assets, not client files.
5. The owner authorised **starting the environment** (dev server, and the automation Chrome
   if needed) instead of the usual attach-only rule. The automation profile
   `~/.config/google-chrome-automation` exists; keep the browser visible, dedicated, CDP
   `:9222`, never headless, never a second automation instance, and do not touch the owner's
   own snap Chromium.
6. Load `/office` in the automation Chrome. **If the Clerk session is already valid,
   continue. If the sign-in page appears, stop and wait for the owner.** Do not attempt to
   sign in.

## Verification

7. **All seven gates** must pass: typecheck, test, build, leak-check, store-freshness,
   db:migrate, `openspec validate --all`.
8. **Browser check is required** for the UI work, using
   `developer-workspace/procedures/browser-check.md`: build on `:3210`, reference `:3211`
   only where a surface existed before, port `3000` never used, no screenshots, chromium
   guard unchanged, detach on exit. New surfaces (delete control, cleanup card, storage
   lines) are checked **build-only against the spec**; changed existing surfaces (privacy,
   activity row, add-car) may use ref-vs-build.
9. The browser pass on the live store is **non-destructive** (dialog, cancel, visible data,
   layout, navigation). Real deletes, backup uploads and restore drills run on the
   throwaway branch. Any benchmark not exercised is reported as **not run**, never claimed.
10. No benchmark or gate is claimed without the command or store reading that shows it.

## Git and secrets

11. **No commits, no pushes, no branch changes.** Leave the working tree for owner review.
12. Generate the real `BACKUP_ENCRYPTION_KEY` and `CRON_SECRET` only after the encryption
    round-trip passes; write the handover file at `/home/lordwhitefire/truespec-secrets/`
    (folder `700`, file `600`, outside the repo). Print no secret anywhere.
13. A throwaway test key may live in a local env file for the round-trip, then be removed
    with the test artefacts.

## Current environment facts (2026-10-23)

- `:9222` not listening; `:3210` not running; the owner's snap Chromium is running.
- `.env.local` has: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH`,
  `CLERK_*`, `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_TOKEN`, `SESSION_SECRET`.
  It does **not** yet have `BACKUP_ENCRYPTION_KEY`, `CRON_SECRET`, or `DATABASE_URL_RESTORE`.
- Neon project `truespec` = `bold-dew-39255926`, reachable.
- Git branch `main`; unrelated modified/untracked files exist and must not be touched.
