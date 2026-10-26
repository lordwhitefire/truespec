/**
 * Demo uploads: the exact mark and the post-reset cleanup.
 *
 * A demo upload is marked by the server with the exact label `truespec-demo`. The seed has a
 * different exact label (`truespec-demo-seed`), main uploads use `truespec-main` or no label, and
 * backups are unlabelled. Cleanup therefore compares labels exactly, never by prefix, and only
 * removes marked assets whose Sanity creation time is strictly before the reset started. An upload
 * made after the reset started belongs to the fresh demo and waits for the next reset. An asset
 * whose creation time is missing or unreadable is left alone: it cannot be proven pre-reset.
 *
 * The module is pure apart from the injected asset-store functions, so the selection and the
 * failure reporting are testable without Sanity.
 */
import type { StoredAsset } from "./sanity";

export const DEMO_UPLOAD_LABEL = "truespec-demo";

export type DemoCleanupDeps = {
  startedAt: Date;
  listStoredAssets: () => Promise<StoredAsset[]>;
  deleteAsset: (assetId: string) => Promise<{
    assetId: string;
    deleted: boolean;
    reason?: string;
  }>;
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
export function selectDemoAssets(
  assets: readonly StoredAsset[],
  startedAt: Date,
): StoredAsset[] {
  const cutoff = startedAt.getTime();
  return assets.filter((asset) => {
    if (asset.label !== DEMO_UPLOAD_LABEL) return false;
    if (!asset.createdAt) return false;
    const created = Date.parse(asset.createdAt);
    return Number.isFinite(created) && created < cutoff;
  });
}

export async function cleanupDemoAssets(
  deps: DemoCleanupDeps,
): Promise<DemoCleanupSummary> {
  let assets: StoredAsset[];
  try {
    assets = await deps.listStoredAssets();
  } catch {
    return {
      candidates: 0,
      deleted: 0,
      failed: 0,
      error: "the asset store could not be listed",
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
          reason: result.reason ?? "the asset store refused the delete",
        });
      }
    } catch {
      failures.push({
        assetId: asset.assetId,
        reason: "the asset store refused the delete",
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
