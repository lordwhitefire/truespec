import { redirect } from "next/navigation";
import { requireOfficeSession } from "@/lib/session";

// The car comes from the store, so the route resolves per request.
export const dynamic = "force-dynamic";

/* The edit view is per car (owner ruling 2026-10-15): a car is edited at
   `/office/car/<ref>` — the address every inventory row links to — and a new car is
   added at `/office/car/new`. There is no single "the car" to edit, so the bare
   `/office/car` sends the owner to the inventory, where every car and the Add button
   are reachable. (The reference office-car.html edits one demo car; the product edits
   the car the owner actually opened.) */
export default async function CarPage() {
  await requireOfficeSession();
  redirect("/office/inventory");
}
