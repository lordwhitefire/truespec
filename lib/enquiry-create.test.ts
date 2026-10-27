/**
 * Creating an enquiry from a saved draft, executable at the text level (P7).
 *
 * The claims, without a store: the insert is retry-safe and returns the `ENQ-####` the column's
 * default minted; the imported sheet is found or created in the same statement and linked by
 * `pdf_import_id`; one `enquiry.created` event names that code and the actor, and only the arm that
 * actually inserted feeds it; and no customer detail reaches the log.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { enquiryCreateStatement, type EnquiryCreateArgs } from './enquiry-create';

const args: EnquiryCreateArgs = {
  id: '11111111-1111-1111-1111-111111111111',
  seed: {
    name: 'Ada Obi',
    number: '+2348000000001',
    asked_for: 'a small saloon',
    note: 'call after six',
  },
  stateId: '22222222-2222-2222-2222-222222222222',
  contentHash: 'abc123',
  hashVersion: 1,
  actorId: '33333333-3333-3333-3333-333333333333',
};

const create = (overrides: Partial<EnquiryCreateArgs> = {}) =>
  enquiryCreateStatement({ ...args, ...overrides });

test('the insert is a draft becoming a record, keyed by the caller so a retry is the same insert', () => {
  const { text, params } = create();

  assert.match(text, /INSERT INTO enquiry\b/);
  assert.match(
    text,
    /SELECT \$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, true, \(SELECT id FROM pdf_row\)/
  );
  assert.match(text, /ON CONFLICT \(id\) DO NOTHING/);
  assert.match(text, /RETURNING id, ref/);
  assert.deepEqual(params, [
    args.id,
    'Ada Obi',
    '+2348000000001',
    'a small saloon',
    'call after six',
    args.stateId,
    'abc123',
    1,
    args.actorId,
    null,
    null,
    null,
  ]);
});

test('one event names the code, never the customer, and only the insert feeds it', () => {
  const { text } = create();
  const event = text.slice(
    text.indexOf('INSERT INTO activity_event'),
    text.indexOf('SELECT ref, true')
  );

  assert.equal(text.match(/INSERT INTO activity_event/g)?.length, 1);
  assert.match(event, /'enquiry\.created', ne\.ref, \$9::uuid/);
  assert.match(event, /FROM new_enquiry ne/);
  assert.doesNotMatch(event, /\b(name|number|asked_for|note)\b/);
});

test('the statement says whether this call made the enquiry', () => {
  const { text } = create();

  assert.match(text, /SELECT ref, true AS changed FROM new_enquiry/);
  // A repeat finds the row already committed and answers `false`; the guard keeps the two arms
  // from ever both answering.
  assert.match(
    text,
    /SELECT ref, false AS changed FROM enquiry\s+WHERE id = \$1 AND NOT EXISTS \(SELECT 1 FROM new_enquiry\)/
  );
});

test('the imported sheet is found or created once, in the same statement, and linked', () => {
  const { text, params } = create({
    pdf: {
      sourceAssetId: 'image-abc123pdf',
      sourceFilename: 'october-enquiries.pdf',
      rowsTotal: 16,
    },
  });

  assert.equal(text.match(/INSERT INTO enquiry_pdf/g)?.length, 1);
  assert.match(text, /INSERT INTO enquiry_pdf \(sanity_asset_id, filename, rows_total\)/);
  assert.match(text, /ON CONFLICT \(sanity_asset_id\) DO UPDATE/);
  assert.match(text, /SET sanity_asset_id = EXCLUDED\.sanity_asset_id/);
  assert.match(text, /pdf_import_id/);
  assert.match(text, /\(SELECT id FROM pdf_row\)/);
  assert.deepEqual(params.slice(9), ['image-abc123pdf', 'october-enquiries.pdf', 16]);
});

test('without a sheet, no PDF row is written and the link is null', () => {
  const { text, params } = create();

  assert.match(text, /WHERE \$10::text IS NOT NULL/);
  assert.equal(params[9], null);
  assert.equal(params[10], null);
  assert.equal(params[11], null);
});

test('a retry cannot create a second PDF row for an enquiry that already exists', () => {
  const { text } = create({
    pdf: {
      sourceAssetId: 'image-abc123pdf',
      sourceFilename: 'october-enquiries.pdf',
      rowsTotal: 16,
    },
  });

  // The insert is guarded by the enquiry's own id, so the only way it runs is the first save.
  assert.match(text, /AND NOT EXISTS \(SELECT 1 FROM enquiry WHERE id = \$1\)/);
});

test("identity and provenance are the store's, and nothing here sets the code by hand", () => {
  const { text } = create();
  const insert = text.slice(
    text.indexOf('INSERT INTO enquiry ('),
    text.indexOf('ON CONFLICT (id)')
  );

  assert.match(insert, /is_demo, pdf_import_id/);
  assert.match(text, /true, \(SELECT id FROM pdf_row\)/);
  assert.doesNotMatch(insert, /\bref\s*=/);
  assert.doesNotMatch(insert, /\bhandle\b/);
  assert.doesNotMatch(text, /activity_event[\s\S]*\bcar\b/);
});
