import test from 'node:test';
import assert from 'node:assert/strict';
import { __resetConfigCacheForTests } from './config';
import { __resetDbCacheForTests } from './db';
import { storeQuery, storeQueryMain } from './store-guard';

const originalFetch = globalThis.fetch;
const MAIN = 'postgresql://user:pass@main.example.invalid/db';
const DEMO = 'postgresql://user:pass@demo.example.invalid/db';

function setEnv() {
  process.env.DATABASE_URL = MAIN;
  process.env.DEMO_DATABASE_URL = DEMO;
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_123';
  process.env.CLERK_SECRET_KEY = 'sk_test_123';
  process.env.SANITY_PROJECT_ID = 'test';
  process.env.SANITY_DATASET = 'test';
  process.env.SANITY_TOKEN = 'test';
  process.env.SESSION_SECRET = '0123456789abcdef';
  __resetConfigCacheForTests();
  __resetDbCacheForTests();
}

function stubFetch(): { connection: string }[] {
  const calls: { connection: string }[] = [];
  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({ connection: headers.get('neon-connection-string') ?? '' });
    return new Response(
      JSON.stringify({ fields: [], rows: [], command: 'SELECT', rowCount: 0, rowAsArray: false }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  };
  return calls;
}

test.beforeEach(() => {
  setEnv();
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('the main door uses the main connection', async () => {
  const calls = stubFetch();

  await storeQueryMain('SELECT 1');

  assert.equal(calls.length, 1);
  assert.match(calls[0].connection, /@main\.example\.invalid/);
  assert.doesNotMatch(calls[0].connection, /@demo\.example\.invalid/);
});

test('the office door with an explicit main space uses main', async () => {
  const calls = stubFetch();

  await storeQuery('SELECT 1', [], { space: 'main' });

  assert.equal(calls.length, 1);
  assert.match(calls[0].connection, /@main\.example\.invalid/);
});

test('the office door with an explicit demo space uses demo', async () => {
  const calls = stubFetch();

  await storeQuery('SELECT 1', [], { space: 'demo' });

  assert.equal(calls.length, 1);
  assert.match(calls[0].connection, /@demo\.example\.invalid/);
  assert.doesNotMatch(calls[0].connection, /@main\.example\.invalid/);
});

test('an unresolved office door refuses instead of falling back to main', async () => {
  let fetched = false;
  globalThis.fetch = async () => {
    fetched = true;
    throw new Error('the unresolved door must not reach a store');
  };

  await assert.rejects(() => storeQuery('SELECT 1'));
  assert.equal(fetched, false);
});
