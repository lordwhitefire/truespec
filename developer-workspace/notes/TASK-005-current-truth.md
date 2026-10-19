# TASK-005 — current truth for the surfaces this layer touches

**Loaded 2026-10-17**, before any code. Sources fetched live; the installed package read directly. Anything not
verified is marked **UNVERIFIED**. Environment: `truespec`, Next.js **15.5.27**, React 19.3.0.

This is the material the plan's tasks lean on. Where a fact below changes a plan decision, the decision is noted.

## 1. Native `<dialog>` / `showModal()` (Task 13, 14, 16)

Sources: MDN `HTMLDialogElement.showModal()`, `HTMLDialogElement: cancel event`, `::backdrop`; W3C WCAG H102;
whatwg/html issue #7732; Chromium issue 351867704; MDN `overscroll-behavior`. Baseline widely available since
March 2022 (Chrome 37+, Edge 79+, Firefox 98+, Safari 15.4+).

- `showModal()` puts the dialog in the **top layer**, creates **`::backdrop`**, makes everything outside it
  **inert** (blocks pointer/keyboard and hides from AT) — so **Tab cannot leave**: the trap is the platform's.
- Focus moves into the dialog (first focusable, or `[autofocus]`). **`close()` restores focus to the previously
  focused element automatically** (HTML spec; WCAG H102). → Task 14's "returns to whatever opened it" is free,
  but is still driven and checked (the pasted case: focus must return after the *offer* closes, too).
- Escape closes by default (fires a cancelable, non-bubbling `cancel`, then `close`).
- **Escape cannot be reliably hard-blocked** (we do not need to — the requirement says Escape closes *that*
  dialog): `preventDefault()` on `cancel` fails on a second Esc in Chrome (issue 351867704) and Chrome 126+ may
  skip `cancel` with no user activation. The declarative `closedby`/`requestClose()` route is **not Baseline**
  (Safari lacks it). **Decision:** do not fight Escape; do not build on `closedby`.
- **Clicking the backdrop does NOT close a dialog by default** — outside-tap closing is something a developer
  adds (`event.target === dialog`). → Task 16 is simpler than feared: destructive confirms get **no** outside
  handler (nothing to switch off); non-destructive dialogs get the explicit handler they need.
- **Background scroll is NOT locked by the platform** (mobile/iOS especially). **Decision:** lock with
  `body:has(dialog[open]) { overflow: hidden; }` plus `overscroll-behavior: contain` on the dialog (works on
  Chrome 144+ without JS; the `:has()` rule carries the rest) — checked live in Task 14.
- Accessible name: give it via **`aria-labelledby`** (pointing at the visible title) or `aria-label`. Never add
  `tabindex` to the `<dialog>` element.
- `<form method="dialog">` closes the dialog and sets `returnValue` **without submitting**; inside such a form a
  bare `<button>` defaults to `type="submit"` — **any non-closing button needs `type="button"`**.

## 2. Next.js 15.5 — `useLinkStatus`, `loading.tsx`, soft navigation (Task 33)

Sources: nextjs.org docs `useLinkStatus` (page updated 2025-09-02), `loading.js` (updated 2026-09-23),
`not-found.js` (updated 2026-10-06); installed `next@15.5.27`.

- `useLinkStatus()` returns `{ pending: boolean }`, must be called in a **Client Component rendered inside a
  `<Link>`** (context provider wraps only that link's subtree: `next/dist/client/app-dir/link.js:368-371`,
  hook `:375-377`). Outside a Link it returns the default — it does **not** throw.
- Docs prefer `loading.js` + prefetching over the hook; the hook is for inline feedback on a specific link.
- **A per-segment `loading.tsx` is the documented soft-navigation pending state** when the target segment's
  RSC payload (with the boundary) arrives. **Decision (Task 33, corrected live 2026-10-19):** the waiting sign is
  the clicked nav Link's `useLinkStatus` pending state (`NavLabel`, 400 ms delay, **“Loading…”** + spinner) inside
  `OfficeNav`/`OfficeBottomNav`; the per-segment `loading.tsx` is the full wait after a held payload lands (the
  existing cold-start state), not the sign. Live R2.4 hold (6 s of held RSC): the clicked Link reports `pending`
  for the whole hold while the URL/heading stay; the sign appears at ~0.5 s; the loading boundary appears only
  when the hold releases (~7 s) and the page at ~9 s. The earlier “optional garnish” reading was wrong for the
  held-RSC case.
- Caveat: `useLinkStatus` is fed by the Link's mounted instance, so before hydration it reads idle; wait for
  hydration before claiming a sign (the live drive waited 3 s in dev). A fast, prefetched navigation never shows
  the sign (the 400 ms gate); no loading UI is expected there either.

## 3. `navigator.onLine` (Tasks 34, 35)

Sources: MDN `Navigator.onLine`, `Window: online/offline event`; web.dev offline cookbook.

- It is a **link-presence hint, not reachability**: LAN-only counts as online; OS heuristics differ (Windows
  probes a Microsoft host). MDN calls it "inherently unreliable".
- **Decision:** the offline state is conservative — `navigator.onLine` **plus** a real fetch-failure signal
  (a caught network `TypeError`), slow to appear and quick to withdraw, exactly as the design plan requires.
  No feature is gated on `onLine` alone. (The approved wording is kept verbatim.)
- **Task 34 (built 2026-10-19):** either signal raises the line — the `offline` event / `onLine=false`,
  or a caught network `TypeError` observed by a pass-through `window.fetch` wrapper. A successful fetch
  or the `online` event withdraws it. The line shows after **1200 ms** and withdraws at once. Disabled
  actions carry the line as `aria-describedby`; the line and the block are on the derived state, so no
  feature is gated on `onLine` alone. No service worker, Cache Storage, or outbox.
- **Task 36 (built 2026-10-19):** the office keeps unsaved typing for the car form and the three
  settings cards under `ts-draft:` keys (400 ms debounce; `FormData` text only, photo bytes dropped;
  no customer/enquiry key; no server write). A draft survives a reload; it is not restored or erased
  until Tasks 37/38.
- **Task 35 (built 2026-10-19):** the office shell carries the approved line “Offline, your draft is
  kept on this device.” on either signal (`onLine=false` or a caught fetch `TypeError`), after
  **1200 ms**, and withdraws at once on `online` or a successful fetch. Save controls carry
  `aria-disabled`, `tabindex=-1`, and the line as `aria-describedby`; a document capture guard
  refuses click/submit, while React keeps the native `disabled` prop. The banner/Save CSS is inline
  in `OfflineBanner.tsx` because the shell imports no stylesheet; `office.css` is unchanged.
- **Task 37 (built 2026-10-19):** the car form and the three settings cards restore their device
  draft on mount only when the draft's `base` still matches the page/store and the value differs;
  restoring writes no draft and touches no store. The recovery line “You're back online. Your draft
  is still here — press Save.” shows in the same banner only after a shown offline line, when the
  form has announced a present draft (`data-ts-office-draft` + `ts-office-draft-presence`); it is
  **not** shown on a plain online reload. It stays until save/discard (Task 38) or leaving the form.
  The shell offset for the recovery line is `data-ts-office-recovered`; Save annotations are gone on
  reconnect.
- **Task 38 (built 2026-10-19):** a device draft is erased only by an act: a successful save
  (`res.ok`, including “Nothing changed.”), the car’s Cancel (discard), or sign-out. The erase
  cancels the pending debounced write first; leaving/reload does not erase; there is no clock/day
  count. `clearDrafts()` removes only `ts-draft:` keys (theme and other keys stay) and is used by the
  sign-out page, which is also the session-expiry landing; the car and settings clients remove their
  own keys. The recovery line is taken down by the same act.
- **Task 40 (built 2026-10-19):** the device draft's payload is the car form's own fields and the
  settings card's `{base, value}`; no customer/enquiry key or record exists. The car's own
  `arrivalNote`/`privateNote` are car columns, not customer notes; no photo bytes are stored. Live,
  the inventory count was unchanged (`25 cars — 24 in stock, 1 sold`) while both drafts existed;
  0 server actions. `npm test` 311/311.

## 4. `prefers-reduced-motion` (Task 11)

Sources: MDN `prefers-reduced-motion`; web.dev. Baseline since January 2020.

- The repo already kills motion globally in every office stylesheet (`*{animation:none!important;
  transition:none!important}`) and that is **acceptable**.
- But motion removed must not remove **meaning**: where a value is carried by movement, a **static alternative**
  is required. → Task 11: under reduce, the bar is replaced by a static **"8 s"** label (which is also the
  failsafe clock).
- JS query, if needed: `matchMedia('(prefers-reduced-motion: reduce)')`. `PreferenceManager.reducedMotion` is
  experimental — not used.

## 5. `notFound()` and a dynamic segment's params (Tasks 8, 9)

Sources: nextjs.org docs `not-found.js` (updated 2026-10-06), `notFound()` (2026-09-23); installed source.

- `notFound()` **before streaming starts** → the response is **404** (after streaming starts the status stays
  200 with the not-found UI). Unmatched routes are handled at the routing level (root/global not-found) and
  answer **404**.
- A not-found component receives **no props**. To read the dynamic segment, a **Client Component** inside a
  co-located `not-found.tsx` calls `useParams()`: `PathParamsContext` is provided at the router level
  (`app-router.js:460`, value from `getSelectedParams` `:370-372`), above the LayoutRouter tree where the
  not-found boundary renders (`layout-router.js:369,485`; `http-access-fallback/error-boundary.js:57-75`), so
  the current URL's params are readable for a URL that **matched** `[ref]`.
- **UNVERIFIED (empirical)** — source-derived, not runtime-tested, and the docs do not state it. **Decision:**
  Task 8 drives it live (`curl -sI` for the status; the browser for the view and the ref shown) before the change
  is called done. If it does not hold, the fallback is a `not-found.tsx` that reads the ref from the URL itself.

## 6. What this changes in the plan

- Task 13/14/16: dialog facts above (no fighting Escape; no outside handler on destructive; explicit scroll lock).
- Task 33: the sign is the clicked Link's `useLinkStatus` pending state; the per-segment `loading.tsx` is
  the full wait after a held payload lands (corrected live 2026-10-19).
- Task 8: the `useParams` route is a **high-confidence but unverified** path — it is driven live, not assumed.
- Tasks 34/35: offline state = `onLine=false` **or** a caught fetch `TypeError`, conservative timing; the
  approved line is the reason; no cache, no outbox.

## 7. Skill check (recorded, per the plan)

This layer drives a real browser. Installed and standing: `developer-workspace/procedures/browser-check.md`
(attach-only CDP `:9222`, build `:3210`, reference `:3211`, never `:3000`, no screenshots) on top of the
`runtime-divergence` method, with `playwright-core` present. The `browser-testing-with-devtools` skill covers the
same ground via Chrome DevTools MCP; it is **not installed here** and is not required for this layer's checks —
raised with the owner, not installed unasked.

**Environment note (2026-10-17):** the automation Chrome is **not** listening on `:9222`, and the reference server
is down. Per the standing procedure the Chrome is **attach-only — never launched by us**. Live checks are blocked
until it is up; the build server (`next dev -p 3210`) was started and answers 200.

**Update (2026-10-19):** the owner's laptop lost power during Task 34 research. Per the owner's explicit
instruction the dev server and the visible Chrome were restarted: the server answers 200 on `:3210`, and
Chrome 149 is on CDP `:9222` with no Headless. The attach-only rule is in force again — the harness
attached and the tab count was unchanged (**6 → 6**); the launch was the owner's recovery instruction,
not the harness's. The reference server `:3211` is still down.
