import "server-only";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "./db";
import { expiryFrom, isSessionValid, shouldRefreshLastSeen } from "./session-rules";

/**
 * Our own `session` row (design D4 / D17).
 *
 * Clerk carries the sign-in and holds the only session cookie — this module sets no
 * cookie of its own. What it keeps is the row our two limits are judged from,
 * created lazily on the first office request that carries a valid provider session,
 * keyed by the provider's session id on the unique column TASK-003 already added
 * (`session.clerk_session_id`, `migrations/0010_identity.sql`). No webhook and no
 * callback route exist (D17).
 *
 * The owner row is matched by email, never by a stored provider id: `office_user`
 * carries no provider-user column, on purpose (`migrations/0010_identity.sql:7`).
 */

/** A live office session — our row plus the one owner it belongs to. */
export type OfficeSession = {
  /** `session.id` */
  sessionRowId: string;
  /** `office_user.id` */
  officeUserId: string;
  /** `office_user.email` — what the shell shows as the signed-in name. */
  email: string;
  /** The provider session this row mirrors. */
  clerkSessionId: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
};

/** Where the door is mounted (design D4; task.md §Process step 1). */
export const SIGN_IN_PATH = "/office/sign-in";

type SessionRow = {
  session_row_id: string;
  office_user_id: string;
  email: string;
  clerk_session_id: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
};

function toSession(row: SessionRow): OfficeSession {
  return {
    sessionRowId: row.session_row_id,
    officeUserId: row.office_user_id,
    email: row.email,
    clerkSessionId: row.clerk_session_id,
    createdAt: new Date(row.created_at),
    lastSeenAt: new Date(row.last_seen_at),
    expiresAt: new Date(row.expires_at),
  };
}

/**
 * End a session at both ends: revoke the provider's session, then drop our row.
 *
 * Order matters. Dropping our row first would let the next request's lazy upsert
 * recreate a live row from the still-active provider session, reviving a session we
 * had just ended. Revoking first means the provider no longer reports the session,
 * so nothing can recreate the row. Used both by sign-out and when one of our limits
 * has been crossed (see `getOfficeSession`).
 */
export async function endSession(clerkSessionId: string): Promise<void> {
  const sql = db();
  const client = await clerkClient();
  await client.sessions.revokeSession(clerkSessionId);
  await sql.query(`DELETE FROM session WHERE clerk_session_id = $1`, [clerkSessionId]);
}

/**
 * The office session behind the current request, or `null`.
 *
 * Reads the provider's session, then — in one act (D17) — finds or lazily creates
 * our row and judges it against the two limits. When a limit has been crossed the
 * provider's session is ended too, so the door sends the owner to a fresh sign-in
 * rather than bouncing him straight back inside (specs/office-access: "the next
 * action requires a fresh sign-in"). Never invents a session: a request without a
 * provider session, or with one whose row has expired, gets `null`.
 */
export async function getOfficeSession(): Promise<OfficeSession | null> {
  const { userId, sessionId } = await auth();
  if (!userId || !sessionId) return null;

  const now = new Date();
  const sql = db();

  const rows = (await sql.query(
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
  )) as SessionRow[];

  const existing = rows[0];
  if (existing) {
    const session = toSession(existing);

    if (!isSessionValid(session, now)) {
      // A limit has been crossed. End the provider session as well, or the sign-in
      // page would see a live provider session and redirect the owner back here.
      try {
        await endSession(sessionId);
      } catch {
        // The provider was unreachable. Our row is left in place, so every request
        // keeps refusing until a later attempt reaches the provider or the 7-day
        // cap passes — the session never silently revives.
      }
      return null;
    }

    if (shouldRefreshLastSeen(session.lastSeenAt, now)) {
      await sql.query(`UPDATE session SET last_seen_at = $2 WHERE id = $1`, [
        session.sessionRowId,
        now.toISOString(),
      ]);
      session.lastSeenAt = now;
    }

    return session;
  }

  // First office request carrying this provider session: create our row (D17).
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null;
  if (!email) return null;

  // The one owner row is matched by email (there is no provider-user column).
  const owners = (await sql.query(
    `INSERT INTO office_user (email)
     VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET updated_at = $2
     RETURNING id`,
    [email, now.toISOString()],
  )) as { id: string }[];
  const officeUserId = owners[0]?.id;
  if (!officeUserId) return null;

  // One clock for the whole row, so the store can judge the two limits from the
  // dates alone and get the same answer the app does (TASK-003 testing.md).
  const created = (await sql.query(
    `INSERT INTO session (user_id, clerk_session_id, created_at, last_seen_at, expires_at)
     VALUES ($1, $2, $3, $3, $4)
     ON CONFLICT (clerk_session_id) DO UPDATE SET last_seen_at = $3
     RETURNING id AS session_row_id, user_id AS office_user_id,
               clerk_session_id, created_at, last_seen_at, expires_at`,
    [officeUserId, sessionId, now.toISOString(), expiryFrom(now).toISOString()],
  )) as Omit<SessionRow, "email">[];

  const createdRow = created[0];
  if (!createdRow) return null;
  return toSession({ ...createdRow, email });
}

/**
 * The office session, or a redirect to the door. For pages and Server Actions — the
 * server-side check every office route runs (specs/office-access: "Every office page
 * and data request is checked server-side"). A Route Handler that must return a
 * status instead of a redirect calls `getOfficeSession` and answers `401` itself.
 */
export async function requireOfficeSession(): Promise<OfficeSession> {
  const session = await getOfficeSession();
  if (!session) redirect(SIGN_IN_PATH);
  return session;
}
