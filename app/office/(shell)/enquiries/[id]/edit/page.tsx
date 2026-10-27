import '../../../car/car.css';
import { notFound } from 'next/navigation';
import { getEnquiryStateRegistry, getOfficeEnquiryForEdit } from '@/lib/office';
import { requireOfficeSession } from '@/lib/session';
import { EnquiryForm } from '@/components/office/EnquiryForm';

// An enquiry is the store's row, so this page renders per request — never from a build-time snapshot.
export const dynamic = 'force-dynamic';

/* Editing a saved enquiry (owner ruling 2026-10-20, #4): every detail can change, and the activity
   log gets one entry naming the `ENQ-####` — never the customer. The route is the row's id; the
   board's Edit action (P9) is only an entry point, so the page works by URL before it exists.

   The five editable details and the state are the store's own. The form is the same one the enquiry
   draft uses, in edit mode: one button, and the save's own rule says what is missing. */

export default async function EditEnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOfficeSession();
  const { id } = await params;

  const [enquiry, states] = await Promise.all([
    getOfficeEnquiryForEdit(id),
    getEnquiryStateRegistry(),
  ]);
  if (enquiry === null) notFound();

  const options = states.map((state) => ({ id: state.id, label: state.label }));

  return (
    <EnquiryForm
      mode="edit"
      states={options}
      data={{
        id: enquiry.id,
        ref: enquiry.ref,
        name: enquiry.name,
        number: enquiry.number,
        askedFor: enquiry.askedFor,
        note: enquiry.note ?? '',
        stateId: enquiry.stateId,
      }}
    />
  );
}
