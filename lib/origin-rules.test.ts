/**
 * The origin rule, executable (task.md line 253).
 *
 * These pin what the tap's Route Handler refuses and, just as importantly, what the rule does **not**
 * claim: it is a CSRF guard, so the tests are about the shapes a browser can and cannot produce.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { isSameOrigin } from "./origin-rules";

test("a request from our own host is the same origin", () => {
  assert.equal(isSameOrigin("https://truespec.example", "truespec.example"), true);
  assert.equal(isSameOrigin("http://localhost:3210", "localhost:3210"), true);
});

test("the host and the origin are compared without regard to case", () => {
  assert.equal(isSameOrigin("https://TrueSpec.Example", "truespec.example"), true);
  assert.equal(isSameOrigin("https://truespec.example", " TrueSpec.Example "), true);
});

test("another site's origin is refused — the case a CSRF attempt produces", () => {
  assert.equal(isSameOrigin("https://evil.example", "truespec.example"), false);
  // a lookalike host is a different host
  assert.equal(isSameOrigin("https://truespec.example.evil.test", "truespec.example"), false);
});

test("a different port is a different origin", () => {
  assert.equal(isSameOrigin("http://localhost:3210", "localhost:3000"), false);
  assert.equal(isSameOrigin("https://truespec.example:8443", "truespec.example"), false);
});

test("an absent origin is refused rather than assumed innocent", () => {
  assert.equal(isSameOrigin(null, "truespec.example"), false);
  assert.equal(isSameOrigin(undefined, "truespec.example"), false);
  assert.equal(isSameOrigin("", "truespec.example"), false);
});

test("an absent host is refused — there is nothing to be the same as", () => {
  assert.equal(isSameOrigin("https://truespec.example", null), false);
  assert.equal(isSameOrigin("https://truespec.example", ""), false);
});

test("`Origin: null` — a sandboxed frame or a local file — is refused", () => {
  assert.equal(isSameOrigin("null", "truespec.example"), false);
});

test("a value with no scheme is not a web origin", () => {
  assert.equal(isSameOrigin("truespec.example", "truespec.example"), false);
  assert.equal(isSameOrigin("//truespec.example", "truespec.example"), false);
});

test("a scheme we do not serve is refused", () => {
  assert.equal(isSameOrigin("file://truespec.example", "truespec.example"), false);
  assert.equal(isSameOrigin("ftp://truespec.example", "truespec.example"), false);
});

test("an origin carrying a path is still read by its host", () => {
  // A browser never sends this, but the rule reads the host rather than trusting the whole string.
  assert.equal(isSameOrigin("https://truespec.example/some/path", "truespec.example"), true);
});
