/**
 * What counts as machine litter in the asset store — the pure half of the cleanup card.
 *
 * The card's rule: an asset no row references is litter, **unless it is a system file**. Three kinds
 * are never litter:
 *   - a daily backup, recognised by its exact `backup-YYYY-MM-DD.json.gz.enc` name;
 *   - the fixed demo seed, recognised by its exact label or its fixed filename;
 *   - a demo upload, recognised by the exact `truespec-demo` label.
 *
 * Backups and the seed are retained on purpose; demo uploads belong to the demo branch and are
 * cleared by its daily reset, not by the main office's cleanup card. Treating any of them as litter
 * would tell the owner to clear something the system owns.
 *
 * Kept apart from `cleanup.ts` (which is `server-only`) so the rule can be tested directly: a
 * backup-named, seed-marked or demo-marked asset is not litter; a client-named asset with no
 * reference is.
 */
import { isBackupFilename } from "./backup-run";
import { DEMO_UPLOAD_LABEL } from "./demo-assets";
import { DEMO_SEED_FILENAME, DEMO_SEED_LABEL } from "./demo-snapshot";

export type LitterAsset = {
  assetId: string;
  kind: string;
  filename: string | null;
  bytes: number;
  /** The server-set Sanity label, when the asset has one. */
  label: string | null;
};

export function unreferencedLitter(
  assets: LitterAsset[],
  referenced: ReadonlySet<string>,
): LitterAsset[] {
  return assets.filter(
    (asset) =>
      !referenced.has(asset.assetId) &&
      !isBackupFilename(asset.filename) &&
      asset.label !== DEMO_SEED_LABEL &&
      asset.filename !== DEMO_SEED_FILENAME &&
      asset.label !== DEMO_UPLOAD_LABEL,
  );
}
