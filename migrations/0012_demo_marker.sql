-- 0012 — the demo marker
-- TASK-003 Round 2 Q3: `is_demo` on `car` and `enquiry` only.
--
-- The demo fleet and the demo enquiries are marked so the demo is removable in one move: every
-- demo car (its photos, costs and sale cascade with it), every demo enquiry together with its
-- imported PDF row and file, the taps whose ref is a demo car, the activity rows naming a demo
-- car, and the demo assets themselves. Nothing else is touched.
--
-- `DEFAULT false` and NOT NULL, so no existing row changes meaning and every later insert must
-- say which it is.
--
-- The two partial indexes make both sides of the wipe findable; a partial index on a boolean is
-- tiny (only the true rows are in it).
--
-- Applied file, never edited. Corrective only.

ALTER TABLE car     ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE enquiry ADD COLUMN is_demo boolean NOT NULL DEFAULT false;

CREATE INDEX car_is_demo_idx     ON car (is_demo)     WHERE is_demo;
CREATE INDEX enquiry_is_demo_idx ON enquiry (is_demo) WHERE is_demo;
