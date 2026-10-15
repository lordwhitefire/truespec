import "./enquiries.css";
import { getEnquiries, getEnquiryStateRegistry } from "@/lib/office";
import { longDay, shortAge } from "@/lib/office-time";
import { requireOfficeSession } from "@/lib/session";
import { Enquiries } from "./enquiries-client";

// The board is the store's rows, so this page renders per request — never from a build-time
// snapshot of it.
export const dynamic = "force-dynamic";

/* Enquiries — the board, drawn from the store (truth 15).

   The columns are the **enquiry-state registry**, in the registry's own order, and the cards are the
   `enquiry` rows themselves; nothing here is a seed. The board is a **display**: there is no drag
   between columns and no card-move write anywhere, because the states are labels and not stages
   (truth 13) — the one write an enquiry has lives in its own card, which can give it any state at
   any time.

   The two time strings are formatted here, in UTC, so the card and the server always agree
   (`lib/office-time.ts`). */

export default async function EnquiriesPage() {
  await requireOfficeSession();
  const [states, enquiries] = await Promise.all([getEnquiryStateRegistry(), getEnquiries()]);
  const now = new Date();

  return (
    <Enquiries
      states={states.map((state) => ({ id: state.id, label: state.label, colour: state.colour }))}
      enquiries={enquiries.map((e) => ({
        id: e.id,
        name: e.name,
        number: e.number,
        askedFor: e.askedFor,
        note: e.note,
        stateId: e.stateId,
        when: shortAge(e.createdAt, now),
        since: longDay(e.createdAt),
        imported: e.imported,
      }))}
    />
  );
}
