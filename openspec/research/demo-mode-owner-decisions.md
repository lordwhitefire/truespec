# Demo mode — owner decisions

**Date:** 2026-10-25. **Status:** approved and written as `openspec/changes/demo-mode/` (proposal, delta specs, design, tasks); no build has started.

## Approved

- **One app, two rooms (owner, 2026-10-25):** same Vercel deployment, URL, Clerk application and Neon project. Main is the showroom; demo is the practice room. The clean demo is a fixed snapshot of main; the daily reset replaces the dirty demo from that snapshot.
- **Self sign-ups go to demo; invited clients go to main (owner, 2026-10-25):** public sign-up is on for demo, and the “invite-only, no sign-up” wording changes. Main is granted by Clerk `publicMetadata.truespec_space = "main"` on the owner’s user and on a client invitation; every other signed-in account is demo. No role, permission or allow-list system.
- **Demo is not the full app (owner, 2026-10-25):** anything that needs the live showroom/inventory does not work in demo. The public showroom always shows main; demo has no buyer-page preview and no public shopfront of its own.
- **Demo-only asset cleanup (owner, 2026-10-25):** “anything photo and pdf uploaded in demo data goes with it.” Every photo or PDF uploaded inside the demo belongs to the demo and may be deleted when the demo is reset or cleaned. The cleaner does **not** delete main files or the clean snapshot’s files.

## Settled by the written change

The change records the architecture the owner’s points imply: the demo is a separate Neon branch in the same project; the fixed snapshot is a one-time encrypted logical archive of main; the daily reset restores it in one transaction behind explicit target and lock guards; demo uploads carry a demo mark and a total cap; the old `is_demo`-row wipe is retired. Read `openspec/changes/demo-mode/design.md` for the reasoning and `tasks.md` for the build plan.

## Not decided here

- Build start. The change is written; no product code has been changed. The owner’s deployment settings (Clerk sign-up, metadata, demo branch, Vercel env, snapshot, cron, redeploy) remain owner actions.
