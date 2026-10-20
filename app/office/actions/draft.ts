"use server";

import { revalidatePath } from "next/cache";
import { requireOfficeSession } from "@/lib/session";
import { storeQueryRefusing, storeRefusal } from "@/lib/store-guard";
import { type FieldError } from "@/lib/car-input";
import { imageUrl } from "@/lib/sanity";
import { isAssetRef } from "@/lib/photo-rules";
import { deleteDraft } from "@/lib/draft-store";
import { draftFormFieldsFromForm } from "@/lib/draft-form";
import { enquiryValuesFromForm } from "@/lib/enquiry-form";
import { runSaveDraft, runSaveDraftAsDraft, type SaveDraftResult } from "@/lib/draft-save-run";

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

/** The draft form's two writes: keep it waiting, or make it the record. */
export type SaveDraftFormResult =
  | { ok: true; outcome: "draft" }
  | { ok: true; outcome: "car"; ref: string }
  | { ok: true; outcome: "enquiry" }
  | { ok: false; errors: FieldError[] };

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

/**
 * A draft's edit form, saved by one of its two buttons (owner ruling 2026-10-20, #3).
 *
 * `intent=draft` keeps the row waiting: a car's posted form becomes its edit layer, an enquiry's
 * four values go back to `values`, the state label follows the chosen state, and nothing is created.
 * `intent=car` / `intent=enquiry` send the same values through the record's own reader, create the
 * record, and let the draft go. The browser's `intent` is only a choice between writes; each is
 * judged on its own terms here, and a payload whose kind does not match the row is refused.
 */
export async function saveDraftForm(form: FormData): Promise<SaveDraftFormResult> {
  const session = await requireOfficeSession();

  const rawId = form.get("draftId");
  const draftId = typeof rawId === "string" ? rawId : "";
  const rawChosen = form.get("stateId");
  const chosen = typeof rawChosen === "string" ? rawChosen.trim() : "";
  const rawIntent = form.get("intent");
  const intent = rawIntent === "draft" || rawIntent === "enquiry" ? rawIntent : "car";

  if (intent === "draft") {
    const captured = draftFormFieldsFromForm(form);
    if (!captured.ok) return captured;
    const result = await runSaveDraftAsDraft(draftId, captured.form, chosen);
    if (!result.ok) return result;
    revalidateDraftPaths();
    return { ok: true, outcome: "draft" };
  }

  if (intent === "enquiry") {
    const captured = enquiryValuesFromForm(form);
    if (!captured.ok) return captured;
    const result = await runSaveDraft(draftId, chosen, session.officeUserId, {
      kind: "enquiry",
      values: captured.values,
    });
    if (!result.ok) return result;
    revalidateDraftPaths();
    return { ok: true, outcome: "enquiry" };
  }

  const result = await runSaveDraft(draftId, chosen, session.officeUserId, {
    kind: "car",
    form,
  });
  if (!result.ok) return result;
  revalidateDraftPaths();
  return { ok: true, outcome: "car", ref: result.ref ?? "" };
}

/** Delete a draft the owner does not want. The held file is left where the owner's own cleanup finds
 * it (nothing is deleted on his behalf); the record it never became consumes no code. */
export async function deleteDraftAction(form: FormData): Promise<DeleteDraftResult> {
  await requireOfficeSession();

  const id = form.get("draftId");
  if (typeof id !== "string" || !UUID.test(id)) {
    return { ok: false, errors: [{ field: "draftId", message: "This draft could not be identified" }] };
  }

  // The record's own delete is a write like any other: a store that cannot be reached is refused
  // here rather than thrown, so the drafts screen keeps its chrome (D32).
  try {
    await deleteDraft(id);
  } catch (error) {
    return storeRefusal("draftId", "That draft could not be deleted", error);
  }
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

  const attempt = await storeQueryRefusing<{ id: string }[]>(
    `UPDATE draft
        SET image_asset_ids = CASE
              WHEN COALESCE(image_asset_ids, '{}') @> ARRAY[$2]::text[]
              THEN COALESCE(image_asset_ids, '{}')
              ELSE COALESCE(image_asset_ids, '{}') || ARRAY[$2]::text[]
            END
      WHERE id = $1
      RETURNING id`,
    [id, assetId],
    { field: "photos", action: "That photo could not be added" },
  );
  if (!attempt.ok) return attempt;
  const rows = attempt.rows;
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

  const attempt = await storeQueryRefusing<{ id: string }[]>(
    `UPDATE draft
        SET image_asset_ids = array_remove(COALESCE(image_asset_ids, '{}'), $2)
      WHERE id = $1
      RETURNING id`,
    [id, assetId],
    { field: "photos", action: "That photo could not be removed" },
  );
  if (!attempt.ok) return attempt;
  const rows = attempt.rows;
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

  const attempt = await storeQueryRefusing<{ id: string }[]>(
    `UPDATE draft
        SET image_asset_ids = CASE
              WHEN COALESCE(image_asset_ids, '{}') @> ARRAY[$2]::text[]
              THEN array_prepend($2, array_remove(COALESCE(image_asset_ids, '{}'), $2))
              ELSE COALESCE(image_asset_ids, '{}')
            END
      WHERE id = $1
      RETURNING id`,
    [id, assetId],
    { field: "photos", action: "That could not be made the cover" },
  );
  if (!attempt.ok) return attempt;
  const rows = attempt.rows;
  if (rows.length === 0) {
    return { ok: false, errors: [{ field: "draftId", message: "That draft is no longer waiting" }] };
  }

  revalidateDraftPaths();
  return { ok: true };
}
