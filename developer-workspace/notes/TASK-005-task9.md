# TASK-005 · Task 9 — a mistyped office address lands in the office

**Date:** 2026-10-18 · **Outcome:** done. **Depends on:** 8 (mechanism), 8a (the collision).

## What was wrong (baseline, read live first)

- `/office/nonsense` answered **404** but with the **showroom's** not-found: chrome-less, "Browse
  the inventory" — task.md's "An unknown `/office/…` falls into the showroom's 404."
- `/office/car/nonsense-ref` answered **200**: the office boundary's fallback streamed, then the
  client swapped in a not-found — again the showroom's. The office's own words never appeared.
- And one more, found while measuring: **`app/office/loading.tsx` swallowed every office redirect.**
  Signed out, `/office`, `/office/inventory`, `/office/car` all answered **200** and redirected only
  client-side. (The boundary pins the status at the first flush — Task 8a's discovery — and the
  session redirect is thrown below it.)

## What changed

1. **`app/office/(shell)/not-found.tsx`** (new) — the office view, approved copy-sheet words (I28):
   heading *"That page isn't in the office"*, body *"No office screen matches that address. Nothing
   was lost."*, one way out *"Back to the dashboard"* → `/office`. Gold + icon + words, never colour
   alone. It imports `office.css` itself — the shell's layout imports no CSS, so the boundary must.
   Styles `.nfx`/`.nfi` appended to `office.css`.
2. **`app/office/(shell)/[...rest]/page.tsx`** (new) — the catch-all route. It exists because an
   **unmatched** path never descends into a route group: with only the boundary in place,
   `/office/nonsense` still stopped at the root not-found, before the shell's session check even ran
   (measured). The page renders nothing: it checks the door (`requireOfficeSession`) and throws
   `notFound()`, and the boundary beside it draws the view inside the shell. Static siblings keep
   their precedence (`/office/sign-in`, `/office/account`, `/office/car/[ref]` — all re-checked).
3. **`app/office/loading.tsx` removed**, and the line moved to the pages' own segments — the
   dashboard via a `(dashboard)` group move (mirroring the site's `(home)` move in Task 8a), plus
   `inventory`, `activity`, `drafts`, `enquiries`, `settings`, `car/new`. **No line sits above
   `car/[ref]` or the catch-all** — those are what must answer statuses — so the car list, the car
   detail and the 404s carry no line (the accepted cost, exactly as on the site).
4. **The redirects came back.** Removing the boundary made the session check's own redirect real:
   signed out, every office address now answers **307 → `/office/sign-in`**, and `/office/car`
   answers **307 → `/office/inventory`** as its code always intended.

## Verified live (signed in as rema6rema6rema6@gmail.com, dev `:3210`, live store)

`office-404.mjs` (attach-only; `runs/office-404/live.json`) + one route sweep + signed-out curl.

| reading | value |
|---|---|
| `/office/nonsense` | **404** · the office view **inside the shell** (sidebar, topbar, *“Signed in as …”*) |
| `/office/car/nonsense-ref` | **404** · same view; URL keeps the ref |
| the view's words | *“That page isn't in the office”* · *“No office screen matches that address. Nothing was lost.”* · *“Back to the dashboard”* → `/office` |
| office routes (browser, one sweep) | `/office` 200 · inventory 200 · activity 200 · drafts 200 · enquiries 200 · settings 200 · car new 200 · car editor 200 — each with the shell, none showing the view |
| `/office/car` | followed to `/office/inventory` (the 307) |
| `/nonsense` (site) | **404** · *“We couldn't find that page”* · chrome-less · two row links + home link — **not merged** |
| signed-out curl | every office address → **307 → /office/sign-in** (`/office`, inventory, activity, drafts, enquiries, settings, car, car/new, car/nonsense-ref, nonsense, nonsense/deeper/still, account) · `/office/sign-in` → 200 |
| the waking line | present in the served HTML of `/office`, `/office/inventory`, `/office/activity`; absent from `/office/car/TS-1001` and both 404s |
| baseline (before) | `/office/nonsense` 404 with the showroom's view; `/office/car/nonsense-ref` **200**; `/office` + `/office/inventory` signed out **200** + client redirect |

`npm run typecheck` clean · `npm test` **295/295** · no Chrome launched (6 → 6).

## Not verified, and honest notes

- **The signed-in `curl -sI → 404` (the plan's verify line) can't be done by plain curl.** Clerk's
  dev instance refuses session cookies from outside a browser (`session-token-but-no-client-uat` —
  measured; the browser's own cookies were extracted and tried). The signed-in statuses were read
  from the browser's own response objects instead (Playwright `response.status()`), which is the
  stronger reading anyway. Signed out, curl sees the door (**307**) — the office rule honoured.
- **The 404 document's shape.** For both the office 404s and the site's car 404, Next answers with a
  router-payload document (`<html id="__next_error__">`): the status is in the headers and the tree
  renders client-side from the payload. Checked side by side (both bodies carry their view's markup
  only inside the payload). A no-JS client sees an empty document — true before this change too, and
  the office is behind Clerk in any case.
- **The line's visual flash** on office cold loads was not reproduced (the store was warm); its
  presence in the served HTML is the reading taken. The car list/detail cold-load waiting line is
  gone by design (the accepted cost).
- The office pages' titles are the root default (*“TrueSpec — cars you can trust”*) — the shell pages
  have no metadata of their own, before or after; the not-found inherits it too.
