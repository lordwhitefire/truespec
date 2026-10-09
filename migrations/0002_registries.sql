-- 0002 — registries (data-model plan §2, §5, §8.2)
-- Base rows live in migrations: they are the product's built-ins.
-- owner can add/rename/reorder; deletion blocked while occupied (RESTRICT at the FK).

CREATE TABLE car_state (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label           text NOT NULL,
  section         text NOT NULL CHECK (section IN ('available', 'on order', 'landed')),
  is_new_arrival  boolean NOT NULL DEFAULT false,
  sort            int NOT NULL DEFAULT 0
);

CREATE TABLE enquiry_state (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label  text NOT NULL,
  sort   int NOT NULL DEFAULT 0
);

-- Base car states (inventory spec: Available, On the way, At port, Cleared, Landed).
-- `Landed` is the "Landed this year" arrival group (is_new_arrival = true, no date logic).
INSERT INTO car_state (label, section, is_new_arrival, sort) VALUES
  ('Available',  'available', false, 10),
  ('On the way', 'on order',  false, 20),
  ('At port',    'on order',  false, 30),
  ('Cleared',    'on order',  false, 40),
  ('Landed',     'landed',    true,  50);

-- Base enquiry states. Just states (R1) — no is_closed, no open/closed grouping.
INSERT INTO enquiry_state (label, sort) VALUES
  ('New', 10), ('Talking', 20), ('Negotiating', 30), ('Sold', 40), ('Lost', 50);
