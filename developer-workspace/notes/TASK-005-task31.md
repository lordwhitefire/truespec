# TASK-005 · Task 31 — A boundary inside each shell

**Date:** 2026-10-19 · **Outcome:** done. **Deps:** 2.

## What changed

- **`app/(site)/error.tsx` (new).** A client boundary inside the site segment. A page under
  `(site)` that throws renders the settled `Retryable` with the boundary's `reset`; the site
  layout — header, footer, floating control — stays, so the retry appears in the layout's children
  between the chrome.
- **`app/office/(shell)/error.tsx` (new).** The same inside the office shell segment, so the
  sidebar/topbar, the main column and the signed-in identity survive and the retry sits inside
  `main.main`. It imports `./office.css`: the shell layout imports no stylesheet of its own (each
  page carries its own), so the boundary must carry the shell's.
- **`app/office/(shell)/office.css`.** One scoped rule,
  `.main > .ts-store-state{min-height:0;padding:48px 24px}` — the shared state brings a
  viewport-tall block; inside the office content column the retry should be where the page was,
  not a second full screen between the chrome. The site retry keeps the shared full-page height;
  the plan's Files line includes no site-CSS change and the AC is placement.
- **No change to `app/error.tsx` or `app/office/error.tsx`.** They stay exactly where they are:
  a boundary cannot catch a throw from its own segment's layout, so these two remain the only
  catch for the site layout's read and the office shell's session read. That case is shown live
  below rather than inferred.

## Live witness

The failure was **injected** with a temporary `throw` — site page
(`app/(site)/inventory/page.tsx`), office page (`app/office/(shell)/inventory/page.tsx`), site
layout (`app/(site)/layout.tsx`), office shell layout (`app/office/(shell)/layout.tsx`) — driven at
**375 × 812** and **1440 × 900**, then each file restored. The owner's already-dirty shell layout
was snapshotted first and restored **byte-identical** (sha256 `297e509e…`); no `Task 31 witness`
text remains anywhere. Attached Chrome, no launch (3 → 3).

| forced failure | widths | status | chrome that survived | retry |
|---|---|---|---|---|
| site page `/inventory` | 375, 1440 | **200** | site header **and** footer rendered; retry is between them | `role="alert"`, the exact settled title/note/button; **“Try again”** reset re-ran the failing segment and the same state returned |
| office page `/office/inventory` | 375, 1440 | **200** | `.shell` (grid), topbar at 375 / sidebar at 1440, `main.main`; signed-in identity in the shell | retry **inside `main.main`**, `min-height: 0` (the scoped rule), exact wording; **“Try again”** reset works |
| site layout `(site)/layout.tsx` | 375, 1440 | **500** | **none** — no header, footer or floating control | full-page retry, exact wording; **“Try again”** works |
| office shell `(shell)/layout.tsx` | 375, 1440 | **500** | **none** — no `.shell`, sidebar or topbar | full-page retry, exact wording; **“Try again”** works |

The exact state, unchanged from `Retryable` (the settled wording, not a new string):
**“We couldn’t load this”** / **“We tried a few times but the server didn’t answer. Nothing was
lost — please try again.”** / **“Try again”**. No leg rendered a count or an empty block: no
`0 OF`, `0 cars`, `No cars match` in the state, and no `.empty`/`.feed-empty` block was showing.

The inner legs' console entries are the injected server throw's dev stack (4 each); the outer legs'
2 × **500** responses are the existing root-boundary behaviour for a layout throw (6 console
entries each). Nothing else failed. Store untouched (no writes). Screenshots:
`runs/task31/{site-page,office-page}-{375,1440}.jpeg` (4). The two outer legs' captures timed out
twice each — the full-page state never settled for CDP — so those legs are DOM readings only;
they show `role="alert"`, the exact words, no chrome and a working retry.

## Files-line notes

- The plan names exactly the three files changed; no extra source file. `components/retryable.tsx`
  was not touched.
- The site boundary imports no CSS because the surviving site layout loads `reference.css`; the
  office boundary imports `office.css` because the shell layout imports none.
- `signedIn` is read from the shell's `textContent`: the sidebar is hidden at 375 by the shell's
  existing responsive rule, so the identity is in the surviving shell DOM but not visible on
  phone. The chrome shown at 375 (the topbar) survives.
- The first site-page pass briefly read the streaming **waking** state (`role="status"`, “Just a
  moment”) before the boundary's alert; the drive now waits for the terminal `role="alert"`. That
  waking state inside the shell is the intended stream, not a failure state.

## Verified

Typecheck clean · `npm test` **304/304** · all four live legs **PASS, 0 problems** · Chrome 3 → 3 ·
injected throws removed and the four files restored (owner-dirty shell layout byte-identical) ·
drive `task31.mjs`; readings `runs/task31/<mode>.json`; screenshots as above (`runs/` is
gitignored).
