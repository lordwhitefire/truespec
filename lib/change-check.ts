// The change-check — a row's editable details, boiled down to one short string.
//
// TASK-003 follow-up v1 (`openspec/tasks/TASK-003/key-and-hash-v1.md`, decisions 3–4).
//
// What it is for: telling "this row's details really changed" apart from "this row was written
// again with the same details". The filler runs whenever anyone likes and must be able to leave a
// row alone; the office must be able to say why it touched a row. A comparison of the stored
// `content_hash` answers both, cheaply and without trusting anybody's client.
//
// The rules, in one place:
//   * The recipe is a fixed list of fields in a fixed order — only the *editable* details. The
//     key (`id`), the code (`ref`), `is_demo`, the dates, the concurrency token (`version`) and
//     the hash itself are **not** ingredients: they are identity or bookkeeping, not detail.
//   * Values are tidied before they are used: spaces trimmed, runs of whitespace collapsed, and an
//     empty field and a missing field treated the same. A field is case-folded only where case
//     cannot matter — the customer's `number` (a phone number has no upper case).
//   * Field names and separators sit between the values, so two different rows cannot produce the
//     same text (nothing relies on guessing where one value ends).
//   * The recipe carries a version. Add or remove a field later and the version rises, and every
//     hash is recalculated once.
//
// What it is not: it is **not** identity and it is **not** security. It says "these details are the
// same", nothing about who or which row. It is computed on the server, from the values as they are
// stored, and never from a browser.

import { createHash } from 'node:crypto';

export const CHANGE_CHECK_VERSION = 1;

/** Field separator (unit separator) and record separator — control characters no detail contains. */
const SEP = '\u001f';
const REC = '\u001e';

type Kind = 'text' | 'number' | 'json';

export type Field = { name: string; kind: Kind; foldCase?: boolean };
export type Recipe = readonly Field[];

/** The car's editable details, in canonical order. Never `id`, `ref`, `is_demo`, dates, `version`. */
export const CAR_RECIPE: Recipe = [
  { name: 'brand', kind: 'text' },
  { name: 'model', kind: 'text' },
  { name: 'trim', kind: 'text' },
  { name: 'year', kind: 'number' },
  { name: 'exterior_color', kind: 'text' },
  { name: 'interior_color', kind: 'text' },
  { name: 'mileage', kind: 'number' },
  { name: 'features', kind: 'json' },
  { name: 'note', kind: 'text' },
  { name: 'private_note', kind: 'text' },
  { name: 'was_price_kobo', kind: 'number' },
  { name: 'arrival_note', kind: 'text' },
  { name: 'doorstep_price_kobo', kind: 'number' },
  { name: 'state_id', kind: 'text' },
];

/** The enquiry's editable details, in canonical order. Never `id`, `handle`, `is_demo`, `pdf_import_id`. */
export const ENQUIRY_RECIPE: Recipe = [
  { name: 'name', kind: 'text' },
  { name: 'number', kind: 'text', foldCase: true },
  { name: 'asked_for', kind: 'text' },
  { name: 'note', kind: 'text' },
  { name: 'enquiry_state_id', kind: 'text' },
];

/** Trim, collapse runs of whitespace, and fold the case when case cannot matter. */
function tidy(value: string, foldCase: boolean): string {
  const t = value.trim().replace(/\s+/g, ' ');
  return foldCase ? t.toLowerCase() : t;
}

function canonical(value: unknown, kind: Kind, foldCase: boolean): string {
  if (value === null || value === undefined) return '';
  if (kind === 'number')
    return typeof value === 'number' ? String(value) : tidy(String(value), false);
  if (kind === 'json') {
    // `features` is a list stored as JSON text. Accept either shape and produce one canonical text,
    // so the same list hashes the same however the caller happens to hold it.
    if (Array.isArray(value)) return JSON.stringify(value);
    const raw = String(value);
    try {
      return JSON.stringify(JSON.parse(raw));
    } catch {
      return tidy(raw, false);
    }
  }
  return tidy(String(value), foldCase);
}

/** The exact text that gets hashed. Exported so a reader can see how a hash was arrived at. */
export function changeCheckPreimage(recipe: Recipe, values: Record<string, unknown>): string {
  let text = `v${CHANGE_CHECK_VERSION}${REC}`;
  for (const field of recipe) {
    text += `${field.name}${SEP}${canonical(values[field.name], field.kind, Boolean(field.foldCase))}${REC}`;
  }
  return text;
}

/** The change-check: SHA-256, lowercase hex, over the canonical preimage. */
export function changeCheck(recipe: Recipe, values: Record<string, unknown>): string {
  return createHash('sha256').update(changeCheckPreimage(recipe, values), 'utf8').digest('hex');
}

export function carChangeCheck(car: Record<string, unknown>): string {
  return changeCheck(CAR_RECIPE, car);
}

export function enquiryChangeCheck(enquiry: Record<string, unknown>): string {
  return changeCheck(ENQUIRY_RECIPE, enquiry);
}
