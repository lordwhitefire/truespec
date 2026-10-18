# TASK-005 · Task 13 — every confirmation is the platform's dialog

**Date:** 2026-10-18 · **Outcome:** done. **Depends on:** 2.

## What changed

The hand-built `.ovl`/`.mdl` `<div>` is gone from every confirmation and modal. The element is now a
native `<dialog>` opened with `showModal()`; the class names stayed (`ovl`, `mdl`) so the look is the
same, and only the platform's element changed.

- **`components/office/Dialog.tsx`** (new): one component for the office's four — `open` follows a
  mounted `<dialog>` through `showModal()`/`close()`, `onCancel` closes through the caller's state,
  the name comes from `labelledBy` (or `label`), and Escape/trapping/top layer are the platform's.
  `dismissOnBackdrop` is temporary: it keeps the two callers that closed on an outside tap before
  the conversion closing that way until Task 16 sets the one rule.
- **Office call sites**: inventory delete (`#ovl`, name from `#dlt`), car form delete (`#ovlD`, name
  from `car-del-title`), drafts delete (name "Delete this draft?"), enquiry detail (`#ovlD`, name
  from `#dtitle`). The inner `.mdl` lost its duplicate `role="dialog" aria-modal="true"`; the root
  dialog is the dialog now.
- **Showroom, the car/ask modal**: the markup changed in its three homes — the live car page
  (`page.tsx`), `CarLayers` in `car-parts.tsx` (sold and not-found views), and `HomeBehaviors`
  (home) — to `<dialog class="ovl" id="ovl" aria-labelledby="mtitle">`. `CarBehaviors` and
  `HomeBehaviors` open it with `showModal()`, close with `close()`, and unlock the page on the
  dialog's own `close` event; their manual Escape handlers are gone. Two `!ovl.hidden` checks (the
  farewell's scroll, the social-proof toast's "not over a dialog" wait) became `ovl.open`.
- **Showroom, the inventory browser**: its modal is a `<dialog>` mounted with the modal state,
  shown in an effect, closed before the state removes it (so focus can return), Escape arriving as
  `cancel`. Its window-level Escape listener is gone.
- **CSS**: each sheet carries the same three platform rules next to `.ovl` —
  `dialog.ovl` (full viewport, no UA margin/border/max), `dialog.ovl:not([open])` (**closed must
  not paint**: the author `display:grid` on `.ovl` would otherwise beat the platform's
  `display:none`), and `dialog.ovl::backdrop{background:transparent}` (the `.ovl` background is the
  dim; the UA's 10% backdrop would have darkened it further).

## Live readings — all seven screens

`dialogs.mjs`, live and signed in, each dialog opened through its own trigger (a click, or the
showroom's own exit-intent gesture after its dwell), read in the DOM, then closed.

| screen | element | open | `:modal` | display | rect / viewport | accessible name | inner `role` |
|---|---|---|---|---|---|---|---|
| office inventory | `DIALOG#ovl` | true | true | grid | 1425×900 / 1440×900 | Delete this car? | null |
| office car form | `DIALOG#ovlD` | true | true | grid | 1425×900 / 1440×900 | Delete this car? | null |
| office drafts | `DIALOG` | true | true | grid | 1425×900 / 1440×900 | Delete this draft? | null |
| office enquiries | `DIALOG#ovlD` | true | true | grid | 1440×900 / 1440×900 | Enquiry | null |
| showroom home | `DIALOG#ovl` | true | true | grid | 1440×900 / 1440×900 | What are you after? | null |
| showroom car | `DIALOG#ovl` | true | true | grid | 1440×900 / 1440×900 | Before you go | null |
| showroom inventory | `DIALOG#ovl` | true | true | grid | 1440×900 / 1440×900 | Before you go | null |

Closed: the office dialogs stay mounted — `open=false`, computed `display:none`; the showroom
inventory dialog is mounted with its state, so closed is **unmounted** after `close()` ran first.

Also read: the dialog keeps the overlay's look — computed `border-top-width: 0`, padding 20px, the
`.mdl` centred on the dialog at (713, 450) on the office screen and (720, 450) on the showroom;
`::backdrop` computes `rgba(0,0,0,0)` (the `.ovl` background is `rgba(10,11,13,.62)`); the site car
dialog's Escape fired `cancel` then `close` and removed the page's `lock`.

## Honest notes

- **The plan's Files column omits the showroom files the AC names.** The AC covers *“the site's two
  dialogues”*; the files list only names the office. Changed beyond that list: `page.tsx`,
  `car-parts.tsx`, `HomeBehaviors.tsx`, `CarBehaviors.tsx`, `InventoryBrowser.tsx`,
  `app/reference.css`, `app/(site)/car/car.css`. `car-parts.tsx` and `CarBehaviors.tsx` were not in
  Task 14's list either, but the conversion cannot be made without them.
- **“enquiry detail/delete”**: the enquiries code has only a **detail** dialog. There is no enquiry
  delete confirmation anywhere in `enquiries-client.tsx` or its actions — no UI calls a delete. One
  was not invented (`task.md` “adds no feature”). Flagged for the owner.
- **“the site's two dialogues”** are the car/ask modal (one dialogue rendered on three screens) and
  the inventory browser's modal. The home page's copy was driven too, so every screen that can open
  one was checked.
- The showroom's dialog markup is deliberately still **three copies** — the reference defines one
  per screen, and `CarLayers` exists so the not-found boundary can share it. The change is identical
  in all three.
- The office screens read 1425 px wide against a 1440 px viewport because the page carries a
  vertical scrollbar (the dialog fills the layout viewport); the `.mdl` is centred either way. No
  claim is made here about the old overlay's width — that was not measured before the conversion.
- **Focus-return is not claimed here.** `close()` runs before the state removes the dialog, which
  is what makes the browser's own return possible; Task 14 verifies the keyboard path end to end.
- One reading race, recorded: immediately after Escape the page's `lock` class was still present;
  1.5 s later it was gone, with the dialog's `cancel` and `close` events logged 69 ms apart. The
  unlock is the dialog's own `close` event, not the Escape handler.
- The office Dialog's `dismissOnBackdrop` prop is debt with a name and an owner: Task 16 decides
  the one outside-tap rule. Today inventory and the car form keep their old behaviour; drafts and
  enquiries never had it.

## Verification

`npm run typecheck` clean · `npm test` **295/295** · drive `dialogs.mjs` (readings in
`runs/dialogs/readings.json`) · no Chrome launched (6 → 6).
