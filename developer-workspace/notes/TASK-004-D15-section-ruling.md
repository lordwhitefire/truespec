# D15 — the section/primary-state fork: the owner's ruling

Date: 2026-10-15. Owner ruling, in his own answer to the fork put to him:
**"A"**.

## The fork (why it was open)

D15 says "section and primary state now name the same thing", but the specs still
carry the older "section" vocabulary and have not been rewritten (design D15 d).
The showroom spec says "exactly three sections — Available, On Order, Landed";
D15 says there are four primary states. So `car_state.section` had three candidate
shapes.

## The ruling — A

**The section vocabulary is the four primary states.** `section` ≡ primary state,
all four values: `available`, `on order`, `landed`, **`sold`**. The showroom
presents three of the four — Sold is never shown.

## Sub-decisions this forces (recorded so the build is traceable)

- `lib/sections.ts`: `Section` and `SECTIONS` become the four. A new
  `PUBLIC_SECTIONS` names the three the showroom presents, so no public screen can
  grow a fourth "Sold" tab.
- `presentedSections` returns `[]` for a Sold car (a sold car is presented nowhere
  public). `Available`/`Landed`/`On order` behaviour is unchanged.
- `SECTION_LABEL` and `SECTION_TOKEN` cover four; Sold's token is `s`. The public
  URL token set is written only from `PUBLIC_SECTIONS`, so `?status=sold` is only
  reachable by hand and yields nothing.
- `lib/counts.ts`: Sold still sits outside stock; the section `sold` and the `sold`
  boolean both count as sold (belt and braces — they should always coincide).
- The leak-check's office-labelled watch becomes "the labels of **secondary**
  states" (D15's office-private vocabulary), replacing the SECTION_LABEL allow-list.
  This is the exact set under the new model, and it keeps watching On the way / At
  port / Cleared / owner secondaries while not watching the four primaries.
- The store pins the four primaries by name and by their one section (CHECKs) and
  refuses deleting or re-kinding a primary (trigger) — `migrations/0020`.

## Left for their own tasks (noted, not smuggled into Task 8)

- `lib/sale.ts` / R-SLD-1 ("sold-ness comes from the record, never a state") is the
  older D6 rule D15 revises. Sold-as-a-state is **Task 14** (Sold / un-mark).
- The car form's hardcoded `STATES` list and its section picker (**Task 11**); the
  office state editor's secondary-only rewrite (**Task 15**).
- The specs' "section" vocabulary rewrite to "primary state" stays a logged
  architecture gap (D15 d) — not silently rewritten here.
