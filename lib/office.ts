import "server-only";
import { storeQuery } from "./store-guard";
import { countStock, type StockCounts } from "./counts";
import { type CostLineInput } from "./money";
import { sectionOfState, type Section } from "./sections";
import { stockOverview, type MoneyTotal, type OverviewCar } from "./overview";
import { type RegistryState } from "./car-state";
import { type EnquiryRegistryState } from "./enquiry-state";

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
  /** The car's key — what a write names it by (`car.id`), never a `TS-####`. */
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

/**
 * A secondary state — a stage the owner tracks, carrying **no section** (D15): a
 * section is a primary state's alone, so there is nothing here to resolve. Keeping
 * it a distinct shape is what stops `sectionOfState` being asked for a section that
 * cannot exist.
 */
export type OfficeSecondaryState = { id: string; label: string };

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
  // Sold-ness is the car's primary state (truth 5: the state comes first and the sale
  // action follows from it; D15: the showroom reads only the primary state). The sale
  // row holds only the money facts, so a car whose state is Sold and a car with a sale
  // row are the same car — the write that sets one sets the other.
  const sold = row.section === "sold";
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
        id: r.id,
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
  const firstSold = views.find((v) => v.section === "sold") ?? null;
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

export async function getOfficeSecondaryStates(): Promise<OfficeSecondaryState[]> {
  const rows = await storeQuery<{ id: string; label: string }[]>(
    `SELECT id, label
       FROM car_state
      WHERE kind = 'secondary'
      ORDER BY sort, label`,
  );
  return rows.map((r) => ({ id: r.id, label: r.label }));
}

/**
 * The whole registry, in the owner's order, as his editor shows it: the four fixed primaries first,
 * then the secondary states he creates.
 *
 * Two things are resolved here rather than on the screen. A primary's `section` goes through the one
 * rule (`sectionOfState`), so the editor cannot drift from `lib/sections.ts`; a secondary's section
 * is `null`, because a section is a primary state's alone (D15). And `cars` counts **every** car row
 * that points at the state — tombstoned ones included — because that is exactly the set the store's
 * `ON DELETE RESTRICT` refuses on, so the number beside a state and the store's own refusal can
 * never disagree.
 */
export async function getCarStateRegistry(): Promise<RegistryState[]> {
  const rows = await storeQuery<
    { id: string; label: string; colour: string; kind: string; section: string | null; cars: string | number }[]
  >(
    `SELECT c.id, c.label, c.colour, c.kind, c.section,
            CASE WHEN c.kind = 'primary'
                 THEN (SELECT count(*) FROM car WHERE state_id = c.id)
                 ELSE (SELECT count(*) FROM car_secondary_state WHERE state_id = c.id)
            END AS cars
       FROM car_state c
      ORDER BY c.kind, c.sort, c.label`,
  );
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    colour: r.colour,
    kind: r.kind === "primary" ? "primary" : "secondary",
    section: r.kind === "primary" ? sectionOfState(r.label, r.section) : null,
    cars: toNumber(r.cars) ?? 0,
  }));
}

/**
 * The enquiry-state registry, in the owner's order, as his editor shows it and as the board lays its
 * columns out (truth 10, truth 15).
 *
 * Every row is the owner's — there is no primary/secondary split here, unlike the car states — so the
 * whole registry is returned and the editor offers all of it. `enquiries` counts **every** enquiry
 * row that points at the state, which is exactly the set the store's `ON DELETE RESTRICT` refuses on,
 * so the number beside a state and the store's own refusal can never disagree. There is no `section`
 * and no `colour`-vs-`is_new_arrival` special case: an enquiry state is a label and a colour, nothing
 * more (truth 13 — it orders the board's *layout* and asserts nothing about meaning).
 *
 * Order is `sort, label`. Ties break by label so the order is total and a screen cannot shuffle.
 */
export async function getEnquiryStateRegistry(): Promise<EnquiryRegistryState[]> {
  const rows = await storeQuery<
    { id: string; label: string; colour: string; enquiries: string | number }[]
  >(
    `SELECT s.id, s.label, s.colour,
            (SELECT count(*) FROM enquiry WHERE enquiry_state_id = s.id) AS enquiries
       FROM enquiry_state s
      ORDER BY s.sort, s.label`,
  );
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    colour: r.colour,
    enquiries: toNumber(r.enquiries) ?? 0,
  }));
}

/**
 * One enquiry, as the board and its card need it (truth 15).
 *
 * Office-only data, and the office-only read: the name and the number are the customer's own details,
 * which never reach a public path. `note` is the office's note (the enquiry's `note` is the office's
 * field, not the customer's — the customer speaks through `asked_for`).
 *
 * `stateId` is nullable, because the store allows an enquiry with no state yet (`enquiry_state_id` is
 * nullable and SET NULL as the PDF goes). The board draws those in a group of their own rather than
 * inventing a state for them. `imported` is `pdf_import_id IS NOT NULL` — whether the row came from a
 * sheet or was keyed in — so the card can say where it came from without a second table.
 */
export type OfficeEnquiry = {
  id: string;
  name: string;
  number: string;
  askedFor: string;
  note: string | null;
  stateId: string | null;
  /** When it first reached the office, as an ISO instant. */
  createdAt: string;
  imported: boolean;
};

export async function getEnquiries(): Promise<OfficeEnquiry[]> {
  const rows = await storeQuery<
    {
      id: string;
      name: string;
      number: string;
      asked_for: string;
      note: string | null;
      enquiry_state_id: string | null;
      created_at: string | Date;
      imported: boolean;
    }[]
  >(
    `SELECT e.id, e.name, e.number, e.asked_for, e.note, e.enquiry_state_id, e.created_at,
            (e.pdf_import_id IS NOT NULL) AS imported
       FROM enquiry e
      ORDER BY e.created_at DESC, e.name, e.id`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    number: r.number,
    askedFor: r.asked_for,
    note: r.note,
    stateId: r.enquiry_state_id,
    createdAt: new Date(r.created_at).toISOString(),
    imported: r.imported,
  }));
}

/**
 * The office's own record of what has been done (truth 15, D20): the raw feed, newest first.
 *
 * One row is a `kind` and a `subject` and nothing else — no message, no figure. That is D20's shape,
 * and it means a screen composes the wording from the kind; nothing here invents a detail the store
 * never kept. The `subject` is the `TS-####` a car event names.
 *
 * `actor` is the operator's email, resolved by the foreign key; it is `null` when their account has
 * gone (`actor_id` is `ON DELETE SET NULL`), which the screen shows plainly rather than guessing.
 *
 * Bounded to the newest 200. The feed is append-only and never rewritten, so an unbounded read is a
 * screen that grows without limit; the cap keeps the log a screen, and `activity_event_at_idx` is the
 * index it orders by.
 */
export type OfficeActivityEvent = {
  id: string;
  kind: string;
  subject: string;
  /** ISO instant. */
  at: string;
  actor: string | null;
};

export const ACTIVITY_LIMIT = 200;

export async function getOfficeActivity(): Promise<OfficeActivityEvent[]> {
  const rows = await storeQuery<
    { id: string; kind: string; subject: string; at: string | Date; actor: string | null }[]
  >(
    `SELECT a.id, a.kind, a.subject, a.at, u.email AS actor
       FROM activity_event a
       LEFT JOIN office_user u ON u.id = a.actor_id
      ORDER BY a.at DESC, a.id
      LIMIT 200`,
  );
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    subject: r.subject,
    at: new Date(r.at).toISOString(),
    actor: r.actor,
  }));
}

/**
 * One car, as its own edit form needs it — every column the form writes, its cost
 * lines and its secondary states, found by the `TS-####` the office links by.
 *
 * This is the office read on the office path (server-only; costs never leave it).
 * The section is resolved by the one rule (`sectionOfState`), exactly as
 * `getOfficeCarViews` does, so the edit screen and every other office screen name a
 * car's section from the same source. Tombstoned cars are excluded — a car waiting
 * to be cleared is not editable.
 *
 * `null` means no live car holds that ref, which the route turns into a 404.
 */
export type OfficeCarEdit = {
  id: string;
  ref: string;
  brand: string;
  model: string;
  trim: string | null;
  year: number | null;
  mileage: number | null;
  exterior_color: string | null;
  interior_color: string | null;
  /** The stored feature list, as the JSON array text the column holds. */
  features: string | null;
  note: string | null;
  private_note: string | null;
  was_price_kobo: number | null;
  arrival_note: string | null;
  doorstep_price_kobo: number | null;
  state: string;
  section: Section;
  is_new_arrival: boolean;
  /** The sale, while the car is Sold (truth 5) — the two money facts. */
  sold_at: string | Date | null;
  sale_price_kobo: number | null;
  /**
   * The primary state this car held before it sold — the sale row's own
   * `prior_state_id`. Un-marking returns the car to it (truth 5). `null` when the car
   * is not Sold.
   */
  prior_state_id: string | null;
  prior_state_label: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  cost_lines: CostLineInput[];
  secondary_state_ids: string[];
};

type RawOfficeEdit = {
  id: string;
  ref: string;
  brand: string;
  model: string;
  trim: string | null;
  year: number | null;
  mileage: number | null;
  exterior_color: string | null;
  interior_color: string | null;
  features: string | null;
  note: string | null;
  private_note: string | null;
  was_price_kobo: string | number | null;
  arrival_note: string | null;
  doorstep_price_kobo: string | number | null;
  state: string;
  section: string;
  is_new_arrival: boolean;
  sold_at: string | Date | null;
  sale_price_kobo: string | number | null;
  prior_state_id: string | null;
  prior_state_label: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  cost_lines: { kind: string; amountMinor: string | number | null }[];
  secondary_state_ids: string[];
};

export async function getOfficeCarForEdit(ref: string): Promise<OfficeCarEdit | null> {
  const rows = (await storeQuery(
    `SELECT c.id, c.ref, c.brand, c.model, c.trim, c.year, c.mileage,
            c.exterior_color, c.interior_color, c.features, c.note, c.private_note,
            c.was_price_kobo, c.arrival_note, c.doorstep_price_kobo,
            s.label AS state, s.section, s.is_new_arrival,
            sl.sold_at, sl.sale_price_kobo, sl.prior_state_id, ps.label AS prior_state_label,
            c.created_at, c.updated_at,
            COALESCE((SELECT jsonb_agg(jsonb_build_object('kind', cl.kind, 'amountMinor', cl.amount_minor))
                        FROM cost_line cl WHERE cl.car_id = c.id), '[]'::jsonb) AS cost_lines,
            COALESCE((SELECT jsonb_agg(css.state_id)
                        FROM car_secondary_state css WHERE css.car_id = c.id), '[]'::jsonb) AS secondary_state_ids
       FROM car c
       JOIN car_state s ON s.id = c.state_id
       LEFT JOIN sale sl ON sl.car_id = c.id
       LEFT JOIN car_state ps ON ps.id = sl.prior_state_id
      WHERE c.ref = $1 AND c.deleted_at IS NULL`,
    [ref],
  )) as RawOfficeEdit[];

  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    ref: r.ref,
    brand: r.brand,
    model: r.model,
    trim: r.trim,
    year: r.year,
    mileage: r.mileage,
    exterior_color: r.exterior_color,
    interior_color: r.interior_color,
    features: r.features,
    note: r.note,
    private_note: r.private_note,
    was_price_kobo: toNumber(r.was_price_kobo),
    arrival_note: r.arrival_note,
    doorstep_price_kobo: toNumber(r.doorstep_price_kobo),
    state: r.state,
    section: sectionOfState(r.state, r.section),
    is_new_arrival: r.is_new_arrival,
    sold_at: r.sold_at,
    sale_price_kobo: toNumber(r.sale_price_kobo),
    prior_state_id: r.prior_state_id,
    prior_state_label: r.prior_state_label,
    created_at: r.created_at,
    updated_at: r.updated_at,
    cost_lines: r.cost_lines.map((c) => ({ kind: c.kind, amountMinor: toNumber(c.amountMinor) })),
    secondary_state_ids: r.secondary_state_ids,
  };
}

/**
 * The cars waiting to be cleared — the office's read of its own tombstones (truth 6).
 *
 * A deleted car is hidden from **every** office read (`getOfficeCars` and everything
 * built on it filter `deleted_at IS NULL`); this is the one place it is still named,
 * so the owner can see what is waiting and remove it for good whenever he chooses. No
 * job, rule or clock calls this — and none of them removes a car.
 */
export type TombstonedCar = {
  id: string;
  ref: string;
  /** "2018 Camry XLE" — the way the office names a car. */
  name: string;
  deletedAt: string | Date;
};

export async function getTombstonedCars(): Promise<TombstonedCar[]> {
  const rows = (await storeQuery(
    `SELECT id, ref, brand, model, trim, deleted_at
       FROM car
      WHERE deleted_at IS NOT NULL
      ORDER BY deleted_at DESC`,
  )) as {
    id: string;
    ref: string;
    brand: string | null;
    model: string | null;
    trim: string | null;
    deleted_at: string | Date;
  }[];
  return rows.map((r) => ({
    id: r.id,
    ref: r.ref,
    name: [r.brand, r.model, r.trim].filter(Boolean).join(" "),
    deletedAt: r.deleted_at,
  }));
}
