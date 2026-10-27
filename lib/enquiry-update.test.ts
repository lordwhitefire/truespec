/**
 * Editing a saved enquiry, executable at the text level.
 *
 * The claims, without a store: the write moves **all five** editable details plus the change-check
 * and nothing else; a repeat of the same details writes nothing at all and still reports the row;
 * and the statement can say whether it moved the row, so the screen (and, later, the log) can tell
 * a save from a retry.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { enquiryUpdateStatement } from './enquiry-update';

const ID = '11111111-1111-1111-1111-111111111111';
const STATE = '22222222-2222-2222-2222-222222222222';

const update = () =>
  enquiryUpdateStatement({
    id: ID,
    seed: {
      name: 'Ada Obi',
      number: '+2348000000001',
      asked_for: 'a small saloon',
      note: null,
    },
    stateId: STATE,
    contentHash: 'abc123',
    hashVersion: 1,
    actorId: '33333333-3333-3333-3333-333333333333',
  });

test('the write moves the five editable details, the hash and the version — and nothing else', () => {
  const { text, params } = update();

  assert.match(text, /UPDATE enquiry\b/);
  for (const column of ['name', 'number', 'asked_for', 'note', 'enquiry_state_id']) {
    assert.match(text, new RegExp(`${column}\\s*=`), `the write must set ${column}`);
  }
  assert.match(text, /content_hash = \$7/);
  assert.match(text, /hash_version = \$8/);
  assert.match(text, /updated_at = now\(\)/);
  assert.deepEqual(params, [
    ID,
    'Ada Obi',
    '+2348000000001',
    'a small saloon',
    null,
    STATE,
    'abc123',
    1,
    '33333333-3333-3333-3333-333333333333',
  ]);
});

test('a repeat of the same details is a true no-op, and still reports the row', () => {
  const { text } = update();

  // Every editable value is compared with the stored one; `IS DISTINCT FROM` makes a null note and
  // an empty note the same detail.
  for (const gate of [
    'o.name IS DISTINCT FROM $2::text',
    'o.number IS DISTINCT FROM $3::text',
    'o.asked_for IS DISTINCT FROM $4::text',
    'o.note IS DISTINCT FROM $5::text',
    'o.enquiry_state_id IS DISTINCT FROM $6::uuid',
  ]) {
    assert.ok(text.includes(gate), `${gate} must be present`);
  }
  assert.match(text, /WHERE id = \$1::uuid AND \(SELECT yes FROM changed\)/);
  // The trailing arm is what lets a retry — a reply that was lost — say the row is there.
  assert.match(text, /COALESCE\(\(SELECT id FROM upd\), \(SELECT id FROM old\)\) AS id/);
});

test('the statement reports whether the row changed', () => {
  const { text } = update();
  // `upd` has a row only when the gate opened; this is the same fact the screen needs to say
  // "Nothing changed" rather than claim a save.
  assert.match(text, /SELECT EXISTS \(SELECT 1 FROM upd\) AS changed/);
});

test('only a real change names the enquiry in the log, by its code', () => {
  const { text } = update();
  const event = text.slice(
    text.indexOf('INSERT INTO activity_event'),
    text.indexOf('SELECT EXISTS')
  );

  assert.match(event, /'enquiry\.updated', u\.ref, \$9::uuid/);
  assert.match(event, /FROM upd u/);
  assert.doesNotMatch(event, /\b(name|number|asked_for|note)\b/);
  assert.doesNotMatch(event, /\bcar\b/);
});

test("identity is left alone, the hash is the server's, and nothing here touches a car", () => {
  const { text } = update();
  const setClause = text.slice(text.indexOf('SET name'), text.indexOf('WHERE id = $1::uuid AND'));

  // Truth 14: `id` is never written; the store's trigger would refuse it if it were.
  assert.doesNotMatch(setClause, /(^|[^_\w])id\s*=/, 'identity is not an editable value');
  assert.doesNotMatch(setClause, /\bref\s*=/, "the ref is the store's");
  assert.doesNotMatch(setClause, /\bhandle\s*=/, 'the WhatsApp key is set elsewhere');
  assert.doesNotMatch(setClause, /\bis_demo\s*=/, 'the demonstration marker is not editable');
  assert.doesNotMatch(text, /\bcar\b/, "an enquiry's details say nothing about any car");
  // One event, fed by the update itself — not a second write the action could forget on a retry.
  assert.equal(text.match(/INSERT INTO activity_event/g)?.length, 1);
});
