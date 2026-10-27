import assert from 'node:assert/strict';
import test from 'node:test';
import type { PublicCar } from './serialize';
import { buildCarJsonLd } from './structured-data';

const base: PublicCar = {
  ref: 'TS-1001',
  brand: 'Toyota',
  model: 'Camry',
  trim: 'XSE V6',
  year: 2021,
  exteriorColor: 'Obsidian black',
  interiorColor: 'Black',
  mileageKm: 31000,
  features: ['Leather seats'],
  photos: ['https://cdn.sanity.io/images/c2lc8g8n/production/abc-1200x800.jpg'],
  priceKobo: 3450000000,
  wasPriceKobo: null,
  section: 'available',
  isNewArrival: false,
  arrivalNote: null,
  sold: false,
  soldAt: null,
};

function withCar(overrides: Partial<PublicCar>): PublicCar {
  return { ...base, ...overrides };
}

test('live car emits a public Vehicle and an InStock Offer', () => {
  const jsonLd = buildCarJsonLd(base);

  assert.equal(jsonLd['@context'], 'https://schema.org');
  assert.equal(jsonLd['@type'], 'Vehicle');
  assert.equal(jsonLd.name, '2021 Toyota Camry XSE V6');
  assert.equal(jsonLd.sku, 'TS-1001');
  assert.equal(jsonLd.url, 'https://truespec-k4y6.vercel.app/car/TS-1001');
  assert.equal(
    jsonLd.image,
    'https://cdn.sanity.io/images/c2lc8g8n/production/abc-1200x800.jpg?w=1200&h=630&fit=crop&auto=format&q=75'
  );
  assert.deepEqual(jsonLd.brand, { '@type': 'Brand', name: 'Toyota' });
  assert.equal(jsonLd.model, 'Camry');
  assert.equal(jsonLd.vehicleModelDate, '2021');
  assert.deepEqual(jsonLd.mileageFromOdometer, {
    '@type': 'QuantitativeValue',
    value: 31000,
    unitCode: 'KMT',
  });
  assert.equal(jsonLd.color, 'Obsidian black');
  assert.equal(jsonLd.vehicleInteriorColor, 'Black');
  assert.equal(jsonLd.vehicleConfiguration, 'XSE V6');

  assert.equal(jsonLd.offers['@type'], 'Offer');
  assert.equal(jsonLd.offers.price, 34500000);
  assert.equal(jsonLd.offers.priceCurrency, 'NGN');
  assert.equal(jsonLd.offers.availability, 'https://schema.org/InStock');
  assert.equal(jsonLd.offers.itemCondition, 'https://schema.org/UsedCondition');
  assert.equal(jsonLd.offers.url, 'https://truespec-k4y6.vercel.app/car/TS-1001');
  assert.deepEqual(jsonLd.offers.seller, {
    '@type': 'AutoDealer',
    name: 'TrueSpec Automotive',
    url: 'https://truespec-k4y6.vercel.app',
  });
});

test('no office-only or non-required public field leaks into the graph', () => {
  const jsonLd = buildCarJsonLd(
    withCar({ features: ['Leather seats'], arrivalNote: 'Arriving in November' })
  );
  const text = JSON.stringify(jsonLd);

  assert.doesNotMatch(text, /cost|private|customer|arrivalNote|features/i);
  assert.doesNotMatch(text, /soldAt|wasPriceKobo|isNewArrival|photos|priceKobo|mileageKm/i);
});

test('sold car keeps a Vehicle but its Offer is SoldOut', () => {
  const jsonLd = buildCarJsonLd(
    withCar({ sold: true, section: 'sold', soldAt: '2026-09-15T12:00:00Z' })
  );

  assert.equal(jsonLd['@type'], 'Vehicle');
  assert.equal(jsonLd.offers.availability, 'https://schema.org/SoldOut');
  assert.notEqual(jsonLd.offers.availability, 'https://schema.org/InStock');
});

test('a Sold section alone is sold even without the sale marker', () => {
  const jsonLd = buildCarJsonLd(withCar({ section: 'sold', sold: false }));

  assert.equal(jsonLd.offers.availability, 'https://schema.org/SoldOut');
});

test('a sale marker alone is sold even in an available section', () => {
  const jsonLd = buildCarJsonLd(withCar({ section: 'available', sold: true }));

  assert.equal(jsonLd.offers.availability, 'https://schema.org/SoldOut');
});

test('an on-order car is PreOrder, not InStock', () => {
  const jsonLd = buildCarJsonLd(
    withCar({ section: 'on order', arrivalNote: 'Arriving in November' })
  );

  assert.equal(jsonLd.offers.availability, 'https://schema.org/PreOrder');
});

test('landed and available cars are InStock', () => {
  assert.equal(
    buildCarJsonLd(withCar({ section: 'landed' })).offers.availability,
    'https://schema.org/InStock'
  );
  assert.equal(
    buildCarJsonLd(withCar({ section: 'available' })).offers.availability,
    'https://schema.org/InStock'
  );
});

test('no-photo car falls back to the generated social card', () => {
  const jsonLd = buildCarJsonLd(withCar({ photos: [] }));

  assert.equal(jsonLd.image, 'https://truespec-k4y6.vercel.app/opengraph-image');
});

test('missing mileage, colours and trim are omitted, not emitted as null', () => {
  const jsonLd = buildCarJsonLd(
    withCar({
      mileageKm: null,
      exteriorColor: null,
      interiorColor: null,
      trim: null,
    })
  );

  assert.equal(jsonLd.mileageFromOdometer, undefined);
  assert.equal(jsonLd.color, undefined);
  assert.equal(jsonLd.vehicleInteriorColor, undefined);
  assert.equal(jsonLd.vehicleConfiguration, undefined);
  assert.doesNotMatch(JSON.stringify(jsonLd), /null/);
});
