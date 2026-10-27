/**
 * Demo uploads: the exact mark, the total cap, the verification, and the post-reset cleanup.
 *
 * A demo upload is marked by the server with the exact label `truespec-demo`; a main upload carries
 * `truespec-main`. The seed has a different exact label (`truespec-demo-seed`), and backups are
 * unlabelled. The total cap counts only the demo mark. Cleanup compares labels exactly, never by
 * prefix, and only removes marked assets whose Sanity creation time is strictly before the reset
 * started. An upload made after the reset started belongs to the fresh demo and waits for the next
 * reset. An asset whose creation time is missing or unreadable is left alone: it cannot be proven
 * pre-reset.
 *
 * An upload whose result does not carry the requested label is deleted and refused. The module is
 * pure apart from the injected asset-store functions, so the selection, the cap, the verification
 * and the failure reporting are testable without Sanity.
 */
import type { Space } from './space-rule';
import type { StoredAsset } from './sanity';

export const DEMO_UPLOAD_LABEL = 'truespec-demo';

/** Main uploads carry their own exact label; they never carry the demo mark. */
export const MAIN_UPLOAD_LABEL = 'truespec-main';

/** The optional demo total cap; absent means 2 GiB. */
export const DEMO_ASSET_CAP_ENV = 'DEMO_ASSET_CAP_BYTES';
export const DEMO_ASSET_CAP_BYTES_DEFAULT = 2 * 1024 * 1024 * 1024;

/**
 * The one server-side label decision. The client sends bytes, never a label; both upload paths take
 * the session's space and call this. A main upload can never acquire `truespec-demo`.
 */
export function uploadLabelForSpace(space: Space): string {
  return space === 'demo' ? DEMO_UPLOAD_LABEL : MAIN_UPLOAD_LABEL;
}

export type AssetDeleteResult = {
  assetId: string;
  deleted: boolean;
  reason?: string;
};

export type DemoCleanupDeps = {
  startedAt: Date;
  listStoredAssets: () => Promise<StoredAsset[]>;
  deleteAsset: (assetId: string) => Promise<AssetDeleteResult>;
};

export type DemoCleanupSummary = {
  candidates: number;
  deleted: number;
  failed: number;
  /** Present when the listing failed or at least one delete failed. */
  error?: string;
  /** Asset ids and safe reasons; the route's public summary keeps only the counts. */
  failures: { assetId: string; reason: string }[];
};

/**
 * The exact candidates: label equal to `truespec-demo`, creation time strictly before the reset,
 * and a readable creation time. The seed, main assets, backups, unmarked assets and uploads made
 * after the reset started are never candidates.
 */
export function selectDemoAssets(assets: readonly StoredAsset[], startedAt: Date): StoredAsset[] {
  const cutoff = startedAt.getTime();
  return assets.filter((asset) => {
    if (asset.label !== DEMO_UPLOAD_LABEL) return false;
    if (!asset.createdAt) return false;
    const created = Date.parse(asset.createdAt);
    return Number.isFinite(created) && created < cutoff;
  });
}

export type DemoAssetCapResult =
  | { ok: true; usedBytes: number; capBytes: number }
  | { ok: false; code: 'over-cap' | 'unreadable' | 'config'; reason: string };

/**
 * Read the optional cap. An absent or blank value is the 2 GiB default; anything that is not a
 * positive whole number of bytes is refused rather than guessed. The value is not a secret, but it
 * is never echoed into a person-facing message.
 */
export function readDemoAssetCap(
  env: Record<string, string | undefined> = process.env
): { ok: true; bytes: number } | { ok: false; reason: string } {
  const raw = env[DEMO_ASSET_CAP_ENV];
  if (raw === undefined || raw.trim() === '') {
    return { ok: true, bytes: DEMO_ASSET_CAP_BYTES_DEFAULT };
  }

  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, reason: 'The demo storage cap is not a whole number of bytes.' };
  }
  const bytes = Number(trimmed);
  if (!Number.isSafeInteger(bytes) || bytes <= 0) {
    return {
      ok: false,
      reason: 'The demo storage cap is not a positive whole number of bytes.',
    };
  }
  return { ok: true, bytes };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/**
 * The total cap for the demo space. Only assets carrying the exact `truespec-demo` label count;
 * the seed, main uploads, backups and unmarked assets are not demo storage. An unreadable listing
 * or an unmeasurable demo asset refuses the upload — the cap is never allowed to become unmetered.
 */
export async function checkDemoAssetCap(
  incomingBytes: number,
  deps: {
    listStoredAssets: () => Promise<StoredAsset[]>;
    env?: Record<string, string | undefined>;
  }
): Promise<DemoAssetCapResult> {
  if (!Number.isFinite(incomingBytes) || incomingBytes < 0) {
    return {
      ok: false,
      code: 'unreadable',
      reason: 'The upload size could not be read, so it was refused.',
    };
  }

  const cap = readDemoAssetCap(deps.env);
  if (!cap.ok) {
    return { ok: false, code: 'config', reason: cap.reason };
  }

  let assets: StoredAsset[];
  try {
    assets = await deps.listStoredAssets();
  } catch {
    return {
      ok: false,
      code: 'unreadable',
      reason: 'The demo storage could not be checked, so the upload was refused. Try again.',
    };
  }

  let usedBytes = 0;
  for (const asset of assets) {
    if (asset.label !== DEMO_UPLOAD_LABEL) continue;
    if (asset.size === null || !Number.isFinite(asset.size) || asset.size < 0) {
      return {
        ok: false,
        code: 'unreadable',
        reason: 'The demo storage could not be measured, so the upload was refused. Try again.',
      };
    }
    usedBytes += asset.size;
  }

  const total = usedBytes + incomingBytes;
  if (!Number.isSafeInteger(total)) {
    return {
      ok: false,
      code: 'unreadable',
      reason: 'The demo storage could not be measured, so the upload was refused. Try again.',
    };
  }
  if (total > cap.bytes) {
    return {
      ok: false,
      code: 'over-cap',
      reason: `The demo storage is full (${formatBytes(usedBytes)} of ${formatBytes(
        cap.bytes
      )} used). Delete a demo upload or wait for the daily reset.`,
    };
  }

  return { ok: true, usedBytes, capBytes: cap.bytes };
}

export type UploadMarkResult = { ok: true } | { ok: false; deleted: boolean; reason: string };

/**
 * A demo upload that came back without its requested label would survive the reset and be invisible
 * to the cleanup. It is therefore a failed upload: delete the just-uploaded asset and refuse. The
 * delete is attempted exactly once; a refused delete is reported, never hidden.
 */
export async function verifyUploadMark(
  asset: { assetId: string; label: string | null },
  requestedLabel: string,
  deps: { deleteAsset: (assetId: string) => Promise<AssetDeleteResult> }
): Promise<UploadMarkResult> {
  if (asset.label === requestedLabel) return { ok: true };

  let deleted = false;
  try {
    deleted = (await deps.deleteAsset(asset.assetId)).deleted;
  } catch {
    deleted = false;
  }

  return {
    ok: false,
    deleted,
    reason: deleted
      ? 'The upload could not be marked for this space, so it was removed. Try again.'
      : 'The upload could not be marked for this space, and the unmarked copy could not be removed.',
  };
}

export async function cleanupDemoAssets(deps: DemoCleanupDeps): Promise<DemoCleanupSummary> {
  let assets: StoredAsset[];
  try {
    assets = await deps.listStoredAssets();
  } catch {
    return {
      candidates: 0,
      deleted: 0,
      failed: 0,
      error: 'the asset store could not be listed',
      failures: [],
    };
  }

  const candidates = selectDemoAssets(assets, deps.startedAt);
  const failures: { assetId: string; reason: string }[] = [];
  let deleted = 0;

  for (const asset of candidates) {
    try {
      const result = await deps.deleteAsset(asset.assetId);
      if (result.deleted) {
        deleted += 1;
      } else {
        failures.push({
          assetId: asset.assetId,
          reason: result.reason ?? 'the asset store refused the delete',
        });
      }
    } catch {
      failures.push({
        assetId: asset.assetId,
        reason: 'the asset store refused the delete',
      });
    }
  }

  return {
    candidates: candidates.length,
    deleted,
    failed: failures.length,
    ...(failures.length > 0
      ? { error: `${failures.length} demo asset(s) could not be deleted` }
      : {}),
    failures,
  };
}
