# Rules — sold (`R-SLD`)

What "sold" means. A **JS rule** set. Sold is a flag on the car, not a place a car can sit —
the distinction that keeps history and profit correct.

Source: `specs/inventory/spec.md` §"Sold is a flag, not a state"; `specs/showroom/spec.md`
§"Sold and deleted cars leave the showroom".

---

### R-SLD-1 — Sold is a flag with a price and a date, never a state   [JS rule]

- **Rule:** "Mark as sold" is a separate action that sets a sold flag together with a sale price
  and a date. It is never a state choice, and no state means "sold".
- **Kind:** JS rule.
- **Source:** `specs/inventory` §"Sold is a flag, not a state" ("SHALL be a separate action …
  never a state choice").
- **Obeys when:** marking sold asks for a price; the car's state is untouched; the state list
  contains no "sold" state.
- **Forces:** `isSold` + `saleTransition` in `lib/sale.ts`; the sold flag is read from the sale
  record, never from a section or state.
- **Check:** `sale.test.ts` — the sold flag comes from the sale record (price + date); no state
  carries sold-ness.

---

### R-SLD-2 — Marking sold removes it from the showroom and from stock, keeps it in lifetime totals   [JS rule]

- **Rule:** A car marked sold leaves the showroom entirely and appears in Sold/Archive; it is
  excluded from stock counts but remains in lifetime (office) totals, and its profit becomes
  real profit.
- **Kind:** JS rule.
- **Source:** `specs/inventory` §"Sold is a flag, not a state" (scenario §"Mark sold": "vanishes
  from the showroom, appears in Sold/Archive, real profit is recorded, and it is excluded from
  stock counts while remaining in lifetime totals").
- **Obeys when:** after marking sold, the car is in no showroom section or public count, is in
  Sold/Archive, real profit includes it, and the stock total drops by one.
- **Forces:** the public read path filters sold cars; `lib/counts.ts` counts sold outside stock
  (`R-CNT-3`); `lib/sale.ts` flips the profit basis to real (`R-MON-6`).
- **Check:** `sale.test.ts` + `counts.test.ts` — a sold car is out of stock, in the sold list,
  and counted under real profit. Live: it vanishes from the showroom (Task 21 probe).

---

### R-SLD-3 — Un-marking reverses the sale record cleanly   [JS rule]

- **Rule:** Un-marking sold reverses or voids the sale record, so the car returns to its section
  and its profit returns to projected — with no stale real-profit residue.
- **Kind:** JS rule.
- **Source:** `specs/inventory` §"Sold is a flag, not a state" (scenario §"Un-mark sold": "the
  sale record is reversed or voided, the car returns to its section, and profit totals return to
  projected figures with no stale real-profit residue").
- **Obeys when:** after un-marking, the car is back in its section, the showroom shows it again,
  and no real-profit figure for it remains anywhere.
- **Forces:** `saleTransition(current, action)` in `lib/sale.ts` — un-marking what is not sold is
  a no-op, never a duplicate or a leftover; the reversal is the same single implementation.
- **Check:** `sale.test.ts` — mark → un-mark returns to the pre-sale state; no real-profit
  residue; un-marking an unsold car is a no-op.
- **Note (write path):** persisting the reversal is TASK-004; this layer delivers the decision
  (`saleTransition`) and the read-side consequence.
