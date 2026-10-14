import "./enquiries.css";
import { requireOfficeSession } from "@/lib/session";
import { Enquiries } from "./enquiries-client";

/* Enquiries — the board is drawn from a hardcoded demo seed in the reference
   (office-enquiries.html) and enquiries have no data layer (plan §1 — the data
   model is out of scope for this layer). So the page is a thin route: it imports
   the screen's own stylesheet and mounts the client board. */

export default async function EnquiriesPage() {
  await requireOfficeSession();
  return <Enquiries />;
}
