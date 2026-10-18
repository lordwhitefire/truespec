# TASK-005 · Task 15 — the destructive action's words and order

**Date:** 2026-10-18 · **Outcome:** done. **Depends on:** 13.

## What changed

- **`app/office/(shell)/drafts/drafts-client.tsx`** — the draft delete confirmation now puts the safe
  way out first and the destructive action second, and the destructive action is named **"Remove for
  good"**, not "Delete draft": deleting a draft is the one deletion that cannot be undone (owner's
  ruling 2026-10-17, `research-plan.md:469`; the plan's approved dialog labels are "Delete" /
  "Remove for good", `plan:68`). Its pending label is "Removing…".
- **Nothing else needed changing.** Inventory and the car form already read `Keep it` → `Delete`
  (undoable, with the 8 s offer); the tombstone confirmation already reads `Keep it` →
  `Remove for good`; the enquiry detail has no destructive action at all (only state buttons), so
  none was invented.

The draft dialog's **question** and the card's **trigger** still read "Delete…" — they are the
pre-existing entry wording, not the confirmed action. The action the confirmation performs is now
named "Remove for good". If the owner wants the entry words changed too, that is new copy outside
the plan's approved slots; flagged, not invented.

## Live readings — every dialog with a destructive action

`destructive-labels.mjs`, live signed in. Read-only: every dialog was closed through its safe
control (or Escape); nothing was written. Button order is DOM order.

| screen | safe (first) | destructive (second) | destructive class | name / label |
|---|---|---|---|---|
| drafts | `Keep it` | **`Remove for good`** | `btn` (gold primary) | "Delete this draft?" |
| inventory | `Keep it` | `Delete` | `btn2 danger` | `#dlt` "Delete this car?" |
| car form | `Keep it` | `Delete` | `btn2 danger` | `car-del-title` "Delete this car?" |
| enquiry detail | — | — (no destructive action) | — | `#dtitle` "Enquiry" |
| tombstone (source; no live rows) | `Keep it` | `Remove for good` | `btn2 danger` | inline confirmation, no dialog |

The draft trigger in the footer reads `Delete`; the dialog's `×` comes before the two actions in DOM
order (the platform's Close control, not an action choice).

- **Drafts**: buttons 1 → `Keep it` (`btn gh`), 2 → `Remove for good` (`btn`). Its
  `deleteDraftAction` → `deleteDraft` is permanent and the result toast offers no undo — the words
  now match the write.
- **Inventory** and **car form**: `Keep it` then `Delete` (`btn2 danger`), both backed by the
  tombstone + 8 s undo offer.
- **Enquiries**: the detail dialog's buttons are `Close` and the five state buttons (`New`,
  `Talking`, `Negotiating`, `Sold`, `Lost`); there is no delete action to name or order.
- **Tombstones**: the live store currently holds **no** tombstones (25 live cars, none deleted), so
  the section is absent (`sections: 0`). Its source is `Keep it` → `Remove for good`, permanent, with
  no undo; Task 12's live run already exercised the removal on a throwaway (net-zero 25 → 25).

## Honest notes

- **The entry words are not the action words.** The draft card's trigger and the dialog's question
  still say "Delete"; only the confirmation action says "Remove for good". This is the minimal
  change the AC asks for and uses only the plan's approved labels. Renaming the trigger/title would
  be copy the owner has not approved; raised in the report.
- **The permanent draft button is gold (`.btn`), not red (`.danger`).** It is visually distinct from
  the ghost `Keep it`, and it is the primary action; no style change was made because the task is
  about naming and order. The tombstone's permanent action is red (`.btn2 danger`).
- **No live tombstone was created** for this task: the source read plus Task 12's live removal is
  the witness for that action; creating and clearing another throwaway would repeat a write this
  task does not change.
- The dialog's `aria-label` (not `aria-labelledby`) supplies "Delete this draft?"; the reading script
  looked for `aria-labelledby`, so its `label` field is null for drafts. Task 14's accessibility-tree
  reading already recorded the name.
- The drafts dialog's pending label changed from "Deleting…" to "Removing…" so the temporary state
  speaks the same verb as the action.

## Verification

`npm run typecheck` clean · `npm test` **295/295** · drive `destructive-labels.mjs` (readings in
`runs/destructive-labels/readings.json`) · no Chrome launched (6 → 6).
