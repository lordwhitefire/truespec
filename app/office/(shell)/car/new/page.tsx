import "../car.css";
import { getOfficeSecondaryStates, getOfficeStates } from "@/lib/office";
import { requireOfficeSession } from "@/lib/session";
import { CarForm, type CarFormData } from "../car-client";

// The states come from the store, so this page renders per request — never from a build-time
// snapshot of it.
export const dynamic = "force-dynamic";

/* Add mode — reached by route (/office/car/new). The form must allow picking a
   primary state and adding any number of secondary states (Task 10/11). Nothing
   is prefilled. */

const BLANK: CarFormData = {
  ref: "",
  added: "",
  upd: "",
  brand: "",
  model: "",
  trim: "",
  year: "",
  mileage: "",
  ext: "",
  int: "",
  price: "",
  feat: "",
  costs: {
    purchase: "",
    ship: "",
    clear: "",
    truckus: "",
    truckng: "",
    tank: "",
  },
  state: "Available",
  section: "available",
  isNew: false,
  arr: "",
  note: "",
  privateNote: "",
  wasPrice: "",
  photos: [],
};

export default async function NewCarPage() {
  await requireOfficeSession();
  const primaries = await getOfficeStates();
  const secondaries = await getOfficeSecondaryStates();
  return <CarForm mode="add" data={BLANK} primaries={primaries} secondaries={secondaries} />;
}
