import "server-only";
import { csvOf, type CsvValue } from "./csv";
import { storeQuery } from "./store-guard";

/**
 * The export (truth 13): *"One action produces everything the system holds — every car with its
 * costs and photos, every enquiry, every tap, every activity row and every setting — and it is one
 * download, not two: a single ZIP archive holding `master.json` … and one CSV per subject … It also
 * carries a short `README.txt` naming what is inside and when it was made."*
 *
 * This module produces the **contents**; `lib/zip.ts` is the container and `app/api/export/route.ts`
 * is the door. Keeping them apart is what makes each of the three testable on its own: the files can
 * be checked against the store without opening an archive, and the archive can be checked without a
 * session.
 *
 * ## Why this module reads the store itself
 *
 * The office's own readers cannot serve an export, for three reasons that are all deliberate
 * elsewhere and all wrong here:
 *
 *  - `getOfficeCars()` returns a **view** of a car — it resolves the state label and drops the
 *    colours, the features, the notes, `private_note` and the timestamps. An export built from that
 *    view would quietly lose data, which is the opposite of *"everything the product knew"*.
 *  - `getOfficeTaps()` and `getOfficeActivity()` are **capped at 200**, because they feed a panel.
 *    An export is not a panel: every row goes in or the export is incomplete.
 *  - `readSettings()` reads only the keys the code already knows about (`SETTING_KEYS` plus
 *    `NOTICE_KEYS`). A setting row the code has never heard of is still a setting the store holds.
 *
 * So the seven subjects are read straight from their tables, **complete and uncapped**.
 *
 * ## The header comes from the catalog, not from a row
 *
 * A subject with no rows (a new office has no taps, and none at all today) returns an empty array —
 * there is no `row[0]` to read a header from, and a headerless CSV is not a CSV. So each file's
 * columns come from `information_schema.columns`, which has one useful property a hard-coded list
 * does not: **it cannot drift from the table.** If the store gains a column tomorrow, tomorrow's
 * export carries it with no change here. The same rule is enforced against the rows themselves —
 * `cellFor` refuses to write a cell for a column the store did not return, so a disagreement between
 * the catalog and the query raises instead of emitting a hollow export.
 *
 * ## What is resolved, and what is not
 *
 * Two foreign keys point at rows that are **not** among the seven exported subjects: a car's
 * `state_id` (the `car_state` registry) and an activity row's `actor_id` (`office_user`). An export
 * that wrote only the ids would hand the owner a column of UUIDs referring to rows the same archive
 * does not contain — a dead end. So those two rows carry the id *and* the value it names (`state`,
 * `actor`), exactly as the office's own readers resolve them. Nothing else is derived: no totals, no
 * formatting, no invented values. A cell the store holds as null is written as an empty cell.
 *
 * ## Every car, tombstoned or not
 *
 * Unlike every office screen, this reads `car` **without** the `deleted_at IS NULL` filter. The
 * office's inventory excludes a tombstone because it is waiting for the clear-out to remove it; the
 * export's job is different — it is the owner's exit, and it must not drop a car whose cost lines and
 * photos are still sitting in the store, because then those children would be in `costs.csv` and
 * `photos.csv` with nowhere to nest in `master.json` (the AC's *"the nested master, parts intact"*).
 * `deleted_at` travels with the row, so a tombstone reads as exactly that.
 */

/** One subject of the export: the name the spec gives it, its table, and its file. */
type Subject = {
  /** The spec's own word for it — used for the counts, the README and the master's keys. */
  key: "cars" | "costs" | "photos" | "enquiries" | "taps" | "activity" | "settings";
  /** The table the header is read from. */
  table: string;
  /** The file inside the ZIP. */
  file: string;
  /** Columns the row carries beyond its table's own — resolved by a JOIN (see the note above). */
  extra?: readonly string[];
  /** Complete and uncapped, in a deterministic order, so two exports of the same rows agree. */
  sql: string;
};

export const SUBJECTS: readonly Subject[] = [
  {
    key: "cars",
    table: "car",
    file: "cars.csv",
    // Every car, tombstoned or not, with the state's own label beside its id (see the header note).
    extra: ["state"],
    sql: `SELECT c.*, s.label AS state
            FROM car c
            JOIN car_state s ON s.id = c.state_id
           ORDER BY c.ref, c.id`,
  },
  { key: "costs", table: "cost_line", file: "costs.csv", sql: `SELECT * FROM cost_line ORDER BY car_id, kind, id` },
  { key: "photos", table: "car_photo", file: "photos.csv", sql: `SELECT * FROM car_photo ORDER BY car_id, position, id` },
  { key: "enquiries", table: "enquiry", file: "enquiries.csv", sql: `SELECT * FROM enquiry ORDER BY created_at, id` },
  { key: "taps", table: "tap", file: "taps.csv", sql: `SELECT * FROM tap ORDER BY at, id` },
  {
    key: "activity",
    table: "activity_event",
    file: "activity.csv",
    // The actor's email beside the id: `office_user` is not one of the seven subjects.
    extra: ["actor"],
    sql: `SELECT a.*, u.email AS actor
            FROM activity_event a
            LEFT JOIN office_user u ON u.id = a.actor_id
           ORDER BY a.at, a.id`,
  },
  { key: "settings", table: "setting", file: "settings.csv", sql: `SELECT * FROM setting ORDER BY key` },
];

/** One finished file: a name inside the archive, and its bytes as text. */
export type ExportFile = { name: string; body: string };

/** The two files that are not a subject, named so the README and the ZIP agree on the order. */
export const README_FILE = "README.txt";
export const MASTER_FILE = "master.json";

type Row = Record<string, unknown>;
type CatalogRow = { table_name: string; column_name: string };

const COLUMNS_SQL = `SELECT table_name, column_name
                       FROM information_schema.columns
                      WHERE table_schema = 'public' AND table_name = ANY($1::text[])
                      ORDER BY table_name, ordinal_position`;

/** A `bigint` (a price in kobo) arrives as a string; every other scalar is written as given. */
function cellFor(row: Row, column: string): CsvValue {
  if (!(column in row)) {
    throw new Error(
      `The export asked for column "${column}", which the store did not return — the catalog and the query disagree.`,
    );
  }
  return row[column] as CsvValue;
}

function groupByCar(rows: readonly Row[]): Map<string, Row[]> {
  const byCar = new Map<string, Row[]>();
  for (const row of rows) {
    const key = String(row.car_id);
    const list = byCar.get(key);
    if (list) list.push(row);
    else byCar.set(key, [row]);
  }
  return byCar;
}

/** The README: what is inside, how many of each, how to read it, and when it was made. */
function readme(at: Date, files: readonly { file: string; rows: number }[]): string {
  // One aligned column, computed — never hand-spaced, which is how a README drifts out of line
  // the moment a longer filename appears.
  const entries = [
    { name: README_FILE, note: "this file — what is inside, and when it was made" },
    {
      name: MASTER_FILE,
      note: "the same records, kept in their shape: each car carries its own cost lines and photos",
    },
    ...files.map((f) => ({ name: f.file, note: `${f.rows} row${f.rows === 1 ? "" : "s"}` })),
  ];
  const width = Math.max(...entries.map((e) => e.name.length));

  return [
    "TrueSpec — data export",
    `Made ${at.toISOString()}`,
    "",
    "Everything the system holds, as of the moment above. This archive is the whole of it;",
    "nothing in it was sent anywhere to make it.",
    "",
    ...entries.map((e) => `  ${e.name.padEnd(width)}  ${e.note}`),
    "",
    "Every .csv is plain text: a header row, then one row per record. Fields are separated by",
    "commas and records by CRLF; a field that contains a comma, a quote or a line break is",
    "wrapped in quotes with its own quotes doubled. A blank cell means the store holds no",
    "value there — it is never a placeholder. Dates are ISO 8601 in UTC, so the same instant",
    "reads the same everywhere.",
    "",
    "master.json carries the same rows as the .csv files, so the two always say the same",
    "thing; only the shape differs.",
    "",
  ].join("\n");
}

/**
 * Build every file the ZIP holds, in the order the README names them: `README.txt`,
 * `master.json`, then one CSV per subject.
 *
 * `now` is the one instant stamped everywhere — the README's date, `master.json`'s `exported_at`
 * and the ZIP's own timestamps — so no three parts of the same export can disagree about when it
 * was made.
 */
export async function buildExport(now: Date): Promise<ExportFile[]> {
  const tables = SUBJECTS.map((s) => s.table);

  const results = await Promise.all([
    storeQuery<CatalogRow[]>(COLUMNS_SQL, [tables]),
    ...SUBJECTS.map((s) => storeQuery<Row[]>(s.sql)),
  ]);

  const catalog = results[0] as CatalogRow[];
  const rowSets = results.slice(1) as Row[][];

  // Table -> its columns, in catalog order (which is the table's own order).
  const columnsByTable = new Map<string, string[]>();
  for (const row of catalog) {
    const list = columnsByTable.get(row.table_name);
    if (list) list.push(row.column_name);
    else columnsByTable.set(row.table_name, [row.column_name]);
  }

  const counts: Record<string, number> = {};
  const csvs: ExportFile[] = [];

  for (const [index, subject] of SUBJECTS.entries()) {
    const stored = columnsByTable.get(subject.table);
    if (!stored || stored.length === 0) {
      throw new Error(`The store reports no columns for "${subject.table}"; the export cannot be built.`);
    }
    const header = [...stored, ...(subject.extra ?? [])];
    const rows = rowSets[index];

    counts[subject.key] = rows.length;
    csvs.push({ name: subject.file, body: csvOf(header, rows.map((row) => header.map((c) => cellFor(row, c)))) });
  }

  // The master keeps the nesting a flat file cannot: a car owns its cost lines and its photos,
  // matched by `car_id` so a ref's absence (or a tombstone) cannot mis-file a child.
  const costsByCar = groupByCar(rowSets[1]);
  const photosByCar = groupByCar(rowSets[2]);
  const cars = rowSets[0].map((car) => ({
    ...car,
    cost_lines: costsByCar.get(String(car.id)) ?? [],
    photos: photosByCar.get(String(car.id)) ?? [],
  }));

  const master = {
    exported_at: now.toISOString(),
    counts,
    cars,
    enquiries: rowSets[3],
    taps: rowSets[4],
    activity: rowSets[5],
    settings: rowSets[6],
  };

  const ordered: ExportFile[] = [
    { name: README_FILE, body: readme(now, SUBJECTS.map((s, i) => ({ file: s.file, rows: rowSets[i].length }))) },
    { name: MASTER_FILE, body: JSON.stringify(master, null, 2) + "\n" },
    ...csvs,
  ];

  return ordered;
}
