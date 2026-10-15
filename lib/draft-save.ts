// Turning a draft back into the record it was carrying.
//
// A draft holds what a file said, keyed by the record's own field names and already parsed
// (`readCarFields`, `lib/car-input.ts`; `parseEnquirySheet`, `lib/enquiry-read.ts`). Saving one
// creates the record — and **the record's own rules are enforced here, at the save, never at the
// upload** (truth 9: "a draft is allowed to be incomplete"). So this module does one thing: rebuild
// the shape the save's own reader takes, and hand it over.
//
// There is deliberately **no second rule**. A car draft is turned back into the office form's
// strings and judged by `readCarInput` — the very reader the office form is judged by — so a car
// saved from a file and a car typed by hand cannot be described two ways. An enquiry has no create
// action today, so its rule is written once, here.
//
// Pure: values in, the save's own input out. No store, no session, no clock.

import type { CarFormInput, CarInputResult, FieldError } from "./car-input";
import { readCarInput } from "./car-input";

/** A value the draft carries, as the form wants it: trimmed text, or `""` when it carried none. */
function asText(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

/** A number the draft carries, as the form wants it (its digits), or `""`. */
function asDigits(value: unknown): string {
  return typeof value === "number" ? String(value) : asText(value);
}

/**
 * Kobo back to the naira text the form takes. Two decimals always, so the amount survives the round
 * trip exactly — `nairaDigits`/`formatNaira` are *display* helpers and drop the kobo, so they must
 * not be used here.
 */
function asNaira(value: unknown): string {
  return typeof value === "number" ? (value / 100).toFixed(2) : asText(value);
}

/** The feature list the form takes: one feature per line. */
function asLines(value: unknown): string {
  return Array.isArray(value) ? value.map((line) => String(line)).join("\n") : asText(value);
}

/**
 * The office form's strings, rebuilt from a car draft's values and the state chosen at the save.
 *
 * A draft carries no cost lines, no secondary states and no sale — a file carries the record's
 * editable fields "and nothing else" (truth 9) — so the form is rebuilt with none of them, and the
 * owner adds those in the office.
 */
export function carFormFromDraft(values: Record<string, unknown>, stateId: string): CarFormInput {
  return {
    brand: asText(values.brand),
    model: asText(values.model),
    trim: asText(values.trim),
    year: asDigits(values.year),
    exteriorColor: asText(values.exterior_color),
    interiorColor: asText(values.interior_color),
    mileage: asDigits(values.mileage),
    features: asLines(values.features),
    note: asText(values.note),
    privateNote: asText(values.private_note),
    wasPrice: asNaira(values.was_price_kobo),
    arrivalNote: asText(values.arrival_note),
    price: asNaira(values.doorstep_price_kobo),
    stateId,
  };
}

/** A car draft, judged by the save's own reader (`readCarInput`) against the chosen state. */
export function readDraftAsCar(values: Record<string, unknown>, stateId: string): CarInputResult {
  return readCarInput(carFormFromDraft(values, stateId));
}

/** An enquiry's editable fields, ready to store — the five the recipe knows. */
export type EnquirySeed = {
  name: string;
  number: string;
  asked_for: string;
  note: string | null;
};

export type EnquirySeedResult = { ok: true; seed: EnquirySeed } | { ok: false; errors: FieldError[] };

/**
 * Judge an enquiry draft. The enquiry's own rule, written once: the three the store will not take
 * empty (`name`, `number`, `asked_for`) are required at the save; the note may be absent.
 */
export function readEnquirySeed(values: Record<string, unknown>): EnquirySeedResult {
  const errors: FieldError[] = [];

  const name = asText(values.name).trim();
  if (name === "") errors.push({ field: "name", message: "Enter the customer's name" });

  const number = asText(values.number).trim();
  if (number === "") errors.push({ field: "number", message: "Enter the phone number" });

  const askedFor = asText(values.asked_for).trim();
  if (askedFor === "") errors.push({ field: "asked_for", message: "Enter what they asked for" });

  if (errors.length > 0) return { ok: false, errors };

  const note = asText(values.note).trim();
  return { ok: true, seed: { name, number, asked_for: askedFor, note: note === "" ? null : note } };
}
