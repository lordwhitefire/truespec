/**
 * Giving an enquiry a state, executable at the text level.
 *
 * Task 16's testable claims, without a store: the row read for the change-check names **exactly** the
 * recipe's ingredients (so the hash the server computes is over the values the store holds and
 * nothing else); the write moves the state, the hash and the version and **no other detail** — the
 * name, the number, what was asked for and the note are the imported sheet's, not this write's; a
 * repeat of the same state writes nothing at all; and the write touches no car, because an enquiry
 * state and a car state are separate decisions (truth 13).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ENQUIRY_RECIPE } from './change-check';
import { enquiryEditableStatement, enquirySetStateStatement } from './enquiry-set-state';

const ID = '11111111-1111-1111-1111-111111111111';
const STATE = '22222222-2222-2222-2222-222222222222';
const ACTOR = '33333333-3333-3333-3333-333333333333';

const set = () =>
  enquirySetStateStatement({
    id: ID,
    stateId: STATE,
    contentHash: 'abc123',
    hashVersion: 1,
    actorId: ACTOR,
  });

test("the row read is exactly the change-check's ingredients, and nothing more", () => {
  const { text, params } = enquiryEditableStatement({ id: ID });
  const select = text.slice(text.indexOf('SELECT') + 6, text.indexOf('FROM'));

  for (const field of ENQUIRY_RECIPE) {
    assert.match(select, new RegExp(`\\b${field.name}\\b`), `the read must select ${field.name}`);
  }

  // The columns are the recipe's and no others: identity and provenance are not ingredients.
  assert.doesNotMatch(select, /\bid\b|\bhandle\b|\bis_demo\b|\bcreated_at\b/);
  assert.deepEqual(params, [ID]);
});

test('the write moves the state, the hash and the version — and no other detail', () => {
  const { text, params } = set();

  assert.match(text, /UPDATE enquiry\b/);
  assert.match(text, /enquiry_state_id = \$2::uuid/);
  assert.match(text, /content_hash = \$3, hash_version = \$4/);
  assert.match(text, /updated_at = now\(\)/);
  assert.deepEqual(params, [ID, STATE, 'abc123', 1, ACTOR]);

  // The imported details are not this write's to touch (Tasks 23–24 own them).
  for (const column of ['name', 'number', 'asked_for', 'note']) {
    assert.doesNotMatch(text, new RegExp(`${column}\\s*=`), `the write must not set ${column}`);
  }
});

test('a repeat of the same state is a true no-op, and still reports the row', () => {
  const { text } = set();
  assert.match(text, /o\.enquiry_state_id IS DISTINCT FROM \$2::uuid/);
  assert.match(text, /WHERE id = \$1::uuid AND \(SELECT yes FROM changed\)/);
  // The trailing arm is what lets a retry — a reply that was lost — say the row is there.
  assert.match(
    text,
    /SELECT id, ref FROM enquiry\s+WHERE id = \$1::uuid AND NOT EXISTS \(SELECT 1 FROM upd\)/
  );
});

test('the identity is left alone, and nothing here touches a car', () => {
  const { text } = set();
  const setClause = text.slice(
    text.indexOf('SET enquiry_state_id'),
    text.indexOf('WHERE id = $1::uuid AND')
  );

  // Truth 14: `id` is never written; the store's trigger would refuse it if it were.
  assert.doesNotMatch(setClause, /(^|[^_\w])id\s*=/, 'identity is not an editable value');
  assert.doesNotMatch(setClause, /\bref\s*=/, "the ref is the store's");
  assert.doesNotMatch(text, /\bcar\b/, "an enquiry's state says nothing about any car");
});

test('only a real state change logs one event, and it names the code', () => {
  const { text } = set();
  const event = text.slice(
    text.indexOf('INSERT INTO activity_event'),
    text.indexOf('SELECT id, ref FROM upd')
  );

  assert.equal(text.match(/INSERT INTO activity_event/g)?.length, 1);
  assert.match(event, /'enquiry\.updated', u\.ref, \$5::uuid/);
  assert.match(event, /FROM upd u/);
  assert.doesNotMatch(event, /\b(name|number|asked_for|note)\b/);
});
