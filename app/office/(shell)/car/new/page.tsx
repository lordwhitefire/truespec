import "../car.css";
import { getOfficeStates } from "@/lib/office";
import { CarForm, type CarFormData } from "../car-client";

// The states come from the store, so this page renders per request — never from a build-time
// snapshot of it.
export const dynamic = "force-dynamic";

/* Add mode — reached by route (/office/car/new). The reference's add mode
   (fillAdd) is a blank form, state "Available", no photos, and the two header
   actions hidden. Nothing is prefilled. */

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
  imgs: [],
};

export default async function NewCarPage() {
  const states = await getOfficeStates();
  const stateSections = Object.fromEntries(states.map((s) => [s.label, s.section]));
  return <CarForm mode="add" data={BLANK} stateSections={stateSections} />;
}
