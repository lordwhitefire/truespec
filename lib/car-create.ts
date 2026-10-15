import type { CarColumns, CarCostLine } from "./car-input";

/**
 * The one statement that makes a car.
 *
 * Kept here, apart from the action, for two reasons: the action and its witness run
 * the *same* text (no copy to drift), and the statement's shape is visible on its own
 * — a car, its cost lines, its secondary states and its activity row written together
 * in one round-trip, so a half-made car cannot exist.
 *
 * It is **idempotent**: the key is minted by the caller, once, and every retry sends
 * the same `id`. The `ON CONFLICT (id) DO NOTHING` turns a repeat into a no-op, and
 * because only the `new_car` CTE's row feeds the cost/secondary/event inserts, a
 * repeat writes none of them again. The trailing `UNION ALL SELECT … WHERE id = $1`
 * is what lets a repeat still return the ref: on the first attempt it comes from the
 * insert, on a retry from the row that is already committed.
 *
 * Money is Naira only (R-MON-3): every cost line is `NGN` with no rate.
 */

export type CarCreateArgs = {
  /** The car's key, minted by the caller and reused on every retry. */
  id: string;
  columns: CarColumns;
  costs: readonly CarCostLine[];
  secondaryStateIds: readonly string[];
  /** The server-computed change-check (truth 14). */
  contentHash: string;
  hashVersion: number;
  /** The signed-in owner, for the activity row (D20). */
  actorId: string;
};

export function carCreateStatement(args: CarCreateArgs): { text: string; params: unknown[] } {
  const { columns: c } = args;
  const text = `WITH new_car AS (
    INSERT INTO car (
      id, brand, model, trim, year, exterior_color, interior_color, mileage,
      features, note, private_note, was_price_kobo, arrival_note, doorstep_price_kobo,
      state_id, content_hash, hash_version
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    ON CONFLICT (id) DO NOTHING
    RETURNING id, ref
  ),
  ins_costs AS (
    INSERT INTO cost_line (car_id, kind, amount_minor)
    SELECT nc.id, cost.kind, cost.amount_minor
      FROM new_car nc
      CROSS JOIN jsonb_to_recordset($18::jsonb) AS cost(kind text, amount_minor bigint)
    RETURNING 1
  ),
  ins_secondaries AS (
    INSERT INTO car_secondary_state (car_id, state_id)
    SELECT nc.id, (s.value)::uuid
      FROM new_car nc
      CROSS JOIN jsonb_array_elements_text($19::jsonb) AS s(value)
    RETURNING 1
  ),
  ins_event AS (
    INSERT INTO activity_event (kind, subject, actor_id)
    SELECT 'car.created', nc.ref, $20::uuid
      FROM new_car nc
    RETURNING 1
  )
  SELECT ref FROM new_car
  UNION ALL
  SELECT ref FROM car WHERE id = $1`;

  const params: unknown[] = [
    args.id,
    c.brand,
    c.model,
    c.trim,
    c.year,
    c.exterior_color,
    c.interior_color,
    c.mileage,
    c.features,
    c.note,
    c.private_note,
    c.was_price_kobo,
    c.arrival_note,
    c.doorstep_price_kobo,
    c.state_id,
    args.contentHash,
    args.hashVersion,
    JSON.stringify(args.costs.map((cost) => ({ kind: cost.kind, amount_minor: cost.amountMinor }))),
    JSON.stringify(args.secondaryStateIds),
    args.actorId,
  ];
  return { text, params };
}
