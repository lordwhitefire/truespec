// The enquiry template's fields — the blank the office downloads, and the one contract the upload
// reads it back by.
//
// One source: the enquiry's editable details are `ENQUIRY_RECIPE` (`lib/change-check.ts`), the same
// five the change-check hashes. The blank, the record and the change-check cannot describe an
// enquiry differently.
//
//   * The state is the one place a form's vocabulary differs from the store's: the owner writes the
//     state's **name** ("Talking"), never the key the store minted. The mapping is declared here,
//     once, exactly as the car template's is.
//   * Nothing else differs. A template asks for the record's editable fields and nothing else —
//     no row number, no timestamp, no handle.
//
// The blank is one customer per page, and every field's name carries the page:
// `enquiry_01_name`, `enquiry_02_name`, … That prefix is how the reader knows a file is ours rather
// than another PDF that happens to have a `name` field, and the page number is how a refusal names
// the page the owner sees.
//
// Deliberately free of `server-only` and pdf-lib: the names and words are pure, and the reader
// wants them without the PDF machinery.

import { ENQUIRY_RECIPE } from "./change-check";

/** What the download is called on disk. */
export const ENQUIRY_TEMPLATE_FILENAME = "truespec-enquiry-template.pdf";

/** What it is served as. */
export const ENQUIRY_TEMPLATE_CONTENT_TYPE = "application/pdf";

/** The heading drawn on every page. */
export const ENQUIRY_TEMPLATE_TITLE = "TrueSpec — enquiry sheet";

/** How many enquiries one blank may carry. One page is one customer. */
export const ENQUIRY_TEMPLATE_MAX = 20;

/** The count a download gets when the caller does not ask for one. */
export const ENQUIRY_TEMPLATE_DEFAULT = ENQUIRY_TEMPLATE_MAX;

/**
 * The form field's name for each recipe field. `enquiry_state_id` is the only one that differs, and
 * only in name: the owner writes the state he knows, not a key the store minted.
 */
const FORM_NAME: Readonly<Record<string, string>> = { enquiry_state_id: "state" };

/** The words the owner reads beside each field. */
const WORDS: Readonly<Record<string, string>> = {
  name: "Name",
  number: "Phone",
  asked_for: "Asked for",
  note: "Note",
  enquiry_state_id: "State",
};

export type EnquiryTemplateField = {
  /** The recipe field this blank stands for — the name the record is written with. */
  recipe: string;
  /** The name this field carries inside the PDF, before the page prefix. */
  form: string;
  /** The words drawn beside it. */
  words: string;
};

function wordsFor(recipe: string): string {
  const words = WORDS[recipe];
  if (!words) throw new Error(`the enquiry template has no words for the field "${recipe}"`);
  return words;
}

/**
 * The blank's fields, in the recipe's own order — one for each of the five editable details and not
 * one more. Built from the recipe, so it cannot be a sixth field's home by accident.
 */
export const ENQUIRY_TEMPLATE_FIELDS: readonly EnquiryTemplateField[] = ENQUIRY_RECIPE.map((field) => ({
  recipe: field.name,
  form: FORM_NAME[field.name] ?? field.name,
  words: wordsFor(field.name),
}));

/** The base name a field carries, or `undefined` for a recipe field the blank never asks for. */
export function enquiryTemplateFormName(recipeName: string): string | undefined {
  return ENQUIRY_TEMPLATE_FIELDS.find((field) => field.recipe === recipeName)?.form;
}

function assertPage(page: number): void {
  if (!Number.isInteger(page) || page < 1 || page > ENQUIRY_TEMPLATE_MAX) {
    throw new Error(`an enquiry's page is 1 to ${ENQUIRY_TEMPLATE_MAX}, not ${page}`);
  }
}

/** Two digits, so `enquiry_01_name` sorts and reads the way the page does. */
function pageToken(page: number): string {
  return String(page).padStart(2, "0");
}

/**
 * The name one page's field carries inside the PDF. Every page is prefixed, including page one:
 * unlike the car blank, there is no "bare" form, because the blank's fields must be recognisably
 * ours and not another form's `name` or `state`.
 */
export function enquiryFieldName(recipeName: string, page: number): string {
  const field = ENQUIRY_TEMPLATE_FIELDS.find((f) => f.recipe === recipeName);
  if (!field) throw new Error(`the enquiry template has no field "${recipeName}"`);
  assertPage(page);
  return `enquiry_${pageToken(page)}_${field.form}`;
}

/** The blank's fields for one page, in the recipe's order — that page's own names, nothing else. */
export function enquiryFields(page: number): readonly EnquiryTemplateField[] {
  assertPage(page);
  return ENQUIRY_TEMPLATE_FIELDS.map((field) => ({
    ...field,
    form: `enquiry_${pageToken(page)}_${field.form}`,
  }));
}

/**
 * Reads a field name back into the page it belongs to and the recipe field it stands for — the
 * exact inverse of `enquiryFieldName`. `undefined` for a name this blank does not write, so a file
 * carrying fields of its own is read as *not ours* rather than guessed at.
 */
export function readEnquiryFieldName(
  formName: string,
): { page: number; recipe: string } | undefined {
  const match = /^enquiry_([0-9]{2})_(.+)$/.exec(formName);
  if (!match) return undefined;

  const page = Number(match[1]);
  if (!Number.isInteger(page) || page < 1 || page > ENQUIRY_TEMPLATE_MAX) return undefined;

  const base = ENQUIRY_TEMPLATE_FIELDS.find((field) => field.form === match[2]);
  if (!base) return undefined;
  return { page, recipe: base.recipe };
}

/**
 * Is this a name our own convention builds for a page the blank will not draw — a page past
 * `ENQUIRY_TEMPLATE_MAX`? Such a file was not produced by a template we serve; the upload refuses
 * the whole file rather than dropping the extra pages in silence.
 */
export function isEnquiryFieldNameBeyondLimit(formName: string): boolean {
  const match = /^enquiry_([0-9]{2})_(.+)$/.exec(formName);
  if (!match) return false;
  if (!ENQUIRY_TEMPLATE_FIELDS.some((field) => field.form === match[2])) return false;
  return Number(match[1]) > ENQUIRY_TEMPLATE_MAX;
}

/**
 * How many pages the download was asked for, read from the query string.
 *
 * Absent means the full blank (20 pages), so the ordinary link needs no query. Anything that is not
 * a whole number of pages inside the blank's limit is refused with a reason.
 */
export function readEnquiryCount(
  value: string | null | undefined,
): { ok: true; pages: number } | { ok: false; reason: string } {
  const raw = (value ?? "").trim();
  if (raw === "") return { ok: true, pages: ENQUIRY_TEMPLATE_DEFAULT };
  if (!/^[0-9]+$/.test(raw)) {
    return {
      ok: false,
      reason: `The number of enquiries must be a whole number, 1 to ${ENQUIRY_TEMPLATE_MAX}.`,
    };
  }
  const pages = Number(raw);
  if (pages < 1 || pages > ENQUIRY_TEMPLATE_MAX) {
    return {
      ok: false,
      reason: `One blank holds 1 to ${ENQUIRY_TEMPLATE_MAX} enquiries, not ${pages}.`,
    };
  }
  return { ok: true, pages };
}
