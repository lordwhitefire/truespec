-- 0014 — the imported PDF is an asset reference
-- TASK-003 Round 2 Q5: rename `path` → `sanity_asset_id`; drop `deleted_at`.
--
-- The column holds a Sanity asset reference, and the name should say so, as `car_photo` already
-- does. `filename` and `rows_total` stay.
--
-- `deleted_at` goes: an enquiry the owner deletes is gone, not hidden, and the file behind it is
-- cleared by his hand rather than the job's. Deleting the PDF leaves the enquiry rows in place,
-- drops the link to the import (`pdf_import_id` is ON DELETE SET NULL) and is logged in
-- `activity`, which is what the enquiries spec already asks for.
--
-- Applied file, never edited. Corrective only.

ALTER TABLE enquiry_pdf RENAME COLUMN path TO sanity_asset_id;
ALTER TABLE enquiry_pdf DROP COLUMN deleted_at;
