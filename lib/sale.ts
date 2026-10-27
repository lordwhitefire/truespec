// The one definition of the sale (R-SLD-1…3, restated for D15).
//
// D15 changed what Sold is: **Sold is one of the four fixed primary states**, and
// **setting it is what performs the sale** (task.md truth 5; specs/inventory, "Sold is a
// primary state, and setting it performs the sale"). The rule this module used to carry —
// that Sold was a flag on a record and *never* a state — is the older D6 decision D15
// revises. Leaving that wording here would be a trap for the next reader, so it goes.
//
// What the sale rules are now:
//
//   * **Sold-ness is the car's primary state.** The showroom and the counts read the
//     state; the state is what takes the car out of the showroom and out of stock counts.
//   * **The money facts live on the sale row** — the price and the date — never on the
//     car and never on the state (truth 5). The row follows the state: it exists while
//     the car is Sold, and un-marking removes it, so no stale real-profit residue
//     (R-MON-6) can outlive an un-marking.
//   * **Un-marking returns the car to the primary state it held before it sold** — the
//     sale row's own `prior_state_id` — with its secondary states untouched.
//
// This module holds the one rule the write paths share: whether a submitted sale belongs
// to the state being set. Everything else about sold-ness is the state's and is read from
// the registry (`car_state`), never from here.

import type { Section } from './sections';

/** The one section that means Sold (R-SEC-1). */
export const SOLD_SECTION: Section = 'sold';

/** A sale as it is entered: the two money facts, which travel together (truth 5). */
export type SaleInput = { salePriceKobo: number; soldAt: string };

/**
 * R-SLD-1 — the sale belongs to the Sold state and to nothing else.
 *
 * A form may send a price and a date alongside any state; only a car whose chosen primary
 * state is Sold keeps them. Everywhere else the pair is dropped, so a sale record can
 * never exist beside a car that is not Sold — which is what makes "the state comes first
 * and the sale action follows from it" (truth 5) true of the store's own contents.
 *
 * A Sold state with no sale is left as no sale: whether a Sold car *must* carry one is the
 * action's judgement against the registry, not this rule's.
 */
export function saleForState(section: Section, sale: SaleInput | null): SaleInput | null {
  return section === SOLD_SECTION ? sale : null;
}
