# 05 — Runtime observations (Phase 2)

**Written:** 2026-10-16, during **R2.1** of `../research-plan.md`.  
**Source:** Explore session `ses_eb7c65614ffeciA0MTyp3jePQ9` (read-only) with focus on event handlers (Escape, click-outside, focus).  
**Method:** M1 (persist), M3 (source observations; runtime beats source for interaction), M7 (cite file:line).  
**Next areas:** R2.2 focus, R2.3 feedback/undo timing, R2.4 store blip/offline, R2.5 failure wording, R2.6 per-width, R2.7 extremes.

This file is built area by area (one section per R2.*). This first section is **R2.1 — Dialogs and overlays**.

---

## R2.0 — The runtime is up: verified environment facts (2026-10-17)

**Why this section exists.** Phases R2.1–R2.2 were read from source. On 2026-10-17 the app was brought up and
observed live for the first time in this layer, so the observations below are **runtime**, not source (M3).

**What was started (owner authorised 2026-10-17):**
- Reference static site: `python3 -m http.server 3211 --bind 127.0.0.1 --directory /home/lordwhitefire/current-project/test-truespec-v2` → 200.
- Build: `npm run dev -- -p 3210` (Next.js 15.5.27, `.env.local` loaded) → 200.
- Automation Chrome: `/usr/bin/google-chrome --user-data-dir=$HOME/.config/google-chrome-automation --remote-debugging-port=9222 ...` (the documented launch, `plans/OFFICE-screens-plan.md:281`). Chrome 149.
- Standing smoke check `developer-workspace/scripts/task-004/_lib.mjs` **PASSED**: attached to `:9222`, UA has no `Headless`, **no Chrome launched (8 → 8)**.

**Runtime facts verified:**

| Fact | Evidence |
|---|---|
| The cold store shows the **store-waking** state on the office, verbatim: *"Just a moment / Setting things up — this can take a few seconds after a quiet spell."* | `/office` first hit, `document.body.innerText` (83 chars), url stayed `/office` |
| An office route with **no session** redirects to the door: `/office/inventory` → `/office/sign-in` (client-side; the navigation aborts, which is Clerk's redirect) | `framenavigated` trace + final url |
| The door's own words, verbatim: *"TRUESPEC OFFICE / The owner's side of the showroom. Nothing here is public. / Sign in to continue."* | `/office/sign-in` innerText |
| The door's **form is Clerk's** and mounts ~2 s after paint: *"Sign in to Truespec / Welcome back! Please sign in to continue"*, *"Continue with Google"*, Email address + Password + Continue, *"Secured by … Development mode"*. Console errors: **none**. | `probe-open-door.mjs` |
| The showroom header renders the **owner's real number**, `+2348146927170`, and every `wa.me` link uses it. **No invented number** anywhere in the text or links. | `/` innerText + all `wa.me` hrefs |

**FIX-001 confirmed latent, not live (runtime):** with the owner's number in the store, the fallback never shows —
`invented: false` across the header, the footer and the floating button. The defect is real in code but invisible in
this store, exactly as the owner said. The five places still need the fix; nothing here changes that.

**A mistake of mine, corrected at runtime (recorded, not smoothed over):** my first read of the door reported
`inputs: 0, buttons: [], clerk: false` and I took that to mean the sign-in form was absent. **Wrong.** Clerk's form
mounts ~2 s later; the same page then reads `inputs: 2`, 59 Clerk nodes, and a working form. The lesson is the
method's own: a runtime read must wait for the thing being looked for, or it reports a false absence.

**Office access:** the door needs a **human sign-in** (the owner's). The session lives as a browser cookie in the
automation profile, which is why the standing procedure uses an attach-only browser rather than a server-side fetch.

---

## R2.1 Dialogs and overlays

### Office modals (delete/discard/detail)

#### Inventory delete — `app/office/(shell)/inventory/inventory-client.tsx`
- **Open**: `openDelete(c)` (171-173) called from table row Delete (336-345) and card Delete (410-418); controlled by `del` state (110).
- **Escape**: window keydown listener (128-134): `if (e.key === "Escape") setDel(null)`.
- **Click-outside**: overlay `.ovl#ovl` checks `if (e.target === e.currentTarget) setDel(null)` (432-435).
- **Modal**: `.mdl` with `role="dialog"`, `aria-modal="true"`, `aria-labelledby="dlt"` (436-452).
- **Buttons**: "Keep it" closes (444); "Delete" calls `confirmDelete()` (447-449) which sets `del(null)` and optimistically removes row + calls server action (190-208).
- **Focus**: no explicit `focus()` calls in the read code (aria attributes only).
- **Page scroll behind**: not shown controlled (no `body.style.overflow` toggled).

#### Car form delete — `app/office/(shell)/car/car-client.tsx`
- **Open/close**: controlled by `delOpen` state (1166-1201).
- **Escape**: **not present** — no window keydown Escape handler for `delOpen`.
- **Click-outside**: overlay `#ovlD` checks `e.target === e.currentTarget` → `setDelOpen(false)` (1170-1173).
- **Modal**: `.mdl` with `role="dialog"`, `aria-modal="true"` (1174).
- **Buttons**: "Keep it" closes (1181-1187); "Delete" closes and shows toast "Car deleted (demo)." (1191-1199) — this is the **stub** noted earlier (`car-client.tsx:1216-1221` shows toast + hidden `#tundo` unhandled).
- **Focus**: none explicit visible.
- **Page scroll behind**: not shown.

#### Drafts discard — `app/office/(shell)/drafts/drafts-client.tsx`
- **Open**: "Delete" button sets `delOpen(true)` (389-397); state `delOpen` (141).
- **Escape**: **not present** — no keydown Escape listener shown.
- **Click-outside**: **not present** — overlay `.ovl` has `role="dialog"`, `aria-modal="true"`, `aria-label="Delete this draft?"` (407) but no onClick to close on backdrop.
- **Close controls**: × button calls `setDelOpen(false)` (409-411); "Keep it" calls `setDelOpen(false)` (423-426); confirm "Delete draft" calls `remove()` (419) which closes on success (180).
- **Focus**: none explicit visible.
- **Page scroll behind**: not shown.

#### Enquiries detail — `app/office/(shell)/enquiries/enquiries-client.tsx`
- **Open**: `openDetail(e.id)` sets `overlay === "detail"` (168-172); controlled by `overlay` state.
- **Visibility**: `.ovl#ovlD` hidden when `overlay !== "detail"` (214).
- **Escape**: **not present** — no keydown Escape handler shown.
- **Click-outside**: **not present** — no backdrop click handler on overlay.
- **Close**: × button with `data-close` calls `setOverlay(null)` (221-227).
- **Focus**: none explicit visible.
- **Page scroll behind**: not shown.

### Showroom lightboxes/overlays

#### Car detail lightbox — `components/site/CarBehaviors.tsx`
- **Open**: `openLb()` adds `.open` to `#lb`, sets `document.body.style.overflow = "hidden"` (214-219); triggered by clicking `#gal` (224).
- **Close**: `closeLb()` removes `.open`, restores `overflow` (220-223).
- **Escape**: window keydown listener (228-234): when `#lb` has `.open`, Escape calls `closeLb()`, Arrow keys step gallery.
- **Click-outside**: `#lb` click handler checks `e.target.id === "lb"` → `closeLb()` (225-228).
- **Focus**: no explicit `focus()` call shown into lightbox; relies on button elements in DOM.
- **Scroll lock**: yes, sets/restores `body.style.overflow`.

#### Home/ask modal — `components/site/HomeBehaviors.tsx`
- **Open**: `openModal(title, body)` sets `#ovl.hidden = false`, calls `lock(true)` (adds `.lock` to body), **focuses close button `#mx`** (61-71, 71: `document.getElementById("mx")?.focus()`).
- **Close**: `closeModal()` sets `hidden=true`, `lock(false)` (73-76).
- **Escape**: document keydown listener (216-218): `if (e.key === "Escape" && ovl && !ovl.hidden) closeModal()`.
- **Click-outside**: `#ovl` click checks target id === "ovl" → `closeModal()` (213-216).
- **Focus**: **explicit focus to close button on open**.
- **Scroll lock**: yes via `.lock` class (71, 75).

### Office nav/menu (Q-001 context — from source)
- **Bottom nav "More"** goes to `/office/settings` (`OfficeBottomNav.tsx:14`), not a menu — confirmed destination is Settings (no dropdown).
- **Topbar Search** is a dead button with `aria-label="Search (UI placeholder)"` and no handler (`OfficeTopbar.tsx:29-31`) — already ruled for removal.

### R2.1 findings (what this shows)

**Dismissal consistency:**
- Inventory delete and both showroom overlays (car lightbox, home modal) support **Escape and click-outside** and have close controls.
- Car form delete supports **click-outside** but **no Escape** handler visible.
- Drafts discard and enquiries detail support **neither Escape nor click-outside** (only explicit close buttons/×).

**Focus management:**
- Only `HomeBehaviors.tsx` explicitly moves focus into the overlay (focuses `#mx` on open). Others have no visible focus calls — focus may remain on the element that triggered the modal.

**Scroll lock:**
- Showroom lightbox and home modal lock background scroll (`body.style.overflow = "hidden"` or `.lock`). Office modals do **not** toggle scroll lock in the read code.

**Labels/roles:**
- Most modals use `role="dialog"`, `aria-modal="true"`; enquiries/detail uses `aria-modal="true"` on `.ovl`. Home modal focuses close button but role/aria not shown in the quoted snippet.

These are source-level observations (M3). Runtime validation (actual tab order, focus trap) belongs to R2.2/R2.6; the code shows clear gaps: drafts discard lacks Escape and backdrop click; office modals lack scroll lock/focus management. This directly feeds the "dialogs/overlays" gap (G1) and Designer brief (Phase 3).

**⚠️ CORRECTION (2026-10-16, from R2.2's deeper read — recorded, not smoothed over).** The first pass above under-read two files, because it was scoped to a line range. The deeper read (R2.2) found:
- **Car form delete modal DOES have an Escape handler** — `car-client.tsx:312-320`, a persistent `window` keydown listener setting `setDelOpen(false)`. My R2.1 note "no Escape handler for `delOpen`" was **wrong**.
- **Enquiries detail modal DOES have an Escape handler** — `enquiries-client.tsx:86-93`, persistent `window` keydown listener setting `setOverlay(null)`. My R2.1 note "no Escape" was **wrong**.
- **Drafts discard modal genuinely has NO Escape handler and NO backdrop click** — re-checked, grep for `Escape|keydown|onKeyDown` in `drafts-client.tsx` → no match. This one stands.
- **Inventory, car and enquiries Escape handlers are always mounted**, not conditional on the modal being open (each is a `useEffect` with `[]` deps and a bare `setState(null)`) — so pressing Escape anywhere on those screens silently clears modal state. Harmless today, but it means Escape is a global clear, not a dialog-scoped one.

**Lesson for the method:** a line-range-scoped read can produce a false negative (M7's "cite, don't trust" cuts both ways). Claims about absence must be grep-backed, not inferred from a range.

---

## R2.2 Focus

**Source:** Explore session `ses_eb6e4da83ffeROueadCne3oLeI` (read-only), 2026-10-16. All claims grep-backed.

### The complete inventory of focus movement in the app

There are **three** `focus()` calls in app code, **one** `autoFocus`, and **four** `tabIndex` uses — that is the whole of the app's focus management:

| What | Where | What it does |
|---|---|---|
| `focus()` #1 | `components/site/HomeBehaviors.tsx:71` | On modal open, focuses close button `#mx` |
| `focus()` #2 | `components/site/CarBehaviors.tsx:121` | On modal open, focuses close button `#mx` |
| `focus()` #3 | `app/office/(shell)/settings/settings-client.tsx:96` | Tab roving focus (arrow keys move between tabs) |
| `autoFocus` | `app/office/(shell)/settings/registry-editor.tsx:254` | Focuses a newly added registry row's name input (`autoFocus={justAdded && row.id === lastEditable}`) |
| `tabIndex={0}` | `app/(site)/car/[ref]/page.tsx:164` | Gallery container `#gal` is keyboard-reachable |
| `tabIndex={0}` | `app/office/(shell)/enquiries/enquiries-client.tsx:165` | Enquiry card as `role="button"`, Enter opens detail |
| `tabIndex={0}` | `app/office/(shell)/settings/registry-editor.tsx:225` | Drag handle `.edgrip` as `role="button"`, ArrowUp/Down reorders |
| `tabIndex` roving | `app/office/(shell)/settings/settings-client.tsx:226` | Only the active tab is tabbable (`tab === t.k ? 0 : -1`) |

**Zero** occurrences anywhere of: focus trap, return-focus-on-close, `aria-activedescendant`, `previouslyFocused`/`lastFocused`/`returnFocus`/`restoreFocus`/`focusin`/`focusout` logic.

### Dialogs and overlays — focus behaviour

| Overlay | Focus on open | Tab trapped? | Focus restored on close? | Body scroll locked? |
|---|---|---|---|---|
| Office inventory delete (`inventory-client.tsx`) | **No** — stays on the row's Delete button | **No** | **No** | **No** |
| Office car form delete (`car-client.tsx:1166-1201`) | **No** | **No** | **No** | **No** |
| Office drafts discard (`drafts-client.tsx:406-429`) | **No** | **No** | **No** | **No** |
| Office enquiries detail (`enquiries-client.tsx:214-356`) | **No** | **No** | **No** | **No** |
| Site home/ask modal (`HomeBehaviors.tsx`) | **Yes** — `#mx` (line 71) | **No** | **No** (closeModal only hides + unlocks, lines 73-76) | **Yes** — `body.lock` (lines 60/70/75) |
| Site car modal (`CarBehaviors.tsx:110-127`) | **Yes** — `#mx` (line 121) | **No** | **No** | **Yes** — `body.lock` (lines 120/126) |
| Site car lightbox (`CarBehaviors.tsx:214-223`) | **No** — only toggles class + inline overflow | **No** | **No** | **Yes** — inline `document.body.style.overflow` (218/222) |

**The sharpest consequence — the office delete flow loses focus entirely.** `confirmDelete()` (`inventory-client.tsx:193-208`) removes the row optimistically; the Delete button that had focus is removed from the DOM; no focus is placed anywhere. Focus falls to `<body>`. A keyboard user is returned to the top of the document without warning. The same shape applies to the drafts and enquiry actions that remove or replace the element that was clicked.

**Modal opening keeps focus outside the modal.** In every office modal, focus stays on the trigger button *behind* the overlay. Since the overlay is at the end of the DOM (`inventory-client.tsx:424-468`), a keyboard user tabs through the entire page behind the modal before reaching the modal's own buttons. `aria-modal="true"` tells assistive tech the rest is inert, but the DOM does not enforce it — and there is no `tabIndex={-1}` on any dialog, so nothing inside is focusable-on-open.

**Escape is global, not dialog-scoped** — see the correction above: inventory (`:128-134`), car (`:312-320`) and enquiries (`:86-93`) all mount an unconditional `window` keydown listener for the lifetime of the screen.

### Forms — where focus lands on failure

| Form | Client validation failure | Server error rendered | Focus moved? |
|---|---|---|---|
| Office car form (`car-client.tsx`) | `if (hasFieldErrors) return;` (line 371) — early return, no focus | Field-level `role="alert"` + `aria-invalid` (234-242); form-level `role="alert"` "Could not save." (1042-1061) | **No** — focus stays on the Save button |
| Office settings (`settings-client.tsx`) | `if (!waOk) return;` (line 142) etc. | `setWaErr(...)` + `showToast(...)` (147-149); error paragraph has no `role` | **No** |
| Office drafts (`drafts-client.tsx`) | `setError(...)` | Inline `role="alert"` (378-382) | **No** |
| Office inventory delete/undo | — | Toast (197-200) | **No** — and focus is lost when the row is removed |

**The pattern:** every form *announces* its errors correctly (`role="alert"`, `aria-invalid`) but never *moves the person to them*. A screen-reader user hears the alert; a sighted keyboard user sees nothing change and does not know which field is wrong. On the car form — the biggest form in the app, with inline errors at lines 239, 570, 596, 674, 866, 905, 920, 966 — a failed save leaves the cursor sitting on Save with an error somewhere above the fold.

### Navigation and shell

- `OfficeNav.tsx:26-37`, `OfficeTopbar.tsx:29-45`, `OfficeBottomNav.tsx:20-31` — plain `Link`s and `button`s. No `tabIndex`, no roving focus, no keydown logic. Focus visibility comes from one global rule: `:focus-visible{outline:2px solid var(--gold);outline-offset:3px}` (`office.css:29`).
- `app/office/(shell)/layout.tsx` does **not** render `FocusRefresh` — it renders only `OfficeNav`, `OfficeBottomNav`, `OfficeTopbar`, `TapNotice`, `ThemeToggle` (lines 1-5).
- **`FocusRefresh` is mounted on the dashboard only** (`app/office/(shell)/page.tsx:8,36`). It refreshes data (`router.refresh()`) on tab/window focus with a cooldown (`FocusRefresh.tsx:26-39`); it does **not** move focus. So SD1 ("the dashboard SHALL refresh on window/tab focus") is met on the dashboard — but no other office screen refreshes this way, which is a **per-surface question for R2.4/R2.6** (is staleness elsewhere a failure or a non-issue?).
- No code anywhere in app code moves focus to the top of the page (no app-side `scrollTo(0`).

### What R2.2 feeds

- **G1 (focus handling — named for this layer)** now has its evidence: the app has essentially **no focus management** beyond three calls. This is not a polish item; for keyboard users it is a functional gap.
- The **Designer brief** (Phase 3) must decide: focus-on-open and focus-return for the four office modals; a focus destination after a row/list action that removes the clicked element (inventory delete, drafts, enquiries); where focus goes on a failed save in the car form; whether Escape should be dialog-scoped rather than screen-scoped; and whether the site's `#mx`-on-open pattern becomes the house rule.
- **Checkable later (R2.6 / testing):** tab order reachability for the enquiries board cards and the registry editor's drag handles (both are `role="button"` + `tabIndex=0` — reachable, but the reorder affordance is arrow-key-only and needs verifying at runtime).

---

## R2.3 Feedback, confirmation, and undo timing

**Observed:** 2026-10-17, runtime, office signed in as the owner, 1440×900, attach-only CDP `:9222`.
**Probes:** `runtime/probe-r23-read.mjs` (surfaces, dialogs, toast place, empty state) · `runtime/probe-r23-dialogs.mjs` (car form, drafts, enquiries dialogs).
**Writes: none.** Every dialog was opened and closed with *Keep it*, Escape, click-outside or ✕. One exception, safe by
source: the **car form's Delete button is a no-op** (`car-client.tsx:1192-1195` — it only shows a toast), so clicking it
stored nothing; the observation that follows is of a lie, not of a write.

### 1. Every destructive action, and whether it asks first

| Action | Asks first? | Words (verbatim, as read on screen) | Confirm button | Ways out |
|---|---|---|---|---|
| Office inventory → delete a car | **Yes** | *"Delete this car?"* (rendered `DELETE THIS CAR?` — CSS uppercases it)<br>*"“Toyota Camry XSE V6 2021” (TS-1001) will be removed. You can undo for a few seconds."* | **"Keep it"** first, then **"Delete"** | Escape ✓ · click-outside ✓ · Keep it ✓ |
| Car edit form → delete | **Yes** | *"Delete this car?"* (rendered upper)<br>*"You can undo for a few seconds after. Deleting removes it from the showroom and the office lists."* | **"Keep it"** first, then **"Delete"** | Escape ✓ · click-outside ✓ · Keep it ✓ |
| Drafts → delete a draft | **Yes** | *"Delete this draft?"* (rendered upper)<br>*"It was read from the uploaded file and has not become a record. Deleting it creates nothing and spends no code; the file it came from is left where the owner's own cleanup finds it."* | **"Delete draft"** first, then **"Keep it"** | ✕ only — **Escape does NOT close it; click-outside does NOT close it** |
| Tombstone panel → "Remove for good" | Asks in place (button pair swaps to *"Keep it" · "Remove for good"*) | *"Deleted cars. Nothing removes them on its own — you remove one for good whenever you choose."* | "Remove for good" | Keep it (panel is **empty** today — not observed live) |
| Enquiries → open a card | Not destructive (opens detail) | — | — | Escape ✓ |

**Three inconsistencies, all seen, none inferred:** who is asked *first* as the safe choice flips surface to surface
(inventory and car form put "Keep it" first; **drafts puts "Delete draft" first**); the **ways out differ** (drafts
traps the person unless they find ✕ or "Keep it"); and the same idea is named three ways — *"Delete"*, *"Delete
draft"*, *"Remove for good"*.

### 2. The biggest feedback lie in this layer — verified live

The car edit form's delete dialog **promises** *"You can undo for a few seconds after. Deleting removes it from the
showroom and the office lists."* Clicking **Delete** then:

- shows the toast **"Car deleted (demo)."**;
- leaves the **Undo button hidden** (`#tundo` exists but is hard-wired `hidden` with no handler);
- **does not navigate, does not remove anything** — the page is still `EDIT CAR` and the car is still loaded.

So the app tells the person the car is gone **and it is not gone**. The word "(demo)" is the only trace, and to the
person reading it, it explains nothing. The office **inventory's** delete, with the *same dialog heading*, does write
for real — so identical words mean opposite things on two screens.

### 3. Focus when a dialog opens (confirms R2.2 at runtime)

- **Every dialog opens with focus left on the trigger behind it** — inventory, car form, drafts (all `BUTTON#…`),
  and the enquiries card (`ARTICLE`). Nothing moves into the dialog.
- **Tab from an open dialog walks the page behind it.** From the inventory delete dialog, eight Tabs landed on the
  Edit/Delete controls of the *next* rows (Lexus, BMW, Honda, RAV4…). A keyboard user cannot reach "Keep it" or
  "Delete" by Tab; they tab through the hidden page. **No dialog traps focus.**
- **Closing:** Escape returns focus to the trigger (inventory ✓, enquiries ✓ card). Closing with click-outside or
  "Keep it" drops focus to `<body>`.
- **The car form's dialog has no accessible name** — `role="dialog" aria-modal="true"` with **no `aria-labelledby`**
  (inventory's has `aria-labelledby="dlt"`; drafts' has `aria-label`). A screen reader announces a dialog and nothing
  about it.

### 4. The toast — where the words appear

Office inventory's toast, measured at rest: `position: fixed`, `bottom: 24px`, horizontally centred, hidden below the
fold by a transform, `z-index: 70`; `role="status"` normally, `role="alert"` on an error; the Undo button lives
**inside** it and is hidden until a delete succeeds. So feedback appears **bottom-centre**, not top-right, and the undo
offer appears *in the same place as the confirmation*.

### 5. Empty state (read-only, office inventory search)

*"No cars match. Clear the search or pick another state."* with a **"Clear filters"** button.

### 6. The undo window, measured (authorised write, 2026-10-17)

**Consent:** the owner chose *"delete + undo one demo car"* (2026-10-17). Two passes. Targets: the fixture car
(delete control read *"…Fixture STD"*, row `TS-1036`) and then the flagship `TS-1001`. **Both were restored**, and the
store was verified by a **full reload — 25 rows before and after** (a server read, so the optimistic UI could not have
fooled it). Cost: one activity-log *deleted / restored* pair per pass; nothing else changed.

**Method:** office inventory at 1440×900; the confirm and undo clicks stamped **inside the page** (`performance.now()`);
toast / Undo button / row / modal state sampled every 20 ms; outcome verified by reload.
Probes: `runtime/probe-r23-undo-timing.mjs`, `runtime/probe-r23-undo-timing2.mjs`.

**The timeline (the pinned pass, ms from the recorder start):**

| moment | at | delta |
|---|---|---|
| delete dialog opens | 863 | — |
| **"Delete" clicked** | **1292** | — |
| the row leaves the list | 1507 | **215 ms after the click** |
| the confirmation **and the UNDO button** appear | 2519 | **1227 ms after the click** |
| **"Undo" clicked** | 5568 | 4276 ms after the click |
| *"…restored."* appears and Undo disappears | 5769 | **201 ms after the Undo click** |

**What the person actually gets:**

1. **Confirm → the row vanishes at once (~0.2 s).** It is optimistic: it goes before the server has agreed.
2. **Then about a second of silence.** At ~1.2 s the words and the undo offer arrive *together*. The first (unpinned)
   pass measured ~2.3 s, so the honest reading is **one to two seconds** — it varies with the store, it is not fixed.
3. **Verbatim:** *"Toyota Camry XSE V6 2021 deleted."* with an **UNDO** button beside it, bottom-centre. (Sentence
   shape worth noting: `{name} {year} deleted.` — the year rides along, so it reads "…V6 **2021** deleted.")
4. **The window was still open at ~4.3 s** — the Undo button was live and it worked. Source sets the offer at
   **8000 ms** (`inventory-client.tsx:206`). **The end of the window was NOT observed**: letting it lapse would tombstone
   a real car, which this layer's discipline forbids. So *"how long it waits"* answers as **8 s by source, verified
   still open at 4.3 s live**.
5. **Undo → the row returns in ~0.2 s** and the words become *"…restored."*; the Undo button disappears at that instant.

**"Whether that window is visible to the person" — the button is, the deadline is not.** There is no countdown, no
progress, no wording saying how long is left. A person who looks away for ten seconds has no way to know whether they
are still in time. The *offer* is legible; the *limit* is invisible.

**And the telling arrives out of order:** the car leaves the list first and the words come after, so the person reads
*"deleted"* at the moment it is *confirmed* — having already watched it vanish a second earlier. Sentence and
disappearance do not line up.

### 7. What the person is told after the other writes (source-quoted — not driven; each is a write)

| Write | What it says |
|---|---|
| Car form — save | *"Saved **{ref}**. The showroom updates immediately."* |
| Car form — choose Sold | *"Sold chosen — enter the sale price and the date, then save."* |
| Car form — reverse a sale | *"The sale will be reversed — save to apply."* |
| Drafts — save (mint / promote) | *"Saved the {car\|enquiry}. It is a record now, and the showroom updates immediately."* |
| Enquiries — move a state | *"Gave {name} the state {label}. The cars are untouched."* |
| Settings — WhatsApp number | *"WhatsApp number saved. Every chat button on the site now uses it."* |
| Settings — tagline | *"Tagline saved. The home page updates immediately."* |
| Settings — default | *"Default saved. Full tank is pre-filled on every new car."* |
| Tombstone — remove for good | *"{name} was removed for good, with its images."* / *"{name} was removed. {n} of its images could not be cleared, and the daily job will clear it."* |
| Failures (a repeated shape) | *"That car could not be deleted."* · *"…could not be restored."* · *"…could not be removed."* · *"That {one} could not be saved."* · *"The store could not be reached — try that again"* · *"The store refused that change"* · or the server's own `result.error` |

**Good, and worth keeping:** the successes say what changed **and what it means** — *"The showroom updates
immediately"*, *"The cars are untouched"*, *"no TS-#### is spent on an enquiry"*. The person is told the consequence,
not just the verb.

**"Whether a save that did nothing says so" — it does not.** No message anywhere in the office says *nothing changed*;
every save answers *"Saved …"*. A save with no edits still gets *"Saved"* — truthful that the store was written, silent
about whether anything actually changed. (The two genuinely-empty cases the plan asks about are the **(demo)** delete —
§2 above, a claimed deletion that never happens — and the settings label *"Unsaved change"*
(`settings-client.tsx:320,383,434`), which is a status label, not a confirmation.)

### 8. Two more things seen while verifying (2026-10-17)

**Verification confirmed the cost, exactly as predicted.** The activity log's newest entries are the four traces of the
two passes: *"Deleted a car TS-1036"* / *"Restored a car TS-1036"* (09:29) and *"Deleted a car TS-1001"* /
*"Restored a car TS-1001"* (09:30). The fleet itself reads **25 cars — 24 in stock, 1 sold**, with **nothing under
"Waiting to be cleared"**: the store is exactly as it was.

**(a) A restore is tagged "DELETED".** Each activity entry carries a type chip; the restore entries read
**"Restored a car TS-1001 · DELETED"**. So a person scanning the log cannot tell a restore from a delete by the tag —
the one word that distinguishes them is wrong. (Both the delete and the restore are counted under the log's
**"Deleted 12"** facet for the same reason.) This is a small, concrete wording defect for the dev's task; it belongs to
the activity surface, and it is in this layer's reach because it is *feedback wording*.

**(b) The demo store is not clean — it carries the builder's fixtures.** The inventory contains at least one car named
*"TS-FIX-1792145797830-2 Fixture STD"* (ref `TS-1036`), and the activity log records *"Added a car TS-1036"* on
16 Oct 10:18 — a timestamp inside TASK-004's build. **Named here as an observation, not a conclusion**: it is not this
layer's work to remove it, and I did not touch it (it happens to be the car my first timing pass deleted and restored).
But the owner should know the demo fleet is not purely demo data, and anything that reads the fleet as if it were
(screenshots, a demo, a report) will show it.

### Still owed for R2.3

- **The window's end** (window lapses → the car appears under *"Waiting to be cleared"* → what "Remove for good" then
  says). Deliberately not observed: it would tombstone a real car. Source covers the wording; the runtime sight is open.
- The **runtime** sight of the writes in §7 — their words are quoted from source; driving them means more writes.

---

## R2.4 The store blip and the offline path

**Observed:** 2026-10-17, runtime, office signed in, 1440×900. **Every failure was produced inside the browser tab**
(request interception / offline emulation). **Nothing was restarted and nothing was written** — where a write was
needed (§F) the request was answered locally with 500 so the server never received it, and the store was then verified
untouched by reload (**25 rows before and after**).
**Probes:** `runtime/probe-r24-blip.mjs`, `probe-r24-verify.mjs`, `probe-r24-photo-order.mjs`, `probe-r24-recover.mjs`.

### 1. The cold store — already seen live (R2.0)

*"Just a moment / Setting things up — this can take a few seconds after a quiet spell."* Seen on the first hit to a
cold `/office`. **That state works, and its words are good.** But see §2 for where it does *not* reach.

### 2. A slow store on a soft navigation — **the app says nothing at all**

Holding the page's data request (the RSC fetch) for 6 s and clicking *Inventory*:

- the URL did not change, the heading stayed **DASHBOARD**, `loadingEl: false`, for the **whole hold**;
- the page finally changed at **~8.4 s** (6 s injected + dev-mode compile).

So: **the person clicks and the screen does nothing for seconds.** No spinner, no progress, no wait state, no sign the
click registered. **The wait state covers a full page load, not a client-side navigation** — `loading.tsx` is a
server-render fallback, so it never appears here. This is the most common "slow store" a person will meet, and it is
the one case with no feedback.

### 3. A dropped store on a soft navigation — Next recovers silently

With the data request aborted, the console logged *"Failed to fetch RSC payload … Falling back to browser
navigation."* and **the page loaded normally anyway** (the server was reachable for the follow-up document request).
The person sees a delay and then the page; **no error state, no "Try again"**. Honest reading: *a dropped soft
navigation is not what produces the retryable state.*

### 4. Offline — there is no offline path

With the browser put offline and a link clicked, the person is thrown **out of the app entirely**, onto **Chrome's own
error page**: *"ERR_INTERNET_DISCONNECTED"*, with Chrome's advice (*"Checking the network cables, modem, and router /
Reconnecting to Wi-Fi"*). The office shell is gone; there is no in-app message and no way back except the browser.
The app has **no offline state at all**.

### 5. A failed **write** shows the **load** error — the wrong story, and it wipes the page

A delete whose request fails (answered 500 locally; **the server never received it**) produced:

> **We couldn't load this**
> We tried a few times but the server didn't answer. Nothing was lost — please try again.
> **[ Try again ]**

Four things are wrong with that, and all four were measured:

1. **The message is about a *load*; what failed was a *save*.** The person is told the page could not be read, when
   what actually happened is that their delete did not go through. They cannot tell whether the car was deleted.
2. **The message the code has for this exact case never appears.** `inventory-client.tsx:199` has
   *"That car could not be deleted."* — but a *thrown* action never reaches the `res.ok === false` branch, so the error
   boundary catches it instead and that sentence is dead code on this path.
3. **The whole office shell is replaced** (`navVisible: false`). The person loses their navigation because their
   delete failed. This is the concrete cost of the missing route-level boundaries — there is nothing closer than the
   office segment to catch it.
4. **"Nothing was lost" is a claim the app did not check.** Here it happened to be true (verified: fleet 25 rows, the
   car still present) — but the app asserts it without knowing what was sent.

**The one action works:** with the store back, clicking **"Try again"** restored the page — heading `INVENTORY`, nav
returned, **25 rows, fleet intact**.

### 6. Photos when the asset will not load — truth 7 is only half met

Both cases tested on the showroom home page, with every image request failed **in the tab**:

| when the photo fails | what the person sees |
|---|---|
| **after** the page has hydrated (the photos were showing, then the store went away) | **placeholder on every photo (20/20)**, alt preserved (*"2021 Toyota Camry XSE V6"*), the drawn SVG renders. **Works.** |
| **while the page is loading** (the photo is already missing/unreachable as the visitor arrives) | **the placeholder never appears** — 13 error events fired, **0 swaps**; every card shows the **browser's broken-image icon**. |

**The cause is the order of two events:** the image's `error` fires *before* React hydrates and attaches `onError`, and
React never replays it — so `failed` stays `false` and the placeholder is never shown.

**Why this matters more than it looks:** truth 7 names exactly this case — *"when an asset is missing or the asset
store is briefly unreachable, the page renders the placeholder rather than breaking."* The half that works is the rare
half (a photo that breaks while the visitor is already looking); **the half that fails is the everyday one** (a car
whose photo is missing when someone opens the page — the visitor's first impression is a row of broken icons, the
thing the `Photo` component's own comment says it exists to prevent).

### What R2.4 feeds

- **G-level finding for the task:** a soft navigation has **no wait feedback at all** (§2), and a failed **write**
  reports itself as a failed **load** and wipes the page (§5) — two distinct, user-visible failures of the same
  "what is the person told" family as R2.3's delete lie.
- **The retryable state's words need a decision:** *"We tried a few times but the server didn't answer. Nothing was
  lost — please try again."* is right for a read that failed and **wrong for a write that failed** (it neither names
  the action nor says what happened to it). The Designer brief (Phase 3) should rule on whether a failed write gets
  its own state and words — and whether *"Nothing was lost"* may be claimed without checking.
- **Route-level boundaries (the "503 paths" debt) now has a live consequence:** with no closer boundary, a failed
  write replaces the **entire office** rather than the one region.
- **`Photo` needs a fix worth naming to the dev:** the placeholder must also cover a photo that was *already* broken
  when the page arrives (the error can be missed before hydration). This is a truth-7 gap, not a polish item.

---

## R2.5 Failure wording

*Gathered 2026-10-17. Mostly **source** — every message is quoted with its `file:line` — plus **read-only runtime** for
the not-found family (plain GETs; nothing written). **The "no number saved" renderings are source-level only:** making
them visible live would mean clearing the owner's saved WhatsApp number, which is a write to the owner's settings — not
done. Every string below is quoted from the code, never paraphrased.*

### 1. The not-found family, driven live (read-only, 2026-10-17)

Four URLs were opened in the attached browser. Nothing was written.

| the person asks for | HTTP | what they get |
|---|---|---|
| **a car that does not exist** — `/car/TS-9999` | **200** | *"We could not find that car"* — the car page's **own** view, keeping the showroom chrome (crumbs, related cars, WhatsApp layers). Its links use the **real** number. |
| **a malformed reference** — `/car/not-a-ref` | **200** | the same view, the same words |
| **a route that does not exist** — `/no-such-page` | 404 | the **root `not-found`**: *"We couldn't find that page"*, **no site header, no footer, no nav** — a bare card with *"Browse the inventory"* and *"Message Umar"* |
| **an office route that does not exist** — `/office/no-such-page` | 404 | **the showroom's 404, unchanged** — *"We couldn't find that page"*, *"Browse the inventory"*, and the **invented** WhatsApp number. **No office 404 exists.** |

Four things fall out of that table:

1. **A missing car answers HTTP 200.** The car page does not call `notFound()`; it renders its own view (`app/(site)/car/[ref]/page.tsx:85`, `:595-627`) and always answers **200**. So a dead car link looks *healthy* — to a search engine, to a link checker, to any monitoring — and the person is shown a "not found" page *served as a success*.
2. **A mistyped office URL falls out into the public showroom.** There is no office not-found, so `/office/…` that matches nothing lands on the shop front's 404 — with the **invented** number and **no way back to the office**.
3. **The two 404s lose the whole shell.** The root 404 renders *outside* the `(site)` layout (it imports the CSS itself), so there is no header, no ticker, no footer — one card and two buttons. The missing-car view, by contrast, keeps the chrome. Two different ideas of "not found" in one showroom.
4. **The same event gets two sets of words** — *"We couldn't find that page"* (the 404s) vs *"We could not find that car"* (the car view) — including the contraction style (**couldn't** / **could not**).

The missing-car view's own words (`app/(site)/car/[ref]/page.tsx:608-619`): *"We could not find that car"* / *"That car may have sold, or the link is old. Tell me what you were after and I'll find one like it — or browse what's on the lot now."* / **Message Umar** · **See all cars**.

The two 404s' words (`app/not-found.tsx`, `app/(site)/not-found/page.tsx:11-33`): *"We couldn't find that page"* / *"The link may be old, or the address mistyped. The showroom is still open — every car, one doorstep price, delivered anywhere in Nigeria."* / **Browse the inventory** · **Message Umar** / *"Or head back to the home page."*

### 2. FIX-001 — the five places (three files), and the mechanism

The defect (registry **FIX-001**): the app **invents** a WhatsApp number. The owner's ruling stands — when no number is
saved there is to be **nothing at all**: no header block, and a privacy notice that names no number ("our WhatsApp").

| # | place | what it renders when no number is saved | what must replace it |
|---|---|---|---|
| 1 | `app/(site)/layout.tsx:88` | `<b>{num || "+234 800 000 0000"}</b>` — the header **prints an invented number as fact** | the whole WhatsApp block goes away |
| 2 | `app/not-found.tsx:75` | hardcoded `href="https://wa.me/2348000000000?text=…"` — *"Message Umar"* **opens a chat with nobody** | no WhatsApp button when there is no number |
| 3 | `app/(site)/not-found/page.tsx:25` | the same hardcoded link, *"Message Umar"* | the same |
| 4 | `app/(site)/privacy/page.tsx:88` | the notice **states a false number**: *"Enquiries go to WhatsApp directly (**+234 800 000 0000**)"* | the notice names **no number**; it says *"our WhatsApp"* |
| 5 | `app/(site)/privacy/page.tsx:118` | *"message us on [WhatsApp]"* → hardcoded `wa.me/2348000000000` | the link names no invented number |

**The mechanism that ties them together.** `components/whatsapp.ts:3-6` — `waLink(number, text)` builds
`https://wa.me/${digits}?…`, and with an empty number `digits` is `""`, so the link becomes `https://wa.me/?text=…` — **a
dead link**. `app/(site)/layout.tsx:56-57` feeds that path (`const num = number ?? ""`), so with no number **every "Chat
on WhatsApp" button in the showroom becomes a dead link**.

**The app already knows this — and says so, in the office.** `app/office/(shell)/settings/settings-client.tsx:124`, the
empty state of the number field:

> *"No number set — every chat button on the site is dead until one is saved."*

So the office tells the owner the truth (no number = dead buttons) while the showroom, in three files, **invents a number
and displays it as fact**. The contradiction is inside one product.

**Two corrections to my own earlier account (both material):**

- **FIX-001 is not "latent" — parts of it are live right now.** In §R2.0 I wrote it was *"invisible in this store"*
  because the header shows the owner's real number. That is **wrong**: the *hardcoded* links (places 2–5) do not depend
  on the setting at all — they are live **today**, on both 404s and on the privacy notice, whatever number is saved.
- **The contradiction is visible on one page at once.** Driven live on `/privacy` (2026-10-17): the **header shows
  `+2348146927170`** (the owner's real number) while the **notice text says `+234 800 000 0000`** and its *"message us
  on WhatsApp"* link opens `wa.me/2348000000000`. The same page shows two different numbers and presents both as the
  truth. The runtime probe finds the invented number on the 404s too (`inventedVisible: true`).

**Still confirmed:** `lib/phone.ts` **accepts** the invented `+2348000000000` (carried from §R2.0) — the validator does
not refuse it, so the defect is not caught where a number is entered.

### 3. Every failure message, verbatim, by surface

**(a) The store did not answer — the wait and the retry** (`components/store-waking.tsx:24-26`,
`components/retryable.tsx:22-27`):

- wait: *"Just a moment"* / *"Setting things up — this can take a few seconds after a quiet spell."*
- failure: *"We couldn’t load this"* / *"We tried a few times but the server didn’t answer. Nothing was lost — please
  try again."* / button **"Try again"**

**(b) The door** (`app/office/sign-in/[[...sign-in]]/page.tsx`): the app supplies **no** failure wording — it mounts
the provider's `<SignIn/>`, so every wrong-password / unknown-email message is **Clerk's own words**. The only app words
at the door are static: *"The owner's side of the showroom. Nothing here is public."* / *"Sign in to continue."*
**Not driven live** (a wrong-credential attempt records an `auth_attempt` row — a write I did not make).

**(c) An amount** (`lib/money.ts:94-98`):

- *"Enter an amount"* (empty, or not a string)
- *"Enter a naira amount, e.g. 12500 or 12500.50"* (unparseable)

Also used for a cost field and for the `full_tank_default` setting (`lib/settings.ts:139-140`).

**(d) The WhatsApp number — one rule, eight refusals** (`lib/phone.ts:52-88`):

- *"Enter a WhatsApp number."*
- *"A WhatsApp number is digits only — that has letters in it."*
- *"A WhatsApp number is digits only — that has other characters in it."*
- *"That number does not carry Nigeria's country code, +234."*
- *"That is not a Nigerian number — write it as +234…, 234…, or 0…."*
- *"That number is incomplete — write it as +234…, 234…, or 0…."*
- *"That number has too many digits — write it as +234…, 234…, or 0…."*
- *"That is not a Nigerian mobile number — write it as +234…, 234…, or 0…."*

**(e) An upload, a file, a photo** (`components/office/CreateFromFile.tsx:47,61`, `lib/upload-rules.ts:47-49`,
`lib/photo-rules.ts:47-52`, `lib/photos.ts:39,54`, `lib/draft-read.ts:44-50`, `lib/enquiry-read.ts:43-47`):

- *"The upload could not be sent — check the connection and try again."* (network)
- *"That file could not be read."* (fallback)
- *"That file is empty."*
- *"That file is larger than 10 MB."*
- *"That file is not a photo the office stores. Use a JPEG, a PNG or a WebP."*
- *"That photo is {n.n} MB — bigger than the 15.0 MB cap. Save a smaller copy and try again."*
- *"That file could not be read as an image ({what}), so its details cannot be stripped. Nothing was stored."*
- *"That file is not a PDF. Download the car template from the office inventory and fill that in."*
- *"That PDF could not be opened. Try saving it again, or fill in a fresh template."*
- *"That PDF is not one of our car templates — none of its fields are ours. Download the template from the office inventory."*
- *"That file carries more than {N} cars, which is more than a blank holds."*
- *"That PDF is not an enquiry sheet — it does not carry our sheet's heading. Send the sheet the office imports, or the car template from the inventory."*
- *"That PDF could not be opened. Try saving it again, or send a fresh sheet."*

**Refused rows** are reported, never dropped, named by their page (`components/office/CreateFromFile.tsx:164-170`) —
but in the **reader's own voice**, which is not the voice above:

- *"no car details were filled in on this page"* (`lib/draft-read.ts:126`)
- *"\"{name}\" is not a field this template writes as text"* (`lib/draft-read.ts:121`)
- *"this line is not a name and number the sheet can read"* (`lib/enquiry-read.ts:157`)
- *"\"{value}\" is written twice on this row"* (`lib/enquiry-read.ts:144`)
- a car refused for field reasons renders as **`"Make" — enter the make; "Year" — enter a year between 1900 and 2027`**
  (`lib/draft-read.ts:59-65`: it *lowercases the first letter* of the field's own message and hangs it after a dash)

**(f) Saving a car** (`lib/car-input.ts:136-205`, `:307`; `lib/car-form.ts:139-171`):

- *"Enter the make"* · *"Enter the model"* · *"Enter the year"* · *"Enter a year between 1900 and {Y}"* · *"Enter the mileage in km"*
- *"Choose the car's state"* · *"Choose one of the car's four states"* · *"One of those states could not be read"* · *"One of those states no longer exists"*
- *"One of those photos could not be read"*
- *"Enter the sale price"* · *"Enter the date the car sold"* · *"Enter the sale price and the date it sold"*
- *"Enter a whole number"*
- *"The car could not be created. Try again."* · *"This draft could not be identified"* · *"That draft is no longer waiting"*
- *"A new car can't start as sold — save it first, then mark it sold"*

**(g) Saving an enquiry / a draft** (`lib/draft-save.ts:92-98`, `lib/draft-save-run.ts:140,164`):

- *"Enter the customer's name"* · *"Enter the phone number"* · *"Enter what they asked for"*
- *"Choose one of the enquiry's states"* · *"The enquiry could not be created. Try again."*

**(h) A setting** (`lib/settings.ts:134,152`):

- *"A tagline is at most 80 characters."*
- *"That setting is not one of the three."* ← **machine talk** ("the three" is internal)

**(i) The screen's own wording after a Server Action throws** (client-side; from §R2.3.7 and the clients) —
`app/office/(shell)/car/car-client.tsx`, `app/office/(shell)/inventory/inventory-client.tsx`,
`app/office/(shell)/enquiries/enquiries-client.tsx`:

- *"That car could not be deleted."* / *"That car could not be restored."* / *"That car could not be removed."*
- *"That {one} could not be saved."*
- *"The store could not be reached — try that again"*
- *"The store refused that change"*

**(j) Refusals that never reach a person** — `lib/tap-rules.ts:81,85,91`: *"the body is not an object"* / *"the page is
not a path on this site"* / *"the car reference is not one of ours"* (the tap is fire-and-forget, so these are internal);
and every `throw new Error(…)` (`lib/zip.ts`, `lib/sections.ts`, `lib/template-rules.ts`, `lib/refs.ts`, `lib/export.ts`,
`lib/config.ts`) becomes the **retryable state's own words**, not its own text — so **no thrown string leaks to a
person**. Good.

*(Noted, not this layer: the office advisories — `lib/notices.ts:99` "Backup status could not be read", `lib/cleanup.ts:229`
"the asset store could not be read: …" — belong to TASK-006's daily job. Recorded so they are not missed.)*

### 4. What is good here (worth keeping)

- **No message blames the person.** I looked for it and could not find one: no "invalid", no "you must", no scolding,
  no bare "Error" ever shown. The vocabulary sits on the person's side throughout.
- **Most refusals name the thing and the next action**, in the showroom's voice: *"That file is not a PDF. Download the
  car template from the office inventory and fill that in."*
- **A refused row is reported, never dropped** — named by its page.
- **The wait / failure pair never invents a figure** — *"We couldn't load this"* beats an empty list or a zero.

### 5. Where the wording goes wrong (the list for the task)

1. **A deletion that did not happen is reported as done** — *"Car deleted (demo)."* (`car-client.tsx:1192-1195`, verified
   live in §R2.3.2). The **same dialog words** as the real delete, opposite behaviour.
2. **A failed write reports itself as a failed read** — *"We couldn't load this … Nothing was lost"* for a **save**, with
   *"Nothing was lost"* asserted without checking (see §R2.4.5).
3. **The invented number** — FIX-001, §2 above.
4. **The reader's refusal reasons change voice** — lowercase fragments (*"no car details were filled in on this page"*,
   and *"Make" — enter the make* where the field itself said *"Enter the make"*) among otherwise polite full sentences;
   they read as internal notes.
5. **Machine talk that does reach a person** — *"That setting is not one of the three."*; *"One of those states could
   not be read"* (a validation failure phrased as a **read** failure); *"That draft is no longer waiting"* (the office's
   internal word *waiting*).
6. **A missing car answers HTTP 200** (§1) — honesty about what happened, at the protocol level.
7. **Every thrown error is reported as "the server didn't answer"** — including a **configuration** error, which is
   neither transient nor fixed by *"Try again"*. Honest, but it names the wrong thing.

### What R2.5 feeds

- **FIX-001 is now precise for the dev:** five places in **three files**, each with what renders today and what must
  replace it (§2), plus the `waLink("")` dead-link mechanism, plus the fact that the **office already states the correct
  rule** in the settings screen.
- **The Designer brief (Phase 3) needs two rulings:** (a) **one voice** for refusal reasons — a sentence, not a fragment;
  and (b) whether a failed **write** gets its own state and words, distinct from a failed **read** (§R2.4.5).
- **A task-level fix already visible:** a missing car should answer **404** (or the car page should call `notFound()`),
  and a mistyped **office** URL should not fall out into the public showroom.
- **Probes added:** `runtime/probe-r25-notfound.mjs`, `runtime/probe-r25-privacy.mjs` (read-only GETs).

---

## R2.6 Per-width interactions

*Gathered 2026-10-17. A **source** read of the breakpoints plus a **runtime** sweep of the same surfaces at six
widths — **1440, 1024, 821, 820, 768, 390** — in the attached browser. **Nothing written** (read-only GETs; the only
synthetic input is one touch swipe, which changes nothing on the server).*

### 1. The switch, verified at runtime — exactly at 820px

| width | the office | the showroom |
|---|---|---|
| **821 and up** | **sidebar** (7 destinations), no topbar, no bottom bar; the inventory is a **table** | ticker visible; the nav's **"Chat on WhatsApp"** visible; **no** floating button |
| **820 and down** | sidebar **hidden**; **topbar** + **bottom bar** (5); the inventory is **cards** | **floating WhatsApp button** appears; **ticker hidden** |

The 820 boundary is **exact**: at 821px the sidebar/inventory-table are present; at 820px they are gone. So **a portrait
tablet (768px) gets the phone shell and a landscape tablet (1024px) gets the sidebar** — which is exactly what Q-001
**declared**. The build matches the declaration; the only thing missing is that nothing else said so until Q-001.

**(Not this layer's work — noted):** `components/Gallery.tsx` is **imported nowhere** (the car page renders
`components/site/CarBehaviors.tsx` instead); a whole gallery component is dead. Source debt, not UX.

### 2. What the office navigation loses at ≤820 — the Q-001 gap, confirmed live

**Desktop sidebar** (`components/office/OfficeNav.tsx:14-21`) — **seven**: Dashboard, Inventory, Add / edit car,
Enquiries, **Drafts**, **Activity log**, Settings.

**Mobile bottom bar** (`components/office/OfficeBottomNav.tsx:9-15`), driven live — **five**:

| Home | Stock | Add | Chats | More |
|---|---|---|---|---|
| `/office` | `/office/inventory` | `/office/car/new` | `/office/enquiries` | **`/office/settings`** |

Confirmed at 820/768/390: **Drafts and Activity log are not on the bar**, and **"More" is not a menu — it links
straight to Settings**. So the fifth slot **promises a list it does not open**.

- **Drafts**, on a phone, has **no route in**: the only other link in the app is `CreateFromFile.tsx:135`, shown *after*
  a PDF import.
- **Activity log** has a way in (the dashboard's "Full log" link, `app/office/(shell)/page.tsx:131`), but no nav route.
- **There is no drawer.** The topbar carries no menu button, so the sidebar's extra destinations cannot be reached by
  any menu at phone width. (This answers the plan's "a drawer versus a sidebar": **there is no drawer** — the sidebar is
  simply hidden.)
- **No current-page mark** for Drafts/Activity at phone width: neither is one of the five, so nothing on the screen is
  ever lit while you are on them.

All of this is **already decided** (Q-001: "More opens Drafts / Activity log / Settings") and **not built** — the file
says so itself ("Nothing here is built yet"). R2.6 confirms the live state the task must change.

**And the dead Search button is live at ≤820.** `components/office/OfficeTopbar.tsx:29-31`: on the dashboard at ≤820
the topbar draws a magnifying-glass `<button type="button">` with `aria-label="Search (UI placeholder)"` and **no
handler** — a visible control that does nothing. (Above 820 the topbar is `display:none`, so it is in the DOM but
unseen.) Q-001 requires it removed; it is still there.

### 3. The showroom at ≤820 — what shifts

- **The ticker goes.** (`New on the lot: …` — `reference.css:263`, `.tick{display:none}`.)
- **A floating WhatsApp button appears** (`a.fab{display:grid}`, `reference.css:260`) — the phone's way to chat.
- **The nav's "Chat on WhatsApp" button**: hidden on the **car page** (`car.css:190`, `.nav .wab{display:none}`) but
  **still visible on home and inventory** at 820px (driven: `navWab=true`). So the same chrome behaves **two ways** at
  the same width depending on the page.
- **The header's WhatsApp number block stays visible** — so at phone width the number (and, if none is saved, the
  **invented** number of FIX-001) is still on screen.
- **The car page grows a sticky action bar** (`.mbar`), driven live: *"DOORSTEP PRICE ₦34,500,000 · Chat now"* —
  **not present** at 1440 or 1024. This is the clearest "a behaviour that exists at one width and not another".

### 4. What stacks, and what scrolls sideways

- **Office car form** (`app/office/(shell)/car/car.css:155`): **two columns at 1440px; one column at 1150px and below**,
  with the aside (photos / states) moved **above** the fields (`order:-1`). So a 1024px laptop already gets a **stacked
  form with the photo panel on top** — a breakpoint (1150) of its own, not the main 820.
- **Office inventory**: at ≤820 the **table is replaced by cards** (`.tbl{display:none}` / `.cards{display:grid}`) — a
  **representation swap**, not a reflow.
- **Office enquiries board**: **five fixed 268px columns at every width**, and it **scrolls sideways at every width —
  including 1440** (driven: scrollWidth 1346 vs 1136). At 390px the board is ~1396px wide inside a 347px viewport, so
  the person sees **about a quarter of the board** and must scroll sideways to reach any other column. Intended (it is a
  kanban), but the phone experience is **one column at a time**.

### 5. Overflow and overlap — checked, and one of my own readings corrected

- **No horizontal overflow on any surface at any width.** Every office and showroom page measured
  `scrollWidth === clientWidth` at 1440/1024/821/820/768/390.
- **Correction of my own first probe.** The first pass reported the **showroom home page overflowing by 339px at 390px**
  and named `div.ring`. **That was wrong.** Chasing it: the document's `scrollWidth` *does* spike during hydration
  (worst **+404px at t+704ms**, `readyState=interactive`; back to normal by `complete`), **because
  `body{overflow-x:hidden}` (`globals.css:130`) contains it and the page cannot be scrolled sideways** — a driven
  `scrollTo(300,0)` **did not move** (`moved:false`), and no **unclipped** element reaches past the viewport. So the
  spike is an internal number during hydration, **not a fault a person can see**. Recorded because the first report was
  the wrong one.
- **The office bottom bar does not cover content.** At 390px, scrolled to the bottom of the dashboard, inventory and
  settings, the lowest content sits at bottom ≈710–720px with the bar's top at 740px — **clear**, because
  `.main{padding-bottom:80-90px}` reserves the room.

### 6. Swipe versus arrows — the one spec demand about width is met

`showroom/spec.md:44` asks: photos **swipeable on phone/tablet**, arrows **additionally on laptop**. Driven live on the
car page:

| width | arrows | a synthetic touch swipe |
|---|---|---|
| 1024px | **2 visible, enabled** | **changed the photo** |
| 390px | **2 visible, enabled** | **changed the photo** |

So **both ways work at phone width** and both at laptop width — the demand is satisfied (and the arrows being visible on
a phone matches the reference's own intent, *"arrows … always visible on phones"*).

### What R2.6 feeds

- **The office nav work is confirmed, not hypothesised:** at ≤820 the bottom bar carries five destinations, **"More"
  links straight to Settings**, **Drafts and Activity log have no nav route**, **no drawer exists**, and the **dead
  Search button is live** on the dashboard. These are Q-001's three requirements, still unbuilt — they go into
  `task.md` unchanged, now with a live measurement behind them.
- **Two Designer questions this raises** (Phase 3): (a) **what the "More" list looks like**, and how it carries a
  current-page mark; (b) whether the **showroom nav's "Chat on WhatsApp"** should behave the same at ≤820 on *every*
  page (the car page hides it; home and inventory keep it).
- **Recorded as met, not to be touched:** the 820 switch, the phone/tablet swipe, the sticky car action bar, the
  stacked car form, the bottom bar's clearance.
- **Probes added:** `runtime/probe-r26-widths.mjs`, `probe-r26-overflow.mjs`, `probe-r26-overflow-time.mjs`,
  `probe-r26-overflow-cause.mjs`, `probe-r26-behaviours.mjs`, `probe-r26-overlap.mjs` (all read-only).

---

## R2.7 The long-and-empty extremes

*Gathered 2026-10-17. **Read-only** GETs and client-side filters. The one deliberate DOM change is a **labelled
synthetic long name**, put on one card and reloaded away immediately; nothing was sent to the server.*

### 1. A list with zero rows — five states, and one of them says it twice

| where (all driven) | what the person sees | a way out? |
|---|---|---|
| **office inventory**, search matching nothing | *"0 of 25 cars match"* + **"No cars match. Clear the search or pick another state."** | **"Clear filters"** |
| **office activity log**, search matching nothing | *"0 of 36 entries match"* + **"Nothing matches. Clear the search or pick another type."** | the filter bar |
| **an empty enquiries column** (SOLD 0 and LOST 0) | **"Nothing here right now."** | — (correct for one column of a board) |
| **office drafts** — *not empty today* (4 waiting); zero state is **source-only** | `drafts-client.tsx:75` — **"No drafts are waiting. A filled template or sales sheet is read into drafts the moment it is uploaded."** | the import control |
| **showroom inventory**, price filter matching nothing | **three statements at once** — see below | **"Clear all filters"** |

**The showroom's zero-match state is the odd one: it says the same thing twice.**
- the heading becomes **"0 MATCHING CARS"** (`#ttl`),
- a line appears above the grid: **"Nothing matches those filters. Tell me what you're after and I'll source it in the
  USA."**,
- and **directly below it** the empty block: **"Nothing here yet — tell me the car you're after and I'll source it in
  the USA."** with a **"MESSAGE ME ON WHATSAPP"** button.

So the same promise is printed **twice**, stacked, under a heading that states it a third time — once naming the
filters, once not. Every other empty state in the app says it **once**. (Source-only, same family: the car page's
related row — *"Nothing quite like it on the lot right now — tell me what you were after and I'll…"*.)

**Wording count:** the same idea — *this list is empty* — wears **at least seven different wordings** across the app
(the five above, the drafts line, the related-row line), and only the two office ones say what to do.

**One accessibility observation, flagged and not asserted.** The showroom's line lives in `#speak`, which carries
`role="status" aria-live="polite"` — and is **`display:none` while empty, `display:flex` only when it has text**
(driven: 0×0 and empty before filtering; 882×47 with the sentence after). A live region that is `display:none` at rest
is outside the accessibility tree, so whether a screen reader announces the change depends on the timing of the style
flip and the text insertion. I could not test a screen reader; worth the Designer's eye.

### 2. A list with far more rows than fit — nothing paginates anywhere

- The store's biggest lists: the **activity log, 36 entries**; the **office inventory, 25 rows**; the **showroom
  inventory, 19 cards**; the **drafts page** (an import queue, ~10,500 characters of text on screen); the **enquiries
  board, 6**.
- **No pagination, no "load more", no "show more", no virtualisation** — I searched every list's DOM for such a
  control and found none. Every list renders in full and the page scrolls: the office inventory page is **2,242px**
  against a 900px viewport.
- So behaviour **beyond ~36 rows is unproven by observation** — the store never gets there. Named as a limit of the
  evidence, not a defect.
- The one list that must be scrolled **sideways** is the enquiries board — five fixed 268px columns (§R2.6).

### 3. A car with no photos — **live, and it shows machine garbage** *(new — same family as FIX-001)*

Two cars in the demo store have **no photos at all**: `/car/TS-1029` and `/car/TS-1030`. Driven, the gallery renders:

```
<img id="gi" src="undefined" alt="TS-FLOW-1792136477358 Flow2 STD 2020 photo NaN">
<div class="cn" id="cn"><i class="fa-regular fa-image"></i> NaN / 0</div>
```

- the image address is the **literal string `undefined`**, and the alt text ends **"photo NaN"**;
- the **photo counter reads "NaN / 0"** — visible on screen;
- **zero thumbnails**, with the two paging arrows still drawn and nothing to page.

By contrast a photographed car (TS-1001): a real `cdn.sanity.io` address, alt "… photo 1", counter **"1 / 3"**, six
thumbnails, and its container carries an extra class (`gal go`).

Both cars answer **HTTP 200** and are in the office inventory. **Neither is linked from any public surface I
checked** — the home page's 13 car links and the inventory's 19 both exclude them — so a buyer reaches the broken
gallery only by URL. The **card** path has a placeholder (`components/Photo.tsx`); the **car page's gallery has no
empty case at all** and writes `undefined` and `NaN` straight onto the screen. R2.4's truth-7 gap applies to the
placeholder on top of this.

Filed below as **FIX-002**.

### 4. A car with no costs — designed, and honest in the list

- **10 of the 25 office rows** carry it, in **both** the COST and the PROFIT cell. The table renders
  **"COSTS INCOMPLETE"** (uppercased by CSS; the source string is **"Costs incomplete"**,
  `scripts/reconcile.ts:193,311`).
- The ten include cars **On Order** (`Range Rover Sport HSE 2021` TS-1013, `BMW X7 xDrive40i 2022` TS-1018) and the
  two flow cars — so a `0 km` order car routinely has no costs yet.
- The **dashboard** names the gap and its arithmetic honestly (driven): **"Across 24 cars in stock — includes cars
  with incomplete costs, because that money is spent."** and **"From 14 of 24 cars. 10 excluded: costs incomplete.
  See which"**.
- The **car form** for TS-1029 shows **bare empty cost fields** (a ₦ sign and nothing after it) and no "incomplete"
  wording — the list names the gap, the form does not. That reads correctly for an editable form; flagged as a
  deliberate silence, not a missed label.
- Deliberate by design — `scripts/seed.ts:17`: *"one car's costs are genuinely incomplete rather than merely
  displayed"*.

### 5. An enquiry with no note — not in the store; the fallback exists in source

- Driven: the drafts page holds **"4 enquiries waiting"**, and **all four carry a note** — *"Wants the black
  interior"*, *"Ready to inspect on Saturday"*, *"Asked about finance terms"*, *"Waiting for the arrival date"*. The
  board carries six more.
- The zero-note case is therefore **source-only**: `app/office/(shell)/enquiries/enquiries-client.tsx:318` —
  `{cur?.note ? cur.note : "Nothing noted yet."}`.

So a note-less enquiry shows **"Nothing noted yet."** — **not observed**, because the store has none. Recorded as a
verification debt, not as an observation.

### 6. A very long car name — nothing truncates, ever; a long name grows its whole row

- **No genuinely long real name exists in the store.** The longest names present are the **machine names of the
  test cars** — `TS-FIX-1792145797830-2 Fixture STD` and `TS-FLOW-1792136477358 Flow2 STD` (30–31 characters); real
  listings run ~20–35.
- The name element carries `white-space: normal` with **no clamp, no ellipsis, no `text-overflow`** anywhere in the
  project's own CSS — so a long name **wraps**.
- **Synthetic, labelled** — one card's name replaced with a 105-character name (client-side only, reloaded away
  immediately): the card grew **223 → 308px**, and **the whole grid row stretched with it** — all three siblings
  223 → 308px, and the next row was pushed from top **468 → 804**.
- So what the layout does to the eye: **nothing is ever cut off, and one long name makes its entire row taller**,
  padding the two neighbours with dead space. In the office table the same wrap grows the row inside its cell.

**Content note (not this layer's build):** because those machine names *are* the longest names, they are also the
long-name case in production — and **three test-artifact cars sit in the showroom inventory** (`TS-FLOW-… FLOW2 2020`
TS-1033, `TS-FLOW-… FLOW2 2020` TS-1035, `TS-FIX-… FIXTURE 2021` TS-1036), with fixture prices (₦22,000), and
**all three are linked from the public home page** (driven — the home page's 13 car links include 1033, 1035 and
1036). Whoever owns the demo store should clear them.

### FIX-002 — the photo-less car's gallery

**Where:** the showroom car page's gallery — `app/(site)/car/[ref]/page.tsx` with `components/site/CarBehaviors.tsx`
(the same script that draws the arrows), driven on `/car/TS-1029` and `/car/TS-1030`.
**What a person sees:** a broken image; the counter **"NaN / 0"**; alt text **"… photo NaN"**; two arrows with
nothing to page.
**What should happen:** when a car has **no photos**, show **nothing at all** — no counter, no arrows, no `undefined`,
no `NaN`. The same rule as FIX-001: an absent value renders as **nothing**, never as machine text.
**Note:** the *card* path already has a placeholder (`components/Photo.tsx`); it is the **car page's gallery** that has
no empty case — and R2.4's truth-7 gap applies to that placeholder too.

### What R2.7 feeds

- **FIX-002 is new** (above) — the photo-less gallery. FIX-001's family, found live.
- **One word to the Designer:** the showroom's zero-match state prints the same promise **twice**, under a heading
  that says it a third time; and the `#speak` live region is `display:none` at rest (a11y question).
- **One word to whoever owns the demo store:** three test-artifact cars (machine names, ₦22,000 prices) are in the
  showroom inventory and linked from the home page.
- **Verification debts:** an enquiry with no note (source-only); behaviour beyond ~36 rows (no store that big).
- **Recorded as sane, not to be touched:** the office inventory's and activity log's zero states (one message, one
  way out); the board column's one-liner; the ten "Costs incomplete" rows and the dashboard's honest arithmetic;
  the cost-bearing car form's silence; the wrap-never-truncate rule.
- **Probes added:** `runtime/probe-r27-store.mjs`, `probe-r27-empty.mjs`, `probe-r27-cases.mjs`,
  `probe-r27-detail.mjs`, `probe-r27-drafts.mjs`, `probe-r27-nophoto.mjs`, `probe-r27-gallery.mjs`,
  `probe-r27-visibleempty.mjs`, `probe-r27-linked.mjs` (all read-only; one labelled synthetic name, reloaded away).