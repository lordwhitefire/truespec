# Questions for the owner

Rulings this layer needs from the owner. Each one: what I found (with the file and line), what I recommend, and
what I need to hear back. Filed as they arise — **findings as they come**.

---

## Q-001 — The tablet navigation — **ANSWERED (owner, 2026-10-16: "good")**

**The owner's ruling (2026-10-16):** all three recommendations accepted —
**(1)** keep the single 820px switch and **declare** it (a tablet gets the phone shell; a landscape tablet gets
the sidebar; **no** tablet-only layout);
**(2)** the bottom bar's **"More" opens Drafts / Activity log / Settings**;
**(3)** the **dead Search button is removed** — real search, if ever wanted, is its own task.
**What this means:** the "genuinely open tablet nav" is **no longer open**. These three are now requirements of
this layer and go into its `task.md`. The look of the "More" list remains the Designer's.

**Why it is here:** TASK-004 named *"the genuinely-open tablet nav"* (`developer-workspace/reports/TASK-004.md:231`)
as open, and the owner asked what my recommendation is. I had not looked at it before, so I looked.

### What is actually built (verified, not recalled)

The office has **two navigation systems switched by one width — 820px** (`app/office/(shell)/office.css:128-142`,
`:149`):

| Width | What the office shows |
|---|---|
| **more than 820px** | The sidebar (`.side`, 240px) carrying **seven** destinations — Dashboard, Inventory, Add / edit car, Enquiries, **Drafts**, **Activity log**, Settings (`components/office/OfficeNav.tsx:14-22`). No topbar, no bottom bar. |
| **820px or less** | The sidebar is hidden. A topbar (`.topbar`) appears, and a bottom bar (`.bnav`) with **five** destinations — Home, Stock, Add, Chats, More (`components/office/OfficeBottomNav.tsx:8-14`). |

**So a tablet is treated as a phone.** A tablet held upright (portrait, ~768–834px) lands on the phone shell; a
tablet held sideways (landscape, ~1024px+) lands on the desktop shell. Both are legitimate, and **one breakpoint
is not wrong** — it is just *undeclared*. Nothing has ever said what a tablet should get, so it gets whatever the
width happens to fall into.

### Two things that are genuinely broken at 820px and below

Not style questions — things a person cannot do.

1. **Drafts cannot be reached.** The five-item bottom bar does not carry it, and the only other link to
   `/office/drafts` in the whole app is `components/office/CreateFromFile.tsx:135` — a "go to drafts" link shown
   *after* a PDF import. On a phone or upright tablet, the owner can only reach Drafts if they have just imported
   something. (The sidebar has it; the bottom bar does not.)
   - *Checked and NOT broken:* **Activity log** is also missing from the bottom bar, but it **is** reachable — the
     dashboard links to it as "Full log" (`app/office/(shell)/page.tsx:131`), and the dashboard is the phone's
     home. So it has a way in, even though the nav does not carry it.
2. **A dead Search button.** On the dashboard at 820px or less, the topbar draws a magnifying-glass button that
   **does nothing** — it is literally labelled `aria-label="Search (UI placeholder)"`
   (`components/office/OfficeTopbar.tsx:29`). It is the only control of its kind in the app: a visible button with
   no behaviour. It is the same fault as showing a phone number nobody owns — **a control that promises something
   the app cannot do.**

### My recommendation

1. **Keep one breakpoint. Declare it.** A tablet gets the phone shell; a landscape tablet gets the sidebar. Do
   **not** invent a tablet-only layout — that is extra machinery for a case that already works. Writing the
   choice down is the whole fix for the "genuinely open" part.
2. **Give Drafts a way in — by making "More" mean more.** The bottom bar's fifth slot already says **"More"** but
   goes straight to Settings. Make it open a short list — **Drafts, Activity log, Settings**. That uses a slot
   that already exists, adds no new bar, and gives every destination a way in on a phone and an upright tablet.
   *(The look of that list is the Designer's, not mine.)*
3. **Remove the dead Search button.** Either it works or it goes. My recommendation is **it goes now** — a search
   that does not search is worse than no search. If you want real search, that is its own small task, and I will
   write it as one.

### What I needed from you — **given 2026-10-16**

- One breakpoint, tablet gets the phone shell — **agreed.**
- "More" opens Drafts / Activity log / Settings — **agreed.**
- Search button — **removed** (real search would be its own task).

**Carried into this layer's requirements.** Nothing here is built yet; these three are now requirements of
TASK-005 and are written into its `task.md` when the plan reaches Phase 4. The "More" list's look is the
Designer's, briefed in Phase 3.

---

## Q-002 — Five things the owner ruled on 2026-10-17, during the Designer's pass — **ALL ANSWERED**

Asked in conversation while the design decisions were being settled. Recorded here so they are not only in the
chat. Full reasoning in `04-designer.md`; the short form:

| # | What was asked | The owner's answer | Where it is written |
|---|---|---|---|
| a | The undo toast has no measure of time left. A bar that drains full → zero over the window? | **Yes** — *"so they have a measure… it is a better sense of time"* | `04-designer.md` D24–D27 |
| b | The photo-less cars (FIX-002) — a defect, or test data? | **Test data — closed.** But the empty box becomes **a gradient of different colours** | `04-designer.md` D7, D5–D6 |
| c | A slow page and a dropped connection both show nothing of ours. Build them? | **Yes** — a waiting sign **and** an offline screen | `04-designer.md` D34 |
| d | Deleting a draft — undoable, or gone? | **Gone** — *"draft can be deleted for good"* → **"Remove for good"**, no undo | `04-designer.md` D20 |
| e | The car form's delete does nothing and reports "Saved"; the top bar's Search does nothing. Both are "demo". Keep? | **No.** *"the only thing that is fake is data… button that cannot do anything should not be excused by demo"* — wire it up or remove it; **Search button removed** | `04-designer.md` D29–D30 |
| f | With no WhatsApp number saved, do the chat buttons vanish or stay? | **Stay, visibly greyed out** — *"leave everything just make it not clickable"*, chose *(a)*. **Supersedes the 2026-10-16 "nothing at all" ruling** | `04-designer.md` D16; research plan §7.3 |

---

## Q-003 — The first-time-visitor walk — **OUTSTANDING, and it needs a person, not an agent**

The UX rule requires that a first-time visitor walks the journey and the owner hears it. **The Designer said
plainly it cannot run this check, and so can neither can I.** It is not something an agent can answer honestly
— an agent already knows where everything is.

So it is filed as an open question, with the five questions the Designer wrote for that visitor. Whoever does
the walk should be someone who has **not** used the app before.

1. You opened the office on a phone. Where would you tap to find Drafts or Settings? Did you find them without
   help?
2. On a car with no photos, what did you think was happening? Did anything look broken?
3. You filtered the showroom down to nothing. What did you expect to see? Did you know what to do next?
4. You deleted a car. Did you know it worked? Could you have undone it? Would you have believed the undo
   would work?
5. You came back the next day. Did the product remember where you were?

**Record the answers verbatim.** They are the only evidence that the rulings in `04-designer.md` actually
landed on a person. This is carried into `testing.md` as its own check group when Phase 4 writes it.

---

## Q-004 — What is **not** a question for the owner — **all four settled 2026-10-17**

Written down so the next run does not re-ask things that are lookups or decisions belonging to me. **All four are
now answered** in `06-architect-calls.md`:

- **The undo timing** → **there is no bug.** The window is 8 seconds, set once (`inventory-client.tsx:175-182`,
  called at `:206`); my "4.3-second bug" was a misreading of my own note — the ~4.3 s was how long the toast had
  been *open* when Undo was clicked, not when it died. The bar is drawn to 8 s. (`06` call 1.)
- **How a no-op save is detected** → **the machinery already exists.** `lib/car-update.ts` already compares a
  change-hash and only writes when something differs; the gap is that it does not report the fact back
  (`actions/car.ts:121-127`). (`06` call 3.)
- **Error pages** → **they already exist** (`app/error.tsx`, `app/office/error.tsx`), one level above each shell
  because a boundary cannot catch its own layout. The fix is a write that returns instead of throwing, plus a
  boundary inside each shell. (`06` call 2.)
- **The 404 family** → a missing car answers **404** (view unchanged); the office gets **its own not-found**; the
  root 404's bare card **stays as built**. (`06` call 4.)
