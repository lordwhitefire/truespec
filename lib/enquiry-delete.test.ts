/**
 * Deleting an enquiry, executable at the text level.
 *
 * The claims, without a store: one statement deletes the row and writes one `enquiry.deleted` event;
 * the shared sheet is removed only when this was its last enquiry and no waiting draft still points
 * at the asset; a repeat finds nothing and writes nothing; taps are never touched.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { enquiryDeleteStatement } from './enquiry-delete';

const args = {
  id: '11111111-1111-1111-1111-111111111111',
  actorId: '22222222-2222-2222-2222-222222222222',
};

const statement = () => enquiryDeleteStatement(args);

test('one statement deletes the enquiry and names it in the log by its ENQ-####', () => {
  const { text } = statement();

  assert.equal(text.match(/DELETE FROM enquiry\b/g)?.length, 1);
  assert.match(text, /DELETE FROM enquiry\s+WHERE id = \$1/);
  assert.match(text, /RETURNING id, ref, pdf_import_id/);
  assert.equal(text.match(/INSERT INTO activity_event/g)?.length, 1);
  assert.match(text, /INSERT INTO activity_event \(kind, subject, actor_id\)/);
  assert.match(text, /SELECT 'enquiry\.deleted', ref, \$2::uuid FROM del/);
});

test('the event can only come from the row this statement deleted', () => {
  const { text } = statement();

  // No `del` row, no event. A repeat therefore writes no second event and no second activity.
  assert.match(text, /FROM del\s+RETURNING 1/);
  assert.match(text, /WHERE EXISTS \(SELECT 1 FROM del\)/);
});

test('the shared PDF is counted from the snapshot, excluding the target by id', () => {
  const { text } = statement();

  // A data-modifying CTE's DELETE is not visible to a sibling SELECT. The count must exclude the
  // target explicitly; otherwise every delete would think the deleted enquiry still uses the file.
  assert.match(text, /e\.id <> \$1 AND e\.pdf_import_id = p\.id/);
  assert.match(text, /dr\.source_asset_id = p\.sanity_asset_id/);
});

test('the PDF row is deleted only when it is litter', () => {
  const { text } = statement();

  assert.match(
    text,
    /SELECT p\.id, p\.sanity_asset_id\s+FROM enquiry_pdf p\s+JOIN del d ON d\.pdf_import_id = p\.id/
  );
  assert.equal(text.match(/NOT EXISTS/g)?.length, 2);
  assert.match(text, /DELETE FROM enquiry_pdf p\s+USING pdf\s+WHERE p\.id = pdf\.id/);
  assert.match(text, /RETURNING p\.sanity_asset_id/);
});

test('it returns the code, the old link, and the asset only when the row went', () => {
  const { text } = statement();

  assert.match(text, /\(SELECT ref FROM del\) AS ref/);
  assert.match(text, /\(SELECT pdf_import_id FROM del\) AS pdf_import_id/);
  assert.match(text, /\(SELECT sanity_asset_id FROM pdf_del\) AS asset_id/);
});

test('taps are page/car counts with no enquiry link, and are not touched', () => {
  const { text } = statement();

  assert.doesNotMatch(text, /\btap\b/);
});

test('it binds exactly the id and the actor', () => {
  assert.deepEqual(statement().params, [args.id, args.actorId]);
});
