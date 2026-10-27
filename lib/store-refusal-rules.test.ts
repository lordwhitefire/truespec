/**
 * The words a failed write gets, executable.
 *
 * These pin D32 and DR25: a failed write is named as a failed write, in the action's own voice, and
 * it never claims a safety ("nothing was lost") that was not established. The cause decides which of
 * the two clauses is used, because whether trying again can work depends on it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFailedClause, writeFailedMessage } from './store-refusal-rules';

// --- the two causes, and the two clauses --------------------------------

/** What a dead port or a cold compute actually produces: a failed fetch with the code one level down. */
function unreachable(): TypeError {
  const err = new TypeError('fetch failed');
  (err as { cause?: unknown }).cause = Object.assign(new Error('connect refused'), {
    code: 'ECONNREFUSED',
  });
  return err;
}

test('a store that could not be reached names the cause and invites a retry', () => {
  const clause = writeFailedClause(unreachable());
  assert.match(clause, /store could not be reached/);
  assert.match(clause, /Try again/);
});

test('a store that refused the change does not invite a retry that cannot work', () => {
  const clause = writeFailedClause(Object.assign(new Error('duplicate key'), { code: '23505' }));
  assert.match(clause, /store refused that change/);
  assert.doesNotMatch(clause, /Try again/);
});

test('a syntax error is a refusal, not an unreachable store', () => {
  assert.equal(
    writeFailedClause(new Error('syntax error at or near "SELEC"')),
    writeFailedClause(Object.assign(new Error('boom'), { code: '42601' }))
  );
  assert.doesNotMatch(writeFailedClause(new Error('syntax error')), /could not be reached/);
});

// --- the action's own voice ----------------------------------------------

test('the message names what could not be done, and why, in one sentence', () => {
  assert.equal(
    writeFailedMessage('That car could not be deleted', unreachable()),
    'That car could not be deleted — the store could not be reached. Try again.'
  );
});

test("the action's own phrase is kept verbatim — the store does not get to reword it", () => {
  const phrase = 'That change could not be saved';
  assert.ok(writeFailedMessage(phrase, unreachable()).startsWith(phrase));
  assert.ok(
    writeFailedMessage(phrase, Object.assign(new Error('x'), { code: '23505' })).startsWith(phrase)
  );
});

// --- DR25: no unverified reassurance ------------------------------------

test('no failure message ever claims nothing was lost (DR25)', () => {
  const causes = [
    unreachable(),
    Object.assign(new Error('duplicate'), { code: '23505' }),
    new Error('boom'),
  ];
  for (const cause of causes) {
    const message = writeFailedMessage('That car could not be deleted', cause);
    assert.doesNotMatch(message, /nothing was lost/i);
    assert.doesNotMatch(message, /nothing was saved/i);
  }
});

test('one word does not cover two causes — the two clauses differ', () => {
  assert.notEqual(
    writeFailedClause(unreachable()),
    writeFailedClause(Object.assign(new Error('duplicate'), { code: '23505' }))
  );
});
