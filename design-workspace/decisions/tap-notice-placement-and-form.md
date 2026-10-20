# The WhatsApp tap notice — placement and form

**Decided:** 2026-10-16 · **By:** Designer · **Status:** ruling, for the Builder
**Element:** the WhatsApp-tap count drawn by `components/office/TapBadge.tsx` and rendered at
`components/office/OfficeNav.tsx:35` inside the Dashboard nav row.

**Supersedes:** the placement decision in `developer-workspace/notes/TASK-004-task19.md:45,54-56`
("the sidebar Dashboard item only").
**Puts pressure on:** `product-management/ux-plan.md:204` (Q77) — see "Pressure and amendment".

**Decision record**
- **What was decided:** (1) the count leaves the Dashboard nav row and is carried by its own
  labelled **"WhatsApp taps"** entry; the phone's five-cell bottom bar gains nothing. (2) The notice
  renders as a **WhatsApp glyph + the count with the words "WhatsApp taps"** — a self-identifying
  badge, not a bare digit. Hidden-at-zero stays.
- **Why:** each Ruling below is derived from the project's own purpose, data and failure modes, not
  from a familiar pattern.
- **What it serves:** the office noticing that a buyer tapped, without mis-reading the number as a
  property of "Dashboard".
- **What it must not be used for:** not a licence to add badges to other nav items, not a popup,
  alert or sound, and not a reason to move the tap *list* off the dashboard.

---

## Ruling 1 — Placement

**One line: the count leaves the Dashboard row and becomes its own labelled "WhatsApp taps" row in
the sidebar — not on Dashboard's row, not on Enquiries' row — linking to the Recent WhatsApp taps
list; the phone's five-cell bottom bar is left alone and the phone's notice is the labelled count on
that list.**

The row is a **notice, not a destination**: it never takes the current-page (`on`) highlight, and it
is shown only when the count is above zero.

### Why

- **A nav badge means "N things at this destination".** The owner's misread is exactly that
  convention broken: a tap count parked on Dashboard reads as a Dashboard figure. Deriving from the
  element's own meaning, a *tap* count can only sit honestly on a carrier that names taps.
- **Enquiries is the other candidate — and the owner's own plan named it** (`ux-plan.md:204`, Q77:
  *"A badge count on Enquiries in the sidebar"*). It is rejected. An `enquiry` is the customer's
  imported record — name, number, joining to no car (`enquiries/spec.md:8`, `design.md:78`) — while a
  tap is the car-linked, PII-free signal (`enquiries/spec.md:18-19`). The Enquiries page says so in
  its own words: *"The site only records that a WhatsApp tap happened … You bring the names and
  numbers back here by importing the enquiry sheet"* (`enquiries-client.tsx:136-137`). A tap count on
  Enquiries would simply move the fault the owner is rejecting from "belongs to Dashboard" to
  "belongs to Enquiries". **No existing nav destination's subject is taps.**
- **The list's named home is the dashboard** (`enquiries/spec.md:23`, *"the dashboard tap list"*;
  `dashboard/spec.md:43`, *"the recent-taps list"*). So the notice links to it rather than inventing a
  new destination.
- **Count and list cannot drift** because both read the one figure: `getOfficeTapCount()` and
  `getOfficeTaps()` both run over the same `tap` table (`lib/office.ts:429-473`); there is no second
  source and no "seen" mark. (The one visible mismatch — the count is *every* tap, the panel draws
  five — is Finding B below.)
- **Phone.** The bottom bar is a fixed `repeat(5,1fr)` grid (`office.css:145`; Task 19 note:54-56). A
  sixth cell breaks the bar, and a bare digit on the "Home" cell repeats the exact misread the owner
  is rejecting. So the bar gains nothing, and the mobile notice is the labelled count on the taps
  list — which is the first cell's screen.
- `design.md:147` records sidebar-vs-bottom-bar as a **deferred UI decision** — the Designer's to
  rule, not a spec change.

---

## Ruling 2 — Form

**One line: the badge becomes a self-identifying chip — the WhatsApp glyph
(`fa-brands fa-whatsapp`) plus the count — with the words "WhatsApp taps" beside it, a real
accessible name, and it still disappears at zero.**

### Why

- The owner's point #3: *"a badge should be a badge not a number."* A pill whose only visible content
  is a digit reads as a number. Adding the glyph and the words makes it a **labelled indicator**.
- **Touch and screen readers.** Today the meaning lives only in `title` and `aria-label`
  (`TapBadge.tsx:13-18`), and a touch user never sees a tooltip. With the glyph and the words on the
  surface, the phone user is told what it is without hovering.
- **It stays a *count*.** The spec's word is *"a count badge"* (`dashboard/spec.md:43`); an icon-only
  dot would drop the count and fail it. The number remains the point.
- **The accessible name stays explicit and pluralised** — "N WhatsApp taps recorded", `role="img"`
  kept — and for the row/link the visible words mean the name is on the surface, not only in a
  tooltip.
- **Hidden at zero stays.** The badge is a notice that something arrived, not a statistic (its own
  note, `TapBadge.tsx:9-10`); the empty case is said in words instead, on the panel (*"No taps yet.
  When a buyer taps WhatsApp on a car, it is recorded here."*, `page.tsx:169-173`). A "0" badge is
  noise. The tested `99+` cap stays (a badge is compact; the true figure stays in the accessible
  name).

---

## Constraints

### Respected

| Ruling | Constraint | How |
|---|---|---|
| 1 | `dashboard/spec.md:42-47` — "surfaced by a count badge and the recent-taps list" | The badge still exists; only *where it sits* moves, and the spec pins no location. The list stays on the dashboard. |
| 1 | `enquiries/spec.md:18-23` — taps hold no PII; "the dashboard tap list" | The notice *links* to the dashboard list; no tap data is joined to enquiries and no enquiry-count semantics are added. |
| 2 | `dashboard/spec.md:42-47` — "no separate alert, popup, or sound" | Only a badge's *appearance* changes. Nothing is added: no toast, no sound, no modal. |
| both | `dashboard/spec.md:46-47` — "reflects it on refresh, with no additional alert raised" | The count is still read server-side with the page; no client timer, no notification. |
| both | `task.md:129-133` (truth 8) — "a count badge and a recent list … never a popup, an alert or a sound" | Still a count badge, still a list, nothing noisy. |
| both | `design.md:147` — nav layout is a deferred UI decision | This is a UI ruling, not a spec change. |

### Pressure

- **`ux-plan.md:204` (Q77) — "A badge count on Enquiries in the sidebar".** Ruling 1 disagrees and
  places the count on a taps-named carrier. Q77 is a *plan*, and `task.md:8-9` says where a plan and
  a spec disagree, the spec wins and the disagreement is **logged**. This is that log. Q77's
  "Enquiries" placement is superseded; the owner should ratify that.
- **`TASK-004-task19.md:45,54-56` — the built "sidebar Dashboard item only" decision.** Superseded by
  this ruling.
- **The count is a running total, not a "new since you looked" notice.** `getOfficeTapCount()` counts
  every row with no window and no seen-mark (`lib/office.ts:461-473`; Task 19 note), and no GET may
  write, so a "new only" figure is not available. Ruling 1 makes the cumulative figure honest by
  labelling it ("WhatsApp taps: N"). A *true* unseen notice would need a seen-mark and therefore a
  write on read — an **owner amendment**, not a quiet build.

### Does the spec need an owner amendment?

**For these two rulings: no.** `dashboard/spec.md:42-47` pins neither the badge's location nor its
appearance beyond "a count badge … no popup, alert or sound", and both rulings stay inside it.

**Two things do need an owner call** (they are not dashboard-spec changes, but they are decisions the
Builder must not make silently):

1. **Ratify that Q77's "badge on Enquiries" is superseded** by a taps-named carrier. One line from the
   owner closes it.
2. **A *persistent* phone notice.** The fixed five-cell bottom bar cannot host a labelled entry — a
   digit on a cell repeats the misread, a sixth cell breaks the bar. If the owner wants the notice
   visible from every office page on a phone, that is an owner call. *My suggestion (unverified, my
   own):* the mobile topbar, which is persistent and can carry a label. Otherwise the phone's notice
   stays on the taps list.

---

## How this element is tagged (UI axes)

**Element 1 — the tap notice** (`TapBadge` row on desktop; labelled count on the panel on phone)

- **Axis 1 · Behaviour: Server-fed.** The count is the store's `count(*) FROM tap`, read with the page
  (`layout.tsx:24`). It does not self-time (no timer) and is not visitor-driven — a click navigates
  but never changes the count.
- **Axis 2 · Purpose: Informational + Navigational.** The *count* is informational (tells the office a
  tap arrived); the *row that carries it* is navigational (moves to the list). Two purposes, named
  separately.
- **Axis 3 · State**
  - **Idle** — count > 0: labelled chip (glyph + words + count) shown.
  - **Empty** — count = 0: the notice is absent; "none yet" is said in words on the panel
    (`page.tsx:169-173`). This is deliberate, not a gap.
  - **Loading** — arrives with the page; no independent spinner.
  - **Partial** — n/a (a single figure).
  - **Error / Offline** — notice absent, **shell alive** (see Finding A).

**Element 2 — the Recent WhatsApp taps panel** (unchanged by this ruling; the notice's target and the
phone's notice surface).

### Journey touch (UX)

The notice belongs to **Orient**: it tells the owner buyer interest arrived. Its job is to prevent
**Ignored** (the product saying nothing when a tap lands) without becoming **Overloaded** (a popup,
alert or sound). Cost test: a bare digit that must be hovered to decode — or a number that reads as
Dashboard's — spends the owner's attention and returns nothing, so it is redesigned, not explained.
Silence: the product **speaks first** here on purpose (truth 8); that is a decision, not an
oversight.

---

## Findings for the Builder (not instructions — flag, don't quietly build)

- **Finding A — the badge's fetch is on every office page's critical path.** The count is awaited
  unguarded in the shell layout (`layout.tsx:24`). If the store fails on the *badge's* fetch, the
  whole office shell can error, not just the notice. The notice's error/offline state must be
  **"notice absent, shell alive"**: the badge must never take the shell down.
- **Finding B — the count and the panel can *appear* to disagree.** The count is every tap; the panel
  draws `RECENT = 5` (`page.tsx:15`). A badge reading 248 beside a five-row list reads as one being
  wrong. The panel should state its reach (e.g. "showing 5 of N", with the existing link onward).
  *This is my suggestion by analogy to the money rule — `dashboard/spec.md:14-19`, "every figure
  states its reach" — and is **not** itself a spec requirement.*

## What the Builder changes

- `components/office/TapBadge.tsx` — add the WhatsApp glyph and the words; keep `role`/`aria-label`
  (and its pluralisation), keep hidden-at-zero.
- `components/office/OfficeNav.tsx` — remove the badge from the Dashboard row (`:35`); add the
  labelled "WhatsApp taps" notice row (its own row, no `on` highlight, shown at count > 0), linking to
  the list.
- `components/office/OfficeBottomNav.tsx` — unchanged (no count on the five cells).
- `app/office/(shell)/page.tsx` — anchor the panel; carry the labelled count on the panel header (the
  phone's notice); consider the reach line (Finding B).
- `developer-workspace/scripts/task-004/tap-badge-check.ts` — update the witness to the new form and
  placement.
- Keep one figure: the notice and the list both read `getOfficeTapCount()` / `getOfficeTaps()` over
  `tap`; add no second source.

**Sidebar order (pinned):** the notice row sits **last, after Settings** — at the foot of the nav,
above the "Signed in as" footer — so it is off every destination's row and farthest from "Dashboard",
and reads as a status rather than a peer destination.
