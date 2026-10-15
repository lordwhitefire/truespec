/**
 * The statements that edit the owner's enquiry-state registry (truth 10).
 *
 * An enquiry state is the same kind of thing as a car's **secondary** states and no more: New,
 * Talking, Negotiating, Sold, Lost are the ones the store ships with, and adding to them, renaming
 * them, recolouring them, reordering them and removing them is the owner's. Nothing here is fixed —
 * there is no primary/secondary split in `enquiry_state`, so every row is his (contrast
 * `lib/car-state.ts`, where the four primary states are out of reach).
 *
 * What the states are **not** is a pipeline. Truth 13: giving an enquiry any state at any time is
 * legal — nothing requires one state to come before another, and setting an enquiry to Sold changes
 * nothing about any car. Nothing in this file, and nothing in the board that reads it, asserts an
 * order of meaning: `sort` decides what the board *lays out* in, and no more.
 *
 * **Idempotency (D18).** As in the car registry: the add's key is minted by the caller once, and a
 * repeat lands on `ON CONFLICT (id) DO NOTHING` and still reports the row through the trailing
 * `UNION ALL`; the rename and the recolour set a value to a target under `IS DISTINCT FROM`, so a
 * repeat writes nothing; the reorder writes the whole list, so a repeat moves nothing; and the
 * remove's effect is idempotent — a repeat finds the row already gone and says so.
 *
 * A name is unique: the store's own `UNIQUE (label)` on `enquiry_state` (added in `0009`). It is not
 * restated here.
 */

/**
 * One row of the enquiry-state registry, as the owner's editor shows it.
 *
 * `enquiries` counts the store's own references to the state and counts **every** enquiry row, so
 * the number beside a state can never contradict the store's own refusal to delete an occupied one.
 */
export type EnquiryRegistryState = {
  id: string;
  label: string;
  colour: string;
  /** How many enquiries carry this state. */
  enquiries: number;
};

/** Adding a state. `id` is minted by the caller once, so a retry is the same state. */
export type EnquiryStateAddArgs = { id: string; label: string; colour: string };

/** A new state, after every existing one in the owner's order. */
export function enquiryStateAddStatement(args: EnquiryStateAddArgs): {
  text: string;
  params: unknown[];
} {
  const text = `WITH made AS (
    INSERT INTO enquiry_state (id, label, colour, sort)
    VALUES ($1::uuid, $2, $3,
            (SELECT COALESCE(MAX(sort), 0) + 1 FROM enquiry_state))
    ON CONFLICT (id) DO NOTHING
    RETURNING id, label
  )
  SELECT id, label FROM made
  UNION ALL
  SELECT id, label FROM enquiry_state WHERE id = $1::uuid`;

  return { text, params: [args.id, args.label, args.colour] };
}

/** Renaming a state. A repeat of the same name writes nothing. */
export function enquiryStateRenameStatement(args: { id: string; label: string }): {
  text: string;
  params: unknown[];
} {
  const text = `UPDATE enquiry_state
     SET label = $2
   WHERE id = $1::uuid AND label IS DISTINCT FROM $2
  RETURNING id`;

  return { text, params: [args.id, args.label] };
}

/** Recolouring a state. A repeat of the same colour writes nothing. */
export function enquiryStateRecolourStatement(args: { id: string; colour: string }): {
  text: string;
  params: unknown[];
} {
  const text = `UPDATE enquiry_state
     SET colour = $2
   WHERE id = $1::uuid AND colour IS DISTINCT FROM $2
  RETURNING id`;

  return { text, params: [args.id, args.colour] };
}

/**
 * The whole order, written at once — position in the list is the `sort`.
 *
 * The list rather than a swap of neighbours, so it does not depend on the rows already having
 * distinct `sort` values and it survives a drag to any position. A repeat of the same order moves
 * nothing. This is **layout order**, not meaning: the board draws the groups in it and asserts
 * nothing about one state coming before another (truth 13).
 */
export function enquiryStateReorderStatement(args: { ids: readonly string[] }): {
  text: string;
  params: unknown[];
} {
  const text = `WITH want AS (
    SELECT (t.value)::uuid AS id, (t.ord - 1)::int AS pos
      FROM jsonb_array_elements_text($1::jsonb) WITH ORDINALITY AS t(value, ord)
  ),
  moved AS (
    UPDATE enquiry_state s
       SET sort = w.pos
      FROM want w
     WHERE s.id = w.id AND s.sort IS DISTINCT FROM w.pos
    RETURNING s.id
  )
  SELECT count(*)::int AS moved FROM moved`;

  return { text, params: [JSON.stringify(args.ids)] };
}

/**
 * Removing a state.
 *
 * Deleting a state an enquiry still sits in is refused by the store itself — `enquiry_state_id` is
 * `REFERENCES enquiry_state (id) ON DELETE RESTRICT` — and that refusal is the point (truth 10): the
 * owner is told why, and nothing is moved out of a state on his behalf.
 */
export function enquiryStateRemoveStatement(args: { id: string }): {
  text: string;
  params: unknown[];
} {
  const text = `DELETE FROM enquiry_state
   WHERE id = $1::uuid
  RETURNING label`;

  return { text, params: [args.id] };
}

/**
 * How many enquiries still sit in a state — asked only when the store has just refused to delete it,
 * so the reason shown carries the store's own number rather than the screen's idea of it.
 */
export function enquiryStateHoldersStatement(args: { id: string }): {
  text: string;
  params: unknown[];
} {
  const text = `SELECT count(*)::int AS holders FROM enquiry WHERE enquiry_state_id = $1::uuid`;

  return { text, params: [args.id] };
}
