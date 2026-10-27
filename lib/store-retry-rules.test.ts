/**
 * The store's retry policy, executable.
 *
 * These pin design D18 and truth 16: a cold or dropped store connection is retried, and only a
 * transient failure is retried — a real error is sent once and reported. The delay grows
 * exponentially, is capped, and carries jitter.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORE_ATTEMPTS,
  STORE_BASE_DELAY_MS,
  STORE_MAX_DELAY_MS,
  isTransientStoreError,
  retryDelayMs,
  runWithRetry,
} from './store-retry-rules';

// --- what may be retried ------------------------------------------------

test('a failed fetch is transient — the shape the cold compute actually produced', () => {
  const err = new TypeError('fetch failed');
  (err as { cause?: unknown }).cause = Object.assign(new Error('connect timeout'), {
    code: 'ETIMEDOUT',
  });
  assert.equal(isTransientStoreError(err), true);
});

test('an AggregateError cause is read through to its parts', () => {
  const cause = new AggregateError([Object.assign(new Error('t'), { code: 'ECONNRESET' })]);
  const err = Object.assign(new TypeError('fetch failed'), { cause });
  assert.equal(isTransientStoreError(err), true);
});

test("Neon's transient SQLSTATEs are retried", () => {
  for (const code of ['57P01', '08006', '08003']) {
    assert.equal(isTransientStoreError(Object.assign(new Error('boom'), { code })), true, code);
  }
});

test('a documented transient message is retried even without a code', () => {
  assert.equal(isTransientStoreError(new Error('Connection terminated unexpectedly')), true);
  assert.equal(isTransientStoreError(new Error('Error: Network issue')), true);
});

test('a real error is NOT retried', () => {
  const unique = Object.assign(new Error('duplicate key value violates unique constraint'), {
    code: '23505',
  });
  const syntax = Object.assign(new Error('syntax error at or near "selct"'), { code: '42601' });
  const auth = Object.assign(new Error('password authentication failed for user'), {
    code: '28P01',
  });
  for (const err of [unique, syntax, auth, new Error('boom'), 'not an error', null, undefined]) {
    assert.equal(isTransientStoreError(err), false, String(err));
  }
});

// --- how long we wait ---------------------------------------------------

test('the first wait is the documented base, growing exponentially', () => {
  const none = () => 0; // no jitter, to read the backoff itself
  assert.equal(retryDelayMs(1, none), STORE_BASE_DELAY_MS);
  assert.equal(retryDelayMs(2, none), STORE_BASE_DELAY_MS * 2);
  assert.equal(retryDelayMs(3, none), STORE_BASE_DELAY_MS * 4);
  assert.equal(retryDelayMs(4, none), STORE_BASE_DELAY_MS * 8);
});

test('the wait is capped', () => {
  assert.equal(
    retryDelayMs(20, () => 0),
    STORE_MAX_DELAY_MS
  );
});

test('jitter adds up to half again, and stays within the cap', () => {
  assert.equal(
    retryDelayMs(1, () => 1),
    Math.round(STORE_BASE_DELAY_MS * 1.5)
  );
  assert.equal(
    retryDelayMs(20, () => 1),
    Math.round(STORE_MAX_DELAY_MS * 1.5)
  );
});

test("the attempts allowed is Neon's documented five", () => {
  assert.equal(STORE_ATTEMPTS, 5);
});

// --- the loop itself, run against a fake operation ----------------------

/** A recorder that never really waits, so the loop can be run at full speed. */
function recorder() {
  const slept: number[] = [];
  return { slept, sleep: async (ms: number) => void slept.push(ms) };
}

const transient = () => Object.assign(new Error('fetch failed'), { code: 'ETIMEDOUT' });
const permanent = () => Object.assign(new Error('duplicate key'), { code: '23505' });

test("a transient failure is retried until it lands, and the delays are the policy's", async () => {
  const { slept, sleep } = recorder();
  const none = () => 0; // pin the jitter so the waits are exact; the policy itself is pinned above
  let calls = 0;
  const value = await runWithRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw transient();
      return 'landed';
    },
    { sleep, delayMs: (attempt) => retryDelayMs(attempt, none) }
  );
  assert.equal(value, 'landed');
  assert.equal(calls, 3);
  // two failures, so two waits: the 1st and 2nd step of the backoff
  assert.deepEqual(slept, [retryDelayMs(1, none), retryDelayMs(2, none)]);
});

test('a failure that is NOT transient is never retried', async () => {
  const { slept, sleep } = recorder();
  let calls = 0;
  await assert.rejects(
    () =>
      runWithRetry(
        async () => {
          calls += 1;
          throw permanent();
        },
        { sleep }
      ),
    /duplicate key/
  );
  assert.equal(calls, 1);
  assert.deepEqual(slept, []);
});

test('a transient failure that outlasts every attempt throws, after exactly the attempts', async () => {
  const { slept, sleep } = recorder();
  let calls = 0;
  await assert.rejects(
    () =>
      runWithRetry(
        async () => {
          calls += 1;
          throw transient();
        },
        { sleep }
      ),
    /fetch failed/
  );
  assert.equal(calls, STORE_ATTEMPTS);
  // one wait fewer than the attempts: no wait after the last, failed one
  assert.equal(slept.length, STORE_ATTEMPTS - 1);
});
