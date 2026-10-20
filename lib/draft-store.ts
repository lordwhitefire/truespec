// The office's reads and the save's one write, for drafts.
//
// A draft is read here and nowhere else — the upload's reader (`lib/draft-read.ts`,
// `lib/enquiry-read.ts`) turns bytes into what a file said, and this module reads what is *waiting*:
// the rows in the `draft` table, by id or all at once.
//
// The state lookups live here too, because they exist for the save: a draft holds the state its file
// named as a **label** (a name, never an id — D16), and the save is where a name becomes the id the
// record carries (truth 9). Nothing else in the codebase resolves a state by name; before this, a
// state was only ever chosen by id from a registry the office had already read.

import "server-only";
import { storeQuery } from "./store-guard";

export type DraftKind = "car" | "enquiry";

/** One waiting draft, as the review page and the save see it. */
export type DraftRow = {
  id: string;
  kind: DraftKind;
  /** One upload, one batch — a file's rows share it. */
  batchId: string;
  /** The name the file had on the owner's own computer. */
  sourceFilename: string;
  /** The asset id the file is held under. Never leaves the office. */
  sourceAssetId: string;
  /** What the file said, keyed by the record's own field names. */
  values: Record<string, unknown>;
  /** The images the owner put on by hand, in order; index 0 is the cover. */
  imageAssetIds: string[];
  /** The state the file named, as a name — or `null` when it named none. */
  stateLabel: string | null;
  isDemo: boolean;
  createdAt: string;
};

type RawDraft = {
  id: string;
  kind: string;
  batch_id: string;
  source_filename: string;
  source_asset_id: string;
  values: Record<string, unknown> | null;
  image_asset_ids: string[] | null;
  state_label: string | null;
  is_demo: boolean;
  created_at: string | Date;
};

const COLUMNS =
  "id, kind, batch_id, source_filename, source_asset_id, values, image_asset_ids, state_label, is_demo, created_at";

function toDraft(row: RawDraft): DraftRow {
  return {
    id: row.id,
    kind: row.kind === "enquiry" ? "enquiry" : "car",
    batchId: row.batch_id,
    sourceFilename: row.source_filename,
    sourceAssetId: row.source_asset_id,
    values: row.values ?? {},
    imageAssetIds: row.image_asset_ids ?? [],
    stateLabel: row.state_label,
    isDemo: row.is_demo,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/**
 * Every waiting draft, newest batch first.
 *
 * A batch's rows have **no stored order** — D16's column list carries no ordinal — so within a batch
 * they come back in a stable but arbitrary order: the file's own page order is not recoverable from
 * the store. Every row is still here; only the order within a file is unknown. Flagged in the note as
 * a possible follow-up (an ordinal column), not decided here.
 */
export async function getDrafts(): Promise<DraftRow[]> {
  const rows = await storeQuery<RawDraft[]>(
    `SELECT ${COLUMNS} FROM draft ORDER BY created_at DESC, batch_id, id`,
  );
  return rows.map(toDraft);
}

/** One draft, or `null` when it is not there (already saved, or already deleted). */
export async function getDraft(id: string): Promise<DraftRow | null> {
  const rows = await storeQuery<RawDraft[]>(`SELECT ${COLUMNS} FROM draft WHERE id = $1`, [id]);
  return rows.length > 0 ? toDraft(rows[0]) : null;
}

/** Delete a draft. Idempotent, so a retried delete is a no-op (D18). */
export async function deleteDraft(id: string): Promise<void> {
  await storeQuery(`DELETE FROM draft WHERE id = $1`, [id]);
}

/** A car state, by id or by the name a file wrote — the save checks both. */
export type CarStateRow = {
  id: string;
  label: string;
  /** `'primary'` or `'secondary'`; a record's own state must be one of the four primaries. */
  kind: string | null;
  /** One of `lib/sections.ts`'s sections, or something the store never should have held. */
  section: string | null;
};

export async function carStateById(id: string): Promise<CarStateRow | null> {
  const rows = await storeQuery<CarStateRow[]>(
    `SELECT id, label, kind, section FROM car_state WHERE id = $1`,
    [id],
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Labels are unique per table (`car_state_label_unique`), so a name is at most one state. */
export async function carStateByLabel(label: string): Promise<CarStateRow | null> {
  const rows = await storeQuery<CarStateRow[]>(
    `SELECT id, label, kind, section FROM car_state WHERE label = $1`,
    [label],
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * The same lookup, ignoring case — for autofill only.
 *
 * A PDF filled in by hand may capitalise a state differently from the registry ("available"), and
 * the owner means the state they know. The save still uses the exact `carStateByLabel`: a file
 * stored from an upload is not a reason to loosen what the record requires.
 */
export async function carStateByLabelCaseless(label: string): Promise<CarStateRow | null> {
  const rows = await storeQuery<CarStateRow[]>(
    `SELECT id, label, kind, section FROM car_state
      WHERE lower(label) = lower($1)
      ORDER BY label
      LIMIT 1`,
    [label],
  );
  return rows.length > 0 ? rows[0] : null;
}

/** The enquiry state a draft's label names, or `null` — `enquiry_state` has no primary/secondary split. */
export async function enquiryStateIdByLabel(label: string): Promise<string | null> {
  const rows = await storeQuery<{ id: string }[]>(
    `SELECT id FROM enquiry_state WHERE label = $1`,
    [label],
  );
  return rows.length > 0 ? rows[0].id : null;
}

/** Whether an enquiry state still exists by the id the form chose. */
export async function enquiryStateExists(id: string): Promise<boolean> {
  const rows = await storeQuery<{ id: string }[]>(`SELECT id FROM enquiry_state WHERE id = $1`, [id]);
  return rows.length > 0;
}
