import 'server-only';
import { cache } from 'react';
import { storeQueryMain } from './store-guard';
import { getConfig } from './config';
import { countStock, type StockCounts } from './counts';
import { PUBLIC_SECTIONS } from './sections';
import { isListed, toPublicCar, type PublicCar, type RawCarRow } from './serialize';

// The only public read path. Every showroom page, count and list goes through
// the allow-list serializer here (specs/showroom, task 3.1/3.2).
const SELECT_CARS = `
  SELECT c.ref, c.brand, c.model, c.trim, c.year,
         c.exterior_color, c.interior_color, c.mileage, c.features,
         c.was_price_kobo, c.arrival_note, c.doorstep_price_kobo,
         s.label AS state, s.section AS configured_section, s.is_new_arrival,
         (sale.id IS NOT NULL) AS sold,
         sale.sold_at,
         COALESCE(
           (SELECT json_agg(p.sanity_asset_id ORDER BY p.position)
            FROM car_photo p WHERE p.car_id = c.id),
           '[]'::json
         ) AS photos
  FROM car c
  JOIN car_state s ON s.id = c.state_id
  LEFT JOIN sale ON sale.car_id = c.id
  WHERE c.deleted_at IS NULL
`;

function mapRows(rows: RawCarRow[]): PublicCar[] {
  const env = getConfig();
  return rows.map((row) => toPublicCar(row, env));
}

export async function getPublicCars(): Promise<PublicCar[]> {
  const rows = (await storeQueryMain(`${SELECT_CARS} ORDER BY c.ref`)) as RawCarRow[];
  // The showroom presents three of the four sections and never Sold (D15): a car is
  // listed only under a public section, so a Sold car is kept out even if its sale
  // record were somehow absent.
  return mapRows(rows.filter(isListed)).filter((car) => PUBLIC_SECTIONS.includes(car.section));
}

export async function getPublicCar(ref: string): Promise<PublicCar | null> {
  const rows = (await storeQueryMain(`${SELECT_CARS} AND c.ref = $1`, [ref])) as RawCarRow[];
  const row = rows[0];
  if (!row || !isListed(row)) return null;
  return mapRows([row])[0];
}

/**
 * The detail view may show a sold car so it can answer honestly, but a draft with no price or no
 * photo is not a public car: it answers 404 (FN-001). `isListed` already rejects a sold row, so the
 * sold flag is allowed through separately. Cached per request because metadata and the page both
 * read the same ref.
 */
export const getPublicCarForView = cache(async (ref: string): Promise<PublicCar | null> => {
  const rows = (await storeQueryMain(`${SELECT_CARS} AND c.ref = $1`, [ref])) as RawCarRow[];
  const row = rows[0];
  if (!row || (!isListed(row) && !row.sold)) return null;
  return mapRows([row])[0];
});

export async function getPublicCounts(): Promise<StockCounts> {
  const cars = await getPublicCars();
  return countStock(
    cars.map((c) => ({ section: c.section, isNewArrival: c.isNewArrival, sold: c.sold === true }))
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const rows = (await storeQueryMain(`SELECT value FROM setting WHERE key = $1`, [key])) as {
    value: string;
  }[];
  return rows[0]?.value ?? null;
}
