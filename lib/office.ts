import "server-only";
import { db } from "./db";

// Office read layer (plan §6). Costs and profit live here and reach office
// screens only — the public path never imports this module. The office demo
// dataset sits in its own table (office_car) because its refs collide with the
// public seed's refs in `car` (see migrations/0007_office.sql).

const AVAILABLE_STATES = new Set(["Available", "Landed"]);
const ON_ORDER_STATES = new Set(["On the way", "At port", "Cleared"]);

export type OfficeCarRow = {
  ref: string;
  brand: string;
  model: string;
  trim: string | null;
  year: number | null;
  mileage: number | null;
  state: string;
  is_new_arrival: boolean;
  doorstep_price_kobo: string | number | null;
  landed_cost_kobo: string | number | null;
  arrival_note: string | null;
  sold_at: string | null;
  sale_price_kobo: string | number | null;
};

export type OfficeDashboard = {
  moneyTiedUpKobo: number;
  carsInStock: number;
  profitFromCount: number;
  profitExcludedCount: number;
  projectedProfitKobo: number;
  realProfitKobo: number;
  soldCount: number;
  soldLabel: string | null;
  soldPriceKobo: number | null;
  available: number;
  newArrivals: number;
  onOrder: number;
};

// bigint columns arrive as strings; keep every conversion at this edge.
function toNumber(v: string | number | null): number | null {
  return v === null ? null : Number(v);
}

// "2018 Camry XLE" — year + model + trim, the way the office names a sold car.
function label(row: Pick<OfficeCarRow, "year" | "model" | "trim">): string {
  return [row.year, row.model, row.trim].filter(Boolean).join(" ");
}

export async function getOfficeCars(): Promise<OfficeCarRow[]> {
  const sql = db();
  return (await sql.query(
    `SELECT ref, brand, model, trim, year, mileage, state, is_new_arrival,
            doorstep_price_kobo, landed_cost_kobo, arrival_note, sold_at, sale_price_kobo
       FROM office_car
       ORDER BY ref`,
  )) as OfficeCarRow[];
}

export async function getOfficeDashboard(): Promise<OfficeDashboard> {
  const cars = await getOfficeCars();

  const inStock = cars.filter((c) => c.sold_at === null);
  const complete = inStock.filter((c) => c.landed_cost_kobo !== null);
  const sold = cars.filter((c) => c.sold_at !== null);

  // Money tied up counts every in-stock car: its landed cost where known, else
  // its doorstep price — an incomplete-cost car is still money already spent.
  const moneyTiedUpKobo = inStock.reduce((sum, c) => {
    const landed = toNumber(c.landed_cost_kobo);
    const price = toNumber(c.doorstep_price_kobo);
    return sum + (landed ?? price ?? 0);
  }, 0);

  const projectedProfitKobo = complete.reduce((sum, c) => {
    const price = toNumber(c.doorstep_price_kobo) ?? 0;
    const landed = toNumber(c.landed_cost_kobo) ?? 0;
    return sum + (price - landed);
  }, 0);

  const realProfitKobo = sold.reduce((sum, c) => {
    const sale = toNumber(c.sale_price_kobo) ?? 0;
    const landed = toNumber(c.landed_cost_kobo) ?? 0;
    return sum + (sale - landed);
  }, 0);

  const firstSold = sold[0] ?? null;

  return {
    moneyTiedUpKobo,
    carsInStock: inStock.length,
    profitFromCount: complete.length,
    profitExcludedCount: inStock.length - complete.length,
    projectedProfitKobo,
    realProfitKobo,
    soldCount: sold.length,
    soldLabel: firstSold ? label(firstSold) : null,
    soldPriceKobo: firstSold ? toNumber(firstSold.sale_price_kobo) : null,
    available: inStock.filter((c) => AVAILABLE_STATES.has(c.state)).length,
    newArrivals: inStock.filter((c) => c.is_new_arrival).length,
    onOrder: inStock.filter((c) => ON_ORDER_STATES.has(c.state)).length,
  };
}
