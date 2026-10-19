# TASK-005 · Task 33 — A slow navigation shows that something is happening

**Date:** 2026-10-19 · **Outcome:** done. **Deps:** 2.

## What was built

The waiting sign is the clicked nav Link's own pending state, not a separate page or overlay.
`components/office/NavLabel.tsx` (new, client) reads `useLinkStatus` inside the `<Link>`, waits
**400 ms**, then replaces the row's label with `role="status"` + spinner + **“Loading…”**. The link
keeps its destination as its accessible name through `aria-label`; the visible label is replaced,
the name is not. `OfficeNav` (sidebar) and `OfficeBottomNav` (phone, the quote in `task.md:353`) wrap
their labels; `office.css` adds the small spinner/status styles.

Why this mechanism: a per-segment `loading.tsx` is the full wait when the target's RSC payload lands,
but it cannot show while that payload itself is held — the R2.4 hold. The link's pending state is set
at click and lasts for the navigation's own latency; that is the sign the slow case needs. The
`loading.tsx` files stay as they are (TASK-004) and keep the settled cold-start line.

## Live witness — the R2.4 hold, reproduced

Attach-only, signed in, every RSC request held 6 s in the tab (the R2.4 pattern; no source delay).
3 s after the dashboard was interactive, the nav entry was clicked; samples every 0.1–2 s. The fast
leg followed with the hold removed.

| width | slow: sign first | words / role / spinner | old screen while the sign is up | page | fast |
|---|---|---|---|---|---|
| 1440 | **502 ms** | **“Loading…”** / `status` / yes | `/office` · Dashboard · scroll 0 · nav visible, samples 0.5–5.0 s | **9025 ms** → Inventory | no sign, no visible wait; **1973 ms** |
| 375 | **501 ms** | same | same, samples 0.5–5.0 s | **9017 ms** → Inventory | no sign, no visible wait; **1045 ms** |

The sign was visible on five samples (0.5–5.0 s); the 6 s hold released at ~6.5 s; the existing
`StoreWaking` boundary (`Just a moment`, in `main.main`) was in the DOM at ~7–8 s (opacity 0 in those
sampled frames — its fade had not completed at the sample instants) and the page arrived at ~9 s. The
fast leg's dashboard navigation left the boundary element in the DOM at 300–1000 ms but at opacity 0
(not visible) — the sign never appeared. 0 console / 0 HTTP errors; store untouched; Chrome 3 → 3.
Readings `runs/task33/task33.json`; drive `task33.mjs`.

## AC

- **A slow soft navigation shows the sign, not a still screen:** the sign is up at ~0.5 s while the
  old screen is still the only screen; the page at ~9 s.
- **The clock is the store's own latency:** the sign stays for the whole held navigation (0.5–5.0 s
  samples) and goes when the navigation resolves; no timer cuts it short.
- **No flash on fast navigations:** the sign has a 400 ms gate; the fast leg records none (and no
  visible waiting state) at either width.
- **URL and the person's place unchanged:** during the sign the URL is still `/office`, the heading
  Dashboard, scroll 0, the nav visible; the sign is in the clicked row. The destination commits only
  when the payload does.
- **Both widths:** sidebar at 1440, bottom nav at 375; the phone quote in `task.md:353`.

## Files-line notes

- The plan's four `loading.tsx` files are **not new** — they exist from TASK-004 and are unchanged;
  they are the full wait after a held payload lands (the cold-start copy), not the sign. The sign is
  the nav pending state, which a boundary cannot provide during the hold.
- `OfficeNav.tsx` was **owner-dirty** (the owner's TapNotice work). Only the Task 33 hunks are
  committed: the committed file is HEAD + the sign; the owner's WIP (TapBadge removal, comment,
  prop) remains uncommitted and byte-intact. The live run used the working tree (owner WIP + sign);
  the sign code is identical. `OfficeBottomNav.tsx` is an extra the plan did not list — the AC's
  phone case needs it.
- No `car/loading.tsx`: Task 9 forbids a boundary above `car/[ref]` (it would swallow the real
  status/404). The nav's “Add / edit car” entry gets the sign; the per-car edit row links are not
  nav links and have no boundary.
- `NavLabel.tsx` is new (`OfficeNav`/`OfficeBottomNav` both import it); `office.css` carries the
  status/spinner styles. The global reduced-motion rule stops the spin; the words remain.
- `notes/TASK-005-current-truth.md` corrected: the earlier “navigation-level indicator optional
  garnish” was wrong for the held-RSC case; the live `useLinkStatus` reports pending for the whole
  hold, and the per-segment boundary only arrives with the payload.

## Verified

Typecheck clean · `npm test` **304/304** · drive **PASS, 0 problems** · Chrome 3 → 3 · store
untouched · no source slowed or left changed. `OfficeNav.tsx`'s committed content is HEAD + the
sign; the owner's pre-existing WIP is left unstaged, and no other owner-dirty file was touched.
