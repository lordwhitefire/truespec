# TASK-005 · Task 8 — blocked: the honest 404 collides with the store-waking boundary

**Date:** 2026-10-18 · **State:** work built in the tree, **uncommitted**; no plan row ticked.

## What was built (and is correct)

`app/(site)/car/[ref]/page.tsx` now throws `notFound()` when the car is missing; the view moved
verbatim into `app/(site)/car/[ref]/car-parts.tsx` (`RelatedShell`, `CarLayers`, `NotFoundView`) and a
co-located `app/(site)/car/[ref]/not-found.tsx` renders it, reading the WhatsApp number itself. The
dead ref renders **the same view** — crumbs *Home › Not found*, *"We could not find that car"*, the
same paragraph, *Message Umar* + *See all cars*, the related shell, the mobile bar, the lightbox, the
overlay and the toasts — the chrome (`#site-header`, `#site-footer`, `footer#contact`) is kept, the
title is intact, and the URL keeps the typed ref. Typecheck clean; 295/295.

**What it does not do: answer 404.**

| reading | dev `:3210` | production build (`next start :3211`) |
|---|---|---|
| `/car/TS-1001` (a car) | 200 | 200 |
| `/car/TS-1025` (the sold car) | 200 | 200 |
| `/car/TS-9999` (dead ref) | **200** (view renders) | **200** |

## The cause — proven by isolation

A throwaway probe route (`/probe-404/dead`, removed after the experiment) called `notFound()` in a
bare page, same tree, nothing else changed:

| probe | with `app/loading.tsx` | with it moved aside |
|---|---|---|
| async page, `notFound()` after `await params` | 200 | **404** |
| synchronous page, `notFound()` in the body | 200 | **404** |

`app/loading.tsx` (added by TASK-004, commit `7982435`, design **D18** — the store-waking line) is a
Suspense boundary above **every** route. Its fallback flushes while the page is still awaiting the
store, and Next fixes the status at the first flush: after that, `notFound()` can only stream a 200
with the not-found UI. This is the documented caveat ("before streaming starts → 404"), confirmed
here in **both dev and production**, not a dev artefact.

The boundary cannot simply move: its own note records why it sits at the root — `(site)/layout.tsx`
awaits `getSetting()` / `getPublicCars()` for the chrome, and a `loading.tsx` beside a layout never
covers that layout's own read. **The (site) layout's read is the public site's waking line.**

**It also affects Task 9:** `/office/car/nonsense-ref` is a *matched* office route under
`app/office/loading.tsx`, so its `notFound()` would stream a 200 too. (Only unmatched URLs —
`/office/nonsense` — get a true routing-level 404.)

## The fork (no framework mechanism escapes it)

A server-rendered waiting state requires a Suspense boundary **above** the waiting page; a real 404
requires the page's throw **above** every boundary. Both cannot hold for the same route.

| # | Option | Cost |
|---|---|---|
| **1** | **Keep the 404; move the site's waiting line one level down** — `(site)/layout.tsx` stops awaiting the store (reads move into Suspense-wrapped parts), `app/loading.tsx` becomes per-segment `loading.tsx` files. The car detail gets no boundary, so its cold load shows nothing until the store answers. | medium refactor of TASK-004's mechanism; waking line lost **only** on the car detail's cold load; plan needs a task for it |
| **2** | Keep the boundary as built; a dead car keeps 200 + an explicit `noindex` signal | fails Call 4(a) as written ("404, with the helpful view and the chrome kept"); link checkers still see 200 |
| **3** | Decide the status at the HTTP layer (middleware existence check, self-fetch + re-status) | DB in middleware, a proxy hack, a second render; not recommended |

**Recommendation: option 1.** The architect's outcome is explicit and permanent (dead links must stop
looking healthy); the waking line is a cold-load nicety that survives everywhere except the one route
whose status has to be honest. The mechanism is ours, the outcome is the architect's — so the call to
change D18's placement is the owner's / architect's, not a silent Builder choice.

## In the tree, awaiting the ruling

- `app/(site)/car/[ref]/page.tsx` — modified (throw + helpers moved out)
- `app/(site)/car/[ref]/car-parts.tsx` — new
- `app/(site)/car/[ref]/not-found.tsx` — new
- `developer-workspace/scripts/task-005/car-404.mjs` — the drive, ready to run once the status is real

Nothing is committed; no live write was made; the production probe server was stopped.

## Resolved — 2026-10-18, the owner's ruling

The owner chose **option 1**: the 404 stays; the waiting line moves down a level. Implemented as
**Task 8a** (`notes/TASK-005-task8a.md`). `app/loading.tsx` is gone; the `(site)` layout renders
synchronously and its store reads stream as Suspense islands; the waking line lives on the home and
inventory segments; the car route has no boundary above it, so its `notFound()` is a real 404. The
three rejected options and their costs stand above as the record of what was weighed.
