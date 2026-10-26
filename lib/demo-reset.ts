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
 * The restore and cleanup are Task 9's half; this module returns the lock and the one seed asset so
 * the caller can hold the lock across both and release it once.
 *
 * This module deliberately has no `server-only` import: the tests import it directly. The route
 * that binds the real asset door and the environment is the server-side half.
 */
import { Client } from "pg";

import { isSameDatabase, RestoreError } from "./backup-restore";
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
  cleanup: { candidates: number; deleted: number; failed: number } | null;
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
