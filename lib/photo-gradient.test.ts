/**
 * D7/E2 — the drawn box's palette, executable.
 *
 * Task 28's acceptance: the colours are derived deterministically from the car's reference
 * code by a documented hash (same ref → same colours, forever), in `lib/photo-gradient.ts`
 * with no randomness and no clock. These tests hold that contract: the golden table pins the
 * documented hash (an accidental edit changes every car's colour and fails here), and the
 * spread checks pin the reason the mix exists (adjacent references must not become twins).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { photoGradient } from "./photo-gradient";

/** The references the box is measured against: real cars (no photos, one photo, photographed, sold) + store fixtures. */
const REFS = [
  "TS-1001",
  "TS-1025",
  "TS-1029",
  "TS-1030",
  "TS-1031",
  "TS-1032",
  "TS-1033",
  "TS-1034",
  "TS-1035",
  "TS-1036",
  "TS-FLOW-1792136477358",
  "TS-FLOW-1792144332626",
] as const;

const STOPS = /^linear-gradient\(135deg, hsl\((\d+), (\d+)%, (\d+)%\), hsl\((\d+), (\d+)%, (\d+)%\)\)$/;

function stops(gradient: string): { h: number; s: number; l: number }[] {
  const m = STOPS.exec(gradient);
  assert.ok(m, `not the documented gradient form: ${gradient}`);
  return [
    { h: +m[1], s: +m[2], l: +m[3] },
    { h: +m[4], s: +m[5], l: +m[6] },
  ];
}

/** Circular distance between two hues, 0–180. */
const hueGap = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

test("photoGradient: the same reference returns the same gradient on every call", () => {
  for (const ref of REFS) {
    assert.equal(photoGradient(ref), photoGradient(ref), ref);
  }
});

test("photoGradient: the documented hash is pinned — an edit here changes every car's colour", () => {
  const golden: Record<string, string> = {
    "TS-1001": "linear-gradient(135deg, hsl(27, 28%, 21%), hsl(204, 32%, 28%))",
    "TS-1025": "linear-gradient(135deg, hsl(163, 27%, 23%), hsl(354, 32%, 32%))",
    "TS-1029": "linear-gradient(135deg, hsl(155, 23%, 21%), hsl(254, 37%, 30%))",
    "TS-1030": "linear-gradient(135deg, hsl(119, 24%, 21%), hsl(81, 33%, 32%))",
    "TS-1031": "linear-gradient(135deg, hsl(207, 22%, 23%), hsl(278, 37%, 33%))",
    "TS-1032": "linear-gradient(135deg, hsl(104, 28%, 18%), hsl(331, 30%, 29%))",
    "TS-1033": "linear-gradient(135deg, hsl(297, 22%, 18%), hsl(341, 34%, 32%))",
    "TS-1034": "linear-gradient(135deg, hsl(109, 23%, 18%), hsl(264, 31%, 30%))",
    "TS-1035": "linear-gradient(135deg, hsl(70, 23%, 19%), hsl(242, 34%, 34%))",
    "TS-1036": "linear-gradient(135deg, hsl(178, 22%, 19%), hsl(303, 36%, 28%))",
    "TS-FLOW-1792136477358": "linear-gradient(135deg, hsl(91, 29%, 21%), hsl(335, 38%, 28%))",
    "TS-FLOW-1792144332626": "linear-gradient(135deg, hsl(98, 22%, 19%), hsl(235, 30%, 28%))",
  };
  for (const [ref, expected] of Object.entries(golden)) {
    assert.equal(photoGradient(ref), expected, ref);
  }
});

test("photoGradient: every stop stays inside the documented palette bounds", () => {
  for (const ref of REFS) {
    const [first, second] = stops(photoGradient(ref));
    assert.ok(first.h >= 0 && first.h < 360, `${ref} first hue ${first.h}`);
    assert.ok(second.h >= 0 && second.h < 360, `${ref} second hue ${second.h}`);
    assert.ok(first.s >= 22 && first.s <= 31, `${ref} first saturation ${first.s}`);
    assert.ok(first.l >= 18 && first.l <= 23, `${ref} first lightness ${first.l}`);
    assert.ok(second.s >= 30 && second.s <= 41, `${ref} second saturation ${second.s}`);
    assert.ok(second.l >= 28 && second.l <= 34, `${ref} second lightness ${second.l}`);
  }
});

test("photoGradient: two cars never share a gradient", () => {
  const values = REFS.map((ref) => photoGradient(ref));
  assert.equal(new Set(values).size, values.length);
});

test("photoGradient: adjacent references land far apart, not one degree apart", () => {
  // The un-mixed walk put TS-1029 and TS-1030 one degree apart (measured); the mix is what
  // spreads them. The assertion is on the first-stop hue gap, circular.
  const [a] = stops(photoGradient("TS-1029"));
  const [b] = stops(photoGradient("TS-1030"));
  assert.ok(hueGap(a.h, b.h) >= 20, `hues ${a.h}° and ${b.h}° are too close`);
});

test("photoGradient: references spread across the palette", () => {
  const hues = REFS.map((ref) => stops(photoGradient(ref))[0].h);
  const spread = Math.max(...hues) - Math.min(...hues);
  assert.ok(spread >= 180, `first-stop hue spread ${spread}° across ${REFS.length} references`);
});

test("photoGradient: the module is a pure function — no randomness, no clock", () => {
  const source = readFileSync(new URL("./photo-gradient.ts", import.meta.url), "utf8");
  assert.ok(!source.includes("Math.random"), "Math.random in the module");
  assert.ok(!/\bDate\b/.test(source), "Date in the module");
  assert.ok(!/\bperformance\b/.test(source), "performance (a clock) in the module");
});

test("photoGradient: an empty code still yields a valid gradient (defensive)", () => {
  const gradient = photoGradient("");
  const [first, second] = stops(gradient);
  assert.notDeepEqual(first, second);
});
