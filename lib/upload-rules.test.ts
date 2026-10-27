/**
 * The upload's small rules, executable: a held file's name, the owner's own name, and the ceiling.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  UPLOAD_FOLDER,
  UPLOAD_MAX_BYTES,
  UPLOAD_MAX_MB,
  checkUploadSize,
  heldFilename,
  sourceFilename,
} from './upload-rules';

test("a held file is named by a uuid — nothing of the owner's name reaches the store", () => {
  const name = heldFilename('0e0f0a1b-2c3d-4e5f-8a9b-0c1d2e3f4a5b');
  assert.equal(name, `${UPLOAD_FOLDER}/0e0f0a1b-2c3d-4e5f-8a9b-0c1d2e3f4a5b.pdf`);
  assert.ok(!name.includes('template'), "the owner's own name is never in the held name");
});

test("the owner's name for his file is kept as he gave it: trimmed, bounded, never empty", () => {
  assert.equal(sourceFilename('  cars august.pdf  '), 'cars august.pdf');
  assert.equal(sourceFilename('cars.pdf'), 'cars.pdf');
  assert.equal(sourceFilename(''), 'car-template.pdf');
  assert.equal(sourceFilename(null), 'car-template.pdf');
  assert.equal(sourceFilename(undefined), 'car-template.pdf');
  assert.equal(sourceFilename('   '), 'car-template.pdf');
  assert.equal(sourceFilename('x'.repeat(500)).length, 200);
});

test('a file is within size to be read, or refused with a reason', () => {
  assert.deepEqual(checkUploadSize(1024), { ok: true });
  assert.deepEqual(checkUploadSize(UPLOAD_MAX_BYTES), { ok: true });

  const empty = checkUploadSize(0);
  assert.equal(empty.ok, false);
  const huge = checkUploadSize(UPLOAD_MAX_BYTES + 1);
  assert.equal(huge.ok, false);
  if (!huge.ok) assert.match(huge.reason, new RegExp(String(UPLOAD_MAX_MB)));
});
