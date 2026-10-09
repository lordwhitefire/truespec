# Brief — RECON-001: UI completeness

**Task:** `openspec/tasks/RECON-001` — "UI completeness (make sure all the UI is done)".
**Asked by:** owner. **Given:** 2026-10-09. **Owner instruction:** go (start Phase 0).

## What was asked

Cover the whole UI layer. Answer the plain question — *is the UI done?* — by going screen by
screen against the approved design, then close every gap. A screen is "done" only when it **looks
exactly like its reference screen** in `test-truespec-v2`, at all three widths and both modes.

## What "done" looks like

- A screen-by-screen **coverage list** — every screen in the design marked done / missing / does not
  match, with the visual differences named. No screen unaccounted for.
- Every approved **element** present where `ui-plan.md` puts it — including the at-risk ones (buyer
  inventory search/filters/sort, grid/list toggle, Special ribbon + discount, theme toggle, WhatsApp
  placement, empty states, sold/deleted page, privacy, office login/first-run).
- All three widths behave per `ui-plan.md`; both modes render, dark default.
- No screen contradicts a binding spec (conflicts logged).
- Verified by the RECON-001 testing pass, confirmed on a real phone and a real laptop.

## Scope

- **In:** all UI — public showroom + extras (privacy, 404, sold/deleted) and the whole office.
- **Out:** the other five layers (except where a screen needs something to render); any change to
  the approved design.
- Recon first — nothing changed before the coverage list exists.

## Yardstick

`product-management/ui-plan.md` (the 95 answers) · `product-management/product-overview.md` · the
reference screens `test-truespec-v2` (read-only) · the change specs (spec wins over screen; conflict
logged).

## Honest limitations to carry

- No browser in this session: exact visual match is checked against markup/CSS, not a render; each
  row records which was used.
- Office screens need auth/session from a later layer to render live — noted, not built.
- `not-available.html` is empty — no visual truth for the sold/deleted page; fall back to `ui-plan.md`
  Q43 + the showroom spec.

## Deliverables

- `developer-workspace/notes/RECON-001-coverage.md` — the coverage list.
- `developer-workspace/plans/RECON-001-gap-closure.md` — ordered gap-closure plan (Phase 2).
- A short report at the end — closed / verified / not verified.
