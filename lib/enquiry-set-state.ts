/**
 * Setting an enquiry's state — the one write the office makes to an enquiry (truth 10, truth 13).
 *
 * An enquiry's **state is its only editable detail the owner changes day to day**: the name, the
 * number, what was asked for and the note come from the sheet he imported (Tasks 23–24), and the
 * five editable details are the recipe's business, not this file's. What this file does is let him
 * give an enquiry **any** state at **any** time — New to Sold on the day it arrives is legal, and
 * nothing requires one state to come before another, because the states are labels and not stages
 * (truth 13, D12). Setting an enquiry to Sold changes nothing about any car: the two records are
 * separate, and this statement names only `enquiry`.
 *
 * The change-check is the server's (truth 14). The value written into `content_hash` is computed by
 * the action from the row's **stored** editable values with the new state in place — never taken
 * from the browser — so the office can still tell "the details really changed" from "the row was
 * written again with the same details".
 *
 * **Idempotency (D18).** The whole write is gated on the state actually differing from the one the
 * row already holds, so a retry — a reply that was lost — finds nothing to change and writes
 * nothing: `updated_at` does not move a second time and the hash is not touched. The trailing arm is
 * what lets that repeat still report the row it found.
 */

/**
 * The row's editable details, as they are stored — read only so the action can recompute the
 * change-check from the store's own values. Exactly the `ENQUIRY_RECIPE` fields (`lib/change-check.ts`),
 * and nothing else: identity (`id`, `handle`, `is_demo`) is not an ingredient.
 */
export function enquiryEditableStatement(args: { id: string }): {
  text: string;
  params: unknown[];
} {
  const text = `SELECT name, number, asked_for, note, enquiry_state_id
     FROM enquiry
    WHERE id = $1::uuid`;

  return { text, params: [args.id] };
}

export type EnquirySetStateArgs = {
  id: string;
  stateId: string;
  /** The server's own hash of the row's editable values, with the new state in place (truth 14). */
  contentHash: string;
  hashVersion: number;
};

/**
 * Give an enquiry a state, in one write. A repeat of the same state is a true no-op: the row is
 * reported, and nothing is written.
 */
export function enquirySetStateStatement(args: EnquirySetStateArgs): {
  text: string;
  params: unknown[];
} {
  const text = `WITH old AS (
    SELECT id, enquiry_state_id FROM enquiry WHERE id = $1::uuid
  ),
  changed AS (
    SELECT (o.enquiry_state_id IS DISTINCT FROM $2::uuid) AS yes FROM old o
  ),
  upd AS (
    UPDATE enquiry
       SET enquiry_state_id = $2::uuid,
           content_hash = $3, hash_version = $4,
           updated_at = now()
     WHERE id = $1::uuid AND (SELECT yes FROM changed)
    RETURNING id
  )
  SELECT id FROM upd
  UNION
  SELECT id FROM enquiry WHERE id = $1::uuid`;

  return { text, params: [args.id, args.stateId, args.contentHash, args.hashVersion] };
}
