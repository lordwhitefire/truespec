/**
 * The office's clock, executable.
 *
 * Every case fixes both ends — the instant and "now" — so the answer is the same on any machine in
 * any timezone. That is the whole point of formatting in UTC with the names spelled out: a screen
 * cannot show one day while its server shows another.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { clock, dayKey, dayTitle, longDay, shortAge, weekdayDay } from './office-time';

const NOW = new Date('2026-10-04T12:00:00.000Z');

test('dayKey is the UTC calendar day', () => {
  assert.equal(dayKey('2026-10-04T00:00:00.000Z'), '2026-10-04');
  assert.equal(dayKey('2026-10-04T23:59:59.000Z'), '2026-10-04');
  // One minute past midnight UTC is the next day, whatever the reader's clock says.
  assert.equal(dayKey('2026-10-05T00:00:00.000Z'), '2026-10-05');
});

test('clock is the UTC time, zero-padded', () => {
  assert.equal(clock('2026-10-04T08:42:00.000Z'), '08:42');
  assert.equal(clock('2026-10-04T00:05:00.000Z'), '00:05');
  assert.equal(clock('2026-10-04T23:59:00.000Z'), '23:59');
});

test('longDay and weekdayDay name the UTC day', () => {
  assert.equal(longDay('2026-10-04T12:00:00.000Z'), '4 Oct 2026');
  assert.equal(weekdayDay('2026-10-04T12:00:00.000Z'), 'Sunday 4 Oct 2026');
  assert.equal(weekdayDay('2026-10-05T12:00:00.000Z'), 'Monday 5 Oct 2026');
});

test('shortAge counts minutes and hours on the day itself', () => {
  assert.equal(shortAge('2026-10-04T11:42:00.000Z', NOW), '18 min');
  assert.equal(shortAge('2026-10-04T11:00:00.000Z', NOW), '1 hr');
  assert.equal(shortAge('2026-10-04T11:59:30.000Z', NOW), 'just now');
});

test('shortAge says Yesterday, then the days, then the day and month', () => {
  assert.equal(shortAge('2026-10-03T12:00:00.000Z', NOW), 'Yesterday');
  assert.equal(shortAge('2026-10-02T12:00:00.000Z', NOW), '2 days');
  assert.equal(shortAge('2026-09-28T12:00:00.000Z', NOW), '6 days');
  assert.equal(shortAge('2026-09-27T12:00:00.000Z', NOW), '27 Sep');
});

test('dayTitle groups by the UTC day, and does not call six days ago Today', () => {
  assert.equal(dayTitle('2026-10-04T00:01:00.000Z', NOW), 'Today');
  assert.equal(dayTitle('2026-10-03T23:59:00.000Z', NOW), 'Yesterday');
  assert.equal(dayTitle('2026-09-28T12:00:00.000Z', NOW), 'Monday 28 Sep 2026');
});
