import "./inventory.css";
import Link from "next/link";
import { getOfficeCars, type OfficeCarRow } from "@/lib/office";
import { InventoryClient, type InventoryRow } from "./inventory-client";

// Inventory — built to the reference runtime model (office-inventory.html).
// The table/cards/chips/filter/sort/delete/undo all live in the client
// component; this page only maps the office read layer's rows into the
// display shape the reference uses (naira amounts are kobo in the DB, and
// the client renders them with the reference's exact formatting).

const STATE_KEY: Record<string, InventoryRow["state"]> = {
  Available: "av",
  "On the way": "ow",
  "At port": "pt",
  Landed: "ld",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-09-29T00:00:00.000Z" → "29 Sep 2026" (as the reference shows it).
// The Postgres driver hands timestamp columns back as JS Date objects, so
// accept both shapes and read UTC fields only.
function soldOn(v: string | Date): string {
  const d = v instanceof Date ? v : new Date(v);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function toRow(c: OfficeCarRow): InventoryRow {
  const soldAt = c.sold_at;
  const sold = soldAt !== null;
  const price = c.doorstep_price_kobo === null ? 0 : Number(c.doorstep_price_kobo);
  const landed = c.landed_cost_kobo === null ? null : Number(c.landed_cost_kobo);
  return {
    ref: c.ref,
    name: [c.brand, c.model, c.trim].filter(Boolean).join(" "),
    year: c.year,
    state: sold ? "sd" : (STATE_KEY[c.state] ?? "av"),
    stLabel: sold ? "Sold" : c.state,
    mileage: `${(c.mileage ?? 0).toLocaleString("en-US")} mi`,
    price,
    landed,
    profit: landed === null ? null : price - landed,
    soldOn: sold ? soldOn(soldAt) : undefined,
    note: c.arrival_note ?? undefined,
  };
}

export default async function InventoryPage() {
  const cars = await getOfficeCars();
  const rows = cars.map(toRow);

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

      <InventoryClient rows={rows} />

      <p className="note">
        <i className="fa-solid fa-lock" />
        Landed cost and profit appear only in the office. The public site is handed an explicit list of fields — costs are never included, even by accident.
      </p>
    </>
  );
}