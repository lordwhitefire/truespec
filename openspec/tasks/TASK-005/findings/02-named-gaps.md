# 02 — Gaps earlier layers named for TASK-005

**Written:** 2026-10-16, during **R0.1** of `../research-plan.md`.
**What this is:** every gap an *earlier* layer said belongs to this layer, collected in one place, each with the
file and line it came from. Documentary only — this file **quotes and collects**. It settles nothing, designs
nothing and decides nothing. Nothing here has been looked at in a running app yet.
**Why it matters:** TASK-004 wrote plainly that *"an unnamed gap is a failure"* (`TASK-004/task.md:508-509`). This
is that handover, gathered so the layer can be planned against it instead of against memory.

---

## 1. Where this material came from

Verified against the files on 2026-10-16. Line numbers are as they stood at collection.

| Source | Lines | What it gave |
|---|---|---|
| `openspec/tasks-registry.md` | 39 | This layer's one-line scope (the seven areas) |
| `openspec/tasks-registry.md` | 38 | TASK-004's closed entry — the carried debts and nits |
| `openspec/tasks/TASK-004/task.md` | 207-210 | Truth 16 — the retryable state's *wording* is this layer's |
| `openspec/tasks/TASK-004/task.md` | 265-268 | The explicit handover: *"TASK-005 owns the polish"* |
| `openspec/tasks/TASK-004/task.md` | 508-509, 702-703 | The standing instruction that gaps must be named |
| `openspec/tasks/TASK-001/task.md` | 31 | The original naming of this layer |
| `openspec/tasks/TASK-001/testing.md` | 125 | What TASK-001 deliberately left untested for this layer |
| `developer-workspace/reports/TASK-004.md` | 229-245 | The dev's handover list, incl. the tablet nav and the 001/003 carry |
| `developer-workspace/reports/TASK-004-checkpoint-b.md` | 72-73, 90-91 | The same handover, stated at the checkpoint |
| `developer-workspace/notes/TASK-004-task29.md` | 131-134 | The interim wordings, and that they are *not* final copy |
| `openspec/changes/truespec-architecture/tasks.md` | 73 | Build task 7.4 — the failure/attention wording rule (a demand, not a gap) |
| `openspec/tasks/TASK-004/TASK-004-report.md` | 229-232 | The report copy in the planning folder (same handover) |

---

## 2. This layer's scope — the two names it goes by

- **The registry's name** (`tasks-registry.md:39`), the spine:
  *"TASK-005 — UX. Layer 5. Dialogs, focus, toasts, undo timing, offline handling, failure wording, per-width
  interactions."* — **seven areas.**
- **The original name** (`TASK-001/task.md:31`), from the first task's layer table:
  *"Toast/undo/empty-state/failure-wording pass."*

**Worth noticing:** the original name covers four things; the registry's covers seven. **Dialogs** and **per-width
interactions** were not in the first naming. This is how layers grow between planning and doing, and it is why the
research must walk the surface rather than the list.

---

## 3. Gaps named for THIS layer

Each row: what was named, who named it, exactly where, and what it appears to mean. **"What it means" is my
reading of the words, not an observation of the app.**

### 3.1 The explicit handover — `TASK-004/task.md:265-268`

> *"**TASK-005 owns the polish.** This layer lands the behaviour — the confirmation, the 8-second undo window, the
> inline validation, the empty states' existence, the page not breaking. Focus handling, toast ordering and
> wording, the offline indicator, the gold-vs-red attention wording and the per-width interaction split are
> TASK-005's, named here so neither layer silently assumes the other did them."*

Five gaps named in one paragraph:

| # | Gap | What it means (my reading) | Status |
|---|---|---|---|
| G1 | **Focus handling** | Where the caret goes, where the ring goes, what happens to it when a dialog opens, closes, or is escaped. | Open — untouched |
| G2 | **Toast ordering and wording** | When several messages are true at once, which is shown, in what order, and in what words. | Open — untouched |
| G3 | **The offline indicator** | What the person sees when the store cannot be reached, and how it clears. | Open — untouched |
| G4 | **The gold-vs-red attention wording** | Gold means *look at this*, red means *something is wrong* — what each says and when each is used. | Open — the rule exists (see 3.5) |
| G5 | **The per-width interaction split** | Which interactions differ by screen width — and the tablet nav is genuinely undecided (see 3.3). | Open — partly undecided |

**The "already landed, only polish left" half of that paragraph** — worth keeping separate, because it is easy to
redo work that exists:
- the **confirmation** exists;
- the **8-second undo window** exists **as behaviour** (its *presentation* is ours — see G8);
- the **inline validation** exists;
- the **empty states exist** (their polish is ours — see G9);
- **the page does not break.**

### 3.2 The retryable store state — `TASK-004/task.md:207-210` (truth 16)

> *"A blank or blinking store must not become an error page. A transient failure reading the store must surface as
> a clear, retryable state — never a fabricated figure, never a silent empty list that looks like real emptiness,
> and never a bare 500. The **wording** of that state is TASK-005's; the page not breaking is this layer's."*

| # | Gap | What it means | Status |
|---|---|---|---|
| G6 | **The wording of the retryable state** | The page already refuses to break. What it *says* is ours — and the shape is fixed by D18: a store blip is a retryable state, never an error page. | Open — untouched |

### 3.3 The dev's own handover — `developer-workspace/reports/TASK-004.md:229-233`

> *"**TASK-005:** the wording of the retryable state; the per-width interaction split (incl. the genuinely-open
> tablet nav); toast/confirm presentation; the 8-second undo's presentation."*

| # | Gap | What it means | Status |
|---|---|---|---|
| G7 | **Toast/confirm presentation** | How the toast and the confirmation *look and sit* — position, stacking, duration, dismissal. | Open |
| G8 | **The 8-second undo's presentation** | The window's behaviour is built; how the countdown/window is shown to the person is ours. | Open |
| — | **The genuinely-open tablet nav** | Named as **open**, not as a defect: the tablet navigation was never decided. | **Undecided — needs a ruling, not a polish** |

The same list appears at `TASK-004-checkpoint-b.md:72-73` and `:90-91`, and in
`openspec/tasks/TASK-004/TASK-004-report.md:231-232`. Repeated in four places — this is a handover the dev took
seriously.

### 3.4 Empty states — `TASK-004/task.md:265` + `TASK-001/testing.md:125`

`TASK-001/testing.md:125` lists what TASK-001 deliberately did **not** test, for later layers:

> *"…**toasts/undo/empty states (TASK-005)** · daily jobs, pruning, monitoring (TASK-007) · retention sweeps
> (TASK-007/008). If you noticed something wrong in those areas anyway, list it as an **observation**, not a
> failure."*

| # | Gap | What it means | Status |
|---|---|---|---|
| G9 | **Empty states' polish** | Their *existence* is TASK-004's and is landed. What they look like and say is ours. | Open |

### 3.5 The rule the wording must obey — `changes/truespec-architecture/tasks.md:73` (build task 7.4)

> *"Failure and attention wording must follow the settled rules: gold + icon + words, never colour alone;
> costs-incomplete attention…"*

This is not a gap — it is a **standing demand** the gaps in 3.1/3.2 must obey. It is collected properly in
**R0.2** (`findings/03-spec-demands.md`). Noted here because G4 ("gold-vs-red") is the same rule.

### 3.6 The interim strings — `developer-workspace/notes/TASK-004-task29.md:131-134`

> *"**The "wording" of the states** is deliberately TASK-005's, as the spec says. The text used here ("Just a
> moment / Setting things up", "We couldn't load this / Try again") is this layer's existing interim wording and
> is **not a claim to the final copy**."*

| # | Item | What it means | Status |
|---|---|---|---|
| G10 | **Interim strings live in the code now** | `"Just a moment / Setting things up"` and `"We couldn't load this / Try again"` are placeholders that must be quoted and settled, not left to become the product by accident. | Open — must be quoted verbatim in R2.5 |

---

## 4. Named for OTHER layers — seen here, not done here

Named so this layer does not silently assume them, and does not drift into them.

### 4.1 TASK-006 — behaviour over time (`TASK-004.md:233-236`)

The daily job: the **drift report**, the **retention notice**, the **`last_backup_at` heartbeat**, the
**`auth_attempt` 90-day trim**, and **clearance of assets no draft and no record referenced**. **Not this layer.**
Where the UX research meets one of these (the retention notice is a message a person may read), it is named for
TASK-006 and left alone.

### 4.2 Architecture — a vocabulary debt (`TASK-004.md:237-239`)

> *"the pending rewrite of the specs' **"section"** vocabulary to **"primary state"** (D15 d) — built to D15's
> semantics, logged rather than silently rewritten."*

A planning debt in the architecture's own words, not a UX gap. It touches this layer only because the UX copy may
have to say "state" where the code says "section". **Do not settle it here.**

### 4.3 Carried from TASK-003 (`TASK-004.md:240-242`)

- the seed's **child-row id churn**;
- `components/CarCard.tsx:31`'s dead **`mi`**;
- `lib/serialize.ts:153`'s **`mileage`→`mileageKm`** alias (name only).

Cosmetic-to-serious code debts, carried and named. **They are not UX gaps**; listed so they are not rediscovered
as if new.

---

## 5. Verification debts carried from TASK-004 — `tasks-registry.md:38`

TASK-004 closed with five honest **"not verified"** items and two nits. Quoted as written:

1. the human filling the Acrobat blank;
2. the idle-path revoke;
3. no restore script;
4. the **503 paths**;
5. the guarded notice read proven by code rather than live.

Plus: the stale **`refusal-proof.ts`** and the unmaintained **`pdf-lib`**.

**Which one touches this layer:** item 4 — the **503 paths** are the store-is-down behaviour, which is the same
ground as **G3 (the offline indicator)** and **G6 (the retryable state's wording)**. The research must not assume
those paths behave; it must look. **The rest are not this layer's** and must not be quietly absorbed into it.

---

## 6. FIX-001 — folded into this layer by the owner's ruling (2026-10-16)

Not a gap an earlier layer named, but **in this layer by the owner's word**, so it is collected here with the
rest.

**What it is:** the showroom **invents a contact number** when none is saved. `app/(site)/layout.tsx:88` renders
`{num || "+234 800 000 0000"}`, and the same invented number is hardcoded in four more places:

| # | Place | What it does when no number is saved |
|---|---|---|
| 1 | `app/(site)/layout.tsx:88` | Shows the invented number in the site header under "WhatsApp" |
| 2 | `app/not-found.tsx:75` | A hardcoded `wa.me/2348000000000` link on the global 404 |
| 3 | `app/(site)/not-found/page.tsx:25` | The same hardcoded link on the site 404 |
| 4 | `app/(site)/privacy/page.tsx:88` | The privacy notice **states the invented number as fact** |
| 5 | `app/(site)/privacy/page.tsx:118` | The same hardcoded link at the foot of that notice |

**And the car page's button does not lie, it dies:** `waLink` (`components/whatsapp.ts`) strips non-digits, so an
empty number builds **`wa.me/?text=…` — a link to no recipient** — on the site's whole conversion path.

**Verified, and it corrected an earlier error of mine:** `+2348000000000` is **accepted** by `lib/phone.ts` (a
ten-digit national number beginning `8` passes `MOBILE`). It was never refused. So the office's validation
**cannot** catch an invented-but-well-formed number — which is why the rule must be carried by the app not
inventing it at all.

**The owner's rulings (2026-10-16):**
- **The fallback is removed** in all five places — the fix is written into this layer's `task.md`.
- **When no number is saved there is to be nothing at all:** no "WhatsApp" block in the header, and the privacy
  notice names no number — it speaks of "our WhatsApp".
- The owner's own store holds his real number, so the fallback is **not** showing on the live showroom today.
- The standing rule it breaks: **the application never invents a value the owner did not enter.**

---

## 7. What this file does not do

- It does **not** settle any wording. Every string here is quoted, not chosen.
- It does **not** design anything. Presentation questions (G1, G7, G8, G9) are the Designer's, and the Designer is
  briefed in **Phase 3**, not here.
- It does **not** observe the app. Every claim traces to a file above; **nothing** here has been seen running.
- It does **not** decide the **tablet nav** (3.3) — that is **undecided**, and it is a **ruling to be asked for**,
  not a polish to be invented.

---

## 8. Threads to carry into the next steps

- **Into R0.2** (`03-spec-demands.md`): the **gold + icon + words, never colour alone** rule
  (`changes/…/tasks.md:73`) is a standing demand, and so is D18's *a store blip is a retryable state, never an
  error page*. Collect both properly there rather than borrow them from here.
- **Into R2.5** (failure wording): quote the interim strings **verbatim** (G10) before proposing replacements, and
  walk the **five FIX-001 places** (§6).
- **Into the Designer brief** (Phase 3): the **tablet nav** is genuinely open (3.3); the **8-second undo's
  presentation** (G8) and the **toast/confirm presentation** (G7) are presentation questions with a fixed
  behaviour already underneath them.
- **Into the owner's questions**: the tablet nav needs a ruling from him — it is not mine to invent.
