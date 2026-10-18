# TASK-005 · Task 18 — the dead Search control goes

**Date:** 2026-10-18 · **Outcome:** done. **Deps:** —

## What changed

`components/office/OfficeTopbar.tsx` — the phone top bar's search button
(`aria-label="Search (UI placeholder)"`, a `<button>` with no handler) is gone. With it gone, the
`/office` branch and the "any other route" branch showed the same settings link, so the ternary is
now `pathname === "/office/settings" ? dashboard : settings` — same icon on every route as before,
one fewer branch. The header comment says where search actually lives: the keyword fields on
Inventory and Activity, not a control here that did nothing.

**`office.css` needed no change** (the plan's Files line named it). Nothing in it targeted the
placeholder; `.ico` is shared by the remaining links (settings/dashboard, and the owner's tap
notice), so there was no style left behind to remove.

## Owner-dirty file — hunk-selective commit

`OfficeTopbar.tsx` was owner-dirty (uncommitted `TapNotice` import, prop, comment and element; the
dev tree renders it). The commit stages a **constructed blob**: HEAD's file with only the Task 18
change applied (`git hash-object -w` + `git update-index --cacheinfo`). The owner's TapNotice hunks
stay uncommitted in the working tree — verified by reading the index diff (Task 18 only) and the
worktree-vs-index diff (owner's TapNotice only). The live verification below therefore ran against
the working tree, whose top bar also carried the owner's taps link; that link is a real `<a>` with a
destination, and the no-search / no-inert-control reading holds either way.

## Live readings — 375×812, signed in, read-only

`topbar-search.mjs`; readings `runs/task18/readings.json`. Viewport restored; no store writes;
Chrome 6 → 6 (attach-only).

| route | top bar controls (all `<a>`, each with `href`) | search present |
|---|---|---|
| `/office` | Settings → `/office/settings` · WhatsApp taps → `/office/enquiries?tab=taps` | no |
| `/office/inventory` | Settings · WhatsApp taps | no |
| `/office/activity` | Settings · WhatsApp taps | no |
| `/office/settings` | Dashboard → `/office` · WhatsApp taps | no |

Every control in `.topbar` is an anchor with a non-empty destination (`allReal=true`); nothing in
it `searchish`; the brand is a `<span>`, not a control. The top bar is `display:flex` at this width.

Search still lives where it filters, both driven live and cleared after:

- **Inventory** — `#count` *“25 cars — 24 in stock, 1 sold”*; fill `#q` `TS-1001` → **1** card
  (*“TOYOTA CAMRY XSE V6 2021 TS-1001 · 31,000 km …”*), the desktop table still `display:none` at
  375; clearing restored the card list.
- **Activity** — `#count` *“80 entries — newest first”*; fill `#q` `removed` → *“**12** of 80
  entries match”*; clearing restored the log.

## Honest notes

- The readings are from the working tree (owner's TapNotice present and rendered). The committed
  top bar is the same screen minus the taps link; the Task 18 assertion is about the search control
  being gone and nothing inert remaining, which the committed shape also satisfies (one anchor:
  settings or dashboard).
- The AC says “no control in the top bar looks pressable and does nothing”. The check is structural:
  every `.topbar` control is an `<a href>`. It does not click each destination; the settings and
  dashboard links are on their normal routes, and the owner's taps link is real.
- Nothing was added in search's place — no replacement field, no move; the inventory and activity
  fields were already the search.

## Verification

`npm run typecheck` clean · `npm test` **295/295** · drive `topbar-search.mjs` (PASS) · readings
`runs/task18/readings.json` · no Chrome launched.
