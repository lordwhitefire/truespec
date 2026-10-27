/**
 * Rules for the WhatsApp number — `specs/office-settings` ("WhatsApp number validated before it
 * saves") and the owner's ruling at `task.md:413-416`.
 *
 * The claim under test: **the three accepted writings are one number**, and everything else —
 * letters, a partial number, a foreign number without its country code — is refused with a reason a
 * person can act on. A number that slips through wrong does not fail loudly: it quietly makes every
 * chat button on the showroom dead.
 *
 * The last group is the point of the whole rule rather than its paperwork: the number is stored so
 * that the **`wa.me` link the tap button builds** resolves — one fixed shape, digits only, carrying
 * the country code.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { normaliseNigerianMobile, waMeDigits } from './phone';
import { carWaLink, waLink } from '../components/whatsapp';
import type { PublicCar } from './serialize';

const N = normaliseNigerianMobile;

test('the three accepted writings are the same number, stored one way', () => {
  for (const written of ['0803 123 4567', '2348031234567', '+234 803 123 4567']) {
    const read = N(written);
    assert.equal(read.ok, true, `refused a legal writing: ${written}`);
    if (read.ok) assert.equal(read.value, '+2348031234567');
  }
});

test('stored value is +234, digits only — the one fixed shape', () => {
  for (const written of ['07012345678', '2349012345678', '+234 901 234 5678']) {
    const read = N(written);
    assert.equal(read.ok, true, `refused: ${written}`);
    if (read.ok) {
      assert.match(read.value, /^\+234\d{10}$/);
      assert.equal(waMeDigits(read.value), read.value.slice(1));
    }
  }
});

test('the number a saved one was written as is accepted again, unchanged (idempotent)', () => {
  const first = N('0803 123 4567');
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const again = N(first.value);
  assert.equal(again.ok, true);
  if (again.ok) assert.equal(again.value, first.value);
});

test('letters are refused, and so is anything else that is not a digit or a separator', () => {
  assert.equal(N('+234 803 CALL').ok, false);
  assert.equal(N('0803abc4567').ok, false);
  assert.equal(N('0803 123 4567 x2').ok, false);
  // a `+` belongs at the front only
  assert.equal(N('0803+1234567').ok, false);
  // separators people actually type are fine
  assert.equal(N('(0803) 123-4567').ok, true);
  assert.equal(N('0803.123.4567').ok, true);
});

test('a partial number is refused, with a reason', () => {
  const read = N('0803');
  assert.equal(read.ok, false);
  if (!read.ok) assert.match(read.reason, /incomplete/i);
  assert.equal(N('+234803').ok, false);
  assert.equal(N('234').ok, false);
});

test('too many digits is refused', () => {
  const read = N('080312345678901');
  assert.equal(read.ok, false);
  if (!read.ok) assert.match(read.reason, /too many digits/i);
});

test("a foreign number without Nigeria's country code is refused", () => {
  const foreignPlus = N('+44 7911 123456');
  assert.equal(foreignPlus.ok, false);
  if (!foreignPlus.ok) assert.match(foreignPlus.reason, /country code/i);

  const foreignPlain = N('447911123456');
  assert.equal(foreignPlain.ok, false);
  if (!foreignPlain.ok) assert.match(foreignPlain.reason, /Nigerian/);

  // the trunk `0` written after a `+` is a number with no country code at all
  assert.equal(N('+08031234567').ok, false);
  // ten digits with neither country code nor trunk is refused too — it is not one of the three
  const bare = N('8031234567');
  assert.equal(bare.ok, false);
  if (!bare.ok) assert.match(bare.reason, /Nigerian/);
});

test('a number that is not a mobile is refused', () => {
  const landline = N('01234567890'); // 0 + a ten-digit national number beginning 1
  assert.equal(landline.ok, false);
  if (!landline.ok) assert.match(landline.reason, /mobile/i);
});

test('an empty entry is refused with a reason', () => {
  const read = N('   ');
  assert.equal(read.ok, false);
  if (!read.ok) assert.match(read.reason, /WhatsApp/);
});

test('the link the tap button builds carries the number through, one fixed shape', () => {
  const read = N('0803 123 4567');
  assert.equal(read.ok, true);
  if (!read.ok) return;
  const link = waLink(read.value, "I'm interested in a car.");
  assert.ok(link, 'a saved number must build a link');
  assert.equal(link, "https://wa.me/2348031234567?text=I'm%20interested%20in%20a%20car.");
  const digits = link.slice('https://wa.me/'.length).split('?')[0];
  assert.equal(digits, '2348031234567');
  assert.match(digits, /^234\d{10}$/);
});

test('the digits the preview shows are the digits the link opens with', () => {
  const read = N('+234 701 234 5678');
  assert.equal(read.ok, true);
  if (!read.ok) return;
  const digits = waMeDigits(read.value);
  assert.equal(waLink(read.value, ''), `https://wa.me/${digits}?text=`);
});

test('with no number saved, no link is built — not one to nobody', () => {
  // FIX-001: `wa.me/?text=…` is a link to no recipient, dressed as a live chat button. With
  // nothing saved the helper returns null so every caller has to switch its control off instead.
  assert.equal(waLink('', 'Hello'), null);
  assert.equal(waLink('   ', 'Hello'), null);
  assert.equal(waLink(null, 'Hello'), null);
  assert.equal(waLink(undefined, 'Hello'), null);
  // The car page's link is the one that used to die rather than lie (task.md:200-201).
  const car = {
    ref: 'TS-1029',
    year: 2020,
    brand: 'Toyota',
    model: 'Camry',
    trim: null,
  } as unknown as PublicCar;
  assert.equal(carWaLink('', car), null);
});
