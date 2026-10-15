import "server-only";

import { createClient, type SanityClient } from "@sanity/client";
import { createImageUrlBuilder } from "@sanity/image-url";

import { getConfig } from "./config";

// The asset store (specs/media). Sanity holds the images and the enquiry PDFs;
// the database holds only a reference to an asset — never bytes, never an
// outside address. This module is the only door to it and it is server-only:
// the write token lives in the environment and must never reach the browser.
//
// The stored reference is the Sanity asset id (`image-<hash>-<dims>-<ext>`,
// e.g. `image-928ac96d…-200x200-png`). `imageUrl` is the one derivation from
// that id to the address the browser fetches.

// Hard-coded, never derived from the clock: a floating version would break the
// application at a random point in the future (`@sanity/client` v8, its own
// guidance). Bump it deliberately.
const API_VERSION = "2026-10-13";

let cached: SanityClient | null = null;

export function sanityClient(): SanityClient {
  if (cached) return cached;
  const { sanityProjectId, sanityDataset, sanityToken } = getConfig();
  cached = createClient({
    projectId: sanityProjectId,
    dataset: sanityDataset,
    apiVersion: API_VERSION,
    // Reads made through this client are of the "did that upload land" kind.
    // The CDN edge could answer from a cache that predates the write.
    useCdn: false,
    token: sanityToken,
  });
  return cached;
}

/**
 * The address of an asset, from the asset id the store holds.
 *
 * No derivative parameters are applied: in v1 the uploaded asset is served
 * exactly as it was uploaded (specs/media — "no derivatives"; Sanity's on-demand
 * CDN parameters are the documented upgrade path, not part of v1).
 */
export function imageUrl(assetId: string): string {
  const { sanityProjectId, sanityDataset } = getConfig();
  const builder = createImageUrlBuilder({
    projectId: sanityProjectId,
    dataset: sanityDataset,
  });
  return builder.image(assetId).url();
}

export type UploadedAsset = {
  /** The Sanity asset id. This is what the store keeps. */
  assetId: string;
  /** The address Sanity reports for it — for the proof that it resolves. */
  url: string;
  size: number | null;
  width: number | null;
  height: number | null;
};

/**
 * Put bytes in the asset store and return the id to keep.
 *
 * The bytes are uploaded as given: any resizing or metadata stripping happens
 * at the caller's write boundary, not here (specs/media).
 */
export async function uploadImage(
  bytes: Buffer,
  options: { filename: string; contentType: string },
): Promise<UploadedAsset> {
  const asset = await sanityClient().assets.upload("image", bytes, {
    filename: options.filename,
    contentType: options.contentType,
  });
  return {
    assetId: asset._id,
    url: asset.url,
    size: asset.size ?? null,
    width: asset.metadata?.dimensions?.width ?? null,
    height: asset.metadata?.dimensions?.height ?? null,
  };
}

/**
 * Read a stored image asset back — the proof that a reference in the database
 * resolves to real bytes. `null` means the dataset holds no such asset, which is
 * a row pointing at nothing (reported, never repaired here).
 */
export async function findImageAsset(
  assetId: string,
): Promise<{ assetId: string; url: string; size: number | null } | null> {
  const row = await sanityClient().fetch<{ _id: string; url: string; size: number } | null>(
    `*[_id == $id][0]{_id, url, size}`,
    { id: assetId },
  );
  if (!row) return null;
  return { assetId: row._id, url: row.url, size: row.size ?? null };
}

/**
 * Put a file in the asset store (an enquiry PDF) and return the id to keep.
 *
 * The store is private by convention (specs/media): the asset carries a
 * randomised filename and the reference never appears in a public payload, so
 * the address is not discoverable. The caller keeps the *original* filename in
 * the database.
 */
export async function uploadFile(
  bytes: Buffer,
  options: { filename: string; contentType: string },
): Promise<{ assetId: string; url: string; size: number | null }> {
  const asset = await sanityClient().assets.upload("file", bytes, {
    filename: options.filename,
    contentType: options.contentType,
  });
  return { assetId: asset._id, url: asset.url, size: asset.size ?? null };
}

/**
 * Remove an asset from the store, by the id the store holds.
 *
 * This is the **only** delete in this door. It has two callers, and both are the owner acting
 * himself: the demo wipe (`scripts/demo-wipe.ts`, TASK-003 Task 24, `npm run demo:wipe`) and the
 * owner's own removal of a clear-out car (`removeCarForever`, TASK-004 task 13). No job, rule,
 * request path or seed calls it — nothing is deleted on the owner's behalf
 * (`openspec/tasks/TASK-003/task.md`, truth 10).
 *
 * Deleting the asset *document* is what removes the asset (Sanity's guidance for `@sanity/client`:
 * "Deleting an asset document will also trigger deletion of the actual asset"). Two things Sanity
 * does not do for the caller are reported rather than swallowed: references to the asset are not
 * removed from other Sanity documents, and Content Lake answers `409` while something still
 * references it. The caller prints the reason; a failed delete never aborts a run.
 */
export async function deleteAsset(
  assetId: string,
): Promise<{ assetId: string; deleted: boolean; reason?: string }> {
  try {
    await sanityClient().delete(assetId);
    return { assetId, deleted: true };
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    return {
      assetId,
      deleted: false,
      reason: `HTTP ${e.statusCode ?? "?"}: ${e.message ?? "unknown error"}`,
    };
  }
}

/**
 * Read a stored file asset back (an enquiry PDF). Same purpose: a reference in
 * the database either resolves to bytes in private storage or points at nothing.
 */
export async function findFileAsset(
  assetId: string,
): Promise<{ assetId: string; url: string; size: number | null } | null> {
  const row = await sanityClient().fetch<{ _id: string; url: string; size: number } | null>(
    `*[_id == $id][0]{_id, url, size}`,
    { id: assetId },
  );
  if (!row) return null;
  return { assetId: row._id, url: row.url, size: row.size ?? null };
}
