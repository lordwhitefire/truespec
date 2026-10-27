'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { endSession, SIGN_OUT_PATH } from '@/lib/session';

/**
 * Sign out. A Server Action, so no GET can sign anyone out
 * (specs/office-access: "State changes are POSTs with origin verification").
 *
 * It revokes the provider's session and drops our own row together (D4), then hands
 * the browser to `/office/sign-out`, whose client code clears the provider's cookie.
 * That last step is what makes sign-out immediate for a tab left open: the shared
 * cookie is gone, so every other tab's next request carries no session at all.
 *
 * A Server Action is a public endpoint, so it checks auth itself (clerk skill).
 */
export async function signOutOffice(): Promise<void> {
  const { sessionId } = await auth();
  if (sessionId) {
    try {
      await endSession(sessionId);
    } catch {
      // The provider was unreachable; still clear the browser and return to the door.
      // Our row is left for the next authenticated check to end.
    }
  }
  redirect(SIGN_OUT_PATH);
}
