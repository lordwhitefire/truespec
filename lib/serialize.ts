// THE boundary (specs/showroom, design D2). Exactly one mapping produces all
// public car data, from an explicit allow-list. The output is built field by
// field — a raw row is never spread — so a cost/rate/profit field cannot leak
// by accident of serialization.
//
// The section vocabulary is not defined here: it comes from `lib/sections.ts`
// (R-SEC-5), and the row's section is resolved by that module's one rule rather
// than trusted straight from the registry column (R-SEC-2).

import { createImageUrlBuilder } from '@sanity/image-url';

import { sectionOfState, type Section } from './sections';

// The public section is the one section, sourced from `lib/sections.ts` (R-SEC-5).
export type PublicSection = Section;

export type PublicCar = {
  ref: string;
  brand: string | null;
  model: string | null;
  trim: string | null;
  year: number | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  mileageKm: number | null;
  features: string[];
  photos: string[];
  priceKobo: number;
  // ui-plan Q37: the crossed-out "was" price is real public data.
  wasPriceKobo: number | null;
  section: PublicSection;
  isNewArrival: boolean;
  // ui-plan Q38: the On Order arrival chip.
  arrivalNote: string | null;
  // Always set by the one constructor (`toPublicCar`); read by the car page's sold
  // view and by the counting rule. Not part of the public allow-list (they are
  // markers, not listing data), so they stay off `PUBLIC_CAR_FIELDS`.
  sold: boolean;
  soldAt: string | null;
};

export const PUBLIC_CAR_FIELDS: readonly (keyof PublicCar)[] = [
  'ref',
  'brand',
  'model',
  'trim',
  'year',
  'exteriorColor',
  'interiorColor',
  'mileageKm',
  'features',
  'photos',
  'priceKobo',
  'wasPriceKobo',
  'section',
  'isNewArrival',
  'arrivalNote',
] as const;

export type RawCarRow = {
  ref: string;
  brand: string | null;
  model: string | null;
  trim: string | null;
  year: number | null;
  exterior_color: string | null;
  interior_color: string | null;
  mileage: number | null;
  features: string | null;
  was_price_kobo: number | string | null;
  arrival_note: string | null;
  doorstep_price_kobo: number | string | null;
  /** The owner's state label — read for resolution only, never part of the payload (R-SEC-5). */
  state: string;
  /** The section the state registry says the state means — resolved by `lib/sections.ts` (R-SEC-2). */
  configured_section: string;
  is_new_arrival: boolean;
  sold: boolean;
  sold_at: string | null;
  photos: unknown;
};

export function parseFeatures(features: string | null): string[] {
  if (!features) return [];
  try {
    const parsed = JSON.parse(features);
    if (Array.isArray(parsed)) return parsed.map((f) => String(f));
  } catch {
    // not JSON — fall back to a newline/comma list
  }
  return features
    .split(/[\n,]/)
    .map((f) => f.trim())
    .filter(Boolean);
}

export function normalizePhotos(photos: unknown): string[] {
  if (Array.isArray(photos)) return photos.map((p) => String(p));
  if (typeof photos === 'string') {
    try {
      const parsed = JSON.parse(photos);
      if (Array.isArray(parsed)) return parsed.map((p) => String(p));
    } catch {
      return [];
    }
  }
  return [];
}

export function resolvePhotoUrl(assetId: string, projectId: string, dataset: string): string {
  // A photo row holds a Sanity asset reference and nothing else — never a third-party address
  // (task.md conflict 5). The branch that passed one through is gone: the rebuild-from-nothing
  // (Task 20) left the store holding 49 references and 0 addresses, so there is nothing left to
  // pass through. Something that is not a reference arriving here is an invariant broken, and it
  // fails here, named — rather than rendering as a plausible broken image, or quietly putting
  // someone else's media back on a public page.
  if (!assetId.startsWith('image-')) {
    throw new Error(
      `a photo row holds what is not a Sanity asset reference: ${assetId.slice(0, 80)}`
    );
  }

  // The store holds a Sanity asset id (`image-<hash>-<w>x<h>-<ext>`), which is
  // *not* the CDN path: the address drops the `image-` prefix and turns the last
  // dash into a dot (`…-1200x800.jpg`). Concatenating the id straight into the
  // path yields a 400 from the CDN, so the derivation is done by Sanity's own
  // builder rather than by hand.
  return createImageUrlBuilder({ projectId, dataset }).image(assetId).url();
}

export function isListed(row: RawCarRow): boolean {
  const hasPrice = row.doorstep_price_kobo !== null && row.doorstep_price_kobo !== undefined;
  return hasPrice && !row.sold && normalizePhotos(row.photos).length > 0;
}

export function toPublicCar(
  row: RawCarRow,
  env: { sanityProjectId: string; sanityDataset: string }
): PublicCar {
  const assetIds = normalizePhotos(row.photos);
  return {
    ref: row.ref,
    brand: row.brand,
    model: row.model,
    trim: row.trim,
    year: row.year,
    exteriorColor: row.exterior_color,
    interiorColor: row.interior_color,
    mileageKm: row.mileage,
    features: parseFeatures(row.features),
    photos: assetIds.map((id) => resolvePhotoUrl(id, env.sanityProjectId, env.sanityDataset)),
    priceKobo: Number(row.doorstep_price_kobo),
    wasPriceKobo: row.was_price_kobo === null ? null : Number(row.was_price_kobo),
    // The one state→section rule (R-SEC-2), never the raw column.
    section: sectionOfState(row.state, row.configured_section),
    isNewArrival: row.is_new_arrival,
    arrivalNote: row.arrival_note,
    sold: row.sold,
    soldAt: row.sold_at,
  };
}

export function isSpecial(car: Pick<PublicCar, 'priceKobo' | 'wasPriceKobo'>): boolean {
  return car.wasPriceKobo !== null && car.wasPriceKobo > car.priceKobo;
}
