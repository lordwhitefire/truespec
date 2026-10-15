import "../car.css";
import { notFound } from "next/navigation";
import { getOfficeCarForEdit, getOfficeSecondaryStates, getOfficeStates } from "@/lib/office";
import { requireOfficeSession } from "@/lib/session";
import { imageUrl } from "@/lib/sanity";
import { isAssetRef } from "@/lib/photo-rules";
import { CarForm, type CarCosts, type CarFormData } from "../car-client";

// The car comes from the store, so this page renders per request — never from a
// build-time snapshot of it.
export const dynamic = "force-dynamic";

/* The edit view is per car (owner ruling 2026-10-15): `/office/car/TS-1008` edits that
   car, which is the one every inventory row links to. `/office/car/new` is add mode;
   the bare `/office/car` (no ref) redirects into the inventory.

   The form saves the columns `car` owns — brand/model/trim/year/exterior/interior/
   mileage/features, the private note, the "was" price, the arrival note, the doorstep
   price and the one primary state — plus its cost lines and its secondary states
   (Task 12). Every value here is the store's own; nothing is filled from a demo. The
   car's id rides along as a hidden field, so the Server Action updates the row the
   owner actually opened. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The Postgres driver hands timestamps back as JS Date objects, so accept both shapes
// and read UTC fields only (as the inventory page does).
function asDate(v: string | Date): Date {
  return v instanceof Date ? v : new Date(v);
}
function addedOn(v: string | Date): string {
  const d = asDate(v);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
function updatedAt(v: string | Date): string {
  const d = asDate(v);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${hh}:${mm}`;
}

// The stored kind → the form's cost field. This is the inverse of the form's own
// `KIND_BY_FIELD`; it lives here (server side) because the read carries stored kinds
// and the form speaks fields. The six cost kinds are `lib/money.ts`'s own set.
const FIELD_BY_KIND: Record<string, keyof CarCosts> = {
  purchase_price: "purchase",
  shipping: "ship",
  clearing: "clear",
  trucking_usa: "truckus",
  trucking_ng: "truckng",
  full_tank: "tank",
};

// kobo → the plain naira string the form's inputs hold (no symbols, no separators).
function nairaString(kobo: number | null): string {
  return kobo == null ? "" : String(kobo / 100);
}

// The stored reference → the address the browser fetches, or nothing at all.
//
// The office form holds the car's own photos (truth 7), and a photo the office cannot turn into an
// address — because the stored value is not a reference — renders as the placeholder rather than
// taking the whole edit page down with it. That is the read half of the boundary the write half
// enforces: the column never holds an address, and a value that is not a reference has no address
// to give.
function photoURL(assetId: string): string {
  if (!isAssetRef(assetId)) return "";
  try {
    return imageUrl(assetId);
  } catch {
    return "";
  }
}

export default async function EditCarPage({ params }: { params: Promise<{ ref: string }> }) {
  await requireOfficeSession();
  const { ref } = await params;

  const [car, primaries, secondaries] = await Promise.all([
    getOfficeCarForEdit(ref),
    getOfficeStates(),
    getOfficeSecondaryStates(),
  ]);
  if (!car) notFound();

  const costs: CarCosts = { purchase: "", ship: "", clear: "", truckus: "", truckng: "", tank: "" };
  for (const line of car.cost_lines) {
    const field = FIELD_BY_KIND[line.kind];
    if (field) costs[field] = nairaString(line.amountMinor);
  }

  // The column stores the feature list as a JSON array text; the form's textarea holds
  // it one per line. A malformed/absent value shows an empty list, never a crash.
  let features = "";
  if (car.features) {
    try {
      const parsed: unknown = JSON.parse(car.features);
      if (Array.isArray(parsed)) features = parsed.filter((x) => typeof x === "string").join("\n");
    } catch {
      features = "";
    }
  }

  // The sale, while the car is Sold (truth 5). The day is read in UTC — the same instant
  // the form writes it at — so the field shows back the day that was chosen.
  const soldDay = car.sold_at ? asDate(car.sold_at).toISOString().slice(0, 10) : "";

  const data: CarFormData = {
    carId: car.id,
    ref: car.ref,
    added: addedOn(car.created_at),
    upd: updatedAt(car.updated_at),
    brand: car.brand,
    model: car.model,
    trim: car.trim ?? "",
    year: car.year != null ? String(car.year) : "",
    mileage: car.mileage != null ? car.mileage.toLocaleString("en-US") : "",
    ext: car.exterior_color ?? "",
    int: car.interior_color ?? "",
    price: nairaString(car.doorstep_price_kobo),
    feat: features,
    costs,
    state: car.state,
    section: car.section,
    isNew: car.is_new_arrival,
    arr: car.arrival_note ?? "",
    note: car.note ?? "",
    privateNote: car.private_note ?? "",
    wasPrice: nairaString(car.was_price_kobo),
    salePrice: car.section === "sold" ? nairaString(car.sale_price_kobo) : "",
    saleDate: car.section === "sold" ? soldDay : "",
    priorStateId: car.prior_state_id ?? undefined,
    priorStateLabel: car.prior_state_label ?? undefined,
    photos: car.photos.map((p) => ({ assetId: p.assetId, url: photoURL(p.assetId) })),
    secondaryStateIds: car.secondary_state_ids,
  };

  return <CarForm mode="edit" data={data} primaries={primaries} secondaries={secondaries} />;
}
