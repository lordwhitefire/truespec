"use server";

import { revalidatePath } from "next/cache";
import { requireOfficeSession } from "@/lib/session";
import { storeQuery } from "@/lib/store-guard";
import { type FieldError } from "@/lib/car-input";
import { imageUrl } from "@/lib/sanity";
import { isAssetRef } from "@/lib/photo-rules";
import { deleteDraft } from "@/lib/draft-store";
import { runSaveDraft, type SaveDraftResult } from "@/lib/draft-save-run";

/**
 * Saving a draft, and deleting one — build step 7 (truth 9).
 *
 * "An upload lands as a draft, and a draft is not a record." This is where a draft stops being one:
 * a save creates the record it was carrying, giving it its `TS-####` and its change-check **at that
 * moment** and applying the state, and the draft stops waiting. Until then nothing in `car` or
 * `enquiry` has seen it — so the board, the counts, the section lists and the showroom carry no
 * filter for a draft, and an abandoned draft burns no code and disturbs no sequence.
 *
 * A Server Action is a public endpoint, so nothing a browser sent is trusted — not the draft's id,
 * not the chosen state. The car is judged by **the very rules the office form is judged by**
 * (`lib/car-form.ts`), so a car saved from a file and a car typed by hand cannot be described two
 * ways; an enquiry by its own written-once rule (`lib/draft-save.ts`). The change-check is computed
 * here, from the values as they will be stored, never from the browser (truth 14).
 *
 * **A retry is safe.** The record's key is minted once, before the call, so every attempt of one save
 * sends the same `id`; both creates are `ON CONFLICT (id) DO NOTHING`, so a reply lost on the way back
 * converges on the one record. The draft's delete is idempotent, so it cannot remove two things.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type { SaveDraftResult };
export type DeleteDraftResult = { ok: true } | { ok: false; errors: FieldError[] };
export type DraftImageResult = { ok: true; assetId: string; url: string } | { ok: false; errors: FieldError[] };

/** The office pages a draft write changes. */
function revalidateDraftPaths(): void {
  revalidatePath("/office/drafts");
  revalidatePath("/office");
  revalidatePath("/office/inventory");
  revalidatePath("/office/enquiries");
  revalidatePath("/office/activity");
}

/**
 * Save one draft: create the record it was carrying, then let the draft go (truth 9).
 *
 * The run itself lives in `lib/draft-save-run.ts`, in a plain module rather than here, so the witness
 * can drive the real path without a live request. This action is only what an action must be: it
 * takes the actor's id from the **session** (the one thing the run may not know for itself) and
 * revalidates the pages when the draft has stopped waiting.
 */
export async function saveDraft(form: FormData): Promise<SaveDraftResult> {
  const session = await requireOfficeSession();

  const rawId = form.get("draftId");
  const draftId = typeof rawId === "string" ? rawId : "";
  const rawChosen = form.get("stateId");
  const chosen = typeof rawChosen === "string" ? rawChosen.trim() : "";

  const result = await runSaveDraft(draftId, chosen, session.officeUserId);
  if (result.ok) revalidateDraftPaths();
  return result;
}

/** Delete a draft the owner does not want. The held file is left where the owner's own cleanup finds
 * it (nothing is deleted on his behalf); the record it never became consumes no code. */
export async function deleteDraftAction(form: FormData): Promise<DeleteDraftResult> {
  await requireOfficeSession();

  const id = form.get("draftId");
  if (typeof id !== "string" || !UUID.test(id)) {
    return { ok: false, errors: [{ field: "draftId", message: "This draft could not be identified" }] };
  }

  await deleteDraft(id);
  revalidateDraftPaths();
  return { ok: true };
}

/**
 * Put a hand-added image on a draft — truth 9's "what the owner put into it", kept on the draft's own
 * row (D16: the images live on the draft, **not** in a second table), so it survives a reload exactly
 * as the draft does. The bytes went first (`uploadCarPhoto`), so this only records the reference —
 * and it is the same "bytes first, row later" order truth 7 gives every photo.
 *
 * Owner ruling (2026-10-15): persist on add, rather than hold it in the browser until the save.
 *
 * **Safe to retry.** The append is skipped when the id is already there, and the removal removes by
 * value, so a doubled request cannot store one picture twice or two positions at once.
 */
export async function addDraftImage(form: FormData): Promise<DraftImageResult> {
  await requireOfficeSession();

  const id = form.get("draftId");
  if (typeof id !== "string" || !UUID.test(id)) {
    return { ok: false, errors: [{ field: "draftId", message: "This draft could not be identified" }] };
  }

  const raw = form.get("assetId");
  const assetId = typeof raw === "string" ? raw.trim() : "";
  // Truth 7: the column never holds a web address — a value that is not an asset id is refused, so a
  // stored "address" can never be written here.
  if (!isAssetRef(assetId)) {
    return { ok: false, errors: [{ field: "photos", message: "One of those photos could not be read" }] };
  }

  const rows = await storeQuery<{ id: string }[]>(
    `UPDATE draft
        SET image_asset_ids = CASE
              WHEN COALESCE(image_asset_ids, '{}') @> ARRAY[$2]::text[]
              THEN COALESCE(image_asset_ids, '{}')
              ELSE COALESCE(image_asset_ids, '{}') || ARRAY[$2]::text[]
            END
      WHERE id = $1
      RETURNING id`,
    [id, assetId],
  );
  if (rows.length === 0) {
    return { ok: false, errors: [{ field: "draftId", message: "That draft is no longer waiting" }] };
  }

  revalidateDraftPaths();
  return { ok: true, assetId, url: imageUrl(assetId) };
}

/**
 * Take a hand-added image off a draft. By **value**, so it is idempotent: a retry finds nothing to
 * remove and leaves the row as it is. The asset itself is left alone — "nothing is deleted on his
 * behalf" (owner ruling 2026-10-15); the owner's own cleanup reports it.
 */
export async function removeDraftImage(form: FormData): Promise<DraftImageResult | { ok: true }> {
  await requireOfficeSession();

  const id = form.get("draftId");
  if (typeof id !== "string" || !UUID.test(id)) {
    return { ok: false, errors: [{ field: "draftId", message: "This draft could not be identified" }] };
  }

  const raw = form.get("assetId");
  const assetId = typeof raw === "string" ? raw.trim() : "";
  if (!isAssetRef(assetId)) {
    return { ok: false, errors: [{ field: "photos", message: "That photo could not be read" }] };
  }

  const rows = await storeQuery<{ id: string }[]>(
    `UPDATE draft
        SET image_asset_ids = array_remove(COALESCE(image_asset_ids, '{}'), $2)
      WHERE id = $1
      RETURNING id`,
    [id, assetId],
  );
  if (rows.length === 0) {
    return { ok: false, errors: [{ field: "draftId", message: "That draft is no longer waiting" }] };
  }

  revalidateDraftPaths();
  return { ok: true };
}

/**
 * Make one of a draft's images **the cover** — index 0, the picture the record will show first
 * (D16's ordered list; truth 7's "position 0 is the cover"). The listed images keep their order and
 * the chosen one moves to the front, so the set is unchanged and only the order is decided.
 *
 * The image must already be on the draft; a request naming one that is not is a no-op rather than a
 * way to add a picture without going through the upload — so this cannot be used to smuggle a
 * reference in. Idempotent: making the cover of the cover leaves the list as it is.
 */
export async function makeDraftCover(form: FormData): Promise<{ ok: true } | { ok: false; errors: FieldError[] }> {
  await requireOfficeSession();

  const id = form.get("draftId");
  if (typeof id !== "string" || !UUID.test(id)) {
    return { ok: false, errors: [{ field: "draftId", message: "This draft could not be identified" }] };
  }

  const raw = form.get("assetId");
  const assetId = typeof raw === "string" ? raw.trim() : "";
  if (!isAssetRef(assetId)) {
    return { ok: false, errors: [{ field: "photos", message: "That photo could not be read" }] };
  }

  const rows = await storeQuery<{ id: string }[]>(
    `UPDATE draft
        SET image_asset_ids = CASE
              WHEN COALESCE(image_asset_ids, '{}') @> ARRAY[$2]::text[]
              THEN array_prepend($2, array_remove(COALESCE(image_asset_ids, '{}'), $2))
              ELSE COALESCE(image_asset_ids, '{}')
            END
      WHERE id = $1
      RETURNING id`,
    [id, assetId],
  );
  if (rows.length === 0) {
    return { ok: false, errors: [{ field: "draftId", message: "That draft is no longer waiting" }] };
  }

  revalidateDraftPaths();
  return { ok: true };
}
