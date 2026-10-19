/**
 * The drawn box that stands behind a car's photo slot (D7/E2).
 *
 * A car with no photo — or a photo that failed — shows a **gradient of different colours** here,
 * never a flat grey and never machine text. One pair per car, walked from the car's own reference,
 * so the same car always shows the same colours (never random, never per-render).
 *
 * It sits **behind the image slot**, not instead of it: the photo paints over it when it loads,
 * and the box shows through whenever the slot is empty or the image failed — one rule for the
 * no-photo case and the failed case together. It never animates: motion would read as "still
 * loading", and a car with no photo will never get one. It is **decorative** (`aria-hidden`) —
 * the car's name is already on the page beside it.
 *
 * The gradient walk lives here for now; Task 28 moves it into `lib/photo-gradient.ts` with the
 * hash documented and the palette tested — the three rules it already holds by construction:
 * no randomness, no clock, and the same reference always returns the same pair.
 */

// A character walk plus a small avalanche mix: adjacent references (TS-1029 / TS-1030) walk out
// to far-apart hues — measured, the un-mixed walk put them one degree apart.
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

/** The box element itself — fills the slot it is rendered into, announces nothing. */
export function PhotoBox({ refCode }: { refCode: string }) {
  return <div className="pbox" aria-hidden="true" style={{ background: photoGradient(refCode) }} />;
}
