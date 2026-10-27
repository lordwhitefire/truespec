/**
 * Restore a TrueSpec backup into a database that is **not** the main one.
 *
 *   BACKUP_ENCRYPTION_KEY=… DATABASE_URL_RESTORE=… npm run backup:restore -- --file <path>
 *
 * The order is the safety property:
 *   1. refuse a missing key, a missing restore URL, a missing main URL, or a restore URL that names
 *      the main database (pooled and direct Neon hosts compare equal);
 *   2. verify the GCM tag and parse the archive — no connection is opened if either fails;
 *   3. read the target's column types, replace all 18 tables in foreign-key order, verify counts and
 *      both sequences, commit;
 *   4. read the counts and sequences back after the commit and print only those.
 *
 * No row contents and no secret are printed. `DATABASE_URL_RESTORE` is the only connection this
 * script opens; the main URL is read only to compare identities.
 */
import { readFileSync } from 'node:fs';
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';
import { decryptBackup } from '../lib/backup-crypto';
import type { BackupArchive } from '../lib/backup-archive';
import {
  connectionIdentity,
  isSameDatabase,
  parseBackupArchive,
  readColumnTypes,
  restoreArchive,
  RestoreError,
} from '../lib/backup-restore';
import { BACKUP_SEQUENCES, BACKUP_TABLES, quoteIdentifier } from '../lib/backup-tables';

loadEnv({ path: '.env.local', quiet: true });

function argument(name: string): string | undefined {
  const args = process.argv.slice(2);
  const equals = args.find((arg) => arg.startsWith(`${name}=`));
  if (equals) return equals.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main(): Promise<void> {
  const file = argument('--file') ?? process.env.BACKUP_FILE;
  const target = process.env.DATABASE_URL_RESTORE;
  const main = process.env.DATABASE_URL;
  const key = process.env.BACKUP_ENCRYPTION_KEY;

  if (!file) throw new RestoreError('arguments', 'pass the backup file with --file <path>');
  if (!key) throw new RestoreError('configuration', 'BACKUP_ENCRYPTION_KEY is not set');
  if (!target) throw new RestoreError('target', 'DATABASE_URL_RESTORE is not set');
  if (!main)
    throw new RestoreError('target', 'DATABASE_URL is not set, so the target cannot be checked');
  if (isSameDatabase(target, main)) {
    const identity = connectionIdentity(target);
    throw new RestoreError(
      'target',
      `refusing: the restore target is the main database (${identity.host}/${identity.database})`
    );
  }

  const envelope = readFileSync(file);
  let archive: BackupArchive;
  try {
    archive = parseBackupArchive(decryptBackup(envelope, key));
  } catch (error) {
    if (error instanceof RestoreError) throw error;
    throw new RestoreError(
      'decrypt',
      error instanceof Error ? error.message : 'the backup could not be read'
    );
  }

  const client = new Client({ connectionString: target });
  await client.connect();
  try {
    const query = async (text: string, params?: unknown[]) => {
      const result = await client.query(text, params);
      return { rows: result.rows as Record<string, unknown>[] };
    };

    const columnTypes = await readColumnTypes({ query });
    const restored = await restoreArchive({ query }, archive, columnTypes);

    // Read the committed state back: a restore is not proven by the transaction's own word.
    const counts: Record<string, number> = {};
    for (const table of BACKUP_TABLES) {
      const result = await query(`SELECT count(*)::int AS n FROM ${quoteIdentifier(table)}`);
      counts[table] = Number(result.rows[0]?.n);
      const expected = archive.tables[table].length;
      if (counts[table] !== expected) {
        throw new RestoreError(
          'verify-after-commit',
          `${table} has ${counts[table]} rows after commit, expected ${expected}`
        );
      }
    }

    const sequences: Record<string, { last_value: number; is_called: boolean }> = {};
    for (const name of BACKUP_SEQUENCES) {
      const result = await query(`SELECT last_value, is_called FROM ${quoteIdentifier(name)}`);
      const row = result.rows[0];
      sequences[name] = {
        last_value: Number(row?.last_value),
        is_called: Boolean(row?.is_called),
      };
      const expected = archive.sequences[name];
      if (
        sequences[name].last_value !== expected.last_value ||
        sequences[name].is_called !== expected.is_called
      ) {
        throw new RestoreError(
          'verify-after-commit',
          `the sequence ${name} does not match the backup`
        );
      }
    }

    console.log(
      JSON.stringify(
        {
          file,
          format: archive.format,
          version: archive.version,
          generated_at: archive.generated_at,
          tables: counts,
          sequences,
          restored,
        },
        null,
        2
      )
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  if (error instanceof RestoreError) {
    console.error(`restore refused at ${error.step}: ${error.message}`);
  } else {
    // The thrown message from the driver can name a host but never a password; keep it to the type
    // and a generic line so a connection string cannot slip into a log.
    console.error(`restore failed: ${error instanceof Error ? error.name : 'unknown error'}`);
  }
  process.exitCode = 1;
});
