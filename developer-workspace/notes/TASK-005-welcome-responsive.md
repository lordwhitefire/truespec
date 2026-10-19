# TASK-005 follow-up — the new-visitor popup on phones ("not responsive")

Owner's report (19 Oct 2026): *"the pop up that welcomes new visitor is not responsive — check and reply."*

The check was read-only (no product code touched). The owner then approved a fix — **Task 45**,
built and re-verified below. Rerunnable evidence:
`developer-workspace/scripts/task-005/welcome-diag.mjs` → `runs/welcome-responsive/diag.json` (+ `progress.log`).

## Verdict

Reproduced on phone widths, and **it is not the popup's own CSS**. The popup is laid out
**wider than the phone screen**; its right side — including the ✕ close — sits off-screen and
cannot be tapped. On a desktop viewport of the same width the popup fits at every size, so the
failure is phone-only.

## What exactly happens (Chrome phone emulation: `isMobile`, Android UA, 375×812)

- `documentElement.clientWidth` = 375, but `scrollWidth` = **492** and `window.innerWidth` = **492** —
  the home page overflows sideways.
- The fixed welcome dialog (`dialog.ovl{width:100%}`) is laid out against the **expanded 492px
  layout viewport** → 492px wide.
- Panel `.mdl` = **452px** wide, centred in 492 → spans x=20…472; the screen shows 0…375.
- ✕ (`#mx`) at x=428…464 → **off-screen**; `tap('#mx')` times out at 6s. Buttons at x≈46…361
  (A family SUV / A saloon / Something I haven't listed yet / Skip) are on-screen and work:
  Skip closes and sets `ts-asked=true`; SUV closes and navigates to `/inventory?body=SUV`.
- Plain (non-mobile) viewport at the same sizes: panel = width−40 (280/320/335/360/390/430),
  ✕ visible and hit-testable everywhere; at 320×400 the panel is slightly taller than the
  viewport but the overlay scrolls (reach 41px). Landscape and rotation reflow correctly.

## Cause chain (each step verified live)

1. `components/site/FeaturedSlider.tsx:9` starts `per = 3` and **server-renders 3 cards** for the
   "Featured cars" strip; line 13 derives `per` from `window.innerWidth`.
2. At phone widths 3 cards cannot fit: `#sl` (327px box) measures `scrollWidth` 468–507, and
   nothing clips it (`.card{overflow:visible}`, `.sp`, `.sv` all visible) → the document is
   492–740 wide depending on font load / slider state.
3. Chrome mobile **auto-expands the layout viewport** to the content width (the known
   "layout-viewport auto-expansion"; seen on real Android and reproducible with Playwright
   `isMobile: true` — cf. stackoverflow.com/questions/63309595,
   github.com/seanghay/sone/commit/7328f50). `window.innerWidth` becomes 492, not the phone's 375.
4. The slider's own `calc()` then reads the polluted width and settles on `per = 2` — one card too
   many for a phone; no resize event ever corrects it (measured `#sl` `repeat(2, 1fr)`, 2 cards).
5. Fixed elements are sized to the expanded layout viewport → the welcome dialog stretches to 492
   and the ✕ lands off-screen.

## Live proof of the link (same phone-emulation session)

- Baseline: `innerWidth` 492, docW 492, panel right 472, ✕ right 464, tap ✕ fails.
- `#sl { display:none }` → `innerWidth` **375**, docW 375 — instantly, so the expansion is dynamic,
  not latched. Restore → 492 again. The strip alone drives it.
- Inject `#sl { contain:layout; overflow:hidden }` → `innerWidth` **375** immediately, strip stays
  visible (its internal `scrollWidth` stays 468 but no longer expands the page).
- After a resize the slider re-derives `per = 1`; dialog = 375, panel right 355, ✕ right 347 —
  **inside the screen**.

## The fix (Task 45 — owner-approved: “write in the plan and then fix”)

Exactly the two changes the check pointed at; nothing else:

- `components/site/FeaturedSlider.tsx` — the width source for the per-row count is now
  `document.documentElement.clientWidth` (fallback `window.innerWidth`). The document's own
  client width stays the device width even while the layout viewport is expanded; on phones the
  count is 1 (under 560), 2 under 1000, 3 above — thresholds unchanged. The initial render and
  the desktop behaviour are unchanged.
- `app/reference.css` — `.sv .sp .sl { contain: layout; }`. The strip's overflow can no longer
  widen the page at all: layout containment isolates its intrinsic/scrollable overflow from the
  page's width, so the layout viewport cannot be dragged wide — and the fixed welcome dialog
  cannot be stretched with it. Mechanism verified live before the fix: with the viewport already
  polluted (729), applying `contain: layout` snapped `innerWidth` back to 375 immediately; with
  the rule in the stylesheet from the first paint, the pollution never starts.

No dialog CSS was touched — the check's conclusion stands: no pure-CSS fix inside the dialog can
rescue it while the page itself overflows; the page must not overflow.

## Re-verification — final run on the fixed build (19 Oct, 136 s)

Fresh run of `welcome-diag.mjs` against the dev build (`:3210`): 18 configurations + 3 taps.

- **Phones** (emulated, isMobile + Android UA): 375/360/430 — `innerWidth` = screen = the
  phone's own width (no expansion), `scrollWidth` = `clientWidth` (no sideways pan), panel right
  edge 355/340/410 (inside the screen), ✕ hit-testable, strip `per=1`, `contain: layout`.
- **Plain viewports**, 280 → 1440 (15 sizes): no horizontal overflow anywhere; panel = width−40
  (up to its 460 cap); strip 1 per row up to 568, 2 at 667/768, 3 at 1440 — desktop unchanged.
  Only 320×400 has the panel 1px taller than the viewport and the overlay scrolls its 41px —
  the same as the pre-fix check, by design.
- **Taps** (phone): ✕ closes without marking; Skip closes and sets `ts-asked=true`; “A family
  SUV” closes, sets `ts-asked=true`, navigates to `/inventory?body=SUV`. No page errors.
- **Resize/rotation** (375×812 → 812×375 → 320×400): reflows, ✕ stays reachable.

Window policy: the check now reuses one window for the whole desktop walk and one for the phone
walk — the visitor marker is cleared between cases, so each case still sees a true new visitor.
4 windows per run (was 22), all closed at the end; Chromium instances 6 → 6; the owner's session
and storage untouched.

## Side observations (same root cause — fixed with it)

- On phones the **whole home page panned sideways** (~117–365px of off-screen content), not only
  the popup. No horizontal overflow at any size now.
- The phone view was stuck on `per = 2` for the featured strip — the right card partially
  off-screen. It is `per = 1` on phones now.

Scope note: the check touched no product file (the fix is Task 45's own change), no owner
session, no store data; the browser harness attaches to the standing Chrome and uses throwaway
incognito windows only — 4 per run, all closed at the end.
