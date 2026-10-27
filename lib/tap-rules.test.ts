/**
 * A tap's three facts, executable (truth 8).
 *
 * These pin the boundary that matters most here: `readTap` is an allowlist. Whatever a caller sends,
 * only a page and a car's reference come out of it — a name, a number, a message and an address have
 * nowhere to go, and a page that is an address rather than a path is refused rather than stored.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { TAP_PAGE_MAX, carRefInPath, isTapPage, readTap } from './tap-rules';

// --- the page a tap may name -------------------------------------------

test('the paths the site actually serves are pages', () => {
  for (const page of ['/', '/inventory', '/privacy', '/car/TS-1001', '/not-found']) {
    assert.equal(isTapPage(page), true, page);
  }
});

test('an address is not a page', () => {
  for (const value of [
    'https://truespec.example/car/TS-1001',
    '//evil.example/x',
    '/x?next=http://evil.example',
    'jav\tascript:alert(1)',
    '/car/TS-1001\nHost: evil.example',
  ]) {
    assert.equal(isTapPage(value), false, value);
  }
});

test('only a string can be a page, and it must start at the root', () => {
  for (const value of [null, undefined, 42, {}, [], '', 'inventory', 'car/TS-1']) {
    assert.equal(isTapPage(value), false, JSON.stringify(value));
  }
});

test('the page is bounded — a body that is not a path cannot arrive as one', () => {
  assert.equal(isTapPage(`/${'a'.repeat(TAP_PAGE_MAX - 1)}`), true);
  assert.equal(isTapPage(`/${'a'.repeat(TAP_PAGE_MAX)}`), false);
});

// --- the car a page stands for -----------------------------------------

test("a car page's own address gives the car's reference", () => {
  assert.equal(carRefInPath('/car/TS-1001'), 'TS-1001');
  assert.equal(carRefInPath('/car/TS-1001/'), 'TS-1001');
  assert.equal(carRefInPath('/car/TS-12345'), 'TS-12345');
});

test('a page that is not a car has no reference — a general tap', () => {
  for (const path of ['/', '/inventory', '/privacy', '/office/car/TS-1001']) {
    assert.equal(carRefInPath(path), null, path);
  }
});

test('a path that is not a reference is not a car', () => {
  for (const path of ['/car/TS-1', '/car/TS-1001x', '/car/hello', '/car/']) {
    assert.equal(carRefInPath(path), null, path);
  }
});

test("the reference is read from the path's first segment only", () => {
  assert.equal(carRefInPath('/car/TS-1001/extra/TS-2'), 'TS-1001');
  assert.equal(carRefInPath('/car/TS-1001?x=1'), 'TS-1001');
});

test('a malformed escape is not a reference', () => {
  assert.equal(carRefInPath('/car/%E0%A4%A'), null);
});

// --- the allowlist ------------------------------------------------------

test('a car tap reads back the page and the reference', () => {
  const read = readTap({ page: '/car/TS-1001', carRef: 'TS-1001' });
  assert.deepEqual(read, { ok: true, value: { page: '/car/TS-1001', carRef: 'TS-1001' } });
});

test('a tap with no reference is a general tap', () => {
  for (const carRef of [undefined, null, '']) {
    const read = readTap({ page: '/', carRef });
    assert.deepEqual(read, { ok: true, value: { page: '/', carRef: null } }, String(carRef));
  }
});

test('nothing but the page and the reference is ever read out', () => {
  const read = readTap({
    page: '/car/TS-1001',
    carRef: 'TS-1001',
    name: 'Ada',
    number: '+2348000000000',
    message: 'is it still available?',
    address: '12 Marina, Lagos',
    ip: '203.0.113.9',
    at: '2020-01-01T00:00:00Z',
  });
  assert.deepEqual(read, { ok: true, value: { page: '/car/TS-1001', carRef: 'TS-1001' } });
  assert.deepEqual(Object.keys((read as { value: object }).value), ['page', 'carRef']);
});

test('a body that is not an object is refused', () => {
  for (const body of [null, undefined, 'page=/', 42, [], true]) {
    const read = readTap(body);
    assert.equal(read.ok, false, JSON.stringify(body));
  }
});

test('a page that is not a path is refused', () => {
  assert.equal(readTap({ page: 'https://evil.example', carRef: null }).ok, false);
  assert.equal(readTap({ page: undefined, carRef: null }).ok, false);
});

test('a car reference that is not one of ours is refused, not stored', () => {
  for (const carRef of ['TS-1', '1', 'TS-1001x', 7, {}]) {
    assert.equal(readTap({ page: '/car/TS-1001', carRef }).ok, false, JSON.stringify(carRef));
  }
});

test('a well-formed reference is read even when no car holds it — a tap outlives the car', () => {
  // `TS-0000` is the shape the sequence has not reached; the rule is about the shape, not the row.
  assert.deepEqual(readTap({ page: '/car/TS-0000', carRef: 'TS-0000' }), {
    ok: true,
    value: { page: '/car/TS-0000', carRef: 'TS-0000' },
  });
});
