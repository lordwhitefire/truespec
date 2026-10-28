import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const publicDir = path.join(process.cwd(), 'public');

function read(name: string): string {
  return readFileSync(path.join(publicDir, name), 'utf8');
}

test('the non-standard AI and trust files say plainly that they are experiments', () => {
  for (const name of ['ai.txt', 'trust.txt']) {
    const text = read(name);
    assert.match(text, /experimental/);
    assert.match(text, /not a recognized standard/i);
    assert.match(text, /no crawler is known to honor it/i);
  }
});

test('ai.txt points at the public inventory and the full public text', () => {
  const text = read('ai.txt');

  assert.match(text, /https:\/\/truespec-k4y6\.vercel\.app\/inventory/);
  assert.match(text, /https:\/\/truespec-k4y6\.vercel\.app\/llms-full\.txt/);
  assert.match(text, /https:\/\/truespec-k4y6\.vercel\.app\/\.well-known\/security\.txt/);
});

test('trust.txt lists only verification files that exist and makes no social claim', () => {
  const text = read('trust.txt');

  assert.match(text, /google646db9dd031323ec\.html/);
  assert.match(text, /BingSiteAuth\.xml/);
  assert.match(text, /No social profiles are listed here because no verified handles exist yet\./);
  assert.doesNotMatch(text, /instagram\.com|facebook\.com|youtube\.com|x\.com\/|twitter\.com/i);
});

test('humans.txt names the showroom and the stack without inventing a person', () => {
  const text = read('humans.txt');

  assert.match(text, /Owner: TrueSpec Automotive/);
  assert.match(text, /Next\.js, React, TypeScript/);
  assert.doesNotMatch(text, /@|email|phone|address/i);
});

test('ads.txt declares no authorized sellers', () => {
  const text = read('ads.txt');

  assert.match(text, /No advertising inventory is sold on this site\./);
  assert.equal(
    text.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#')).length,
    0
  );
});
