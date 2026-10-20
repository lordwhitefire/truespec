/**
 * Editing a saved enquiry — the one write that changes its five editable details (owner ruling
 * 2026-10-20, #4; truth 10, truth 14).
 *
 * The five details are the enquiry's own: the name, the number, what was asked for, the note, and
 * the state it sits in. This statement moves all five, with the server's `content_hash` and
 * `hash_version`, in one write.
 *
 * **Idempotency (D18).** The write is gated on any of the five actually differing from the row the
 * store holds (`IS DISTINCT FROM`, so `null` and `''` are one value). A retry that carries the same
 * details writes nothing: `updated_at` does not move again, and — once the activity log names the
 * ref — there is no second event to write. The trailing select still reports the row, with
 * `changed = false`, so the screen can say "Nothing changed" rather than claim a save.
 *
 * The hash is computed by the action from the values about to be written, never accepted from the
 * browser (truth 14). Identity (`id`, `ref`, `handle`, `is_demo`) is not an ingredient and is never
 * written here; the store's trigger would refuse it (0018).
 */

import type { EnquirySeed } from "./draft-save";

export type EnquiryUpdateArgs = {
  id: string;
  /** The judged values, trimmed — the record's own names. */
  seed: EnquirySeed;
  /** The chosen state id, or `null` when the enquiry sits in none. */
  stateId: string | null;
  /** The server's own hash of the five values (truth 14). */
  contentHash: string;
  hashVersion: number;
};

export type EnquiryUpdate = { text: string; params: unknown[] };

/**
 * The enquiry UPDATE. One statement: read the stored five, decide whether anything differs, write
 * only when it does, and report both the row and whether it moved.
 */
export function enquiryUpdateStatement(args: EnquiryUpdateArgs): EnquiryUpdate {
  const text = `WITH old AS (
    SELECT id, name, number, asked_for, note, enquiry_state_id
      FROM enquiry
     WHERE id = $1::uuid
  ),
  changed AS (
    SELECT (
      o.name IS DISTINCT FROM $2::text
      OR o.number IS DISTINCT FROM $3::text
      OR o.asked_for IS DISTINCT FROM $4::text
      OR o.note IS DISTINCT FROM $5::text
      OR o.enquiry_state_id IS DISTINCT FROM $6::uuid
    ) AS yes
      FROM old o
  ),
  upd AS (
    UPDATE enquiry
       SET name = $2,
           number = $3,
           asked_for = $4,
           note = $5,
           enquiry_state_id = $6::uuid,
           content_hash = $7,
           hash_version = $8,
           updated_at = now()
     WHERE id = $1::uuid AND (SELECT yes FROM changed)
    RETURNING id
  )
  SELECT (SELECT yes FROM changed) AS changed,
         COALESCE((SELECT id FROM upd), (SELECT id FROM old)) AS id`;

  return {
    text,
    params: [
      args.id,
      args.seed.name,
      args.seed.number,
      args.seed.asked_for,
      args.seed.note,
      args.stateId,
      args.contentHash,
      args.hashVersion,
    ],
  };
}
