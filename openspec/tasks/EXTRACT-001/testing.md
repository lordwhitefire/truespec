# EXTRACT-001 — Testing

## Who does this
A session that did **not** run the extraction. Its job is to try to falsify the claim that the inventory is complete.

## What gets checked, and how the tester knows it passed

1. **Element count** — count the elements on the reference independently; the result must equal the inventory's count. Pass = equal; fail = any difference.
2. **Rule completeness** — enumerate the CSS rules independently (stylesheets plus coverage); every rule on the page must be in the inventory and every rule in the inventory must be on the page. Pass = both sets equal; fail = a rule on only one side.
3. **Closed vocabulary** — sample properties across the closed list; each must appear in the per-element record, even when its value is "none" or initial. Pass = none missing; fail = a property absent with no stated reason.
4. **Hidden / dynamic rule** — pick a rule that is not active on load (hover, click, or CSS-in-JS); drive the state; it must appear. Pass = it appears; fail = it does not.
5. **No invention** — every rule in the inventory must be found on the page. Pass = all accounted for; fail = any rule with no counterpart.
6. **Reason for every gap** — every rule flagged unused or omitted must carry a stated reason. Pass = all reasons present and checkable; fail = a gap with no reason.

## What would make this test worthless
- Being run by the same session that did the extraction.
- Accepting the inventory's own numbers instead of counting independently.
- Trusting a "used: false" flag without checking the rule is genuinely not applied.

## Outcome
Each item above is pass or fail, named. Anything that fails is reported as the remaining gap.
