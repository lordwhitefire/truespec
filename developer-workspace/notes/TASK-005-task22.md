# TASK-005 · Task 22 — an empty area says it once, then the one next action

**Date:** 2026-10-18 · **Outcome:** done. **Deps:** —.

## What changed

`components/site/InventoryBrowser.tsx` — two strings; the sourcing promise now lives in one place:

- **The empty block's message** (DR7/DR11): `Nothing here yet — tell me the car you're after and
  I'll source it in the USA.` → **`No cars match those filters. Tell me what you're after and
  I'll source it in the USA.`** — why it is empty first, then the one next action, sentence case,
  followed by the unchanged WhatsApp button.
- **The announcement** (`announce`): the zero branch wrote the whole promise **with an `<a>`**
  into `#speak`; it now writes the bare result — **`No cars match those filters.`** (DR8). With
  that, `announce` no longer reads `waSource` and its dependency list is `[]`. The link markup in
  the live region is gone with it.

No other file changed — the office's empty wording stands, untouched (statement 14; `04-designer.md`
B1).

## The rulings followed

- **DR7/DR11** (`design-workspace/decisions/TASK-005-ux-rulings.md`): the list's own empty block
  keeps exactly one message — *"No cars match those filters. Tell me what you're after and I'll
  source it in the USA."* — followed by the WhatsApp button; the second copy of the promise is
  removed from the page.
- **DR8**: the `#speak` region announces the bare result only — *"No cars match those filters."* —
  and does not repeat the sourcing promise.
- **Statement 14** (`openspec/tasks/TASK-005/task.md`): why it is empty first, then the one next
  action; the same statement is not made twice on one screen.

## Live readings — signed in, read-only (no writes; the store untouched)

`empty-result.mjs`; readings `runs/task22/before.json` / `after.json`. Chrome 3 → 3, no launch.

| reading (over-filtered to zero via `#pmin`) | before | after |
|---|---|---|
| promise printings on the screen | **2** — `#speak` **and** the empty block | **1** — the empty block |
| `#speak` text | "Nothing matches those filters. Tell me what you're after and I'll source it in the USA." — **with a link** | **"No cars match those filters."** — no link |
| empty block | "Nothing here yet — tell me the car you're after and I'll source it in the USA." | **"No cars match those filters. Tell me what you're after and I'll source it in the USA."** |
| heading `#ttl` · count `#cnt` | 0 MATCHING CARS · 0 OF 19 CARS | unchanged |
| clear control | `#clr` in the filter panel, only | unchanged |

**Office byte-identical:** the `office` sections of `before.json` and `after.json` are **identical**
(JSON diff): count "0 of 25 cars match", empty "No cars match. Clear the search or pick another
state." + "Clear filters". No office file is in the diff.

## Verification

`npm run typecheck` clean · `npm test` **295/295** · drive `empty-result.mjs` · readings
`runs/task22/before.json` / `after.json` · no Chrome launched by the drive.

## Honest notes

- The drive over-filters through the price field (`#pmin` = 999999999) so the announcement fires
  on a real filter change; the readings above are from that state.
- The heading ("0 MATCHING CARS"), the count ("0 OF 19 CARS") and the clear control ("`#clr` in
  the filter panel, only") were read **before** this change too and were already honest — that is
  Task 24's ground, recorded here so the two tasks' claims do not blur. This task touched neither.
- The drive also captured the pre-fix state of the region and the heading's live role for
  **Task 23** (`#speak`'s display and accessibility-tree node at rest; `#ttl` carries
  `role="status"`). In dev, `#speak` shows "19 cars match — every price is the full doorstep
  price." at rest (React StrictMode runs the announce effect twice), so the at-rest *empty*
  region case is read from the car page in Task 23; recorded so the reading is not mistaken for
  a production truth.
- `waSource` remains in use by the empty block's WhatsApp button and the farewell modal; only the
  announcement stopped using it.
