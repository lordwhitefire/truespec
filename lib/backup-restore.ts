/**
 * Restoring a backup archive — parse it, replace the target's contents in foreign-key order, put the
 * sequences back where they were.
 *
 * Three safety properties live here:
 *
 *   1. **The archive is checked before a connection is opened.** `parseBackupArchive` refuses a
 *      wrong format/version, a missing table, an unknown table, a non-array table, or a sequence
 *      state that is not a number. The decrypt step has already verified the auth tag; this is the
 *      shape check on the plaintext.
 *   2. **The target must not be the main database.** `connectionIdentity` normalises Neon's
 *      `-pooler` host so the pooled and direct addresses of the same branch compare equal. The
 *      script refuses a missing `DATABASE_URL_RESTORE`, a missing main URL, or the same database.
 *   3. **The replacement is one transaction.** `TRUNCATE` every table except the ones the caller
 *      preserves, insert in `BACKUP_TABLES` order (parents first), verify every restored row count,
 *      set both sequences, verify their state, then commit. An error rolls the data back. Sequence
 *      changes are not transactional in PostgreSQL; the script reports a post-commit mismatch
 *      rather than pretending they are.
 *
 * `preserveTables` exists for the demo reset: the demo branch keeps its own `schema_migrations`
 * rows while every data table is replaced by the fixed snapshot. A preserved table is skipped by
 * truncate, insert and the count check. The default is empty, so the manual main restore is exactly
 * the full restore it was before.
 *
 * `json`/`jsonb` values need one special case: the `pg` driver treats a JavaScript array as a
 * PostgreSQL array literal, which is invalid JSON for a jsonb column. `prepareValue` therefore
 * `JSON.stringify`s values in those columns. The type map comes from `information_schema.columns`,
 * never from a guess.
 */
import {
  BACKUP_SEQUENCES,
  BACKUP_TABLES,
  quoteIdentifier,
  type BackupSequence,
  type BackupTable,
} from "./backup-tables";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupArchive,
  type BackupSequenceState,
} from "./backup-archive";

export type RestoreRow = Record<string, unknown>;
export type RestoreClient = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: RestoreRow[] }>;
};

export class RestoreError extends Error {
  constructor(
    readonly step: string,
    message: string,
  ) {
    super(message);
    this.name = "RestoreError";
  }
}

/**
 * Parse and shape-check the decrypted archive. The caller has already verified the GCM tag; this
 * function never sees an unauthenticated byte.
 */
export function parseBackupArchive(raw: string): BackupArchive {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new RestoreError("parse", "the backup is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new RestoreError("parse", "the backup is not an archive object");
  }
  const value = parsed as Record<string, unknown>;
  if (value.format !== BACKUP_FORMAT || value.version !== BACKUP_VERSION) {
    throw new RestoreError(
      "parse",
      `the backup is not a ${BACKUP_FORMAT} version ${BACKUP_VERSION} archive`,
    );
  }
  if (typeof value.generated_at !== "string" || !Number.isFinite(Date.parse(value.generated_at))) {
    throw new RestoreError("parse", "the backup's generated_at is not a date");
  }
  if (typeof value.tables !== "object" || value.tables === null || Array.isArray(value.tables)) {
    throw new RestoreError("parse", "the backup has no tables object");
  }
  const tables = value.tables as Record<string, unknown>;
  const missing = BACKUP_TABLES.filter((table) => !(table in tables));
  const extra = Object.keys(tables).filter(
    (table) => !(BACKUP_TABLES as readonly string[]).includes(table),
  );
  if (missing.length > 0 || extra.length > 0) {
    const parts: string[] = [];
    if (missing.length > 0) parts.push(`missing: ${missing.join(", ")}`);
    if (extra.length > 0) parts.push(`unknown: ${extra.join(", ")}`);
    throw new RestoreError("tables", `the backup's table set does not match this build — ${parts.join("; ")}`);
  }
  for (const table of BACKUP_TABLES) {
    if (!Array.isArray(tables[table])) {
      throw new RestoreError("tables", `the backup's ${table} is not an array`);
    }
  }

  if (typeof value.sequences !== "object" || value.sequences === null || Array.isArray(value.sequences)) {
    throw new RestoreError("sequences", "the backup has no sequences object");
  }
  const sequences = value.sequences as Record<string, unknown>;
  const missingSequences = BACKUP_SEQUENCES.filter((name) => !(name in sequences));
  const extraSequences = Object.keys(sequences).filter(
    (name) => !(BACKUP_SEQUENCES as readonly string[]).includes(name),
  );
  if (missingSequences.length > 0 || extraSequences.length > 0) {
    throw new RestoreError("sequences", "the backup's sequence set does not match this build");
  }
  for (const name of BACKUP_SEQUENCES) {
    const state = sequences[name] as Record<string, unknown> | null;
    if (
      typeof state !== "object" ||
      state === null ||
      typeof state.last_value !== "number" ||
      !Number.isFinite(state.last_value) ||
      typeof state.is_called !== "boolean"
    ) {
      throw new RestoreError("sequences", `the backup's ${name} state is not readable`);
    }
  }

  return parsed as BackupArchive;
}

export type ConnectionIdentity = { host: string; port: string; database: string; user: string };

/**
 * The parts of a connection string that say *which database this is*. Passwords never enter the
 * result. Neon's pooled host (`ep-…-pooler.…`) and direct host (`ep-….…`) are the same branch, so
 * the `-pooler` label is removed before comparing.
 */
export function connectionIdentity(connectionString: string): ConnectionIdentity {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new RestoreError("target", "a database connection string is not a URL");
  }
  if (!/^postgres(ql)?:$/.test(url.protocol)) {
    throw new RestoreError("target", "a database connection string is not PostgreSQL");
  }
  return {
    host: url.hostname.toLowerCase().replace(/-pooler(?=\.)/, ""),
    port: url.port || "5432",
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    user: decodeURIComponent(url.username),
  };
}

export function isSameDatabase(a: string, b: string): boolean {
  const left = connectionIdentity(a);
  const right = connectionIdentity(b);
  return (
    left.host === right.host &&
    left.port === right.port &&
    left.database === right.database &&
    left.user === right.user
  );
}

/**
 * The one TRUNCATE. With no preserved tables, `CASCADE` is belt-and-braces because every referencing
 * table is listed. With a preserved table, `CASCADE` is omitted: PostgreSQL would otherwise truncate
 * the preserved table if something referenced one being emptied, and the promise is that it is
 * skipped. The demo's `schema_migrations` has no foreign keys, so the plain TRUNCATE is enough.
 */
export function truncateStatement(preserveTables: readonly BackupTable[] = []): string {
  const preserved = new Set(preserveTables);
  const tables = BACKUP_TABLES.filter((table) => !preserved.has(table));
  if (tables.length === 0) return "";
  const cascade = preserved.size === 0 ? " CASCADE" : "";
  return `TRUNCATE TABLE ${tables.map(quoteIdentifier).join(", ")} RESTART IDENTITY${cascade}`;
}

/** Read the target's column types; the restore needs `json`/`jsonb` and the exact column set. */
export async function readColumnTypes(
  client: RestoreClient,
): Promise<Record<string, Record<string, string>>> {
  const result = await client.query(
    `SELECT table_name, column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])`,
    [BACKUP_TABLES],
  );
  const types: Record<string, Record<string, string>> = {};
  for (const row of result.rows) {
    const table = String(row.table_name);
    const column = String(row.column_name);
    types[table] ??= {};
    types[table][column] = String(row.data_type);
  }
  for (const table of BACKUP_TABLES) {
    if (!types[table] || Object.keys(types[table]).length === 0) {
      throw new RestoreError("schema", `the target has no table ${table}`);
    }
  }
  return types;
}

function prepareValue(value: unknown, dataType: string): unknown {
  if (value === null || value === undefined) return null;
  // `pg` treats an array as a PostgreSQL array literal. A jsonb array must be JSON text instead.
  if (dataType === "json" || dataType === "jsonb") return JSON.stringify(value);
  return value;
}

export type InsertPlan = {
  table: BackupTable;
  columns: string[];
  values: unknown[][];
};

/**
 * Turn the archive's rows into insert plans, checking that the archive's columns are exactly the
 * target's columns. A missing or extra column is a schema mismatch, never a silent coercion.
 */
export function buildInsertPlans(
  archive: BackupArchive,
  columnTypes: Record<string, Record<string, string>>,
  preserveTables: readonly BackupTable[] = [],
): InsertPlan[] {
  const preserved = new Set(preserveTables);
  const plans: InsertPlan[] = [];
  for (const table of BACKUP_TABLES) {
    if (preserved.has(table)) continue;
    const rows = archive.tables[table] as RestoreRow[];
    if (rows.length === 0) {
      plans.push({ table, columns: [], values: [] });
      continue;
    }
    const actual = columnTypes[table];
    if (!actual) throw new RestoreError("schema", `the target has no table ${table}`);
    const columns = Object.keys(rows[0]);
    const archiveSet = new Set(columns);
    const targetSet = new Set(Object.keys(actual));
    const missing = columns.filter((column) => !targetSet.has(column));
    const extra = Object.keys(actual).filter((column) => !archiveSet.has(column));
    if (missing.length > 0 || extra.length > 0) {
      throw new RestoreError(
        "schema",
        `the backup's ${table} columns do not match the target — ${
          missing.length > 0 ? `not in target: ${missing.join(", ")}` : ""
        }${missing.length > 0 && extra.length > 0 ? "; " : ""}${
          extra.length > 0 ? `not in backup: ${extra.join(", ")}` : ""
        }`,
      );
    }
    const values = rows.map((row) => {
      const rowColumns = Object.keys(row);
      if (
        rowColumns.length !== columns.length ||
        rowColumns.some((column) => !archiveSet.has(column))
      ) {
        throw new RestoreError("rows", `the backup's ${table} rows do not all have the same columns`);
      }
      return columns.map((column) => prepareValue(row[column], actual[column]));
    });
    plans.push({ table, columns, values });
  }
  return plans;
}

export type RestoreOptions = {
  /**
   * Tables whose target rows must survive the replacement. They are skipped by truncate, insert and
   * the count check. The demo reset passes `schema_migrations`; the manual main restore passes
   * nothing and keeps the full-restore behaviour.
   */
  preserveTables?: readonly BackupTable[];
};

export async function restoreArchive(
  client: RestoreClient,
  archive: BackupArchive,
  columnTypes: Record<string, Record<string, string>>,
  options: RestoreOptions = {},
): Promise<{ tables: Record<string, number>; sequences: Record<string, BackupSequenceState> }> {
  const preserveTables = options.preserveTables ?? [];
  const unknown = preserveTables.filter(
    (table) => !(BACKUP_TABLES as readonly string[]).includes(table),
  );
  if (unknown.length > 0) {
    throw new RestoreError("options", `unknown preserveTables: ${unknown.join(", ")}`);
  }
  const preserved = new Set(preserveTables);
  const plans = buildInsertPlans(archive, columnTypes, preserveTables);

  await client.query("BEGIN");
  try {
    const truncate = truncateStatement(preserveTables);
    if (truncate) await client.query(truncate);

    for (const plan of plans) {
      if (plan.columns.length === 0) continue;
      const columnList = plan.columns.map(quoteIdentifier).join(", ");
      const placeholders = plan.columns.map((_, index) => `$${index + 1}`).join(", ");
      const text = `INSERT INTO ${quoteIdentifier(plan.table)} (${columnList}) VALUES (${placeholders})`;
      for (const values of plan.values) {
        await client.query(text, values);
      }
    }

    // Counts before the sequences: a mismatch rolls the data back and never claims a restore.
    // A preserved table is not part of the claim: it was not replaced, so it is not counted here.
    const counts: Record<string, number> = {};
    for (const table of BACKUP_TABLES) {
      if (preserved.has(table)) continue;
      const result = await client.query(
        `SELECT count(*)::int AS n FROM ${quoteIdentifier(table)}`,
      );
      const expected = archive.tables[table].length;
      const actual = Number(result.rows[0]?.n);
      counts[table] = actual;
      if (actual !== expected) {
        throw new RestoreError(
          "verify",
          `the restored ${table} has ${actual} rows, but the backup has ${expected}`,
        );
      }
    }

    const sequences = {} as Record<BackupSequence, BackupSequenceState>;
    for (const name of BACKUP_SEQUENCES) {
      const state = archive.sequences[name];
      await client.query(`SELECT setval($1::regclass, $2, $3)`, [
        name,
        state.last_value,
        state.is_called,
      ]);
      const check = await client.query(
        `SELECT last_value, is_called FROM ${quoteIdentifier(name)}`,
      );
      const actual = check.rows[0];
      if (
        Number(actual?.last_value) !== state.last_value ||
        Boolean(actual?.is_called) !== state.is_called
      ) {
        throw new RestoreError("verify", `the restored sequence ${name} does not match the backup`);
      }
      sequences[name] = state;
    }

    await client.query("COMMIT");
    return { tables: counts, sequences };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The original failure is the one to report.
    }
    throw error;
  }
}
