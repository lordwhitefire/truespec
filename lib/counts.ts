// The one counting rule (specs/dashboard, task 3.2/5.2). Showroom, home page
// and office all read this. No second implementation may exist anywhere.
//
// Available = Available-group cars + Landed-this-year (new-arrival) cars,
// counted once, with an "of which N new arrivals" note. On Order = on-order
// group. Sold is counted separately, outside the stock total.

export type StockSection = "available" | "on order" | "landed";
export type Countable = {
  section: StockSection | "sold";
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
    if (car.sold) {
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
          newArrivals += 1;
          available += 1; // a new arrival is also buyable — counted once here
        }
        break;
      default:
        break;
    }
  }

  return { available, onOrder, landed, newArrivals, sold };
}
