// Saving a draft — the run itself, against the store (truth 9).
//
// `lib/draft-save.ts` holds the **pure** half: a draft's values read as the record it will become.
// This holds the half that talks to the store — resolve the state, create the record, let the draft
// go — and it lives in a plain module rather than in the Server Action so it can be driven directly by
// the witness (`developer-workspace/scripts/task-004/draft-save-check.ts`), which cannot load a
// `"use server"` file (that file reaches Clerk through `lib/session`, which needs a live request).
//
// The action is then exactly what it should be: check the session, take the actor's id from it, and
// call this. Nothing here rechecks the session, so **nothing but the action may call it** — the actor
// id is passed in precisely because only the action may know it.

import "server-only";
import { randomUUID } from "node:crypto";
import { storeQueryRefusing } from "./store-guard";
import { readCarInput, type FieldError } from "./car-input";
import type { DraftFields } from "./device-draft";
import type { EnquiryValues } from "./enquiry-form";
import { carFormFacts, toCarForm } from "./car-form";
import { carCreateStatement } from "./car-create";
import { carChangeCheck, CHANGE_CHECK_VERSION, enquiryChangeCheck } from "./change-check";
import { SOLD_SECTION } from "./sale";
import { readDraftAsCar, readEnquirySeed } from "./draft-save";
import { enquiryCreateStatement } from "./enquiry-create";
import {
  carStateById,
  carStateByLabel,
  deleteDraft,
  enquiryStateExists,
  enquiryStateIdByLabel,
  enquiryStateLabelById,
  getDraft,
  type DraftRow,
} from "./draft-store";

export type SaveDraftResult =
  | { ok: true; kind: "car" | "enquiry"; ref?: string }
  | { ok: false; errors: FieldError[] };

/** Saving a draft's form in place: the row stays, nothing is created, no code is spent. */
export type SaveDraftFieldsResult = { ok: true } | { ok: false; errors: FieldError[] };

/**
 * What the owner's edit form carries into a save. A car posts its whole form (the office form's own
 * names); an enquiry posts the four values the record has. The payload's kind must match the row's:
 * a car form cannot become an enquiry, or the other way round.
 */
export type DraftSavePayload =
  | { kind: "car"; form: FormData }
  | { kind: "enquiry"; values: EnquiryValues };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A draft field as text: a repeated value keeps its first entry (the form never repeats these). */
function fieldText(value: DraftFields[string] | undefined): string {
  if (Array.isArray(value)) return value.length > 0 ? value[0].trim() : "";
  return typeof value === "string" ? value.trim() : "";
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
 * and because every write here is idempotent under its own key, a retry of the whole save converges on
 * the one record and one deleted draft.
 */
export async function runSaveDraft(
  draftId: string,
  chosen: string,
  actorId: string,
  payload: DraftSavePayload | null = null,
): Promise<SaveDraftResult> {
  if (!UUID.test(draftId)) {
    return { ok: false, errors: [{ field: "draftId", message: "This draft could not be identified" }] };
  }

  const draft = await getDraft(draftId);
  if (draft === null) {
    return { ok: false, errors: [{ field: "draftId", message: "That draft is no longer waiting" }] };
  }
  if (payload !== null && payload.kind !== draft.kind) {
    return {
      ok: false,
      errors: [
        {
          field: "draftId",
          message: payload.kind === "car" ? "This draft is not a car" : "This draft is not an enquiry",
        },
      ],
    };
  }

  let createdRef: string | undefined;

  if (draft.kind === "car") {
    const state = await carStateForSave(draft, chosen);
    if (!state.ok) {
      return { ok: false, errors: [{ field: "stateId", message: "Choose one of the car's four states" }] };
    }

    // The edited form is judged by the very reader the office form uses; an untouched upload is
    // rebuilt from + read against `values` (truth 9). The draft row stays the truth for photos:
    // the edit form writes them there as it goes, so a browser list cannot add or reorder them.
    const read =
      payload?.kind === "car"
        ? readCarInput(toCarForm(payload.form))
        : readDraftAsCar(draft.values, state.id);
    if (!read.ok) return { ok: false, errors: read.errors };

    const facts = await carFormFacts(read.value, draft.imageAssetIds);
    if (!facts.ok) return { ok: false, errors: facts.errors };

    // A car cannot *start* Sold — the same guard the add form sits behind. A draft that named Sold is
    // asked to save without it, then the car is marked sold (`createCar`'s own rule, kept whole).
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
      actorId,
    });
    const attempt = await storeQueryRefusing<{ ref: string }[]>(text, params, {
      field: "draftId",
      action: "That car could not be created",
    });
    if (!attempt.ok) return attempt;
    const rows = attempt.rows;
    if (!rows[0]?.ref) {
      return { ok: false, errors: [{ field: "draftId", message: "The car could not be created. Try again." }] };
    }
    createdRef = rows[0].ref;
  } else {
    const state = await enquiryStateForSave(draft, chosen);
    if (!state.ok) {
      return { ok: false, errors: [{ field: "stateId", message: "Choose one of the enquiry's states" }] };
    }

    const read = readEnquirySeed(
      payload?.kind === "enquiry" ? { ...payload.values } : draft.values,
    );
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
    const attempt = await storeQueryRefusing<{ id: string }[]>(text, params, {
      field: "draftId",
      action: "That enquiry could not be created",
    });
    if (!attempt.ok) return attempt;
    const rows = attempt.rows;
    if (!rows[0]?.id) {
      return { ok: false, errors: [{ field: "draftId", message: "The enquiry could not be created. Try again." }] };
    }
  }

  // The draft has become the record: it is no longer waiting. Truth 9 — "saving one draft creates one
  // record and leaves its brother drafts untouched", so only this row goes.
  //
  // If this last write fails the record already exists, and that changes what must be said: the
  // message names the exact half-done state and does **not** invite a retry, because saving the same
  // draft again would make a second record (DR25: never an unverified reassurance, never advice that
  // makes things worse).
  try {
    await deleteDraft(draft.id);
  } catch (error) {
    console.error("[store] write failed — the draft could not be cleared after its record was made", error);
    return {
      ok: false,
      errors: [
        {
          field: "draftId",
          message: "The record was made, but the draft could not be cleared — reload before saving it again.",
        },
      ],
    };
  }
  return { ok: true, kind: draft.kind, ref: createdRef };
}

/**
 * Save a draft's edit **in place** (owner ruling 2026-10-20, #3).
 *
 * Nothing is created: the row stays waiting, no `TS-####` is spent, and no activity is written.
 * The values are not judged by `readCarInput` / `readEnquirySeed` — a draft is exactly the place an
 * incomplete record is allowed to be (truth 9). The state, when one is chosen, must still exist:
 * a car's must be one of the four primaries; an enquiry's any state it keeps, or none at all.
 */
export async function runSaveDraftAsDraft(
  draftId: string,
  fields: DraftFields,
  chosen: string,
): Promise<SaveDraftFieldsResult> {
  if (!UUID.test(draftId)) {
    return { ok: false, errors: [{ field: "draftId", message: "This draft could not be identified" }] };
  }

  const draft = await getDraft(draftId);
  if (draft === null) {
    return { ok: false, errors: [{ field: "draftId", message: "That draft is no longer waiting" }] };
  }
  // An enquiry has no edit layer: its four values are the record's own names, so the save writes
  // them straight to `values`. No state is a real choice (`enquiry_state_id` is nullable), so the
  // empty choice clears the label rather than keeping the old one.
  if (draft.kind === "enquiry") {
    let label: string | null = null;
    if (chosen !== "") {
      if (!UUID.test(chosen)) {
        return { ok: false, errors: [{ field: "stateId", message: "Choose one of the enquiry's states" }] };
      }
      label = await enquiryStateLabelById(chosen);
      if (label === null) {
        return { ok: false, errors: [{ field: "stateId", message: "Choose one of the enquiry's states" }] };
      }
    }

    const values = {
      name: fieldText(fields.name),
      number: fieldText(fields.number),
      asked_for: fieldText(fields.asked_for),
      note: fieldText(fields.note),
    };

    const attempt = await storeQueryRefusing<{ id: string }[]>(
      `UPDATE draft
          SET values = $2::jsonb,
              state_label = $3,
              updated_at = now()
        WHERE id = $1
          AND kind = 'enquiry'
        RETURNING id`,
      [draftId, JSON.stringify(values), label],
      { field: "draftId", action: "That draft could not be saved" },
    );
    if (!attempt.ok) return attempt;
    if (attempt.rows.length === 0) {
      return { ok: false, errors: [{ field: "draftId", message: "That draft is no longer waiting" }] };
    }

    return { ok: true };
  }

  let label = draft.stateLabel;
  if (chosen !== "") {
    if (!UUID.test(chosen)) {
      return { ok: false, errors: [{ field: "stateId", message: "Choose one of the car's four states" }] };
    }
    const state = await carStateById(chosen);
    if (state === null || state.kind !== "primary") {
      return { ok: false, errors: [{ field: "stateId", message: "Choose one of the car's four states" }] };
    }
    label = state.label;
  }

  const attempt = await storeQueryRefusing<{ id: string }[]>(
    `UPDATE draft
        SET form = $2::jsonb,
            state_label = $3,
            updated_at = now()
      WHERE id = $1
        AND kind = 'car'
      RETURNING id`,
    [draftId, JSON.stringify(fields), label],
    { field: "draftId", action: "That draft could not be saved" },
  );
  if (!attempt.ok) return attempt;
  if (attempt.rows.length === 0) {
    return { ok: false, errors: [{ field: "draftId", message: "That draft is no longer waiting" }] };
  }

  return { ok: true };
}
