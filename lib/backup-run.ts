/**
 * The daily backup run — dump, encrypt, upload, heartbeat, retention, measure.
 *
 * The order is the safety property:
 *   1. find the day's file; if it exists, reuse it — no dump, no encrypt, no upload;
 *   2. otherwise read the archive and encrypt it (nothing external yet), then upload it;
 *   3. write `last_backup_at` **only after** the file exists in the store;
 *   4. keep the newest seven backup files, delete its own older ones;
 *   5. measure the database and the asset store, and write both figures.
 *
 * A second run on the same UTC day reuses the exact filename asset, so it does not dump or upload
 * again. A failed upload leaves the old heartbeat alone. A failed retention delete is reported in the
 * summary and does not fail the backup — the new file did land. A failed measurement is a failed step;
 * the backup still exists, and the heartbeat stays true.
 *
 * This module is deliberately **pure**: every dependency (the store query, the asset-store calls,
 * the settings writer, the key) is passed in. `backup-run-live.ts` supplies the real ones and is the
 * only half that imports `server-only`, so this orchestration can be tested without a store, a
 * network or a key in the environment.
 */
import {
  archiveRowCount,
  BackupError,
  buildBackupArchive,
  type BackupArchive,
  type BackupQuery,
} from "./backup-archive";
import { encryptBackup } from "./backup-crypto";

export const BACKUP_KEEP = 7;
export const BACKUP_FILENAME_PATTERN = /^backup-(\d{4}-\d{2}-\d{2})\.json\.gz\.enc$/;

export function backupFilename(at: Date): string {
  return `backup-${at.toISOString().slice(0, 10)}.json.gz.enc`;
}

/** Is this exactly one of the job's own files? The cleanup card uses this to keep backups out of litter. */
export function isBackupFilename(filename: string | null | undefined): boolean {
  return typeof filename === "string" && BACKUP_FILENAME_PATTERN.test(filename);
}

export type BackupStep = {
  step: string;
  ok: boolean;
  ms: number;
  detail?: string;
};

export type RetentionResult = {
  kept: number;
  deleted: string[];
  failed: { filename: string; reason?: string }[];
};

/** The little of an asset this run needs. The live asset type is structurally assignable. */
export type BackupFile = {
  assetId: string;
  filename: string | null;
  size: number | null;
};

export type BackupSummary = {
  ok: boolean;
  filename: string;
  assetId: string | null;
  reused: boolean;
  bytes: number;
  rows: number;
  tables: number;
  backupAt: string | null;
  steps: BackupStep[];
  retention?: RetentionResult;
  storage?: { databaseBytes: number; assetBytes: number };
  error?: string;
};

type UploadFile = (
  bytes: Buffer,
  options: { filename: string; contentType: string },
) => Promise<{ assetId: string }>;
type DeleteAsset = (assetId: string) => Promise<{ deleted: boolean; reason?: string }>;

export type BackupDeps = {
  now?: Date;
  /** `undefined` is the configuration failure the run must report, not hide. */
  key?: string;
  query: BackupQuery;
  buildArchive?: (query: BackupQuery, now: Date) => Promise<BackupArchive>;
  listFileAssets: () => Promise<BackupFile[]>;
  listStoredAssets: () => Promise<{ assetId: string; size: number | null }[]>;
  uploadFile: UploadFile;
  deleteAsset: DeleteAsset;
  writeSetting: (key: string, value: string) => Promise<void>;
  databaseBytes: () => Promise<number>;
};

/**
 * Keep the newest seven files whose names are exactly the backup pattern; remove the rest.
 *
 * The filter is deliberately narrow. A client's photo, an enquiry PDF or a file a person uploaded
 * cannot match `backup-YYYY-MM-DD.json.gz.enc`; only this job writes that name. A delete failure is
 * recorded and the run continues: the new backup is not less real because an old one could not go.
 */
export async function pruneBackups(
  files: BackupFile[],
  remove: DeleteAsset,
): Promise<RetentionResult> {
  const backups = files
    .filter((file) => file.filename !== null && BACKUP_FILENAME_PATTERN.test(file.filename))
    .sort((a, b) => (a.filename! < b.filename! ? 1 : a.filename! > b.filename! ? -1 : 0));

  const kept = backups.slice(0, BACKUP_KEEP);
  const old = backups.slice(BACKUP_KEEP);
  const deleted: string[] = [];
  const failed: { filename: string; reason?: string }[] = [];

  for (const file of old) {
    try {
      const result = await remove(file.assetId);
      if (result.deleted) deleted.push(file.filename!);
      else failed.push({ filename: file.filename!, reason: result.reason });
    } catch (error) {
      failed.push({
        filename: file.filename!,
        reason: error instanceof Error ? error.message : "the asset store refused the delete",
      });
    }
  }

  return { kept: kept.length, deleted, failed };
}

export async function runDailyBackup(deps: BackupDeps): Promise<BackupSummary> {
  const now = deps.now ?? new Date();
  const filename = backupFilename(now);
  const steps: BackupStep[] = [];
  const summary: BackupSummary = {
    ok: false,
    filename,
    assetId: null,
    reused: false,
    bytes: 0,
    rows: 0,
    tables: 0,
    backupAt: null,
    steps,
  };

  async function step<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const started = Date.now();
    try {
      const value = await fn();
      const record = { step: name, ok: true, ms: Date.now() - started };
      steps.push(record);
      console.log(`[backup] ${JSON.stringify(record)}`);
      return value;
    } catch (error) {
      // Only a BackupError's own words are safe to repeat: they name tables, sequences and steps,
      // never a key, a connection string or a row. Anything else is reported by step name only.
      const detail = error instanceof BackupError ? error.message : "the step failed";
      const record = { step: name, ok: false, ms: Date.now() - started, detail };
      steps.push(record);
      console.log(`[backup] ${JSON.stringify(record)}`);
      throw error;
    }
  }

  try {
    if (!deps.key) throw new BackupError("configuration", "BACKUP_ENCRYPTION_KEY is not set");

    // The filename is the idempotency key. Look for it **before** dumping: a second run on the same
    // UTC day must not dump, encrypt or upload again. If the first run uploaded and died before the
    // heartbeat, this finds the file and writes the heartbeat — the same path.
    const existing = await step("list-before", () => deps.listFileAssets());
    const match = existing.find((asset) => asset.filename === filename);
    let assetId: string;
    let backupBytes: number;
    if (match) {
      assetId = match.assetId;
      backupBytes = match.size ?? 0;
      summary.reused = true;
      summary.bytes = backupBytes;
      await step("reuse", async () => undefined);
    } else {
      const build = deps.buildArchive ?? buildBackupArchive;
      const archive = await step("dump", () => build(deps.query, now));
      summary.rows = archiveRowCount(archive);
      summary.tables = Object.keys(archive.tables).length;

      const bytes = await step("encrypt", async () =>
        encryptBackup(JSON.stringify(archive), deps.key as string),
      );
      backupBytes = bytes.byteLength;
      summary.bytes = backupBytes;

      const uploaded = await step("upload", () =>
        deps.uploadFile(bytes, { filename, contentType: "application/octet-stream" }),
      );
      assetId = uploaded.assetId;
    }
    summary.assetId = assetId;

    // The heartbeat is the fact "a file exists in the store". It is written only after the upload
    // answered with an asset id (or the file was already there), never before.
    const backupAt = now.toISOString();
    await step("heartbeat", () => deps.writeSetting("last_backup_at", backupAt));
    summary.backupAt = backupAt;

    // Retention sees the file we just uploaded even if the listing is a moment behind; otherwise the
    // newest file would not count against the seven and an eighth would survive.
    const afterUpload = await step("list-retention", () => deps.listFileAssets());
    const forRetention = afterUpload.some((asset) => asset.assetId === assetId)
      ? afterUpload
      : [...afterUpload, { assetId, filename, size: backupBytes }];
    summary.retention = await step("retention", () => pruneBackups(forRetention, deps.deleteAsset));

    // Measurement happens after upload and retention: the figures describe the store as it now is.
    const dbBytes = await step("measure-database", () => deps.databaseBytes());
    const assets = await step("measure-assets", () => deps.listStoredAssets());
    const measured = assets.reduce((total, asset) => total + (asset.size ?? 0), 0);
    // If the just-uploaded file is not visible in the listing yet, count its bytes rather than
    // pretending the store is smaller than it is.
    const assetBytes = assets.some((asset) => asset.assetId === assetId)
      ? measured
      : measured + backupBytes;

    await step("write-storage", async () => {
      await deps.writeSetting("database_used_bytes", String(dbBytes));
      await deps.writeSetting("storage_used_bytes", String(assetBytes));
    });
    summary.storage = { databaseBytes: dbBytes, assetBytes };
    summary.ok = true;
  } catch (error) {
    summary.error =
      error instanceof BackupError ? error.message : "the backup did not finish — see the failed step";
  }

  console.log(
    `[backup] ${JSON.stringify({
      ok: summary.ok,
      filename: summary.filename,
      assetId: summary.assetId,
      reused: summary.reused,
      bytes: summary.bytes,
      rows: summary.rows,
      tables: summary.tables,
      backupAt: summary.backupAt,
      retention: summary.retention,
      storage: summary.storage,
      error: summary.error,
    })}`,
  );
  return summary;
}
