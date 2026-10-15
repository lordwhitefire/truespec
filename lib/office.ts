import "server-only";
import { storeQuery } from "./store-guard";
import { countStock, type StockCounts } from "./counts";
import { type CostLineInput } from "./money";
import { sectionOfState, type Section } from "./sections";
import { stockOverview, type MoneyTotal, type OverviewCar } from "./overview";

// Office read layer (plan §6). Costs and profit live here and reach office
// screens only — the public path never imports this module. The office reads the
// one `car` table with `cost_line` and `car_state`: there is no second car table
// and no adapter (TASK-003 re-pointed this layer; `office_car` retires in 0015).

// Two things are resolved here and nowhere else:
//
//  1. Cost lines come out of `cost_line` exactly as stored — the office's figures
//     are the same six-line rule the car form and the showroom use. A line that was
//     never entered is simply absent (or null), which is what leaves a car
//     incomplete; no total is expanded onto six lines and no arithmetic is added.
//
//  2. The section comes from the car's primary state in the registry (`car_state`),
//     resolved by the one rule (`sectionOfState`), never from the owner's state
//     label. Under D15 only a primary state carries a section; a state the registry
//     does not map to one section raises (R-SEC-2) — it is not guessed. Tombstoned
//     cars (`car.deleted_at`) are excluded here; they are read only by the clear-out
//     that waits to remove them.

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
  arrival_note: string | null;
  sold_at: string | null;
  sale_price_kobo: string | number | null;
  /** The stored cost lines, in the shared shape — `lib/money.ts` sums them. */
  cost_lines: CostLineInput[];
};

/** An office row with its section already resolved by the one rule (R-SEC-2). */
export type OfficeCarView = OfficeCarRow & { section: Section };

/**
 * One row of the owner's state registry (`car_state`) — the office's own state
 * vocabulary, in the owner's order. This is office-private data, never a section
 * list: the section comes from the same one rule as everywhere else. Office
 * screens read their state chips from here, never from a map of their own.
 */
export type OfficeState = { id: string; label: string; section: Section; isNewArrival: boolean; kind?: string };

/** The dashboard's figures, each a shared-rule total. */
export type OfficeDashboard = {
  counts: StockCounts;
  moneyTiedUp: MoneyTotal;
  projectedProfit: MoneyTotal;
  realProfit: MoneyTotal;
  /** Display extra: the sold car the office names on the real-profit card. */
  sold: { label: string | null; priceKobo: number | null } | null;
};

// bigint columns arrive as strings; keep every conversion at this edge.
function toNumber(v: string | number | null): number | null {
  return v === null ? null : Number(v);
}

// "2018 Camry XLE" — year + model + trim, the way the office names a sold car.
function label(row: Pick<OfficeCarRow, "year" | "model" | "trim">): string {
  return [row.year, row.model, row.trim].filter(Boolean).join(" ");
}

// The six-line shape no longer needs expanding: the office's rows carry the stored
// lines themselves, so the same completeness and the same sum apply on both sides.

// One office row → the shared rules' input. No arithmetic happens here.
export function toOverviewCar(row: OfficeCarView): OverviewCar {
  const sold = row.sold_at !== null;
  return {
    section: row.section,
    isNewArrival: row.is_new_arrival,
    sold,
    priceKobo: toNumber(row.doorstep_price_kobo),
    salePriceKobo: sold ? toNumber(row.sale_price_kobo) : null,
    costLines: row.cost_lines,
  };
}

// Each row comes back once per cost line, grouped here into one office row. The
// left joins keep a car that has a state but no sale and no costs yet.
type RawOfficeRow = {
  id: string;
  ref: string;
  brand: string;
  model: string;
  trim: string | null;
  year: number | null;
  mileage: number | null;
  state: string;
  is_new_arrival: boolean;
  doorstep_price_kobo: string | number | null;
  arrival_note: string | null;
  sold_at: string | null;
  sale_price_kobo: string | number | null;
  cost_kind: string | null;
  cost_amount_minor: string | null;
};

export async function getOfficeCars(): Promise<OfficeCarRow[]> {
  const rows = (await storeQuery(
    `SELECT c.id, c.ref, c.brand, c.model, c.trim, c.year, c.mileage,
            s.label AS state, s.is_new_arrival,
            c.doorstep_price_kobo, c.arrival_note,
            sale.sold_at, sale.sale_price_kobo,
            cl.kind AS cost_kind, cl.amount_minor AS cost_amount_minor
       FROM car c
       JOIN car_state s ON s.id = c.state_id
       LEFT JOIN sale ON sale.car_id = c.id
       LEFT JOIN cost_line cl ON cl.car_id = c.id
      WHERE c.deleted_at IS NULL
      ORDER BY c.ref, cl.kind`,
  )) as RawOfficeRow[];

  const byRef = new Map<string, OfficeCarRow>();
  for (const r of rows) {
    let car = byRef.get(r.id);
    if (!car) {
      car = {
        ref: r.ref,
        brand: r.brand,
        model: r.model,
        trim: r.trim,
        year: r.year,
        mileage: r.mileage,
        state: r.state,
        is_new_arrival: r.is_new_arrival,
        doorstep_price_kobo: r.doorstep_price_kobo,
        arrival_note: r.arrival_note,
        sold_at: r.sold_at,
        sale_price_kobo: r.sale_price_kobo,
        cost_lines: [],
      };
      byRef.set(r.id, car);
    }
    if (r.cost_kind !== null) {
      // bigint arrives as a string; the conversion stays at this edge.
      car.cost_lines.push({ kind: r.cost_kind, amountMinor: toNumber(r.cost_amount_minor) });
    }
  }
  return [...byRef.values()];
}

// State label → the section the registry says it means (the only section source).
// Only a primary state carries a section (D15); a car's state is always a primary.
async function sectionsByState(): Promise<Map<string, string>> {
  const rows = (await storeQuery(
    `SELECT label, section FROM car_state WHERE kind = 'primary'`,
  )) as {
    label: string;
    section: string;
  }[];
  return new Map(rows.map((r) => [r.label, r.section]));
}

/** Office rows with their section resolved by `lib/sections.ts`, never by a label map. */
export async function getOfficeCarViews(): Promise<OfficeCarView[]> {
  const [rows, byState] = await Promise.all([getOfficeCars(), sectionsByState()]);
  return rows.map((row) => ({
    ...row,
    section: sectionOfState(row.state, byState.get(row.state)),
  }));
}

/**
 * The four primary states, in the owner's order — each carrying the one section it
 * names (D15: a section and a primary state are one). The office's state chips and
 * the car form's label→section map read this; a secondary state carries no section
 * and is read separately, so it does not appear here. Each section is resolved by the
 * same one rule (`sectionOfState`), so the registry cannot drift from `lib/sections.ts`.
 */
export async function getOfficeStates(): Promise<OfficeState[]> {
  const rows = (await storeQuery(
    `SELECT id, label, section, is_new_arrival FROM car_state
      WHERE kind = 'primary' ORDER BY sort, label`,
  )) as { id: string; label: string; section: string; is_new_arrival: boolean }[];
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    section: sectionOfState(r.label, r.section),
    isNewArrival: r.is_new_arrival,
  }));
}

/** The office counts, from the one counting rule (R-CNT-5) over the office rows. */
export async function getOfficeCounts(): Promise<StockCounts> {
  return countStock((await getOfficeCarViews()).map(toOverviewCar));
}

export async function getOfficeDashboard(): Promise<OfficeDashboard> {
  const views = await getOfficeCarViews();
  const overview = stockOverview(views.map(toOverviewCar));
  const firstSold = views.find((v) => v.sold_at !== null) ?? null;
  return {
    counts: overview.counts,
    moneyTiedUp: overview.moneyTiedUp,
    projectedProfit: overview.projectedProfit,
    realProfit: overview.realProfit,
    sold: firstSold
      ? { label: label(firstSold), priceKobo: toNumber(firstSold.sale_price_kobo) }
      : null,
  };
}

export async function getOfficeSecondaryStates(): Promise<OfficeState[]> {
  const rows = (await storeQuery<
    { id: string; label: string; section: string; is_new_arrival: boolean; kind: string }[]
  >(
    `SELECT id, label, section, is_new_arrival, kind
       FROM car_state
      WHERE kind = 'secondary'
      ORDER BY sort, label`,
  )) as { id: string; label: string; section: string; is_new_arrival: boolean; kind: string }[];
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    section: sectionOfState(r.label, r.section),
    isNewArrival: r.is_new_arrival,
    kind: r.kind,
  }));
}
