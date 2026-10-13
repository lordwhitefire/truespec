-- 0008 — money: one naira price per kind
-- TASK-003 Round 1 Q1 + conflict 3 (a rate / a currency never belonged in the store).
--
-- The store holds naira (kobo as minor units) and nothing else: no `currency`, no `rate_minor`,
-- no fallback of 1, no global rate. The two CHECKs that policed the rate are dropped with it.
-- `amount_minor` keeps its meaning: NULL = not entered, 0 = a genuine zero (different things).
--
-- `UNIQUE (car_id, kind)`: one line per kind per car, so "the six naira lines" is a shape the
-- store enforces rather than a habit the seed keeps.
--
-- Applied file, never edited. Corrective only (forward-only chain).

ALTER TABLE cost_line DROP CONSTRAINT cost_line_usd_needs_rate;
ALTER TABLE cost_line DROP CONSTRAINT cost_line_ngn_no_rate;
ALTER TABLE cost_line DROP COLUMN rate_minor;
ALTER TABLE cost_line DROP COLUMN currency;

ALTER TABLE cost_line
  ADD CONSTRAINT cost_line_car_kind_unique UNIQUE (car_id, kind);
