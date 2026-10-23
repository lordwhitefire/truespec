/**
 * Deleting an enquiry — the one statement, and why it is one statement.
 *
 * The owner's rule (TASK-006 A): an enquiry can be deleted, and only by the owner, behind a
 * confirmation. What the delete must leave alone is as important as what it removes:
 *
 *   * the customer's record goes, and one `enquiry.deleted` event names its `ENQ-####` and the actor;
 *   * the imported sheet is **shared** — a file carries many rows, so it may be used by other
 *     enquiries and by drafts still waiting. It goes only when the deleted enquiry was the last
 *     thing pointing at it, and no waiting draft still names its asset;
 *   * taps are page/car counts with no enquiry link, so this statement never touches `tap`;
 *   * a repeat finds no row and writes no second event.
 *
 * The counts and the deletes share one statement (one snapshot) so a concurrent save cannot slip
 * between "how many are left?" and "delete the file". Two details make that true:
 *
 *   - `del` is a data-modifying CTE, and PostgreSQL does **not** let a sibling SELECT see its
 *     deletion. The remaining-enquiry count therefore excludes the target by id (`e.id <> $1`)
 *     rather than relying on the row being gone from the snapshot.
 *   - `pdf_del` deletes only the row `pdf` selected, which is the target's own `pdf_import_id`.
 *     `ON DELETE SET NULL` stays as the store's safety net, but this statement never relies on it.
 *
 * The bytes are external to the store. The statement returns the asset id only when it has removed
 * the row; the action clears the bytes after and reports whether that worked (`deleteAsset` cannot
 * join the SQL transaction).
 */

export type EnquiryDeleteArgs = {
  id: string;
  actorId: string;
};

export type EnquiryDeleteRow = {
  ref: string | null;
  pdf_import_id: string | null;
  /** The asset to clear, only when this statement removed the PDF row. */
  asset_id: string | null;
};

export function enquiryDeleteStatement(args: EnquiryDeleteArgs): {
  text: string;
  params: unknown[];
} {
  return {
    text: `WITH del AS (
    DELETE FROM enquiry
     WHERE id = $1
    RETURNING id, ref, pdf_import_id
  ),
  ev AS (
    INSERT INTO activity_event (kind, subject, actor_id)
    SELECT 'enquiry.deleted', ref, $2::uuid FROM del
    RETURNING 1
  ),
  pdf AS (
    SELECT p.id, p.sanity_asset_id
      FROM enquiry_pdf p
      JOIN del d ON d.pdf_import_id = p.id
     WHERE NOT EXISTS (
             SELECT 1 FROM enquiry e
              WHERE e.id <> $1 AND e.pdf_import_id = p.id
           )
       AND NOT EXISTS (
             SELECT 1 FROM draft dr
              WHERE dr.source_asset_id = p.sanity_asset_id
           )
  ),
  pdf_del AS (
    DELETE FROM enquiry_pdf p
     USING pdf
     WHERE p.id = pdf.id
    RETURNING p.sanity_asset_id
  )
  SELECT (SELECT ref FROM del) AS ref,
         (SELECT pdf_import_id FROM del) AS pdf_import_id,
         (SELECT sanity_asset_id FROM pdf_del) AS asset_id
   WHERE EXISTS (SELECT 1 FROM del)`,
    params: [args.id, args.actorId],
  };
}
