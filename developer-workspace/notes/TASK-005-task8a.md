# TASK-005 · Task 8a — the waiting line moves out from above the pages that answer a status

**Date:** 2026-10-18 · **Outcome:** done; the car page can now answer a real 404.
**Ruling:** owner, 2026-10-18 — option 1 of the three put to him: *the 404 stays; the waiting line
moves down a level.* The evidence that forced the choice is in `notes/TASK-005-task8-blocked.md`.

## What was wrong

`app/loading.tsx` (TASK-004, commit `7982435`, design D18) was a Suspense boundary above every
route. Its fallback flushes while the page is still awaiting the store, and Next fixes the status at
the first flush — so any matched route's `notFound()` could only stream a **200**. Proved in dev and
in a production build, and isolated with a throwaway probe page: with the boundary → 200, without it
→ 404, synchronously and asynchronously alike.

## What changed

1. **`app/(site)/layout.tsx` is no longer async.** The two store reads
   (`getSetting("whatsapp_number")`, `getPublicCars()`) now live in one `cache()`d function
   (`chromeData`), and the eight places that need them stream as their own islands behind
   `Suspense`: the phone number, the header's WhatsApp button, the ticker, the footer gallery, the
   footer's WhatsApp icon, the footer's WhatsApp button, and the floating button. The page
   (`{children}`) sits **between** those boundaries, never inside one.
   - Fallbacks are dimensionally the same as the resolved pieces (`<b>&nbsp;</b>` for the number —
     never the invented number — an empty `.tick` (CSS height 52 px), `.wab` spans with the same
     class and label, an `<a>` without href for the social icon; `null` for the floating button,
     which is fixed-position anyway).
   - `.gl` gained `min-height: 62px` so the footer gallery keeps its row while its photos stream in.
2. **`app/loading.tsx` removed.** The waking line now belongs to the segments that read the store:
   `app/(site)/(home)/loading.tsx` and `app/(site)/inventory/loading.tsx`, both rendering the
   existing `StoreWaking`.
3. **The home page moved** `app/(site)/page.tsx` → `app/(site)/(home)/page.tsx` (URL unchanged) so
   its `loading.tsx` could not sit above the car route. The car route deliberately has **no**
   `loading.tsx`: that absence is what lets its 404 be real, at the cost of no waking line on its
   cold load (accepted in the ruling).

## Verified live (dev `:3210`, live store)

| reading | value |
|---|---|
| `/` | **200** · initial HTML carries the waking line |
| `/inventory` | **200** · initial HTML carries the waking line |
| `/privacy` (no store read) | **200** · no waking line |
| `/car/TS-1001`, `/car/TS-1025` | **200** · no waking line |
| `/car/TS-9999` (dead ref) | **404** · `curl -sI` and `curl` agree |
| the chrome, before vs after | `#site-header`, `#site-footer`, `a.fab` **identical** — 1 578 / 2 406 / 215 chars, after removing React's `<!--$-->` markers and the ticker's active-line class. Snapshots: `runs/chrome-before/`, `runs/chrome-after/` |
| the number | `+2348146927170` — unchanged |

`npm run typecheck` clean · `npm test` **295/295** · no Chrome launched (6 → 6).

## Not verified

- The streamed *fallback* look on a genuinely cold store (the line is present in the HTML, but the
  seconds-long cold read was not reproduced for the chrome islands). The page boundary's line was
  observed in the HTML only.
- A soft navigation's fallback (Task 33's own subject).
