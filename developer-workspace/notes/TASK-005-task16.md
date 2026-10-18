# TASK-005 · Task 16 — a tap outside closes only what is not a confirmation

**Date:** 2026-10-18 · **Outcome:** done. **Depends on:** 13.

## What changed

The temporary `dismissOnBackdrop` debt from Task 13 is settled as one rule, encoded in the component:
**a confirmation never closes on an outside tap; a non-destructive dialog opts in.** The prop keeps
its name, but its default is `false`, so a new confirmation cannot close by accident.

- **`components/office/Dialog.tsx`** — the prop's comment states the rule; no behaviour change for
  the default (a dialog without the prop ignores outside taps).
- **`app/office/(shell)/inventory/inventory-client.tsx`** and **`car/car-client.tsx`** — the
  `dismissOnBackdrop` prop is **removed** from their delete confirmations. Those were the two
  destructive callers that kept the old outside-tap close (Task 13's temporary debt).
- **`app/office/(shell)/enquiries/enquiries-client.tsx`** — the enquiry **detail** is
  non-destructive, so it now **opts in**: an outside tap closes it. It previously ignored one.
- **`app/office/(shell)/drafts/drafts-client.tsx`** — no change: its delete confirmation already had
  the default (no outside close).
- **The showroom needed no change.** Its three dialogues are non-destructive and already close on a
  tap on the dialog itself (`InventoryBrowser`'s `onClick`; `HomeBehaviors`/`CarBehaviors` compare
  `e.target.id === "ovl"`). Verified live, not assumed.

## Live readings — phone width, 375 × 812

`tap-outside.mjs`, live signed in. The tap is a real mouse click at **(6, 6)**, on the dialog's dim
area outside `.mdl` (`elementFromPoint` read `DIALOG#ovl` / `DIALOG#ovlD` at that point). Destructive
dialogs were then closed through their safe control; nothing was written.

| screen | kind | open | outside tap | safe control | focus after close |
|---|---|---|---|---|---|
| office inventory | destructive | true | **kept open** (1 dialog) | closes | `BUTTON` opener |
| office car form | destructive | true | **kept open** | closes | `BUTTON#delBtn` opener |
| office drafts | destructive | true | **kept open** | closes | `BUTTON` opener |
| office enquiry detail | non-destructive | true | **closed** (0 dialogs) | — | `ARTICLE` opener |
| showroom inventory offer | non-destructive | true | **closed**, unmounted | — | `BODY` (no click opener) |
| showroom home offer | non-destructive | true | **closed** | — | `BODY` |
| showroom car offer | non-destructive | true | **closed** | — | `BODY` |

- The page behind was locked on every screen while the dialog was open (`body overflow: hidden`).
  After the non-destructive closes the office body read `visible` and the showroom body returned to
  `hidden auto` (its normal overflow-x rule).
- The destructive dialogs stayed `:modal` after the outside tap (`dialogsOpen = 1`) and then closed
  through **Keep it**; focus returned to the control that opened them. They were not dismissed by
  the tap.
- At 375 px the inventory's desktop table is `display:none`; the phone screen is the `.ccard` list.
  The delete dialog was opened through the card's own visible `button.ab.del` (not the hidden table
  button) — the real phone path.

## Honest notes

- **The showroom's outside tap closes a non-destructive offer**, which is the rule; those three
  components were not edited in this task, only verified. The showroom **enquiry/offer is not a
  confirmation**: it asks for a car, it does not destroy anything.
- **The tombstone's "Remove for good" is an inline confirmation, not a dialog.** There is no
  outside surface to tap; it remains an explicit two-button choice. No change was needed.
- **The drafts' dialog element unmounts** when its state clears, so the reading after close reports
  `dialog: false, open: null` rather than `open: false`; `dialogsOpen = 0` is the settled reading.
- The enquiry detail had no outside-tap close before this task (the old div did not either); the
  rule is now applied to it because it is non-destructive. This is a small behaviour addition, not
  a regression.
- The `dismissOnBackdrop` prop is no longer "temporary"; it is the explicit opt-in for
  non-destructive dialogs. A destructive dialog that passes it would violate the rule — the safety
  is the `false` default, and the three confirmations are the proof.
- Chrome was not launched (6 → 6); the attached browser was used at an emulated 375 × 812 viewport,
  restored to 1440 × 900 afterwards.

## Verification

`npm run typecheck` clean · `npm test` **295/295** · drive `tap-outside.mjs` (readings in
`runs/tap-outside/readings.json`) · no Chrome launched (6 → 6).
