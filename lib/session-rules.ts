/**
 * The office session's two limits and its refresh cooldown — as pure rules.
 *
 * Deliberately free of `server-only`, Clerk and the database, so the limits can be
 * unit-tested directly (`lib/session.test.ts`). `lib/session.ts` binds these rules
 * to the store and the identity provider. Same split as `lib/counts.ts` (rules) and
 * `lib/office.ts` (the server-bound reader).
 *
 * Authority: design D4 / D17 and `specs/office-access` — a session is valid iff
 * `now < expires_at` (7 days total) and it has been idle no more than 12 hours,
 * judged from the application's own `session` row, never from a provider feature.
 */

/** A session lives 7 days in total (D4; specs/office-access). */
export const SESSION_TOTAL_MS = 7 * 24 * 60 * 60 * 1000;

/** A session dies after 12 idle hours (D4; specs/office-access). */
export const SESSION_IDLE_MS = 12 * 60 * 60 * 1000;

/** `last_seen_at` is written at most once per 5 minutes (D4 / D17). */
export const LAST_SEEN_REFRESH_MS = 5 * 60 * 1000;

/** The two dates a session's validity is judged from — nothing else is consulted. */
export type SessionWindow = { expiresAt: Date; lastSeenAt: Date };

/**
 * Valid iff `now < expires_at` and `now - last_seen_at <= 12 h`. Both limits are
 * inclusive/exclusive exactly as the store's comment on `session` states them
 * (`migrations/0001_people.sql:12`): the 7-day cap is strict, the 12-hour idle
 * window is inclusive.
 */
export function isSessionValid(window: SessionWindow, now: Date): boolean {
  const withinTotal = now.getTime() < window.expiresAt.getTime();
  const withinIdle = now.getTime() - window.lastSeenAt.getTime() <= SESSION_IDLE_MS;
  return withinTotal && withinIdle;
}

/** The expiry stamped on a row created at `createdAt`: exactly `createdAt + 7 d`. */
export function expiryFrom(createdAt: Date): Date {
  return new Date(createdAt.getTime() + SESSION_TOTAL_MS);
}

/**
 * Whether `last_seen_at` should be written again — true once the 5-minute cooldown
 * has elapsed. So a busy office refreshes at most every 5 minutes, and the idle
 * window is measured from the last such write.
 */
export function shouldRefreshLastSeen(lastSeenAt: Date, now: Date): boolean {
  return now.getTime() - lastSeenAt.getTime() >= LAST_SEEN_REFRESH_MS;
}
