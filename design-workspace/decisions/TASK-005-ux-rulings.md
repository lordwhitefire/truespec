# TASK-005 — UX rulings for the TrueSpec car-dealership app

Author: Designer. Written for the Architect to read and turn into `findings/04-designer.md`.
Plain language on purpose: a reader who is not a designer should be able to act on every line.

Numbering note: these are **DR1…DR26** (Designer ruling). They deliberately do not reuse the
`design.md` D1–D21 or the findings SD1–SD28 numbers, so nothing collides when they are copied
across.

Scope note: these are **how things should look and behave**, not **what should exist**. Anything
about what exists — routes, data, whether a feature ships at all — belongs to the Architect and is
listed at the end as a question, not decided here.

Authority note: where `decisions/ux-implementation-plan.md` already ruled (the native `<dialog>`
direction, the 8-second undo window, the offline wording, and "an outside tap never closes a
confirmation"), these rulings stay consistent with it. Where the runtime observation framed
something differently from that plan, the plan wins and this document says so out loud.

---

## A. Office mobile "More" — the bottom bar cell (≤820px)

**DR1 — What the More cell opens.** It opens a short sheet that rises from the bottom bar. The
sheet holds exactly three rows, in sidebar order and sidebar wording:

1. Drafts (`fa-inbox`)
2. Activity log (`fa-list-check`)
3. Settings (`fa-gear`)

The bottom bar stays visible underneath the sheet (the sheet sits above it, not over it), and the
rest of the page dims behind a scrim.

Why: the "More" cell on a phone is where the three destinations the bar cannot fit must live. A
bottom sheet is the lightest thing that keeps the bar in view, so the visitor never loses the
office's main navigation while choosing among its leftovers.

Must not be used for: anything other than the three office destinations the bottom bar does not
already show. This is not a general menu, not a place for future features, and not permission to
move pages into it.

**DR2 — How the More cell behaves.** The cell becomes a real `<button>` carrying
`aria-expanded` and `aria-controls` pointing at the sheet. On open, focus moves into the sheet. It
closes on Escape, on a tap outside the sheet at the top edge, and on choosing a row. On close,
focus returns to the More cell. Focus is trapped inside the sheet while it is open. Motion is about
200ms ease-out; with reduced motion it becomes a plain fade with no travel; and on a soft keyboard
opening the sheet does not animate at all.

Why: the cell is a control, not a decoration, so it must report its own open state to assistive
technology and must give focus back where it came from. The reduced-motion and keyboard rules exist
because a rising sheet is exactly the kind of motion that harms people who asked their device to
stop moving things.

Must not be used for: describing the sheet as a modal dialog that replaces the page. It is a
navigation sheet, scoped to the bottom bar.

**DR3 — When the More cell looks active.** The More cell takes its active (`.on`) styling whenever
the current path is `/office/drafts`, `/office/activity`, or `/office/settings`. Inside the sheet,
the matching row is styled active and carries `aria-current="page"`.

Why: on a phone the bar cell is the only place the visitor can see "you are somewhere in here".
It must light up for all three, or the visitor loses orientation on three pages at once.

Must not be used for: highlighting More on office pages that are not one of those three.

**DR4 — The More cell's icon.** Use a neutral `fa-ellipsis` instead of `fa-gear`. The dead Search
button is removed (see the open owner question Q-001 on tablet navigation; the removal of a button
that does nothing is not conditional on that answer).

Why: `fa-gear` promises Settings. The cell opens three different things, so an ellipsis is the
honest icon. A gear would train the visitor to expect Settings and deliver something else.

Must not be used for: reintroducing the Search button as "not yet wired". A visible control that
does nothing is worse than no control.

---

## B. Photo-less gallery (the FIX-002 case)

**DR5 — A car with no photos.** Keep the framed drawn placeholder in the gallery. **Omit the photo
counter, the arrows, and the thumbnails entirely.** Never render the words `undefined`, `NaN`, or a
counter like "1 / 0".

A single photo keeps the counter reading "1 / 1" and has no arrows. More than one photo is
unchanged.

Why: a gallery of zero photos has nothing to count, nothing to step through, and nothing to
thumbnail. Rendering "1 / 0" or "undefined" tells the visitor the product is broken when it is
merely empty, and it does so on the page where trust matters most — a car they are considering.

Must not be used for: hiding the gallery block itself. The framed placeholder must stay, because
its absence would look like a layout bug and would give the visitor no signal about what belongs
there.

**DR6 — An image that is broken at load.** The placeholder must also cover an image that was
already broken when the page loaded — detect it with `img.complete && img.naturalWidth === 0`, not
only the "no photos" case. The placeholder's alt text names the car (for example, "Photos of the
2019 Toyota RAV4 coming shortly"), never "photo 1" or anything containing `NaN`.

Why: a missing file and an absent list produce the same broken picture for the visitor. Both must
land on the same calm placeholder, and the alt text must describe the car, because that is the only
thing the visitor can still understand from the image slot.

Must not be used for: treating a slow-loading image as broken. Only a genuinely failed load counts.

---

## C. Showroom duplicate empty message

**DR7 — One message survives.** The list's own empty block keeps exactly one message: "No cars match
those filters. Tell me what you're after and I'll source it in the USA." followed by the WhatsApp
button. The second copy of the same promise is removed from the page.

Why: the observation found the same sentence twice on one screen. Saying a thing twice does not
make it more true; it makes the page look like it does not know its own contents. The list's empty
block is the right home, because that is where the visitor is looking when they find nothing.

Must not be used for: keeping a promise in a second place "for safety". One promise, one place.

**DR8 — What the live region announces.** The `#speak` region announces the bare result only: "No
cars match those filters." It does not repeat the sourcing promise.

Why: `#speak` is a live region — it interrupts a screen-reader user mid-thought. It should carry
the fact that changed (the result count), not the sales pitch. The promise is on the page to be
read at leisure.

Must not be used for: announcing filter changes that did not change the result.

**DR9 — Heading and the way out.** The heading keeps reading "0 matching cars" (it is the honest
count). "Clear all filters" stays a single control, in the filter panel, not duplicated near the
empty block.

Why: the count and the recovery control belong where the visitor's attention already is — the
heading tells them the result, and the filter panel is where filters came from. Duplicating the
clear control near the empty block adds a second way to do one thing and muddies which one is
canonical.

Must not be used for: moving "Clear all filters" into the empty block. It stays in the panel.

---

## D. Empty-state wording

**DR10 — The rule.** Every empty area says **why it is empty first**, then **the one next action**.
Result clause first, action clause second. Sentence case. No fragments. Never state the same
promise twice.

Why: a visitor facing an empty area has exactly two questions — "is this me or is this you?" and
"what now?". Answer them in that order, once each, and the empty state stops being a dead end.

Must not be used for: stacking two actions into one empty state, or for wording that only says
"nothing here" without a cause.

**DR11 — The approved set, keyed by cause.**

| Area | Wording |
|---|---|
| Office inventory (no cars at all) | "No cars yet. Add the first one." |
| Office inventory (filters exclude everything) | "No cars match those filters. Clear them to see the rest." |
| Office activity (nothing logged) | "Nothing logged yet. Actions you take will show up here." |
| Showroom inventory (filters exclude everything) | "No cars match those filters. Tell me what you're after and I'll source it in the USA." |
| Drafts (none) | "No drafts. Start one when you're ready." |
| Board column | "Nothing here right now." |
| Note field (blank) | "Nothing noted yet." |
| Related row (none) | "Nothing related yet." |

Why: each of these names a cause and a next action in the visitor's own situation. The office's
"nothing yet" states and the showroom's "your filters are too tight" state are genuinely different
situations and must not share one sentence.

Must not be used for: reusing the showroom's source-in-the-USA promise in office empty states. The
office visitor is the dealer, not the buyer; the promise is meaningless there.

**DR12 — Refusal reasons keep their own voice.** Where an action is refused (validation, blocked
save), the message must keep the field's own capitalisation and wording rather than being flattened
into the house sentence-case style.

Why: a refusal is quoting a rule the visitor must satisfy. Rewriting it for consistency can change
what it appears to demand. The rule's own words are the safest words.

Must not be used for: relaxing the house style elsewhere. This is a single, deliberate exception for
refusal text.

---

## E. The live region (`#speak`)

**DR13 — Keep `#speak` in the accessibility tree at all times.** Replace the rule that hides it
while empty (`.speak:empty { display: none }`, found at `reference.css:78`, `car.css:37`,
`not-found.css:73`) with a collapse that keeps the region present but takes no space — so the live
region is never created and destroyed. Also **remove `role="status"` from `#ttl`**
(`InventoryBrowser.tsx:467`), so the page has exactly one live region.

Why: a live region that is added to the DOM at the same moment it needs to announce something often
never announces at all, because assistive technology was not yet watching it. Two live regions on
one page (the heading and `#speak`) makes the page announce twice, which is the Overloaded failure
in the UX rule. One region, always present, is the reliable arrangement.

Must not be used for: keeping the visible printed line if the visual design does not want it.
Removing the *visible* duplicate is allowed; removing the *live region* is not.

---

## F. The navigation chat button at ≤820px

**DR15 — Hide `.nav .wab` at ≤820px on all showroom pages.** The phone already affords chat
elsewhere: the floating button on home and inventory, and the car page's `.mbar` "Chat now". Nothing
is lost.

Why: at phone width the navigation bar is precious space, and the chat affordance is already
reachable by two other routes without crowding the bar. Two ways to reach the same conversation is
one too many on a small screen.

Must not be used for: removing chat from the desktop header, or from the fab or `.mbar` — the point
is deduplication at one breakpoint, not removing an entry point.

---

## G. Dialogs, focus, destructive actions, and feedback

**DR16 — Dialog focus house rules.** Every dialog: focus moves to the first safe control on open;
focus is trapped inside; focus returns to the control that opened it on close; Escape closes the
dialog and is scoped to that dialog (not a page-wide listener); the dialog has an accessible name;
and the page behind it is locked from scrolling.

Why: these are the mechanics that make a dialog feel like a place rather than a trap. The scoped
Escape matters because the observation found always-mounted, screen-scoped Escape listeners —
which will fire for the wrong dialog as soon as two exist.

Must not be used for: treating a dialog as a place to put a whole page. If the content needs
scrolling history, it is not a dialog.

**DR17 — Prefer the native `<dialog>` element with `showModal()`.** This is a recommendation: the
native element gives focus trapping, Escape handling, an accessible name, and the top layer for
free, which is four of the house rules above. The mechanism remains the Architect's call.

Why: every one of DR16's requirements is something a browser already implements correctly for
`<dialog>`. Rebuilding them by hand is how the always-mounted Escape bug arrived.

Must not be used for: assuming native `<dialog>` removes the need to name the dialog or to return
focus. `showModal()` does not choose your label.

**DR18 — Destructive naming and order.** The safe action comes first and the destructive action
second. "Delete" is the word everywhere it is undoable — including the undoable delete and the draft
delete. "Remove for good" is reserved as a distinct, clearly permanent action and is never used for
an undoable one.

| Situation | Primary wording | Notes |
|---|---|---|
| Undoable delete (with an 8s undo) | "Delete" | Undo toast follows |
| Draft delete | "Delete" | Architect to confirm it is undoable — see questions |
| Permanent delete | "Remove for good" | Must be visually distinct; no undo offered |

Why: "Delete" next to an Undo button teaches the visitor that deleting is safe. "Remove for good"
teaches that it is not. Using one word for both is where the distrust starts.

Must not be used for: softening a permanent action into "Delete" because it reads more calmly. A
permanent action must sound permanent.

**DR19 — The ways out of a dialog.** Every dialog offers Escape, the safe control, and a ✕. A tap
outside closes only **non-destructive overlays**; it must **not** close a confirmation.

Why: an outside tap is the easiest accidental gesture on a phone. On a confirmation it would dismiss
the question the visitor was about to answer — losing the decision, not the data, which is still a
loss. The prior plan already rules this; the runtime observation framed the drafts dialog as if a
tap outside should close it, and this ruling disagrees with that framing on purpose.

Must not be used for: giving a destructive confirmation a tap-outside close "because drafts are
cheap to redo".

**DR20 — Focus after a row is removed.** Focus moves to the equivalent control on the next row. If
there is no next row, focus moves to the list heading, which gets `tabindex="-1"` so it can receive
focus.

Why: removing the focused row destroys the focused element. Without a rule, focus falls to the top
of the page and the keyboard visitor has lost their place — the Forgotten failure.

Must not be used for: leaving focus on a removed element and hoping the browser recovers.

**DR21 — Focus after a failed save.** Focus moves to the first invalid field. If the failure is a
form-level error rather than one field, focus moves to the form's error block.

Why: the visitor just pressed save and it did not work. Their next action is to fix the specific
thing that blocked it, so focus belongs on that thing, not on the top of the form.

Must not be used for: focusing the first field unconditionally.

**DR22 — The undo window.** Eight seconds, starting when the offer appears. The toast and its Undo
appear together with the row's removal. A thin progress bar shows the remaining time; with reduced
motion, the progress bar is replaced by a static "8 s" label.

Why: eight seconds is the window the prior plan settled on, and an offer that appears after the
change has happened leaves the visitor unsure whether the change took. The moving bar is a clock the
eye can read without numbers; the static label is the same information for a visitor who asked for
no motion.

Must not be used for: pausing the countdown on hover. The deadline is the same for everyone.

**DR23 — "Saved" only when something changed.** A save that changed something says "Saved". A save
that changed nothing says "Nothing changed." The office car delete that currently says "(demo)" must
either be wired up or removed.

Why: a "Saved" that appears after a no-op is the moment a visitor stops believing the product.
Nothing-changed is real information and must be said. A control labelled "(demo)" teaches the
visitor that visible controls might be fake, which spreads suspicion to the real ones.

Must not be used for: showing "Nothing changed." when the save failed. A failure is a failure and
must be reported as one (see DR25).

**DR24 — The activity chip names the action.** A restored item reads RESTORED, not DELETED. Where
one word currently covers two actions, split the facets so each action has its own label.

Why: the activity log exists to tell the visitor what happened. A chip that says DELETED about
something that was restored is the product contradicting its own record, and it undermines the
log's whole purpose.

Must not be used for: merging RESTORED back into DELETED for tidiness.

**DR25 — A failed write reports as a failed write.** It is reported in place, in that action's own
words. Do not say "nothing was lost" unless that has actually been verified — an unverified
reassurance is worse than silence. A failed write must never wipe the shell the visitor is working
in. The mechanism for this is the Architect's.

Why: the visitor's next move depends entirely on whether their data survived. The product knows the
action that failed and should name it. Claiming safety it has not checked is the clearest way to
become Distrustful.

Must not be used for: a generic "Something went wrong." when the action is known.

**DR26 — Toast position above the office bottom bar at ≤820px.** Toasts must sit above the office
bottom bar rather than behind or under it. *(Flagged unverified: I have not driven this state on a
real phone-width office page; the Architect should confirm the current offset before implementing.)*

Why: a toast that the navigation bar covers is a message the product sent and the visitor never
received — the Ignored failure.

Must not be used for: repositioning showroom toasts, which have no bottom bar to clear.

---

## Questions I cannot answer — owner or Architect

These are deliberately left open. A question written down is worth more than a pattern quietly
copied in.

1. **Owner ruling — no WhatsApp number saved.** With no number saved, do all chat affordances
   disappear, or only the header block? (This is Q-001's territory and changes DR15.)
2. **Architect — is the draft delete undoable?** DR18 and DR22 need the answer before the wording
   can be final.
3. **Architect — route-level error boundaries.** Which routes get them, and what each says.
4. **Architect — a missing car returns HTTP 200 and there is no office 404 page.** Both need a
   decision on what the visitor sees.
5. **Architect — do we adopt the native `<dialog>` element?** DR17 recommends it; the mechanism is
   the Architect's.
6. **Architect — soft-navigation wait state and the offline path.** The wording is mine to write,
   but the existence of a wait state and an offline route is the Architect's call.
7. **Architect — how is a no-op save detected?** DR23 needs the mechanism before the wording can be
   wired.

---

## What is fine — do not touch

These came up in the observations and I am ruling them correct as they stand. Listed so nobody
"fixes" them:

- The read-failure retry wording.
- The wait-state words.
- The office zero states.
- The board column one-liner.
- "Costs incomplete" and the dashboard arithmetic.
- The car form's silence about empty cost fields.
- Wrap-never-truncate.
- Swipe and arrows both being present on the gallery.
- The 820px switch, the stacked form, the sticky `.mbar`, the table-to-cards change, and the
  bottom-bar clearance.
- The no-blame vocabulary.
- Success toasts saying what changed and what it means.
- Toasts at bottom-centre.
- The visible `#speak` line itself (removing the *visible* duplicate is allowed — see DR13).

---

## Outstanding: the owner's first-time-visitor check

The UX rule requires that a first-time visitor walks the journey and the owner hears it. **I cannot
do that check.** It is outstanding, and these are the questions to put to a first-time visitor:

1. You opened the office on a phone. Where would you tap to find Drafts or Settings? Did you find
   them without help?
2. On a car with no photos, what did you think was happening? Did anything look broken?
3. You filtered the showroom down to nothing. What did you expect to see? Did you know what to do
   next?
4. You deleted a car. Did you know it worked? Could you have undone it? Would you have believed the
   undo would work?
5. You came back the next day. Did the product remember where you were?

Record the answers verbatim; they are the only evidence that these rulings landed.
