# TASK-005 · Task 34 — The showroom's offline line

**Date:** 2026-10-19 · **Outcome:** done. **Deps:** 2.

## What was built

`components/site/OfflineNotice.tsx` (new, client) mounts above `#site-header` in the site shell. It
shows the approved quiet line — **“You are offline. Reload to see the site.”** — when the showroom is
offline. It caches nothing, queues nothing, and replaces nothing: no service worker, no Cache
Storage, no outbox; existing content stays exactly where it is.

**The state is conservative.** `navigator.onLine` is a link-presence hint, not reachability, so the
notice listens to the browser's `online`/`offline` events **and** observes `window.fetch` (the
wrapper rethrows unchanged) for a real network `TypeError`. Either signal raises the line; the
`online` event or a successful fetch withdraws it. It appears after **1200 ms** — a blip does not
flash a line — and withdraws at once. No numeric delay existed on disk; this is the chosen value,
recorded here.

**The line is the reason.** While offline, every `a[href]` that needs the network (pages, car pages,
the WhatsApp links, the footer links) is annotated in place with `aria-disabled="true"`,
`tabindex="-1"`, `aria-describedby="ts-offline-notice"`, the `ts-offline-action` class,
`data-ts-offline`, and a grayscale / reduced-opacity / `not-allowed` style. Same-page hash links,
`mailto:`/`tel:`, and local controls (theme, filters, carousel) are untouched. A document-level
capture guard blocks the activation itself and stops propagation, so the WhatsApp gate's own
listener sees `defaultPrevented` and does not open; a `MutationObserver` catches controls built after
mount. The gate's **Continue** is the one network button: it carries `data-ts-network`, is disabled
natively with the same reason. An already-open gate is closed when the line appears, so the line is
what the person sees rather than a greyed Continue behind a modal.

**Presentation.** The line is sticky at the top (`top: 0`, `z-index: 35`, 38 px) and
`html[data-ts-offline] .nav { top: 38px }` keeps the sticky nav below it, so the reason is visible
wherever the person is when the line appears. Light/dark use the existing `--lt` / `--ink` / `--line`
tokens. The line is `role="status"`, `aria-live="polite"`; it is present but hidden while online, so
the announcement is a text insertion, not a new live region.

## Live witness — offline at both widths, and a real fetch failure

Attach-only, the public showroom, read-only. Network disabled with
`BrowserContext.setOffline(true)` after the page was interactive; the gate was opened online first,
then the network was dropped under it.

| width | line first | exact words / semantics | gate | disabled action / reason | content | withdraw |
|---|---|---|---|---|---|---|
| 375 | **1325 ms** | **“You are offline. Reload to see the site.”** · `role=status` · `aria-live=polite` · sticky · 38 px | opened online, **closed** when the line came; Continue `disabled=true` | chat `aria-disabled=true`, `tabindex=-1`, `aria-describedby=ts-offline-notice`, `ts-offline-action`, grayscale, `not-allowed`; the footer privacy link the same | header, footer, main visible | **9 ms** |
| 1440 | **1291 ms** | same | same | same | same | **11 ms** |

- **A blocked chat action:** the URL stayed `/`, no tab opened, the gate did not open, and **0**
  `/api/tap` requests were sent. The blocked footer privacy link also left the URL `/`; after
  scrolling to the bottom the sticky line was still at `top: 0`. The local theme toggle still
  changed the theme (`light→dark` at 375, `dark→light` at 1440) with the line up.
- **Withdrawal:** reconnect hid the line in **9/11 ms**, removed `html[data-ts-offline]`, restored
  the nav to `top: 0px`, restored the chat link (`aria-disabled`/`tabindex` absent, class removed)
  and the gate Continue (`disabled=false`); the gate opened again online.
- **The second signal:** while `navigator.onLine` was **true**, one same-origin `/api/tap` fetch was
  aborted in the tab (`net::ERR_FAILED`); the line appeared at **1305 ms** with the exact words. A
  fulfilled **204** fetch then withdrew it in **102 ms**. This is the caught network `TypeError`
  path; the request never reached the server.
- **No cache, no outbox:** `navigator.serviceWorker.getRegistrations()` **0**; `caches.keys()`
  **`[]`**; no outbox/queue key in localStorage/sessionStorage. The site's existing `ts-known`,
  `ts-lastcar`, `ts-seen`, `ts-visits`, `ts-theme`, and session `ts-toast` are its UI state, not a
  showroom cache and not a queue. The only `/api/tap` requests in the whole run were the two
  intercepted failure-leg fetches; the offline legs sent none.
- **Console/HTTP:** 0 console / 0 HTTP on the offline legs; the failure leg's **one** expected
  `Failed to load resource: net::ERR_FAILED` is the deliberately aborted request. Store untouched;
  Chrome **6 → 6** (the owner's visible Chrome; no launch).

Readings: `developer-workspace/scripts/task-005/runs/task34/task34.json`; drive `task34.mjs`.

## AC

- **The approved quiet line shows when the network drops:** exact copy at 1325/1291 ms; offline event
  and the real-`TypeError` path both driven.
- **Existing content stays visible:** header, footer, and main all visible with the line up; the line
  only shifts the chrome down by its 38 px.
- **Actions needing the network are disabled with the reason attached:** every network `a[href]` and
  the gate Continue carry `aria-disabled` / native `disabled` and `aria-describedby` pointing at the
  visible line; the blocked activation cannot navigate or open a tab; local controls still work.
- **No cached showroom, no outbox:** 0 service workers, 0 caches, no queue keys, 0 offline tap
  requests.
- Both widths: 375 and 1440.

## Files-line notes

- **`components/site/WhatsAppGate.tsx` is an extra file.** Its Continue is a `<button>` that needs the
  network; the AC's “actions needing the network” covers it. It carries `data-ts-network`; the notice
  disables it natively with the line as its reason and closes an already-open gate when the line
  appears. The AC governs over the plan's three-file Files line.
- The sticky placement and the 38 px nav offset are in `app/reference.css`; the 1200 ms delay and the
  `window.fetch` observation are in `OfflineNotice.tsx`. The plan did not specify either; both are
  recorded here.
- There is **no separately approved per-action reason**. The approved line is the visible reason and
  the `aria-describedby` target; no new copy was invented.
- The approved line is kept **verbatim**, including “Reload”. With no cached showroom, reloading while
  still offline cannot fetch the site; this copy conflict is **flagged for the final report** (plan
  432/439). The copy was not changed.
- The failure leg's aborted fetch necessarily logs one browser network error; it is the test's own
  signal, not a product error. The offline legs logged none.

## Not verified / flags

- The line's look was read live (computed styles + both themes), not judged by the owner; the owner
  checks the look by hand.
- The semantics were driven in the DOM (`role`, `aria-live`, `aria-describedby`); a screen-reader
  pass was not run.
- A page cannot be loaded fresh while offline (the showroom has no cached page); the line covers a
  showroom already open when the network drops.
- `navigator.onLine` remains an OS hint; the conservative 1200 ms and the fetch-failure signal are the
  answer, not a claim of certainty.

## Verified

Typecheck clean · `npm test` **304/304** · drive **PASS, 0 problems** · Chrome **6 → 6** · store
untouched · 0 service workers / 0 caches / no outbox · offline legs 0 `/api/tap` requests. Files:
`components/site/OfflineNotice.tsx` (new), `app/(site)/layout.tsx`, `app/reference.css`,
`components/site/WhatsAppGate.tsx` (extra; one attribute). Note, witnesses §Task 34, plan row 34.
