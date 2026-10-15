-- 0021 — the sale remembers the state the car was in before it sold.
--
-- TASK-004 task.md truth 5 (design D15): Sold is a primary state, and setting it is what
-- performs the sale. Un-marking returns the car to its **previous** primary state, so the
-- store has to hold which state that was — and it cannot be derived from anything else.
-- The activity log records *that* a car changed, never what it changed from; the car row
-- holds only the state it is in now. Forward-only.
--
-- The fact lives on the **sale row**, with the rest of the money facts (truth 5: "the
-- money facts SHALL live on the sale row, never on the state and never on the car"). A
-- sale row exists only while the car's primary state is Sold, so the prior state is
-- exactly as long-lived as the sale it belongs to — un-marking removes both together,
-- and nothing stale can survive.
--
-- Backfill: a sale row written before this column existed (the demo's one sold car) has
-- no recorded prior state. It is filled with the **Landed** primary — the state a car
-- comes off the lot in, and the state the seed's sold car is authored from. The seed now
-- names the prior state explicitly, so a rebuild never depends on this default.
--
-- The four primaries can never be deleted or re-kinded (0020's `car_state_primaries_are_final`
-- trigger), so RESTRICT is a belt-and-braces guard rather than a live constraint.

ALTER TABLE sale
  ADD COLUMN prior_state_id uuid REFERENCES car_state (id) ON DELETE RESTRICT;

UPDATE sale
SET prior_state_id = COALESCE(
  (SELECT id FROM car_state WHERE kind = 'primary' AND section = 'landed'),
  (SELECT id FROM car_state WHERE kind = 'primary' ORDER BY sort, label LIMIT 1)
)
WHERE prior_state_id IS NULL;

ALTER TABLE sale
  ALTER COLUMN prior_state_id SET NOT NULL;
