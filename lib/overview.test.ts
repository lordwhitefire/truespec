/**
 * R-MON-8 / R-MON-9 — the one stock overview, executable.
 *
 * These tests are the model-check for `developer-workspace/models/TASK-002-model.md`
 * §4 (R-MON-8, R-MON-9) and the money spec's "Dashboard with three incomplete cars"
 * scenario. Counts come from `counts.ts`; money from `money.ts`. The office dashboard
 * (Task 16) renders these figures; the public boundary is Task 20.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { SIX_COST_KINDS, type CostLineInput } from './money';
import { countStock } from './counts';
import { stockOverview, reachLine, stillBuildingLine, type OverviewCar } from './overview';

/** Six complete cost lines, the whole amount on the purchase line. */
function cost(amountMinor: number): CostLineInput[] {
  return SIX_COST_KINDS.map((kind, i) => ({ kind, amountMinor: i === 0 ? amountMinor : 0 }));
}

/** A complete car by default; override for the case under test. */
function car(over: Partial<OverviewCar> = {}): OverviewCar {
  return {
    section: 'available',
    isNewArrival: false,
    sold: false,
    priceKobo: 30_000_000,
    salePriceKobo: null,
    costLines: cost(20_000_000),
    ...over,
  };
}

test("R-CNT-5: the overview's counts are exactly counts.ts's", () => {
  const cars = [
    car({ section: 'available' }),
    car({ section: 'on order' }),
    car({ section: 'landed', isNewArrival: true }),
    car({ section: 'available', sold: true, salePriceKobo: 28_000_000 }),
  ];
  assert.deepEqual(stockOverview(cars).counts, countStock(cars));
});

test('R-MON-8: money tied up includes the incomplete cars', () => {
  const cars = [
    car({ costLines: cost(20_000_000) }),
    // Incomplete: only two of the six lines entered, 5m + 2m done.
    car({
      costLines: [
        { kind: 'purchase_price', amountMinor: 5_000_000 },
        { kind: 'shipping', amountMinor: 2_000_000 },
      ],
    }),
  ];
  const o = stockOverview(cars);
  assert.equal(o.moneyTiedUp.kobo, 27_000_000); // 20m + (5m + 2m entered)
  assert.equal(o.moneyTiedUp.counted, 2);
  assert.equal(o.moneyTiedUp.of, 2);
  assert.equal(o.moneyTiedUp.stillBuilding, 0); // nothing is left out of this total
});

test('R-MON-9: projected profit states its reach and names the excluded cars', () => {
  const cars = [
    car({ priceKobo: 30_000_000, costLines: cost(20_000_000) }), // +10m
    car({ priceKobo: 40_000_000, costLines: cost(25_000_000) }), // +15m
    car({ priceKobo: 50_000_000, costLines: [{ kind: 'purchase_price', amountMinor: 1 }] }), // incomplete
  ];
  const o = stockOverview(cars);
  assert.equal(o.projectedProfit.kobo, 25_000_000);
  assert.equal(o.projectedProfit.counted, 2);
  assert.equal(o.projectedProfit.of, 3);
  assert.equal(o.projectedProfit.stillBuilding, 1);
  assert.equal(reachLine(o.projectedProfit), 'from 2 of 3 cars');
  assert.equal(
    stillBuildingLine(o.projectedProfit),
    'still building — 1 of 3 cars have incomplete costs'
  );
});

test('money spec: dashboard with 3 of 12 cars incomplete', () => {
  const complete = Array.from({ length: 9 }, () =>
    car({ priceKobo: 30_000_000, costLines: cost(20_000_000) })
  );
  const incomplete = Array.from({ length: 3 }, () =>
    car({ costLines: [{ kind: 'purchase_price', amountMinor: 1_000_000 }] })
  );
  const o = stockOverview([...complete, ...incomplete]);

  // Profit reads as coming from the complete cars, with the 3 named.
  assert.equal(o.projectedProfit.counted, 9);
  assert.equal(o.projectedProfit.of, 12);
  assert.equal(o.projectedProfit.stillBuilding, 3);
  assert.equal(o.projectedProfit.kobo, 9 * 10_000_000);
  assert.equal(reachLine(o.projectedProfit), 'from 9 of 12 cars');
  assert.equal(
    stillBuildingLine(o.projectedProfit),
    'still building — 3 of 12 cars have incomplete costs'
  );

  // Money tied up still includes them, and does not shrink.
  assert.equal(o.moneyTiedUp.of, 12);
  assert.equal(o.moneyTiedUp.kobo, 9 * 20_000_000 + 3 * 1_000_000);
  assert.equal(stillBuildingLine(o.moneyTiedUp), null);
});

test('R-MON-8: a sold car leaves stock, enters real profit, and is out of money tied up', () => {
  const cars = [
    car({ priceKobo: 30_000_000, costLines: cost(20_000_000) }), // in stock, projected +10m
    car({
      sold: true,
      priceKobo: 30_000_000,
      salePriceKobo: 33_000_000,
      costLines: cost(20_000_000),
    }), // sold, real +13m
  ];
  const o = stockOverview(cars);
  assert.equal(o.moneyTiedUp.of, 1); // the sold car is no longer in stock
  assert.equal(o.moneyTiedUp.kobo, 20_000_000);
  assert.equal(o.projectedProfit.counted, 1);
  assert.equal(o.projectedProfit.kobo, 10_000_000);
  assert.equal(o.realProfit.counted, 1);
  assert.equal(o.realProfit.kobo, 13_000_000);
  assert.equal(o.realProfit.of, 1);
});

test('R-MON-8: a sold car with incomplete costs is named in the real-profit total', () => {
  const cars = [
    car({ sold: true, salePriceKobo: 33_000_000, costLines: cost(20_000_000) }), // complete
    car({
      sold: true,
      salePriceKobo: 33_000_000,
      costLines: [{ kind: 'purchase_price', amountMinor: 1 }],
    }), // incomplete
  ];
  const o = stockOverview(cars);
  assert.equal(o.realProfit.counted, 1);
  assert.equal(o.realProfit.of, 2);
  assert.equal(o.realProfit.kobo, 13_000_000);
  assert.equal(
    stillBuildingLine(o.realProfit),
    'still building — 1 of 2 cars have incomplete costs'
  );
});

test('R-MON-6: a loss shows as it is — never clamped', () => {
  const cars = [car({ priceKobo: 15_000_000, costLines: cost(20_000_000) })];
  const o = stockOverview(cars);
  assert.equal(o.projectedProfit.kobo, -5_000_000);
});

test("R-MON-8: no 'still building' line when every counted car is complete", () => {
  const o = stockOverview([car(), car({ section: 'on order' })]);
  assert.equal(o.projectedProfit.stillBuilding, 0);
  assert.equal(stillBuildingLine(o.projectedProfit), null);
  assert.equal(o.projectedProfit.counted, o.projectedProfit.of);
});
