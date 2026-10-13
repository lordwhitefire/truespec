-- 0009 — registries: a colour on both, and labels that cannot repeat
-- TASK-003 Round 1 Q6 + Round 2 Q7 + conflict 14 (design D6's "closed flag" is stale shorthand).
--
-- Both registries carry a hex colour the store validates, because the office resolves a state by
-- its label and the picker offers a colour on both kinds of state (inventory spec; the UI layer
-- already built the picker — "the colour now has somewhere to live on both").
--
-- `sort` already exists on both, so nothing is added for ordering.
-- `car_state.section` stays NOT NULL with its existing CHECK; `enquiry_state` deliberately gains
-- no section — enquiry states are just states (R1), and there is no open/closed grouping and no
-- closed flag.
--
-- Both `label`s become UNIQUE: two states with one name must be impossible.
--
-- The backfill gives each base state a sensible colour; the owner may change any of them in Settings.
-- Applied file, never edited. Corrective only.

ALTER TABLE car_state     ADD COLUMN colour text;
ALTER TABLE enquiry_state ADD COLUMN colour text;

UPDATE car_state SET colour = CASE label
  WHEN 'Available'  THEN '#16a34a'   -- green — ready to sell
  WHEN 'On the way' THEN '#0ea5e9'   -- blue — in transit
  WHEN 'At port'    THEN '#f59e0b'   -- amber — at the port
  WHEN 'Cleared'    THEN '#8b5cf6'   -- violet — cleared
  WHEN 'Landed'     THEN '#0f766e'   -- teal — landed / this year's arrival
  ELSE '#64748b' END;

UPDATE enquiry_state SET colour = CASE label
  WHEN 'New'         THEN '#0ea5e9'  -- blue — just arrived
  WHEN 'Talking'     THEN '#f59e0b'  -- amber — in conversation
  WHEN 'Negotiating' THEN '#8b5cf6'  -- violet — on the price
  WHEN 'Sold'        THEN '#16a34a'  -- green — done
  WHEN 'Lost'        THEN '#64748b'  -- grey — gone quiet
  ELSE '#64748b' END;

ALTER TABLE car_state     ALTER COLUMN colour SET NOT NULL;
ALTER TABLE enquiry_state ALTER COLUMN colour SET NOT NULL;

ALTER TABLE car_state
  ADD CONSTRAINT car_state_colour_hex CHECK (colour ~ '^#[0-9a-fA-F]{6}$');
ALTER TABLE enquiry_state
  ADD CONSTRAINT enquiry_state_colour_hex CHECK (colour ~ '^#[0-9a-fA-F]{6}$');

ALTER TABLE car_state     ADD CONSTRAINT car_state_label_unique     UNIQUE (label);
ALTER TABLE enquiry_state ADD CONSTRAINT enquiry_state_label_unique UNIQUE (label);
