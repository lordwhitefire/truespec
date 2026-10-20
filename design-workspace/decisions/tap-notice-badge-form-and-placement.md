# The WhatsApp tap notice — badge form and placement

**Decided:** 2026-10-16 · **By:** Designer · **Status:** ruling, for the Builder

**Element:** the WhatsApp-tap notice. Drawn by `components/office/TapBadge.tsx`; rendered by the
shell in `app/office/(shell)/layout.tsx` (`.sfoot`, desktop) and `components/office/OfficeTopbar.tsx`
(phone). It is also the tab that `/office/enquiries` opens onto.

**Supersedes and withdraws:** `design-workspace/decisions/tap-notice-placement-and-form.md` — it put
the count on its own labelled row in the sidebar nav, which the owner rejected (*"you putting it in
the nav bar is complicating matters"*). That file is dead; do not build from it. Retrieve nothing
from it, including its sidebar-order pin and its link to `/office#recent-whatsapp-taps`.

**Decided by the owner, not by me (the brief):** the notice is a **notification badge** — the
WhatsApp glyph with a small count circle at its top-right (the cart-icon pattern), capped `99+`,
**removed entirely at zero**; its placement is "anywhere a notification icon should be"; the full tap
list becomes a **tab inside `/office/enquiries`**, not a new page; clicking the notice opens that tab.

**Two facts in the brief are wrong, and the rulings below rest on the corrected facts:**

1. **Both homes are dark.** The brief says "one home is on dark (sidebar), one on light (topbar)".
   The topbar is **not** light: `office.css:53` sets `.topbar{background:var(--dk)}`, and `.side` is
   `var(--dk)` too (`office.css:34`), where `--dk:#212529` (`office.css:12`, unoverridden in the dark
   block at `:17-19`). Both the sidebar footer and the phone topbar are `#212529`. This changes
   Ruling 1 decisively: the circle is tested against **one** dark surface, not two different ones.
2. **`globals.css` is not loaded in the office area.** It is imported only by `app/(site)/layout.tsx`
   and `app/not-found.tsx`. The office shell carries `office.css`, and each office page its own sheet
   (`app/office/(shell)/enquiries/page.tsx:1` imports `./enquiries.css`; `office.css:10-13` explains
   the convention). So the inventory tab classes `.tabs`/`.tab` (`globals.css:399-428`) are **not
   available** to the Enquiries page. This changes Ruling 5: the tab row's look must live in
   `enquiries.css`.

---

## Decision record

- **What was decided:** the six Rulings below — the circle's colour, its exact spot in each home, what
  the number means, where the accessible name lives, the Enquiries tabs, and the dashboard panel's
  link and header.
- **Why:** each ruling is derived from this project's own purpose, data and failure modes, and from
  the real files, not from a familiar pattern.
- **What it serves:** the office noticing that a buyer tapped, and being able to read the whole list,
  without a digit that reads as the wrong thing or a figure that quietly lies about being "unread".
- **What it must not be used for:** not a licence to badge other icons or nav rows; not a red alert;
  not a popup, alert or sound (`dashboard/spec.md:42-47`); not a reason to move the tap list off the
  dashboard panel; not a second count display beside the shell notice's.

---

## Ruling 1 — The circle's colour: gold, not red

**One line: the circle is the app's gold (`var(--gold)` fill, `var(--gt)` numeral, a 2px `var(--dk)`
ring) — red fails against the one dark surface both homes share, and red in this app already means
destruction, not notice.**

### Why

- **Red does not clear the bar here.** Both homes are `#212529`. Measured with the WCAG relative
  luminance formula: the app's standard red (`--bad:#c0392b`, `office.css:13`) is **2.84:1** against
  `#212529` — under the 3:1 non-text minimum (WCAG 1.4.11), so the circle would barely read as a
  shape; the dark-theme red (`--bad:#e07060`, `office.css:18`) with a white numeral is **3.16:1**,
  under the 4.5:1 small-text bar. Either red fails one of the two tests.
- **Gold clears both.** `#c8a24a` against `#212529` is **6.41:1** (the shape stands off the surface)
  and its dark numeral `#1a1405` on it is **7.61:1** (the numeral is legible). One colour, both tests,
  both homes — because both homes are the same surface.
- **Red already means "destructive" in this project.** `--bad` is the app's delete colour
  (`car.css:66`, `inventory.css:143`, `.btn.danger`). A buyer tapping WhatsApp is interest, not an
  error. Using the danger colour for it would mis-signal against the app's own language.
- **Calling red "the convention" is not a reason to copy it.** Guidewire's header does say "red is
  used for notifications that appear in the header" (their global-header doc), and that is the common
  pattern — but a pattern looked up is context, not a default, and it still has to serve this project.
  Here the project's own colour grammar (gold = the live accent: `--gold` fills active states,
  `.sn a.on`, `.subnav-it.on`, `.ico:hover`; red = delete) points to gold.
- **The one gold hazard, and the fix.** The topbar's icon button fills gold on hover
  (`.ico:hover{background:var(--gold);color:var(--gt)}`, `office.css:58`). A gold circle on a gold
  button would vanish at the moment of hover. So the circle carries a **2px ring in `--dk`** — the
  cart-icon pattern's separation ring. `--dk` is also the sidebar's surface, so one ring colour works
  in both homes, and it keeps the circle a circle even while the button behind it is gold.

*My own suggestion, unverified:* I considered WhatsApp green (`--wa:#25d366`, 7.78:1 on dark) because
the glyph is a WhatsApp glyph. I rejected it: green on a gold-accented dark shell competes with the
accent and reads as a second brand colour, and the app's glyph is drawn monochrome either way.

---

## Ruling 2 — The exact spot in each home

**One line: desktop — in `.sfoot`'s `.srow`, last (rightmost), after Sign out; phone — the topbar's
rightmost icon on every office route, immediately outside the gear.**

### Why

- **Desktop, and why the `.srow` and not its own line.** `.sfoot .srow` has a **pinned height**
  (`height:18.75px`, `office.css:47`). The notice is removed entirely at zero (owner's decision), so a
  placement on **its own line above "Signed in as" would change the footer's height** the first time a
  tap arrives, moving the sidebar's content inside a fixed `100vh` column (`office.css:34`). On the
  `.srow` the height never changes. Within the row the notice goes **last**: the row is left-packed
  (`display:flex`, default `justify-content`), so adding a trailing item leaves the theme toggle and
  Sign out exactly where they are, while a leading item would shove them sideways whenever the count
  goes to or from zero.
- **Desktop, why the footer at all.** SSW.Rules' sidebar rule is *"group it with the user/account
  section"*; `.sfoot` is that section (identity line, then `.srow`, `layout.tsx:37-62`). On desktop
  there is no top-right corner to use — the sidebar is on the left — so the account-group rule is the
  one that applies.
- **Phone, why rightmost and on every route.** SSW.Rules' header rule is *"place it in the top-right
  corner"*. Carbon's UI shell header puts notifications *"3rd from the right"* with the **account**
  icon rightmost — but this app's topbar has **no account icon** (the account lives in the sidebar
  footer, hence in Settings on a phone), so Carbon's rule has nothing to attach to and SSW's literal
  top-right corner wins. The notice is therefore the **last** icon in the right cluster on **every**
  office route — including `/office/settings`, where today the only icon is the Dashboard link
  (`OfficeTopbar.tsx:30-33`). A notification icon that shows on only some screens is not a
  notification icon; the topbar is `position:sticky` and persistent (`office.css:53`), so it is the
  phone's one always-visible home. Pinned order:
  - `/office` → `[search] [settings] [notice]` (the notice is rightmost, still *beside* Settings).
  - any other route → `[settings] [notice]`.
  - `/office/settings` → `[dashboard] [notice]`.
- **No JS is needed for the responsive split.** `.side` is `display:none` ≤820px and `.topbar` is
  `display:none` above it (`office.css:53,130-133`), so the notice can be drawn in **both** places,
  always, from the one server-read count; CSS reveals exactly one.

---

## Ruling 3 — What the number means: the count, and it must not pretend to be "unread"

**One line: keep the count (a dot would fail `dashboard/spec.md:43`), but present it as a plain
all-time total with none of the "unread" signals — and ask the owner whether he wants a true "new
since you looked" figure, because that needs a seen-mark and therefore a write.**

### Why

- **A dot fails the spec in words.** `dashboard/spec.md:43`: *"surfaced by a count badge"*. A dot
  drops the count. The figure is real and the office wants it (`getOfficeTapCount()` =
  `SELECT count(*) FROM tap`, `lib/office.ts:472-473`).
- **But a badge's usual meaning is "new/unseen", and this one never clears.** The count is every tap,
  with no window and no seen-mark (`lib/office.ts:472-473`), and **no GET may write** — the codebase
  holds this (`layout.tsx:41`, *"Sign-out is a POST … no GET changes state"*), so it cannot clear when
  read. Left looking like an unread badge, it would lie. So it must carry **none** of the unread
  vocabulary: no red (Ruling 1), no pulse, no animation, no "N new". It is a **total**, stated
  plainly, and the accessible name says "recorded", not "unread" (Ruling 4).
- **The honest alternative is an owner amendment, not a quiet build.** A true "taps since you last
  looked" needs a **seen-mark** — a stored timestamp updated **when the list is viewed**, which is a
  write on read, plus a schema change. That is the owner's call. The question is recorded below; the
  default ruled here needs no amendment and stays inside the spec.

---

## Ruling 4 — The accessible name: on the parent link, the circle decorative

**One line: the name lives on the **link** — `"N WhatsApp taps recorded"` (singular at 1) — and the
glyph and circle are `aria-hidden="true"`, with the true figure in the name even when the circle reads
`99+`.**

### Why

- **The established pattern is the parent, not the badge.** The APA A11y Patterns badge page is
  explicit: *"Provide an aria-label on the element that owns the badge (icon button, avatar). The
  numeric badge alone does not convey meaning"*, and *"Mark decorative badges `aria-hidden`"* /
  *"do not expose the badge text to assistive tech when the parent label already contains the same
  information."* The Compound design system says the same for its icon badges. The first pass put
  `role="img"` + `aria-label` on the badge `span` itself (`TapBadge.tsx:21-24`); because the notice is
  now a **link** with a graphical child, the name belongs on the link and the child is decorative —
  otherwise the count is announced twice and the link is announced with no name of its own.
- **"Include units in the count."** The same source: use *"3 unread notifications"*, not a bare
  number. The existing wording already does this and is already pluralised (`TapBadge.tsx:19`), so it
  is kept verbatim and only moved to the link:
  **`"${count} WhatsApp ${count === 1 ? "tap" : "taps"} recorded"`**. It states a fact ("recorded"),
  which is exactly what a total is (Ruling 3).
- **The cap is visual only.** The circle may show `99+`, but the link's name always carries the true
  figure, so the number is never actually lost.

---

## Ruling 5 — The Enquiries tabs

**One line: two tabs, **"Enquiries"** then **"Taps"**, **Enquiries** the default; the `h1` stays
"Enquiries" for both; no count on the heading or the tabs (the shell notice is the count's one home);
the taps explainer stays under the `h1` above the tabs; and the Taps tab is addressed by
`/office/enquiries?tab=taps` so the shell notice and the panel link can open it directly.**

### Why

- **Names and order.** "Enquiries" first because it is the page's own subject and the board is what
  the page has always been; "Taps" second because it is the supporting list. Both are the project's
  existing vocabulary (*"Recent WhatsApp taps"*, `page.tsx:171`); "Taps" is the shortened form a tab
  label needs, and the panel heading supplies the full phrase one click away.
- **Default = Enquiries.** `/office/enquiries` with no `?tab` opens the board, so the existing route
  keeps its existing behaviour; the tab is an addition, not a change to what the URL means.
- **The heading and count.** One `h1`, **"Enquiries"**, for both tabs — the same shape Settings uses
  (one `h1` "Settings", panels swapped beneath it, `settings-client.tsx:209`). The `h1` names the page;
  the tab row says which panel. **No count on the heading or the tab labels**: the count's single
  display is the shell notice, and a tab-side copy would be the first of the duplicate-count mistakes
  Ruling 6 exists to stop. (The **board's per-column counts** are a *different* figure — enquiries per
  state, `enquiries-client.tsx:168` — and are untouched.)
- **The explainer copy stays put.** The `sub2` line — *"The site only records that a WhatsApp tap
  happened, and on which car. You bring the names and numbers back here by importing the enquiry
  sheet."* (`enquiries-client.tsx:135-138`) — explains **how taps and enquiries relate**, which is true
  of *both* tabs. So it stays under the `h1`, **above** the tab row, where it orients the visitor to
  the whole page rather than to one panel.
- **Why the tab is a URL and not Settings' in-place buttons.** The shell notice and the dashboard
  panel link are **two entry points outside the page** that must land on the Taps panel. A client-only
  tab (the Settings pattern, `settings-client.tsx:217-238`, which banks on *"no new routes, the URL
  never changes"*) cannot be reached by a plain `<Link>` without hash-guessing on mount. And the tap
  list is **server data read per request** (`force-dynamic`, `enquiries/page.tsx:9`), so selecting the
  panel on the server keeps the notice's count and the list on one read and avoids a client flash.
  `?tab=taps` is the same page, not a new route — the owner's constraint holds.
- **The tab row's look must live in `enquiries.css`.** `globals.css`, which holds the only tab styles
  in the project (`.tabs`/`.tab`, `globals.css:399-428`), is **not loaded in the office area** (see
  correction 2). So the row is styled in `enquiries.css`, following the office's self-contained
  convention.
- **Rendered as links, not `role="tab"`.** Because the panel is chosen by the URL, the row is a
  `<nav aria-label="Enquiries sections">` of `<Link>`s with the selected one carrying `aria-current`
  and the `.on` look — navigation, which is what changing the panel by URL actually is. (Research note,
  verified: Carbon's shell-header guidance and the APA badge pattern only cover the badge; neither
  dictates tab semantics here.) If the owner would rather have the Settings-style in-place tabs, only
  the mechanism changes — the names, order, default and heading above do not.

---

## Ruling 6 — The dashboard panel's link and its header

**One line: the link reads **"All taps"** (it opens the Taps tab, so it must stop saying "All
enquiries"); and the panel's copy of the count (`.ph2t`) is **dropped** — the shell notice is the
count's one home.**

### Why

- **The link must name what it opens.** Today it is `<Link href="/office/enquiries">All enquiries</Link>`
  (`page.tsx:174`) — the wrong target *and* the wrong word. Retargeted to the taps tab, it must name
  taps. It reads **"All taps"**: the panel heading already says "Recent WhatsApp taps"
  (`page.tsx:171`), so inside the panel "taps" is unambiguous, and "All taps" matches the tab it
  opens. It keeps the app's plain link voice (the old label was "All enquiries").
- **Drop `.ph2t`.** The panel header draws a second copy of the count (`page.tsx:170-173`, styled
  `.ph2t` in `office.css:92`). Now that the notice lives in the shell and is visible on the dashboard
  in **both** homes (Ruling 2), a second copy duplicates one figure in two places and re-creates the
  count-vs-five-rows mismatch the withdrawn ruling flagged as Finding B. One figure, one home: the
  shell. Removing it also stops the count living in two components that can drift.
- **The panel keeps its job:** the heading, the 5 recent rows (`RECENT = 5`, `page.tsx`), its empty
  line (`page.tsx:177-180`), and the way onward ("All taps"). The mismatch is now honest — the heading
  says "Recent", and the link says where the rest are.

---

## Constraints

### Respected

| Ruling | Constraint | How |
|---|---|---|
| all | `dashboard/spec.md:42-47` — *"surfaced by a count badge and the recent-taps list — no separate alert, popup, or sound"* | Still a count badge; still the same list; the badge only moves and is restyled. Nothing is added: no toast, no sound, no modal, no red alert. |
| 2 | `dashboard/spec.md:46-47` — *"reflects it on refresh, with no additional alert raised"* | The count is still read server-side in the shell (`layout.tsx:24`); no timer, no client polling, no notification. |
| 3 | `dashboard/spec.md:43` — *"a count badge"* | The figure stays; a dot was rejected. |
| 5 | *"a tab inside the Enquiries page, not a new page"* (brief) | `?tab=taps` is the same route and the same page; no new route is added. |
| 5 | `enquiries/spec.md:18-23` — taps hold no PII; *"the dashboard tap list"* | The Taps tab shows the same PII-free rows (page, car, time). No tap data joins to an enquiry. |
| 5 | office's self-contained-CSS convention (`office.css:1-13`; `enquiries/page.tsx:1`) | The tab styles go in `enquiries.css`, since `globals.css` is not loaded here. |
| all | truth 8 — a count badge and a recent list, never a popup, alert or sound | Unchanged. |

### Pressure

- **The withdrawn ruling and `developer-workspace/notes/TASK-004-task19.md`** pin the old nav-row
  placement and the link `/office#recent-whatsapp-taps`. Both are dead. The Builder must not follow
  them.
- **`ux-plan.md` Q77** (*"A badge count on Enquiries in the sidebar"*) named the Enquiries **sidebar
  row**; the owner has since decided against the nav entirely. Q77's *placement* is superseded; what
  survives is that taps and enquiries are related enough to share a page — which is exactly Ruling 5's
  tab.
- **No spec change is needed for any of the six.** `dashboard/spec.md:42-47` pins neither the badge's
  colour nor its location beyond "a count badge … no popup, alert or sound", and Rulings 1-6 stay
  inside it.

---

## Open question for the owner (do not build around it)

**Does the notice mean "how many taps, ever" (today) or "how many since you last looked" (not
available)?**

A true unseen count needs a **seen-mark** — a stored "last read" updated **when the list is viewed**,
i.e. a write on read, plus a schema change. No GET may write in this codebase. This is an owner
amendment, not a quiet build. Ruled default: **the all-time total** (no amendment, honest if labelled
as a total — Rulings 3 and 4). One line from the owner decides the alternative.

*Second, smaller — my own:* the brief says the notice is *removed entirely at zero*; I have ruled that
literally (no glyph, no circle at zero). If the owner would rather the **glyph persist and only the
circle clear**, say so — it changes no other ruling, and it would remove the last layout question on
desktop for good.

---

## How this element is tagged (UI axes)

**Element — the tap notice** (`TapBadge` in the shell: `.sfoot` `.srow` on desktop, the topbar on
phone; a link to `/office/enquiries?tab=taps`)

- **Axis 1 · Behaviour: Server-fed.** The count is `SELECT count(*) FROM tap`, read with the page
  (`layout.tsx:24`; `lib/office.ts:472-473`). It does not self-time (no timer) and is not
  visitor-driven — clicking navigates but never changes the count. It is **not self-timed**: the
  owner's "removed at zero" and the spec's "no popup, alert or sound" both forbid a clock or an
  animation.
- **Axis 2 · Purpose: Informational + Navigational.** The count is informational (a tap arrived); the
  link that carries it is navigational (opens the taps tab). Named separately. It is **not**
  transactional — it commits nothing, and **not** input — it collects nothing.
- **Axis 3 · State**
  - **Idle** — count > 0: the glyph with the gold circle (`99+` cap) shown in the visible home.
  - **Empty** — count = 0: the notice is **absent** (owner's decision). Deliberate, not a gap; "none
    yet" is said in words on the dashboard panel (`page.tsx:177-180`) and in the Taps tab's own empty
    state.
  - **Loading** — arrives with the page; no independent spinner, no skeleton.
  - **Partial** — n/a: one figure, not fetched in pieces.
  - **Error / Offline** — **notice absent, shell alive** (Finding A below): a failed count fetch must
    never take the shell down.
  - **Hover / focus** (topbar) — the button behind may fill gold (`office.css:58`); the circle's
    `--dk` ring keeps it a circle through that state (Ruling 1).

**Element — the Enquiries tab row** (`/office/enquiries`)

- **Axis 1 · Behaviour: Visitor-driven** (a click navigates; the panel changes on navigation).
- **Axis 2 · Purpose: Navigational** (chooses which panel of the one page is shown).
- **Axis 3 · State** — **Idle**: one tab selected. **Empty**: the Taps tab with zero taps says so in
  words (mirroring `page.tsx:177-180`), and the Enquiries board already says "Nothing here right now"
  per empty column (`enquiries-client.tsx:207`). **Loading**: page-level; the route is `force-dynamic`
  and renders server-side, so no client spinner. **Error**: the page's existing error boundary
  (`app/office/error.tsx`). **Partial/Offline**: a failing store surfaces through that error boundary,
  never a half-drawn board.

**Group A (site speaks first):** the notice itself — it tells the office a tap arrived without being
asked (truth 8). Decided, not accidental. **Group B (site answers after an act):** the "All taps" link
and the Taps tab answer "where are the rest?"; the empty states answer "why is this blank?".

---

## Journey touch (UX)

The notice belongs to **Orient** — it tells the owner buyer interest arrived, and its link gives the
way to the list. Its job is to prevent **Ignored** (the product saying nothing when a tap lands) and
**Unsure** (a number that does not say what it counts) without causing **Overloaded** (a popup, alert
or sound — forbidden by the spec) or **Distrustful** (a badge that looks like "unread" but never
clears — Ruling 3). The Taps tab's **Confirm** is the list itself: the count and the rows come from one
read, so they cannot disagree. **Recover** here owes **retry, not undo** — looking commits nothing, so
a failed load is re-opened, never reversed. Cost test: a bare digit that must be hovered to decode, or
a red circle that reads as an error, spends the owner's attention and returns nothing — so the form is
redesigned, not explained. **Silence is a decision here:** the product **speaks first** on purpose
(truth 8).

**Not done, and not mine to do:** the journey pass condition requires the owner to check it with a
first-time visitor. That check is **outstanding**. Ask: *(1) Do you know what the circle counts without
being told? (2) Would a red one have meant "something is wrong" to you? (3) On a phone, do you find the
notice where you'd reach for it? (4) Does a number that never clears read as a count, or as something
you still have to deal with?*

---

## Findings for the Builder (flag, do not quietly build)

- **Finding A — the notice's fetch is on every office page's critical path.** The count is awaited
  unguarded in the shell (`layout.tsx:24`). If the store fails on the *notice's* fetch, the whole
  office shell can error, not just the notice. Its error/offline state must be **"notice absent, shell
  alive"** — the notice must never take the shell down.
- **Finding B — resolved by Ruling 6.** The count-vs-five-rows mismatch is now honest: the panel says
  "Recent" and links "All taps"; the full list is the Taps tab. It is no longer a "count says 248,
  list shows 5" contradiction.
- **Finding C (new) — the topbar gear is not an account icon.** Ruling 2 leans on SSW's header rule
  because Carbon's "account rightmost" rule has no anchor in this topbar. If an account/avatar icon is
  ever added to the topbar, revisit the notice's position: it should then move **left of** that icon.
- **Finding D (new) — `.ph2t` becomes dead CSS.** Dropping the panel's count (Ruling 6) leaves
  `office.css:92` `.ph2t` unused. Remove it with the markup, or note it.

---

## What the Builder changes (the only element affected)

- `components/office/TapBadge.tsx` — becomes the **glyph + gold circle** unit; the accessible name
  comes **off** the badge (no `role="img"`/`aria-label` here) and the glyph and circle become
  `aria-hidden="true"`; the `marginLeft:"auto"` (a nav-row artefact, `:26`) goes; keep the `99+` cap;
  keep removed-at-zero; circle = `var(--gold)` fill, `var(--gt)` numeral, 2px `var(--dk)` ring.
- `components/office/OfficeNav.tsx` — **delete** the labelled "WhatsApp taps" row (`:44-52`), the
  nav's `tapCount` prop, and the `TapBadge` import. The nav is back to destinations only.
- `app/office/(shell)/layout.tsx` — keep reading `getOfficeTapCount()`; stop passing it to
  `OfficeNav`; render the notice as a **link to `/office/enquiries?tab=taps`** in `.sfoot`'s `.srow`
  (last). The accessible name goes on the link.
- `components/office/OfficeTopbar.tsx` — accept `tapCount` and render the notice as the **rightmost**
  icon, a link to `/office/enquiries?tab=taps`, on **every** office route.
- `app/office/(shell)/page.tsx` — retarget the panel link to `/office/enquiries?tab=taps` and retitle
  it **"All taps"**; **remove** the `TapBadge`/`.ph2t` count from the panel header (and the import if
  it becomes unused).
- `app/office/(shell)/enquiries/page.tsx` + `enquiries-client.tsx` + `enquiries.css` — add the two-tab
  row ("Enquiries" | "Taps"), Enquiries default, driven by `searchParams.tab`; render the full tap
  list on the Taps panel (reuse the `.wt` row markup from the dashboard panel, `page.tsx:182-205`);
  keep the explainer under the `h1`; style the row in `enquiries.css` (globals is absent here).
- Keep **one figure**: the notice and the list both read `getOfficeTapCount()` / `getOfficeTaps()` over
  `tap` (`lib/office.ts:432-473`). Add no second source and no seen-mark.
