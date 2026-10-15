// The car template's fields — the blank the office downloads, and the one contract the upload
// reads it back by.
//
// One source: the car's editable details are `CAR_RECIPE` — the same fourteen the change-check
// hashes (lib/change-check.ts) — so the blank, the record and the change-check cannot describe a
// car differently. This module adds only what a *form* needs and a *record* does not: the words the
// owner reads on the blank, and the one place a form's vocabulary differs from the store's.
//
//   * A form the owner fills by hand can carry the state's **name** ("On Order"), never a key the
//     store minted — so the state's field is `state`, and the mapping to the recipe's `state_id`
//     is declared here, once. (Truth 9: "the state a file names is applied at the save".)
//   * Nothing else differs, and nothing else is asked for. Truth 9: "a file carries the record's
//     editable fields and nothing else — nothing beyond them is read, inferred or filled in". So
//     the blank has no row number, no "notes" field, no anything: fourteen fields, and the count is
//     tested against the recipe rather than trusted.
//
// The *words* are decoration; the *names* are the contract. `lib/template-rules.test.ts` holds the
// two together — one form field per recipe field, in the recipe's order, each with words — so a
// fifteenth recipe field cannot appear on the blank without words, and a blank field cannot exist
// that the recipe does not name.
//
// Deliberately free of `server-only` (and of pdf-lib): the names and words are pure, and the upload
// that reads a filled blank will want them without wanting the PDF machinery.

import { CAR_RECIPE, type Field } from "./change-check";

/** What the download is called on disk. */
export const TEMPLATE_FILENAME = "truespec-car-template.pdf";

/** What it is served as. */
export const TEMPLATE_CONTENT_TYPE = "application/pdf";

/**
 * The form field's name for each recipe field. The state is the only one that differs, and only in
 * name: the owner writes the state he knows, not a key the store minted.
 */
const FORM_NAME: Readonly<Record<string, string>> = { state_id: "state" };

/**
 * The words the owner reads beside each field.
 *
 * Money is written "NGN" rather than "₦" on purpose: the PDF's built-in fonts are WinAnsi, which
 * has no naira sign, and a blank that cannot be drawn is no blank at all. (Naming the currency in
 * letters costs a reader nothing — the number is the same number.)
 */
const WORDS: Readonly<Record<string, string>> = {
  brand: "Brand",
  model: "Model",
  trim: "Trim",
  year: "Year",
  exterior_color: "Exterior colour",
  interior_color: "Interior colour",
  mileage: "Mileage (km)",
  features: "Features (separate each with a comma)",
  note: "Note (buyers read this)",
  private_note: "Private note (never shown to buyers)",
  was_price_kobo: "Was price (NGN) — optional",
  arrival_note: "Arrival note",
  doorstep_price_kobo: "Doorstep price (NGN)",
  state_id: "State (Available, On Order, Landed or Sold — or a state of yours)",
};

/**
 * The character that separates two features on the blank.
 *
 * The blank's fields are **single-line**, and a single-line form field cannot hold a newline — so a
 * list typed on the blank is separated by a comma, and the caption says so. The HTML car form is a
 * textarea and separates on newlines instead (`lib/car-input.ts`); the two inputs differ, and this
 * is the one place the blank's own separator is declared. `lib/template-rules.test.ts` ties it to
 * the caption the owner reads, so the words and the reading cannot drift apart.
 */
export const FEATURE_SEPARATOR = ",";

/**
 * Is this recipe field money — an amount the owner writes in **naira** and the store keeps in
 * **kobo**? The store's convention names them `*_kobo`, and the test pins the convention against
 * the recipe rather than letting a name be parsed at runtime and quietly believed.
 */
export function isMoneyField(recipeName: string): boolean {
  return recipeName.endsWith("_kobo");
}

/**
 * How the owner is asked for a value — and therefore how the file's answer is read back.
 *
 * `kind` is the *store's* word for a value; this is the *form's*. They differ in one place that
 * matters: the store calls a year, a mileage and a price all `number`, but a price is written as
 * money and a year is not.
 */
export type FieldReading = "text" | "whole" | "money" | "list";

export function readingFor(recipeName: string, kind: Field["kind"]): FieldReading {
  if (kind === "json") return "list";
  if (kind === "number") return isMoneyField(recipeName) ? "money" : "whole";
  return "text";
}

export type TemplateField = {
  /** The recipe field this blank stands for — the name the record is written with. */
  recipe: string;
  /** The name this field carries inside the PDF — what the upload reads it back by. */
  form: string;
  /** The words drawn beside it. */
  words: string;
  /** How its value is written down in the record (a number, a comma-separated list, or plain text). */
  kind: Field["kind"];
  /** How the owner writes it on the blank, and so how the upload reads it back. */
  reads: FieldReading;
};

function wordsFor(name: string): string {
  const words = WORDS[name];
  if (!words) throw new Error(`the car template has no words for the field "${name}"`);
  return words;
}

/**
 * The blank's fields, in the recipe's own order — one for each of the fourteen editable details and
 * not one more. Built from the recipe, so it cannot be a fifteenth field's home by accident.
 */
export const CAR_TEMPLATE_FIELDS: readonly TemplateField[] = CAR_RECIPE.map((field) => ({
  recipe: field.name,
  form: FORM_NAME[field.name] ?? field.name,
  words: wordsFor(field.name),
  kind: field.kind,
  reads: readingFor(field.name, field.kind),
}));

/** The name a filled blank carries a recipe field's value in. `undefined` — the blank never asks. */
export function templateFormName(recipeName: string): string | undefined {
  return CAR_TEMPLATE_FIELDS.find((field) => field.recipe === recipeName)?.form;
}

/**
 * How many cars one blank may carry.
 *
 * A blank is a form to fill in by hand, so the count is a small, deliberate one: a batch is a
 * sitting's worth of cars, not a database. The route refuses more, with a reason, rather than
 * drawing a document nobody wants.
 */
export const TEMPLATE_MAX_CARS = 20;

/**
 * How many cars the download was asked for, read from the query string.
 *
 * Absent means one — the blank that has always been served, and the common case. Anything that is
 * not a whole number of cars inside the blank's limit is refused with a reason, rather than quietly
 * serving a blank other than the one that was asked for.
 */
export function readCarCount(
  value: string | null | undefined,
): { ok: true; cars: number } | { ok: false; reason: string } {
  const raw = (value ?? "").trim();
  if (raw === "") return { ok: true, cars: 1 };
  if (!/^[0-9]+$/.test(raw)) {
    return { ok: false, reason: `The number of cars must be a whole number, 1 to ${TEMPLATE_MAX_CARS}.` };
  }
  const cars = Number(raw);
  if (cars < 1 || cars > TEMPLATE_MAX_CARS) {
    return { ok: false, reason: `One blank holds 1 to ${TEMPLATE_MAX_CARS} cars, not ${cars}.` };
  }
  return { ok: true, cars };
}

function assertCarNumber(car: number): void {
  if (!Number.isInteger(car) || car < 1 || car > TEMPLATE_MAX_CARS) {
    throw new Error(`a car's number is 1 to ${TEMPLATE_MAX_CARS}, not ${car}`);
  }
}

/**
 * The name one car's field carries inside the PDF, for the nth car (counted from 1).
 *
 * **Car 1 keeps the bare names** ("brand"), so a blank for one car — the common case — is exactly
 * the fourteen names truth 9 names, and adding a second car cannot change the first. Cars 2 and up
 * carry a `_n` suffix ("brand_2"), because an AcroForm field name is unique in a document: two
 * pages' "brand" would otherwise be *one* field written twice, and the second car would be read as
 * a correction to the first.
 */
export function carFieldName(recipeName: string, car: number): string {
  const field = CAR_TEMPLATE_FIELDS.find((f) => f.recipe === recipeName);
  if (!field) throw new Error(`the car template has no field "${recipeName}"`);
  assertCarNumber(car);
  return car === 1 ? field.form : `${field.form}_${car}`;
}

/** The blank's fields for one car, in the recipe's order — that car's own names, nothing else. */
export function carFields(car: number): readonly TemplateField[] {
  assertCarNumber(car);
  return CAR_TEMPLATE_FIELDS.map((field) => ({
    ...field,
    form: car === 1 ? field.form : `${field.form}_${car}`,
  }));
}

/**
 * Reads a field name back into the car it belongs to and the recipe field it stands for — the
 * exact inverse of `carFieldName`. That inverse is what makes the blank and the upload **one
 * contract** rather than two lists that happen to agree today.
 *
 * `undefined` for a name this blank does not write, so a file carrying fields of its own is read as
 * *not ours* rather than guessed at.
 */
export function readCarFieldName(formName: string): { car: number; recipe: string } | undefined {
  const bare = CAR_TEMPLATE_FIELDS.find((field) => field.form === formName);
  if (bare) return { car: 1, recipe: bare.recipe };

  const match = /^(.*)_([0-9]+)$/.exec(formName);
  if (!match) return undefined;
  const base = CAR_TEMPLATE_FIELDS.find((field) => field.form === match[1]);
  const car = Number(match[2]);
  // `brand_1` is not a name this blank writes: car 1's name is `brand`, and a second way of saying
  // "car 1" would make the mapping ambiguous rather than merely redundant.
  if (!base || car < 2 || car > TEMPLATE_MAX_CARS) return undefined;
  return { car, recipe: base.recipe };
}

/**
 * Is this a name our own convention builds for a car the blank will not draw — a car past
 * `TEMPLATE_MAX_CARS`? Such a file was not produced by a template we serve, and reading it as if the
 * extra cars were simply absent would drop them in silence; the upload refuses the whole file
 * instead, saying so.
 */
export function isCarFieldNameBeyondLimit(formName: string): boolean {
  const match = /^(.*)_([0-9]+)$/.exec(formName);
  if (!match) return false;
  if (!CAR_TEMPLATE_FIELDS.some((field) => field.form === match[1])) return false;
  return Number(match[2]) > TEMPLATE_MAX_CARS;
}
