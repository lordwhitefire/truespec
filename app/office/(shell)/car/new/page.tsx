import { randomUUID } from "node:crypto";
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
  const session = await requireOfficeSession();
  const isDemo = session.space === "demo";
  const primaries = await getOfficeStates();
  const secondaries = await getOfficeSecondaryStates();
  // The key belongs to this form session: a retry, a double click or a store retry is the same car.
  // A reload is a new form, so the key is minted here rather than kept in the device draft.
  const submissionId = randomUUID();
  return (
    <CarForm
      mode="add"
      data={BLANK}
      primaries={primaries}
      secondaries={secondaries}
      submissionId={submissionId}
      isDemo={isDemo}
    />
  );
}
