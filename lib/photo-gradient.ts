/**
 * The drawn photo box's palette — deterministic from the car's reference code (D7/E2).
 *
 * A car with no photo shows a gradient rather than a flat grey, and it must be the **same
 * gradient for the same car, forever** — the colour is part of recognising the car between
 * visits. So the palette is a pure function of the reference code: no randomness, no clock,
 * no per-render drift (a changed colour would read as a changed car).
 *
 * The hash, documented — an accidental edit here changes every car's colour, so the golden
 * tests in `photo-gradient.test.ts` pin real references:
 *
 * 1. **Walk.** `h = (h * 31 + charCode) >>> 0` over the code — the classic 31-multiplier
 *    string walk (Java's `String.hashCode` shape, unsigned 32-bit).
 * 2. **Avalanche.** A murmur3-style finalizer — `x ^= x >>> 16; x *= 0x85ebca6b;
 *    x ^= x >>> 13; x *= 0xc2b2ae35; x ^= x >>> 16` (unsigned throughout) — applied to the
 *    walk with two different seeds: `0x9e3779b9` (the golden-ratio odd constant) for the
 *    first stop and `0x85ebca6b` for the second. The mix is what makes *adjacent* references
 *    land far apart: measured, the un-mixed walk put TS-1029 and TS-1030 one degree apart;
 *    the mixed first-stop hues are 155° and 119°.
 * 3. **Decompose.** Each mixed word becomes an HSL stop — hue `word % 360`; saturation
 *    `22 + (word >>> 9) % 10` % / `30 + (word >>> 9) % 12` %; lightness
 *    `18 + (word >>> 17) % 6` % / `28 + (word >>> 17) % 7` %. The bounds keep every
 *    combination dark and muted enough for the site's surface — two stops that read as a
 *    photo's shadow, never a bright placeholder — while the hue is free.
 *
 * The result is the CSS value a box element carries directly.
 */

function walk(refCode: string): number {
  let h = 0;
  for (const ch of refCode) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function mix(x: number): number {
  x = (x ^ (x >>> 16)) >>> 0;
  x = (x * 0x85ebca6b) >>> 0;
  x = (x ^ (x >>> 13)) >>> 0;
  x = (x * 0xc2b2ae35) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x;
}

/** The car's gradient, as a CSS value: two stops, both muted and dark enough for the surface. */
export function photoGradient(refCode: string): string {
  const base = walk(refCode);
  const a = mix(base ^ 0x9e3779b9);
  const b = mix(base ^ 0x85ebca6b);
  return (
    `linear-gradient(135deg, ` +
    `hsl(${a % 360}, ${22 + ((a >>> 9) % 10)}%, ${18 + ((a >>> 17) % 6)}%), ` +
    `hsl(${b % 360}, ${30 + ((b >>> 9) % 12)}%, ${28 + ((b >>> 17) % 7)}%))`
  );
}
