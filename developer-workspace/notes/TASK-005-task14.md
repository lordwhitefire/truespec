# TASK-005 · Task 14 — focus, scroll, name, Escape

**Date:** 2026-10-18 · **Outcome:** done. **Depends on:** 13.

## What changed

Task 13 made every confirmation a native `<dialog>` + `showModal()`, which already buys the trapping,
the Escape, the top layer and the focus restore. This task closes the four gaps that the platform
does not cover on its own, and proves the rest live.

- **`components/office/Dialog.tsx`** — the page behind is locked while the dialog is open. The office
  pages have no shared sheet, so the lock is `document.body.style.overflow = "hidden"` and the
  previous inline value is restored on close. (The showroom already locks through `body.lock`.)
- **`app/office/(shell)/inventory/inventory-client.tsx`** and **`car/car-client.tsx`** — their own
  window-level `keydown` Escape listeners are gone. The native dialog's `cancel` is now the one
  Escape path; the old listeners could close a dialog that the platform had already closed.
- **`app/office/(shell)/enquiries/enquiries-client.tsx`** — the enquiry card's Enter branch now calls
  `ev.preventDefault()`. Without it the browser's Enter default activated the control the dialog had
  just focused (the Close ×), so the dialog opened and closed in the same keystroke (below).
- **The showroom needed no edit for this task.** Task 13's conversion left focus entry/return,
  `Escape` and the `body.lock` to the platform; the drive verified all three screens.

The plan's Files line for Task 14 named `Dialog.tsx` plus the three showroom files. The showroom
files needed nothing beyond Task 13 (and were verified); the edits actually needed were in the
office inventory/car clients (not listed) and the enquiries card (not listed). The AC governs.

## Live readings — all seven screens

`focus.mjs`, live and signed in, keyboard for the office four (focus the opener, press Enter) and
each showroom screen through its own exit-intent gesture after its dwell. Read after the platform's
focus fixup.

| screen | first focus | page controls reached | body stops | body overflow before → open → after | wheel | focus after close | open dialogs | accessible name |
|---|---|---|---|---|---|---|---|---|
| office inventory | `BUTTON#no` (Keep it) | 0 | 3 | visible → hidden → visible | y 0 → 0 | `BUTTON` · opener | 1 → 0 | Delete this car? |
| office car form | `BUTTON` (Keep it) | 0 | 3 | visible → hidden → visible | y 0 → 0 | `BUTTON#delBtn` · opener | 1 → 0 | Delete this car? |
| office drafts | `BUTTON` (Close) | 0 | 2 | visible → hidden → visible | y 0 → 0 | `BUTTON` · opener | 1 → 0 | Delete this draft? |
| office enquiries | `BUTTON` (Close) | 0 | 0 | visible → hidden → visible | y 0 → 0 | `ARTICLE` · opener | 1 → 0 | Enquiry |
| showroom home | `BUTTON#mx` (Close) | 0 | 2 | hidden auto → hidden → hidden auto | y 0 → 0 | `A` · last focus | 1 → 0 | Before you go |
| showroom car | `BUTTON#mx` (Close) | 0 | 2 | hidden auto → hidden → hidden auto | y 0 → 0 | `A` · last focus | 1 → 0 | Before you go |
| showroom inventory | `BUTTON#mx` (Close) | 0 | 2 | hidden auto → hidden → hidden auto | y 0 → 0 | `A` · last focus | 1 → 0 | Before you go |

The Tab tours (one press per reading):

```
office inventory : #no → #yes → BODY → #no → #yes → BODY → …
office car       : Keep it → #delYes → BODY → Keep it → #delYes → BODY → …
office drafts    : Close → button → button → BODY → Close → …
office enquiries : Close → A#dPhone → button → button → button → … (eight focusables; no edge reached)
showroom ×3      : #mx → link → button → BODY → #mx → …
```

- **The `BODY` stop is the platform's own cycle, not a leak.** Chrome's native modal dialog walks
  `control → control → document body → first control`. A minimal two-button `<dialog>` with buttons
  and controls outside it, driven in the same browser, produced the identical
  `BUTTON#a → BUTTON#b → BODY → BUTTON#a`; the outside buttons were never reached. `pageControls = 0`
  on every screen: no page control behind the dialog ever took focus during the tours.
- **Escape closes exactly that dialog and nothing else.** Each Escape took `open dialogs` 1 → 0,
  left the URL unchanged, put focus back on the opener (the enquiry card included), and a second
  Escape changed nothing — same URL, same active element, no dialogs.
- **Scroll is held.** `body` computed `overflow: hidden` while open on all seven; a 900 px wheel
  left `window.scrollY` at 0. After close the office body was `visible` again and the showroom body
  returned to `hidden auto` (its normal overflow-x rule). The native `close` event is queued, so the
  reading was taken 500 ms after the dialog left the screen.
- **The name is in the accessibility tree.** `ariaSnapshot()` of each open dialog begins
  `dialog "Delete this car?" / "Delete this draft?" / "Enquiry" / "Before you go"` — the name the
  root `<dialog>` gets from `aria-labelledby`.

## The Enter bug found live

Before the fix, focusing an enquiry card and pressing Enter opened the detail dialog and closed it
22 ms later. The dialog's own event log: `open-attr=true@7322`, `open-attr=false@7344`,
`close@8165`. The card's `onKeyDown` opens the dialog during the keydown; the browser then ran the
same Enter's default action against the element focus had just moved to — the Close button — so the
newly opened dialog was dismissed by the keystroke that opened it. `ev.preventDefault()` in the
card's Enter branch stops that default; the dialog now stays open, and Escape returns focus to the
`ARTICLE` card. (Native buttons do not have this problem: their click is the default action, so
there is no second activation after the dialog opens.)

## Honest notes

- **No screen reader was used.** The name was read from the accessibility tree (`ariaSnapshot`),
  which is what the plan's Verify asks for; no claim is made about a particular screen reader's
  speech.
- **The showroom dialogues have no keyboard opener.** They are opened by the site's own welcome /
  exit-intent paths (a timer or a real mouse-leave after the dwell), so the keyboard path starts at
  their first control (`#mx`). Their first focus, trap, Escape and restore are all read.
- **The home screen's dialogue was opened by the exit-intent path**, not the first-visit welcome —
  both open the same `<dialog id="ovl">`; the keyboard behaviour is the element's.
- **`app/office/(shell)/enquiries/enquiries-client.tsx` is owner-dirty** (the owner's uncommitted
  header/tab work). Only my `preventDefault` hunk was staged, through a blob built from HEAD; the
  owner's hunks remain uncommitted in the working tree.
- The first focus reading is taken after `showModal()` fixes focus; the later fingerprint's
  `active: BODY` is simply where the Tab tour ended, not the state at open.
- `focus.mjs` retries a screen once after a 5 s wait when the server answers 5xx — the live store was
  intermittently unreachable during the session (Neon connect timeouts). The readings in this note
  are from the run where all seven screens passed; the retry is recorded only in the script.
- Chrome was not launched (6 → 6); the attached browser was used.

## Verification

`npm run typecheck` clean · `npm test` **295/295** · drive `focus.mjs` (readings in
`runs/focus/readings.json`) · no Chrome launched (6 → 6).
