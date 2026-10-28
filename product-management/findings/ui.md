# UI findings — surfaces, layout, states

Read-only, from source. No browser was opened. Severity per `INDEX.md`.

---

## UI-001 — Four social links go nowhere
**Severity:** minor · **Status:** open
**Evidence:** `app/(site)/layout.tsx:198` (header Instagram), `:261`, `:273`, `:277` (footer Instagram, Facebook, YouTube).
**What the code does:** every one is `<a href="#">`.
**What should happen:** either a real destination, or the icon is not there.
**On a phone:** tap each icon. The page jumps to the top. Nothing opens.

## UI-002 — Theme toggle: wrong first paint, wrong label
**Severity:** polish · **Status:** open
**Evidence:** `components/ThemeToggle.tsx:7` initialises `"dark"`, `:9-12` reads storage only after mount; `:24` `aria-label="Toggle dark mode"` regardless of current theme.
**What the code does:** first render is always dark; a light-mode user sees a one-frame dark state and a sun icon, then it corrects. The accessible name never says which way the toggle goes.
**On a phone:** set light, reload, watch the header icon and page flash.

## UI-003 — Status chip appears in one view and not the other
**Severity:** minor · **Status:** open
**Evidence:** `components/site/car-view.ts:14-19` returns `null` for a plain `available` car (no "was" price). `components/site/ReferenceCard.tsx:15` therefore draws no chip on grid cards. `InventoryBrowser.tsx:668-672` `sectionChip()` always returns "Available" for the list row.
**What should happen:** the same car should describe itself the same way in grid and list.
**On a phone:** find an Available car, switch grid → list. A chip appears that was not there.

## UI-004 — "Landed this year" tab disagrees with the section rule
**Severity:** minor · **Status:** open
**Evidence:** `lib/sections.ts:112-123` `presentedSections()` adds `landed` for an `available` car flagged `isNewArrival`. `components/site/HomeInventory.tsx:51` filters the Landed tab by `c.section === "landed"` only.
**Effect:** a new-arrival car that is `available` is counted in "of which N new arrivals" (when it is `landed`) but the tabs use two different definitions of the Landed group.
**On a phone:** compare the "Landed this year" tab count with the "of which N new arrivals" note on the Available tab.

## Notes on layout (not defects, worth checking on the phone)
- Public cell matrix in the standing procedure is `560/820/1100`; **no 390**. Anything only breaks at phone width is outside the existing procedure.
- Car page photo strip is horizontally scrollable; thumbnails are buttons, so they should be reachable by touch.
- The mobile bar (`#mbar`) appears only when the price card leaves the viewport (`CarBehaviors.tsx:334-340`) — verify it does not cover the footer or the WhatsApp gate.
- Home hero auto-rotates every 5.5s and pauses only for `prefers-reduced-motion`, not on touch (`HeroSlider.tsx:13-18`). A user reading a slide can have it swap underneath them.

## UI-005 — "Newest first" does not sort anything
**Severity:** major · **Status:** open
**Evidence:** `components/site/InventoryBrowser.tsx:116-118` sorts only for `low`, `high`, `year`; the default `new` leaves the array as received. `lib/public-cars.ts:34` returns `ORDER BY c.ref`. Office: `app/office/(shell)/inventory/inventory-client.tsx:164-172` and `lib/office.ts:139` — same shape.
**Effect:** `ref` comes from an ascending sequence, so the default labelled **Newest first** shows the **oldest** cars first, on the public inventory and in the office. Choosing another sort and returning to "Newest first" cannot restore newest order either.
**Check on the phone:** open Inventory with no sort applied; confirm the top row is the highest `TS-####`, not the lowest.

## UI-006 — States cannot be reordered on a touch phone
**Severity:** major · **Status:** open
**Evidence:** `app/office/(shell)/settings/registry-editor.tsx:215-247` — reordering is HTML5 `draggable`/`onDrop` plus ArrowUp/ArrowDown in `onKeyDown` on a `role="button"` span. Touch raises no drag events, and a phone has no arrow keys.
**Effect:** the owner can add, rename, recolour and delete states on a phone but **cannot change their order**, which is the order the public filters and office chips use. The grip looks draggable and does nothing.
**Check on the phone:** press and hold a grip, drag — confirm whether the row moves.

## UI-007 — Deleting a state has no confirmation and no undo
**Severity:** minor · **Status:** open
**Evidence:** `app/office/(shell)/settings/registry-editor.tsx:288-289` — the trash button calls `actions.remove(row.id)` immediately.
**Effect:** an occupied state is refused by the store with a count (safe). An **unoccupied** state is deleted at once, permanently, on one tap — while every other destructive action in the office (car, draft) asks first. On a phone the trash sits next to the colour swatch.
**Check on the phone:** with an empty secondary state, tap trash once — confirm whether it disappears without a question.

## UI-008 — "The file named X, which is gone" survives choosing a new state
**Severity:** minor · **Status:** open
**Evidence:** `app/office/(shell)/drafts/drafts-client.tsx:147` — `stateGone` is derived from the card's original `stateId`; the local `choice` state at :322-325 does not clear it.
**Effect:** the warning is correct when the card opens and wrong the moment the owner picks a replacement, but it stays until save. It reads as if the new choice was not accepted.
**Check on the phone:** in a car draft whose file state was deleted, choose a new state and see whether the red warning clears.
