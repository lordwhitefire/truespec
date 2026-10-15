// Creating an enquiry from a saved draft — the INSERT the office's save performs.
//
// There was no way to create an enquiry before this: the enquiry half of the office only ever
// *edited* rows (its state), and the only INSERTs into `enquiry` lived in seeds and witnesses. A
// draft is the first row that can become one, so its create is written here, once.
//
// The id is minted by the caller and travels *in* the statement, so a retry of the same save
// (`storeQuery`'s retry, D18) lands on the same key and inserts nothing twice. `ref`-like codes do
// not exist for an enquiry; `handle` (the customer's WhatsApp key) is left NULL, because a draft
// carries the record's editable fields "and nothing else" (truth 9) — the office sets a handle when
// it has one.

import type { EnquirySeed } from "./draft-save";

export type EnquiryCreateArgs = {
  /** Minted by the caller, so a retried save is the same insert. */
  id: string;
  seed: EnquirySeed;
  /** The chosen state id, or `null` when the enquiry sits in none (the column is nullable). */
  stateId: string | null;
  contentHash: string;
  hashVersion: number;
};

export type EnquiryCreate = { text: string; params: unknown[] };

/**
 * The enquiry INSERT. `ON CONFLICT (id) DO NOTHING` makes a retry a no-op; the trailing select
 * returns the id either way, so the caller can tell the save landed without guessing.
 */
export function enquiryCreateStatement(args: EnquiryCreateArgs): EnquiryCreate {
  return {
    text: `
      WITH new_enquiry AS (
        INSERT INTO enquiry (
          id, name, number, asked_for, note, enquiry_state_id, content_hash, hash_version
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      )
      SELECT id FROM new_enquiry
      UNION ALL
      SELECT id FROM enquiry WHERE id = $1
    `,
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
