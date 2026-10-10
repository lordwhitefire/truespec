import "server-only";
import { db } from "./db";
import { getConfig } from "./config";
import { countStock, type StockCounts } from "./counts";
import { isListed, toPublicCar, type PublicCar, type RawCarRow } from "./serialize";

// The only public read path. Every showroom page, count and list goes through
// the allow-list serializer here (specs/showroom, task 3.1/3.2).
const SELECT_CARS = `
  SELECT c.ref, c.brand, c.model, c.trim, c.year,
         c.exterior_color, c.interior_color, c.mileage, c.features,
         c.was_price_kobo, c.arrival_note, c.doorstep_price_kobo,
         s.section, s.is_new_arrival,
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
  const sql = db();
  const rows = (await sql.query(`${SELECT_CARS} ORDER BY c.ref`)) as RawCarRow[];
  return mapRows(rows.filter(isListed));
}

export async function getPublicCar(ref: string): Promise<PublicCar | null> {
  const sql = db();
  const rows = (await sql.query(`${SELECT_CARS} AND c.ref = $1`, [ref])) as RawCarRow[];
  const row = rows[0];
  if (!row || !isListed(row)) return null;
  return mapRows([row])[0];
}

export async function getPublicCarForView(ref: string): Promise<PublicCar | null> {
  const sql = db();
  const rows = (await sql.query(`${SELECT_CARS} AND c.ref = $1`, [ref])) as RawCarRow[];
  const row = rows[0];
  if (!row) return null;
  return mapRows([row])[0];
}

export async function getPublicCounts(): Promise<StockCounts> {
  const cars = await getPublicCars();
  return countStock(
    cars.map((c) => ({ section: c.section, isNewArrival: c.isNewArrival, sold: false })),
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const sql = db();
  const rows = (await sql.query(`SELECT value FROM setting WHERE key = $1`, [key])) as {
    value: string;
  }[];
  return rows[0]?.value ?? null;
}
