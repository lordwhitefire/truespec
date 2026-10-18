# TASK-005 · Task 21 — the showroom's nav chat control behaves the same at every width

**Date:** 2026-10-18 · **Outcome:** done. **Deps:** —.

## What changed

`app/reference.css` — the `@media (max-width: 820px)` block gained
`.nav .wab { display: none; }`, carrying the ruling's reasoning in a comment. `reference.css` is
imported once by the `(site)` layout, so the rule now reaches **every** showroom page.

`app/(site)/car/car.css` — the same rule was removed from the car page's own
`@media (max-width: 820px)` block (a comment says where it lives now). That copy was the defect:
it made one piece of chrome behave two ways at the same width — hidden on a car page, kept on
home and inventory at ≤820px.

`components/site/SiteFab.tsx` — **no change**. The plan's Files line listed it; the AC and DR15
leave it exactly as it is: the floating control on home and inventory, the car page's own bar as
its phone chat. Recorded as a Files-line discrepancy.

## The ruling followed

DR15 (`design-workspace/decisions/TASK-005-ux-rulings.md`): “Hide `.nav .wab` at ≤820px on all
showroom pages. The phone already affords chat elsewhere: the floating button on home and
inventory, and the car page's `.mbar` ‘Chat now’. Nothing is lost.” The direction is **hide on
all** at ≤820px; above 820 the base `.wab` keeps it visible on every page.

## Live readings — signed in, read-only

`showroom-chat.mjs`; readings `runs/task21/readings.json`. No store writes; Chrome 6 → 6
(attach-only).

| width | reading |
|---|---|
| **375** | nav chat hidden on **home, inventory, car** (the same); floating fab visible on home + inventory, **absent** on the car page (by design); the car's own `.mbar` `display:flex`, and it comes up on scroll (`show` true) |
| **768** | nav chat hidden on all three; `.mbar` flex |
| **1440** | nav chat **visible** on all three; fab `display:none`; `.mbar` `none` |

## Verification

`npm run typecheck` clean (CSS-only change; nothing new to type) · `npm test` **295/295** · drive
`showroom-chat.mjs` **PASS** · readings `runs/task21/readings.json` · no Chrome launched.

## Honest notes

- The “before” (car hidden, home/inventory shown at the same width) is documented live in
  `openspec/tasks/TASK-005/findings/05-runtime-observations.md` (“navWab=true” on
  home/inventory at 820 px, hidden on the car page); this drive reads the “after”. The change
  itself is a one-rule move between the two files.
- `car.css` keeps no copy; the car route still hides the control at phone widths because the
  `(site)` layout loads `reference.css` too — one shared home for the rule.
- The nav `.wab` has a Suspense fallback with the same class; both are covered by the same rule.
- Widths driven: 375 / 768 / 1440 (phone, tablet, desktop). The 820 px boundary itself was not
  probed at 821; the consistency claim was read at the three widths above.
