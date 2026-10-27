import test from 'node:test';
import assert from 'node:assert/strict';
import { scrub } from './error-tracking';

test('scrub removes sensitive keys', () => {
  const input = {
    name: 'TrueSpec',
    password: 'hunter2',
    secret_key: 'sk-1234',
    email: 'umar@example.com',
    phone: '+2348146927170',
    card: '4111-1111-1111-1111',
    amount: 5000,
    safe: 'public',
  };
  const out = scrub(input) as Record<string, unknown>;
  assert.strictEqual(out.name, 'TrueSpec');
  assert.strictEqual(out.safe, 'public');
  assert.strictEqual(out.password, '[redacted]');
  assert.strictEqual(out.secret_key, '[redacted]');
  assert.strictEqual(out.email, '[redacted]');
  assert.strictEqual(out.phone, '[redacted]');
  assert.strictEqual(out.card, '[redacted]');
  assert.strictEqual(out.amount, '[redacted]');
});

test('scrub walks nested objects and arrays', () => {
  const input = {
    user: { email: 'a@b.c', phone: '+1234567890' },
    items: [{ cost: 100 }, { price: 200 }],
  };
  const out = scrub(input) as Record<string, unknown>;
  assert.strictEqual((out.user as Record<string, unknown>).email, '[redacted]');
  assert.strictEqual((out.user as Record<string, unknown>).phone, '[redacted]');
  assert.strictEqual(((out.items as unknown[])[0] as Record<string, unknown>).cost, '[redacted]');
  assert.strictEqual(((out.items as unknown[])[1] as Record<string, unknown>).price, '[redacted]');
});

test('scrub returns primitives unchanged', () => {
  assert.strictEqual(scrub('hello'), 'hello');
  assert.strictEqual(scrub(42), 42);
  assert.strictEqual(scrub(null), null);
  assert.deepStrictEqual(scrub([1, 'two', { secret: 'x' }]), [1, 'two', { secret: '[redacted]' }]);
});
