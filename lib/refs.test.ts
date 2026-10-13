/**
 * R-REF — the reference-code rules, executable.
 *
 * These tests are the model-check for `developer-workspace/models/TASK-002-model.md`
 * §5 (R-REF-1…4). The *assignment* of a code (advance the sequence on create) is the
 * write path, TASK-004 — so R-REF-2/3 are checked here as the module's shape: it
 * defines the form of a code and exposes no way to set or reuse one.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { REF_PREFIX, formatRef, isValidRef } from "./refs";
import * as refs from "./refs";

test("R-REF-1: formatRef pads the sequence to four digits", () => {
  assert.equal(formatRef(1), "TS-0001");
  assert.equal(formatRef(42), "TS-0042");
  assert.equal(formatRef(999), "TS-0999");
  assert.equal(formatRef(1001), "TS-1001");
  assert.equal(formatRef(9999), "TS-9999");
  assert.equal(formatRef(0), "TS-0000");
});

test("R-REF-1: formatRef lets a larger sequence run on rather than truncating", () => {
  assert.equal(formatRef(12345), "TS-12345");
});

test("R-REF-1: formatRef rejects a sequence that is not a non-negative integer", () => {
  assert.throws(() => formatRef(-1));
  assert.throws(() => formatRef(1.5));
  assert.throws(() => formatRef(Number.NaN));
});

test("R-REF-1: isValidRef accepts exactly what formatRef produces", () => {
  for (let seq = 0; seq <= 60; seq++) {
    assert.equal(isValidRef(formatRef(seq)), true, formatRef(seq));
  }
  assert.equal(isValidRef("TS-1001"), true);
  assert.equal(isValidRef("TS-12345"), true);
});

test("R-REF-1: isValidRef rejects a malformed code", () => {
  for (const bad of [
    "",
    "TS-",
    "TS-1",
    "TS-001",
    "TS-00001", // five digits with a leading zero — never produced by formatRef
    "ts-0001",
    "TS0001",
    "0001",
    "1234",
    "TS-00a1",
    "TS-1234x",
    "xTS-1234",
  ]) {
    assert.equal(isValidRef(bad), false, `expected ${JSON.stringify(bad)} to be invalid`);
  }
});

test("R-REF-3: formatRef is pure — the same sequence always gives the same code", () => {
  assert.equal(formatRef(7), formatRef(7));
  assert.equal(formatRef(7), "TS-0007");
});

test("R-REF-2: the module exposes no way to set, assign or reuse a code", () => {
  // R-REF-2/3 — a code is assigned once by the sequence (the write path, TASK-004);
  // this module only describes the code's shape. It must offer no setter/allocator.
  assert.deepEqual(Object.keys(refs).sort(), ["REF_PREFIX", "formatRef", "isValidRef"]);
  assert.equal(REF_PREFIX, "TS-");
});
