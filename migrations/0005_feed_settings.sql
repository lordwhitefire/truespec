-- 0005 — taps, activity feed, settings (data-model plan §2, §8.5–8.6)

-- Raw, never-mutated feed. No name, no number, nothing from inside WhatsApp (A6).
CREATE TABLE tap (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page    text NOT NULL,
  car_ref text,
  at      timestamptz NOT NULL DEFAULT now(),
  ip      text NOT NULL
);

CREATE TABLE activity_event (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind     text NOT NULL,
  subject  text NOT NULL,
  at       timestamptz NOT NULL DEFAULT now(),
  actor_id uuid REFERENCES office_user (id) ON DELETE SET NULL
);

-- Documented keys only. NO rate key exists (R3). Password is not a setting.
CREATE TABLE setting (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO setting (key, value) VALUES
  ('whatsapp_number', '+2348000000000'),
  ('tagline', 'Cars you can trust, prices you can see.'),
  ('full_tank_default', '0');
