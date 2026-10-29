import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const middleware = readFileSync(new URL('./middleware.ts', import.meta.url), 'utf8');

test('middleware matcher only covers office routes', () => {
  assert.ok(middleware.includes('matcher: ["/office(.*)"]'));
});

test('middleware matcher does not cover public routes', () => {
  assert.ok(!middleware.includes('"/"'));
  assert.ok(!middleware.includes('/inventory'));
  assert.ok(!middleware.includes('/car'));
  assert.ok(!middleware.includes('/privacy'));
  assert.ok(!middleware.includes('/terms'));
});

test('middleware matcher does not cover API routes', () => {
  assert.ok(!middleware.includes('/api'));
  assert.ok(!middleware.includes('/trpc'));
});
