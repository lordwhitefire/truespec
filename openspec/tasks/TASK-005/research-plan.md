# TASK-005 — the Architect's research plan (my own work plan)

**What this file is.** The plan for **my** work — the research I must do before I can write the dev's task.
It is written **before any research starts**, and it is edited as I learn: split a step, add a surface, drop a
wrong assumption. Editing it is the plan working, not failing.

**What this file is NOT.** It is not the dev's task. The dev's task is a separate artifact — `task.md` and
`testing.md` in this same folder — and it is written **last**, out of the materials this plan gathers.

**The rule that makes this necessary.** `openspec` is the Architect's workspace, and my context is finite. The
UX research is bigger than one run and it *will* compact. So nothing may live only in my head: every finding is
written down as it is found, and this file carries my place. **A finding I did not write down is a finding lost.**

**The stakes (the owner's words).** The software is now complete — four layers built. This layer is about the
**experience** of the whole app, so the research has to cover the **whole app**: office and showroom, every
surface, every state, every width. If the plan is weak, the dev implements weakly, and the person at the other
end — the owner in the office, the buyer on the showroom page — has a bad experience. This layer gets more care
than the ones before it.

---

## 1. The shape of the work: two stages

**Stage A — the research (this plan).** Go and find out everything the layer must handle. Huge, chunked,
persisted to disk, delegated where sensible, expected to compact several times.

**Stage B — the dev's task (written last).** From the accumulated materials, write `task.md` (the plan for the
dev) and `testing.md` (the checks for a session that did not build it). Still a **plan, not instructions** —
the owner's standing ruling (2026-10-08): requirements, constraints and process guide; they never command,
because a command hands the Builder my oversights.

## 2. Where everything lives

```
openspec/tasks/TASK-005/
  research-plan.md          ← THIS FILE. My plan, my progress, my run log.
  findings/                 ← the materials, written as I go
    01-surfaces.md            every surface of the app, and every state each one can be in
    02-named-gaps.md          every gap earlier layers explicitly handed to TASK-005
    03-spec-demands.md        what the specs already demand about interaction, failure and width
    04-designer.md            what the Designer hands back, and which skills it used
    05-runtime-observations.md  what the app actually does when used (runtime, not source)
    questions.md              what needs the OWNER's ruling (never guessed by me)
  task.md                   ← LAST. The plan the dev implements.
  testing.md                ← LAST. What the tester must check, and how they will know it passed.
  TASK-005-report.md        ← when the work comes back (Moment three).
```

**No `tasks/plan.md` / `tasks/todo.md` in this project.** The planning skill's default output paths do not apply
here: this project's tracker is `openspec/tasks-registry.md`, and this layer's task artifacts live under
`openspec/tasks/TASK-005/`. Nothing existing is being overwritten — the folder is new.

## 3. How I work — the method (fixed before starting, so it survives compaction)

**M1 — Persist before continuing.** Every finding is written to its `findings/` file in the same session it is
found. No "I'll write it up later". A run that ends without a written finding is a run wasted.

**M2 — One Explore session, resumed — never a fresh one each time.** Delegated discovery goes to **one** Explore
sub-agent, and I keep **resuming it by its session ID** so it stays warm and knows the app. Its session ID is
recorded in §6 of this file, so a compaction cannot lose it. A fresh Explore session knows nothing and I would
pay twice for the same discovery.

**M3 — Runtime beats source.** The layer is about what the app *does* when a person uses it. Source tells me
what was intended; the running app tells me the truth: what a click actually does, where focus actually lands,
what an error actually says, what a phone width actually shows. Where they disagree, the running app wins and
the disagreement is recorded. (The dev's own `RUNTIME-UI-DIFF` method in `developer-workspace/notes/` is the
precedent — as a method, not as an authority over the spec.)

**M4 — Stop between chunks.** I do not attempt the whole research in one run. Between chunks I write, update
this file's run log, and stop. The next run starts by reading this file.

**M5 — The Designer is consulted, and it is told about the skills.** It makes the UX calls; I do not invent
them. **Anything I cannot do even with the skills is routed to the Designer, not fudged by me.** Skills now
installed globally and available to it:
- `emil-design-eng` — motion, detail, dialogs, toasts, craft (Emil Kowalski — the author of Sonner and Vaul).
- `web-design-guidelines` — Vercel's Web Interface Guidelines; interaction, focus, wording, accessibility, and a
  real `file:line` audit of UI code.
- `frontend-design` — visual direction and typography; keeps choices from reading as templated defaults.
- Already present and still in play: `frontend-ui-engineering`, `browser-testing-with-devtools`.

**M6 — I never build, and I never instruct the dev.** No code, no UI. I write plans and checks. The dev writes
the code; a separate session checks it.

**M7 — Cite, don't trust.** Every finding names where it came from — a `file:line`, a route, a runtime
observation, or a spec requirement. A finding with no source is not a finding; it is my memory, and memory is
what compaction eats. Where a dev note, a report or a comment disagrees with the spec, the **spec wins** and the
conflict is logged, not silently smoothed over.

## 4. The research phases — my task list

Each step: what it must answer, how I will know it is done, and where the answer is written. Steps are ordered
so that later ones build on earlier ones. Sizes: S = one sitting, M = a couple, L = needs delegating.

### Phase 0 — Ground the layer before spending anything

- [x] **R0.1 Collect every gap earlier layers named for TASK-005.** *(S)* — **done 2026-10-16**, written to
      `findings/02-named-gaps.md` (236 lines). Ten gaps (G1–G10) plus FIX-001's five places, each with its source
      file and line.
  - **Answers:** every place a previous layer said "this belongs to TASK-005" — the gaps named in TASK-004's
    plan, its report and the registry, plus anything TASK-002/003 handed forward.
  - **Also carries FIX-001** (owner ruling 2026-10-16: written into this layer) — the invented-number fallback in
    its five places, and the ruling that no number saved means **nothing** is shown.
  - **Done when:** every named gap is listed with its source, and none is left as "probably fine".
  - **Written to:** `findings/02-named-gaps.md`
- [x] **R0.2 Collect what the specs already demand about the experience.** *(S)* — **done 2026-10-16**, written to
      `findings/03-spec-demands.md` (161 lines). 28 demands, SD1–SD28, each quoted with its file and line.
  - **Answers:** the standing requirements this layer must not contradict — no manual Refresh control anywhere;
    refresh on focus; taps as badge/list and never a popup, alert or sound; a store blip becomes a retryable
    state and never an error page; the door stays server-side; a missing asset shows a placeholder; no invented
    value (no setting → no WhatsApp button); the office says what a figure counts.
  - **Done when:** each demand is quoted with its spec file and requirement name.
  - **Written to:** `findings/03-spec-demands.md`

### Phase 1 — Inventory the whole app (the surfaces)

- [x] **R1.1 List every surface, and every state each surface can be in.** *(M)* — **done 2026-10-16**, written to
  `findings/01-surfaces.md`.
  - **Surfaces known to exist (from the orientation scan):** showroom — home, inventory, car detail, privacy,
    not-found; office — sign-in, sign-out, account, dashboard, inventory, car list, car new, car detail, drafts,
    enquiries (+ its tabs), activity, settings; and four API routes — export, tap, template, upload.
  - **States per surface:** first paint, loading, empty, one item, many items, very long data, a missing asset,
    a store blip, a failure, a refusal (no session / malformed input), a phone width, a laptop width.
  - **Answers:** the full matrix. Nothing may be missing from it, because a surface missing here is a surface
    never planned for.
  - **Done when:** the matrix is complete and each row names its route and its component files.
  - **Written to:** `findings/01-surfaces.md`
  - **Note:** this is the map every later phase walks. Delegatable to Explore.

### Checkpoint A — the map is complete
- [ ] Every named gap is collected · [ ] every spec demand is quoted · [ ] the surface matrix has no blank row
- [ ] This file's run log is updated · [ ] **Stop and report to the owner before Phase 2**

### Phase 2 — Observe the app as it actually behaves

The layer's own named scope is the spine of this phase. Zoom, area by area (each gets its own pass, not one
giant one — this is where compaction is expected):

- [x] **R2.1 Dialogs and overlays.** *(M)* — **done 2026-10-16**, §R2.1 in `findings/05-runtime-observations.md`.
  - **Answers:** which actions open a dialog or overlay; can it be dismissed every way a person expects
    (Escape, click-outside, a Cancel that is *labelled* Cancel); is focus trapped inside while open; where does
    focus go when it closes; can the page scroll behind it; does anything destructive hide behind a look-alike
    of a safe control.
  - **Written to:** `findings/05-runtime-observations.md` (one section per area)
- [x] **R2.2 Focus.** *(M)* — **done 2026-10-16**, §R2.2 in `findings/05-runtime-observations.md`.
  - **Answers:** where the cursor lands after a save, a delete, a state change, a tab switch, a navigation, a
    validation failure; whether a keyboard user can reach and leave every control; whether focus is ever
    silently lost to the top of the page.
- [x] **R2.3 Feedback and confirmation — and undo timing.** *(M)* — **done 2026-10-17**, §R2.3 in `findings/05-runtime-observations.md`.
  - **Answers:** after each write, what the person is told and how quickly; whether any destructive action asks
    first and in words a person understands; where undo exists, **how long it waits** before it is too late, and
    whether that window is visible to the person; whether a save that did nothing says so.
- [x] **R2.4 A store blip and the offline path.** *(M)* — **done 2026-10-17**, §R2.4 in `findings/05-runtime-observations.md`.
  - **Answers:** what the owner actually sees when the store is cold, slow or dropped — the shared retryable
    state and its wording; whether anything is ever invented to fill a blank; what the showroom does when an
    asset will not load; whether a failure changes what the person believes happened.
  - **Note:** this is D18's territory; the observation is about the *person's* view of it, not the server's.
- [x] **R2.5 Failure wording.** *(M)* — **done 2026-10-17**, §R2.5 in `findings/05-runtime-observations.md`.
  - **Answers:** every message the app shows when something goes wrong, quoted verbatim — the door, a malformed
    amount, a wrong WhatsApp number, an unreadable upload, a failed save, a missing car, a 404. Which of them
    name what happened, which of them blame the person, and which of them are machine talk.
  - **Also the invented-number places (FIX-001):** what each of the five renders when no number is saved today,
    and what must replace it — the two 404s, the two privacy-notice lines, and the header block that goes away.
- [x] **R2.6 Per-width interactions.** *(M)* — **done 2026-10-17**, §R2.6 in `findings/05-runtime-observations.md`.
  - **Answers:** the showroom and the office at a phone, a tablet and a laptop width — what shifts, what is
    unreachable, what overlaps, what needs a behaviour that exists at one width and not another (swipe versus
    arrows, a drawer versus a sidebar, a stacked form versus a row).
- [x] **R2.7 The long-and-empty extremes.** *(S)* — **done 2026-10-17**, §R2.7 in `findings/05-runtime-observations.md` (+ **FIX-002**).
  - **Answers:** a list with zero rows, a list with far more rows than fit, a car with no photos, a car with no
    costs, an enquiry with no note, a very long car name — what the layout does to the person's eye.

### Checkpoint B — the observations are on disk
- [x] Each of the seven areas has written findings with sources · [x] every verbatim message is captured
  — **2026-10-17.** R2.0–R2.7 all in `findings/05-runtime-observations.md` (917 lines); every string quoted verbatim
  with its file and line. §R2.5 holds the failure-wording inventory; the empty-state, extreme-value and per-width
  strings R2.6/R2.7 added are quoted with sources in their own sections.
- [x] Nothing observed but unwritten — every observation of Phase 2 is on disk, including the two corrections of my
  own earlier claims (R2.6's overflow spike, §R2.5's FIX-001 "latent") and the verification debts that are *not*
  observations (the note-less enquiry; behaviour beyond ~36 rows).
- [x] **Stop and report to the owner before Phase 3** — report made and **Phase 3 was authorised 2026-10-17**
  ("ask the deginer and tell me what it suggets").

### Phase 3 — Consult the Designer

- [x] **R3.1 Brief the Designer, with the skills named.** *(M)* — **done 2026-10-17.** Briefed through the
  `designer` sub-agent with the surface matrix, the named gaps (G1–G10 + FIX-001), the 28 spec demands, the
  seven observation areas, the three skills named as its, and the runtime address. Told to write its report
  **in its own workspace** (the owner's instruction) and to return a path plus a short summary.
  - **It returned:** `design-workspace/decisions/TASK-005-ux-rulings.md` — 26 rulings (DR1–DR26), seven open
    questions, and a "do not touch" list. Read here in full.
  - **The brief asked for:** the UX rules this layer holds to; the silent failures; the decisions that are
    genuinely judgement calls; and anything it could not decide without the owner. It delivered all four and
    named one thing it could not do — the first-time-visitor walk.
- [x] **R3.2 Take the Designer's decisions, and record the questions it cannot answer.** *(S)* — **done
  2026-10-17**, written to `findings/04-designer.md` (410 lines): **D1–D34** in the order they were agreed,
  **Part B** the five things I did not accept and why, **Part C** the seven open questions with where each
  landed, **Part D** what is fine and must not be "fixed", **Part E** the two mechanisms written out, **Part F**
  the citations checked against the code, **Part G** what is still open.
  - **Rule kept:** a question for the owner is a question, not a guess. Nothing was invented on the owner's
    behalf; the seven questions are answered or named as mine, never assumed.
  - **Corrections made to the source, not smoothed over:** the Designer's DR11 table rewrites the office zero
    states that its own "do not touch" list calls correct — I resolved in favour of the list (B1); its DR14
    was never written (B4); its Q-001 and WhatsApp references are stale (B3); and its "8 seconds" was adopted
    without the measurement (B2). All five are recorded as corrections.

### Checkpoint C — the materials are enough to write from
- [x] Every area has findings — **2026-10-17.** Surfaces, gaps, spec demands, seven observation areas, and the
  design decisions are all on disk.
- [x] The Designer's decisions are written — **2026-10-17**, `findings/04-designer.md`.
- [x] The owner's questions are written — **2026-10-17**, `findings/questions.md` (Q-001 answered; the
  first-time-visitor five added).
- [x] **Stop and ask the owner the questions before writing the task** — **the owner's share was asked and
  answered on 2026-10-17**, and the four that remained **mine** were settled by reading the code the same day
  (`findings/06-architect-calls.md`). So there is nothing left to stop for: **Checkpoint C is passed** and
  Phase 4 can be written from the materials.

### Phase 4 — Write the dev's task (Stage B)

- [ ] **R4.1 Write `task.md`** — the plan: what must be true, the constraints, the benchmarks shaped as
      *"after this change, when the person does X, Y happens"*, the logged conflicts, the gaps left to TASK-006,
      and the questions this layer puts to the owner — **including FIX-001's fix (the fallback removal) as an
      explicit part of the plan, by the owner's ruling of 2026-10-16**. *(M)*
- [ ] **R4.2 Write `testing.md`** — the check groups, for a session that did **not** do the building, each with
      how the tester will know it passed. *(M)*
- [ ] **R4.3 Validate and read back.** *(S)*
  - `openspec validate --all` passes; every file written is read back in full (head, tail, line count) against
    what I intended; the registry entry for TASK-005 is left **unticked** — planning is not building.
- [ ] **R4.4 Hand to the owner and stop.** *(S)*

### Checkpoint D — done
- [ ] `task.md` and `testing.md` exist, validate, and are built from materials that are all on disk
- [ ] Every finding in them traces to a file in `findings/` · [ ] Owner has them

## 5. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Compaction loses findings** | High | Write-to-disk in the same session (M1); the run log in §6 carries my place; the Explore session ID lives in the file (M2) |
| **The Explorer goes cold / a new one restarts discovery** | Med | One session, resumed by ID; the ID is recorded here, never only in my head (M2) |
| **The layer quietly becomes an implementation** | High | M6 — I write plans and checks only; no code, no UI, no instructions to the dev |
| **A surface is missed** | High | The Phase 1 matrix is a checkpoint: no blank rows, then verify before moving on |
| **Source read as truth, and the running app never checked** | High | M3 — runtime beats source; every observation cites a runtime fact |
| **A dev note or comment is trusted over the spec** | Med | M7 — spec wins; conflicts logged, never smoothed |
| **Standing rules get contradicted by a nice-sounding UX idea** | High | Phase 0 gathers them first; a UX proposal that breaks one (a popup, a Refresh button, an invented number) is wrong no matter how nice it looks |
| **The owner's unresolved questions get guessed at** | High | Checkpoint C — ask before writing |
| **TASK-005 pulls work that belongs elsewhere** | Med | **FIX-001 is IN this layer — the owner's ruling (2026-10-16)**; its fix is carried in `task.md`, not planned around. TASK-006 (behaviour over time) stays out, and is named here so it is *seen* and *not done here* |

## 6. Run log — append-only (this is what survives compaction)

Each run appends: the date, what was done, what was found and where it was written, what is still open, and the
next single step. **Never rewritten, only added to.**

- **2026-10-16 — plan written, no research done yet.**
  - Written: this file. Orientation scan only (directories, route files, component folders) — no reading of app
    code, no runtime observation, no Designer contact yet.
  - Established: the surface list in R1.1; `design-workspace/journeys/` is **empty** (so the app has journey
    documents planned but not written — the UX research will have to build its own journeys).
  - **Explore session ID: `ses_eb7d50a05ffeP20r4CfR67RM2F`.** Created for R1.1; resumed by ID (M2).
  - Next single step: **R0.1** — collect every gap earlier layers named for TASK-005.
- **2026-10-16 — the invented-number defect read out of the code (the owner asked what it means).** Not a plan
  change, but a finding — written here so it is not lost, and it will be expanded in **R0.1** (named gaps) and met
  again in **R2.5** (failure wording). Verified, not recalled:
  - **Source:** `getSetting("whatsapp_number")` (`lib/public-cars.ts`); `app/(site)/layout.tsx:55-56` coerces an
    absent value to `""`.
  - **Invented in five places, three files:** `app/(site)/layout.tsx:88` (`{num || "+234 800 000 0000"}`, header);
    `app/not-found.tsx:75` and `app/(site)/not-found/page.tsx:25` (hardcoded `wa.me/2348000000000` on each 404);
    `app/(site)/privacy/page.tsx:88` (the privacy notice **states the invented number as fact**) and `:118` (the
    same link at its foot).
  - **The main button dies rather than lies:** `waLink` (`components/whatsapp.ts`) strips non-digits, so an empty
    number builds **`wa.me/?text=…` — a link to no recipient** — on the car page, the site's whole conversion path.
  - **Correction of an earlier wrong claim of mine:** `+2348000000000` is **accepted** by `lib/phone.ts` (ten-digit
    national number beginning `8`, so it passes `MOBILE`). It was never refused. The registry's FIX-001 wording has
    been corrected. **The lesson for the research:** the office's validation cannot catch an invented-but-well-formed
    value, so the *"never invent"* rule is carried by the app not inventing it — never by a validator.
  - **Still no research run and no Explore session.** Next single step unchanged: **R0.1**.
- **2026-10-16 — the owner's rulings on FIX-001 (this changed the plan, so it is recorded here).**
  - **FIX-001 is written into TASK-005** (owner, 2026-10-16) — **not** planned around, which was my assumption.
    Its fix goes in `task.md`, its checks in `testing.md`; the registry entry stays and is now marked as carried
    by this layer. §7.3, the risks table, R0.1, R2.5 and R4.1 were corrected to match, so the plan does not
    contradict itself.
  - **When no number is saved there is to be nothing at all** (owner, 2026-10-16): no "WhatsApp" block in the
    header, and the privacy notice names no number — it speaks of "our WhatsApp".
  - **Corrected in the same pass, and it was my error:** I had claimed the office's validator *refuses* the
    invented number. It **accepts** it. That false sentence is now removed from the registry's FIX-001 entry, the
    stale "demo store" claim is gone with it, and the owner's confirmation that **his store holds his real
    number** is recorded there instead.
  - Next single step unchanged: **R0.1**.
- **2026-10-16 — R0.1 DONE. `findings/02-named-gaps.md` written (236 lines).** Documentary collection only — no
  app code read, no runtime observation, no Designer contact.
  - **Ten gaps collected (G1–G10)**, each with its source file and line: the five named in one paragraph at
    `TASK-004/task.md:265-268` (focus handling; toast ordering/wording; the offline indicator; the gold-vs-red
    attention wording; the per-width interaction split), the retryable state's **wording** (`task.md:207-210`,
    truth 16), the dev's three additions (`reports/TASK-004.md:229-233`: toast/confirm presentation; the 8-second
    undo's **presentation**; the **genuinely-open tablet nav**), empty-state polish (`TASK-001/testing.md:125`),
    and the **interim strings** that must not become final copy (`notes/TASK-004-task29.md:131-134`).
  - **Two things found that are not gaps, and must not be mistaken for them:** (1) a **standing demand** —
    *"gold + icon + words, never colour alone"* at `changes/truespec-architecture/tasks.md:73` (build task 7.4),
    which belongs in **R0.2**; (2) a **vocabulary debt** owned by Architecture — the specs' *"section"* →
    *"primary state"* rewrite (D15 d, `reports/TASK-004.md:237-239`) — which this layer must not settle.
  - **Named for other layers and left alone:** TASK-006's daily job (drift report, retention notice,
    `last_backup_at` heartbeat, `auth_attempt` trim, orphan-asset clearance); TASK-003's three carried code debts
    (seed child-row id churn, `components/CarCard.tsx:31`'s dead `mi`, `lib/serialize.ts:153`'s alias).
  - **Carried verification debts (registry:38):** five "not verified" items plus two nits. **Only one touches this
    layer** — the **503 paths**, which are the same ground as G3/G6. The research must **look** at them, not
    assume them.
  - **FIX-001** is collected in the same file (§6) with its five places and the owner's rulings, since the owner
    put it in this layer.
  - **Flagged for later:** the **tablet nav is undecided** — a ruling to ask the owner for, not a polish to
    invent. Must reach the Designer brief (Phase 3) and the owner's questions.
  - **Next single step: R0.2** — collect what the specs already demand about the experience →
    `findings/03-spec-demands.md`. Still no findings report handed to the owner yet, and no Explore session
    created (not needed for R0.1/R0.2 — both are file work).
- **2026-10-16 — the tablet nav investigated (the owner asked for my recommendation).** Detour, not a plan
  change: I had flagged it as undecided in §3.3 of `findings/02-named-gaps.md` and he asked what I recommend, so
  I read the nav rather than answer from the handover note.
  - **Written to:** `findings/questions.md` — **Q-001**, the first question filed for the owner. The plan already
    named `questions.md` as the home for these (§ Phase 3), so no new file kind was invented.
  - **The facts:** one width switch at **820px** (`office.css:128-142`, `:149`) — above it the seven-destination
    sidebar, at or below it a topbar plus a **five**-destination bottom bar. A tablet is therefore treated as a
    phone.
  - **Two genuine holes found at ≤820px, not style questions:** (1) **Drafts has no way in** — its only other
    link in the app is the post-import link at `components/office/CreateFromFile.tsx:135`; (2) a **dead Search
    button** on the dashboard, `components/office/OfficeTopbar.tsx:29`, labelled `"Search (UI placeholder)"` —
    the only such dead control in the app.
  - **Checked and *not* a hole:** Activity log is absent from the bottom bar but **is** reachable as "Full log"
    from the dashboard (`app/office/(shell)/page.tsx:131`). Recorded so nobody "fixes" a non-problem later.
  - **My recommendation (in the file, awaiting his ruling):** keep one breakpoint and **declare** it; make the
    bottom bar's **"More" open Drafts / Activity log / Settings**; **remove the dead Search button** (make it
    real only as its own task).
  - **Not built, not decided, not in the task.** Awaiting his word. Next single step unchanged: **R0.2**.
- **2026-10-16 — Q-001 ANSWERED. The tablet nav is no longer open.** The owner's word: **"good"** — all three
  recommendations accepted. Recorded in `findings/questions.md` (Q-001 now carries the ruling and the note that
  the three points are **requirements of this layer**).
  - (1) **Keep the single 820px switch and declare it** — a tablet gets the phone shell, a landscape tablet the
    sidebar, **no tablet-only layout**; (2) the bottom bar's **"More" opens Drafts / Activity log / Settings**;
    (3) the **dead Search button is removed** — real search, if ever wanted, is its own task.
  - This removes the one item R0.1 had to leave open. It joins FIX-001 as work **in** this layer, and both go
    into `task.md` at Phase 4. The "More" list's **look** is the Designer's (Phase 3).
  - **Boundary checked before R0.2:** `openspec/specs/` is **empty** — nothing is codified yet, so the eight spec
    files under `changes/truespec-architecture/specs/` are the change's own deltas (mine to read), not codified
    output.
  - **Next single step unchanged: R0.2** — the specs' standing demands → `findings/03-spec-demands.md`.
- **2026-10-16 — R0.2 DONE. `findings/03-spec-demands.md` written (161 lines; SD1–SD28).** Documentary only — no app
  code read, no runtime observation, no Designer contact.
  - **What was collected:** 28 standing demands in five groups — the five **prohibitions** (no manual Refresh; no
    alert/popup/sound for taps; no in-app password reset; no rate field; no price on a state), the **"never"
    rules** (never invent a value; never silently drop or zero; never hide a gap; never an error page; never
    delete by the system or on a clock; never show customer data publicly; never echo identity on a failed
    sign-in; never let a draft count as a record), the **label wording** the specs fix ("from N of M cars",
    "Estimated total / Landed / Total cost", the full naira figure, the badge's since-last-look meaning), the
    **feedback/confirmation** demands (confirm + 8-second undo; Sold *is* the sale; inline refusal before write;
    one-action ZIP export), and the operational notices.
  - **Finding with teeth (thread 1):** **the retryable state has NO spec requirement.** All eight spec files
    searched for `retryable|retry|Try again|blip|unavailable` — **no matches**. The rule is carried by **design
    D18** and **truth 16** only. So the layer's wording work (gap **G6**) must cite design D18, not a
    requirement that does not exist — and **design D18's "route-level error boundaries" were never verified**
    (one of TASK-004's five carried items, "the 503 paths"). Phase 2 must **look**.
  - **Finding with teeth (thread 2):** **exactly one spec demand about width exists** — `showroom/spec.md:44`:
    photos *"swipeable on phone and tablet, with arrows additionally on laptop"* (**SD28**). It splits by **input
    kind** (touch vs pointer), not by pixels — which is the shape gap **G5** should follow, and the same question
    Q-001 has now answered for the office nav.
  - **Also recorded:** the gold-vs-red rule is **not** a spec requirement either — it lives in the build list
    (`changes/truespec-architecture/tasks.md:73`, build task 7.4). It is a demand to obey (gap G4), not a question.
  - **A mistake caught and fixed before it could mislead:** I had numbered the demands **D1–D28**, which collides
    with the design decisions **D1–D21** in `design.md` — "D18" would have meant two different things in the same
    layer. Renumbered to **SD1–SD28**, with design decisions always written as **"design D18"**, and the file
    rewritten so the numbering is unambiguous. Verified after: SD1–SD28 present, no bare `D..` rows left.
  - **Next: R1.1** — the full surface × state matrix, then **Checkpoint A** (stop and report to the owner before
    Phase 2). *(Corrected: an earlier line in this entry said the next step was Checkpoint A; the matrix comes
    first, per the plan's own Checkpoint A line — "the surface matrix has no blank row".)*
- **2026-10-16 — R1.1 DONE. `findings/01-surfaces.md` written (source-level inventory).**
  - **Explore session ID: `ses_eb7d50a05ffeP20r4CfR67RM2F` (recorded in §6).** Kept warm; to be resumed for later phases (M2).
  - Inventory covers 17 pages (5 showroom, 3 office non-shell, 9 office shell), 4 API routes, global infra, and supporting components. States mapped per surface: loading (via `StoreWaking()`), empty states (inventory public, office inventory/dashboard/drafts/activity, enquiries empty columns), dialog/overlay/confirm (car detail lightbox, office inventory delete, car form delete, drafts discard, enquiries detail), toast/feedback on write actions, undo (8s on office inventory delete; **stub** on car form delete — button present but unhandled), validation (car form/settings forms; Clerk for auth), missing → `notFound()` (car public/office), sold read-only view.
  - **Unfinished controls found:** car delete flow is a **stub** (`car-client.tsx:1216-1221` — shows "Car deleted (demo)." and sets hidden `#tundo` unhandled); the dead **Search button** (`OfficeTopbar.tsx:29`, `aria-label="Search (UI placeholder)"`) already ruled for removal. No route-level `error.tsx` files under `(site)` or `office/(shell)` (global `app/error.tsx` and `app/office/error.tsx` only).
  - Width-dependent code mapped: office 820px switch (sidebar hidden/topbar shown/bottom nav shown), dashboard breakpoints 1000/820/560, car detail/gallery touch swipe, `FeaturedSlider` uses `innerWidth`, multiple CSS breakpoints in `reference.css`/page CSS files.
  - **Checkpoint A status:** R0.1 done · R0.2 done · R1.1 done. All three findings written. **Ready for Phase 2 (runtime observations)**. Next single step: **R2.1 Dialogs and overlays** (M3). Will resume the same Explore session for R2.* where helpful.
- **2026-10-16 — R2.1 DONE. `findings/05-runtime-observations.md` opened with the dialogs/overlays section.**
  - Read event handlers for modals/lightboxes (Escape, click-outside, focus). Findings as first written: office inventory delete and both showroom overlays (car lightbox, home modal) support Escape + click-outside + close controls; drafts discard and enquiries detail appeared to support neither; office modals showed no focus management and no body scroll lock, while the showroom overlays did lock scroll. Fed gap **G1** (focus handling) and the Designer brief.
  - **Two claims in this entry were later found wrong by R2.2's deeper read** (car delete and enquiries detail **do** have Escape handlers; the first pass was line-range-scoped). The correction is recorded in full in `findings/05-runtime-observations.md` under the R2.1 correction note. Left here as written, with the correction pointed at, so the run log's own error is visible rather than tidied away.
- **2026-10-16 — R2.2 DONE. Focus section written into `findings/05-runtime-observations.md`.**
  - **Explore session (R2.2): `ses_eb6e4da83ffeROueadCne3oLeI`.** Note for the method: a "resumed" call returned a **new** session ID both times (R2.1 → `ses_eb7c65614ffeciA0MTyp3jePQ9`, R2.2 → `ses_eb6e4da83ffeROueadCne3oLeI`), so M2's "keep one warm session" is not working as written — each call seems to start fresh. Recorded so the next run does not assume continuity.
  - **The whole app has 3 `focus()` calls, 1 `autoFocus`, 4 `tabIndex` uses.** No focus trap, no return-focus, no `aria-activedescendant`, no focus-trap/restore code anywhere.
  - **Dialogs:** office modals (inventory delete, car delete, drafts discard, enquiries detail) move focus **nowhere** on open, trap nothing, restore nothing, and do not lock body scroll — so focus stays on the trigger behind the overlay and keyboard users tab the whole page first. Site modals *do* focus `#mx` on open (HomeBehaviors:71, CarBehaviors:121) and lock scroll, but restore nothing. The lightbox focuses nothing.
  - **Sharpest finding:** `confirmDelete()` (`inventory-client.tsx:193-208`) removes the row the focused button lived in, with no focus destination — **focus falls to `<body>`**. Same shape on drafts/inventory actions that remove the clicked element.
  - **Forms:** every form announces errors (`role="alert"`, `aria-invalid`) but **never moves focus to the invalid field or the error block**; the car form's 8 inline error sites all fail this way. Focus stays on Save.
  - **Nav:** plain links; focus visibility from one global `:focus-visible` rule (`office.css:29`). `FocusRefresh` (focus-triggered refresh) is mounted on the **dashboard only** (`page.tsx:8,36`) — SD1's refresh-on-focus holds there and nowhere else; flagged for R2.4/R2.6.
  - **Corrected two of my own R2.1 claims** (recorded as a correction in the findings file, not smoothed over): the car delete modal and the enquiries detail modal **do** have Escape handlers (`car-client.tsx:312-320`, `enquiries-client.tsx:86-93`); my first pass under-read because it was line-range-scoped. Drafts genuinely has none. Also noted: those Escape listeners are **always-mounted**, so Escape is a screen-scoped clear, not dialog-scoped.
  - **Next step: R2.3** — feedback/confirmation and undo timing (what the person is told after each write, how fast, whether a destructive action asks first, whether the 8-second window is visible).
- **2026-10-17 — THE RUNTIME IS UP (owner authorised: "you start it"). R2.0 written into `findings/05-runtime-observations.md`.**
  - Started, in order: reference `:3211` (python http.server, 200) · build `:3210` (`npm run dev -- -p 3210`, Next 15.5.27, 200) · automation Chrome on CDP `:9222` (Chrome 149, the documented launch). Standing smoke check `task-004/_lib.mjs` **PASSED** — ours, no launch (chromium 8 → 8). Port 3000 untouched.
  - **Runtime facts verified** (M3): cold `/office` shows the store-waking state verbatim (*"Just a moment / Setting things up — this can take a few seconds after a quiet spell."*); `/office/inventory` with no session redirects client-side to the door; the door reads *"TRUESPEC OFFICE / The owner's side of the showroom. Nothing here is public. / Sign in to continue."*; Clerk's form mounts ~2 s later (*"Sign in to Truespec / Welcome back! …"*, Google SSO, email+password), console clean; the showroom header renders the owner's **real** number `+2348146927170` and every `wa.me` link uses it — **no invented number** (`invented: false`) → **FIX-001 confirmed latent, not live**.
  - **My own error, corrected at runtime:** my first door read saw `inputs: 0, clerk: false` and I concluded the form was missing. It was **~2 s too early**; Clerk mounts after paint. Same page, later read: `inputs: 2`, 59 Clerk nodes. Recorded in the findings file — a runtime read must wait for the thing it looks for.
  - **Probes written (research, read-only):** `openspec/tasks/TASK-005/runtime/probe-session.mjs`, `probe-office-door.mjs`, `probe-open-door.mjs`. They follow the standing procedure (attach-only, no launch, no screenshots, detach) and drive **no writes**. Kept in this layer's own folder rather than `developer-workspace/scripts/` (the Builder's area).
  - **Next:** the owner signs in at the door (tab left open on screen); then the office runtime pass for **R2.3** (toast wording/durations, the 8-second undo visible or not, "a save that did nothing"), with reads first and writes kept to throwaway rows.
- **2026-10-17 — R2.3, the READ-ONLY HALF, done at runtime (owner signed in: "am in"). Findings written into `findings/05-runtime-observations.md` §R2.3.**
  - **Office access confirmed for every shell route**: `/office` DASHBOARD · `/office/inventory` INVENTORY · `/office/drafts` · `/office/enquiries` ENQUIRIES · `/office/activity` ACTIVITY LOG · `/office/settings` SETTINGS — all 200, signed in as the owner, chrome reads *"Signed in as rema6rema6rema6@gmail.com"* / *"Sign out"*.
  - **Every destructive dialog asks first, and the words are captured verbatim** (inventory delete, car-form delete, drafts discard, tombstone "Remove for good"). Three real inconsistencies seen, not inferred: the **safe-first button order flips** (drafts puts *"Delete draft"* first); the **ways out differ** (drafts has **no Escape and no click-outside** — ✕ only); and the same idea is named *"Delete"* / *"Delete draft"* / *"Remove for good"*.
  - **THE BIGGEST FEEDBACK LIE, verified live:** the car edit form's delete dialog promises *"You can undo for a few seconds after. Deleting removes it from the showroom and the office lists."* Clicking **Delete** shows *"Car deleted (demo)."* and **deletes nothing** — no navigation, Undo stays hidden (`#tundo` hard-wired `hidden`, no handler), the car is still loaded on `EDIT CAR`. The office **inventory's** delete, with the *same heading*, genuinely writes. Identical words, opposite behaviour. (Safe to click: source shows it is a toast-only no-op — `car-client.tsx:1192-1195`.)
  - **Focus confirmed at runtime (feeds R2.2/G1):** every dialog opens with focus **left on the trigger behind it**; **Tab walks the page behind an open dialog** (8 Tabs from the inventory delete dialog hit the next rows' Edit/Delete) → **no focus trap anywhere**; Escape returns focus to the trigger, click-outside/"Keep it" drop it to `<body>`; the **car form's dialog has no accessible name** (`aria-labelledby` absent).
  - **The toast's place, measured:** office inventory's toast is `position: fixed`, `bottom: 24px`, **centred**, `z-index: 70`, `role="status"` (→`alert` on error), hidden at rest below the fold, with the **Undo button inside it**. Feedback appears **bottom-centre**.
  - **Empty state verbatim:** *"No cars match. Clear the search or pick another state."* + **"Clear filters"**.
  - **Tombstones:** the *"Waiting to be cleared"* section is **absent** → **nothing is tombstoned in the store** (clean).
  - **Probes added:** `runtime/probe-r23-read.mjs`, `runtime/probe-r23-dialogs.mjs` — attach-only, no launch, no screenshots, **no writes**.
  - **STILL OWED — the timing half of R2.3 needs ONE real write** (a delete on the live demo store): whether Undo actually appears, **how long the 8-second window stays visible to the eye**, how fast the words appear, what restore says (*"{name} {year} restored."*, 4000 ms per source), and what happens when the window **lapses** (car under *"Waiting to be cleared"*; what "Remove for good" then says). **Held — asked the owner** (their demo data; the discipline is throwaway rows).
- **2026-10-17 — R2.3 timing, MEASURED (owner chose "delete + undo one demo car"). Findings written into `findings/05-runtime-observations.md` §R2.3.6-7.**
  - **Write, authorised and net-zero:** two passes — the fixture car (`TS-1036`) and the flagship (`TS-1001`) deleted via office inventory and **undone ~4 s later**. Both **verified restored by full reload** (25 rows before and after — a server read, not the optimistic UI). Cost: one activity-log *deleted/restored* pair per pass.
  - **Exact timeline (pinned pass, clicks stamped in-page with `performance.now()`, state sampled every 20 ms):** dialog opens 863 ms → **"Delete" clicked 1292** → **row vanishes 1507 (215 ms after the click)** → **confirmation + UNDO appear 2519 (1227 ms after the click)** → "Undo" clicked 5568 → *"…restored."* + Undo gone 5769 (**201 ms after the Undo click**).
  - **The person's actual experience:** the row goes **at once (~0.2 s, optimistically, before the server agrees)**, then **about a second of silence**, then the words and the undo offer arrive together (**1–2 s** — the earlier unpinned pass measured ~2.3 s, so it varies). The telling arrives **out of order**: *"deleted"* is read after the car has already disappeared.
  - **Verbatim:** *"Toyota Camry XSE V6 2021 deleted."* with **UNDO** beside it, bottom-centre; on undo, *"Toyota Camry XSE V6 2021 restored."*
  - **The window: visible as an offer, invisible as a deadline.** Still open and working at ~4.3 s; source sets it at **8000 ms** (`inventory-client.tsx:206`); **the end was deliberately NOT observed** — letting it lapse would tombstone a real car. **No countdown, no progress, no wording says how long is left.**
  - **"A save that did nothing": it does not say so.** No message anywhere in the office says *nothing changed*; every save answers *"Saved …"*. Captured the whole success/failure vocabulary (§7 of the findings): every success says what changed **and what it means** (*"The showroom updates immediately"*, *"The cars are untouched"*).
  - **Probes added:** `runtime/probe-r23-undo-timing.mjs`, `runtime/probe-r23-undo-timing2.mjs` (attach-only, no launch, no screenshots; the only writes are the two authorised delete+undo pairs).
  - **Next: R2.4** (a store blip and the offline path — the retryable state's wording, the cold-store experience, what the person believes happened). Cold-store evidence is *already in hand* (R2.0 saw `StoreWaking` live); the blip/dropped-store half may need the store to be made to fail, which is a decision for the owner.
- **2026-10-17 — R2.3 CLOSED at runtime, and the store verified clean afterwards.**
  - **Closing check (read-only):** office inventory reads **"25 cars — 24 in stock, 1 sold"**, `TS-1001` present, and **no *"Waiting to be cleared"* section** → nothing tombstoned, the fleet is exactly as it was.
  - **The claim of a trace was verified, not assumed:** the activity log's newest entries are the four traces of the two passes — *"Deleted a car TS-1036"* / *"Restored a car TS-1036"* (09:29) and *"Deleted a car TS-1001"* / *"Restored a car TS-1001"* (09:30). Exactly the predicted cost, nothing more.
  - **New finding (a) — a restore is tagged "DELETED".** The activity chip on a restore entry reads **DELETED** (*"Restored a car TS-1001 · DELETED"*), so the log's own tag cannot tell a restore from a delete, and both count under the log's **"Deleted 12"** facet. Small, concrete, this layer's reach (it is feedback wording).
  - **New finding (b) — the demo store carries the builder's fixtures.** A car named *"TS-FIX-1792145797830-2 Fixture STD"* (ref `TS-1036`) sits in the inventory; the log records *"Added a car TS-1036"* at 16 Oct 10:18 (inside TASK-004's build). Recorded as an **observation, not a conclusion** — not this layer's work, not touched by me — but anything that reads the fleet as pure demo data will show it.
  - **Probe added:** `runtime/probe-store-state.mjs`, `runtime/probe-activity-trace.mjs` (read-only).
  - **Next: R2.4** (the store blip and the offline path).
- **2026-10-17 — R2.4 done at runtime by IN-BROWSER FAILURE INJECTION (owner chose this over making the store genuinely fail). Findings written into `findings/05-runtime-observations.md` §R2.4.**
  - **Nothing was restarted and nothing was written.** All failures were produced inside the tab (request interception / offline emulation). For the write case the request was **answered locally with 500 so the server never received it**, and the store was verified untouched by reload — **25 rows before and after**.
  - **§2 A soft navigation to a slow store shows NOTHING.** RSC held 6 s: URL unchanged, heading still DASHBOARD, `loadingEl: false` for the *whole* hold; the page changed at ~8.4 s (6 s injected + dev compile). **The wait state covers a full page load, never a client-side navigation** — so the commonest slow-store case has no feedback at all: *the person clicks and the screen does nothing for seconds.*
  - **§3 A dropped soft navigation is recovered silently by Next** — console: *"Failed to fetch RSC payload … Falling back to browser navigation."* — the page then loads normally, **no error state, no "Try again"**. So a dropped RSC is *not* what produces the retryable state.
  - **§4 Offline: there is no offline path.** Browser offline + a link click throws the person **out of the app** onto **Chrome's own error page** (*ERR_INTERNET_DISCONNECTED*, Chrome's network advice). Shell gone, no in-app message.
  - **§5 A failed WRITE reports itself as a failed LOAD — and wipes the page.** A delete whose request was answered 500 produced *"We couldn't load this / We tried a few times but the server didn't answer. Nothing was lost — please try again. / Try again"*, with (a) the **wrong story** (a load claim for a save), (b) the code's own *"That car could not be deleted."* **never appearing** (a thrown action never reaches the `res.ok===false` branch — it goes to the boundary), (c) **the whole shell replaced** (`navVisible:false`) — the concrete cost of the missing route-level boundaries, and (d) *"Nothing was lost"* asserted **without having checked**. **"Try again" does recover**: page restored, nav back, 25 rows intact.
  - **§6 Photos: truth 7 is only half met — and the failing half is the everyday one.** Failure **after** hydration → **placeholder on 20/20**, alt preserved (works). Failure **while the page loads** (the photo already missing/unreachable) → **placeholder never appears**: 13 error events fired, **0 swaps**, every card shows the **browser's broken-image icon**. **Cause:** the image `error` fires *before* React hydrates and attaches `onError`, and React never replays it, so `failed` stays `false`. Truth 7 names exactly this case ("an asset removed from the store, or on a CDN that is briefly unreachable").
  - **Probes added:** `runtime/probe-r24-blip.mjs`, `probe-r24-verify.mjs`, `probe-r24-photo-order.mjs`, `probe-r24-recover.mjs` (all in-tab; no writes, no restarts).
  - **Next: R2.5** (failure wording, verbatim, + FIX-001's five places), then R2.6 (per-width), R2.7 (long/empty extremes), Phase 3 (Designer), Phase 4 (`task.md` + `testing.md`).
- **2026-10-17 — R2.5 done. Findings written into `findings/05-runtime-observations.md` §R2.5. NOTHING WRITTEN.**
  - **Gathered by source sweep (every message quoted with its `file:line`) + read-only runtime for the not-found family** (plain GETs). The "no number saved" renderings are source-level only — seeing them live would mean clearing the owner's saved number, which is a write.
  - **The not-found family, driven live:** `/car/TS-9999` and `/car/not-a-ref` answer **HTTP 200** with the car page's own view (*"We could not find that car"*, **chrome kept**, **real** number); `/no-such-page` answers **404** with the root `not-found` (*"We couldn't find that page"*, **no header/footer/nav at all**); and **a mistyped `/office/…` URL falls out into the showroom's 404** (no office 404 exists) — with the **invented** number and no way back to the office.
  - **Two new findings:** (a) **a missing car answers 200, not 404** (the page never calls `notFound()`; a dead car link looks healthy to a search engine and to any checker); (b) the **404s lose the whole shell** while the missing-car view keeps it — two different ideas of "not found".
  - **FIX-001 — CORRECTION to my own §R2.0 account (it is not "latent"):** the four *hardcoded* links (both 404s, both privacy lines) do **not** depend on the saved setting — they are **live today**. Proven live: on `/privacy` the **header shows `+2348146927170`** (the real number) while the **notice text says `+234 800 000 0000`** and its link opens `wa.me/2348000000000` — **one page, two numbers, both presented as the truth**. The **office already states the correct rule** (*"No number set — every chat button on the site is dead until one is saved."*, `settings-client.tsx:124`): the office knows the truth, the showroom invents a number.
  - **The message inventory** (§3): the wait/retry pair, the door (**no app wording — Clerk's**), amounts, the WhatsApp number (8 refusals), uploads/photos/files, saving a car / a draft / an enquiry, a setting, the clients' own failure lines, and the internal refusals that never reach a person. **A new wording defect:** the reader's refusal reasons **change voice** — the field says *"Enter the make"*, the file-refusal report renders **`"Make" — enter the make`** (`draft-read.ts:59-65` lowercases it), beside lowercase fragments (*"no car details were filled in on this page"*).
  - **What is good (recorded so it is kept):** **no message blames the person** — I looked for one and found none.
  - **Probes added:** `runtime/probe-r25-notfound.mjs`, `runtime/probe-r25-privacy.mjs` (read-only GETs; attach-only).
  - **Next: R2.6** (per-width interactions — readable without writes), then R2.7 (long/empty extremes), Phase 3 (Designer), Phase 4 (`task.md` + `testing.md`).
- **2026-10-17 — R2.6 done. Findings written into `findings/05-runtime-observations.md` §R2.6. NOTHING WRITTEN.**
  - **Driven at six widths (1440/1024/821/820/768/390) across the office (dashboard, inventory, car form, drafts) and the showroom (home, inventory, car detail).** Read-only GETs; the only synthetic input is one touch swipe (changes nothing on the server).
  - **The 820 switch is exact** (driven): at 821px the office sidebar + inventory **table** are present; at 820px they are gone and the **topbar + bottom bar** and inventory **cards** take over. A **portrait tablet (768) gets the phone shell; landscape (1024) gets the sidebar** — exactly what **Q-001 declared**.
  - **The Q-001 gap, confirmed live at ≤820:** the bottom bar's five are Home / Stock / Add / Chats / **More→`/office/settings`** — so **"More" links straight to Settings, not a list**; **Drafts and Activity log have no nav route** (desktop has seven destinations); **no drawer exists** (the topbar has no menu button); and the **dead Search button is live** on the dashboard (`OfficeTopbar.tsx:29-31`, a button with no handler). Three Q-001 requirements, still unbuilt.
  - **Showroom at ≤820:** the **ticker goes**; a **floating WhatsApp button appears**; the car page grows a **sticky action bar** (*"DOORSTEP PRICE … · Chat now"* — absent at 1440/1024); and the nav's "Chat on WhatsApp" is **hidden on the car page but kept on home/inventory** at the same width.
  - **What stacks / scrolls:** the office car form is **two columns at 1440, one at ≤1150** with the photo panel moved **above** the fields; the office inventory **table becomes cards at ≤820**; the enquiries **board is five fixed columns that scroll sideways at every width, including 1440** (at 390 it is ~1396px wide in a 347px viewport).
  - **The width spec demand is met** (`showroom/spec.md:44`): a synthetic touch swipe **changed the photo at both 390 and 1024**, and the arrows are visible and enabled at both.
  - **Overflow/overlap — and a correction of my own first probe.** No horizontal overflow anywhere; the bottom bar does **not** cover content (lowest content ~710–720px, bar top 740). **My first pass wrongly reported the home page overflowing 339px at 390px** — chasing it showed the document's `scrollWidth` only *spikes during hydration* (+404px at t+704ms) and `body{overflow-x:hidden}` contains it: a driven `scrollTo(300,0)` **did not move**, so no person can be shifted. Corrected in the findings, not smoothed over.
  - **Noted, not this layer's work:** `components/Gallery.tsx` is **imported nowhere** (dead component; the car page uses `CarBehaviors`).
  - **Probes added:** `runtime/probe-r26-widths.mjs`, `probe-r26-overflow.mjs`, `probe-r26-overflow-time.mjs`, `probe-r26-overflow-cause.mjs`, `probe-r26-behaviours.mjs`, `probe-r26-overlap.mjs` (all read-only).
  - **Next: R2.7** (the long-and-empty extremes — zero rows, far more rows than fit, a car with no photos, no costs, an enquiry with no note, a very long car name), then Phase 3 (Designer), Phase 4 (`task.md` + `testing.md`).
- **2026-10-17 — R2.7 done. Findings written into `findings/05-runtime-observations.md` §R2.7 (+ FIX-002). NOTHING WRITTEN.**
  - **Read-only GETs and client-side filters throughout.** The only DOM change was a **labelled synthetic long name** put on one card and reloaded away immediately.
  - **Zero rows: five states driven.** Office inventory ("0 of 25 cars match" + *"No cars match. Clear the search or pick another state."* + "Clear filters"); office activity ("0 of 36 entries match" + *"Nothing matches. Clear the search or pick another type."*); an empty enquiries column, SOLD 0 and LOST 0 (*"Nothing here right now."*); the showroom inventory via the price filter. The drafts list's zero state is source-only (`drafts-client.tsx:75`). **The showroom's zero-match state is the odd one — it says the same promise TWICE, stacked**, under a heading that says it a third time: "0 MATCHING CARS" + *"Nothing matches those filters. Tell me what you're after and I'll source it in the USA."* + *"Nothing here yet — tell me the car you're after and I'll source it in the USA."* + "MESSAGE ME ON WHATSAPP" + "Clear all filters". The same idea wears **at least seven wordings** app-wide.
  - **Far more rows than fit:** the biggest lists are the activity log (36), the office inventory (25), the showroom (19), the drafts queue (~10,500 characters), the board (6). **No pagination, no "load more", no virtualisation anywhere** (searched the DOM); every list renders in full and the page scrolls (inventory page 2,242px vs a 900px viewport). Beyond ~36 rows is **unproven by observation** — the store never gets there. Named as a limit of the evidence.
  - **A car with no photos is LIVE and shows machine garbage — FIX-002.** `/car/TS-1029` and `/car/TS-1030`: `<img id="gi" src="undefined" alt="TS-FLOW-1792136477358 Flow2 STD 2020 photo NaN">` and the counter on screen reads **"NaN / 0"**, zero thumbnails, the two arrows still drawn. A photographed car reads "1 / 3" with 6 thumbnails. Both cars answer **HTTP 200** and sit in the office inventory; **neither is linked from the home page or the inventory** (driven), so only a URL reaches the broken gallery. Same family as FIX-001 — an absent value rendered as machine text.
  - **A car with no costs is designed and honest in the list.** **10 of 25 rows** carry "Costs incomplete" in both the COST and PROFIT cells (table uppercases via CSS; source string `reconcile.ts:193,311`), including the On Order cars TS-1013 and TS-1018. The dashboard names the arithmetic: *"From 14 of 24 cars. 10 excluded: costs incomplete. See which"*. The **car form** shows bare empty cost fields and no "incomplete" wording — the list names it, the form doesn't.
  - **An enquiry with no note is not in the store** — all four waiting drafts carry notes; the fallback is source-only (`enquiries-client.tsx:318`, *"Nothing noted yet."*). Noted as a verification debt, not an observation.
  - **A very long name: nothing truncates.** No long real name exists (longest are the test cars' machine names, 30–31 chars). The name element is `white-space: normal` with no clamp/ellipsis anywhere. **Labelled synthetic test:** a 105-character name grew the card **223 → 308px** and **stretched the whole row** (all three siblings 223 → 308, next row top 468 → 804). So one long name makes its entire row taller and pads the neighbours with dead space.
  - **Content note for whoever owns the demo store:** three test-artifact cars (machine names, ₦22,000 prices) are **in the showroom inventory** (TS-1033, TS-1035, TS-1036) and **all three are linked from the public home page** (driven — the home page's 13 car links include them).
  - **Probes added:** `runtime/probe-r27-store.mjs`, `probe-r27-empty.mjs`, `probe-r27-cases.mjs`, `probe-r27-detail.mjs`, `probe-r27-drafts.mjs`, `probe-r27-nophoto.mjs`, `probe-r27-gallery.mjs`, `probe-r27-visibleempty.mjs`, `probe-r27-linked.mjs` (all read-only; one labelled synthetic name, reloaded away).
  - **Next: Checkpoint B** — all seven areas on disk, then **stop and report to the owner before Phase 3** (the Designer).
- **2026-10-17 — PHASE 3 DONE. The Designer consulted, its report read, my review written, and the owner ruled on top of both. Findings written into `findings/04-designer.md` (410 lines). NOTHING IN THE APP WAS CHANGED.**
  - **The Designer was briefed through the `designer` sub-agent** and told to write in its own workspace. It returned `design-workspace/decisions/TASK-005-ux-rulings.md` — 26 rulings, 7 open questions, and a "do not touch" list. I read it in full rather than taking its summary on trust.
  - **One thing to record about how it worked:** it tried to persist its report through the `write` tool, which was denied in its environment, and used a shell redirect confined to `design-workspace/` instead. It reported that plainly rather than hiding it. No file outside its own workspace was touched (`git status` showed one new file).
  - **I checked every citation in its report against the code before writing any of it down** (M7). All six live-region citations **confirmed** (`reference.css:78`, `car.css:37`, `not-found.css:73`, `InventoryBrowser.tsx:465` and `:467`); one it missed — `InventoryBrowser.tsx:559`, a **third** `role="status"` on the toast — is now recorded too.
  - **Five things I did not accept, recorded as corrections rather than smoothed over** (`04-designer.md` Part B): (B1) its approved-wording table rewrites the office zero states that its own "do not touch" list calls correct — resolved in favour of the list, the office keeps its wording; (B2) it adopted "8 seconds" without the 4.3-second measurement; (B3) its Q-001 and WhatsApp references are stale — **Q-001 was answered by the owner on 2026-10-16**, and the WhatsApp question is FIX-001's, not Q-001's; (B4) **DR14 was never written** (its numbering runs 13 → 15); (B5) DR26 is self-flagged unverified and I have not verified it either.
  - **The owner ruled on seven things today, and two of them change what was written before:**
    - **The undo toast gets a draining bar** — starts full, empties to zero over the window; the owner's working image was two stacked bars, one draining as the other holds, and the *sense* rather than the pixels is what is recorded. He asked for the practice behind it, so I researched it: **one clock, never two** — the animation is the clock, its end is what closes the toast, and a deliberately longer safety timeout is a backstop that becomes the real clock only under reduced motion. `transform: scaleX`, never `width`; the bar is `aria-hidden`; reduced motion shows a plain "8 s" label; the clock starts when the offer is actually pressable. **CORRECTION, same day: I told the owner a "4.3-second bug" existed and that the bar had to wait for it. There is no such bug — see the settling entry below and `06-architect-calls.md` call 1.** The bar is drawn to the code's own 8 seconds and waits on nothing.
    - **FIX-002 is closed** — the photo-less cars (TS-1029, TS-1030) are our own test cars, not a product defect. What survives is the owner's replacement rule: **the empty photo box is a gradient of different colours**, per car and deterministic from the car's ref, **never shimmering** (motion would promise a photo that is not coming), the same box as a real photo, marked decorative. Folded into TASK-005, not made its own registry entry.
    - **A waiting sign and an offline screen are both built** — the two gaps R2.4 measured: a soft navigation to a slow store shows *nothing*, and an offline click lands on Chrome's own error page with the shell gone.
    - **Deleting a draft is forever** — so "Remove for good", no undo. This answers the Designer's open question 2 and settles the last naming ambiguity.
    - **No fake buttons, ever.** The owner's words: *"the only thing that is fake is data… button that cannot do anything should not be excused by demo."* The car form's demo no-op delete (`car-client.tsx:1192-1195`) must be wired up or taken off the screen. **And the dead Search button is removed** — the owner built search to filter by keyword, and that job is already done by the working field on the inventory and activity pages; the top bar's Search is a second door into a room with no door.
    - **When no WhatsApp number is saved, every chat affordance stays on screen, visibly greyed out** (the owner chose this over hiding them). **This supersedes the 2026-10-16 ruling** that "no number saved means nothing is shown at all" — the invented number is still removed, but the affordances are greyed rather than deleted. The reasoning the owner accepted: a live-looking button that silently does nothing is the exact fault being removed from the Search spot, whereas a greyed button says "I am off". **§7.3 is amended to match.**
  - **Seven open questions, all landed** (`04-designer.md` Part C): two answered by the owner (the WhatsApp ruling; the draft delete), one answered by me — **adopt the native `<dialog>`, yes** — one answered by the owner (build the wait state and the offline screen), and **three that are mine and are lookups or decisions, not owner questions**: the no-op detection mechanism, the route-level error boundaries, and the missing-car 200 / absent office 404.
  - **The Designer named one thing it cannot do:** the first-time-visitor walk, which the UX rule requires. Its five questions for that visitor are carried into `questions.md` — they are the only evidence these rulings landed.
  - **Next: Phase 4** — `task.md` and `testing.md`, written from the materials, all of which are now on disk. The four items that were mine to settle first (the no-op detection, the error boundaries, the 404 family, and the 4.3-second bug) are settled in the entry below.
- **2026-10-17 — THE FOUR OPEN CALLS SETTLED. Read out of the code, not guessed. Written to `findings/06-architect-calls.md`. NOTHING IN THE APP WAS CHANGED.**
  - **The owner said "go" and this was the settling pass** — the four things the design pass left as mine (settled = find the answer or make the decision, and write it down, so `task.md` has no guess and no "TBD").
  - **CALL 1 — THE "4.3-SECOND BUG" DOES NOT EXIST. I was wrong, and this is a correction of my own claim, not a finding.** The window is set in **exactly one place**: `showToast(message, isError, ms)` at `inventory-client.tsx:175-182` — a single `setTimeout(…, ms)` — called with **8000** at `:206`. The ~4.3 s was **how long the toast had already been open when the researcher clicked Undo** (the probe clicks at ~4 s on purpose, `probe-r23-undo-timing.mjs:91`); §R2.3 says so itself — *"the end of the window was NOT observed"* (`05-runtime-observations.md:290-293`). I read *"still open at 4.3 s"* as *"died at 4.3 s"*, and the error propagated into D27, B2 and the run log. **So D27's precondition is void, DR22's "8 seconds" stands unamended, and the bar waits on nothing.** The one thing genuinely never seen — the **lapse** — stays a testing item, because watching the window run out tombstones a real car.
  - **CALL 2 — THE ERROR PAGES ALREADY EXIST; they sit one level too high for a write failure.** `app/error.tsx` and `app/office/error.tsx` both render `<Retryable/>`, and both say in their own comments why they sit where they do — *"an error boundary does not catch the layout in its own segment"*; the office one *"wraps the `(shell)` layout's session check"*. So my Phase 2 note ("no route-level `error.tsx`") was **literally true and misleading in effect** — corrected. The mechanism behind the measured shell-wipe is named: `lib/store-guard.ts:22-23` — *"If every attempt fails the last error is thrown, which an `error.tsx` boundary turns into a retryable state."* **My call:** the boundaries stay (they alone can catch a layout's own read); a boundary goes **inside** each shell so a *page* failure keeps the nav; and a **write** failure catches and returns instead of throwing — the pattern `photosExist` (`lib/car-form.ts:106-118`, *"The picture store could not be reached, so nothing was saved. Try again."*) **already uses**, just not around the write statements (`actions/car.ts:121` first).
  - **CALL 3 — "DID ANYTHING CHANGE?" IS ALREADY COMPUTED.** `lib/change-check.ts` (`carChangeCheck`/`enquiryChangeCheck`) plus `lib/car-update.ts`, which works out whether anything would change and **"does nothing at all when nothing would"** (`:12-19`), pinned by `car-update.test.ts:112`. The action recomputes the hash from the submitted values and runs the statement (`actions/car.ts:105-127`). **The gap is one fact:** the statement returns the car's `ref` **whether or not anything changed** (its trailing `UNION ALL SELECT ref FROM car …`), so `updateCar` cannot tell a save from a no-op and the screen says *"Saved."* **My call:** the statement reports whether it changed; the action passes it through; the screen says *"Saved."* / *"Nothing changed."* (`D28`). No new machinery.
  - **CALL 4 — THE 404 FAMILY DECIDED.** (a) **A missing car answers 404, its view unchanged** — the view (*"We could not find that car"*, chrome kept, ways out) is good; only the **status** lies (`car/[ref]/page.tsx:83-86`, `:588-623` answers 200 today). (b) **The office gets its own not-found** — an unknown `/office/…` currently lands in the **showroom's** 404, the shop's words to an office user, no way back. (c) **The root 404's bare card stays as built** — it drops the chrome on purpose, matches the reference (`RECON-001/report.md:20`), and still gives three ways out; **recorded so a later pass does not "fix" it**. (d) A copy note only (couldn't / could not) left to the Designer's wording rule. The invented number on both 404s remains **FIX-001**, not re-decided.
  - **Checkpoint C is now passed** (its last box was "stop and ask"; the owner's share was answered on 2026-10-17 and my share is settled here), so **Phase 4 is unblocked**.
  - **Still genuinely open after this pass** (`06-architect-calls.md`, last section): the toast-vs-bottom-bar measurement (D33); the lapse as a testing item; the first-time-visitor walk.
  - **Next: Phase 4** — write `task.md` (the plan, with benchmarks) and `testing.md` (the check groups), from the materials. Nothing stands in front of it.
- **2026-10-17 (later) — CORRECTION, found while answering the build's pre-flight questions. `task.md` and `testing.md` carried a wrong claim about the two "interim" strings; both files are corrected.**
  - **The wrong claim:** that the store-waking words and the read-failure retry words are placeholders that "must not become the product by accident", and in `testing.md` must be "gone". That is G10's **pre-Designer** state; it is not the ruling. The error came from my own misread, carried through a compaction line, of G10's open status.
  - **The standing ruling:** both are **correct and stay** — the Designer's source report §"What is fine — do not touch" (*"The read-failure retry wording. The wait-state words."*), carried in `04-designer.md` Part D and restated in `06-architect-calls.md`.
  - **What changed:** `task.md`'s constraint now states the keep ruling, and adds the wording rule — the Designer's report names `design-workspace/decisions/ux-implementation-plan.md` as governing where it applies, **including the offline wording**; copy from there may be used verbatim only where the behaviour it states is true, later rulings win conflicts, and anything not on disk (today: the **waiting sign**, the **office not-found**) is brought back, not invented. `testing.md` group 19 now checks that the ruled strings stayed and that new copy is traceable to a supplied source; the group-1 deletion check may run on a self-created throwaway car (net-zero) but still runs in the final pass, never assumed from the build session's own run.
  - **A quick check made while here:** no device-side draft keeping exists in the visible code (`localStorage` holds the theme and small site prefs; nothing else) — so the plan's *"your draft is kept on this device"* sentence must not be installed unless its claim is made true first. Noted, not decided.

## 7. Owner's answers (asked 2026-10-16; 1 and 2 answered the same day)

1. **Where `task.md` and `testing.md` live — ANSWERED: yes**, in `openspec/tasks/TASK-005/`, beside these
   findings.
2. **When the owner sees findings — ANSWERED: as they come.** Findings are handed over as they are written, not
   held back for one report at Checkpoint C. So every checkpoint ends with a hand-over, and a finding worth
   showing early is shown early rather than saved up.
3. **FIX-001 (the invented WhatsApp number) — ANSWERED: written into TASK-005.** The owner's ruling (2026-10-16):
   the fallback is **removed as part of this layer**, so its fix goes inside `task.md` and its checks inside
   `testing.md`. The registry's FIX-001 entry stays where it is, marked as carried by TASK-005, so it cannot
   quietly vanish. **And when no number is saved there is to be nothing at all:** no "WhatsApp" block in the
   header, and the privacy notice names no number — it speaks of "our WhatsApp". (My earlier account of this
   defect was partly wrong and is corrected in the run log: the number is invented in **five places in three
   files**, the car page's button becomes a **dead link**, and the validator **accepts** the invented number
   rather than refusing it.)
   — **AMENDED 2026-10-17 by the owner.** The invented number is still removed, but "nothing at all" is
   replaced: **every chat affordance stays on screen, visibly greyed out.** His words: *"leave everything just
   make it not clickable"*, and on being offered the choice, *"(a)"* — grey it out so it is obviously off.
   Reasoning he accepted: a live-looking button that silently does nothing is the exact fault being removed
   from the Search spot; a greyed button says "I am off". Full ruling: `findings/04-designer.md` D16.
4. **Asked and answered 2026-10-17, during the Designer's pass — five rulings.** (a) **The undo toast gets a
   draining bar**, full → zero over the window, on one clock; **(corrected the same day — there is no timing bug
   to fix first; the window is the code's own 8 seconds, see `06-architect-calls.md` call 1)**; (b)
   **FIX-002 is closed** — the photo-less cars are our own test cars — and the empty photo box becomes a
   **gradient of different colours**, per car and deterministic, never shimmering, same box as a real photo,
   marked decorative; (c) **a waiting sign and an offline screen are both built**; (d) **deleting a draft is
   forever** — "Remove for good", no undo; (e) **no fake buttons** — the car form's demo no-op delete is wired
   up or taken off, and the dead Search button is removed because the working search field already does its
   job. All five in `findings/04-designer.md` (D24–D34).
