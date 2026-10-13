-- 0013 — where each photo came from
-- TASK-003 Round 2 Q4 + Round 3 Q2: the two rules kept apart.
--
-- `car_photo.origin` records the source of the photo. It exists so the manifest can be rebuilt
-- from the store rather than kept beside it, and so the whole demo set can be swapped when the
-- client supplies his own cars. It is never served in a public response.
--
-- The asset-reference column (`sanity_asset_id`) never holds a web address; `origin` is where a
-- source is named. For the demo set the source is recorded as the photo's identity, not an
-- address — `unsplash:<id>` — because the task's evidence list requires that no third-party web
-- address survives anywhere in the tree, and the address is reconstructable from the id. A photo
-- the client uploads later records a plain marker such as `owner upload`. Never blank, one style
-- throughout.
--
-- Backfill: every row that exists today came from the Unsplash set the demo seed names, so its
-- origin is derived from the address it was seeded with (`/photo-<id>` → `unsplash:<id>`).
--
-- NOTE (recorded, not hidden): those legacy rows still hold the Unsplash address in
-- `sanity_asset_id`. That column must hold a reference we own, and there is no asset behind those
-- rows yet — the demo seed writes real Sanity references over them (TASK-003 Tasks 12 and 14),
-- and the rebuild-from-nothing run (Task 20) ends with references only. Correcting them here
-- would mean inventing asset ids, i.e. making the ledger lie. Nothing is deleted on the owner's
-- behalf (truth 10), so the rows stay until the seed replaces them.
--
-- Applied file, never edited. Corrective only.

ALTER TABLE car_photo ADD COLUMN origin text;

UPDATE car_photo
   SET origin = CASE
     WHEN sanity_asset_id ~ '^https?://[^/]+/photo-'
       THEN 'unsplash:' || split_part(split_part(sanity_asset_id, '/photo-', 2), '?', 1)
     ELSE 'legacy upload'   -- no source recorded; never blank
   END;

ALTER TABLE car_photo ALTER COLUMN origin SET NOT NULL;
ALTER TABLE car_photo
  ADD CONSTRAINT car_photo_origin_not_blank CHECK (btrim(origin) <> '');
