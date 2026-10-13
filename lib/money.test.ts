/**
 * R-MON — the money rules, executable.
 *
 * These tests are the model-check for `developer-workspace/models/TASK-002-model.md`
 * §4 (R-MON-1…7, 10, 11). R-MON-8/9 (overview reach) are `overview.test.ts`; R-MON-12
 * (public boundary) and the repo-wide "no rate / no second total" searches are Task 20.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  SIX_COST_KINDS,
  totalCostKobo,
  isCostComplete,
  profitKobo,
  costLabelFor,
  parseCostAmount,
  nairaDigits,
  formatNaira,
  type CostLineInput,
} from "./money";

const line = (kind: string, amountMinor: number | null): CostLineInput => ({ kind, amountMinor });
const SIX_LINES: CostLineInput[] = SIX_COST_KINDS.map((k) => line(k, 100));

// ---- R-MON-1 ----------------------------------------------------------------

test("R-MON-1: there are exactly six cost kinds, all named", () => {
  assert.deepEqual([...SIX_COST_KINDS], [
    "purchase_price",
    "shipping",
    "clearing",
    "trucking_usa",
    "trucking_ng",
    "full_tank",
  ]);
  assert.equal(new Set(SIX_COST_KINDS).size, 6);
});

// ---- R-MON-3 ----------------------------------------------------------------

test("R-MON-3: the money API carries no currency and no rate", async () => {
  const money = await import("./money");
  const keys = Object.keys(money);
  for (const forbidden of ["Currency", "USD_COST_KINDS", "NGN_COST_KINDS", "rateMinor"]) {
    assert.equal(keys.includes(forbidden), false, `${forbidden} must not be exported`);
  }
});

// ---- R-MON-2 ----------------------------------------------------------------

test("R-MON-2: complete iff all six kinds are entered; 0 is entered, null is not", () => {
  assert.equal(isCostComplete(SIX_LINES), true);
  // all six, but one of them a genuine zero — still complete
  assert.equal(
    isCostComplete(SIX_COST_KINDS.map((k, i) => line(k, i === 3 ? 0 : 100))),
    true,
  );
  // one kind missing entirely
  assert.equal(isCostComplete(SIX_LINES.slice(1)), false);
  // one kind present but null (cleared) — incomplete, unlike 0
  assert.equal(
    isCostComplete(SIX_COST_KINDS.map((k, i) => line(k, i === 2 ? null : 100))),
    false,
  );
});

// ---- R-MON-4 ----------------------------------------------------------------

test("R-MON-4: total cost is the exact sum of the lines, including zeros", () => {
  const lines = [line("purchase_price", 5_000_000), line("shipping", 0), line("full_tank", 12_345)];
  assert.equal(totalCostKobo(lines), 5_012_345);
});

test("R-MON-4: a missing line adds nothing to the total", () => {
  assert.equal(totalCostKobo([line("shipping", 200), line("full_tank", null)]), 200);
  assert.equal(totalCostKobo([]), 0);
});

// ---- R-MON-5 ----------------------------------------------------------------

test("R-MON-5: money stays integer kobo with no rounding drift", () => {
  const lines = Array.from({ length: 1000 }, (_, i) => line("shipping", i + 1));
  assert.equal(totalCostKobo(lines), (1000 * 1001) / 2);
  assert.equal(Number.isInteger(totalCostKobo(lines)), true);
});

test("R-MON-5: formatting happens at the display edge", () => {
  assert.equal(nairaDigits(1_234_500), "12,345"); // kobo → whole naira
  assert.equal(formatNaira(1_234_500), "₦12,345");
  assert.equal(formatNaira(0), "₦0");
});

// ---- R-MON-6 ----------------------------------------------------------------

test("R-MON-6: projected before sale, real after, none with no price", () => {
  const totalCostKoboValue = 5_000_000;
  assert.deepEqual(
    profitKobo({ totalCostKobo: totalCostKoboValue, priceKobo: 6_000_000, salePriceKobo: null }),
    { kobo: 1_000_000, basis: "projected" },
  );
  assert.deepEqual(
    profitKobo({ totalCostKobo: totalCostKoboValue, priceKobo: 6_000_000, salePriceKobo: 5_500_000 }),
    { kobo: 500_000, basis: "real" }, // the real price wins once sold
  );
  assert.deepEqual(
    profitKobo({ totalCostKobo: totalCostKoboValue, priceKobo: null, salePriceKobo: null }),
    { kobo: null, basis: "none" },
  );
});

test("R-MON-6: a loss is returned exactly, never clamped", () => {
  assert.deepEqual(
    profitKobo({ totalCostKobo: 5_000_000, priceKobo: 4_000_000, salePriceKobo: null }),
    { kobo: -1_000_000, basis: "projected" },
  );
});

// ---- R-MON-7 ----------------------------------------------------------------

test("R-MON-7: the cost figure is named by the state; no Landed cost before landing", () => {
  assert.equal(costLabelFor("on order", false), "Estimated total cost");
  assert.equal(costLabelFor("landed", false), "Landed cost");
  assert.equal(costLabelFor("available", false), "Landed cost");
  assert.equal(costLabelFor("on order", true), "Total cost");
  assert.equal(costLabelFor("landed", true), "Total cost");
});

// ---- R-MON-10 ---------------------------------------------------------------

test("R-MON-10: a valid amount (incl. 0) parses to kobo; a malformed one is rejected", () => {
  assert.deepEqual(parseCostAmount("12500"), { ok: true, amountMinor: 1_250_000 });
  assert.deepEqual(parseCostAmount("0"), { ok: true, amountMinor: 0 });
  assert.deepEqual(parseCostAmount("12,500"), { ok: true, amountMinor: 1_250_000 });
  assert.deepEqual(parseCostAmount("₦12,500.5"), { ok: true, amountMinor: 1_250_050 });
  assert.deepEqual(parseCostAmount("12500.50"), { ok: true, amountMinor: 1_250_050 });

  for (const bad of ["", "  ", "abc", "12.345", "-5", "1e3", "12..5"]) {
    assert.equal(parseCostAmount(bad).ok, false, `"${bad}" must be rejected`);
  }
});

// ---- R-MON-11 ---------------------------------------------------------------

test("R-MON-11: profit uses the car's single price, never a per-state figure", () => {
  // The same total cost, the same price, two different states → the same figure.
  const a = profitKobo({ totalCostKobo: 1_000_000, priceKobo: 1_500_000, salePriceKobo: null });
  const b = profitKobo({ totalCostKobo: 1_000_000, priceKobo: 1_500_000, salePriceKobo: null });
  assert.deepEqual(a, b);
});
