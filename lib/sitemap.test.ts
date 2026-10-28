import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSitemap } from './sitemap';
import { baseCar, withCar } from './__fixtures__/public-car';

test('the sitemap lists the four public pages and every public car', () => {
  const second = withCar({ ref: 'TS-1002', photos: [] });
  const sitemap = buildSitemap([baseCar, second]);

  assert.deepEqual(
    sitemap.map((entry) => entry.url),
    [
      'https://truespec-k4y6.vercel.app/',
      'https://truespec-k4y6.vercel.app/inventory',
      'https://truespec-k4y6.vercel.app/privacy',
      'https://truespec-k4y6.vercel.app/terms',
      'https://truespec-k4y6.vercel.app/car/TS-1001',
      'https://truespec-k4y6.vercel.app/car/TS-1002',
    ]
  );
});

test('legal pages carry the date they state, not a generated freshness', () => {
  const sitemap = buildSitemap([]);

  assert.equal(sitemap[2].lastModified, '2026-10-27');
  assert.equal(sitemap[3].lastModified, '2026-10-27');
  assert.equal(sitemap[0].lastModified, undefined);
  assert.equal(sitemap[1].lastModified, undefined);
});

test('a car image sitemap entry uses the public photo URL, which is valid XML', () => {
  const sitemap = buildSitemap([baseCar]);
  const carEntry = sitemap[4];

  assert.deepEqual(carEntry.images, [
    'https://cdn.sanity.io/images/c2lc8g8n/production/abc-1200x800.jpg',
  ]);
  assert.doesNotMatch(JSON.stringify(carEntry.images), /&(?!amp;|lt;|gt;|quot;|apos;)/);
});

test('a car with no photo has no image entry rather than an empty one', () => {
  const sitemap = buildSitemap([withCar({ photos: [] })]);

  assert.equal(sitemap[4].images, undefined);
});

test('the sitemap never exposes office or API routes', () => {
  const text = JSON.stringify(buildSitemap([baseCar]));

  assert.doesNotMatch(text, /\/office|\/api|cost|private|customer|enquiry/i);
});
