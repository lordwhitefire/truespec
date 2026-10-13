/**
 * Runner smoke test.
 *
 * Layer 2's rules are checked by executable tests. This file proves the runner
 * itself is wired — `npm test` executes a TypeScript test file under `lib/`.
 * It asserts the runner only, nothing about the product.
 */
import test from "node:test";
import assert from "node:assert/strict";

test("the test runner executes TypeScript under lib/", () => {
  const typed: number = 40 + 2;
  assert.equal(typed, 42);
});
