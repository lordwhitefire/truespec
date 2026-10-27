/**
 * The removal statements, executable at the text level.
 *
 * Task 13's claims, without a store: a delete **tombstones** (sets `deleted_at` and
 * nothing else — no editable column, no `updated_at`, no content hash), an undo
 * **clears exactly that column** so a restore is byte-for-byte, and the permanent
 * removal **refuses a car that is not a tombstone** and returns the photo asset ids
 * for the caller to clear. Each statement writes its own activity row **from the
 * changed rows**, so a retry — a delete already tombstoned, an undo already live, a
 * removal already done — writes no second event.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { carDeleteStatement, carRestoreStatement, carRemoveStatement } from './car-delete';

const args = {
  id: '11111111-1111-1111-1111-111111111111',
  actorId: '44444444-4444-4444-4444-444444444444',
};

test('delete tombstones with deleted_at and touches nothing else', () => {
  const { text } = carDeleteStatement(args);
  assert.match(text, /UPDATE car\s+SET deleted_at = now\(\)/);
  // Nothing else can move: not the bookkeeping timestamp, not the change-check, not a
  // single editable column — so an undo restores the car exactly.
  assert.doesNotMatch(text, /updated_at/);
  assert.doesNotMatch(text, /content_hash/);
  for (const col of ['brand', 'model', 'trim', 'private_note', 'state_id', 'version']) {
    assert.doesNotMatch(text, new RegExp(`\\b${col}\\b`));
  }
  assert.ok(text.includes("'car.deleted'"));
  assert.match(text, /WHERE id = \$1 AND deleted_at IS NULL/);
});

test('delete is idempotent: a retry finds it already tombstoned and writes no second event', () => {
  const { text } = carDeleteStatement(args);
  // The event comes only from the rows the UPDATE changed; the tail returns the ref
  // for an already-tombstoned car so the caller still gets an honest answer.
  assert.match(text, /INSERT INTO activity_event[\s\S]*?FROM upd/);
  assert.match(text, /SELECT ref FROM car WHERE id = \$1 AND deleted_at IS NOT NULL/);
});

test('undo clears deleted_at and nothing else', () => {
  const { text } = carRestoreStatement(args);
  assert.match(text, /UPDATE car\s+SET deleted_at = NULL/);
  assert.doesNotMatch(text, /updated_at/);
  assert.doesNotMatch(text, /content_hash/);
  assert.ok(text.includes("'car.restored'"));
  assert.match(text, /WHERE id = \$1 AND deleted_at IS NOT NULL/);
});

test('permanent removal refuses a car that is not a tombstone', () => {
  const { text } = carRemoveStatement(args);
  assert.match(text, /DELETE FROM car\s+WHERE id = \$1 AND deleted_at IS NOT NULL/);
});

test('permanent removal returns the photo asset ids from before the row goes', () => {
  const { text } = carRemoveStatement(args);
  // The photos CTE reads the same snapshot the DELETE cascades, so the ids survive to
  // the caller — the store's cascade takes the rows, the caller clears the bytes.
  assert.match(text, /FROM car_photo WHERE car_id = \$1/);
  assert.match(text, /jsonb_agg\(sanity_asset_id\)/);
  assert.ok(text.includes("'car.removed'"));
});

test('every statement binds exactly the id and the actor', () => {
  assert.deepEqual(carDeleteStatement(args).params, [args.id, args.actorId]);
  assert.deepEqual(carRestoreStatement(args).params, [args.id, args.actorId]);
  assert.deepEqual(carRemoveStatement(args).params, [args.id, args.actorId]);
});
