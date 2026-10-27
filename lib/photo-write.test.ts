import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PHOTO_MAX_BYTES, checkPhotoSize, isAssetRef, isPhotoType } from './photo-rules';
import { preparePhoto } from './photos';

// The photo *write* boundary (truth 7): the cap, the type check, the reference check, and the strip
// that takes metadata out of the bytes on their way in.
//
// Separate from `lib/photos.test.ts`, which is not about these rules at all — it pins the *read*
// side, the one derivation from a stored asset id to the address the browser fetches
// (`serialize.resolvePhotoUrl`). Two boundaries, two files, so a change to one cannot quietly
// rewrite the proof of the other.
//
// These tests build their own bytes, so they pin the exact behaviour on real structures: a JPEG's
// marker walk, a PNG's chunks, a WebP's RIFF size.

// ---------------------------------------------------------------- fixtures ---

function jpegSegment(marker: number, payload: Buffer): Buffer {
  const head = Buffer.alloc(4);
  head[0] = 0xff;
  head[1] = marker;
  head.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([head, payload]);
}

function jpeg(extra: Buffer[] = []): Buffer {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]), // SOI
    jpegSegment(0xe0, Buffer.concat([Buffer.from('JFIF\0', 'latin1'), Buffer.alloc(9, 1)])), // APP0
    ...extra,
    jpegSegment(0xda, Buffer.from([0x01, 0x01, 0x00, 0x00, 0x3f, 0x00])), // SOS
    Buffer.from([0x12, 0x34, 0xff, 0x00, 0x56, 0x78]), // scan data, with a stuffed 0xff 0x00
    Buffer.from([0xff, 0xd9]), // EOI
  ]);
}

const exifApp1 = () =>
  jpegSegment(
    0xe1,
    Buffer.concat([
      Buffer.from('Exif\0\0', 'latin1'),
      Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0, 0, 0, 0x11, 0x22]),
    ])
  );

const xmpApp1 = () =>
  jpegSegment(
    0xe1,
    Buffer.concat([
      Buffer.from('http://ns.adobe.com/xap/1.0/\0', 'latin1'),
      Buffer.from('<x:xmpmeta/>', 'latin1'),
    ])
  );

function pngChunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  return Buffer.concat([head, data, Buffer.alloc(4)]); // the walk does not read the crc
}

function png(withExif: boolean): Buffer {
  const parts = [
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', Buffer.alloc(13, 1)),
  ];
  if (withExif) parts.push(pngChunk('eXIf', Buffer.from('MM\0\0', 'latin1')));
  parts.push(pngChunk('IDAT', Buffer.from([0x78, 0x9c, 0x01, 0x00])));
  parts.push(pngChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

function riffChunk(fourcc: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.write(fourcc, 0, 'latin1');
  head.writeUInt32LE(data.length, 4);
  return Buffer.concat([head, data, data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
}

function webp(withMetadata: boolean): Buffer {
  const parts = [riffChunk('VP8 ', Buffer.from([1, 2, 3, 4]))];
  if (withMetadata) {
    parts.push(riffChunk('EXIF', Buffer.from('MM\0\0', 'latin1')));
    parts.push(riffChunk('XMP ', Buffer.from([0x43]))); // odd length: the pad byte matters
  }
  const body = Buffer.concat(parts);
  const head = Buffer.alloc(12);
  head.write('RIFF', 0, 'latin1');
  head.writeUInt32LE(body.length + 4, 4);
  head.write('WEBP', 8, 'latin1');
  return Buffer.concat([head, body]);
}

// ------------------------------------------------------------------- rules ---

test('a reference is a reference and a web address never is', () => {
  assert.equal(isAssetRef('image-2f9c1f0a1b-1200x800-jpg'), true);
  assert.equal(isAssetRef('image-abc123-320x240-png'), true);
  // the shapes that must not pass: a URL, an empty string, and the other asset kind
  assert.equal(isAssetRef('https://cdn.sanity.io/images/p/d/abc-1200x800.jpg'), false);
  assert.equal(isAssetRef('http://images.unsplash.com/photo-123?w=300'), false);
  assert.equal(isAssetRef(''), false);
  assert.equal(isAssetRef('file-abc123-pdf'), false);
});

test('only the three photo types the office stores are accepted', () => {
  assert.equal(isPhotoType('image/jpeg'), true);
  assert.equal(isPhotoType('image/png'), true);
  assert.equal(isPhotoType('image/webp'), true);
  assert.equal(isPhotoType('image/gif'), false);
  assert.equal(isPhotoType('application/pdf'), false);
  assert.equal(isPhotoType(''), false);
});

test('the cap is 15 MB, and one byte over is refused with the size said out loud', () => {
  assert.equal(PHOTO_MAX_BYTES, 15 * 1024 * 1024);
  assert.deepEqual(checkPhotoSize(PHOTO_MAX_BYTES), { ok: true });
  const over = checkPhotoSize(PHOTO_MAX_BYTES + 1);
  assert.equal(over.ok, false);
  assert.match(over.ok === false ? over.reason : '', /bigger than the 15\.0 MB cap/);
  // an empty file is not a photo either
  assert.equal(checkPhotoSize(0).ok, false);
});

test('an oversized original is refused before anything is stripped or stored', () => {
  const declared = preparePhoto(Buffer.alloc(PHOTO_MAX_BYTES + 1, 0xff), 'image/jpeg');
  assert.equal(declared.ok, false);
  assert.match(declared.ok === false ? declared.reason : '', /15\.0 MB cap/);
});

test('a file that is not one of the stored photo types is refused', () => {
  const refused = preparePhoto(jpeg(), 'image/gif');
  assert.equal(refused.ok, false);
  assert.match(refused.ok === false ? refused.reason : '', /JPEG, a PNG or a WebP/);
});

test("a JPEG's Exif segment is gone and its image data is untouched", () => {
  const withExif = jpeg([exifApp1()]);
  const out = preparePhoto(withExif, 'image/jpeg');
  assert.equal(out.ok, true);
  if (!out.ok) return;
  assert.equal(out.stripped, true);
  assert.ok(!out.bytes.toString('latin1').includes('Exif'), 'the Exif segment survived');
  assert.ok(out.bytes.toString('latin1').includes('JFIF'), 'the JFIF segment was lost');
  // the dropped segment was FF E1 + its 2-byte length + payload (2 + 2 + 6 + 10 bytes)
  assert.equal(out.bytes.length, withExif.length - exifApp1().length);
  // the scan — including its stuffed 0xff 0x00 — and the end marker are copied verbatim
  const tail = withExif.subarray(-8);
  assert.deepEqual(out.bytes.subarray(-8), tail);
  // and the head still starts with SOI
  assert.deepEqual(out.bytes.subarray(0, 2), Buffer.from([0xff, 0xd8]));
});

test('XMP goes with the Exif — it carries the same location under another name', () => {
  const out = preparePhoto(jpeg([xmpApp1()]), 'image/jpeg');
  assert.equal(out.ok, true);
  if (!out.ok) return;
  assert.equal(out.stripped, true);
  assert.ok(!out.bytes.toString('latin1').includes('xap/1.0'), 'the XMP segment survived');
});

test('a clean JPEG comes back byte-for-byte identical — the strip is not a re-encode', () => {
  const clean = jpeg();
  const out = preparePhoto(clean, 'image/jpeg');
  assert.equal(out.ok, true);
  if (!out.ok) return;
  assert.equal(out.stripped, false);
  assert.deepEqual(out.bytes, clean);
});

test('a JPEG whose structure cannot be read is refused, not mangled', () => {
  const truncated = jpeg([exifApp1()]).subarray(0, 10); // a marker claims more bytes than there are
  const out = preparePhoto(truncated, 'image/jpeg');
  assert.equal(out.ok, false);
  assert.match(out.ok === false ? out.reason : '', /Nothing was stored/);
  const notAnImage = preparePhoto(Buffer.from('hello there'), 'image/jpeg');
  assert.equal(notAnImage.ok, false);
});

test("a PNG's eXIf chunk is gone and its other chunks are kept", () => {
  const withExif = png(true);
  const out = preparePhoto(withExif, 'image/png');
  assert.equal(out.ok, true);
  if (!out.ok) return;
  assert.equal(out.stripped, true);
  const text = out.bytes.toString('latin1');
  assert.ok(!text.includes('eXIf'), 'the eXIf chunk survived');
  assert.ok(text.includes('IHDR') && text.includes('IDAT') && text.includes('IEND'));
  assert.deepEqual(out.bytes.subarray(0, 8), withExif.subarray(0, 8));
  // and a clean PNG is passed through untouched
  const clean = png(false);
  const kept = preparePhoto(clean, 'image/png');
  assert.equal(kept.ok, true);
  if (kept.ok) assert.deepEqual(kept.bytes, clean);
});

test("a WebP's metadata chunks are gone and the RIFF size is rewritten to the truth", () => {
  const withMetadata = webp(true);
  const out = preparePhoto(withMetadata, 'image/webp');
  assert.equal(out.ok, true);
  if (!out.ok) return;
  assert.equal(out.stripped, true);
  const text = out.bytes.toString('latin1');
  assert.ok(!text.includes('EXIF'), 'the EXIF chunk survived');
  assert.ok(!text.includes('XMP '), 'the XMP chunk survived');
  assert.ok(text.includes('VP8 '), 'the image chunk was lost');
  assert.equal(out.bytes.subarray(0, 4).toString('latin1'), 'RIFF');
  assert.equal(
    out.bytes.readUInt32LE(4),
    out.bytes.length - 8,
    'the RIFF size no longer matches the file'
  );
  // and a clean WebP is passed through untouched
  const clean = webp(false);
  const kept = preparePhoto(clean, 'image/webp');
  assert.equal(kept.ok, true);
  if (kept.ok) assert.deepEqual(kept.bytes, clean);
});
