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
  /** The `ENQ-####` the log names; a stable identifier, never the customer. */
  ref: string;
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
      ref: string;
      name: string;
      number: string;
      asked_for: string;
      note: string | null;
      enquiry_state_id: string | null;
      created_at: string | Date;
      imported: boolean;
    }[]
  >(
    `SELECT e.id, e.ref, e.name, e.number, e.asked_for, e.note, e.enquiry_state_id, e.created_at,
            (e.pdf_import_id IS NOT NULL) AS imported
       FROM enquiry e
      ORDER BY e.created_at DESC, e.name, e.id`,
  );
  return rows.map((r) => ({
    id: r.id,
    ref: r.ref,
    name: r.name,
    number: r.number,
    askedFor: r.asked_for,
    note: r.note,
    stateId: r.enquiry_state_id,
    createdAt: new Date(r.created_at).toISOString(),
    imported: r.imported,
  }));
}

/** One saved enquiry's editable details, as the edit form needs them (owner ruling 2026-10-20, #4). */
export type OfficeEnquiryEdit = {
  id: string;
  /** The `ENQ-####` the log names. */
  ref: string;
  name: string;
  number: string;
  askedFor: string;
  note: string | null;
  stateId: string | null;
};

/**
 * One saved enquiry, by id, for the edit form.
 *
 * The same five editable details the board reads, and nothing else: the change-check's ingredients
 * are read again by the action, from the store, at save time (truth 14). A malformed id is not a
 * query — it is the same "not there" the page's 404 says.
 */
export async function getOfficeEnquiryForEdit(id: string): Promise<OfficeEnquiryEdit | null> {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID.test(id)) return null;

  const rows = await storeQuery<
    {
      id: string;
      ref: string;
      name: string;
      number: string;
      asked_for: string;
      note: string | null;
      enquiry_state_id: string | null;
    }[]
  >(
    `SELECT id, ref, name, number, asked_for, note, enquiry_state_id
       FROM enquiry
      WHERE id = $1::uuid`,
    [id],
  );

  const row = rows[0];
  return row
    ? {
        id: row.id,
        ref: row.ref,
        name: row.name,
        number: row.number,
        askedFor: row.asked_for,
        note: row.note,
        stateId: row.enquiry_state_id,
      }
    : null;
}

/**
 * The office's own record of what has been done (truth 15, D20): the raw feed, newest first.
 *
 * One row is a `kind` and a `subject` and nothing else — no message, no figure. That is D20's shape,
 * and it means a screen composes the wording from the kind; nothing here invents a detail the store
 * never kept. The `subject` is the code the event names — a car's `TS-####` or an enquiry's
 * `ENQ-####` (owner ruling 2026-10-20 #4); never a customer's name or number.
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
 * The visitor's side of the same story (truth 15): a tap, as the dashboard's recent-taps panel needs
 * it, newest first and bounded by `TAP_LIMIT`.
 *
 * A tap is three facts and no more — `page`, the car's `TS-####`, and the time. The visitor's address
 * was dropped in `0011`, so there is nothing here that could identify them, and this read is the
 * office's, never a public one.
 *
 * The car's name is resolved **by the ref** (`LEFT JOIN car ON c.ref = t.car_ref`): a tap's ref
 * outlives the car, so a tap on a car that has since been removed still reads its code rather than
 * vanishing or pointing at whatever took the ref (the ref is unique and never reassigned — `0018`).
 * `car` is `null` when no row holds the ref; `carRef` is kept either way.
 */
export type OfficeTap = {
  id: string;
  /** The page the tap was made on — the visitor's path, `/` for the home page. */
  page: string;
  /** The `TS-####` the tap named, or `null` for a general tap. */
  carRef: string | null;
  /** The car's own name (year, model, trim), or `null` when no row holds the ref. */
  car: string | null;
  /** ISO instant. */
  at: string;
};

/** How many taps the dashboard panel reads at most. The feed is append-only; the cap keeps it a panel. */
export const TAP_LIMIT = 200;

/**
 * The taps, newest first, each with the car's own name resolved by the ref.
 *
 * `limit` defaults to `TAP_LIMIT`, because the reader that matters — the dashboard's recent-taps
 * panel — is a panel, and a panel shows the newest few. Pass `null` for the **whole record**: the
 * Taps tab on the Enquiries page is not a panel, and neither is an export (`lib/export.ts` reads the
 * table uncapped for the same reason — "an export is not a panel"). A list a person asked for must
 * not be quietly short. There is one query either way; `getAllOfficeTaps()` is this one with the cap
 * lifted.
 */
export async function getOfficeTaps(limit: number | null = TAP_LIMIT): Promise<OfficeTap[]> {
  const rows = await storeQuery<
    {
      id: string;
      page: string;
      car_ref: string | null;
      at: string | Date;
      year: number | null;
      model: string | null;
      trim: string | null;
    }[]
  >(
    `SELECT t.id, t.page, t.car_ref, t.at, c.year, c.model, c.trim
       FROM tap t
       LEFT JOIN car c ON c.ref = t.car_ref
      ORDER BY t.at DESC, t.id${limit === null ? "" : " LIMIT $1"}`,
    limit === null ? [] : [limit],
  );
  return rows.map((r) => ({
    id: r.id,
    page: r.page,
    carRef: r.car_ref,
    car: r.model === null ? null : label({ year: r.year, model: r.model, trim: r.trim }),
    at: new Date(r.at).toISOString(),
  }));
}

/**
 * The **whole** tap record, uncapped — what the Taps tab on the Enquiries page lists. It is
 * `getOfficeTaps()` with the panel's cap lifted: the same table, the same join, the same one query,
 * so the list and the shell's count can never disagree. (Truth 8: the figure is the taps the office
 * actually received; a list that dropped the ones past a cap would be the same lie, in rows.)
 */
export async function getAllOfficeTaps(): Promise<OfficeTap[]> {
  return getOfficeTaps(null);
}

/**
 * How many taps the office has received — the figure behind the badge (truth 8).
 *
 * It counts **every row in `tap`**, with no window and no filter, and that is the point: testing.md
 * §9 fails "the figure counting taps the office never received, or **missing the ones it did**". A
 * badge that said "today" would miss taps the office is holding, and the store keeps no "seen" mark —
 * nor can it: the dashboard is a GET, and no GET changes data (task.md line 253). So the honest
 * figure is the size of the record, and it is the same record the panel below lists.
 *
 * The badge hides at zero rather than showing a nought — it is a notice that something arrived, not
 * a statistic. The panel is where "none" is said in words.
 */
export async function getOfficeTapCount(): Promise<number> {
  const rows = await storeQuery<{ n: number }[]>(`SELECT count(*)::int AS n FROM tap`);
  return rows[0]?.n ?? 0;
}

/**
 * How many taps are **new since the office last looked** — the figure the badge now shows (owner
 * ruling, 2026-10-16).
 *
 * It counts the taps newer than the office's own seen-watermark (`tap_seen`, migration 0023): the
 * badge appears when taps arrive, clears when the taps list is viewed, and climbs again as more
 * arrive. With no watermark yet (never looked), every tap is new — the honest reading. It counts the
 * same `tap` record the Taps tab lists, so the notice and the list can never disagree.
 *
 * `getOfficeTapCount()` above stays the **all-time** figure: this is the notice's, that is the
 * record's.
 */
export async function getNewOfficeTapCount(): Promise<number> {
  const rows = await storeQuery<{ n: number }[]>(
    `SELECT count(*)::int AS n
       FROM tap
      WHERE at > COALESCE((SELECT seen_through FROM tap_seen WHERE id), '-infinity'::timestamptz)`,
  );
  return rows[0]?.n ?? 0;
}

/**
 * Advance the office's seen-watermark to the time of the tap the office has just looked at (owner
 * ruling, 2026-10-16). It is called when the Taps tab is viewed, from a **POST** Server Action —
 * never a GET (`task.md:253`; the page is a GET and a GET must not change data).
 *
 * The caller names a **tap id that was actually rendered**; the store resolves its own `at`, so the
 * watermark can only ever be a time a `tap` row really holds — a caller cannot fast-forward it into
 * the future — and any tap that arrived after the list was drawn stays "new". The watermark only
 * moves **forward** (`GREATEST`), so a stale caller can never un-see later taps. An id that no row
 * holds writes nothing.
 */
export async function markTapsSeenThrough(tapId: string): Promise<void> {
  await storeQuery(
    `INSERT INTO tap_seen (id, seen_through, updated_at)
     SELECT true, t.at, now() FROM tap t WHERE t.id = $1
     ON CONFLICT (id) DO UPDATE
       SET seen_through = GREATEST(tap_seen.seen_through, EXCLUDED.seen_through),
           updated_at = now()`,
    [tapId],
  );
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
  /**
   * The car's photos, in the order the office stores them (truth 7 — position 0 is the cover).
   * The id is what the store keeps and what a save posts back; `origin` is where the photo came
   * from (`owner upload` for anything the owner supplied), kept so a photo is not relabelled by
   * passing through the form. The address is derived on the server, never carried in the row.
   */
  photos: { assetId: string; origin: string }[];
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
  photos: { assetId: string; origin: string }[];
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
                        FROM car_secondary_state css WHERE css.car_id = c.id), '[]'::jsonb) AS secondary_state_ids,
            COALESCE((SELECT jsonb_agg(jsonb_build_object('assetId', cp.sanity_asset_id, 'origin', cp.origin)
                                       ORDER BY cp.position)
                        FROM car_photo cp WHERE cp.car_id = c.id), '[]'::jsonb) AS photos
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
    photos: r.photos,
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
