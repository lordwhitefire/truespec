/**
 * The image rules that do not touch bytes — the one place they live (truth 7; `specs/media`).
 *
 * Kept apart from `lib/photos.ts` for the same reason `lib/session-rules.ts` sits apart from
 * `lib/session.ts`: these are the numbers and the checks, they depend on nothing, and both sides may
 * hold them — the browser refuses an oversized file before it is read (`File.size`), and the server
 * refuses it again when the bytes arrive (`Buffer.length`). The server's answer is the one that
 * counts; the browser's is only so the owner is not made to wait for a refusal he could have had at
 * once.
 *
 * Three rules:
 *
 *  - **The cap** (15 MB — the architecture's decision 4, the number kept in `specs/media`): v1 serves
 *    originals and builds no derivative pipeline, so an oversized original is refused rather than
 *    quietly resized. Resizing would be a pipeline v1 does not have.
 *  - **The types**: the three Sanity stores as images and every browser draws.
 *  - **A reference is a reference** (truth 7): the asset-reference column holds a Sanity asset id,
 *    never a web address. `isAssetRef` is what the write path checks a browser's value against.
 */
export const PHOTO_MAX_BYTES = 15 * 1024 * 1024;

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];

export function isPhotoType(value: string): value is PhotoType {
  return (PHOTO_TYPES as readonly string[]).includes(value);
}

/**
 * Is this a Sanity image asset id, and not a web address?
 *
 * The one shape the store holds: `image-` and then id characters. A URL cannot pass — it carries `:`
 * and `/` — which is exactly the rule truth 7 states: the asset-reference column never holds a web
 * address. The rule matches the one `lib/serialize.ts` resolves by, so a value that passes here is a
 * value the public path can turn into a URL.
 */
export function isAssetRef(value: string): boolean {
  return /^image-[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
}

export function megabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The cap, on its own — so a file can be refused before it is read. */
export function checkPhotoSize(bytes: number): { ok: true } | { ok: false; reason: string } {
  if (bytes === 0) return { ok: false, reason: "That file is empty." };
  if (bytes > PHOTO_MAX_BYTES) {
    return {
      ok: false,
      reason: `That photo is ${megabytes(bytes)} — bigger than the ${megabytes(PHOTO_MAX_BYTES)} cap. Save a smaller copy and try again.`,
    };
  }
  return { ok: true };
}
