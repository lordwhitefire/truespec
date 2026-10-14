-- 0016 — the enquiry stops joining to a car
-- TASK-003 follow-up v1 (`key-and-hash-v1.md` decision 2; design D11; `task.md` conflict 18).
--
-- `enquiry.car_ref` was a join: it was created as `car_ref text, -- joins by ref, outlives the car`
-- (0004), and `specs/inventory` said enquiries join to the car by its code. **Winner: the owner's
-- requirement (2026-10-13).** An enquiry is a customer *asking for* a car — often a car we do not
-- hold, sometimes several at once. A join would have to invent a car row for something we do not
-- sell, or stand empty in exactly the normal case, and it fuses two records the business keeps
-- apart: cars are what we sell, enquiries are who asked.
--
-- `asked_for` replaces it and is **required**: every enquiry must say what was asked, in the
-- customer's own words. An imported one may say "see the attached document". No column anywhere on
-- an enquiry keeps a car reference — taps and activity rows still join to a car by its `TS-####`
-- code, because a tap is a statement about a car we do hold, but an enquiry does not.
--
-- The table is empty (TASK-003's demo was wiped on 2026-10-13), so `ADD COLUMN … NOT NULL` needs no
-- backfill and no default — and a default would be the wrong shape anyway (see 0002's refusal of
-- invented values).
--
-- Applied file, never edited. Corrective only.

ALTER TABLE enquiry DROP COLUMN car_ref;
ALTER TABLE enquiry ADD COLUMN asked_for text NOT NULL;
