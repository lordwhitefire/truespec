import 'server-only';
import { cache } from 'react';
import { currentUser } from '@clerk/nextjs/server';
import { spaceFromUser, type Space } from './space-rule';

/**
 * The request-only half of the space rule.
 *
 * The pure rule lives in `space-rule.ts` so it can be tested in a plain Node process.
 * This module is the one place the authoritative Clerk user is read. `cache()` makes
 * the call once per request, not across requests, so a metadata change is seen on the
 * next request. There is no catch: no user, or a Clerk failure, throws. It never
 * returns main by fallback.
 *
 * `lib/store-guard.ts` must not import this module at the top level. The office door
 * loads it lazily, inside the request; the main doors never load it at all.
 */
export { spaceFromMetadata, spaceFromUser, type Space } from './space-rule';

async function resolveSpaceUncached(): Promise<Space> {
  return spaceFromUser(await currentUser());
}

export const resolveSpace = cache(resolveSpaceUncached);
