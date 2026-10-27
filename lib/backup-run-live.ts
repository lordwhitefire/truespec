/**
 * The live half of the daily backup: the only place that knows the store door, the asset store and
 * the environment.
 *
 * `backup-run.ts` is the orchestration and is testable on its own. This file binds it to the real
 * main-only store door (with its retry), the real Sanity client and `BACKUP_ENCRYPTION_KEY`. The
 * route imports this and nothing else. The daily backup is main's even when a demo session exists.
 */
import 'server-only';

import { runDailyBackup, type BackupSummary } from './backup-run';
import { deleteAsset, listFileAssets, listStoredAssets, uploadFile } from './sanity';
import { storeQueryMain } from './store-guard';

async function writeSetting(key: string, value: string): Promise<void> {
  await storeQueryMain(
    `INSERT INTO setting (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value]
  );
}

async function databaseBytes(): Promise<number> {
  const rows = await storeQueryMain<{ bytes: string | number }[]>(
    `SELECT pg_database_size(current_database())::bigint AS bytes`
  );
  return Number(rows[0]?.bytes ?? 0);
}

export async function runDailyBackupLive(now?: Date): Promise<BackupSummary> {
  return runDailyBackup({
    now,
    key: process.env.BACKUP_ENCRYPTION_KEY,
    // `storeQueryMain` answers the rows themselves; the archive builder takes a `{ rows }` result so it
    // can be tested with any driver's shape. The wrapper is the one place the two meet.
    query: async (text, params = []) => ({ rows: await storeQueryMain<unknown[]>(text, params) }),
    listFileAssets,
    listStoredAssets,
    uploadFile,
    deleteAsset,
    writeSetting,
    databaseBytes,
  });
}
