/**
 * The leak-check's value search, executable.
 *
 * The bug this pins: a cost total in kobo (`5500000`) was reported as a leak because it appears as a
 * substring of a public price (`4550000000`). The fix is a digit-boundary match for numbers; these
 * tests hold both directions — the false positive is gone, and a real whole-number leak is caught.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllDigits, mentionsValue } from './leak-match';

test("isAllDigits: a number's string shape, and only that", () => {
  assert.equal(isAllDigits('5500000'), true);
  assert.equal(isAllDigits('0'), true);
  assert.equal(isAllDigits(''), false);
  assert.equal(isAllDigits('₦55,000'), false);
  assert.equal(isAllDigits('55 000'), false);
});

test('a digits-only value is not found inside a longer number (the false positive)', () => {
  const body = `{"priceKobo":4550000000}`;
  assert.equal(mentionsValue(body, '5500000'), false);
});

test('a digits-only value is not found with a digit on either side', () => {
  assert.equal(mentionsValue('x15500000x', '5500000'), false);
  assert.equal(mentionsValue('55000009', '5500000'), false);
});

test('a digits-only value IS found when it stands alone (a real leak)', () => {
  assert.equal(mentionsValue(`<span>5500000</span>`, '5500000'), true);
  assert.equal(mentionsValue('cost=5500000&x=1', '5500000'), true);
  assert.equal(mentionsValue('5500000', '5500000'), true);
  assert.equal(mentionsValue('a 5500000 b', '5500000'), true);
});

test('every occurrence is tested, not just the first', () => {
  // The substring collision comes first; the genuine standalone hit follows.
  const body = '4550000000 then 5500000';
  assert.equal(mentionsValue(body, '5500000'), true);
});

test('a formatted value is matched verbatim', () => {
  assert.equal(mentionsValue('<b>₦55,000</b>', '₦55,000'), true);
  assert.equal(mentionsValue('<b>₦55,000</b>', '₦550,000'), false);
});

test('an empty value never matches', () => {
  assert.equal(mentionsValue('anything', ''), false);
});
