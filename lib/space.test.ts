import test from 'node:test';
import assert from 'node:assert/strict';
import { spaceFromMetadata, spaceFromUser } from './space-rule';

test('the exact string main is the only main grant', () => {
  assert.equal(spaceFromMetadata({ truespec_space: 'main' }), 'main');
});

test('missing, malformed and unreadable values are demo', () => {
  const demos: unknown[] = [
    undefined,
    null,
    {},
    { truespec_space: undefined },
    { truespec_space: null },
    { truespec_space: true },
    { truespec_space: 1 },
    { truespec_space: 'Main' },
    { truespec_space: 'MAIN' },
    { truespec_space: ' main' },
    { truespec_space: 'main ' },
    { truespec_space: ['main'] },
    { truespec_space: { value: 'main' } },
    'main',
    ['main'],
    42,
    true,
  ];

  for (const metadata of demos) {
    assert.equal(spaceFromMetadata(metadata), 'demo', JSON.stringify(metadata));
  }
});

test('the resolver refuses when there is no signed-in user', () => {
  assert.throws(() => spaceFromUser(null), /No signed-in user/);
  assert.throws(() => spaceFromUser(undefined), /No signed-in user/);
});

test('the resolver applies the exact-main rule to a user', () => {
  assert.equal(spaceFromUser({ publicMetadata: { truespec_space: 'main' } }), 'main');
  assert.equal(spaceFromUser({ publicMetadata: {} }), 'demo');
  assert.equal(spaceFromUser({ publicMetadata: { truespec_space: 'demo' } }), 'demo');
  assert.equal(spaceFromUser({ publicMetadata: { truespec_space: 'true' } }), 'demo');
});
