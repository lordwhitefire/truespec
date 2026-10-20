# 04 — The Designer's rulings, and what became of them

**What this file is.** The design decisions for the UX layer (TASK-005), as they now stand after three
steps: the Designer's report, my review of it, and the owner's rulings on top of both. This is the file the
Builder reads when it comes to look and behaviour. Nothing here is invented by me — every line traces to the
Designer, to the owner, or to a verified source citation.

**Where it came from.**
- **The Designer's report:** `design-workspace/decisions/TASK-005-ux-rulings.md` (DR1–DR26, plus a list of
  open questions and a "do not touch" list). Written 2026-10-17 by the Designer sub-agent, briefed with the
  surface matrix, the named gaps, the spec demands and the Phase 2 observations, and told the skills
  `emil-design-eng`, `web-design-guidelines` and `frontend-design` were its to use.
- **My review:** read in full, checked against `findings/05-runtime-observations.md` and against the code for
  every citation it made. Accepted, rejected, or held back — each said plainly below.
- **The owner's rulings:** 2026-10-17, in conversation. Where the owner changed or added to the Designer, the
  owner wins and the change is marked.

**Scope, in one line.** These are decisions about **how things look and behave**. What *should exist* — which
routes, which data, whether a feature ships at all — is the Architect's and is not decided here except where
the owner has ruled directly.

**Numbering.** `D1…D34` below are this layer's decisions, in the order they were agreed. They carry the
Designer's own numbers (`DRn`) in brackets so nothing collides with `design.md`'s D1–D21 or the findings'
SD1–SD28.

---

## Part A — The decisions, in order

### The office's "More" cell on a phone (≤820px)

**D1 (DR1) — "More" opens a short sheet from the bottom bar, holding exactly three rows**, in sidebar order
and sidebar wording: **Drafts** (`fa-inbox`), **Activity log** (`fa-list-check`), **Settings** (`fa-gear`). The
bottom bar stays visible underneath; the rest of the page dims behind a scrim.
*Why:* these are the three destinations the bar cannot fit, and a bottom sheet is the lightest thing that
keeps the bar in view. *Must not become:* a general menu, a place for future features, or a second home for
pages the bar already shows.

**D2 (DR2) — the cell is a real `<button>`**, carrying `aria-expanded` and `aria-controls` at the sheet. On
open, focus moves into the sheet and is trapped there. It closes on Escape, on a tap outside, and on choosing
a row; on close, focus returns to the cell. Motion ~200ms ease-out; with reduced motion, a plain fade with no
travel; with a soft keyboard open, no animation at all.

**D3 (DR3) — the cell lights up whenever the path is `/office/drafts`, `/office/activity` or
`/office/settings`.** Inside the sheet, the matching row is styled active and carries `aria-current="page"`.
*Why:* on a phone the bar is the only place a person can see where they are, and three pages currently show
nothing at all.

**D4 (DR4) — the cell's icon becomes `fa-ellipsis`, not `fa-gear`.** A gear promises Settings; this cell
opens three things.

### A car with no photos, and a photo that is broken

**D5 (DR5) — keep the framed placeholder; omit the counter, the arrows and the thumbnails entirely.** Never
render `undefined`, `NaN`, or a counter like "1 / 0". A single photo reads "1 / 1" and has no arrows. More
than one is unchanged.
*Why:* a gallery of zero photos has nothing to count or step through, and machine text on the page where
trust matters most reads as "broken" when it is merely "empty".

**D6 (DR6) — the same treatment covers an image broken at load**, detected with
`img.complete && img.naturalWidth === 0` — not only the "no photos" list case. The placeholder's alt names
the car, never "photo 1" and never anything containing `NaN`.
*Why:* a missing file and an absent list look identical to the visitor, so both must land on the same calm
placeholder. This is the half of truth 7 that Phase 2 proved **failing** today (§R2.4 of the observations: a
photo broken *before* hydration never swaps — 13 error events, 0 swaps).

**D7 (owner, 2026-10-17 — added to D5/D6) — the placeholder is a gradient of different colours, never a
flat grey.** Four rules on top of it, all owner-ruled or best-practice:
1. **Each car gets its own colours, always the same ones** — derived from the car's reference code, so the
   same car always shows the same gradient. Not random per render.
2. **It never shimmers or pulses.** A moving shine means "still loading". A car with no photo will never get
   one, so motion here would promise something that is not coming. *Moving = loading; still = gone.*
3. **It keeps the shape and size of a real photo**, so the page never jumps when a person moves between a
   photographed car and an unphotographed one.
4. **It is marked decorative** (`alt=""`, or `role="presentation"`) so screen readers skip it — the car's name
   is already on the page beside it. (W3C WAI: an empty `alt` and a *missing* `alt` are different things; the
   empty one means "skip", the missing one makes a screen reader read out a filename.)
*Source for the pattern:* the gradient is painted behind the image slot rather than replacing it, so it
covers both the no-photo case and the loading case with one rule — the common modern pattern
(`img` with a gradient `background`, `background-size: cover`, cleared on `load`).

**FIX-002 IS CLOSED (owner, 2026-10-17).** The photo-less cars (TS-1029, TS-1030) are **our own test
cars**, made during TASK-004's build. They are not a product defect and are not to be chased. What stands is
**D7** — the fallback must be a gradient, not machine text — and that is folded into TASK-005, not made into
its own registry entry.

### The showroom's "nothing matched" state

**D8 (DR7) — one message survives.** The list's own empty block keeps: *"No cars match those filters. Tell me
what you're after and I'll source it in the USA."* plus the WhatsApp button. **The second copy of the same
promise is removed** from the page.
*Why:* the same sentence is printed twice today, stacked, under a heading that says it a third time
(§R2.7). Saying a thing twice makes the page look like it does not know its own contents.

**D9 (DR8) — the live region announces the bare result only** — *"No cars match those filters."* — and does
not repeat the sourcing promise.
*Why:* a live region interrupts a screen-reader user mid-thought; it should carry the fact that changed, not
the sales pitch.

**D10 (DR9) — the heading keeps reading "0 matching cars"** (it is the honest count), and **"Clear all
filters" stays a single control in the filter panel**, not duplicated beside the empty block.

### The live region (`#speak`)

**D11 (DR13) — `#speak` stays in the accessibility tree at all times.** The rule that hides it while empty is
replaced by a collapse that keeps the region present but taking no space, so it is never created and
destroyed. **And `role="status"` comes off the heading `#ttl`**, so the page has exactly one live region.
*Citations, checked 2026-10-17:*
- `reference.css:78` — `.speak:empty { display: none; }` ✓
- `app/(site)/car/car.css:37` — same rule ✓
- `app/(site)/not-found/not-found.css:73` — same rule ✓
- `components/site/InventoryBrowser.tsx:465` — `<p id="speak" className="speak" role="status" aria-live="polite" />` ✓
- `components/site/InventoryBrowser.tsx:467` — `<h2 id="ttl" role="status">` ✓
*Why:* a live region added to the DOM at the same moment it must announce often never announces, because
assistive technology was not yet watching it. Two live regions on one page announce twice — the Overloaded
failure.
**Noted and not yet in any ruling:** there is a **third** `role="status"` at
`components/site/InventoryBrowser.tsx:559` (`<div className="toast" id="toast" role="status">`). The toast's
own status role is correct and stays; this is recorded so the count of live regions on that page is known.

### Empty-state wording

**D12 (DR10) — the rule.** Every empty area says **why it is empty first**, then **the one next action**.
Result clause first, action clause second. Sentence case. No fragments. The same promise is never stated
twice.
*Why:* a person facing an empty area has two questions — "is this me or is this you?" and "what now?" — and
they are answered in that order, once each.

**D13 (DR11, with my correction — see Part B) — the approved set.**

| Area | Wording | Status |
|---|---|---|
| Showroom inventory (filters exclude everything) | "No cars match those filters. Tell me what you're after and I'll source it in the USA." | **Agreed** |
| Office inventory (no cars at all) | "No cars yet. Add the first one." | **Not adopted** — office keeps its current wording |
| Office inventory (filters exclude everything) | *(Designer proposed a new sentence)* | **Not adopted** — office keeps *"No cars match. Clear the search or pick another state."* |
| Office activity (filters exclude everything) | *(Designer proposed a new sentence)* | **Not adopted** — office keeps *"Nothing matches. Clear the search or pick another type."* |
| Board column (empty) | "Nothing here right now." | **Agreed** — and it is what ships today |
| Note field (blank) | "Nothing noted yet." | **Agreed** — matches `enquiries-client.tsx:318` |
| Drafts (none) | "No drafts. Start one when you're ready." | **Agreed** |
| Related row (none) | "Nothing related yet." | **Agreed** |

**D14 (DR12) — refusal reasons keep their own voice.** Where an action is refused (validation, a blocked
save), the message keeps the field's own capitalisation and wording rather than being flattened into the
house sentence-case style.
*Why:* a refusal quotes a rule the person must satisfy; rewriting it for consistency can change what it
appears to demand.

### The showroom's chat button at ≤820px

**D15 (DR15) — hide the nav's "Chat on WhatsApp" at ≤820px on all showroom pages.** Today it is hidden on
the car page but kept on home and inventory at the same width — two behaviours for one piece of chrome.
Nothing is lost: the floating button and the car page's `.mbar` "Chat now" already cover it.
*Why:* two ways to reach the same conversation is one too many on a small screen.
*Not touched:* the desktop header's chat button, the floating button, and `.mbar`.

**D16 (owner, 2026-10-17 — this changes FIX-001's earlier ruling) — when no WhatsApp number is saved,
every chat affordance stays on screen but is visibly switched off.** Greyed out, visibly disabled, not
merely inert. The owner's words: *"leave everything just make it not clickable"* and then, on being shown the
choice, *"(a)"* — grey it out so it is obviously off.
*Why this matters:* a normal-looking button that silently does nothing is the exact fault being removed from
the Search spot. A greyed button says "I am off"; a live-looking one says "this app is broken".
**This supersedes the 2026-10-16 ruling** that "no number saved means nothing is shown at all" — recorded in
full in the run log and in §7 of the research plan. The invented number itself is still removed (that part of
FIX-001 stands); what changes is that the affordances are greyed, not deleted.

### Dialogs, focus, and destructive actions

**D17 (DR16) — the dialog house rules.** Every dialog: focus moves to the **first safe control** on open;
focus is trapped inside; focus returns to the control that opened it on close; **Escape is scoped to that
dialog** and not to the page; the dialog has an accessible name; and the page behind it is locked from
scrolling.
*Why:* these are the mechanics that make a dialog feel like a place rather than a trap. The scoped Escape
matters because today's listeners are always-mounted and screen-scoped — they will fire for the wrong dialog
as soon as two exist (§R2.1/R2.3).

**D18 (DR17 — the Architect's call, answered yes) — adopt the native `<dialog>` element with
`showModal()`.** The browser gives focus trapping, Escape, the accessible name hookup and the top layer for
free — four of the six rules in D17 in one mechanism. The one thing `showModal()` does **not** give is the
label, so naming stays the Builder's job.

**D19 (DR18) — destructive naming and button order.** The safe action comes first, the destructive action
second. **"Delete" is the word wherever the action is undoable** — including the draft delete.
**"Remove for good" is reserved for a genuinely permanent action** and is never used for an undoable one.

| Situation | Primary wording | Note |
|---|---|---|
| Undoable delete (with the 8-second undo) | "Delete" | Undo offer follows |
| **Draft delete** | **"Delete"** | **Owner, 2026-10-17: drafts delete is *not* undoable** — see D20 |
| Permanent delete | "Remove for good" | Visually distinct; no undo offered |

**D20 (owner, 2026-10-17 — answering the Designer's open question 2) — deleting a draft is forever.** The
owner's words: *"draft can be deleted for good."* So the draft dialog's wording is **"Remove for good"**,
it is visually distinct, and **no undo is offered** for it. This resolves the Designer's open question and
removes the last naming ambiguity in D19.

**D21 (DR19) — the ways out.** Every dialog offers Escape, the safe control and a ✕. **A tap outside closes
only non-destructive overlays; it never closes a confirmation.**
*Why:* an outside tap is the easiest accidental gesture on a phone, and on a confirmation it would dismiss
the question the person was about to answer. *This deliberately disagrees with the Phase 2 observation's
framing* of the drafts dialog (which has no tap-outside and no Escape today): the fix there is to **add
Escape**, not to add a tap-outside close.

**D22 (DR20) — focus after a row is removed.** Focus moves to the equivalent control on the next row; if
there is no next row, focus moves to the list heading, which gets `tabindex="-1"` so it can receive it.
*Why:* removing the focused row destroys the focused element. Without a rule, focus falls to the top of the
page and a keyboard person has lost their place — the Forgotten failure.

**D23 (DR21) — focus after a failed save.** Focus moves to the first invalid field; if the failure is
form-level rather than one field, focus moves to the form's error block.

### The undo window — the owner's own design

**D24 (DR22, as changed by the owner 2026-10-17) — an undo offer lasts eight seconds, and it shows a
draining bar.** The bar starts **full** and empties to **zero** over the window. The owner's words: *"use a
bar that starts at full and goes empty with that 8s so they have a measure — nothing gives them measure…
it is a better sense of time"* (his working image was two stacked bars, one draining as the other holds;
the sense, not the pixels, is what is recorded here).
*Why:* today the toast simply appears and then vanishes with **no countdown, no progress, no wording that says
how long is left** (§R2.3). The window is **8 seconds, set once** — `inventory-client.tsx:175-182`, called with
`8000` at `:206`. The bar *is* the measure.

**D25 (owner, 2026-10-17, on my advice after researching the practice) — one clock, never two.** The
animation is the clock: when the bar reaches zero the toast closes, and the closing comes from the
animation's own end, not from a second independent timer. A slightly longer safety timeout stays in place
only as a backstop, and it becomes the real clock in the one case where the animation is switched off —
reduced motion.
*Why this and not "a timer plus a bar":* two clocks drift apart, and the drift shows as a bar that lies. The
window is **one number** — `8000 ms`, set once at `inventory-client.tsx:175-182` and called at `:206` — and it
must stay one number. (My earlier "the two clocks are already drifting apart" reasoning rested on a timing
fault that **does not exist**; the rule stands because drift is *possible*, not because it happened. See
`06-architect-calls.md` call 1.)

**D26 (owner, 2026-10-17, the mechanics) — four details the pattern carries:**
1. **Animate `transform: scaleX`, never `width`.** `width` forces a layout on every frame; `transform` is
   compositor work and stays smooth under load.
2. **The bar is `aria-hidden`.** A screen reader must not hear a thing that updates sixty times a second.
   The words on the toast carry the meaning for everyone else.
3. **With reduced motion, the bar does not move** — a plain **"8 s"** label shows instead, so the measure
   survives for people who asked their device to stop moving things.
4. **The clock starts when the offer appears and is pressable** — not before, so nobody loses part of their
   window while the toast is still arriving. (Phase 2 measured the gap: the row vanished at 215 ms, the
   words and the Undo arrived at 1227 ms.)

**D27 (CORRECTED 2026-10-17 — the condition on D24/D25) — there is no timing bug; the bar is drawn to the
code's own 8 seconds.** This ruling previously said the live toast died at ~4.3 s and ordered that fault found
before any bar was drawn. **That was my error, corrected in full in `06-architect-calls.md` call 1.** The source
sets the window **once**, at **8000 ms** (`inventory-client.tsx:175-182`, called with `8000` at `:206`),
starting when the offer appears. The ~4.3 s in §R2.3 is *how long the toast had already been open when the
researcher clicked Undo* — not when it died ("the end of the window was NOT observed",
`05-runtime-observations.md:290-293`). **So the bar is drawn for 8 seconds, and nothing must be fixed first.**
The one thing genuinely never seen is the **lapse** — what the screen does when the window runs out — because
watching it would tombstone a real car. That is a **testing** item, carried into `testing.md`.

### Feedback truthfulness

**D28 (DR23) — "Saved" only when something changed.** A save that changed something says "Saved". A save
that changed nothing says **"Nothing changed."** A control that reports success for a no-op is the moment a
person stops believing the product.
*Source for the no-op:* Phase 2 found no "nothing changed" wording anywhere in the office (§R2.3).

**D29 (owner, 2026-10-17 — the owner's own ruling, and a hard one) — no fake buttons, ever.** The owner's
words: *"the only thing that is fake is data… button that cannot do anything should not be excused by
demo."* The login is real, the store is real, the business logic is real. So:
- **The office car form's delete button must be wired up to really delete, or taken off the screen.** It
  currently opens a real confirmation dialog that promises an undo, reports *"Car deleted (demo)."*, and
  **deletes nothing** (`car-client.tsx:1192-1195`, §R2.3 — verified safe to click, it is toast-only).
- **The dead Search button in the office top bar is removed** — see D30.
*This is a standing rule, not a one-off:* a visible control that does nothing is worse than no control, and
"it's a demo" is not a reason.

**D30 (owner, 2026-10-17 — on the Search button) — remove it.** The owner built search to filter cars by
keyword. **That already exists**: the office inventory has a working search field, and the activity log has
one too. The top bar's Search is a *button* with no handler (`OfficeTopbar.tsx:29-31`) — a second door into a
room that has no door. The field does the job; the button goes.

**D31 (DR24) — the activity chip names the action.** A restored item reads **RESTORED**, not DELETED. Where
one word currently covers two actions, the facets split so each action has its own label.
*Why:* the log records *"Restored a car TS-1001 · DELETED"* and counts it under "Deleted 12" (§R2.3) — the
product contradicting its own record.

**D32 (DR25) — a failed write reports as a failed write, in that action's own words.** It is reported **in
place**, on the screen the person is working in. It must **never wipe the shell**. It never says "nothing was
lost" unless that has been checked. A generic *"Something went wrong."* is not acceptable when the action is
known.
*Why:* today a failed delete produces the **load** error — *"We couldn't load this / We tried a few times
but the server didn't answer. Nothing was lost — please try again."* — with the whole office shell replaced
(`navVisible:false`) and the code's own *"That car could not be deleted."* never reaching the screen
(§R2.4). *The mechanism for fixing this is mine (the Architect's), not the Designer's* — see Part C.

**D33 (DR26, held back by me — unverified) — toasts must sit above the office bottom bar at ≤820px.** The
Designer flagged this itself as unverified: it did not drive a phone-width office page to see whether the
bottom bar covers a toast. Phase 2 measured the toast at `position: fixed; bottom: 24px; z-index: 70`
(§R2.3) and the bottom bar's top edge at ~740px on a 390px-tall-ish viewport (§R2.6) — so at 24px from the
bottom, **the bar would sit on top of it**. **This needs one measurement before it becomes a rule**, and is
listed in Part G.

### Two new screens the owner ordered

**D34 (owner, 2026-10-17) — build a waiting sign and an offline screen.** The owner's words: *"we build a
waiting signing page and offline screen."*
- **The waiting state:** today a *soft* navigation to a slow store shows **nothing at all** — the URL does
  not change, the heading stays, and the screen sits still for seconds (§R2.4: 6s hold observed, page
  changed at ~8.4s). The existing wait state covers a full page load only.
- **The offline screen:** today there is **no offline path** — an offline click throws the person out of the
  app onto **Chrome's own error page** (`ERR_INTERNET_DISCONNECTED`), shell gone (§R2.4).
*Both are new build items in this layer.* The **wording** is the Designer's to write; the **existence** is
now settled by the owner.

---

## Part B — What I did not accept from the Designer, and why

**B1 — The office zero states are not reworded.** DR11's table proposed new sentences for the office
inventory and the office activity empty states. **This contradicts the Designer's own "do not touch" list,
which names "The office zero states" as correct as they stand.** One document, two rulings that cancel out.
My resolution, and it is mine to make: **the office keeps its current wording** —
*"No cars match. Clear the search or pick another state."* (inventory) and
*"Nothing matches. Clear the search or pick another type."* (activity) — because (a) the Designer itself
called them fine, (b) both already obey D12's rule (cause, then action), and (c) Phase 2 recorded them as
among the good ones. The showroom's duplicate is the one that is broken, and D8 fixes only that.

**B2 — The "8 seconds" was adopted without a measurement, and the measurement I demanded turned out to be a
misreading of my own.** DR22 states eight seconds as settled; it is `inventory-client.tsx:206`'s number. My
review objected that "the eye measured ~4.3 s" and made chasing that disagreement a precondition of the bar.
**Chasing it found no disagreement:** the ~4.3 s was the toast's *open duration at the moment Undo was clicked*,
not its death — §R2.3 says so itself ("the end of the window was NOT observed", `05-runtime-observations.md:290-293`).
The code's single 8000 ms timer is unrefuted. **So DR22's number stands, unamended, and B2 is withdrawn** — the
correction of my own review is `06-architect-calls.md` call 1.

**B3 — Stale references, left as they are.** DR4 cites "the open owner question Q-001 on tablet navigation",
and the open-questions list files the WhatsApp question under "Q-001's territory". Both are wrong: **Q-001
was answered by the owner on 2026-10-16** ("good" — keep the single 820px switch and declare it; the More
cell opens Drafts / Activity / Settings; the dead Search button is removed), and the WhatsApp question is
**FIX-001's** territory, not Q-001's. Recorded so the error is not copied forward.

**B4 — DR14 was never written.** The Designer's numbering runs DR13 → DR15. There is no DR14 in the file. It
is recorded as a gap in the source, not silently renumbered — the D-numbers above run continuously and are
the authority.

**B5 — DR26 was self-flagged as unverified** and I have not verified it either. It is carried as D33 with
that status, not as a rule.

---

## Part C — The Designer's open questions, and where each one landed

The Designer listed seven questions it could not answer. It was right to leave them; here is where each one
now stands.

| # | The question | Where it landed |
|---|---|---|
| 1 | With no WhatsApp number saved, do all chat affordances disappear, or only the header block? | **Answered by the owner, 2026-10-17** → **D16**: they stay, visibly greyed out. Supersedes the 2026-10-16 "nothing at all" ruling. |
| 2 | Is the draft delete undoable? | **Answered by the owner, 2026-10-17** → **D20**: no. "Remove for good", no undo. |
| 3 | Which routes get error boundaries, and what each says? | **Answered by me, 2026-10-17** → **`06-architect-calls.md` call 2.** The boundaries **already exist** — `app/error.tsx` and `app/office/error.tsx`, deliberately one level above each shell because a boundary cannot catch its own segment's layout. My Phase 2 note ("no route-level `error.tsx`") was therefore misleading and is corrected. The real gap is that a **failed write** calls `storeQuery`, which throws when every retry fails, so it reaches the office boundary and **takes the shell with it**. My call: the boundaries stay; a boundary goes **inside** each shell; and a write failure catches and returns instead of throwing — the pattern `photosExist` (`lib/car-form.ts:106-118`) already uses. The **wording** stays the Designer's (D32; `Retryable`'s text is on the do-not-touch list). |
| 4 | A missing car returns HTTP 200 and there is no office 404. What does the visitor see? | **Answered by me, 2026-10-17** → **`06-architect-calls.md` call 4.** A missing car answers **404**, its helpful view and the chrome unchanged — the status was the only lie. The office gets **its own not-found** (office words, office chrome, a way back to the dashboard), since an unknown `/office/…` currently lands in the shop front. And the root 404's bare-card design **stays as built** — it matches the reference (`RECON-001/report.md:20`) and gives three ways out, so it is not a defect. |
| 5 | Do we adopt the native `<dialog>` element? | **Answered by me, 2026-10-17** → **D18: yes.** |
| 6 | Does a soft-navigation wait state and an offline path exist? | **Answered by the owner, 2026-10-17** → **D34: yes, build both.** |
| 7 | How is a no-op save detected? | **Answered by me, 2026-10-17 — a lookup, and the machinery already exists** → **`06-architect-calls.md` call 3.** `lib/car-update.ts` already compares a change-hash and *only writes when something differs*, so the app already knows; the gap is only that the statement does not report the fact back (`app/office/actions/car.ts:121-127`). D28 is one returned fact, not new building. |

**What the Designer could not do, and is still outstanding:** it named the **first-time-visitor walk** — the
UX rule requires that a first-time visitor goes through the journey and the owner hears it — and said plainly
that it cannot run it. The five questions it wrote for that visitor are carried into `questions.md`.

---

## Part D — What the Designer ruled is fine. Do not "fix" these.

Carried verbatim in intent, so nobody improves them by mistake:
the read-failure retry wording · the wait-state words · the office zero states (see **B1**) · the board
column one-liner · "Costs incomplete" and the dashboard arithmetic · the car form's silence about empty cost
fields · wrap-never-truncate · swipe **and** arrows both present on the gallery · the 820px switch, the
stacked form, the sticky `.mbar`, the table-to-cards change, and the bottom-bar clearance · the no-blame
vocabulary · success toasts saying what changed and what it means · toasts at bottom-centre · the visible
`#speak` line itself (removing the *visible* duplicate is allowed; removing the *live region* is not).

---

## Part E — The two mechanisms, written out so they survive

**E1 — One clock for the undo bar.** The animation runs full → zero over the window, and its end is what
closes the toast. There is no second independent timer. A safety timeout sits behind it, deliberately longer
than the window, and it becomes the real clock only when the animation is off (reduced motion). Read the
animation's own current time if a remaining-time figure is ever needed — not a second timer. Animate
`transform: scaleX`; the bar is `aria-hidden`; the words on the toast carry the meaning.

**E2 — The gradient placeholder.** Painted behind the image slot, not instead of it, so one rule covers both
"no photos" and "broken photo". Colours derived from the car's reference, so the same car always shows the
same gradient. `background-size: cover`, `background-position: center`. Cleared on `load`. Never animated.
Marked decorative (`alt=""`) because the car's name is already beside it. Same box as a real photo, so
nothing shifts.

---

## Part F — Citations, checked before they were written down

Every file and line the Designer cited was verified against the code on 2026-10-17 rather than copied:

| Citation | Result |
|---|---|
| `reference.css:78` — `.speak:empty { display: none; }` | **Confirmed** |
| `app/(site)/car/car.css:37` — same | **Confirmed** |
| `app/(site)/not-found/not-found.css:73` — same | **Confirmed** |
| `components/site/InventoryBrowser.tsx:465` — `#speak` with `role="status" aria-live="polite"` | **Confirmed** |
| `components/site/InventoryBrowser.tsx:467` — `<h2 id="ttl" role="status">` | **Confirmed** |
| `components/site/InventoryBrowser.tsx:559` — a **third** `role="status"` on the toast | **Found by me, not by the report** — recorded above |
| `OfficeTopbar.tsx:29-31` — the dead Search button | Confirmed in Phase 2 (§R2.6) |
| `car-client.tsx:1192-1195` — the no-op delete | Confirmed in Phase 2 (§R2.3) |
| `inventory-client.tsx:206` — the 8000 ms window | Confirmed in Phase 2 (§R2.3) |

---

## Part G — Still open after this file

**Settled 2026-10-17 — see `06-architect-calls.md`.** Four items that used to be on this list are now answered:
the "4.3-second bug" **does not exist** (call 1); the no-op detection **already exists in the code** (call 3);
the error boundaries **already exist** and need a different fix (call 2); and the 404 family is **decided**
(call 4). They are removed from the list below rather than left to look open.

Still genuinely open:

1. **The toast's place on a phone** (D33) — one measurement: does the office bottom bar cover a toast sitting
   at `bottom: 24px`? Phase 2's numbers say yes; it has not been driven.
2. **The lapse** (D27) — what the screen shows when the 8-second window runs out. Never observed, on purpose;
   carried into `testing.md` as a check, not a build item.
3. **The first-time-visitor walk** (Part C, last note) — five questions for a real first-time visitor, whose
   answers are the only evidence these rulings landed.
