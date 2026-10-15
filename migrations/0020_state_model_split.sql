-- 0020 — the state model: two kinds of car state (primary | secondary), with four
-- fixed primaries (Available, On Order, Landed, Sold) and the owner's own secondaries.
--
-- TASK-004 task.md step 2 (design D15, owner ruling 2026-10-14). Forward-only.
--
-- D15 in one line: a car sits under exactly one of exactly four fixed primary states;
-- beyond that it may carry any number of secondary states the owner creates. The
-- showroom reads only the primary state and shows three of the four — Available,
-- On Order, Landed — never Sold. `section` and `primary state` now name the same
-- thing, so a primary carries a section and a secondary carries none.
--
-- This file builds on the base rows 0002 seeds (Available, On the way, At port,
-- Cleared, Landed) and on whatever cars a live store already holds. On the scratch
-- rebuild the `car` table is empty here, so the car backfill is a no-op; the demo
-- fleet is mapped by the seed that follows (D15 g).

-- 1. car_state gains `kind`.
ALTER TABLE car_state
  ADD COLUMN kind text;

UPDATE car_state
SET kind = CASE label
  WHEN 'On the way' THEN 'secondary'
  WHEN 'At port'    THEN 'secondary'
  WHEN 'Cleared'    THEN 'secondary'
  ELSE 'primary'
END;

ALTER TABLE car_state
  ALTER COLUMN kind SET NOT NULL,
  ADD CONSTRAINT car_state_kind_check CHECK (kind IN ('primary', 'secondary'));

-- 2. `section` becomes a primary-only property. 0002 declared it NOT NULL with a
--    three-value CHECK; both go now, before any row writes `sold` or no section at
--    all. The new invariants land in step 8.
ALTER TABLE car_state
  ALTER COLUMN section DROP NOT NULL;

ALTER TABLE car_state
  DROP CONSTRAINT IF EXISTS car_state_section_check;

UPDATE car_state
SET section = NULL,
    is_new_arrival = FALSE
WHERE kind = 'secondary';

-- 3. Every primary carries the section that names it (≡ the primary state).
UPDATE car_state
SET section = CASE label
  WHEN 'Available' THEN 'available'
  WHEN 'Landed'    THEN 'landed'
  WHEN 'Sold'      THEN 'sold'
  ELSE section  -- 'On Order' handled by its insert below, or already set
END
WHERE kind = 'primary';

-- 4. On Order and Sold become primary states (absent from the 0002 base set).
INSERT INTO car_state (label, section, is_new_arrival, sort, colour, kind)
SELECT 'On Order', 'on order', FALSE, 60, '#06b6d4', 'primary'
WHERE NOT EXISTS (SELECT 1 FROM car_state WHERE label = 'On Order');

INSERT INTO car_state (label, section, is_new_arrival, sort, colour, kind)
SELECT 'Sold', 'sold', FALSE, 70, '#475569', 'primary'
WHERE NOT EXISTS (SELECT 1 FROM car_state WHERE label = 'Sold');

-- 5. The link that holds a car's secondary states (none or several).
CREATE TABLE car_secondary_state (
  car_id   uuid NOT NULL REFERENCES car (id)       ON DELETE CASCADE,
  state_id uuid NOT NULL REFERENCES car_state (id) ON DELETE RESTRICT,
  PRIMARY KEY (car_id, state_id)
);

CREATE INDEX car_secondary_state_car_id_idx   ON car_secondary_state (car_id);
CREATE INDEX car_secondary_state_state_id_idx ON car_secondary_state (state_id);

-- 6. A car that sat in a now-secondary state moves to its primary (On Order) and
--    keeps the old label as a secondary it carries — the customer sees On Order
--    while the owner still tracks the stage (D15 b/c).
INSERT INTO car_secondary_state (car_id, state_id)
SELECT c.id, c.state_id
FROM car c
JOIN car_state s ON s.id = c.state_id
WHERE s.kind = 'secondary'
ON CONFLICT DO NOTHING;

UPDATE car
SET state_id = (SELECT id FROM car_state WHERE label = 'On Order' AND kind = 'primary')
WHERE state_id IN (SELECT id FROM car_state WHERE kind = 'secondary');

-- 7. A car's primary state is mandatory (today `car.state_id` is nullable).
UPDATE car
SET state_id = (SELECT id FROM car_state WHERE label = 'Available' AND kind = 'primary')
WHERE state_id IS NULL;

ALTER TABLE car
  ALTER COLUMN state_id SET NOT NULL;

-- 8. Invariants. A primary has a section and a secondary does not; a secondary sets
--    no new-arrival flag; the four primaries are pinned by name and by their one
--    section, so a fifth primary and a renamed primary are refused by the store.
--    (The old three-value section CHECK was dropped in step 2.)
ALTER TABLE car_state
  ADD CONSTRAINT car_state_kind_section_ck CHECK (
    (kind = 'primary'   AND section IS NOT NULL) OR
    (kind = 'secondary' AND section IS NULL)
  ),
  ADD CONSTRAINT car_state_kind_new_arrival_ck CHECK (
    kind = 'primary' OR is_new_arrival IS FALSE
  ),
  ADD CONSTRAINT car_state_section_check CHECK (
    section IS NULL OR section IN ('available', 'on order', 'landed', 'sold')
  ),
  ADD CONSTRAINT car_state_primary_label_pinned CHECK (
    kind <> 'primary' OR label IN ('Available', 'On Order', 'Landed', 'Sold')
  ),
  ADD CONSTRAINT car_state_primary_section_pinned CHECK (
    kind <> 'primary' OR (label, section) IN (
      ('Available', 'available'),
      ('On Order',  'on order'),
      ('Landed',    'landed'),
      ('Sold',      'sold')
    )
  );

-- 9. The four primaries are not the owner's to delete or to turn into a secondary.
--    Renaming is already refused by the pinned-label CHECK above; deleting is not
--    (an unoccupied primary has no FK holding it), so a trigger refuses it — and
--    refuses re-kinding a primary, which no CHECK can see.
CREATE FUNCTION refuse_primary_state_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.kind = 'primary' THEN
      RAISE EXCEPTION 'the four primary car states are fixed: % cannot be deleted', OLD.label
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.kind = 'primary' AND NEW.kind IS DISTINCT FROM 'primary' THEN
    RAISE EXCEPTION 'the four primary car states are fixed: % cannot be changed', OLD.label
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER car_state_primaries_are_final
  BEFORE UPDATE OR DELETE ON car_state
  FOR EACH ROW EXECUTE FUNCTION refuse_primary_state_change();
