/**
 * R-CNT — the counting rule, executable.
 *
 * These tests are the model-check for `developer-workspace/models/TASK-002-model.md`
 * §3 (R-CNT-1…3). R-CNT-4 (public exclusion of sold/deleted) and R-CNT-5 (one rule at
 * every read point) are public-path/searches, run in Task 20 — not here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { countStock, type Countable } from './counts';

function car(
  section: Countable['section'],
  opts: { newArrival?: boolean; sold?: boolean } = {}
): Countable {
  return {
    section,
    isNewArrival: opts.newArrival ?? false,
    sold: opts.sold ?? false,
  };
}

test('countStock: an empty stock counts zero', () => {
  assert.deepEqual(countStock([]), {
    available: 0,
    onOrder: 0,
    landed: 0,
    newArrivals: 0,
    sold: 0,
  });
});

test('R-CNT-1: Available = available group + landed-this-year, counted once', () => {
  const counts = countStock([
    car('available'),
    car('available'),
    car('landed', { newArrival: true }), // landed this year — also in Available
    car('landed'), // landed earlier — not added to Available
  ]);
  assert.equal(counts.available, 3); // 2 available + 1 new-arrival landed
  assert.equal(counts.newArrivals, 1); // the "of which N new arrivals" note
  assert.equal(counts.landed, 2);
});

test('R-CNT-1: a doubly-presented new-arrival car is counted once', () => {
  const counts = countStock([car('landed', { newArrival: true })]);
  assert.equal(counts.available, 1);
  assert.equal(counts.newArrivals, 1);
});

test('R-CNT-2: On Order counts exactly the on-order group', () => {
  const counts = countStock([car('on order'), car('on order'), car('available')]);
  assert.equal(counts.onOrder, 2);
});

test('R-CNT-3: Sold sits outside the stock total', () => {
  const counts = countStock([car('available'), car('landed', { sold: true }), car('on order')]);
  assert.equal(counts.sold, 1);
  assert.equal(counts.available, 1);
  assert.equal(counts.landed, 0);
  assert.equal(counts.onOrder, 1);
});

test('R-CNT-3: a car in the Sold section also sits outside the stock total', () => {
  const counts = countStock([car('available'), car('sold'), car('on order')]);
  assert.equal(counts.sold, 1);
  assert.equal(counts.available, 1);
  assert.equal(counts.onOrder, 1);
  assert.equal(counts.landed, 0);
});
