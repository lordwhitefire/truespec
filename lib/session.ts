import "server-only";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { storeQuery } from "./store-guard";
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

/**
 * The verdict of checking the current request.
 *
 * `none` and `ended` are different on purpose. `none` is a request with no provider
 * session — show the door. `ended` is a request whose provider session exists but
 * whose own row has crossed a limit; the provider session has been revoked, and the
 * browser must clear its (now dead) session cookie before it meets the door, or
 * Clerk's own sign-in would bounce it straight back inside. Both are refused; only
 * `ended` additionally needs the client-side sign-out.
 */
export type OfficeSessionState =
  | { status: "active"; session: OfficeSession }
  | { status: "none" }
  | { status: "ended" };

/** The door, mounted in the office (design D4; task.md §Process step 1). */
export const SIGN_IN_PATH = "/office/sign-in";

/** The client-side sign-out that clears the provider's cookie, then returns to the door. */
export const SIGN_OUT_PATH = "/office/sign-out";

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
 * so nothing can recreate the row.
 */
export async function endSession(clerkSessionId: string): Promise<void> {
  const client = await clerkClient();
  await client.sessions.revokeSession(clerkSessionId);
  await storeQuery(`DELETE FROM session WHERE clerk_session_id = $1`, [clerkSessionId]);
}

/**
 * Check the current request against our own row.
 *
 * Reads the provider's session, then — in one act (D17) — finds or lazily creates
 * our row and judges it against the two limits. When a limit has been crossed the
 * provider's session is ended too, so the door can send the owner to a fresh
 * sign-in rather than bouncing him straight back inside (specs/office-access:
 * "the next action requires a fresh sign-in"). Never invents a session.
 */
export async function checkOfficeSession(): Promise<OfficeSessionState> {
  const { userId, sessionId } = await auth();
  if (!userId || !sessionId) return { status: "none" };

  const now = new Date();

  const rows = (await storeQuery(
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
      // A limit has been crossed. End the provider session as well, or a still-live
      // provider session would recreate this row on the very next request.
      try {
        await endSession(sessionId);
      } catch {
        // The provider was unreachable. Our row is left in place, so every request
        // keeps refusing until a later attempt reaches the provider or the 7-day cap
        // passes — the session never silently revives.
      }
      return { status: "ended" };
    }

    if (shouldRefreshLastSeen(session.lastSeenAt, now)) {
      await storeQuery(`UPDATE session SET last_seen_at = $2 WHERE id = $1`, [
        session.sessionRowId,
        now.toISOString(),
      ]);
      session.lastSeenAt = now;
    }

    return { status: "active", session };
  }

  // First office request carrying this provider session: create our row (D17).
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null;
  if (!email) return { status: "none" };

  // The one owner row is matched by email (there is no provider-user column).
  const owners = (await storeQuery(
    `INSERT INTO office_user (email)
     VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET updated_at = $2
     RETURNING id`,
    [email, now.toISOString()],
  )) as { id: string }[];
  const officeUserId = owners[0]?.id;
  if (!officeUserId) return { status: "none" };

  // One clock for the whole row, so the store can judge the two limits from the
  // dates alone and get the same answer the app does (TASK-003 testing.md).
  const created = (await storeQuery(
    `INSERT INTO session (user_id, clerk_session_id, created_at, last_seen_at, expires_at)
     VALUES ($1, $2, $3, $3, $4)
     ON CONFLICT (clerk_session_id) DO UPDATE SET last_seen_at = $3
     RETURNING id AS session_row_id, user_id AS office_user_id,
               clerk_session_id, created_at, last_seen_at, expires_at`,
    [officeUserId, sessionId, now.toISOString(), expiryFrom(now).toISOString()],
  )) as Omit<SessionRow, "email">[];

  const createdRow = created[0];
  if (!createdRow) return { status: "none" };
  return { status: "active", session: toSession({ ...createdRow, email }) };
}

/**
 * The active session, or `null` — for Route Handlers, which answer `401` themselves
 * rather than redirecting (specs/office-access: "refuses to render the page or
 * return its data").
 */
export async function getOfficeSession(): Promise<OfficeSession | null> {
  const state = await checkOfficeSession();
  return state.status === "active" ? state.session : null;
}

/**
 * The active session, or a redirect to the right place. For pages and Server Actions
 * — the server-side check every office route runs (specs/office-access: "Every office
 * page and data request is checked server-side"). An ended session goes through the
 * client-side sign-out first, so its dead provider cookie is cleared before the door
 * is shown; an absent one goes straight to the door.
 */
export async function requireOfficeSession(): Promise<OfficeSession> {
  const state = await checkOfficeSession();
  if (state.status === "active") return state.session;
  redirect(state.status === "ended" ? SIGN_OUT_PATH : SIGN_IN_PATH);
}
