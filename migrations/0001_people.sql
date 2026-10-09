-- 0001 — people and access (data-model plan §2, §8.1)
-- One owner. No signup; first-run creation only.

CREATE TABLE office_user (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- C1 app-enforced: active iff now < expires_at and now - last_seen_at <= 12 h.
-- expires_at = created_at + 7 d. last_seen_at refreshed on a 5-minute cooldown.
CREATE TABLE session (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES office_user (id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL
);

-- C2 logger: feeds the growing delay and the per-IP cap. No PII beyond an IP.
CREATE TABLE auth_attempt (
  id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip  text NOT NULL,
  at  timestamptz NOT NULL DEFAULT now(),
  ok  boolean NOT NULL
);
