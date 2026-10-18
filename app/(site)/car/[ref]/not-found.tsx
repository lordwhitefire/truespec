import "@/app/(site)/car/car.css";
import { getSetting } from "@/lib/public-cars";
import { NotFoundView } from "./car-parts";

// The boundary a dead car link lands in.
//
// The page throws `notFound()` before the response starts streaming, so this view — the car page's
// own, unchanged: the same words, the same showroom chrome, the same two ways forward — answers a
// **real 404** instead of the 200 it used to be served as (task.md: "a missing car answers HTTP
// 200" was one of the findings). The chrome comes from the `(site)` layout above this segment; the
// WhatsApp number is read here because a not-found boundary receives no props (the page used to
// read it and pass it into the inline view).
export default async function CarNotFound() {
  const num = (await getSetting("whatsapp_number")) ?? "";
  return <NotFoundView num={num} />;
}
