-- 0026 — one stored file, one enquiry_pdf row
--
-- TASK-006 B. The draft save now links the imported sheet, so one stored asset can be met again by a
-- second draft from the same file. The link is by `enquiry_pdf.sanity_asset_id`; without a unique
-- index, that file could acquire a second row and the owner's delete would have two rows to reason
-- about. The task requires one row per stored file.
--
-- If the store already holds duplicates (none today, but this migration must be safe anywhere), keep
-- the row the most enquiries point at, break a tie by the lowest id, move every enquiry that pointed
-- at a loser onto the keeper, then delete the losers. Only then can the unique index be created.
--
-- The update and the delete share one snapshot: `ranked` is computed once, `repoint` moves the
-- enquiries, and the DELETE removes exactly the losing rows. Deleting first would lose the mapping.
--
-- `ON DELETE SET NULL` on `enquiry.pdf_import_id` stays: deleting a PDF row must never delete the
-- customer's enquiry. The owner's delete decides when the row may go (TASK-006 A).

WITH refs AS (
  SELECT p.id,
         p.sanity_asset_id,
         count(e.id) AS enquiry_refs
    FROM enquiry_pdf p
    LEFT JOIN enquiry e ON e.pdf_import_id = p.id
   GROUP BY p.id, p.sanity_asset_id
),
ranked AS (
  SELECT id,
         sanity_asset_id,
         first_value(id) OVER (
           PARTITION BY sanity_asset_id
           ORDER BY enquiry_refs DESC, id
         ) AS keeper_id,
         row_number() OVER (
           PARTITION BY sanity_asset_id
           ORDER BY enquiry_refs DESC, id
         ) AS rn
    FROM refs
),
repoint AS (
  UPDATE enquiry e
     SET pdf_import_id = r.keeper_id
    FROM ranked r
   WHERE e.pdf_import_id = r.id
     AND r.rn > 1
  RETURNING 1
)
DELETE FROM enquiry_pdf p
 USING ranked r
 WHERE p.id = r.id
   AND r.rn > 1;

CREATE UNIQUE INDEX enquiry_pdf_sanity_asset_id_key
  ON enquiry_pdf (sanity_asset_id);
