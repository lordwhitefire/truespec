// Recording a batch of car drafts — the write the upload performs.
//
// One upload is one **batch**: a `batch_id` shared by every draft the file produced, so the office
// screen can show a file's cars together and a single file's capture can be reasoned about as a
// whole. The file itself is held in the asset store and its id kept here (`source_asset_id`); the
// owner's own name for it is kept beside it (`source_filename`), because that is the name he knows.
//
// What a draft deliberately does **not** carry: `ref` (the code is given at the save, not at the
// upload), a `state_id` (a draft occupies no state — the file names a state and the name is kept in
// `state_label` until a state is chosen), and any `content_hash` (the change-check is the record's,
// computed when a record exists). A draft is not a car; it is what a file said.

import "server-only";
import { randomUUID } from "node:crypto";
import { storeQuery } from "./store-guard";

/**
 * One row of a batch, as the SQL takes it. Every draft's `id` is minted by the caller and travels
 * *in* the statement, so re-running the same statement (`storeQuery`'s retry, D18) lands on the same
 * keys and inserts nothing twice. `is_demo` is left to its column default, exactly as an
 * owner-created car is (scripts/seed.ts is the only place that sets it true).
 */
export const DRAFT_INSERT = `
  INSERT INTO draft (
    id, kind, batch_id, source_filename, source_asset_id, values, state_label
  )
  SELECT d.id, 'car', $1, $2, $3, d."values", d.state_label
    FROM jsonb_to_recordset($4::jsonb) AS d(id uuid, "values" jsonb, state_label text)
  ON CONFLICT (id) DO NOTHING
`;

/** A car the file carried, as the reader handed it over. */
export type CarDraftToStore = {
  values: Record<string, unknown>;
  stateLabel: string | null;
};

export type DraftBatch = {
  /** One upload, one batch — the office screen groups a file's cars by it. */
  batchId: string;
  /** The name the file had on the owner's own computer. */
  sourceFilename: string;
  /** The asset id the file is held under. Never leaves the office. */
  sourceAssetId: string;
  cars: readonly CarDraftToStore[];
};

/** Store a batch's drafts. Returns how many rows were written (0 for an empty batch, no query). */
export async function recordCarDrafts(batch: DraftBatch): Promise<number> {
  if (batch.cars.length === 0) return 0;

  const rows = batch.cars.map((car) => ({
    id: randomUUID(),
    values: car.values,
    state_label: car.stateLabel,
  }));

  await storeQuery(DRAFT_INSERT, [
    batch.batchId,
    batch.sourceFilename,
    batch.sourceAssetId,
    JSON.stringify(rows),
  ]);

  return rows.length;
}
