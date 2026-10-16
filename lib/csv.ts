/**
 * The one CSV writer for the export (truth 13: "one CSV per subject … rather than one combined
 * sheet, which could not hold a car (costs and photos) and a tap (neither) without most of its cells
 * empty").
 *
 * **RFC 4180, as written:** fields are separated by commas, records by CRLF, and a field containing a
 * comma, a quote or a line break is wrapped in quotes with its quotes doubled. Anything else is a
 * second dialect, and a second dialect is how an export stops being openable by anything.
 *
 * **A null cell is an empty cell.** The format has no word for "no value", and inventing one — a
 * dash, the string `null`, a literal `NULL` — would put something in a cell the store does not hold,
 * which is the exact opposite of what an export is for.
 *
 * **Dates are ISO 8601 in UTC**, the same rule every other date in this office is read by
 * (`lib/office-time.ts`): a local-time export would mean the same archive shows a different day to
 * two people. A `jsonb` column is written as compact JSON, so the snapshot survives as data rather
 * than as a string of two halves.
 *
 * Values arrive as whatever `pg` hands back — a `bigint` (a price in kobo) arrives as a string so it
 * cannot lose a digit, a `timestamptz` arrives as a `Date` — so every type is accepted on purpose
 * rather than cast at each call site.
 */

/** A cell as the store gave it to us. Deliberately broad: the writer decides how to say it. */
export type CsvValue = string | number | bigint | boolean | Date | null | undefined | object;

const NEEDS_QUOTES = /[",\r\n]/;

/** How one value is put into words: `null` and `undefined` are both the empty cell. */
function asText(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** One cell: quoted only when it must be, with its own quotes doubled. */
export function csvCell(value: CsvValue): string {
  const text = asText(value);
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** One record: cells joined with commas. The line break is the caller's business, not this row's. */
export function csvRow(values: readonly CsvValue[]): string {
  return values.map(csvCell).join(",");
}

/**
 * A whole file: the header, then every record, each terminated with CRLF (the terminator RFC 4180
 * names), including the last.
 */
export function csvOf(header: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  return [csvRow(header), ...rows.map((row) => csvRow(row))]
    .map((line) => line + "\r\n")
    .join("");
}
