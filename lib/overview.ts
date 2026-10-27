// The one stock overview (R-MON-8, R-MON-9; specs/dashboard). Counts come only from
// `lib/counts.ts` and money only from `lib/money.ts` — this module owns no section
// vocabulary, no cost arithmetic and no count of its own. Its job is to combine the
// two and make every money total say what it counted:
//
//   - money tied up counts every in-stock car, complete or not (the money was spent);
//   - profit totals count only the cost-complete cars, and carry a plain "still
//     building" line naming how many cars are left out and why (R-MON-8);
//   - every total exposes its reach (counted, of) so nothing is dropped or quietly
//     included (R-MON-9).

import { countStock, type Countable, type StockCounts } from './counts';
import { isCostComplete, profitKobo, totalCostKobo, type CostLineInput } from './money';

export type OverviewCar = Countable & {
  /** The car's one doorstep price — the same whatever its state (R-MON-11). */
  priceKobo: number | null;
  /** Set only once the car is sold; the price profit becomes real (R-SLD-1). */
  salePriceKobo: number | null;
  /** The six cost lines; `null` means not entered (R-MON-2). Office-side only. */
  costLines: readonly CostLineInput[];
};

export type MoneyTotal = {
  kobo: number;
  /** Cars that contributed to this total. */
  counted: number;
  /** Cars this total is over. */
  of: number;
  /** Cars left out — their costs are not complete (R-MON-8). `counted + stillBuilding = of`. */
  stillBuilding: number;
};

export type StockOverview = {
  counts: StockCounts;
  moneyTiedUp: MoneyTotal;
  projectedProfit: MoneyTotal;
  realProfit: MoneyTotal;
};

export function stockOverview(cars: readonly OverviewCar[]): StockOverview {
  const counts = countStock(cars);

  const inStock = cars.filter((c) => !c.sold);
  const sold = cars.filter((c) => c.sold);

  // Money tied up: every in-stock car's entered costs. An incomplete car still
  // contributes what was entered — never hidden, never dropped (R-MON-8).
  let tiedUp = 0;
  for (const car of inStock) tiedUp += totalCostKobo(car.costLines);
  const moneyTiedUp: MoneyTotal = {
    kobo: tiedUp,
    counted: inStock.length,
    of: inStock.length,
    stillBuilding: 0,
  };

  // Projected profit: the doorstep price minus cost, over in-stock cars still being
  // built. Real profit: the sale price minus cost, over sold cars (lifetime).
  const projectedProfit = sumProfit(inStock, (car) => ({
    priceKobo: car.priceKobo,
    salePriceKobo: null,
  }));
  const realProfit = sumProfit(sold, (car) => ({
    priceKobo: null,
    salePriceKobo: car.salePriceKobo,
  }));

  return { counts, moneyTiedUp, projectedProfit, realProfit };
}

// R-MON-8 — a profit total counts only the cost-complete cars; the rest are left out
// and named. A loss contributes as it is (R-MON-6).
function sumProfit(
  cars: readonly OverviewCar[],
  price: (car: OverviewCar) => { priceKobo: number | null; salePriceKobo: number | null }
): MoneyTotal {
  let kobo = 0;
  let counted = 0;
  let stillBuilding = 0;
  for (const car of cars) {
    if (!isCostComplete(car.costLines)) {
      stillBuilding += 1;
      continue; // incomplete cost — out of the profit total (R-MON-8)
    }
    const profit = profitKobo({ totalCostKobo: totalCostKobo(car.costLines), ...price(car) });
    counted += 1;
    kobo += profit.kobo ?? 0;
  }
  return { kobo, counted, of: cars.length, stillBuilding };
}

// R-MON-9 — the total's reach, said in words: "from 9 of 14 cars".
export function reachLine(total: MoneyTotal): string {
  return `from ${total.counted} of ${total.of} cars`;
}

// R-MON-8 / R-MON-9 — the plain "still building" line naming how many cars are out and
// why, or `null` when nothing is left out.
export function stillBuildingLine(total: MoneyTotal): string | null {
  if (total.stillBuilding === 0) return null;
  return `still building — ${total.stillBuilding} of ${total.of} cars have incomplete costs`;
}
