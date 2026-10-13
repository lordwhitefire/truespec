-- 0015 — `office_car` retires last
-- TASK-003 §5 (Round 3 Q3): the office now reads the one car table, so its own table goes — and it
-- goes LAST, after `lib/office.ts` and `scripts/reconcile.ts` were re-pointed. A table dropped before
-- its readers move is a broken office, which is why this is the final shape change of the layer.
--
-- Guard: refuse if this table still holds a car the one table has no `ref` for. Nothing the
-- demonstration holds may be lost by this drop — the owner's instruction is that nothing is deleted
-- on his behalf, and every row here was written by the retired office seed (`scripts/seed-office.ts`)
-- whose refs are the refs the demo fleet now uses.
--
-- Applied file, never edited. Corrective only.

DO $$
DECLARE missing integer;
BEGIN
  SELECT count(*) INTO missing
    FROM office_car oc
   WHERE NOT EXISTS (SELECT 1 FROM car c WHERE c.ref = oc.ref);

  IF missing > 0 THEN
    RAISE EXCEPTION
      '0015 refuses: % row(s) in office_car have no car with the same ref — dropping the table would lose them',
      missing;
  END IF;
END $$;

DROP TABLE office_car;
