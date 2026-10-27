// Recording a batch of drafts — the write the upload performs.
//
// One upload is one **batch**: a `batch_id` shared by every draft the file produced, so the office
// screen can show a file's rows together and a single file's capture can be reasoned about as a
// whole. The file itself is held in the asset store and its id kept here (`source_asset_id`); the
// owner's own name for it is kept beside it (`source_filename`), because that is the name he knows.
//
// The rows are a car's or an enquiry's; the one thing that differs is `kind`, which the reader that
// read the file supplies (lib/draft-read.ts, lib/enquiry-read.ts). Everything after that is the same
// write, so there is one statement and one place a draft can go wrong.
//
// What a draft deliberately does **not** carry: `ref` (the code is given at the save, not at the
// upload), a `state_id` (a draft occupies no state — the file names a state and the name is kept in
// `state_label` until a state is chosen), and any `content_hash` (the change-check is the record's,
// computed when a record exists). A draft is not a record; it is what a file said.

import 'server-only';
import { randomUUID } from 'node:crypto';
import { storeQuery } from './store-guard';

/**
 * One row of a batch, as the SQL takes it. Every draft's `id` is minted by the caller and travels
 * *in* the statement, so re-running the same statement (`storeQuery`'s retry, D18) lands on the same
 * keys and inserts nothing twice.
 *
 * **`is_demo` is written here, as a literal** — the same fact `carCreateStatement` and
 * `enquiryCreateStatement` write, for the same reason (task.md:280-284): a file imported while the
 * demonstration is the fleet is the demonstration's, so the one move that empties the demo empties the
 * drafts too (task.md:404-407: "drafts carry the demo marker, so the wipe clears them"). See
 * `lib/car-create.ts`. The column's default is `false`; the statement names the column and its value
 * rather than leaning on the schema, because leaning on it is how a row slips in unmarked.
 *
 * `kind` travels as a parameter, not as a literal: the reader that read the file is the one that
 * knows whether it was a car blank or an enquiry sheet, so the writer is told. The store's own
 * `CHECK (kind IN ('car', 'enquiry'))` (migrations/0022_draft.sql) is what makes a third kind
 * impossible rather than merely absent.
 */
export const DRAFT_INSERT = `
  INSERT INTO draft (
    id, kind, batch_id, source_filename, source_asset_id, values, state_label, is_demo
  )
  SELECT d.id, $5, $1, $2, $3, d."values", d.state_label, true
    FROM jsonb_to_recordset($4::jsonb) AS d(id uuid, "values" jsonb, state_label text)
  ON CONFLICT (id) DO NOTHING
`;

/** One row a file carried, as its reader handed it over — the same shape whichever kind it is. */
export type DraftToStore = {
  values: Record<string, unknown>;
  stateLabel: string | null;
};

/** What every batch carries whatever its rows describe: the file they came from, and their batch. */
type DraftBatchSource = {
  /** One upload, one batch — the office screen groups a file's rows by it. */
  batchId: string;
  /** The name the file had on the owner's own computer. */
  sourceFilename: string;
  /** The asset id the file is held under. Never leaves the office. */
  sourceAssetId: string;
};

/** The cars a filled blank carried. */
export type CarDraftBatch = DraftBatchSource & { cars: readonly DraftToStore[] };

/** The enquiries an enquiry sheet carried. */
export type EnquiryDraftBatch = DraftBatchSource & { enquiries: readonly DraftToStore[] };

/** Store a batch's rows as one kind. Returns how many rows were written (0 for an empty batch). */
async function recordDrafts(
  kind: 'car' | 'enquiry',
  batch: DraftBatchSource,
  drafts: readonly DraftToStore[]
): Promise<number> {
  if (drafts.length === 0) return 0;

  const rows = drafts.map((draft) => ({
    id: randomUUID(),
    values: draft.values,
    state_label: draft.stateLabel,
  }));

  await storeQuery(DRAFT_INSERT, [
    batch.batchId,
    batch.sourceFilename,
    batch.sourceAssetId,
    JSON.stringify(rows),
    kind,
  ]);

  return rows.length;
}

/** Store the cars a filled car blank carried. */
export function recordCarDrafts(batch: CarDraftBatch): Promise<number> {
  return recordDrafts('car', batch, batch.cars);
}

/** Store the enquiries an enquiry sheet carried. */
export function recordEnquiryDrafts(batch: EnquiryDraftBatch): Promise<number> {
  return recordDrafts('enquiry', batch, batch.enquiries);
}
