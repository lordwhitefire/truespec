// Creating an enquiry from a saved draft — the INSERT the office's save performs.
//
// There was no way to create an enquiry before this: the enquiry half of the office only ever
// *edited* rows (its state), and the only INSERTs into `enquiry` lived in seeds and witnesses. A
// draft is the first row that can become one, so its create is written here, once.
//
// The id is minted by the caller and travels *in* the statement, so a retry of the same save
// (`storeQuery`'s retry, D18) lands on the same key and inserts nothing twice. The code — `ENQ-####`
// — is the store's (the column's own default, 0025), minted in the same INSERT; the statement returns
// it so the save can name the record. `handle` (the customer's WhatsApp key) is left NULL, because a
// draft carries the record's editable fields "and nothing else" (truth 9) — the office sets a handle
// when it has one.
//
// **The event names the code, never the customer** (owner ruling 2026-10-20 #4): `enquiry.created`
// carries the `ENQ-####` and the signed-in actor, and no name, number or note. It is written from the
// `new_enquiry` CTE, so a retry that inserted nothing writes no second event. The result says
// `changed` so the screen can tell a save from a retry (DR23).
//
// **`is_demo` is written here, as a literal** — the same fact as `carCreateStatement` writes, for the
// same reason (task.md:280-284): an enquiry imported while the demonstration is the fleet is the
// demonstration's. See `lib/car-create.ts`.

import type { EnquirySeed } from "./draft-save";

export type EnquiryCreateArgs = {
  /** Minted by the caller, so a retried save is the same insert. */
  id: string;
  seed: EnquirySeed;
  /** The chosen state id, or `null` when the enquiry sits in none (the column is nullable). */
  stateId: string | null;
  contentHash: string;
  hashVersion: number;
  /** The signed-in owner, for the activity row (D20). */
  actorId: string;
};

export type EnquiryCreate = { text: string; params: unknown[] };

/**
 * The enquiry INSERT. `ON CONFLICT (id) DO NOTHING` makes a retry a no-op; the trailing select
 * returns the code either way, and `changed` says which arm answered.
 */
export function enquiryCreateStatement(args: EnquiryCreateArgs): EnquiryCreate {
  return {
    text: `
      WITH new_enquiry AS (
        INSERT INTO enquiry (
          id, name, number, asked_for, note, enquiry_state_id, content_hash, hash_version, is_demo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        ON CONFLICT (id) DO NOTHING
        RETURNING id, ref
      ),
      ins_event AS (
        INSERT INTO activity_event (kind, subject, actor_id)
        SELECT 'enquiry.created', ne.ref, $9::uuid
          FROM new_enquiry ne
        RETURNING 1
      )
      SELECT ref, true AS changed FROM new_enquiry
      UNION ALL
      SELECT ref, false AS changed FROM enquiry
       WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM new_enquiry)
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
      args.actorId,
    ],
  };
}
