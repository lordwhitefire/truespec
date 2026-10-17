/**
 * The words a failed write gets — as pure rules.
 *
 * Deliberately free of `server-only` and of the driver, so the policy can be unit-tested directly
 * (`lib/store-refusal-rules.test.ts`). `lib/store-guard.ts` binds these words to the store. Same
 * split as `lib/store-retry-rules.ts` (rules) and `lib/store-guard.ts` (the server-bound half), and
 * `lib/counts.ts` / `lib/office.ts` before them.
 *
 * Authority: D32 and DR25. A failed write is reported **as a failed write**, where the person is
 * working, in that action's own voice — it never reaches an error boundary and never replaces the
 * office chrome with a whole-page message. DR25 also forbids an unverified reassurance, so these
 * words never say "nothing was lost": they name what failed, and the cause, and stop there.
 *
 * Both cause clauses are the product's own and already on its screens — *"The store could not be
 * reached — try that again"* (`registry-editor.tsx:93`, `enquiries-client.tsx:120`,
 * `drafts-client.tsx:156`) and *"The store refused that change"* (`:100`, `:129`). They are lifted
 * here so the office says one thing about one fact, from the server as well as the browser.
 */
import { isTransientStoreError } from "./store-retry-rules";

/**
 * The cause clause for a store that could not be reached — the cold-compute case the retry exists
 * for, and the overwhelmingly common one. Trying again is the move, so these words say so.
 */
const UNREACHED = "the store could not be reached. Try again.";

/**
 * The cause clause for a store that answered and refused the change — a unique violation, a dropped
 * constraint, a state that is no longer there. The same write fails the same way however often it
 * is sent, so these words deliberately do **not** invite a retry: telling someone to try again when
 * it cannot work is the kind of small lie this layer removes.
 */
const REFUSED = "the store refused that change.";

/** Which of the two cause clauses a failed write gets, from its cause alone. Pure. */
export function writeFailedClause(error: unknown): string {
  return isTransientStoreError(error) ? UNREACHED : REFUSED;
}

/**
 * A failed write's whole message, in the action's own voice: what could not be done, and why.
 *
 * `action` is the action's own phrase — *"That car could not be deleted"*, *"That change could not
 * be saved"* — never the store's, because the person's next move depends on knowing which action
 * failed (DR25).
 */
export function writeFailedMessage(action: string, error: unknown): string {
  return `${action} — ${writeFailedClause(error)}`;
}
