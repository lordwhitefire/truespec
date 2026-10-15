import "./car.css";
import { getOfficeCarViews, getOfficeSecondaryStates, getOfficeStates } from "@/lib/office";
import { requireOfficeSession } from "@/lib/session";
import { CarForm, type CarFormData } from "./car-client";

// The car comes from the store, so this page renders per request — never from a build-time
// snapshot of it.
export const dynamic = "force-dynamic";

/* The reference office-car.html boots in edit mode on a single demo car
   (TS-1009, Toyota Sienna LE 2020). The product reaches the car form by route
   (plan §9 Q2): `/office/car` is the edit view of that demo subject, matching
   the reference ambient and every link the reference (and our built inventory)
   sends to the car form; `/office/car/new` is add mode.

   The form saves the columns `car` owns — brand/model/trim/year/exterior/interior/
   mileage/features, the private note, the "was" price, the arrival note, the
   doorstep price and the one primary state (Task 11). The shared fields come from
   the office read layer and the car's section from the one rule (through the
   adapter). This edit view still fills a few columns with the reference's demo
   values (private note, was-price, exterior/interior, features, photos) until the
   edit write lands (Task 12); add mode submits them for real. All six cost lines
   are naira (the rate is gone); the demo amounts are the reference's USD amounts
   at the old ₦1,000 rate, now simply naira. */

const DEMO_REF = "TS-1009";

const FORM_DEMO = {
  added: "25 Sep 2026",
  upd: "25 Sep 14:31",
  ext: "Silver",
  int: "Grey",
  feat: "8 seater\nRear entertainment screen\nReverse camera\nPower sliding doors\nTri-zone AC\nPerfect for family use",
  note: "Duty paid, immaculate. Ready for viewing.",
  privateNote: "Duty paid, immaculate. Ready for viewing.",
  wasPrice: "36500000",
  imgs: [
    "1690533683990-cbe074826091",
    "1737488247093-f4484eac67ae",
    "1659029933222-8ce502a9fa7d",
  ],
  costs: {
    purchase: "26500000",
    ship: "3200000",
    clear: "1850000",
    truckus: "470000",
    truckng: "525000",
    tank: "110000",
  },
};

export default async function CarPage() {
  await requireOfficeSession();
  const [cars, states] = await Promise.all([getOfficeCarViews(), getOfficeStates()]);
  const c = cars.find((x) => x.ref === DEMO_REF);

  const priceNaira =
    c?.doorstep_price_kobo == null ? "" : String(Number(c.doorstep_price_kobo) / 100);

  const data: CarFormData = {
    ref: c?.ref ?? DEMO_REF,
    ...FORM_DEMO,
    brand: c?.brand ?? "Toyota",
    model: c?.model ?? "Sienna",
    trim: c?.trim ?? "",
    year: c?.year != null ? String(c.year) : "",
    mileage: c?.mileage != null ? c.mileage.toLocaleString("en-US") : "",
    price: priceNaira,
    state: c?.state ?? "Available",
    section: c?.section ?? "available",
    isNew: c?.is_new_arrival ?? false,
    arr: c?.arrival_note ?? "",
  };

  // The owner's state → the one section, from the registry (the office adapter's
  // own read). The form renames its live cost figure from this, never from a map
  // of its own (R-MON-7).
  const secondaries = await getOfficeSecondaryStates();

  return <CarForm mode="edit" data={data} primaries={states} secondaries={secondaries} />;
}
