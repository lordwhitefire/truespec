-- 0010 — identity: the provider holds the credentials
-- TASK-003 Round 1 Q5 + Round 2 Q2 (Clerk stays as the identity provider).
--
-- `office_user.password_hash` goes: no password material lives in any application table — Clerk
-- holds the credentials. The one owner row keeps `id`, `email` (unique) and its timestamps.
--
-- **No provider-user column is added.** A copy of Clerk's user id here would be a second truth
-- about who signs in.
--
-- The session keeps its three dates (they already answer "7 days total" and "12 idle hours" with
-- no paid vendor feature) and gains exactly one column naming the provider session it mirrors,
-- unique, so one provider session cannot be two rows here. It is NOT NULL because a session row
-- exists only as the mirror of a provider session — a row without one could not be checked.
--
-- Applied file, never edited. Corrective only.

ALTER TABLE office_user DROP COLUMN password_hash;

ALTER TABLE session ADD COLUMN clerk_session_id text;
ALTER TABLE session ALTER COLUMN clerk_session_id SET NOT NULL;
ALTER TABLE session
  ADD CONSTRAINT session_clerk_session_id_unique UNIQUE (clerk_session_id);
