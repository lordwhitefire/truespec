"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireOfficeSession } from "@/lib/session";
import { storeQuery } from "@/lib/store-guard";
import { type FieldError } from "@/lib/car-input";
import { carFormFacts } from "@/lib/car-form";
import { carCreateStatement } from "@/lib/car-create";
import { carChangeCheck, CHANGE_CHECK_VERSION, enquiryChangeCheck } from "@/lib/change-check";
import { SOLD_SECTION } from "@/lib/sale";
import { readDraftAsCar, readEnquirySeed } from "@/lib/draft-save";
import { enquiryCreateStatement } from "@/lib/enquiry-create";
import {
  carStateById,
  carStateByLabel,
  deleteDraft,
  enquiryStateExists,
  enquiryStateIdByLabel,
  getDraft,
  type DraftRow,
} from "@/lib/draft-store";

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

export type SaveDraftResult = { ok: true; kind: "car" | "enquiry" } | { ok: false; errors: FieldError[] };
export type DeleteDraftResult = { ok: true } | { ok: false; errors: FieldError[] };

/** The office pages a draft write changes. */
function revalidateDraftPaths(): void {
  revalidatePath("/office/drafts");
  revalidatePath("/office");
  revalidatePath("/office/inventory");
  revalidatePath("/office/enquiries");
  revalidatePath("/office/activity");
}

/**
 * Resolve the car state the save applies.
 *
 * The owner's choice wins when he made one, and is proved against the store. Otherwise the state the
 * **file named** is applied — and if that state is gone by the time he saves, the save **asks him to
 * choose** rather than inventing one (truth 9: "its state … enforced when the draft is saved"; a draft
 * never carries a state id, only the name it read).
 */
async function carStateForSave(
  draft: DraftRow,
  chosen: string,
): Promise<{ ok: true; id: string } | { ok: false }> {
  if (chosen !== "") {
    if (!UUID.test(chosen)) return { ok: false };
    const state = await carStateById(chosen);
    return state === null ? { ok: false } : { ok: true, id: state.id };
  }
  if (draft.stateLabel !== null) {
    const state = await carStateByLabel(draft.stateLabel);
    return state === null ? { ok: false } : { ok: true, id: state.id };
  }
  return { ok: false };
}

/**
 * Resolve the enquiry state the save applies. Unlike a car's, this may end up **empty**: an enquiry
 * may sit in no state (`enquiry_state_id` is nullable), so a file that named none applies none. But a
 * file that named one that is now gone still **asks** — the state is not silently dropped.
 */
async function enquiryStateForSave(
  draft: DraftRow,
  chosen: string,
): Promise<{ ok: true; id: string | null } | { ok: false }> {
  if (chosen !== "") {
    if (!UUID.test(chosen)) return { ok: false };
    return (await enquiryStateExists(chosen)) ? { ok: true, id: chosen } : { ok: false };
  }
  if (draft.stateLabel !== null) {
    const id = await enquiryStateIdByLabel(draft.stateLabel);
    return id === null ? { ok: false } : { ok: true, id };
  }
  return { ok: true, id: null };
}

/**
 * Save one draft: create the record it was carrying, then let the draft go.
 *
 * The delete runs **after** the create, so a failed create leaves the draft waiting and nothing lost;
 * and because every write in this action is idempotent under its own key, a retry of the whole save
 * converges on the one record and one deleted draft.
 */
export async function saveDraft(form: FormData): Promise<SaveDraftResult> {
  const session = await requireOfficeSession();

  const id = form.get("draftId");
  if (typeof id !== "string" || !UUID.test(id)) {
    return { ok: false, errors: [{ field: "draftId", message: "This draft could not be identified" }] };
  }

  const draft = await getDraft(id);
  if (draft === null) {
    return { ok: false, errors: [{ field: "draftId", message: "That draft is no longer waiting" }] };
  }

  const chosenRaw = form.get("stateId");
  const chosen = typeof chosenRaw === "string" ? chosenRaw.trim() : "";

  if (draft.kind === "car") {
    const state = await carStateForSave(draft, chosen);
    if (!state.ok) {
      return { ok: false, errors: [{ field: "stateId", message: "Choose one of the car's four states" }] };
    }

    const read = readDraftAsCar(draft.values, state.id);
    if (!read.ok) return { ok: false, errors: read.errors };

    const facts = await carFormFacts(read.value, draft.imageAssetIds);
    if (!facts.ok) return { ok: false, errors: facts.errors };

    // A car cannot *start* Sold — the same guard the add form sits behind. A draft that named Sold
    // is asked to save without it, then the car is marked sold (`createCar`'s own rule, kept whole).
    if (facts.value.section === SOLD_SECTION) {
      return {
        ok: false,
        errors: [{ field: "stateId", message: "A new car can't start as sold — save it first, then mark it sold" }],
      };
    }

    const { text, params } = carCreateStatement({
      id: randomUUID(),
      columns: facts.value.columns,
      costs: facts.value.costs,
      secondaryStateIds: facts.value.secondaryStateIds,
      photos: facts.value.photos,
      contentHash: carChangeCheck(facts.value.columns as unknown as Record<string, unknown>),
      hashVersion: CHANGE_CHECK_VERSION,
      actorId: session.officeUserId,
    });
    const rows = await storeQuery<{ ref: string }[]>(text, params);
    if (!rows[0]?.ref) {
      return { ok: false, errors: [{ field: "draftId", message: "The car could not be created. Try again." }] };
    }
  } else {
    const state = await enquiryStateForSave(draft, chosen);
    if (!state.ok) {
      return { ok: false, errors: [{ field: "stateId", message: "Choose one of the enquiry's states" }] };
    }

    const read = readEnquirySeed(draft.values);
    if (!read.ok) return { ok: false, errors: read.errors };

    // The change-check is computed from the values as they will be stored — the recipe's five, with
    // the resolved state in place (truth 14).
    const record: Record<string, unknown> = {
      name: read.seed.name,
      number: read.seed.number,
      asked_for: read.seed.asked_for,
      note: read.seed.note,
      enquiry_state_id: state.id,
    };
    const { text, params } = enquiryCreateStatement({
      id: randomUUID(),
      seed: read.seed,
      stateId: state.id,
      contentHash: enquiryChangeCheck(record),
      hashVersion: CHANGE_CHECK_VERSION,
    });
    const rows = await storeQuery<{ id: string }[]>(text, params);
    if (!rows[0]?.id) {
      return { ok: false, errors: [{ field: "draftId", message: "The enquiry could not be created. Try again." }] };
    }
  }

  // The draft has become the record: it is no longer waiting. Truth 9 — "saving one draft creates one
  // record and leaves its brother drafts untouched", so only this row goes.
  await deleteDraft(draft.id);
  revalidateDraftPaths();
  return { ok: true, kind: draft.kind };
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
