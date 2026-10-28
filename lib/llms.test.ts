import assert from 'node:assert/strict';
import test from 'node:test';

import { buildLlmsFullTxt, buildLlmsTxt } from './llms';
import { baseCar, withCar } from './__fixtures__/public-car';

test('llms.txt is a compact index of the canonical pages and the public inventory', () => {
  const text = buildLlmsTxt([baseCar], '+234 814 692 7170');

  assert.match(text, /^# TrueSpec Automotive/m);
  assert.match(
    text,
    /\[Inventory\]\(https:\/\/truespec-k4y6\.vercel\.app\/inventory\) — 1 car currently listed/
  );
  assert.match(text, /\[Privacy notice\]\(https:\/\/truespec-k4y6\.vercel\.app\/privacy\)/);
  assert.match(text, /\[Terms of service\]\(https:\/\/truespec-k4y6\.vercel\.app\/terms\)/);
  assert.match(text, /https:\/\/wa\.me\/2348146927170/);
  assert.match(text, /\/llms-full\.txt/);
});

test('llms.txt states the limits honestly rather than claiming reviews or a legal entity', () => {
  const text = buildLlmsTxt([baseCar], null);

  assert.match(text, /No third-party reviews, ratings or testimonials are published\./);
  assert.match(
    text,
    /No legal entity, registered address, telephone number, tax ID or AutoDealer markup is asserted\./
  );
  assert.doesNotMatch(text, /AggregateRating|"Review"|AutoDealer"|address:/);
});

test('llms-full.txt lists every public car with its public price, state and link', () => {
  const text = buildLlmsFullTxt(
    [baseCar, withCar({ ref: 'TS-1002', brand: 'Lexus', model: 'RX', trim: null, year: 2022 })],
    '+234 814 692 7170'
  );

  assert.match(text, /^# TrueSpec Automotive — full public inventory/m);
  assert.match(text, /### 2021 Toyota Camry XSE V6/);
  assert.match(text, /### 2022 Lexus RX/);
  assert.match(text, /- Price: ₦34,500,000/);
  assert.match(text, /- Status: Available/);
  assert.match(text, /- URL: https:\/\/truespec-k4y6\.vercel\.app\/car\/TS-1001/);
  assert.match(text, /- URL: https:\/\/truespec-k4y6\.vercel\.app\/car\/TS-1002/);
  assert.match(text, /https:\/\/wa\.me\/2348146927170/);
});

test('llms-full.txt omits missing details rather than printing null', () => {
  const text = buildLlmsFullTxt(
    [withCar({ mileageKm: null, exteriorColor: null, interiorColor: null, trim: null })],
    null
  );

  assert.doesNotMatch(text, /null|undefined/);
  assert.doesNotMatch(text, /- Mileage:/);
  assert.doesNotMatch(text, /- Exterior:/);
  assert.doesNotMatch(text, /- Interior:/);
});
