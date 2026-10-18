import "./inventory.css";
import Link from "next/link";
import {
  getOfficeCarViews,
  getOfficeStates,
  getOfficeCounts,
  getTombstonedCars,
  type OfficeCarView,
} from "@/lib/office";

// The cars come from the store, so this page renders per request — never from a build-time
// snapshot of it.
export const dynamic = "force-dynamic";
import { costLabelFor, isCostComplete, profitKobo, totalCostKobo } from "@/lib/money";
import { requireOfficeSession } from "@/lib/session";
import { CreateFromFile } from "@/components/office/CreateFromFile";
import { InventoryClient, type InventoryRow } from "./inventory-client";
import { Tombstones, type TombstoneRow } from "./tombstones";

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
function dayLabel(v: string | Date): string {
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
    id: c.id,
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
    soldOn: sold ? dayLabel(c.sold_at as string | Date) : undefined,
    note: c.arrival_note ?? undefined,
  };
}

export default async function InventoryPage() {
  await requireOfficeSession();
  const [views, states, counts, tombstones] = await Promise.all([
    getOfficeCarViews(),
    getOfficeStates(),
    getOfficeCounts(),
    getTombstonedCars(),
  ]);
  const rows = views.map(toRow);
  const waiting: TombstoneRow[] = tombstones.map((t) => ({
    id: t.id,
    ref: t.ref,
    name: t.name,
    deletedOn: dayLabel(t.deletedAt),
  }));

  return (
    <>
      <div className="hrow">
        <div>
          {/* The list's heading: where focus goes when the last visible row is deleted (Task 17). */}
          <h1 id="inv-h" tabIndex={-1}>
            Inventory
          </h1>
          <p className="sub2">Every car, what it cost, and what it made. Only visible here — never in the showroom.</p>
        </div>
        <div className="hbtns">
          {/* The blank, where the upload will happen (task.md §Q2). A plain link: the response is
              the file itself, and the browser downloads what the header names. */}
          <a className="ghost" href="/api/template">
            <i className="fa-solid fa-file-arrow-down" />
            Car template
          </a>
          {/* The other half of the blank: fill it in, then send it back here. Its rows become
              **drafts**, not cars — nothing enters inventory until the owner saves them at Drafts. */}
          <CreateFromFile hint="Fill the car template, then send it back — its rows become drafts." />
          <Link className="btn" href="/office/car/new">
            <i className="fa-solid fa-plus" />
            Add a car
          </Link>
        </div>
      </div>

      <InventoryClient rows={rows} states={states} counts={counts} />

      <Tombstones rows={waiting} />

      <p className="note">
        <i className="fa-solid fa-lock" />
        Cost and profit appear only in the office. The public site is handed an explicit list of fields — costs are never included, even by accident.
      </p>
    </>
  );
}
