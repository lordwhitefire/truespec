import test from 'node:test';
import assert from 'node:assert/strict';
import { ConfigError, __resetConfigCacheForTests } from './config';
import { __resetDbCacheForTests, demoDb, mainDb } from './db';

const BASE_ENV = {
  DATABASE_URL: 'postgresql://user:pass@main.example.invalid/db',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_123',
  CLERK_SECRET_KEY: 'sk_test_123',
  SANITY_PROJECT_ID: 'test',
  SANITY_DATASET: 'test',
  SANITY_TOKEN: 'test',
  SESSION_SECRET: '0123456789abcdef',
};

function setEnv(overrides: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries({ ...BASE_ENV, ...overrides })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  __resetConfigCacheForTests();
  __resetDbCacheForTests();
}

test.beforeEach(() => {
  setEnv({ DEMO_DATABASE_URL: 'postgresql://user:pass@demo.example.invalid/db' });
});

test('main and demo are two different clients', () => {
  assert.notEqual(demoDb(), mainDb());
});

test('a missing demo URL is a configuration error, not main', () => {
  setEnv({ DEMO_DATABASE_URL: undefined });

  assert.throws(
    () => demoDb(),
    (error) => error instanceof ConfigError && /DEMO_DATABASE_URL is missing/.test(error.message)
  );
  assert.doesNotThrow(() => mainDb());
});

test('an invalid demo URL is a configuration error', () => {
  for (const value of ['', 'not-a-url', 'https://example.invalid/db', 'postgresql:///db']) {
    setEnv({ DEMO_DATABASE_URL: value });
    assert.throws(() => demoDb(), ConfigError, JSON.stringify(value));
  }
});

test('main-only configuration does not require the demo URL', () => {
  setEnv({ DEMO_DATABASE_URL: undefined });
  assert.doesNotThrow(() => mainDb());
});
