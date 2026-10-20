# TASK-005 — Testing the experience layer (UX, Layer 5 of 6)

**Written 2026-10-17.** This file is written for a session that did **not** build the work. Nothing here is taken
on trust from the build report; every claim below is re-established from the running application, from the store,
and from the responses it returns. A build report saying "the bar drains" is not evidence the bar drains.

**Owner's ruling (2026-10-13):** the separate testing pass is run **once, at the end, when everything is built** —
so these checks join the deferred final test rather than running when this layer closes. They still belong to this
layer, and the final test must account for each group. Do not run them against a half-built layer and do not
report them as passed before the end.

---

## Before you start

**Read `task.md` in this folder.** It holds the twenty-nine "what must be true" statements (grouped A–I), the
constraints, the seven logged conflicts, and the answers to the four questions this layer put to the owner. This
file checks **those**, not a memory of them. Each group below names the statements it checks by number.

**The runtime discipline is a procedure, not a suggestion** (`developer-workspace/procedures/browser-check.md`):
attach only to the one persistent Chrome on CDP `:9222` — never launch a browser, never run headless, never take a
screenshot; the build is on `:3210` and the reference on `:3211`; port `3000` is never used; detach when you are
done.

**The store is live and holds the owner's real data.** Every write you make must be throwaway or net-zero, and
anything you create carries the demo marker. **One check needs a real deletion** (group 1, the end of the undo
window) — do it on a throwaway demo car: one the owner has agreed may be lost, or one you create for the purpose
and delete through the check itself (net-zero: created → exercised → permanently gone). Never a real car. Any
residue the store keeps from the exercise — an activity entry, say — is reported at the end, not silently left.
If neither car is possible, **that check is blocked, and you say so** — you do not substitute a real car, and you
do not report the group as passed on a partial run. A run the build session made on its own throwaway car is
corroboration, not this group — the group runs here, by you.

**Two things here need a person, not an agent.** Group 17 (the first-time-visitor walk) and every "does it read
right" judgement. An agent already knows where everything is, so an agent cannot answer group 17 about itself; it
needs someone who has not used the app. Say plainly which checks a person ran and which you ran.

**What is measured, not remembered.** The numbers a group relies on — the 8000 ms window, the 215 ms row
departure, the 1227 ms arrival — are recorded in `findings/05-runtime-observations.md` §R2.3 §6. If a number no longer
matches, that is itself a finding: report it, do not adjust the expectation to fit what you see.

---

## Group 1 — The undo offer is true (statements 5, 6, 7, 8)

**What this checks:** that the offer lasts what it claims, that the time passing is visible, and that the end of
the window does what it says.

**How you will know it passed:**
- Delete a demo car. The offer appears carrying **a bar that is full**, and that bar is visibly **less full
  halfway** through the window and **empty** as the window ends. Watching it is the check — a bar that appears and
  disappears without shrinking fails even if the timing is right.
- The bar's motion does not push anything on the screen sideways or reflow the row; measure it if it is close (it
  must not animate the `width` property).
- The offer is still operable **at the end of the window minus a beat** — press Undo at ~7 s and the car comes
  back, verified by a **reload and a store read**, not by the optimistic screen.
- With reduced motion asked for at the OS level, the bar is replaced by a static **"8 s"** and the offer still
  closes at eight seconds.
- **The end of the window (blocked without a car that may be lost):** let the offer run out untouched. The offer
  goes, the row does not reappear, and after a reload the car is **gone** — a permanent deletion, not a hidden row.

**What fails this group:** the bar is a decorative animation that does not correspond to the window; the bar
animates its width and reflows the list; two independent timers disagree (the offer is closable at one moment and
the undo lands at another); reduced motion removes the measure without giving the static label; the window's end
restores the car, or leaves it in a state the store disagrees with. **And: reporting the last bullet as passed when
no safe car existed to lose.**

---

## Group 2 — A save reports what actually happened (statement 1)

**What this checks:** that "Saved" is earned, and that a no-op says so.

**How you will know it passed:** open a car, change nothing, save. The screen says, in words, that **nothing
changed**. Change one field, save. The screen reports **success**, and a reload shows the change persisted. Neither
message claims anything the store did not do.

**What fails this group:** an unchanged save reports success; an unchanged save reports an error; the two outcomes
produce the same message; or the changed save reports success while the reload shows nothing persisted.

---

## Group 3 — No control is inert while looking live (statement 2)

**What this checks:** that nothing on any screen looks pressable and does nothing — the fault this layer exists to
remove.

**How you will know it passed:**
- Walk every screen and press everything that looks pressable. Every press does something, or the control is
  visibly off (group 13 covers the "off" case for the chat controls). The office top bar carries **no** control
  that does nothing; keyword filtering is found where the office already has it — on inventory and on activity —
  and both filters actually filter.
- The car form's delete either **really deletes** — the car is gone after a reload, and the same undo offer the
  inventory's delete gives is offered — or it is **absent from the screen**. There is no third state where it
  promises a deletion it does not perform, and **no "(demo)" wording survives anywhere.**

**What fails this group:** the Search control is still in the top bar doing nothing; the car form's delete still
reports a deletion that did not happen; the car form's delete deletes without offering the undo the inventory's
does; any other control on any screen looks live and is not.

---

## Group 4 — A failed write is reported as a failed write, in place (statement 3)

**What this checks:** that a write failure reaches the person as their action's failure, not as the store's.

**How you will know it passed:** make a write fail — take the store unreachable **while the office is already
open and working** (the connection, not the app, is what you break). Attempt a delete, or a save. What the person
sees is a message **about the thing they were doing**, in that action's own words — the code's own
"That car could not be deleted." is a good example of the register — and **the office chrome is still there**: the
sidebar, the top bar, the page they were on. The store being unreachable is **not** the message.

**What fails this group:** the failure arrives as the store-unreachable state; the whole office shell is replaced
by a full-page message; the office chrome is lost; the message is a generic load error rather than that action's
own words; or the message claims "nothing was lost" where that has not been established.

---

## Group 5 — The record names what happened (statement 4)

**What this checks:** that one word is not covering two different actions.

**How you will know it passed:** delete a car and undo it. The activity record names the event as a
**restoration**, not as a deletion. Any count that summarises events agrees with the names it summarises — a
restored car is not counted as deleted.

**What fails this group:** a restored car appears in the record under the word "delete"; a count includes a
restoration as a deletion; or two opposite actions produce indistinguishable records.

---

## Group 6 — Every dialog behaves the same way (statements 9, 10)

**What this checks:** the four dialog properties, on every dialog the app has.

**How you will know it passed:** for **each** dialog (the delete confirmations, the draft delete, the More sheet,
any other): focus lands **inside** the dialog when it opens, at its first safe control; `Tab` cycles within it and
never reaches the page behind; Escape closes **that** dialog and **nothing else** (no second overlay, no
navigation); focus returns to **the exact control that opened it** when it closes; the dialog has a name an
assistive-technology user hears; and the page behind does not scroll while it is open. Where the implementation
uses the platform's own modal dialog element, the name is still supplied — a native modal with no accessible name
fails this group.

**What fails this group:** any dialog leaks focus to the page behind; Escape closes the wrong thing or nothing;
focus does not return, or returns to the top of the page rather than the control that opened it; a dialog has no
accessible name; the page scrolls behind an open dialog.

---

## Group 7 — Destructive actions are named and ordered consistently (statement 11)

**What this checks:** that the words on the buttons match what the buttons do.

**How you will know it passed:** everywhere a destructive action is confirmed, the **safe action comes first** and
the destructive second. An action that can be undone is called **"Delete"**. **"Remove for good"** appears only
where the action genuinely cannot be undone — and deleting a draft is one of those places, while deleting a car
from the inventory is not. No screen offers an undo for a draft deletion.

**What fails this group:** a destructive action is first in the order; "Remove for good" is used for something
undoable; "Delete" is used for something permanent with no signal; a draft deletion offers an undo it will not
honour.

---

## Group 8 — Focus survives a removal and a refusal (statements 12, 13)

**What this checks:** where the caret goes after the list changes under the person, and after a form refuses.

**How you will know it passed:** delete a row with a keyboard and no mouse — focus is on the **equivalent control
of the next row**, not lost to the page top and not stranded on nothing. Delete the **last** row — focus is on the
list's heading. Submit a form with a bad field — focus is on the **first invalid field**; where the refusal is
form-level rather than field-level, focus is on the form's **error block**. Tapping outside a dialog closes the
non-destructive overlays (the More sheet, any light overlay) — but **never** closes a confirmation.

**What fails this group:** focus is lost to the document on a row deletion; focus lands on a heading when a next
row exists; a refused save leaves focus nowhere useful; a tap outside dismisses a destructive confirmation.

---

## Group 9 — Empty states and the honest count (statements 14, 16, 17)

**What this checks:** that an empty screen says why and what next, exactly once, and that the count is not a lie.

**How you will know it passed:** on the showroom inventory, filter to nothing. The empty block says **why it is
empty, then the one next action**, in sentence case — and says it **once**; the same promise is not printed twice
on the one screen. The count reads the honest count, including **"0 matching cars"**. "Clear all filters" is in
the filter panel only, not duplicated beside the empty block. **The office's existing empty wording is unchanged**
— compare it against what is there today; if it has been rewritten, that is a failure regardless of whether the
new words are nicer. A refusal anywhere keeps the field's own wording rather than being flattened into house
style.

**What fails this group:** the empty promise appears twice on one screen; the count hides the zero or rounds it
into a vague phrase; "Clear all filters" is duplicated; the office's empty wording has been rewritten; a refusal
loses the words it is quoting.

---

## Group 10 — The live result is announced once (statement 15)

**What this checks:** that a screen reader hears the result once, and that the region it hears it from was
already there.

**How you will know it passed:** on the screen that announces a result (the showroom inventory's filter result),
the live region **exists in the accessibility tree before the result changes** — inspecting the tree while the
filter is untouched still shows the region. When the result changes, the announcement carries **the bare result**
and **not** the promise that follows it (the "if nothing matches, widen your search" style sentence is screen
text, not announcement text). The result's **heading is not a second live region** — one result does not produce
two announcements.

**What fails this group:** the region is absent from the tree until the moment it speaks; the announcement
includes the trailing promise; the heading is also armed as a live region and the result is announced twice.

---

## Group 11 — A car with no photos, and a photo that failed (statements 18, 19)

**What this checks:** both paths land in the same framed box, with no machine text, and the box looks like a
photo.

**How you will know it passed:**
- Open a car with **no photos**. The gallery shows the **framed box**, with **no counter, no arrows, no
  thumbnails**, and **no machine text** — never `undefined`, never `NaN`, never "1 / 0".
- Open a car whose photo **fails to load** (break the image response before the page is hydrated — the case Phase 2
  found never swapped). It lands in the **same box** the no-photo car used.
- Open a car with **exactly one** photo: it reads **"1 / 1"** and has no arrows.
- The box is a **gradient of different colours** — not a flat grey. It is the **same colours for the same car** on
  a second visit and after a reload. It **does not animate or shimmer**. It occupies **the same shape and size a
  real photo would**, so the layout does not shift between a photographed car and an unphotographed one. It is
  **decorative** — an assistive-technology pass does not stop on it, because the car's name is already beside it.

**What fails this group:** the broken-at-load path is not detected and shows a broken image or the machine text;
the box shimmers or animates; the gradient differs between two visits to the same car; the box is a different size
from a real photo and the layout jumps; the box is announced to assistive technology; the single-photo car shows
arrows.

---

## Group 12 — The narrow-width office, and the showroom's chrome (statements 20, 21, 22)

**What this checks:** the More sheet at ≤820px, and that one piece of chrome behaves the same way everywhere.

**How you will know it passed:** at a width at or under **820px**, the office's **More** cell opens a sheet
holding exactly **Drafts, Activity log, Settings** — in sidebar order and sidebar wording. The cell **lights up**
on all three destinations, and inside the sheet the **matching row is marked as the current page**. It is a real
control carrying an expanded state. The sheet takes focus, returns it on close, and closes on **Escape, a tap
outside, and a choice**. Its icon reads as **"more things"**, not as Settings. On the **showroom**, the nav chat
control is **hidden at ≤820px on every showroom page** — check a car page, the home page and the inventory, and
find the same behaviour at the same width. Per-width behaviour follows the spec's precedent: touch is served by
swipe, pointer by arrows, a laptop by both.

**What fails this group:** More opens a sheet missing one of the three or holding something else; the cell does
not light up on a path, or the current row is not marked; the sheet does not take or return focus; the chat
control is hidden on some showroom pages and kept on others at the same width; the icon is a gear.

---

## Group 13 — The contact number, and a control that is off (statements 23, 24)

**What this checks:** FIX-001 — the invented number — and the ruling that a missing number greys the controls
rather than hiding them.

**How you will know it passed:** with **no WhatsApp number saved**, search every surface for a number the owner
did not enter. **None appears** — not in the site header, not on the site-wide not-found page, not on the car
page's not-found view, not in the privacy notice. No link is built to a recipient that does not exist: the car
page's WhatsApp link is not a link to nobody. Every chat control — the nav chat control, the floating control, the
car page's bar, the footer's — **stays on the screen** and is **visibly switched off**: greyed, clearly off,
understood as off, and **not** a live-looking control that does nothing. Now save a real number and confirm every
one of those controls comes alive and points at the saved number.

**What fails this group:** any invented number survives anywhere; the car page still builds a WhatsApp link to a
non-existent recipient; a chat control is **hidden** rather than greyed; a chat control looks live while the
number is missing; saving a real number does not bring the controls alive.

---

## Group 14 — The retryable state, and the boundaries (statement 25)

**What this checks:** that an unreadable store is reported as an unreadable store — not as emptiness, not as a
number — and that the boundary arrangement is the one that was decided.

**How you will know it passed:** make a **page's own read** fail while the shell is fine. The office chrome
(sidebar, top bar) **stays**, and the retryable state appears **where the person is**, with the retry control.
Make the **shell's** read fail (the session check) and confirm the boundary that catches the office shell still
catches it, and the one above the showroom still catches the showroom's — **neither boundary has been removed**.
Nowhere does an unreadable store present as **empty** ("no cars") or as a **false number**. The wording follows
design D18 and truth 16; check it against the final copy, not against the placeholder strings.

**What fails this group:** an unreadable store shows an empty list or a zero count; a read failure wipes the
office chrome; a boundary has been removed so the case it existed for is now lost; the message is the interim
placeholder rather than the settled copy.

---

## Group 15 — Waiting, and offline (statement 26)

**What this checks:** the two states that do not exist today — a slow store, and a dropped connection.

**How you will know it passed:** slow a soft navigation (the store responding slowly, with the app already
loaded) and the screen shows **that something is happening** rather than sitting still. Drop the connection and
**click** — the person **stays inside our product**; they are not handed to the browser's own error page with our
chrome gone. Both states read as ours, in settled copy.

**What fails this group:** a slow navigation sits still with no sign of activity; an offline click produces the
browser's own error page; either new state is missing.

---

## Group 16 — The not-found family (statements 27, 28, 29)

**What this checks:** the three placements of "not found", kept apart on purpose.

**How you will know it passed:**
- Follow a **dead car link**. The page answers with a **404 status** (check the response, not just the screen) and
  keeps its helpful view and the site chrome, with its ways forward. The view itself is unchanged from what it
  was — only the status was wrong.
- Open an **unknown `/office/…` address**. It lands **in the office** — office words, office chrome, a way back to
  the dashboard — and not in the shop front.
- Open an unknown address **outside** the office. The site-wide not-found page keeps the shape it was built with;
  it is not reshaped to match the others.

**What fails this group:** a dead car link answers 200; the car's not-found view has been redesigned rather than
re-statused; an unknown office address lands in the shop front; the site-wide not-found has been merged or
reshaped.

---

## Group 17 — What a first-time visitor experiences (Q-003; needs a person)

**What this checks:** the layer's whole point — whether the experience makes sense to someone who has not used
the app. **This group requires a person who has not seen the product.** An agent cannot run it about itself.

**How you will know it passed:** put the app in front of such a person, with no coaching. Their answers to the
five questions in `findings/questions.md` Q-003 are recorded **in their words**, and the answers describe a
journey they could complete. Any place they hesitate is recorded as an observation, not explained away.

**What fails this group:** the walk is run by someone who already knows the app and reported as if it were a
first visit; the five answers are paraphrased into the expected answer; a hesitation is recorded but dismissed.

---

## Group 18 — The rules that were not to be broken (the constraints)

**What this checks:** that making the experience true did not add something the specs forbid.

**How you will know it passed:** none of the following exists anywhere in the product — no manual **Refresh**
control (SD1); no separate **alert, popup or sound** for taps (SD2); no in-app **password reset** (SD3); no
**exchange-rate** field (SD4); no **price on a state** (SD5). Failure and attention wording uses **gold + icon +
words**, never colour alone. Nothing was invented (SD6), silently dropped or silently zeroed (SD7), or hidden
(SD8). And the change-check is still made by the **server**, never read from the browser.

**What fails this group:** any forbidden control appears; a failure is signalled by colour alone; a value is
invented, dropped or zeroed; a browser-supplied change-check is trusted.

---

## Group 19 — The copy is final and honest (the ruled strings, and the machine-text rule)

**What this checks:** that the wording ruled to stay has stayed, that nothing was improvised into its place, and
that no screen shows machine text.

**How you will know it passed:** the store-waking words and the read-failure retry words — the two quoted in
`findings/05-runtime-observations.md` §R2.5 — are **the words on screen**, unchanged (both are on the
do-not-touch list, `04-designer.md` Part D, and must not have been "improved"). The copy on the new states (the
waiting sign, the offline screen, the office not-found) traces to wording that was **supplied** — recorded with
the build — not improvised at the keyboard. No screen anywhere shows `undefined`, `NaN`, `null`, `{}`, or a raw
identifier where a word belongs. No figure is shown that the owner did not enter, and no count is shown that the
store did not produce.

**What fails this group:** either of the two ruled strings has been replaced or reworded; copy on the new states
is not traceable to a supplied source; machine text appears on any screen; a figure or count appears that has no
source in the store.

---

## What must be handed back

- Which groups you ran, and which you did not, **with the reason**.
- Which checks a **person** ran (group 17, and every "does it read right" judgement) and which an **agent** ran.
- The status of the one check that needs a car safe to lose (group 1, last bullet) — ran, or blocked, and why.
- Every number you re-measured (the window, the row's departure, the offer's arrival) and whether it still
  matches §R2.3 §6.
- Every place a check failed, in the failing screen's own words — **quoted, not paraphrased** — with the state and
  the width at which it failed.
- Any check you could not run, said plainly. **A group you did not run is not a group that passed.**
