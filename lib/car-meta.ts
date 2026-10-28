import { carTitle, mileageLabel } from '../components/site/car-view';
import { formatNaira } from './money';
import { sectionLabel } from './sections';
import type { PublicCar } from './serialize';

/** Search results show roughly this much; the page title carries the full name. */
const MAX_DESCRIPTION = 160;

/**
 * The car page's meta description.
 *
 * Built from the public car only. The full sentence is preferred; when a long name or a long price
 * pushes it past 160 characters it is cut at a word boundary and marked with an ellipsis, so the
 * description never claims more than the page says and never runs past what search results show.
 */
export function carDescription(car: PublicCar, sold: boolean): string {
  const name = carTitle(car);
  const price = formatNaira(car.priceKobo);
  const mileage = mileageLabel(car);
  const details = mileage ? `${price}, ${mileage}` : price;

  if (sold) {
    return clampDescription(
      `Sold — ${name}. ${details}. See what else TrueSpec Automotive has available, imported from the USA and delivered anywhere in Nigeria.`
    );
  }

  const base = `${name} — ${details}. ${sectionLabel(car.section)} from TrueSpec Automotive, imported from the USA and delivered anywhere in Nigeria.`;

  // Prefer a complete sentence over a cut one. The shortest sentence that lands in the 150–160
  // window wins; a long name falls through to the clamp below.
  if (base.length >= 150 && base.length <= MAX_DESCRIPTION) return base;

  const onePrice = `${base} One price.`;
  if (onePrice.length >= 150 && onePrice.length <= MAX_DESCRIPTION) return onePrice;

  const noFees = `${base} One price, no fees.`;
  if (noFees.length >= 150 && noFees.length <= MAX_DESCRIPTION) return noFees;

  return clampDescription(base.length > MAX_DESCRIPTION ? base : noFees);
}

function clampDescription(value: string): string {
  if (value.length <= MAX_DESCRIPTION) return value;

  const slice = value.slice(0, MAX_DESCRIPTION - 1).trimEnd();
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace >= 120 ? slice.slice(0, lastSpace) : slice;

  return `${cut.trimEnd()}…`;
}
