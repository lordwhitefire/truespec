-- 0025 — the enquiry's code: ENQ-####
-- Owner ruling 2026-10-20, #4; truth 11, D20, D31.
--
-- An enquiry has always had a key (`id`, a uuid) and no **code** the owner and the log can read. The
-- activity log is a `kind` and a `subject`; a customer's name or number in that subject would outlive
-- the enquiry row, which the retention rule forbids. So the enquiry gets its own code, minted at the
-- save, exactly as a car's `TS-####` is (0003):
--
--   * `enquiry_ref_seq` is the only source of the number — a plain counter, never a name, never a
--     phone, never anything a customer could be guessed from;
--   * the column default mints the next code in the database, so no action has to remember to;
--   * `NOT NULL` and `UNIQUE` make a code a name, not a detail: every row has one, and no two rows
--     can share one.
--
-- **A draft carries no ref** (0022's rule): the number is spent when a draft becomes an enquiry, not
-- when a file is uploaded. An abandoned draft therefore burns nothing.
--
-- Existing rows are numbered **in creation order**, so the office's history reads in the order it
-- happened. The sequence is then moved past them; the next save gets the next number. The backfill
-- uses `row_number()` over `(created_at, id)` — the id only breaks a tie between two rows created in
-- the same instant, so the result is deterministic.
--
-- The identity lock (0018) already refuses an UPDATE that changes an enquiry's `id`. Its `ref` arm
-- is keyed on the row shape (`before_row ? 'ref'`), which means the one-time backfill would look
-- like a reassignment: after the column is added, every existing row has a `ref` key holding null.
-- The correction below is narrow — a row that had **no** code may be given one; a row that had one
-- still cannot change it or lose it. `car.ref` is never null, so the car's behaviour is unchanged.
-- Verified in P7's witness: after the backfill, an update that tries to change `ref` is refused.

CREATE OR REPLACE FUNCTION refuse_identity_change() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  before_row jsonb := to_jsonb(OLD);
  after_row  jsonb := to_jsonb(NEW);
BEGIN
  IF before_row ->> 'id' IS DISTINCT FROM after_row ->> 'id' THEN
    RAISE EXCEPTION 'identity is final: %.id cannot be changed (was %)', TG_TABLE_NAME, before_row ->> 'id'
      USING ERRCODE = 'check_violation';
  END IF;

  IF before_row ? 'ref'
     AND before_row ->> 'ref' IS NOT NULL
     AND before_row ->> 'ref' IS DISTINCT FROM after_row ->> 'ref' THEN
    RAISE EXCEPTION 'identity is final: %.ref cannot be changed (was %)', TG_TABLE_NAME, before_row ->> 'ref'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE SEQUENCE enquiry_ref_seq START WITH 1;

-- Nullable for the one statement it takes to number the rows that are already here.
ALTER TABLE enquiry ADD COLUMN ref text;

WITH numbered AS (
  SELECT id,
         row_number() OVER (ORDER BY created_at, id) AS n
    FROM enquiry
)
UPDATE enquiry e
   SET ref = 'ENQ-' || lpad(n.n::text, 4, '0')
  FROM numbered n
 WHERE e.id = n.id;

ALTER TABLE enquiry ALTER COLUMN ref SET NOT NULL;
ALTER TABLE enquiry ADD CONSTRAINT enquiry_ref_unique UNIQUE (ref);

-- `setval(..., n + 1, false)` makes the next `nextval` return `n + 1`: the next free number. The
-- `false` matters — with no rows the value is 1 and the first save must still get `ENQ-0001`.
SELECT setval('enquiry_ref_seq', (SELECT count(*) FROM enquiry) + 1, false);

ALTER TABLE enquiry
  ALTER COLUMN ref SET DEFAULT ('ENQ-' || lpad(nextval('enquiry_ref_seq')::text, 4, '0'));
