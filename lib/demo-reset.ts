/**
 * The demo reset's pre-write checks and the main advisory lock.
 *
 * The order is the safety property:
 *   1. bearer `CRON_SECRET`;
 *   2. `DEMO_RESET_ENABLED === "1"` (every other value is off);
 *   3. required configuration (including a direct `DATABASE_URL_UNPOOLED`);
 *   4. the demo URL is not main, pooled and direct hosts compared;
 *   5. the Neon API proves the configured branch id/name/default flag and that the URL host is its
 *      read-write endpoint;
 *   6. exactly one asset carries the seed label;
 *   7. the main advisory lock is acquired.
 *
 * The lock lives in main, not demo: a lock inside demo would be truncated away by the restore. It
 * is a direct `pg` connection (`DATABASE_URL_UNPOOLED` only, no pooled fallback), uses
 * `pg_try_advisory_lock(hashtext('truespec-demo-reset'))`, and is released in the caller's
 * `finally`. The connection is for the lock only and writes no main data. A second reset gets
 * `acquired: false`; a dropped connection makes `check()` fail.
 *
 * The restore and cleanup follow in `runDemoReset`, holding the lock across both and releasing it
 * once. The demo connection is a direct `pg` client with a statement and query timeout inside the
 * route's 300-second ceiling; a timeout is a named failure, never a success.
 *
 * This module deliberately has no `server-only` import: the tests import it directly. The route
 * that binds the real asset door and the environment is the server-side half.
 */
import { Client } from "pg";

import type { BackupArchive } from "./backup-archive";
import { decryptBackup } from "./backup-crypto";
import {
  isSameDatabase,
  parseBackupArchive,
  readColumnTypes,
  restoreArchive,
  RestoreError,
  type RestoreClient,
  type RestoreRow,
} from "./backup-restore";
import {
  BACKUP_TABLES,
  quoteIdentifier,
  type BackupTable,
} from "./backup-tables";
import { cleanupDemoAssets } from "./demo-assets";
import { DEMO_SEED_LABEL } from "./demo-snapshot";
import { NeonApiError, verifyDemoBranch, type FetchLike } from "./neon-api";
import type { StoredAsset } from "./sanity";

export type ResetEnv = {
  cronSecret?: string;
  demoResetEnabled?: string;
  demoDatabaseUrl?: string;
  databaseUrl?: string;
  databaseUrlUnpooled?: string;
  backupEncryptionKey?: string;
  neonApiKey?: string;
  neonProjectId?: string;
  demoBranchId?: string;
};

export type ResetSummary = {
  ok: boolean;
  /** The last completed step, or the step that failed. */
  step: string;
  error?: string;
  startedAt: string;
  /** The snapshot archive's `generated_at`, once the seed has been decrypted. */
  snapshotAt: string | null;
  rowsBefore: Record<string, number> | null;
  rowsAfter: Record<string, number> | null;
  cleanup: {
    candidates: number;
    deleted: number;
    failed: number;
    error?: string;
  } | null;
  durationMs: number;
  seedAssetId: string | null;
};

export class ResetError extends Error {
  constructor(
    readonly step: string,
    message: string,
  ) {
    super(message);
    this.name = "ResetError";
  }
}

export type ResetLock = {
  acquired: boolean;
  /** A ping that fails when the main lock connection has dropped. */
  check: () => Promise<void>;
  /** Never throws; the caller records a false result as a lock failure. */
  release: () => Promise<{ released: boolean; error?: string }>;
};

export type LockClient = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  end: () => Promise<void>;
  on?: (event: "error", listener: (error: Error) => void) => unknown;
};

export type ResetPreflightDeps = {
  authorization: string | null;
  env: ResetEnv;
  now?: Date;
  fetch?: FetchLike;
  listFileAssets: () => Promise<StoredAsset[]>;
  openLock?: (mainUnpooledUrl: string) => Promise<ResetLock>;
};

export type ResetContext = {
  lock: ResetLock;
  seed: StoredAsset;
  demoUrl: string;
  mainUnpooledUrl: string;
  startedAt: Date;
  summary: ResetSummary;
};

export type ResetPreflightResult =
  | { ok: true; context: ResetContext }
  | { ok: false; summary: ResetSummary };

export function resetEnvFromProcess(): ResetEnv {
  return {
    cronSecret: process.env.CRON_SECRET,
    demoResetEnabled: process.env.DEMO_RESET_ENABLED,
    demoDatabaseUrl: process.env.DEMO_DATABASE_URL,
    databaseUrl: process.env.DATABASE_URL,
    databaseUrlUnpooled: process.env.DATABASE_URL_UNPOOLED,
    backupEncryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
    neonApiKey: process.env.NEON_API_KEY,
    neonProjectId: process.env.NEON_PROJECT_ID,
    demoBranchId: process.env.DEMO_BRANCH_ID,
  };
}

function failure(
  step: string,
  error: string,
  startedAt: Date,
  seedAssetId: string | null = null,
): ResetPreflightResult {
  return {
    ok: false,
    summary: {
      ok: false,
      step,
      error,
      startedAt: startedAt.toISOString(),
      snapshotAt: null,
      rowsBefore: null,
      rowsAfter: null,
      cleanup: null,
      durationMs: Date.now() - startedAt.getTime(),
      seedAssetId,
    },
  };
}

/** The lock URL must be a direct host. The raw hostname is checked; `connectionIdentity` would
 * normalise the `-pooler` away. */
function assertDirectMainUrl(connectionString: string): void {
  let hostname: string;
  try {
    hostname = new URL(connectionString).hostname;
  } catch {
    throw new ResetError(
      "configuration",
      "DATABASE_URL_UNPOOLED is not a valid PostgreSQL URL",
    );
  }
  if (hostname.includes("-pooler")) {
    throw new ResetError("configuration", "DATABASE_URL_UNPOOLED names a pooled host");
  }
}

/**
 * The lock over an already-open client. Exported so the tests can prove the exact SQL, the
 * second-reset refusal and the dropped-connection failure without a database.
 */
export async function createResetLock(client: LockClient): Promise<ResetLock> {
  let dropped = false;
  client.on?.("error", () => {
    dropped = true;
  });

  let acquired = false;
  try {
    const result = await client.query(
      "SELECT pg_try_advisory_lock(hashtext('truespec-demo-reset')) AS locked",
    );
    acquired = result.rows[0]?.locked === true;
  } catch {
    await client.end().catch(() => {});
    throw new ResetError("lock", "the main lock could not be acquired");
  }

  if (!acquired) {
    await client.end().catch(() => {});
    return {
      acquired: false,
      check: async () => {
        throw new ResetError("lock", "the main lock is not held");
      },
      release: async () => ({ released: true }),
    };
  }

  return {
    acquired: true,
    async check() {
      if (dropped) {
        throw new ResetError("lock", "the main lock connection dropped");
      }
      try {
        await client.query("SELECT 1");
      } catch {
        throw new ResetError("lock", "the main lock connection dropped");
      }
    },
    async release() {
      try {
        await client.query("SELECT pg_advisory_unlock(hashtext('truespec-demo-reset'))");
        await client.end();
        return { released: true };
      } catch {
        await client.end().catch(() => {});
        return {
          released: false,
          error: "the main lock connection could not be released",
        };
      }
    },
  };
}

/** The live lock: a direct `pg` connection to main, used only for the advisory lock. */
export async function acquireMainResetLock(connectionString: string): Promise<ResetLock> {
  assertDirectMainUrl(connectionString);
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10_000,
  });
  try {
    await client.connect();
  } catch {
    throw new ResetError("lock", "the main lock database could not be reached");
  }
  return createResetLock(client);
}

/**
 * Run the checks before any demo write. On success the caller owns the lock and must release it in
 * a `finally`; the summary's `ok` is still false until the restore and cleanup finish.
 */
export async function preflightReset(
  deps: ResetPreflightDeps,
): Promise<ResetPreflightResult> {
  const startedAt = deps.now ?? new Date();
  const env = deps.env;

  if (!env.cronSecret || deps.authorization !== `Bearer ${env.cronSecret}`) {
    return failure("auth", "unauthorized", startedAt);
  }
  if (env.demoResetEnabled !== "1") {
    return failure("disabled", "demo reset is disabled", startedAt);
  }

  const required: [keyof ResetEnv, string][] = [
    ["demoDatabaseUrl", "DEMO_DATABASE_URL"],
    ["databaseUrl", "DATABASE_URL"],
    ["databaseUrlUnpooled", "DATABASE_URL_UNPOOLED"],
    ["backupEncryptionKey", "BACKUP_ENCRYPTION_KEY"],
    ["neonApiKey", "NEON_API_KEY"],
    ["neonProjectId", "NEON_PROJECT_ID"],
    ["demoBranchId", "DEMO_BRANCH_ID"],
  ];
  const missing = required
    .filter(([key]) => !env[key]?.trim())
    .map(([, name]) => name);
  if (missing.length > 0) {
    return failure(
      "configuration",
      `missing required configuration: ${missing.join(", ")}`,
      startedAt,
    );
  }

  const demoUrl = env.demoDatabaseUrl!.trim();
  const databaseUrl = env.databaseUrl!.trim();
  const unpooledUrl = env.databaseUrlUnpooled!.trim();

  try {
    assertDirectMainUrl(unpooledUrl);
  } catch (error) {
    if (error instanceof ResetError) return failure(error.step, error.message, startedAt);
    return failure("configuration", "DATABASE_URL_UNPOOLED could not be checked", startedAt);
  }

  let sameDatabase: boolean;
  try {
    sameDatabase = isSameDatabase(demoUrl, databaseUrl);
  } catch (error) {
    if (error instanceof RestoreError) {
      return failure("target", "DEMO_DATABASE_URL or DATABASE_URL is not a valid PostgreSQL URL", startedAt);
    }
    return failure("target", "the demo target could not be compared with main", startedAt);
  }
  if (sameDatabase) {
    return failure("target", "refusing: DEMO_DATABASE_URL names the main database", startedAt);
  }

  try {
    await verifyDemoBranch({
      apiKey: env.neonApiKey!.trim(),
      projectId: env.neonProjectId!.trim(),
      branchId: env.demoBranchId!.trim(),
      demoDatabaseUrl: demoUrl,
      fetch: deps.fetch,
    });
  } catch (error) {
    if (error instanceof NeonApiError || error instanceof ResetError) {
      return failure("target", error.message, startedAt);
    }
    return failure("target", "the demo branch could not be verified", startedAt);
  }

  let assets: StoredAsset[];
  try {
    assets = await deps.listFileAssets();
  } catch {
    return failure("seed", "the asset store could not be listed", startedAt);
  }
  const seeds = assets.filter((asset) => asset.label === DEMO_SEED_LABEL);
  if (seeds.length !== 1) {
    return failure(
      "seed",
      `expected exactly one seed asset, found ${seeds.length}`,
      startedAt,
    );
  }
  const seed = seeds[0]!;

  let lock: ResetLock;
  try {
    lock = await (deps.openLock ?? acquireMainResetLock)(unpooledUrl);
  } catch (error) {
    if (error instanceof ResetError) {
      return failure(error.step, error.message, startedAt, seed.assetId);
    }
    return failure("lock", "the main lock could not be acquired", startedAt, seed.assetId);
  }
  if (!lock.acquired) {
    return failure("lock", "another reset is running", startedAt, seed.assetId);
  }

  return {
    ok: true,
    context: {
      lock,
      seed,
      demoUrl,
      mainUnpooledUrl: unpooledUrl,
      startedAt,
      summary: {
        ok: false,
        step: "locked",
        startedAt: startedAt.toISOString(),
        snapshotAt: null,
        rowsBefore: null,
        rowsAfter: null,
        cleanup: null,
        durationMs: Date.now() - startedAt.getTime(),
        seedAssetId: seed.assetId,
      },
    },
  };
}

/** The demo connection: a direct `pg` client, closed by `runDemoReset` in its `finally`. */
export type DemoResetClient = RestoreClient & {
  end: () => Promise<void>;
  on?: (event: "error", listener: (error: Error) => void) => unknown;
};

/** 240 seconds leaves the route 60 seconds inside `maxDuration = 300` to report the timeout. */
export const DEMO_RESET_TIMEOUT_MS = 240_000;

/**
 * Open the direct `pg` connection the restore uses. Both timeouts are set on the session, so a
 * statement that hangs is cancelled by PostgreSQL (`57014`) rather than being killed by the route
 * with no summary. An idle-client `error` event gets a listener so a dropped connection cannot
 * become an unhandled process error.
 */
export async function openDemoClient(connectionString: string): Promise<DemoResetClient> {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10_000,
    statement_timeout: DEMO_RESET_TIMEOUT_MS,
    query_timeout: DEMO_RESET_TIMEOUT_MS,
  });
  client.on("error", () => {});
  try {
    await client.connect();
  } catch {
    throw new ResetError("connect", "the demo database could not be reached");
  }
  return client;
}

/** The data tables the reset replaces. `schema_migrations` is preserved and is not counted. */
const RESET_TABLES: readonly BackupTable[] = BACKUP_TABLES.filter(
  (table) => table !== "schema_migrations",
);

async function readCounts(client: RestoreClient): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of RESET_TABLES) {
    const result = await client.query(
      `SELECT count(*)::int AS n FROM ${quoteIdentifier(table)}`,
    );
    counts[table] = Number(result.rows[0]?.n);
  }
  return counts;
}

function isTimeout(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === "57014") return true;
  return error instanceof Error && /timeout/i.test(error.message);
}

function failureStep(error: unknown, fallback: string): string {
  if (error instanceof ResetError || error instanceof RestoreError) return error.step;
  return isTimeout(error) ? "timeout" : fallback;
}

function failureMessage(error: unknown): string {
  if (error instanceof ResetError || error instanceof RestoreError) return error.message;
  return isTimeout(error) ? "the reset exceeded its time limit" : "the step failed";
}

export type DemoResetDeps = ResetPreflightDeps & {
  downloadSeed: (assetId: string) => Promise<Buffer>;
  openDemo: (demoUrl: string) => Promise<DemoResetClient>;
  listStoredAssets: () => Promise<StoredAsset[]>;
  deleteAsset: (assetId: string) => Promise<{
    assetId: string;
    deleted: boolean;
    reason?: string;
  }>;
};

/**
 * The whole reset after the pre-write checks: download, decrypt, parse, read demo's schema, restore
 * in one transaction, then clean the pre-reset demo uploads. The lock is held across all of it and
 * released in `finally`.
 *
 * The data restore is the part that must stand: once `restoreArchive` commits, a cleanup failure is
 * reported as `step: "cleanup"` and the summary is not `ok` — but the demo data stays restored and
 * no unmarked asset is touched. A timeout, a parse/schema/count/sequence failure, or a dropped main
 * lock never reports success.
 */
export async function runDemoReset(deps: DemoResetDeps): Promise<ResetSummary> {
  const preflight = await preflightReset(deps);
  if (!preflight.ok) return preflight.summary;

  const { lock, seed, demoUrl, startedAt, summary } = preflight.context;
  let demoClient: DemoResetClient | null = null;
  let step = "download";

  try {
    await lock.check();

    let envelope: Buffer;
    try {
      envelope = await deps.downloadSeed(seed.assetId);
    } catch (error) {
      throw new ResetError(
        "download",
        error instanceof Error
          ? error.message
          : "the seed asset could not be downloaded",
      );
    }

    step = "decrypt";
    let plaintext: string;
    try {
      plaintext = decryptBackup(envelope, deps.env.backupEncryptionKey!.trim());
    } catch {
      throw new ResetError(
        "decrypt",
        "the seed could not be decrypted (wrong key or corrupt archive)",
      );
    }

    step = "parse";
    const archive = parseBackupArchive(plaintext);
    summary.snapshotAt = archive.generated_at;

    step = "connect";
    try {
      demoClient = await deps.openDemo(demoUrl);
    } catch (error) {
      if (error instanceof ResetError) throw error;
      throw new ResetError("connect", "the demo database could not be reached");
    }

    step = "columns";
    const columnTypes = await readColumnTypes(demoClient);

    step = "count-before";
    summary.rowsBefore = await readCounts(demoClient);

    step = "restore";
    const restored = await restoreArchive(demoClient, archive, columnTypes, {
      preserveTables: ["schema_migrations"],
    });
    summary.rowsAfter = restored.tables;

    // The lock is the only thing stopping a second reset. If it dropped, the restore that just
    // committed cannot be undone; the run is still reported as a lock failure.
    step = "lock";
    await lock.check();

    step = "cleanup";
    const cleanup = await cleanupDemoAssets({
      startedAt,
      listStoredAssets: deps.listStoredAssets,
      deleteAsset: deps.deleteAsset,
    });
    summary.cleanup = {
      candidates: cleanup.candidates,
      deleted: cleanup.deleted,
      failed: cleanup.failed,
      ...(cleanup.error ? { error: cleanup.error } : {}),
    };

    if (cleanup.failed > 0 || cleanup.error) {
      summary.ok = false;
      summary.step = "cleanup";
      summary.error =
        cleanup.error ?? `${cleanup.failed} demo asset(s) could not be deleted`;
    } else {
      summary.ok = true;
      summary.step = "done";
    }
  } catch (error) {
    summary.ok = false;
    summary.step = failureStep(error, step);
    summary.error = failureMessage(error);
  } finally {
    if (demoClient) {
      try {
        await demoClient.end();
      } catch {
        // The step's failure is the one to report; a close failure adds nothing safe to say.
      }
    }

    let released: { released: boolean; error?: string };
    try {
      released = await lock.release();
    } catch {
      released = { released: false, error: "the main lock could not be released" };
    }
    if (!released.released && summary.ok) {
      summary.ok = false;
      summary.step = "lock";
      summary.error = released.error ?? "the main lock could not be released";
    }
    summary.durationMs = Date.now() - startedAt.getTime();
  }

  return summary;
}

/** The route's status: auth 401, disabled 403, lock conflict 409, success 200, else 500. */
export function resetHttpStatus(summary: ResetSummary): number {
  if (summary.ok) return 200;
  if (summary.step === "auth") return 401;
  if (summary.step === "disabled") return 403;
  if (summary.step === "lock") return 409;
  return 500;
}
