-- 0024 — the owner's edit layer on a draft.
--
-- Owner ruling 2026-10-20, #3: a draft is "completely editable", and editing a car draft opens the
-- normal Add/Edit car page. A draft still carries what the file said in `values`; `form` is where
-- the owner's edits live until the draft becomes a record. One column, no second table (D16's
-- one-table promise is kept).
--
-- `form` is nullable: every draft uploaded before this migration has no edit layer and keeps
-- working through `values`. Readers and displays use `form ?? values`; the save-as-car path judges
-- `form` through the same `readCarInput`/`carFormFacts` pair the office form uses when it is
-- present, and through `values` when it is not. The JSON is the car form's own field names and
-- strings (including its cost fields and repeated state/photo names), so no second vocabulary is
-- invented here.
--
-- Nothing else changes: `values` stays exactly what the file said; `state_label` is updated when
-- the owner saves a draft; `image_asset_ids` stays the ordered photo list (index 0 the cover).
-- There is no ref here — a draft still spends no `TS-####` until it is saved.

ALTER TABLE draft ADD COLUMN form jsonb;

COMMENT ON COLUMN draft.form IS
  'The owner''s edit of the draft, in the car form''s own field names; NULL for an unedited upload. Display/save use form ?? values.';
