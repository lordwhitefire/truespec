-- 0003 — the car and its money, sale and photos (data-model plan §2, §3, §8.3)

-- TS-#### reference codes: assigned once from a sequence, never reused.
CREATE SEQUENCE ts_ref_seq START WITH 1;

CREATE TABLE car (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref                 text NOT NULL UNIQUE
                        DEFAULT ('TS-' || lpad(nextval('ts_ref_seq')::text, 4, '0')),
  brand               text,
  model               text,
  trim                text,
  year                int,
  exterior_color      text,
  interior_color      text,
  mileage             int,                 -- km
  features            text,                -- newline/JSON list, public
  note                text,                -- public-facing optional note
  private_note        text,                -- office only
  -- Q37 (ui-plan): the crossed-out "was" price is real public data.
  was_price_kobo      bigint,              -- NULL = no Special ribbon
  -- Q38 (ui-plan): the On Order arrival chip.
  arrival_note        text,
  doorstep_price_kobo bigint,              -- NULL = no price yet => office-only draft (C3)
  state_id            uuid REFERENCES car_state (id) ON DELETE RESTRICT,
  version             int NOT NULL DEFAULT 1,   -- optimistic-concurrency token
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz          -- tombstone: reads exclude it; undo clears it
);

-- Six fixed cost kinds. amount_minor NULL = not entered; 0 = genuine zero (different).
-- USD lines: rate required. NGN lines: rate forbidden (no global rate, no fallback of 1).
CREATE TABLE cost_line (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id       uuid NOT NULL REFERENCES car (id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN
                 ('purchase_price', 'shipping', 'clearing', 'trucking_usa', 'trucking_ng', 'full_tank')),
  currency     text NOT NULL CHECK (currency IN ('USD', 'NGN')),
  amount_minor bigint,
  rate_minor   bigint,                     -- kobo-per-dollar as minor units (e.g. 1450.50 => 145050)
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cost_line_usd_needs_rate CHECK (currency = 'NGN' OR rate_minor IS NOT NULL),
  CONSTRAINT cost_line_ngn_no_rate   CHECK (currency <> 'NGN' OR rate_minor IS NULL)
);

CREATE TABLE sale (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id          uuid NOT NULL UNIQUE REFERENCES car (id) ON DELETE CASCADE,
  sale_price_kobo bigint NOT NULL,
  sold_at         timestamptz NOT NULL
);

CREATE TABLE car_photo (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id          uuid NOT NULL REFERENCES car (id) ON DELETE CASCADE,
  sanity_asset_id text NOT NULL,
  position        int NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT car_photo_position_unique UNIQUE (car_id, position)
);
