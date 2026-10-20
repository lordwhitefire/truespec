# 03 — What the specs already demand about the experience

**Written:** 2026-10-16, during **R0.2** of `../research-plan.md`.
**What this is:** the standing requirements this layer **must not contradict**. The UX layer adds wording,
presentation and per-width behaviour on top of what is already required — so the first job is to know precisely
what is already required, in the specs' own words, with the file and line.
**Boundary checked first:** `openspec/specs/` is **empty** — nothing is codified yet — so the eight spec files
under `changes/truespec-architecture/specs/` are the change's own deltas, not codified output. They are mine to
read. Sources: those eight files, plus `design.md` and the build list `changes/truespec-architecture/tasks.md`.

**Numbering, said plainly:** these demands are numbered **SD1…SD28** (*spec demand*). The design decisions in
`design.md` are numbered **D1…D21** and are always written here as **"design D18"** and so on. The two numbering
schemes are kept apart on purpose — a bare "D18" would mean two different things.

**Nothing here has been observed in a running app.** Every line traces to a document.

---

## 1. Controls the UX must NOT add — the specs forbid them

These are the demands that most often get *undone* by a polish pass. Each is a **prohibition**, not a preference.

| # | The demand | Source |
|---|---|---|
| SD1 | **No manual Refresh control.** The dashboard *"SHALL refresh on window/tab focus rather than offering a manual Refresh control"*; the scenario ends *"and no Refresh button exists"*. | `dashboard/spec.md:35-40` |
| SD2 | **No separate alert, popup or sound for taps.** Taps are surfaced *"by a count badge and the recent-taps list — no separate alert, popup, or sound"*; the scenario: *"the badge/list reflects it on refresh, with no additional alert raised"*. | `dashboard/spec.md:42-51` |
| SD3 | **No in-app password reset flow.** The office *"SHALL state in Settings that recovery happens outside the app"*. | `office-access/spec.md:95` |
| SD4 | **No exchange-rate field anywhere.** Settings holds exactly four things; the scenario ends *"and no rate field"*. | `office-settings/spec.md:7-13` |
| SD5 | **No price on a state.** There is no "landed price" and no "available price" — one doorstep price, on the car. | `money/spec.md:54-64` |

---

## 2. The "never" rules — what the experience must never do

| # | The demand | Source |
|---|---|---|
| SD6 | **Never invent a value.** *"A public car page MUST never render an unset price as a number."* | `showroom/spec.md:29-31` |
| SD7 | **Never silently drop or silently zero.** Incomplete costs are *"left out of profit totals with a plain 'still building' line that names how many cars are out and why — never silently dropped, never counted as zero profit."* | `money/spec.md:65-70` |
| SD8 | **Never hide a gap.** *"Incomplete costs are explained, never hidden"*; *"No total may silently drop cars or quietly include unfinished ones."* | `dashboard/spec.md:14-27` |
| SD9 | **Never an error page.** A store blip becomes a **clear, retryable state** (§6); a sold/deleted car's old link gets *"a graceful not-available outcome rather than an error page or stale data"*; an image-store outage renders a **placeholder** with the page still loading. | `showroom/spec.md:58-64`, `media/spec.md:32-37`, `design.md:113` |
| SD10 | **Never delete by the system, and never on a clock.** Retention *"SHALL NOT delete or anonymise customer data on its own"*; drift is *"reported, never deleted by the system"*; a deletion tombstone is *"permanent until **the owner** removes it: no job, rule or clock ever hard-deletes it"*. | `enquiries/spec.md:76-85`, `media/spec.md:39-57`, `inventory/spec.md:51-53` |
| SD11 | **Never show customer data outside the office** — no name, number or note in any public payload. | `enquiries/spec.md:87-92` |
| SD12 | **Never echo the account's identity back** on a sign-in failure, and **add no message of the application's own** — the failure message is the provider's. | `office-access/spec.md:77-87` |
| SD13 | **Never let a draft count as a record.** A draft *"SHALL not be countable or listed as an enquiry"*; uploads become drafts, never records. A row that cannot be read *"SHALL be explained and named, never silently dropped."* | `enquiries/spec.md:39-52`, `inventory/spec.md:62` |

---

## 3. Words that must say what they count

This is the layer's core wording work, and the specs already fix what the words must *contain*.

| # | The demand | Source |
|---|---|---|
| SD14 | **Every money figure states its reach** — e.g. *"projected profit from 9 of 14 cars"* — and names what is left out. | `dashboard/spec.md:14-20` |
| SD15 | **Cost figures are named by state:** *"Estimated total cost"* while on order/at port/cleared, *"Landed cost"* once landed, *"Total cost"* once sold. | `money/spec.md:43-53` |
| SD16 | **Negative profit is displayed without correction** — *"no warning, clamp, or suppression"*; it signals a bad buy, not an error. | `money/spec.md:43-53` |
| SD17 | **The price is the full naira figure, not abbreviated.** | `showroom/spec.md:44-50` |
| SD18 | **The badge's figure is the taps since the office last looked** — not an all-time total; the glyph stays at zero, only the count circle clears. | `dashboard/spec.md:42-51`, `design.md:130-136` (D21) |
| SD19 | **Incomplete costs carry a "still building" line** naming how many cars are out and why, while money-tied-up still includes them. | `money/spec.md:65-70`, `dashboard/spec.md:21-27` |
| SD20 | **A rejected row is explained and named** — what was rejected and why. | `enquiries/spec.md:39-52` |

**And one rule that is not in the specs — it is in the build list** (`changes/truespec-architecture/tasks.md:73`,
build task 7.4): *"Failure and attention wording must follow the settled rules: **gold + icon + words, never
colour alone**; costs-incomplete attention…"*. **This is the rule behind gap G4** ("the gold-vs-red attention
wording"). It is a standing demand of the build list, so the UX layer is bound by it even though no spec
requirement states it.

---

## 4. Feedback, confirmation and the meaning of an action

| # | The demand | Source |
|---|---|---|
| SD21 | **Delete requires confirmation and is undoable within an 8-second window**; undo restores the car *"byte-for-byte with its photos, costs, and state intact"*. | `inventory/spec.md:51-61` |
| SD22 | **Setting a car to Sold *is* the sale.** The state comes first and the action follows: it records a sale price and date, removes it from the showroom, moves profit from projected to real. **Un-marking** reverses the sale and returns the car to its previous primary state with secondary states untouched. | `inventory/spec.md:33-43` |
| SD23 | **A bad save is refused before it writes, inline.** A wrong number is rejected *"inline, because a wrong number makes the showroom's primary action dead"*, and the previous number stays active. | `office-settings/spec.md:14-24` |
| SD24 | **Export is one action producing one ZIP**, holding `master.json`, one CSV per subject, and a `README.txt`. Reachable only from inside the office. | `office-settings/spec.md:25-39` |
| SD25 | **The privacy notice comes before the tap.** | `enquiries/spec.md:25-31` |
| SD26 | **The tap list has a permanent home** — the glyph persists so the list keeps an entry point. | `enquiries/spec.md:32-38` |
| SD27 | **Operational notices are read from setting rows, never computed here** — the office only displays them (design D19). | `office-settings/spec.md:40-52` |

---

## 5. Per-width behaviour — one demand is already written down

**There is exactly one spec demand about width**, and it is directly relevant to gap **G5**:

> **SD28** — *"Photos SHALL be **swipeable on phone and tablet**, with **arrows additionally on laptop**."*
> — `showroom/spec.md:44-50`

So the pattern the specs already accept is: **touch gets swipe; pointer gets arrows; the laptop gets both.** That
is the one settled precedent for "the per-width interaction split", and it says the split is by **input kind**
(touch vs pointer), not by pixels alone. **The office nav's gap (Q-001) is the same question** and is now ruled
(one 820px switch, tablet gets the phone shell).

**Nothing else about width exists in the specs.** Every other per-width decision in this layer is new, and the
one precedent above is the shape to follow.

---

## 6. The retryable state has **no spec requirement** — worth knowing

I searched all eight spec files for `retryable`, `retry`, `Try again`, `blip`, `unavailable`: **no matches.**

The rule lives in two places that are **not** a spec requirement:

- **design D18** (`design.md:113-118`) — *"A transient store failure becomes a retryable state, from one shared
  guard"*: every server-side store read passes through one shared guard; a transient failure becomes a **clear,
  retryable state** from one shared component, with **route-level error boundaries** behind it; it applies to
  **both** the office and the public showroom. The alternatives are recorded as **rejected**: per-page
  `try`/`catch`, and *the framework's default error page — "it **is** an error page, which is the outcome the
  truth forbids, and it offers no retry"*.
- **Truth 16** (`tasks/TASK-004/task.md:207-210`) — the page not breaking is TASK-004's; **the wording is this
  layer's**.

**Why this matters to the task:** when this layer settles the retryable state's wording (gap **G6**), it cannot
cite a spec requirement — it must cite **design D18 and truth 16**. Getting that wrong would send the dev looking
for a requirement that does not exist.

**And it means there is an unclosed loop:** design D18 requires a retryable state *"with route-level error
boundaries behind it"* for the office **and** the showroom. Whether those boundaries exist was never verified (it
is one of TASK-004's five carried "not verified" items — *"the 503 paths"*, `tasks-registry.md:38`). **The
research must look** (Phase 2, area 4).

---

## 7. Demands belonging to other layers — do not contradict, do not do

Named so the UX layer stays off their ground:

- **TASK-006:** the daily job — the drift report, the retention notice's *writing*, the `last_backup_at`
  heartbeat, the `auth_attempt` 90-day trim (`reports/TASK-004.md:233-236`). The **display** of the two
  operational notices is already required by `office-settings/spec.md:40`.
- **Architecture:** the specs' *"section"* → *"primary state"* vocabulary rewrite (design D15 d). The build
  list's wording rules may say "state" where older text says "section" — **do not settle it here.**
- **office-access, money, media:** the *substance* of these is built and verified. This layer touches only their
  **wording and presentation**, never their rules.

---

## 8. What this file does not do

- It does **not** choose any wording. Everything above is quoted or cited, not decided.
- It does **not** design anything. Presentation is the Designer's (Phase 3).
- It does **not** observe the app. Design D18's error boundaries, the 503 paths, and every per-width behaviour
  are **unseen** — Phase 2 looks.
- It does **not** re-decide the tablet nav; that is ruled (Q-001) and recorded in `questions.md`.

---

## 9. Threads into the next steps

- **Into R1.1** (the surface × state matrix): **SD28** gives the first column of the per-width split — touch vs
  pointer — and `showroom/spec.md:44` is the one place to check it was actually built that way.
- **Into R2.5** (failure wording): quote **design D18** and truth 16 as the authority for the retryable state,
  since no spec requirement exists; and **look for the error boundaries** — an unseen part of design D18.
- **Into R2.6** (per-width): SD28's *"swipe on touch, arrows additionally on pointer"* is the settled shape; the
  office nav's ruled answer (Q-001) is the second.
- **Into the Designer brief** (Phase 3): SD15/SD17/SD20's **label wording** is constrained by the specs, so the
  Designer's freedom is in **tone and placement**, not in what the words must say.
- **Nobody's to invent:** the gold-vs-red rule (`tasks.md:73`) is a demand to obey, not a question to ask.
