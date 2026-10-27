import 'server-only';
import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { storeQuery } from './store-guard';
import { resolveSpace, type Space } from './space';
import {
  checkOfficeSessionWith,
  endSessionWith,
  type OfficeSession,
  type OfficeSessionState,
  type SessionDeps,
} from './session-space';

export type { OfficeSession, OfficeSessionState } from './session-space';

/**
 * Our own `session` row (design D4 / D17), bound to Clerk and the store doors.
 *
 * Clerk carries the sign-in and holds the only session cookie — this module sets no cookie of its
 * own. What it keeps is the row our two limits are judged from, created lazily on the first office
 * request that carries a valid provider session, keyed by the provider's session id on the unique
 * column TASK-003 already added (`session.clerk_session_id`, `migrations/0010_identity.sql`). No
 * webhook and no callback route exist (D17).
 *
 * The row lives in the account's resolved space. The space is resolved before the first store call
 * and passed explicitly to every query; the pure half is `session-space.ts`.
 *
 * The owner row is matched by email, never by a stored provider id: `office_user` carries no
 * provider-user column, on purpose (`migrations/0010_identity.sql:7`).
 */

/** The door, mounted in the office (design D4; task.md §Process step 1). */
export const SIGN_IN_PATH = '/office/sign-in';

/** The client-side sign-out that clears the provider's cookie, then returns to the door. */
export const SIGN_OUT_PATH = '/office/sign-out';

function liveDeps(): SessionDeps {
  return {
    readAuth: async () => {
      const { userId, sessionId } = await auth();
      return { userId, sessionId };
    },
    resolveSpace,
    readEmail: async () => {
      const user = await currentUser();
      return (
        user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null
      );
    },
    query: <T = unknown>(text: string, params?: unknown[], options?: { space: Space }) =>
      storeQuery<T>(text, params, options),
    revokeSession: async (clerkSessionId) => {
      const client = await clerkClient();
      await client.sessions.revokeSession(clerkSessionId);
    },
    now: () => new Date(),
  };
}

/**
 * End a session at both ends: revoke the provider's session, then drop our row.
 *
 * The space is the account's resolved branch. `checkOfficeSession` passes the space it already
 * resolved; the sign-out action omits it and the resolver runs here. Either way the delete lands in
 * one branch, never in both.
 */
export async function endSession(clerkSessionId: string, space?: Space): Promise<void> {
  const resolved = space ?? (await resolveSpace());
  await endSessionWith(clerkSessionId, resolved, liveDeps());
}

/**
 * Check the current request against our own row in the resolved space.
 *
 * An anonymous request is `none` before a space is resolved or a store is read. A provider session
 * that exists only in the other space does not authorise this request; the selected space's lazy
 * check runs.
 */
export async function checkOfficeSession(): Promise<OfficeSessionState> {
  return checkOfficeSessionWith(liveDeps());
}

/**
 * The active session, or `null` — for Route Handlers, which answer `401` themselves rather than
 * redirecting (specs/office-access: "refuses to render the page or return its data").
 */
export async function getOfficeSession(): Promise<OfficeSession | null> {
  const state = await checkOfficeSession();
  return state.status === 'active' ? state.session : null;
}

/**
 * The active session, or a redirect to the right place. For pages and Server Actions — the
 * server-side check every office route runs (specs/office-access: "Every office page and data
 * request is checked server-side"). An ended session goes through the client-side sign-out first,
 * so its dead provider cookie is cleared before the door is shown; an absent one goes straight to
 * the door.
 */
export async function requireOfficeSession(): Promise<OfficeSession> {
  const state = await checkOfficeSession();
  if (state.status === 'active') return state.session;
  redirect(state.status === 'ended' ? SIGN_OUT_PATH : SIGN_IN_PATH);
}
