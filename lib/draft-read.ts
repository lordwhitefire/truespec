// A filled car blank, read back into drafts.
//
// This is the other half of the blank's contract (lib/template-rules.ts): the file's field names are
// turned back into cars and recipe fields by the *same* mapping that drew them, so the blank and the
// upload cannot describe a car differently.
//
// Two rules shape everything here:
//
//   * **Nothing is invented.** A field the file left blank produces no value; a value it *did* carry
//     that cannot be read produces a refusal naming the field — never a stored guess.
//   * **Nothing is dropped in silence.** A page with no car on it, a car whose values cannot be
//     read, a car beyond the blank's limit — each comes back as a **refusal** naming the page and
//     saying why. The caller reports them; this reader never quietly leaves a row out.
//
// Pure: bytes in, drafts and refusals out. No store, no session, no clock — so a filled blank can be
// read in a test without a database, and the same bytes always read the same way.

import { PDFDocument, PDFTextField, type PDFForm } from 'pdf-lib';
import { readCarFields } from './car-input';
import {
  CAR_TEMPLATE_FIELDS,
  isCarFieldNameBeyondLimit,
  readCarFieldName,
  TEMPLATE_MAX_CARS,
} from './template-rules';

/** One car read from the file — the record's fields as the file carried them, nothing more. */
export type CarDraft = {
  /** The record's editable fields the file carried — parsed, never required, never invented. */
  values: Record<string, unknown>;
  /** The state the file named, as the owner knows it, or `null` when it named none. */
  stateLabel: string | null;
};

/** A car the file could not give us: the page it was on, and why. */
export type Refusal = { page: number; reason: string };

export type CarFileRead =
  /** The file is one of ours: `cars` to keep, and a `refusal` for every row it could not give us. */
  | { ok: true; cars: CarDraft[]; refusals: Refusal[] }
  /** The file cannot be read at all. Nothing was taken from it. */
  | { ok: false; reason: string };

export const NOT_A_PDF =
  'That file is not a PDF. Download the car template from the office inventory and fill that in.';
export const PDF_UNREADABLE =
  'That PDF could not be opened. Try saving it again, or fill in a fresh template.';
export const NOT_OUR_TEMPLATE =
  'That PDF is not one of our car templates — none of its fields are ours. Download the template from the office inventory.';
export const TOO_MANY_CARS = `That file carries more than ${TEMPLATE_MAX_CARS} cars, which is more than a blank holds.`;

/** The words the owner reads for a recipe field, without the caption's parenthetical notes. */
function labelFor(recipeName: string): string {
  const words =
    CAR_TEMPLATE_FIELDS.find((field) => field.recipe === recipeName)?.words ?? recipeName;
  return words.replace(/\s*\(.*$/, '');
}

/**
 * What could not be read, in the field's own words — the reason a car was refused.
 *
 * The message is quoted exactly as its field wrote it — capital first letter included (DR12):
 * a refusal quotes a rule the owner must satisfy, and rewriting its casing for the sentence's
 * comfort can change what it appears to demand.
 */
function refusalReason(errors: readonly { field: string; message: string }[]): string {
  return errors.map((error) => `"${labelFor(error.field)}" — ${error.message}`).join('; ');
}

/** A PDF's header may sit after a short run of bytes; the first kilobyte is where a reader looks. */
function startsWithPdf(bytes: Uint8Array): boolean {
  return new TextDecoder('latin1').decode(bytes.subarray(0, 1024)).includes('%PDF-');
}

/**
 * Read a filled car blank. One car per page, in the blank's own order, so a car's number *is* the
 * page the owner sees — which is what a refusal is named by.
 */
export async function readCarFile(bytes: Uint8Array): Promise<CarFileRead> {
  if (!startsWithPdf(bytes)) return { ok: false, reason: NOT_A_PDF };

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes);
  } catch {
    return { ok: false, reason: PDF_UNREADABLE };
  }

  let form: PDFForm;
  try {
    form = doc.getForm();
  } catch {
    return { ok: false, reason: NOT_OUR_TEMPLATE };
  }

  // Group the file's fields by the car they belong to. A field this blank does not write is left
  // alone: a file carrying fields of its own is *not ours*, not something to guess a meaning for.
  const byCar = new Map<number, { carried: Record<string, string>; odd: string[] }>();
  for (const field of form.getFields()) {
    const name = field.getName();
    if (isCarFieldNameBeyondLimit(name)) return { ok: false, reason: TOO_MANY_CARS };

    const where = readCarFieldName(name);
    if (!where) continue;

    const slot = byCar.get(where.car) ?? { carried: {}, odd: [] };
    if (field instanceof PDFTextField) slot.carried[where.recipe] = field.getText() ?? '';
    else slot.odd.push(name);
    byCar.set(where.car, slot);
  }

  if (byCar.size === 0) return { ok: false, reason: NOT_OUR_TEMPLATE };

  const cars: CarDraft[] = [];
  const refusals: Refusal[] = [];

  for (const page of [...byCar.keys()].sort((a, b) => a - b)) {
    const slot = byCar.get(page) as { carried: Record<string, string>; odd: string[] };

    // A name of ours carried by something that is not a text field is a file we cannot trust.
    if (slot.odd.length > 0) {
      const named = slot.odd.map((name) => `"${name}"`).join(', ');
      refusals.push({ page, reason: `${named} is not a field this template writes as text` });
      continue;
    }

    if (!Object.values(slot.carried).some((value) => value.trim() !== '')) {
      refusals.push({ page, reason: 'no car details were filled in on this page' });
      continue;
    }

    const read = readCarFields(slot.carried);
    if (read.errors.length > 0) {
      refusals.push({ page, reason: refusalReason(read.errors) });
      continue;
    }

    cars.push({ values: read.values, stateLabel: read.stateLabel });
  }

  return { ok: true, cars, refusals };
}
