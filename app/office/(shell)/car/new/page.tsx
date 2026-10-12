import "../car.css";
import { CarForm, type CarFormData } from "../car-client";

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
  isNew: false,
  arr: "",
  note: "",
  imgs: [],
};

export default function NewCarPage() {
  return <CarForm mode="add" data={BLANK} />;
}
