// The draft's two shapes, and the bridge between them.
//
// `values` is what the file said, keyed by the record's own names and already parsed
// (`lib/car-input.ts`, `lib/enquiry-read.ts`). `form` is the owner's edit layer, keyed by the car
// form's own HTML names and holding strings — the same strings a save posts. The rule everywhere is
// **`form ?? values`**: an unedited upload keeps working, and an edited draft shows the owner's work.
//
// This module is pure: a `DraftRow` in, the car form's `CarFormData` out. It owns the one mapping
// between the file's names (`exterior_color`, `doorstep_price_kobo`) and the form's (`exteriorColor`,
// `price`), and it bounds what a draft's `form` may hold before the row is written. No store, no
// session, no clock.

import type { CarFormData, CarCosts } from "@/app/office/(shell)/car/car-client";
import type { FieldError } from "./car-input";
import { captureFormData, type DraftFields } from "./device-draft";
import type { DraftRow } from "./draft-store";
import { carFormFromDraft } from "./draft-save";
import type { Section } from "./sections";

/** A state as the draft form needs it: the registry's id, name and section. */
export type DraftFormState = {
  id: string;
  label: string;
  section: Section;
  isNewArrival?: boolean;
};

function asText(value: unknown): string {
  if (Array.isArray(value)) return value.length > 0 ? String(value[0]) : "";
  return value === undefined || value === null ? "" : String(value);
}

function asIdList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((id): id is string => typeof id === "string" && id.trim() !== "");
  }
  if (typeof value === "string" && value.trim() !== "") return [value];
  return [];
}

const COST_KEYS: Record<keyof CarCosts, string> = {
  purchase: "cost.purchase_price",
  ship: "cost.shipping",
  clear: "cost.clearing",
  truckus: "cost.trucking_usa",
  truckng: "cost.trucking_ng",
  tank: "cost.full_tank",
};

/**
 * The recipe field's value in the form's own shape — used by the Drafts card so the card shows
 * exactly what the edit form would show. `undefined` for a field the form does not carry.
 */
const RECIPE_TO_FORM: Readonly<Record<string, keyof CarFormData>> = {
  brand: "brand",
  model: "model",
  trim: "trim",
  year: "year",
  exterior_color: "ext",
  interior_color: "int",
  mileage: "mileage",
  features: "feat",
  note: "note",
  private_note: "privateNote",
  was_price_kobo: "wasPrice",
  arrival_note: "arr",
  doorstep_price_kobo: "price",
  state_id: "state",
};

export function carFieldValue(data: CarFormData, recipe: string): string {
  const key = RECIPE_TO_FORM[recipe];
  if (!key) return "";
  const value = data[key];
  return typeof value === "string" ? value : "";
}

/**
 * The car form's data for a draft: the owner's `form` when there is one, the file's `values` when
 * there is not.
 *
 * The state is the owner's chosen id when the stored form still names a current state; otherwise the
 * file's label when the registry still holds it; otherwise the first primary — never an invented
 * state. Photos come from the draft's ordered `image_asset_ids` (the row is the truth), not from a
 * stale copy inside the form.
 */
export function carFormDataFromDraft(
  draft: DraftRow,
  primaries: readonly DraftFormState[],
  photos: readonly { assetId: string; url: string }[],
  waiting: string,
): CarFormData {
  const fromFile = carFormFromDraft(draft.values, "");
  const form = draft.form;

  const read = (name: keyof typeof fromFile): string => {
    if (form && form[name] !== undefined) return asText(form[name]);
    return asText(fromFile[name]);
  };

  const formStateId = form ? asText(form.stateId) : "";
  const stateFromForm = primaries.find((state) => state.id === formStateId);
  const stateFromLabel =
    draft.stateLabel === null ? undefined : primaries.find((state) => state.label === draft.stateLabel);
  const primary =
    stateFromForm ??
    stateFromLabel ??
    primaries[0] ?? {
      id: "",
      label: draft.stateLabel ?? "Available",
      section: "available" as Section,
    };

  const costs: CarCosts = {
    purchase: form ? asText(form[COST_KEYS.purchase]) : "",
    ship: form ? asText(form[COST_KEYS.ship]) : "",
    clear: form ? asText(form[COST_KEYS.clear]) : "",
    truckus: form ? asText(form[COST_KEYS.truckus]) : "",
    truckng: form ? asText(form[COST_KEYS.truckng]) : "",
    tank: form ? asText(form[COST_KEYS.tank]) : "",
  };

  return {
    draftId: draft.id,
    draftSource: draft.sourceFilename,
    ref: "Draft",
    added: waiting,
    upd: "",
    brand: read("brand"),
    model: read("model"),
    trim: read("trim"),
    year: read("year"),
    mileage: read("mileage"),
    ext: read("exteriorColor"),
    int: read("interiorColor"),
    price: read("price"),
    feat: read("features"),
    costs,
    state: primary.label,
    section: primary.section,
    isNew: false,
    arr: read("arrivalNote"),
    note: read("note"),
    privateNote: read("privateNote"),
    wasPrice: read("wasPrice"),
    secondaryStateIds: form ? asIdList(form.secondaryStateIds) : [],
    salePrice: form ? asText(form.salePrice) : "",
    saleDate: form ? asText(form.saleDate) : "",
    photos: photos.map((photo) => ({ ...photo })),
  };
}

/** The most a draft's edit layer may carry: a form, not a file store. */
export const DRAFT_FORM_MAX_BYTES = 64 * 1024;
const DRAFT_FORM_MAX_FIELDS = 200;
const DRAFT_FORM_MAX_FIELD_CHARS = 5000;
const DRAFT_FORM_MAX_LIST = 50;

export type DraftFormFieldsResult =
  | { ok: true; form: DraftFields }
  | { ok: false; errors: FieldError[] };

/**
 * Take a posted car form and keep only the part a draft may store.
 *
 * The action has already checked the session; this is the bound on what an edit layer may hold. Only
 * strings and string lists are kept (never a file), the bookkeeping names (`draftId`, `intent`,
 * `carId`, the photo references) are dropped because the row and the photos are their own truth, and
 * one field is capped at 5,000 characters, one list at 50 entries, the whole at 64 KB. A refusal is a
 * field error, not a thrown exception, so the form can show it beside the save.
 */
export function draftFormFieldsFromForm(form: FormData): DraftFormFieldsResult {
  const captured = captureFormData(form);
  const clean: DraftFields = {};
  let fields = 0;

  for (const [name, value] of Object.entries(captured)) {
    if (name === "draftId" || name === "intent" || name === "carId") continue;
    if (name === "photo" || name === "photos") continue;

    fields += 1;
    if (fields > DRAFT_FORM_MAX_FIELDS) {
      return {
        ok: false,
        errors: [{ field: "draftId", message: "This draft's form has too many fields to keep." }],
      };
    }

    if (Array.isArray(value)) {
      if (value.length > DRAFT_FORM_MAX_LIST) {
        return {
          ok: false,
          errors: [{ field: "draftId", message: "This draft has too many values in one field." }],
        };
      }
      if (value.some((entry) => entry.length > DRAFT_FORM_MAX_FIELD_CHARS)) {
        return {
          ok: false,
          errors: [{ field: "draftId", message: "One of this draft's values is too long to keep." }],
        };
      }
      clean[name] = value;
      continue;
    }

    if (value.length > DRAFT_FORM_MAX_FIELD_CHARS) {
      return {
        ok: false,
        errors: [{ field: "draftId", message: "One of this draft's values is too long to keep." }],
      };
    }
    clean[name] = value;
  }

  const bytes = new TextEncoder().encode(JSON.stringify(clean)).byteLength;
  if (bytes > DRAFT_FORM_MAX_BYTES) {
    return {
      ok: false,
      errors: [{ field: "draftId", message: "This draft's form is larger than a draft can hold." }],
    };
  }

  return { ok: true, form: clean };
}
