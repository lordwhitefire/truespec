import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
  SITE_NAME,
  SITE_ORIGIN,
  SITE_TITLE,
  absoluteUrl,
  pageMetadata,
  titleWithBrand,
} from './site';

test('absoluteUrl joins a route path to the canonical origin', () => {
  assert.equal(absoluteUrl('/'), `${SITE_ORIGIN}/`);
  assert.equal(absoluteUrl('/inventory'), `${SITE_ORIGIN}/inventory`);
  assert.equal(absoluteUrl('inventory'), `${SITE_ORIGIN}/inventory`);
  assert.equal(absoluteUrl('/car/TS-1001'), `${SITE_ORIGIN}/car/TS-1001`);
});

test('absoluteUrl preserves a query string and hash when the caller passes them', () => {
  assert.equal(
    absoluteUrl('/inventory?status=available#stock'),
    `${SITE_ORIGIN}/inventory?status=available#stock`
  );
});

test('absoluteUrl leaves an already-absolute image URL alone', () => {
  const image = 'https://cdn.sanity.io/images/project/dataset/photo.jpg';
  assert.equal(absoluteUrl(image), image);
});

test('titleWithBrand appends the brand once', () => {
  assert.equal(titleWithBrand('Inventory'), `Inventory | ${SITE_NAME}`);
  assert.equal(titleWithBrand(`Inventory | ${SITE_NAME}`), `Inventory | ${SITE_NAME}`);
  assert.equal(titleWithBrand(SITE_TITLE), SITE_TITLE);
  assert.equal(titleWithBrand('  '), SITE_TITLE);
});

test('pageMetadata builds an absolute canonical and social card', () => {
  const metadata = pageMetadata({
    title: 'Inventory',
    description: 'Cars currently listed by TrueSpec.',
    path: '/inventory',
  });

  assert.equal(metadata.title, `Inventory | ${SITE_NAME}`);
  assert.equal(metadata.description, 'Cars currently listed by TrueSpec.');
  assert.equal(metadata.alternates?.canonical, `${SITE_ORIGIN}/inventory`);
  assert.equal(metadata.openGraph?.url, `${SITE_ORIGIN}/inventory`);
  assert.deepEqual(metadata.openGraph?.images, [
    {
      url: `${SITE_ORIGIN}${DEFAULT_OG_IMAGE}`,
      width: DEFAULT_OG_IMAGE_WIDTH,
      height: DEFAULT_OG_IMAGE_HEIGHT,
      alt: `${SITE_NAME} — Inventory`,
      type: 'image/png',
    },
  ]);
  assert.equal((metadata.twitter as { card?: string } | undefined)?.card, 'summary_large_image');
  assert.deepEqual(metadata.twitter?.images, [
    { url: `${SITE_ORIGIN}${DEFAULT_OG_IMAGE}`, alt: `${SITE_NAME} — Inventory` },
  ]);
});

test("pageMetadata uses a car's absolute cover image when one is supplied", () => {
  const cover = 'https://cdn.sanity.io/images/project/dataset/camry.jpg';
  const metadata = pageMetadata({
    title: '2021 Toyota Camry XSE V6',
    description: '2021 Toyota Camry XSE V6 — ₦18,500,000, 42,000 km.',
    path: '/car/TS-1001',
    image: cover,
    imageAlt: '2021 Toyota Camry XSE V6',
  });

  const images = metadata.openGraph?.images;
  assert.ok(Array.isArray(images));
  const first = images[0];
  assert.ok(first && typeof first === 'object' && 'url' in first);
  assert.equal(first.url, cover);
  assert.equal(first.alt, '2021 Toyota Camry XSE V6');
});

test('pageMetadata can mark a page noindex', () => {
  const metadata = pageMetadata({
    title: 'Not found',
    path: '/car/TS-999999',
    noIndex: true,
  });

  assert.deepEqual(metadata.robots, { index: false, follow: false });
});
