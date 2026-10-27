/**
 * R-SEC — the section rules, executable.
 *
 * These tests are the model-check for `developer-workspace/models/TASK-002-model.md`
 * §2 (R-SEC-1…4), read under D15: the section vocabulary is the four fixed primary
 * states, and the showroom presents three of them. R-SEC-5 (a buyer sees only section
 * names) is a payload/search check on the public path, run in Task 20 — not here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SECTIONS,
  PUBLIC_SECTIONS,
  SECTION_LABEL,
  isSection,
  sectionOfState,
  sectionOfToken,
  tokenOf,
  inAvailablePresentation,
  presentedSections,
} from './sections';

test('R-SEC-1: the section set is the four fixed primary states', () => {
  assert.deepEqual([...SECTIONS], ['available', 'on order', 'landed', 'sold']);
  assert.equal(SECTIONS.length, 4);
  for (const section of SECTIONS) {
    assert.equal(typeof SECTION_LABEL[section], 'string');
  }
  // The labels, from the one place.
  assert.deepEqual(SECTION_LABEL, {
    available: 'Available',
    'on order': 'On Order',
    landed: 'Landed',
    sold: 'Sold',
  });
});

test('R-SEC-1: the showroom presents three of the four — never Sold', () => {
  assert.deepEqual([...PUBLIC_SECTIONS], ['available', 'on order', 'landed']);
  assert.equal(PUBLIC_SECTIONS.includes('sold'), false);
});

test('R-SEC-1: isSection admits exactly the four canonical sections', () => {
  for (const section of SECTIONS) assert.equal(isSection(section), true);
  for (const other of ['Available', 'On Order', 'Landed', 'Sold', '', null, undefined, 42, {}]) {
    assert.equal(isSection(other), false);
  }
});

test('R-SEC-2: a state resolves to exactly one section', () => {
  assert.equal(sectionOfState('Available', 'available'), 'available');
  assert.equal(sectionOfState('Held for payment', 'available'), 'available');
  assert.equal(sectionOfState('At port', 'on order'), 'on order');
  assert.equal(sectionOfState('Landed', 'landed'), 'landed');
  assert.equal(sectionOfState('Landed', ['landed']), 'landed');
});

test('R-SEC-2: a state mapping to no section raises', () => {
  assert.throws(() => sectionOfState('Held for payment', undefined));
  assert.throws(() => sectionOfState('Held for payment', null));
  assert.throws(() => sectionOfState('Held for payment', []));
  assert.throws(() => sectionOfState('Held for payment', 'unknown'));
  assert.throws(() => sectionOfState('', 'available'));
});

test('R-SEC-2: a state mapping to two sections raises', () => {
  assert.throws(() => sectionOfState('Held for payment', ['available', 'landed']));
});

test('R-SEC-3: the Landed section is presented inside Available', () => {
  assert.equal(inAvailablePresentation('available'), true);
  assert.equal(inAvailablePresentation('landed'), true);
  assert.equal(inAvailablePresentation('on order'), false);
});

test('R-SEC-2: the URL token normalises to a section, here and not per-screen', () => {
  assert.equal(sectionOfToken('a'), 'available');
  assert.equal(sectionOfToken('o'), 'on order');
  assert.equal(sectionOfToken('l'), 'landed');
  assert.equal(sectionOfToken('s'), 'sold');
  // the section's own name also normalises (loose URL values)
  assert.equal(sectionOfToken('Available'), 'available');
  assert.equal(sectionOfToken('on order'), 'on order');
  assert.equal(sectionOfToken('landed'), 'landed');
  assert.equal(sectionOfToken('sold'), 'sold');
  // anything that is not a section is refused
  assert.equal(sectionOfToken(''), null);
  assert.equal(sectionOfToken('x'), null);
  // and the short form round-trips
  assert.equal(sectionOfToken(tokenOf('available')), 'available');
});

test('R-SEC-3 + R-SEC-4: a new-arrival car is presented under both Landed and Available', () => {
  assert.deepEqual(presentedSections({ section: 'landed' }), ['available', 'landed']);
  assert.deepEqual(presentedSections({ section: 'available', isNewArrival: true }), [
    'available',
    'landed',
  ]);
  assert.deepEqual(presentedSections({ section: 'available' }), ['available']);
  assert.deepEqual(presentedSections({ section: 'on order' }), ['on order']);
});

test('D15: Sold is a section, and a sold car is presented nowhere public', () => {
  assert.equal(sectionOfState('Sold', 'sold'), 'sold');
  assert.deepEqual(presentedSections({ section: 'sold' }), []);
  assert.deepEqual(presentedSections({ section: 'sold', isNewArrival: true }), []);
});
