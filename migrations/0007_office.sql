-- 0007 — office demo dataset (plan §6: "seeded with the same demo data as the
-- reference"). These are the 15 cars the reference office shows, refs TS-1001..TS-1015.
--
-- They live in their own table: the refs collide with the public seed (also
-- TS-1001..TS-1025) and car.ref is UNIQUE. The office read layer (lib/office.ts)
-- reads only this table, and only office screens import it.

CREATE TABLE office_car (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref                 text NOT NULL UNIQUE,
  brand               text NOT NULL,
  model               text NOT NULL,
  trim                text,
  year                int,
  mileage             int,                  -- miles, as the office shows it
  state               text NOT NULL
                        CHECK (state IN ('Available', 'On the way', 'At port', 'Cleared', 'Landed')),
  is_new_arrival      boolean NOT NULL DEFAULT false,
  doorstep_price_kobo bigint,               -- NULL = not priced yet
  landed_cost_kobo    bigint,               -- NULL = costs incomplete (money is spent)
  arrival_note        text,
  sold_at             timestamptz,          -- NULL = in stock
  sale_price_kobo     bigint,               -- NULL unless sold
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE office_car ENABLE ROW LEVEL SECURITY;

CREATE INDEX office_car_state_idx    ON office_car (state);
CREATE INDEX office_car_in_stock_idx ON office_car (id) WHERE sold_at IS NULL;
