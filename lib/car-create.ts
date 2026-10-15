import type { CarColumns, CarCostLine } from "./car-input";

/**
 * The one statement that makes a car.
 *
 * Kept here, apart from the action, for two reasons: the action and its witness run
 * the *same* text (no copy to drift), and the statement's shape is visible on its own
 * — a car, its cost lines, its secondary states, its photos and its activity row written
 * together in one round-trip, so a half-made car cannot exist.
 *
 * The photos arrive as the ordered list of asset ids the owner uploaded **before** this
 * write (truth 7: the bytes go to the store first, the row links after). Their order is
 * their position — `jsonb_array_elements_text(...) WITH ORDINALITY` numbers them, and
 * position 0 is the cover the showroom leads with. Every one is an `owner upload`: a car
 * being made has no earlier source to keep, and the action has already refused anything
 * that is not a Sanity asset reference (the column never holds a web address).
 *
 * It is **idempotent**: the key is minted by the caller, once, and every retry sends
 * the same `id`. The `ON CONFLICT (id) DO NOTHING` turns a repeat into a no-op, and
 * because only the `new_car` CTE's row feeds the cost/secondary/event inserts, a
 * repeat writes none of them again. The trailing `UNION ALL SELECT … WHERE id = $1`
 * is what lets a repeat still return the ref: on the first attempt it comes from the
 * insert, on a retry from the row that is already committed.
 *
 * Money is Naira only (R-MON-3): every cost line is `NGN` with no rate.
 *
 * **`is_demo` is written here, as a literal, and cannot be left out** (task.md:280-284: "anything the
 * application creates while the demonstration is the fleet is demonstration data … nothing this layer
 * writes may slip in without it"). A car the owner adds while trying the office out is the
 * demonstration's, exactly as a seeded car is — so the one move that empties the demo still empties it.
 * The column's default is `false`; leaning on it is how a row would slip in unmarked, which is why the
 * statement names the column and its value rather than trusting the schema. The same fact is written
 * once in each of this layer's three content writes (car, `enquiry`, `draft`).
 */

export type CarCreateArgs = {
  /** The car's key, minted by the caller and reused on every retry. */
  id: string;
  columns: CarColumns;
  costs: readonly CarCostLine[];
  secondaryStateIds: readonly string[];
  /** The photos, in the order to store them — position 0 is the cover (truth 7). */
  photos: readonly string[];
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
      state_id, content_hash, hash_version, is_demo
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, true)
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
  ),
  ins_photos AS (
    INSERT INTO car_photo (car_id, sanity_asset_id, position, origin)
    SELECT nc.id, p.asset_id, (p.ord - 1)::int, 'owner upload'
      FROM new_car nc
      CROSS JOIN jsonb_array_elements_text($21::jsonb) WITH ORDINALITY AS p(asset_id, ord)
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
    JSON.stringify(args.photos),
  ];
  return { text, params };
}
