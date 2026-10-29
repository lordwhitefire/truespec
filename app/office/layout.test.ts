import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const rootLayout = readFileSync(new URL('../layout.tsx', import.meta.url), 'utf8');
const officeLayout = readFileSync(new URL('./layout.tsx', import.meta.url), 'utf8');

test('root layout has no ClerkProvider', () => {
  assert.ok(!rootLayout.includes('ClerkProvider'));
});

test('office layout wraps children in ClerkProvider', () => {
  assert.ok(officeLayout.includes('import { ClerkProvider }'));
  assert.ok(officeLayout.includes('<ClerkProvider>{children}</ClerkProvider>'));
});
