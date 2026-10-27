import type { Section } from './sections';

/**
 * The statements that edit the owner's car-state registry — and the line they will not cross.
 *
 * D15 splits `car_state` in two. The **four fixed primary states** (Available, On Order, Landed,
 * Sold) are what the showroom groups by: not the owner's to add to, rename or delete. The
 * **secondary states** are his, and these are the statements that change them (truth 10).
 *
 * Every statement here names `kind = 'secondary'` in its own `WHERE`, so a primary state is refused
 * by the write itself. The store stands behind that with its own `car_state_primaries_are_final`
 * trigger, so there are two guards and neither is the browser.
 *
 * A secondary state carries **no section** and sets **no new-arrival flag** — both belong to a
 * primary state alone (`car_state_kind_section_ck`, `car_state_kind_new_arrival_ck`) — so neither
 * appears in any statement here. There is no argument for one and no parameter that could carry it.
 *
 * **Idempotency (D18).** The add's key is minted by the caller, once, and every retry sends it back,
 * so `ON CONFLICT (id) DO NOTHING` turns a repeat into a no-op and the trailing `UNION ALL` lets the
 * repeat still report the row. The rename, the recolour and the reorder each set a value — or a
 * whole order — to a target, so a repeat writes the same thing (and `IS DISTINCT FROM` makes it skip
 * even that). The remove's *effect* is idempotent: a repeat finds the row already gone and says so,
 * rather than silently re-creating it.
 *
 * A name is unique across **both** kinds — the store's `car_state_label_unique` covers every row, so
 * a secondary cannot be named after a primary and vice versa. That is the store's rule, enforced
 * there; the statements do not restate it.
 */

/**
 * One row of the registry, as the owner's editor shows it.
 *
 * `cars` counts the store's own references to the state — a primary as a car's one state, a
 * secondary as one of the ones it carries — and counts **every** car row, tombstoned ones included,
 * so the number can never contradict the store's own refusal to delete an occupied state.
 */
export type RegistryState = {
  id: string;
  label: string;
  colour: string;
  kind: 'primary' | 'secondary';
  /** A primary state's section (D15: a section and a primary state are one); a secondary has none. */
  section: Section | null;
  /** How many car rows carry this state. */
  cars: number;
};

/** Adding a secondary state. `id` is minted by the caller once, so a retry is the same state. */
export type CarStateAddArgs = { id: string; label: string; colour: string };

/**
 * A new secondary state, in the store's own order (after every existing secondary), carrying a
 * colour but no section and no new-arrival flag.
 *
 * Shaped like `carCreateStatement`: the `ON CONFLICT (id) DO NOTHING` makes a retry a no-op, and the
 * trailing `UNION ALL` is what lets that retry still report the row it already wrote.
 */
export function carStateAddStatement(args: CarStateAddArgs): { text: string; params: unknown[] } {
  const text = `WITH made AS (
    INSERT INTO car_state (id, label, kind, colour, sort, section, is_new_arrival)
    VALUES ($1::uuid, $2, 'secondary', $3,
            (SELECT COALESCE(MAX(sort), 0) + 1 FROM car_state WHERE kind = 'secondary'),
            NULL, false)
    ON CONFLICT (id) DO NOTHING
    RETURNING id, label
  )
  SELECT id, label FROM made
  UNION ALL
  SELECT id, label FROM car_state WHERE id = $1::uuid`;

  return { text, params: [args.id, args.label, args.colour] };
}

/** Renaming a secondary state. A primary would match no row. */
export function carStateRenameStatement(args: { id: string; label: string }): {
  text: string;
  params: unknown[];
} {
  const text = `UPDATE car_state
     SET label = $2
   WHERE id = $1::uuid AND kind = 'secondary' AND label IS DISTINCT FROM $2
  RETURNING id`;

  return { text, params: [args.id, args.label] };
}

/** Recolouring a secondary state. A primary would match no row. */
export function carStateRecolourStatement(args: { id: string; colour: string }): {
  text: string;
  params: unknown[];
} {
  const text = `UPDATE car_state
     SET colour = $2
   WHERE id = $1::uuid AND kind = 'secondary' AND colour IS DISTINCT FROM $2
  RETURNING id`;

  return { text, params: [args.id, args.colour] };
}

/**
 * The whole secondary order, written at once.
 *
 * The order is the list itself — position in the array is the `sort` — rather than a swap of two
 * neighbours, so it does not depend on the rows already having distinct `sort` values (a fresh
 * registry has them all at 0) and it survives a drag to any position. Only secondaries are touched;
 * a primary has no place in the owner's order. A repeat of the same order moves nothing.
 */
export function carStateReorderStatement(args: { ids: readonly string[] }): {
  text: string;
  params: unknown[];
} {
  const text = `WITH want AS (
    SELECT (t.value)::uuid AS id, (t.ord - 1)::int AS pos
      FROM jsonb_array_elements_text($1::jsonb) WITH ORDINALITY AS t(value, ord)
  ),
  moved AS (
    UPDATE car_state c
       SET sort = w.pos
      FROM want w
     WHERE c.id = w.id AND c.kind = 'secondary' AND c.sort IS DISTINCT FROM w.pos
    RETURNING c.id
  )
  SELECT count(*)::int AS moved FROM moved`;

  return { text, params: [JSON.stringify(args.ids)] };
}

/**
 * Removing a secondary state.
 *
 * Deleting a state a car still carries is refused by the store itself — the foreign keys from `car`
 * and `car_secondary_state` are `ON DELETE RESTRICT` — and that refusal is the point (truth 10): the
 * owner is told why, and nothing is moved out of a state on his behalf.
 */
export function carStateRemoveStatement(args: { id: string }): {
  text: string;
  params: unknown[];
} {
  const text = `DELETE FROM car_state
   WHERE id = $1::uuid AND kind = 'secondary'
  RETURNING label`;

  return { text, params: [args.id] };
}

/**
 * How many rows still point at a state — asked only when the store has just refused to delete it, so
 * the reason shown carries the store's own number rather than the screen's idea of it.
 */
export function carStateHoldersStatement(args: { id: string }): {
  text: string;
  params: unknown[];
} {
  const text = `SELECT (SELECT count(*) FROM car WHERE state_id = $1::uuid)
       + (SELECT count(*) FROM car_secondary_state WHERE state_id = $1::uuid) AS holders`;

  return { text, params: [args.id] };
}
