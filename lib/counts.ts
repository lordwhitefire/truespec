// The one counting rule (R-CNT-1…5). Showroom, home page and office all read this.
// No second implementation of a stock count may exist anywhere.
//
// Available = Available-group cars + Landed-this-year (new-arrival) cars, each
// counted once, with an "of which N new arrivals" note. On Order = the on-order
// group. Sold is counted separately, outside the stock total.
//
// A car's section is the one from `lib/sections.ts` — this module holds no section
// vocabulary of its own. Under D15 a Sold car is the section `sold`; it also carries
// the `sold` flag from its sale record, and either marks it sold (they coincide).

import type { Section } from "./sections";

export type Countable = {
  section: Section;
  isNewArrival: boolean;
  sold: boolean;
};

export type StockCounts = {
  available: number;
  onOrder: number;
  landed: number;
  newArrivals: number;
  sold: number;
};

export function countStock(cars: readonly Countable[]): StockCounts {
  let available = 0;
  let onOrder = 0;
  let landed = 0;
  let newArrivals = 0;
  let sold = 0;

  for (const car of cars) {
    if (car.sold || car.section === "sold") {
      sold += 1;
      continue;
    }
    switch (car.section) {
      case "available":
        available += 1;
        break;
      case "on order":
        onOrder += 1;
        break;
      case "landed":
        landed += 1;
        if (car.isNewArrival) {
          // Landed this year: also buyable, counted once here (R-CNT-1).
          newArrivals += 1;
          available += 1;
        }
        break;
    }
  }

  return { available, onOrder, landed, newArrivals, sold };
}
