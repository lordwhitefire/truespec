# TASK-005 — Plan (UX. Layer 5 of 6)

**Written 2026-10-17** by the Developer, from `openspec/tasks/TASK-005/task.md` (as rewritten 13:18 today),
its `testing.md`, the seven `findings/*` files, and the grilling session whose rulings are logged in
`developer-workspace/notes/TASK-005-rulings.md` (Task 43 writes that file).
Convention: this file's Progress tracker + Task list (Developer-workspace convention; no `tasks/todo.md` in this project).

**One commit per task**, on the branch as it stands. Sliced tasks commit per slice. Commit the plan first
(Task 1). Messages in the form `TASK-005 task N: …`.

---

## Overview

Every layer under this one is built. This layer makes the product **tell the truth**: a save reports what
actually happened, a delete that deletes nothing is removed or made real, a failed write is reported where the
person is working instead of replacing the office chrome, the undo offer shows its eight seconds draining, every
dialog behaves the same way, an empty photo area is a coloured box rather than machine text, the office's narrow
width reaches everything the sidebar reaches, no invented phone number appears anywhere, a missing car answers
404, a mistyped office address lands in the office, a slow store shows something is happening, and an offline
person stays inside the product — with their typing kept **on their own device**, so the sentence the offline
banner makes is true (the owner's widening, ruling Q11).

**No new route, no new data model, no new rule** — except the one feature the owner asked for in the ruling
(the device draft store), recorded and flagged.

## Architecture decisions

1. **Reporting, not throwing.** A write that cannot reach the store returns a refusal with words — the pattern
   `lib/car-form.ts:106-118` (`photosExist`) already uses — instead of throwing. Nothing catches it at a route
   boundary; the action's own words reach the screen the person is in. (`06-architect-calls.md` call 2.)
2. **The change fact travels from the server.** The no-op comparison already happens server-side
   (`lib/car-update.ts:106-125`; `lib/change-check.ts`). The missing piece is that the action does not **return**
   it. No browser-supplied hash is ever read (TASK-003 decisions 3–4).
3. **The platform's dialog is the mechanism.** Every confirmation becomes a native `<dialog>` with
   `showModal()` (trapping, Escape, top layer for free), plus the accessible name and the app's own rules
   (safe action first, no outside-tap dismissal for destructive confirms). Only `WhatsAppGate.tsx` does this
   today.
4. **One boundary inside each shell.** `app/error.tsx` and `app/office/error.tsx` stay exactly where they are
   (a boundary cannot catch its own segment's layout); new boundaries go **inside** `(shell)` and `(site)` so a
   page's read failure keeps the chrome and the retry lands where the person is. (`06` call 2.)
5. **The undo clock is the animation.** One `requestAnimationFrame`-driven bar is the clock; its end closes the
   offer. The `setTimeout` behind it is deliberately longer (failsafe only) and becomes the real clock when
   reduced motion is asked for (a static "8 s" label).
6. **The device draft is FormData-shaped, not React-state-shaped.** The car form is an uncontrolled real form
   (`car-client.tsx:369-386`); settings is three controlled cards. The device store mirrors
   `components/site/store.ts` (`ts-` prefix, try/catch), lives in `lib/device-draft.ts`, holds **no customer
   data**, is never counted anywhere (SD13), and is erased only by an act (save / discard / sign-out) — never by
   a clock.
7. **Offline is client-side only.** `navigator.onLine` + failed-fetch detection + our own chrome; **no service
   worker** (the design plan's own stance: "no cached showroom, no outbox"). Residual recorded: a hard browser
   reload while offline still leaves the app (owner ruling Q16a).
8. **No new feature beyond the owner's ruling.** Everything else is wording, presentation and behaviour of what
   exists (`task.md` "What this task does not do"). The draft store is the single, logged exception.

## Copy sheet — **needs your approval with this plan**

Every slot below has no approved wording on disk (`task.md:271-272` says bring it back as a question). Approving
the plan approves these; nothing lands in code before this.

| Where | Proposed wording | Notes |
|---|---|---|
| **Waiting sign** (a slow soft navigation, `H26`) | **"Loading…"** — quiet, with the existing spinner, announced once | Distinct from the settled cold-start line ("Just a moment / Setting things up…"). Bare, makes no promise. |
| **Office not-found** (`I28`) | Heading **"That page isn't in the office"** · body **"No office screen matches that address. Nothing was lost."** · action **"Back to the dashboard"** | Gold + icon + words (`tasks.md:73`), never colour alone. Rendered inside the office shell, so the sidebar is present too. |

Already-fixed wording used verbatim, not rewritten: the waking line and the retry line (`task.md:259-263`), the
offline three lines (`design-workspace/decisions/ux-implementation-plan.md:77-78`), the dialog labels
("Delete" / "Remove for good", `04-designer.md:185-189`), "Nothing changed." (DR23).

**Flagged, not changed:** the approved showroom offline line is *"You are offline. Reload to see the site."*
Reloading is exactly what fails offline; it is honest once the connection is back. Kept verbatim (approved
copy); raised in the report.

---

## Progress tracker

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Workspace artefacts + green baseline | ☑ | `4e79e1f` — brief + plan; baseline green (typecheck clean, 285/285, dev 200 on `/` and `/office`). |
| 2 | Current truth for the surfaces this layer touches | ☑ | `1047d04` — `notes/TASK-005-current-truth.md`, five APIs with sources. |
| 3 | Write actions refuse instead of throwing | ☑ | `f675926` — `storeQueryRefusing` + `lib/store-refusal-rules.ts`; 7 files; 292/292; forced failure refused both ways (`notes/TASK-005-witnesses.md`). **Ruled 2026-10-17: folded in** — six sites, not four (`state.ts`'s five writes — `recolourCarState`/`reorderCarStates` had no `catch` at all — and `createCar`'s guard) now return refusals; witnessed live on a throwaway copy (five refusals, each in its own words, every POST **200**); `notes/TASK-005-task3.md` §Addendum. |
| 4 | The refusal reaches the screen the person is in | ☑ | `fb0b1ac` — No source change needed — Task 3's refusal already lands in place. Witnessed live, signed in, in all three named places (car form `role="alert"` panel; settings inline + toast; inventory toast `role="alert"`, row back to 25). Store checked directly: `production` 25 cars / 0 tombstoned. `notes/TASK-005-task4.md`; readings in `notes/TASK-005-witnesses.md`. Enquiries reports inline rather than in a toast — **ruled: keep the red note**. |
| 5 | A save reports what actually changed (car) | ☑ | `adb0806` — The change fact now travels: both statements answer `changed` with the ref (`upd`/`new_car` = true, the fallback = false, guarded so the fallback cannot answer twice); `updateCar`/`createCar` pass it through; the toast and the result panel say **"Nothing changed."** when nothing moved, and keep *"Saved as \<ref\>. The showroom updates immediately."* when something did (DR23). No browser-supplied hash is read. Witnessed live, signed in, on the real store (demo car TS-1001): no-op → "Nothing changed." (panel + toast, POST 200); field changed → "Saved as TS-1001."; field put back → "Saved as TS-1001."; store read directly: version 1 → 3 and events 2 → 4 = exactly the two real saves, three no-op saves moved nothing. `notes/TASK-005-task5.md`; readings in `notes/TASK-005-witnesses.md`. Files beyond the plan's list: `lib/car-create.ts` + a new `lib/car-create.test.ts` (the AC requires `createCar` to return the fact; the statement had no test file); `lib/change-check.test.ts` deliberately **not** extended — the fact does not live there. |
| 6 | A save reports what actually changed (settings) | ☑ | `f10efa6` — The one settings statement now compares the stored value with the one about to be written and **writes nothing when they are the same**, answering `changed` (three arms: no row → insert, different → update, same → nothing; fallback guarded so a real save cannot answer twice). `SaveSettingResult` carries the fact; the three cards' toasts say **"Nothing changed."** when it is false and keep their own saved sentences when it is true (DR23) — the dirty flags keep their existing job (button + "Unsaved change"), while the *fact* is the store's own, since `0814 692 7170` for a stored `+2348146927170` is text-dirty and setting-clean. Witnessed live signed in: the WhatsApp card typed in the other form → "Nothing changed.", audit line unmoved, **the store's rows byte-identical before and after** (no-op wrote nothing); on a throwaway copy the tagline really changed → the saved words, audit+`updated_at` moved, then restored → the saved words. Statement's three arms read directly at the store. `notes/TASK-005-task6.md`; readings in `notes/TASK-005-witnesses.md`. Files beyond the plan's list: `lib/settings.ts` (the statement's home) — `actions/setting.ts` needed no change. |
| 7 | The record names what happened | ☑ | `402bb57` — `car.restored` moved off the `del` chip onto its own `res` chip — the row now reads **RESTORED**, the facets carry **“Restored N”** separately — and the count rule itself pulled out as `countOf`, one rule for every chip, pinned by a new test (a mixed feed: del 2, res 1, all 4). `car.deleted` and `car.unsold` audited and pass untouched; `car.removed` left under “Deleted” (both words say deletion) — flagged to the owner. Witnessed live signed in, one **demo** car (TS-1011) deleted then undone at once, net-zero (`deleted_at` null before and after): delete toast “…deleted.” (POST 200, 25→24 rows), undo toast “…restored.” (POST 200, back to 25), the store’s two events 1.37 s apart, the log **All 38 → 40 · Deleted 6 → 7 · Restored 6 → 7** with every other chip unmoved, the newest rows “Restored a car TS-1011 · Restored” above “Deleted a car TS-1011 · Deleted”, and every count matching its rows. The pre-fix reading (restorations chipped “Deleted”, facet “Deleted 12”) kept in `runs/activity-read/before.json`. `notes/TASK-005-task7.md`. |
| 8a | The waiting line moves out from above the pages that must answer a status | ☑ | `2d5d05d` — The `(site)` layout stopped awaiting the store: the number, the ticker, the footer gallery, each WhatsApp link and the floating button are Suspense islands over one per-request cached read, so no boundary sits above a page. `app/loading.tsx` went; the waking line lives on the segments that read the store — `(site)/(home)/loading.tsx` (the home page moved into a `(home)` group so the boundary could not cover the car route) and `(site)/inventory/loading.tsx`. Verified live: `/` and `/inventory` carry “Just a moment”, `/privacy` does not, the car pages carry neither; the chrome's header/footer/fab outerHTML is identical to before (React's boundary comments and the ticker's active line normalised); `/car/TS-9999` answers **404**; typecheck, 295/295. The page-owner's ruling recorded in Phase 2; the blocking evidence in `notes/TASK-005-task8-blocked.md`, the record in `notes/TASK-005-task8a.md`. |
| 8 | A missing car answers 404, its view unchanged | ☑ | The page throws `notFound()` before the response streams; the co-located `not-found.tsx` renders the view the page used to render inline — the same words, the chrome, the ways forward — as a real **404**. `car-parts.tsx` carries the shared shells and the view itself (one copy, two callers). Witnessed live: `/car/TS-9999` → **404** with the title *“Car not found \| TrueSpec Automotive”*, the crumbs *Home › Not found*, both ways forward (*Message Umar* → the real number's `wa.me` link, *See all cars* → `/#cars`), the chrome and all six shells; `/car/TS-1001` → **200** and the sold `/car/TS-1025` → **200** with its own view; the URL keeps the typed ref (no redirect) — it was never rendered visibly, before or after. `notes/TASK-005-task8.md`; readings in `notes/TASK-005-witnesses.md`. Files beyond the plan's list: `car-parts.tsx` (the boundary must import the shared pieces, and a page file cannot be imported). |
| 9 | A mistyped office address lands in the office | ☑ | The office answers in its own words, inside its own shell, with a real **404**: `/office/nonsense` and `/office/car/nonsense-ref` both render *“That page isn't in the office” · “No office screen matches that address. Nothing was lost.” · **Back to the dashboard*** (gold + icon + words) with the sidebar, topbar and *“Signed in as …”* around them. Mechanism beyond the plan's files: a `(shell)/[...rest]` catch-all route (an unmatched path never descends into a group — without it `/office/nonsense` stopped at the root not-found), and `app/office/loading.tsx` removed with its line moved to the pages' own segments (dashboard via a `(dashboard)` group move, plus inventory, activity, drafts, enquiries, settings, car/new) — none above `car/[ref]` or the catch-all. Free consequence: office redirects are real again — signed out every office address answers **307 → /office/sign-in** (before: 200s with a client-side redirect), `/office/car` → 307 to the inventory. Witnessed live signed in: both addresses **404** with the view and the shell; dashboard/inventory/activity/drafts/enquiries/settings/car new/car editor **200** with the shell; `/nonsense` (site) untouched — chrome-less, three ways out, not merged; the waking line present in `/office`, `/office/inventory`, `/office/activity` HTML, absent from the car detail and the 404s (the accepted cost, as on the site); typecheck, 295/295. `notes/TASK-005-task9.md`; readings in `notes/TASK-005-witnesses.md`. |
| 10 | The undo offer shows eight seconds draining | ☑ | The offer carries its measure: a 3 px tick at the toast's edge whose `scaleX` drains **1 → 0** under `animation: undodrain 8000ms linear forwards` (`transform`, never `width` — nothing reflows), and whose own `animationend` (guarded on the animation's name) calls the new `closeOffer()` — the same close the failsafe uses. The delete offer's timeout is now **10 000 ms**: deliberately longer, so it can never close the offer first. Witnessed live on a throwaway demo car (TS-1038, created through the office, removed for good after): registered `duration 8000 / iterations 1 / linear / forwards`; the drain sampled in-page every 100 ms ran the animation's own clock **0 → 8016 ms** at exactly 8000 ms per unit; the offer closed at the animation's end (bar gone, Undo gone), **8 524 ms** after the animation's start — the 10 s failsafe never won; after expiry the car was a **tombstone** and listed in *“Waiting to be cleared”*; removal for good left the store read-back **absent** and the live count **25 → 25**; typecheck, 295/295. One reading handed to **Task 11**: the animation's clock started **1 681 ms** after the bar's element entered the DOM (bar full, clock not yet running) — Task 11's AC owns pinning the start to the offer being pressable. `notes/TASK-005-task10.md`; readings in `notes/TASK-005-witnesses.md`; drive `undo-bar.mjs`. |
| 11 | The bar's mechanics are constrained | ☑ | Three constraints, each measured live (`undo-mechanics.mjs`, two throwaways TS-1041/TS-1042, both removed, net-zero). (1) **No layout forced**: keyframes carry `transform` only; the bar's layout width, the toast's layout box and the document scroll height held identical across every drain sample — and `scaleX = 1 − elapsed/8000` at every sample (±0.02). (2) **`aria-hidden`** on the bar, read true. (3) **Reduced motion**: a `matchMedia("(prefers-reduced-motion: reduce)")` preference (with a `change` listener) swaps the bar for a static **“8 s”** label (`.usec`); no `.ubar`, **0 animations**, the offer's timer becomes the clock at **8 000 ms** and the offer closed in **8 067 ms** with Undo offered throughout (without reduced motion the timer stays the 10 000 ms failsafe). **The clock's start** measured against the click and the page's own `requestAnimationFrame` log: click t=1 661 → offer t=3 988 → animation start t=5 691, **on a logged frame** (one frame after the offer enters the DOM) — click→close **12 366 ms**, not 8 000, so it does not start when the row leaves the list. No start-pinning code needed: the native pending-start is already a rendered frame; the 1 703 ms gap is the harness tab's **1 017 ms frame cadence**, recorded honestly. Typecheck, 295/295. `notes/TASK-005-task11.md`; readings in `notes/TASK-005-witnesses.md`; drive `undo-mechanics.mjs`. |
| 12 | The end of the window is true, and checked | ☑ | Watched once, live, on a throwaway (TS-1046, created/expired/removed, net-zero): after the eight seconds `#undo` is present but **hidden**, the toast down, bar and label gone; the car is a **tombstone** (`deleted_at` set), absent from the live table, live count at baseline. **Nothing hard-erases on a timer** — same `deleted_at` to the millisecond after a further 4 s, tombstone count unchanged, still *“Waiting to be cleared”* after a reload; only the owner's **“Remove for good”** clears it (store `null`, live **25 → 25**). Nothing restores it. The check forced one change: the old **10 000 ms** failsafe left only a 2 000 ms margin over the window, and because the animation's clock waits for a rendering frame a 1 fps tab can eat 2.1 s of it (first expiry run: offer window **10 267 ms**) — the failsafe is now **12 000 ms** (the reduced-motion clock stays **8 000 ms**). Re-verified: clock window **8 536 ms** (animation start → close), animation's own end t=12 666 vs failsafe due t=15 891 — **the animation is the closer by 3.2 s**; the bar read `currentTime 8 000 ms` at its end. The offer window measured from arrival (9 311 ms) is longer in this harness only because of its frame cadence, recorded honestly. Typecheck, 295/295. `notes/TASK-005-task12.md`; readings in `notes/TASK-005-witnesses.md`; drive `undo-expiry.mjs`. |
| 13 | Every confirmation is the platform's dialog | ☑ | The hand-built `.ovl`/`.mdl` div is a native `<dialog>` + `showModal()` on every screen: inventory delete (`#ovl`), car form delete (`#ovlD`), drafts delete, enquiry detail (`#ovlD`) through the new `components/office/Dialog.tsx`; the showroom's car/ask modal in its three homes (`page.tsx`, `CarLayers`, `HomeBehaviors`) and the inventory browser's modal with their own `showModal()`/`close()`, the manual Escape handlers gone and the page unlocked on the dialog's `close` event. The inner duplicate `role="dialog" aria-modal` is removed (the root is the dialog). Each sheet carries the platform rules: full viewport, **closed does not paint** (`dialog.ovl:not([open])` — the author `display:grid` would beat the UA's `display:none`), transparent `::backdrop` (the `.ovl` background is the dim). Witnessed live signed in, 7/7 screens — opened through each screen's own trigger: `DIALOG`, `open`, `:modal`, `display:grid`, named by our heading (*Delete this car? / Delete this draft? / Enquiry / What are you after? / Before you go*), inner `role` null; closed clean (office `display:none`, showroom inventory unmounted after `close()`); `.mdl` centred, border 0; Escape fired `cancel`→`close`. Typecheck, 295/295. Notes: the plan's Files list omitted the showroom files the AC names (changed: `page.tsx`, `car-parts.tsx`, `HomeBehaviors.tsx`, `CarBehaviors.tsx`, `InventoryBrowser.tsx`, `app/reference.css`, `app/(site)/car/car.css`); **no enquiry delete dialog exists** in the code, so none was invented; outside-tap kept on the two callers that had it via a temporary `dismissOnBackdrop` until Task 16. `notes/TASK-005-task13.md`; readings in `notes/TASK-005-witnesses.md` §Task 13; drive `dialogs.mjs`. |
| 14 | Focus, scroll, name, Escape | ☑ | The native dialog already traps focus, names itself, takes Escape and returns focus; the page behind is locked by `Dialog` for the office (inline `overflow`) and by the showroom's `.lock`. Keyboard drive, **7/7 screens**: first focus is the safe control (inventory/car *Keep it*, drafts/enquiries showroom *Close*), **no page control outside the dialog ever took focus** (Tab walks `control → control → BODY → first`; that `BODY` edge is Chrome's own modal cycle — a minimal two-button dialog reproduced it), Escape closed exactly one dialog, a second changed nothing, focus returned to the opener (the enquiry `ARTICLE` included), and the name read from the accessibility tree (*Delete this car? / Delete this draft? / Enquiry / Before you go*). `body` was `overflow:hidden` while open with a 900 px wheel held at **y = 0**, restored on close. Found live: Enter on an enquiry card opened the dialog and the **same keystroke** activated the just-focused Close **22 ms** later (`preventDefault` on the card's Enter branch fixes it; verified open). The plan's Files list named the showroom files, but those needed no Task 14 edit beyond Task 13; the actual edits are `Dialog.tsx`, inventory/car (their own window Escape listeners removed) and enquiries (unlisted). Typecheck, 295/295 · drive `focus.mjs` · `notes/TASK-005-task14.md`, witnesses §Task 14. |
| 15 | Destructive actions named and ordered consistently | ☑ | The draft delete's confirmation now puts the safe way out first and the destructive action second, and the action is named **“Remove for good”** (the draft is the one deletion that cannot be undone; owner's ruling 2026-10-17) with a “Removing…” pending label. The other confirmations already read **Keep it → Delete** (inventory, car form — both undoable) and **Keep it → Remove for good** (the tombstone's inline confirmation; no live tombstone exists, source read); the enquiry detail has **no destructive action**, so none was invented. Read live, read-only, every dialog closed through its safe control: drafts `Keep it` / `Remove for good` (`btn`), inventory and car `Keep it` / `Delete` (`btn2 danger`), enquiry only Close + the five states; `deleteDraftAction` is permanent and offers no undo. The draft card's trigger and the dialog's question still say “Delete” — the confirmed action is renamed; changing the entry words would be copy outside the approved slots (flagged). Typecheck, 295/295 · drive `destructive-labels.mjs` · `notes/TASK-005-task15.md`, witnesses §Task 15. |
| 16 | A tap outside closes only what is not destructive | ☐ | |
| 17 | Focus survives a list change and a refusal | ☐ | |
| 18 | The dead Search control goes | ☐ | |
| 19 | The car form's delete really deletes, with the same undo | ☐ | |
| 20 | The narrow-width More cell reaches three destinations | ☐ | |
| 21 | The showroom chat control behaves the same at every width | ☐ | |
| 22 | An empty area says it once, then the one next action | ☐ | |
| 23 | The live result is announced exactly once | ☐ | |
| 24 | The honest count, and clearing lives in the panel | ☐ | |
| 25 | A refusal keeps its own voice | ☐ | |
| 26 | A car with no photos, and a photo that failed | ☐ | |
| 27 | The empty photo box is a gradient from the car's ref | ☐ | |
| 28 | The gradient is deterministic, and tested | ☐ | |
| 29 | No invented number, no dead recipient (FIX-001) | ☐ | |
| 30 | With no number saved, chat controls are visibly off | ☐ | |
| 31 | A boundary inside each shell | ☐ | |
| 32 | A store that cannot be read is never emptiness or a number | ☐ | |
| 33 | A slow navigation shows that something is happening | ☐ | |
| 34 | The showroom's offline line | ☐ | |
| 35 | The office offline banner, and Save disabled with its reason | ☐ | |
| 36 | The device draft store | ☐ | |
| 37 | The draft comes back, and the recovery line is true | ☐ | |
| 38 | A draft is erased only by an act | ☐ | |
| 39 | The privacy notice keeps its promise | ☐ | |
| 40 | A draft is never a record, and holds no customer data | ☐ | |
| 41 | The owner's rulings, written down | ☐ | |
| 42 | Witness pass — benchmarks 1–11, driven live | ☐ | |
| 43 | Gates, reconcile, net-zero | ☐ | |
| 44 | Report, and the handover to the testing pass | ☐ | |

---

## Task list

### Phase 0 — Foundation

**Task 1 — Workspace artefacts + green baseline** (S)
- **AC:** the brief exists (`developer-workspace/briefs/TASK-005-brief.md`) and this plan is committed; the tree typechecks and its tests pass **before** any change, so every later failure is ours.
- **Verify:** `npm run typecheck`; `npm test`; the dev build on `:3210` answers.
- **Deps:** — **Files:** `developer-workspace/briefs/TASK-005-brief.md`, `developer-workspace/plans/TASK-005-plan.md`.

**Task 2 — Current truth for the surfaces this layer touches** (S)
- **AC:** before writing against any of them, the current material is loaded and cited: native `<dialog>`/`showModal()` and focus/scroll behaviour today (MDN, as of now); `useLinkStatus` / `loading.tsx` on Next **15.5.27**; `navigator.onLine` reliability; `prefers-reduced-motion` practice; `next/navigation`'s `useParams` inside a not-found boundary (needed for Task 8). Notes cite each claim; any product claim not verified is marked unverified. A skill check is recorded (this layer drives a browser: the standing `procedures/browser-check.md` + `playwright-core` cover it; `browser-testing-with-devtools` is the skill for it — ask the owner before installing anything).
- **Verify:** `developer-workspace/notes/TASK-005-current-truth.md` — every API used later appears with a source.
- **Deps:** 1. **Files:** `developer-workspace/notes/TASK-005-current-truth.md`.

### Phase 1 — Truth in reporting (highest risk)

**Task 3 — Write actions refuse instead of throwing** (M)
- **AC:** every office write wraps its store call the way `photosExist` does: catch, return `{ ok: false, errors: [{ message, … }] }` with words; nothing thrown out of a server action on store failure. Covers `createCar`, `updateCar`, `deleteCar`, `undoDeleteCar`, `removeCarForever`, the setting saves, the enquiry state change, the draft saves, the tap write. Success path byte-for-byte unchanged.
- **Verify:** `npm test` (`lib/store-retry-rules.test.ts` and neighbours extended if it is the right home); `npm run typecheck`; a live forced failure (store pointed at a dead port in a scratch run) returns a refusal — never a throw.
- **Deps:** 2. **Files:** `app/office/actions/car.ts`, `app/office/actions/setting.ts`, `app/office/actions/enquiry.ts`, `app/office/actions/draft.ts`, `app/office/actions/tap.ts`.

**Task 4 — The refusal reaches the screen the person is in** (M)
- **AC:** a refused write arrives in that action's own words, in the screen the person is in: the car form shows it in its result panel (`role="alert"`), inventory/others in their own toast; the office chrome is **not** replaced and the store-unreachable page is **not** shown; "nothing was lost" is said only where that has been established.
- **Verify:** live drive on `:3210`: force a write failure on the car form, on inventory delete, on a settings save — the message stays in place each time; the sidebar/topbar never vanish. Screens/browser-wide readings recorded in `notes/TASK-005-witnesses.md`.
- **Deps:** 3. **Files:** `app/office/(shell)/car/car-client.tsx`, `app/office/(shell)/inventory/inventory-client.tsx`, `app/office/(shell)/settings/settings-client.tsx`, `app/office/(shell)/enquiries/enquiries-client.tsx`.

**Task 5 — A save reports what actually changed (car)** (M)
- **AC:** the server's change fact is returned by `updateCar`/`createCar` (from the existing `changed` CTE) — **no browser-supplied hash is read**; when nothing changed the form says so in words of its own ("Nothing changed.") instead of "Saved"; when something changed the success message is unchanged.
- **Verify:** `npm test` (`lib/car-update.test.ts`, `lib/change-check.test.ts` extended for the returned fact); live: save a car twice without editing → "Nothing changed."; edit one field → the success line.
- **Deps:** 3. **Files:** `lib/car-update.ts`, `lib/car-update.test.ts`, `app/office/actions/car.ts`, `app/office/(shell)/car/car-client.tsx`.

**Task 6 — A save reports what actually changed (settings)** (S)
- **AC:** a settings card saved with no edit says nothing changed rather than succeeding silently or pretending; the dirty flags that already exist (`waDirty`/`tagDirty`/`tankDirty`) are the basis, and the words are the card's own.
- **Verify:** live: press Save on an untouched card → nothing-changed wording; edit → saved wording. `npm run typecheck`.
- **Deps:** 3. **Files:** `app/office/(shell)/settings/settings-client.tsx`, `app/office/actions/setting.ts`.

**Task 7 — The record names what happened** (S)
- **AC:** one word does not cover two actions: a restored item is named as a restoration, not a deletion; every count in the activity view agrees with the names it summarises (the `car.deleted` / `car.restored` / `car.unsold` words in `lib/activity-feed.ts` and wherever they are counted).
- **Verify:** `npm test` (`lib/activity-feed.test.ts` extended); live: delete → undo → the activity log names the restoration; the counts match the rows.
- **Deps:** — **Files:** `lib/activity-feed.ts`, `lib/activity-feed.test.ts`, `app/office/(shell)/activity/`.

**> Gate A — ✅ 2026-10-17** — `npm run typecheck` clean · `npm test` **295/295** · live: the forced failure (a Mileage beyond an `int` — statement refused, nothing written) reported **in the form's own panel**: “Could not save. / That car could not be saved — the store refused that change.” (POST 200, chrome intact, net-zero) · the no-op save said **“Nothing changed.”** (audit line unmoved, store byte-identical). Witnesses: `notes/TASK-005-witnesses.md` §Gate A.
**⛔ Owner checkpoint A** — the reporting changes, shown live, before the long tail.

> **Owner's ruling, 2026-10-18.** Task 8's 404 collides with TASK-004's store-waking boundary: a
> Suspense boundary above a matched route fixes the status at the first flush, so `notFound()` can
> only stream a 200 (proved in dev and in a production build; see
> `notes/TASK-005-task8-blocked.md`). The owner chose: **the 404 stays; the waiting line moves down
> a level.** Task 8a does that before Task 8 lands.

**Task 8a — The waiting line moves out from above the pages that must answer a status** (S)
- **AC:** the store-waking line still shows from the first byte on the public pages that read the store, while a page that must answer a real 404 is no longer under a Suspense boundary. The `(site)` layout stops awaiting the store: its reads become small Suspense islands (the number, the ticker, the footer gallery, each WhatsApp link, the floating button), each deduped per request. The chrome renders identically; only React's boundary comments differ in the DOM.
- **Verify:** live: `/` and `/inventory` HTML carry the waking line; `/privacy` (no store read) does not; `#site-header` / `#site-footer` / `a.fab` outerHTML identical before and after (comments and the ticker's active-line class normalised); `/car/TS-9999` now answers **404**; typecheck, 295/295.
- **Files:** `app/(site)/layout.tsx`, `app/(site)/page.tsx` → `app/(site)/(home)/page.tsx`, `app/(site)/(home)/loading.tsx` (new), `app/(site)/inventory/loading.tsx` (new), `app/loading.tsx` (removed), `app/reference.css`.

**Task 8 — A missing car answers 404, its view unchanged** (S)
- **AC:** the car page's not-found view is kept **exactly as it is** (helpful, chrome, ways forward) but the response is a real **404**, not 200 — a dead car link stops looking healthy to search engines, link checkers and monitors.
- **Verify:** `curl -sI` for a known-good ref → 200 and for a dead ref → **404**, with the same rendered view (checked in the browser); the ref the person typed is still shown.
- **Deps:** 2. **Files:** `app/(site)/car/[ref]/page.tsx`, `app/(site)/car/[ref]/not-found.tsx` (new, if the boundary route is the mechanism).

**Task 9 — A mistyped office address lands in the office** (S)
- **AC:** an unknown `/office/…` renders **office words, office chrome and a way back to the dashboard** — not the shop front. Uses the approved copy sheet; gold + icon + words, never colour alone.
- **Verify:** live: `/office/nonsense` and `/office/car/nonsense-ref` both land in the office with its chrome; `curl -sI` → 404; the two not-found presentations are **not** merged (the site-wide one is untouched, still chrome-less with three ways out).
- **Deps:** 8. **Files:** `app/office/(shell)/not-found.tsx` (new), `app/office/(shell)/office.css`.

> **Mechanism note (2026-10-18).** Task 9 hit the Task 8a collision one level down, plus one of its
> own. (1) `app/office/loading.tsx` sat above every office route, so the car editor's `notFound()` and
> every `requireOfficeSession` redirect could only stream as **200** — and did: signed out, `/office`
> and `/office/inventory` answered 200 with a client-side redirect. It is removed; the line moved to
> the pages' own segments (the dashboard via a `(dashboard)` group move, plus inventory, activity,
> drafts, enquiries, settings, car/new), and no line sits above `car/[ref]` or the catch-all. (2) An
> **unmatched** `/office/…` never descends into a route group: with only `(shell)/not-found.tsx` in
> place, `/office/nonsense` still stopped at the root not-found — the showroom's words, no chrome.
> A `(shell)/[...rest]` catch-all route, added solely to match unknown addresses (it renders nothing;
> it checks the door and throws `notFound()`), makes the office answer in its own words inside its
> own shell. Free consequence of the move: office redirects are real 3xx again (signed out → **307**
> to `/office/sign-in`; `/office/car` → 307 to the inventory).

**> Gate B — ✅ 2026-10-18** — status codes driven both ways. `curl`: dead car **404** · live car and inventory **200** · `/office/nonsense` signed out **307 → /office/sign-in** (the door; the signed-in 404 read in the browser). Browser, signed in: the dead car **404** with its view, chrome, ways forward (10/10 verdicts); `/office/nonsense` and `/office/car/nonsense-ref` **404** with the office view inside the office shell (11/11), neighbours intact, the site-wide not-found not merged. Witnesses: `notes/TASK-005-witnesses.md` §Gate B; drives `car-404.mjs`, `office-404.mjs` (readings in `runs/`).

### Phase 3 — The undo window

**Task 10 — The undo offer shows eight seconds draining** (M)
- **AC:** the offer carries a measure: a bar that starts full and empties to zero over **8000 ms**; the animation is the clock and its own end closes the offer; any timeout behind it is deliberately longer and is the failsafe, not the clock.
- **Verify:** live on the inventory: delete a throwaway demo car, keep the frame recording/measurement — bar starts full, reaches zero at ~8 s, offer closes; the timeout is longer and never wins first.
- **Deps:** — **Files:** `app/office/(shell)/inventory/inventory-client.tsx`, `app/office/(shell)/inventory/inventory.css`.

**Task 11 — The bar's mechanics are constrained** (S)
- **AC:** the motion forces no layout (`transform`, not `width`); the bar is `aria-hidden` (the offer's words carry the meaning); under reduced motion a static **"8 s"** label takes its place; the clock starts when the offer is **actually pressable**, not when the row leaves the list.
- **Verify:** live with reduced motion emulated (the static label, no animation) and without (smooth, no layout shift — measured); the start time recorded against the click time.
- **Deps:** 10. **Files:** `app/office/(shell)/inventory/inventory-client.tsx`, `app/office/(shell)/inventory/inventory.css`.

**Task 12 — The end of the window is true, and checked** (S)
- **AC:** when the eight seconds pass the offer goes and the deletion stands — undo is no longer offered, and the car is not restored by anything. Nothing hard-erases on a timer (SD10); the tombstone waits for the owner's own action. Watched, once, on a car that is safe to lose.
- **Verify:** live: create a throwaway demo car → delete → let the offer expire → undo is gone, the car is deleted (tombstone), the inventory lists it as waiting to be cleared. Net-zero: the throwaway is then removed and the store read back.
- **Deps:** 10, 11. **Files:** `app/office/(shell)/inventory/inventory-client.tsx`, `developer-workspace/notes/TASK-005-witnesses.md`.

**> Gate C — ✅ 2026-10-18** — live on a throwaway demo car (**TS-1046**, created through the office, deleted, expired, removed for good; net-zero **25 → 25**): the bar drained its full window (the animation's own clock read **8 000 ms** at its last mounted moment, `scaleX = 1 − elapsed/8000` at every sample, never a width) and the offer **closed at expiry** — the animation's own end t=12 666 vs the 12 000 ms failsafe due t=15 891, so the animation was the closer by 3.2 s; after the close `#undo` was hidden, the car a tombstone, and nothing restored it. Witnesses: `notes/TASK-005-witnesses.md` §Task 10–12 and §Gate C; drives `undo-bar.mjs`, `undo-mechanics.mjs`, `undo-expiry.mjs` (readings in `runs/`).

### Phase 4 — Dialogs and focus

**Task 13 — Every confirmation is the platform's dialog** (M)
- **AC:** every confirmation/modal uses native `<dialog>` + `showModal()` (trapping, Escape, naming hookup, top layer for free) instead of the custom `.ovl`/`.mdl` div; the accessible name is still supplied by us; the showroom's native gate is the precedent. Confirmations covered: car form delete, inventory delete, drafts delete, enquiry detail/delete, the site's two dialogues.
- **Verify:** live: each dialog is a `<dialog>` element with `showModal()` (DOM inspected), opens and closes on every screen; `npm run typecheck`.
- **Deps:** 2. **Files:** `components/office/Dialog.tsx` (new), `app/office/(shell)/car/car-client.tsx`, `app/office/(shell)/inventory/inventory-client.tsx`, `app/office/(shell)/drafts/drafts-client.tsx`, `app/office/(shell)/enquiries/enquiries-client.tsx`.

**Task 14 — Focus, scroll, name, Escape** (S)
- **AC:** focus enters at the first safe control and stays inside; it returns to whatever opened the dialog; Escape closes **that** dialog and nothing else; the dialog carries an accessible name; the page behind does not scroll.
- **Verify:** live, keyboard only: open each dialog with the keyboard, tab round (never leaves), Escape (closes one), focus back on the opener; the body behind does not scroll; the name is announced (accessibility tree read).
- **Deps:** 13. **Files:** `components/office/Dialog.tsx`, `app/(site)/car/[ref]/page.tsx`, `components/site/InventoryBrowser.tsx`, `components/site/HomeBehaviors.tsx`.

**Task 15 — Destructive actions named and ordered consistently** (S)
- **AC:** the safe action comes first, the destructive second; an action that can be undone is called **"Delete"**; **"Remove for good"** is reserved for one that genuinely cannot (deleting a draft is one).
- **Verify:** live + a read of every dialog: order and labels on car delete, inventory delete, drafts delete, enquiry actions, remove-forever.
- **Deps:** 13. **Files:** `app/office/(shell)/car/car-client.tsx`, `app/office/(shell)/drafts/drafts-client.tsx`, `app/office/(shell)/inventory/inventory-client.tsx`, `app/office/(shell)/enquiries/enquiries-client.tsx`.

**Task 16 — A tap outside closes only what is not destructive** (S)
- **AC:** a confirmation is never dismissed by a tap outside — on a phone that is the easiest accidental gesture there is; non-destructive sheets/dialogs still close on an outside tap.
- **Verify:** live, phone width: tap outside the delete confirm → stays; tap outside the non-destructive one → closes.
- **Deps:** 13. **Files:** `components/office/Dialog.tsx`, `app/office/(shell)/car/car-client.tsx`, `app/office/(shell)/inventory/inventory-client.tsx`.

**Task 17 — Focus survives a list change and a refusal** (S)
- **AC:** after a row is removed, focus is on the equivalent control of the next row, or on the list's heading where there is no next row; after a refused save, focus is on the first invalid field, or on the form's error block where the refusal is form-level.
- **Verify:** live, keyboard only: delete a middle row → focus on the next row's control; delete the last → focus on the heading; refuse a save (empty required field) → focus lands on that field; a form-level refusal → on the error block.
- **Deps:** 4, 13. **Files:** `app/office/(shell)/inventory/inventory-client.tsx`, `app/office/(shell)/car/car-client.tsx`.

**> Gate D** — live, keyboard only: every dialog is native, focus enters/stays/returns, Escape, no scroll behind, tap-outside rules, focus after a removal and after a refusal.

### Phase 5 — Inert controls

**Task 18 — The dead Search control goes** (S)
- **AC:** the office top bar's inert Search control is gone; the office top bar is not one of the places search lives — the keyword filtering already on inventory and activity **is** the search.
- **Verify:** live at phone width: no control in the top bar looks pressable and does nothing; inventory/activity filtering still works.
- **Deps:** — **Files:** `components/office/OfficeTopbar.tsx`, `app/office/(shell)/office.css`.

**Task 19 — The car form's delete really deletes, with the same undo** (S)
- **AC:** the car form's delete either really deletes, with the same undo offer the inventory's delete offers (same window, same bar, same restore), or it is not on the screen. "Car deleted (demo)." and the no-op handler are gone.
- **Verify:** live: delete a throwaway demo car from the form → the row leaves, the offer appears with the draining bar, undo restores it (confirmed by a full reload and a server read); expire the window on a second throwaway → it is a deletion.
- **Deps:** 5, 10, 12. **Files:** `app/office/(shell)/car/car-client.tsx`, `app/office/actions/car.ts`.

**Task 20 — The narrow-width More cell reaches three destinations** (M)
- **AC:** on a phone/tablet (<820 px) the More cell opens **Drafts, Activity log and Settings** — sidebar order (`OfficeNav.tsx`) and sidebar wording; the cell lights up on all three paths; inside, the matching row is marked current; it is a real control carrying an expanded state; the sheet takes focus, returns it on close, and closes on Escape, on a tap outside, or on a choice; its icon reads as "more things", not as Settings.
- **Verify:** live at 375 px and 768 px: all three destinations reachable, current marking on each, focus in/out, Escape/outside/choice all close; keyboard only.
- **Deps:** 18. **Files:** `components/office/OfficeBottomNav.tsx`, `components/office/MoreSheet.tsx` (new), `app/office/(shell)/office.css`.

**Task 21 — The showroom chat control behaves the same at every width** (S)
- **AC:** the showroom's nav chat control behaves the same way on every showroom page at the same width (today it is hidden on a car page, kept on home and inventory); nothing is lost — the floating control and the car page's own bar both remain.
- **Verify:** live at phone and desktop widths on home, inventory and a car page: the same behaviour on all three.
- **Deps:** — **Files:** `components/site/SiteFab.tsx`, `app/(site)/car/car.css`, `app/reference.css`.

**> Gate E** — live at 375/768/1280 px: More sheet paths and current marking; the dead Search gone; the car form's delete+undo real.

### Phase 6 — Empty states, the live region, wording

**Task 22 — An empty area says it once, then the one next action** (S)
- **AC:** an empty area says why it is empty first, then the one next action, in sentence case; the showroom's empty result says the promise **once** (today it prints the same promise twice — visibly and in the announcement); the office's existing empty wording stands and is not rewritten.
- **Verify:** live: the showroom with impossible filters — the promise appears once on screen; the office's empty states are byte-identical to before (diffed).
- **Deps:** — **Files:** `components/site/InventoryBrowser.tsx`.

**Task 23 — The live result is announced exactly once** (S)
- **AC:** the announcement carries the bare result, not the promise that follows it; the region is not created at the moment it must speak (it stays in the accessibility tree); the result's heading is not a second live region.
- **Verify:** live with the accessibility tree read: one announcement per change, containing the bare result; the heading is not live.
- **Deps:** 22. **Files:** `components/site/InventoryBrowser.tsx`, `app/(site)/car/[ref]/page.tsx`.

**Task 24 — The honest count, and clearing lives in the panel** (S)
- **AC:** the count is the honest count ("0 matching cars"); clearing the filters lives in the filter panel and is not duplicated beside the empty block.
- **Verify:** live: over-filter to zero → the count reads 0 matching cars and the clear control sits in the panel only.
- **Deps:** 22. **Files:** `components/site/InventoryBrowser.tsx`, `app/(site)/inventory/inventory.css` (or the site inventory stylesheet), `app/office/(shell)/inventory/inventory-client.tsx`.

**Task 25 — A refusal keeps its own voice** (S)
- **AC:** where an action is refused, the message keeps the field's own wording and capitalisation rather than being flattened into house style — a refusal quotes a rule the person must satisfy.
- **Verify:** live: refuse several different fields → each message is the field's own; `npm test`.
- **Deps:** 4. **Files:** `lib/car-form.ts`, `lib/car-input.ts`, `app/office/(shell)/car/car-client.tsx`.

**> Gate F** — live: the empty result once, one announcement carrying the bare result, the honest count, the unflattened refusals.

### Phase 7 — A car with no photos, and a photo that failed

**Task 26 — The no-photos box and the failed photo are the same box** (M)
- **AC:** both land in the framed box: no counter, no arrows, no thumbnails and **no machine text** (never `undefined`, never `NaN`, never "1 / 0"); a single photo reads "1 / 1" and has no arrows; the broken-at-load case is detected **as such** (an image that finished with no width), not only the no-photos case. The unused `components/Gallery.tsx` (dead code printing "No photo") is deleted or made the real gallery — decide once, record why.
- **Verify:** live: a car with no photos, a car with one photo, a car with a photo whose file is missing after load — all three inspected; `grep` proves no machine text path remains; no "No photo"/"1 / 0"/`NaN` string is reachable.
- **Deps:** — **Files:** `components/Photo.tsx`, `app/(site)/car/[ref]/page.tsx`, `app/(site)/car/car.css`, `components/Gallery.tsx` (delete or use).

**Task 27 — The empty photo box is a gradient from the car's ref** (S)
- **AC:** a gradient of different colours (never a flat grey); always the same colours for the same car; **never animated** (motion would promise a photo that is not coming); the same shape and size as a real photo so nothing shifts when moving between a photographed and an unphotographed car; marked decorative (the car's name is already beside it).
- **Verify:** live: two different cars → different gradients; the same car twice → identical; no layout shift measured between a photographed and an unphotographed car; the box is skipped by the accessibility tree.
- **Deps:** 26. **Files:** `components/Photo.tsx`, `components/PhotoBox.tsx` (new), `app/(site)/car/car.css`.

**Task 28 — The gradient is deterministic, and tested** (S)
- **AC:** the colours are derived deterministically from the car's reference code by a documented hash (same ref → same colours, forever), in `lib/photo-gradient.ts` with no randomness and no clock.
- **Verify:** `npm test` (new `lib/photo-gradient.test.ts`: same ref → same output; refs spread across the palette; no `Math.random`/`Date` in the module).
- **Deps:** 27. **Files:** `lib/photo-gradient.ts` (new), `lib/photo-gradient.test.ts` (new).

**⛔ Owner checkpoint B** — the gradient sample (two cars, one photographed vs not) rendered for sign-off.

### Phase 8 — The contact number, and a control that is off

**Task 29 — No invented number, no dead recipient (FIX-001)** (M)
- **AC:** with no number saved, no invented number appears anywhere — not in the site header/footer, not on either not-found page, not in the privacy notice — and no link is built to a recipient that does not exist. All five places (`02-named-gaps.md` §6) are changed; the car page's link is the one that currently dies rather than lies.
- **Verify:** live with the number cleared: `grep` finds no `2348000000000`/`+234 800 000 0000`; every visitor-facing surface shows no number and builds no `wa.me` link; with a number saved, all five show it again. `npm test` (`lib/phone.test.ts`, `lib/whatsapp…`).
- **Deps:** — **Files:** `app/(site)/layout.tsx`, `app/not-found.tsx`, `app/(site)/not-found/page.tsx`, `app/(site)/privacy/page.tsx`, `components/whatsapp.ts`.

**Task 30 — With no number saved, chat controls are visibly off** (S)
- **AC:** every chat control stays **on the screen** and is visibly switched off — greyed, clearly off, understood as off (owner's ruling, D16) — while a live-looking control that does nothing is exactly the fault being removed; no link is built; the disabled state carries its reason.
- **Verify:** live with no number saved (phone + desktop, home/inventory/car page): the controls are present, visibly off, not focusable as links, with a reason; with a number saved they are live again.
- **Deps:** 29. **Files:** `components/site/SiteFab.tsx`, `app/(site)/car/[ref]/page.tsx`, `app/(site)/layout.tsx`, `app/reference.css`.

**> Gate G** — live with the number cleared and restored: no invented number anywhere, chat controls visibly off, no dead recipient.

### Phase 9 — The store being unreadable

**Task 31 — A boundary inside each shell** (M)
- **AC:** a boundary sits inside each shell, so a page's own read failing keeps the chrome and puts the retry where the person is; the existing `app/error.tsx` and `app/office/error.tsx` **stay where they are** (a boundary cannot catch its own segment's layout, so removing them would lose the case they exist for).
- **Verify:** live: force a read failure on an office page and on a site page — the chrome survives and the retry is in the page; the outer boundaries still catch what they always caught.
- **Deps:** 2. **Files:** `app/office/(shell)/error.tsx` (new), `app/(site)/error.tsx` (new), `app/office/(shell)/office.css`.

**Task 32 — A store that cannot be read is never emptiness, never a number** (S)
- **AC:** the retryable state's wording is the settled one (the waking line and the retry line, verbatim); a read failure never renders as an empty list and never as a count; the interim strings are not treated as throwaway and are not replaced.
- **Verify:** live: force a read failure — the screen shows the retryable state, never "0 cars" and never an empty block; the exact strings are compared against `task.md:259-263` and match.
- **Deps:** 31. **Files:** `components/retryable.tsx` (verify only), `components/store-waking.tsx` (verify only), `app/office/(shell)/error.tsx`, `developer-workspace/notes/TASK-005-witnesses.md`.

**> Gate H** — live: a page's read failure keeps the chrome, shows the settled wording, and reports neither emptiness nor a number.

### Phase 10 — A slow store, and an offline person (the device draft)

**Task 33 — A slow navigation shows that something is happening** (M)
- **AC:** a slow soft navigation shows the waiting sign (approved copy) instead of a still screen for seconds; the clock is the store's own latency, and the sign does not flash on fast navigations; the URL and the person's place are unchanged.
- **Verify:** live against a slowed store (the 6-second hold observed in `05-runtime-observations.md` §R2.4 reproduced): the sign appears, then the page; on a fast navigation it does not flash.
- **Deps:** 2. **Files:** `app/office/(shell)/{inventory,car,enquiries,settings}/loading.tsx` (new), `components/office/OfficeNav.tsx`, `app/office/(shell)/office.css`.

**Task 34 — The showroom's offline line** (S)
- **AC:** the showroom shows the approved quiet line when the network drops; existing content stays visible; actions needing the network are disabled with the reason attached (not silently greyed); no cached showroom, no outbox.
- **Verify:** live offline (network disabled): the line shows, content stays, a network action is disabled with its reason.
- **Deps:** 2. **Files:** `components/site/OfflineNotice.tsx` (new), `app/(site)/layout.tsx`, `app/reference.css`.

**Task 35 — The office offline banner, and Save disabled with its reason** (S)
- **AC:** offline in the office shows the approved banner ("Offline, your draft is kept on this device."); Save is disabled with the reason attached, never silently greyed; the banner is conservative — slow to appear, quick to withdraw.
- **Verify:** live offline: the banner, the disabled Save with reason, and the withdrawal on reconnect; timings recorded.
- **Deps:** 36. **Files:** `components/office/OfflineBanner.tsx` (new), `app/office/(shell)/layout.tsx`, `app/office/(shell)/office.css`.

**Task 36 — The device draft store** (M)
- **AC:** a draft of unsaved typing is kept on the device (the owner's ruling), autosaved as the person types (debounced), for the **car form** and the **settings cards** — nothing on the enquiries board holds typing, so nothing there; the store holds **no customer data**; it mirrors `components/site/store.ts` (`ts-` prefix, try/catch, never throws); the car form's draft is captured as `FormData` (photo bytes never stored).
- **Verify:** `npm test` (new `lib/device-draft.test.ts`: round-trip, quota/throw safety, no PII keys, debounce rule); live: type in the car form and in a settings card → the draft appears in device storage and survives a reload.
- **Deps:** 2. **Files:** `lib/device-draft.ts` (new), `lib/device-draft.test.ts` (new), `app/office/(shell)/car/car-client.tsx`, `app/office/(shell)/settings/settings-client.tsx`.

**Task 37 — The draft comes back, and the recovery line is true** (S)
- **AC:** when the connection returns (or the page is reloaded) the draft is put back into the form, and the approved recovery line ("You're back online. Your draft is still here — press Save.") is true when it is shown: the draft is present and saving is the person's own action; nothing auto-queues or auto-sends.
- **Verify:** live: type → go offline → come back → the typing is in the boxes and the line is true; save → the draft is gone and the store read confirms the write.
- **Deps:** 35, 36. **Files:** `app/office/(shell)/car/car-client.tsx`, `app/office/(shell)/settings/settings-client.tsx`, `components/office/OfflineBanner.tsx`.

**Task 38 — A draft is erased only by an act** (S)
- **AC:** a draft is erased when the person **saves**, **discards**, or **signs out** — and in no other case: never by a clock, never by a count of days.
- **Verify:** `npm test` (the erase rules); live: save clears it; discard clears it; sign-out clears it; leaving it alone across a reload does not.
- **Deps:** 36. **Files:** `lib/device-draft.ts`, `app/office/sign-out/page.tsx`, `app/office/(shell)/car/car-client.tsx`, `app/office/(shell)/settings/settings-client.tsx`.

**Task 39 — The privacy notice keeps its promise** (S)
- **AC:** the privacy page's device-storage disclosure names the draft storage in the same plain way it already names the theme — one added line, nothing else.
- **Verify:** live: the privacy page reads correctly with the new line; no other copy changed (diffed).
- **Deps:** 36. **Files:** `app/(site)/privacy/page.tsx`.

**Task 40 — A draft is never a record, and holds no customer data** (S)
- **AC:** a device draft never counts as a record anywhere (SD13) and never carries a name, number or note (SD11) — proven, not asserted: the stored keys and the draft's own payload are inspected, and the assertion is a test.
- **Verify:** `npm test` (no PII-shaped keys in a car/settings draft); live: after typing in both forms, the device storage holds only form values, and no office count changes while a draft exists.
- **Deps:** 36. **Files:** `lib/device-draft.test.ts`, `developer-workspace/notes/TASK-005-witnesses.md`.

**⛔ Owner checkpoint C** — the offline drive shown live: the banner, the kept draft, the return, the erase-on-act.

### Phase 11 — Witness, gates, report

**Task 41 — The owner's rulings, written down** (S)
- **AC:** the widening and every ruling it unblocked are recorded as numbered rulings (Q11–Q18, as answered in the grilling) in `developer-workspace/notes/TASK-005-rulings.md`, cited from the plan and the report; the `task.md` "adds no feature" conflict is named there as the logged conflict it is.
- **Verify:** the file exists, numbered, each ruling traceable to what was built.
- **Deps:** — **Files:** `developer-workspace/notes/TASK-005-rulings.md`.

**Task 42 — Witness pass — benchmarks 1–11, driven live** (M)
- **AC:** each of `task.md`'s eleven outcome benchmarks is driven live against the build on `:3210` and recorded with what was seen and the numbers (re-measured against `05-runtime-observations.md` §R2.2 where numbers exist); the 8-second expiry is the one carried from Task 12; benchmark 12 (the first-time-visitor walk) is **not** run — it needs a person and is handed to `testing.md` as its own group.
- **Verify:** `developer-workspace/reports/TASK-005-witnesses.md` (evidence + numbers); every "not run" has its reason.
- **Deps:** all build tasks. **Files:** `developer-workspace/reports/TASK-005-witnesses.md`, `developer-workspace/notes/TASK-005-witnesses.md`.

**Task 43 — Gates, reconcile, net-zero** (S)
- **AC:** the learned order run on this tree — `npm run typecheck` → `npm test` → live witnesses → `npm run build` → `npm run leak-check`; the store is reconciled: every throwaway record gone, no demo leftover from this layer, real cars untouched.
- **Verify:** the four commands' output recorded; a store read showing zero `is_demo` rows created by this layer; `git status` showing only intended changes.
- **Deps:** 42. **Files:** `developer-workspace/notes/TASK-005-gates.md`.

**Task 44 — Report, and the handover to the testing pass** (S)
- **AC:** the report answers what was built, what was verified, what was not (with reasons), and carries the handover `testing.md` demands (which groups ran, which a person must run, the safe-to-lose-car check, re-measured numbers, failures quoted); the `task.md` "no feature" conflict and the flagged showroom offline line are named, not hidden.
- **Verify:** the report exists at `developer-workspace/reports/TASK-005.md` with a copy at `openspec/tasks/TASK-005/TASK-005-report.md`; every claim traceable to a witness or a command.
- **Deps:** 43. **Files:** `developer-workspace/reports/TASK-005.md`, `openspec/tasks/TASK-005/TASK-005-report.md`.

**⛔ Owner checkpoint D** — the closing report read before handover.

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| A store write wrapped "refuse instead of throw" also swallows a real defect. | High | Every wrap returns the store's own words; a refusal is never silent, and Gate A drives one live. |
| The change fact (no-op) leaks browser-side. | High | It comes only from the server's `changed` CTE; no browser hash is read (TASK-003 decisions 3–4). |
| Native `<dialog>` behaves differently from the plan's reading. | Med | Task 2 loads the current material before Task 13; the one existing native gate is the precedent. |
| The device draft becomes a second source of truth. | High | It is device-only, holds no customer data, never counts (SD13/SD11), and is erased by an act — enforced by tests (Task 40). |
| Offline is claimed wider than it is delivered (no service worker). | Med | Client-side only; the residual (hard reload offline) is recorded and reported (owner ruling Q16a). |
| The store is live and holds the owner's real data. | High | Throwaway demo-marked records only; destructive tests on copies; net-zero check in Task 43. |
| The approved showroom offline line tells the person to reload while offline. | Low | Kept verbatim (approved); flagged in the report, not rewritten. |
| A "fix" touches the Designer's do-not-touch list or the office empty wording. | Med | The office empty wording is diffed, not touched (Task 22); the do-not-touch list read before Phase 6. |

## Open questions

- **The first-time-visitor walk (Q-003)** stays with a person — handed to `testing.md` as its own group (Task 42/44).
- **The gradient sample and the two copy slots** await the owner at plan approval (copy sheet above) and at Checkpoint B (sample).
- **The showroom offline line's "Reload to see the site"** — flagged; no change made without the owner's word.

## Definition of done (standing bar, every task)

Typecheck clean · the focused tests pass · the live behaviour driven and recorded · no real data touched ·
the task's own acceptance criteria met, not assumed · the change committed with the task's name.
