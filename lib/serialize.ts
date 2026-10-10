// THE boundary (specs/showroom, design D2). Exactly one mapping produces all
// public car data, from an explicit allow-list. The output is built field by
// field — a raw row is never spread — so a cost/rate/profit field cannot leak
// by accident of serialization.

export type PublicSection = "available" | "on order" | "landed";

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
  sold?: boolean;
  soldAt?: string | null;
};

export const PUBLIC_CAR_FIELDS: readonly (keyof PublicCar)[] = [
  "ref",
  "brand",
  "model",
  "trim",
  "year",
  "exteriorColor",
  "interiorColor",
  "mileageKm",
  "features",
  "photos",
  "priceKobo",
  "wasPriceKobo",
  "section",
  "isNewArrival",
  "arrivalNote",
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
  section: PublicSection;
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
  if (typeof photos === "string") {
    try {
      const parsed = JSON.parse(photos);
      if (Array.isArray(parsed)) return parsed.map((p) => String(p));
    } catch {
      return [];
    }
  }
  return [];
}

export function resolvePhotoUrl(
  assetId: string,
  projectId: string,
  dataset: string,
): string {
  // Seed/demo assets store a full URL; Sanity assets store an asset id.
  if (/^https?:\/\//.test(assetId)) return assetId;
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${assetId}`;
}

export function isListed(row: RawCarRow): boolean {
  const hasPrice = row.doorstep_price_kobo !== null && row.doorstep_price_kobo !== undefined;
  return hasPrice && !row.sold && normalizePhotos(row.photos).length > 0;
}

export function toPublicCar(
  row: RawCarRow,
  env: { sanityProjectId: string; sanityDataset: string },
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
    section: row.section,
    isNewArrival: row.is_new_arrival,
    arrivalNote: row.arrival_note,
    sold: row.sold,
    soldAt: row.sold_at,
  };
}

export function isSpecial(car: Pick<PublicCar, "priceKobo" | "wasPriceKobo">): boolean {
  return car.wasPriceKobo !== null && car.wasPriceKobo > car.priceKobo;
}
