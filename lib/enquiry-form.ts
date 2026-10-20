// The enquiry draft's form — one small shape, and the bridge between the row and the controls.
//
// An enquiry draft is simpler than a car's: four text fields and a state. The file's own names are
// the record's (`name`, `number`, `asked_for`, `note`), so the form posts those very names and a
// "save as draft" writes them straight back to `draft.values`. There is no second edit layer here;
// the state stays the name-only column (`state_label`), as D16 requires.
//
// Pure: a `DraftRow` in, the form's strings out; a posted form in, the trimmed values out. No store,
// no session, no clock.

import type { FieldError } from "./car-input";
import type { DraftRow } from "./draft-store";

function asText(value: unknown): string {
  if (Array.isArray(value)) return value.length > 0 ? String(value[0]) : "";
  return value === undefined || value === null ? "" : String(value);
}

/** An enquiry state as the form's select needs it. */
export type EnquiryFormState = { id: string; label: string };

/** The draft's own values, in the form's own field names. */
export type EnquiryFormData = {
  draftId: string;
  draftSource: string;
  waiting: string;
  name: string;
  number: string;
  askedFor: string;
  note: string;
  /** The state the label resolves to now, or `null` when it names none or a state that is gone. */
  stateId: string | null;
  /** The name the file wrote — kept so a gone state can be named instead of silently dropped. */
  stateLabel: string | null;
};

/**
 * The form's data for one enquiry draft.
 *
 * The state is the registry row whose label is exactly the file's name; a label that is gone resolves
 * to `null` and the form asks for a state rather than inventing one. The four text values are shown
 * exactly as the file carried them — including blanks: a draft may wait incomplete.
 */
export function enquiryFormDataFromDraft(
  draft: DraftRow,
  states: readonly EnquiryFormState[],
  waiting: string,
): EnquiryFormData {
  const stateId =
    draft.stateLabel === null ? null : (states.find((state) => state.label === draft.stateLabel)?.id ?? null);

  return {
    draftId: draft.id,
    draftSource: draft.sourceFilename,
    waiting,
    name: asText(draft.values.name),
    number: asText(draft.values.number),
    askedFor: asText(draft.values.asked_for),
    note: asText(draft.values.note),
    stateId,
    stateLabel: draft.stateLabel,
  };
}

/** The enquiry's four editable values, as the save's own rule names them. */
export type EnquiryValues = {
  name: string;
  number: string;
  asked_for: string;
  note: string;
};

export type EnquiryValuesResult =
  | { ok: true; values: EnquiryValues }
  | { ok: false; errors: FieldError[] };

// A draft is a form, not a file store. These bounds are generous enough for a real enquiry and small
// enough that a public action cannot be used to park arbitrary text in the draft row.
const LIMITS: Record<keyof EnquiryValues, number> = {
  name: 200,
  number: 60,
  asked_for: 2000,
  note: 5000,
};

const LABELS: Record<keyof EnquiryValues, string> = {
  name: "The customer's name",
  number: "The phone number",
  asked_for: "What they asked for",
  note: "The note",
};

/**
 * Take a posted enquiry form and keep its four values, trimmed.
 *
 * Nothing is required here: "Save as draft" is allowed to keep an incomplete enquiry (truth 9), and
 * the record's own rule (`readEnquirySeed`) is what asks for the three required values on the save.
 * An over-long value is a field error rather than a stored wall of text.
 */
export function enquiryValuesFromForm(form: FormData): EnquiryValuesResult {
  const errors: FieldError[] = [];
  const values = {} as EnquiryValues;

  for (const field of Object.keys(LIMITS) as (keyof EnquiryValues)[]) {
    const raw = form.get(field);
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value.length > LIMITS[field]) {
      errors.push({ field, message: `${LABELS[field]} is too long to keep` });
    }
    values[field] = value;
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, values };
}
