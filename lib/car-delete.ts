import type { CarCostLine } from './car-input';

/**
 * The three statements a car's removal is made of — delete, undo, and the owner's
 * permanent removal.
 *
 * Kept here, apart from the action, for the same reason as the create and update
 * statements: the action and its witness run the *same* text (no copy to drift), and
 * each statement's shape is visible on its own.
 *
 * **Delete is a tombstone, not a removal** (truth 6, specs/inventory). `deleted_at` is
 * set; every office read already excludes it (`lib/office.ts`), so the car leaves every
 * screen at once while its photos, costs, state and sale stay intact. Undo clears the
 * column — it is the only column either statement touches, so a restored car is
 * byte-for-byte the car that was deleted (specs/inventory: "restored byte-for-byte").
 *
 * **Removal is the owner's own action, and nothing else removes a car** (owner ruling
 * 2026-10-13). The statement refuses a car that is not a tombstone (`deleted_at IS NOT
 * NULL`), so the delete-then-remove order cannot be skipped by a stale request, and it
 * returns the car's photo asset ids **before** the row goes (the same statement's
 * snapshot), for the caller to clear in the asset store. Rows go by the foreign keys'
 * own cascade (`cost_line`, `car_photo` and `sale` all `ON DELETE CASCADE`); the bytes
 * are cleared by the caller and reported, never swallowed.
 *
 * All three are **idempotent** (the precondition the shared store guard retries under,
 * D18). A retry of a delete finds it already tombstoned; a retry of an undo finds it
 * already live; a retry of a removal finds nothing left to remove — and each writes its
 * activity row only when it actually changed the row, so no retry doubles an event.
 */

export type CarDeleteArgs = { id: string; actorId: string };

/** Soft-delete a live car; a car already tombstoned (a retry) is left alone. */
export function carDeleteStatement(args: CarDeleteArgs): { text: string; params: unknown[] } {
  return {
    text: `WITH upd AS (
    UPDATE car
       SET deleted_at = now()
     WHERE id = $1 AND deleted_at IS NULL
    RETURNING id, ref
  ),
  ev AS (
    INSERT INTO activity_event (kind, subject, actor_id)
    SELECT 'car.deleted', ref, $2::uuid FROM upd
    RETURNING 1
  )
  SELECT ref FROM upd
  UNION ALL
  SELECT ref FROM car WHERE id = $1 AND deleted_at IS NOT NULL`,
    params: [args.id, args.actorId],
  };
}

/** Undo a tombstone; a car already live (a retry) is left alone. */
export function carRestoreStatement(args: CarDeleteArgs): { text: string; params: unknown[] } {
  return {
    text: `WITH upd AS (
    UPDATE car
       SET deleted_at = NULL
     WHERE id = $1 AND deleted_at IS NOT NULL
    RETURNING id, ref
  ),
  ev AS (
    INSERT INTO activity_event (kind, subject, actor_id)
    SELECT 'car.restored', ref, $2::uuid FROM upd
    RETURNING 1
  )
  SELECT ref FROM upd
  UNION ALL
  SELECT ref FROM car WHERE id = $1 AND deleted_at IS NULL`,
    params: [args.id, args.actorId],
  };
}

/** Remove a tombstoned car for good, returning its ref and the asset ids to clear. */
export function carRemoveStatement(args: CarDeleteArgs): { text: string; params: unknown[] } {
  return {
    text: `WITH photos AS (
    SELECT sanity_asset_id FROM car_photo WHERE car_id = $1
  ),
  del AS (
    DELETE FROM car
     WHERE id = $1 AND deleted_at IS NOT NULL
    RETURNING id, ref
  ),
  ev AS (
    INSERT INTO activity_event (kind, subject, actor_id)
    SELECT 'car.removed', ref, $2::uuid FROM del
    RETURNING 1
  )
  SELECT (SELECT ref FROM del) AS ref,
         COALESCE((SELECT jsonb_agg(sanity_asset_id) FROM photos), '[]'::jsonb) AS assets`,
    params: [args.id, args.actorId],
  };
}

/**
 * The cost kinds the store holds, for a caller that needs to describe what a removal
 * took with it. Kept beside the statements so the witness and the action name the same
 * set (the store's own `UNIQUE (car_id, kind)` and CHECK are the real authority).
 */
export const CAR_COST_KINDS: readonly CarCostLine['kind'][] = [
  'purchase_price',
  'shipping',
  'clearing',
  'trucking_usa',
  'trucking_ng',
  'full_tank',
];
