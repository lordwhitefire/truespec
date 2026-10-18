# TASK-005 · Task 8 — a missing car answers a 404, its view unchanged

**Date:** 2026-10-18 · **Outcome:** done. **Depends on:** Task 8a (which removed the boundary that
made every `notFound()` a streamed 200).

## What changed

- `app/(site)/car/[ref]/page.tsx` — when `getPublicCarForView(ref)` returns nothing, the page calls
  `notFound()` instead of returning the view inline. Nothing else about the page changed.
- `app/(site)/car/[ref]/not-found.tsx` (new) — the boundary. A not-found boundary receives no props,
  so it reads the WhatsApp number itself (`getSetting`) and renders `NotFoundView`. The throw happens
  during the page's render, before the response streams, so the status is set from it.
- `app/(site)/car/[ref]/car-parts.tsx` (new) — `RelatedShell`, `CarLayers` and `NotFoundView`, moved
  **verbatim** out of `page.tsx`. The sold view (which stays in the page) and the boundary both use
  the shells; a boundary can import a module but not the page that threw. The markup, ids and words
  are unchanged.
- Metadata untouched: a dead ref still has the title *"Car not found | TrueSpec Automotive"*.

## Verified live (`car-404.mjs`, dev `:3210`, live store; `runs/car-404/live.json`)

| reading | value |
|---|---|
| `/car/TS-1001` (a car) | **200** · *“2021 Toyota Camry XSE V6 | TrueSpec Automotive”* |
| `/car/TS-1025` (the sold car) | **200** · *“That one found a new owner”* — the shared shells still render |
| `/car/TS-9999` (dead ref) | **404** · *“Car not found | TrueSpec Automotive”* |
| the view | crumbs *Home › Not found*; `h1` *“We could not find that car”*; the paragraph; **Message Umar** → `wa.me/2348146927170…`; **See all cars** → `/#cars` |
| the chrome and shells | `#site-header` ✓ · `#site-footer` ✓ · `footer#contact` ✓ · related ✓ · mobile bar ✓ · lightbox ✓ · overlay ✓ · both toasts ✓ · *“More cars”* |
| the URL | `http://127.0.0.1:3210/car/TS-9999` — the ref the person typed is kept; no redirect |
| `curl -sI` / `curl` | **404 / 404** on the dead ref; 200 on the live and sold refs |

**On “the ref the person typed is still shown”** — the plan's verify line. It is in the URL and in
the RSC payload, and was **not visibly rendered before this change either** (checked against the
pre-change render: the four occurrences were all in scripts). The change keeps the URL and does not
redirect; nothing that was visible was removed.

Typecheck clean · 295/295 · no Chrome launched (6 → 6).
