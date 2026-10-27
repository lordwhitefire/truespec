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
 * The palette lives in `lib/photo-gradient.ts` — a documented, tested hash of the car's own
 * reference code (no randomness, no clock: the same car is the same colours forever).
 */

import { photoGradient } from '@/lib/photo-gradient';

/** The box element itself — fills the slot it is rendered into, announces nothing. */
export function PhotoBox({ refCode }: { refCode: string }) {
  return <div className="pbox" aria-hidden="true" style={{ background: photoGradient(refCode) }} />;
}
