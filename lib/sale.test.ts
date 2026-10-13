/**
 * R-SLD — the sold rules, executable.
 *
 * These tests are the model-check for `developer-workspace/models/TASK-002-model.md`
 * §6 (R-SLD-1…3). Sold is a flag carried by the sale record, never a state; un-marking
 * reverses it cleanly, leaving no real-profit residue (R-MON-6). Filtering sold cars
 * out of the stock count is `counts.test.ts`; the public path is Task 20.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { isSold, salePriceOf, saleTransition, type Sale, type SaleRecord } from "./sale";
import { profitKobo } from "./money";

const SOLD: SaleRecord = { salePriceKobo: 30_000_000, soldAt: "2026-09-15" };

test("R-SLD-1: sold-ness comes from the record, never a state", () => {
  assert.equal(isSold(null), false);
  assert.equal(isSold(SOLD), true);
});

test("R-SLD-1: marking sets a price and a date", () => {
  const sold = saleTransition(null, {
    type: "mark",
    salePriceKobo: 30_000_000,
    soldAt: "2026-09-15",
  });
  assert.deepEqual(sold, { salePriceKobo: 30_000_000, soldAt: "2026-09-15" });
  assert.equal(isSold(sold), true);
});

test("R-SLD-3: un-marking reverses the record to nothing", () => {
  const sold = saleTransition(null, {
    type: "mark",
    salePriceKobo: 30_000_000,
    soldAt: "2026-09-15",
  });
  const back = saleTransition(sold, { type: "unmark" });
  assert.equal(back, null);
  assert.equal(isSold(back), false);
});

test("R-SLD-3: un-marking a car that is not sold is a no-op", () => {
  assert.equal(saleTransition(null, { type: "unmark" }), null);
  // …and stays a no-op however many times it is asked.
  assert.equal(saleTransition(saleTransition(null, { type: "unmark" }), { type: "unmark" }), null);
});

test("R-SLD-2 + R-MON-6: a sold car's profit is real; an unsold car's stays projected", () => {
  const totalCostKobo = 25_000_000;
  const priceKobo = 32_000_000; // the car's one doorstep price

  const unsold: Sale = null;
  const projected = profitKobo({ totalCostKobo, priceKobo, salePriceKobo: salePriceOf(unsold) });
  assert.equal(projected.basis, "projected");

  const sold = saleTransition(null, {
    type: "mark",
    salePriceKobo: 30_000_000,
    soldAt: "2026-09-15",
  });
  const real = profitKobo({ totalCostKobo, priceKobo, salePriceKobo: salePriceOf(sold) });
  assert.equal(real.basis, "real");
  assert.equal(real.kobo, 5_000_000);
});

test("R-SLD-3: un-marking leaves no real-profit residue", () => {
  const sold = saleTransition(null, {
    type: "mark",
    salePriceKobo: 30_000_000,
    soldAt: "2026-09-15",
  });
  const back = saleTransition(sold, { type: "unmark" });
  assert.equal(salePriceOf(back), null);
  const p = profitKobo({ totalCostKobo: 25_000_000, priceKobo: 32_000_000, salePriceKobo: salePriceOf(back) });
  assert.equal(p.basis, "projected");
  assert.equal(p.kobo, 7_000_000);
});
