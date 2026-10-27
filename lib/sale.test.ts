/**
 * R-SLD — the sale rules, executable (restated for D15).
 *
 * Sold is a primary state and setting it performs the sale (truth 5). The rule this module
 * owns is that the sale belongs to the Sold state and nowhere else.
 *
 * The neighbours keep the rest: the write that follows is `car-update.test.ts` (statement
 * text) and the witness `developer-workspace/scripts/task-004/sold-car-check.ts` (store);
 * profit moving from projected to real is `money.test.ts` (R-MON-6); a sold car leaving
 * the count is `counts.test.ts`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { saleForState, SOLD_SECTION, type SaleInput } from './sale';

const SALE: SaleInput = { salePriceKobo: 30_000_000, soldAt: '2026-09-15T12:00:00.000Z' };

test('R-SLD-1: the Sold state is the one section, and it keeps the sale', () => {
  assert.equal(SOLD_SECTION, 'sold');
  assert.deepEqual(saleForState(SOLD_SECTION, SALE), SALE);
});

test('R-SLD-1: a price and a date sent with any other state are dropped', () => {
  for (const section of ['available', 'on order', 'landed'] as const) {
    assert.equal(saleForState(section, SALE), null, `${section} keeps no sale`);
  }
});

test('R-SLD-1: a Sold state with no sale stays no sale — the action decides that, not this', () => {
  assert.equal(saleForState(SOLD_SECTION, null), null);
});
