import '../../../car/car.css';
import { notFound } from 'next/navigation';
import { getEnquiryStateRegistry } from '@/lib/office';
import { requireOfficeSession } from '@/lib/session';
import { shortAge } from '@/lib/office-time';
import { getDraft } from '@/lib/draft-store';
import { enquiryFormDataFromDraft } from '@/lib/enquiry-form';
import { EnquiryForm } from '@/components/office/EnquiryForm';

// An enquiry draft is the store's row, so this page renders per request — never from a snapshot.
export const dynamic = 'force-dynamic';

/* Editing an enquiry draft (owner ruling 2026-10-20, #3): "a draft is completely editable". The
   route is the draft's own id; no code exists until the save. The form is the four values the file
   carried plus the state, which is a name on the draft and becomes an id only at the save. */

export default async function EditEnquiryDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOfficeSession();
  const { id } = await params;

  const [draft, states] = await Promise.all([getDraft(id), getEnquiryStateRegistry()]);
  if (draft === null || draft.kind !== 'enquiry') notFound();

  const options = states.map((state) => ({ id: state.id, label: state.label }));
  const data = enquiryFormDataFromDraft(draft, options, shortAge(draft.createdAt, new Date()));

  return <EnquiryForm mode="draft" data={data} states={options} />;
}
