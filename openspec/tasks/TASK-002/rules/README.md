# TASK-002 rules — the reference for Layer 2

Layer 2 is the business logic. There is **nothing to look at**: the rules are invisible.
So the authority for this layer is **our own written rules**, not a reference screen. The
rules are written first, the model is built from them, the build obeys them, and the check
walks **rule by rule against the model**.

This folder holds the rules. One file per rule capability:

| File | Capability |
|------|------------|
| `sections.md` | The three fixed sections; state → section |
| `counting.md` | The one counting rule |
| `money.md` | Cost kinds, totals, profit, labels, validation (naira only) |
| `codes.md` | The `TS-####` reference code |
| `sold.md` | The sold flag and sale transitions |

The **model** built from these rules is `../../../models/TASK-002-model.md`. It is the
authority the check reads; it is not changed to match the build.

---

## The rule form

Every rule is one statement, of the kind this project works in — **an HTML rule, a CSS
rule, or a JS rule**. This layer's logic is invisible decision logic, so its rules are
**JS rules**; the HTML and CSS kinds do not apply here (nothing is rendered by this layer).
The form, used verbatim:

```
### R-<CAP>-<n> — <title>   [JS rule]
- **Rule:** one checkable sentence.
- **Kind:** JS rule (this layer's logic; HTML/CSS rules do not apply — nothing is rendered).
- **Source:** specs/<cap>/spec.md §"<requirement>", or an owner ruling + date.
- **Obeys when:** the observable that proves the rule holds.
- **Forces:** the single implementation, and the read points it constrains.
- **Check:** the unit test name, and/or the search that finds a second implementation.
```

Capabilities and their tags:

| Tag | File |
|-----|------|
| `R-SEC-<n>` | sections |
| `R-CNT-<n>` | counting |
| `R-MON-<n>` | money |
| `R-REF-<n>` | codes |
| `R-SLD-<n>` | sold |

## Rules for writing the rules

1. **One rule per statement.** If it needs an "and", it is probably two rules.
2. **Checkable.** Each rule has an observable that proves it, and a check that finds a
   second implementation. A rule that cannot be checked is not written yet.
3. **Sourced.** Every rule traces to a spec requirement or an owner ruling with a date.
   Nothing is invented.
4. **A gap is raised, not filled.** Where the specs genuinely do not decide, the rule is
   *not* written; it goes to the plan's **Raised** list and waits for the owner.
5. **Naira only.** No rule in this layer names a rate, a currency, or a dollar amount.
