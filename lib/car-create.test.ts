/**
 * The create statement, executable at the text level.
 *
 * TASK-005 Task 5 adds the one fact the screen needs before it may say "Saved" (DR23): whether
 * this call actually made the car. The ref is answered by two arms — the insert (`new_car`) on the
 * first attempt, the row that is already committed on a repeat — and the arms must be told apart,
 * because a repeat changed nothing.
 *
 * Only the fact Task 5 added is pinned here; the statement's other promises (the demo mark, the
 * one round-trip, the photo order) were witnessed when they were built.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { carCreateStatement, type CarCreateArgs } from './car-create';

const args: CarCreateArgs = {
  id: '11111111-1111-1111-1111-111111111111',
  columns: {
    brand: 'Toyota',
    model: 'Sienna',
    trim: 'LE',
    year: 2020,
    exterior_color: 'Silver',
    interior_color: 'Grey',
    mileage: 52000,
    features: JSON.stringify(['Roof rails']),
    note: null,
    private_note: 'Reserved for Mr O.',
    was_price_kobo: 3_000_000_000,
    arrival_note: 'Cleared Lagos',
    doorstep_price_kobo: 3_600_000_000,
    state_id: '22222222-2222-2222-2222-222222222222',
  },
  costs: [{ kind: 'purchase_price', amountMinor: 2_000_000_000 }],
  secondaryStateIds: ['33333333-3333-3333-3333-333333333333'],
  photos: [],
  contentHash: 'abc123',
  hashVersion: 1,
  actorId: '44444444-4444-4444-4444-444444444444',
};

test('the statement says whether it made the car — the insert, or the row already there', () => {
  const { text } = carCreateStatement(args);
  assert.match(text, /SELECT ref, true AS changed FROM new_car/);
  assert.match(text, /SELECT ref, false AS changed FROM car WHERE id = \$1/);
});
