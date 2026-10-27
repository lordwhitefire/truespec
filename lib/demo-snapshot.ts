/**
 * The one-time demo snapshot.
 *
 * The demo branch must start from a fixed picture of main, not from live main. This module builds
 * that picture with the same fixed-table, fixed-sequence archive the daily backup uses, encrypts it
 * with `BACKUP_ENCRYPTION_KEY`, and stores it as `demo-seed.json.gz.enc` under the system label
 * `truespec-demo-seed`. The reset finds the seed by that exact label; a demo upload can reuse the
 * filename and is never mistaken for the seed.
 *
 * The orchestration is injected so it can be tested without a store or a network:
 *   - `query` is the main-only door (the script binds `storeQueryMain`, retry included);
 *   - `uploadFile`, `listFileAssets` and `deleteAsset` are the asset-store door;
 *   - `buildArchive` defaults to `buildBackupArchive`.
 *
 * Safety properties:
 *   1. A missing key or main URL refuses before the asset store is touched.
 *   2. A demo URL that names main refuses (pooled and direct hosts compare equal).
 *   3. The new upload is verified to carry the seed label before older seed assets are removed. A
 *      label Sanity did not store is deleted and the old seed is left alone.
 *   4. Exactly one seed-labelled asset must remain, and it must be the new one. A different filename
 *      or an unmarked demo upload with the same name is never counted or deleted.
 *   5. The summary carries counts, the generated time and asset ids/filenames — never a row, the key,
 *      a connection string or a person.
 *
 * This module deliberately has no `server-only` import: the test imports it directly. The script
 * that binds the real doors is the server-side half.
 */
import {
  archiveRowCount,
  BackupError,
  buildBackupArchive,
  type BackupArchive,
  type BackupQuery,
} from './backup-archive';
import { encryptBackup } from './backup-crypto';
import { isSameDatabase, RestoreError } from './backup-restore';
import { ConfigError } from './config';

export const DEMO_SEED_FILENAME = 'demo-seed.json.gz.enc';
export const DEMO_SEED_LABEL = 'truespec-demo-seed';

export class SnapshotError extends Error {
  constructor(
    readonly step: string,
    message: string
  ) {
    super(message);
    this.name = 'SnapshotError';
  }
}

/** The little of a stored asset this run needs. The live asset type is structurally assignable. */
export type SnapshotAsset = {
  assetId: string;
  filename: string | null;
  label: string | null;
  createdAt: string | null;
  size: number | null;
};

export type SnapshotUpload = {
  assetId: string;
  label: string | null;
};

export type SnapshotDeps = {
  now?: Date;
  /** `undefined` is the configuration refusal, not a hidden default. */
  key: string | undefined;
  /** Main's URL, read only to prove the demo URL is not the same database. */
  mainUrl: string | undefined;
  /** The configured demo URL, if one is present. It is not connected to here. */
  demoUrl: string | undefined;
  /** The main-only store door. */
  query: BackupQuery;
  buildArchive?: (query: BackupQuery, now: Date) => Promise<BackupArchive>;
  uploadFile: (
    bytes: Buffer,
    options: { filename: string; contentType: string; label: string }
  ) => Promise<SnapshotUpload>;
  listFileAssets: () => Promise<SnapshotAsset[]>;
  deleteAsset: (assetId: string) => Promise<{ deleted: boolean; reason?: string }>;
};

export type SnapshotSummary = {
  ok: boolean;
  filename: string;
  assetId: string | null;
  bytes: number;
  rows: number;
  tables: number;
  generatedAt: string | null;
  seedAssetsBefore: number;
  seedAssetsAfter: number;
  deleted: string[];
  failed: { assetId: string; reason: string }[];
  durationMs: number;
  failedStep?: string;
  error?: string;
};

function safeMessage(error: unknown): string {
  if (
    error instanceof SnapshotError ||
    error instanceof ConfigError ||
    error instanceof BackupError ||
    error instanceof RestoreError
  ) {
    return error.message;
  }
  return 'the step failed';
}

export async function runDemoSnapshot(deps: SnapshotDeps): Promise<SnapshotSummary> {
  const started = Date.now();
  const now = deps.now ?? new Date();
  const summary: SnapshotSummary = {
    ok: false,
    filename: DEMO_SEED_FILENAME,
    assetId: null,
    bytes: 0,
    rows: 0,
    tables: 0,
    generatedAt: null,
    seedAssetsBefore: 0,
    seedAssetsAfter: 0,
    deleted: [],
    failed: [],
    durationMs: 0,
  };
  let step = 'configuration';

  try {
    if (!deps.key) {
      throw new SnapshotError('configuration', 'BACKUP_ENCRYPTION_KEY is not set');
    }
    if (!deps.mainUrl) {
      throw new SnapshotError('configuration', 'DATABASE_URL is not set');
    }
    if (deps.demoUrl) {
      let same: boolean;
      try {
        same = isSameDatabase(deps.demoUrl, deps.mainUrl);
      } catch {
        throw new SnapshotError('target', 'DEMO_DATABASE_URL is not a valid PostgreSQL URL');
      }
      if (same) {
        throw new SnapshotError('target', 'refusing: DEMO_DATABASE_URL names the main database');
      }
    }

    step = 'list-before';
    const before = await deps.listFileAssets();
    const beforeSeeds = before.filter((asset) => asset.label === DEMO_SEED_LABEL);
    summary.seedAssetsBefore = beforeSeeds.length;

    step = 'archive';
    const build = deps.buildArchive ?? buildBackupArchive;
    const archive = await build(deps.query, now);
    summary.rows = archiveRowCount(archive);
    summary.tables = Object.keys(archive.tables).length;
    summary.generatedAt = archive.generated_at;

    step = 'encrypt';
    const bytes = encryptBackup(JSON.stringify(archive), deps.key);
    summary.bytes = bytes.length;

    step = 'upload';
    const uploaded = await deps.uploadFile(bytes, {
      filename: DEMO_SEED_FILENAME,
      contentType: 'application/octet-stream',
      label: DEMO_SEED_LABEL,
    });
    summary.assetId = uploaded.assetId;

    if (uploaded.label !== DEMO_SEED_LABEL) {
      step = 'verify-upload';
      let removed = false;
      try {
        removed = (await deps.deleteAsset(uploaded.assetId)).deleted;
      } catch {
        removed = false;
      }
      throw new SnapshotError(
        'verify-upload',
        removed
          ? 'the seed upload did not carry the seed label; the new asset was removed'
          : 'the seed upload did not carry the seed label; the new asset could not be removed'
      );
    }

    step = 'cleanup';
    const older = beforeSeeds.filter((asset) => asset.assetId !== uploaded.assetId);
    for (const asset of older) {
      try {
        const result = await deps.deleteAsset(asset.assetId);
        if (result.deleted) {
          summary.deleted.push(asset.assetId);
        } else {
          summary.failed.push({
            assetId: asset.assetId,
            reason: result.reason ?? 'the asset store refused the delete',
          });
        }
      } catch {
        summary.failed.push({
          assetId: asset.assetId,
          reason: 'the asset store refused the delete',
        });
      }
    }

    step = 'verify';
    const after = await deps.listFileAssets();
    const afterSeeds = after.filter((asset) => asset.label === DEMO_SEED_LABEL);
    summary.seedAssetsAfter = afterSeeds.length;
    if (afterSeeds.length !== 1 || afterSeeds[0]?.assetId !== uploaded.assetId) {
      throw new SnapshotError(
        'verify',
        `the store holds ${afterSeeds.length} seed asset(s), not exactly the new one`
      );
    }

    summary.ok = true;
    summary.durationMs = Date.now() - started;
    return summary;
  } catch (error) {
    summary.durationMs = Date.now() - started;
    summary.failedStep = error instanceof SnapshotError ? error.step : step;
    summary.error = safeMessage(error);
    return summary;
  }
}
