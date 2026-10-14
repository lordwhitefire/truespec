-- 0017 — the change-check lives in the store
-- TASK-003 follow-up v1 (`key-and-hash-v1.md` decision 3; design D12).
--
-- `content_hash` is a car's or an enquiry's editable details boiled down to one lower-case SHA-256.
-- It answers the question the filler and the office both need answered: "are these the same details
-- written again, or have they really changed?" — without asking a browser and without comparing
-- every column by hand. `lib/change-check.ts` is the one recipe that computes it; the store never
-- recomputes it.
--
-- `hash_version` records which recipe produced the hash. Add or remove a field later, raise the
-- version, recalculate once — and an old hash is visibly old rather than silently wrong.
--
-- Both are **required**. The store is empty here (TASK-003's demo was wiped on 2026-10-13), so
-- `NOT NULL` needs no backfill and no placeholder — and a placeholder hash would be a lie. From now
-- on every writer must supply one, which is the point: a row cannot enter without a change-check.
--
-- Applied file, never edited. Corrective only.

ALTER TABLE car
  ADD COLUMN content_hash text NOT NULL,
  ADD COLUMN hash_version smallint NOT NULL DEFAULT 1;

ALTER TABLE enquiry
  ADD COLUMN content_hash text NOT NULL,
  ADD COLUMN hash_version smallint NOT NULL DEFAULT 1;
