/**
 * When a store read may be tried again, and how long to wait before trying — as pure rules.
 *
 * Deliberately free of `server-only`, the driver and the database, so the policy can be unit-tested
 * directly (`lib/store-retry-rules.test.ts`). `lib/store-guard.ts` binds these rules to the store.
 * Same split as `lib/session-rules.ts` (rules) and `lib/session.ts` (the server-bound half), and
 * `lib/counts.ts` / `lib/office.ts` before them.
 *
 * Authority: design D18 and truth 16 — a transient store failure is retried so that a cold compute
 * never becomes an error page, while a failure that survives every attempt becomes a retryable
 * state. The shape is Neon's own documented guidance for resilient applications: retry with
 * exponential backoff and jitter, about five attempts, 1 s rising to a 16 s cap, and retry ONLY
 * transient errors. Neon's Free plan scales compute to zero after 5 minutes idle and cannot switch
 * that off, so the first request after a quiet spell is the cold case this exists for.
 */

/** Attempts in total: one try plus four retries (Neon's documented `retries: 5`). */
export const STORE_ATTEMPTS = 5;

/** The first wait, in ms (Neon's documented `minTimeout: 1000`). */
export const STORE_BASE_DELAY_MS = 1000;

/** The cap on any single wait, in ms (Neon's documented `maxTimeout: 16000`). */
export const STORE_MAX_DELAY_MS = 16000;

/**
 * The SQLSTATEs Postgres sends when the compute is restarting or was not reachable — Neon's
 * documented transient set. `57P01` is "terminating connection due to administrator command",
 * `08006` a connection failure, `08003` a connection that does not exist.
 */
const TRANSIENT_SQLSTATES = ['57P01', '08006', '08003'] as const;

/**
 * The socket-level codes a failed `fetch` carries. The Neon serverless driver speaks HTTP, so a cold
 * or unreachable compute surfaces as `TypeError: fetch failed`, with the real code one level down in
 * `cause` (observed here 2026-10-14: `fetch failed` / `AggregateError { code: 'ETIMEDOUT' }`).
 */
const TRANSIENT_NET_CODES = [
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
  'UND_ERR_HEADERS_TIMEOUT',
] as const;

/** The message fragments Neon documents as transient. Matched case-insensitively. */
const TRANSIENT_MESSAGES = [
  'fetch failed',
  'connection terminated unexpectedly',
  'terminating connection due to administrator command',
  'client has encountered a connection error and is not queryable',
  'network issue',
  'early eof',
  "couldn't connect to compute node",
  'connection closed',
] as const;

/** What an error carries, gathered from itself and (a few levels) through `cause` and `errors`. */
type ErrorFacts = { codes: Set<string>; messages: string[] };

function collect(error: unknown, into: ErrorFacts, depth: number): void {
  if (depth > 3 || error === null || typeof error !== 'object') return;
  const record = error as { code?: unknown; message?: unknown; cause?: unknown; errors?: unknown };
  if (typeof record.code === 'string') into.codes.add(record.code);
  if (typeof record.message === 'string') into.messages.push(record.message);
  if (record.cause !== undefined) collect(record.cause, into, depth + 1);
  // An `AggregateError` (what a failed fetch often is) gathers its parts under `errors`.
  if (Array.isArray(record.errors)) {
    for (const part of record.errors) collect(part, into, depth + 1);
  }
}

/**
 * Whether a failed store call is worth trying again. Only a transient failure is — a unique
 * violation, a syntax error or a bad password will fail identically however often it is sent.
 */
export function isTransientStoreError(error: unknown): boolean {
  const facts: ErrorFacts = { codes: new Set(), messages: [] };
  collect(error, facts, 0);

  for (const code of facts.codes) {
    if ((TRANSIENT_SQLSTATES as readonly string[]).includes(code)) return true;
    if ((TRANSIENT_NET_CODES as readonly string[]).includes(code)) return true;
  }

  const blob = facts.messages.join(' | ').toLowerCase();
  return TRANSIENT_MESSAGES.some((fragment) => blob.includes(fragment));
}

/** The knobs on the retry loop. Every one is injectable so the loop can be tested without waiting. */
export type RetryOptions = {
  /** Attempts in total. Defaults to `STORE_ATTEMPTS`. */
  attempts?: number;
  /** How long to wait after a failed attempt. Defaults to `retryDelayMs`. */
  delayMs?: (attempt: number) => number;
  /** How to wait. Defaults to a real `setTimeout`; tests pass a recorder that resolves at once. */
  sleep?: (ms: number) => Promise<void>;
  /** Which failures may be retried. Defaults to `isTransientStoreError`. */
  classify?: (error: unknown) => boolean;
};

/**
 * Try the operation, and try it again while it fails transiently — the policy above, executed.
 *
 * Kept here rather than beside the store so it can be run directly against a fake operation, with no
 * database and no real waiting: the exact number of attempts, which failures are retried, and the
 * delays between them are all pinned by `lib/store-retry-rules.test.ts` rather than inferred.
 *
 * A transient failure that outlasts every attempt is thrown as it came (the last one), so the caller
 * — and through it an `error.tsx` boundary — decides what to show. A failure that is not transient is
 * thrown on the first attempt: repeating it would only make the person wait longer for the same
 * answer.
 */
export async function runWithRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const attempts = options.attempts ?? STORE_ATTEMPTS;
  const delayMs = options.delayMs ?? retryDelayMs;
  const classify = options.classify ?? isTransientStoreError;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const mayRetry = attempt < attempts && classify(error);
      if (!mayRetry) throw error;
      await sleep(delayMs(attempt));
    }
  }

  // Unreachable while attempts > 1, but it keeps the return type honest.
  throw lastError;
}

/**
 * How long to wait after the given attempt failed, in ms: exponential backoff, capped, plus up to
 * half again as jitter so that several cold requests do not all knock at the same instant (the
 * reason Neon's guidance includes jitter at all). `random` is injectable so the rule is testable.
 */
export function retryDelayMs(attempt: number, random: () => number = Math.random): number {
  const step = Math.max(1, Math.floor(attempt));
  const backoff = Math.min(STORE_BASE_DELAY_MS * Math.pow(2, step - 1), STORE_MAX_DELAY_MS);
  return Math.round(backoff + backoff * 0.5 * random());
}
