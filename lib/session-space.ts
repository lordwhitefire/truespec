/**
 * The office session's space-bound half, with the request layer injected.
 *
 * The live module (`session.ts`) binds Clerk and the store doors; this module is the part that can
 * be tested without a request. The space is resolved before the first store call and passed
 * explicitly to every query, so the session row is read and created in the account's own branch.
 * The lazy upsert and the 12-hour / 7-day limits are unchanged.
 *
 * A row in one space cannot authorise a request in the other: the check only ever reads the
 * selected space. If the provider session matches a row that exists only in the other branch, this
 * check does not see it; the selected branch's own lazy check runs.
 *
 * `endSessionWith` revokes the provider session first, then deletes our row in the same space. The
 * order is the safety property: deleting first would let the next request recreate the row from a
 * still-live provider session.
 */
import type { Space } from "./space-rule";
import { expiryFrom, isSessionValid, shouldRefreshLastSeen } from "./session-rules";

/** A live office session — our row, its one owner, and the space it lives in. */
export type OfficeSession = {
  /** `session.id` */
  sessionRowId: string;
  /** `office_user.id` */
  officeUserId: string;
  /** `office_user.email` — what the shell shows as the signed-in name. */
  email: string;
  /** The provider session this row mirrors. */
  clerkSessionId: string;
  /** The branch this row was read from or created in. */
  space: Space;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
};

/**
 * The verdict of checking the current request.
 *
 * `none` and `ended` are different on purpose. `none` is a request with no provider session — show
 * the door. `ended` is a request whose provider session exists but whose own row has crossed a
 * limit; the provider session has been revoked, and the browser must clear its (now dead) session
 * cookie before it meets the door, or Clerk's own sign-in would bounce it straight back inside.
 */
export type OfficeSessionState =
  | { status: "active"; session: OfficeSession }
  | { status: "none" }
  | { status: "ended" };

export type SessionRow = {
  session_row_id: string;
  office_user_id: string;
  email: string;
  clerk_session_id: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
};

/** A store call that always carries the space the session check resolved. */
export type SessionQuery = <T = unknown>(
  text: string,
  params?: unknown[],
  options?: { space: Space },
) => Promise<T>;

export type SessionDeps = {
  readAuth: () => Promise<{ userId: string | null; sessionId: string | null }>;
  resolveSpace: () => Promise<Space>;
  readEmail: () => Promise<string | null>;
  query: SessionQuery;
  revokeSession: (clerkSessionId: string) => Promise<void>;
  now: () => Date;
};

function toSession(row: SessionRow, space: Space): OfficeSession {
  return {
    sessionRowId: row.session_row_id,
    officeUserId: row.office_user_id,
    email: row.email,
    clerkSessionId: row.clerk_session_id,
    space,
    createdAt: new Date(row.created_at),
    lastSeenAt: new Date(row.last_seen_at),
    expiresAt: new Date(row.expires_at),
  };
}

/**
 * End a session at both ends: revoke the provider's session, then drop our row in `space`.
 * Never called without the space the check resolved, so the delete cannot land in the other branch.
 */
export async function endSessionWith(
  clerkSessionId: string,
  space: Space,
  deps: Pick<SessionDeps, "revokeSession" | "query">,
): Promise<void> {
  await deps.revokeSession(clerkSessionId);
  await deps.query(
    `DELETE FROM session WHERE clerk_session_id = $1`,
    [clerkSessionId],
    { space },
  );
}

/**
 * Check the current request against our own row in the resolved space.
 *
 * The provider session is read first: an anonymous request is `none` without resolving a space or
 * touching a store. Then the space is resolved, and every query below passes it explicitly. A
 * provider session that exists only in the other space is invisible here; the selected space's
 * lazy upsert creates its own row.
 */
export async function checkOfficeSessionWith(
  deps: SessionDeps,
): Promise<OfficeSessionState> {
  const { userId, sessionId } = await deps.readAuth();
  if (!userId || !sessionId) return { status: "none" };

  const now = deps.now();
  const space = await deps.resolveSpace();

  const rows = await deps.query<SessionRow[]>(
    `SELECT s.id           AS session_row_id,
            s.user_id      AS office_user_id,
            u.email,
            s.clerk_session_id,
            s.created_at,
            s.last_seen_at,
            s.expires_at
       FROM session s
       JOIN office_user u ON u.id = s.user_id
      WHERE s.clerk_session_id = $1`,
    [sessionId],
    { space },
  );

  const existing = rows[0];
  if (existing) {
    const session = toSession(existing, space);

    if (!isSessionValid(session, now)) {
      // A limit has been crossed. End the provider session as well, or a still-live provider
      // session would recreate this row on the very next request.
      try {
        await endSessionWith(sessionId, space, deps);
      } catch {
        // The provider was unreachable. Our row is left in place, so every request keeps refusing
        // until a later attempt reaches the provider or the 7-day cap passes — the session never
        // silently revives.
      }
      return { status: "ended" };
    }

    if (shouldRefreshLastSeen(session.lastSeenAt, now)) {
      await deps.query(
        `UPDATE session SET last_seen_at = $2 WHERE id = $1`,
        [session.sessionRowId, now.toISOString()],
        { space },
      );
      session.lastSeenAt = now;
    }

    return { status: "active", session };
  }

  // First office request carrying this provider session in this space: create our row (D17).
  const email = await deps.readEmail();
  if (!email) return { status: "none" };

  // The one owner row is matched by email (there is no provider-user column).
  const owners = await deps.query<{ id: string }[]>(
    `INSERT INTO office_user (email)
     VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET updated_at = $2
     RETURNING id`,
    [email, now.toISOString()],
    { space },
  );
  const officeUserId = owners[0]?.id;
  if (!officeUserId) return { status: "none" };

  // One clock for the whole row, so the store can judge the two limits from the dates alone and
  // get the same answer the app does (TASK-003 testing.md).
  const created = await deps.query<Omit<SessionRow, "email">[]>(
    `INSERT INTO session (user_id, clerk_session_id, created_at, last_seen_at, expires_at)
     VALUES ($1, $2, $3, $3, $4)
     ON CONFLICT (clerk_session_id) DO UPDATE SET last_seen_at = $3
     RETURNING id AS session_row_id, user_id AS office_user_id,
               clerk_session_id, created_at, last_seen_at, expires_at`,
    [officeUserId, sessionId, now.toISOString(), expiryFrom(now).toISOString()],
    { space },
  );

  const createdRow = created[0];
  if (!createdRow) return { status: "none" };
  return { status: "active", session: toSession({ ...createdRow, email }, space) };
}
