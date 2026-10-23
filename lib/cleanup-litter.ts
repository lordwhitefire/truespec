/**
 * What counts as machine litter in the asset store — the pure half of the cleanup card.
 *
 * The card's rule: an asset no row references is litter, **unless it is the daily backup job's own
 * file**. Backups are retained on purpose and have an exact name; treating them as litter would tell
 * the owner to clear the thing that protects him.
 *
 * Kept apart from `cleanup.ts` (which is `server-only`) so the two-way rule can be tested directly:
 * a backup-named asset is not litter, a client-named asset with no reference is.
 */
import { isBackupFilename } from "./backup-run";

export type LitterAsset = {
  assetId: string;
  kind: string;
  filename: string | null;
  bytes: number;
};

export function unreferencedLitter(
  assets: LitterAsset[],
  referenced: ReadonlySet<string>,
): LitterAsset[] {
  return assets.filter(
    (asset) => !referenced.has(asset.assetId) && !isBackupFilename(asset.filename),
  );
}
