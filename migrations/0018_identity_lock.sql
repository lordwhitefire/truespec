-- 0018 — the identity lock: a car's key and code, and an enquiry's key, are final
-- TASK-003 follow-up v1 (`key-and-hash-v1.md` decision 5; design D12).
--
-- A car is named by two things: `id` (the key, which the office screens and every foreign key
-- already use) and `ref` (the `TS-####` code the owner and the customer both read). An enquiry is
-- named by `id`. `car.ref` in particular must never be reassigned: the code is in URLs, in taps, in
-- activity rows and in printed material, and re-pointing it silently re-points all of them at a
-- different car.
--
-- The trigger refuses an UPDATE that would change either name. It deliberately does **not** refuse:
--   * a write that sets a name to the value it already has — the filler upserts `ON CONFLICT (ref)`
--     and its `DO UPDATE` list never includes `ref`, and any other writer retrying with the same
--     code must not be blocked by a lock that only means "do not change it".
--   * a DELETE — retiring a car is the wipe's job and stays possible.
--
-- `to_jsonb` is used rather than `NEW.ref` because one function serves both tables, and an enquiry
-- has no `ref` column to name.
--
-- Applied file, never edited. Corrective only.

CREATE FUNCTION refuse_identity_change() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  before_row jsonb := to_jsonb(OLD);
  after_row  jsonb := to_jsonb(NEW);
BEGIN
  IF before_row ->> 'id' IS DISTINCT FROM after_row ->> 'id' THEN
    RAISE EXCEPTION 'identity is final: %.id cannot be changed (was %)', TG_TABLE_NAME, before_row ->> 'id'
      USING ERRCODE = 'check_violation';
  END IF;

  IF before_row ? 'ref' AND before_row ->> 'ref' IS DISTINCT FROM after_row ->> 'ref' THEN
    RAISE EXCEPTION 'identity is final: %.ref cannot be changed (was %)', TG_TABLE_NAME, before_row ->> 'ref'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER car_identity_is_final
  BEFORE UPDATE ON car
  FOR EACH ROW EXECUTE FUNCTION refuse_identity_change();

CREATE TRIGGER enquiry_identity_is_final
  BEFORE UPDATE ON enquiry
  FOR EACH ROW EXECUTE FUNCTION refuse_identity_change();
