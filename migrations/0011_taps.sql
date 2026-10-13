-- 0011 — a tap keeps no visitor address
-- TASK-003 Round 1 ruling + conflict 9 (specs/showroom: "record only that the tap happened —
-- the page, the car's reference, and the time").
--
-- The column held more than "only": the retention rules treat tap rows as personal data on
-- account of it. With `ip` gone, a tap row holds the page, the car's code and the time and
-- nothing about the visitor, so tap rows carry no personal data at all.
--
-- Tap-flooding, if it ever matters, is answered outside the store (an edge rule or an
-- in-memory counter) — neither writes anything down. The one stored address in the system stays
-- where it does a job: `auth_attempt`, feeding the growing delay after wrong passwords (C2).
--
-- Applied file, never edited. Corrective only.

ALTER TABLE tap DROP COLUMN ip;
