# 06 — The four calls I had to make (settled 2026-10-17)

**What this file is.** Four questions the design pass left as **mine** — not the owner's, not the Designer's.
Each is settled here by reading the code and deciding, so that `task.md` contains no guess and no "to be
decided". Every claim carries the file and line it came from; nothing is recalled.

**Why it is a separate file from `04-designer.md`.** That file is the Designer's record. These are architecture
calls, and mixing them in would blur who decided what. `04-designer.md`'s Part C and Part G now point here.

**The rule this file follows** (M7 of the research plan): *cite, don't trust.* Where the code answers, the code
is quoted. Where the call is mine, it is said plainly and the reasoning is given.

---

## Call 1 — The "4.3-second bug" does not exist. That was my error.

**What I had claimed:** that the undo toast closes at about 4.3 seconds while the source says 8000 ms, and
therefore that no draining bar could be drawn until that fault was found and fixed (`04-designer.md`'s D27,
Part B's B2, and the research plan's run log).

**What is actually true.**

- The window is set in **exactly one place**: `showToast(message, isError, ms)` at
  `app/office/(shell)/inventory/inventory-client.tsx:175-182` — a single `window.setTimeout(…, ms)` that clears
  the message, clears the undo offer and drops the remembered car.
- It is called with **8000** at `inventory-client.tsx:206`.
- So the window is **8 seconds, one timer**, starting when the offer appears.

**Where my "4.3 s" came from.** Phase 2's own note says it correctly — the raw observation was never wrong:

> *"The window was still open at ~4.3 s … The end of the window was NOT observed."*
> — `findings/05-runtime-observations.md:290-293`

The ~4.3 s is **how long the toast had already been open when the researcher clicked Undo** — the probe clicks
at ~4 s on purpose (`runtime/probe-r23-undo-timing.mjs:91`, *"click Undo at ~4 s (well inside the 8 s the source
claims)"*). It is an **observed open duration**, not a **death time**. I read *"still open at 4.3 s"* as
*"died at 4.3 s"*, and the mistake then propagated into D27, into B2, and into the plan's run log.

**What this changes.**

- **D27's precondition is void.** There is no bug to find and the bar is not waiting on anything. The bar is
  drawn for the code's own **8 seconds**.
- **DR22's "8 seconds" stands, unamended.**
- The one thing genuinely never seen is the **lapse** — what the screen does when the 8 seconds run out (the car
  becomes a permanent deletion). It was not watched **on purpose**, because letting it lapse tombstones a real
  car. It is a **testing** item, not a bug: `testing.md` gets a check that drives the window to the end on a car
  that is safe to lose, and confirms the bar reaches zero exactly as the offer goes and the tombstone lands.

---

## Call 2 — The error pages already exist. They sit one level too high for a write failure.

**What I said in Phase 2:** *"no route-level `error.tsx` exists under `(site)` or `office/(shell)`."* Literally
true, and **misleading in effect** — the boundaries exist, deliberately placed above each shell, and both say so
in their own comments.

| File | What it catches | Its own comment |
|---|---|---|
| `app/error.tsx` | a throw from anything under the app root — **including `app/(site)/layout.tsx`'s store read** | *"It is placed at the root, not beside `app/(site)/layout.tsx`, because an error boundary does not catch the layout in its own segment: the public layout's store read is caught here."* |
| `app/office/error.tsx` | a throw from anything under `/office` — **including the `(shell)` layout's session check** | *"…including the `(shell)` layout's session check, which this segment wraps."* |

Both render `<Retryable onRetry={reset} />` (`components/retryable.tsx`) — *"We couldn't load this / We tried a
few times but the server didn't answer. Nothing was lost — please try again."* with **Try again**.

**So the shell-wipe is not a missing page. It is where the boundary sits.** A boundary cannot catch its own
segment's layout, so it *must* sit one level up — and a boundary one level up replaces everything below it,
the shell included. The code says this out loud; my Phase 2 note just did not connect it.

**The mechanism behind the measured shell-wipe, named.** `lib/store-guard.ts:22-23`:

> *"If every attempt fails the last error is thrown, which an `error.tsx` boundary turns into a retryable
> state — never a bare 500 and never a fabricated figure."*

So: a write action calls `storeQuery` → every retry fails → it **throws** → the throw bubbles to
`app/office/error.tsx` → the **whole office, shell included, is replaced**. That is exactly the behaviour Phase 2
measured, and exactly what D32 forbids.

**My calls.**

1. **The two boundaries stay where they are.** They are the only thing that can catch a *layout's own* read, and
   when the shell's own session/store read fails there **is** no shell to keep — a retry is the honest answer.
2. **A boundary goes inside each shell** — `app/office/(shell)/error.tsx` and `app/(site)/error.tsx` — so a
   **page's** read failing keeps the nav, the person stays where they are, and the retry appears **in the content
   area** instead of wiping the chrome.
3. **A write failure must not throw at all.** The pattern already exists in this codebase — `photosExist` at
   `lib/car-form.ts:106-118` catches an unreachable store and **returns a refusal with words**:

   > *"The picture store could not be reached, so nothing was saved. Try again."*

   **The write statements simply are not wrapped the same way.** The call is: wrap `storeQuery` in
   `updateCar`/`createCar`/`deleteCar`/`undoDeleteCar`/`removeCarForever` (`app/office/actions/car.ts:121` is the
   first) exactly as `photosExist` already wraps its read — catch, return `{ ok: false, errors: […] }` with words
   in the action's own voice, report it **in place** (D32), and never let it reach a boundary.

**Division of labour, stated so it is not blurred.** The boundaries' **existence and placement** are mine (this
call). Their **words** are the Designer's — `Retryable`'s text is already ruled and is on the "do not touch"
list (`04-designer.md` Part D), and D32 governs the failed-write wording.

---

## Call 3 — "Did anything change?" is already computed. The gap is one fact that is not returned.

**The question** (D28): how does the office know a save changed nothing, so it can say *"Nothing changed."*
rather than *"Saved."*?

**The answer is in the code, and the machinery is already there.**

- `lib/change-check.ts` — `carChangeCheck` / `enquiryChangeCheck`: a row's editable details boiled down to one
  short string (SHA-256 over a fixed field list in a fixed order, versioned by `CHANGE_CHECK_VERSION`).
- `lib/car-update.ts` — the one statement that changes a car. It works out whether anything *would* change (the
  fourteen columns through the change-check, the cost-line set, the secondary-state set, the sale, and the photo
  set in its order) and **"does nothing at all when nothing would"** (`car-update.ts:12-19`). It is idempotent
  for exactly this reason, and `car-update.test.ts:112` pins it: *"the whole write is gated so a retry cannot
  double-apply"*.
- `app/office/actions/car.ts:105-127` — the action recomputes the hash from the submitted values
  (`carChangeCheck(…)`, never reading a browser-supplied hash), runs the statement, then reads `rows[0]?.ref`.

**The gap, precisely.** The statement returns the car's `ref` **whether or not anything changed** — its trailing
`UNION ALL SELECT ref FROM car …` guarantees the ref comes back either way (the same shape
`lib/car-state.ts:55-56` describes: *"the trailing `UNION ALL` is what lets that retry still report the row it
already wrote"*). So `updateCar` gets `rows[0]?.ref` and cannot tell a real save from a no-op — it returns
`{ ok: true, ref }` for both, and the screen says *"Saved."*

**My call.** The statement reports whether it changed (one extra fact on the row it already returns); the action
passes it through; the screen says **"Saved."** when true and **"Nothing changed."** when false (D28).
**No new machinery — one fact added to a result that already exists, and the comparison is already performed on
every save.**

---

## Call 4 — The 404 family: one honest status, one missing page, one thing left alone.

Three different things happen today, and they do not agree with each other.

| The case | What happens now | Evidence |
|---|---|---|
| **A car that does not exist** | Renders its own view — *"We could not find that car"*, **chrome kept**, offering WhatsApp and *"See all cars"* — and answers **HTTP 200** | `app/(site)/car/[ref]/page.tsx:83-86`, `:588-623` |
| **A page that does not exist** | The root not-found, **404**, **no header, footer or nav** (it imports its own CSS), one card with two buttons and a home link | `app/not-found.tsx:24-96` |
| **An office URL that does not exist** | Falls into the **showroom's** 404 — the shop's words, the shop's number, **no way back to the office** | §R2.5; no office not-found exists |

**My calls.**

**(a) A missing car answers 404, and keeps its view.** The view itself is good: it says the car may have sold,
it offers a way to ask, it offers a way to browse. Nothing about it is wrong for a person. What is wrong is the
**status** — a page that is not there reports *success* to every search engine, link checker and monitor, so a
dead link looks healthy forever. **The view stays exactly as it is; the status becomes honest.** The mechanism is
the Builder's; the outcome is mine: **404, with the helpful view and the chrome kept.**

**(b) The office gets its own not-found.** An unknown `/office/…` must land in the **office** — office words,
office chrome, a way back to the dashboard — and never in the shop front. This is **new** (there is no reference
for it), so it is an addition, not a correction.

**(c) The root 404's bare card stays as built — it is not a defect.** It drops the site chrome on purpose, it
matches the reference the UI layer was built and verified against (`RECON-001/report.md:20` — *"Public branded
404; wraps under (site) layout + root fallback"*), and it still gives **three** ways out (browse the inventory,
message, home). Nobody is trapped. **Recorded here so a later pass does not "fix" it into something the
reference does not have.**

**(d) A copy note, for the Designer's rule — not a build item.** The same event is worded two ways —
*"We couldn't find that page"* against *"We could not find that car"* — including the contraction style
(`couldn't` / `could not`). Each is fine alone; only the **pair** disagrees. Left to the Designer's wording rule
(D12) rather than invented here.

**Not re-decided here:** the invented WhatsApp number on both 404s is **FIX-001**, already carried by this layer.

---

## What this file changes elsewhere

- **`04-designer.md`** — D27 and Part B's B2 corrected; Part C's rows 3, 4 and 7 answered; Part G rewritten.
- **`research-plan.md`** — Checkpoint C's line, the Phase 3 run-log entry's "4.3-second bug" sentence, §7's item 4(a).
- **`questions.md`** — Q-004's plain-language summary of the four calls.

## What is still genuinely open after this file

1. **The toast's place on a phone** (D33 / `04-designer.md` Part G) — does the office bottom bar cover a toast at
   `bottom: 24px`? One measurement; Phase 2's numbers say yes but it was never driven.
2. **The lapse** (Call 1) — what the screen does when the undo window runs out. Never observed; a **testing**
   item.
3. **The first-time-visitor walk** — five questions, for a person who has not used the app. The only evidence
   these rulings landed.
