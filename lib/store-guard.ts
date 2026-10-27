import 'server-only';
import { demoDb, mainDb } from './db';
import type { Space } from './space-rule';
import { runWithRetry } from './store-retry-rules';
import { writeFailedMessage } from './store-refusal-rules';

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
 * This module is a deliberate singleton: `mainDb()` and `demoDb()` are imported nowhere else under
 * `lib/`, so no store call can slip past the retry. If every attempt fails the last error is thrown,
 * which an `error.tsx` boundary turns into a retryable state — never a bare 500 and never a
 * fabricated figure.
 *
 * There are two door families. The main doors (`storeQueryMain`, `storeQueryOnceMain`,
 * `storeQueryMainRefusing`) are always main and never load Clerk. The office doors
 * (`storeQuery`, `storeQueryRefusing`) resolve the signed-in space, or accept the space the session
 * check already resolved, and choose main or demo. A page or action cannot choose a door by itself.
 */
export type StoreDoorOptions = { space?: Space };

async function clientFor(options?: StoreDoorOptions) {
  if (options?.space === 'main') return mainDb();
  if (options?.space === 'demo') return demoDb();

  // Lazy on purpose: a CLI or a public main door must be importable under
  // `--conditions=react-server` without pulling in `next/headers` or Clerk.
  const { resolveSpace } = await import('./space');
  return (await resolveSpace()) === 'main' ? mainDb() : demoDb();
}

export async function storeQuery<T = unknown>(
  text: string,
  params: unknown[] = [],
  options?: StoreDoorOptions
): Promise<T> {
  const sql = await clientFor(options);
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
 * for the pool itself, so `mainDb()` still has exactly one holder under `lib/`.
 *
 * A tap is a main event even when the visitor's Clerk session says demo: the public showroom is
 * main, so its taps belong to main. The tap is therefore a main-only door.
 */
export async function storeQueryOnceMain<T = unknown>(
  text: string,
  params: unknown[] = []
): Promise<T> {
  const sql = mainDb();
  return (await sql.query(text, params)) as T;
}

/** The old name, kept as a main-only alias. New call sites use `storeQueryOnceMain`. */
export async function storeQueryOnce<T = unknown>(
  text: string,
  params: unknown[] = []
): Promise<T> {
  return storeQueryOnceMain<T>(text, params);
}

/** The main-only retrying door: public showroom, backup, cleanup and scripts. */
export async function storeQueryMain<T = unknown>(
  text: string,
  params: unknown[] = []
): Promise<T> {
  const sql = mainDb();
  return runWithRetry(async () => (await sql.query(text, params)) as T);
}

/**
 * The refusal a write returns when its store call failed — structurally the same shape every office
 * action already returns for a field rule, so a caller handles a rule refusal and a store refusal
 * the same way.
 */
export type StoreRefusal = { ok: false; errors: { field: string; message: string }[] };

/**
 * Run a **write**'s store call so that a store failure becomes a refusal in the action's own words,
 * never a throw (D32, DR25).
 *
 * `storeQuery` throws when the store cannot be reached, which is right for a *read* — an `error.tsx`
 * boundary turns that into a retryable state. It is wrong for a *write*: a rejected Server Action
 * called inside a React transition reaches the nearest boundary, and the boundary **replaces the
 * whole office chrome**. That is the measured §5 defect — a failed delete answered with a page-wide
 * *"We couldn't load this"* and the action's own *"That car could not be deleted."* never appeared,
 * because a throw never reaches the caller's `!result.ok` branch. So a write catches here and
 * returns the refusal its caller already knows how to show, in place.
 *
 * This is the pattern `photosExist` (`lib/car-form.ts:106-118`) already used around a read, applied
 * to the write statements: catch, and answer with words.
 *
 * The failure is not swallowed — it is logged, so a defect that is not really an unreachable store
 * stays visible to whoever is looking. `writeFailedMessage` decides only what the *person* is told,
 * and it never claims a safety it has not checked.
 */
export async function storeQueryRefusing<T = unknown>(
  text: string,
  params: unknown[],
  refusal: { field: string; action: string },
  options?: StoreDoorOptions
): Promise<{ ok: true; rows: T } | StoreRefusal> {
  try {
    return { ok: true, rows: await storeQuery<T>(text, params, options) };
  } catch (error) {
    return storeRefusal(refusal.field, refusal.action, error);
  }
}

/** The main-only refusing door: a main write whose store failure is an in-place refusal. */
export async function storeQueryMainRefusing<T = unknown>(
  text: string,
  params: unknown[],
  refusal: { field: string; action: string }
): Promise<{ ok: true; rows: T } | StoreRefusal> {
  try {
    return { ok: true, rows: await storeQueryMain<T>(text, params) };
  } catch (error) {
    return storeRefusal(refusal.field, refusal.action, error);
  }
}

/**
 * The refusal a failed write returns — and the log line that keeps the failure visible.
 *
 * Shared by `storeQueryRefusing` and by the call sites that carry their own `catch`, because the
 * store's **own** refusal (a duplicate name, a foreign key still holding the row) is caught there
 * and keeps its own, more precise words — but everything *else* it can raise is still a failed write
 * and must still be a refusal rather than a throw.
 *
 * `action` is the action's own phrase (*"That state could not be added"*); `field` is the field it
 * belongs beside, so the screen can show it where the person is looking.
 */
export function storeRefusal(field: string, action: string, error: unknown): StoreRefusal {
  console.error(`[store] write failed — ${action}`, error);
  return { ok: false, errors: [{ field, message: writeFailedMessage(action, error) }] };
}
