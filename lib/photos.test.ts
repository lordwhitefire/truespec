/**
 * The photo address on the public path — the one derivation from a stored Sanity
 * asset id to what the browser actually fetches.
 *
 * Pinned because it fails silently: a wrong derivation renders a broken image,
 * not an error, so nothing else in the suite would notice. The store holds the
 * asset id (`image-<hash>-<w>x<h>-<ext>`), which is *not* the CDN path — the
 * address drops the `image-` prefix and turns the last dash into a dot.
 * Measured 2026-10-13: the id pasted straight into the path returns 400 from the
 * CDN; the derived address returns 200 image/jpeg at original dimensions.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePhotoUrl } from './serialize';
import { carGallerySrcSet, sizedPhotoUrl } from './photo-url';

const PROJECT = 'c2lc8g8n';
const DATASET = 'production';
const ASSET = 'image-9ed666f5cc50a9301971efa642aa339408ed297a-1200x800-jpg';

test('a stored asset id is derived into the CDN address, not concatenated', () => {
  const url = resolvePhotoUrl(ASSET, PROJECT, DATASET);
  assert.equal(
    url,
    `https://cdn.sanity.io/images/${PROJECT}/${DATASET}/9ed666f5cc50a9301971efa642aa339408ed297a-1200x800.jpg`
  );
  // The two things a naive concatenation gets wrong:
  assert.ok(!url.includes('image-'), `asset-id prefix survived: ${url}`);
  assert.ok(url.endsWith('.jpg'), `extension is not a dot: ${url}`);
});

test('no derivative parameters are added — the asset is served as it is', () => {
  // A width, quality, crop or format parameter in the address would be a
  // derivative, and v1 builds none (specs/media).
  const url = resolvePhotoUrl(ASSET, PROJECT, DATASET);
  assert.ok(!url.includes('?'), `address carries parameters: ${url}`);
});

test('a display-size derivative names its slot, crops and asks for a modern format', () => {
  const url = resolvePhotoUrl(ASSET, PROJECT, DATASET);
  const sized = new URL(sizedPhotoUrl(url, 800, 800));
  assert.equal(sized.searchParams.get('w'), '800');
  assert.equal(sized.searchParams.get('h'), '800');
  assert.equal(sized.searchParams.get('fit'), 'crop');
  assert.equal(sized.searchParams.get('auto'), 'format');
  assert.equal(sized.searchParams.get('q'), '75');
  // The original asset is untouched.
  assert.ok(url.endsWith('-1200x800.jpg'));
});

test('sizedPhotoUrl leaves a non-Sanity address alone', () => {
  const other = 'https://example.com/photo.jpg';
  assert.equal(sizedPhotoUrl(other, 800, 800), other);
});

test('the car gallery offers display-width candidates, not the original', () => {
  const url = resolvePhotoUrl(ASSET, PROJECT, DATASET);
  const entries = carGallerySrcSet(url)
    .split(', ')
    .map((entry) => {
      const [address, descriptor] = entry.split(' ');
      const sized = new URL(address);
      return {
        width: Number(sized.searchParams.get('w')),
        height: Number(sized.searchParams.get('h')),
        fit: sized.searchParams.get('fit'),
        descriptor,
      };
    });

  assert.deepEqual(
    entries.map((e) => e.width),
    [640, 960, 1440]
  );
  assert.deepEqual(
    entries.map((e) => e.height),
    [384, 576, 864]
  );
  assert.deepEqual(
    entries.map((e) => e.descriptor),
    ['640w', '960w', '1440w']
  );
  assert.ok(entries.every((e) => e.fit === 'crop'));
});

test('anything that is not an asset reference is refused, never passed through', () => {
  // The address branch is gone (Task 18, after the rebuild-from-nothing left the store with 49
  // references and 0 addresses). An address now fails here, named — rather than rendering as a
  // plausible broken image, and rather than putting third-party media back on a public page.
  const legacy =
    'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=900&q=70';
  assert.throws(() => resolvePhotoUrl(legacy, PROJECT, DATASET), /not a Sanity asset reference/);
  assert.throws(() => resolvePhotoUrl('', PROJECT, DATASET), /not a Sanity asset reference/);
  assert.throws(
    () => resolvePhotoUrl('file-abc123-pdf', PROJECT, DATASET),
    /not a Sanity asset reference/
  );
});
