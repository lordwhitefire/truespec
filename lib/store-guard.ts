import "server-only";
import { db } from "./db";
import { runWithRetry } from "./store-retry-rules";

/**
 * The one place a store call becomes retryable (design D18).
 *
 * Every server-side store call goes through here, so the cold-start behaviour is decided once rather
 * than at each call site. Neon's Free plan scales compute to zero after 5 minutes idle — a setting
 * that cannot be switched off — and the request that follows a quiet spell can miss while the compute
 * wakes. A miss of that kind arrives as a transient error (`fetch failed` / `ETIMEDOUT`, or one of
 * Neon's transient SQLSTATEs); `runWithRetry` tries again with exponential backoff and jitter until
 * it lands or the attempts run out. A real error — a unique violation, a syntax error, a bad password,
 * a malformed connection string — is thrown on the first attempt: repeating it would only make the
 * person wait longer for the same answer.
 *
 * Retrying is safe for writes as well as reads because every write this project makes is idempotent
 * (`INSERT … ON CONFLICT … DO UPDATE … RETURNING`, and idempotent `UPDATE` / `DELETE`), so a reply
 * lost on the way back cannot double-apply. That is Neon's documented precondition for retrying.
 *
 * This module is a deliberate singleton: `db()` is imported nowhere else under `lib/`, so no store
 * call can slip past the retry. If every attempt fails the last error is thrown, which an `error.tsx`
 * boundary turns into a retryable state — never a bare 500 and never a fabricated figure.
 */
export async function storeQuery<T = unknown>(
  text: string,
  params: unknown[] = [],
): Promise<T> {
  const sql = db();
  return runWithRetry(async () => (await sql.query(text, params)) as T);
}

/**
 * The one store call that is deliberately **not** retried: recording a tap.
 *
 * `storeQuery`'s retry is safe because every other write here is idempotent — it lands on a key that
 * conflicts (`INSERT … ON CONFLICT … DO UPDATE`) or updates a row by its id, so a reply lost on the
 * way back cannot apply twice. A tap has no such key: it is an **event, not a state**, so two rows
 * are two taps and a retry after a lost reply would count one buyer's tap twice. Truth 8 wants the
 * figure to be the taps the office actually received, and `testing.md` §9 fails a figure that counts
 * taps it never received — so this call reports its failure instead of repeating it.
 *
 * One tap lost costs a tap that already happened; it never costs a wrong number and never costs the
 * buyer anything, because the page does not wait for the answer. It lives here, rather than reaching
 * for the pool itself, so `db()` still has exactly one holder under `lib/`.
 */
export async function storeQueryOnce<T = unknown>(
  text: string,
  params: unknown[] = [],
): Promise<T> {
  const sql = db();
  return (await sql.query(text, params)) as T;
}
