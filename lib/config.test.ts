import test from 'node:test';
import assert from 'node:assert/strict';

import { demoSwitchOn } from './config';

test('a demo switch is on only for the exact string 1', () => {
  assert.equal(demoSwitchOn('1'), true);

  for (const value of ['true', 'yes', '0', '', ' 1', '1 ', 'on', undefined]) {
    assert.equal(demoSwitchOn(value), false, String(value));
  }
});
