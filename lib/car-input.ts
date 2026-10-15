import { CAR_RECIPE } from "./change-check";
import { parseCostAmount, SIX_COST_KINDS, type CostKind } from "./money";
import type { SaleInput } from "./sale";
import { FEATURE_SEPARATOR, readingFor } from "./template-rules";

/**
 * The car form's one reader.
 *
 * A Server Action is a public endpoint, so everything a browser sends is untrusted
 * text until this module has judged it. It turns the form's strings into the car's
 * fourteen stored columns, its six cost lines and its secondary-state ids — or a
 * list of field-level refusals, one per bad field, so the form can show each message
 * beside the input that caused it.
 *
 * It is pure: no store, no session, no clock beyond the one it is given. The action
 * owns those; this owns "is this a well-formed car?".
 *
 * What it deliberately does **not** do: it never sees or returns a `content_hash`.
 * The change-check is the server's, computed from the stored values, never from a
 * browser (truth 14). It also does not decide whether a state id names a *primary*
 * state — that is the registry's fact, checked by the action against the store.
 */

/** The raw strings a car form submits. Every field is text, as HTML sends it. */
export type CarFormInput = {
  brand: string;
  model: string;
  trim?: string;
  year: string;
  exteriorColor?: string;
  interiorColor?: string;
  mileage: string;
  /** Newline-separated feature list, as typed. */
  features?: string;
  note?: string;
  privateNote?: string;
  /** Naira; blank = no "was" price. */
  wasPrice?: string;
  arrivalNote?: string;
  /** Naira; blank = no price yet (an office-only draft, C3). */
  price?: string;
  /** The car's one primary state. */
  stateId: string;
  /** The owner's secondary states, any number (or none). */
  secondaryStateIds?: string[];
  /** Naira per cost kind; a blank or absent kind means "not entered". */
  costs?: Partial<Record<CostKind, string>>;
  /** Naira; the sale price, when the car's state is being set Sold (truth 5). */
  salePrice?: string;
  /** The day the car sold, `YYYY-MM-DD`, when the car's state is being set Sold. */
  saleDate?: string;
};

/** The car's fourteen editable columns, ready to store. */
export type CarColumns = {
  brand: string;
  model: string;
  trim: string | null;
  year: number;
  exterior_color: string | null;
  interior_color: string | null;
  mileage: number;
  features: string | null;
  note: string | null;
  private_note: string | null;
  was_price_kobo: number | null;
  arrival_note: string | null;
  doorstep_price_kobo: number | null;
  state_id: string;
};

export type CarCostLine = { kind: CostKind; amountMinor: number };

export type CarInputValue = {
  columns: CarColumns;
  costs: CarCostLine[];
  secondaryStateIds: string[];
  /**
   * The sale facts the form carried, or `null`. They are only *kept* when the chosen
   * primary state is Sold — that is the action's judgement against the registry
   * (`saleForState`), not this reader's, because "which section is this state?" is the
   * store's fact.
   */
  sale: SaleInput | null;
};

export type FieldError = { field: string; message: string };
export type CarInputResult = { ok: true; value: CarInputValue } | { ok: false; errors: FieldError[] };

const blank = (s: string | undefined): boolean => s === undefined || s.trim() === "";
const text = (s: string | undefined): string | null => {
  const t = (s ?? "").trim();
  return t === "" ? null : t;
};

/** A whole, non-negative integer, or null when the text is not one. */
function wholeNumber(raw: string | undefined): number | null {
  const t = (raw ?? "").trim().replace(/[,\s]/g, "");
  if (!/^\d+$/.test(t)) return null;
  return Number(t);
}

/** Split a typed feature list into trimmed, non-empty lines. */
function featureList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/**
 * The one reading of a sale date (`YYYY-MM-DD`), stored at **noon UTC** — the day the
 * owner typed, in an instant no display timezone can shift to the day before or after.
 * `null` for anything that is not a real calendar day (the 31st of February included),
 * so the field gets its own message rather than a shifted date.
 */
function isoDay(raw: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const day = new Date(`${raw}T12:00:00.000Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== raw) return null;
  return raw;
}

/**
 * Judge one car form. Returns the storable value, or every field-level refusal
 * found (not just the first), so the form can mark each field at once.
 *
 * @param input the form's strings
 * @param now   the year "this year" means, for the year bound; injected so the rule is testable
 */
export function readCarInput(input: CarFormInput, now: number = new Date().getFullYear()): CarInputResult {
  const errors: FieldError[] = [];

  // --- required text fields ---
  const brand = (input.brand ?? "").trim();
  if (brand === "") errors.push({ field: "brand", message: "Enter the make" });
  const model = (input.model ?? "").trim();
  if (model === "") errors.push({ field: "model", message: "Enter the model" });

  // --- year ---
  const year = wholeNumber(input.year);
  if (blank(input.year) || year === null) {
    errors.push({ field: "year", message: "Enter the year" });
  } else if (year < 1900 || year > now + 1) {
    errors.push({ field: "year", message: `Enter a year between 1900 and ${now + 1}` });
  }

  // --- mileage (km) ---
  const mileage = wholeNumber(input.mileage);
  if (blank(input.mileage) || mileage === null) {
    errors.push({ field: "mileage", message: "Enter the mileage in km" });
  }

  // --- amounts: each is naira, and a malformed one is refused at its own field ---
  let wasPriceKobo: number | null = null;
  if (!blank(input.wasPrice)) {
    const parsed = parseCostAmount(input.wasPrice as string);
    if (parsed.ok) wasPriceKobo = parsed.amountMinor;
    else errors.push({ field: "wasPrice", message: parsed.error });
  }

  let priceKobo: number | null = null;
  if (!blank(input.price)) {
    const parsed = parseCostAmount(input.price as string);
    if (parsed.ok) priceKobo = parsed.amountMinor;
    else errors.push({ field: "price", message: parsed.error });
  }

  const costs: CarCostLine[] = [];
  for (const kind of SIX_COST_KINDS) {
    const raw = input.costs?.[kind];
    if (blank(raw)) continue;
    const parsed = parseCostAmount(raw as string);
    if (parsed.ok) costs.push({ kind, amountMinor: parsed.amountMinor });
    else errors.push({ field: `cost.${kind}`, message: parsed.error });
  }

  // --- the car's one primary state ---
  const stateId = (input.stateId ?? "").trim();
  if (stateId === "") errors.push({ field: "stateId", message: "Choose the car's state" });

  // --- the sale (truth 5) ---
  // The two money facts travel together: a price with no date, or a date with no price,
  // is half a sale and is refused at the field that is missing. Whether a sale is
  // *required* depends on the chosen state's section, which is the registry's fact — the
  // action checks that, not this module.
  const gavePrice = !blank(input.salePrice);
  const gaveDate = !blank(input.saleDate);

  let salePriceKobo: number | null = null;
  if (gavePrice) {
    const parsed = parseCostAmount(input.salePrice as string);
    if (parsed.ok) salePriceKobo = parsed.amountMinor;
    else errors.push({ field: "salePrice", message: parsed.error });
  } else if (gaveDate) {
    errors.push({ field: "salePrice", message: "Enter the sale price" });
  }

  let soldAt: string | null = null;
  if (gaveDate) {
    const day = isoDay((input.saleDate as string).trim());
    if (day !== null) soldAt = `${day}T12:00:00.000Z`;
    else errors.push({ field: "saleDate", message: "Enter the date the car sold" });
  } else if (gavePrice) {
    errors.push({ field: "saleDate", message: "Enter the date the car sold" });
  }

  if (errors.length > 0) return { ok: false, errors };

  const features = featureList(input.features);
  return {
    ok: true,
    value: {
      columns: {
        brand,
        model,
        trim: text(input.trim),
        year: year as number,
        exterior_color: text(input.exteriorColor),
        interior_color: text(input.interiorColor),
        mileage: mileage as number,
        // Stored as a JSON array text, exactly as the reader already expects.
        features: features.length > 0 ? JSON.stringify(features) : null,
        note: text(input.note),
        private_note: text(input.privateNote),
        was_price_kobo: wasPriceKobo,
        arrival_note: text(input.arrivalNote),
        doorstep_price_kobo: priceKobo,
        state_id: stateId,
      },
      costs,
      secondaryStateIds: Array.from(new Set(input.secondaryStateIds ?? [])).filter((id) => id.trim() !== ""),
      sale: salePriceKobo !== null && soldAt !== null ? { salePriceKobo, soldAt } : null,
    },
  };
}

/** A car's values as a filled blank carries them — keyed by the recipe field they stand for. */
export type CarFieldStrings = Readonly<Partial<Record<string, string>>>;

/** One car read from a filled blank: what to store, and every value that could not be read. */
export type ReadCarFieldsResult = {
  /** The recipe's editable fields the file carried and this reader could read. */
  values: Record<string, unknown>;
  /** The state the file named, as the owner wrote it — or `null` when it named none. */
  stateLabel: string | null;
  /** Every value the file carried that could not be read, named by its own recipe field. */
  errors: FieldError[];
};

/**
 * Split a feature list written on the blank.
 *
 * The blank's fields are single-line, and a single-line field cannot hold a newline — so the list
 * the owner types on the blank is separated by a comma, the character its caption names. The HTML
 * car form above is a textarea and splits on newlines instead. One list, two inputs, two
 * separators — each declared with the input that has it, and never guessed at.
 */
function blankFeatureList(raw: string): string[] {
  return raw
    .split(FEATURE_SEPARATOR)
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

/**
 * Judge one car as a filled blank carries it — the *draft's* reader.
 *
 * A draft may be incomplete: the owner fills in what he knows now and finishes the record later, so
 * a field the file left blank is not a failure here. (`readCarInput` above is the *save's* reader;
 * it requires the record's fields, because it judges the record.) What this reader will not do is
 * invent anything: a value the file *did* carry and that cannot be read is named in `errors`, field
 * by field, and that car is refused rather than a wrong number stored.
 *
 * The fields are keyed by the **recipe** name, not the blank's own names — the blank's vocabulary is
 * turned back into the record's before this is called (`readCarFieldName`, lib/template-rules.ts).
 * The state is the one field with a destination of its own: a hand-filled blank can name a state but
 * cannot know a key the store minted, so the state comes back as a **label** and the recipe's other
 * thirteen come back as `values`.
 */
export function readCarFields(raw: CarFieldStrings): ReadCarFieldsResult {
  const values: Record<string, unknown> = {};
  const errors: FieldError[] = [];

  for (const field of CAR_RECIPE) {
    // The state is not a recipe value at upload: there is no key to read, only a name to keep.
    if (field.name === "state_id") continue;

    const carried = raw[field.name];
    if (blank(carried)) continue;

    switch (readingFor(field.name, field.kind)) {
      case "text":
        values[field.name] = text(carried);
        break;
      case "list":
        values[field.name] = blankFeatureList(carried as string);
        break;
      case "money": {
        const parsed = parseCostAmount(carried as string);
        if (parsed.ok) values[field.name] = parsed.amountMinor;
        else errors.push({ field: field.name, message: parsed.error });
        break;
      }
      case "whole": {
        const whole = wholeNumber(carried);
        if (whole === null) errors.push({ field: field.name, message: "Enter a whole number" });
        else values[field.name] = whole;
        break;
      }
    }
  }

  return { values, stateLabel: text(raw.state_id), errors };
}
