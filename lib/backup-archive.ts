/**
 * Building the backup archive: every public table, every sequence, one JSON object.
 *
 * The shape is deliberately plain — no row-count metadata to drift, no "which tables are important"
 * judgement:
 *
 *   {
 *     format: "truespec-backup",
 *     version: 1,
 *     generated_at: "2026-10-23T…Z",
 *     tables: { "car": [ { …row… } ], … },
 *     sequences: { "ts_ref_seq": { last_value: 1068, is_called: true }, … }
 *   }
 *
 * **The table-list check is the safety property.** The list is fixed in `backup-tables.ts`; a new
 * public base table (or a listed table that is gone) fails the run before a byte is written. That is
 * the task's rule: a future table must not be silently missed.
 *
 * Rows are read with `SELECT *` in the fixed restore order. The dump does not try to be clever about
 * columns: a backup that silently omitted a column would be worse than no backup.
 *
 * No row contents are logged here. The caller may log table names and counts; never values.
 */
import {
  BACKUP_SEQUENCES,
  BACKUP_TABLES,
  quoteIdentifier,
  type BackupSequence,
  type BackupTable,
} from './backup-tables';

export const BACKUP_FORMAT = 'truespec-backup';
export const BACKUP_VERSION = 1;

export type BackupQuery = (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;

export type BackupSequenceState = { last_value: number; is_called: boolean };

export type BackupArchive = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  generated_at: string;
  tables: Record<BackupTable, unknown[]>;
  sequences: Record<BackupSequence, BackupSequenceState>;
};

/** A failure with a named step, so the route can log which part of the backup refused. */
export class BackupError extends Error {
  constructor(
    readonly step: string,
    message: string
  ) {
    super(message);
    this.name = 'BackupError';
  }
}

/**
 * Read the whole archive. `query` is injected so the builder can be unit-tested against a fake
 * store; the route passes the project's real `storeQuery` (retry included).
 */
export async function buildBackupArchive(
  query: BackupQuery,
  now: Date = new Date()
): Promise<BackupArchive> {
  const actual = await query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name`
  );
  const actualNames = new Set(
    (actual.rows as { table_name: string }[]).map((row) => row.table_name)
  );
  const expectedNames = new Set<string>(BACKUP_TABLES);

  const missing = BACKUP_TABLES.filter((name) => !actualNames.has(name));
  const unknown = [...actualNames].filter((name) => !expectedNames.has(name)).sort();
  if (missing.length > 0 || unknown.length > 0) {
    const parts: string[] = [];
    if (missing.length > 0) parts.push(`missing: ${missing.join(', ')}`);
    if (unknown.length > 0) parts.push(`not in the fixed list: ${unknown.join(', ')}`);
    throw new BackupError(
      'table-list',
      `the public tables and the backup's fixed list disagree — ${parts.join('; ')}`
    );
  }

  const tables = {} as Record<BackupTable, unknown[]>;
  for (const table of BACKUP_TABLES) {
    const result = await query(`SELECT * FROM ${quoteIdentifier(table)}`);
    tables[table] = result.rows;
  }

  const sequences = {} as Record<BackupSequence, BackupSequenceState>;
  for (const name of BACKUP_SEQUENCES) {
    const result = await query(`SELECT last_value, is_called FROM ${quoteIdentifier(name)}`);
    const row = result.rows[0] as { last_value: string | number; is_called: boolean } | undefined;
    if (!row) {
      throw new BackupError('sequences', `the sequence ${name} could not be read`);
    }
    sequences[name] = {
      last_value: Number(row.last_value),
      is_called: Boolean(row.is_called),
    };
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    generated_at: now.toISOString(),
    tables,
    sequences,
  };
}

/** Total rows across the archive — for the summary line, never for a decision. */
export function archiveRowCount(archive: BackupArchive): number {
  return Object.values(archive.tables).reduce((total, rows) => total + rows.length, 0);
}
