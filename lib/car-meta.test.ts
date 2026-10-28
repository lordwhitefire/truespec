import assert from 'node:assert/strict';
import test from 'node:test';

import { carDescription } from './car-meta';
import { baseCar, withCar } from './__fixtures__/public-car';

test('a live car description is 150–160 characters and carries the public facts', () => {
  const text = carDescription(baseCar, false);

  assert.match(
    text,
    /^2021 Toyota Camry XSE V6 — ₦34,500,000, 31,000 km\. Available from TrueSpec Automotive/
  );
  assert.match(text, /One price\.$/);
  assert.ok(text.length >= 150 && text.length <= 160, `length was ${text.length}`);
});

test('a very short name uses the no-fees sentence to reach 150 characters', () => {
  const text = carDescription(
    withCar({
      brand: 'Kia',
      model: 'Rio GT Line',
      trim: null,
      year: 2021,
      mileageKm: 0,
      priceKobo: 9600000000,
    }),
    false
  );

  assert.match(text, /One price, no fees\.$/);
  assert.doesNotMatch(text, /…/);
  assert.ok(text.length >= 150 && text.length <= 160, `length was ${text.length}`);
});

test('a sold car description starts with Sold and stays within 160 characters', () => {
  const text = carDescription(baseCar, true);

  assert.match(text, /^Sold — 2021 Toyota Camry XSE V6\. ₦34,500,000, 31,000 km\./);
  assert.match(text, /See what else TrueSpec Automotive has available/);
  assert.ok(text.length <= 160, `length was ${text.length}`);
});

test('a long test-car name still lands in the window with a complete sentence', () => {
  const text = carDescription(
    withCar({ brand: 'TS-FLOW-1792145622497', model: 'Flow2', trim: 'STD', year: 2020 }),
    false
  );

  assert.ok(text.length <= 160, `length was ${text.length}`);
  assert.ok(text.length >= 150, `length was ${text.length}`);
  assert.doesNotMatch(text, /…/);
});

test('missing mileage is omitted, never written as null or a placeholder', () => {
  const text = carDescription(withCar({ mileageKm: null }), false);

  assert.doesNotMatch(text, /null|undefined|Mileage not stated/i);
  assert.doesNotMatch(text, /₦34,500,000, \./);
});

test('a very long name still produces a single capped description', () => {
  const text = carDescription(withCar({ brand: 'A'.repeat(200), model: 'B', trim: null }), false);

  assert.ok(text.length <= 160, `length was ${text.length}`);
  assert.match(text, /…$/);
});
