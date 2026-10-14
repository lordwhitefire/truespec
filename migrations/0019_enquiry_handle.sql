-- 0019 — an enquiry's handle: the name the filler knows it by
-- TASK-003 follow-up v1 (`key-and-hash-v1.md` decision 6).
--
-- The filler must find the row it wrote last time without clearing the table first. Every other
-- record already has a handle of its own:
--   * a car          — its `ref`
--   * a photo        — (car_id, position)
--   * a cost line    — (car_id, kind)
--   * a sale         — its car_id
--   * the imported PDF — its filename
-- An enquiry has nothing equivalent: the same person may enquire twice, and two people may share a
-- name. So a recipe enquiry carries a `handle` — the recipe's own name for the row, e.g.
-- `demo-enquiry-01`.
--
-- It is nullable: a real enquiry typed into the office has no handle, only recipe rows do. It is
-- unique: a handle, when present, names exactly one row. Postgres allows many NULLs under a unique
-- index, so "no handle" costs nothing.
--
-- Applied file, never edited. Corrective only.

ALTER TABLE enquiry ADD COLUMN handle text;

CREATE UNIQUE INDEX enquiry_handle_key ON enquiry (handle) WHERE handle IS NOT NULL;
