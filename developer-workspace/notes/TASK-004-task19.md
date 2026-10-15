# TASK-004 · Task 19 — the tap, the notice, and the office badge

**Date:** 2026-10-15 · **Status:** built and verified; five gates green · **Owner ruling taken** (the
notice's shape and the `/privacy` correction) — no other stop was needed.

The authority: `openspec/tasks/TASK-004/task.md` truth 8 (what a tap is), line 253 (no GET changes
data; no write skips the origin check), `openspec/tasks/TASK-004/testing.md` §9 (what a wrong figure
fails), and `product-management/ux-plan.md` Q77 (the office hears about a tap by a badge and a list —
never a popup, an alert or a sound).

---

## What the shape is

A buyer's WhatsApp tap is **three facts and no person**: the page, the car's code and the time. That
is not a slogan here — it is the table (four columns, one of them the generated key), the allowlist,
and the witness.

- **`lib/tap-rules.ts`** (pure, unit-tested) — `readTap` reads `page` and `carRef` out of whatever
  arrives and **ignores every other key**, so a name, a number, a message or an address has nowhere to
  go. `isTapPage` accepts a *path* and refuses an address (`https://…`, `//evil`, a scheme, a
  colon). `carRefInPath` is the one place that knows a car page's address gives the car
  (`/car/TS-1001` → `TS-1001`), so the browser and the server agree by construction.
- **`lib/tap.ts`** (server-only) — one `INSERT` naming `page` and `car_ref` and **never `at`**: the
  third fact is `DEFAULT now()`, so the time is the store's and no caller can set it, least of all a
  wrong client clock.
- **`lib/origin-rules.ts`** (pure, unit-tested) — the one same-origin rule. It is a **CSRF guard, not
  authentication**: a browser will not let another site's page send our `Origin`, so this stops a
  third party inflating taps; any other client can send any header it likes. It trusts `Host` only —
  `x-forwarded-host` is deliberately not consulted, because a caller can set that too and naming both
  as its own would walk through the check.
- **`lib/store-guard.ts`** gained **`storeQueryOnce`** — the one store call deliberately **not**
  retried. Every other write in this layer is idempotent (it lands on a conflicting key or updates a
  row by id), so a lost reply cannot apply twice; a tap has no such key. Retrying it would count one
  buyer's tap twice, and `testing.md` §9 fails a figure "counting taps the office never received".
  It lives beside `storeQuery` so `db()` still has exactly one holder under `lib/`.
- **`app/api/tap/route.ts`** — a Route Handler because the tap must work for a visitor with no
  session. It exports **`POST` and nothing else**, so Next answers 405 to everything else and "no GET
  changes data" holds by construction. It checks the **origin first**, then reads the body, then
  writes: 403 / 422 / 503 / 204.
- **`components/site/WhatsAppGate.tsx`** — the buyer's side, mounted in the site layout. **One
  document listener catches every `wa.me` link on the showroom** (header, footer, floating button,
  each car's button, the mobile bar — including the links built as markup by client behaviours), so a
  new WhatsApp button is behind the notice the day it is written.
- **`components/office/TapBadge.tsx`** — the count, on the sidebar's **Dashboard** item, hidden at
  zero. `getOfficeTapCount()` is `count(*) FROM tap`.

## The decisions made, and why

- **The figure is every tap the store holds** — no window, no "seen" mark. A window misses taps the
  office is holding; a "seen" mark needs state the store has not got, and the dashboard cannot mark
  taps seen on load because **no GET changes data**. The badge and the panel read the same record, so
  they cannot disagree.
- **Placement: the sidebar Dashboard item only, hidden at zero.** The mobile bottom bar is a fixed
  5-cell grid — a third child grows the bar over the bottom of every page — and the count is one tap
  away on the Home panel there. One line to reverse if the owner wants it on the phone too.
- **One listener, not six call sites.** The alternative (wrapping each CTA) could not reach the links
  `CarBehaviors` builds as HTML strings, and would need re-wiring for every new button.
- **Once per page load.** A client-side navigation keeps the layout, so the notice is not shown again
  within a visit; a fresh load shows it again. It is never *omitted* before a tap, which is what truth
  8 asks.
- **A modified click (Ctrl/Cmd) before the notice has been shown is left alone**, not hijacked: the
  buyer asked for a background tab, and missing that one tap is better than breaking the gesture.
- **The buyer is never blocked by our bookkeeping.** The record is a fire-and-forget `keepalive`
  request that is not awaited; if the store refuses, the buyer still reaches WhatsApp.
- **A buyer with no JavaScript is not stopped** — the link is a real `wa.me` link and still goes
  there, without the notice and without a record. The same trade the gallery and the lightbox make.

## The owner's ruling (2026-10-15)

1. **The notice is the short form** — the three facts in plain words, a link to the full notice,
   Continue / Cancel. Not the whole privacy page in a dialog.
2. **`/privacy` is corrected in the same change** — in **four** places, not the three I asked about:
   `#collect` (a WhatsApp-tap bullet), `#whatsapp` (the tap is recorded before you leave), `#retention`
   ("We store no browsing data beyond that tap record — no name, no number, no message, no address"),
   and the **"The short version"** paragraph at the top, which also claimed the only things stored
   were settings in the buyer's own browser and would have been left false. **Flagged for the owner:**
   that fourth place is an addition beyond the three named; and the **"Last updated: 4 October 2026"**
   line was **left alone** — that date is the owner's, not mine.
3. The notice's sentence is the owner's, with **one parenthesis added** so it stays true on the footer
   and home links, where no car is involved: "the car's code **(when you tap on a car)**". Flagged for
   the owner to strike if he would rather not have it.

## Verified

| what | how | result |
| --- | --- | --- |
| three facts and nothing else | `scripts/task-004/tap-check.ts` against the live store | **24/24** |
| the notice before the tap, the row after Continue | `scripts/task-004/whatsapp-gate-check.mjs` in the real Chrome on `:9222` | **20/20** |
| the badge at each count | `scripts/task-004/tap-badge-check.ts` rendering the real component | **9/9** |
| the rules | `lib/tap-rules.test.ts`, `lib/origin-rules.test.ts` | part of **187/187** |

The tap witness drives the **real handler** and the **real write** (not copies of their SQL), and
asserts: the row's columns are exactly `id, page, car_ref, at` and so is the table's; the time is the
store's, stamped at the write; `getOfficeTapCount()` equals the table's `count(*)`; a POST with no
`Origin` is 403 and writes nothing; another origin is 403; a same-origin POST is 204 and writes the
page and the reference; a POST carrying a name, a number, a message, an address and an IP is accepted
and **none of them survive**; a bad page and a bad reference are 422; the origin is checked **before**
the body; the module exports no `GET`. It removes exactly the rows it created and asserts the store is
the size it was.

The browser witness, attach-only on the owner's Chrome (never launched one, 6 → 6), shows the notice,
proves **nothing is recorded before the buyer continues**, proves the row that then lands is
`/car/TS-1001` + `TS-1001`, proves a later tap on the same page records **without** a second notice,
and proves a footer tap on the home page records `/` with no car. `window.open` is captured rather
than followed, so no WhatsApp tab is left in the owner's browser; the button's own `href` is checked
separately, so the no-JavaScript path is still a real link.

Five gates in the learned order: `leak-check` **PASSED** (26+ public routes, no leak), `typecheck`
clean, `test` **187/187**, `build` green (`/api/tap` a dynamic route), `store-freshness` **PASSED**.

## Not verified — said plainly

- **The office shell as a rendered screen.** The office is behind Clerk and the developer holds no
  office session (the probe lands on `/office/sign-in`), so the badge on the sidebar was proved as a
  component and by typecheck — **not by looking at it**. Same gap as Checkpoint B; the owner's own
  signed-in browser is where that look happens.
- **The real new-tab opening** of WhatsApp: captured, not followed (to leave the owner's browser
  clean). What is proved is that continuing calls `window.open` with the right `wa.me` address.
- **The store's answer when it refuses a tap** (the 503 path) was not forced in a live handler call;
  its shape is the same `storeQueryOnce` the refusal test covers.

## Also worth knowing

- `lib/store-guard.ts` now has two entry points, and the reason the second one exists is written on
  it: **a tap is an event, not a state** — the retry story for every other write here does not apply.
- The site layout stays CSS-free (its own documented rule), so the badge is styled inline, like the
  shell's existing sign-out control; the notice's styles went into `app/globals.css`, which is the
  site's own stylesheet.
- The tap is the **first write on this site a visitor can perform**, and the first Route Handler in
  the project — the pattern (origin first, allowlist, no GET) is now written down for Task 22's
  export download, which will be the second.
