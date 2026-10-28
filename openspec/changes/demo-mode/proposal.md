# Demo mode — a self-serve practice copy on the same site

## Why

The owner wants prospects to try the office without giving them the real inventory. Today the
office has one space and one door: the provider is invite-only, there is no public sign-up, and a
signed-in account sees the main data. The owner has now decided the shape of the answer: **one
site, one URL, one deployment, one database project**. A person who signs themselves up gets a
**demo** office whose data is separate and resets daily; an invited person gets the **main** office.
The public showroom always shows main. The system never deletes main data, and the demo reset never
touches main.

## What Changes

- Adds a second data space — **demo** — as a separate branch of the same Neon project. Main and demo
  run the same application against different connection strings. There is no second Vercel project
  and no second Clerk application.
- Adds a public **demo sign-up**. Self sign-ups land in demo. Main remains invitation-only: the
  owner grants main by Clerk `publicMetadata.truespec_space = "main"` on the owner's user and on
  the client invitation; every other signed-in account defaults to demo. There is no app role or
  permission system, and no email allow-list.
- Adds **space resolution** on the server from the verified Clerk user. The office uses the resolved
  space's store door; the public showroom, taps and the daily backup are pinned to main.
- Adds a **fixed encrypted snapshot** of main and a daily **demo reset** at 03:00 UTC. The reset
  restores the demo database from that snapshot in one transaction. Demo accounts survive; demo
  rows do not. Main is not written, truncated or restored.
- Adds **demo-only upload marking**: files uploaded in demo are labelled in Sanity and are deleted
  after the reset. Main files, the snapshot and seeded assets are never deleted.
- Adds a persistent demo banner, a demo sign-up page/link, an upload cap, and hides the buyer-page
  preview in demo. The public showroom is not a preview of the demo data.
- **BREAKING (access model)**: the delivered "exactly one account, invite-only, no sign-up path"
  rule is replaced by "main is invited; demo is self-serve." The office still has one sign-in
  surface and the client's invitation → provider → office path is unchanged.
- Updates the privacy notice and sign-up wording because the site now collects an email for optional
  demo accounts.
- **No schema change**: the existing tables serve both spaces; `is_demo` is not the isolation
  mechanism. The legacy `demo:wipe` tool must not remain able to delete main's showroom data.

## Capabilities

### New capability

- `demo-mode` — the two spaces, space resolution, the demo snapshot/reset, demo asset cleanup, the
  demo banner/sign-up, isolation, caps and failure behaviour.

### Modified capabilities

- `office-access` — main and demo accounts; invitation grant; demo sign-up; the session row now
  carries the space it belongs to.
- `showroom` — every public read, setting and tap is main-only; a demo session never changes the
  public site.
- `media` — demo uploads are marked and cleared with the demo; main, snapshot and seeded assets are
  outside every deletion path.

## Non-goals

- No second site, URL, Vercel project or Clerk application.
- No public showroom of demo inventory: demo is an office practice space, not a second shopfront.
- No role or permission system, no per-user role UI, no email allow-list.
- No live copy of main on every reset. The snapshot is fixed; refreshing it is a deliberate owner
  action. This prevents future real main data from leaking into demo.
- No migration of the application schema and no change to the existing `is_demo` columns.
- No automatic deletion of main cars, enquiries, photos, PDFs, taps or activity.
