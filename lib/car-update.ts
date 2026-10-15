import type { CarColumns, CarCostLine } from "./car-input";

/**
 * The one statement that changes a car.
 *
 * Kept here, apart from the action, for the same two reasons as the create statement:
 * the action and its witness run the *same* text (no copy to drift), and the statement's
 * shape is visible on its own — the car, its cost lines, its secondary states and its
 * activity row written together in one round-trip, so a half-changed car cannot exist.
 *
 * **It is idempotent** (the precondition the shared store guard retries under, D18). A
 * reply lost on the way back must not double-apply, so the statement first works out
 * whether anything would actually change — the fourteen columns (through the change-
 * check), the cost-line set and the secondary-state set — and does nothing at all when
 * nothing would. That makes a retry a true no-op: the car keeps one `version`, one
 * `updated_at` and **one `car.updated` event**, however many times the call is repeated.
 * The trailing `UNION ALL SELECT ref FROM car …` is what still returns the ref when the
 * statement deliberately changed nothing.
 *
 * It never touches the car's identity: `id` and `ref` are the row's names, not details,
 * and the store's own `car_identity_is_final` trigger refuses any write that would change
 * them. `id` appears only as the `WHERE` key; neither name is ever in the `SET` list.
 *
 * A cost line is replaced wholesale: the submitted set is upserted (`ON CONFLICT
 * (car_id, kind) DO UPDATE`) and any stored kind that is no longer submitted is deleted.
 * The two touch disjoint rows (submitted kinds vs. the rest), so they cannot see — or
 * fight — each other inside the one statement. The six-line rule is the store's
 * (`UNIQUE (car_id, kind)`); money is naira only (R-MON-3).
 */

export type CarUpdateArgs = {
  /** The car's key — the `WHERE` key, never a value written. */
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

export function carUpdateStatement(args: CarUpdateArgs): { text: string; params: unknown[] } {
  const { columns: c } = args;
  const text = `WITH old AS (
    SELECT c.content_hash,
           COALESCE((SELECT jsonb_agg(jsonb_build_array(cl.kind, cl.amount_minor) ORDER BY cl.kind)
                       FROM cost_line cl WHERE cl.car_id = c.id), '[]'::jsonb) AS costs,
           COALESCE((SELECT jsonb_agg(css.state_id ORDER BY css.state_id)
                       FROM car_secondary_state css WHERE css.car_id = c.id), '[]'::jsonb) AS secs
      FROM car c
     WHERE c.id = $1 AND c.deleted_at IS NULL
  ),
  new AS (
    SELECT $16::text AS content_hash,
           COALESCE((SELECT jsonb_agg(jsonb_build_array(x.kind, x.amount_minor) ORDER BY x.kind)
                       FROM jsonb_to_recordset($18::jsonb) AS x(kind text, amount_minor bigint)), '[]'::jsonb) AS costs,
           COALESCE((SELECT jsonb_agg(y.state_id ORDER BY y.state_id)
                       FROM (SELECT DISTINCT (value)::uuid AS state_id
                               FROM jsonb_array_elements_text($19::jsonb)) y), '[]'::jsonb) AS secs
  ),
  changed AS (
    SELECT EXISTS (
      SELECT 1 FROM old o, new n
       WHERE o.content_hash IS DISTINCT FROM n.content_hash
          OR o.costs IS DISTINCT FROM n.costs
          OR o.secs  IS DISTINCT FROM n.secs
    ) AS yes
  ),
  upd AS (
    UPDATE car
       SET brand = $2, model = $3, trim = $4, year = $5,
           exterior_color = $6, interior_color = $7, mileage = $8,
           features = $9, note = $10, private_note = $11, was_price_kobo = $12,
           arrival_note = $13, doorstep_price_kobo = $14, state_id = $15,
           content_hash = $16, hash_version = $17,
           version = version + 1, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND (SELECT yes FROM changed)
    RETURNING id, ref
  ),
  ins_costs AS (
    INSERT INTO cost_line (car_id, kind, amount_minor)
    SELECT u.id, cost.kind, cost.amount_minor
      FROM upd u
      CROSS JOIN jsonb_to_recordset($18::jsonb) AS cost(kind text, amount_minor bigint)
    ON CONFLICT (car_id, kind) DO UPDATE SET amount_minor = EXCLUDED.amount_minor, updated_at = now()
    RETURNING 1
  ),
  del_costs AS (
    DELETE FROM cost_line cl
     WHERE cl.car_id IN (SELECT id FROM upd)
       AND cl.kind NOT IN (
         SELECT cost.kind FROM jsonb_to_recordset($18::jsonb) AS cost(kind text, amount_minor bigint)
       )
    RETURNING 1
  ),
  ins_secondaries AS (
    INSERT INTO car_secondary_state (car_id, state_id)
    SELECT u.id, (s.value)::uuid
      FROM upd u
      CROSS JOIN jsonb_array_elements_text($19::jsonb) AS s(value)
    ON CONFLICT DO NOTHING
    RETURNING 1
  ),
  del_secondaries AS (
    DELETE FROM car_secondary_state css
     WHERE css.car_id IN (SELECT id FROM upd)
       AND css.state_id NOT IN (
         SELECT (s.value)::uuid FROM jsonb_array_elements_text($19::jsonb) AS s(value)
       )
    RETURNING 1
  ),
  ins_event AS (
    INSERT INTO activity_event (kind, subject, actor_id)
    SELECT 'car.updated', u.ref, $20::uuid
      FROM upd u
    RETURNING 1
  )
  SELECT ref FROM upd
  UNION
  SELECT ref FROM car WHERE id = $1 AND deleted_at IS NULL`;

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
