import '../../../car/car.css';
import { notFound } from 'next/navigation';
import { getOfficeSecondaryStates, getOfficeStates } from '@/lib/office';
import { requireOfficeSession } from '@/lib/session';
import { imageUrl } from '@/lib/sanity';
import { isAssetRef } from '@/lib/photo-rules';
import { shortAge } from '@/lib/office-time';
import { getDraft } from '@/lib/draft-store';
import { carFormDataFromDraft, type DraftFormState } from '@/lib/draft-form';
import { CarForm } from '../../../car/car-client';

// A draft is the store's row, so this page renders per request — never from a build-time snapshot.
export const dynamic = 'force-dynamic';

/* Editing a car draft (owner ruling 2026-10-20, #3): "a draft is completely editable", and editing
   one opens the normal Add/Edit car page. The route is the draft's own id, not a `TS-####` — a draft
   has no code until it is saved. The form is the same `CarForm`; in draft mode its photos live on
   the draft row and its two buttons are "Save as draft" (keep waiting) and "Save car" (make the
   record). Everything shown is `form ?? values`: the owner's edit when there is one, the file's own
   reading when there is not. */

function photoURL(assetId: string): string {
  if (!isAssetRef(assetId)) return '';
  try {
    return imageUrl(assetId);
  } catch {
    return '';
  }
}

export default async function EditCarDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireOfficeSession();
  const isDemo = session.space === 'demo';
  const { id } = await params;

  const [draft, primaries, secondaries] = await Promise.all([
    getDraft(id),
    getOfficeStates(),
    getOfficeSecondaryStates(),
  ]);
  if (draft === null || draft.kind !== 'car') notFound();

  const states: DraftFormState[] = primaries.map((state) => ({
    id: state.id,
    label: state.label,
    section: state.section,
    isNewArrival: state.isNewArrival,
  }));

  const photos = draft.imageAssetIds.map((assetId) => ({ assetId, url: photoURL(assetId) }));
  const data = carFormDataFromDraft(draft, states, photos, shortAge(draft.createdAt, new Date()));

  return (
    <CarForm
      mode="draft"
      data={data}
      primaries={primaries}
      secondaries={secondaries}
      isDemo={isDemo}
    />
  );
}
