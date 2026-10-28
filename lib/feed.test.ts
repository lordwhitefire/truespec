import assert from 'node:assert/strict';
import test from 'node:test';

import { buildInventoryRss } from './feed';
import { baseCar, withCar } from './__fixtures__/public-car';

test('the feed is valid RSS with the canonical channel and one item per public car', () => {
  const xml = buildInventoryRss(
    [baseCar, withCar({ ref: 'TS-1002', brand: 'Lexus', model: 'RX', trim: null })],
    new Date('2026-10-28T12:00:00Z')
  );

  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<rss version="2\.0"/);
  assert.match(xml, /<title>TrueSpec Automotive inventory<\/title>/);
  assert.match(xml, /<link>https:\/\/truespec-k4y6\.vercel\.app\/inventory<\/link>/);
  assert.match(xml, /<lastBuildDate>Wed, 28 Oct 2026 12:00:00 GMT<\/lastBuildDate>/);
  assert.equal((xml.match(/<item>/g) ?? []).length, 2);
  assert.match(xml, /<link>https:\/\/truespec-k4y6\.vercel\.app\/car\/TS-1001<\/link>/);
  assert.match(xml, /<link>https:\/\/truespec-k4y6\.vercel\.app\/car\/TS-1002<\/link>/);
});

test('the feed description carries the public price and state, and no office field', () => {
  const xml = buildInventoryRss([baseCar], new Date('2026-10-28T12:00:00Z'));

  assert.match(xml, /₦34,500,000/);
  assert.match(xml, /Available/);
  assert.match(xml, /31,000 km/);
  assert.doesNotMatch(xml, /cost|private|customer|enquiry|priceKobo|soldAt/i);
});

test('feed text is XML-escaped, including a car title with an ampersand', () => {
  const xml = buildInventoryRss([withCar({ brand: 'Land & Sea', model: 'Rover' })]);

  assert.match(xml, /Land &amp; Sea Rover/);
  assert.doesNotMatch(xml, /Land & Sea Rover/);
});

test('an empty inventory still produces a valid channel with no items', () => {
  const xml = buildInventoryRss([], new Date('2026-10-28T12:00:00Z'));

  assert.match(xml, /<channel>/);
  assert.doesNotMatch(xml, /<item>/);
});
