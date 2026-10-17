import type { CarColumns, CarCostLine } from "./car-input";
import type { SaleInput } from "./sale";

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
 * check), the cost-line set, the secondary-state set, the sale and **the photo set in
 * its order** — and does nothing at all when nothing would. That makes a retry a true
 * no-op: the car keeps one `version`, one `updated_at` and **one `car.updated` event**,
 * however many times the call is repeated. The trailing `SELECT ref, false … FROM car …`
 * is what still returns the ref when the statement deliberately changed nothing — and it
 * carries **which of the two happened** (`changed`), so the action can pass the fact on and
 * the screen can say *"Nothing changed."* instead of claiming a save that never happened
 * (DR23). The second branch is guarded by `NOT EXISTS (SELECT 1 FROM upd)` because the
 * fallback reads the statement's own snapshot: when the write *did* happen the car row is
 * still visible to it, and without the guard the statement would return two rows.
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
 *
 * **The sale rides the same write** (truth 5: Sold is a primary state, and setting it is
 * what performs the sale). The sale row and the car's `state_id` are one fact, so they
 * move together or not at all:
 *
 *   * marking Sold upserts the sale (price, date) with `prior_state_id` taken from the
 *     car's **own row before this write** — the previous primary state comes from the
 *     store, never from the browser;
 *   * leaving Sold deletes it, so no real-profit residue can survive an un-marking;
 *   * re-saving an unchanged Sold car keeps the sale's original `prior_state_id`, so
 *     correcting the price cannot lose the state the car came from.
 *
 * The sale is part of the `changed` guard, so correcting only the price is still a real
 * write — and a retry of any of it is still a true no-op.
 */

export type CarUpdateArgs = {
  /** The car's key — the `WHERE` key, never a value written. */
  id: string;
  columns: CarColumns;
  costs: readonly CarCostLine[];
  secondaryStateIds: readonly string[];
  /**
   * The photos, in the order the office should store them — position 0 is the cover
   * (truth 7). The list is the whole set: a photo left out is a photo removed. The
   * bytes are already in the asset store; only the references are written here, and
   * each keeps the source it was stored with (`car_photo.origin`) unless it is new,
   * which makes it an `owner upload`. Never a web address.
   */
  photos: readonly string[];
  /**
   * The sale facts, when this write is setting the car Sold; `null` otherwise (which is
   * also what un-marks a sold car). Only the Sold state may carry one — the action drops
   * it everywhere else through `saleForState` before the statement is built.
   */
  sale: SaleInput | null;
  /** The server-computed change-check (truth 14). */
  contentHash: string;
  hashVersion: number;
  /** The signed-in owner, for the activity row (D20). */
  actorId: string;
};

export function carUpdateStatement(args: CarUpdateArgs): { text: string; params: unknown[] } {
  const { columns: c } = args;
  const text = `WITH old AS (
    SELECT c.content_hash, c.state_id AS state_id,
           COALESCE((SELECT jsonb_agg(jsonb_build_array(cl.kind, cl.amount_minor) ORDER BY cl.kind)
                       FROM cost_line cl WHERE cl.car_id = c.id), '[]'::jsonb) AS costs,
           COALESCE((SELECT jsonb_agg(css.state_id ORDER BY css.state_id)
                       FROM car_secondary_state css WHERE css.car_id = c.id), '[]'::jsonb) AS secs,
           COALESCE((SELECT jsonb_agg(jsonb_build_array(cp.sanity_asset_id, cp.origin) ORDER BY cp.position)
                       FROM car_photo cp WHERE cp.car_id = c.id), '[]'::jsonb) AS photos,
           COALESCE((SELECT 's' || s.sale_price_kobo::text || '@'
                            || to_char(s.sold_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')
                       FROM sale s WHERE s.car_id = c.id), '#') AS sold
      FROM car c
     WHERE c.id = $1 AND c.deleted_at IS NULL
  ),
  new AS (
    SELECT $16::text AS content_hash,
           COALESCE((SELECT jsonb_agg(jsonb_build_array(x.kind, x.amount_minor) ORDER BY x.kind)
                       FROM jsonb_to_recordset($18::jsonb) AS x(kind text, amount_minor bigint)), '[]'::jsonb) AS costs,
           COALESCE((SELECT jsonb_agg(y.state_id ORDER BY y.state_id)
                       FROM (SELECT DISTINCT (value)::uuid AS state_id
                               FROM jsonb_array_elements_text($19::jsonb)) y), '[]'::jsonb) AS secs,
           COALESCE((SELECT jsonb_agg(jsonb_build_array(p.asset_id,
                                      COALESCE((SELECT cp0.origin FROM car_photo cp0
                                                 WHERE cp0.car_id = $1 AND cp0.sanity_asset_id = p.asset_id
                                                 LIMIT 1), 'owner upload')) ORDER BY p.ord)
                       FROM jsonb_array_elements_text($23::jsonb) WITH ORDINALITY AS p(asset_id, ord)), '[]'::jsonb) AS photos,
           CASE WHEN $21::bigint IS NULL AND $22::timestamptz IS NULL THEN '#'
                ELSE 's' || $21::bigint::text || '@'
                     || to_char($22::timestamptz AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')
           END AS sold
  ),
  changed AS (
    SELECT EXISTS (
      SELECT 1 FROM old o, new n
       WHERE o.content_hash IS DISTINCT FROM n.content_hash
          OR o.costs IS DISTINCT FROM n.costs
          OR o.secs  IS DISTINCT FROM n.secs
          OR o.photos IS DISTINCT FROM n.photos
          OR o.sold  IS DISTINCT FROM n.sold
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
  ins_photos AS (
    INSERT INTO car_photo (car_id, sanity_asset_id, position, origin)
    SELECT u.id, p.asset_id, (p.ord - 1)::int,
           COALESCE((SELECT cp0.origin FROM car_photo cp0
                      WHERE cp0.car_id = u.id AND cp0.sanity_asset_id = p.asset_id LIMIT 1), 'owner upload')
      FROM upd u
      CROSS JOIN jsonb_array_elements_text($23::jsonb) WITH ORDINALITY AS p(asset_id, ord)
    ON CONFLICT (car_id, position) DO UPDATE
       SET sanity_asset_id = EXCLUDED.sanity_asset_id, origin = EXCLUDED.origin
    RETURNING 1
  ),
  del_photos AS (
    DELETE FROM car_photo cp
     WHERE cp.car_id IN (SELECT id FROM upd)
       AND cp.position >= (SELECT count(*)::int FROM jsonb_array_elements_text($23::jsonb))
    RETURNING 1
  ),
  ins_sale AS (
    INSERT INTO sale (car_id, sale_price_kobo, sold_at, prior_state_id)
    SELECT u.id, $21::bigint, $22::timestamptz, (SELECT o.state_id FROM old o)
      FROM upd u
     WHERE $21::bigint IS NOT NULL AND $22::timestamptz IS NOT NULL
    ON CONFLICT (car_id) DO UPDATE
       SET sale_price_kobo = EXCLUDED.sale_price_kobo,
           sold_at = EXCLUDED.sold_at
    RETURNING 1
  ),
  del_sale AS (
    DELETE FROM sale
     WHERE car_id IN (SELECT id FROM upd)
       AND ($21::bigint IS NULL OR $22::timestamptz IS NULL)
    RETURNING 1
  ),
  ins_event AS (
    INSERT INTO activity_event (kind, subject, actor_id)
    SELECT CASE
             WHEN (SELECT sold FROM old) = '#' AND (SELECT sold FROM new) <> '#' THEN 'car.sold'
             WHEN (SELECT sold FROM old) <> '#' AND (SELECT sold FROM new) = '#' THEN 'car.unsold'
             ELSE 'car.updated'
           END,
           u.ref, $20::uuid
      FROM upd u
    RETURNING 1
  )
  SELECT ref, true AS changed FROM upd
  UNION ALL
  SELECT ref, false AS changed FROM car
   WHERE id = $1 AND deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM upd)`;

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
    args.sale?.salePriceKobo ?? null,
    args.sale?.soldAt ?? null,
    JSON.stringify(args.photos),
  ];
  return { text, params };
}
