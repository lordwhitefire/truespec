import "./inventory.css";
import Link from "next/link";
import {
  getOfficeCarViews,
  getOfficeStates,
  getOfficeCounts,
  type OfficeCarView,
} from "@/lib/office";

// The cars come from the store, so this page renders per request — never from a build-time
// snapshot of it.
export const dynamic = "force-dynamic";
import { costLabelFor, isCostComplete, profitKobo, totalCostKobo } from "@/lib/money";
import { requireOfficeSession } from "@/lib/session";
import { InventoryClient, type InventoryRow } from "./inventory-client";

// Inventory — built to the reference runtime model (office-inventory.html).
// The table/cards/chips/filter/sort/delete/undo all live in the client
// component; this page maps the office read layer's rows into the display
// shape the reference uses. Every figure here is the shared rule's output:
// the section and the state list come from the office read layer (which reads
// the registry and `lib/sections.ts`), the cost name from `costLabelFor`, cost and
// profit from `lib/money.ts`, and the counts from `lib/counts.ts`. The page
// holds no state vocabulary, no section list and no kobo arithmetic.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-09-29T00:00:00.000Z" → "29 Sep 2026" (as the reference shows it).
// The Postgres driver hands timestamp columns back as JS Date objects, so
// accept both shapes and read UTC fields only.
function soldOn(v: string | Date): string {
  const d = v instanceof Date ? v : new Date(v);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function toRow(c: OfficeCarView): InventoryRow {
  const sold = c.sold_at !== null;
  const costLines = c.cost_lines;
  const cost = isCostComplete(costLines) ? totalCostKobo(costLines) : null;
  const door = c.doorstep_price_kobo === null ? null : Number(c.doorstep_price_kobo);
  const sale = c.sale_price_kobo === null ? null : Number(c.sale_price_kobo);
  return {
    ref: c.ref,
    name: [c.brand, c.model, c.trim].filter(Boolean).join(" "),
    year: c.year,
    state: c.state, // the owner's private state label — office-only
    section: c.section, // the one section identity, from lib/sections.ts
    sold,
    costLabel: costLabelFor(c.section, sold),
    mileage: `${(c.mileage ?? 0).toLocaleString("en-US")} km`,
    price: (sold ? sale ?? door : door) ?? 0,
    cost,
    profit:
      cost === null
        ? null
        : profitKobo({
            totalCostKobo: cost,
            priceKobo: sold ? null : door,
            salePriceKobo: sold ? sale : null,
          }).kobo,
    soldOn: sold ? soldOn(c.sold_at as string | Date) : undefined,
    note: c.arrival_note ?? undefined,
  };
}

export default async function InventoryPage() {
  await requireOfficeSession();
  const [views, states, counts] = await Promise.all([
    getOfficeCarViews(),
    getOfficeStates(),
    getOfficeCounts(),
  ]);
  const rows = views.map(toRow);

  return (
    <>
      <div className="hrow">
        <div>
          <h1>Inventory</h1>
          <p className="sub2">Every car, what it cost, and what it made. Only visible here — never in the showroom.</p>
        </div>
        <Link className="btn" href="/office/car">
          <i className="fa-solid fa-plus" />
          Add a car
        </Link>
      </div>

      <InventoryClient rows={rows} states={states} counts={counts} />

      <p className="note">
        <i className="fa-solid fa-lock" />
        Cost and profit appear only in the office. The public site is handed an explicit list of fields — costs are never included, even by accident.
      </p>
    </>
  );
}
