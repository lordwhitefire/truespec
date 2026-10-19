# TASK-005 · Task 35 — The office offline banner, and Save with its reason

**Date:** 2026-10-19 · **Outcome:** done. **Deps:** 36. **Files:** the plan's
`components/office/OfflineBanner.tsx` (new) and `app/office/(shell)/layout.tsx`; `office.css` is
unchanged (Files-line note in the plan).

## What was built

`components/office/OfflineBanner.tsx` (new, client) is mounted once in the shared office shell, above
`.shell`, so every office route carries the same line. It shows the approved words verbatim —
**“Offline, your draft is kept on this device.”** — and disables Save with that line as the attached
reason.

**The state is conservative, like the showroom's.** `navigator.onLine` is a link-presence hint, not
reachability, so the banner listens to the browser's `offline`/`online` events **and** observes
`window.fetch` for a real network `TypeError` (the wrapper rethrows unchanged). Either signal starts
a **1200 ms** timer; a successful fetch or an `online` event withdraws the banner immediately. A blip
never flashes it; a recovered connection never leaves a stale banner. The delay is a choice — no
number existed on disk — and is recorded here; the design requires “slow to appear, quick to
withdraw.”

**Every Save control is annotated in place.** A Save is a `<button>` whose visible text or
`aria-label` begins with “Save” (case-insensitive): “Save car”, “Save tagline”, “Save WhatsApp”,
“Save tank”. While the banner is up each one gets `aria-disabled="true"`, `tabindex="-1"`,
`aria-describedby="ts-office-offline"`, and the `ts-office-offline-save` class (grayscale, reduced
opacity, `not-allowed`). A document-level capture guard refuses a click and an Enter-submitted form,
so the only two ways to activate a Save cannot post while offline. The guard removes itself, and the
saved attributes/class are restored exactly, when the banner withdraws. **React keeps ownership of
each button's native `disabled` prop**; the banner never overwrites it, so a clean Save stays disabled
for its own reason and a dirty Save returns as soon as the line goes. This is the ARIA-disabled
pattern rather than a native `disabled` swap: the line is both the visible and the programmatic
reason, and the guard does the blocking.

**Presentation and the shell offsets.** The banner is a sticky, full-content-width 38 px line at
`top: 0`, `z-index: 45`, `role="status"`, `aria-live="polite"`; it is present but `hidden` online, so
the announcement is a text insertion, not a new live region. While it is up,
`html[data-ts-office-offline]` sets `--ts-office-offline-h` from the measured height and moves the
sticky `.side` and `.topbar` below it; reconnect removes the marker and the variable. The banner and
its styles are inline in the component, not in `office.css`: the shell imports no stylesheet and each
office page loads its own, so an `office.css` rule would not reach car, settings, drafts or inventory.

A `MutationObserver` watches only `childList` (never the attributes this component writes itself), so
a Save built later — a settings tab, a dialog — is caught without feeding its own annotation back
into the observer. This is also the fix for the first live run's wedged renderer.

## AC

- **Offline in the office shows the approved banner:** exact line at both widths and in the fetch-
  failure leg; `role=status`, `aria-live=polite`, sticky, 38 px, at the top while scrolled.
- **Save is disabled with the reason attached, never silently greyed:** annotated Save carries
  `aria-disabled`, `tabindex=-1`, `aria-describedby=ts-office-offline`, grayscale/`not-allowed`; a
  click and a form submit are refused; 0 server actions. React's native `disabled` is left alone.
- **Conservative:** appears after **1200 ms** (measured 1220–1287 ms across the legs), withdraws at
  once (19–85 ms); a successful fetch clears the fetch-failure signal; a reconnect clears the
  offline signal.
- **The line is true:** the Task 36 store held the car and settings drafts through the offline legs
  (`ts-draft:car:new`, `ts-draft:settings:tagline`); no server action was posted and the test removed
  its drafts afterwards.

## Live witness — offline at both widths, and a real fetch failure

Attach-only Chrome on `:9222` (UA has no Headless), public dev server `:3210`, signed in. The drive
typed; it never saved. Network disabled with `BrowserContext.setOffline(true)` after the page was
interactive. Test drafts removed at the end.

| surface | banner first | line / banner | Save | withdrawal |
|---|---|---|---|---|
| add car, 1440 × 900 | **1220 ms** | approved line; sticky `top: 0`; 38 px; full content width (1425 = `clientWidth`) | `aria-disabled=true`, `tabindex=-1`, `aria-describedby=ts-office-offline`, grayscale, `not-allowed`; click left `/office/car/new`, posted **0** actions, never said “Saving” | **74 ms** |
| add car, 375 × 800 | **1287 ms** | same; 38 px; width 360 = `clientWidth` | same; phone topbar at `top: 38px` (below the line); the side is hidden | **80 ms** |
| settings, 1440 × 900 | **1263 ms** | same | **3** card Saves annotated; clicking tagline Save left the path, posted **0** actions, and did not change the typed tagline | **85 ms** |
| fetch failure, 1440 × 900 | **1278 ms** | same, while `navigator.onLine` was **true** | car Save annotated; a refused `fetch` to `127.0.0.1:59999` produced the caught `TypeError`; a successful `fetch("/")` withdrew it | **19 ms** |

- **Scrolling:** at both widths the banner stayed at `top: 0` after scrolling to the bottom; the
  desktop `.side` stayed at the published `38px` and the phone `.topbar` at `38px`.
- **Reconnect:** the banner hid, `html[data-ts-office-offline]` and
  `--ts-office-offline-h` were removed, the desktop side / phone topbar returned to `top: 0px`, and
  the Save's `aria-disabled`, `tabindex`, class and `aria-describedby` were restored. The settings
  Save was `disabled=false` again (dirty) and the typed tagline was intact.
- **Drafts:** the car draft existed before and after the offline typing; the settings draft held
  `base` (the saved tagline) and the probe. Cleanup left **`[]`** `ts-draft:` keys.
- **Console/HTTP:** the failure leg's one browser log, `Failed to load resource:
  net::ERR_CONNECTION_REFUSED`, is the deliberately refused probe (the test's own signal); **0**
  unexpected console errors, **0** page errors, **0** HTTP errors. **0** server-action posts
  (`next-action`); the four non-GET requests were external and had no `next-action` header. Chrome
  **6 → 6** (no launch); store untouched.

Readings: `developer-workspace/scripts/task-005/runs/task35/task35.json`; drive `task35.mjs`.

## Files-line notes

- **`app/office/(shell)/office.css` is unchanged.** The shell layout imports no CSS and each office
  page loads its own self-contained stylesheet, so a banner/Save rule there would not reach car,
  settings, drafts or inventory. The styles live inline in `OfflineBanner.tsx` (the same reason the
  component's comment records), and the shell offset is the one `html[data-ts-office-offline]` rule.
- **`app/office/(shell)/layout.tsx` is owner-dirty** (the owner's TapNotice/TapBadge WIP). Only the
  Task 35 `OfflineBanner` import and its mount above `.shell` are staged; the owner's WIP is
  unstaged and intact.
- The 1200 ms gate and the `window.fetch` observation are choices in the component; the plan named
  neither number nor mechanism.

## Not verified / flags

- **No native `disabled` swap.** Save keeps React's native `disabled` and carries the ARIA-disabled
  state plus a capture guard. The AC's “disabled with the reason attached” is met and the click/
  submit refusal is live-proven; a screen-reader pass was **not** run, and the owner judges the look.
- **The first 1200 ms after a drop is not guarded** — that is the deliberate conservative delay; a
  Save clicked in that window is a real network attempt, not a queued one.
- The live drive exercised the add-car form and the tagline card; the other settings cards use the
  same annotation path and were counted (`saveCount=3`) but not clicked.
- The line is global to the office shell, including pages that hold no draft; the copy is the
  approved office line, not a per-page claim. The draft store itself is Task 36; restoring it into
  the form is Task 37.
- The preferred implementation was not run while the dev server was building; no `npm run build` is
  part of this task.

## Verified

Typecheck clean · `npm test` **309/309** · drive **PASS, 0 problems** · Chrome **6 → 6** · no server
action · no store write · only the two test drafts existed and were removed. Files:
`components/office/OfflineBanner.tsx` (new), `app/office/(shell)/layout.tsx` (Task 35 hunks only).
