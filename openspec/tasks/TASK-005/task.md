# TASK-005 — UX. Layer 5 of 6.

**Written 2026-10-17.** A plan, not instructions: it says what must be true and what must not happen, names the
choices that belong to whoever builds it, and leaves the rest open. Its twin is `testing.md` in this folder,
written for a session that did not do the building.

**Where the requirements live.** `openspec/changes/truespec-architecture/specs/*` (binding — showroom,
office-access, inventory, money, media, enquiries, office-settings, dashboard), `design.md` (**design D18** — a
transient store failure is a retryable state with route-level error boundaries behind it, for the office and the
showroom both; **design D21** — the tap badge; **design D15 d** — the vocabulary debt), and `tasks.md` **build
task 7.4** — *"Failure and attention wording must follow the settled rules: gold + icon + words, never colour
alone."* The design decisions for this layer are **D1–D34** in `findings/04-designer.md`; the four architecture
calls are in `findings/06-architect-calls.md`; the numbered standing requirements are **SD1–SD28** in
`findings/03-spec-demands.md`. Where a spec and a design note disagree, **the spec wins** and the disagreement is
logged below. `product-management/` is read, not trusted, and never edited.

**The research this was written from** — all of it on disk under `openspec/tasks/TASK-005/`: `research-plan.md`
(the plan and its append-only run log), `findings/01-surfaces.md` (the surface × state matrix),
`findings/02-named-gaps.md` (G1–G10 + FIX-001), `findings/03-spec-demands.md` (SD1–SD28),
`findings/04-designer.md` (the design decisions), `findings/05-runtime-observations.md` (seven areas, driven live
against a running build), `findings/06-architect-calls.md` (four calls settled by reading the code), and
`findings/questions.md`. Every claim below traces to one of them, and each of those traces to a file and a line.
Nothing in this task is recalled.

---

## Why this layer exists

The product works. Every layer under this one is built and verified: the UI, the business logic, the data model,
the functionality behind the door. What is left is the **experience** of it — and the measured evidence says the
experience is where the product still tells small lies.

The undo offer claims eight seconds and shows no sign of time passing. A car with no photos renders machine text.
A save that changed nothing says "Saved". A delete that deletes nothing says it succeeded because the screen is a
demo. A missing car answers *"200 OK"* to every search engine and link checker that asks. An office address that
matches nothing hands the office user back to the shop front. And when the store cannot be read, reading failure
takes the whole office chrome down with it.

None of these is a crash. Every one is a place where the product says something other than what happened. This
layer makes the experience **true** — and the rule it is built on is the owner's own, given on 2026-10-17:

> *"the only thing that is fake is data… button that cannot do anything should not be excused by demo."*

---

## Where the layer stands today (grounded 2026-10-17, driven live)

**Already built and working — this layer must not redo it.** The confirmation dialogs exist on every destructive
action. The 8-second undo window exists *as behaviour*, and the undo genuinely restores a car — verified by a full
reload and a server read, not by the optimistic screen. Inline validation exists. The empty states exist. The
pages do not break when the store blips. The car page's gallery already does swipe on touch and arrows on pointer
(SD28 met). And the office already knows the truth about a missing number — `settings-client.tsx:124` says
*"No number set — every chat button on the site is dead until one is saved."*

**Measured and wrong — observed, not inferred.**

- **The undo offer shows no measure of time.** No countdown, no progress, no wording saying how long is left. The
  window is set once, at 8000 ms (`inventory-client.tsx:175-182`, called at `:206`). The row vanishes 215 ms after
  the click; the offer arrives 1227 ms after it.
- **A car with no photos renders machine text**, and a photo that fails to load *before* hydration never swaps to
  the placeholder (13 error events, 0 swaps).
- **The car form's delete deletes nothing** and reports *"Car deleted (demo)."* (`car-client.tsx:1192-1195`). The
  inventory's delete really writes, and offers an undo. Two deletes, two meanings.
- **The office top bar's Search control does nothing** (`OfficeTopbar.tsx:29-31`) — while working keyword fields
  already exist on the inventory and activity screens.
- **A failed write produces the load error**, and the office shell is replaced; the code's own *"That car could
  not be deleted."* never reaches the screen.
- **A missing car answers HTTP 200.** An unknown **`/office/…`** falls into the showroom's 404.
- **The showroom's empty result prints the same promise twice.**

**Not built at all.** There is no waiting state for a soft navigation — a slow read leaves the screen still for
seconds — and no offline path: an offline click lands on the browser's own error page with our chrome gone.

**The layer's seven areas**, from the registry: dialogs · focus · toasts · undo timing · offline handling ·
failure wording · per-width interactions. The owner's rulings of 2026-10-17 widened it (a waiting sign and an
offline screen, the gradient photo fallback, the office's own not-found, the dead Search control, the no-op
delete, and FIX-001).

---

## What must be true

### A. Feedback that is true

1. **A save reports what actually happened.** A save that changed something reports success. A save that changed
   nothing says so, in words of its own. No control reports an outcome the store did not produce. *(D28; the
   machinery is in `06` call 3 — the comparison already happens on every save; it is the reporting that is
   missing.)*

2. **No control is inert while looking live.** Nothing on any screen looks pressable and does nothing.
   - The office top bar is **not** one of the places search lives: the keyword filtering the office already has —
     on inventory and activity — is the search. *(Owner, 2026-10-17.)*
   - The car form's delete either **really deletes**, with the same undo the inventory's delete offers, or it is
     **not on the screen**. A dialog that promises an undo and reports a deletion it did not perform is the
     clearest case of the rule this layer exists to enforce. *(Owner, 2026-10-17; D29.)*

3. **A failed write is reported as a failed write, where the person is working.** It arrives in that action's own
   words, in the screen the person is in. It never arrives as the store-unreachable state, and it never replaces
   the office chrome with a whole-page message. It says nothing was lost only where that has been established.
   *(D32; `06` call 2 — the mechanism already exists in this codebase: `photosExist` at `lib/car-form.ts:106-118`
   catches an unreachable store and returns a refusal, with words, instead of throwing. The write statements are
   simply not wrapped the same way.)*

4. **The record names what happened.** One word does not cover two actions: a restored item is named as a
   restoration, not as a deletion, and any count agrees with the names it summarises. *(D31.)*

### B. The undo window

5. **The undo offer lasts eight seconds and shows the time passing** — a bar that starts full and empties to zero
   over the window. *(SD21 fixes the window; D24 fixes the measure. The owner's words: "nothing gives them
   measure… it is a better sense of time".)*

6. **One clock, not two.** The animation is the clock, and its own end closes the offer. Any timeout behind it is
   deliberately longer, and it becomes the real clock in the one case where motion is switched off. *(D25.)*

7. **The bar's mechanics are constrained:** its motion must not force layout (transform, not width); it is hidden
   from assistive technology, whose meaning is carried by the offer's words; where reduced motion is asked for, a
   static **"8 s"** label takes its place; and the clock starts when the offer is **actually pressable**, not when
   the row leaves the list. *(D26.)*

8. **The end of the window is true, and it is checked.** When the eight seconds pass, the offer goes and the car
   is a **permanent deletion**. This has never been watched, on purpose — watching it tombstones a real car — so it
   is checked in `testing.md` on a car that is safe to lose. *(`06` call 1.)*

### C. Dialogs and focus

9. **Every dialog behaves the same way:** focus enters at the first safe control and stays inside; it returns to
   whatever opened the dialog when the dialog closes; Escape closes **that** dialog and nothing else; the dialog
   carries an accessible name; and the page behind it does not scroll. *(D17.)*

10. **The platform's own modal dialog element is the preferred mechanism** (`showModal()`), because it supplies
    trapping, Escape, the naming hookup and the top layer. The accessible name is still to be supplied by
    whoever builds it. *(D18.)*

11. **Destructive actions are named and ordered consistently.** The safe action comes first and the destructive
    one second. An action that can be undone is called **"Delete"**. **"Remove for good"** is reserved for one
    that genuinely cannot — and deleting a draft is one that cannot. *(D19, D20; owner's ruling, 2026-10-17.)*

12. **Focus survives a change to a list and a refusal.** After a row is removed, focus is on the equivalent
    control of the next row, or on the list's heading where there is no next row. After a refused save, focus is
    on the first invalid field, or on the form's error block where the refusal is form-level. *(D22, D23.)*

13. **A tap outside closes only what is not destructive.** A confirmation is never dismissed by a tap outside —
    on a phone that is the easiest accidental gesture there is. *(D21.)*

### D. Empty states, the live region, wording

14. **An empty area says why it is empty first, then the one next action.** Sentence case. The same statement is
    not made twice on one screen — the showroom's empty result says it once. **The office's existing empty wording
    stands and is not rewritten.** *(D12, D13; the ruling in favour of the Designer's own do-not-touch list is
    `04-designer.md` B1.)*

15. **The live result is announced exactly once, and the region is not created at the moment it must speak.** The
    announcement carries the bare result, not the promise that follows it. The result's heading is not a second
    live region. *(D11 — the region stays in the accessibility tree; a region added to the DOM as it must announce
    is often never watched.)*

16. **The count is the honest count** — "0 matching cars" — and clearing the filters lives in the filter panel,
    not duplicated beside the empty block. *(D10.)*

17. **A refusal keeps its own voice.** Where an action is refused, the message keeps the field's own wording and
    capitalisation rather than being flattened into house style — a refusal quotes a rule the person must satisfy.
    *(D14.)*

### E. A car with no photos, and a photo that failed

18. **Both land in the same place:** the framed box, with no counter, no arrows, no thumbnails, and **no machine
    text** — never `undefined`, never `NaN`, never "1 / 0". A single photo reads "1 / 1" and has no arrows. The
    broken-at-load case is detected as such (an image that finished with no width), not only the no-photos case.
    *(D5, D6.)*

19. **The empty photo box is a gradient of colours.** Different colours — never a flat grey. Always the same
    colours for the same car. **Never animated** (motion would promise a photo that is not coming). The same shape
    and size as a real photo, so nothing shifts when the person moves between a photographed car and an
    unphotographed one. Marked decorative, so assistive technology skips it — the car's name is already beside it.
    *(D7; owner's ruling, 2026-10-17.)*

### F. The narrow-width office, and the showroom's chrome

20. **On a phone or tablet the office's More cell opens Drafts, Activity log and Settings** — in sidebar order
    and sidebar wording. The cell lights up on all three paths; inside, the matching row is marked as the current
    page. It is a real control carrying an expanded state; the sheet takes focus, returns it on close, and closes
    on Escape, on a tap outside, or on a choice. Its icon reads as "more things", not as Settings. *(D1–D4; the
    tablet ruling Q-001, answered by the owner 2026-10-16.)*

21. **The showroom's nav chat control behaves the same way on every showroom page at the same width.** Today it is
    hidden on a car page and kept on home and inventory at the same width — one piece of chrome, two behaviours.
    Nothing is lost by making it consistent: the floating control and the car page's own bar both remain.
    *(D15.)*

22. **Per-width behaviour follows the one precedent the specs already set** (SD28): touch is served by swipe,
    pointer by arrows, and a laptop by both. That precedent splits by **input kind**, not by pixels alone, and any
    new per-width decision in this layer follows its shape.

### G. The contact number, and a control that is off

23. **The application never invents a value the owner did not enter.** With no number saved, **no invented number
    appears anywhere** — not in the site header, not on either not-found page, not in the privacy notice — and no
    link is built to a recipient that does not exist. *(FIX-001, carried into this layer by the owner's ruling
    2026-10-16; SD6. The five places are listed in `02-named-gaps.md` §6, and the car page's link is the one that
    currently dies rather than lies.)*

24. **With no number saved, every chat control stays on the screen and is visibly switched off.** Greyed, clearly
    off, understood as off. *(D16; owner's ruling 2026-10-17, choosing this over hiding them. The reasoning: a
    live-looking control that does nothing is exactly the fault being removed from the Search spot; a greyed
    control says "I am off". This supersedes the earlier "show nothing at all" ruling.)*

### H. The store being unreadable

25. **A store that cannot be read is never reported as emptiness, and never as a number.** The retryable state's
    wording was this layer's to settle (truth 16) and is settled: **the existing text stays** — it sits on the
    do-not-touch list, and there is no spec requirement to cite. Three things must hold together: the boundaries
    **stay where they are** (a boundary cannot catch its own segment's layout, so removing them would lose the
    case they exist for); a boundary sits **inside each shell**, so a page's own read failing keeps the chrome
    and puts the retry where the person is; and a **write** failure reaches neither, because it is returned
    rather than thrown. *(`06` call 2; design D18; the wording ruling is in the constraints below.)*

26. **A slow store shows that something is happening; a dropped connection does not throw the person out of the
    product.** Neither exists today. A soft navigation leaves the screen still for seconds with the URL unchanged;
    an offline click lands on the browser's own error page with our chrome gone. *(D34; SD9; owner's ruling
    2026-10-17 — both are built. Their wording is the Designer's.)*

### I. The not-found family

27. **A car that is not there answers as not there, and keeps its page.** The car's not-found view stays exactly
    as it is — it is helpful, it keeps the chrome, and it offers a way forward. What must change is that it does
    not report **success** to the machines that ask: a dead car link currently looks healthy to every search
    engine, link checker and monitor, forever. *(`06` call 4a.)*

28. **An office address that matches nothing lands in the office** — office words, office chrome, a way back to
    the dashboard — and not in the shop front. *(`06` call 4b.)*

29. **The two not-found presentations are not merged.** The site-wide one keeps the shape it was built and
    verified with; it deliberately drops the site chrome and still offers three ways out. Recorded so it is not
    "fixed" into something the reference does not have. *(`06` call 4c.)*

---

## Constraints on how it is done

**Where the words are already fixed, the builder's freedom is tone and placement — not what the words must say.**
Every money figure must state its reach and name what is left out (SD14). Cost figures are named by state —
"Estimated total cost", "Landed cost", "Total cost" (SD15). Negative profit is displayed without correction,
warning or clamp — it signals a bad buy, not an error (SD16). The price is the full naira figure, not abbreviated
(SD17). Incomplete costs carry a "still building" line naming how many cars are out and why (SD19). A rejected row
is explained and named (SD20).

**No control the specs forbid may be added.** No manual Refresh control (SD1). No separate alert, popup or sound
for taps (SD2). No in-app password-reset flow (SD3). No exchange-rate field anywhere (SD4). No price on a state
(SD5).

**The "never" rules bind every wording choice.** Never invent a value (SD6). Never silently drop or silently zero
(SD7). Never hide a gap (SD8). Never an error page (SD9). Nothing is deleted by the system and nothing on a clock
(SD10). Customer data never appears outside the office (SD11). A sign-in failure is the provider's message and the
office adds none of its own (SD12). A draft never counts as a record (SD13).

**Failure and attention wording** follows gold + icon + words, never colour alone (`tasks.md:73`, build task 7.4).

**The waking words and the read-failure retry wording are settled — they stay as they are.** *"Just a moment" /
"Setting things up — this can take a few seconds after a quiet spell."* and *"We couldn't load this" / "We tried
a few times but the server didn't answer. Nothing was lost — please try again."*, with its **"Try again"**
button, were quoted verbatim in `05-runtime-observations.md` §R2.5 and deliberately ruled correct: both sit on
the do-not-touch list (`04-designer.md` Part D; restated in `06-architect-calls.md`). That ruling is how G10 is
answered — the strings stay in the product **by decision**, which is what G10 asked for — and they are not to be
replaced or "improved".

**The new states take wording that is already ruled, never wording improvised at the keyboard.** The Designer's
report states that the prior rulings in `design-workspace/decisions/ux-implementation-plan.md` hold where they
apply — **the offline wording** among them. Copy found there may be used, verbatim, **where the behaviour it
states is true**; where it conflicts with a later ruling (FIX-001's ban on invented numbers, for one), the later
ruling wins. Where nothing is on disk — currently the **waiting sign** and the **office not-found**, and any
offline case the plan does not settle — the gap is **brought back** as a question, not filled in.

**The data layer's authority still binds.** The change-check is made by the server, never sent by the browser
(`openspec/tasks/TASK-003/key-and-hash-v1.md`, decisions 3–4). Nothing here may read a browser-supplied hash.

**The store is live and holds the owner's real data.** Any write made while building must be throwaway or
net-zero, and anything created carries the demo marker exactly as the seeded fleet does.

---

## Conflicts logged

1. **The Designer's approved-wording table contradicted its own "do not touch" list** on the office empty states.
   Resolved in favour of the list: the office keeps its current wording. (`04-designer.md` B1.)
2. **The Designer's "8 seconds" was adopted without a measurement** — and the measurement I demanded in objection
   turned out to be **a misreading of my own note**. The number stands, unamended. (`04-designer.md` B2;
   `06` call 1.)
3. **The Designer's references to Q-001 were stale.** Q-001 was answered by the owner on 2026-10-16, and the
   WhatsApp question belongs to FIX-001, not to Q-001. (`04-designer.md` B3.)
4. **The Designer's DR14 does not exist** — its numbering runs DR13 → DR15. Recorded as a gap in the source; the
   decisions are renumbered continuously as D1–D34. (`04-designer.md` B4.)
5. **The Designer's DR26 is unverified** (toasts against the phone bottom bar) and is therefore **not a rule**
   until someone drives it. Phase 2's numbers suggest the bar does overlap a toast at `bottom: 24px`.
   (`04-designer.md` D33.)
6. **My own Phase 2 note — "no route-level `error.tsx` exists" — was literally true and misleading in effect.**
   The boundaries exist, deliberately one level above each shell; corrected. (`06` call 2.)
7. **My own claim of a 4.3-second timing bug was wrong** and is withdrawn. (`06` call 1.)

---

## The questions this layer put to the owner — all answered

- **Q-001 (2026-10-16, "good")** — the tablet: keep the single 820px switch and declare it; **More** opens Drafts
  / Activity log / Settings; the dead Search control goes.
- **Q-002 (2026-10-17)** — six rulings: the draining bar; FIX-002 closed and the gradient put in its place; the
  waiting sign **and** the offline screen; deleting a draft is forever; no fake controls (the demo delete wired or
  removed, the Search control gone); and with no number saved the chat controls stay but are greyed.
- **Q-003** — the **first-time-visitor walk**: five questions for a person who has not used the app. **Still
  outstanding, and it needs a person, not an agent** — an agent already knows where everything is. Carried into
  `testing.md` as its own check group.
- **Q-004** — the four things that were **not** the owner's to answer: the undo timing, the no-op save, the error
  boundaries, and the 404 family. Settled in `06-architect-calls.md`.

---

## Named for other layers — not this layer's work

- **TASK-006** — the daily job: the drift report, the retention notice's writing, the `last_backup_at` heartbeat,
  the `auth_attempt` 90-day trim, and the clearance of assets no record references. Where this layer's research
  meets one of them (the retention notice is a message a person may read), it is **named and left alone**.
- **Architecture** — the pending rewrite of the specs' *"section"* vocabulary to *"primary state"* (design D15 d).
  **Do not settle it here.** This layer touches it only where copy may have to say "state" where the code says
  "section".
- **Carried from TASK-003** — the seed's child-row id churn; `components/CarCard.tsx:31`'s dead `mi`;
  `lib/serialize.ts:153`'s `mileage`→`mileageKm` alias. Named so they are not rediscovered as new.
- **From TASK-004's closing gate, not absorbed here** — four of its five honest "not verified" items (the Acrobat
  blank, the idle-path revoke, the restore script, the guarded notice read) and its two nits (the stale
  `refusal-proof.ts`, the unmaintained `pdf-lib`). Only the **503 paths** touch this layer, and only because they
  are the same ground as the retryable state.

---

## Benchmarks — what this must add up to

Stated as outcomes, not steps: after this change, when the person does X, Y is what happens.

1. When someone deletes a car and watches, a bar drains in the offer for the full eight seconds it promises — and
   when it runs out, the car is gone for good.
2. When someone saves a car without changing anything, the screen says nothing changed rather than "Saved".
3. When someone opens a car that has no photos, they see a coloured box in the shape of a photo — and nothing that
   reads like a machine.
4. When a photo fails to load, the box the person sees is the same one they would have seen had the car no photos.
5. When the store cannot be read while someone is working in the office, the office chrome is still there and the
   message is about the thing they were doing — not about the store.
6. When someone follows a dead car link, the page answers as not-found and keeps the site around them.
7. When someone mistypes an office address, they land somewhere in the office, with a way back — not in the shop.
8. When someone on a phone taps **More**, they get Drafts, Activity log and Settings, and they can get back where
   they were.
9. When no WhatsApp number is saved, the chat controls are visibly off rather than live-looking, and no number is
   shown that the owner did not enter.
10. When someone is offline and taps, they stay inside our product.
11. When someone is on a phone and the office is slow, they can see that something is happening.
12. When a first-time visitor walks the journey, the five questions in `testing.md` are answered about them.

---

## What this task does not do

- It adds **no feature, no route, no data and no rule**. Every requirement above is about how something already
  built behaves or reads.
- It does not redraw what the reference settled, and it does not "improve" anything on the Designer's do-not-touch
  list (`04-designer.md` Part D).
- It does not touch the substance of office-access, money, media, enquiries or inventory — only their wording and
  presentation.
- It does not settle TASK-006's ground or architecture's vocabulary debt.
- It does not merge the two not-found presentations, and it does not remove the error boundaries.
